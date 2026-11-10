import { useEffect, useRef, useState } from "react";
import { fetchAPI, getElement } from "../../../lib/fetch";
import { portes } from "./etat";
import { LIMITES_UNITES, typeUnite, estUniteMercenaire } from "./miseEnPlace";

// ============================================================
// SYNCHRONISATION D'UNE PARTIE AVEC LE SERVEUR
//
// - interrogation périodique : « quoi de neuf depuis la révision n ? »
// - chaque action est envoyée et validée tout de suite ; un coup ne sert
//   plus qu'à grouper les actions d'un même bouton (mobiliser, transaction...)
// ============================================================

const CONNEXION_PERDUE = "Connexion au serveur impossible";

const PERIODE = 2000;          // onglet visible
const PERIODE_CACHE = 15000;   // onglet caché

// ============================================================
// RETOUR EN RÉSERVE
//
// Une unité retirée (action « supprimer ») qui appartient à un
// joueur retourne dans sa réserve, débarrassée de ses marques
// (dégâts, usé, possession...), au lieu de sortir du jeu. Ce
// qu'elle transporte la suit : les unités de joueurs dans la
// réserve de leur propriétaire, le reste hors jeu. Une unité
// neutre, et l'infanterie (illimitée, non comptée), sortent du
// jeu comme avant.
// ============================================================

function vaEnReserve(c) {
    // (une unité mercenaire n'est pas dans la réserve d'un joueur : elle sort du jeu)
    return !!c && !c.cache && c.ref?.type === "unit" && Number.isInteger(c.proprio) &&
        c.marques?.dos !== "mercenaire" && !estUniteMercenaire(contenuEnCache(c.ref.id)) &&
        LIMITES_UNITES[typeUnite(contenuEnCache(c.ref.id))] !== undefined;
}

function renvoyer(c) {
    return [
        { type: "deplacer", c: c.id, vers: `joueur:${c.proprio}:reserve` },
        ...Object.keys(c.marques || {}).map(marque => ({ type: "marquer", c: c.id, marque, valeur: null })),
    ];
}

export function retourEnReserve(actions, etat) {

    if (!etat?.composants) {
        return actions;
    }

    return actions.flatMap(action => {

        const c = action?.type === "supprimer" && Object.hasOwn(etat.composants, action.c)
            ? etat.composants[action.c]
            : null;

        if (!vaEnReserve(c)) {
            return [action];
        }

        // Ce qu'elle transporte, à tous les niveaux
        const transportes = [];

        for (let k = 0, pile = [c.id]; k < pile.length; k++) {
            for (const d of portes(etat, pile[k])) {
                transportes.push(d);
                pile.push(d.id);
            }
        }

        return [
            ...renvoyer(c),
            ...transportes.flatMap(d => (vaEnReserve(d) ? renvoyer(d) : [{ type: "supprimer", c: d.id }])),
        ];
    });
}

