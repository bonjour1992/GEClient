// ============================================================
// JOURNAL DE RECHERCHE DU TOUR
//
// Ce qu'un joueur gagne et applique en recherche pendant le tour,
// phase par phase et dans l'ordre : affiché en haut de l'onglet
// Technologie (Technologie.jsx). Tout tient dans des compteurs :
//
//   joueur:<u>:rechlog:<rang>:<phase>:<sorte>:<élément> = quantité
//
//   rang     ordre d'arrivée de la ligne (1, 2, 3…)
//   phase    numéro de la phase (« 11.Phase de science » -> 11)
//   sorte    p  recherche sur une planète (points gagnés)
//            g  autre source qui génère de la recherche (ligne ajoutée à la main)
//            t  cases de recherche cochées sur une technologie
//            c  points de connaissance recherchés sur une feuille
//   élément  identifiant de la planète, de la source, de la technologie
//            ou de la feuille de technologie
//
// Une même ligne (même phase, même sorte, même élément) est
// complétée plutôt que répétée. joueur:<u>:rechlog:0:0:f:<technologie>
// = 1 dit que la technologie a été finie ce tour. Le journal est
// effacé à « Nouveau tour » (Partie.jsx).
// ============================================================

const RE_LIGNE = /^joueur:(\d+):rechlog:(\d+):(\d+):([a-z]):(\d+)$/;

// (les anciens compteurs rechTour et rechFait sont effacés avec le journal)
const RE_RECHERCHES = /^joueur:\d+:(rechTour|rechFait|rechlog):/;

// Numéro de la phase en cours, lu au début de son nom (0 : sans numéro)
export const numeroPhase = etat => Number(/^\s*(\d+)/.exec(etat?.phase || "")?.[1]) || 0;

// Toutes les lignes d'un joueur, vides comprises : [{ id, rang, phase, sorte, element, n }]
function lignes(etat, userId) {
    return Object.keys(etat.compteurs)
        .map(id => RE_LIGNE.exec(id))
        .filter(m => m && Number(m[1]) === userId)
        .map(m => ({
            id: m[0],
            rang: Number(m[2]),
            phase: Number(m[3]),
            sorte: m[4],
            element: Number(m[5]),
            n: Number(etat.compteurs[m[0]]) || 0,
        }));
}

// Le journal du joueur, dans l'ordre : { lignes, finies (technologies finies ce tour) }
export function lireJournal(etat, userId) {

    const toutes = lignes(etat, userId).filter(l => l.n > 0);

    return {
        lignes: toutes.filter(l => l.rang > 0).sort((a, b) => a.rang - b.rang),
        finies: new Set(toutes.filter(l => l.sorte === "f").map(l => l.element)),
    };
}

// Action qui ajoute `delta` à la ligne de cette phase, de cette sorte et de cet
// élément (créée à la suite des autres au besoin). null : rien à noter.
export function noter(etat, userId, sorte, element, delta) {

    if (!Number.isInteger(element) || element <= 0 || !delta) {
        return null;
    }

    const toutes = lignes(etat, userId);
    const phase = numeroPhase(etat);
    const ligne = toutes.find(l => l.rang > 0 && l.phase === phase && l.sorte === sorte && l.element === element);

    if (ligne) {
        return { type: "compteur", id: ligne.id, valeur: Math.max(0, ligne.n + delta) };
    }

    if (delta < 0) {
        // (case décochée à une autre phase : la dernière ligne de cet élément est diminuée)
        const derniere = toutes.filter(l => l.rang > 0 && l.sorte === sorte && l.element === element && l.n > 0)
            .sort((a, b) => b.rang - a.rang)[0];

        return derniere ? { type: "compteur", id: derniere.id, valeur: Math.max(0, derniere.n + delta) } : null;
    }

    const rang = toutes.reduce((max, l) => Math.max(max, l.rang), 0) + 1;

    return { type: "compteur", id: `joueur:${userId}:rechlog:${rang}:${phase}:${sorte}:${element}`, valeur: delta };
}

// Action qui note (ou efface) qu'une technologie a été finie ce tour
export function noterFinie(etat, userId, idTech, finie) {

    const id = `joueur:${userId}:rechlog:0:0:f:${idTech}`;

    return Number.isInteger(idTech) && idTech > 0 && !!etat.compteurs[id] !== !!finie
        ? { type: "compteur", id, valeur: finie ? 1 : 0 }
        : null;
}

// Actions qui effacent le journal de recherche de tous les joueurs
export const effacerRecherches = etat => Object.keys(etat.compteurs)
    .filter(id => RE_RECHERCHES.test(id) && etat.compteurs[id])
    .map(id => ({ type: "compteur", id, valeur: 0 }));
