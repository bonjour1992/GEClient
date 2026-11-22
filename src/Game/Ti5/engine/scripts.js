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
//                 (aScript, effets.js) ;
//   revenu        ce que rapporte une unité ou une planète possédée à une
//                 phase (Revenus.jsx) : ajouté au ravitaillement automatique (Entretien.jsx),
//                 bouton « Revenus de la phase » aux autres phases ;
//   regle         règle propre à une unité, une planète ou une habilité, codée là
//                 où elle agit — comme un effet, mais sans technologie à
//                 débloquer : aScript(joueur, id) dit seulement si elle est en service ;
//   action        bouton d'une action qu'une unité, une planète ou une habilité
//                 permet (ActionsScript.jsx).
//
// Habilités : aScript(joueur, id) est vrai si l'habilité s'applique à ce joueur —
// elle est sur sa feuille de faction ou dans ses éléments actifs, ou sur la table
// (elle vaut alors pour toutes les factions) ; `feuille` : ou il a la feuille de
// technologie de ce type, qui la porte. Une habilité posée sur un système n'a
// pas de comportement par défaut.
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

import { campDe, aMot, MOTIF_LOGISTICIEN, MOTIF_NEGOCIANT } from "./miseEnPlace.js";
import { resultatDomination, actionsOuvrirDomination } from "./regleControle.js";

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

// Agents utilisés par plusieurs boutons d'action
const SCIENTIFIQUE = { motif: "scientifique", nom: "scientifique", depense: false };
const DIPLOMATE = { motif: "diplomate", nom: "diplomate", depense: false };

// « Une fois par tour pour la table » : le compteur `cle` garde le tour de la dernière fois.
// -> { actions, sans } : l'action qui le note ; `deja` s'il l'est déjà ce tour, sinon `sinon`
const uneFoisParTour = (atelier, cle, deja, sinon = null) => ({
    actions: [{ type: "compteur", id: cle, valeur: atelier.etat.tour }],
    sans: Number(atelier.etat.compteurs[cle]) === atelier.etat.tour ? deja : sinon,
});

// Choix d'un élément dans une liste, par l'onglet Décision : la question numérote les
// options (« 1 = … »), le calcul lit la réponse. -> { demande, calcul }, à étaler dans le script.
//   titre         : première ligne de la question
//   options       : outils -> liste des options
//   libelle       : (outils, option) -> texte de sa ligne
//   vide          : message quand il n'y a aucune option
//   appliquer     : (outils, option) -> effet du script pour l'option choisie
//   invalide      : message d'un numéro hors liste
//   videAvantTout : la liste vide passe avant le numéro (sinon, elle n'est dite qu'avant le choix)
const choixDansListe = ({ titre, options, libelle, vide, appliquer, invalide = "choix invalide", videAvantTout = false }) => ({
    demande: {
        question: outils => titre + "\n" + options(outils).map((o, k) => `${k + 1} = ${libelle(outils, o)}`).join("\n"),
        max: () => 1,
    },
    calcul: (outils, x) => {

        const liste = options(outils);

        if (!liste.length && (videAvantTout || x === undefined)) {
            return { sans: vide };
        }

        if (x === undefined) {
            return {};
        }

        const choisi = liste[x - 1];

        return choisi ? appliquer(outils, choisi) : { sans: invalide };
    },
});

// Action : un dégât de plus sur cette unité (aussi : tirages du début de tour, Partie.jsx)
export const unDegat = x => ({ type: "marquer", c: x.id, marque: "degat", valeur: (Number(x.marques?.degat) || 0) + 1 });

// Tirage « un dé par unité » : 1 dégât si le dé fait `seuil` ou moins
const tirageDegat = (atelier, x, seuil) => ({
    c: x.id,
    suite: ([jet]) => ({
        actions: jet <= seuil ? [unDegat(x)] : [],
        texte: `${atelier.nom(x.ref)} ${jet}${jet <= seuil ? " (touchée)" : ""}`,
    }),
});

// Actions qui rendent une promesse à la réserve : ses marqueurs sont retirés, la carte
// retourne dans la réserve de promesses
const rendrePromesse = atelier => [
    ...atelier.marqueurs(atelier.c).map(m => ({ type: "supprimer", c: m.id })),
    { type: "deplacer", c: atelier.c.id, vers: "general:promesses" },
];

// Vaccin : tour où il a été découvert (0 : jamais), et si on le découvre « le premier »
// (personne ne l'avait avant ce tour)
const vaccin = etat => {
    const decouvert = Number(etat.compteurs["general:vaccin"]) || 0;

    return { decouvert, premier: !decouvert || decouvert === etat.tour };
};

// Ceux qui ont le plus grand `n` d'une liste [{ u, n }] (personne si tous sont à 0)
const lesPremiers = liste => {
    const max = Math.max(0, ...liste.map(x => x.n));

    return liste.filter(x => max > 0 && x.n === max);
};

// Le système de la fiche est une nébuleuse
const dansUneNebuleuse = outils => outils.systeme?.anomaly === "neb";

// Lieu d'un effet valable ce tour dans ce système, gardé dans un compteur : tour × 1000 + case + 1
// (relu au combat : Combat.jsx)
const lieuDuTour = atelier => atelier.etat.tour * 1000 + atelier.numero + 1;

// Planètes où il y a au moins 6 Rebelles (#557) : leurs zones
const planetesEnRebellion = index => [...index.parZone]
    .filter(([zone, contenu]) => /^hex:\d+:planete:\d+$/.test(zone) &&
        contenu.filter(x => !x.cache && x.ref?.type === "unit" && x.ref.id === 557).length >= 6)
    .map(([zone]) => zone);

// Les autres joueurs de la partie
const autresJoueurs = outils => outils.joueurs.filter(j => j.userId !== outils.moi);

// Vassalisation forcée (#166) : « le contrôle de 5 systèmes avec des planètes d'une faction »,
// son système natal comptant pour 3. Le contrôle comme état : un test dans chaque système où
// la faction possède une planète (outils.controleDuSysteme : "oui", "non", "enCours", "dispute").
//   -> { systemes: [{ numero, poids, controle }], total (contrôlés), aTrancher (disputés ou en cours) }
const systemesAVassaliser = (outils, cible) => {

    const natal = Number(outils.contenuDe(outils.factionDe(cible.userId))?.system?.id) || 0;

    const systemes = outils.casesDeLaCarte()
        .filter(x => (x.systeme?.elems || []).some(lien => lien?.id > 0 && outils.proprietaire(Number(lien.id)) === cible.userId))
        .map(x => ({ numero: x.numero, poids: x.tuile.ref.id === natal ? 3 : 1, controle: outils.controleDuSysteme(x.numero) }));

    return {
        systemes,
        total: systemes.filter(x => x.controle === "oui").reduce((s, x) => s + x.poids, 0),
        aTrancher: systemes.filter(x => x.controle === "dispute" || x.controle === "enCours"),
    };
};

// Faction qui a donné la promesse de la fiche, lue dans le calcul d'un script (avant
// l'action) : le propriétaire du jeton posé sur la carte, ou null
const donneurDe = outils =>
    Object.values(outils.etat.composants).find(m => outils.c && m.sur === outils.c.id && !m.ref && m.proprio > 0)?.proprio ?? null;

// Promesse rompue (bouton de sa fiche) : la carte retourne à la réserve de promesses, son
// marqueur est retiré, et la faction qui l'avait faite gagne 1 infamie
const promesseRompue = atelier => {

    const donneur = atelier.donneur(atelier.c);

    return {
        actions: [
            ...rendrePromesse(atelier),
            ...(donneur ? atelier.infamie(donneur, 1) : []),
        ],
        sans: donneur ? null : "aucun marqueur de faction sur cette promesse (personne ne gagnera d'infamie)",
        avis: donneur ? `Promesse rompue : ${atelier.nomDe(donneur)} gagne 1 infamie.` : "",
    };
};

const ROMPUE = "Promesse rompue : retour à la réserve, la faction gagne 1 infamie";

// Nefs de la rupture (#810) de l'espace d'un système qui ne sont pas à moi
const nefsIci = (etat, numero, moi) => Object.values(etat.composants).filter(x => !x.cache && x.ref?.type === "unit" &&
    x.ref.id === 810 && x.zone === "hex:" + numero && campDe(x) !== moi);

// Planètes des Réfugiés : celles où est posé un Entrepôt d'aide (#836)
const planetesDesRefugies = etat => [...new Set(Object.values(etat.composants)
    .filter(x => !x.cache && x.ref?.type === "unit" && x.ref.id === 836 && /^hex:\d+:planete:\d+$/.test(x.zone || ""))
    .map(x => x.zone))];

// Mes agents disponibles (réserve « Mes agents »)
const mesAgentsDisponibles = outils => (outils.index.parZone.get(`joueur:${outils.moi}:agents`) || [])
    .filter(x => !x.cache && x.ref?.type === "agent");

// Nom d'un agent usé : l'agent, ou le cube noir et la carte du mercenaire
const nomAgentUse = (outils, x) => {
    if (x.ref) {
        return outils.nom(x.ref);
    }

    const carte = x.marques?.carte ? outils.etat.composants[x.marques.carte] : null;

    return x.jeton + (carte?.ref ? " : " + outils.nom(carte.ref) : "");
};

// Piraterie informatique : X commerce convertis en 2X ressources ou influence
const conversion = (outils, x, vers) => {
    if (x === undefined) {
        return outils.compte("commerce") > 0 ? {} : { sans: "aucun commerce" };
    }

    return x > outils.compte("commerce")
        ? { sans: `commerce insuffisant : ${x} demandé, vous en avez ${outils.compte("commerce")}` }
        : { cout: { commerce: x }, gains: { [vers]: 2 * x } };
};
const LOGISTICIEN = { motif: MOTIF_LOGISTICIEN, nom: "logisticien", depense: false };

// Camp qui domine une case pour un sujet (la carte qui demande la domination) : celui du test
// de domination clos ce tour pour ce sujet (regleControle.js, Controle.jsx), sinon le seul camp
// qui a des unités dans son espace. null : disputée sans test clos ; 0 : personne
const dominantDe = (etat, index, numero, sujet) => {

    const resultat = resultatDomination(etat, numero, sujet);

    if (resultat !== null) {
        return resultat;
    }

    const camps = [...new Set((index.parZone.get("hex:" + numero) || [])
        .filter(x => !x.cache && x.ref?.type === "unit" && !x.sur)
        .map(campDe))];

    return camps.length === 0 ? 0 : (camps.length === 1 ? camps[0] : null);
};

// Cases de la carte dont la tuile est ce système
const casesDuSysteme = (index, idSysteme) => [...index.parZone].flatMap(([zone, contenu]) => {
    const m = /^hex:(\d+)$/.exec(zone);
    return m && contenu.some(x => x.ref?.type === "system" && x.ref.id === idSysteme) ? [Number(m[1])] : [];
});

// Composants d'un système (espace et planètes) ; ses fragments de relique
const dansLeSysteme = (index, numero) => [...index.parZone]
    .filter(([zone]) => zone === "hex:" + numero || zone.startsWith(`hex:${numero}:`))
    .flatMap(([, contenu]) => contenu.filter(x => !x.cache));

const fragmentsDuSysteme = (index, numero) => dansLeSysteme(index, numero).filter(x => !x.ref && /^Fragment /.test(x.jeton || ""));

// Zones des planètes (ni satellite ni spéciale) d'une case : [{ zone, id, contenu }]
const planetesDe = (atelier, x) => (x.systeme?.elems || []).flatMap((lien, k) => {
    const contenu = lien?.id > 0 ? atelier.contenuDe(lien.id) : null;
    return contenu && !["sat", "spe"].includes(contenu.type) ? [{ zone: `hex:${x.numero}:planete:${k}`, id: lien.id, contenu }] : [];
});

// Croissance (Arborec) : vaisseau biologique ; ceux de ma faction qui coûtent au plus 2 de plus
const estVaisseauBio = contenu => aMot(contenu, "ship") && aMot(contenu, "bio");

const optionsCroissance = outils => outils.unitesDeMaFaction().filter(u => u.id !== outils.c?.ref?.id && estVaisseauBio(u.contenu) &&
    (Number(u.contenu.cout) || 0) <= (Number(outils.contenu?.cout) || 0) + 2);

const choixCroissance = choixDansListe({
    titre: "Croissance : par quel vaisseau biologique le remplacer ?",
    options: optionsCroissance,
    libelle: (outils, u) => `${u.contenu.name} (coût ${Number(u.contenu.cout) || 0})`,
    vide: "aucun vaisseau biologique de votre faction ne coûte au plus 2 de plus",
    appliquer: (outils, choisi) => (outils.c
        ? {
            actions: [{ type: "remplacer", c: outils.c.id, ref: { type: "unit", id: choisi.id } }],
            avis: `Croissance : ${outils.contenu?.name || "le vaisseau"} devient ${choisi.contenu.name}.`,
        }
        : { sans: "choix invalide" }),
});

// Vaisseaux militaires de ma faction (Contact mercenaire)
const vaisseauxMilitaires = outils => outils.unitesDeMaFaction().filter(u =>
    aMot(u.contenu, "ship") && aMot(u.contenu, "mil"));

// Mes esclaves, groupés par faction d'origine : [{ camp, nom, esclaves }]
const otages = outils => {

    const groupes = new Map();

    for (const e of outils.esclaves()) {
        const camp = campDe(e);

        if (camp > 0) {
            groupes.set(camp, [...(groupes.get(camp) || []), e]);
        }
    }

    return [...groupes].map(([camp, esclaves]) => ({ camp, nom: outils.nomDe(camp), esclaves }));
};

// Un trou de ver dans ce système : une des planètes spéciales de sa tuile, ou un de ces tokens posé dedans
const aTrouDeVer = (index, systeme, numero, planetes, tokens) =>
    (systeme?.elems || []).some(lien => planetes.includes(Number(lien?.id))) ||
    dansLeSysteme(index, numero).some(c => c.ref?.type === "token" && tokens.includes(c.ref.id));

// Vote : colonnes du plateau, questions « quelle loi » et « quel vote » (onglet Décision)
const COLONNES_VOTE = ["Contre", "Pour", "1", "2", "3", "4", "5", "6"];

const questionLoi = (titre, outils) => `${titre} : pour quelle loi ?\n` +
    (outils.lois().length ? outils.lois() : ["loi 1"]).map((nom, k) => `${k + 1} = ${k + 1}. ${nom}`).join("\n");

// (chaque choix dit aussi la faction qui joue la couleur de la colonne : outils.factionDeColonne)
const questionColonne = (titre, outils) => `${titre} : quel vote ?\n` +
    COLONNES_VOTE.map((nom, k) => `${k + 1} = ${nom}${outils?.factionDeColonne?.(k) ? ` — ${outils.factionDeColonne(k)}` : ""}`).join("\n");

// Soutien politique : la carte n'est plus engagée, l'issue annoncée est oubliée
const effacerVote = carte => ["use", "voteLoi", "voteCol", "voteTour"]
    .filter(m => carte?.marques?.[m] !== undefined)
    .map(m => ({ type: "marquer", c: carte.id, marque: m, valeur: null }));

// Mandats (promesses de type « mand ») détenus par d'autres factions que moi
const mandatsDonnes = outils => Object.values(outils.etat.composants).filter(x => !x.cache && x.ref?.type === "Promesse" &&
    outils.contenuDe(x.ref.id)?.type === "mand" && /^joueur:\d+:(actif|tour:\d+)$/.test(x.zone || "") &&
    !x.zone.startsWith(`joueur:${outils.moi}:`));

// Le Conclave secret (faction neutre #718) est-il sur la table ?
const conclaveEnJeu = etat => Object.values(etat.composants).some(c =>
    !c.cache && c.ref?.type === "neutral" && c.ref.id === 718 && c.zone === "general:table");

// Marqueur libre (étiquette de texte) et sa couleur par défaut — miseEnPlace.js (LIBRE)
const LIBRE = "libre";

// Signaux de l'événement « Signal capté » : la carte n° N attend, cachée, dans la pile
// pioche:signal-N ; un marqueur libre « Signal N » la représente sur la table
const pileSignal = n => `pioche:signal-${n}`;

// Memoria (Le Nomade) — « #Pscience: #spend signal: #resig(4) » : un marqueur de signal (#859)
// du système où est l'unité est dépensé, 4 de recherche de signal sont notés.
const memoriaSignal = (id, carte, ecritLe, nom) => action(id, "unit", carte, ecritLe, `${nom} : signal`, "unite",
    "Science, sur la fiche de l'unité : un marqueur de signal du système où elle se trouve est dépensé, 4 de recherche de signal sont notés (onglet Technologie, à cocher).", {
        phase: "science",
        special: atelier => {

            const signal = Object.values(atelier.etat.composants).find(x => !x.cache && x.ref?.type === "token" && x.ref.id === 859 &&
                x.zone === "hex:" + atelier.numero);

            return {
                actions: signal ? [{ type: "supprimer", c: signal.id }, atelier.recherche(atelier.moi, carte, 4)].filter(Boolean) : [],
                sans: signal ? null : "aucun marqueur de signal dans ce système",
                avis: signal ? `${nom} : signal dépensé, 4 de recherche de signal notés — cochez-les dans l'onglet Technologie.` : "",
            };
        },
        libelle: `${nom} : dépenser un signal (+4 de recherche de signal)`,
    });

// Marqueur de signal (#859, Le Nomade) : bouton de sa fiche, pour la faction qui a l'habilité Signal
const signalRecherche = action("signal-recherche", "token", 859, 0, "Signal : recherche", "carte",
    "Science, sur la fiche d'un marqueur de signal : use un scientifique, le marqueur est retiré et 4 de recherche de signal sont notés (onglet Technologie, à cocher).", {
        phase: "science",
        agent: SCIENTIFIQUE,
        visible: outils => outils.aScript("signal"),
        special: atelier => ({
            // (le marqueur de la fiche est dépensé)
            actions: [atelier.c && { type: "supprimer", c: atelier.c.id }, atelier.recherche(atelier.moi, 859, 4)].filter(Boolean),
            sans: atelier.c ? null : "marqueur de signal introuvable",
            avis: "Signal : marqueur retiré, 4 de recherche de signal notés — cochez-les dans l'onglet Technologie.",
        }),
        libelle: "Signal : +4 de recherche de signal (use un scientifique, retire le marqueur)",
    });

