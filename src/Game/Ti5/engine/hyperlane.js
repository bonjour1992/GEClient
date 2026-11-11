import { coordonneesIndex, coordonneesBande } from "../hexSpirale";

// ============================================================
// HYPERLANES
//
// Une tuile d'hyperlane (anomalie « hpl… » du système) n'est pas
// une case où l'on s'arrête : aucune unité ne s'y pose, et un
// déplacement la traverse sans dépenser de mouvement, en suivant
// ses lignes — on y entre par un bord et on en sort par un bord
// relié au premier.
//
// Bords d'une case : 0 en haut, puis dans le sens horaire (1 en
// haut à droite … 5 en haut à gauche). LIGNES donne, pour la tuile
// non tournée, les groupes de bords reliés entre eux (d'après les
// images /ti/system/hplane *.png) ; la rotation de la tuile
// (marques.rotation, par pas de 60° dans le sens horaire) décale
// les bords d'autant.
// ============================================================

const LIGNES = {
    hplt: [[4, 1]],             // trait : bas gauche — haut droite
    hplc: [[4, 2]],             // courbe : bas gauche — bas droite
    hpldc: [[5, 1], [4, 2]],    // double courbe : les deux du haut, les deux du bas
    hplpa: [[5, 1, 4, 3]],      // patte d'oie : un carrefour à quatre branches
    hplx: [[5, 2], [4, 1]],     // X : deux traits qui se croisent sans se relier
};

// Voisine de chaque bord, en coordonnées axiales (q, r)
const BORDS = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]];

// (les systèmes secondaires, cases 1000 et plus, forment un groupe à part,
// rangé en bande et non en spirale)
const GROUPE = 1000;

export const estHyperlane = anomalie => /^hpl/.test(anomalie || "");

// Bord de la case a qui touche sa voisine b, ou -1 si elles ne se touchent pas
export function bordVers(a, b) {

    if (Math.floor(a / GROUPE) !== Math.floor(b / GROUPE)) {
        return -1;
    }

    const coordonnees = a >= GROUPE ? coordonneesBande : coordonneesIndex;

    const ca = coordonnees(a % GROUPE);
    const cb = coordonnees(b % GROUPE);

    return BORDS.findIndex(([q, r]) => cb.q - ca.q === q && cb.r - ca.r === r);
}

// L'hyperlane de la case `ici` relie-t-elle ses voisines `de` et `vers` ?
export function hyperlaneRelie(anomalie, rotation, ici, de, vers) {

    const tourne = Math.round(Number(rotation) || 0) % 6;

    // Bords d'entrée et de sortie, ramenés à la tuile non tournée
    const [entree, sortie] = [bordVers(ici, de), bordVers(ici, vers)]
        .map(bord => (bord < 0 ? -1 : (bord - tourne + 6) % 6));

    return entree >= 0 && sortie >= 0 && entree !== sortie &&
        (LIGNES[anomalie] || []).some(ligne => ligne.includes(entree) && ligne.includes(sortie));
}
