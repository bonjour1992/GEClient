import { useMemo } from "react";
import { LoadAndDisplay } from "../../Component/LoadAndDisplay";
import { systemSize } from "./systeme";
import {
    nombreCases,
    coordonneesIndex,
    normaliserPlateau,
} from "./hexSpirale";

// ============================================================
// AFFICHAGE PUR DU PLATEAU
//
// Ce composant ne fait qu'afficher : aucun gestionnaire
// d'événement, aucun état. Chaque case porte l'attribut
// data-case={indice} (indice dans la spirale, numéro - 1),
// ce qui permet à une couche d'édition de retrouver la case
// visée avec event.target.closest("[data-case]").
//
// On n'utilise pas l'attribut id : le même plateau peut être
// affiché plusieurs fois dans la page (éditeur + aperçu).
// ============================================================

// ============================================================
// TYPES DE SYSTÈME
// ============================================================

export const typeSystem = {
    natal: "natal",
    vide: "vide",
    rand: "hasard",
    select: "selection",
};

export const typeSystemColor = {
    natal: "#1a5021",
    vide: "#eeeeee",
    rand: "#7db7e8",
    select: "#631a1a",
};

// ============================================================
// GÉOMÉTRIE
// ============================================================

const RAYON = 60;
const LARGEUR_HEX = RAYON * 2;
const HAUTEUR_HEX = Math.sqrt(3) * RAYON;
const PAS_X = RAYON * 1.5;

const CLIP_HEX =
    "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

// Dimensions du plateau pour un nombre d'anneaux donné.
export function dimensionsPlateau(anneaux) {
    return {
        largeur: LARGEUR_HEX + 2 * anneaux * PAS_X,
        hauteur: HAUTEUR_HEX * (2 * anneaux + 1),
    };
}

// Indice de la case contenant un élément du DOM (ou null).
export function indiceCase(element) {
    const caseElement =
        element?.closest?.("[data-case]");

    if (!caseElement) {
        return null;
    }

    const indice = Number(caseElement.dataset.case);

    return Number.isInteger(indice) ? indice : null;
}

// ============================================================
// UNE CASE
// ============================================================

function CasePlateau({
    index,
    anneaux,
    type,
    system,
    rotate,
    systemesInertes,
    styleCase,
    contenuSupplementaire,
}) {

    // Coordonnées axiales : le centre (0, 0) est au milieu du plateau
    const { q, r } = coordonneesIndex(index);

    const couleur =
        typeSystemColor[type] || typeSystemColor.vide;

    return (
        <div
            data-case={index}
            data-type={type}
            style={{
                position: "absolute",
                left: (q + anneaux) * PAS_X,
                top: (r + q / 2 + anneaux) * HAUTEUR_HEX,
                width: LARGEUR_HEX,
                height: HAUTEUR_HEX,
                backgroundColor: "#000000",
                clipPath: CLIP_HEX,
                zIndex: 1,
                ...styleCase,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: 1,
                    top: 1,
                    width: LARGEUR_HEX - 2,
                    height: HAUTEUR_HEX - 2,
                    backgroundColor: couleur,
                    clipPath: CLIP_HEX,
                    overflow: "hidden",
                }}
            >

                {/* SYSTÈME */}
                {type === "select" && system && (
                    <div
                        data-systeme={system.id}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: systemSize.width,
                            height: systemSize.height,
                            transform:
                                "translate(-50%, -50%) " +
                                `rotate(${(rotate || 0) * 60}deg) ` +
                                `scale(${LARGEUR_HEX / systemSize.width})`,
                            transformOrigin: "center center",
                            zIndex: 2,
                            userSelect: "none",
                        }}
                    >
                        <LoadAndDisplay
                            link={system}
                            style={{
                                ...systemSize,
                                pointerEvents: systemesInertes
                                    ? "none"
                                    : undefined,
                            }}
                        />
                    </div>
                )}

                {/* NUMÉRO */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFF",
                        fontSize: 14,
                        fontWeight: "bold",
                        pointerEvents: "none",
                        zIndex: 10,
                    }}
                >
                    {index + 1}
                </div>

                {contenuSupplementaire}

            </div>
        </div>
    );
}

// ============================================================
// PLATEAU
//
// Props optionnelles (utilisées par l'éditeur) :
//   styleCase(index)        -> style ajouté à la case
//   renduCase(index)        -> contenu ajouté dans la case
//   systemesInertes         -> les systèmes ne captent pas la souris
// ============================================================

export function PlateauView({
    content: contenuBrut,
    style = {},
    styleCase,
    renduCase,
    systemesInertes = false,
}) {

    // Mémoïsé : les tableaux gardent leur référence entre deux rendus
    const content = useMemo(
        () => normaliserPlateau(contenuBrut),
        [contenuBrut]
    );

    const anneaux = content.anneaux;
    const { largeur, hauteur } = dimensionsPlateau(anneaux);

    const cases = [];

    for (let index = 0; index < nombreCases(anneaux); index++) {
        cases.push(
            <CasePlateau
                key={index}
                index={index}
                anneaux={anneaux}
                type={content.type[index] || "vide"}
                system={content.systems[index]}
                rotate={content.rotates[index]}
                systemesInertes={systemesInertes}
                styleCase={styleCase?.(index)}
                contenuSupplementaire={renduCase?.(index)}
            />
        );
    }

    return (
        <div
            data-plateau=""
            style={{
                position: "relative",
                width: largeur,
                height: hauteur,
                flexShrink: 0,
                overflow: "hidden",
                ...style,
            }}
        >
            {cases}
        </div>
    );
}
