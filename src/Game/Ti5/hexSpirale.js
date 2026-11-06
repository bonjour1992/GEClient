// ============================================================
// GRILLE HEXAGONALE EN SPIRALE
//
// Les cases sont rangées en spirale à partir du centre :
//
//   indice 0              -> centre (numéro 1)
//   indices 1 à 6         -> anneau 1
//   indices 7 à 18        -> anneau 2
//   ...
//
// Dans chaque anneau, la première case est celle du haut,
// puis on tourne dans le sens horaire.
//
// Le numéro affiché d'une case est son indice + 1.
// Agrandir ou réduire la grille revient à allonger ou
// raccourcir les tableaux : les cases existantes gardent
// leur indice.
//
// Coordonnées axiales (q, r), hexagones "pointe à plat"
// (flat-top), comme le clipPath du plateau.
// ============================================================

// Directions parcourues dans un anneau, dans le sens horaire,
// en partant de la case du haut (0, -k).
const DIRECTIONS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
];

// Nombre total de cases pour une grille de `anneaux` anneaux.
export function nombreCases(anneaux) {
    return 1 + 3 * anneaux * (anneaux + 1);
}

// Anneau d'une case à partir de son indice.
export function anneauDeIndex(index) {
    let k = 0;

    while (nombreCases(k) <= index) {
        k++;
    }

    return k;
}

// Coordonnées axiales d'une case à partir de son indice.
export function coordonneesIndex(index) {

    if (index <= 0) {
        return { q: 0, r: 0, anneau: 0 };
    }

    const k = anneauDeIndex(index);
    const position = index - nombreCases(k - 1);
    const cote = Math.floor(position / k);
    const pas = position % k;

    let q = 0;
    let r = -k;

    for (let i = 0; i < cote; i++) {
        q += DIRECTIONS[i][0] * k;
        r += DIRECTIONS[i][1] * k;
    }

    q += DIRECTIONS[cote][0] * pas;
    r += DIRECTIONS[cote][1] * pas;

    return { q, r, anneau: k };
}

// Distance (en nombre de cases) entre deux coordonnées axiales.
export function distanceAxiale(a, b) {
    const dq = a.q - b.q;
    const dr = a.r - b.r;

    return Math.max(
        Math.abs(dq),
        Math.abs(dr),
        Math.abs(dq + dr)
    );
}

// Distance entre deux cases à partir de leurs indices.
export function distanceIndex(index1, index2) {
    return distanceAxiale(
        coordonneesIndex(index1),
        coordonneesIndex(index2)
    );
}

// Indice d'une case à partir de ses coordonnées axiales.
export function indexCoordonnees(q, r) {

    const k = distanceAxiale({ q, r }, { q: 0, r: 0 });

    if (k === 0) {
        return 0;
    }

    const debut = nombreCases(k - 1);

    for (let position = 0; position < 6 * k; position++) {
        const c = coordonneesIndex(debut + position);

        if (c.q === q && c.r === r) {
            return debut + position;
        }
    }

    return -1;
}

// ============================================================
// ANCIEN FORMAT (grille 13 x 13, 6 anneaux affichés)
// ============================================================

const ANCIENNE_TAILLE = 13;
const ANCIEN_NOMBRE = ANCIENNE_TAILLE * ANCIENNE_TAILLE;
export const ANNEAUX_PAR_DEFAUT = 3;

// Coordonnées axiales d'une case de l'ancienne grille 13 x 13.
function coordonneesAncienIndex(index) {
    const colonne = Math.floor(index / ANCIENNE_TAILLE);
    const ligne = index % ANCIENNE_TAILLE;

    return {
        q: colonne - 6,
        r: ligne - Math.floor(colonne / 2) - 3,
    };
}

// Vrai si le contenu est encore au format 13 x 13.
export function estAncienFormat(content) {
    const anneaux = Number(content?.anneaux);
    const longueur = content?.type?.length;

    return (
        longueur === ANCIEN_NOMBRE &&
        !(Number.isInteger(anneaux) && nombreCases(anneaux) === ANCIEN_NOMBRE)
    );
}

// Convertit l'ancien format vers la spirale.
// La grille garde le nombre d'anneaux réellement utilisés.
export function convertirAncienFormat(content) {

    const cases = [];
    let anneauxUtilises = 0;

    for (let ancien = 0; ancien < ANCIEN_NOMBRE; ancien++) {

        const { q, r } = coordonneesAncienIndex(ancien);
        const anneau = distanceAxiale({ q, r }, { q: 0, r: 0 });

        // L'ancienne grille n'affichait que 6 anneaux
        if (anneau > 6) {
            continue;
        }

        const type = content.type?.[ancien] || "vide";
        const system = content.systems?.[ancien] ?? null;
        const rotate = content.rotates?.[ancien] || 0;

        if (type !== "vide" || system) {
            anneauxUtilises = Math.max(anneauxUtilises, anneau);
        }

        cases.push({ index: indexCoordonnees(q, r), type, system, rotate });
    }

    const anneaux = Math.max(anneauxUtilises, 1);
    const n = nombreCases(anneaux);

    const type = Array(n).fill("vide");
    const systems = Array(n).fill(null);
    const rotates = Array(n).fill(0);

    for (const c of cases) {
        if (c.index < 0 || c.index >= n) {
            continue;
        }

        type[c.index] = c.type;
        systems[c.index] = c.system;
        rotates[c.index] = c.rotate;
    }

    return { ...content, anneaux, type, systems, rotates };
}

// Ajuste la longueur d'un tableau en complétant avec `valeur`.
function ajuster(tableau, n, valeur) {
    const resultat = Array.isArray(tableau) ? tableau.slice(0, n) : [];

    while (resultat.length < n) {
        resultat.push(valeur);
    }

    return resultat;
}

// Contenu prêt à l'affichage : format spirale, tableaux à la bonne taille.
export function normaliserPlateau(content) {

    if (!content) {
        return content;
    }

    if (estAncienFormat(content)) {
        return convertirAncienFormat(content);
    }

    let anneaux = Number(content.anneaux);

    if (!Number.isInteger(anneaux) || anneaux < 0) {
        anneaux = ANNEAUX_PAR_DEFAUT;
    }

    const n = nombreCases(anneaux);

    return {
        ...content,
        anneaux,
        type: ajuster(content.type, n, "vide"),
        systems: ajuster(content.systems, n, null),
        rotates: ajuster(content.rotates, n, 0),
    };
}
