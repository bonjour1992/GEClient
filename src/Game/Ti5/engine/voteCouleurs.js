import { PlayerColor } from "../ti5Const.js";

// ============================================================
// COULEURS DU PLATEAU DE VOTE
//
// Les huit colonnes du plateau de vote (Contre, Pour, 1 à 6) portent
// les couleurs de joueur, dans l'ordre (vote.jsx). Une colonne
// désigne donc aussi la faction qui joue cette couleur, quand une loi
// élit une faction.
// ============================================================

export const COLONNES_VOTE = ["Contre", "Pour", "1", "2", "3", "4", "5", "6"];

// Couleur de chaque colonne : Contre en noir, Pour en vert, puis 1 à 6
export const COULEURS_COLONNES = Object.values(PlayerColor);

const couleurDuJoueur = j => String(PlayerColor[j?.couleur] || j?.couleur || "").toLowerCase();

// Joueur dont la couleur est celle de la colonne (0 : Contre … 7 : « 6 »), ou null
//   joueurs : ceux de la partie ({ userId, nom, couleur })
export const joueurDeColonne = (joueurs, col) =>
    (joueurs || []).find(j => couleurDuJoueur(j) === String(COULEURS_COLONNES[col] || "").toLowerCase()) || null;
