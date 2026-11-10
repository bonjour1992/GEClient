// ============================================================
// SCRIPTS DE RÈGLES
//
// L'outil de partie reste permissif : tout se fait à la main. Un
// script est une aide, rattachée à une carte du jeu, qui applique
// son effet à la place du joueur. Quatre sortes :
//
//   recrutement   se déclenche sur une action construite (Ctrl + clic
//                 pour recruter) : il en modifie le coût, et un message
//                 orange le dit en haut de l'écran ;
//   miseEnPlace   modifie la mise en place d'une faction au tour 0
//                 (bouton « Mise en place », MiseEnPlaceJoueur.jsx) ;
//   bouton        ajoute un bouton à la fiche de la carte (ScriptsCarte) ;
//   effet         effet d'une technologie débloquée, codé là où il agit
//                 (aScript, effets.js).
//
// Chaque script dit ce qu'il change à l'interface : `mode` — "nouveau"
// (un bouton de plus), "modifie" (un bouton existant change de
// comportement), "auto" (ni l'un ni l'autre : calcul ou réaction) — et
// `ou`, l'endroit. L'outil « Scripts de règles » l'affiche.
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
    mode: "modifie",
    ou: "Recrutement (Ctrl + clic sur un agent)",
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
    reductionAgent("art-du-commerce", 200, 1794335054847, "Art du commerce", /n[ée]gociant/i, "négociants"),
    reductionAgent("ecole-politique", 201, 1794335054848, "École politique", /politi/i, "politiciens"),

    {
        id: "confrerie-de-mercenaire",
        sorte: "recrutement",
        mode: "modifie",
        ou: "Recrutement (Ctrl + clic sur un mercenaire)",
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
        mode: "modifie",
        ou: "« Mise en place de ma faction » (tour 0)",
        carte: { type: "faction", id: 143 },
        ecritLe: 1794340035080,
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
        mode: "modifie",
        ou: "« Mise en place de ma faction » (tour 0)",
        carte: { type: "faction", id: 19 },
        ecritLe: 1794340035078,
        nom: "Mise en place de Hacan",
        description: "Un mercenaire de la pioche est posé sur « Vente au Bazaar ».",
        actions: plan => (plan.habilite(36)
            ? [{ type: "piocher", de: "pioche:mercenaire", vers: plan.habilite(36) }]
            : []),
    },

    {
        id: "mise-en-place-jol-nar",
        sorte: "miseEnPlace",
        mode: "modifie",
        ou: "« Mise en place de ma faction » (tour 0)",
        carte: { type: "faction", id: 179 },
        ecritLe: 1794340035086,
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
        mode: "modifie",
        ou: "« Mise en place de ma faction » (tour 0)",
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
        mode: "modifie",
        ou: "« Mise en place de ma faction » (tour 0)",
        carte: { type: "faction", id: 862 },
        ecritLe: 1794340035097,
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
    //          { pioche: n }      la pioche de tuiles : mélangée aux n tuiles du dessus
    //          { evenement: k }   la case Événement du tour T + k
    //          { agenda: k }      la case Agenda (lois à venir) du tour T + k
    //   n      nombre d'exemplaires : un nombre, ou une fonction du nombre de
    //          joueurs ; par défaut le champ « exemplaires » de l'élément
    // anomalies : { unite, n, types, loinDesNatals } — n unités neutres sur
    //          chaque système du plateau qui a une de ces anomalies
    // rebellion : { unite, faces, seuils (par type de planète), defaut, renforts } —
    //          un dé par planète possédée par un joueur, hors système natal ;
    //          sur le seuil ou plus, 1 dé « renforts » d'unités neutres sur la planète
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
        description: "« Présence de cache » au tour T ; « Cache », « BDD technique », « vaisseau relique » et « Plan ancien » sur la table ; les 4 tuiles SIG mélangées aux 12 prochaines tuiles de la pioche.",
        poses: [
            { type: "habilite", id: 491, vers: { evenement: 0 } },
            { type: "habilite", id: 486, vers: "table" },
            { type: "habilite", id: 487, vers: "table" },
            { type: "unit", id: 854, vers: "table" },
            { type: "relique", id: 853, vers: "table", n: 1 },
            { type: "system", id: 477, vers: { pioche: 12 } },
            { type: "system", id: 478, vers: { pioche: 12 } },
            { type: "system", id: 479, vers: { pioche: 12 } },
            { type: "system", id: 480, vers: { pioche: 12 } },
        ],
        reste: "un fragment de relique sur chaque système exploré ; numérotez de 1 à 4, face cachée, les 4 cartes posées sur la table",
    }),

    evenement("evenement-grand-khan", 553, 1794335055053, "Grand Khan", {
        description: "La faction neutre « Invasion du grand Khan » au tour T+1.",
        poses: [{ type: "neutral", id: 526, vers: { evenement: 1 } }],
        reste: "au tour T+1, à un endroit aléatoire : 1 Palais du khan et 25 frégates du khan (réserve des unités neutres)",
    }),

    evenement("evenement-rebellion-interplanetaire", 562, 1794335055058, "Rébellion interplanétaire", {
        description: "La faction neutre « Rébellion inter-planétaire » sur la table ; l'agenda « Collaboration contre révolutionnaire » dans les lois à venir du tour T+1 ; " +
            "un jet de rébellion (1D6) par planète possédée hors système natal — sauvage ou culturelle 3+, militaire 5+, autre 4+ — et 1D3 rebelles par jet réussi.",
        poses: [
            { type: "neutral", id: 559, vers: "table" },
            { type: "Agenda", id: 564, vers: { agenda: 1 } },
        ],
        rebellion: { unite: 557, faces: 6, seuils: { sauv: 3, civ: 3, mil: 5 }, defaut: 4, renforts: 3 },
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

    // --------------------------------------------------------
    // EFFETS DE TECHNOLOGIE
    //
    // Le script ne porte ici que sa description : son code est là où
    // il agit (`ou`), sous la condition aScript(joueur, id) — script en
    // service et technologie débloquée (contexte de Partie.jsx).
    //   mode  "nouveau"  un bouton de plus
    //         "modifie"  un bouton existant change de comportement
    //         "auto"     aucun bouton : calcul ou réaction automatique
    // --------------------------------------------------------

    effet("assimilation", 139, 1790269329027, "Assimilation", "modifie",
        "Fiche d'un système : « Prendre possession », « Revendiquer », « Mobiliser »",
        "Prendre possession d'une planète sans propriétaire, ou la revendiquer, y pose une infanterie ; " +
        "mobiliser sur une planète sauvage pose une infanterie gratuite de plus."),

    effet("culture-courtisane-alliances", 140, 1794335054814, "Culture courtisane", "modifie",
        "Plateau joueur : « Entretien »",
        "L'entretien rapporte 1 influence de plus par alliance en jeu chez vous (éléments actifs et cases de tour du plateau)."),

    effet("diversite", 141, 1790228044157, "Diversité", "modifie",
        "Plateau joueur : « Entretien »",
        "L'entretien rapporte 1 influence de plus par planète possédée."),

    effet("batiment-resistant", 180, 1794335054834, "Bâtiment résistant", "auto",
        "Conflit : bombardement",
        "Les bombardements ont −1 sur une planète que vous possédez, et −1 de plus si vous y avez une structure."),

    effet("troupe-d-elite", 181, 1789938478258, "Troupe d'élite", "auto",
        "Conflit : combat terrestre",
        "Vos infanteries ont +1 au combat terrestre."),

    effet("bio-stimulant", 183, 1794335054837, "Bio stimulant", "modifie",
        "Tout bouton qui dépense un agent (trêve, déplacement depuis un système activé, relique, Ctrl + clic sur un agent)",
        "Quand un de vos agents (hors mercenaire) doit être détruit, une fenêtre propose de l'utiliser et de payer 2 ressources à la place."),

    effet("manipulation-mentale", 184, 1794335054838, "Manipulation mentale", "nouveau",
        "Fiche d'un système, à côté de chaque planète : « Manipulation mentale »",
        "Phase de production : use un diplomate et pose une de vos infanteries sur la planète (une de vos unités doit être dans le système ou un système voisin)."),

    effet("recuperation", 185, 1794335054839, "Récupération", "modifie",
        "Conflit : « Terminer le combat » (case « Récupération », cochée d'office)",
        "À la fin d'un combat spatial, +1 ressource par vaisseau détruit pendant ce combat. La case est cochée d'office ; " +
        "si deux factions l'ont cochée, « Terminer le combat » devient rouge gris."),

    effet("bouclier-deflecteur", 186, 1790227683182, "Bouclier déflecteur", "auto",
        "Conflit : canons spatiaux ; déplacement assisté",
        "Les canons qui visent vos vaisseaux ont −1 ; vos vaisseaux peuvent traverser les champs d'astéroïdes (interdits aux autres)."),

    effet("apprentissage", 187, 1794335054840, "Apprentissage", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de recrutement : remplace un de vos agents par un autre agent de base (celui de votre faction s'il le réimplémente)."),

    effet("capsule-de-transport", 188, 1794335054841, "Capsule de transport", "auto",
        "Capacité des vaisseaux (embarquement, déplacement assisté)",
        "Vos vaisseaux qui ont une capacité l'augmentent de 1, vos transporteurs de 2."),

    effet("capsule-de-secours", 189, 1794335054842, "Capsule de secours", "nouveau",
        "Conflit : cadre « Sauvetage » d'un combat",
        "Quand un de vos vaisseaux détruit porte des infanteries : un jet par infanterie (6 ou moins sur un dé de 10), puis les " +
        "arrivées possibles — planètes du système, planètes voisines qui ont un dock (l'accord du propriétaire n'est pas géré)."),

    effet("ecoles-militaires-combat", 190, 1794335054842, "Écoles militaires", "modifie",
        "Fiche d'un système : « Combat spatial »",
        "Le premier combat spatial que vous ouvrez dans le tour vous donne +1 à ce combat."),

    effet("arme-amplifiee", 194, 1794335054844, "Arme amplifiée", "nouveau",
        "Plateau joueur : « Actions de mes technologies » ; Conflit : combat spatial",
        "Phase de science : détruit un scientifique et marque un type de vaisseau ; vos vaisseaux de ce type ont +2 au combat spatial."),

    effet("reparation-improvisee", 195, 1794335054845, "Réparation improvisée", "nouveau",
        "Fiche d'un de vos vaisseaux endommagés : « Réparation improvisée »",
        "Phase de production : use un logisticien et répare le vaisseau (1 ressource par dégât).",
        // (la version de Hacan de la même technologie)
        [419]),

    effet("systeme-de-visee", 196, 1794335054845, "Système de visée", "auto",
        "Conflit : canons spatiaux, bombardement",
        "Vos canons spatiaux et vos bombardements ont +1."),

    effet("blindage-en-duranium", 197, 1794342448757, "Blindage en duranium", "auto",
        "Résistance des unités (Conflit, où la valeur modifiée est en vert)",
        "Vos vaisseaux amiraux, soleils de guerre, cuirassés et transporteurs ont 1 de résistance de plus (selon le type d'unité, pas son nom)."),

    effet("soleil-de-guerre", 198, 1779785436296, "Soleil de guerre", "auto",
        "Onglet Technologie : dernière case de recherche de la technologie",
        "Quand la technologie est obtenue, un soleil de guerre de votre faction arrive dans vos éléments actifs."),

    effet("art-du-commerce-livraison", 200, 1794335054847, "Art du commerce", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de diplomatie : la technologie est utilisée, la faction choisie gagne 2 commerce (livraison ; les dettes se réduisent à la main)."),

    effet("ecole-politique-lois", 201, 1794335054848, "École politique", "modifie",
        "Bandeau de la phase de proposition : « Piocher »",
        "Vous piochez 2 propositions de plus, même en dépensant 0 influence."),

    effet("centre-de-coordination", 202, 1790227718519, "Centre de coordination", "auto",
        "Conflit : combat spatial",
        "Vous avez +1 au combat spatial si le système contient un de vos docks ou votre vaisseau amiral."),

    effet("rapport-de-force", 205, 1794335054850, "Rapport de force", "nouveau",
        "Conflit : cadre de blocage d'un déplacement",
        "Use un diplomate : +2 à votre valeur de contrôle pour ce blocage."),

    effet("reparation", 206, 1794335054851, "Réparation", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de revendication : use un diplomate ; la faction choisie reçoit une dette de 3 envers vous, à payer dans 3 tours."),

    effet("brevet", 207, 1789973687408, "Brevet", "auto",
        "Onglet Technologie : une case de recherche cochée par un autre joueur",
        "Quand une autre faction recherche une technologie que vous possédez, vous gagnez 1 commerce (une fois par tour, par faction et par technologie)."),

    effet("trading", 208, 1794335054851, "Trading", "auto",
        "« Phase suivante », à la fin de la phase de vote",
        "Un de vos négociants posé sur votre plateau de vote est votre prédiction : si cette case est première de sa loi à la fin de la phase, +2 commerce."),

    // ---- chantier « toutes les technologies », lot A ----

    effet("logistique-amelioree-capacite", 191, 1794335054843, "Logistique améliorée", "auto",
        "Capacité logistique : taille d'une flotte (déplacement assisté), production d'un dock",
        "Chaque logisticien posé sur la technologie (onglet Technologie : le glisser sur sa carte) augmente votre capacité logistique de 1 (3 par défaut)."),

    effet("pc", 192, 1793999783810, "PC", "auto",
        "Conflit : combat spatial",
        "Vous avez +1 au combat spatial dans un système qui contient votre vaisseau amiral ou un de vos docks."),

    effet("universite", 210, 1790237003321, "Université", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de recrutement : la technologie et l'agent choisi sont utilisés ; un agent du même type vous attend sur votre case du tour suivant."),

    effet("pillage", 211, 1794335054852, "Pillage", "modifie",
        "Fiche d'un système : « Prendre possession » (et le conflit de contrôle)",
        "Prendre possession d'une planète qu'une autre faction possédait lui vole 2 commerce."),

    effet("reseau-de-commerce", 213, 1780480244313, "Réseau de commerce", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Deux boutons de conversion, un pour un : influence en ressources, ressources en influence."),

    effet("extorsion", 214, 1794335054854, "Extorsion", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de diplomatie : use un diplomate ; la faction choisie reçoit une dette de 3 envers vous, à payer dans 3 tours."),

    effet("rayon-tracteur", 217, 1794335054857, "Rayon tracteur", "auto",
        "Conflit : blocage d'un déplacement, conflits de contrôle",
        "Vos vaisseaux qui ont plus de 1 de résistance comptent 1 de contrôle de plus."),

    effet("exploration", 218, 1790236587336, "Exploration", "modifie",
        "Onglet Espace, phase de science : Ctrl + clic sur un emplacement vide",
        "L'exploration (use un scientifique et un logisticien, pioche une tuile) est réservée à qui a cette technologie : sans elle, la confirmation le dit."),

    effet("cartographie-de-l-espace", 231, 1794335054865, "Cartographie de l'espace", "auto",
        "Conflit : combat spatial, canons spatiaux",
        "Dans un système qui a une anomalie, les attaques contre vos vaisseaux ont −1."),

    effet("moteur-a-gravite", 233, 1794335054865, "Moteur à gravité", "modifie",
        "Déplacement assisté : case « Moteur à gravité »",
        "Cochée, vos vaisseaux ont +1 mouvement ; des scientifiques sont utilisés au départ (un par vaisseau seul, deux par flotte)."),

    effet("strategie-de-saut", 234, 1794335054866, "Stratégie de saut", "auto",
        "Déplacement assisté, puis Conflit : combat spatial",
        "Des vaisseaux arrivés par un trou de ver ont, ce tour, la frappe en premier et +1 au combat spatial."),

    effet("camouflage", 236, 1787508935658, "Camouflage", "auto",
        "Conflit : blocage d'un déplacement, combat spatial",
        "Vos vaisseaux ne sont pas bloqués par des unités adverses, et tant qu'ils n'ont engagé personne ils ne peuvent qu'être ciblés."),

    effet("micro-teleporteur", 237, 1794335054868, "Micro-téléporteur", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de production : use un logisticien ; vous déplacez ensuite les unités transportables à la main."),

    effet("stargate", 238, 1794335054868, "Stargate", "auto",
        "Déplacement assisté",
        "Pour vos déplacements, chaque système où vous avez un dock a un trou de ver alpha."),

    effet("moteur-ftl", 239, 1790228808456, "Moteur FTL", "auto",
        "Déplacement assisté",
        "Tous vos vaisseaux ont 1 de mouvement de plus."),

    effet("bouclier-amplifie", 244, 1794343420976, "Bouclier amplifié", "auto",
        "Résistance des unités (Conflit, où la valeur modifiée est en vert)",
        "Votre vaisseau amiral et vos systèmes de défense ont 2 de résistance de plus, vos boucliers mobiles 1."),

    effet("cuve-de-clonage", 245, 1794343420980, "Cuve de clonage", "nouveau",
        "Fiche d'un système, à côté de « Mobiliser »",
        "Phase de production : use un logisticien et un scientifique ; une infanterie de plus, et toute la mobilisation est gratuite."),

    effet("reseau-d-ingerence", 247, 1794343420983, "Réseau d'ingérence", "auto",
        "Onglet Vote : décompte",
        "Un de vos scientifiques posé sur votre plateau de vote vaut 2 voix."),

    effet("argumentation-vehemente", 251, 1794343420985, "Argumentation véhémente", "nouveau",
        "Onglet Vote, au-dessus des lois",
        "Phase de prévote : use un politicien (qui ne reste pas sur le plateau) et 1 influence ; 2 voix s'ajoutent tout de suite au décompte, sur la loi et la colonne choisies."),

    effet("strategie-dominante", 252, 1794343420986, "Stratégie dominante", "auto",
        "Conflit : combat spatial",
        "Vos unités à frappe en premier ont +1 ; cibler un de vos vaisseaux coûte −4 au lieu de −2."),

    effet("avantage-aerien", 253, 1794343420987, "Avantage aérien", "auto",
        "Conflit : combat terrestre",
        "Vos infanteries ont la frappe en premier."),

    // ---- lot B : production ----

    effet("ia-industrielle", 193, 1790238201043, "IA industrielle", "auto",
        "Production ouverte avec un dock (Ctrl + clic sur le dock, phase de production)",
        "Vos docks produisent 2 unités de plus ; pour un dock posé sur une planète militaire, le coût total de la production baisse de 2."),

    // ---- lot C : commerce et agents ----

    effet("propagande", 212, 1780480307120, "Propagande", "modifie",
        "Plateau général : « + » de la piste d'infamie",
        "Au gain d'un point d'infamie, une fenêtre propose de dépenser un diplomate pour ne pas le gagner."),

    effet("science-integree-livraison", 216, 1794335054856, "Science intégrée", "modifie",
        "Livraison commerciale (fiche d'une unité, Art du commerce)",
        "Lors d'une livraison, une fenêtre propose d'user un scientifique : la faction livrée gagne 4 cases de recherche d'une technologie que vous possédez (elle les coche à la main)."),

    effet("commerce-profitable", 269, 1794343420988, "Commerce profitable", "auto",
        "Livraison commerciale",
        "Vos livraisons valent 1 de plus ; une livraison que vous recevez vous rapporte 1 commerce de plus."),

    effet("connexion", 270, 1794343420989, "Connexion", "modifie",
        "Tout bouton qui utilise ou dépense un agent",
        "Si vous n'avez pas l'agent demandé mais avez un négociant, une fenêtre propose de l'utiliser à sa place pour 2 commerce (pas pour les agents du déplacement assisté)."),
];

// Script d'effet de technologie : sa description seule (son code est là où il agit)
//   aussi : autres technologies qui donnent le même effet (version d'une faction)
function effet(id, carte, ecritLe, nom, mode, ou, description, aussi = []) {
    return { id, sorte: "effet", mode, ou, carte: { type: "tech", id: carte }, aussi, ecritLe, nom, description };
}

// Script de mise en place d'un événement (bouton de sa fiche)
function evenement(id, carte, ecritLe, nom, { description, poses, anomalies, rebellion, reste }) {
    return {
        id,
        sorte: "bouton",
        mode: "nouveau",
        ou: "Fiche de l'événement : « Mettre en place »",
        carte: { type: "evenement", id: carte },
        ecritLe,
        nom: `Mise en place : ${nom}`,
        description,
        bouton: "evenement",
        poses,
        anomalies,
        rebellion,
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
    return new Set((await technologiesDe(etat, userId, charger)).keys());
}

// Les mêmes, avec pour chacune le compteur qui la dit « utilisée ce tour »
//   Map : identifiant de la technologie -> { utilisee: identifiant du compteur }
export async function technologiesDe(etat, userId, charger) {

    const base = `joueur:${userId}`;
    const debloquees = new Map();

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
                debloquees.set(id, {
                    utilisee: `${base}:techUse:${feuille.id}:${k}`,
                    // Zone des éléments posés sur la technologie
                    zone: `${base}:tech:${feuille.id}:case:${k}`,
                });
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
