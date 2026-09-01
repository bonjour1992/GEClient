import { useRef, useState } from "react";
import { Link, LinkToString } from "../lib/datatype";
import { useSearch, getFromSearch, getFromType } from "../lib/store";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { getHandler, getHandlerTypes } from "../Game/games";
import { useParams } from "react-router";
import { Label } from "./inputUtils";
import { Text } from "../Component/Text";


/*
 * Composant interne commun aux deux usages.
 *
 * Il ne sait pas ce qu'on fait de l'élément sélectionné.
 * C'est onValidate qui décide.
 */
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
        "modalPicker" + Math.random().toString(36).substring(2)
    );

    /*
     * Si type est fourni, on limite les types.
     * Sinon on prend tous les types du jeu.
     */
    const availableTypes = type?.length
        ? type
        : getHandlerTypes(jeu);

    /*
     * null = Tous
     */
    const [selectedType, setSelectedType] = useState(null);

    const [selected, setSelected] = useState(
        new Link(availableTypes[0])
    );

    const open = () => {
        setSelectedType(null);
        setSelected(new Link(availableTypes[0]));

        document.getElementById(modalId.current).style.display = "block";
    };

    const close = () => {
        document.getElementById(modalId.current).style.display = "none";
    };

    const changeType = (e) => {
        const newType = e.target.value;

        if (newType === "__all__") {
            setSelectedType(null);
            setSelected(new Link(availableTypes[0]));
            return;
        }

        setSelectedType(newType);
        setSelected(new Link(newType));
    };

    const validate = () => {
        if (!selected || selected.id === -1) {
            close();
            return;
        }

        onValidate(selected);
        close();
    };

    /*
     * Tous les types ou uniquement le type sélectionné.
     */
    const options = selectedType
        ? getFromType(search, [selectedType])
        : getFromType(search, availableTypes);

    return (
        <>
            {children({ open })}

            <div
                id={modalId.current}
                style={{
                    display: "none",
                    position: "fixed",
                    backgroundColor: "#DDDDDD88",
                    zIndex: 100,
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%"
                }}
            >
                <div
                    style={{
                        position: "relative",
                        margin: "auto",
                        top: 50,
                        width: 400,
                        height: 400,
                        backgroundColor: "#FFF",
                        borderColor: "#444",
                        borderStyle: "solid",
                        borderRadius: 12,
                        borderWidth: 5,
                    }}
                >
                    <div>
                        <button
                            type="button"
                            onClick={close}
                            style={{ float: "right" }}
                        >
                            Fermer
                        </button>

                        <span
                            style={{
                                fontSize: 20,
                                fontWeight: 700
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    <div className="w-full border-b-2 pt-1 pb-1">

                        {availableTypes.length > 1 && (
                            <select
                                value={selectedType ?? "__all__"}
                                onChange={changeType}
                            >
                                <option value="__all__">
                                    Tous
                                </option>

                                {availableTypes.map(t => (
                                    <option
                                        key={t}
                                        value={t}
                                    >
                                        {getHandler(jeu, t).name}
                                    </option>
                                ))}
                            </select>
                        )}

                        <select
                            value={LinkToString(selected)}
                            onChange={(e) => {
                                setSelected(
                                    (new Link).fromString(e.target.value)
                                );
                            }}
                        >
                            <option
                                value={
                                    `${selectedType ?? availableTypes[0]}#-1`
                                }
                            >
                                Aucun
                            </option>

                            {options.map(e => (
                                <option
                                    key={`${e.type}-${e.id}`}
                                    value={
                                        new Link(
                                            e.type,
                                            e.id
                                        ).toString()
                                    }
                                >
                                    {e.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={validate}
                        >
                            Valider
                        </button>
                    </div>

                    <div>
                        <LoadAndDisplay
                            link={
                                selected?.__link
                                    ? selected
                                    : new Link(
                                        selectedType ?? availableTypes[0]
                                    )
                            }
                        />
                    </div>
                </div>
            </div>
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
