import { ElementContent } from "../../lib/datatype";
import { ANNEAUX_PAR_DEFAUT, nombreCases } from "./hexSpirale";
import { PlateauView } from "./plateauVue";
import { Form } from "./plateauEditeur";

// Le plateau est découpé en trois fichiers :
//   hexSpirale.js       géométrie de la grille en spirale
//   plateauVue.jsx      affichage pur (cases repérées par data-case)
//   plateauEditeur.jsx  édition : palette, glisser, statistiques

export { typeSystem, typeSystemColor } from "./plateauVue";

// ============================================================
// DONNÉES
//
// Les cases sont rangées en spirale depuis le centre :
// l'indice 0 est le centre (numéro 1), puis anneau par anneau.
// ============================================================

class plateau extends ElementContent {
    anneaux = ANNEAUX_PAR_DEFAUT;
    type = Array(nombreCases(ANNEAUX_PAR_DEFAUT)).fill("vide");
    systems = Array(nombreCases(ANNEAUX_PAR_DEFAUT)).fill(null);
    rotates = Array(nombreCases(ANNEAUX_PAR_DEFAUT)).fill(0);
    joueur = 6;
}

// ============================================================
// AFFICHAGE
// ============================================================

export function Display({ content, style = {} }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "safe center",
                overflow: "auto",
                backgroundColor: "#ffffff",
                fontFamily: "Arial, sans-serif",
                color: "#000",
                ...style,
            }}
        >
            <PlateauView content={content} />
        </div>
    );
}

// ============================================================
// EXPORT
// ============================================================

export default {
    name: "Plateau",
    classe: plateau,
    form: Form,
    display: {
        default: Display,
    },
    editor: "noSplit",
};
