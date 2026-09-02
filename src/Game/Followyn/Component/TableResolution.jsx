import { EditorInput } from "../../../Input/EditorInput"
import { NumberInput } from "../../../Input/NumberInput"
import { EnumInput } from "../../../Input/EnumInput"
import FreeTagInput from "../../../Input/FreeTagInput"
import { TableInput } from "../../../Input/TableInput"
import React from "react";
import { LoadLink } from "../../../Component/LoadAndDisplay";
import { Text } from "../../../Component/Text";
import { stripTags } from "../../../Input/EditorInput"
const resolutionColor = {
    echecCritique: "#F8cac6",
    echec: "#efe4e3",
    reussite: "#e8f3e6",
    reussitCritique: "#DAFAD2",
    autre: "#f5f5e1",
};

const resolutionType = {
    echecCritique: "Échec Critique",
    echec: "Échec",
    reussite: "Réussite",
    reussitCritique: "Réussite Critique",
    autre: "Autre",
};


export class TableResolutionCarac {
    tableResolutionCond = []
    tableResolutionType = []
    tableResolutionPoid = []
    tableResolutionEffet = []
    tableResolutionColor = []
    tableResolutionNum = 0
}

export function TableResolutionForm({ content, onChange }) {

    function resolutionLine(x) {
        return [
            (<EditorInput onChange={onChange} name={"tableResolutionCond"} value={content} index={x} type="compact" />),
            (<EnumInput onChange={onChange} name="tableResolutionColor" value={content} index={x} enumClass={resolutionType} />),
            (<FreeTagInput onChange={onChange} name="tableResolutionType" index={x} value={content} label="type" tagType={"resolutionType"} />),
            (<NumberInput onChange={onChange} name="tableResolutionPoid" value={content} index={x} />),
            (<EditorInput onChange={onChange} name={"tableResolutionEffet"} value={content} index={x} type="compact" />),
        ]
    }


    return (<>
        <TableInput onChange={onChange} Line={resolutionLine} name="tableResolutionNum" value={content} label="Table de résolution"
            composant={["tableResolutionCond", "tableResolutionColor", "tableResolutionType", "tableResolutionPoid", "tableResolutionEffet"]} />

    </>)
}



export function TableResolution({ content, monoLigne = false }) {
    const {
        tableResolutionCond = [],
        tableResolutionType = [],
        tableResolutionPoid = [],
        tableResolutionEffet = [],
        tableResolutionColor = [],
        tableResolutionNum = 0
    } = content || {};

    if (tableResolutionNum <= 0) {
        return null;
    }

    function renderTypes(types, poid) {
        if (!Array.isArray(types)) {
            return null;
        }

        return (
            <span style={{ fontSize: 12 }}>
                {types.map((type, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && (
                            <span style={{ marginLeft: "2px" }}>
                                {" / "}
                            </span>
                        )}

                        <span style={{ fontWeight: "bold" }}>
                            {type}
                        </span>
                    </React.Fragment>
                ))}

                {poid !== undefined &&
                    poid !== null &&
                    poid !== "" &&
                    poid !== 0 ? (
                    <span>
                        ({poid})
                    </span>
                ) : (
                    <span>
                        (X)
                    </span>
                )}
            </span>
        );
    }

    function renderConsequence(index) {
        return (
            <>
                {renderTypes(
                    tableResolutionType[index],
                    tableResolutionPoid[index]
                )}

                {tableResolutionEffet[index] && (
                    <span style={{ fontSize: 12 }}>
                        :{" "}
                        <Text
                            text={tableResolutionEffet[index]}
                        />
                    </span>
                )}
            </>
        );
    }

    const isMonoLine = tableResolutionNum === 1 && stripTags(tableResolutionCond[0]).trim() === "";

    /*
     * monoLigne = true
     *
     * On affiche uniquement le format simplifié
     * si la résolution est effectivement mono-ligne.
     */
    if (monoLigne) {
        if (!isMonoLine) {
            return null;
        }

        return (
            <div>
                <span
                    style={{
                        fontWeight: "bold",
                    }}
                >
                    Conséquence:
                </span>{" "}
                {renderConsequence(0)}
            </div>
        );
    }

    /*
     * monoLigne = false
     *
     * On n'affiche rien si la résolution est mono-ligne.
     */
    if (isMonoLine) {
        return null;
    }

    /*
     * Sinon affichage normal sous forme de tableau.
     */
    return (
        <table
            style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12
            }}
        >
            <thead>
                <tr>
                    <th
                        style={{
                            textAlign: "left",
                            padding: "4px"
                        }}
                    >
                        Résultat
                    </th>

                    <th
                        style={{
                            textAlign: "left",
                            padding: "4px"
                        }}
                    >
                        Conséquence
                    </th>
                </tr>
            </thead>

            <tbody>
                {Array.from(
                    { length: tableResolutionNum },
                    (_, index) => {
                        const color =
                            resolutionColor[
                            tableResolutionColor[index]
                            ];

                        return (
                            <tr
                                key={index}
                                style={{
                                    backgroundColor:
                                        color || "transparent"
                                }}
                            >
                                <td
                                    style={{
                                        padding: "4px",
                                        verticalAlign: "top"
                                    }}
                                >
                                    <Text
                                        text={
                                            tableResolutionCond[index]
                                        }
                                    />
                                </td>

                                <td
                                    style={{
                                        padding: "4px",
                                        verticalAlign: "top"
                                    }}
                                >
                                    {renderConsequence(index)}
                                </td>
                            </tr>
                        );
                    }
                )}
            </tbody>
        </table>
    );
}
