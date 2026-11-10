import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Link, LinkToString } from "../lib/datatype";
import { useSearch, getFromSearch, getFromType, nomDeListe } from "../lib/store";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { getHandler, getHandlerTypes } from "../Game/games";
import { useParams } from "react-router";
import { Label } from "./inputUtils";
import { Text } from "../Component/Text";
import { LigneElement } from "../Component/NomElement";

// Sans accents ni majuscules, pour le filtre
const simplifier = texte => (texte || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


function ModalPicker({
    type,
    value,
    onValidate,
    children,
    title = "Sélectionner un élément"
}) {
    const search = useSearch(state => state.search);
    const jeu = useParams().jeu;

    const modalId = useRef(
        "modalPicker" +
        Math.random().toString(36).substring(2)
    );

    const availableTypes = type?.length
        ? type
        : getHandlerTypes(jeu);

    const [selectedType, setSelectedType] =
        useState(null);

    const [selected, setSelected] =
        useState(
            new Link(availableTypes[0])
        );

    // Texte du filtre ; la liste n'est construite que fenêtre ouverte
    const [filtre, setFiltre] = useState("");
    const [ouvert, setOuvert] = useState(false);

    // À l'ouverture, la liste défile jusqu'à l'élément choisi
    useEffect(() => {
        if (ouvert) {
            document.getElementById(modalId.current)
                ?.querySelector("[data-choisi]")
                ?.scrollIntoView({ block: "center" });
        }
    }, [ouvert]);

    const open = () => {

        // L'élément déjà choisi est sélectionné à l'ouverture (et non « Aucun »)
        const actuel = value?.id > 0 && search.find(e => e.id === value.id);

        setSelectedType(null);
        setFiltre("");
        setOuvert(true);

        setSelected(
            actuel
                ? new Link(actuel.type, actuel.id)
                : new Link(availableTypes[0])
        );

        const modal =
            document.getElementById(
                modalId.current
            );

        if (modal) {
            modal.style.display = "block";
        }
    };

    const close = () => {
        setOuvert(false);

        const modal =
            document.getElementById(
                modalId.current
            );

        if (modal) {
            modal.style.display = "none";
        }
    };

    const changeType = (e) => {
        const newType =
            e.target.value;

        if (newType === "__all__") {
            setSelectedType(null);
            setSelected(
                new Link(availableTypes[0])
            );
            return;
        }

        setSelectedType(newType);

        setSelected(
            new Link(newType)
        );
    };

    const validate = () => {
        if (!selected) {
            close();
            return;
        }

        // « Aucun » (id -1) est transmis aussi : il vide le champ
        onValidate(selected);
        close();
    };

    const options =
        selectedType
            ? getFromType(
                search,
                [selectedType]
            )
            : getFromType(
                search,
                availableTypes
            );

    // Filtre sur le nom et sur ce à quoi l'élément est lié
    const cherche = simplifier(filtre.trim());

    const visibles = cherche
        ? options.filter(e => simplifier(nomDeListe(e)).includes(cherche))
        : options;

    const estChoisi = e => selected?.id === e.id;

    const styleLigne = choisi => ({
        padding: "3px 8px",
        cursor: "pointer",
        backgroundColor: choisi ? "#bbdefb" : undefined,
        fontWeight: choisi ? 700 : 400,
    });

    return (
        <>
            {children({ open })}

            {createPortal(
                <div
                    id={modalId.current}
                    style={{
                        display: "none",

                        position: "fixed",

                        backgroundColor:
                            "#DDDDDD88",

                        zIndex: 10000,

                        left: 0,
                        top: 0,

                        width: "100vw",
                        height: "100vh",
                    }}
                >
                    <div
                        style={{
                            position: "relative",

                            margin: "50px auto 0 auto",

                            width: "min(760px, 96vw)",
                            height: "min(520px, calc(100vh - 70px))",

                            display: "flex",
                            flexDirection: "column",

                            backgroundColor:
                                "#FFF",

                            borderColor:
                                "#444",

                            borderStyle:
                                "solid",

                            borderRadius:
                                12,

                            borderWidth:
                                5,

                            boxSizing:
                                "border-box",

                            overflow:
                                "hidden",
                        }}
                    >

                        {/* ==================================
                            EN-TÊTE
                        ================================== */}

                        <div
                            style={{
                                padding: 8,
                                borderBottom:
                                    "2px solid #ccc",
                            }}
                        >

                            <button
                                type="button"
                                onClick={close}
                                style={{
                                    float: "right",
                                }}
                            >
                                Fermer
                            </button>

                            <span
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                }}
                            >
                                {title}
                            </span>

                        </div>

                        {/* ==================================
                            TYPE, FILTRE, VALIDATION
                        ================================== */}

                        <div
                            style={{
                                padding: 8,
                                borderBottom:
                                    "2px solid #ccc",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                            }}
                        >

                            {availableTypes.length > 1 && (

                                <select
                                    value={
                                        selectedType ??
                                        "__all__"
                                    }
                                    onChange={
                                        changeType
                                    }
                                >

                                    <option value="__all__">
                                        Tous
                                    </option>

                                    {availableTypes.map(
                                        t => (
                                            <option
                                                key={t}
                                                value={t}
                                            >
                                                {
                                                    getHandler(
                                                        jeu,
                                                        t
                                                    ).name
                                                }
                                            </option>
                                        )
                                    )}

                                </select>
                            )}

                            <input
                                type="search"
                                value={filtre}
                                onChange={e => setFiltre(e.target.value)}
                                placeholder="filtrer par nom"
                                style={{ flex: "1 1 160px", minWidth: 0 }}
                            />

                            <button
                                type="button"
                                onClick={validate}
                            >
                                Valider
                            </button>

                        </div>

                        {/* ==================================
                            LISTE (à gauche) ET APERÇU (à droite)

                            Les noms sont ceux de la recherche de
                            l'en-tête : icônes, lien, type.
                        ================================== */}

                        <div
                            style={{
                                flex: 1,
                                minHeight: 0,
                                display: "flex",
                            }}
                        >

                            <div
                                data-liste-selecteur
                                style={{
                                    flex: "0 0 46%",
                                    overflowY: "auto",
                                    borderRight: "2px solid #ccc",
                                    fontFamily: "Arial, sans-serif",
                                    fontSize: 14,
                                }}
                            >

                                <div
                                    onClick={() => setSelected(new Link(selectedType ?? availableTypes[0]))}
                                    onDoubleClick={validate}
                                    style={styleLigne(!(selected?.id > 0))}
                                >
                                    Aucun
                                </div>

                                {ouvert && visibles.map(e => (
                                    <div
                                        key={`${e.type}-${e.id}`}
                                        data-choisi={estChoisi(e) || undefined}
                                        onClick={() => setSelected(new Link(e.type, e.id))}
                                        onDoubleClick={validate}
                                        style={styleLigne(estChoisi(e))}
                                    >
                                        {/* (un seul type proposé : inutile de le répéter) */}
                                        <LigneElement
                                            jeu={jeu}
                                            element={e}
                                            sansType={!!selectedType || availableTypes.length === 1}
                                        />
                                    </div>
                                ))}

                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: 10,
                                    overflow: "auto",
                                }}
                            >

                                <LoadAndDisplay
                                    link={
                                        selected?.__link
                                            ? selected
                                            : new Link(
                                                selectedType ??
                                                availableTypes[0]
                                            )
                                    }
                                />

                            </div>

                        </div>

                    </div>
                </div>,

                document.body
            )}
        </>
    );
}
/*
 * ============================================================
 * ModalPickerInput
 * ============================================================
 */

