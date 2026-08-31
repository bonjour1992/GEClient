import { EditorInput } from "../../../Input/EditorInput"
import { NumberInput } from "../../../Input/NumberInput"
import { EnumInput } from "../../../Input/EnumInput"
import FreeTagInput from "../../../Input/FreeTagInput"
import { TableInput } from "../../../Input/TableInput"

const resolutionColor = {
    "#F00": "echec critique",
    "#e39e1e": "echec",
    "#6bd70c": "reussite",
    "#0c4309": "reussite critique",
    "#d9d77d": "autre",

}

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
            (<EnumInput onChange={onChange} name="tableResolutionColor" value={content} index={x} enumClass={resolutionColor} />),
            (<FreeTagInput onChange={onChange} name="tableResolutionType" index={x} value={content} label="type" />),
            (<NumberInput onChange={onChange} name="tableResolutionPoid" value={content} index={x} />),
            (<EditorInput onChange={onChange} name={"tableResolutionEffet"} value={content} index={x} type="compact" />),
        ]
    }


    return (<>
        <TableInput onChange={onChange} Line={resolutionLine} name="tableResolutionNum" value={content} label="Table de résolution"
         composant={["tableResolutionCond", "tableResolutionColor","tableResolutionType","tableResolutionPoid","tableResolutionEffet"]} />

    </>)
}

import React from "react";
import { LoadLink } from "../../../Component/LoadAndDisplay";
import { Text } from "../../../Component/Text";

export function TableResolution({ content }) {
    const {
        tableResolutionCond = [],
        tableResolutionType = [],
        tableResolutionPoid = [],
        tableResolutionEffet = [],
        tableResolutionColor = [],
        tableResolutionNum = 0
    } = content || {};

    // Rien à afficher
    if (tableResolutionNum <= 0) {
        return null;
    }

function renderTypes(types, poid) {
    if (!Array.isArray(types)) {
        return null;
    }

    return types.map((type, index) => (
        <React.Fragment key={index}>
            {index > 0 && (
                <span style={{ marginLeft: "4px" }}>
                    {" / "}
                </span>
            )}

            <span style={{ fontWeight: "bold" }}>
                {type}

                {poid !== undefined &&
                    poid !== null &&
                    poid !== "" && (
                        <span>
                            ({poid})
                        </span>
                    )}
            </span>
        </React.Fragment>
    ));
}


    return (
        <table
            style={{
                width: "100%",
                borderCollapse: "collapse"
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
                            tableResolutionColor[index];

                        return (
                            <tr
                                key={index}
                                style={{
                                    backgroundColor:
                                        color || "transparent"
                                }}
                            >
                                {/* Résultat */}
                                <td
                                    style={{
                                        padding: "4px",
                                        verticalAlign: "top"
                                    }}
                                >
                                    <Text
                                        text={
                                            tableResolutionCond[
                                                index
                                            ]
                                        }
                                    />
                                </td>

                                {/* Conséquence */}
                                <td
                                    style={{
                                        padding: "4px",
                                        verticalAlign: "top"
                                    }}
                                >
                                    {renderTypes(
                                        tableResolutionType[index],
                                        tableResolutionPoid[index]
                                    )}

                                    {tableResolutionEffet[
                                        index
                                    ] && (
                                        <span>
                                            :{" "}
                                            <Text
                                                text={
                                                    tableResolutionEffet[
                                                        index
                                                    ]
                                                }
                                            />
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    }
                )}
            </tbody>
        </table>
    );
}

export default TableResolution;