export function usePartie(id) {

    const [vue, setVue] = useState(null);
    const [erreur, setErreur] = useState("");
    // Nombre de requêtes en cours (plusieurs envois peuvent se suivre)
    const [envois, setEnvois] = useState(0);

    const rev = useRef(-1);
    const occupe = useRef(false);

    // Les coups partent un par un, dans l'ordre où ils ont été joués
    const fileEnvois = useRef(Promise.resolve());

    // Chat : messages reçus, et numéro du dernier (demandé à chaque interrogation)
    const [chat, setChat] = useState([]);
    const dernierChat = useRef(0);

    function recevoirChat(messages) {

        if (!messages?.length) {
            return;
        }

        dernierChat.current = Math.max(dernierChat.current, ...messages.map(m => m.n));

        setChat(precedent => {
            const connus = new Set(precedent.map(m => m.n));
            const nouveaux = messages.filter(m => !connus.has(m.n));

            return nouveaux.length
                ? [...precedent, ...nouveaux].sort((a, b) => a.n - b.n)
                : precedent;
        });
    }

    function recevoir(r) {

        if (!r) {
            return;
        }

        if (r.error) {
            setErreur(r.error);
            return;
        }

        recevoirChat(r.chat);

        // Le serveur répond de nouveau : le message de connexion perdue s'efface
        setErreur(precedent => (precedent === CONNEXION_PERDUE ? "" : precedent));

        // Une réponse partie avant une autre et arrivée après elle porte un
        // état plus ancien : elle ne remplace pas l'état affiché
        if (r.partie && !(r.rev < rev.current)) {
            rev.current = r.rev;
            setVue(r);
        }
    }

    // --------------------------------------------------------
    // INTERROGATION PÉRIODIQUE
    // --------------------------------------------------------

    useEffect(() => {

        let arrete = false;
        let dernier = 0;

        // Autre partie : ses révisions repartent de zéro
        rev.current = -1;

        async function tic() {

            if (arrete || occupe.current) {
                return;
            }

            const maintenant = Date.now();

            if (document.hidden && maintenant - dernier < PERIODE_CACHE) {
                return;
            }

            dernier = maintenant;
            occupe.current = true;

            try {
                const r = await fetchAPI(
                    `partie/${id}/suite?rev=${rev.current}&chat=${dernierChat.current}`,
                    "GET"
                );

                if (!arrete) {
                    recevoir(r);
                }
            } catch {
                if (!arrete) {
                    setErreur(CONNEXION_PERDUE);
                }
            } finally {
                occupe.current = false;
            }
        }

        tic();

        const minuteur = setInterval(tic, PERIODE);

        return () => {
            arrete = true;
            clearInterval(minuteur);
        };

    }, [id]);

    // L'état affiché est celui du serveur : il n'y a plus d'action en attente.
    const moi = vue?.moi;
    const etat = vue?.etat ?? null;

    // --------------------------------------------------------
    // ENVOIS
    // --------------------------------------------------------

    async function requete(url, method, body) {

        setEnvois(n => n + 1);

        try {
            const r = await fetchAPI(url, method, body);

            if (r?.error) {
                setErreur(r.error);
            } else {
                recevoir(r);
            }

            return r;
        } catch {
            setErreur(CONNEXION_PERDUE);
            return null;
        } finally {
            setEnvois(n => n - 1);
        }
    }

    // surRefus(refus) : appelé si le serveur refuse le coup (rien n'est appliqué)
    async function envoyerActions(liste, commentaire, surRefus) {

        // Unités de joueurs retirées : retour dans leur réserve
        const actions = retourEnReserve(liste, etat);

        if (!actions.length) {
            return null;
        }

        // Un nouvel envoi efface le message d'erreur précédent
        setErreur("");

        // Chaque coup attend la réponse du précédent : l'ordre est gardé et
        // une réponse ne peut pas en doubler une autre
        const envoi = fileEnvois.current.then(() =>
            requete(`partie/${id}/coups`, "POST", { actions, commentaire }));

        fileEnvois.current = envoi.catch(() => { });

        const r = await envoi;

        if (!r || r.error) {
            return null;
        }

        // Un coup est tout ou rien : une action refusée annule tout le coup
        if (r.refus?.length) {
            setErreur(
                "Action refusée, rien n'a été appliqué : " +
                [...new Set(r.refus.map(x => x.erreur))].join(", ") +
                (r.refus.some(x => x.erreur === "la situation a changé")
                    ? " (un autre joueur a agi entre-temps)."
                    : ".")
            );

            surRefus?.(r.refus);

            return null;
        }

        // La réponse du serveur (l'état après le coup), pour qui veut enchaîner
        return r;
    }

    // Joue une action ou une liste d'actions
    function jouer(actions) {

        const liste = (Array.isArray(actions) ? actions : [actions]).filter(Boolean);

        if (!liste.length) {
            return;
        }

        // Une nouvelle action efface le message d'erreur précédent
        setErreur("");

        // Les actions sont validées tout de suite : chaque appel est un coup.
        // Un coup ne sert plus qu'à grouper les actions d'un même bouton
        // (mobiliser, transaction, lancement d'un combat...).
        envoyerActions(liste, "");
    }

    // Chat : a est le destinataire d'un message privé (null : à tous)
    async function ecrire(texte, a = null) {

        const r = await requete(`partie/${id}/chat`, "POST", { texte, a });

        if (r?.message) {
            recevoirChat([r.message]);
        }

        return !!r?.message;
    }

    return {
        vue,
        etat,
        moi,
        chat,
        ecrire,
        erreur,
        setErreur,
        envoi: envois > 0,
        jouer,
        requete,
        // Un coup commenté : plusieurs actions validées ensemble
        // (comme jouer, les valeurs fausses de la liste sont ignorées)
        envoyer: (commentaire, actions = [], surRefus) =>
            envoyerActions((Array.isArray(actions) ? actions : [actions]).filter(Boolean), commentaire || "", surRefus),
    };
}

// ============================================================
// CONTENU D'UN ÉLÉMENT GE (avec cache)
// ============================================================

const cacheElements = new Map();

function chargerElement(id) {

    let entree = cacheElements.get(id);

    if (!entree) {
        entree = { valeur: undefined };
        entree.promesse = getElement(id)
            .then(r => (entree.valeur = r?.content ?? null))
            .catch(() => (entree.valeur = null));

        cacheElements.set(id, entree);
    }

    return entree;
}

// Contenu d'un élément, chargé au besoin : promesse du contenu (ou null)
export const chargerContenu = id => chargerElement(id).promesse;

// Contenu déjà chargé d'un élément, ou null (sans déclencher de chargement)
export function contenuEnCache(id) {
    return cacheElements.get(id)?.valeur ?? null;
}

// Contenus de plusieurs éléments : { id: contenu }
export function useElements(ids) {

    const cle = ids.filter(id => Number.isInteger(id) && id > 0).join(",");
    const [contenus, setContenus] = useState({});

    useEffect(() => {

        let annule = false;

        Promise.all(
            (cle ? cle.split(",").map(Number) : [])
                .map(id => chargerElement(id).promesse.then(valeur => [id, valeur]))
        ).then(liste => {
            if (!annule) {
                setContenus(Object.fromEntries(liste));
            }
        });

        return () => {
            annule = true;
        };

    }, [cle]);

    return contenus;
}

export function useElement(id) {

    const valide = Number.isInteger(id) && id > 0;

    const [contenu, setContenu] = useState(
        () => (valide ? cacheElements.get(id)?.valeur ?? null : null)
    );

    useEffect(() => {

        if (!valide) {
            return;
        }

        let annule = false;

        chargerElement(id).promesse.then(valeur => {
            if (!annule) {
                setContenu(valeur);
            }
        });

        return () => {
            annule = true;
        };

    }, [id, valide]);

    return valide ? contenu : null;
}
