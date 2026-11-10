// ============================================================
// SCRIPTS DE RÈGLES
//
// L'outil de partie reste permissif : tout se fait à la main. Un
// script est une aide, rattachée à une carte du jeu, qui applique
// son effet à la place du joueur. Trois sortes :
//
//   recrutement   se déclenche sur une action construite (Ctrl + clic
//                 pour recruter) : il en modifie le coût, et un message
//                 orange le dit en haut de l'écran ;
//   miseEnPlace   modifie la mise en place d'une faction au tour 0
//                 (bouton « Mise en place », MiseEnPlaceJoueur.jsx) ;
//   bouton        ajoute un bouton à la fiche de la carte (ScriptsCarte).
//
// Un simple glisser-déposer ne déclenche jamais de script.
//
// Chaque script porte la date de la version de la carte pour
// laquelle il a été écrit (ecritLe = meta.created). L'outil
// « Scripts de règles » (OutilScripts.jsx) les liste, signale ceux
// dont la carte a changé depuis, et permet de les désactiver pour
// toutes les parties (élément de type « reglage », SCRIPTS_DESACTIVES).
//
// Ajouter un script : une entrée de plus dans SCRIPTS. Le tableau
// d'implémentabilité (demandes-ti5/implementabilite.md) dit ce qui
// est faisable de la même façon.
// ============================================================

// Nom de l'élément « reglage » qui garde la liste des scripts désactivés
export const SCRIPTS_DESACTIVES = "Scripts désactivés";

// Agent visé par une réduction : son nom, ou celui de l'agent de base qu'il réimplémente
const estAgent = (achat, motif) => achat.type === "agent" && motif.test(achat.nomDeBase || achat.nom);

// Réduction de 1 du coût d'un type d'agent (technologie débloquée)
const reductionAgent = (id, carte, ecritLe, nom, motif, pluriel) => ({
    id,
    sorte: "recrutement",
    carte: { type: "tech", id: carte },
    ecritLe,
    nom,
    description: `Phase de recrutement : les ${pluriel} coûtent 1 influence de moins.`,
    recrutement: achat => (estAgent(achat, motif)
        ? { cout: -1, message: `${nom} : ${achat.nom} coûte 1 de moins` }
        : null),
});

export const SCRIPTS = [

    // --------------------------------------------------------
    // RECRUTEMENT
    //
    // recrutement(achat) -> { cout: variation, message } ou null
    //   achat : { type ("agent", "mercenaire", "relique"), nom, nomDeBase,
    //             cout, surcout (surcoût du tour, mercenaires) }
    // Le script ne joue que si le joueur possède sa carte : technologie
    // débloquée, ou habilité de sa faction.
    // --------------------------------------------------------

    reductionAgent("ecoles-militaires", 190, 1794335054842, "Écoles militaires", /amiral/i, "amiraux"),
    reductionAgent("science-integree", 216, 1794335054856, "Science intégrée", /scientifique/i, "scientifiques"),
    reductionAgent("culture-courtisane", 140, 1794335054814, "Culture courtisane", /diplomate/i, "diplomates"),
    reductionAgent("logistique-amelioree", 191, 1794335054843, "Logistique améliorée", /logisticien/i, "logisticiens"),

    {
        id: "confrerie-de-mercenaire",
        sorte: "recrutement",
        carte: { type: "habilite", id: 764 },
        ecritLe: 1794335055080,
        nom: "Confrérie de mercenaire",
        description: "Phase de recrutement : le surcoût du tour ne s'applique pas à vos mercenaires.",
        recrutement: achat => (achat.type === "mercenaire" && achat.surcout > 0
            ? { cout: -achat.surcout, message: `Confrérie de mercenaire : surcoût de ${achat.surcout} ignoré` }
            : null),
    },

    // --------------------------------------------------------
    // MISE EN PLACE D'UNE FACTION (tour 0)
    //
    // placer(unite, plan) -> destination d'une unité de départ, ou
    //                        undefined pour garder celle par défaut :
    //                        { zone }, { sur: <id du composant porteur> },
    //                        ou null (elle reste dans les éléments actifs)
    //   unite : { c (composant), contenu, type (typeUnite), vaisseau, terrestre }
    //   plan  : { u, hex, planetes: [{ k, id }], unites, zonePlanete(idPlanete),
    //             vaisseaux, habilite(idHabilite) -> zone de l'habilité sur la feuille }
    // actions(plan) -> actions ajoutées au coup
    // --------------------------------------------------------

    {
        id: "mise-en-place-winnu",
        sorte: "miseEnPlace",
        carte: { type: "faction", id: 143 },
        ecritLe: 1794335054816,
        nom: "Mise en place de Winnu",
        description: "6 influence et 6 ressources ; les unités terrestres embarquent dans les vaisseaux.",
        placer: (unite, plan) => (unite.terrestre && !unite.vaisseau && plan.vaisseaux.length
            ? { sur: plusGrandeCapacite(plan.vaisseaux).c.id }
            : undefined),
        actions: plan => [
            { type: "compteur", id: `joueur:${plan.u}:inf`, delta: 6 },
            { type: "compteur", id: `joueur:${plan.u}:res`, delta: 6 },
        ],
    },

    {
        id: "mise-en-place-hacan",
        sorte: "miseEnPlace",
        carte: { type: "faction", id: 19 },
        ecritLe: 1794333998513,
        nom: "Mise en place de Hacan",
        description: "Un mercenaire de la pioche est posé sur « Vente au Bazaar ».",
        actions: plan => (plan.habilite(36)
            ? [{ type: "piocher", de: "pioche:mercenaire", vers: plan.habilite(36) }]
            : []),
    },

    {
        id: "mise-en-place-jol-nar",
        sorte: "miseEnPlace",
        carte: { type: "faction", id: 179 },
        ecritLe: 1794333998558,
        nom: "Mise en place de Jol-Nar",
        description: "Le dock sur Jol, le système de défense sur Nar.",
        placer: (unite, plan) => {
            const zone = unite.type === "dock" ? plan.zonePlanete(256)
                : (unite.type === "pds" ? plan.zonePlanete(257) : null);

            return zone ? { zone } : undefined;
        },
    },

    {
        id: "mise-en-place-nomade",
        sorte: "miseEnPlace",
        carte: { type: "faction", id: 763 },
        ecritLe: 1794333998562,
        nom: "Mise en place du Nomade",
        description: "4 mercenaires piochés en main (en garder deux) ; les infanteries embarquent dans Memoria.",
        placer: (unite, plan) => {
            const memoria = plan.vaisseaux.find(v => v.c.ref.id === 766);

            return unite.type === "inf" && memoria ? { sur: memoria.c.id } : undefined;
        },
        actions: plan => [{ type: "piocher", de: "pioche:mercenaire", vers: `joueur:${plan.u}:main`, n: 4 }],
        message: "4 mercenaires piochés : gardez-en deux, défaussez les deux autres.",
    },

    {
        // porte : identifiant d'un système à poser sur la case natale à la
        // place du système natal, qui va, lui, dans les systèmes secondaires
        // (hors du plan central) avec les unités de départ
        id: "mise-en-place-creuss",
        sorte: "miseEnPlace",
        carte: { type: "faction", id: 862 },
        ecritLe: 1794336141966,
        nom: "Mise en place de Creuss",
        description: "La Porte de Creuss sur la case natale ; le système natal et les unités à part, dans les systèmes secondaires.",
        porte: 865,
        message: "Donnez « Navigation delta » à chaque autre faction.",
    },

    // --------------------------------------------------------
    // BOUTONS DE LA FICHE D'UNE CARTE
    //
    // carte.id absent : le script vaut pour toutes les cartes du type.
    // Le bouton lui-même est dans ScriptsCarte.jsx (il lui faut l'état
    // de la partie) : `bouton` y renvoie.
    // --------------------------------------------------------

    {
        id: "mise-en-place-evenement",
        sorte: "bouton",
        carte: { type: "evenement" },
        ecritLe: null,
        nom: "Mise en place d'un événement",
        description: "Bouton « Mettre en place » de la fiche d'un événement : met en jeu les éléments liés à " +
            "cet événement (type de lien « Lié à un événement ») — feuille de technologie chez chaque joueur, " +
            "promesses dans la réserve, tuiles dans la réserve de tuiles spéciales, le reste sur la table.",
        bouton: "evenement",
    },
];

