import React from "react";
import { ElementContent } from "../../lib/datatype";
import FormBase from "../../Input/FormBase";
import { TextInput } from "../../Input/TextInput";
import { NumberInput } from "../../Input/NumberInput";
import { EditorInput } from "../../Input/EditorInput";
import { ImagePicker } from "../../Input/ImagePicker";
import FreeTagInput from "../../Input/FreeTagInput";
import { RessourceInput, RessourceIcon } from "./Ressources";
import { PokerPo } from "../../Component/Size";
import { pub } from "../../lib/fetch";
import { Text } from "../../Component/Text";

const FACE_LABELS = [
    "Recto haut",
    "Recto bas (à l'envers)",
    "Verso haut",
    "Verso bas (à l'envers)",
];

const FACE_KEYS = ["rectoHaut", "rectoBas", "versoHaut", "versoBas"];
const ACTION_KEYS = ["centraleHaut", "centraleBas", "bas", "droite", "basGauche"];
const ACTION_LABELS = [
    "Centrale haute",
    "Centrale basse",
    "En bas",
    "À droite",
    "En bas à gauche",
];

const ACTION_TYPES = [
    { value: "obligatoire", label: "Obligatoire", color: "#c62828" },
    { value: "gratuite", label: "Gratuite", color: "#2e8b57" },
    { value: "principale", label: "Principale", color: "#ffffff" },
];

function emptyActions() {
    return ACTION_KEYS.map(() => ({ type: "principale", texte: "" }));
}

function emptyFaceActions() {
    return [emptyActions(), emptyActions(), emptyActions(), emptyActions()];
}

export class CarteContent extends ElementContent {
    numero = 1;

    // Ordre fixe : recto haut, recto bas, verso haut, verso bas.
    // Les faces 1 et 3 sont les faces hautes obligatoires de chaque côté.
    facesActives = [true, false, false, false];
    noms = ["", "", "", ""];
    images = ["", "", "", ""];
    tags = [[], [], [], []];
    production = [[], [], [], []];
    actions = emptyFaceActions();
}

function faceExists(content, index) {
    return Boolean(content?.facesActives?.[index]);
}

