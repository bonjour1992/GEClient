import { campDe, NEUTRE } from "./miseEnPlace.js";
import { controleDe } from "./effets.js";

// ============================================================
// RÈGLE « CONTRÔLE » : LE CALCUL, EN UN SEUL ENDROIT
//
// Tout ce qui évalue un contrôle passe par campsDeControle : le
// test préalable d'une action (evaluerControle), l'affichage d'un
// conflit de contrôle et celui d'un conflit de domination
// (Controle.jsx). Aucune dépendance à l'interface.
//
// Règle (élément « Contrôle », #1033) :
//   - planète : les unités de la planète comptent ; système : les
//     vaisseaux et les structures spatiales (unités de l'espace,
//     non embarquées) ;
//   - les unités militaires et la possession de la planète (2, même
//     sans unité) génèrent du contrôle ; d'autres effets peuvent en
//     ajouter (une valeur « #con(n) » écrite sur une unité non
//     militaire, Rapport de force…), mais une faction qui n'a ni
//     unité militaire ni possession ne participe pas ;
//   - le contrôle de ceux qui soutiennent doit dépasser celui de
//     ceux qui s'opposent ; un test auquel personne ne peut
//     s'opposer réussit toujours (0 contre 0 réussit) ;
//   - un contrôle n'a pas de durée : il vaut pour l'action qui l'a
//     demandé, pas pour la phase.
//
// Quand faut-il un conflit (onglet Conflit) ? S'opposer est un
// choix et des effets peuvent changer le contrôle : un conflit
// s'ouvre toujours, sauf si aucune autre faction n'est en mesure
// de participer, ou s'il n'y a que des neutres que la faction qui
// agit dépasse.
// ============================================================

export const CONTROLE_POSSESSION = 2;

// Rang de « planète » qui désigne l'espace du système (structure spatiale, action dans un système)
export const ESPACE_CONTROLE = 99;

export const cleControle = (numero, k) => `controle:${numero}p${k}`;

// Rang de la phase en cours (tour × 100 + numéro de phase) : ce qui ne vaut que pour une phase le porte
export const rangDePhase = etat => etat.tour * 100 + Number(/^(\d+)/.exec(etat.phase || "")?.[1] ?? 0);

// Contrôle acquis par un joueur à cet endroit, en attente de son action : un conflit gagné
// alors que l'action n'attendait plus (page rechargée). Il sert une seule fois — l'action
// refaite le consomme (demanderControle) — et tombe de toute façon à la fin de la phase.
//   controleAcquis:<case>p<planète>:<joueur> = rang de la phase
export const cleAcquis = (numero, k, joueur) => `controleAcquis:${numero}p${k}:${joueur}`;
export const controleAcquis = (etat, numero, k, joueur) =>
    rangDePhase(etat) > 0 && Number(etat.compteurs[cleAcquis(numero, k, joueur)]) === rangDePhase(etat);

