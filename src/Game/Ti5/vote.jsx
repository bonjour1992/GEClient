import { ElementContent } from "../../lib/datatype";
import { A4Pa } from "../../Component/Size";
import FormBase from "../../Input/FormBase";
import { TextInput } from "../../Input/TextInput";
import { TableInput } from "../../Input/TableInput";
import { PlayerColor } from "./ti5Const";




// ============================================================
// DONNÉES
// ============================================================

class vote extends ElementContent {
    label = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
    ];
    labelNum=8
}


// ============================================================
// AFFICHAGE
// ============================================================

function Display({ content, explication }) {

    // --------------------------------------------------------
    // PARAMÈTRES
    // --------------------------------------------------------

    const couleurs = Object.values(PlayerColor);

    const nombreLignes = 6;
    const nombreColonnes = 8;

    const couleurFond = "#ffffff";
    const couleurBordure = "#ffffff";

    // --------------------------------------------------------
    // STYLES PAGE A4 PAYSAGE
    // --------------------------------------------------------

    const pageStyle = {
        ...A4Pa,
        padding: 0,
        margin: 0,
        border: "none",
        outline: "none",
        backgroundColor: couleurFond,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        color: "#000",
        flexShrink: 0,
    };

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        margin: 0,
        padding: 0,
        gap: 0,
        backgroundColor: couleurFond,
    };

    // --------------------------------------------------------
    // LABEL
    // --------------------------------------------------------
function LabelCell({ index }) {

    const label = content.label?.[index] || "";

    return (
        <div
            style={{
                flex: 1,
                height: "100%",
                display: "flex",
                boxSizing: "border-box",
                backgroundColor: couleurs[index],
                border: `1px solid ${couleurBordure}`,
                position: "relative",
                padding: 0,
            }}
        >
            {/* Zone gauche réservée au label */}
            <div
                style={{
                    width: "75%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 5,
                    boxSizing: "border-box",
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: "bold",
                    lineHeight: 1.1,
                    wordBreak: "break-word",
                }}
            >
                {label}
            </div>

            {/* Quart droit */}
            <div
                style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "25%",
                    height: "100%",
                    borderLeft: "2px solid "+ couleurBordure,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {/* Carré blanc */}
                <div
                    style={{
                        width: "70%",
                        aspectRatio: "1 / 1",
                        backgroundColor: "#fff",
                        border: "2px solid #000",
                        boxSizing: "border-box",
                    }}
                />
            </div>
        </div>
    );
}

    // --------------------------------------------------------
    // LIGNE
    // --------------------------------------------------------

    function VoteRow({ numero }) {

        return (
            <div
                style={{
                    width: "100%",
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    boxSizing: "border-box",
                }}
            >

                {/* Numéro de ligne */}
                <div
                    style={{
                        width: 60,
                        height: "100%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",

                        backgroundColor: "#eeeeee",

                        borderTop: `1px solid ${couleurBordure}`,
                        borderLeft: `1px solid ${couleurBordure}`,
                        borderBottom:
                            numero === nombreLignes
                                ? `1px solid ${couleurBordure}`
                                : "none",

                        fontSize: 30,
                        fontWeight: "bold",
                        boxSizing: "border-box",
                    }}
                >
                    {numero}
                </div>

                {/* 8 cases */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        display: "flex",
                    }}
                >
                    {Array.from(
                        { length: nombreColonnes },
                        (_, index) => (
                            <LabelCell
                                key={index}
                                index={index}
                            />
                        )
                    )}
                </div>

            </div>
        );
    }

    // --------------------------------------------------------
    // TABLEAU COMPLET
    // --------------------------------------------------------

  function VoteTable() {

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
            }}
        >

            {/* ------------------------------------------------
                6 LIGNES
            ------------------------------------------------ */}

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {Array.from(
                    { length: nombreLignes },
                    (_, index) => (
                        <VoteRow
                            key={index}
                            numero={index + 1}
                        />
                    )
                )}
            </div>

        </div>
    );
}



    // --------------------------------------------------------
    // RENDU PAGE
    // --------------------------------------------------------

    return (
        <div style={containerStyle}>
            <div
                style={{
                    ...pageStyle,
                    pageBreakAfter: "auto",
                    breakAfter: "auto",
                }}
            >
                <VoteTable />
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

    function LabelLine(index) {
        return [
            (
                <TextInput
                    key={index}
                    onChange={onChange}
                    index={index}
                    name="label"
                    value={content}
                    label={`Joueur ${index + 1}`}
                />
            ),
        ];
    }

    return (
        <FormBase
            content={content}
            onChange={onChange}
            onSubmit={onSubmit}
            style={style}
        >
            <TableInput
                onChange={onChange}
                name="labelNum"
                value={content}
                lable="Labels"
                Line={LabelLine}
            />
        </FormBase>
    );
}


// ============================================================
// EXPORT
// ============================================================

export default {
    name: "Vote",
    classe: vote,
    form: Form,
    display: {
        default: Display,
    },
};
