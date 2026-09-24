import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { Link, LinkToString } from "../lib/datatype";
import { useSearch, getFromSearch, getFromType } from "../lib/store";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { getHandler, getHandlerTypes } from "../Game/games";
import { useParams } from "react-router";
import { Label } from "./inputUtils";
import { Text } from "../Component/Text";


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

    const open = () => {
        setSelectedType(null);

        setSelected(
            new Link(availableTypes[0])
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
        if (
            !selected ||
            selected.id === -1
        ) {
            close();
            return;
        }

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

                            width: 400,
                            height: 400,

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
                            SÉLECTION
                        ================================== */}

                        <div
                            style={{
                                padding: 8,
                                borderBottom:
                                    "2px solid #ccc",
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

                            <select
                                value={
                                    LinkToString(
                                        selected
                                    )
                                }
                                onChange={e => {

                                    setSelected(
                                        new Link()
                                            .fromString(
                                                e.target.value
                                            )
                                    );

                                }}
                            >

                                <option
                                    value={
                                        `${
                                            selectedType ??
                                            availableTypes[0]
                                        }#-1`
                                    }
                                >
                                    Aucun
                                </option>

                                {options.map(
                                    e => (

                                        <option
                                            key={
                                                `${e.type}-${e.id}`
                                            }
                                            value={
                                                new Link(
                                                    e.type,
                                                    e.id
                                                ).toString()
                                            }
                                        >
                                            {e.name}
                                        </option>

                                    )
                                )}

                            </select>

                            <button
                                type="button"
                                onClick={validate}
                            >
                                Valider
                            </button>

                        </div>

                        {/* ==================================
                            APERÇU
                        ================================== */}

                        <div
                            style={{
                                padding: 10,
                                overflow: "auto",
                                height: 320,
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
                if (!editor || cursorPosition.current === null) {
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
