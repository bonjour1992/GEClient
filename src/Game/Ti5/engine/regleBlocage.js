import { campDe, NEUTRE } from "./miseEnPlace.js";
import { controleDe } from "./effets.js";
import { rangDePhase, estMilitaire, ESPACE_CONTROLE } from "./regleControle.js";

// ============================================================
// RÈGLE « TEST DE BLOCAGE » D'UNE ACTION : LE CALCUL
// (bombardement, raid, débarquement, canons spatiaux, production,
//  réparation, livraison commerciale — le blocage d'un déplacement,
//  case par case, est dans Blocage.jsx)
//
// Règle (élément « Contrôle », #1033, « test de blocage ») : une
// faction veut faire une action qui demande des unités non bloquées.
// Le test se fait là où est l'unité qui agit : l'espace de son
// système (vaisseaux, structures spatiales), ou sa planète (unités
// de la planète).
//   - Les autres factions engagent, unité par unité, leurs unités
//     militaires du lieu pour la bloquer ; d'autres peuvent en
//     engager pour l'aider. Valeur de blocage : contrôle des unités
//     qui bloquent − contrôle de celles qui aident.
//   - La faction qui agit égalise en engageant ses propres unités,
//     les militaires d'abord, puis les autres. Les unités qu'elle
//     engage sont bloquées ; celles qui restent sont non bloquées et
//     peuvent faire l'action. Si elle ne peut pas égaliser, toutes
//     ses unités sont bloquées.
//   - Toute unité qui a servi (bloquer, aider, égaliser) ou qui a
//     fait son action est engagée pour la phase : elle ne sert plus.
//   - Une faction ne subit le test qu'une fois par lieu et par
//     phase : ensuite ses unités non engagées y agissent librement.
//
// Marques d'une unité :
//   bloc       rang de la phase : engagée dans un test de blocage
//   blocAgi    rang de la phase : a fait son action (débarquement)
//   blocChoix  pendant un test : « b<acteur> » bloque, « a<acteur> »
//              aide, « p<acteur> » égalise (unité de l'acteur),
//              « n<acteur> » ne fait rien (neutres : ils bloquent
//              d'office, sauf si un joueur en décide autrement)
// Compteurs :
//   bloc:<lieu>:<acteur>               test en cours : code de l'action
//   bloc:<lieu>:<acteur>:<camp>:plus   Rapport de force (+2) d'un camp
//   blocSubi:<lieu>:<acteur>           rang de la phase : test déjà subi
//   (<lieu> : « 12 » l'espace de la case 12, « 12p0 » sa planète 0)
// ============================================================

export const MARQUE_BLOQUEE = "bloc";
export const MARQUE_AGI = "blocAgi";
export const MARQUE_CHOIX = "blocChoix";

// Actions soumises au test : code du compteur, et leur nom
export const ACTIONS_BLOQUABLES = {
    bombardement: [1, "un bombardement"],
    debarquement: [2, "un débarquement"],
    raid: [3, "un raid"],
    canons: [4, "un tir de canon spatial"],
    production: [5, "une production"],
    reparation: [6, "une réparation"],
    livraison: [7, "une livraison commerciale"],
};

// Lieu d'un test : l'espace de la case (k = ESPACE_CONTROLE), ou sa planète k
const codeLieu = (numero, k = ESPACE_CONTROLE) => (k === ESPACE_CONTROLE ? String(numero) : `${numero}p${k}`);

export const cleBlocage = (numero, acteur, k = ESPACE_CONTROLE) => `bloc:${codeLieu(numero, k)}:${acteur}`;
export const cleSubi = (numero, acteur, k = ESPACE_CONTROLE) => `blocSubi:${codeLieu(numero, k)}:${acteur}`;

// Lieu où se trouve une unité de la carte : { numero, k } (k : sa planète, ou l'espace), ou null
export function lieuDe(c) {

    const m = /^hex:(\d+)(?::planete:(\d+))?/.exec(c?.zone || "");

    return m ? { numero: Number(m[1]), k: m[2] === undefined ? ESPACE_CONTROLE : Number(m[2]) } : null;
}

// L'unité a servi à un test de blocage de cette phase : elle est bloquée
export const estBloquee = (etat, c) => rangDePhase(etat) > 0 && Number(c.marques?.[MARQUE_BLOQUEE]) === rangDePhase(etat);

// L'unité a fait son action à cette phase (débarquement ; bombardement : marque « bombarde » du tour)
export const aAgi = (etat, c) =>
    (rangDePhase(etat) > 0 && Number(c.marques?.[MARQUE_AGI]) === rangDePhase(etat)) ||
    (/bombard/i.test(etat.phase || "") && String(c.marques?.bombarde || "").endsWith(":" + etat.tour));

// Engagée pour la phase : elle ne peut plus ni bloquer, ni aider, ni égaliser
export const estEngagee = (etat, c) => estBloquee(etat, c) || aAgi(etat, c);

export const blocageSubi = (etat, numero, acteur, k = ESPACE_CONTROLE) =>
    rangDePhase(etat) > 0 && Number(etat.compteurs[cleSubi(numero, acteur, k)]) === rangDePhase(etat);

// Tests de blocage en cours : [{ cle, numero, k, acteur, action }]
export function blocagesActionEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^bloc:(\d+)(?:p(\d+))?:(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({
            cle: m[0],
            // (lieu : « 12 », « 12p0 » — comme le lieu d'un combat)
            lieu: m[2] === undefined ? m[1] : `${m[1]}p${m[2]}`,
            numero: Number(m[1]),
            k: m[2] === undefined ? ESPACE_CONTROLE : Number(m[2]),
            acteur: Number(m[3]),
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
//   unites     unités du lieu du test — espace du système ou planète (unitesDuLieu, regleControle.js)
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
