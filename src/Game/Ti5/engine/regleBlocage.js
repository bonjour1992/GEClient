import { campDe, NEUTRE } from "./miseEnPlace.js";
import { controleDe } from "./effets.js";
import { rangDePhase, estMilitaire } from "./regleControle.js";

// ============================================================
// RÈGLE « TEST DE BLOCAGE » D'UNE ACTION : LE CALCUL
// (bombardement, raid, débarquement — le blocage d'un déplacement,
//  case par case, est dans Blocage.jsx)
//
// Règle (élément « Contrôle », #1033, « test de blocage ») : une
// faction veut faire une action qui demande des unités non bloquées
// dans un système.
//   - Les autres factions engagent, unité par unité, leurs unités
//     militaires de l'espace du système pour la bloquer ; d'autres
//     peuvent en engager pour l'aider. Valeur de blocage : contrôle
//     des unités qui bloquent − contrôle de celles qui aident.
//   - La faction qui agit égalise en engageant ses propres unités,
//     les militaires d'abord, puis les autres. Les unités qu'elle
//     engage sont bloquées ; celles qui restent sont non bloquées et
//     peuvent faire l'action. Si elle ne peut pas égaliser, toutes
//     ses unités sont bloquées.
//   - Toute unité qui a servi (bloquer, aider, égaliser) ou qui a
//     fait son action est engagée pour la phase : elle ne sert plus.
//   - Une faction ne subit le test qu'une fois par système et par
//     phase : ensuite ses unités non engagées agissent librement.
//
// Marques d'une unité :
//   bloc       rang de la phase : engagée dans un test de blocage
//   blocAgi    rang de la phase : a fait son action (débarquement)
//   blocChoix  pendant un test : « b<acteur> » bloque, « a<acteur> »
//              aide, « p<acteur> » égalise (unité de l'acteur),
//              « n<acteur> » ne fait rien (neutres : ils bloquent
//              d'office, sauf si un joueur en décide autrement)
// Compteurs :
//   bloc:<case>:<acteur>               test en cours : code de l'action
//   bloc:<case>:<acteur>:<camp>:plus   Rapport de force (+2) d'un camp
//   blocSubi:<case>:<acteur>           rang de la phase : test déjà subi
// ============================================================

export const MARQUE_BLOQUEE = "bloc";
export const MARQUE_AGI = "blocAgi";
export const MARQUE_CHOIX = "blocChoix";

// Actions soumises au test : code du compteur, et leur nom
export const ACTIONS_BLOQUABLES = {
    bombardement: [1, "un bombardement"],
    debarquement: [2, "un débarquement"],
    raid: [3, "un raid"],
};

export const cleBlocage = (numero, acteur) => `bloc:${numero}:${acteur}`;
export const cleSubi = (numero, acteur) => `blocSubi:${numero}:${acteur}`;

// L'unité a servi à un test de blocage de cette phase : elle est bloquée
export const estBloquee = (etat, c) => rangDePhase(etat) > 0 && Number(c.marques?.[MARQUE_BLOQUEE]) === rangDePhase(etat);

// L'unité a fait son action à cette phase (débarquement ; bombardement : marque « bombarde » du tour)
export const aAgi = (etat, c) =>
    (rangDePhase(etat) > 0 && Number(c.marques?.[MARQUE_AGI]) === rangDePhase(etat)) ||
    (/bombard/i.test(etat.phase || "") && String(c.marques?.bombarde || "").endsWith(":" + etat.tour));

// Engagée pour la phase : elle ne peut plus ni bloquer, ni aider, ni égaliser
export const estEngagee = (etat, c) => estBloquee(etat, c) || aAgi(etat, c);

export const blocageSubi = (etat, numero, acteur) =>
    rangDePhase(etat) > 0 && Number(etat.compteurs[cleSubi(numero, acteur)]) === rangDePhase(etat);

// Tests de blocage en cours : [{ cle, numero, acteur, action }]
export function blocagesActionEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^bloc:(\d+):(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({
            cle: m[0],
            numero: Number(m[1]),
            acteur: Number(m[2]),
            action: Object.keys(ACTIONS_BLOQUABLES).find(a => ACTIONS_BLOQUABLES[a][0] === Number(etat.compteurs[m[0]])) || "bombardement",
        }));
}

// Choix d'une unité dans le test de cet acteur : "b", "a", "p", "n", ou null
export function choixDe(c, acteur) {

    const m = /^([bapn])(\d+)$/.exec(String(c.marques?.[MARQUE_CHOIX] || ""));

    if (m && Number(m[2]) === acteur) {
        return m[1];
    }

    // (les neutres bloquent, sauf si un joueur en décide autrement)
    return !m && campDe(c) === NEUTRE && acteur !== NEUTRE ? "b" : null;
}

// Une autre faction peut-elle bloquer cet acteur ici ? (unités militaires non engagées)
export const peutEtreBloque = ({ etat, unites, contenuDe, acteur }) =>
    unites.some(c => campDe(c) !== acteur && estMilitaire(contenuDe, c) && !estEngagee(etat, c));

// Bilan d'un test de blocage
//   unites     unités de l'espace du système (unitesDuLieu, regleControle.js)
//   plus       camp -> bonus de contrôle (Rapport de force) pour ce test
// Rend : autres (unités des autres camps qui peuvent servir), miennes (celles de l'acteur),
// bloquent, aident, egalisent, blocage, aide, net (à égaliser), egalise (contrôle engagé par
// l'acteur), disponible, impossible (il ne peut pas égaliser), ordre (une unité non militaire
// égalise alors qu'il reste une militaire libre), engagees (unités engagées à la conclusion)
export function bilanBlocage({ etat, unites, contenuDe, aScript, acteur, plus = () => 0 }) {

    const controle = c => controleDe(contenuDe(c.ref.id), campDe(c), aScript);
    const militaire = c => estMilitaire(contenuDe, c);
    const somme = liste => liste.reduce((total, c) => total + controle(c), 0);

    const libres = unites.filter(c => !estEngagee(etat, c));
    const autres = libres.filter(c => campDe(c) !== acteur);
    const miennes = libres.filter(c => campDe(c) === acteur);

    // (seules les unités militaires bloquent ; toute unité peut aider)
    const bloquent = autres.filter(c => militaire(c) && choixDe(c, acteur) === "b");
    const aident = autres.filter(c => choixDe(c, acteur) === "a");
    const egalisent = miennes.filter(c => choixDe(c, acteur) === "p");

    // Rapport de force : le bonus d'un camp va du côté où il a engagé une unité
    const camps = liste => [...new Set(liste.map(campDe))];
    const bonus = liste => camps(liste).reduce((total, camp) => total + (Number(plus(camp)) || 0), 0);
    const campsQuiBloquent = camps(bloquent);

    const blocage = somme(bloquent) + bonus(bloquent);
    const aide = somme(aident) + bonus(aident.filter(c => !campsQuiBloquent.includes(campDe(c)))) + (Number(plus(acteur)) || 0);
    const net = Math.max(0, blocage - aide);

    const egalise = somme(egalisent);
    const disponible = somme(miennes);
    const impossible = disponible < net;

    const ordre = egalisent.some(c => !militaire(c)) && miennes.some(c => militaire(c) && choixDe(c, acteur) !== "p");

    return {
        autres, miennes, bloquent, aident, egalisent, blocage, aide, net, egalise, disponible, impossible, ordre,
        controle, militaire,
        // (s'il ne peut pas égaliser, toutes les unités de l'acteur sont bloquées)
        engagees: [...bloquent, ...aident, ...(impossible ? miennes : egalisent)],
    };
}
