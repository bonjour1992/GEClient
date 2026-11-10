import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSearch, getFromType } from "../../../lib/store";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { Text } from "../../../Component/Text";
import { getHandler } from "../../games";
import { usePartie, useElement, useElements, chargerContenu } from "./sync";
import { SCRIPTS, SCRIPTS_DESACTIVES, scriptsDeRecrutement, technologiesDe } from "./scripts";
import { depenserAgent } from "./effets";
import { MiseEnPlaceJoueur } from "./MiseEnPlaceJoueur";
import { ScriptsCarte } from "./ScriptsCarte";
import {
    TYPES_PIOCHE,
    SAC,
    MARQUEUR,
    DETTE,
    ACTIVATION,
    TREVE,
    FRAGMENTS,
    RESSOURCES,
    LIMITES_UNITES,
    LIBRE,
    COULEUR_LIBRE,
    phasesDuTour,
    actionsPoints,
    ressourceDe,
    typeUnite,
} from "./miseEnPlace";
import { turnNumber } from "../ti5Const";
import {
    Engine,
    useEngine,
    Plan,
    Zone,
    Source,
    indexer,
    couleurJoueur,
    nomElement,
    estMercenaire,
    nomZone,
    aMotCle,
    agentDisponible,
    Repli,
    BoutonRepli,
    useRepli,
    COULEUR_A_FAIRE,
    COULEUR_NEUTRE,
    STYLE_INDISPONIBLE,
    estTreve,
    BoutonRegle,
    confirmerRegle,
} from "./Interaction";
import { Preparation } from "./Preparation";
import { Espace } from "./Espace";
import { PlateauJoueur, SourcesIllimitees, CaseProduction, MesCompteurs } from "./PlateauJoueur";
import { Technologie } from "./Technologie";
import { PlateauGeneral, Des } from "./PlateauGeneral";
import { Journal } from "./Journal";
import { Aide } from "./Aide";
import { Vote, tradingFinDeVote } from "./Vote";
import { Transaction, Transactions, transactionsEnAttente } from "./Transaction";
import { Chat, conversationDe } from "./Chat";
import { Faveurs, faveursDuTour } from "./Faveurs";
import { Combat, combatsEnCours, aDesUnites, COULEUR_COMBAT } from "./Combat";
import { passagesEnCours } from "./Blocage";
import { EnvoyerVers, MontrerA } from "./Envoi";
import { Notes } from "./Notes";
import { quiVoit } from "./etat";

// ============================================================
// ÉCRAN D'UNE PARTIE
//
// En-tête (tour, phase, qui doit jouer), actions en attente,
// onglets, et un volet avec sa main et sa réserve pour pouvoir
// les glisser vers n'importe quel onglet.
// ============================================================

const ONGLETS = [
    ["espace", "Espace"],
    ["combat", "Conflit"],
    ["joueur", "Plateau joueur"],
    ["tech", "Technologie"],
    ["general", "Plateau général"],
    ["vote", "Vote"],
    ["transactions", "Transactions"],
    ["chat", "Chat"],
    ["notes", "Notes"],
    ["journal", "Journal"],
    ["aide", "Aide"],
];

const styleCadre = {
    backgroundColor: "#fff",
    color: "#000",
    padding: 8,
    // La barre de recherche du site déborde sous l'en-tête fixe : on laisse
    // la place pour qu'elle ne recouvre pas les boutons de la partie.
    paddingTop: 30,
    fontFamily: "Arial, sans-serif",
};

// Barrière d'erreur : une erreur d'affichage dans un onglet ou dans le
// volet ne vide plus tout l'écran. On voit quel bloc a échoué et on peut
// réessayer ; le reste de la partie reste utilisable.
class Barriere extends Component {

    state = { erreur: null };

    static getDerivedStateFromError(erreur) {
        return { erreur };
    }

    componentDidCatch(erreur) {
        console.error("Erreur d'affichage (" + this.props.nom + ") :", erreur);
    }

    render() {

        if (!this.state.erreur) {
            return this.props.children;
        }

        return (
            <div
                role="alert"
                style={{ padding: 10, border: "2px solid #c62828", borderRadius: 8, backgroundColor: "#ffebee", color: "#000" }}
            >
                <b>Affichage impossible : {this.props.nom}.</b>{" "}
                Le reste de la partie fonctionne.{" "}
                <button type="button" onClick={() => this.setState({ erreur: null })}>Réessayer</button>
            </div>
        );
    }
}

// Rang d'une phase (par son nom) dans la liste des phases du tour, ou -1
const iPhaseDe = (phases, nom) => phases.findIndex(ph => ph.nom === nom);

const styleAide = {
    marginBottom: 8,
    padding: "4px 10px",
    backgroundColor: "#e3f2fd",
    border: "1px solid #64b5f6",
    borderRadius: 6,
};

const styleBarre = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
};

