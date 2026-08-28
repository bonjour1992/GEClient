
import { useState } from "react";
import { pub } from "../lib/fetch";
import { Label } from "./inputUtils";
import { ImageLibrary } from "../Page/ImageLibrary";


export function ImagePicker({
    index,
    className,
    onChange,
    name,
    value,
    label
}) {
    const val =
        index !== undefined
            ? value[name][index]
            : value[name];

    const [open, setOpen] = useState(false);
    const [selected, setSelected] =
        useState(val || "");


    function selectImage(path) {
        setSelected(path);
    }


    function validate() {
        onChange(
            name,
            selected,
            index
        );

        setOpen(false);
    }


    return (
        <div className={className}>
            {label && (
                <Label name={label} />
            )}

            <img
                src={
                    pub +
                    (val || "/404.jpeg")
                }
                alt={val}
                style={{
                    width: 50,
                    height: 50
                }}
            />

            <button
                onClick={() => {
                    setSelected(val || "");
                    setOpen(true);
                }}
            >
                {val || "Aucune image"}
            </button>


            {open && (
                <div style={{
                    position: "fixed",
                    zIndex: 10,
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#DDDDDD88"
                }}>
                    <div style={{
                        position: "relative",
                        margin: "50px auto",
                        width: "80%",
                        height: "85%",
                        backgroundColor: "#fff",
                        border: "5px solid #444",
                        borderRadius: 12,
                        overflow: "hidden"
                    }}>

                        {/* Header */}

                        <div style={{
                            height: 50,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 15px",
                            borderBottom:
                                "1px solid #ccc"
                        }}>
                            <span style={{
                                fontSize: 20,
                                fontWeight: 700
                            }}>
                                Sélection de {name}
                            </span>

                            <button
                                onClick={() =>
                                    setOpen(false)
                                }
                            >
                                Fermer
                            </button>
                        </div>


                        {/* Bibliothèque */}

                        <div style={{
                            height: "calc(100% - 110px)"
                        }}>
                            <ImageLibrary
                                selected={selected}
                                onSelect={selectImage}
                                showPreview={true}
                            />
                        </div>


                        {/* Footer */}

                        <div style={{
                            height: 60,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 15px",
                            borderTop:
                                "1px solid #ccc"
                        }}>
                            <span>
                                {selected || "Aucune image sélectionnée"}
                            </span>

                            <button
                                onClick={validate}
                                disabled={!selected}
                            >
                                Valider
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