// Unités qui comptent pour le contrôle d'un lieu — le seul endroit qui le dit :
//   planète k    les unités de la planète ;
//   espace       les unités de l'espace du système, non embarquées (vaisseaux, structures
//                spatiales), plus celles des planètes du système dont le texte dit que leur
//                contrôle « affecte aussi l'espace » (systèmes de défense).
//   index : composants par zone ; contenuDe : id d'élément -> contenu ; k : rang de la planète,
//   ou ESPACE_CONTROLE
const AFFECTE_ESPACE = /affecte\s+aussi\s+l['’]espace/i;

export function unitesDuLieu({ index, contenuDe, numero, k }) {

    const unites = zone => (index.parZone.get(zone) || []).filter(c => !c.cache && c.ref?.type === "unit");

    if (k !== ESPACE_CONTROLE) {
        return unites(`hex:${numero}:planete:${k}`);
    }

    const surPlanetes = [...index.parZone.keys()]
        .filter(zone => zone.startsWith(`hex:${numero}:planete:`))
        .flatMap(unites)
        .filter(c => AFFECTE_ESPACE.test(String(contenuDe(c.ref.id)?.habilite || "").replace(/<[^>]+>/g, " ")));

    return [...unites("hex:" + numero).filter(c => !c.sur), ...surPlanetes];
}

// Une unité dont le contenu n'est pas encore connu est comptée comme militaire
export const estMilitaire = (contenuDe, c) => contenuDe(c.ref.id)?.mot_cle?.includes("mil") !== false;

// Autre effet qui génère du contrôle : une valeur « #con(n) » écrite sur une unité non militaire
const controleEcrit = (contenuDe, c) => /#con\(\d+\)/i.test(contenuDe(c.ref.id)?.habilite || "");

// Camps d'un test de contrôle : [{ camp, unites, possession, participe, controle }]
//   unites      unités du lieu (planète : celles de la planète ; espace : celles de l'espace, non embarquées)
//   contenuDe   id d'élément -> contenu (cache des éléments)
//   possesseur  joueur qui possède la planète, ou null (espace, station)
//   acteur      faction qui agit : toujours listée, même si elle ne peut pas participer (contrôle 0)
// Seuls participent les camps qui ont une unité militaire sur place ou la possession ; leurs
// unités non militaires ne comptent que si leur texte leur donne une valeur de contrôle.
export function campsDeControle({ unites, contenuDe, aScript, possesseur = null, acteur = null }) {

    const militaires = new Map();
    const autres = new Map();

    for (const c of unites) {
        if (estMilitaire(contenuDe, c)) {
            militaires.set(campDe(c), [...(militaires.get(campDe(c)) || []), c]);
        } else if (controleEcrit(contenuDe, c)) {
            autres.set(campDe(c), [...(autres.get(campDe(c)) || []), c]);
        }
    }

    const camps = [...new Set([
        ...(acteur !== null ? [acteur] : []),
        ...(possesseur ? [possesseur] : []),
        ...militaires.keys(),
    ])];

    return camps.map(camp => {
        const possession = possesseur && camp === possesseur ? CONTROLE_POSSESSION : 0;
        const participe = militaires.has(camp) || possession > 0;
        const liste = participe ? [...(militaires.get(camp) || []), ...(autres.get(camp) || [])] : [];

        return {
            camp,
            unites: liste,
            possession,
            participe,
            // (contrôle de chaque unité : effets.js — #con, Rayon tracteur)
            controle: liste.reduce((total, c) => total + controleDe(contenuDe(c.ref.id), camp, aScript), 0) + possession,
        };
    });
}

// Test préalable d'une action de `moi` : { conflit, mien, neutre, camps }
//   conflit  vrai : un conflit de contrôle doit trancher ; faux : personne ne peut s'opposer
//            (ou seulement des neutres dépassés) — le test réussit, même à 0 contre 0
export function evaluerControle({ unites, contenuDe, moi, possesseur = null, aScript }) {

    const camps = campsDeControle({ unites, contenuDe, aScript, possesseur, acteur: moi });

    const mien = camps.find(c => c.camp === moi)?.controle || 0;
    const neutre = camps.find(c => c.camp === NEUTRE)?.controle || 0;
    const autreFaction = camps.some(c => c.camp !== moi && c.camp !== NEUTRE);

    return { conflit: autreFaction || (neutre > 0 && mien <= neutre), mien, neutre, camps };
}

// ------------------------------------------------------------
// DOMINATION : UN TEST PAR SUJET
//
// Un test de domination est ouvert pour un sujet : la carte ou l'effet qui demande la
// domination (son identifiant ; 0 : test ouvert à la main). Toutes les factions qui veulent
// faire la même action passent par ce seul test : celle qui domine la fait, personne à
// égalité. Une fois clos, il ne se rouvre pas pour le même sujet (pendant ce tour).
//   dominant:<case>:s<sujet>        camp qui domine (0 : personne, ou les neutres)
//   dominant:<case>:s<sujet>:tour   tour de ce résultat
// ------------------------------------------------------------

export const cleDominant = (numero, sujet) => `dominant:${numero}:s${Number(sujet) || 0}`;

// Camp qui domine d'après le test clos ce tour pour ce sujet ; null : pas de test clos
export const resultatDomination = (etat, numero, sujet) =>
    (Number(etat.compteurs[cleDominant(numero, sujet) + ":tour"]) === etat.tour
        ? Number(etat.compteurs[cleDominant(numero, sujet)]) || 0
        : null);

// Sujets des tests de domination (identifiant de la carte)
export const SUJETS_DOMINATION = {
    185: "Récupération",
    232: "Exploitation du vide",
    452: "Péage aux frontières",
    486: "Cache",
    821: "Extraction de la faille",
    942: "Racket",
};

// Actions qui ouvrent un test de domination pour ce sujet (les choix d'un test précédent sont oubliés)
export const actionsOuvrirDomination = (etat, numero, moi, sujet = 0) => [
    ...Object.keys(etat.compteurs)
        .filter(id => id.startsWith(`domination:${numero}:`) && etat.compteurs[id])
        .map(id => ({ type: "compteur", id, valeur: 0 })),
    sujet > 0 && { type: "compteur", id: `domination:${numero}:motif`, valeur: sujet },
    { type: "compteur", id: `domination:${numero}`, valeur: moi },
].filter(Boolean);