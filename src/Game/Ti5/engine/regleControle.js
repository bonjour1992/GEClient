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
//   - seules les unités militaires participent — sauf celles de la
//     faction qui agit, quand l'action le dit (« le contrôle de vos
//     unités » : construction) ;
//   - la possession d'une planète y vaut 2 de contrôle pour la
//     faction qui l'a, même sans unité ;
//   - le contrôle de ceux qui soutiennent doit dépasser celui de
//     ceux qui s'opposent.
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

// Contrôle acquis par un joueur à cet endroit, pour la phase en cours
//   controleAcquis:<case>p<planète>:<joueur> = rang de la phase
export const rangDePhase = etat => etat.tour * 100 + Number(/^(\d+)/.exec(etat.phase || "")?.[1] ?? 0);
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
const estMilitaire = (contenuDe, c) => contenuDe(c.ref.id)?.mot_cle?.includes("mil") !== false;

// Camps d'un test de contrôle : [{ camp, unites, possession, controle }]
//   unites      unités du lieu (planète : celles de la planète ; espace : celles de l'espace, non embarquées)
//   contenuDe   id d'élément -> contenu (cache des éléments)
//   possesseur  joueur qui possède la planète, ou null (espace, station)
//   acteur      faction qui agit : toujours listée, même sans unité
//   toutes      toutes les unités de l'acteur comptent, pas seulement les militaires
export function campsDeControle({ unites, contenuDe, aScript, possesseur = null, acteur = null, toutes = false }) {

    const parCamp = new Map();

    for (const c of unites) {
        if (estMilitaire(contenuDe, c) || (toutes && campDe(c) === acteur)) {
            parCamp.set(campDe(c), [...(parCamp.get(campDe(c)) || []), c]);
        }
    }

    const camps = [...new Set([
        ...(acteur !== null ? [acteur] : []),
        ...(possesseur ? [possesseur] : []),
        ...parCamp.keys(),
    ])];

    return camps.map(camp => {
        const liste = parCamp.get(camp) || [];
        const possession = possesseur && camp === possesseur ? CONTROLE_POSSESSION : 0;

        return {
            camp,
            unites: liste,
            possession,
            // (contrôle de chaque unité : effets.js — #con, Rayon tracteur)
            controle: liste.reduce((total, c) => total + controleDe(contenuDe(c.ref.id), camp, aScript), 0) + possession,
        };
    });
}

// Test préalable d'une action de `moi` : { conflit, mien, neutre, camps }
//   conflit  vrai : un conflit de contrôle doit trancher ; faux : réglé d'office (mien > 0 : contrôle acquis)
export function evaluerControle({ unites, contenuDe, moi, possesseur = null, aScript, toutes = false }) {

    const camps = campsDeControle({ unites, contenuDe, aScript, possesseur, acteur: moi, toutes });

    const mien = camps.find(c => c.camp === moi)?.controle || 0;
    const neutre = camps.find(c => c.camp === NEUTRE)?.controle || 0;
    const autreFaction = camps.some(c => c.camp !== moi && c.camp !== NEUTRE);

    return { conflit: autreFaction || (neutre > 0 && mien <= neutre), mien, neutre, camps };
}