// Bouton SIG-N : la carte du signal n° N va dans mes éléments actifs, face visible
const signal = (n, carte, ecritLe) => action(`sig-${n}`, "tech", carte, ecritLe, `SIG-${n}`, "plateau",
    `Le signal n° ${n} de l'événement « Signal capté » (carte cachée, numérotée à la mise en place) arrive face visible dans vos éléments actifs ; son marqueur « Signal ${n} » est retiré de la table.`, {
        special: atelier => {

            const pile = atelier.index.parZone.get(pileSignal(n)) || [];
            const marqueurs = (atelier.index.parZone.get("general:table") || [])
                .filter(x => !x.ref && x.jeton === LIBRE && x.marques?.texte === `Signal ${n}`);

            return {
                actions: [
                    pile.length > 0 && { type: "piocher", de: pileSignal(n), vers: `joueur:${atelier.moi}:actif` },
                    ...marqueurs.map(x => ({ type: "supprimer", c: x.id })),
                ].filter(Boolean),
                sans: pile.length ? null : `le signal n° ${n} n'est pas en jeu (événement non mis en place, ou signal déjà pris)`,
                avis: pile.length ? `SIG-${n} : le signal n° ${n} est dans vos éléments actifs.` : "",
            };
        },
        visible: outils => (outils.index.parZone.get(pileSignal(n)) || []).length > 0,
        libelle: `SIG-${n} : obtenir le signal n° ${n}`,
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

    reductionAgent("ecoles-militaires", 190, 1795076851625, "Écoles militaires", /amiral/i, "amiraux"),
    reductionAgent("science-integree", 216, 1795076851645, "Science intégrée", /scientifique/i, "scientifiques"),
    reductionAgent("culture-courtisane", 140, 1795076851610, "Culture courtisane", /diplomate/i, "diplomates"),
    reductionAgent("logistique-amelioree", 191, 1795076851625, "Logistique améliorée", /logisticien/i, "logisticiens"),
    reductionAgent("art-du-commerce", 200, 1795076851631, "Art du commerce", /n[ée]gociant/i, "négociants"),
    reductionAgent("ecole-politique", 201, 1795076851632, "École politique", /politi/i, "politiciens"),

    {
        id: "confrerie-de-mercenaire",
        sorte: "recrutement",
        mode: "modifie",
        ou: "Recrutement (Ctrl + clic sur un mercenaire)",
        carte: { type: "habilite", id: 764 },
        ecritLe: 1795046343871,
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
    //             vaisseaux, habilite(idHabilite) -> zone de l'habilité sur la feuille,
    //             agent(motif) -> un de mes agents disponibles }
    // actions(plan) -> actions ajoutées au coup
    // --------------------------------------------------------

    {
        id: "mise-en-place-winnu",
        sorte: "miseEnPlace",
        mode: "modifie",
        ou: "« Mise en place de ma faction » (tour 0)",
        carte: { type: "faction", id: 143 },
        ecritLe: 1795372821161,
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
        ecritLe: 1795045652032,
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
        ecritLe: 1795348043362,
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
        ecritLe: 1795028318753,
        nom: "Mise en place du Nomade",
        description: "4 mercenaires piochés, à part : l'onglet Décision fait en garder deux en main, les deux autres sont défaussés ; les infanteries embarquent dans Memoria ; un négociant est posé sur l'Anneau Arcturus (la station est à vous, pas la planète Arcturus) ; 3 marqueurs de signal sont posés sur des systèmes tirés au hasard.",
        placer: (unite, plan) => {
            const memoria = plan.vaisseaux.find(v => v.c.ref.id === 766);

            return unite.type === "inf" && memoria ? { sur: memoria.c.id } : undefined;
        },
        actions: plan => {

            // L'Anneau Arcturus (#784) est une station commerciale : un négociant la tient
            const negociant = plan.agent(MOTIF_NEGOCIANT);
            const anneau = plan.zonePlanete(784);

            // Habilité Signal : 3 marqueurs de signal (#859) sur trois systèmes différents du plan
            // central, tirés au hasard (le système natal, posé dans ce même coup, n'en fait pas partie)
            const tires = [...(plan.systemes || [])].sort(() => Math.random() - 0.5).slice(0, 3);

            return [
                // (zone de choix, que le joueur est seul à voir : décision « Mercenaires de départ », Decisions.jsx)
                { type: "piocher", de: "pioche:mercenaire", vers: `joueur:${plan.u}:choix`, n: 4 },
                negociant && anneau && { type: "deplacer", c: negociant.id, vers: anneau, proprio: plan.u },
                ...tires.map(zone => ({ type: "creer", ref: { type: "token", id: 859 }, zone, proprio: plan.u })),
            ].filter(Boolean);
        },
        message: "4 mercenaires piochés : choisissez les deux à garder dans l'onglet Décision, les deux autres seront défaussés. Un négociant tient l'Anneau Arcturus ; vous ne possédez pas la planète Arcturus. 3 marqueurs de signal sont posés sur des systèmes tirés au hasard.",
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
        ecritLe: 1795028318806,
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
    //          "joueurs"          un exemplaire chez chaque joueur, dans son onglet Technologie
    //                             (feuille de technologie, ou technologie isolée)
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
    // explores : vrai — un fragment de relique du sac sur chaque système exploré
    //          (système de la carte absent du plateau de départ)
    // secondaires : { centre, autour, n, jeton } — le système `centre` entouré de n
    //          systèmes `autour` dans les systèmes secondaires, avec leurs unités
    //          natives, et un jeton sur n systèmes de la carte tirés au sort
    // reste : ce qui reste à faire à la main (rappelé dans le bandeau orange)
    // --------------------------------------------------------

    evenement("evenement-tempete-spatiale", 450, 1795072921301, "Tempête spatiale", {
        description: "« Tempête spatiale » au tour T+1, « Fin de la tempête » au tour T+5, la feuille « Tempête stellaire » chez chaque joueur.",
        poses: [
            { type: "habilite", id: 442, vers: { evenement: 1 } },
            { type: "habilite", id: 443, vers: { evenement: 5 } },
            { type: "techsheet", id: 520, vers: "joueurs" },
        ],
    }),

    evenement("evenement-catastrophe-lointaine", 455, 1795072921303, "Catastrophe lointaine", {
        description: "« Péage aux frontières » aux tours T+1 et T+2, « Offre d'asile » au tour T+2, les promesses « Tuteur des réfugiés » dans la réserve.",
        poses: [
            { type: "habilite", id: 452, vers: { evenement: 1 }, n: 1 },
            { type: "habilite", id: 452, vers: { evenement: 2 }, n: 1 },
            { type: "habilite", id: 453, vers: { evenement: 2 } },
            { type: "Promesse", id: 454, vers: "promesses" },
        ],
    }),

    evenement("evenement-peste-lointaine", 1039, 1795072921302, "Peste lointaine", {
        description: "« Vaccin » et « Arme bactériologique » chez chaque joueur (onglet Technologie, technologies isolées) ; « Aide humanitaire » au tour T, « Bilan de l'aide humanitaire » au tour T+3.",
        poses: [
            { type: "tech", id: 402, vers: "joueurs" },
            { type: "tech", id: 403, vers: "joueurs" },
            { type: "habilite", id: 404, vers: { evenement: 0 }, n: 1 },
            { type: "habilite", id: 1038, vers: { evenement: 3 }, n: 1 },
        ],
    }),

    evenement("evenement-recrudescence-piraterie", 459, 1795178126980, "Recrudescence de la piraterie", {
        description: "La faction neutre « Pirate » sur la table ; 2 vaisseaux pirates sur chaque champ d'astéroïdes, chaque nébuleuse et chaque rupture gravitationnelle non adjacents à une case natale.",
        poses: [{ type: "neutral", id: 521, vers: "table" }],
        anomalies: { unite: 407, n: 2, types: ["ast", "neb", "rift"], loinDesNatals: true },
    }),

    evenement("evenement-signal-capte", 485, 1795073444394, "Signal capté", {
        description: "« Présence de cache » au tour T ; les 4 signaux (« Cache », « BDD technique », « vaisseau relique » et « Plan ancien ») mélangés, cachés et numérotés de 1 à 4 — un marqueur libre « Signal N » par signal sur la table, que prend la technologie SIG-N ; les technologies SIG-1 à SIG-4 chez chaque joueur (onglet Technologie, technologies isolées) ; les 4 tuiles SIG mélangées aux 12 prochaines tuiles de la pioche.",
        poses: [
            { type: "habilite", id: 491, vers: { evenement: 0 } },
            { type: "tech", id: 481, vers: "joueurs" },
            { type: "tech", id: 482, vers: "joueurs" },
            { type: "tech", id: 483, vers: "joueurs" },
            { type: "tech", id: 484, vers: "joueurs" },
            { type: "system", id: 477, vers: { pioche: 12 } },
            { type: "system", id: 478, vers: { pioche: 12 } },
            { type: "system", id: 479, vers: { pioche: 12 } },
            { type: "system", id: 480, vers: { pioche: 12 } },
        ],
        // Signaux : mélangés dans une pile, puis un par pile pioche:signal-N (personne ne
        // les voit) ; un marqueur libre « Signal N » sur la table (ScriptsCarte.jsx)
        signaux: [
            { type: "habilite", id: 486 },
            { type: "habilite", id: 487 },
            { type: "unit", id: 854 },
            { type: "relique", id: 853 },
        ],
        // Un fragment de relique, tiré du sac, sur chaque système exploré : ceux de la carte
        // qui ne sont pas sur le plateau de départ (paramètres de départ, miseEnPlace.js)
        explores: true,
    }),

    evenement("evenement-grand-khan", 553, 1795178766098, "Grand Khan", {
        description: "La faction neutre « Invasion du grand Khan » au tour T+1 ; à ce tour, le bouton « Faire arriver le grand Khan » de sa fiche pose ses unités.",
        poses: [{ type: "neutral", id: 526, vers: { evenement: 1 } }],
    }),

    // Arrivée du grand Khan : bouton de la fiche de la faction neutre (ScriptsCarte.jsx, ArriveeNeutre),
    // au tour où elle est sur la case Événement — ses unités dans un système tiré au sort
    {
        id: "arrivee-du-grand-khan",
        sorte: "bouton",
        mode: "nouveau",
        ou: "Fiche de la faction neutre « Invasion du grand Khan » (case Événement du tour) : « Faire arriver le grand Khan »",
        carte: { type: "neutral", id: 526 },
        ecritLe: 1795076851742,
        nom: "Arrivée du grand Khan",
        description: "Phase d'événement du tour où la faction neutre est sur la case Événement : un système non spécial de la carte (ni natal, ni système d'événement ou spécial) est tiré au sort (dé du serveur), 1 Palais du Khan et 25 Frégates du Khan y sont posés. Une fois par partie.",
        bouton: "arrivee",
        libelle: "Faire arriver le grand Khan (système non spécial tiré au sort)",
        compteur: "evenement:553:arrivee",
        unites: [{ id: 525, n: 1 }, { id: 524, n: 25 }],
    },

    evenement("evenement-rebellion-interplanetaire", 562, 1795072921304, "Rébellion interplanétaire", {
        description: "La faction neutre « Rébellion interplanétaire » sur la table ; l'agenda « Collaboration contre révolutionnaire » dans les lois à venir du tour T+1 ; " +
            "un jet de rébellion (1D6) par planète possédée hors système natal — sauvage ou culturelle 3+, militaire 5+, autre 4+ — et 1D3 rebelles par jet réussi.",
        poses: [
            { type: "neutral", id: 559, vers: "table" },
            { type: "Agenda", id: 564, vers: { agenda: 1 } },
        ],
        rebellion: { unite: 557, faces: 6, seuils: { sauv: 3, civ: 3, mil: 5 }, defaut: 4, renforts: 3 },
    }),

    evenement("evenement-comment-la-democratie-meurt", 719, 1795072921306, "Comment la démocratie meurt", {
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
        description: "« Rupture de l'espace-temps » et « Étude des failles » sur la table ; Akhenar entouré des failles (la moitié des joueurs, arrondie au supérieur, + 1) dans les systèmes secondaires, chaque faille avec ses 3 Nefs de la rupture ; un jeton trou de ver oméga sur autant de systèmes de la carte, tirés au sort ; la feuille « Rupture » chez chaque joueur.",
        poses: [
            { type: "habilite", id: 814, vers: "table" },
            { type: "habilite", id: 815, vers: "table" },
            { type: "techsheet", id: 822, vers: "joueurs" },
        ],
        // Akhenar au milieu des failles, dans la bande des systèmes secondaires (unités natives
        // posées avec les tuiles), et les jetons trou de ver oméga tirés au sort (ScriptsCarte.jsx)
        secondaires: { centre: 813, autour: 811, n: joueurs => Math.ceil(joueurs / 2) + 1, jeton: 830 },
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

    effet("assimilation", 139, 1795076851608, "Assimilation", "modifie",
        "Fiche d'un système : « Prendre possession », « Revendiquer », « Mobiliser »",
        "Prendre possession d'une planète sans propriétaire, ou la revendiquer, y pose une infanterie ; " +
        "mobiliser sur une planète sauvage pose une infanterie gratuite de plus."),

    effet("culture-courtisane-alliances", 140, 1795076851610, "Culture courtisane", "auto",
        "Ravitaillement automatique (début de la phase)",
        "L'entretien rapporte 1 influence de plus par alliance en jeu chez vous (éléments actifs et cases de tour du plateau)."),

    effet("diversite", 141, 1795076851611, "Diversité", "auto",
        "Ravitaillement automatique (début de la phase)",
        "L'entretien rapporte 1 influence de plus par planète possédée."),

    effet("batiment-resistant", 180, 1795076851612, "Bâtiment résistant", "auto",
        "Conflit : bombardement",
        "Les bombardements ont −1 sur une planète que vous possédez, et −1 de plus si vous y avez une structure."),

    effet("troupe-d-elite", 181, 1795076851614, "Troupe d'élite", "auto",
        "Conflit : combat terrestre",
        "Vos infanteries ont +1 au combat terrestre."),

    effet("bio-stimulant", 183, 1795076851616, "Bio stimulant", "modifie",
        "Tout bouton qui dépense un agent (trêve, déplacement depuis un système activé, relique, Ctrl + clic sur un agent)",
        "Quand un de vos agents (hors mercenaire) doit être détruit, une fenêtre propose de l'utiliser et de payer 2 ressources à la place."),

    effet("manipulation-mentale", 184, 1795076851618, "Manipulation mentale", "nouveau",
        "Fiche d'un système, à côté de chaque planète : « Manipulation mentale »",
        "Phase de production : use un diplomate et pose une de vos infanteries sur la planète (une de vos unités doit être dans le système ou un système voisin)."),

    effet("recuperation", 185, 1795202001313, "Récupération", "modifie",
        "Conflit : « Terminer le combat » (case « Récupération », cochée d'office), puis test de domination",
        "À la fin d'un combat spatial, +1 ressource par vaisseau détruit pendant ce combat pour la faction qui domine le système. " +
        "Seul dans l'espace : gain immédiat. Sinon un test s'ouvre (onglet Conflit) : chaque camp soutient une des factions qui " +
        "demandent la Récupération, s'engage contre toutes ou s'abstient ; une seule à la demander : test de contrôle simple."),

    effet("bouclier-deflecteur", 186, 1795076851620, "Bouclier déflecteur", "auto",
        "Conflit : canons spatiaux ; déplacement assisté",
        "Les canons qui visent vos vaisseaux ont −1 ; vos vaisseaux peuvent traverser les champs d'astéroïdes (interdits aux autres)."),

    effet("apprentissage", 187, 1795076851621, "Apprentissage", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de recrutement : remplace un de vos agents par un autre agent de base (celui de votre faction s'il le réimplémente)."),

    effet("capsule-de-transport", 188, 1795076851622, "Capsule de transport", "auto",
        "Capacité des vaisseaux (embarquement, déplacement assisté)",
        "Vos vaisseaux qui ont une capacité l'augmentent de 1, vos transporteurs de 2."),

    effet("capsule-de-secours", 189, 1795076851624, "Capsule de secours", "nouveau",
        "Conflit : cadre « Sauvetage » d'un combat",
        "Quand un de vos vaisseaux détruit porte des infanteries : un jet par infanterie (6 ou moins sur un dé de 10), puis les " +
        "arrivées possibles — planètes du système, planètes voisines qui ont un dock (l'accord du propriétaire n'est pas géré)."),

    effet("ecoles-militaires-combat", 190, 1795076851625, "Écoles militaires", "modifie",
        "Fiche d'un système : « Combat spatial »",
        "Le premier combat spatial que vous ouvrez dans le tour vous donne +1 à ce combat."),

    effet("arme-amplifiee", 194, 1795076851627, "Arme amplifiée", "nouveau",
        "Plateau joueur : « Actions de mes technologies » ; Conflit : combat spatial",
        "Phase de science : détruit un scientifique et marque un type de vaisseau ; vos vaisseaux de ce type ont +2 au combat spatial."),

    effet("reparation-improvisee", 195, 1795076851628, "Réparation improvisée", "nouveau",
        "Fiche d'un de vos vaisseaux endommagés : « Réparation improvisée »",
        "Phase de production : use un logisticien et répare le vaisseau (1 ressource par dégât).",
        // (la version de Hacan de la même technologie)
        [419]),

    effet("systeme-de-visee", 196, 1795076851629, "Système de visée", "auto",
        "Conflit : canons spatiaux, bombardement",
        "Vos canons spatiaux et vos bombardements ont +1."),

    effet("blindage-en-duranium", 197, 1795076851630, "Blindage en duranium", "auto",
        "Résistance des unités (Conflit, où la valeur modifiée est en vert)",
        "Vos vaisseaux amiraux, soleils de guerre, cuirassés et transporteurs ont 1 de résistance de plus (selon le type d'unité, pas son nom)."),

    effet("soleil-de-guerre", 198, 1795076851630, "Soleil de guerre", "auto",
        "Onglet Technologie : dernière case de recherche de la technologie",
        "Quand la technologie est obtenue, un soleil de guerre de votre faction arrive dans vos éléments actifs."),

    effet("art-du-commerce-livraison", 200, 1795076851631, "Art du commerce", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de diplomatie : la technologie est utilisée, la faction choisie gagne 2 commerce (livraison ; les dettes se réduisent à la main)."),

    effet("ecole-politique-lois", 201, 1795076851632, "École politique", "modifie",
        "Bandeau de la phase de proposition : « Piocher »",
        "Vous piochez 2 propositions de plus, même en dépensant 0 influence."),

    effet("centre-de-coordination", 202, 1795076851633, "Centre de coordination", "auto",
        "Conflit : combat spatial",
        "Vous avez +1 au combat spatial si le système contient un de vos docks ou votre vaisseau amiral."),

    effet("rapport-de-force", 205, 1795076851635, "Rapport de force", "nouveau",
        "Conflit : cadre de blocage d'un déplacement, conflit de contrôle, conflit de domination",
        "Use un diplomate : +2 à votre valeur de contrôle pour ce blocage ou ce conflit."),

    effet("reparation", 206, 1795076851637, "Réparation", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de revendication : use un diplomate ; la faction choisie reçoit une dette de 3 envers vous, à payer dans 3 tours."),

    effet("brevet", 207, 1795076851637, "Brevet", "auto",
        "Onglet Technologie : une case de recherche cochée par un autre joueur",
        "Quand une autre faction recherche une technologie que vous possédez, vous gagnez 1 commerce (une fois par tour, par faction et par technologie)."),

    effet("trading", 208, 1795076851638, "Trading", "auto",
        "« Phase suivante », à la fin de la phase de vote",
        "Un de vos négociants posé sur votre plateau de vote est votre prédiction : si cette case est première de sa loi à la fin de la phase, +2 commerce."),

    // ---- chantier « toutes les technologies », lot A ----

    effet("logistique-amelioree-capacite", 191, 1795076851625, "Logistique améliorée", "auto",
        "Capacité logistique : taille d'une flotte (déplacement assisté), production d'un dock",
        "Chaque logisticien posé sur la technologie (onglet Technologie : le glisser sur sa carte) augmente votre capacité logistique de 1 (3 par défaut)."),

    effet("universite", 210, 1795076851640, "Université", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de recrutement : la technologie et l'agent choisi sont utilisés ; un agent du même type vous attend sur votre case du tour suivant."),

    effet("pillage", 211, 1795076851641, "Pillage", "modifie",
        "Fiche d'un système : « Prendre possession » (et le conflit de contrôle)",
        "Prendre possession d'une planète qu'une autre faction possédait lui vole 2 commerce."),

    effet("reseau-de-commerce", 213, 1795076851642, "Réseau de commerce", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Deux boutons de conversion, un pour un : influence en ressources, ressources en influence."),

    effet("extorsion", 214, 1795076851643, "Extorsion", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de diplomatie : use un diplomate ; la faction choisie reçoit une dette de 3 envers vous, à payer dans 3 tours."),

    effet("rayon-tracteur", 217, 1795076851646, "Rayon tracteur", "auto",
        "Conflit : blocage d'un déplacement, conflits de contrôle",
        "Vos vaisseaux qui ont plus de 1 de résistance comptent 1 de contrôle de plus."),

    effet("exploration", 218, 1795045652040, "Exploration efficace", "modifie",
        "Onglet Espace, phase de science : Ctrl + clic sur un emplacement vide",
        "Tout joueur explore en usant un scientifique et un logisticien. Avec cette technologie, un seul des deux : s'il a les deux, l'onglet Décision fait choisir lequel."),

    effet("cartographie-de-l-espace", 231, 1795076851651, "Cartographie de l'espace", "auto",
        "Conflit : combat spatial, canons spatiaux",
        "Dans un système qui a une anomalie, les attaques contre vos vaisseaux ont −1."),

    effet("moteur-a-gravite", 233, 1795076851653, "Moteur à gravité", "modifie",
        "Déplacement assisté : case « Moteur à gravité »",
        "Cochée, vos vaisseaux ont +1 mouvement ; des scientifiques sont utilisés au départ (un par vaisseau seul, deux par flotte)."),

    effet("strategie-de-saut", 234, 1795076851654, "Stratégie de saut", "auto",
        "Déplacement assisté, puis Conflit : combat spatial",
        "Des vaisseaux arrivés par un trou de ver ont, ce tour, la frappe en premier et +1 au combat spatial."),

    effet("camouflage", 236, 1795076851656, "Camouflage", "auto",
        "Conflit : blocage d'un déplacement, combat spatial",
        "Vos vaisseaux ne sont pas bloqués par des unités adverses, et tant qu'ils n'ont engagé personne ils ne peuvent qu'être ciblés."),

    effet("micro-teleporteur", 237, 1795076851656, "Micro-téléporteur", "nouveau",
        "Plateau joueur : « Actions de mes technologies »",
        "Phase de production : use un logisticien ; vous déplacez ensuite les unités transportables à la main."),

    effet("stargate", 238, 1795076851657, "Stargate", "auto",
        "Déplacement assisté",
        "Pour vos déplacements, chaque système où vous avez un dock a un trou de ver alpha."),

    effet("moteur-ftl", 239, 1795076851658, "Moteur FTL", "auto",
        "Déplacement assisté",
        "Tous vos vaisseaux ont 1 de mouvement de plus."),

    effet("bouclier-amplifie", 244, 1794343420976, "Bouclier amplifié", "auto",
        "Résistance des unités (Conflit, où la valeur modifiée est en vert)",
        "Votre vaisseau amiral et vos systèmes de défense ont 2 de résistance de plus, vos boucliers mobiles 1."),

    effet("cuve-de-clonage", 245, 1795046343812, "Cuve de clonage", "nouveau",
        "Fiche d'un système, à côté de « Mobiliser »",
        "Phase de production : use un logisticien et un scientifique ; une infanterie de plus, et toute la mobilisation est gratuite."),

    effet("reseau-d-ingerence", 247, 1795045652046, "Réseau d'ingérence", "auto",
        "Onglet Vote : décompte",
        "Un de vos scientifiques posé sur votre plateau de vote vaut 2 voix."),

    effet("argumentation-vehemente", 251, 1795046343814, "Argumentation véhémente", "nouveau",
        "Onglet Vote, au-dessus des lois",
        "Phase de prévote : use un politicien (qui ne reste pas sur le plateau) et 1 influence ; 2 voix s'ajoutent tout de suite au décompte, sur la loi et la colonne choisies."),

    effet("strategie-dominante", 252, 1795072921257, "Stratégie dominante", "auto",
        "Conflit : combat spatial",
        "Vos unités à frappe en premier ont +1 ; cibler un de vos vaisseaux coûte −4 au lieu de −2."),

    effet("avantage-aerien", 253, 1794343420987, "Avantage aérien", "auto",
        "Conflit : combat terrestre",
        "Vos infanteries ont la frappe en premier."),

    // ---- lot B : production ----

    effet("ia-industrielle", 193, 1795076851626, "IA industrielle", "auto",
        "Production ouverte avec un dock (Ctrl + clic sur le dock, phase de production)",
        "Vos docks produisent 2 unités de plus ; pour un dock posé sur une planète militaire, le coût total de la production baisse de 2."),

    // ---- lot C : commerce et agents ----

    effet("propagande", 212, 1795076851642, "Propagande", "modifie",
        "Plateau général : « + » de la piste d'infamie",
        "Au gain d'un point d'infamie, une fenêtre propose de dépenser un diplomate pour ne pas le gagner."),

    effet("science-integree-livraison", 216, 1795076851645, "Science intégrée", "modifie",
        "Livraison commerciale (fiche d'une unité, Art du commerce)",
        "Lors d'une livraison, une fenêtre propose d'user un scientifique : la faction livrée gagne 4 cases de recherche d'une technologie que vous possédez (elle les coche à la main)."),

    effet("commerce-profitable", 269, 1794343420988, "Commerce profitable", "auto",
        "Livraison commerciale",
        "Vos livraisons valent 1 de plus ; une livraison que vous recevez vous rapporte 1 commerce de plus."),

    effet("connexion", 270, 1794343420989, "Connexion", "modifie",
        "Tout bouton qui utilise ou dépense un agent",
        "Si vous n'avez pas l'agent demandé mais avez un négociant, une fenêtre propose de l'utiliser à sa place pour 2 commerce (pas pour les agents du déplacement assisté)."),

    // ---- lot D : conflits ----

    effet("bombe-bacteriologique", 182, 1795076851615, "Bombe bactériologique", "auto",
        "Conflit : bombardement",
        "Vos dégâts de bombardement sont verts : une infanterie biologique qu'ils détruisent entraîne deux autres infanteries identiques de la planète."),

    effet("canon-longue-portee", 235, 1795076851655, "Canon longue portée", "auto",
        "Conflit : canons spatiaux (« Mes canons spatiaux à portée »)",
        "La portée de vos canons spatiaux passe de 1 à 2."),

    effet("medecine", 242, 1795076851660, "Médecine", "modifie",
        "Conflit : « Terminer le combat » d'une de vos unités biologiques détruites",
        "Avant de la retirer, un jet (5 ou moins sur un dé de 10) permet de la capturer : elle va dans vos éléments actifs, d'où vous la replacez (use un logisticien, à la main)."),

    effet("laser-longue-portee", 248, 1795046343814, "Laser longue portée", "auto",
        "Conflit : canons spatiaux (« Mes canons spatiaux à portée »)",
        "Votre vaisseau amiral a un canon spatial (6, 3 dés) ; un canon peut tirer une case plus loin que sa portée si un scientifique est aussi utilisé."),

    effet("grappin-de-capture", 250, 1795076851660, "Grappin de capture", "nouveau",
        "Conflit : cadre d'un combat résolu",
        "Use un logisticien : un vaisseau adverse détruit pendant ce combat (ni soleil de guerre ni vaisseau amiral) arrive capturé dans vos éléments actifs."),

    // ---- lot E ----

    effet("archeologie", 209, 1795076851639, "Archéologie", "modifie",
        "Fiche d'un système : « Fouiller la ruine » ; bandeau de la phase de science : « Archéologie : piocher un plan »",
        "Une fouille rapporte deux fragments, dont vous gardez un (en haut du volet de droite). Nouveau bouton : la technologie et un scientifique sont utilisés, un plan de relique est pioché."),

    effet("exploitation-du-vide", 232, 1795076851652, "Exploitation du vide", "auto",
        "Ravitaillement automatique (début de la phase) ; Conflit : conflits de domination",
        "L'entretien rapporte 1 ressource par système vide que vous dominez (3 pour une nébuleuse). Un système vide où d'autres ont des unités demande un conflit de domination : tant qu'il n'est pas résolu, le ravitaillement automatique attend."),

    effet("drain-spatial", 246, 1795046343813, "Drain spatial", "nouveau",
        "Conflit : cadre de blocage d'un déplacement",
        "Quand des vaisseaux vont entrer dans un système où vous avez un vaisseau amiral, un soleil de guerre ou un système de défense : vous exigez 1 ressource par vaisseau, ou vous laissez passer ; le joueur paie, ou ses vaisseaux restent sur la case précédente."),

    // --------------------------------------------------------
    // REVENUS DE PHASE : unités posées et planètes possédées (Revenus.jsx)
    // --------------------------------------------------------

    revenu("usine", "unit", 16, 1795068317081, "Usine", "ravit",
        "Chaque usine que vous avez sur la carte rapporte 2 ressources.", { gains: { res: 2 }, aussi: [893] }),

    revenu("statue-en-or", "unit", 23, 1794049918186, "Statue en or", "ravit",
        "Chaque statue rapporte 1 point.", { gains: { points: 1 } }),

    revenu("station-meteorologique", "unit", 444, 1795046343838, "Station météorologique", "ravit",
        "Chaque station génère 2 de recherche tempête et 1 de recherche spatiale (notées au journal de recherche) ; plus de recherche tempête une fois la « Fin de la tempête » appliquée.", {
            recherche: [["storm", 2], ["spa", 1]],
            calcul: (source, outils) => (outils.etat.compteurs["tempete:finie"]
                ? { recherche: [["spa", 1]] }
                : { recherche: [["storm", 2], ["spa", 1]] }),
        }),

    revenu("forge-du-vide", "unit", 868, 1795046343890, "Forge du vide", "ravit",
        "S'il y a un trou de ver delta dans son système : 1 ressource, 1 influence et 1 de recherche.", {
            calcul: (source, outils) => (outils.aDansLeSysteme(source.numero, /delta|hil colish/i)
                ? { gains: { res: 1, inf: 1 }, recherche: [["", 1]] }
                : { sans: "pas de trou de ver delta dans le système" }),
        }),

    revenu("centre-de-contrebande", "unit", 786, 1794335055083, "Centre de contrebande", "ravit",
        "3 ressources et 3 influence, moins 1 par autre centre de contrebande à 3 systèmes ou moins.", {
            calcul: (source, outils) => {
                const n = Math.max(0, 3 - outils.autresProches(source, 3));

                return n ? { gains: { res: n, inf: n } } : { sans: "trop de centres proches" };
            },
        }),

    revenu("arbre-pere", "unit", 465, 1795046343846, "Arbre père", "ravit",
        "Produit un Fruit de vie dans l'espace de son système.", { cree: { unite: 464, n: 1, ou: "espace" } }),

    revenu("arbre-mere", "unit", 467, 1795046343848, "Arbre mère", "ravit",
        "Produit autant de Letani que votre niveau de connaissance génétique, sur sa planète.", {
            calcul: (source, outils) => (outils.connaissance("gen") > 0
                ? { cree: { unite: 423, n: outils.connaissance("gen"), ou: "ici" } }
                : { sans: "aucun niveau de connaissance génétique" }),
        }),

    revenu("colonie-ladaran", "unit", 590, 1795069399845, "Colonie Ladaran", "ravit",
        "Produit une de vos infanteries, à son bord.", { cree: { unite: "inf", n: 1, ou: "bord" } }),

    revenu("memoria-c", "unit", 770, 1794049918252, "Memoria C", "ravit",
        "Produit une frégate marchande dans son système.", { cree: { unite: 11, n: 1, ou: "espace" } }),

    revenu("complexe-de-guerre", "unit", 164, 1795074271173, "Complexe de guerre", "ravit",
        "Pose un de vos destroyeurs dans son système si vous le contrôlez. Personne ne peut s'y opposer : posé d'office. " +
        "Sinon le ravitaillement attend un conflit de contrôle « Complexe de guerre », ouvert depuis le bandeau du ravitaillement : " +
        "gagné, le destroyeur est posé ; perdu, rien.", {
            calcul: (source, outils) => {

                // (le contrôle comme état : un test dans le système du complexe)
                const controle = outils.controleDuSysteme(source.numero);

                return controle === "oui" ? { cree: { unite: "dest", n: 1, ou: "espace" }, note: "vous contrôlez le système" }
                    : (controle === "non" ? { sans: "vous n'avez pas obtenu le contrôle du système" }
                        : {
                            attente: "contrôle du système disputé, conflit de contrôle à " + (controle === "enCours" ? "conclure (onglet Conflit)" : "ouvrir"),
                            controle: controle === "dispute" ? { numero: source.numero } : null,
                        });
            },
        }),

    revenu("relique-reforgee", "planet", 131, 1795190407273, "Relique reforgée", "ravit",
        "Rapporte 1 point à qui la possède.", { gains: { points: 1 } }),

    revenu("anneau-arcturus", "planet", 784, 1795376624395, "Anneau Arcturus", "ravit",
        "Produit une frégate marchande dans son système.", { cree: { unite: 11, n: 1, ou: "espace" } }),

    revenu("new-eden", "planet", 469, 1795190407285, "New eden", "ravit",
        "Produit 2 Letani sur la planète.", { cree: { unite: 423, n: 2, ou: "ici" } }),

    revenu("asteroide-d-or", "planet", 31, 1795379384431, "Astéroïde d'or", "production",
        "Génère 3 commerce pour qui le possède.", { gains: { commerce: 3 } }),

    revenu("sr-42", "planet", 33, 1795379301954, "SR-42", "science",
        "Génère 2 de recherche spatiale (doublée par sa spécialité) pour qui la possède.", { recherche: [["spa", 2]] }),

    revenu("sr-124", "planet", 47, 1795379301960, "SR-124", "science",
        "Génère 2 de recherche sociale (doublée par sa spécialité) pour qui la possède.", { recherche: [["soc", 2]] }),

    revenu("sr-217", "planet", 1263, 0, "SR-217", "science",
        "Génère 2 de recherche génétique (doublée par sa spécialité) pour qui la possède.", { recherche: [["gen", 2]] }),

    regle("sr-217-agent", "planet", 1263, 0, "SR-217 : agent usé au lieu d'être dépensé", "modifie",
        "Tout bouton qui dépense un agent (trêve, déplacement depuis un système activé, relique, Ctrl + clic sur un agent…)",
        "Quand vous possédez SR-217 et qu'elle n'est pas activée, un de vos agents (hors mercenaire) qui doit être dépensé peut être usé à la place : l'onglet Décision le propose ; la station est activée et 3 ressources payées."),

    // Stations scientifiques de Jol-Nar (une par technologie de base) et Centre d'espionnage industriel
    revenu("sr-301", "planet", 1252, 1795379301966, "SR-301", "science",
        "Génère 2 de recherche génétique (doublée par sa spécialité) pour qui la possède.", { recherche: [["gen", 2]] }),

    revenu("sr-302", "planet", 1254, 1795379301971, "SR-302", "science",
        "Génère 2 de recherche spatiale (doublée par sa spécialité) pour qui la possède.", { recherche: [["spa", 2]] }),

    revenu("sr-303", "planet", 1256, 1795379301978, "SR-303", "science",
        "Génère 2 de recherche militaire (doublée par sa spécialité) pour qui la possède.", { recherche: [["mil", 2]] }),

    revenu("sr-304", "planet", 1258, 1795379301983, "SR-304", "science",
        "Génère 2 de recherche sociale (doublée par sa spécialité) pour qui la possède.", { recherche: [["soc", 2]] }),

    revenu("centre-d-espionnage-industriel", "planet", 1250, 1795348043309, "Centre d'espionnage industriel", "science",
        "Génère 4 de recherche pour qui le possède, à cocher sur une technologie qu'une autre faction possède et que vous n'avez pas (le choix de la technologie est à vous).",
        { recherche: [["", 4]], note: "sur une technologie qu'une autre faction possède et que vous n'avez pas" }),

    revenu("station-de-combat", "planet", 56, 1795379428234, "Station de combat", "science",
        "Génère 3 de recherche militaire pour qui la possède.", { recherche: [["mil", 3]] }),

    // --------------------------------------------------------
    // RÈGLES D'UNITÉS ET DE PLANÈTES, codées là où elles agissent
    // --------------------------------------------------------

    regle("laboratoire", "unit", 176, 1794335054832, "Laboratoire", "modifie",
        "Fiche d'un système : « Rechercher »",
        "Rechercher sur une planète où vous avez un Laboratoire rapporte 1 de recherche de plus."),

    regle("mecha-d-archeologie", "unit", 22, 1794339608703, "Mecha d'archéologie", "modifie",
        "Fiche d'un système : « Fouiller la ruine »",
        "Fouiller une ruine d'une planète où vous avez un Mecha d'archéologie n'use pas de scientifique."),

    regle("wanno", "planet", 46, 1795376185087, "Wanno", "modifie",
        "Fiche d'un système : « Prendre possession », « Revendiquer »",
        "Prendre possession de Wanno rapporte 1 infamie."),

    regle("perimeter", "planet", 60, 1795376185096, "Perimeter", "modifie",
        "Fiche d'une unité : « Livraison commerciale »",
        "Vos livraisons valent 1 commerce de plus si vous possédez Perimeter."),

    regle("avar", "planet", 61, 1795376185097, "Avar", "modifie",
        "Fiche d'un système : « Revendiquer »",
        "Avar ne peut pas être en votre possession sans unité dessus : la revendiquer sans y avoir d'unité est rouge gris, et la possession tombe d'elle-même quand votre dernière unité la quitte (glisser) ou y est détruite (« Terminer le combat »). Vaut aussi pour Arcturus.", [783]),

    regle("cormund", "planet", 49, 1795378097363, "Cormund", "modifie",
        "Fiche d'un système : « Fouiller la ruine »",
        "Il faut au moins 3 de vos infanteries sur Cormund pour fouiller ses ruines."),

    regle("shar", "planet", 275, 1795072921243, "Shar", "auto",
        "Déplacement assisté",
        "Si vous possédez Shar, la nébuleuse de son système ne gêne pas vos déplacements."),

    regle("soleil-de-guerre-production", "unit", 17, 1795046343776, "Soleil de guerre", "auto",
        "Réserve : production d'un soleil de guerre",
        "Produire un soleil de guerre sans la technologie « Soleil de guerre » demande une confirmation.", [199]),

    regle("mech-geant", "unit", 516, 1794049918222, "Mech géant", "auto",
        "Embarquement sur un vaisseau, déplacement assisté",
        "Une unité dont le texte dit « Nécessite n de capacité » compte pour n dans la capacité du vaisseau."),

    // Pillage (#pill) : rattaché à la frégate marchande, il vaut pour toute unité dont
    // le texte porte #pill
    regle("pillage-unite", "unit", 11, 1795046343774, "Pillage (#pill)", "auto",
        "Conflit : « Terminer le combat » une unité détruite",
        "Le camp qui a infligé le dernier dégât à une unité à pillage gagne ce que dit son texte (commerce, points, infamie, recherche) quand elle est retirée — s'il a encore une unité dans le système."),

    regle("maitre-du-pillage", "habilite", 844, 1794049435795, "Maître du pillage", "auto",
        "Conflit : « Terminer le combat » une unité détruite",
        "Chaque pillage vous rapporte 1 commerce de plus."),

    regle("libre-echange", "habilite", 24, 1795068635404, "Libre échange", "auto",
        "Conflit : « Terminer le combat » une unité détruite",
        "Détruire un vaisseau de commerce non militaire vous rapporte 1 infamie."),

    regle("jeollr", "planet", 59, 1795376185095, "Jeollr", "auto",
        "Conflit : bombardement",
        "Les bombardements contre Jeollr ont −2."),

    regle("loki", "planet", 62, 1795376185098, "Loki", "auto",
        "Conflit : combats sur la planète",
        "Sur Loki, les attaques contre la faction qui possède la planète ont −1."),

    // --------------------------------------------------------
    // HABILITÉS (voir plus haut : à qui une habilité s'applique)
    // --------------------------------------------------------

    regle("seve-de-vie", "habilite", 427, 1793999783813, "Sève de vie", "auto",
        "Ravitaillement automatique (début de la phase)",
        "À l'entretien, vos unités biologiques posées sur la carte récupèrent 1 de résistance."),

    regle("destin-legendaire", "habilite", 145, 1795072921275, "Destin légendaire", "modifie",
        "Ravitaillement automatique (début de la phase) ; fiche d'un système : prise de possession",
        "L'entretien rapporte 1 point par planète légendaire possédée ; la faction qui vous prend une planète légendaire gagne 1 point et 1 infamie."),

    // Décompte des points (Decompte.jsx, regleDecompte.js) : cadre de la phase de décompte, et aperçu
    // replié du Plateau général. Les cartes citées rapportent leurs points « #Decomp » dans ce cadre.
    regle("decompte-des-points", "phase", 440, 0, "Décompte des points", "auto",
        "En tête de la partie à la phase de décompte ; Plateau général : aperçu replié",
        "Pour chaque faction : points de la piste, lignes du décompte (connaissance, sièges, infamie et Sévérité, Canon restauré, Colonie Ladaran, Armageddon conquis, Arbre de vie éternelle, Graine d'eden, Monument éternel, Spectre de l'empereur, Plan ancien), total et départage. Une unité rapporte à son camp ; une unité neutre ne rapporte rien. « Marquer mes points du décompte » déplace votre marqueur, une fois.",
        [30, 590, 490, 571, 470, 554, 387, 853]),

    regle("monument-eternel", "unit", 554, 0, "Monument éternel : contributions pillées", "auto",
        "Conflit : dégâts attribués au monument",
        "Un dégât ne blesse pas le monument tant qu'il porte 3 commerce de contribution (jetons de commerce posés dessus) : l'attaquant en pille 3, pris d'abord à qui a le plus contribué (à égalité, par ordre d'initiative). Sinon le monument subit le dégât."),

    regle("s-ula-mentarion", "unit", 732, 0, "S'Ula Mentarion", "auto",
        "Conflit : « Terminer le combat » ; fiche de l'unité : « Livraison commerciale »",
        "Un vaisseau de commerce qu'il détruit lui fait poser un marqueur (un seul à la fois). À la diplomatie, sa livraison de 5 dépense ce marqueur, non l'unité."),

    regle("graine-d-eden", "unit", 470, 0, "Graine d'eden", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Sa résistance n'a pas de limite : la Sève de vie continue de la soigner sans dégât (résistance en plus, affichée en vert). À 6 de résistance ou plus au ravitaillement, New eden est posé sur sa planète."),

    regle("george-nobin", "mercenaire", 304, 0, "George Nobin", "modifie",
        "Fiche d'un vaisseau de commerce : « Livraison commerciale »",
        "Tant que son cube est sur sa carte : un choix « George Nobin : + X » (4 au plus) — X commerce sont dépensés, la livraison de ce vaisseau est augmentée de X, et son cube part dans les agents usés."),

    regle("sphere-de-dyson-pose", "unit", 178, 0, "Sphère de Dyson : pose", "modifie",
        "Phase de construction : la sphère glissée vers un système",
        "Elle se place dans une nébuleuse, ou dans un système vide adjacent à une supernova : ailleurs, la construction demande une confirmation."),

    regle("vassal-fin", "Promesse", 224, 0, "Vassal : fin de la promesse", "auto",
        "Conflit : « Engager », « Cibler » ; « Terminer le combat »",
        "La promesse est dépensée (retour à la réserve, sans infamie) quand le suzerain engage son vassal, ou quand le vassal détruit le vaisseau amiral du suzerain. (Planète prise au suzerain : à la main.)"),

    regle("memoria-c-revendiquer", "unit", 770, 0, "Memoria C : revendiquer", "modifie",
        "Fiche d'un système : « Revendiquer »",
        "Une Memoria C à vous dans le système, pas encore usée, revendique à la place d'un diplomate : elle est usée. (Si l'accord d'autres camps est demandé, la revendication se conclut dans l'onglet Conflit avec un diplomate.)"),

    regle("gloire-au-juste", "unit", 151, 0, "Gloire au juste", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Tant que Gloire au juste est sur la carte : si le Winnu possède Mecatol Rex, l'entretien de chaque faction rapporte 1 influence par faction qui a plus d'infamie qu'elle ; sinon, la faction qui possède Mecatol Rex gagne 1 infamie."),

    regle("vassal-faveur", "Promesse", 224, 0, "Vassal : faveur au suzerain", "auto",
        "Ravitaillement automatique (début de la phase), tours pairs",
        "Aux tours pairs, la faveur que le vassal gagne à l'entretien (planète natale possédée) est posée chez le suzerain, qui tient sa promesse Vassal."),

    regle("portail-de-repli-raideurs", "unit", 155, 0, "Portail de repli : Raideurs", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Vos Raideurs détruits au tour précédent sont replacés dans le système de votre Portail de repli."),

    regle("quetzalcoalt", "unit", 162, 0, "Quetzalcoalt", "auto",
        "Conflit : « Terminer le combat » d'un combat spatial",
        "Si vous avez engagé au moins 3 vaisseaux militaires dans le combat et que le Quetzalcoalt est encore en vie : 1 point, une fois par tour."),


    regle("soleil-d-or-deplacement", "unit", 21, 0, "Soleil d'or : déplacement", "modifie",
        "Espace : déplacement assisté",
        "Déplacer le Soleil d'or coûte 2 commerce en plus de l'agent : ils sont dépensés au départ."),

    regle("etoile-de-la-mort-deplacement", "unit", 572, 0, "Étoile de la mort : déplacement", "modifie",
        "Espace : déplacement assisté",
        "La déplacer use un logisticien, un amiral et un scientifique, comptés à part des flottes."),

    regle("redevance-de-protection-engagement", "Promesse", 226, 0, "Redevance de protection : engagement", "modifie",
        "Conflit : « Engager », « Cibler »",
        "Le Mentak qui a fait la promesse ne peut pas engager volontairement la faction qui la tient (confirmation) ; la faction qui la tient et engage le Mentak perd la promesse."),

    regle("conclave-secret", "habilite", 160, 1795046343788, "Conclave secret", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Aux tours 1, 4, 6, 8, 9 et 10, l'entretien pioche un objectif militaire dans votre main ; à partir du tour 4, le compte rendu rappelle d'évaluer l'objectif précédent, pour vous seul, et d'en marquer les points."),

    signalRecherche,

    regle("station-de-mercenaire-ravitaillement", "planet", 38, 0, "Station de mercenaire : mercenaires du tour", "auto",
        "« Nouveau tour » (début du ravitaillement)",
        "À chaque nouveau tour, les mercenaires disponibles sur la station sont remplacés : ceux qui restent retournent sous la pioche, et autant de nouveaux que le dit son texte sont révélés sur la station."),

    regle("signal", "habilite", 765, 1795373790000, "Signal", "auto",
        "Ravitaillement automatique (début de la phase)",
        "L'entretien pose un marqueur de signal sur un système tiré au hasard."),

    regle("tempete-spatiale", "habilite", 442, 1795046343836, "Tempête spatiale", "auto",
        "Déplacement assisté ; Conflit",
        "Les vaisseaux ont −1 au mouvement ; les canons spatiaux et tous les combats ont −1."),

    revenu("bdd-technique", "habilite", 487, 1795046343853, "BDD technique", "science",
        "1 de recherche par fragment de relique que vous possédez.", {
            calcul: (source, outils) => (outils.fragments > 0
                ? { recherche: [["", outils.fragments]] }
                : { sans: "aucun fragment de relique" }),
        }),

    // --------------------------------------------------------
    // BOUTONS D'ACTION (ActionsScript.jsx)
    // --------------------------------------------------------

    action("hopeld", "planet", 72, 1795376185102, "Hopeld : produire un Mech géant", "planete",
        "Production : dépensez un logisticien, un Mech géant est posé sur Hopeld (que vous possédez).", {
            phase: "production",
            possede: true,
            agent: { motif: MOTIF_LOGISTICIEN, nom: "logisticien", depense: true },
            cree: { unite: 516, n: 1 },
            libelle: "Produire un Mech géant (dépense un logisticien)",
        }),

    action("sig", "planet", 473, 1795046343768, "Obtenir la planète", "planete",
        "Science : use un scientifique, la planète SIG est à vous.", {
            phase: "science",
            agent: SCIENTIFIQUE,
            prendre: true,
            visible: outils => !outils.possede,
            libelle: "Obtenir (use un scientifique)",
            aussi: [474, 475, 476],
        }),

    action("sphere-de-dyson", "unit", 178, 1795046343794, "Sphère de Dyson", "unite",
        "Science : use un scientifique, 2 ressources par niveau de connaissance spatiale.", {
            phase: "science",
            agent: SCIENTIFIQUE,
            calcul: outils => (outils.connaissance("spa") > 0
                ? {
                    gains: { res: 2 * outils.connaissance("spa") },
                    libelle: `Sphère de Dyson : +${2 * outils.connaissance("spa")} ressources (use un scientifique)`,
                }
                : { sans: "aucun niveau de connaissance spatiale" }),
            libelle: "Sphère de Dyson : ressources (use un scientifique)",
        }),

    action("arbre-de-vie-eternelle", "unit", 571, 1794335055060, "Arbre de vie éternelle : commerce", "unite",
        "Production : l'arbre est usé et prend 1 dégât, vous gagnez 4 commerce.", {
            phase: "production",
            use: true,
            degat: 1,
            gains: { commerce: 4 },
            libelle: "Arbre de vie : +4 commerce (usé, 1 dégât)",
        }),

    action("arbre-de-vie-eternelle-soin", "unit", 571, 0, "Arbre de vie éternelle : soin", "unite",
        "Science, avec 2 niveaux de connaissance génétique : use un scientifique, l'arbre récupère 1 de résistance.", {
            phase: "science",
            agent: SCIENTIFIQUE,
            degat: -1,
            // (« #regen(2) » : prérequis de 2 niveaux de connaissance génétique)
            calcul: outils => (outils.connaissance("gen") >= 2 ? {} : { sans: "il faut 2 niveaux de connaissance génétique" }),
            libelle: "Arbre de vie : récupérer 1 résistance (use un scientifique)",
        }),

    regle("mech-aerien-reparation", "unit", 171, 0, "Mech aérien : réparation (2)", "modifie",
        "Fiche d'une de vos unités endommagées du système : « Réparer »",
        "« #Rep(2) » : à la phase de production, une unité qui porte une réparation limitée répare jusqu'à ce nombre d'unités de son système par tour, elle-même comprise (1 ressource par dégât). Elle ne sert que sans dock dans le système : un dock répare tout, lui-même compris."),

    regle("exotrireme", "unit", 1018, 0, "Exotrirème", "nouveau",
        "Conflit, combat spatial : « ✹ Exotrirème détruit » sur vos vaisseaux militaires",
        "Quand un Exotrirème est détruit en combat spatial, la faction qui l'a détruit subit 1 dégât : elle choisit lequel de ses vaisseaux militaires du combat l'encaisse."),

    action("magmus", "unit", 598, 1795074271171, "Magmus", "unite",
        "Quand un vaisseau est détruit dans son système : 1 de recherche militaire (notée au journal de recherche).", {
            recherche: [["mil", 1]],
            libelle: "Un vaisseau détruit ici : +1 recherche militaire",
        }),

    action("etude-des-tempetes", "habilite", 441, 1794335055029, "Étude des tempêtes", "systeme",
        "Science : use un scientifique et active un système sans planète : 2 de recherche tempête (4 dans une nébuleuse).", {
            feuille: "storm",
            phase: "science",
            agent: SCIENTIFIQUE,
            activer: true,
            recherche: [["storm", 2]],
            visible: outils => !!outils.systeme && !(outils.systeme.elems || []).some(lien => lien?.id > 0),
            calcul: outils => (outils.systeme?.anomaly === "neb"
                ? { recherche: [["storm", 4]], libelle: "Étude des tempêtes : +4 recherche tempête (nébuleuse, use un scientifique)" }
                : {}),
            libelle: "Étude des tempêtes : +2 recherche tempête (use un scientifique)",
        }),

    action("etude-des-failles", "habilite", 815, 1795046343881, "Étude des failles", "systeme",
        "Science : use un scientifique et active une Faille : 2 de recherche de rupture.", {
            feuille: "rupt",
            phase: "science",
            agent: SCIENTIFIQUE,
            activer: true,
            recherche: [["rupt", 2]],
            visible: outils => outils.idSysteme === 811,
            libelle: "Étude des failles : +2 recherche de rupture (use un scientifique)",
        }),

    // ---- planètes et stations ----

    action("canon-reparer", "planet", 27, 1795190407282, "Canon : réparer", "planete",
        "Use un logisticien : vos unités du système et le canon sont réparés, 1 ressource par dégât.", {
            possede: true,
            agent: LOGISTICIEN,
            reparer: true,
            libelle: "Réparer (use un logisticien)",
            aussi: [30],
        }),

    action("canon-ancien-restaurer", "planet", 27, 1795190407282, "Canon ancien : restaurer", "planete",
        "Science (Reforger) : dépensez un scientifique et 2 fragments militaires, le canon devient un Canon restauré (l'unité est remplacée, sa carte arrive dans vos éléments actifs) et vous gagnez 2 points.", {
            // (Reforger : à la phase de science, un scientifique dépensé et les fragments de la carte)
            phase: "science",
            possede: true,
            agent: { motif: "scientifique", nom: "scientifique", depense: true },
            fragments: { mil: 2 },
            // (une seule fois : tant que le canon ancien est là — restauré, il est devenu une autre unité)
            visible: outils => outils.ici(513) > 0,
            remplace: [[513, 514]],
            donneCarte: 30,
            gains: { points: 2 },
            libelle: "Restaurer le canon (dépense un scientifique et 2 fragments militaires) : +2 points",
        }),

    action("station-de-combat-reparer", "planet", 56, 1795379428234, "Station de combat : réparer", "planete",
        "Production : use un logisticien, vos unités du système sont réparées, 1 ressource par dégât.", {
            phase: "production",
            possede: true,
            agent: LOGISTICIEN,
            reparer: true,
            libelle: "Réparer (use un logisticien)",
        }),

    action("mecatol-dissoudre-la-garde", "planet", 34, 1795376624389, "Mecatol Rex : dissoudre la Garde impériale", "planete",
        "Combat terrestre : dépensez 12 influence, les Gardes impériales de la planète sont retirées. (Les faveurs des autres factions, qui valent 4, se comptent à la main.)", {
            phase: "terrestre",
            nomPhase: "combat terrestre",
            cout: { inf: 12 },
            retire: 511,
            libelle: "Dissoudre la Garde impériale (12 influence)",
        }),

    action("starpoint", "planet", 71, 1795376185101, "Starpoint : faveur neutre", "planete",
        "Diplomatie : use un diplomate et dépensez 3 influence, vous obtenez une faveur neutre.", {
            phase: "diplomatie",
            possede: true,
            agent: DIPLOMATE,
            cout: { inf: 3 },
            faveurNeutre: 1,
            libelle: "Faveur neutre (use un diplomate, 3 influence)",
        }),

    action("relique-forger", "planet", 69, 1795190407284, "Relique : forger", "planete",
        "Science (Reforger) : dépensez un scientifique, 3 fragments et 1 fragment ancien, la carte de la Relique reforgée arrive dans vos éléments actifs.", {
            phase: "science",
            possede: true,
            // (Reforger : un scientifique est dépensé, en plus des fragments de la carte)
            agent: { motif: "scientifique", nom: "scientifique", depense: true },
            fragments: { ancien: 1, autres: 3 },
            // (une seule fois : la carte de la Relique reforgée n'existe en jeu qu'une fois forgée)
            visible: outils => !Object.values(outils.etat.composants).some(x => x.ref?.type === "planet" && x.ref.id === 131),
            donneCarte: 131,
            libelle: "Forger la relique (dépense un scientifique, 3 fragments et 1 fragment ancien)",
        }),

    action("elysium-scientifique", "planet", 75, 1795376185105, "Elysium : poser un scientifique", "planete",
        "Science : la planète est activée et un de vos scientifiques y est posé ; il y reste (il n'est jamais récupéré).", {
            phase: "science",
            possede: true,
            activer: true,
            agent: { motif: "scientifique", nom: "scientifique", pose: true },
            libelle: "Poser un scientifique sur Elysium (il y reste)",
        }),

    revenu("elysium", "planet", 75, 1795376185105, "Elysium", "ravit",
        "1 de recherche militaire, spatiale, génétique et sociale par scientifique posé sur Elysium.", {
            recherche: [["mil", 1], ["spa", 1], ["gen", 1], ["soc", 1]],
            calcul: (source, outils) => {
                const n = outils.agentsSur(source, "scientifique");

                return n
                    ? { recherche: [["mil", n], ["spa", n], ["gen", n], ["soc", n]] }
                    : { sans: "aucun scientifique sur Elysium" };
            },
        }),

    action("sr-42-recherche", "planet", 33, 1795379301954, "SR-42 : recherche", "planete",
        "La station est activée (une fois) : dépensez 3 ressources, 1 de recherche militaire, génétique et sociale.", {
            possede: true,
            activer: true,
            cout: { res: 3 },
            recherche: [["mil", 1], ["gen", 1], ["soc", 1]],
            libelle: "SR-42 : 3 ressources → recherche militaire, génétique et sociale",
        }),

    action("sr-124-votes", "planet", 47, 0, "SR-124 : votes", "planete",
        "Prévote : la station est activée et un politique utilisé ; vous gagnez 1 voix sur chaque loi du tour, dans la colonne de votre choix (une question par loi, onglet Décision). Il faut l'accord de la faction qui possède la station : l'outil ne le vérifie pas.", {
            phase: "prevote",
            nomPhase: "prévote",
            activer: true,
            agent: { motif: "politique", nom: "politique", depense: false },
            // (une question par loi du tour : dans quelle colonne va la voix ?)
            demandes: outils => (outils.lois().length ? outils.lois() : ["loi 1"])
                .map((nom, k) => ({ question: o => questionColonne(`SR-124 — loi ${k + 1}. ${nom}`, o), max: () => 1 })),
            calcul: (outils, xs) => (!xs ? {} : {
                // (ajustement de mes voix : compteur vote:<tour>:<loi>:<colonne>:<joueur>)
                actions: xs.map((col, k) => ({ type: "compteur", id: `vote:${outils.etat.tour}:${k + 1}:${col - 1}:${outils.moi}`, delta: 1 })),
                avis: "SR-124 : " + xs.map((col, k) => `loi ${k + 1}, « ${COLONNES_VOTE[col - 1]} »`).join(" ; ") + " — 1 voix chacune, ajoutée à votre colonne du décompte.",
            }),
            libelle: "SR-124 : 1 voix sur chaque loi du tour (active la station, use un politique)",
        }),

    action("anneau-arcturus-recherche", "planet", 784, 1795376624395, "Anneau Arcturus : recherche", "planete",
        "Science : la station est activée (une fois par tour) et un scientifique est utilisé : 1 de recherche sociale, 1 spatiale et 1 libre.", {
            phase: "science",
            possede: true,
            // (« #use et #use#scien » : la station elle-même est activée, en plus du scientifique)
            activer: true,
            agent: SCIENTIFIQUE,
            recherche: [["soc", 1], ["spa", 1], ["", 1]],
            libelle: "Recherche sociale, spatiale et libre (active la station, use un scientifique)",
        }),

    // Anneau monde : l'effet dépend de l'agent posé sur la station
    revenu("anneau-monde-logisticien", "planet", 45, 1795190407297, "Anneau monde (logisticien)", "ravit",
        "Avec un logisticien posé sur la station : 2 ressources et 2 commerce.", {
            calcul: (source, outils) => (outils.agentsSur(source, "logisticien") ? { gains: { res: 2, commerce: 2 } } : null),
        }),

    revenu("anneau-monde-scientifique", "planet", 45, 1795190407297, "Anneau monde (scientifique)", "science",
        "Avec un scientifique posé sur la station : 3 de recherche, dans la technologie de votre choix.", {
            calcul: (source, outils) => (outils.agentsSur(source, "scientifique") ? { recherche: [["", 3]] } : null),
        }),

    revenu("anneau-monde-negociant", "planet", 45, 1795190407297, "Anneau monde (négociant)", "production",
        "Avec un négociant posé sur la station : 2 frégates marchandes gratuites dans le système.", {
            calcul: (source, outils) => (outils.agentsSur(source, MOTIF_NEGOCIANT) ? { cree: { unite: "com", n: 2, ou: "espace" } } : null),
        }),

    action("anneau-monde-diplomate", "planet", 45, 1795190407297, "Anneau monde (diplomate) : faveur", "planete",
        "Avec un diplomate posé sur la station : dépensez 4 commerce, vous gagnez une de vos faveurs.", {
            possede: true,
            visible: outils => outils.agentIci("diplomate"),
            cout: { commerce: 4 },
            faveur: 1,
            libelle: "Anneau monde : une faveur (4 commerce)",
        }),

    action("anneau-monde-politique", "planet", 45, 1795190407297, "Anneau monde (politique) : lois", "planete",
        "Avec un politique posé sur la station : piochez 3 lois dans votre main (vous pouvez en ajouter une à l'agenda), une fois par tour.", {
            possede: true,
            visible: outils => outils.agentIci("politi"),
            pioche: { de: "pioche:Agenda", vers: "main", n: 3 },
            parTour: true,
            libelle: "Anneau monde : piocher 3 lois",
        }),

    regle("anneau-monde-amiral", "planet", 45, 1795190407297, "Anneau monde (amiral)", "modifie",
        "Fiche d'un système : « Produire ici »",
        "La production de l'Anneau monde (2 unités) demande un amiral posé sur la station."),

    regle("mecatol-rex", "planet", 34, 1795376624389, "Mecatol Rex", "modifie",
        "Fiche d'un système : « Prendre possession », « Revendiquer »",
        "Prendre possession de Mecatol Rex vous donne aussi la carte Mecatol Rex spéciale (#229)."),

    regle("haven", "planet", 1041, 1795376185105, "Haven", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Posséder Haven compte comme posséder une planète natale : elle donne la faveur du ravitaillement, même sans planète de votre système natal."),

    regle("arcturus", "planet", 783, 1794376304858, "Arcturus", "auto",
        "Glisser une unité sur Arcturus",
        "Poser des unités sur Arcturus sans 2 niveaux de connaissance spatiale (et 2 de connaissance génétique pour des unités biologiques) affiche un avertissement, sans rien empêcher."),

    regle("atlas", "planet", 41, 1795072921294, "Atlas", "auto",
        "En-tête : « Nouveau tour »",
        "À chaque nouveau tour (ravitaillement), un Ravageur neutre est ajouté sur Atlas."),

    regle("cormund-attaque", "planet", 49, 1795378097363, "Cormund : attaque", "auto",
        "En-tête : « Nouveau tour »",
        "À chaque nouveau tour (ravitaillement), chaque unité présente sur Cormund subit une attaque de force 4 : un dé à 10 faces par unité, 1 dégât sur 4 ou moins."),

    // ---- habilités (second lot) ----

    action("cle-de-l-empire", "habilite", 144, 1794335054817, "Clé de l'empire", "planete",
        "Production : dépensez un logisticien, les systèmes de défense de Mecatol Rex perdent leurs dégâts.", {
            surPlanete: 34,
            phase: "production",
            agent: { motif: MOTIF_LOGISTICIEN, nom: "logisticien", depense: true },
            soigne: "pds",
            libelle: "Clé de l'empire : réparer le système de défense (dépense un logisticien)",
        }),

    action("esclaves", "habilite", 157, 1795046343787, "Esclaves", "plateau",
        "À tout moment : dépensez un esclave (une infanterie capturée, dans vos éléments actifs), +1 ressource.", {
            depense: [{ esclaves: 1 }],
            gains: { res: 1 },
            libelle: "Esclaves : dépenser un esclave (+1 ressource)",
            // (technologie Exploitation de masse : 2 ressources)
            calcul: outils => (outils.aScript("exploitation-de-masse")
                ? { gains: { res: 2 }, libelle: "Esclaves : dépenser un esclave (+2 ressources, Exploitation de masse)" }
                : {}),
        }),

    action("camp-de-travail", "unit", 154, 1795074271167, "Camp de travail", "unite",
        "Production : le camp est usé et un esclave dépensé, +4 ressources.", {
            phase: "production",
            use: true,
            depense: [{ esclaves: 1 }],
            gains: { res: 4 },
            libelle: "Camp de travail : +4 ressources (usé, dépense un esclave)",
            // (technologie Exploitation de masse : 2 ressources de plus)
            calcul: outils => (outils.aScript("exploitation-de-masse")
                ? { gains: { res: 6 }, libelle: "Camp de travail : +6 ressources (usé, dépense un esclave ; Exploitation de masse)" }
                : {}),
        }),

    // Portail de repli : structure spatiale qui se construit à la phase de construction, mais par
    // l'action Reforger au lieu de Construire — un scientifique dépensé (pas de logisticien utilisé)
    // et 2 fragments spatiaux (pas de ressources) — et qui rapporte alors son point. C'est la
    // construction elle-même qui change (Interaction.jsx, payerProduction ; REFORGE_PORTAIL).
    regle("portail-de-repli-reforger", "unit", 155, 1795193214756, "Portail de repli : reforger", "modifie",
        "Phase de construction, case « Construction » : glisser le portail vers un système",
        "Le portail se reforge au lieu de se construire : aucun logisticien n'est utilisé, un scientifique et 2 fragments spatiaux sont dépensés, et vous gagnez 1 point."),

    regle("fierte", "habilite", 167, 1794335054829, "Fierté", "modifie",
        "Conflit : conflit d'accord (revendication) ; décompte des points",
        "Vous ne pouvez pas accepter la revendication d'une planète que vous possédez. Au décompte, vos points négatifs d'infamie sont doublés. (Points d'objectifs militaires doublés : à la main.)"),

    action("fin-de-la-tempete", "habilite", 443, 1795046343837, "Fin de la tempête", "carte",
        "Phase d'événement : la Tempête spatiale est retirée de la table, les stations météorologiques ne génèrent plus de recherche tempête, chaque faction marque 2 points par niveau de connaissance de tempête, et celle qui en a le plus 3 de plus.", {
            phase: "[ée]v[ée]nement",
            nomPhase: "événement",
            special: atelier => {

                if (atelier.etat.compteurs["tempete:finie"]) {
                    return { actions: [], sans: "la fin de la tempête est déjà appliquée" };
                }

                const niveaux = atelier.joueurs.map(j => ({ u: j.userId, n: atelier.connaissance(j.userId, "storm") }));
                const premiers = lesPremiers(niveaux);
                const gain = x => 2 * x.n + (premiers.length === 1 && premiers[0].u === x.u ? 3 : 0);

                return {
                    actions: [
                        ...atelier.cartes("habilite", 442, "general:table").map(c => ({ type: "supprimer", c: c.id })),
                        { type: "compteur", id: "tempete:finie", valeur: 1 },
                        ...niveaux.flatMap(x => atelier.points(x.u, gain(x))),
                    ],
                    avis: "Fin de la tempête : " + niveaux.map(x => `${atelier.nomDe(x.u)} +${gain(x)} point(s)`).join(", ") + ".",
                };
            },
            libelle: "Appliquer la fin de la tempête",
        }),

    regle("presence-de-cache", "habilite", 491, 1795068317107, "Présence de cache", "modifie",
        "Espace : explorer (Ctrl + clic sur un emplacement vide)",
        "Un système qui vient d'être exploré reçoit un fragment de relique tiré du sac."),

    action("diplomatie-pirate", "habilite", 522, 1795046343858, "Diplomatie pirate", "bandeau",
        "Diplomatie, quand des vaisseaux pirates sont sur la carte : use un diplomate et dépensez 3 commerce, l'alliance Pacte pirate arrive dans vos éléments actifs.", {
            pourTous: true,
            phase: "diplomatie",
            agent: DIPLOMATE,
            cout: { commerce: 3 },
            donne: [{ type: "Promesse", id: 458 }],
            visible: outils => /diplomatie/i.test(outils.phase) && outils.surLaCarte(407),
            parTour: true,
            libelle: "Diplomatie pirate : Pacte pirate (use un diplomate, 3 commerce)",
        }),

    {
        ...regle("rebellion-en-cours", "habilite", 558, 1795046343860, "Rébellion en cours", "auto",
            "En-tête : « Nouveau tour »",
            "À chaque nouveau tour, 1D3 rebelles de plus sur chaque planète possédée par un joueur où il y en a déjà."),
        pourTous: true,
    },

    regle("milice-au-coeur-du-pouvoir", "habilite", 725, 1795046343865, "Milice au cœur du pouvoir", "auto",
        "En-tête : « Nouveau tour » (habilité posée sur la table)",
        "À partir du tour 8, à chaque nouveau tour : 1D10 miliciens sont posés sur Mecatol Rex (2D10 si la loi « Ouverture bureau des mercenaires » est en jeu)."),

    regle("sans-influence", "habilite", 895, 1794336276050, "Sans influence", "modifie",
        "Recrutement, propositions, boutons qui coûtent de l'influence ; ravitaillement automatique",
        "Ce qui se paie en influence se paie en ressources ; l'entretien ne rapporte pas d'influence."),

    regle("infiltration", "habilite", 896, 1795046343894, "Infiltration", "auto",
        "Conflit : « Terminer le combat » un vaisseau détruit",
        "Détruire un vaisseau vous donne un token Infiltration (dans vos éléments actifs, aux couleurs de la faction touchée)."),

    action("infiltration-recherche", "habilite", 896, 1795046343894, "Infiltration : recherche", "plateau",
        "Science : use un scientifique et 2 infiltrations (usées jusqu'au nouveau tour), 4 de recherche d'une technologie que possède la faction infiltrée.", {
            phase: "science",
            agent: SCIENTIFIQUE,
            depense: [{ type: "token", id: 882, n: 2, nom: "infiltration", use: true }],
            recherche: [["", 4]],
            libelle: "Infiltration : +4 recherche (use un scientifique, 2 infiltrations)",
        }),

    // ---- mercenaires : boutons de la fiche de leur carte (dans mes éléments actifs) ; la
    //      carte est usée jusqu'au nouveau tour ----

    action("doctor-carrina", "mercenaire", 285, 1795076851665, "Doctor Carrina", "carte",
        "Science : son cube part dans les agents usés, une de vos planètes non activées est activée (choix dans l'onglet Décision), 1 de recherche sociale, militaire, génétique et spatiale.", {
            phase: "science",
            use: true,
            recherche: [["soc", 1], ["mil", 1], ["gen", 1], ["spa", 1]],
            // (« #use, activez une planète » : laquelle ?)
            demande: {
                question: outils => "Doctor Carrina : quelle planète activer ?\n" +
                    outils.planetesActivables().map((p, k) => `${k + 1} = ${p.nom}`).join("\n"),
                max: outils => Math.max(1, outils.planetesActivables().length),
            },
            calcul: (outils, x) => {

                const planetes = outils.planetesActivables();

                if (x === undefined) {
                    return planetes.length ? {} : { sans: "aucune de vos planètes posées sur la carte n'est activable (toutes activées, ou aucune possédée)" };
                }

                return planetes[x - 1]
                    ? { actions: [planetes[x - 1].action], avis: `Doctor Carrina : ${planetes[x - 1].nom} est activée.` }
                    : { sans: "planète introuvable" };
            },
            libelle: "Doctor Carrina : activer une planète → recherche sociale, militaire, génétique et spatiale",
        }),

    regle("doctor-carrina-prerequis", "mercenaire", 285, 1795076851665, "Doctor Carrina : prérequis", "modifie",
        "Onglet Technologie : une case de recherche cochée sans le niveau de connaissance voulu",
        "Quand il vous manque un seul niveau de connaissance pour rechercher une technologie et que son cube est sur sa carte : l'onglet Décision propose de l'utiliser pour ignorer ce niveau — son cube part dans les agents usés, et la recherche de cette technologie n'est plus arrêtée à ce tour."),

    action("xuange", "mercenaire", 286, 1795076851666, "Xuange", "carte",
        "Science : son cube part dans les agents usés, dépensez 2X influence, X de recherche sociale.", {
            phase: "science",
            use: true,
            recherche: [["soc", 1]],
            demande: {
                question: "Xuange : combien de recherche sociale (2 influence chacune) ?",
                max: outils => Math.max(1, Math.floor(outils.compte("inf") / 2)),
            },
            calcul: (outils, x = 1) => ({ cout: { inf: 2 * x }, recherche: [["soc", x]] }),
            libelle: "Xuange : 2X influence → X recherche sociale",
        }),

    action("aktaran", "mercenaire", 287, 1795076851667, "Aktaran", "carte",
        "Diplomatie, lors d'une livraison : son cube part dans les agents usés, 4 de recherche d'une technologie que la cible possède.", {
            phase: "diplomatie",
            use: true,
            recherche: [["", 4]],
            libelle: "Aktaran : +4 recherche (lors d'une livraison)",
        }),

    action("yvin-korduul", "mercenaire", 288, 1795076851668, "Yvin Korduul", "carte",
        "Diplomatie : son cube part dans les agents usés, dépensez 5 influence, vous produisez une de vos faveurs.", {
            phase: "diplomatie",
            use: true,
            cout: { inf: 5 },
            faveur: 1,
            libelle: "Yvin Korduul : une faveur (5 influence)",
        }),

    // (ex-« Sai Seravus », astrophysicienne : l'identifiant du script est gardé)
    action("sai-seravus", "mercenaire", 289, 1795076851669, "Oriane Tesh", "carte",
        "Science : son cube part dans les agents usés, 1 de recherche spatiale par système à anomalie où vous avez une unité.", {
            phase: "science",
            use: true,
            recherche: [["spa", 1]],
            calcul: outils => (outils.anomalies() > 0
                ? { recherche: [["spa", outils.anomalies()]] }
                : { recherche: [], sans: "vous n'avez d'unité dans aucun système à anomalie" }),
            libelle: "Oriane Tesh : recherche spatiale (anomalies où vous avez une unité)",
        }),

    regle("ahk-ravin", "mercenaire", 291, 1795076851671, "Ahk Ravin", "modifie",
        "Fiche d'un système : « Fouiller la ruine »",
        "Quand Ahk Ravin est le scientifique d'une fouille (son cube posé sur le type Scientifique) : une fenêtre propose de dépenser 3 ressources pour 2 fragments au lieu d'un."),

    action("artuno", "mercenaire", 297, 1795076851676, "Artuno", "carte",
        "Diplomatie : son cube part dans les agents usés, 1 commerce par alliance en cours chez vous.", {
            phase: "diplomatie",
            use: true,
            calcul: outils => (outils.alliances() > 0
                ? { gains: { commerce: outils.alliances() } }
                : { sans: "vous n'avez aucune alliance" }),
            libelle: "Artuno : 1 commerce par alliance",
        }),

    action("ta-zern", "mercenaire", 302, 1795076851680, "Ta Zern", "carte",
        "Science : son cube part dans les agents usés, 1 de recherche génétique par planète que vous possédez.", {
            phase: "science",
            use: true,
            recherche: [["gen", 1]],
            calcul: outils => (outils.planetesPossedees() > 0
                ? { recherche: [["gen", outils.planetesPossedees()]] }
                : { recherche: [], sans: "vous ne possédez aucune planète" }),
            libelle: "Ta Zern : recherche génétique (1 par planète possédée)",
        }),

    action("sal-gavda", "mercenaire", 349, 1795076851717, "Sal Gavda", "carte",
        "Diplomatie : son cube part dans les agents usés, 1 commerce par faction (vous comprise) qui possède une planète dans un système où vous avez une unité.", {
            phase: "diplomatie",
            use: true,
            calcul: outils => (outils.factionsVoisines() > 0
                ? { gains: { commerce: outils.factionsVoisines() } }
                : { sans: "aucune faction ne possède de planète dans un système où vous avez une unité" }),
            libelle: "Sal Gavda : 1 commerce par faction voisine",
        }),

    action("agnlan-oln", "mercenaire", 353, 1795076851721, "Agnlan Oln", "carte",
        "Science : son cube part dans les agents usés, un plan de relique est pioché dans votre main.", {
            phase: "science",
            use: true,
            pioche: { de: "pioche:relique", vers: "main" },
            libelle: "Agnlan Oln : piocher un plan de relique",
        }),

    regle("agnlan-oln-relique", "mercenaire", 353, 1795076851721, "Agnlan Oln : fabriquer une relique", "nouveau",
        "Fiche d'une relique de votre main, science : « Construire avec Agnlan Oln »",
        "Agnlan Oln est dépensé (sa carte est retirée du jeu) : la relique se fabrique en ignorant 2 fragments — ceux qui vous manquent d'abord, sinon 2 de ceux qu'elle demande sont gardés. Le scientifique est dépensé comme d'habitude."),

    action("shipmonger-zsknck", "mercenaire", 358, 1795076851725, "Shipmonger Zsknck", "unite",
        "Production : le cube du mercenaire part dans les agents usés, un de vos vaisseaux non biologiques est réparé gratuitement (bouton de la fiche du vaisseau).", {
            phase: "production",
            use: true,
            cible: (contenu, c) => aMot(contenu, "ship") && !aMot(contenu, "bio") &&
                Number(c?.marques?.degat) > 0,
            degat: -99,
            libelle: "Shipmonger Zsknck : réparer ce vaisseau gratuitement",
        }),

    // ---- mercenaires de combat : un bouton chacun dans le cadre du combat (Combat.jsx) ----

    regle("so-ata", "mercenaire", 284, 1795076851665, "So Ata", "nouveau",
        "Conflit : combat spatial",
        "Deux boutons : « désigner un vaisseau » au début du combat (la restriction d'engagement est à respecter à la main) ; « capturer un vaisseau détruit » à la fin — il va dans vos éléments actifs."),

    regle("claire-gibson", "mercenaire", 281, 1795076851662, "Claire Gibson", "nouveau",
        "Conflit : combat terrestre",
        "Son cube part dans les agents usés : vos infanteries ont +1 pour ce combat."),

    regle("sharsiss", "mercenaire", 299, 1795076851677, "Sharsiss", "nouveau",
        "Conflit : combat spatial",
        "Son cube part dans les agents usés : autant d'unités d'une autre faction que vous en avez dans ce combat ont +1 (un bouton par faction)."),

    regle("skarvald", "mercenaire", 350, 1795076851718, "Skarvald", "nouveau",
        "Conflit : bombardement",
        "Son cube part dans les agents usés : 3 dés, chaque 5 ou moins vole 1 commerce à la faction qui possède la planète."),

    regle("henry-storcher", "mercenaire", 356, 1795076851723, "Henry Storcher", "nouveau",
        "Conflit : combat spatial",
        "Son cube part dans les agents usés : 1 commerce par vaisseau que vous avez perdu dans ce combat."),

    regle("jace-x", "mercenaire", 357, 1795076851724, "Jace X", "nouveau",
        "Conflit : combat terrestre",
        "Son cube part dans les agents usés : vos unités terrestres ont +1 pour ce combat."),

    action("mirik-aun-sissiri", "mercenaire", 355, 1795076851722, "Mirik Aun Sissiri", "systeme",
        "Mandat : son cube part dans les agents usés, vous avez +1 au combat spatial dans ce système jusqu'à la prochaine phase de mandat.", {
            phase: "mandat",
            use: true,
            visible: outils => /mandat/i.test(outils.phase),
            special: atelier => ({
                actions: [{ type: "compteur", id: `joueur:${atelier.moi}:mirik`, valeur: atelier.numero + 1 }],
                avis: "Mirik Aun Sissiri : +1 au combat spatial dans ce système jusqu'à la prochaine phase de mandat.",
            }),
            libelle: "Mirik Aun Sissiri : +1 au combat spatial dans ce système",
        }),

    // --------------------------------------------------------
    // LOT « FACILES ET MOYENS » (11 novembre) : technologies, habilités des
    // événements et des neutres, unités
    // --------------------------------------------------------

    // ---- technologies : effets automatiques (Combat.jsx) ----

    effet("adaptation-de-la-visee", 400, 1794343420993, "Adaptation de la visée", "auto",
        "Conflit : malus de la tempête",
        "Le −1 de la Tempête spatiale ne s'applique pas à vos unités ; une fois la tempête finie, le Générateur de tempête ne vous touche plus."),

    effet("energie-de-la-faille", 818, 1795046343882, "Énergie de la faille", "auto",
        "Conflit : combat spatial",
        "Vos vaisseaux ont +1 au combat."),

    effet("soldats-dephases", 819, 1795046343883, "Soldats déphasés", "auto",
        "Conflit : combat terrestre",
        "Vos forces terrestres ont +1 au combat."),

    // ---- technologies : revenus du ravitaillement (Revenus.jsx) ----

    revenu("exploitation-des-tempetes", "tech", 448, 1795046343840, "Exploitation des tempêtes", "ravit",
        "+3 ressources tant que la tempête est active.", {
            calcul: (source, outils) => (outils.aScript("tempete-spatiale")
                ? { gains: { res: 3 } }
                : { sans: "la tempête n'est pas active" }),
        }),

    revenu("reseau", "tech", 787, 1795068317110, "Réseau", "ravit",
        "+2 influence par satellite : stations que vous possédez et unités satellites posées sur la carte.", {
            calcul: (source, outils) => {
                const n = outils.stations() + outils.unitesAvecMot(/^sat+el+ite$/i);
                return n > 0 ? { gains: { inf: 2 * n } } : { sans: "aucun satellite" };
            },
        }),

    revenu("relais-d-influence", "tech", 807, 1795046343880, "Relais d'influence", "ravit",
        "+2 influence par station que vous possédez.", {
            calcul: (source, outils) => (outils.stations() > 0
                ? { gains: { inf: 2 * outils.stations() } }
                : { sans: "aucune station" }),
        }),

    // ---- technologies : boutons ----

    action("vaccin", "tech", 402, 1795072921275, "Vaccin", "plateau",
        "Une seule fois : +4 points, et une faveur neutre si personne n'avait le vaccin avant ce tour.", {
            gains: { points: 4 },
            visible: outils => !Number(outils.etat.compteurs[`joueur:${outils.moi}:vaccin`]),
            calcul: outils => ({ libelle: `Vaccin : +4 points${vaccin(outils.etat).premier ? " et une faveur neutre" : ""}` }),
            special: atelier => {
                const { decouvert, premier } = vaccin(atelier.etat);

                return {
                    actions: [
                        { type: "compteur", id: `joueur:${atelier.moi}:vaccin`, valeur: 1 },
                        !decouvert && { type: "compteur", id: "general:vaccin", valeur: atelier.etat.tour },
                        // (faveur neutre : jeton sans propriétaire — miseEnPlace.js, FAVEUR)
                        premier && { type: "creer", jeton: "faveur", zone: `joueur:${atelier.moi}:faveurs` },
                    ].filter(Boolean),
                };
            },
            libelle: "Vaccin : +4 points",
        }),

    action("generateur-de-tempete", "tech", 447, 1795072921267, "Générateur de tempête", "systeme",
        "Combat spatial : la technologie et un scientifique sont usés, 3 ressources — tous les vaisseaux du système ont −1 au combat ce tour (la tempête finie, les factions qui ont Adaptation de la visée y échappent). La flotte ciblée (−1 de plus) : à la main.", {
            phase: "combat spatial",
            use: true,
            agent: SCIENTIFIQUE,
            cout: { res: 3 },
            special: atelier => ({
                actions: [{ type: "compteur", id: `general:tempete:${atelier.numero}`, valeur: atelier.etat.tour }],
                avis: "Générateur de tempête : −1 à tous les vaisseaux de ce système ce tour (écran de combat). La flotte ciblée a −1 de plus : à saisir à la main.",
            }),
            libelle: "Générateur de tempête (use la technologie et un scientifique, 3 ressources)",
        }),

    action("exploitation-des-tempetes-nebuleuse", "tech", 448, 1795046343840, "Exploitation des tempêtes : nébuleuse", "systeme",
        "Science : use un scientifique et active une nébuleuse que vous contrôlez (conflit de contrôle si d'autres peuvent s'y opposer) — +4 ressources.", {
            phase: "science",
            controle: "systeme",
            agent: SCIENTIFIQUE,
            activer: true,
            gains: { res: 4 },
            visible: dansUneNebuleuse,
            libelle: "Exploitation des tempêtes : +4 ressources (use un scientifique, active la nébuleuse)",
        }),

    action("stimulant", "tech", 791, 1795068317111, "Stimulant", "plateau",
        "La technologie est usée : un de vos agents usés (mercenaire compris) redevient disponible.", {
            use: true,
            ...choixDansListe({
                titre: "Stimulant : quel agent usé rafraîchir ?",
                options: outils => outils.agentsUses(),
                libelle: nomAgentUse,
                vide: "aucun agent usé",
                invalide: "numéro inconnu",
                videAvantTout: true,
                appliquer: (outils, agent) => {

                    // (cube noir d'un mercenaire : il retourne sur sa carte)
                    const carte = !agent.ref && agent.marques?.carte ? outils.etat.composants[agent.marques.carte] : null;

                    return {
                        actions: carte
                            ? [{ type: "deplacer", c: agent.id, sur: carte.id }, { type: "marquer", c: agent.id, marque: "carte", valeur: null }]
                            : [{ type: "deplacer", c: agent.id, vers: `joueur:${outils.moi}:agents` }],
                    };
                },
            }),
            libelle: "Stimulant : rafraîchir un agent usé (use la technologie)",
        }),

    action("anticipation", "tech", 805, 1794343421179, "Anticipation", "plateau",
        "Début du combat spatial : la technologie et un scientifique sont usés, vous effectuez un déplacement avec Memoria (à la main).", {
            phase: "combat spatial",
            use: true,
            agent: SCIENTIFIQUE,
            visible: outils => [766, 767, 768, 769].some(id => outils.mienneSurLaCarte(id)),
            avis: "Anticipation : déplacez Memoria à la main.",
            libelle: "Anticipation : déplacement de Memoria (use la technologie et un scientifique)",
        }),

    action("opportunite-predite", "tech", 806, 1795072921271, "Opportunité prédite", "plateau",
        "Recrutement : un agent de base de votre choix est ajouté sur la case de recrutement 4 (une fois par tour).", {
            phase: "recrutement",
            parTour: true,
            ...choixDansListe({
                titre: "Opportunité prédite : quel agent de base ajouter sur la case de recrutement 4 ?",
                options: outils => outils.etat.references?.agentsBase || [],
                libelle: (outils, id) => outils.nom({ type: "agent", id }),
                vide: "les agents de base de la partie sont inconnus",
                invalide: "numéro inconnu",
                videAvantTout: true,
                appliquer: (outils, id) => {

                    // (un agent de ce type tiré du sac, sinon un nouveau)
                    const duSac = (outils.index.parZone.get("pioche:sac") || []).find(a => a.ref?.type === "agent" && a.ref.id === id);

                    return {
                        actions: [duSac
                            ? { type: "deplacer", c: duSac.id, vers: "general:boite:4" }
                            : { type: "creer", ref: { type: "agent", id }, zone: "general:boite:4" }],
                    };
                },
            }),
            libelle: "Opportunité prédite : un agent de base sur la case de recrutement 4",
        }),

    action("ouverture-de-faille", "tech", 816, 1794343421182, "Ouverture de faille", "systeme",
        "La technologie et un scientifique sont usés : un jeton trou de ver oméga est posé dans ce système.", {
            use: true,
            agent: SCIENTIFIQUE,
            special: atelier => ({ actions: [{ type: "creer", ref: { type: "token", id: 830 }, zone: "hex:" + atelier.numero }] }),
            libelle: "Ouverture de faille : jeton trou de ver oméga ici (use la technologie et un scientifique)",
        }),

    action("communication-faille", "tech", 817, 1794343421183, "Communication avec les êtres de la faille", "systeme",
        "Use un diplomate et dépensez 4 influence : une Nef de la rupture de ce système passe sous votre contrôle.", {
            agent: DIPLOMATE,
            cout: { inf: 4 },
            visible: outils => nefsIci(outils.etat, outils.numero, outils.moi).length > 0,
            special: atelier => {
                const nef = nefsIci(atelier.etat, atelier.numero, atelier.moi)[0];

                return { actions: nef ? [{ type: "marquer", c: nef.id, marque: "possession", valeur: atelier.moi }] : [] };
            },
            libelle: "Prendre le contrôle d'une Nef de la rupture (use un diplomate, 4 influence)",
        }),

    action("piraterie-informatique-res", "tech", 857, 1794343421187, "Piraterie informatique : ressources", "plateau",
        "Vos commerces valent 2 ressources : le commerce choisi est converti.", {
            demande: { question: "Piraterie informatique : combien de commerce convertir, à 2 ressources chacun ?", max: outils => outils.compte("commerce") },
            calcul: (outils, x) => conversion(outils, x, "res"),
            libelle: "Piraterie informatique : commerce → 2 ressources chacun",
        }),

    action("piraterie-informatique-inf", "tech", 857, 1794343421187, "Piraterie informatique : influence", "plateau",
        "Vos commerces valent 2 influence : le commerce choisi est converti.", {
            demande: { question: "Piraterie informatique : combien de commerce convertir, à 2 influence chacun ?", max: outils => outils.compte("commerce") },
            calcul: (outils, x) => conversion(outils, x, "inf"),
            libelle: "Piraterie informatique : commerce → 2 influence chacun",
        }),

    // ---- planète : Mecatol Rex (carte spéciale) ----

    action("mecatol-rex-politique", "planet", 229, 1795190407297, "Mecatol Rex : obtenir un politique", "carte",
        "Recrutement : dépensez un de vos agents disponibles, vous obtenez un politique.", {
            phase: "recrutement",
            visible: outils => outils.aCarte("planet", 229),
            ...choixDansListe({
                titre: "Mecatol Rex : quel agent dépenser pour obtenir un politique ?",
                options: mesAgentsDisponibles,
                libelle: (outils, a) => outils.nom(a.ref),
                vide: "aucun agent disponible",
                invalide: "numéro inconnu",
                videAvantTout: true,
                appliquer: (outils, agent) => {

                    // Le politique : tiré du sac s'il y en a un, sinon un nouveau
                    const base = outils.etat.references?.agentsBase || [];
                    const idPolitique = base.find(id => /politi/i.test(outils.nom({ type: "agent", id }))) ?? 6;
                    const duSac = (outils.index.parZone.get("pioche:sac") || []).find(a => a.ref?.type === "agent" && a.ref.id === idPolitique);

                    return {
                        agentDepense: agent,
                        actions: [duSac
                            ? { type: "deplacer", c: duSac.id, vers: `joueur:${outils.moi}:agents`, proprio: outils.moi }
                            : { type: "creer", ref: { type: "agent", id: idPolitique }, zone: `joueur:${outils.moi}:agents`, proprio: outils.moi }],
                    };
                },
            }),
            libelle: "Mecatol Rex : dépenser un agent, obtenir un politique",
        }),

    // ---- habilités d'événements et de factions neutres (valables pour toute la table) ----

    action("armer-les-rebelles", "habilite", 563, 1795046343862, "Armer les rebelles", "plateau",
        "Combat terrestre, quand des Rebelles engagent (vos unités adjacentes : non vérifié) : dépensez 3 ressources, les Rebelles ont +1 au combat ce tour.", {
            pourTous: true,
            phase: "combat terrestre",
            cout: { res: 3 },
            visible: outils => outils.surLaCarte(557),
            calcul: outils => (Number(outils.etat.compteurs["general:armer-rebelles"]) === outils.etat.tour
                ? { sans: "les Rebelles sont déjà armés ce tour" }
                : {}),
            special: atelier => ({ actions: [{ type: "compteur", id: "general:armer-rebelles", valeur: atelier.etat.tour }] }),
            libelle: "Armer les rebelles : +1 aux Rebelles ce tour (3 ressources)",
        }),

    action("offre-d-asile", "habilite", 453, 1795046343843, "Offre d'asile", "planete",
        "Phase d'événement : une de vos planètes passe aux Réfugiés — vous gagnez autant de points que son influence, 6 Milices et un Entrepôt d'aide y sont posés, l'alliance Tuteur des réfugiés arrive chez vous.", {
            pourTous: true,
            surPlanete: true,
            phase: "v[ée]nement",
            nomPhase: "événement",
            possede: true,
            parTour: true,
            visible: outils => outils.possede &&
                (outils.index.parZone.get(`general:evenement:${outils.etat.tour}`) || []).some(x => x.ref?.type === "habilite" && x.ref.id === 453),
            calcul: outils => ({
                gains: { points: Number(outils.contenu?.inf) || 0 },
                libelle: `Offre d'asile : la planète aux Réfugiés, +${Number(outils.contenu?.inf) || 0} point(s)`,
            }),
            donne: [{ type: "Promesse", id: 454 }],
            special: atelier => {
                const carte = Object.values(atelier.etat.composants).find(x => !x.cache && x.ref?.type === "planet" &&
                    x.ref.id === atelier.idElement && x.zone === `joueur:${atelier.moi}:actif`);

                return {
                    actions: [
                        // (la planète n'est plus à personne : la planète des Réfugiés est celle de l'Entrepôt d'aide)
                        carte && { type: "deplacer", c: carte.id, vers: "horsJeu" },
                        ...Array.from({ length: 6 }, () => ({ type: "creer", ref: { type: "unit", id: 835 }, zone: atelier.zone })),
                        { type: "creer", ref: { type: "unit", id: 836 }, zone: atelier.zone },
                    ].filter(Boolean),
                };
            },
            libelle: "Offre d'asile : donner la planète aux Réfugiés",
        }),

    action("refugies", "habilite", 837, 1795046343885, "Réfugiés", "bandeau",
        "Ravitaillement : 2 Milices sont ajoutées sur chaque planète des Réfugiés (là où est un Entrepôt d'aide) — une fois par tour, pour toute la table.", {
            pourTous: true,
            phase: "ravitaillement",
            visible: outils => outils.surLaCarte(836),
            calcul: outils => (Number(outils.etat.compteurs["general:refugies"]) === outils.etat.tour ? { sans: "déjà fait ce tour" } : {}),
            special: atelier => ({
                actions: [
                    ...planetesDesRefugies(atelier.etat).flatMap(z => [0, 1].map(() => ({ type: "creer", ref: { type: "unit", id: 835 }, zone: z }))),
                    { type: "compteur", id: "general:refugies", valeur: atelier.etat.tour },
                ],
            }),
            libelle: "Réfugiés : 2 Milices sur chaque planète des Réfugiés",
        }),

    action("entrainer-les-milices", "habilite", 838, 1795072921277, "Entraîner les milices", "plateau",
        "Une fois par partie, détenteur de Tuteur des réfugiés : dépensez 4 ressources et posez un de vos amiraux sur cette alliance — les Milices ont +2 au combat.", {
            pourTous: true,
            cout: { res: 4 },
            visible: outils => outils.aCarte("Promesse", 454) && !Number(outils.etat.compteurs["general:milices-entrainees"]),
            special: atelier => {
                const tuteur = Object.values(atelier.etat.composants).find(x => !x.cache && x.ref?.type === "Promesse" && x.ref.id === 454 &&
                    new RegExp(`^joueur:${atelier.moi}:(actif|tour:\\d+)$`).test(x.zone || ""));
                const amiral = (atelier.index.parZone.get(`joueur:${atelier.moi}:agents`) || [])
                    .find(x => !x.cache && x.ref?.type === "agent" && /amiral/i.test(atelier.nom(x.ref)));

                return {
                    actions: [
                        amiral && tuteur && { type: "deplacer", c: amiral.id, sur: tuteur.id, proprio: atelier.moi },
                        { type: "compteur", id: "general:milices-entrainees", valeur: 1 },
                    ].filter(Boolean),
                    sans: amiral ? null : "vous n'avez pas d'amiral disponible (aucun ne sera posé : pas de bonus)",
                    avis: "Entraîner les milices : les Milices ont +2 au combat (un amiral est posé sur Tuteur des réfugiés).",
                };
            },
            libelle: "Entraîner les milices (4 ressources, un amiral posé)",
        }),

    action("enrolement-des-milices", "habilite", 839, 1794046867032, "Enrôlement des milices", "planete",
        "Détenteur de Tuteur des réfugiés : activez une planète des Réfugiés et usez un diplomate — 3 Milices de la planète passent sous votre contrôle.", {
            pourTous: true,
            surPlanete: true,
            agent: DIPLOMATE,
            activer: true,
            visible: outils => outils.ici(836) > 0 && outils.aCarte("Promesse", 454),
            special: atelier => {
                const milices = (atelier.index.parZone.get(atelier.zone) || []).filter(x => !x.cache && x.ref?.type === "unit" &&
                    x.ref.id === 835 && campDe(x) !== atelier.moi).slice(0, 3);

                return {
                    actions: milices.map(x => ({ type: "marquer", c: x.id, marque: "possession", valeur: atelier.moi })),
                    sans: milices.length ? null : "aucune Milice à enrôler sur cette planète",
                };
            },
            libelle: "Enrôlement des milices : 3 Milices (use un diplomate, active la planète)",
        }),

    // ---- unités ----

    action("destroyeur-double-attaque", "unit", 163, 1794339608720, "Destroyeur : deux attaques", "unite",
        "Combat spatial : dépensez 1 influence, ce destroyeur effectue deux attaques au lieu d'une ce tour (écran de combat : deux fois plus de dés).", {
            phase: "combat spatial",
            cout: { inf: 1 },
            calcul: outils => (outils.c ? { actions: [{ type: "marquer", c: outils.c.id, marque: "deuxAttaques", valeur: outils.etat.tour }] } : {}),
            libelle: "Deux attaques (1 influence)",
        }),

    regle("jns-hylarim-annuler", "unit", 172, 1795046343791, "J.N.S. Hylarim : annuler une touche", "nouveau",
        "Conflit, combat spatial : « Annuler 1 » sur une unité qui doit encaisser",
        "Une autre de vos unités du système doit encaisser un dégât : 1 ressource, il est annulé (le dé est attribué sans dégât)."),

    regle("bouclier-mobile-annuler", "unit", 175, 1795046343792, "Bouclier mobile : annuler une touche", "nouveau",
        "Conflit, combat terrestre : « Annuler 1 » sur une unité qui doit encaisser",
        "Une autre de vos unités de la planète doit encaisser un dégât : 1 ressource, il est annulé (le dé est attribué sans dégât)."),

    regle("systeme-de-defense-annuler", "unit", 177, 1795346039879, "Système de défense : annuler une touche", "nouveau",
        "Conflit, bombardement et raid : « Annuler 1 » sur une unité qui doit encaisser",
        "Une autre de vos unités de la planète doit encaisser un dégât : 1 ressource, il est annulé (le dé est attribué sans dégât)."),

    // ---- mécaniques de combat (Combat.jsx) ----

    regle("raid", "unit", 152, 1795046343784, "Raid", "nouveau",
        "Fiche d'un système, à côté d'une planète : « Raid » ; conflit : combat « Raid »",
        "Bombardement spécial (#raid) des unités de l'espace du système, après les bombardements : seules les infanteries sont des cibles (s'il y a d'autres unités militaires sur la planète, il faut cibler) ; chaque infanterie touchée est capturée et part dans les éléments actifs du raideur. Sans infanterie, une réussite capture un esclave de qui possède la planète. Les effets des bombardements s'appliquent.",
        [153, 156]),

    regle("salai-sai-corian", "unit", 148, 1795046343782, "Salai Sai Corian", "auto",
        "Conflit, combat spatial",
        "+1 au combat par vaisseau adverse que visent ses engagements."),

    // ----- Stock d'achat (Achats.jsx) : éléments qui vendent contre une livraison commerciale -----

    regle("station-de-mercenaire-achat", "planet", 38, 1795372821163, "Station de mercenaire : achat", "nouveau",
        "Fiche d'un système : « Achats — Station de mercenaire », « Acheter »",
        "Une livraison commerciale peut être versée à votre stock d'achat sur la station (fiche de l'unité qui livre : destination « mon stock d'achat »). " +
        "Diplomatie : « Acheter » dépense 3 de ce stock, la faction qui possède la station gagne 1 commerce ; le mercenaire acheté se prend à la main."),

    regle("universite-polytechnique-achat", "planet", 508, 1795190407296, "Université polytechnique : achat", "nouveau",
        "Fiche d'un système : « Achats — Université polytechnique », « Acheter »",
        "Stock d'achat rempli par des livraisons. Diplomatie : « Acheter » dépense 3 de ce stock, la faction possédante gagne 1 commerce ; l'agent acheté se prend à la main."),

    regle("centre-d-espionnage-industriel-achat", "planet", 1250, 1795348043309, "Centre d'espionnage industriel : achat", "nouveau",
        "Fiche d'un système : « Achats — Centre d'espionnage industriel », « Acheter »",
        "Stock d'achat rempli par des livraisons. Diplomatie : « Acheter » dépense 3 de ce stock et note 4 de recherche, à cocher sur une technologie qu'une autre faction possède et que vous n'avez pas."),

    regle("vente-au-bazaar-achat", "habilite", 36, 1794335054750, "Vente au Bazaar : achat", "nouveau",
        "Fiche d'un système où est posé un Bazaar : « Achats — Bazaar », « Acheter »",
        "Stock d'achat rempli par des livraisons faites sur le Bazaar (le marqueur de stock est posé sur l'unité). Diplomatie : « Acheter » dépense 3 de ce stock ; l'objet acheté se prend à la main."),

    regle("stations-scientifiques", "habilite", 1260, 1795348043361, "Stations scientifiques", "auto",
        "Mise en place de la partie ; onglet Faveurs, à l'encaissement",
        "Mise en place : quand Jol-Nar joue, ses 4 stations scientifiques (SR-301 à SR-304) sont mélangées avec les 16 tuiles du haut de la pioche. " +
        "À chaque encaissement des faveurs résolu : 1 point par station scientifique que vous possédez, marqué d'office avec l'encaissement."),

    regle("nef-de-la-rupture", "unit", 810, 1795372420268, "Nef de la rupture", "auto",
        "Conflit : cadre de blocage (passage par un trou de ver oméga)",
        "Vos Nefs de la rupture ignorent le blocage et les touches des trous de ver oméga : leur jet ne les arrête pas et ne les touche pas. Un blocage par des unités ou une rupture gravitationnelle les arrêtent comme les autres."),

    regle("complexe-de-guerre-destroyers", "unit", 164, 1795074271173, "Complexe de guerre : destroyers", "auto",
        "Conflit, combat spatial",
        "Vos destroyers ont +1 (non cumulable) dans le système d'un de vos complexes de guerre et dans les systèmes adjacents."),

    regle("mech-aerien", "unit", 171, 1795076850857, "Mech aérien", "auto",
        "Conflit, combat spatial",
        "Depuis une planète du système, il tire au combat spatial (il n'en est pas une cible)."),

    regle("vaisseau-pirate", "unit", 407, 1795075037683, "Vaisseau pirate", "auto",
        "Conflit, combat spatial",
        "Ses dés qui font 0 touchent d'abord un vaisseau de commerce du camp visé ; furtif dans un système à anomalie."),

    regle("epineux-geant", "unit", 466, 1795046343847, "Épineux géant", "auto",
        "Conflit, bombardement",
        "Au bombardement de sa planète, il attaque aussi les unités terrestres de la planète, avec sa valeur de combat."),

    regle("duha-menaimon-attaques", "unit", 472, 1795074271172, "Duha Menaimon : attaques", "auto",
        "Conflit, combat spatial",
        "Autant d'attaques que votre niveau de connaissance génétique (aucune à 0)."),

    regle("duha-menaimon-letani", "unit", 472, 1795074271172, "Duha Menaimon : Letani", "nouveau",
        "Conflit, bombardement : « Duha Menaimon : jet »",
        "Un dé : s'il fait au plus votre niveau de connaissance génétique, un Letani est posé sur la planète bombardée."),

    regle("fregate-du-khan", "unit", 524, 1795073444392, "Frégate du khan", "nouveau",
        "Conflit : « Riposte du khan » sur la frégate détruite",
        "Son destructeur lance un dé : 6 ou moins (4 ou moins si l'unité qui l'a détruite a #fpre), il encaisse 1 dégât sur une de ses unités du combat. La frégate se retire ensuite."),

    regle("palais-du-khan", "unit", 525, 1795074271177, "Palais du khan", "auto",
        "Conflit : malus pour toucher",
        "L'engager (ciblé ou dans un groupe) coûte −1 pour toucher par frégate du khan du combat, moitié moins (arrondi au-dessus) avec #prec ; ce malus remplace le −2 du ciblage."),

    regle("myru-vos", "unit", 597, 1794339608757, "Myru Vos", "auto",
        "Conflit : « Terminer le combat » (butin)",
        "Un vaisseau de commerce qu'il a détruit rapporte 2 commerce."),

    regle("nekro-acidos", "unit", 600, 1794339608760, "Nekro Acidos", "auto",
        "Conflit, combat terrestre",
        "Autant d'attaques que votre niveau de connaissance militaire (aucune à 0)."),

    regle("olivier-dubois", "unit", 745, 1795046343869, "Olivier Dubois", "nouveau",
        "Conflit, combat terrestre : « Olivier Dubois : +2 aux infanteries cochées »",
        "Jusqu'à votre capacité logistique de vos infanteries cochées ont +2 pour ce combat."),

    regle("bombe-bacteriologique-depensee", "unit", 1016, 1795046343902, "Bombe bactériologique", "auto",
        "Conflit : « Terminer le combat » d'un bombardement",
        "La bombe qui a bombardé est dépensée : elle est retirée à « Terminer le combat »."),

    regle("contamination", "habilite", 920, 0, "Contamination", "auto",
        "Conflit : « Terminer le combat » d'un bombardement",
        "Quand vous êtes la seule faction à bombarder : les unités détruites sur la planète ne sont pas retirées, elles deviennent des Infanteries infectées à vous (sans butin)."),

    regle("armageddon-conquis-portee", "unit", 490, 1795072921262, "Armageddon conquis : portée", "auto",
        "Conflit : canons spatiaux (« Mes canons spatiaux à portée »)",
        "La portée écrite sur une unité est lue (« portée 0 » : son canon ne tire que dans son système). Armageddon conquis reforgé (un scientifique posé dessus) : portée +1."),

    regle("memoria-d", "unit", 769, 1795073444382, "Memoria D", "nouveau",
        "Conflit : « Memoria D : jet » sur une de vos infanteries détruites",
        "Un dé : 6 ou moins, l'infanterie est sauvée et posée à bord de votre Memoria D."),

    regle("armageddon-capture", "unit", 850, 1795046343887, "Armageddon (destruction)", "auto",
        "Conflit : « Terminer le combat » (butin)",
        "Celui qui le détruit prend le contrôle d'un Armageddon conquis (#490), avec 1 de résistance restante."),

    regle("lune-noire", "unit", 856, 1794335055092, "Lune noire", "auto",
        "Conflit : engagements",
        "Un engagement de groupe ne l'atteint jamais : elle doit être ciblée."),

    regle("troupe-de-detournement", "unit", 846, 1795046343886, "Troupe de détournement", "auto",
        "Conflit, combats spatial et terrestre : phases 5 et 6 « Dernières attaques »",
        "Elle attaque après toutes les autres unités (un troisième « Prêt au combat », une fois les autres dégâts répartis). Un vaisseau qu'elle détruit est capturé : « Terminer le combat » l'envoie, réparé, dans les éléments actifs de son camp."),

    regle("camp-de-travail-destruction", "unit", 154, 1795074271167, "Camp de travail (destruction)", "auto",
        "Conflit : « Terminer le combat » (butin)",
        "Détruit : 2 esclaves de son propriétaire sont dépensés (au choix du destructeur — l'outil prend ceux des autres factions d'abord) et le destructeur pose 2 de ses infanteries sur la planète."),

    effet("strategie-d-evitement", 788, 1795072921268, "Stratégie d'évitement", "nouveau",
        "Conflit, combat spatial : « Stratégie d'évitement : vaisseaux cochés »",
        "Au début du combat, vos vaisseaux militaires cochés ont −1 au combat ; un tireur dont le premier engagement ne vise qu'eux a −1."),

    action("prevision-des-combats", "tech", 803, 1795046343879, "Prévision des combats", "systeme",
        "Combat spatial : la technologie et un scientifique sont usés — votre flotte de ce système a la frappe en premier ce tour (écran de combat).", {
            phase: "combat spatial",
            use: true,
            agent: SCIENTIFIQUE,
            special: atelier => ({
                actions: [{ type: "compteur", id: `joueur:${atelier.moi}:prevision`, valeur: lieuDuTour(atelier) }],
                avis: "Prévision des combats : vos vaisseaux de ce système ont la frappe en premier ce tour (écran de combat).",
            }),
            libelle: "Prévision des combats : frappe en premier (use la technologie et un scientifique)",
        }),

    action("centre-d-expansion", "unit", 165, 1794335054827, "Centre d'expansion", "systeme",
        "Ravitaillement : désignez un système où vous n'avez pas d'unité ; pour ce tour, vous y avez +1 au combat spatial.", {
            phase: "ravitaillement",
            parTour: true,
            visible: outils => outils.mienneSurLaCarte(165) && outils.mesUnitesDansLeSysteme() === 0,
            special: atelier => ({
                actions: [{ type: "compteur", id: `joueur:${atelier.moi}:expansion`, valeur: lieuDuTour(atelier) }],
                avis: "Centre d'expansion : +1 au combat spatial dans ce système pour ce tour.",
            }),
            libelle: "Centre d'expansion : +1 au combat spatial ici ce tour",
        }),

    action("armageddon-scientifique", "unit", 490, 1795072921262, "Armageddon conquis : scientifique", "unite",
        "Science (Reforger) : dépensez 3 fragments militaires et posez un scientifique sur cette unité, où il reste : la portée de son canon augmente de 1 et elle rapporte 2 points de plus au décompte (les points se comptent à la main ; la portée est appliquée par l'outil tant que le scientifique est sur l'unité).", {
            // (Reforger : à la phase de science ; ici le scientifique reste sur l'unité au lieu d'être dépensé)
            phase: "science",
            fragments: { mil: 3 },
            agent: { motif: "scientifique", nom: "scientifique", pose: true, surCarte: true },
            visible: outils => !!outils.c && !Object.values(outils.etat.composants).some(x => x.sur === outils.c.id && x.ref?.type === "agent"),
            avis: "Armageddon : portée du canon +1 (appliquée tant que le scientifique est dessus) ; 2 points de plus au décompte, à compter à la main.",
            libelle: "Poser un scientifique (3 fragments militaires)",
        }),

    action("cuve-de-clonage-produire", "unit", 570, 1795046343863, "Cuve de clonage : produire", "unite",
        "Production : la cuve est usée, 2 infanteries de votre faction sont posées sur sa planète.", {
            phase: "production",
            use: true,
            cree: { unite: "inf", n: 2 },
            libelle: "Produire 2 infanteries (cuve usée)",
        }),

    action("combattant-voyageur", "unit", 747, 1795046343870, "Combattant voyageur : se déplacer", "unite",
        "Débarquement : l'unité est usée et vous dépensez 3 ressources ; glissez-la sur une autre planète à 3 de distance au plus.", {
            phase: "d[ée]barquement",
            nomPhase: "débarquement",
            use: true,
            cout: { res: 3 },
            avis: "Combattant voyageur : glissez-le sur une autre planète (3 de distance au plus).",
            libelle: "Se déplacer (3 ressources, unité usée)",
        }),

    action("indigene", "unit", 568, 0, "Indigène : jet contre l'unité", "unite",
        "Combat terrestre : use un diplomate, 4 dés à 3 sont lancés contre cette unité ; chaque réussite lui inflige 1 dégât, et elle est retirée si elle n'a plus de résistance.", {
            phase: "combat terrestre",
            nomPhase: "combat terrestre",
            agent: DIPLOMATE,
            // (unité neutre : le bouton est sur sa fiche pour toute faction)
            autrui: true,
            special: atelier => ({
                actions: [],
                tirages: [{
                    c: atelier.c.id,
                    n: 4,
                    suite: jets => {

                        const reussites = jets.filter(j => j <= 3).length;
                        const degat = (Number(atelier.c.marques?.degat) || 0) + reussites;
                        const detruite = reussites > 0 && degat >= (Number(atelier.contenu?.PV) || 1);

                        return {
                            texte: `Indigène, jet (3,4) : ${jets.join(", ")} — ${reussites} réussite(s)` +
                                (detruite ? ", l'unité est détruite" : (reussites ? `, ${reussites} dégât(s)` : ", sans effet")),
                            actions: !reussites ? [] : [detruite
                                ? { type: "supprimer", c: atelier.c.id }
                                : { type: "marquer", c: atelier.c.id, marque: "degat", valeur: degat }],
                        };
                    },
                }],
            }),
            libelle: "Jet (3,4) contre cette unité (use un diplomate)",
        }),

    action("dynamo", "unit", 960, 0, "Dynamo : ignorer 2 dégâts", "unite",
        "Combat spatial : l'unité et un diplomate sont usés, 2 dégâts de l'unité sont retirés (posez d'abord les dégâts sur elle).", {
            phase: "combat spatial",
            nomPhase: "combat spatial",
            agent: DIPLOMATE,
            use: true,
            degat: -2,
            libelle: "Ignorer 2 dégâts (unité usée, use un diplomate)",
        }),

    regle("infanterie-infectee", "unit", 1014, 0, "Infanterie infectée", "modifie",
        "Espace : glisser l'unité hors de son lieu",
        "« Ne peut jamais être déplacée » : une fois sur la carte, la glisser ailleurs demande une confirmation (règle semi-bloquante)."),

    action("vaisseau-relique-combat", "unit", 854, 1795074271178, "Vaisseau relique : +3 au combat", "unite",
        "Dépensez un fragment militaire : +3 au combat pour ce combat (ce tour).", {
            fragments: { mil: 1 },
            calcul: outils => (Number(outils.c?.marques?.reliqueMil) === outils.etat.tour ? { sans: "déjà fait ce tour" } : {}),
            special: atelier => ({ actions: [{ type: "marquer", c: atelier.c.id, marque: "reliqueMil", valeur: atelier.etat.tour }] }),
            libelle: "+3 au combat (fragment militaire)",
        }),

    action("vaisseau-relique-mouvement", "unit", 854, 1795074271178, "Vaisseau relique : +3 mouvement", "unite",
        "Dépensez un fragment spatial : +3 mouvement et déplacement furtif ce tour (déplacement assisté).", {
            fragments: { spa: 1 },
            calcul: outils => (Number(outils.c?.marques?.reliqueSpa) === outils.etat.tour ? { sans: "déjà fait ce tour" } : {}),
            special: atelier => ({ actions: [{ type: "marquer", c: atelier.c.id, marque: "reliqueSpa", valeur: atelier.etat.tour }] }),
            libelle: "+3 mouvement et furtif (fragment spatial)",
        }),

    action("vaisseau-relique-infanterie", "unit", 854, 1795074271178, "Vaisseau relique : infanterie", "unite",
        "Dépensez un fragment civil : le vaisseau est rempli d'infanteries de votre faction (jusqu'à sa capacité).", {
            fragments: { civ: 1 },
            calcul: outils => {
                const n = Math.max(0, (Number(outils.contenu?.capacite) || 0) -
                    Object.values(outils.etat.composants).filter(x => outils.c && x.sur === outils.c.id && x.ref?.type === "unit").length);

                return n > 0
                    ? { cree: { unite: "inf", n, bord: true }, libelle: `Remplir d'infanterie : ${n} (fragment civil)` }
                    : { sans: "le vaisseau est plein" };
            },
            libelle: "Remplir d'infanterie (fragment civil)",
        }),

    action("vaisseau-relique-reparer", "unit", 854, 1795074271178, "Vaisseau relique : réparer", "unite",
        "Posez un fragment ancien sur le vaisseau : il est réparé gratuitement, et il a 1 de résistance en plus par fragment ancien posé dessus (compté au combat).", {
            fragments: { ancien: 1 },
            fragmentsPoses: true,
            degat: -100,
            libelle: "Poser un fragment ancien : réparé, +1 résistance",
        }),

    // ---- remplaçants d'agent (Interaction.jsx : choisirRemplacants) ----

    regle("heritier", "agent", 142, 1795072921248, "Héritier", "modifie",
        "Tout agent utilisé ou dépensé : fenêtre de choix",
        "Utilisable comme politique si vous possédez Mecatol Rex, comme amiral sinon ; dépensé, il attend deux tours sur votre feuille au lieu d'être détruit."),

    regle("noble-cryogenise", "relique", 396, 1795076851738, "Noble cryogénisé", "modifie",
        "Tout agent utilisé ou dépensé : fenêtre de choix",
        "Glissez la carte sur un type d'agent de votre réserve : elle s'utilise comme cet agent ; quand elle devrait être dépensée, elle est usée."),

    // ---- mercenaires dont l'effet tient à ce pour quoi ils servent d'agent ----
    // (production : Production.jsx, MERCENAIRES_PRODUCTION ; le mercenaire doit être choisi comme
    //  logisticien à l'ouverture de la production — question « Qui agit ? » de l'onglet Décision)

    regle("rear-admiral-farran", "mercenaire", 219, 0, "Rear Admiral Farran", "modifie",
        "Production ouverte avec lui comme logisticien",
        "Quand il est le logisticien qui ouvre une production (« Qui agit ? » : Rear Admiral Farran) : chaque cuirassé posé pendant cette production coûte 1 de moins."),

    regle("suffi-an", "mercenaire", 220, 0, "Suffi An", "modifie",
        "Production ouverte avec lui comme logisticien",
        "Quand il est le logisticien qui ouvre une production : chaque croiseur posé pendant cette production coûte 1 de moins."),

    regle("evelyne-delouis", "mercenaire", 280, 0, "Evelyne Delouis", "modifie",
        "Production ouverte avec elle comme logisticien",
        "Quand elle est le logisticien qui ouvre une production : chaque transporteur posé pendant cette production coûte 1 de moins. Déplacement assisté : tant qu'elle est disponible comme logisticien, une case à cocher lui fait déplacer les transports choisis — leur mouvement augmente de 1 et c'est elle qui est utilisée."),

    regle("trillossa-aun-mirik", "mercenaire", 221, 0, "Trillossa Aun Mirik", "modifie",
        "Production ouverte avec lui comme logisticien",
        "Quand il est le logisticien qui ouvre une production : au premier destroyeur posé, un destroyeur de plus est créé au même endroit, sans coût et sans compter dans la quantité produite."),

    regle("carth-de-sabledor", "mercenaire", 292, 0, "Carth de Sabledor", "modifie",
        "Production ouverte avec lui comme logisticien",
        "Quand il est le logisticien qui ouvre une production : après le premier vaisseau de commerce posé, le suivant est gratuit et ne compte pas dans la quantité produite (une fois)."),

    regle("gabriel-gibbs", "mercenaire", 729, 0, "Gabriel Gibbs", "nouveau",
        "Fiche d'un système, planète que vous possédez : « Gabriel Gibbs : mobiliser »",
        "Phase de production, tant qu'il est disponible comme logisticien (son cube posé sur le type Logisticien) : il mobilise à la place d'un logisticien, jusqu'à votre capacité logistique en infanteries."),

    regle("vasra-ivo", "mercenaire", 351, 0, "Vasra Ivo", "modifie",
        "Conflit, canons spatiaux : « Mes canons spatiaux à portée »",
        "Tant qu'il est disponible comme amiral (son cube posé sur le type Amiral) : vos canons à une case de plus que leur portée sont proposés, « Tirer avec Vasra Ivo (portée +1) » — c'est lui qui est utilisé."),

    regle("m-aban", "mercenaire", 283, 0, "M'aban", "modifie",
        "Phase de construction : structure glissée sur une planète qui en porte déjà une",
        "Tant qu'il est disponible comme logisticien : l'onglet Décision propose que M'aban construise — il est utilisé, aucun logisticien n'est dépensé."),

    // ---- promesses : boutons de la fiche de la carte (chez moi) ----

    regle("vassal", "Promesse", 224, 1795072921255, "Vassal", "modifie",
        "Conflit : conflit d'accord (revendication)",
        "Vous ne pouvez pas accepter la revendication d'une planète que vous possédez."),

    action("vassal-rompu", "Promesse", 224, 1795072921255, "Vassal : promesse rompue", "carte",
        "Si vous perdez un de vos mondes nataux : la promesse retourne à la réserve et la faction qui l'a faite gagne 1 infamie.", {
            special: promesseRompue,
            libelle: ROMPUE,
        }),

    action("pacte-de-non-agression-rompu", "Promesse", 225, 1795076851650, "Pacte de non-agression : rompu", "carte",
        "Si la faction qui vous l'a fourni fait un engagement contre vous : la promesse retourne à la réserve et cette faction gagne 1 infamie.", {
            special: promesseRompue,
            libelle: ROMPUE,
        }),

    action("accord-de-recherche", "Promesse", 335, 1795076851707, "Accord de recherche", "carte",
        "Quand la faction recherche une technologie : vous gagnez 2 de recherche dans celle-ci (notée au journal de recherche).", {
            recherche: [["", 2]],
            libelle: "Accord de recherche : +2 recherche (la faction recherche une technologie)",
        }),

    action("acces-aux-archives-imperiales", "Promesse", 370, 1795068317101, "Accès aux archives impériales", "carte",
        "Science : use un scientifique et activez Mecatol Rex, 3 de recherche ; les Winnu gagnent autant de recherche.", {
            phase: "science",
            agent: SCIENTIFIQUE,
            recherche: [["", 3]],
            special: atelier => {

                const zones = atelier.zonesDePlanete(34);
                const libre = zones.find(z => !atelier.activee(z));
                const winnu = atelier.joueurs.find(j => Number(j.faction) === 143 && j.userId !== atelier.moi);

                return {
                    actions: [
                        libre && { type: "creer", jeton: "activation", zone: libre },
                        winnu && atelier.recherche(winnu.userId, 370, 3),
                    ],
                    sans: !zones.length
                        ? "Mecatol Rex n'est pas sur la carte"
                        : (!libre ? "Mecatol Rex est déjà activée" : null),
                    avis: winnu ? `Accès aux archives impériales : ${atelier.nomDe(winnu.userId)} gagne aussi 3 de recherche.` : "",
                };
            },
            libelle: "Accès aux archives impériales : +3 recherche (use un scientifique, active Mecatol Rex)",
        }),

    action("promesse-de-vente-rompue", "Promesse", 383, 1795076851729, "Promesse de vente : rompue", "carte",
        "Si la faction ne vous a pas fourni l'élément à l'échéance : la promesse retourne à la réserve et cette faction gagne 1 infamie.", {
            special: promesseRompue,
            libelle: ROMPUE,
        }),

    action("frontiere-ouverte-rompue", "Promesse", 384, 1795076851729, "Frontière ouverte : rompue", "carte",
        "Si la faction bloque un de vos mouvements : la promesse retourne à la réserve et cette faction gagne 1 infamie. Proposé d'office (onglet Décision) quand son blocage arrête un de vos vaisseaux ; le bouton de la carte reste pour les autres cas.", {
            special: promesseRompue,
            libelle: ROMPUE,
        }),

    action("pacte-pirate", "Promesse", 458, 1795072921264, "Pacte pirate", "carte",
        "Ravitaillement : dépensez 2 ressources pour garder le pacte (une fois par tour) ; sinon renvoyez la carte à la réserve.", {
            phase: "ravit",
            nomPhase: "ravitaillement",
            cout: { res: 2 },
            parTour: true,
            libelle: "Pacte pirate : payer 2 ressources (ravitaillement)",
        }),

    action("confrerie-de-mercenaire-pioche", "habilite", 764, 1795046343871, "Confrérie de mercenaire", "bandeau",
        "Recrutement : piochez un mercenaire dans votre main, à poser sur la case de recrutement de votre choix (une fois par tour).", {
            phase: "recrut",
            nomPhase: "recrutement",
            pioche: { de: "pioche:mercenaire", vers: "main" },
            parTour: true,
            visible: outils => /recrut/i.test(outils.phase),
            libelle: "Confrérie de mercenaire : piocher un mercenaire (à poser sur une case de recrutement)",
        }),

    // --------------------------------------------------------
    // Lot du 18 novembre : scripts manquants
    // --------------------------------------------------------

    // ----- Kabal de l'ombre -----

    effet("exploitation-de-masse", 273, 1794343420990, "Exploitation de masse", "modifie",
        "Plateau joueur : « Esclaves » ; fiche du Camp de travail",
        "Un esclave dépensé rapporte 2 ressources au lieu d'une ; le Camp de travail rapporte 2 ressources de plus (6)."),

    action("enrolement", "tech", 274, 1795205230651, "Enrôlement", "planete",
        "Débarquement, sur une planète où vous avez une structure : use un logisticien et la structure, 2 de vos esclaves sont posés sur la planète, sous vos ordres (aucun contrôle de la planète n'est demandé). S'ils sont en vie à la fin du combat terrestre, recapturez-les à la main (glissez-les dans vos éléments actifs).", {
            surPlanete: true,
            phase: "d[ée]barquement",
            nomPhase: "débarquement",
            agent: LOGISTICIEN,
            visible: outils => outils.mesStructuresIci() > 0,
            special: atelier => {

                const structure = atelier.unites(atelier.zone).find(x => atelier.campDe(x) === atelier.moi &&
                    aMot(atelier.contenuDe(x.ref.id), "struc") && !atelier.usee(x));

                const esclaves = atelier.esclaves().slice(0, 2);

                return {
                    actions: [
                        ...(structure ? atelier.user(structure) : []),
                        ...esclaves.flatMap(x => [
                            { type: "deplacer", c: x.id, vers: atelier.zone },
                            { type: "marquer", c: x.id, marque: "possession", valeur: atelier.moi },
                        ]),
                    ],
                    sans: !structure
                        ? "aucune de vos structures non usée sur cette planète (aucune ne sera usée)"
                        : (esclaves.length < 2 ? `il faut 2 esclaves, vous en avez ${esclaves.length} (seuls ceux-là seront posés)` : null),
                    avis: `Enrôlement : ${esclaves.length} esclave(s) posé(s) sous votre contrôle. S'ils survivent au combat terrestre, recapturez-les à la main.`,
                };
            },
            libelle: "Enrôlement : poser 2 esclaves (use un logisticien et une structure)",
        }),

    // ----- Omni-esprit d'Arborec -----

    effet("vie-fructifiante", 594, 1794343421172, "Vie fructifiante", "auto",
        "Ravitaillement automatique : Sève de vie",
        "Sève de vie rend 2 de résistance au lieu d'une."),

    // ----- Tempête spatiale, Rupture de l'espace-temps -----

    effet("canon-solaire", 1029, 0, "Canon solaire", "auto",
        "Conflit : canons spatiaux",
        "Un de vos soleils de guerre qui se trouve dans une supernova a un canon spatial (5, 3 dés) de portée 2 : il est proposé dans « Mes canons spatiaux à portée »."),

    effet("forge-stellaire", 1028, 0, "Forge stellaire", "modifie",
        "Phase de production : Ctrl + clic sur un soleil de guerre",
        "Un de vos soleils de guerre qui se trouve dans une supernova ouvre une production comptée de 3 vaisseaux ou mechs."),

    effet("adaptation-des-reacteurs", 399, 1794343420992, "Adaptation des réacteurs", "auto",
        "Espace : déplacement assisté",
        "Le malus de 1 au mouvement de la Tempête spatiale est ignoré."),

    action("tempete-electromagnetique", "tech", 446, 1795046343839, "Tempête électromagnétique", "systeme",
        "Canons spatiaux, dans une nébuleuse que vous contrôlez (conflit de contrôle si d'autres peuvent s'y opposer) : use un scientifique et active la nébuleuse, 4 dés de canon à 4. Les touches se répartissent à la main dans un système à portée 1.", {
            phase: "canon",
            controle: "systeme",
            nomPhase: "canons spatiaux",
            agent: SCIENTIFIQUE,
            activer: true,
            visible: dansUneNebuleuse,
            special: atelier => {

                const tuile = atelier.tuile();

                return {
                    actions: [],
                    sans: tuile ? null : "tuile du système introuvable",
                    tirages: tuile ? [{
                        c: tuile.id,
                        n: 4,
                        suite: jets => ({
                            texte: `canon (4,4) : ${jets.join(", ")} — ${jets.filter(j => j <= 4).length} touche(s), à répartir à la main dans un système à portée 1`,
                        }),
                    }] : [],
                };
            },
            libelle: "Tempête électromagnétique : canon (4,4) (use un scientifique, active la nébuleuse)",
        }),

    effet("stabilisateur-de-rupture", 820, 1794343421186, "Stabilisateur de rupture", "auto",
        "Conflit : cadre de blocage (passage par un trou de ver oméga)",
        "Vos vaisseaux ignorent les touches des trous de ver oméga (9 ou plus : plus de touche)."),

    revenu("extraction-de-la-faille", "tech", 821, 1795046343884, "Extraction de la faille", "ravit",
        "+3 ressources par Faille que vous dominez (seul dans son espace, ou vainqueur du test de domination ouvert pour « Extraction de la faille » ce tour). Une Faille disputée fait attendre le ravitaillement : ouvrez ce test depuis la fiche du système.", {
            calcul: (source, outils) => {

                const failles = casesDuSysteme(outils.index, 811);
                const dominees = failles.filter(n => dominantDe(outils.etat, outils.index, n, 821) === outils.userId);

                const disputees = failles.filter(n => dominantDe(outils.etat, outils.index, n, 821) === null &&
                    (outils.index.parZone.get("hex:" + n) || []).some(x => !x.cache && x.ref?.type === "unit" && campDe(x) === outils.userId));

                return {
                    gains: { res: 3 * dominees.length },
                    note: `${dominees.length} Faille(s) dominée(s)`,
                    attente: disputees.length
                        ? `${disputees.length} Faille(s) disputée(s) : test de domination « Extraction de la faille » à ouvrir (fiche du système) et à clore`
                        : null,
                };
            },
        }),

    // ----- Habilités d'événements -----

    action("peage-aux-frontieres", "habilite", 452, 1795046343842, "Péage aux frontières", "carte",
        "Phase d'événement : la faction qui domine chaque système à trou de ver alpha gagne 3 commerce (seule dans son espace, ou vainqueur du test de domination ouvert pour « Péage aux frontières » ce tour).", {
            phase: "[ée]v[ée]nement",
            nomPhase: "événement",
            special: atelier => {

                if (Number(atelier.etat.compteurs["peage:tour"]) === atelier.etat.tour) {
                    return { actions: [], sans: "le péage de ce tour est déjà perçu" };
                }

                // Trou de ver alpha : la planète spéciale #25 de la tuile, ou le token #826 posé dans le système
                const alphas = atelier.cases().filter(x => (x.systeme?.elems || []).some(lien => Number(lien?.id) === 25) ||
                    dansLeSysteme(atelier.index, x.numero).some(c => c.ref?.type === "token" && c.ref.id === 826));

                const etats = alphas.map(x => ({ n: x.numero, d: dominantDe(atelier.etat, atelier.index, x.numero, 452) }));
                const payes = etats.filter(x => x.d > 0);
                const disputes = etats.filter(x => x.d === null);

                return {
                    actions: [
                        ...payes.map(x => ({ type: "compteur", id: `joueur:${x.d}:commerce`, delta: 3 })),
                        { type: "compteur", id: "peage:tour", valeur: atelier.etat.tour },
                    ],
                    sans: disputes.length
                        ? `système(s) disputé(s) sans test de domination « Péage aux frontières » clos ce tour (${disputes.map(x => atelier.nomCase(x.n)).join(", ")}) : ils ne rapporteront rien`
                        : null,
                    avis: "Péage aux frontières : " + (payes.length
                        ? payes.map(x => `${atelier.nomDe(x.d)} +3 commerce (${atelier.nomCase(x.n)})`).join(", ")
                        : "aucun système à trou de ver alpha n'est dominé") + ".",
                };
            },
            libelle: "Percevoir le péage aux frontières",
        }),

    action("cache", "habilite", 486, 1795046343852, "Cache", "systeme",
        "Revendication, dans un système que vous dominez et qui contient un fragment de relique : vous prenez un fragment.", {
            phase: "revendication",
            visible: outils => outils.numero !== null && fragmentsDuSysteme(outils.index, outils.numero).length > 0,
            special: atelier => {

                const fragment = fragmentsDuSysteme(atelier.index, atelier.numero)[0];
                const dominant = dominantDe(atelier.etat, atelier.index, atelier.numero, 486);

                return {
                    actions: fragment ? [{ type: "deplacer", c: fragment.id, vers: `joueur:${atelier.moi}:fragments` }] : [],
                    sans: !fragment
                        ? "aucun fragment de relique dans ce système"
                        : (dominant === atelier.moi ? null
                            : (dominant === null ? "système disputé : ouvrez d'abord le test de domination « Cache » (fiche du système)" : "vous ne dominez pas ce système")),
                    avis: fragment ? `Cache : ${fragment.jeton} pris.` : "",
                };
            },
            libelle: "Cache : prendre un fragment de relique",
        }),

    action("domination-designer", "habilite", 254, 1795072921276, "Domination : désigner", "planete",
        "Ravitaillement, à partir du tour 7 : désignez une planète légendaire ou militaire que vous ne possédez pas. Si vous la possédez à la fin du tour, « Domination : +2 points » (plateau joueur).", {
            surPlanete: true,
            phase: "ravitaill",
            nomPhase: "ravitaillement",
            visible: outils => outils.etat.tour >= 7 && (!!outils.contenu?.legendary || outils.contenu?.planetType === "mil") &&
                outils.proprietaire(outils.idElement) !== outils.moi,
            special: atelier => ({
                actions: [
                    { type: "compteur", id: `joueur:${atelier.moi}:dominationPlanete`, valeur: atelier.idElement },
                    { type: "compteur", id: `joueur:${atelier.moi}:dominationTour`, valeur: atelier.etat.tour },
                ],
                sans: Math.abs(Number(atelier.etat.compteurs[`joueur:${atelier.moi}:dominationTour`])) === atelier.etat.tour
                    ? "vous avez déjà désigné une planète ce tour (celle-ci la remplacera)"
                    : null,
                avis: `Domination : ${atelier.contenu?.name || "planète"} désignée. Si vous la possédez à la fin du tour : « Domination : +2 points » (plateau joueur).`,
            }),
            libelle: "Domination : désigner cette planète",
        }),

    action("domination-points", "habilite", 254, 1795072921276, "Domination : points", "plateau",
        "Fin du tour : si vous possédez la planète désignée au ravitaillement, +2 points.", {
            visible: outils => Number(outils.etat.compteurs[`joueur:${outils.moi}:dominationTour`]) === outils.etat.tour,
            special: atelier => {

                const idPlanete = Number(atelier.etat.compteurs[`joueur:${atelier.moi}:dominationPlanete`]) || 0;

                return {
                    actions: [
                        ...atelier.points(atelier.moi, 2),
                        // (négatif : les points de ce tour sont marqués)
                        { type: "compteur", id: `joueur:${atelier.moi}:dominationTour`, valeur: -atelier.etat.tour },
                    ],
                    sans: atelier.proprietaire(idPlanete) === atelier.moi
                        ? null
                        : `vous ne possédez pas ${atelier.nom({ type: "planet", id: idPlanete })}`,
                    avis: "Domination : +2 points.",
                };
            },
            libelle: "Domination : +2 points (planète désignée possédée)",
        }),

    action("distorsion-gravitationnelle", "habilite", 515, 1794335055047, "Distorsion gravitationnelle", "systeme",
        "Ravitaillement, dans le système qui porte l'habilité (Avar) : un dé par unité du système, 1 dégât si le dé fait le numéro du tour ou moins. Une fois par tour.", {
            pourTous: true,
            phase: "ravitaill",
            nomPhase: "ravitaillement",
            visible: outils => Number(outils.systeme?.nativeUnit?.id) === 515,
            special: atelier => {

                const unites = dansLeSysteme(atelier.index, atelier.numero).filter(x => x.ref?.type === "unit");

                return {
                    ...uneFoisParTour(atelier, `distorsion:${atelier.numero}`, "la distorsion de ce tour est déjà appliquée",
                        unites.length ? null : "aucune unité dans ce système"),
                    tirages: unites.map(x => tirageDegat(atelier, x, atelier.etat.tour)),
                };
            },
            libelle: "Distorsion gravitationnelle : un dé par unité (touche sur le numéro du tour ou moins)",
        }),

    action("debarquement-du-khan", "habilite", 530, 1795046343860, "Débarquement du Khan", "bandeau",
        "Débarquement, quand le Palais du khan est sur la carte : chaque planète à portée 1 du Khan reçoit 1D6 Soldats du Khan. Une fois par tour pour la table.", {
            pourTous: true,
            phase: "d[ée]barquement",
            nomPhase: "débarquement",
            visible: outils => /d[ée]barquement/i.test(outils.phase) && outils.surLaCarte(525),
            special: atelier => {

                const palais = Object.values(atelier.etat.composants).find(x =>
                    !x.cache && x.ref?.type === "unit" && x.ref.id === 525 && /^hex:\d+/.test(x.zone || ""));

                const ici = palais ? Number(/^hex:(\d+)/.exec(palais.zone)[1]) : null;

                const planetes = ici === null ? [] : atelier.cases()
                    .filter(x => atelier.distance(ici, x.numero) <= 1)
                    .flatMap(x => planetesDe(atelier, x).map(p => ({ ...p, tuile: x.tuile })));

                return {
                    ...uneFoisParTour(atelier, "khan:debarquement", "le débarquement de ce tour est déjà fait",
                        planetes.length ? null : "aucune planète à portée 1 du Palais du khan"),
                    tirages: planetes.map(p => ({
                        c: p.tuile.id,
                        faces: 6,
                        suite: ([jet]) => ({
                            actions: [{ type: "creer", ref: { type: "unit", id: 527 }, zone: p.zone, n: jet }],
                            texte: `${p.contenu.name} ${jet} soldat(s)`,
                        }),
                    })),
                };
            },
            libelle: "Débarquement du Khan : 1D6 Soldats du Khan par planète à portée 1",
        }),

    action("negocier-avec-les-rebelles", "habilite", 560, 1795073444387, "Négocier avec les rebelles", "planete",
        "Diplomatie, sur une planète où il y a des Rebelles : use un diplomate, 3 dés à 4 — chaque réussite retire un Rebelle.", {
            pourTous: true,
            surPlanete: true,
            phase: "diplomatie",
            agent: DIPLOMATE,
            visible: outils => outils.ici(557) > 0,
            special: atelier => {

                const rebelles = atelier.unites(atelier.zone).filter(x => x.ref.id === 557);
                const tuile = atelier.tuile();

                return {
                    actions: [],
                    sans: tuile ? null : "tuile du système introuvable",
                    tirages: tuile ? [{
                        c: tuile.id,
                        n: 3,
                        suite: jets => {
                            const touches = Math.min(rebelles.length, jets.filter(j => j <= 4).length);

                            return {
                                actions: rebelles.slice(0, touches).map(x => ({ type: "supprimer", c: x.id })),
                                texte: `${jets.join(", ")} — ${touches} Rebelle(s) retiré(s)`,
                            };
                        },
                    }] : [],
                };
            },
            libelle: "Négocier avec les rebelles : attaque 4 ×3 (use un diplomate)",
        }),

    action("rebellion-armee", "habilite", 561, 1795072921244, "Rébellion armée", "bandeau",
        "Combat terrestre : un combat terrestre est ouvert sur chaque planète où il y a au moins 6 Rebelles. (À la revendication, leur tentative de reprendre la planète se fait à la main.)", {
            pourTous: true,
            phase: "combat terrestre",
            visible: outils => /combat terrestre/i.test(outils.phase) && planetesEnRebellion(outils.index).length > 0,
            special: atelier => {

                const lieux = planetesEnRebellion(atelier.index)
                    .map(zone => zone.replace(/^hex:(\d+):planete:(\d+)$/, "$1p$2"))
                    .filter(lieu => !atelier.etat.compteurs["combat:" + lieu]);

                return {
                    actions: lieux.map(lieu => ({ type: "compteur", id: "combat:" + lieu, valeur: 1 })),
                    sans: lieux.length ? null : "les combats de ces planètes sont déjà ouverts",
                    avis: `Rébellion armée : ${lieux.length} combat(s) terrestre(s) ouvert(s) (onglet Conflit).`,
                };
            },
            libelle: "Rébellion armée : ouvrir les combats terrestres (6 Rebelles ou plus)",
        }),

    action("arme-bacteriologique", "tech", 403, 1795073444377, "Arme bactériologique", "systeme",
        "Bombardement, dans un système que vous contrôlez (conflit de contrôle si d'autres peuvent s'y opposer) et où d'autres camps ont des infanteries : use un scientifique, un dé par infanterie adverse des planètes du système — détruite sur 5 ou moins (1 si son propriétaire a le Vaccin).", {
            phase: "bombardement",
            controle: "systeme",
            agent: SCIENTIFIQUE,
            visible: outils => outils.numero !== null && dansLeSysteme(outils.index, outils.numero).some(x =>
                x.ref?.type === "unit" && /:planete:/.test(x.zone || "") && campDe(x) !== outils.moi),
            special: atelier => {

                const infanteries = dansLeSysteme(atelier.index, atelier.numero).filter(x => x.ref?.type === "unit" &&
                    /:planete:/.test(x.zone || "") && campDe(x) !== atelier.moi && atelier.contenuDe(x.ref.id)?.type === "inf");

                const seuil = x => (campDe(x) > 0 && atelier.aTechnologie(campDe(x), 402) ? 1 : 5);

                return {
                    actions: [],
                    sans: infanteries.length ? null : "aucune infanterie adverse sur les planètes de ce système",
                    tirages: infanteries.map(x => ({
                        c: x.id,
                        suite: ([jet]) => ({
                            actions: jet <= seuil(x) ? [{ type: "supprimer", c: x.id }] : [],
                            detruit: jet <= seuil(x),
                            texte: `${atelier.nom(x.ref)} ${jet}${jet <= seuil(x) ? " (détruite)" : ""}`,
                        }),
                    })),
                };
            },
            libelle: "Arme bactériologique : un dé par infanterie adverse (use un scientifique)",
        }),

    // ----- Signal capté : SIG-1 à SIG-4 -----

    memoriaSignal("memoria-signal", 766, 1795046343872, "Memoria"),
    memoriaSignal("memoria-b-signal", 767, 1795046343873, "Memoria B"),
    memoriaSignal("memoria-a-signal", 768, 1795046343874, "Memoria A"),
    memoriaSignal("memoria-d-signal", 769, 1795073444382, "Memoria D"),
    memoriaSignal("memoria-c-signal", 770, 1794049918252, "Memoria C"),

    signal(1, 481, 1795072921271),
    signal(2, 482, 1795072921272),
    signal(3, 483, 1795072921273),
    signal(4, 484, 1795072921274),

    // ----- Pirate Mentak -----

    action("racket", "habilite", 942, 1795028826685, "Racket", "planete",
        "Ravitaillement, à côté d'une planète d'une autre faction, dans un système où vous avez des unités militaires : ouvre un test de domination du système (onglet Conflit). À sa clôture, si vous dominez, vous gagnez les ressources de la planète et son propriétaire les perd. Une fois par tour et par planète.", {
            surPlanete: true,
            phase: "ravitaill",
            nomPhase: "ravitaillement",
            visible: outils => outils.mesMilitairesDansLeSysteme() > 0 &&
                ![null, outils.moi].includes(outils.proprietaire(outils.idElement)),
            special: atelier => {

                const m = /^hex:(\d+):planete:(\d+)$/.exec(atelier.zone || "");
                const compteurs = atelier.etat.compteurs;
                const tour = atelier.etat.tour;

                if (!m) {
                    return { actions: [], sans: "planète introuvable sur la carte" };
                }

                const cle = `racket:${m[1]}p${m[2]}`;
                const proprietaire = atelier.proprietaire(atelier.idElement);
                const res = Number(atelier.contenu?.res) || 0;

                if (Number(compteurs[cle + ":tour"]) === tour) {
                    return { actions: [], sans: "les ressources de cette planète ont déjà été réclamées ce tour" };
                }

                if (compteurs[cle]) {
                    return { actions: [], sans: "le test de domination de ce racket est déjà en cours (onglet Conflit)" };
                }

                if (!res) {
                    return { actions: [], sans: "cette planète ne rapporte aucune ressource" };
                }

                // Test de domination du Racket déjà clos ce tour dans ce système : il ne se rouvre
                // pas, son résultat s'applique tout de suite
                const dejaClos = resultatDomination(atelier.etat, Number(m[1]), 942);

                if (dejaClos !== null) {

                    if (dejaClos !== atelier.moi) {
                        return { actions: [], sans: "vous ne dominez pas ce système (test de domination du Racket clos ce tour)" };
                    }

                    const pris = Math.min(res, atelier.compte(proprietaire, "res"));

                    return {
                        actions: [
                            { type: "compteur", id: `joueur:${atelier.moi}:res`, delta: res },
                            pris > 0 && { type: "compteur", id: `joueur:${proprietaire}:res`, delta: -pris },
                            { type: "compteur", id: cle + ":tour", valeur: tour },
                        ].filter(Boolean),
                        avis: `Racket : vous dominez le système, +${res} ressource(s) ; ${atelier.nomDe(proprietaire)} en perd ${pris}.`,
                    };
                }

                // (un seul test de domination ouvert par système : un autre sujet y est en cours)
                if (compteurs[`domination:${m[1]}`] && Number(compteurs[`domination:${m[1]}:motif`]) !== 942) {
                    return { actions: [], sans: "un test de domination est déjà en cours dans ce système pour un autre effet : attendez qu'il soit clos" };
                }

                return {
                    actions: [
                        ...(compteurs[`domination:${m[1]}`] ? [] : actionsOuvrirDomination(atelier.etat, Number(m[1]), atelier.moi, 942)),
                        { type: "compteur", id: cle, valeur: atelier.moi },
                    ],
                    avis: `Racket : test de domination ouvert (onglet Conflit). À sa clôture, si vous dominez, +${res} ressource(s) prises à ${atelier.nomDe(proprietaire)}.`,
                };
            },
            libelle: "Racket : réclamer les ressources (test de domination)",
        }),

    action("pluie-d-asteroides", "tech", 941, 1795076851750, "Pluie d'astéroïdes", "planete",
        "À côté d'une planète à portée 3 d'un champ d'astéroïdes non activé : le champ le plus proche est activé, un logisticien et un amiral sont usés, le marqueur « Ciblage astéroïde » est posé sur la planète.", {
            surPlanete: true,
            agent: LOGISTICIEN,
            visible: outils => !["sat", "spe"].includes(outils.contenu?.type),
            special: atelier => {

                const champ = atelier.cases()
                    .filter(x => x.systeme?.anomaly === "ast" && atelier.distance(x.numero, atelier.numero) <= 3 && !atelier.activee("hex:" + x.numero))
                    .sort((a, b) => atelier.distance(a.numero, atelier.numero) - atelier.distance(b.numero, atelier.numero))[0];

                const amiral = atelier.agent("amiral");
                const deja = (atelier.index.parZone.get(atelier.zone) || []).some(x => x.ref?.type === "token" && x.ref.id === 940);

                return {
                    actions: [
                        // (marqueur d'activation : miseEnPlace.js, ACTIVATION)
                        champ && { type: "creer", jeton: "activation", zone: "hex:" + champ.numero },
                        amiral && { type: "deplacer", c: amiral.id, vers: `joueur:${atelier.moi}:agentsUses` },
                        !deja && { type: "creer", ref: { type: "token", id: 940 }, zone: atelier.zone, proprio: atelier.moi },
                    ].filter(Boolean),
                    sans: deja
                        ? "cette planète porte déjà un marqueur « Ciblage astéroïde »"
                        : (!champ ? "aucun champ d'astéroïdes non activé à portée 3 de cette planète"
                            : (!amiral ? "vous n'avez pas d'amiral disponible (aucun ne sera usé)" : null)),
                    avis: champ ? `Pluie d'astéroïdes : champ d'astéroïdes de la ${atelier.nomCase(champ.numero)} activé, ciblage posé.` : "",
                };
            },
            libelle: "Pluie d'astéroïdes : poser le ciblage (use un logisticien et un amiral)",
        }),

    action("pluie-d-asteroides-frappe", "tech", 941, 1795076851750, "Pluie d'astéroïdes : frappe", "planete",
        "Bombardement, à côté d'une planète qui porte un marqueur « Ciblage astéroïde » : un dé par unité de la planète, 1 dégât sur 4 ou moins ; le marqueur est retiré.", {
            surPlanete: true,
            phase: "bombardement",
            visible: outils => (outils.index.parZone.get(outils.zone) || []).some(x => x.ref?.type === "token" && x.ref.id === 940),
            special: atelier => {

                const marqueurs = (atelier.index.parZone.get(atelier.zone) || []).filter(x => x.ref?.type === "token" && x.ref.id === 940);
                const unites = atelier.unites(atelier.zone);

                return {
                    actions: marqueurs.map(x => ({ type: "supprimer", c: x.id })),
                    sans: unites.length ? null : "aucune unité sur cette planète (le marqueur sera retiré)",
                    tirages: unites.map(x => tirageDegat(atelier, x, 4)),
                };
            },
            libelle: "Pluie d'astéroïdes : attaque 4 sur chaque unité de la planète",
        }),

    // --------------------------------------------------------
    // Lot du 18 novembre (suite) : décisions et cartes restantes
    // Les choix (« demande ») s'ouvrent dans l'onglet Décision (Decisions.jsx).
    // --------------------------------------------------------

    // ----- Omni-esprit d'Arborec -----

    effet("recomposition", 592, 1795073444383, "Recomposition", "nouveau",
        "Onglet Décision, à la fin des canons spatiaux et du combat spatial",
        "Le coût de vos unités biologiques détruites dans la phase est cumulé à « Terminer le combat ». L'onglet Décision propose le jet (autant de dés, réussite sur 3 ou moins), garde le nombre de réussites, puis laisse produire des vaisseaux dans le système choisi tant que leur coût cumulé tient dans ce nombre — un généticien (ou un logisticien) usé par vaisseau."),

    action("croissance", "tech", 593, 1795046343863, "Croissance", "unite",
        "Production, sur la fiche d'un de vos vaisseaux biologiques : la technologie est usée, le vaisseau est remplacé par un vaisseau biologique qui coûte jusqu'à 2 de plus (choix dans l'onglet Décision).", {
            phase: "production",
            use: true,
            cible: contenu => estVaisseauBio(contenu),
            ...choixCroissance,
            libelle: "Croissance : remplacer ce vaisseau (use la technologie)",
        }),

    action("croissance-geneticien", "tech", 593, 1795046343863, "Croissance (généticien)", "unite",
        "Production, sur la fiche d'un de vos vaisseaux biologiques : un généticien est usé, le vaisseau est remplacé par un vaisseau biologique qui coûte jusqu'à 2 de plus (choix dans l'onglet Décision).", {
            phase: "production",
            agent: { motif: "g[ée]n[ée]ticien", nom: "généticien", depense: false },
            cible: contenu => estVaisseauBio(contenu),
            ...choixCroissance,
            libelle: "Croissance : remplacer ce vaisseau (use un généticien)",
        }),

    // ----- Le Nomade -----

    action("contact-mercenaire", "tech", 789, 1795046343878, "Contact mercenaire", "systeme",
        "Diplomatie, dans un système à portée 2 d'un satellite que vous possédez : la technologie est usée, un vaisseau militaire de votre faction (choix dans l'onglet Décision) est produit dans le système, payé en influence.", {
            phase: "diplomatie",
            use: true,
            visible: outils => outils.numero !== null && outils.casesDeMesSatellites().some(n => outils.distance(n, outils.numero) <= 2),
            ...choixDansListe({
                titre: "Contact mercenaire : quel vaisseau militaire produire, payé en influence ?",
                options: vaisseauxMilitaires,
                libelle: (outils, u) => `${u.contenu.name} (${Number(u.contenu.cout) || 0} influence)`,
                vide: "votre faction n'a aucun vaisseau militaire",
                appliquer: (outils, choisi) => {

                    const cout = Number(choisi.contenu.cout) || 0;

                    return outils.compte("inf") < cout
                        ? { sans: `influence insuffisante : ${cout} à payer, vous avez ${outils.compte("inf")}` }
                        : {
                            cout: { inf: cout },
                            actions: [{ type: "creer", ref: { type: "unit", id: choisi.id }, zone: "hex:" + outils.numero, proprio: outils.moi }],
                            avis: `Contact mercenaire : ${choisi.contenu.name} produit pour ${cout} influence.`,
                        };
                },
            }),
            libelle: "Contact mercenaire : produire un vaisseau militaire (payé en influence)",
        }),

    action("calcul-de-probabilite", "tech", 804, 1794343421178, "Calcul de probabilité", "plateau",
        "Vous consultez, pour vous seul, les cartes face cachée du déroulé qui concernent le tour prochain (événement, objectif militaire…) : leur contenu s'affiche dans votre journal.", {
            special: atelier => {

                const suivant = atelier.etat.tour + 1;
                const zones = [...atelier.index.parZone]
                    .filter(([zone, contenu]) => new RegExp(`^general:[\\w-]+:${suivant}$`).test(zone) &&
                        contenu.some(x => x.cache || x.face === "cache"))
                    .map(([zone]) => zone);

                return {
                    actions: zones.map(zone => ({ type: "consulter", zone })),
                    sans: zones.length ? null : "aucune carte face cachée du déroulé ne concerne le tour prochain",
                    avis: `Calcul de probabilité : ${zones.length} case(s) du tour ${suivant} consultée(s) — leur contenu est dans votre journal (vous seul le voyez).`,
                };
            },
            libelle: "Calcul de probabilité : consulter les cartes du tour prochain",
        }),

    // ----- Volée argentée -----

    action("seigneur", "habilite", 168, 1795068317090, "Seigneur", "plateau",
        "Quand vous détruisez un vaisseau amiral ou un soleil de guerre, gagnez un vote de siège ou obtenez un vassal : un de vos agents disponibles du type voulu (choix dans l'onglet Décision) devient un Seigneur.", {
            demande: {
                question: () => "Seigneur : quel agent transformer en Seigneur ?\n" +
                    "1 = Amiral (vous avez détruit un vaisseau amiral ou un soleil de guerre)\n" +
                    "2 = Politique (vous avez gagné un vote de siège au conseil)\n" +
                    "3 = Diplomate (vous avez obtenu un vassal, une fois par faction)",
                max: () => 1,
            },
            calcul: (outils, x) => {

                if (x === undefined) {
                    return {};
                }

                const motif = [/amiral/i, /politique/i, /diplomate/i][x - 1];
                const agent = motif && mesAgentsDisponibles(outils).find(a => motif.test(outils.nom(a.ref)));

                return agent
                    ? {
                        actions: [{ type: "remplacer", c: agent.id, ref: { type: "agent", id: 169 } }],
                        avis: `Seigneur : votre ${outils.nom(agent.ref)} devient un Seigneur.`,
                    }
                    : { sans: "vous n'avez pas d'agent de ce type disponible" };
            },
            libelle: "Seigneur : transformer un agent",
        }),

    action("vassalisation-forcee", "habilite", 166, 1795072921253, "Vassalisation forcée", "plateau",
        "Diplomatie : un diplomate est dépensé, la promesse Vassal de la faction choisie (onglet Décision) arrive dans vos éléments actifs, avec son marqueur. " +
        "La condition est comptée : les systèmes où elle possède une planète et dont vous contrôlez l'espace (son système natal compte pour 3), 5 au moins. " +
        "Un système disputé demande d'abord son conflit de contrôle : « Vassalisation forcée : contrôles » les ouvre. Total insuffisant : l'outil le signale et laisse faire.", {
            phase: "diplomatie",
            agent: { motif: "diplomate", nom: "diplomate", depense: true },
            ...choixDansListe({
                titre: "Vassalisation forcée : quelle faction devient votre vassal ?",
                options: autresJoueurs,
                libelle: (outils, j) => j.nom,
                vide: "aucune autre faction dans la partie",
                appliquer: (outils, cible) => {

                    // Le contrôle comme état : un test dans chaque système où la faction possède une planète
                    const bilan = systemesAVassaliser(outils, cible);

                    if (bilan.aTrancher.length) {
                        return {
                            actions: [],
                            sans: `${bilan.aTrancher.length} système(s) disputé(s) (${bilan.aTrancher.map(x => outils.nomCase(x.numero)).join(", ")}) : ` +
                                "ouvrez et concluez d'abord leurs conflits de contrôle (« Vassalisation forcée : contrôles »)",
                        };
                    }

                    const local = "t" + Date.now();

                    return {
                        actions: [
                            { type: "creer", ref: { type: "Promesse", id: 224 }, zone: `joueur:${outils.moi}:actif`, proprio: outils.moi, idLocal: local },
                            // (marqueur de faction : miseEnPlace.js, MARQUEUR)
                            { type: "creer", jeton: "marqueur", sur: local, proprio: cible.userId },
                        ],
                        avis: `Vassalisation forcée : ${cible.nom} devient votre vassal (promesse Vassal dans vos éléments actifs). Pensez à « Seigneur » pour un diplomate.` +
                            (bilan.total >= 5 ? "" : ` Attention : d'après l'outil vous ne contrôlez que ${bilan.total} sur 5 (système natal : 3) — à vérifier.`),
                    };
                },
            }),
            libelle: "Vassalisation forcée : faire un vassal (dépense un diplomate)",
        }),

    action("vassalisation-forcee-controles", "habilite", 166, 1795072921253, "Vassalisation forcée : contrôles", "plateau",
        "Diplomatie : ouvre un conflit de contrôle « Vassalisation forcée » dans chaque système disputé où la faction choisie possède une planète. Une fois conclus, « Vassalisation forcée » compte les systèmes que vous contrôlez.", {
            phase: "diplomatie",
            ...choixDansListe({
                titre: "Vassalisation forcée : les systèmes de quelle faction faut-il contrôler ?",
                options: autresJoueurs,
                libelle: (outils, j) => j.nom,
                vide: "aucune autre faction dans la partie",
                appliquer: (outils, cible) => {

                    const bilan = systemesAVassaliser(outils, cible);
                    const disputes = bilan.systemes.filter(x => x.controle === "dispute");

                    return {
                        actions: outils.ouvrirControles(disputes.map(x => x.numero), "vassalisation-forcee"),
                        sans: disputes.length ? null : `aucun système de ${cible.nom} n'est à trancher (vous en contrôlez ${bilan.total} sur 5)`,
                        avis: `Vassalisation forcée : ${disputes.length} conflit(s) de contrôle ouvert(s) (onglet Conflit). Vous contrôlez déjà ${bilan.total} sur 5.`,
                    };
                },
            }),
            libelle: "Vassalisation forcée : ouvrir les conflits de contrôle",
        }),

    // ----- Kabal de l'ombre -----

    action("executer-les-otages", "habilite", 158, 1794335054823, "Exécuter les otages", "plateau",
        "Prévote : un de vos esclaves de la faction choisie (onglet Décision) est dépensé ; elle doit appliquer un vote de plus à l'issue que vous annoncez, ou gagner un point d'infamie (à la main).", {
            phase: "prevote",
            ...choixDansListe({
                titre: "Exécuter les otages : de quelle faction dépenser un esclave ?",
                options: otages,
                libelle: (outils, g) => `${g.nom} (${g.esclaves.length} esclave(s))`,
                vide: "vous n'avez aucun esclave d'une autre faction",
                appliquer: (outils, groupe) => ({
                    actions: [{ type: "supprimer", c: groupe.esclaves[0].id }],
                    avis: `Exécuter les otages : ${groupe.nom} doit appliquer 1 vote de plus à l'issue que vous annoncez, ou gagner 1 point d'infamie.`,
                }),
            }),
            libelle: "Exécuter les otages : dépenser un esclave",
        }),

    action("restituer-les-otages", "habilite", 159, 1794335054824, "Restituer les otages", "unite",
        "Lors d'une livraison, sur la fiche de votre unité qui livre : jusqu'à 2 de vos esclaves de la faction à comptoir du système lui sont rendus, posés avec son comptoir (sur la planète, ou à bord).", {
            cible: contenu => /#livr\(/i.test(contenu?.habilite || ""),
            visible: outils => outils.esclaves().length > 0,
            special: atelier => {

                const m = /^hex:(\d+)/.exec(atelier.c?.zone || "");

                const comptoirs = !m ? [] : dansLeSysteme(atelier.index, Number(m[1])).filter(x => x.ref?.type === "unit" &&
                    campDe(x) > 0 && campDe(x) !== atelier.moi && /#comp\b/i.test(atelier.contenuDe(x.ref.id)?.habilite || ""));

                const comptoir = comptoirs.find(x => atelier.esclaves().some(e => campDe(e) === campDe(x)));
                const rendus = comptoir ? atelier.esclaves().filter(e => campDe(e) === campDe(comptoir)).slice(0, 2) : [];

                return {
                    actions: rendus.flatMap(e => [
                        /:planete:/.test(comptoir.zone || "")
                            ? { type: "deplacer", c: e.id, vers: comptoir.zone }
                            : { type: "deplacer", c: e.id, sur: comptoir.id },
                        e.marques?.possession !== undefined && { type: "marquer", c: e.id, marque: "possession", valeur: null },
                    ].filter(Boolean)),
                    sans: comptoir ? null : "aucune faction à comptoir de ce système dont vous ayez des esclaves",
                    avis: comptoir ? `Restituer les otages : ${rendus.length} infanterie(s) rendue(s) à ${atelier.nomDe(campDe(comptoir))}.` : "",
                };
            },
            libelle: "Restituer les otages : rendre jusqu'à 2 esclaves",
        }),

    // ----- Aide humanitaire -----

    action("aide-humanitaire-livrer", "habilite", 404, 1795069498037, "Aide humanitaire : livrer", "unite",
        "Sur la fiche d'une de vos unités à livraison, dans un système à trou de ver alpha ou bêta : elle livre son commerce à l'aide humanitaire (négociant usé, unité dépensée ou usée, comme une livraison). Le total par faction est compté pour le décompte.", {
            cible: contenu => /#livr\(\d+\)/i.test(contenu?.habilite || ""),
            visible: outils => {
                const m = /^hex:(\d+)/.exec(outils.c?.zone || "");
                return !!m && aTrouDeVer(outils.index, outils.systemeDe(Number(m[1])), Number(m[1]), [25, 26], [826, 827]);
            },
            special: atelier => {

                const texte = atelier.contenu?.habilite || "";
                const valeur = Number(/#livr\((\d+)\)/i.exec(texte)?.[1]) || 0;
                const negociant = /#use\s*#neg/i.test(texte) ? atelier.agent(MOTIF_NEGOCIANT) : null;
                const depensee = /#spend[^<]*#livr/i.test(texte);

                return {
                    actions: [
                        negociant && { type: "deplacer", c: negociant.id, vers: `joueur:${atelier.moi}:agentsUses` },
                        { type: "compteur", id: `aide:${atelier.moi}`, delta: valeur },
                        depensee ? { type: "supprimer", c: atelier.c.id } : { type: "marquer", c: atelier.c.id, marque: "use", valeur: true },
                    ].filter(Boolean),
                    sans: atelier.etat.compteurs["aide:fait"]
                        ? "le décompte de l'aide humanitaire est déjà fait"
                        : (/#use\s*#neg/i.test(texte) && !negociant ? "vous n'avez pas de négociant disponible (aucun ne sera usé)"
                            : (!depensee && atelier.usee(atelier.c) ? "cette unité est déjà usée" : null)),
                    avis: `Aide humanitaire : ${valeur} commerce livré (total : ${(Number(atelier.etat.compteurs[`aide:${atelier.moi}`]) || 0) + valeur}).`,
                };
            },
            libelle: "Aide humanitaire : livrer sur le trou de ver",
        }),

    // (carte « Bilan de l'aide humanitaire », posée trois tours après « Aide humanitaire »)
    action("aide-humanitaire-decompte", "habilite", 1038, 1795069498039, "Bilan de l'aide humanitaire", "carte",
        "Chaque faction marque 1 point par 4 commerce livrés à l'aide humanitaire ; celle qui en a livré le plus (seule) gagne une faveur neutre. Les cartes « Aide humanitaire » et « Bilan de l'aide humanitaire » sont retirées.", {
            special: atelier => {

                if (atelier.etat.compteurs["aide:fait"]) {
                    return { actions: [], sans: "le décompte de l'aide humanitaire est déjà fait" };
                }

                const livres = atelier.joueurs.map(j => ({ u: j.userId, n: Number(atelier.etat.compteurs[`aide:${j.userId}`]) || 0 }));
                const premiers = lesPremiers(livres);

                return {
                    actions: [
                        ...livres.flatMap(x => atelier.points(x.u, Math.floor(x.n / 4))),
                        // (faveur neutre : jeton sans propriétaire — miseEnPlace.js, FAVEUR)
                        ...(premiers.length === 1 ? [{ type: "creer", jeton: "faveur", zone: `joueur:${premiers[0].u}:faveurs` }] : []),
                        { type: "compteur", id: "aide:fait", valeur: 1 },
                        // Les deux cartes de l'événement quittent le jeu
                        ...Object.values(atelier.etat.composants)
                            .filter(x => x.ref?.type === "habilite" && [404, 1038].includes(x.ref.id))
                            .map(x => ({ type: "supprimer", c: x.id })),
                    ],
                    avis: "Aide humanitaire : " + livres.map(x => `${atelier.nomDe(x.u)} ${x.n} livré(s), +${Math.floor(x.n / 4)} point(s)`).join(" ; ") +
                        (premiers.length === 1 ? ` — faveur neutre pour ${atelier.nomDe(premiers[0].u)}.` : " — pas de faveur neutre (égalité ou aucune livraison)."),
                };
            },
            libelle: "Aide humanitaire : faire le décompte",
        }),

    // ----- Tempête spatiale -----

    effet("station-meteorologique-technologie", 445, 1794343420996, "Station météorologique", "modifie",
        "Production (case « Production » de la réserve)",
        "Vous pouvez produire des Stations météorologiques."),

    regle("station-meteorologique-production", "unit", 444, 1795046343838, "Station météorologique (production)", "modifie",
        "Production (case « Production » de la réserve)",
        "Produire une Station météorologique demande la technologie « Station météorologique » : sinon la production demande une confirmation."),

    // ----- Les Empyréens (WIP) -----

    regle("emanation-du-vide", "habilite", 926, 1795039776984, "Émanation du vide", "auto",
        "Espace : déplacement assisté",
        "Les nébuleuses ne gênent pas vos déplacements : y entrer ou en sortir ne met pas fin au mouvement."),

    action("fouille-des-nebuleuses", "tech", 959, 1795046343900, "Fouille des nébuleuses", "systeme",
        "Science, dans une nébuleuse : use un scientifique et active la nébuleuse, vous gagnez un fragment spatial.", {
            phase: "science",
            agent: SCIENTIFIQUE,
            activer: true,
            visible: dansUneNebuleuse,
            // (jeton du fragment spatial : miseEnPlace.js, FRAGMENTS.spa)
            special: atelier => ({
                actions: [{ type: "creer", jeton: "Fragment spatial", zone: `joueur:${atelier.moi}:fragments` }],
                avis: "Fouille des nébuleuses : +1 fragment spatial.",
            }),
            libelle: "Fouille des nébuleuses : +1 fragment spatial (use un scientifique, active la nébuleuse)",
        }),

    // --------------------------------------------------------
    // Promesses (19 novembre)
    // Les boutons d'une promesse sont sur sa fiche, chez la faction qui la détient.
    // --------------------------------------------------------

    // ----- Redevance de protection (Pirate Mentak) -----

    action("redevance-de-protection-payer", "Promesse", 226, 1795072921263, "Redevance de protection : payer", "carte",
        "Ravitaillement, une fois par tour : 2 commerce sont transférés au Pirate Mentak pour garder la promesse.", {
            phase: "ravit",
            nomPhase: "ravitaillement",
            cout: { commerce: 2 },
            parTour: true,
            special: atelier => {
                const mentak = atelier.donneur(atelier.c);

                return {
                    actions: mentak ? [{ type: "compteur", id: `joueur:${mentak}:commerce`, delta: 2 }] : [],
                    sans: mentak ? null : "aucun marqueur de faction sur cette promesse (les 2 commerce ne seront donnés à personne)",
                    avis: mentak ? `Redevance de protection : 2 commerce transférés à ${atelier.nomDe(mentak)}.` : "",
                };
            },
            libelle: "Redevance de protection : payer 2 commerce au Mentak",
        }),

    action("redevance-de-protection-rendre", "Promesse", 226, 1795072921263, "Redevance de protection : rendre", "carte",
        "Ravitaillement, à la place du paiement — ou si vous engagez ou bloquez les Mentaks : la promesse est dépensée (retour à la réserve). Dépensée d'office quand votre blocage porte contre eux (déplacement ou test de blocage d'une action) ; le bouton reste pour un engagement.", {
            special: atelier => ({
                actions: rendrePromesse(atelier),
                avis: "Redevance de protection : promesse dépensée, de retour à la réserve.",
            }),
            libelle: "Redevance de protection : dépenser la promesse (sans payer)",
        }),

    action("redevance-de-protection-rompue", "Promesse", 226, 1795072921263, "Redevance de protection : le Mentak y met fin", "carte",
        "Ravitaillement : le Pirate Mentak met fin à la promesse — elle retourne à la réserve et il gagne 1 infamie.", {
            special: promesseRompue,
            libelle: "Le Mentak met fin à la redevance (il gagne 1 infamie)",
        }),

    // ----- Soutien politique -----

    action("soutien-politique-annoncer", "Promesse", 227, 1795076851651, "Soutien politique : annoncer", "carte",
        "Prévote : la promesse est engagée (carte usée) et vous annoncez une issue — la loi et le vote se choisissent dans l'onglet Décision ; la faction qui l'a faite doit y mettre autant de voix que la valeur de la promesse.", {
            phase: "prevote",
            visible: outils => !outils.c?.marques?.use,
            demandes: [
                { question: outils => questionLoi("Soutien politique", outils), max: () => 1 },
                { question: outils => questionColonne("Soutien politique", outils), max: () => 1 },
            ],
            calcul: (outils, xs) => {

                if (!xs) {
                    return outils.c?.marques?.use ? { sans: "cette promesse est déjà engagée" } : {};
                }

                const [loi, col] = xs;
                const donneur = donneurDe(outils);

                return {
                    // (issue annoncée : loi, colonne à partir de 1, tour — pour « régler »)
                    actions: [
                        { type: "marquer", c: outils.c.id, marque: "use", valeur: true },
                        { type: "marquer", c: outils.c.id, marque: "voteLoi", valeur: loi },
                        { type: "marquer", c: outils.c.id, marque: "voteCol", valeur: col },
                        { type: "marquer", c: outils.c.id, marque: "voteTour", valeur: outils.etat.tour },
                    ],
                    avis: `Soutien politique : issue annoncée — loi ${loi}, « ${COLONNES_VOTE[col - 1]} ». ${donneur ? outils.nomDe(donneur) : "La faction"} doit y mettre ` +
                        `${outils.c?.marques?.valeur ? outils.c.marques.valeur + " voix" : "la valeur de la promesse"}, ou gagner 1 infamie.`,
                };
            },
            libelle: "Soutien politique : engager la promesse (annoncer une issue)",
        }),

    action("soutien-politique-regler", "Promesse", 227, 1795076851651, "Soutien politique : régler", "carte",
        "Après le vote, plateaux révélés : le décompte dit si la faction a mis assez de voix sur l'issue annoncée — la promesse retourne à la réserve, et la faction gagne 1 infamie si elle n'a pas tenu.", {
            visible: outils => !!outils.c?.marques?.use && !!outils.c?.marques?.voteLoi,
            special: atelier => {

                const m = atelier.c?.marques || {};
                const donneur = atelier.donneur(atelier.c);
                const valeur = Number(m.valeur) || 0;

                if (Number(m.voteTour) !== atelier.etat.tour) {
                    return { actions: [], sans: "l'issue a été annoncée à un autre tour : réglez avec « respecté » ou « non respecté »" };
                }

                if (!donneur || !valeur) {
                    return { actions: [], sans: "la valeur de la promesse (marque « valeur ») ou son marqueur manque : réglez avec « respecté » ou « non respecté »" };
                }

                const voix = atelier.votes().voix(Number(m.voteLoi), Number(m.voteCol) - 1, donneur);
                const tenue = voix >= valeur;
                const rompue = promesseRompue(atelier);

                return {
                    actions: [
                        ...effacerVote(atelier.c),
                        ...(tenue ? rendrePromesse(atelier) : rompue.actions),
                    ],
                    sans: atelier.voteRevele(donneur) ? null : `le plateau de vote de ${atelier.nomDe(donneur)} n'est pas révélé (ses voix ne sont pas connues)`,
                    avis: `Soutien politique : ${atelier.nomDe(donneur)} a mis ${voix} voix sur ${valeur} dues — ` +
                        (tenue ? "promesse tenue, elle retourne à la réserve." : "promesse non tenue : 1 infamie."),
                };
            },
            libelle: "Soutien politique : régler d'après le décompte",
        }),

    action("soutien-politique-respecte", "Promesse", 227, 1795076851651, "Soutien politique : respecté", "carte",
        "Après le vote : la faction a voté à hauteur de la promesse, qui retourne à la réserve.", {
            visible: outils => !!outils.c?.marques?.use,
            special: atelier => ({
                actions: [
                    ...effacerVote(atelier.c),
                    ...rendrePromesse(atelier),
                ],
                avis: "Soutien politique : respecté, la promesse retourne à la réserve.",
            }),
            libelle: "Soutien politique : respecté (retour à la réserve)",
        }),

    action("soutien-politique-rompu", "Promesse", 227, 1795076851651, "Soutien politique : non respecté", "carte",
        "Après le vote : la faction n'a pas voté à hauteur de la promesse — elle retourne à la réserve et cette faction gagne 1 infamie.", {
            visible: outils => !!outils.c?.marques?.use,
            special: atelier => {
                const rompue = promesseRompue(atelier);

                return { ...rompue, actions: [...effacerVote(atelier.c), ...rompue.actions] };
            },
            libelle: "Soutien politique : non respecté (la faction gagne 1 infamie)",
        }),

    // ----- Mercenaires qui votent (décompte : Vote.jsx) -----

    action("zeu", "mercenaire", 294, 1795076851673, "Z'eu", "carte",
        "Vote : son cube part dans les agents usés, X commerce sont dépensés (4 au plus) pour X voix de plus sur la loi et le vote choisis (onglet Décision), ajoutées à votre colonne du décompte.", {
            phase: "phase de vote",
            nomPhase: "vote",
            use: true,
            demandes: [
                {
                    question: "Z'eu : combien de commerce dépenser (1 voix chacun, 4 au plus) ?",
                    max: outils => Math.max(1, Math.min(4, outils.compte("commerce"))),
                },
                { question: outils => questionLoi("Z'eu", outils), max: () => 1 },
                { question: outils => questionColonne("Z'eu", outils), max: () => 1 },
            ],
            calcul: (outils, xs) => {

                if (!xs) {
                    return outils.compte("commerce") > 0 ? {} : { sans: "vous n'avez aucun commerce" };
                }

                const [x, loi, col] = xs;

                return x > Math.min(4, outils.compte("commerce"))
                    ? { sans: `commerce insuffisant ou plus de 4 : ${x} demandé, vous en avez ${outils.compte("commerce")}` }
                    : {
                        cout: { commerce: x },
                        // (ajustement de mes voix : compteur vote:<tour>:<loi>:<colonne>:<joueur>)
                        actions: [{ type: "compteur", id: `vote:${outils.etat.tour}:${loi}:${col - 1}:${outils.moi}`, delta: x }],
                        avis: `Z'eu : ${x} voix de plus — loi ${loi}, « ${COLONNES_VOTE[col - 1]} ».`,
                    };
            },
            libelle: "Z'eu : X commerce → X voix",
        }),

    regle("harrugh-gefhara", "mercenaire", 300, 1795076851678, "Harrugh Gefhara", "auto",
        "En-tête : « Phase suivante », en quittant la phase de vote",
        "Vous gagnez 1 commerce par loi résolue selon votre vote majoritaire (la colonne où vous avez, seule, le plus de voix)."),

    regle("ilyane-vorsk-votes", "mercenaire", 910, 1795076851749, "Ilyane Vorsk : votes", "auto",
        "Onglet Vote : décompte",
        "Son cube noir (ou sa carte) posé sur une case de votre plateau de vote compte comme un politicien, et rapporte 1 voix de plus par autre faction dont c'est le vote majoritaire."),

    // ----- Mandats des Winnu -----

    regle("concession-commerciale", "Promesse", 228, 1795046343641, "Concession commerciale", "modifie",
        "Fiche d'une unité à livraison : faction livrée",
        "Vous comptez comme ayant un comptoir sur Mecatol Rex : une unité qui livre dans son système peut vous livrer (mandat non épuisé)."),

    regle("protecteur-de-l-empire", "Promesse", 368, 1795046343820, "Protecteur de l'empire", "nouveau",
        "Conflit, combats spatial et terrestre : boutons sous le combat",
        "Contre une faction qui a plus d'infamie que vous : « Protecteur de l'empire » use un politique, +1 au combat pour vos unités ce combat. Le Winnu a le même bouton pour vous : les deux se cumulent (+2)."),

    action("pupille-de-l-empire", "Promesse", 369, 1794047595225, "Pupille de l'empire", "carte",
        "Revendication, quand on vous conquiert une planète : vous désignez la faction (onglet Décision) ; le Winnu choisit alors, dans son onglet Décision, d'user un politique (elle gagne 1 infamie) ou de gagner lui-même 1 infamie.", {
            phase: "revendication",
            demande: {
                question: outils => "Pupille de l'empire : quelle faction vous a conquis une planète ?\n" +
                    autresJoueurs(outils).map((j, k) => `${k + 1} = ${j.nom}`).join("\n"),
                max: () => 1,
            },
            calcul: (outils, x) => {

                const autres = autresJoueurs(outils);
                const winnu = donneurDe(outils);

                if (x === undefined) {
                    return !winnu
                        ? { sans: "aucun marqueur de faction sur cette promesse" }
                        : (outils.etat.compteurs[`pupille:${winnu}`] ? { sans: "le Winnu n'a pas encore répondu à la demande précédente" } : {});
                }

                const conquerant = autres[x - 1];

                return conquerant && winnu
                    ? {
                        actions: [
                            { type: "compteur", id: `pupille:${winnu}`, valeur: outils.moi },
                            { type: "compteur", id: `pupille:${winnu}:par`, valeur: conquerant.userId },
                        ],
                        avis: `Pupille de l'empire : ${outils.nomDe(winnu)} doit choisir (onglet Décision) — user un politique, ou gagner 1 infamie.`,
                    }
                    : { sans: "choix invalide" };
            },
            libelle: "Pupille de l'empire : on m'a conquis une planète",
        }),

    // ----- Volée argentée -----

    action("embuscade", "Promesse", 262, 1795072921265, "Embuscade", "carte",
        "Après le déplacement, dans un système où vous avez des unités (choix dans l'onglet Décision) : la Volée argentée choisit, dans son onglet Décision, de poser un de ses destroyers (un logisticien usé, 2 ressources) ou de gagner 1 infamie. Le destroyer est à vous pour ce combat spatial (frappe en premier, +2), puis lui est rendu.", {
            demande: {
                question: outils => "Embuscade : dans quel système (où vous avez des unités) ?\n" +
                    outils.mesCases().map((n, k) => `${k + 1} = ${outils.nomCase(n)}`).join("\n"),
                max: () => 1,
            },
            calcul: (outils, x) => {

                const cases = outils.mesCases();
                const volee = donneurDe(outils);

                if (x === undefined) {
                    return !volee
                        ? { sans: "aucun marqueur de faction sur cette promesse" }
                        : (outils.etat.compteurs[`embuscade:${volee}`] ? { sans: "la Volée n'a pas encore répondu à la demande précédente" }
                            : (cases.length ? {} : { sans: "vous n'avez d'unité dans aucun système" }));
                }

                const numero = cases[x - 1];

                return numero !== undefined && volee
                    ? {
                        actions: [
                            { type: "compteur", id: `embuscade:${volee}`, valeur: outils.moi },
                            { type: "compteur", id: `embuscade:${volee}:case`, valeur: numero + 1 },
                        ],
                        avis: `Embuscade : ${outils.nomDe(volee)} doit choisir (onglet Décision) — poser un destroyer, ou gagner 1 infamie.`,
                    }
                    : { sans: "choix invalide" };
            },
            libelle: "Embuscade : demander un destroyer à la Volée",
        }),

    // ----- Kabal de l'ombre -----

    regle("commerce-d-esclave", "Promesse", 336, 1795073444379, "Commerce d'esclave", "nouveau",
        "Conflit, combat terrestre : ligne d'une infanterie détruite",
        "Pour chaque infanterie que vous détruisez : « Commerce d'esclave : jet » — sur 2 ou moins, « Terminer le combat » l'envoie chez la Kabal de l'ombre (esclave) et vous donne une dette de 1 de la Kabal, à payer dans 3 tours."),

    // ----- Partage de technologie -----

    regle("partage-de-technologie", "Promesse", 421, 1795046343643, "Partage de technologie", "auto",
        "Onglet Technologie : votre marqueur de faction posé sur une technologie débloquée de l'autre faction",
        "Tant que l'alliance est en jeu entre vous deux, la faction qui pose son marqueur sur une technologie débloquée de l'autre en profite : ses scripts jouent pour elle."),

    // ----- Tuteur des réfugiés -----

    action("tuteur-des-refugies-attaque", "Promesse", 454, 1795202001294, "Tuteur des réfugiés : engagement", "carte",
        "Si vous engagez vos Réfugiés : la promesse est dépensée (retour à la réserve) et vous gagnez 1 infamie.", {
            special: atelier => ({
                actions: [
                    ...rendrePromesse(atelier),
                    ...atelier.infamie(atelier.moi, 1),
                ],
                avis: "Tuteur des réfugiés : promesse dépensée, vous gagnez 1 infamie.",
            }),
            libelle: "Tuteur des réfugiés : j'engage mes Réfugiés (+1 infamie, promesse dépensée)",
        }),

    action("tuteur-des-refugies-faveur", "Promesse", 454, 1795202001294, "Tuteur des réfugiés : faveur", "planete",
        "Phase d'événement, à côté d'une planète qui porte un Entrepôt d'aide : l'entrepôt est usé, 4 commerce posés dessus sont dépensés, vous gagnez une faveur des Réfugiés.", {
            surPlanete: true,
            phase: "[ée]v[ée]nement",
            nomPhase: "événement",
            visible: outils => outils.ici(836) > 0,
            special: atelier => {

                const entrepot = atelier.unites(atelier.zone).find(x => x.ref.id === 836);
                const jetons = !entrepot ? [] : Object.values(atelier.etat.composants)
                    .filter(x => !x.ref && x.jeton === "Commerce" && x.sur === entrepot.id);

                // 4 commerce pris sur les jetons posés sur l'entrepôt
                let reste = 4;
                const paiement = [];

                for (const jeton of jetons) {
                    const montant = Number(jeton.marques?.montant) || 0;
                    const pris = Math.min(montant, reste);

                    if (pris > 0) {
                        reste -= pris;
                        paiement.push(pris >= montant
                            ? { type: "supprimer", c: jeton.id }
                            : { type: "marquer", c: jeton.id, marque: "montant", valeur: montant - pris });
                    }
                }

                const refugies = Number(atelier.contenuDe(836)?.lienElement?.id) || 0;

                return {
                    actions: [
                        ...paiement,
                        ...(entrepot ? atelier.user(entrepot) : []),
                        // (faveur d'une faction neutre : jeton sans propriétaire, marque « neutre »)
                        { type: "creer", jeton: "faveur", zone: `joueur:${atelier.moi}:faveurs`, ...(refugies ? { marques: { neutre: refugies } } : {}) },
                    ],
                    sans: !entrepot ? "aucun Entrepôt d'aide sur cette planète"
                        : (atelier.usee(entrepot) ? "cet Entrepôt d'aide est déjà usé"
                            : (reste > 0 ? `il faut 4 commerce posés sur l'entrepôt, il y en a ${4 - reste} (seuls ceux-là seront dépensés)` : null)),
                    avis: "Tuteur des réfugiés : +1 faveur des Réfugiés.",
                };
            },
            libelle: "Tuteur des réfugiés : faveur (use l'entrepôt, 4 commerce posés dessus)",
        }),

    // ----- Fantômes de Creuss, Empyréens -----

    effet("navigation-delta", 871, 1794343421188, "Navigation delta", "auto",
        "Espace : déplacement assisté",
        "Vous pouvez emprunter les trous de ver delta. Sans elle (ni la promesse Passage de Creuss), une étape par un trou de ver delta demande une confirmation."),

    regle("passage-de-creuss", "Promesse", 870, 1794336141948, "Passage de Creuss", "auto",
        "Espace : déplacement assisté",
        "Vous pouvez emprunter les trous de ver delta."),

    regle("conspirer-ensemble", "Promesse", 963, 1795039776981, "Conspirer ensemble", "auto",
        "Onglet Vote : décompte",
        "Pour chaque loi, si votre vote majoritaire (la colonne où vous avez, seule, le plus de voix) est le même que celui des Empyréens, vous avez 1 voix de plus dans cette colonne — une fois les deux plateaux révélés."),

    regle("chemin-du-vide", "Promesse", 964, 1795072921254, "Chemin du vide", "auto",
        "Espace : déplacement assisté",
        "Les anomalies que contrôlent les Empyréens ne gênent pas vos déplacements : supernova, champ d'astéroïdes, nébuleuse. Ils y ont une unité et personne d'autre que vous ne peut s'y opposer, ou ils y ont gagné leur conflit de contrôle à cette phase ; une anomalie disputée gêne tant que ce conflit (bouton « Ouvrir le conflit de contrôle » du déplacement assisté) n'est pas conclu."),

    // ----- Braises de Muaat (WIP) : habilité et forge d'arme -----

    regle("physiologie-gashlai", "habilite", 1022, 1795042399686, "Physiologie gashlai", "auto",
        "Espace : déplacement assisté",
        "Les supernovas ne bloquent pas vos déplacements."),

    action("etude-de-la-forge", "habilite", 1023, 1795046343903, "Étude de la forge", "systeme",
        "Science : use un scientifique et active une supernova : 4 de recherche de forge d'arme.", {
            feuille: "forge",
            phase: "science",
            agent: SCIENTIFIQUE,
            activer: true,
            recherche: [["forge", 4]],
            visible: outils => outils.systeme?.anomaly === "sup",
            libelle: "Étude de la forge : +4 recherche de forge d'arme (use un scientifique)",
        }),

    effet("reacteurs-solaires", 1025, 1795042399692, "Réacteurs solaires", "auto",
        "Espace : déplacement assisté",
        "Vos soleils de guerre ont +1 en mouvement."),

    effet("coque-stellaire", 1026, 1795042399695, "Coque stellaire", "auto",
        "Conflit, déplacement, fiche d'une unité : résistance",
        "Vos soleils de guerre ont +1 en résistance."),

    effet("armement-solaire", 1027, 1795042399696, "Armement solaire", "auto",
        "Conflit : combat spatial",
        "Vos soleils de guerre ont +2 au combat spatial."),

    // ----- Héritiers de Winnu : Mandat -----

    regle("mandat", "habilite", 146, 1795072921249, "Mandat", "modifie",
        "Onglet Transactions : donner un mandat (promesse de type mandat)",
        "Un mandat ne se donne que si vous avez la possession de Mecatol Rex, dans une transaction que vous proposez (vos diplomates), à une faction qui n'en a pas déjà un : sinon la transaction l'indique et demande une confirmation à l'application."),

    action("mandat-revoquer", "habilite", 146, 1795072921249, "Mandat : révoquer", "plateau",
        "Diplomatie : use un diplomate, le mandat choisi (onglet Décision) quitte la faction qui le détient et revient dans votre main ; ses marqueurs sont retirés.", {
            phase: "diplomatie",
            agent: DIPLOMATE,
            visible: outils => mandatsDonnes(outils).length > 0,
            ...choixDansListe({
                titre: "Mandat : lequel révoquer ?",
                options: mandatsDonnes,
                libelle: (outils, x) => `${outils.nom(x.ref)} (${outils.nomDe(Number(/^joueur:(\d+):/.exec(x.zone)[1]))})`,
                vide: "aucun mandat n'est détenu par une autre faction",
                appliquer: (outils, carte) => ({
                    actions: [
                        ...Object.values(outils.etat.composants).filter(m => m.sur === carte.id).map(m => ({ type: "supprimer", c: m.id })),
                        carte.marques?.use && { type: "marquer", c: carte.id, marque: "use", valeur: false },
                        { type: "deplacer", c: carte.id, vers: `joueur:${outils.moi}:main` },
                    ].filter(Boolean),
                    avis: `Mandat : ${outils.nom(carte.ref)} révoqué, de retour dans votre main.`,
                }),
            }),
            libelle: "Mandat : révoquer un mandat (use un diplomate)",
        }),

    action("mandat-epuiser", "habilite", 146, 1795072921249, "Mandat : Mecatol Rex", "plateau",
        "Si vous perdez la possession de Mecatol Rex, vos mandats sont épuisés (cartes usées chez leurs détenteurs) ; ils le restent tant que vous ne la reprenez pas. Le bouton les épuise ou les rétablit selon que vous possédez Mecatol Rex.", {
            visible: outils => mandatsDonnes(outils).some(x => !!x.marques?.use === outils.aCarte("planet", 34)),
            special: atelier => {

                const mecatol = atelier.proprietaire(34) === atelier.moi;
                const mandats = mandatsDonnes(atelier).filter(x => !!x.marques?.use === mecatol);

                return {
                    actions: mandats.map(x => ({ type: "marquer", c: x.id, marque: "use", valeur: !mecatol })),
                    avis: mecatol
                        ? `Mandat : vous contrôlez Mecatol Rex, ${mandats.length} mandat(s) rétabli(s).`
                        : `Mandat : vous ne contrôlez plus Mecatol Rex, ${mandats.length} mandat(s) épuisé(s).`,
                };
            },
            calcul: outils => ({
                libelle: outils.aCarte("planet", 34)
                    ? "Mandat : rétablir vos mandats (vous contrôlez Mecatol Rex)"
                    : "Mandat : épuiser vos mandats (vous ne contrôlez plus Mecatol Rex)",
            }),
        }),

    // ----- Conclave secret (faction neutre #718) -----

    action("achat-de-votes", "habilite", 722, 1795046343864, "Achat de votes", "bandeau",
        "Diplomatie, quand le Conclave secret est sur la table, une fois par tour et par faction : use un diplomate, un de vos Soutiens politiques de valeur 3 est donné au Conclave (posé sur son habilité, avec votre marqueur), et 5 commerce vous attendent sur votre case du tour T+2.", {
            pourTous: true,
            phase: "diplomatie",
            agent: DIPLOMATE,
            parTour: true,
            visible: outils => /diplomatie/i.test(outils.phase) && conclaveEnJeu(outils.etat),
            special: atelier => {

                const local = "t" + Date.now();
                const tour = atelier.etat.tour + 2;

                return {
                    actions: [
                        { type: "creer", ref: { type: "Promesse", id: 227 }, zone: "neutre:718:habilite:0", idLocal: local, marques: { valeur: 3 } },
                        { type: "creer", jeton: "marqueur", sur: local, proprio: atelier.moi },
                        // (jeton de commerce : miseEnPlace.js, RESSOURCES.commerce ; dernier tour : 10)
                        tour <= 10 && { type: "creer", jeton: "Commerce", zone: `joueur:${atelier.moi}:tour:${tour}`, marques: { montant: 5 }, proprio: atelier.moi },
                    ].filter(Boolean),
                    sans: tour > 10 ? "le tour T+2 est après le dernier tour : les 5 commerce ne seront pas posés" : null,
                    avis: `Achat de votes : un Soutien politique 3 est donné au Conclave ; 5 commerce vous attendent au tour ${tour}.`,
                };
            },
            libelle: "Achat de votes : Soutien politique 3 au Conclave, 5 commerce à T+2 (use un diplomate)",
        }),

    action("vote-du-conclave-soutiens", "habilite", 720, 1795073444380, "Vote du conclave : soutiens", "bandeau",
        "Prévote, quand le Conclave secret est sur la table : un dé par Soutien politique qu'il possède, activé sur 2 ou moins. Une fois par tour pour la table.", {
            pourTous: true,
            phase: "prevote",
            visible: outils => /prevote/i.test(outils.phase) && conclaveEnJeu(outils.etat),
            special: atelier => {

                const tour = atelier.etat.tour;

                const soutiens = Object.values(atelier.etat.composants).filter(x =>
                    !x.cache && x.ref?.type === "Promesse" && x.ref.id === 227 && /^neutre:718:/.test(x.zone || ""));

                return {
                    ...uneFoisParTour(atelier, "conclave:prevote", "les soutiens du Conclave sont déjà jetés ce tour",
                        soutiens.length ? null : "le Conclave n'a aucun Soutien politique"),
                    tirages: soutiens.map(x => ({
                        c: x.id,
                        suite: ([jet]) => ({
                            actions: jet <= 2 ? [{ type: "marquer", c: x.id, marque: "actif", valeur: tour }] : [],
                            texte: `soutien de ${atelier.nomDe(atelier.donneur(x))} ${jet}${jet <= 2 ? " (activé)" : ""}`,
                        }),
                    })),
                };
            },
            libelle: "Vote du conclave : jets des Soutiens politiques (activés sur 2 ou moins)",
        }),

    action("vote-du-conclave-votes", "habilite", 720, 1795073444380, "Vote du conclave : votes", "bandeau",
        "Vote, quand le Conclave secret est sur la table : 1D10 votes (3D10 si l'agenda « Soutien au conclave » est en jeu). Le message rappelle ce qu'il vote. Une fois par tour pour la table.", {
            pourTous: true,
            phase: "phase de vote",
            nomPhase: "vote",
            visible: outils => /phase de vote/i.test(outils.phase) && conclaveEnJeu(outils.etat),
            special: atelier => {

                const feuille = Object.values(atelier.etat.composants).find(x => !x.cache && x.ref?.type === "neutral" && x.ref.id === 718);

                // « Soutien au conclave » (#727) voté : posé à côté du plateau du Conclave
                const soutenu = Object.values(atelier.etat.composants).some(x =>
                    !x.cache && x.ref?.type === "Agenda" && x.ref.id === 727 && /^(general:table|neutre:718:)/.test(x.zone || ""));

                return {
                    ...uneFoisParTour(atelier, "conclave:vote", "les votes du Conclave sont déjà lancés ce tour",
                        feuille ? null : "feuille du Conclave introuvable"),
                    tirages: feuille ? [{
                        c: feuille.id,
                        n: soutenu ? 3 : 1,
                        suite: jets => ({
                            // (compteur conclave:voix : le décompte des votes les compte dans la colonne « Conclave »)
                            actions: [{ type: "compteur", id: "conclave:voix", valeur: jets.reduce((s, j) => s + j, 0) }],
                            texte: `${jets.join(" + ")} = ${jets.reduce((s, j) => s + j, 0)} vote(s), comptés au décompte — contre « Lutte contre la corruption », ` +
                                "pour « Ouverture bureau des mercenaires » et « Soutien au conclave » ; « Dissolution du sénat » (pour lui-même, avec tous ses Soutiens politiques) : ajustez sa colonne à la main",
                        }),
                    }] : [],
                };
            },
            libelle: "Vote du conclave : nombre de votes",
        }),

    // ----- Agendas -----
    // Lois et directives : script de résolution (resolutionsAgendas.js), bouton « Résoudre » de
    // l'onglet Vote, sous le décompte de la loi (sans script : « résolution manuelle nécessaire »).
    // Traités et lois en jeu : leur effet vaut tant que la carte est sur la table (aScript).
    resolution("pardon", 305, 1795076851682, "Pardon",
        "Pour l'emporte : le marqueur d'infamie de chaque faction revient à 0. La carte est retirée du jeu."),
    resolution("severite", 306, 1795076851683, "Sévérité",
        "Pour l'emporte : la loi va sur la table, sinon elle est retirée du jeu. En jeu, le décompte des points retire 1 point de plus par infamie."),
    resolution("mercenaire-directive", 312, 1795076851688, "Mercenaire",
        "La faction élue gagne le mercenaire révélé à côté de la loi (ses éléments actifs). La carte est retirée du jeu."),
    resolution("revocation", 313, 1795076851689, "Révocation",
        "La loi ou le traité élu (options 1 à N : les agendas de la table, dans leur ordre) est retiré du jeu ; Contre : rien. La carte est retirée du jeu."),
    resolution("artefact-retrouve", 316, 1795076851691, "Artefact retrouvé",
        "La faction élue gagne la relique révélée à côté de la loi (ses éléments actifs, sans les points de fabrication). La carte est retirée du jeu."),
    resolution("revolution", 340, 1795076851710, "Révolution",
        "Pour l'emporte : toutes les lois, traités et mandats en jeu sont retirés du jeu, y compris ceux résolus plus tôt dans le tour. La carte est retirée du jeu."),
    resolution("construire-un-monument", 344, 1795076851713, "Construire un monument",
        "On ne vote que Pour. Chaque voix coûte 2 ressources ; chaque faction gagne 1 point par faction qui a moins voté qu'elle, et 2 de plus si elle a voté seule plus que toutes les autres. La carte est retirée du jeu."),
    resolution("subvention", 556, 1795076851743, "Subvention",
        "Chaque faction gagne 1 commerce par voix reçue dans sa colonne. La carte est retirée du jeu."),
    resolution("ostracisme", 748, 1795068635381, "Ostracisme",
        "La faction élue gagne 1 infamie. La carte est retirée du jeu."),
    resolution("vote-au-conseil", 798, 1793972765960, "Vote au conseil",
        "Les factions qui ont le plus de voix gagnent des sièges : N à la première, N − 1 à la deuxième… (Vote au conseil N, de 1 à 5). La carte est retirée du jeu.",
        [799, 800, 801, 802]),
    regle("impot", "Agenda", 339, 1795076851709, "Impôt", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Tant que le traité est sur la table, chaque faction dépense 2 commerce (ce qu'elle en a, au plus)."),
    regle("ecologie-punitive", "Agenda", 310, 1795076851686, "Écologie punitive", "auto",
        "Ravitaillement automatique (début de la phase)",
        "Tant que le traité est sur la table, chaque planète rapporte 1 ressource de moins (3 pour une planète sauvage), sans descendre sous 0."),
];

// Script de résolution d'une loi ou d'une directive (son code : resolutionsAgendas.js)
function resolution(id, carte, ecritLe, nom, description, aussi = []) {
    return { ...regle(id, "Agenda", carte, ecritLe, nom, "modifie", "Onglet Vote, sous le décompte de la loi : « Résoudre »", description, aussi), resolution: true };
}

// Bouton d'action d'une unité, d'une planète ou d'une habilité (ActionsScript.jsx)
//   lieu : "unite", "planete", "systeme" ou "bandeau" ; spec : voir ActionsScript.jsx
function action(id, type, carte, ecritLe, nom, lieu, description, spec) {

    const { aussi = [], ...reste } = spec;

    return {
        id,
        sorte: "action",
        mode: "nouveau",
        ou: {
            unite: "Fiche de l'unité",
            carte: "Fiche de la carte",
            planete: "Fiche d'un système, à côté de la planète",
            systeme: "Fiche d'un système, en tête",
            bandeau: "Bandeau « À faire »",
            plateau: "Plateau joueur",
        }[lieu],
        carte: { type, id: carte },
        aussi,
        ecritLe,
        nom,
        description,
        lieu,
        ...reste,
    };
}

// Revenu de phase d'une unité ou d'une planète (Revenus.jsx)
//   phase : "ravit", "science" ou "production" ; effet : { gains, recherche, cree, calcul, note, aussi }
function revenu(id, type, carte, ecritLe, nom, phase, description, effet) {

    const { aussi = [], ...reste } = effet;

    return {
        id,
        sorte: "revenu",
        mode: phase === "ravit" ? "auto" : "nouveau",
        ou: phase === "ravit"
            ? "Ravitaillement automatique (début de la phase)"
            : `Bandeau « À faire », phase de ${phase} : « Revenus de la phase »`,
        carte: { type, id: carte },
        aussi,
        ecritLe,
        nom,
        description: `${phase === "ravit" ? "Ravitaillement" : (phase === "science" ? "Science" : "Production")} : ${description}`,
        phase,
        ...reste,
    };
}

// Règle d'une unité, d'une planète ou d'une habilité : sa description seule (son code est là où elle agit)
//   aussi : autres éléments soumis à la même règle
function regle(id, type, carte, ecritLe, nom, mode, ou, description, aussi = []) {
    return { id, sorte: "regle", mode, ou, carte: { type, id: carte }, aussi, ecritLe, nom, description };
}

// Recherche typée que génère un élément (journal de recherche du tour) : [[type, n]…] ou null
//   sorte : "g" (revenu de phase) ou "a" (bouton d'action)
export function rechercheDeSource(idElement, sorte = "g") {

    const script = SCRIPTS.find(s => Array.isArray(s.recherche) && (s.sorte === "action") === (sorte === "a") &&
        [s.carte.id, ...(s.aussi || [])].includes(idElement));

    return script ? script.recherche : null;
}

// Script d'effet de technologie : sa description seule (son code est là où il agit)
//   aussi : autres technologies qui donnent le même effet (version d'une faction)
function effet(id, carte, ecritLe, nom, mode, ou, description, aussi = []) {
    return { id, sorte: "effet", mode, ou, carte: { type: "tech", id: carte }, aussi, ecritLe, nom, description };
}

// Script de mise en place d'un événement (bouton de sa fiche)
function evenement(id, carte, ecritLe, nom, { description, poses, anomalies, rebellion, signaux, explores, secondaires, reste }) {
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
        signaux,
        explores,
        secondaires,
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
    const connaissance = {};
    const feuilles = [];

    for (const feuille of Object.values(etat.composants)) {

        if (feuille.zone !== `${base}:tech` || feuille.ref?.type !== "techsheet") {
            continue;
        }

        const contenu = await charger(feuille.ref.id);

        let obtenues = 0;

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
                obtenues++;

                debloquees.set(id, {
                    utilisee: `${base}:techUse:${feuille.id}:${k}`,
                    // Zone des éléments posés sur la technologie
                    zone: `${base}:tech:${feuille.id}:case:${k}`,
                });
            }
        }

        // Connaissance de la feuille : 2 points par technologie obtenue, plus les
        // points recherchés ; un niveau par ligne pleine (connaissanceReq points)
        const points = 2 * obtenues + (Number(etat.compteurs[`${base}:tech:${feuille.id}:connaissance`]) || 0);
        const type = contenu?.techType || "";

        connaissance[type] = Math.max(connaissance[type] || 0, Math.floor(points / (Number(contenu?.connaissanceReq) || 8)));

        // (feuille par feuille, pour le décompte des points : regleDecompte.js)
        feuilles.push({ id: feuille.ref.id, type, niveau: Math.floor(points / (Number(contenu?.connaissanceReq) || 8)) });
    }

    // Technologies isolées (Technologie.jsx) : une carte technologie posée seule dans la
    // zone tech, hors de toute feuille. Mêmes compteurs qu'une case de feuille, avec
    // l'identifiant de son composant à la place de celui de la feuille et la case 0.
    // (Elle ne donne pas de connaissance : elle n'est sur aucune feuille.)
    for (const c of Object.values(etat.composants)) {

        if (c.zone !== `${base}:tech` || c.ref?.type !== "tech" || c.cache) {
            continue;
        }

        const tech = await charger(c.ref.id);
        const progres = Number(etat.compteurs[`${base}:tech:${c.id}:0`]) || 0;

        if (progres >= (Number(tech?.cout) || 1)) {
            debloquees.set(c.ref.id, {
                utilisee: `${base}:techUse:${c.id}:0`,
                zone: `${base}:tech:${c.id}:case:0`,
            });
        }
    }

    // Niveaux de connaissance par type de technologie : { gen: 2, spa: 0… }
    debloquees.connaissance = connaissance;

    // Feuilles de technologie du joueur : [{ id (de la feuille), type, niveau de connaissance }]
    debloquees.feuilles = feuilles;

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