export function Partie({ id }) {

    const jeu = useParams().jeu;
    const navigate = useNavigate();

    const p = usePartie(id);
    const search = useSearch(state => state.search);

    const [onglet, setOnglet] = useState("espace");
    const [vuId, setVuId] = useState(null);
    const [fiche, setFiche] = useState(null);

    // Zone d'une carte face cachée sur laquelle on a cliqué
    const [cachee, setCachee] = useState(null);

    // Marqueur libre dont la fenêtre est ouverte (texte, couleur)
    const [libre, setLibre] = useState(null);

    // Fenêtre de transaction (phase de diplomatie)
    const [transaction, setTransaction] = useState(false);

    // Case « Production » de la réserve : poser une unité coûte ses ressources
    const [production, setProduction] = useState(false);

    // Nombre de propositions à piocher (phase de proposition)
    const [nbPropositions, setNbPropositions] = useState(1);

    // Combat affiché dans l'onglet Conflit (case du système)
    const [combatVu, setCombatVu] = useState(null);

    // En-tête et bandeau « À faire » repliables (gardé dans le navigateur)
    const [enteteReduit, basculerEntete] = useRepli("entete");
    const [aideReduite, basculerAide] = useRepli("a-faire");

    // Chat : numéro du dernier message lu de chaque conversation (« general »
    // ou l'identifiant d'un joueur), gardé d'une visite à l'autre. Afficher
    // une conversation la marque comme lue (Chat.jsx).
    const cleChatLu = "ge-engine-chat-lu-" + id;

    const [chatLu, setChatLu] = useState(() => {
        try {
            const lu = JSON.parse(localStorage.getItem(cleChatLu));
            return lu && typeof lu === "object" ? lu : {};
        } catch {
            return {};
        }
    });

    const marquerLu = useCallback((conversation, numero) => {
        setChatLu(precedent => {

            if ((precedent[conversation] || 0) >= numero) {
                return precedent;
            }

            const suivant = { ...precedent, [conversation]: numero };

            try {
                localStorage.setItem(cleChatLu, JSON.stringify(suivant));
            } catch {
                // préférence non enregistrée
            }

            return suivant;
        });
    }, [cleChatLu]);


    const messagesNonLus = p.chat.filter(m =>
        m.auteur !== p.moi && m.n > (chatLu[conversationDe(m, p.moi)] || 0)).length;

    // Les noms des éléments viennent de la recherche du jeu
    useEffect(() => {
        useSearch.getState().update(jeu);
    }, [jeu]);

    const index = useMemo(() => indexer(p.etat), [p.etat]);

    // Scripts de règles (scripts.js) : message orange du dernier script qui a
    // joué, et liste des scripts désactivés pour toutes les parties (élément
    // « reglage » du jeu, réglé dans l'outil « Scripts de règles »)
    const [avis, setAvis] = useState("");

    const reglage = useElement(
        search.find(e => e.type === "reglage" && e.name === SCRIPTS_DESACTIVES)?.id ?? -1
    );

    const scriptsDesactives = Array.isArray(reglage?.desactives) ? reglage.desactives : [];

    // Déroulé (surcoût du recrutement) et phases du jeu (numéro dans le tour)
    const deroule = useElement(p.etat?.references?.deroule);
    const elementsPhase = getFromType(search, ["phase"]);
    const contenusPhase = useElements(elementsPhase.map(e => e.id));

    // Ma faction : son texte de mise en place est rappelé au tour 0
    const maFaction = useElement(
        p.vue?.partie.joueurs.find(j => j.userId === p.moi)?.faction
    );

    // Technologies débloquées de chaque joueur, pour les scripts d'effet
    // (scripts.js) : { <joueur>: Map(technologie -> { utilisee }) }
    const [technologies, setTechnologies] = useState({});
    const idsJoueurs = (p.vue?.partie.joueurs || []).map(j => j.userId).join(",");

    useEffect(() => {

        if (!p.etat) {
            return undefined;
        }

        let annule = false;

        Promise.all(idsJoueurs.split(",").filter(Boolean).map(Number)
            .map(async u => [u, await technologiesDe(p.etat, u, chargerContenu)]))
            .then(liste => !annule && setTechnologies(Object.fromEntries(liste)));

        return () => {
            annule = true;
        };
    }, [p.etat, idsJoueurs]);

    if (!p.vue) {
        return (
            <div style={styleCadre}>
                {p.erreur || "Chargement de la partie…"}
            </div>
        );
    }

    const { partie, coups } = p.vue;
    const moi = p.moi;
    const joueurs = partie.joueurs;

    if (partie.statut === "preparation" || !p.etat) {
        return <Preparation p={p} />;
    }

    const etat = p.etat;
    const estJoueur = joueurs.some(j => j.userId === moi);
    const trouver = userId => joueurs.find(j => j.userId === userId);

    const ctx = {
        jeu,
        search,
        partie,
        etat,
        index,
        coups,
        moi,
        joueur: estJoueur,
        jouer: p.jouer,
        ouvrirFiche: setFiche,
        nomDe: userId => trouver(userId)?.nom || "personne",
        factionDe: userId => trouver(userId)?.faction ?? null,
        cliquer: (id, event) => cliquer(id, event),
        ouvrirCachee: setCachee,

        // Fenêtre d'un marqueur libre (texte, couleur), et message privé du chat
        ouvrirLibre: setLibre,
        ecrire: p.ecrire,

        // Envoie tout de suite ces actions (avec celles en attente) en un coup commenté
        envoyer: (actions, commentaire, surRefus) => p.envoyer(commentaire, actions, surRefus),
        couleurDe: userId => (trouver(userId) ? couleurJoueur(trouver(userId)) : null),

        // Production (case de la réserve) et message d'erreur de l'en-tête
        production,
        setProduction,
        signaler: p.setErreur,

        // Scripts de règles : message orange (un script a modifié une action),
        // et scripts désactivés
        aviser: setAvis,
        scriptsDesactives,

        // Script d'effet : il est en service et le joueur a débloqué sa technologie
        aScript: (userId, id) => {
            const script = SCRIPTS.find(s => s.id === id);

            return !!script && !scriptsDesactives.includes(id) &&
                [script.carte.id, ...(script.aussi || [])].some(tech => technologies[userId]?.has(tech));
        },

        // Le joueur a-t-il débloqué cette technologie ?
        aTechnologie: (userId, idTech) => !!technologies[userId]?.has(idTech),

        // Compteur « utilisée ce tour » de la technologie d'un script (ou null)
        techDuScript: (userId, id) =>
            technologies[userId]?.get(SCRIPTS.find(s => s.id === id)?.carte.id)?.utilisee ?? null,

        // Change d'onglet (un système envoyé au combat ouvre l'onglet Conflit),
        // et combat affiché dans cet onglet (case du système)
        allerA: setOnglet,
        combatVu,
        setCombatVu,
    };

    // Combats et blocages de déplacement en cours : l'onglet Conflit est mis
    // en avant, d'une couleur différente selon que j'y ai des unités ou non
    const combats = combatsEnCours(etat);
    const passages = passagesEnCours(etat);
    const combatEnCours = combats.length + passages.length > 0;
    const combatAvecMoi = combats.some(n => aDesUnites(index, n, moi)) ||
        passages.some(p => p.mover === moi || aDesUnites(index, String(p.numero), moi));

    // Encaissement des faveurs : l'onglet Faveurs n'apparaît qu'à la phase
    // d'événement d'un tour qui en prévoit
    const faveurs = faveursDuTour(etat, deroule);
    const ongletFaveurs = faveurs.prevus > 0 && /[ée]v[ée]nement/i.test(etat.phase);

    const onglets = ongletFaveurs
        ? [...ONGLETS.slice(0, 6), ["faveurs", "Faveurs"], ...ONGLETS.slice(6)]
        : ONGLETS;

    // Transactions proposées : l'onglet est mis en avant quand l'une d'elles
    // attend ma validation
    const transactionsEnCours = transactionsEnAttente(index);

    const transactionPourMoi = transactionsEnCours.some(t =>
        (t.f1 === moi && !t.ok1) || (t.f2 === moi && !t.ok2));

    // --------------------------------------------------------
    // PASSAGE À LA PHASE SUIVANTE
    //
    // Possible seulement quand tous les joueurs ont passé, qu'aucun
    // combat n'est en cours (phases de combat) et que les faveurs du
    // tour sont encaissées (phase d'événement). Au tour 0, rien ne
    // bloque : on lance le tour 1 quand tout le monde est prêt.
    // --------------------------------------------------------

    const nonPasses = joueurs.filter(j => !etat.compteurs[`joueur:${j.userId}:passe`]);

    // blocage : la phase ne peut pas être quittée (combat ouvert, faveurs à
    // encaisser). attente : des joueurs n'ont pas encore passé — le bouton
    // est alors rouge gris mais reste utilisable, après confirmation (un
    // joueur absent ne bloque pas la partie).
    let blocage = "";
    let attente = "";

    if (etat.tour > 0 && etat.phase) {
        if (/combat|canon|bombard/i.test(etat.phase) && combatEnCours) {
            blocage = `${combats.length} combat(s) encore en cours : les terminer (onglet Conflit)`;
        } else if (faveurs.attendu) {
            blocage = "Les faveurs de ce tour ne sont pas encaissées (onglet Faveurs)";
        }

        if (nonPasses.length) {
            attente = "N'ont pas encore passé : " + nonPasses.map(j => j.nom).join(", ");
        }
    }

    // Avancer alors que tout le monde n'a pas passé : on demande confirmation
    const confirmerAvance = () => !attente ||
        window.confirm(attente + ".\n\nAvancer quand même ?");

    const enDeplacement = /d[ée]placement/i.test(etat.phase);
    const enDiplomatie = /diplomatie/i.test(etat.phase);
    const enScience = /science/i.test(etat.phase);
    const enProduction = /production/i.test(etat.phase);
    const enProposition = /proposition/i.test(etat.phase);
    const enTreve = /tr[eê]ve/i.test(etat.phase);
    const enRecrutement = /recrut/i.test(etat.phase);

    // Joueur affiché dans les onglets « plateau joueur » et « technologie »
    const vu = trouver(vuId) || trouver(moi) || joueurs[0];

    // --------------------------------------------------------
    // ORDRE DU TOUR
    //
    // L'ordre est celui des marqueurs sur les cases d'initiative du
    // déroulé (à défaut, celui des sièges). Un joueur qui a passé
    // (compteur joueur:<u>:passe) est ignoré jusqu'à la fin de la phase.
    // --------------------------------------------------------

    const parInitiative = [];

    for (let k = 1; k <= joueurs.length; k++) {
        const marqueur = (index.parZone.get("general:initiative:" + k) || [])
            .find(c => c.jeton === MARQUEUR && c.proprio);

        if (marqueur) {
            parInitiative.push(marqueur.proprio);
        }
    }

    // L'ordre de jeu est figé pendant toute la phase (compteurs ordre:<rang>,
    // écrits à chaque changement de phase) : un marqueur d'initiative déplacé
    // en passant ne change l'ordre qu'à la phase suivante.
    const ordreFige = joueurs
        .map((_, k) => Number(etat.compteurs["ordre:" + (k + 1)]))
        .filter(u => trouver(u));

    const ordreJeu = ordreFige.length === joueurs.length && new Set(ordreFige).size === joueurs.length
        ? ordreFige
        : (parInitiative.length === joueurs.length ? parInitiative : joueurs.map(j => j.userId));

    // Ordre de la phase suivante : celui des marqueurs, s'ils sont tous posés
    const ordreSuivant = parInitiative.length === joueurs.length ? parInitiative : ordreJeu;
    const ordreChange = ordreSuivant.some((u, k) => u !== ordreJeu[k]);

    const figerOrdre = ordreSuivant
        .map((u, k) => ({ type: "compteur", id: "ordre:" + (k + 1), valeur: u }))
        .filter(a => Number(etat.compteurs[a.id]) !== a.valeur);

    const aPasse = userId => !!etat.compteurs[`joueur:${userId}:passe`];

    // Prochain joueur qui n'a pas passé, après `depuis`
    function joueurApres(depuis, sauf) {
        const i = ordreJeu.indexOf(depuis);

        for (let k = 1; k <= ordreJeu.length; k++) {
            const u = ordreJeu[(i + k) % ordreJeu.length];

            if (!aPasse(u) && u !== sauf) {
                return u;
            }
        }

        return null;
    }

    const suivantId = joueurApres(etat.joueurActif);

    // À chaque nouvelle phase, plus personne n'a passé
    const remiseDesPasses = joueurs
        .filter(j => aPasse(j.userId))
        .map(j => ({ type: "compteur", id: `joueur:${j.userId}:passe`, valeur: 0 }));

    // Phases d'un tour, dans l'ordre de leur numéro (les phases spéciales
    // n'en font pas partie)
    const phases = phasesDuTour(elementsPhase.map(e => ({
        id: e.id,
        content: {
            name: e.name,
            numero: contenusPhase[e.id]?.numero,
            horsTour: contenusPhase[e.id]?.horsTour,
        },
    })))
        // Le décompte ne se joue qu'au dernier tour
        .filter(ph => etat.tour >= turnNumber || !/d[ée]compte/i.test(ph.nom));

    // « Nouveau tour » : à la dernière phase du tour seulement (ou au tour 0),
    // et jamais après le dernier tour
    const dernierePhase = etat.tour === 0 || iPhaseDe(phases, etat.phase) === -1 ||
        iPhaseDe(phases, etat.phase) === phases.length - 1;
    const dernierTour = etat.tour >= turnNumber;

    const iPhase = phases.findIndex(ph => ph.nom === etat.phase);

    // Indications « jeu en ligne » de la phase en cours (champ de la phase)
    const aideEnLigne = contenusPhase[phases[iPhase]?.id]?.enLigne || "";
    const aideVide = !aideEnLigne.replace(/<[^>]*>/g, "").trim();

    // Fin d'une phase : sont retirés les marqueurs d'activation de la carte
    // (espace des systèmes, planètes, ruines) et les marqueurs de faction
    // posés dans l'espace d'un système (zone hex:<i>), y compris ceux posés
    // sur un autre pion (une unité, la tuile).
    const retraitMarqueurs = Object.values(etat.composants)
        .filter(c => !c.ref && (
            (c.jeton === ACTIVATION && /^hex:\d+(:planete:\d+)?$/.test(c.zone)) ||
            (c.jeton === MARQUEUR && /^hex:\d+$/.test(c.zone))
        ))
        .map(c => ({ type: "supprimer", c: c.id }));

    // Fin d'une phase : les unités « usées » sont de nouveau disponibles
    const retraitUse = Object.values(etat.composants)
        .filter(c => !c.cache && c.ref?.type === "unit" && c.marques?.use)
        .map(c => ({ type: "marquer", c: c.id, marque: "use", valeur: false }));

    // Marqueurs de trêve, où qu'ils soient
    const retraitTreves = Object.values(etat.composants)
        .filter(c => estTreve(c, search) && c.zone !== "horsJeu")
        .map(c => ({ type: "supprimer", c: c.id }));

    // commentaire : celui d'un effet du jeu (BoutonRegle), pour le journal
    function changerPhase(pas, commentaire = "") {
        const phase = phases[iPhase + pas];

        // Script Trading : on quitte la phase de vote, les prédictions justes sont payées
        const trading = pas > 0 && /^(?!.*pr[ée]).*vote/i.test(etat.phase)
            ? tradingFinDeVote({ etat, index, joueurs, search, aScript: ctx.aScript, nomDe: ctx.nomDe })
            : { actions: [], messages: [] };

        // Nouvelle phase : plus personne n'a passé, le premier de l'ordre joue
        if (phase) {
            p.envoyer([commentaire, ...trading.messages].filter(Boolean).join(" — "), [
                ...trading.actions,
                ...(pas > 0 ? [...retraitMarqueurs, ...retraitUse] : []),
                // On arrive à la phase de trêve : les marqueurs de trêve sont retirés
                ...(pas > 0 && /tr[eê]ve/i.test(phase.nom) ? retraitTreves : []),
                ...remiseDesPasses,
                // Nouvelle phase : l'ordre des marqueurs d'initiative prend effet
                ...(pas > 0 ? figerOrdre : []),
                { type: "partie", phase: phase.nom, joueurActif: (pas > 0 ? ordreSuivant : ordreJeu)[0] ?? null },
            ]);

            if (trading.messages.length) {
                setAvis(trading.messages.join(" ; "));
            }
        }
    }

    // Phase précédente. À la première phase d'un tour, on revient à la
    // dernière phase du tour précédent : rien ne bloque un retour en arrière.
    function phasePrecedente() {

        if (iPhase > 0) {
            changerPhase(-1);
            return;
        }

        if (etat.tour > 1 && phases.length) {
            p.jouer([
                ...remiseDesPasses,
                {
                    type: "partie",
                    tour: etat.tour - 1,
                    phase: phases[phases.length - 1].nom,
                    joueurActif: ordreJeu[0] ?? null,
                },
            ]);
        }
    }

    // Tour suivant : on repart de la première phase
    function nouveauTour(commentaire = "") {
        p.envoyer(commentaire, [
            ...retraitMarqueurs,
            ...retraitUse,
            ...remiseDesPasses,
            ...figerOrdre,
            // Le vote du tour qui s'achève est remis à zéro (etat.js)
            { type: "reinitialiserVotes" },
            {
                type: "partie",
                tour: etat.tour + 1,
                phase: phases[0]?.nom ?? "",
                joueurActif: ordreSuivant[0] ?? null,
            },
        ]);
    }

    // Pendant le recrutement, Ctrl + clic sur un agent d'une case de
    // recrutement : il rejoint vos agents et son coût (le numéro de la case)
    // est retiré de votre influence. Un mercenaire coûte 2 de plus, et le
    // surcoût du tour (ligne du déroulé) en plus. Refusé si l'influence ne
    // suffit pas. Retourne vrai si le clic a été traité.
    //
    // Mes agents : un clic utilise l'agent (ou récupère un agent usé),
    // Ctrl + clic le supprime.
    function cliquer(id, event) {

        const c = etat.composants[id];

        // Phase de proposition : Ctrl + clic sur un agenda de ma main l'ajoute
        // aux agendas du tour suivant, en utilisant un politique. Une seule
        // fois par tour (compteur joueur:<u>:proposition = tour de la dernière).
        if (estJoueur && c && event.ctrlKey && enProposition &&
            c.ref?.type === "Agenda" && c.zone === `joueur:${moi}:main`) {

            const compteur = `joueur:${moi}:proposition`;
            const politique = agentDisponible(ctx, "politique");

            // (pas de tour suivant : là, l'action est impossible)
            if (etat.tour >= turnNumber) {
                p.setErreur("Il n'y a pas de tour suivant.");
                return true;
            }

            // Effet du jeu : hors conditions, une confirmation dit pourquoi
            // (sans politique disponible, aucun n'est usé)
            const commentaire = confirmerRegle(`Proposer ${nomElement(search, c.ref)}`, [
                Number(etat.compteurs[compteur]) === etat.tour && "vous avez déjà proposé un agenda ce tour",
                !politique && "vous n'avez pas de politique disponible (aucun ne sera usé)",
            ]);

            if (commentaire) {
                p.envoyer(commentaire, [
                    politique && { type: "deplacer", c: politique.id, vers: `joueur:${moi}:agentsUses` },
                    { type: "deplacer", c: id, vers: `general:agenda:${etat.tour + 1}` },
                    { type: "compteur", id: compteur, valeur: etat.tour },
                ]);
            }

            return true;
        }

        if (!estJoueur || !c) {
            return false;
        }

        // Marqueur libre : un clic rouvre sa fenêtre (texte, couleur)
        if (!c.ref && c.jeton === LIBRE) {
            setLibre(id);
            return true;
        }

        // Ce qui s'achète au recrutement : [supplément de coût, destination].
        // Un agent rejoint mes agents ; un mercenaire coûte 2 de plus et va
        // dans mes éléments actifs ; un plan de relique va dans ma main.
        const achats = {
            agent: [0, `joueur:${moi}:agents`],
            mercenaire: [2, `joueur:${moi}:actif`],
            relique: [0, `joueur:${moi}:main`],
        };

        // Clic sur le cube posé sur une carte mercenaire : c'est la carte qu'on achète.
        // Une unité mercenaire s'achète comme une carte mercenaire.
        const porteur = c.sur ? etat.composants[c.sur] : null;
        const achete = !c.ref && estMercenaire(porteur) ? porteur : c;
        const typeAchat = estMercenaire(achete) ? "mercenaire" : achete.ref?.type;
        const achat = achats[typeAchat];

        if (!achat) {
            return false;
        }

        const stock = `joueur:${moi}:agents`;
        const uses = `joueur:${moi}:agentsUses`;

        if (achete.ref.type === "agent" && (c.zone === stock || c.zone === uses)) {
            // (Ctrl + clic : dépensé — le script Bio stimulant propose de l'user à la place)
            p.jouer(event.ctrlKey
                ? depenserAgent(ctx, c, nomElement(search, c.ref))
                : { type: "deplacer", c: id, vers: c.zone === stock ? uses : stock });

            return true;
        }

        const m = /^general:boite:(\d+)$/.exec(achete.zone || "");

        if (!event.ctrlKey || !m || !/recrut/i.test(etat.phase)) {
            return false;
        }

        // Le surcoût du tour ne vaut que pour les mercenaires
        const surcout = typeAchat === "mercenaire"
            ? Number(deroule?.surCout?.[etat.tour - 1]) || 0
            : 0;

        const cout = Number(m[1]) + achat[0] + surcout;
        const compteur = `joueur:${moi}:inf`;
        const influence = Number(etat.compteurs[compteur]) || 0;
        const nom = nomElement(search, achete.ref);

        // Effet du jeu déclenché par un Ctrl + clic : hors conditions (influence
        // insuffisante, agent que ma faction ne peut pas avoir), une
        // confirmation dit pourquoi, et l'achat reste possible.
        // prix : le coût, une fois passé par les scripts de règles ; messages : ce qu'ils ont fait
        const acheter = (devient, obstacles = [], prix = cout, messages = []) => {

            const commentaire = confirmerRegle(`Recruter ${nom} (${prix} influence)`, [
                influence < prix && `influence insuffisante : ${nom} coûte ${prix}, vous avez ${influence}`,
                ...obstacles,
            ]);

            if (!commentaire) {
                return;
            }

            // Un script a modifié l'action : on le dit, en orange
            setAvis(messages.length ? `${messages.join(" ; ")} (coût : ${cout} → ${prix}).` : "");

            p.envoyer(commentaire, [
                { type: "compteur", id: compteur, delta: -prix },
                // (de : refusé si un autre joueur vient de l'acheter ; une unité
                // mercenaire devient la mienne : elle se pose ensuite sur la carte)
                {
                    type: "deplacer",
                    c: achete.id,
                    vers: achat[1],
                    de: achete.zone,
                    ...(achete.ref.type === "unit" ? { proprio: moi } : {}),
                },
                // Agent de base : il devient celui de ma faction
                devient && { type: "remplacer", c: achete.id, ref: { type: "agent", id: devient } },
            ]);
        };

        (async () => {

            const idFaction = ctx.factionDe(moi);

            // SCRIPTS DE RÈGLES (scripts.js) : ceux dont je possède la carte
            // (technologie débloquée, habilité de ma faction) modifient le coût
            const scripts = await scriptsDeRecrutement(etat, moi, idFaction, chargerContenu, scriptsDesactives);

            const effets = scripts
                .map(s => s.recrutement({ type: typeAchat, nom, nomDeBase: nom, cout, surcout }))
                .filter(Boolean);

            const prix = Math.max(0, cout + effets.reduce((total, e) => total + (Number(e.cout) || 0), 0));
            const messages = effets.map(e => e.message).filter(Boolean);

            if (achete.ref.type !== "agent") {
                acheter(undefined, [], prix, messages);
                return;
            }

            // Un agent de base (commun) recruté devient l'agent de base de ma
            // faction : celui-là même s'il est sur ma feuille, sinon l'agent de
            // ma feuille qui le réimplémente (Arborec : un logisticien devient un
            // généticien). Ni l'un ni l'autre : recrutement normalement impossible.
            // Un agent qui n'est pas de base est recruté tel quel.
            const [agent, faction] = await Promise.all([
                chargerContenu(achete.ref.id),
                idFaction > 0 ? chargerContenu(idFaction) : null,
            ]);

            const miens = (faction?.agents || []).map(lien => Number(lien?.id)).filter(id => id > 0);

            if (agent?.lienType !== "commun" || !miens.length || miens.includes(achete.ref.id)) {
                acheter(undefined, [], prix, messages);
                return;
            }

            const contenus = await Promise.all(miens.map(chargerContenu));
            const remplacant = miens.find((id, k) => Number(contenus[k]?.reimplemente?.id) === achete.ref.id);

            acheter(remplacant, [
                !remplacant && `votre faction n'a ni ${nom} ni un agent qui le réimplémente (il serait recruté tel quel)`,
            ], prix, messages);
        })();

        return true;
    }

    function passer() {
        p.jouer([
            { type: "compteur", id: `joueur:${moi}:passe`, valeur: 1 },
            { type: "partie", joueurActif: joueurApres(moi, moi) },
        ]);
    }

    // Attendre : utiliser un agent puis passer la main au joueur suivant.
    // Un diplomate à toute phase, un amiral à la phase de déplacement.
    function attendre(nomAgent) {

        const agent = agentDisponible(ctx, nomAgent);

        if (!agent) {
            p.setErreur(`Vous n'avez pas de ${nomAgent} disponible.`);
            return;
        }

        p.jouer([
            { type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` },
            { type: "partie", joueurActif: suivantId },
        ]);
    }

    // --------------------------------------------------------
    // PHASE DE PROPOSITION
    //
    // Piocher X propositions coûte X influence : les cartes vont dans une
    // zone que le joueur est seul à voir (joueur:<u>:choix). Il en prend
    // une en main, les autres retournent sous la pioche.
    // --------------------------------------------------------

    const zoneChoix = `joueur:${moi}:choix`;
    const aChoisir = index.parZone.get(zoneChoix) || [];

    // Une seule pioche de propositions par tour
    const compteurPioche = `joueur:${moi}:piocheProposition`;
    const dejaPioche = etat.tour > 0 && Number(etat.compteurs[compteurPioche]) === etat.tour;

    function piocherPropositions() {

        // Script École politique : 2 propositions de plus, même en dépensant 0 influence
        const bonus = ctx.aScript(moi, "ecole-politique-lois") ? 2 : 0;
        const paye = Math.floor(Number(nbPropositions));
        const n = Math.max(bonus ? 0 : 1, Math.min(10, Number.isFinite(paye) ? paye : 1));
        const compteur = `joueur:${moi}:inf`;
        const influence = Number(etat.compteurs[compteur]) || 0;
        const enPioche = (index.parZone.get("pioche:Agenda") || []).length;

        if (aChoisir.length) {
            p.setErreur("Choisissez d'abord une des propositions déjà piochées.");
            return;
        }

        if (dejaPioche) {
            p.setErreur("Vous avez déjà pioché des propositions ce tour.");
            return;
        }

        if (influence < n) {
            p.setErreur(`Influence insuffisante : piocher ${n} proposition(s) coûte ${n}, vous avez ${influence}.`);
            return;
        }

        if (enPioche < n + bonus) {
            p.setErreur(`Il ne reste que ${enPioche} agenda(s) dans la pioche.`);
            return;
        }

        p.jouer([
            { type: "compteur", id: compteurPioche, valeur: etat.tour, si: Number(etat.compteurs[compteurPioche]) || 0 },
            n > 0 && { type: "compteur", id: compteur, delta: -n },
            { type: "piocher", de: "pioche:Agenda", vers: zoneChoix, n: n + bonus },
        ].filter(Boolean));

        if (bonus) {
            setAvis(`École politique : ${n + bonus} propositions piochées pour ${n} influence (2 de plus).`);
        }
    }

    function choisirProposition(idCarte) {
        p.envoyer("Choix d'une proposition", [
            { type: "deplacer", c: idCarte, vers: `joueur:${moi}:main` },
            ...aChoisir
                .filter(c => c.id !== idCarte)
                .map(c => ({ type: "deplacer", c: c.id, vers: "pioche:Agenda", dessous: true })),
        ]);
    }

    async function supprimer() {

        if (!window.confirm(`Supprimer définitivement la partie « ${partie.nom} » ?`)) {
            return;
        }

        const r = await p.requete("partie/" + partie.id, "DELETE");

        if (r?.supprime) {
            navigate({ search: "" });
        }
    }

    return (
        <Engine value={ctx}>
            <div style={styleCadre}>

                {/* ============================================
                    EN-TÊTE
                ============================================ */}

                <div style={styleBarre}>

                    {/* Replié : il ne reste que le tour, la phase, l'ordre de jeu et
                        « Phase suivante » ; les corrections manuelles sont masquées */}
                    <BoutonRepli ferme={enteteReduit} basculer={basculerEntete} />

                    {/* Le retour à la liste est dans la barre de navigation (« Parties ») */}
                    <b style={{ fontSize: 18 }}>{partie.nom}</b>

                    <span>
                        Tour{" "}
                        {!enteteReduit && (
                            <button
                                type="button"
                                disabled={!estJoueur}
                                title="Correction manuelle du tour"
                                onClick={() => p.jouer({ type: "partie", tour: etat.tour - 1 })}
                            >
                                −
                            </button>
                        )}
                        <b style={{ fontSize: 18, margin: "0 6px" }}>{etat.tour}</b>
                        {!enteteReduit && (
                            <button
                                type="button"
                                disabled={!estJoueur}
                                title="Correction manuelle du tour"
                                onClick={() => p.jouer({ type: "partie", tour: etat.tour + 1 })}
                            >
                                +
                            </button>
                        )}
                    </span>

                    {/* À la dernière phase du tour seulement (et au tour 0) */}
                    {(!enteteReduit || (dernierePhase && !dernierTour)) && (
                        <BoutonRegle
                            nom="Nouveau tour"
                            disabled={!estJoueur || dernierTour}
                            obstacles={[
                                !dernierePhase && "ce n'est pas la dernière phase du tour (avant : « Phase suivante »)",
                                blocage,
                                attente,
                            ]}
                            faire={nouveauTour}
                            title={dernierTour
                                ? `Le tour ${turnNumber} est le dernier`
                                : "Passe au tour suivant et revient à la première phase"}
                        >
                            Nouveau tour
                        </BoutonRegle>
                    )}

                    <span>
                        Phase{" "}
                        {!enteteReduit && (
                            <button
                                type="button"
                                disabled={!estJoueur || (iPhase <= 0 && etat.tour <= 1)}
                                onClick={phasePrecedente}
                                title={iPhase > 0
                                    ? "Phase précédente"
                                    : "Revenir à la dernière phase du tour précédent"}
                            >
                                ◀
                            </button>
                        )}
                        <b style={{ margin: "0 6px" }}>{etat.phase || "—"}</b>
                        {/* Rouge gris tant qu'un combat est ouvert, que des faveurs restent à
                            encaisser ou que tout le monde n'a pas passé : on peut quand
                            même avancer, après confirmation */}
                        <BoutonRegle
                            nom="Phase suivante"
                            disabled={!estJoueur || !phases[iPhase + 1]}
                            obstacles={[blocage, attente]}
                            faire={commentaire => changerPhase(1, commentaire)}
                            title="Tout le monde a passé : phase suivante"
                        >
                            Phase suivante ▶
                        </BoutonRegle>
                    </span>

                    {/* Correction manuelle : « Joueur suivant » et « Passer » sont
                        dans le volet de droite */}
                    {!enteteReduit && (
                    <label>
                        Doit jouer{" "}
                        <select
                            value={etat.joueurActif ?? ""}
                            disabled={!estJoueur}
                            onChange={e => p.jouer({ type: "partie", joueurActif: Number(e.target.value) || null })}
                            style={{
                                fontWeight: "bold",
                                border: "3px solid " + (ctx.couleurDe(etat.joueurActif) || "#666"),
                            }}
                        >
                            <option value="">personne</option>
                            {joueurs.map(j => (
                                <option key={j.userId} value={j.userId}>{j.nom}</option>
                            ))}
                        </select>
                    </label>
                    )}

                    {/* Les joueurs dans l'ordre d'initiative : à qui le tour, qui a
                        passé, qui joue encore */}
                    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                        {ordreJeu.map((u, k) => {

                            const sonTour = etat.joueurActif === u;
                            const passe = aPasse(u);

                            return (
                                <span
                                    key={u}
                                    title={sonTour ? "C'est son tour" : (passe ? "A passé" : "Joue encore")}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "1px 8px",
                                        borderRadius: 12,
                                        border: `${sonTour ? 3 : 1}px solid ${sonTour ? "#c00" : "#888"}`,
                                        backgroundColor: sonTour ? "#fff3cd" : (passe ? "#e0e0e0" : "#fff"),
                                        color: passe ? "#777" : "#000",
                                        fontWeight: sonTour ? "bold" : "normal",
                                        fontSize: 13,
                                    }}
                                >
                                    <span
                                        style={{
                                            display: "inline-block",
                                            width: 12,
                                            height: 12,
                                            borderRadius: "50%",
                                            backgroundColor: ctx.couleurDe(u) || "#888",
                                            border: "1px solid #000",
                                        }}
                                    />
                                    {k + 1}. {ctx.nomDe(u)}
                                    <span style={{ fontSize: 11 }}>
                                        {sonTour ? "▶ son tour" : (passe ? "a passé" : "joue encore")}
                                    </span>
                                </span>
                            );
                        })}
                    </span>

                    {/* L'ordre choisi en passant ne vaut qu'à la phase suivante */}
                    {ordreChange && (
                        <span style={{ fontSize: 12, color: "#444" }}>
                            Ordre à la phase suivante : {ordreSuivant.map(u => ctx.nomDe(u)).join(", ")}
                        </span>
                    )}

                    {etat.joueurActif === moi && (
                        <b style={{ padding: "1px 8px", borderRadius: 6, backgroundColor: COULEUR_A_FAIRE }}>
                            À vous de jouer
                        </b>
                    )}

                    {/* Ce qui empêche de passer à la phase suivante */}
                    {blocage && (
                        <span style={{ color: "#a15c00", fontSize: 13 }}>
                            Phase suivante bloquée — {blocage}.
                        </span>
                    )}

                    {/* Des joueurs n'ont pas passé : signalé, mais pas bloquant */}
                    {attente && (
                        <span style={{ color: "#7a1f1f", fontSize: 13 }}>
                            {attente}.
                        </span>
                    )}

                    {!estJoueur && <i>Vous regardez cette partie.</i>}

                    {partie.createur === moi && !enteteReduit && (
                        <button type="button" onClick={supprimer} style={{ marginLeft: "auto" }}>
                            Supprimer la partie
                        </button>
                    )}
                </div>

                {/* ============================================
                    ERREUR
                ============================================ */}

                {/* Fixe, au-dessus des fenêtres : visible même page défilée ou
                    fiche ouverte. S'efface à l'action suivante. */}
                {p.erreur && (
                    <div
                        role="alert"
                        style={{
                            position: "fixed",
                            top: 8,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 9500,
                            maxWidth: "90vw",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 12px",
                            backgroundColor: "#fdd",
                            color: "#600",
                            border: "2px solid #c00",
                            borderRadius: 8,
                            boxShadow: "0 2px 8px #0006",
                            fontWeight: "bold",
                        }}
                    >
                        {p.erreur}
                        <button type="button" title="Fermer ce message" onClick={() => p.setErreur("")}>×</button>
                    </div>
                )}

                {/* Un script de règles vient de modifier une action : en orange,
                    sous l'éventuel message d'erreur */}
                {avis && (
                    <div
                        role="status"
                        data-avis-script
                        style={{
                            position: "fixed",
                            top: p.erreur ? 52 : 8,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 9500,
                            maxWidth: "90vw",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 12px",
                            backgroundColor: "#ffe0b2",
                            color: "#5d3200",
                            border: "2px solid #ef6c00",
                            borderRadius: 8,
                            boxShadow: "0 2px 8px #0006",
                            fontWeight: "bold",
                        }}
                    >
                        {avis}
                        <button type="button" title="Fermer ce message" onClick={() => setAvis("")}>×</button>
                    </div>
                )}

                {/* ============================================
                    QUE FAIRE À CETTE PHASE (jeu en ligne)
                ============================================ */}

                {/* Tour 0 : chacun applique la mise en place de sa faction */}
                {etat.tour === 0 && (
                    <div style={styleAide}>
                        <BoutonRepli ferme={aideReduite} basculer={basculerAide} />
                        <b>Tour 0 — mise en place</b>

                        {!aideReduite && (<>
                            <div style={{ fontSize: 13 }}>
                                Votre système natal et vos unités de départ sont dans vos éléments actifs.
                                « Mise en place de ma faction » pose le système sur une case natale libre
                                (ou le laisse où vous l'avez glissé) et vos unités dessus. Puis « Nouveau
                                tour » quand tout le monde est prêt.
                            </div>
                            {maFaction?.setup && (
                                <Text text={maFaction.setup} style={{ fontSize: 13, color: "#000" }} />
                            )}
                            <MiseEnPlaceJoueur />
                        </>)}
                    </div>
                )}

                {etat.tour > 0 && (!aideVide ||
                    ((enDeplacement || enDiplomatie || enScience || enProduction || enProposition || enTreve || enRecrutement) && estJoueur)) && (
                    <div style={styleAide}>
                        <BoutonRepli ferme={aideReduite} basculer={basculerAide} />
                        <b>À faire — {etat.phase}</b>

                        {!aideReduite && (<>

                        {!aideVide && (
                            <Text text={aideEnLigne} style={{ fontSize: 13, color: "#000" }} />
                        )}

                        {/* Phase de diplomatie : transaction entre deux factions */}
                        {enDiplomatie && estJoueur && (
                            <div style={{ ...styleBarre, marginTop: 4, marginBottom: 2 }}>
                                <button
                                    type="button"
                                    onClick={() => setTransaction(true)}
                                    style={{ fontWeight: "bold" }}
                                >
                                    Transaction…
                                </button>
                                <span>Promesses, dettes et faveurs entre deux factions.</span>
                            </div>
                        )}

                        {/* Phase de science : les actions se font sur la carte */}
                        {enScience && estJoueur && (
                            <div style={{ marginTop: 4, fontSize: 13 }}>
                                <b>Explorer :</b> Ctrl + clic sur un emplacement vide à côté d'un
                                système pose la première tuile de la pioche (use un logisticien
                                et un scientifique).{" "}
                                <b>Rechercher, fouiller une ruine :</b> cliquer sur un système,
                                les boutons sont à côté de chaque planète.
                            </div>
                        )}

                        {/* Phase de recrutement : les achats se font au Ctrl + clic */}
                        {enRecrutement && estJoueur && (
                            <div style={{ marginTop: 4, fontSize: 13 }}>
                                <b>Recruter :</b> onglet « Plateau général », Ctrl + clic sur un agent,
                                un mercenaire ou un plan de relique d'une case de recrutement : il est
                                acheté (le coût de la case est retiré de votre influence ; un mercenaire
                                coûte 2 de plus{Number(deroule?.surCout?.[etat.tour - 1]) > 0
                                    ? `, et ${Number(deroule.surCout[etat.tour - 1])} de plus ce tour,`
                                    : ""} et va dans vos éléments actifs ; un plan va dans votre main).
                            </div>
                        )}

                        {/* Phase de déclaration de trêve */}
                        {enTreve && estJoueur && (
                            <div style={{ marginTop: 4, fontSize: 13 }}>
                                <b>Déclarer une trêve :</b> clic sur un système, puis « Déclarer une trêve » :
                                votre marqueur de trêve y est posé et un de vos diplomates détruit. Les marqueurs de trêve
                                précédents ont été retirés en arrivant à cette phase.
                            </div>
                        )}

                        {/* Phase de production */}
                        {enProduction && estJoueur && (
                            <div style={{ marginTop: 4, fontSize: 13 }}>
                                <b>Produire :</b> cocher « Production » dans la réserve, puis
                                glisser une unité : son coût est retiré de vos ressources.{" "}
                                <b>Mobiliser :</b> cliquer sur un système, le bouton est à côté
                                de chaque planète que vous possédez.
                            </div>
                        )}

                        {/* Phase de proposition */}
                        {enProposition && estJoueur && (
                            <div style={{ ...styleBarre, marginTop: 4, marginBottom: 2 }}>
                                <span>
                                    Piocher{" "}
                                    <input
                                        type="number"
                                        min={ctx.aScript(moi, "ecole-politique-lois") ? 0 : 1}
                                        max={10}
                                        value={nbPropositions}
                                        onChange={e => setNbPropositions(e.target.value)}
                                        style={{ width: 48 }}
                                    />{" "}
                                    <button
                                        type="button"
                                        disabled={dejaPioche}
                                        onClick={piocherPropositions}
                                        title={dejaPioche ? "Une seule pioche de propositions par tour" : undefined}
                                        style={{ fontWeight: "bold" }}
                                    >
                                        {dejaPioche
                                            ? "✔ propositions piochées ce tour"
                                            : "proposition(s) (coûte autant d'influence)" +
                                                (ctx.aScript(moi, "ecole-politique-lois") ? " + 2 gratuites (École politique)" : "")}
                                    </button>
                                </span>
                                <span>
                                    Ctrl + clic sur un agenda de votre main : l'ajoute au tour
                                    suivant (use un politique, une fois par tour).
                                </span>
                            </div>
                        )}

                        {/* Actions de la phase de déplacement */}
                        {enDeplacement && estJoueur && (
                            <div style={{ ...styleBarre, marginTop: 4, marginBottom: 2 }}>
                                <button type="button" onClick={() => attendre("amiral")}>
                                    Attendre (use un amiral, joueur suivant)
                                </button>
                                <span>
                                    Ctrl + clic sur un système : pose votre marqueur de faction dessus.
                                    « Attendre » avec un diplomate est dans le volet de droite, à toute phase.
                                </span>
                            </div>
                        )}

                        </>)}
                    </div>
                )}

                {/* Les actions sont validées tout de suite : pas de coup en attente */}

                <Plan style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>

                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* ====================================
                            ONGLETS
                        ==================================== */}

                        <div style={styleBarre}>
                            {onglets.map(([cle, libelle]) => (
                                <button
                                    key={cle}
                                    type="button"
                                    onClick={() => setOnglet(cle)}
                                    style={{
                                        padding: "6px 12px",
                                        fontWeight: onglet === cle ? "bold" : "normal",
                                        border: onglet === cle ? "3px solid #ff9800" : "1px solid #555",
                                        borderRadius: 5,
                                        // Messages non lus : l'onglet Chat est mis en avant ;
                                        // combat ou blocage en cours : l'onglet Conflit
                                        backgroundColor:
                                            (cle === "chat" && messagesNonLus) ? "#ffe082"
                                                : (cle === "combat" && combatEnCours)
                                                    ? (combatAvecMoi ? COULEUR_COMBAT.avecMoi : COULEUR_COMBAT.sansMoi)
                                                    : (cle === "faveurs" && faveurs.attendu) ? "#ffe082"
                                                        : (cle === "transactions" && transactionsEnCours.length)
                                                            ? (transactionPourMoi ? "#ffe082" : "#e0e0e0")
                                                            : undefined,
                                    }}
                                >
                                    {libelle}{cle === "combat" && combatEnCours ? ` (${combats.length + passages.length})` : ""}
                                    {cle === "transactions" && transactionsEnCours.length > 0
                                        ? ` (${transactionsEnCours.length})`
                                        : ""}
                                    {cle === "chat" && messagesNonLus > 0 && (
                                        <b
                                            style={{
                                                marginLeft: 6,
                                                padding: "0 6px",
                                                borderRadius: 9,
                                                backgroundColor: "#c00",
                                                color: "#fff",
                                            }}
                                        >
                                            {messagesNonLus}
                                        </b>
                                    )}
                                </button>
                            ))}

                            {["joueur", "tech", "vote"].includes(onglet) && joueurs.map(j => (
                                <button
                                    key={j.userId}
                                    type="button"
                                    onClick={() => setVuId(j.userId)}
                                    style={{
                                        padding: "4px 10px",
                                        fontWeight: vu.userId === j.userId ? "bold" : "normal",
                                        border: `${vu.userId === j.userId ? 4 : 2}px solid ${couleurJoueur(j)}`,
                                        borderRadius: 12,
                                    }}
                                >
                                    {j.nom}
                                </button>
                            ))}
                        </div>

                        {/* La carte reste montée quand on change d'onglet : son zoom
                            et son défilement sont gardés */}
                        <div style={{ display: onglet === "espace" ? "block" : "none" }}>
                            <Barriere nom="la carte">
                                <Espace />
                            </Barriere>
                        </div>

                        {/* (key : changer d'onglet relance l'affichage après une erreur) */}
                        <Barriere nom="cet onglet" key={onglet}>
                            {onglet === "combat" && <Combat />}
                            {onglet === "joueur" && <PlateauJoueur key={vu.userId} vu={vu} />}
                            {onglet === "tech" && <Technologie key={vu.userId} vu={vu} />}
                            {onglet === "general" && <PlateauGeneral />}
                            {onglet === "vote" && <Vote key={vu.userId} vu={vu} />}
                            {onglet === "faveurs" && <Faveurs />}
                            {onglet === "transactions" && <Transactions nouvelle={() => setTransaction(true)} />}
                            {onglet === "chat" && (
                                <Chat messages={p.chat} ecrire={p.ecrire} lu={chatLu} marquerLu={marquerLu} />
                            )}
                            {onglet === "notes" && <Notes />}
                            {onglet === "journal" && <Journal />}
                            {onglet === "aide" && <Aide />}
                        </Barriere>
                    </div>

                    {/* ========================================
                        VOLET : MA MAIN, MA RÉSERVE
                    ======================================== */}

                    {estJoueur && (
                        <div
                            style={{
                                width: 250,
                                flexShrink: 0,
                                // Grille : les zones gardent leur hauteur, le volet défile
                                display: "grid",
                                alignContent: "start",
                                gap: 8,
                                position: "sticky",
                                top: 50,
                                maxHeight: "90vh",
                                overflowY: "auto",
                            }}
                        >
                            <FinDeTour
                                p={p}
                                suivantId={suivantId}
                                passer={passer}
                                aPasse={aPasse(moi)}
                                attendre={etat.tour > 0 ? () => attendre("diplomate") : null}
                            />

                            {/* Chaque bloc se replie (▾) ; l'état est gardé dans le navigateur */}

                            {/* Mes ressources, mon influence et mon commerce */}
                            <Repli cle="compteurs" titre="Mes ressources">
                                <MesCompteurs userId={moi} />
                            </Repli>

                            {/* Clic : utiliser l'agent. Ctrl + clic : le supprimer. */}
                            <Zone
                                zone={`joueur:${moi}:agents`}
                                titre="Mes agents (clic : utiliser, Ctrl + clic : retirer)"
                                repli="agents"
                            />
                            <Zone zone={`joueur:${moi}:agentsUses`} titre="Mes agents usés" repli="agentsUses" />

                            <Zone zone={`joueur:${moi}:main`} titre="Ma main" cartes={0.65} repli="main" />

                            {/* Marqueurs à poser : le mien, et le marqueur d'activation
                                (neutre, noir). Illimités : glisser vers la carte. */}
                            <Repli cle="marqueurs" titre="Mes marqueurs" style={{ backgroundColor: "#fff" }}>
                                <div>
                                    <Source jeton={MARQUEUR} libelle="Marqueur" />
                                    <Source jeton={ACTIVATION} libelle="Activation" neutre />
                                </div>
                            </Repli>

                            {/* L'infanterie est illimitée : glisser sa source vers la carte */}
                            <Zone zone={`joueur:${moi}:reserve`} titre="Ma réserve" repli="reserve">
                                <CaseProduction />
                                <SourcesIllimitees userId={moi} />
                            </Zone>
                            <Zone zone={`joueur:${moi}:fragments`} titre="Mes fragments" repli="fragments" />
                            <Zone zone={`joueur:${moi}:actif`} titre="Mes éléments actifs" repli="actif" />

                            {/* Les dés sont juste au-dessus des derniers coups */}
                            <Repli cle="des" titre="Dés">
                                <Barriere nom="le lanceur de dés">
                                    <Des nu />
                                </Barriere>
                            </Repli>

                            {/* Marqueur libre : glisser pour le poser, sa fenêtre
                                (texte, couleur) s'ouvre tout de suite ; un clic
                                dessus la rouvre */}
                            <Repli cle="libre" titre="Marqueur libre" style={{ backgroundColor: "#fff" }}>
                                <div>
                                    <Source jeton={LIBRE} libelle="Marqueur libre" couleur={COULEUR_LIBRE} />
                                </div>
                            </Repli>

                            <Repli cle="coups" titre="Derniers coups" style={{ backgroundColor: "#fff" }}>
                                <Barriere nom="les derniers coups">
                                    <Journal limite={4} />
                                </Barriere>
                            </Repli>
                        </div>
                    )}
                </Plan>

                {fiche && <Fiche id={fiche} fermer={() => setFiche(null)} />}
                {cachee && <FicheCachee zone={cachee} fermer={() => setCachee(null)} />}
                {libre && <FicheLibre id={libre} fermer={() => setLibre(null)} />}
                {transaction && <Transaction fermer={() => setTransaction(false)} />}
                {aChoisir.length > 0 && <ChoixProposition cartes={aChoisir} choisir={choisirProposition} />}
            </div>
        </Engine>
    );
}

// ============================================================
// PROPOSITIONS PIOCHÉES : en prendre une en main
// ============================================================

function ChoixProposition({ cartes, choisir }) {

    // Réduite : la fenêtre laisse voir sa main et la carte avant de choisir
    const [reduite, setReduite] = useState(false);

    if (reduite) {
        return (
            <button
                type="button"
                onClick={() => setReduite(false)}
                style={{
                    position: "fixed",
                    left: 12,
                    bottom: 12,
                    zIndex: 9000,
                    padding: "8px 14px",
                    fontWeight: "bold",
                    backgroundColor: COULEUR_A_FAIRE,
                    border: "2px solid #444",
                    borderRadius: 8,
                    cursor: "pointer",
                }}
            >
                Propositions piochées ({cartes.length}) : en choisir une…
            </button>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#0008",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                style={{
                    maxWidth: "94vw",
                    maxHeight: "85vh",
                    overflow: "auto",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={styleBarre}>
                    <b style={{ fontSize: 18 }}>Propositions piochées</b>
                    <button
                        type="button"
                        onClick={() => setReduite(true)}
                        title="Masque cette fenêtre le temps de regarder votre main ou la carte"
                        style={{ marginLeft: "auto" }}
                    >
                        Réduire
                    </button>
                </div>
                <div style={{ margin: "4px 0 8px" }}>
                    Choisissez-en une à prendre en main. Les autres retournent sous la pioche.
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {cartes.map(c => (
                        <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            {c.ref
                                ? <LoadAndDisplay link={{ ...c.ref, __link: true }} />
                                : <i>carte inconnue</i>}
                            <button
                                type="button"
                                onClick={() => choisir(c.id)}
                                style={{ fontWeight: "bold", padding: "6px 12px" }}
                            >
                                Prendre en main
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// CARTE FACE CACHÉE (clic sur une carte cachée d'une zone publique)
//
//   Révéler    la retourne face visible pour tout le monde
//   Consulter  la montre à soi seul ; la carte reste cachée, et la
//              consultation est notée dans le journal
// ============================================================

function FicheCachee({ zone, fermer }) {

    const { jouer, coups, moi, partie, nomDe } = useEngine();

    // Numéro du dernier coup au moment où on a demandé à consulter
    const [apres, setApres] = useState(null);

    // Cartes montrées par ma consultation, lues dans le journal
    let vues = [];

    if (apres !== null) {
        for (const coup of coups) {

            if (coup.n <= apres || coup.auteur !== moi) {
                continue;
            }

            const action = coup.actions.find(a => a.type === "consulter" && a.zone === zone && !a.cache);

            if (action) {
                vues = action.composants.filter(c => c.ref);
                break;
            }
        }
    }

    return (
        <div
            onClick={fermer}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#0008",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                onClick={event => event.stopPropagation()}
                style={{
                    maxWidth: "92vw",
                    maxHeight: "85vh",
                    overflow: "auto",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={styleBarre}>
                    <b style={{ fontSize: 18 }}>Carte face cachée</b>
                    <span style={{ color: "#666" }}>{nomZone(zone, nomDe)}</span>
                    <button type="button" onClick={fermer} style={{ marginLeft: "auto" }}>Fermer</button>
                </div>

                <div style={styleBarre}>
                    <button
                        type="button"
                        onClick={() => {
                            jouer({ type: "reveler", zone });
                            fermer();
                        }}
                        style={{ fontWeight: "bold" }}
                    >
                        Révéler à tous
                    </button>
                    <button
                        type="button"
                        disabled={apres !== null}
                        onClick={() => {
                            setApres(partie.version);
                            jouer({ type: "consulter", zone });
                        }}
                    >
                        Consulter (pour moi seul)
                    </button>
                    <span style={{ color: "#666" }}>
                        La consultation est notée dans le journal, sans le contenu.
                    </span>
                </div>

                {apres !== null && vues.length === 0 && <div>Consultation en cours…</div>}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {vues.map((c, i) => (
                        <div key={i}>
                            <LoadAndDisplay link={c.ref} />
                            {/* La carte consultée peut être montrée à un autre joueur */}
                            <div style={{ marginTop: 4 }}>
                                <MontrerA lien={c.ref} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// FIN DE MON TOUR (volet de droite)
//
// Les actions sont validées tout de suite : il n'y a plus de coup
// à envoyer. Ce bouton passe la main au joueur suivant.
// ============================================================

function FinDeTour({ p, suivantId, passer, aPasse, attendre }) {

    const ctx = useEngine();

    // Jaune à mon tour (j'ai quelque chose à faire), neutre sinon
    const monTour = ctx.etat.joueurActif === ctx.moi;

    // Passer la main n'est possible qu'à son tour. Si personne n'a la main
    // (ou un joueur qui n'est plus dans la partie), n'importe qui la donne ;
    // « Doit jouer », dans l'en-tête déplié, reste la correction manuelle.
    const tourDunAutre = !monTour && ctx.partie.joueurs.some(j => j.userId === ctx.etat.joueurActif);

    return (
        <div
            style={{
                padding: 6,
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
                border: "1px solid #aaa",
            }}
        >
            <button
                type="button"
                disabled={p.envoi || tourDunAutre}
                onClick={() => p.jouer({ type: "partie", joueurActif: suivantId })}
                title={tourDunAutre
                    ? `C'est le tour de ${ctx.nomDe(ctx.etat.joueurActif)}`
                    : "Passe la main au joueur suivant dans l'ordre d'initiative"}
                style={{
                    display: "block",
                    width: "100%",
                    fontWeight: "bold",
                    padding: "6px 0",
                    backgroundColor: monTour ? COULEUR_A_FAIRE : COULEUR_NEUTRE,
                    color: "#000",
                    border: "1px solid #333",
                    borderRadius: 4,
                    cursor: "pointer",
                }}
            >
                {monTour
                    ? "Fin de mon tour : joueur suivant"
                    : (tourDunAutre ? `Tour de ${ctx.nomDe(ctx.etat.joueurActif)}` : "Joueur suivant")}
            </button>

            {/* Attendre : use un diplomate et passe la main (à toute phase) */}
            {attendre && (
                <button
                    type="button"
                    disabled={p.envoi || aPasse || tourDunAutre}
                    onClick={attendre}
                    title={tourDunAutre
                        ? "Possible à votre tour seulement"
                        : "Use un de vos diplomates disponibles et passe la main au joueur suivant"}
                    style={{ display: "block", width: "100%", marginTop: 4 }}
                >
                    Attendre (use un diplomate)
                </button>
            )}

            <button
                type="button"
                disabled={p.envoi || aPasse}
                onClick={passer}
                title="Vous êtes retiré de l'ordre du tour jusqu'à la fin de la phase"
                style={{ display: "block", width: "100%", marginTop: 4 }}
            >
                {aPasse ? "Vous avez passé" : "Passer (jusqu'à la fin de la phase)"}
            </button>
        </div>
    );
}
// ============================================================
// MARQUEUR LIBRE : texte et couleur
//
// Ouverte dès qu'on pose un marqueur libre (glissé depuis le
// volet de droite), puis par un clic dessus.
// ============================================================

const COULEURS_LIBRES = ["#fff59d", "#ffcc80", "#ef9a9a", "#ce93d8", "#90caf9", "#a5d6a7", "#ffffff", "#424242"];

// Couleur foncée (texte en blanc dessus)
const estSombre = fond => /^#([0-9a-f]{6})$/i.test(fond) &&
    parseInt(fond.slice(1, 3), 16) * 0.3 + parseInt(fond.slice(3, 5), 16) * 0.59 + parseInt(fond.slice(5, 7), 16) * 0.11 < 128;

function FicheLibre({ id, fermer }) {

    const { etat, jouer, nomDe } = useEngine();

    const c = etat.composants[id];

    const [texte, setTexte] = useState(() => String(c?.marques?.texte ?? ""));
    const [couleur, setCouleur] = useState(() => c?.marques?.couleur || COULEUR_LIBRE);

    if (!c || c.cache) {
        return null;
    }

    function enregistrer(event) {

        event?.preventDefault();

        jouer([
            { type: "marquer", c: c.id, marque: "texte", valeur: texte.trim() || null },
            { type: "marquer", c: c.id, marque: "couleur", valeur: couleur },
        ]);

        fermer();
    }

    return (
        <div
            onClick={fermer}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#0008",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 80,
            }}
        >
            <form
                role="dialog"
                aria-label="Marqueur libre"
                onSubmit={enregistrer}
                onClick={event => event.stopPropagation()}
                style={{
                    width: "min(420px, 92vw)",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}
            >
                <div style={styleBarre}>
                    <b style={{ fontSize: 16 }}>Marqueur libre</b>
                    <span style={{ color: "#666" }}>
                        {nomZone(c.zone, nomDe)}{c.proprio ? ` · posé par ${nomDe(c.proprio)}` : ""}
                    </span>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    Texte ({texte.length}/120)
                    <textarea
                        autoFocus
                        rows={3}
                        maxLength={120}
                        value={texte}
                        onChange={e => setTexte(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && enregistrer(e)}
                        style={{ resize: "vertical", padding: 4 }}
                    />
                </label>

                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5 }}>
                    Couleur
                    {COULEURS_LIBRES.map(teinte => (
                        <button
                            key={teinte}
                            type="button"
                            title={teinte}
                            aria-label={"Couleur " + teinte}
                            aria-pressed={couleur === teinte}
                            onClick={() => setCouleur(teinte)}
                            style={{
                                width: 22,
                                height: 22,
                                padding: 0,
                                backgroundColor: teinte,
                                border: couleur === teinte ? "3px solid #000" : "1px solid #888",
                                borderRadius: 4,
                            }}
                        />
                    ))}
                    <input type="color" value={couleur} onChange={e => setCouleur(e.target.value)} title="Autre couleur" />
                </div>

                <div style={styleBarre}>
                    <button type="submit" style={{ fontWeight: "bold", padding: "4px 14px" }}>Enregistrer</button>
                    <button type="button" onClick={fermer}>Annuler</button>
                    <button
                        type="button"
                        onClick={() => {
                            jouer({ type: "supprimer", c: c.id });
                            fermer();
                        }}
                        style={{ marginLeft: "auto" }}
                    >
                        Retirer le marqueur
                    </button>
                </div>
            </form>
        </div>
    );
}

