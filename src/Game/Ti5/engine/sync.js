import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAPI, getElement } from "../../../lib/fetch";
import { portes, appliquer } from "./etat";
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

// ============================================================
// SECRET DU VOTE
//
// Pendant la phase de vote, tant que le plateau de vote du joueur
// n'est pas révélé, ce qu'il y fait ne part pas au serveur : poser,
// déplacer ou retirer un élément de son plateau de vote, et ajuster
// des voix (compteurs vote:<tour>:<loi>:<colonne>:<joueur>). Ces
// actions sont gardées ici, dans un coup local — rien n'en paraît
// au journal ni chez les autres —, et appliquées à l'état affiché
// (même réducteur que le serveur : etat.js).
//
// Elles partent en un seul coup, avec la révélation du plateau,
// quand tous les joueurs se sont dits prêts (joueur:<u>:votePret) ;
// ou sans attendre si la phase de vote est quittée avant, ou si le
// plateau a été révélé autrement. Le coup local est gardé dans le
// navigateur (localStorage) : il survit à un rechargement de la
// page. Celui d'un autre tour est oublié.
// ============================================================

const RE_PHASE_VOTE = /^(?!.*pr[ée]).*vote/i;
const RE_AJUSTEMENT = /^vote:\d+:\d+:\d+:\d+$/;

export const phaseDeVote = etat => RE_PHASE_VOTE.test(etat?.phase || "");

const cleLocale = (id, moi) => `ge-vote-local:${id}:${moi}`;

function lireLocaux(id, moi) {
    try {
        const lu = JSON.parse(localStorage.getItem(cleLocale(id, moi)) || "null");

        return lu && Array.isArray(lu.actions) ? { tour: Number(lu.tour) || 0, actions: lu.actions } : { tour: 0, actions: [] };
    } catch {
        return { tour: 0, actions: [] };
    }
}

function ecrireLocaux(id, moi, locaux) {
    try {
        if (locaux.actions.length) {
            localStorage.setItem(cleLocale(id, moi), JSON.stringify(locaux));
        } else {
            localStorage.removeItem(cleLocale(id, moi));
        }
    } catch {
        // coup local non gardé : il vit le temps de la page
    }
}

// Cette action touche-t-elle au vote secret du joueur ? (etat : l'état affiché)
function estSecrete(action, etat, moi) {

    const plateau = `joueur:${moi}:vote:`;
    const surPlateau = c => typeof c === "string" && !!etat.composants[c]?.zone?.startsWith(plateau);

    switch (action?.type) {
        case "compteur":
            return RE_AJUSTEMENT.test(action.id || "");
        case "deplacer":
            return String(action.vers || "").startsWith(plateau) || surPlateau(action.sur) || surPlateau(action.c);
        case "supprimer":
        case "marquer":
        case "retourner":
            return surPlateau(action.c);
        default:
            return false;
    }
}

// L'état du serveur, plus le coup local (les actions refusées sont ignorées)
function avecLocaux(etat, actions, moi) {

    if (!etat || !actions.length) {
        return etat;
    }

    const copie = structuredClone(etat);

    for (const action of actions) {
        try {
            appliquer(copie, action, { auteur: moi });
        } catch {
            // action devenue impossible : ignorée à l'affichage
        }
    }

    return copie;
}

export function usePartie(id) {

    const [vue, setVue] = useState(null);

    // Coup local du vote secret : { tour, actions }
    const [locaux, setLocaux] = useState({ tour: 0, actions: [] });
    const flush = useRef("");
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

    // L'état affiché est celui du serveur, plus le coup local du vote secret.
    const moi = vue?.moi;
    const serveur = vue?.etat ?? null;

    const etat = useMemo(() => avecLocaux(serveur, locaux.actions, moi), [serveur, locaux, moi]);

    const joueurs = vue?.partie?.joueurs || [];
    const jeJoue = joueurs.some(j => j.userId === moi);
    const monPlateauRevele = !!serveur?.compteurs?.[`joueur:${moi}:voteRevele`];

    // Mes actions de vote sont-elles gardées en local ?
    const secret = !!serveur && jeJoue && phaseDeVote(serveur) && !monPlateauRevele;

    // Le coup local gardé dans le navigateur (rechargement de la page)
    useEffect(() => {
        if (Number.isInteger(moi)) {
            setLocaux(lireLocaux(id, moi));
        }
    }, [id, moi]);

    function garderLocaux(suivant) {
        setLocaux(suivant);

        if (Number.isInteger(moi)) {
            ecrireLocaux(id, moi, suivant);
        }
    }

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
    // direct : le coup part tel quel (envoi du coup local du vote)
    async function envoyerActions(liste, commentaire, surRefus, direct = false) {

        // Unités de joueurs retirées : retour dans leur réserve
        let actions = retourEnReserve(liste, etat);

        // Vote secret : ce qui touche à mon vote reste en local (voir plus haut)
        if (secret && !direct) {

            const gardees = actions.filter(action => estSecrete(action, etat, moi));

            if (gardees.length) {
                actions = actions.filter(action => !gardees.includes(action));

                garderLocaux({
                    tour: serveur.tour,
                    actions: [...(locaux.tour === serveur.tour ? locaux.actions : []), ...gardees],
                });

                setErreur("");
            }
        }

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

    // --------------------------------------------------------
    // ENVOI DU COUP LOCAL DU VOTE
    //
    // Tous les joueurs sont prêts (ou ont déjà révélé) : mon coup local part
    // avec la révélation de mon plateau. Il part aussi, sans révélation, si
    // la phase de vote a été quittée ou si mon plateau est déjà révélé. Un
    // coup local d'un autre tour est oublié.
    // --------------------------------------------------------

    useEffect(() => {

        if (!serveur || !jeJoue) {
            return;
        }

        if (locaux.actions.length && locaux.tour !== serveur.tour) {
            garderLocaux({ tour: 0, actions: [] });
            return;
        }

        const enVote = phaseDeVote(serveur);

        const tousPrets = joueurs.every(j =>
            serveur.compteurs[`joueur:${j.userId}:votePret`] || serveur.compteurs[`joueur:${j.userId}:voteRevele`]);

        const reveler = enVote && tousPrets && !monPlateauRevele;

        if (!reveler && !(locaux.actions.length && (!enVote || monPlateauRevele))) {
            return;
        }

        // (un même coup n'est pas renvoyé en boucle s'il est refusé)
        const signature = JSON.stringify([serveur.tour, serveur.phase, reveler, locaux.actions]);

        if (flush.current === signature) {
            return;
        }

        flush.current = signature;

        const partis = locaux.actions.length;

        envoyerActions([
            ...locaux.actions,
            reveler && { type: "compteur", id: `joueur:${moi}:voteRevele`, valeur: 1 },
            reveler && { type: "compteur", id: `joueur:${moi}:votePret`, valeur: 0 },
        ].filter(Boolean), reveler ? "Vote : plateau révélé" : "Vote : coup local envoyé", undefined, true).then(r => {
            if (r) {
                setLocaux(actuel => {
                    const reste = { tour: actuel.tour, actions: actuel.actions.slice(partis) };

                    ecrireLocaux(id, moi, reste);

                    return reste;
                });
            }
        });

    }, [serveur, locaux, moi]);

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
        // Vote secret : nombre d'actions gardées en local, et de quoi les oublier
        votesLocaux: locaux.actions.length,
        voteSecret: secret,
        oublierVotesLocaux: () => garderLocaux({ tour: 0, actions: [] }),
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