export function ModalPickerInput({
    onChange,
    name,
    value,
    label,
    type,
    index
}) {
    const val = index !== undefined
        ? value[name][index]
        : value[name];

    return (
        <div>
            {label && (
                <Label name={label} />
            )}

            <ModalPicker
                type={type}
                value={val}
                onValidate={(selected) => {
                    onChange(name, selected, index);
                }}
                title={
                    type?.length
                        ? `Sélection de ${type
                            .map(e => getHandler(useParams().jeu, e).name)
                            .join(", ")}`
                        : "Sélectionner un élément"
                }
            >
                {({ open }) => (
                    <button
                        type="button"
                        onClick={open}
                    >
                        <Text
                            text={
                                getFromSearch(
                                    useSearch.getState().search,
                                    val?.id || -1,
                                    { name: "Aucun" }
                                ).name
                            }
                        />
                    </button>
                )}
            </ModalPicker>
        </div>
    );
}


/*
 * ============================================================
 * ModalPickerEditorButton
 * ============================================================
 */
export function ModalPickerEditorButton({ editor }) {

    const cursorPosition = useRef(null);

    return (
        <ModalPicker
            onValidate={(selected) => {
                if (!editor || cursorPosition.current === null || selected.id === -1) {
                    return;
                }

                editor
                    .chain()
                    .focus()
                    .setTextSelection(cursorPosition.current)
                    .insertContent(`|${selected.id}|`)
                    .run();
            }}
            title="Sélectionner un élément"
        >
            {({ open }) => (
                <button
                    type="button"
                    disabled={!editor}
                    onMouseDown={(e) => {
                        e.preventDefault();

                        if (!editor) {
                            return;
                        }

                        cursorPosition.current =
                            editor.state.selection.from;

                        open();
                    }}
                >
                    🔗
                </button>
            )}
        </ModalPicker>
    );
}
