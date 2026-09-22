
import { ElementContent } from "../../lib/datatype";
import { A4Pa } from "../../Component/Size";
import FormBase from "../../Input/FormBase";
import { EnumInput } from "../../Input/EnumInput";
import { ModalPickerInput } from "../../Input/ModalPickerInput";
import { LoadAndDisplay } from "../../Component/LoadAndDisplay";
import { Link } from "../../lib/datatype";
import { systemSize } from "./systeme";
import { NumberInput } from "../../Input/NumberInput";


// ============================================================
// TYPES DE SYSTÈME
// ============================================================

export const typeSystem = {
    natal: "natal",
    vide: "vide",
    rand: "hasard",
    select: "selection",
};


// ============================================================
// COULEURS DES TYPES
// ============================================================

export const typeSystemColor = {
    natal: "#1a5021",
    vide: "#eeeeee",
    rand: "#7db7e8",
    select: "#631a1a",
};


// ============================================================
// DONNÉES
// ============================================================

class plateau extends ElementContent {

    type = Array(13 * 13).fill("vide");

    systems = Array(13 * 13).fill(null);

    rotates = Array(13 * 13).fill(0);

    joueur = 6;
}


// ============================================================
// AFFICHAGE
// ============================================================

export function Display({
    content,
    style,
    context,
    explication,
    editable = false,
    onDragStartSystem,
    onDropSystem,
    onDragEndSystem,
}) {


    // ========================================================
    // ACTIVATION DU DRAG & DROP
    // ========================================================

    const dragAndDropEnabled =
        editable &&
        typeof onDragStartSystem === "function" &&
        typeof onDropSystem === "function";


    const taille = 13;


    const couleurFond = "#ffffff";
    const couleurBordure = "#000000";


    // ========================================================
    // PAGE
    // ========================================================

    const pageStyle = {

        padding: 0,

        margin: 0,

        border: "none",

        outline: "none",

        backgroundColor:
            couleurFond,

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        boxSizing: "border-box",

        overflow: "hidden",

        fontFamily:
            "Arial, sans-serif",

        color: "#000",

        flexShrink: 0,
    };


    // ========================================================
    // PLATEAU
    // ========================================================

    function Plateau() {


        // ----------------------------------------------------
        // DIMENSIONS HEXAGONES
        // ----------------------------------------------------

        const rayon = 60;

        const largeurHex =
            rayon * 2;

        const hauteurHex =
            Math.sqrt(3) * rayon;

        const pasX =
            rayon * 1.5;

        const pasY =
            hauteurHex;

        const decalageY =
            hauteurHex / 2;


        const largeurPlateau =
            largeurHex +
            (taille - 1) * pasX;

        const hauteurPlateau =
            hauteurHex +
            (taille - 1) * pasY +
            decalageY;


        // ====================================================
        // NUMERO DE CASE
        // ====================================================

        function numeroCase(
            colonne,
            ligne
        ) {

            const hexQ =
                colonne - 6;


            const hexR =
                (
                    ligne -
                    Math.floor(
                        colonne / 2
                    )
                ) -
                (
                    6 -
                    Math.floor(
                        (6 + 1) / 2
                    )
                );


            const hexS =
                -hexQ - hexR;


            const distance =
                Math.max(
                    Math.abs(hexQ),
                    Math.abs(hexR),
                    Math.abs(hexS)
                );


            if (distance === 0) {
                return 0;
            }


            const positionX =
                colonne * pasX;


            const positionY =
                ligne * pasY +
                (
                    colonne % 2 === 1
                        ? decalageY
                        : 0
                );


            const centreX =
                6 * pasX;


            const centreY =
                6 * pasY;


            const angle =
                Math.atan2(
                    positionY - centreY,
                    positionX - centreX
                );


            let angleHoraire =
                angle +
                Math.PI / 2;


            if (angleHoraire < 0) {
                angleHoraire +=
                    2 * Math.PI;
            }


            const nombreDansAnneau =
                6 * distance;


            const positionDansAnneau =
                Math.round(
                    angleHoraire /
                    (
                        2 *
                        Math.PI /
                        nombreDansAnneau
                    )
                ) %
                nombreDansAnneau;


            const premierNumero =
                1 +
                3 *
                (distance - 1) *
                distance;


            return (
                premierNumero +
                positionDansAnneau
            );
        }


        // ====================================================
        // FORME HEXAGONALE
        // ====================================================

        const clipHex =
            "polygon(" +
            "25% 0%, " +
            "75% 0%, " +
            "100% 50%, " +
            "75% 100%, " +
            "25% 100%, " +
            "0% 50%" +
            ")";


        // ====================================================
        // CASES
        // ====================================================

        const cases = [];


        for (
            let colonne = 0;
            colonne < taille;
            colonne++
        ) {


            for (
                let ligne = 0;
                ligne < taille;
                ligne++
            ) {


                // --------------------------------------------
                // COORDONNEES HEXAGONALES
                // --------------------------------------------

                const hexQ =
                    colonne - 6;


                const hexR =
                    (
                        ligne -
                        Math.floor(
                            colonne / 2
                        )
                    ) -
                    (
                        6 -
                        Math.floor(
                            (6 + 1) / 2
                        )
                    );


                const hexS =
                    -hexQ - hexR;


                const distance =
                    Math.max(
                        Math.abs(hexQ),
                        Math.abs(hexR),
                        Math.abs(hexS)
                    );


                if (distance > 6) {
                    continue;
                }


                // --------------------------------------------
                // INDEX
                // --------------------------------------------

                const index =
                    colonne * taille +
                    ligne;


                // --------------------------------------------
                // TYPE
                // --------------------------------------------

                const type =
                    content.type?.[index] ||
                    "vide";


                // --------------------------------------------
                // POSITION
                // --------------------------------------------

                const positionX =
                    colonne * pasX;


                const positionY =
                    ligne * pasY +
                    (
                        colonne % 2 === 1
                            ? decalageY
                            : 0
                    );


                // --------------------------------------------
                // COULEUR
                // --------------------------------------------

                const couleur =
                    typeSystemColor[type] ||
                    typeSystemColor.vide;


                // --------------------------------------------
                // NUMERO
                // --------------------------------------------

                const numero =
                    numeroCase(
                        colonne,
                        ligne
                    );


                // --------------------------------------------
                // SYSTEME
                // --------------------------------------------

                const system =
                    content.systems?.[index];


                const rotate =
                    content.rotates?.[index] ||
                    0;


                const angle =
                    rotate * 60;


                const scaleSysteme =
                    largeurHex /
                    systemSize.width;


                let contenuSysteme =
                    null;


                // =================================================
                // SYSTEME SELECTIONNE
                // =================================================

                if (
                    type === "select" &&
                    system
                ) {


                    contenuSysteme = (

                        <div

                            // -------------------------------------
                            // DRAGGABLE
                            // -------------------------------------

                            draggable={
                                dragAndDropEnabled
                            }


                            // -------------------------------------
                            // DEBUT DU DRAG
                            // -------------------------------------

                            onDragStart={
                                dragAndDropEnabled

                                    ? event => {

                                        // Empêche l'événement
                                        // de remonter jusqu'au
                                        // plateau.

                                        event.stopPropagation();


                                        // Sécurité :
                                        // empêche le navigateur
                                        // d'utiliser un autre
                                        // type de donnée.

                                        event.dataTransfer.clearData();


                                        // Index de la case source.

                                        event.dataTransfer.setData(
                                            "text/plain",
                                            String(index)
                                        );


                                        // Indique au navigateur
                                        // qu'il s'agit d'un déplacement.

                                        event.dataTransfer.effectAllowed =
                                            "move";


                                        // Informe GeneratePlateau.

                                        onDragStartSystem(
                                            index
                                        );
                                    }

                                    : undefined
                            }


                            // -------------------------------------
                            // FIN DU DRAG
                            // -------------------------------------

                            onDragEnd={
                                dragAndDropEnabled

                                    ? event => {

                                        event.stopPropagation();


                                        if (
                                            typeof onDragEndSystem ===
                                            "function"
                                        ) {
                                            onDragEndSystem();
                                        }
                                    }

                                    : undefined
                            }


                            // -------------------------------------
                            // CLIC
                            // -------------------------------------

                            onClick={
                                dragAndDropEnabled

                                    ? event => {

                                        // Empêche un éventuel
                                        // lien présent dans
                                        // LoadAndDisplay de
                                        // déclencher une navigation.

                                        event.preventDefault();

                                        event.stopPropagation();
                                    }

                                    : undefined
                            }


                            // -------------------------------------
                            // STYLE
                            // -------------------------------------

                            style={{

                                position:
                                    "absolute",

                                left:
                                    "50%",

                                top:
                                    "50%",

                                width:
                                    systemSize.width,

                                height:
                                    systemSize.height,


                                transform:
                                    `translate(-50%, -50%) ` +
                                    `rotate(${angle}deg) ` +
                                    `scale(${scaleSysteme})`,


                                transformOrigin:
                                    "center center",


                                zIndex: 2,


                                cursor:
                                    dragAndDropEnabled
                                        ? "grab"
                                        : "default",


                                userSelect:
                                    "none",


                                // Important pour éviter
                                // certains comportements
                                // tactiles / navigateur.

                                touchAction:
                                    "none",
                            }}
                        >


                            <LoadAndDisplay
                                link={system}

                                style={{
                                    ...systemSize,

                                    // Le conteneur parent
                                    // gère le drag.

                                    pointerEvents:
                                        dragAndDropEnabled
                                            ? "none"
                                            : undefined,
                                }}
                            />


                        </div>
                    );
                }


                // =================================================
                // CASE
                // =================================================

                cases.push(

                    <div

                        key={
                            `case-${colonne}-${ligne}`
                        }


                        // -----------------------------------------
                        // DRAG OVER
                        // -----------------------------------------

                        onDragOver={
                            dragAndDropEnabled

                                ? event => {

                                    event.preventDefault();

                                    event.stopPropagation();


                                    event.dataTransfer.dropEffect =
                                        "move";
                                }

                                : undefined
                        }


                        // -----------------------------------------
                        // DROP
                        // -----------------------------------------

                        onDrop={
                            dragAndDropEnabled

                                ? event => {

                                    event.preventDefault();

                                    event.stopPropagation();


                                    const data =
                                        event.dataTransfer.getData(
                                            "text/plain"
                                        );


                                    if (
                                        data === ""
                                    ) {
                                        return;
                                    }


                                    const sourceIndex =
                                        Number(data);


                                    if (
                                        !Number.isInteger(
                                            sourceIndex
                                        )
                                    ) {
                                        return;
                                    }


                                    // Évite de faire
                                    // quelque chose si on
                                    // dépose au même endroit.

                                    if (
                                        sourceIndex ===
                                        index
                                    ) {
                                        return;
                                    }


                                    onDropSystem(
                                        index,
                                        sourceIndex
                                    );
                                }

                                : undefined
                        }


                        // -----------------------------------------
                        // STYLE CASE
                        // -----------------------------------------

                        style={{

                            position:
                                "absolute",

                            left:
                                positionX,

                            top:
                                positionY,

                            width:
                                largeurHex,

                            height:
                                hauteurHex,


                            backgroundColor:
                                couleurBordure,


                            clipPath:
                                clipHex,


                            pointerEvents:
                                "auto",


                            zIndex:
                                1,


                            cursor:
                                dragAndDropEnabled
                                    ? "copy"
                                    : "default",
                        }}
                    >


                        {/* =========================================
                            INTERIEUR DE LA CASE
                        ========================================= */}

                        <div

                            style={{

                                position:
                                    "absolute",

                                left:
                                    1,

                                top:
                                    1,

                                width:
                                    largeurHex - 2,

                                height:
                                    hauteurHex - 2,


                                backgroundColor:
                                    couleur,


                                clipPath:
                                    clipHex,


                                overflow:
                                    "hidden",


                                pointerEvents:
                                    "auto",
                            }}
                        >


                            {/* -------------------------------------
                                SYSTEME
                            ------------------------------------- */}

                            {contenuSysteme}


                            {/* -------------------------------------
                                NUMERO
                            ------------------------------------- */}

                            <div

                                style={{

                                    position:
                                        "absolute",

                                    left:
                                        0,

                                    top:
                                        0,

                                    width:
                                        "100%",

                                    height:
                                        "100%",


                                    display:
                                        "flex",

                                    alignItems:
                                        "center",

                                    justifyContent:
                                        "center",


                                    color:
                                        "#FFF",


                                    fontSize:
                                        14,

                                    fontWeight:
                                        "bold",


                                    pointerEvents:
                                        "none",


                                    zIndex:
                                        10,
                                }}
                            >

                                {numero}

                            </div>


                        </div>

                    </div>
                );
            }
        }


        // ====================================================
        // RENDU DU PLATEAU
        // ====================================================

        return (

            <div

                style={{

                    position:
                        "relative",

                    width:
                        largeurPlateau,

                    height:
                        hauteurPlateau,


                    flexShrink:
                        0,


                    overflow:
                        "hidden",
                }}
            >

                {cases}

            </div>
        );
    }


    // ========================================================
    // RENDU PAGE
    // ========================================================

    return (

        <div>

            <div
                style={{
                    ...pageStyle,

                    pageBreakAfter:
                        "auto",

                    breakAfter:
                        "auto",

                    ...style,
                }}
            >

                <Plateau />

            </div>

        </div>
    );
}


