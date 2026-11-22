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
//            g  autre source qui génère de la recherche (revenu de phase, ou ligne
//               ajoutée à la main)
//            a  recherche obtenue par un bouton d'action (ActionsScript.jsx)
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

const RE_RECHERCHES = /^joueur:\d+:rechlog:/;

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

// ------------------------------------------------------------
// DÉPENSE DES GAINS
//
// Chaque case cochée (lignes « t » et « c ») dépense un point de recherche gagné (lignes « p »,
// « g », « a ») : le journal n'affiche pas de ligne de plus, il barre un gain. Rien n'est stocké :
// la répartition est recalculée, les dépenses prises dans l'ordre du journal.
//
// Un point gagné est d'un type précis (#remil : il ne paie que ce type) ou au choix (#rech). S'il
// vient d'un élément à spécialité technologique, il compte double pour une technologie de cette
// spécialité (fiche de la phase de science) : à moitié barré à la première case, barré à la seconde.
//
// Pour une case d'un type donné, le point est pris dans l'ordre :
//   1. un gain de ce type précis ;
//   2. un gain au choix dont la spécialité est ce type (d'abord celui qui est à moitié barré) ;
//   3. un gain au choix sans spécialité ;
//   4. un gain au choix d'une autre spécialité.
//
// contenuDe(id) -> contenu d'un élément (techSpe d'une planète, techType d'une technologie ou
// d'une feuille) ; rechercheDeSource(id, sorte) -> recherche typée d'une source (scripts.js).
//   -> { gains: [{ ligne, spe, unites: [{ type, spe, utilise (0, 1 ou 2 moitiés), pour: [élément…] }] }],
//        manque: [{ ligne, type, n }]   cases cochées sans point disponible,
//        reste                          points pas encore entièrement dépensés,
//        libre(type)                    un point peut payer une case de ce type }
// ------------------------------------------------------------

export function repartir(journal, contenuDe, rechercheDeSource) {

    const gains = [];

    for (const ligne of journal.lignes.filter(l => ["p", "g", "a"].includes(l.sorte))) {

        const contenu = contenuDe(ligne.element);
        const spe = Array.isArray(contenu?.techSpe) ? contenu.techSpe : [];

        // (une source dont le script dit le type : SR-42, spatiale ; sinon, au choix)
        const typee = ligne.sorte === "p" ? null : rechercheDeSource(ligne.element, ligne.sorte);
        const total = (typee || []).reduce((s, [, n]) => s + n, 0);
        const fois = total ? ligne.n / total : 0;

        const types = Number.isInteger(fois) && fois >= 1
            ? typee.flatMap(([type, n]) => Array.from({ length: n * fois }, () => type || ""))
            : Array.from({ length: ligne.n }, () => "");

        gains.push({ ligne, spe, unites: types.map(type => ({ type, spe, utilise: 0, pour: [] })) });
    }

    const unites = gains.flatMap(g => g.unites);

    const double = (u, type) => !!type && u.spe.includes(type);

    const accepte = (u, type) => (u.type === "" || u.type === type) &&
        (double(u, type) ? u.utilise < 2 : u.utilise === 0);

    const rang = (u, type) => (u.type !== "" ? 0 : (double(u, type) ? 1 : (u.spe.length ? 3 : 2)));

    const manque = [];

    for (const ligne of journal.lignes.filter(l => ["t", "c"].includes(l.sorte))) {

        const type = contenuDe(ligne.element)?.techType || "";
        let reste = ligne.n;

        for (; reste > 0; reste--) {

            // (tri stable : à rang égal, le point à moitié barré, puis l'ordre du journal)
            const u = unites.filter(x => accepte(x, type))
                .sort((a, b) => rang(a, type) - rang(b, type) || b.utilise - a.utilise)[0];

            if (!u) {
                break;
            }

            u.utilise += double(u, type) ? 1 : 2;
            u.pour.push(ligne.element);
        }

        if (reste > 0) {
            manque.push({ ligne, type, n: reste });
        }
    }

    return {
        gains,
        manque,
        reste: unites.filter(u => u.utilise < 2).length,
        libre: type => unites.some(u => accepte(u, type)),
    };
}
