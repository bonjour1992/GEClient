import { generateHTML, Editor } from "@tiptap/core";
import { useEditor, useEditorState, EditorContext, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ReactNode, useEffect } from "react";
import { Label } from "./inputUtils";

export function EditorInput({ index, onChange, name = "name", value, label, size = { width: 400, height: 200 } }) {
    const val = index !== undefined ? value[name][index] : value[name]
    const extensions = [StarterKit]
    const editor = useEditor({
        extensions: extensions,
        editorProps: {
            attributes: {
                class: "tiptap",
            },
        },
        content: val || "loading",
        // Don't render immediately on the server to avoid SSR issues
        immediatelyRender: false,
        onUpdate: () => onChange(name, generateHTML(editor.getJSON(), extensions), index),
    })

    //pas compris mais nécessaire pour initialiser l'éditeur
    useEffect(() => { if (editor && val != generateHTML(editor?.getJSON(), extensions)) editor?.commands.setContent(val) }, [val, editor])


    const editorState = useEditorState({
        editor,
        // the selector function is used to select the state you want to react to
        selector: ({ editor }) => {
            if (!editor) return null;
            return {
                isEditable: editor.isEditable,
                currentSelection: editor.state.selection,
                currentContent: editor.getJSON(),
                isBold: editor.isActive('bold'),
            };
        },
    })

    return (
        <div style={{
            width: 400,
            borderWidth: 2,
            borderStyle: "solid",
            borderRadius: 8,
            paddingBottom: 4
        }}>
            {label && (<Label style={{
                textAlign: "center",
                width: "100%",
                display: "block",
                borderBottomStyle: "solid",
                borderWidth: 2
            }} name={label} />)}
            <EditorContext.Provider value={{ editor }} >
                <div >
                    <div
                        style={{
                            display: "flex",
                            gap: 2,
                            paddingLeft: 3,
                            padding: 1
                        }}>
                        <button
                            onClick={(e) => {
                                editor.chain().focus().toggleBold().run()
                                e.preventDefault()
                            }}
                            style={{
                                borderStyle: "solid",
                                borderWidth: 3,
                                borderColor: editorState?.isBold ? "#555" : "#AAA",
                                borderRadius: 6
                            }}
                        >
                            B
                        </button>
                    </div>
                </div>
                <EditorContent editor={editor} />
            </EditorContext.Provider>
        </div>
    )
}