// ============================================================
// FORMULAIRE
// ============================================================

function Form({
    content,
    onChange,
    onSubmit,
    style,
}) {


    // ========================================================
    // INPUT HEXAGONE
    // ========================================================

    function HexInput({
        index,
        positionX,
    }) {


        const type =
            content.type?.[index] ||
            "vide";


        return (

            <div

                style={{

                    width:
                        130,

                    height:
                        86,


                    flexShrink:
                        0,


                    display:
                        "flex",

                    flexDirection:
                        "column",

                    alignItems:
                        "center",

                    justifyContent:
                        "flex-start",


                    gap:
                        2,


                    boxSizing:
                        "border-box",
                }}
            >


                <div

                    style={{

                        fontSize:
                            11,

                        color:
                            "#555",
                    }}
                >

                    {positionX}

                </div>


                <EnumInput
                    onChange={onChange}
                    name="type"
                    index={index}
                    value={content}
                    enumClass={typeSystem}
                />


                {type === "select" && (

                    <>

                        <ModalPickerInput
                            onChange={onChange}
                            name="systems"
                            value={content}
                            index={index}
                            type={["system"]}

                            style={{
                                maxWidth: 120,
                            }}
                        />


                        <NumberInput
                            onChange={onChange}
                            name="rotates"
                            value={content}
                            index={index}
                            min={0}
                            max={5}
                        />

                    </>
                )}

            </div>
        );
    }


    // ========================================================
    // LIGNES
    // ========================================================

    const lignes = [];


    // ========================================================
    // GRILLE
    // ========================================================

    for (
        let colonne = 0;
        colonne < 13;
        colonne++
    ) {


        const positionY =
            6 - colonne;


        for (
            let demi = 0;
            demi < 2;
            demi++
        ) {


            if (
                demi === 1 &&
                colonne === 12
            ) {
                continue;
            }


            const estDemi =
                demi === 1;


            const y =
                positionY -
                (
                    estDemi
                        ? 0.5
                        : 0
                );


            const debutLigne =
                estDemi
                    ? 1
                    : 0;


            const indices = [];


            // -----------------------------------------------
            // CASES DE LA LIGNE
            // -----------------------------------------------

            for (
                let ligne = debutLigne;
                ligne < 13;
                ligne += 2
            ) {


                const positionX =
                    ligne - 6;


                const distance =
                    Math.abs(positionX) / 2 +
                    Math.abs(y);


                if (
                    distance > 6
                ) {
                    continue;
                }


                indices.push({

                    index:
                        ligne * 13 +
                        colonne,

                    positionX,
                });
            }


            // -----------------------------------------------
            // DECALAGE HORIZONTAL
            // -----------------------------------------------

            const decalageHorizontal =
                (
                    6 -
                    Math.max(
                        ...indices.map(
                            ({ positionX }) =>
                                positionX
                        )
                    )
                ) *
                65;


            // -----------------------------------------------
            // RENDU LIGNE
            // -----------------------------------------------

            lignes.push(

                <div

                    key={
                        `${
                            estDemi
                                ? "demi"
                                : "entier"
                        }-${colonne}`
                    }

                    style={{

                        display:
                            "flex",

                        alignItems:
                            "flex-end",

                        gap:
                            6,

                        marginBottom:
                            8,
                    }}
                >


                    <div

                        style={{

                            width:
                                45,

                            flexShrink:
                                0,

                            textAlign:
                                "right",

                            fontSize:
                                12,

                            fontWeight:
                                "bold",

                            paddingBottom:
                                5,
                        }}
                    >

                        {y}

                    </div>


                    <div

                        style={{

                            display:
                                "flex",

                            gap:
                                6,

                            marginLeft:
                                decalageHorizontal,
                        }}
                    >

                        {indices.map(
                            ({
                                index,
                                positionX,
                            }) => (

                                <HexInput
                                    key={index}
                                    index={index}
                                    positionX={positionX}
                                />

                            )
                        )}

                    </div>

                </div>
            );
        }
    }


    // ========================================================
    // FORMULAIRE
    // ========================================================

    return (

        <FormBase
            content={content}
            onChange={onChange}
            onSubmit={onSubmit}
            style={style}
        >

            <NumberInput
                onChange={onChange}
                name="joueur"
                value={content}
                min={0}
                max={9}
                label="Nombre de joueur"
            />


            <div

                style={{

                    display:
                        "flex",

                    flexDirection:
                        "column",

                    overflowX:
                        "auto",
                }}
            >

                {lignes}

            </div>

        </FormBase>
    );
}


// ============================================================
// EXPORT
// ============================================================

export default {

    name:
        "Plateau",

    classe:
        plateau,

    form:
        Form,

    display: {
        default:
            Display,
    },

    editor:
        "noSplit",
};