// Vaisseau de plus grande capacité (pour y embarquer des unités)
function plusGrandeCapacite(vaisseaux) {
    return [...vaisseaux].sort((a, b) => (Number(b.contenu?.capacite) || 0) - (Number(a.contenu?.capacite) || 0))[0];
}

// Scripts en service : tous, sauf ceux de la liste des désactivés
export const scriptsActifs = (desactives = []) => SCRIPTS.filter(s => !desactives.includes(s.id));

// Le script est-il rattaché à cette carte ({ type, id }) ?
export const concerne = (script, ref) => !!ref && script.carte.type === ref.type &&
    (script.carte.id === undefined || script.carte.id === ref.id);

// ------------------------------------------------------------
// Ce que possède un joueur
// ------------------------------------------------------------

// Technologies débloquées d'un joueur : identifiants des technologies dont
// toutes les cases de recherche sont cochées (feuilles de sa zone tech,
// technologies posées sur une case vide comprises).
//   charger : async id -> contenu d'un élément
export async function technologiesDebloquees(etat, userId, charger) {

    const base = `joueur:${userId}`;
    const debloquees = new Set();

    for (const feuille of Object.values(etat.composants)) {

        if (feuille.zone !== `${base}:tech` || feuille.ref?.type !== "techsheet") {
            continue;
        }

        const contenu = await charger(feuille.ref.id);

        for (const [k, lien] of (contenu?.techs || []).entries()) {

            // Technologie imprimée, sinon technologie posée sur la case
            const id = lien?.id > 0
                ? lien.id
                : Object.values(etat.composants).find(c =>
                    c.zone === `${base}:tech:${feuille.id}:case:${k}` && c.ref?.type === "tech")?.ref.id;

            if (!id) {
                continue;
            }

            const tech = await charger(id);
            const progres = Number(etat.compteurs[`${base}:tech:${feuille.id}:${k}`]) || 0;

            if (progres >= (Number(tech?.cout) || 1)) {
                debloquees.add(id);
            }
        }
    }

    return debloquees;
}

// Scripts de recrutement qui jouent pour ce joueur : ceux dont il possède la carte
//   desactives : identifiants des scripts désactivés
export async function scriptsDeRecrutement(etat, userId, idFaction, charger, desactives) {

    const actifs = scriptsActifs(desactives).filter(s => s.sorte === "recrutement");

    if (!actifs.length) {
        return [];
    }

    const techs = await technologiesDebloquees(etat, userId, charger);
    const faction = idFaction > 0 ? await charger(idFaction) : null;
    const habilites = new Set((faction?.rules || []).map(lien => Number(lien?.id)).filter(id => id > 0));

    return actifs.filter(s => (s.carte.type === "tech" ? techs.has(s.carte.id) : habilites.has(s.carte.id)));
}