// ============================================================
// FICHE D'UN COMPOSANT (ouverte par un clic sur un pion)
// ============================================================

function Fiche({ id, fermer }) {

    const { etat, index, jouer, joueur, moi, partie, jeu, search, nomDe, signaler, aScript } = useEngine();

    const c = etat.composants[id];

    // Contenu de la carte, pour y trouver les cartes qu'elle cite
    const contenu = useElement(c && !c.cache && c.ref ? c.ref.id : -1);

    if (!c || c.cache) {
        return null;
    }

    // Cartes citées : les liens |123| du texte et le champ Lien de l'élément
    const cites = [];

    function citer(idCite) {
        const element = search.find(e => e.id === idCite);

        if (element && idCite !== c.ref?.id && !cites.some(lien => lien.id === idCite)) {
            cites.push({ type: element.type, id: idCite });
        }
    }

    for (const m of JSON.stringify(contenu || {}).matchAll(/\|(\d+)\|/g)) {
        citer(Number(m[1]));
    }

    for (const lien of contenu?.Lien || []) {
        citer(lien?.id);
    }

    const nom = c.ref ? nomElement(search, c.ref) : c.jeton;
    const degat = Number(c.marques?.degat) || 0;
    const portes = index.parPorteur.get(c.id) || [];
    const type = c.ref?.type;

    const verso = c.face === "verso" && c.ref && getHandler(jeu, type)?.display?.verso;

    // Carte que je suis seul à voir (ma main, carte cachée à moi) : je peux
    // la montrer à un autre joueur par le chat privé
    const vueParMoiSeul = !!c.ref && type !== "unit" && quiVoit(c, etat) === moi;

    // Vaisseaux de la même case, sur lesquels l'unité peut embarquer
    const hex = /^hex:\d+/.exec(c.zone)?.[0];

    const porteurs = hex
        ? (index.parZone.get(hex) || []).filter(v =>
            v.id !== c.id && !v.cache && aMotCle(v, "ship")
        )
        : [];

    const marquer = (marque, valeur) => jouer({ type: "marquer", c: c.id, marque, valeur });

    function deplacer(zone) {

        // Vers la main d'un autre : on ne pourra pas la reprendre soi-même
        const autre = /^joueur:(\d+):main$/.exec(zone);

        if (autre && Number(autre[1]) !== moi &&
            !window.confirm(`Donner cet élément à ${nomDe(Number(autre[1]))} ? Il ira dans sa main, que vous ne voyez pas.`)) {
            return;
        }

        jouer({ type: "deplacer", c: c.id, vers: zone });
        fermer();
    }

    // --------------------------------------------------------
    // CONSTRUIRE UNE RELIQUE (phase de science)
    //
    // Une relique de ma main : un scientifique est supprimé, les
    // fragments demandés par la relique sont supprimés, la relique
    // passe dans mes éléments actifs et mon marqueur avance de ses
    // points sur la piste des points.
    // --------------------------------------------------------

    const constructible = joueur && type === "relique" && !!contenu &&
        c.zone === `joueur:${moi}:main` && /science/i.test(etat.phase);

    // Fragments demandés : [jeton, nombre]
    const besoins = [
        [FRAGMENTS.ancien[0], Number(contenu?.coutAnc) || 0],
        [FRAGMENTS.mil[0], Number(contenu?.coutMil) || 0],
        [FRAGMENTS.spa[0], Number(contenu?.coutSpa) || 0],
        [FRAGMENTS.civ[0], Number(contenu?.coutCiv) || 0],
    ].filter(b => b[1] > 0);

    const pointsRelique = Number(contenu?.point) || 0;

    function construire() {

        const mesFragments = index.parZone.get(`joueur:${moi}:fragments`) || [];
        const aRetirer = [];
        const manques = [];

        for (const [jeton, nombre] of besoins) {
            const dispo = mesFragments.filter(f => !f.ref && f.jeton === jeton);

            if (dispo.length < nombre) {
                manques.push(`${nombre - dispo.length} ${jeton.toLowerCase()}`);
            }

            aRetirer.push(...dispo.slice(0, nombre));
        }

        if (manques.length) {
            signaler(`Construire ${nom} : il vous manque ${manques.join(", ")}.`);
            return;
        }

        const scientifique = agentDisponible({ index, moi, search }, "scientifique");

        if (!scientifique) {
            signaler("Construire une relique demande un scientifique disponible.");
            return;
        }

        jouer([
            // (le scientifique est dépensé : Bio stimulant propose de l'user à la place)
            ...depenserAgent({ aScript, moi, etat }, scientifique, "le scientifique"),
            ...aRetirer.map(f => ({ type: "supprimer", c: f.id })),
            { type: "deplacer", c: c.id, vers: `joueur:${moi}:actif` },
            // Mon marqueur avance sur la piste des points du déroulé
            ...actionsPoints(etat, moi, pointsRelique),
        ]);

        fermer();
    }

    return (
        <div
            onClick={fermer}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#0008",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                onClick={event => event.stopPropagation()}
                style={{
                    maxWidth: "92vw",
                    maxHeight: "85vh",
                    overflow: "auto",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={styleBarre}>
                    <b style={{ fontSize: 18 }}>{nom}</b>
                    <span style={{ color: "#666" }}>
                        {nomZone(c.zone, nomDe)}
                        {c.proprio ? ` · ${nomDe(c.proprio)}` : ""}
                        {c.sur ? " · embarqué" : ""}
                    </span>
                    <button type="button" onClick={fermer} style={{ marginLeft: "auto" }}>Fermer</button>
                </div>

                {joueur && (
                    <div style={styleBarre}>

                        {/* Phase de science : construire une relique de sa main */}
                        {constructible && (
                            <button
                                type="button"
                                onClick={construire}
                                title="Supprime un scientifique et les fragments demandés, place la relique dans vos éléments actifs et vous donne ses points"
                                style={{ fontWeight: "bold", padding: "4px 12px", backgroundColor: COULEUR_A_FAIRE }}
                            >
                                Construire (
                                {besoins.length
                                    ? besoins.map(b => `${b[1]} ${b[0].replace(/^Fragment /, "")}`).join(", ")
                                    : "sans fragment"}
                                {pointsRelique ? ` → ${pointsRelique} point${pointsRelique > 1 ? "s" : ""}` : ""})
                            </button>
                        )}

                        {/* Dégâts, usé et possession : pour les unités seulement */}
                        {c.ref?.type === "unit" && (<>
                        <span>
                            Dégâts{" "}
                            <button type="button" disabled={!degat} onClick={() => marquer("degat", degat - 1)}>−</button>
                            <b style={{ margin: "0 6px" }}>{degat}</b>
                            <button type="button" onClick={() => marquer("degat", degat + 1)}>+</button>
                        </span>

                        <label>
                            <input
                                type="checkbox"
                                checked={!!c.marques?.use}
                                onChange={e => marquer("use", e.target.checked)}
                            />{" "}
                            Usé
                        </label>
                        </>)}

                        {/* Face : pour les cartes et les unités, pas pour les jetons */}
                        {c.ref && (
                        <label>
                            Face{" "}
                            <select
                                value={c.face}
                                onChange={e => jouer({ type: "retourner", c: c.id, face: e.target.value })}
                            >
                                <option value="recto">recto</option>
                                <option value="verso">verso</option>
                                {/* Une carte cachée n'est vue que de son propriétaire ;
                                    sans propriétaire, elle revient à celui qui la cache
                                    (une unité neutre, elle, reste neutre) */}
                                <option value="cache">
                                    {(c.proprio ?? (type === "unit" ? null : moi)) === moi
                                        ? "cachée (moi seul)"
                                        : (c.proprio
                                            ? `cachée (${nomDe(c.proprio)} seul)`
                                            : "cachée (personne ne la voit)")}
                                </option>
                            </select>
                        </label>
                        )}

                        {c.ref?.type === "unit" && (
                        <label>
                            Possession{" "}
                            <select
                                value={c.marques?.possession ?? ""}
                                onChange={e => marquer("possession", Number(e.target.value) || null)}
                            >
                                <option value="">—</option>
                                {partie.joueurs.map(j => (
                                    <option key={j.userId} value={j.userId}>{j.nom}</option>
                                ))}
                            </select>
                        </label>
                        )}

                        {/* Dette, jeton de ressource : montant modifiable */}
                        {!c.ref && (c.jeton === DETTE || ressourceDe(c)) && (
                            <span>
                                Montant{" "}
                                <button
                                    type="button"
                                    disabled={!(Number(c.marques?.montant) > 0)}
                                    onClick={() => marquer("montant", (Number(c.marques?.montant) || 0) - 1)}
                                >
                                    −
                                </button>
                                <b style={{ margin: "0 6px" }}>{Number(c.marques?.montant) || 0}</b>
                                <button
                                    type="button"
                                    onClick={() => marquer("montant", (Number(c.marques?.montant) || 0) + 1)}
                                >
                                    +
                                </button>
                            </span>
                        )}

                        {/* Marqueur de faction posé sur une carte (agenda, promesse...) */}
                        {c.ref && type !== "unit" && type !== "agent" && (
                            <button
                                type="button"
                                title="Pose un marqueur à votre couleur sur cette carte, visible de tous"
                                onClick={() => jouer({ type: "creer", jeton: MARQUEUR, sur: c.id, proprio: moi })}
                            >
                                Poser mon marqueur
                            </button>
                        )}

                        {/* Fenêtre des destinations (Envoi.jsx) */}
                        <EnvoyerVers c={c} apres={fermer} />

                        {/* Boutons des scripts de règles rattachés à cette carte */}
                        <ScriptsCarte c={c} fermer={fermer} />

                        {vueParMoiSeul && <MontrerA lien={c.ref} />}

                        {!c.sur && porteurs.length > 0 && (
                            <select
                                value=""
                                onChange={e => {
                                    if (e.target.value) {
                                        jouer({ type: "deplacer", c: c.id, sur: e.target.value });
                                        fermer();
                                    }
                                }}
                            >
                                <option value="">Embarquer sur…</option>
                                {porteurs.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {nomElement(search, v.ref)}
                                        {v.proprio ? ` (${nomDe(v.proprio)})` : ""}
                                    </option>
                                ))}
                            </select>
                        )}

                        {c.sur && (
                            <button type="button" onClick={() => deplacer(c.zone)}>Débarquer</button>
                        )}

                        {/* Une unité d'un joueur retourne dans sa réserve (sync.js,
                            retourEnReserve) ; le reste sort du jeu */}
                        <button
                            type="button"
                            onClick={() => {
                                jouer({ type: "supprimer", c: c.id });
                                fermer();
                            }}
                        >
                            {type === "unit" && Number.isInteger(c.proprio) && LIMITES_UNITES[typeUnite(contenu)] !== undefined
                                ? `Retirer (retour dans la réserve de ${nomDe(c.proprio)})`
                                : "Retirer du jeu"}
                        </button>
                    </div>
                )}

                {portes.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        Porte : {portes.map((x, i) => (
                            <span key={x.id}>
                                {i > 0 && ", "}
                                {/* Marqueur libre : son texte entier, sur sa couleur */}
                                {!x.ref && x.jeton === LIBRE ? (
                                    <span
                                        data-libre={x.id}
                                        style={{
                                            display: "inline-block",
                                            padding: "1px 6px",
                                            borderRadius: 4,
                                            border: "1px solid #444",
                                            backgroundColor: x.marques?.couleur || COULEUR_LIBRE,
                                            color: estSombre(x.marques?.couleur || COULEUR_LIBRE) ? "#fff" : "#000",
                                            fontWeight: "bold",
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {String(x.marques?.texte ?? "") || "Marqueur libre (sans texte)"}
                                    </span>
                                ) : (x.ref ? nomElement(search, x.ref) : x.jeton || "?")}
                            </span>
                        ))}
                    </div>
                )}

                {c.ref && (
                    <LoadAndDisplay link={c.ref} displayeur={verso ? "verso" : undefined} />
                )}

                {/* Cartes citées par celle-ci : on les voit, et on peut les prendre */}
                {cites.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <b>Cartes citées</b>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
                            {cites.map(lien => (
                                <div key={lien.id}>
                                    <LoadAndDisplay link={lien} />

                                    {joueur && (
                                        <div style={{ ...styleBarre, marginTop: 4 }}>
                                            <button
                                                type="button"
                                                onClick={() => jouer({
                                                    type: "creer",
                                                    ref: lien,
                                                    zone: `joueur:${moi}:main`,
                                                    proprio: moi,
                                                })}
                                            >
                                                Prendre en main
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => jouer({
                                                    type: "creer",
                                                    ref: lien,
                                                    zone: `joueur:${moi}:actif`,
                                                    proprio: moi,
                                                })}
                                            >
                                                Dans mes éléments actifs
                                            </button>
                                            <button
                                                type="button"
                                                title="Pose la carte sur la table du plateau général, sans propriétaire"
                                                onClick={() => jouer({
                                                    type: "creer",
                                                    ref: lien,
                                                    zone: "general:table",
                                                })}
                                            >
                                                Mettre en jeu
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
