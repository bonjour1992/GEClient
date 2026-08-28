
import { TextInput } from "../Input/TextInput";
import { updateRemp } from "../lib/fetch";
import { useRemp } from "../lib/store";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";


export default function Remp() {
    const jeu = useParams().jeu;
    const remp = useRemp(state => state.remp);
    const setter = useRemp(state => state.setRemp);

    const [filter, setFilter] = useState("");
    const [newIndex, setNewIndex] = useState(null);

    const newRowRef = useRef(null);
    const newKeyRef = useRef(null);

    const [copiedCSS, setCopiedCSS] = useState(null);


    useEffect(() => {
        if (newIndex === null)
            return;

        // Attendre que React ait ajouté la nouvelle ligne
        requestAnimationFrame(() => {
            newRowRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            newKeyRef.current?.focus();

            setNewIndex(null);
        });
    }, [newIndex]);


    function copyCSS(i) {
        setCopiedCSS(
            (remp[i].css || []).map(css => [...css])
        );
    }


    function pasteCSS(i) {
        if (!copiedCSS)
            return;

        const res = [...remp];

        res[i] = {
            ...res[i],
            css: [
                ...(res[i].css || []),
                ...copiedCSS.map(css => [...css])
            ],
            modified: true
        };

        setter(res, jeu);
    }




    function onChange(i) {
        return (name, value) => {
            const res = [...remp];

            res[i] = {
                ...res[i],
                [name]: value,
                modified: true
            };

            setter(res, jeu);
        };
    }


    function onChangeCSS(i, j) {
        return (name, value) => {
            const res = [...remp];
            const css = [...(res[i].css || [])];

            css[j] = {
                ...css[j],
                [name]: value
            };

            res[i] = {
                ...res[i],
                css,
                modified: true
            };

            setter(res, jeu);
        };
    }


    function addCSS(i) {
        return () => {
            const res = [...remp];

            res[i] = {
                ...res[i],
                css: [
                    ...(res[i].css || []),
                    ["", ""]
                ],
                modified: true
            };

            setter(res, jeu);
        };
    }


    async function save() {
        const modif = remp
            .filter(e => e.modified)
            .map(e => {
                const copy = { ...e };
                delete copy.modified;
                return copy;
            });

        if (!modif.length)
            return;

        setter(
            await updateRemp(jeu, modif),
            jeu
        );
    }


    function add() {
        const index = remp.length;

        setter([
            ...remp,
            {
                modified: true,
                val: "",
                key: "",
                plural: "",
                css: [],
                rule: ""
            }
        ], jeu);

        setNewIndex(index);
    }


    const search = filter.trim().toLowerCase();

    const filtered = remp
        .map((entry, index) => ({
            entry,
            index
        }))
        .filter(({ entry }) => {
            if (!search)
                return true;

            return [
                entry.key,
                entry.val,
                entry.plural,
                entry.rule
            ]
                .filter(Boolean)
                .some(value =>
                    String(value)
                        .toLowerCase()
                        .includes(search)
                );
        });


    const modifiedCount =
        remp.filter(e => e.modified).length;


    return (
        <div style={{
            width: "100%",
            padding: "0 20px 20px",
            boxSizing: "border-box"
        }}>

            {/* BARRE STICKY */}

            <div style={{
                position: "sticky",
                top: 40,
                zIndex: 10,

                minHeight: 51,
                boxSizing: "border-box",

                display: "flex",
                alignItems: "center",
                gap: 10,

                padding: "8px 0",

                backgroundColor: "#fff",
                borderBottom: "1px solid #ddd"
            }}>
                <strong style={{
                    fontSize: 20,
                    whiteSpace: "nowrap"
                }}>
                    Remp
                </strong>

                <input
                    type="search"
                    value={filter}
                    onChange={e =>
                        setFilter(e.target.value)
                    }
                    placeholder="Filtrer..."
                    style={{
                        flex: 1,
                        minWidth: 100,
                        maxWidth: 400,
                        boxSizing: "border-box",
                        padding: "7px 10px",
                        border: "1px solid #ccc",
                        borderRadius: 5
                    }}
                />

                <span style={{
                    color: "#777",
                    fontSize: 13,
                    whiteSpace: "nowrap"
                }}>
                    {filtered.length} / {remp.length}
                </span>

                {modifiedCount > 0 && (
                    <span style={{
                        color: "#16803c",
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                    }}>
                        {modifiedCount} modifié
                        {modifiedCount > 1 ? "s" : ""}
                    </span>
                )}

                <button onClick={add}>
                    + Nouveau
                </button>

                <button
                    onClick={save}
                    disabled={!modifiedCount}
                    style={{
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                    }}
                >
                    Sauvegarder
                </button>
            </div>


            {/* TABLEAU */}

            <table style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed"
            }}>
                <colgroup>
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "51%" }} />
                </colgroup>

                <thead>
                    <tr style={{
                        position: "sticky",
                        top: 91,
                        zIndex: 5,
                        backgroundColor: "#f5f5f5"
                    }}>
                        <th style={headerStyle}>Clé</th>
                        <th style={headerStyle}>Valeur</th>
                        <th style={headerStyle}>Pluriel</th>
                        <th style={headerStyle}>CSS</th>
                        <th style={headerStyle}>Règle</th>
                    </tr>
                </thead>

                <tbody>
                    {filtered.map(({ entry: e, index: i }) => (
                        <tr
                            key={i}
                            ref={
                                i === newIndex
                                    ? newRowRef
                                    : null
                            }
                            style={{
                                backgroundColor:
                                    e.modified
                                        ? "#eaffea"
                                        : "#fff"
                            }}
                        >
                            <td style={cellStyle}>
                                <TextInput
                                    ref={
                                        i === newIndex
                                            ? newKeyRef
                                            : null
                                    }
                                    onChange={onChange(i)}
                                    value={e}
                                    name="key"
                                    style={inputStyle}
                                />
                            </td>

                            <td style={cellStyle}>
                                <TextInput
                                    onChange={onChange(i)}
                                    value={e}
                                    name="val"
                                    style={inputStyle}
                                />
                            </td>

                            <td style={cellStyle}>
                                <TextInput
                                    onChange={onChange(i)}
                                    value={e}
                                    name="plural"
                                    style={inputStyle}
                                />
                            </td>

                            <td style={{
                                ...cellStyle,
                                overflow: "hidden"
                            }}>
                                <div style={{
                                    width: "100%",
                                    maxWidth: "100%",
                                    minWidth: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 3
                                }}>
                                    {(e.css || []).map(
                                        (css, j) => (
                                            <div
                                                key={j}
                                                style={{
                                                    width: "100%",
                                                    maxWidth: "100%",
                                                    minWidth: 0,
                                                    display: "grid",
                                                    gridTemplateColumns:
                                                        "minmax(0, 1fr) minmax(0, 1fr)",
                                                    gap: 3
                                                }}
                                            >
                                                <TextInput
                                                    onChange={
                                                        onChangeCSS(
                                                            i,
                                                            j
                                                        )
                                                    }
                                                    value={css}
                                                    name="0"
                                                    style={inputStyle}
                                                />

                                                <TextInput
                                                    onChange={
                                                        onChangeCSS(
                                                            i,
                                                            j
                                                        )
                                                    }
                                                    value={css}
                                                    name="1"
                                                    style={inputStyle}
                                                />
                                            </div>
                                        )
                                    )}

                                    <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                                        <button onClick={addCSS(i)}
                                            style={{ fontSize: 11, padding: "2px 6px" }} >
                                            + CSS
                                        </button>
                                        <button onClick={() => copiedCSS ? pasteCSS(i) : copyCSS(i)}
                                            disabled={!copiedCSS && !e.css?.length}
                                            style={{ fontSize: 11, padding: "2px 6px" }} >
                                            {copiedCSS ? "Coller" : "Copier"}
                                        </button>
                                    </div>
                                </div>
                            </td>

                            <td style={cellStyle}>
                                <textarea
                                    value={e.rule || ""}
                                    onChange={event =>
                                        onChange(i)(
                                            "rule",
                                            event.target.value
                                        )
                                    }
                                    wrap="soft"
                                    rows={3}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        maxWidth: "100%",
                                        minWidth: 0,
                                        minHeight: 65,
                                        boxSizing: "border-box",
                                        resize: "vertical",
                                        padding: "6px 8px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        fontFamily: "inherit",
                                        fontSize: "inherit",
                                        lineHeight: 1.4,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "break-word"
                                    }}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {!filtered.length && (
                <div style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#888"
                }}>
                    Aucun résultat pour « {filter} »
                </div>
            )}
        </div>
    );
}


const headerStyle = {
    padding: "6px 8px",
    textAlign: "left",
    border: "1px solid #ddd",
    fontSize: 13
};


const cellStyle = {
    padding: 4,
    verticalAlign: "top",
    border: "1px solid #eee",
    minWidth: 0,
    overflow: "hidden"
};


const inputStyle = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box"
};

