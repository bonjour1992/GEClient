import { generateHTML } from "@tiptap/core";
import { useEditor, EditorContext, EditorContent, useEditorState } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Typography } from "@tiptap/extension-typography";
import { useEffect } from "react";
import { ModalPickerEditorButton } from "./ModalPickerInput";
export const fullEditorStyle = {
    width: "98%",
    minWidth: "200px",
    minHeight: "300px",
    margin: "2px",
};


export function FullEditorInput({
    index,
    onChange,
    name = "name",
    value,
    label
}) {

    const val =
        index !== undefined
            ? value[name]?.[index]
            : value[name];


    /*
     * Extensions Tiptap
     */
    const extensions = [
        StarterKit,

        TextStyle,

        Color,

        Highlight.configure({
            multicolor: true
        }),


        TextAlign.configure({
            types: [
                "heading",
                "paragraph"
            ]
        }),


    ];


    /*
     * Création de l'éditeur
     */
    const editor = useEditor({

        extensions,

        editorProps: {
            attributes: {
                style: `
                    ${fullEditorStyle.width
                    ? `width:${fullEditorStyle.width};`
                    : ""}
                    min-width:${fullEditorStyle.minWidth};
                    min-height:${fullEditorStyle.minHeight};
                    margin:${fullEditorStyle.margin};
                    background-color:${fullEditorStyle.backgroundColor};
                    padding:8px;
                    box-sizing:border-box;
                    outline:none;
                `
            }
        },

        content: val || "",

        immediatelyRender: false,

        onUpdate: ({ editor }) => {

            onChange(
                name,
                generateHTML(
                    editor.getJSON(),
                    extensions
                ),
                index
            );
        }
    });


    /*
     * Synchronisation avec la valeur externe.
     */
    useEffect(() => {

        if (!editor)
            return;

        const currentHTML =
            generateHTML(
                editor.getJSON(),
                extensions
            );

        if (val !== currentHTML) {
            editor.commands.setContent(
                val || "",
                false
            );
        }

    }, [val, editor]);


    /*
     * Etat utilisé par la toolbar.
     */
    const editorState = useEditorState({

        editor,

        selector: ({ editor }) => {

            if (!editor)
                return null;

            return {

                isBold:
                    editor.isActive("bold"),

                isItalic:
                    editor.isActive("italic"),

                isUnderline:
                    editor.isActive("underline"),

                isStrike:
                    editor.isActive("strike"),

                isCode:
                    editor.isActive("code"),

                isBulletList:
                    editor.isActive("bulletList"),

                isOrderedList:
                    editor.isActive("orderedList"),

                isBlockquote:
                    editor.isActive("blockquote"),

                isHeading1:
                    editor.isActive("heading", {
                        level: 1
                    }),

                isHeading2:
                    editor.isActive("heading", {
                        level: 2
                    }),

                isHeading3:
                    editor.isActive("heading", {
                        level: 3
                    }),

                isLeft:
                    editor.isActive({
                        textAlign: "left"
                    }),

                isCenter:
                    editor.isActive({
                        textAlign: "center"
                    }),

                isRight:
                    editor.isActive({
                        textAlign: "right"
                    }),

                isJustify:
                    editor.isActive({
                        textAlign: "justify"
                    }),

                canUndo:
                    editor.can().undo(),

                canRedo:
                    editor.can().redo()
            };
        }
    });


    /*
     * Rien à afficher tant que l'éditeur
     * n'est pas initialisé.
     */
    if (!editor) {
        return (
            <div
                style={{
                    width: "100%"
                }}
            >
                {label && (
                    <Label name={label} />
                )}

                <div
                    style={{
                        minHeight: 120,
                        backgroundColor: "#DDDDDD",
                        borderRadius: 6
                    }}
                />
            </div>
        );
    }


    /*
     * Bouton générique de toolbar.
     */
    function ToolButton({
        children,
        active = false,
        disabled = false,
        onClick,
        title
    }) {

        return (
            <button
                type="button"
                title={title}
                disabled={disabled}

                onMouseDown={(e) => {
                    e.preventDefault();
                    onClick();
                }}

                style={{
                    height: 28,
                    minWidth: 28,
                    padding: "2px 7px",

                    border: "2px solid",
                    borderColor:
                        active
                            ? "#555"
                            : "#AAA",

                    borderRadius: 5,

                    backgroundColor:
                        active
                            ? "#CCC"
                            : "#EEE",

                    color:
                        disabled
                            ? "#AAA"
                            : "#222",

                    cursor:
                        disabled
                            ? "default"
                            : "pointer",

                    fontWeight:
                        active
                            ? 700
                            : 400
                }}
            >
                {children}
            </button>
        );
    }


    /*
     * Couleur du texte.
     */
    function setTextColor(color) {

        editor
            .chain()
            .focus()
            .setColor(color)
            .run();
    }


    /*
     * Surlignage.
     */
    function setHighlight(color) {

        editor
            .chain()
            .focus()
            .toggleHighlight({
                color
            })
            .run();
    }


    /*
     * Taille du texte.
     *
     * Tiptap n'a pas de commande native setFontSize.
     * On utilise donc TextStyle.
     */
    function setFontSize(size) {

        editor
            .chain()
            .focus()
            .setMark("textStyle", {
                fontSize: size
            })
            .run();
    }


    /*
     * Lien.
     */
    function setLink() {

        const previousUrl =
            editor.getAttributes("link").href;

        const url =
            window.prompt(
                "URL du lien",
                previousUrl || "https://"
            );

        if (url === null)
            return;

        if (url === "") {

            editor
                .chain()
                .focus()
                .unsetLink()
                .run();

            return;
        }

        editor
            .chain()
            .focus()
            .setLink({
                href: url
            })
            .run();
    }


    return (

        <div
            style={{
                width: "100%",
                borderWidth: 2,
                borderStyle: "solid",
                borderRadius: 8,
                paddingBottom: 4,
                boxSizing: "border-box"
            }}
        >

            {label && (
                <Label
                    style={{
                        textAlign: "center",
                        width: "100%",
                        display: "block",
                        borderBottomStyle: "solid",
                        borderWidth: 2
                    }}
                    name={label}
                />
            )}


            <EditorContext.Provider
                value={{
                    editor
                }}
            >

                {/* TOOLBAR */}

                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 3,
                        padding: 4,
                        borderBottom: "1px solid #AAA",
                        backgroundColor: "#EEE"
                    }}
                >

                    {/* Historique */}

                    <ToolButton
                        disabled={!editorState?.canUndo}
                        title="Annuler"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .undo()
                                .run()
                        }
                    >
                        ↶
                    </ToolButton>


                    <ToolButton
                        disabled={!editorState?.canRedo}
                        title="Rétablir"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .redo()
                                .run()
                        }
                    >
                        ↷
                    </ToolButton>


                    <span style={separatorStyle} />


                    {/* Titres */}

                    <ToolButton
                        active={editorState?.isHeading1}
                        title="Titre 1"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({
                                    level: 1
                                })
                                .run()
                        }
                    >
                        H1
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isHeading2}
                        title="Titre 2"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({
                                    level: 2
                                })
                                .run()
                        }
                    >
                        H2
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isHeading3}
                        title="Titre 3"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({
                                    level: 3
                                })
                                .run()
                        }
                    >
                        H3
                    </ToolButton>


                    <span style={separatorStyle} />


                    {/* Style du texte */}

                    <ToolButton
                        active={editorState?.isBold}
                        title="Gras"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleBold()
                                .run()
                        }
                    >
                        <b>B</b>
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isItalic}
                        title="Italique"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleItalic()
                                .run()
                        }
                    >
                        <i>I</i>
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isUnderline}
                        title="Souligné"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleUnderline()
                                .run()
                        }
                    >
                        <u>U</u>
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isStrike}
                        title="Barré"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleStrike()
                                .run()
                        }
                    >
                        <s>S</s>
                    </ToolButton>


                    <span style={separatorStyle} />


                    {/* Taille */}

                    <select
                        title="Taille du texte"
                        defaultValue=""
                        onChange={(e) => {

                            if (!e.target.value)
                                return;

                            setFontSize(
                                e.target.value
                            );

                            e.target.value = "";
                        }}

                        onMouseDown={(e) => {
                            /*
                             * Empêche le select de voler
                             * la sélection de texte.
                             */
                        }}

                        style={{
                            height: 28,
                            border: "2px solid #AAA",
                            borderRadius: 5,
                            backgroundColor: "#EEE"
                        }}
                    >
                        <option value="">
                            Taille
                        </option>

                        <option value="10px">
                            10
                        </option>

                        <option value="12px">
                            12
                        </option>

                        <option value="14px">
                            14
                        </option>

                        <option value="16px">
                            16
                        </option>

                        <option value="18px">
                            18
                        </option>

                        <option value="20px">
                            20
                        </option>

                        <option value="24px">
                            24
                        </option>

                        <option value="28px">
                            28
                        </option>

                        <option value="32px">
                            32
                        </option>
                    </select>


                    {/* Couleur */}

                    <label
                        title="Couleur du texte"
                        style={{
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "0 4px",
                            border: "2px solid #AAA",
                            borderRadius: 5,
                            backgroundColor: "#EEE",
                            cursor: "pointer"
                        }}
                    >
                        A

                        <input
                            type="color"
                            defaultValue="#000000"
                            onChange={(e) =>
                                setTextColor(
                                    e.target.value
                                )
                            }
                            style={{
                                width: 22,
                                height: 22,
                                padding: 0,
                                border: "none"
                            }}
                        />
                    </label>


                    {/* Surlignage */}

                    <label
                        title="Surlignage"
                        style={{
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "0 4px",
                            border: "2px solid #AAA",
                            borderRadius: 5,
                            backgroundColor: "#EEE",
                            cursor: "pointer"
                        }}
                    >
                        🖍

                        <input
                            type="color"
                            defaultValue="#ffff00"
                            onChange={(e) =>
                                setHighlight(
                                    e.target.value
                                )
                            }
                            style={{
                                width: 22,
                                height: 22,
                                padding: 0,
                                border: "none"
                            }}
                        />
                    </label>


                    <span style={separatorStyle} />


                    {/* Listes */}

                    <ToolButton
                        active={editorState?.isBulletList}
                        title="Liste à puces"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleBulletList()
                                .run()
                        }
                    >
                        • ☰
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isOrderedList}
                        title="Liste numérotée"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleOrderedList()
                                .run()
                        }
                    >
                        1. ☰
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isBlockquote}
                        title="Citation"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleBlockquote()
                                .run()
                        }
                    >
                        ❝
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isCode}
                        title="Code"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleCode()
                                .run()
                        }
                    >
                        {"</>"}
                    </ToolButton>


                    <span style={separatorStyle} />


                    {/* Alignement */}

                    <ToolButton
                        active={editorState?.isLeft}
                        title="Aligner à gauche"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .setTextAlign("left")
                                .run()
                        }
                    >
                        ≡
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isCenter}
                        title="Centrer"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .setTextAlign("center")
                                .run()
                        }
                    >
                        ≡
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isRight}
                        title="Aligner à droite"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .setTextAlign("right")
                                .run()
                        }
                    >
                        ≡
                    </ToolButton>


                    <ToolButton
                        active={editorState?.isJustify}
                        title="Justifier"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .setTextAlign("justify")
                                .run()
                        }
                    >
                        ≡
                    </ToolButton>


                    <span style={separatorStyle} />


                    {/* Lien */}

                    <ToolButton
                        title="Lien"
                        onClick={setLink}
                    >
                        🔗
                    </ToolButton>


                    {/* Supprimer le formatage */}

                    <ToolButton
                        title="Supprimer le formatage"
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .clearNodes()
                                .unsetAllMarks()
                                .run()
                        }
                    >
                        Tx
                    </ToolButton>


                    <ModalPickerEditorButton
                        editor={editor}
                    />

                </div>


                {/* EDITOR */}

                <EditorContent
                    editor={editor}
                />

            </EditorContext.Provider>

        </div>
    );
}


const separatorStyle = {
    width: 1,
    height: 24,
    backgroundColor: "#BBB",
    margin: "0 2px"
};
