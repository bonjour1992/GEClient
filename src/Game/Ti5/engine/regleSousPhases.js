import { rangDePhase } from "./regleControle.js";

// ============================================================
// PHASE DE BOMBARDEMENT ET DE DÉBARQUEMENT : SYSTÈME ACTIVÉ ET SOUS-PHASES
//
// La phase se joue système par système. À tour de rôle, un joueur
// active un système (ou passe) ; dans ce système, tout se résout avant
// le choix du système suivant :
//   1  sous-phase de bombardement (les raids s'y font aussi) : chacun
//      bombarde, attend ou passe ; elle finit quand tous ont passé ;
//   2  sous-phase de débarquement : de même.
// Les blocages et les engagements d'unités valent pour toute la phase :
// ils se maintiennent d'une sous-phase à l'autre.
//
// Compteurs :
//   bd:systeme          case du système activé + 1 (0 : aucun)
//   bd:sous             sous-phase en cours : 1 bombardement, 2 débarquement
//   bd:passe:<joueur>   ce joueur a passé la sous-phase en cours
//   bd:fait:<case>      rang de la phase : ce système a déjà été joué à cette phase
// Aucune dépendance à l'interface.
// ============================================================

export const BOMBARDEMENT = 1;
export const DEBARQUEMENT = 2;
export const NOM_SOUS_PHASE = { [BOMBARDEMENT]: "bombardement", [DEBARQUEMENT]: "débarquement" };

const CLE_SYSTEME = "bd:systeme";
const CLE_SOUS = "bd:sous";
const clePasse = joueur => `bd:passe:${joueur}`;
const cleFait = numero => `bd:fait:${numero}`;

// La phase en cours est-elle celle de bombardement et de débarquement ?
export const estPhaseBombardementDebarquement = etat =>
    /bombardement/i.test(etat?.phase || "") && /d[ée]barquement/i.test(etat?.phase || "");

// Où en est-on : { numero (case du système activé, ou null), sous (1, 2, ou 0) }
export function sousPhaseEnCours(etat) {

    const systeme = Number(etat.compteurs[CLE_SYSTEME]) || 0;

    return systeme > 0
        ? { numero: systeme - 1, sous: Number(etat.compteurs[CLE_SOUS]) || BOMBARDEMENT }
        : { numero: null, sous: 0 };
}

export const aPasse = (etat, joueur) => !!etat.compteurs[clePasse(joueur)];
export const systemeDejaJoue = (etat, numero) => rangDePhase(etat) > 0 && Number(etat.compteurs[cleFait(numero)]) === rangDePhase(etat);

const remiseDesPasses = etat => Object.keys(etat.compteurs)
    .filter(id => /^bd:passe:\d+$/.test(id) && etat.compteurs[id])
    .map(id => ({ type: "compteur", id, valeur: 0 }));

// Active un système : la sous-phase de bombardement commence, personne n'a passé
export const actionsActiverSysteme = (etat, numero) => [
    ...remiseDesPasses(etat),
    { type: "compteur", id: CLE_SOUS, valeur: BOMBARDEMENT },
    { type: "compteur", id: CLE_SYSTEME, valeur: numero + 1 },
];

// Fait avancer : bombardement -> débarquement -> système terminé (le choix du suivant reprend)
export function actionsAvancer(etat) {

    const { numero, sous } = sousPhaseEnCours(etat);

    if (numero === null) {
        return [];
    }

    return sous === BOMBARDEMENT
        ? [...remiseDesPasses(etat), { type: "compteur", id: CLE_SOUS, valeur: DEBARQUEMENT }]
        : [
            ...remiseDesPasses(etat),
            { type: "compteur", id: cleFait(numero), valeur: rangDePhase(etat) },
            { type: "compteur", id: CLE_SOUS, valeur: 0 },
            { type: "compteur", id: CLE_SYSTEME, valeur: 0 },
        ];
}

// Un joueur passe la sous-phase en cours. concernes : joueurs qui ont à se prononcer (ceux qui
// ont des unités dans le système). Quand tous ont passé, la sous-phase avance dans le même coup.
export function actionsPasser(etat, joueur, concernes) {

    const tous = concernes.every(u => u === joueur || aPasse(etat, u));

    return tous ? actionsAvancer(etat) : [{ type: "compteur", id: clePasse(joueur), valeur: 1 }];
}

export const actionsReprendre = joueur => [{ type: "compteur", id: clePasse(joueur), valeur: 0 }];

// Fin de la phase : plus de système activé
export const actionsFinDeSousPhases = etat => [CLE_SYSTEME, CLE_SOUS]
    .filter(id => etat.compteurs[id])
    .map(id => ({ type: "compteur", id, valeur: 0 }))
    .concat(remiseDesPasses(etat));

// Raison pour laquelle une action de cette sous-phase ne devrait pas se faire dans ce système
// (null : rien à dire — autre phase, ou bon système et bonne sous-phase)
export function obstacleSousPhase(etat, numero, sous) {

    if (!estPhaseBombardementDebarquement(etat)) {
        return null;
    }

    const enCours = sousPhaseEnCours(etat);

    return enCours.numero === null
        ? "aucun système n'est activé : activez d'abord ce système (fiche du système)"
        : (enCours.numero !== numero
            ? "ce n'est pas le système activé : celui-ci se joue en entier avant le suivant"
            : (enCours.sous !== sous ? `c'est la sous-phase de ${NOM_SOUS_PHASE[enCours.sous]}, pas celle de ${NOM_SOUS_PHASE[sous]}` : null));
}
