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
// d'implémentabilité (doc/implementabilite.md) dit ce qui est
// faisable de la même façon.
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
    // Le bouton lui-même est dans ScriptsCarte.jsx (il lui faut l'état
    // de la partie) : `bouton` y renvoie.
    // --------------------------------------------------------

    // --------------------------------------------------------
    // MISE EN PLACE D'UN ÉVÉNEMENT : un script par événement
    //
    // Bouton « Mettre en place » de la fiche de l'événement. T est le
    // tour de l'événement (celui de sa case du déroulé).
    //
    // poses : [{ type, id, vers, n }] — ce qui est mis en jeu
    //   vers   "table"            la table
    //          "joueurs"          un exemplaire chez chaque joueur (feuille de technologie)
    //          "tuiles"           la réserve de tuiles spéciales (complétée jusqu'à n :
    //                             les tuiles déjà en jeu comptent)
    //          "promesses"        la réserve de promesses
    //          { evenement: k }   la case Événement du tour T + k
    //          { agenda: k }      la case Agenda (lois à venir) du tour T + k
    //   n      nombre d'exemplaires : un nombre, ou une fonction du nombre de
    //          joueurs ; par défaut le champ « exemplaires » de l'élément
    // anomalies : { unite, n, types, loinDesNatals } — n unités neutres sur
    //          chaque système du plateau qui a une de ces anomalies
    // reste : ce qui reste à faire à la main (rappelé dans le bandeau orange)
    // --------------------------------------------------------

    evenement("evenement-tempete-spatiale", 450, 1794335055032, "Tempête spatiale", {
        description: "« Tempête spatiale » au tour T+1, « Fin de la tempête » au tour T+5, la feuille « Tempête stellaire » chez chaque joueur.",
        poses: [
            { type: "habilite", id: 442, vers: { evenement: 1 } },
            { type: "habilite", id: 443, vers: { evenement: 5 } },
            { type: "techsheet", id: 520, vers: "joueurs" },
        ],
    }),

    evenement("evenement-catastrophe-lointaine", 455, 1794335055033, "Catastrophe lointaine", {
        description: "« Péage aux frontières » aux tours T+1 et T+2, « Offre d'asile » au tour T+2, les promesses « Tuteur des réfugiés » dans la réserve.",
        poses: [
            { type: "habilite", id: 452, vers: { evenement: 1 }, n: 1 },
            { type: "habilite", id: 452, vers: { evenement: 2 }, n: 1 },
            { type: "habilite", id: 453, vers: { evenement: 2 } },
            { type: "Promesse", id: 454, vers: "promesses" },
        ],
    }),

    evenement("evenement-recrudescence-piraterie", 459, 1794335055034, "Recrudescence de la piraterie", {
        description: "La faction neutre « Pirate » sur la table ; 2 vaisseaux pirates sur chaque champ d'astéroïdes et chaque rupture gravitationnelle non adjacents à une case natale.",
        poses: [{ type: "neutral", id: 521, vers: "table" }],
        anomalies: { unite: 407, n: 2, types: ["ast", "rift"], loinDesNatals: true },
    }),

    evenement("evenement-signal-capte", 485, 1794335055043, "Signal capté", {
        description: "« Présence de cache » au tour T ; « Cache », « BDD technique », « vaisseau relique » et « Plan ancien » sur la table ; les 4 tuiles SIG dans la réserve de tuiles spéciales.",
        poses: [
            { type: "habilite", id: 491, vers: { evenement: 0 } },
            { type: "habilite", id: 486, vers: "table" },
            { type: "habilite", id: 487, vers: "table" },
            { type: "unit", id: 854, vers: "table" },
            { type: "relique", id: 853, vers: "table", n: 1 },
            { type: "system", id: 477, vers: "tuiles" },
            { type: "system", id: 478, vers: "tuiles" },
            { type: "system", id: 479, vers: "tuiles" },
            { type: "system", id: 480, vers: "tuiles" },
        ],
        reste: "mélangez les 4 tuiles SIG aux 12 prochaines tuiles système ; un fragment de relique sur chaque système exploré ; numérotez de 1 à 4, face cachée, les 4 cartes posées sur la table",
    }),

    evenement("evenement-grand-khan", 553, 1794335055053, "Grand Khan", {
        description: "La faction neutre « Invasion du grand Khan » au tour T+1.",
        poses: [{ type: "neutral", id: 526, vers: { evenement: 1 } }],
        reste: "au tour T+1, à un endroit aléatoire : 1 Palais du khan et 25 frégates du khan (réserve des unités neutres)",
    }),

    evenement("evenement-rebellion-interplanetaire", 562, 1794335055058, "Rébellion interplanétaire", {
        description: "La faction neutre « Rébellion inter-planétaire » sur la table ; l'agenda « Collaboration contre révolutionnaire » dans les lois à venir du tour T+1.",
        poses: [
            { type: "neutral", id: 559, vers: "table" },
            { type: "Agenda", id: 564, vers: { agenda: 1 } },
        ],
        reste: "les jets de rébellion de chaque planète (1D3 rebelles par jet réussi)",
    }),

    evenement("evenement-comment-la-democratie-meurt", 719, 1794335055066, "Comment la démocratie meurt", {
        description: "La faction neutre « Conclave secret » sur la table ; quatre agendas dans les lois à venir des tours T+2 à T+5.",
        poses: [
            { type: "neutral", id: 718, vers: "table" },
            { type: "Agenda", id: 717, vers: { agenda: 2 } },
            { type: "Agenda", id: 726, vers: { agenda: 3 } },
            { type: "Agenda", id: 727, vers: { agenda: 4 } },
            { type: "Agenda", id: 721, vers: { agenda: 5 } },
        ],
    }),

    evenement("evenement-rupture-espace-temps", 823, 1794045501935, "Rupture de l'espace-temps", {
        description: "« Rupture de l'espace-temps » et « Étude des failles » sur la table ; Akhenar et les failles (la moitié des joueurs, arrondie au supérieur, + 1) dans la réserve de tuiles spéciales ; la feuille « Rupture » chez chaque joueur.",
        poses: [
            { type: "habilite", id: 814, vers: "table" },
            { type: "habilite", id: 815, vers: "table" },
            { type: "system", id: 813, vers: "tuiles", n: 1 },
            { type: "system", id: 811, vers: "tuiles", n: joueurs => Math.ceil(joueurs / 2) + 1 },
            { type: "techsheet", id: 822, vers: "joueurs" },
        ],
        reste: "posez Akhenar et les failles à côté du plateau (systèmes secondaires) ; par faille : 3 Nefs de la rupture, et un jeton trou de ver oméga sur un système aléatoire de la galaxie",
    }),
];

// Script de mise en place d'un événement (bouton de sa fiche)
function evenement(id, carte, ecritLe, nom, { description, poses, anomalies, reste }) {
    return {
        id,
        sorte: "bouton",
        carte: { type: "evenement", id: carte },
        ecritLe,
        nom: `Mise en place : ${nom}`,
        description,
        bouton: "evenement",
        poses,
        anomalies,
        reste,
    };
}

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