function FaceDisplay({ content, index, height, showNumber = false }) {
    const actions = content.actions?.[index] || emptyActions();
    const activeActions = actions
        .map((action, actionIndex) => ({ ...action, actionIndex }))
        .filter((action) => action.texte);

    const imagePath = content.images?.[index];
    const isInverted = index === 1 || index === 3;

    return (
        <div style={{
            height,
            width: "100%",
            minHeight: 0,
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            background: "#111",
            color: "#f5f0e6",
            display: "flex",
            flexDirection: "column",
            padding: 6,
            gap: 3,
            transform: isInverted ? "rotate(180deg)" : undefined,
        }}>
            {showNumber && (
                <div style={{
                    position: "absolute", top: 4, left: 6,
                    fontWeight: 800, fontSize: 15, zIndex: 2,
                }}>
                    {content.numero}
                </div>
            )}

            {/* Le nom reste volontairement discret pour laisser la place au contenu. */}
            {!!content.noms?.[index] && (
                <div style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 10,
                    lineHeight: "12px",
                    padding: "1px 18px 2px",
                    borderBottom: "1px solid #777",
                    flex: "0 0 auto",
                    maxHeight: 16,
                    overflow: "hidden",
                }}>
                    {content.noms[index]}
                </div>
            )}

            {imagePath && (
                <img
                    src={pub + imagePath}
                    alt={content.noms?.[index] || ""}
                    style={{
                        width: "100%",
                        height: height > 200 ? 95 : 55,
                        objectFit: "contain",
                        flexShrink: 0,
                    }}
                />
            )}

            {!!content.tags?.[index]?.length && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {content.tags[index].map((tag) => (
                        <span key={tag} style={{
                            border: "1px solid #aaa", borderRadius: 7,
                            padding: "1px 4px", fontSize: 8,
                        }}>{tag}</span>
                    ))}
                </div>
            )}

            {!!content.production?.[index]?.length && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {content.production[index].map((item, i) => (
                        <span key={`${item.ressource}-${i}`} style={{
                            display: "inline-flex", alignItems: "center", gap: 2,
                            fontSize: 11, fontWeight: 700,
                        }}>
                            <RessourceIcon type={item.ressource} size={16} />
                            {item.quantite}
                        </span>
                    ))}
                </div>
            )}

            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gridTemplateRows: "1fr 1fr auto",
                gap: 3,
                flex: 1,
                minHeight: 0,
            }}>
                {activeActions.map((action) => {
                    const actionType = ACTION_TYPES.find((type) => type.value === action.type)
                        || ACTION_TYPES[2];
                    const position = [
                        { gridColumn: "2", gridRow: "1" },
                        { gridColumn: "2", gridRow: "2" },
                        { gridColumn: "2", gridRow: "3" },
                        { gridColumn: "3", gridRow: "1 / 4" },
                        { gridColumn: "1", gridRow: "3" },
                    ][action.actionIndex];
                    const isRight = action.actionIndex === 3;

                    return (
                        <div key={action.actionIndex} style={{
                            ...position,
                            background: actionType.color,
                            color: action.type === "principale" ? "#171717" : "#fff",
                            border: "1px solid #777",
                            borderRadius: 4,
                            padding: 3,
                            fontSize: 9,
                            overflow: "hidden",
                            minWidth: 0,
                            minHeight: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                        }}>
                            <div style={{
                                width: isRight ? "max-content" : "100%",
                                maxWidth: isRight ? "none" : "100%",
                                transform: isRight ? "rotate(90deg)" : undefined,
                                transformOrigin: "center",
                                whiteSpace: "pre-wrap",
                            }}>
                                <Text text={action.texte} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SideDisplay({ content, side, style = {} }) {
    const firstIndex = side === "recto" ? 0 : 2;
    const secondIndex = firstIndex + 1;
    const hasFirst = faceExists(content, firstIndex);
    const hasSecond = faceExists(content, secondIndex);
    const hasAny = hasFirst || hasSecond;

    if (!hasAny) {
        return <div style={{ ...PokerPo, background: "#000", ...style }} />;
    }

    const split = hasFirst && hasSecond;
    const height = split ? PokerPo.height / 2 : PokerPo.height;

    return (
        <div style={{
            ...PokerPo,
            height: PokerPo.height,
            boxSizing: "border-box",
            overflow: "hidden",
            background: "#111",
            border: "2px solid #555",
            display: "flex",
            flexDirection: "column",
            ...style,
        }}>
            {hasFirst && (
                <FaceDisplay
                    content={content}
                    index={firstIndex}
                    height={height}
                    showNumber={side === "recto" && (hasFirst || !hasSecond)}
                />
            )}
            {hasSecond && (
                <FaceDisplay
                    content={content}
                    index={secondIndex}
                    height={height}
                    showNumber={side === "recto" && !hasFirst}
                />
            )}
        </div>
    );
}

function ActionForm({ action, faceIndex, actionIndex, onChange }) {
    const type = action.type || "principale";
    const color = ACTION_TYPES.find((item) => item.value === type)?.color || "#fff";

    const update = (patch) => {
        onChange(faceIndex, actionIndex, { ...action, ...patch });
    };

    return (
        <div style={{
            border: "1px solid #bbb",
            borderLeft: `5px solid ${color === "#ffffff" ? "#888" : color}`,
            borderRadius: 6,
            padding: 8,
            marginBottom: 8,
        }}>
            <strong>{ACTION_LABELS[actionIndex]}</strong>
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}>
                <label style={{ fontSize: 13 }}>Type</label>
                <select
                    value={type}
                    onChange={(e) => update({ type: e.target.value })}
                    style={{ flex: 1, padding: 5 }}
                >
                    {ACTION_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>
            </div>
            <EditorInput
                name="texte"
                value={action}
                onChange={(name, texte) => update({ [name]: texte })}
                label="Texte de l'action"
            />
        </div>
    );
}

function Form({ content, onChange, onSubmit, style }) {
    const updateAction = (faceIndex, actionIndex, nextAction) => {
        const nextFaces = (content.actions || emptyFaceActions()).map((faceActions, i) =>
            i === faceIndex
                ? faceActions.map((action, j) => j === actionIndex ? nextAction : action)
                : faceActions
        );
        onChange("actions", nextFaces);
    };

    const toggleFace = (index, checked) => {
        const next = [...(content.facesActives || [true, false, false, false])];
        next[index] = checked;
        onChange("facesActives", next);
    };

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <NumberInput
                name="numero"
                value={content}
                onChange={onChange}
                label="Numéro de carte"
            />

            {FACE_LABELS.map((label, index) => {
                const active = faceExists(content, index);
                const isRequired = index === 0;
                return (
                    <section key={FACE_KEYS[index]} style={{
                        border: "1px solid #aaa",
                        borderRadius: 8,
                        padding: 10,
                        margin: "12px 0",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <input
                                type="checkbox"
                                checked={active}
                                disabled={isRequired}
                                onChange={(e) => toggleFace(index, e.target.checked)}
                            />
                            <h3 style={{ margin: 0 }}>{label}</h3>
                            {isRequired && <small>(obligatoire)</small>}
                        </div>

                        {active && (
                            <>
                                <TextInput
                                    name="noms"
                                    value={content}
                                    index={index}
                                    onChange={onChange}
                                    label="Nom"
                                />
                                <ImagePicker
                                    name="images"
                                    value={content}
                                    index={index}
                                    onChange={onChange}
                                    label="Image"
                                />
                                <FreeTagInput
                                    name="tags"
                                    value={content}
                                    index={index}
                                    onChange={onChange}
                                    label="Tags"
                                    tagType="FeodalKingdom"
                                />
                                <RessourceInput
                                    name="production"
                                    value={content}
                                    index={index}
                                    onChange={onChange}
                                    label="Production"
                                />

                                <h4>Actions</h4>
                                {(content.actions?.[index] || emptyActions()).map((action, actionIndex) => (
                                    <ActionForm
                                        key={`${index}-${actionIndex}`}
                                        action={action}
                                        faceIndex={index}
                                        actionIndex={actionIndex}
                                        onChange={updateAction}
                                    />
                                ))}
                            </>
                        )}
                    </section>
                );
            })}
        </FormBase>
    );
}

function Display({ content, style = {} }) {
    return <SideDisplay content={content} side="recto" style={style} />;
}

function Verso({ content, style = {} }) {
    return <SideDisplay content={content} side="verso" style={style} />;
}

export default {
    name: "Carte",
    classe: CarteContent,
    form: Form,
    display: {
        default: Display,
        verso: Verso,
    },
    print: {
        bgColor: "#000000",
        numPage: 1,
        padding: 0,
        page: "A4 portrait",
    },
};
