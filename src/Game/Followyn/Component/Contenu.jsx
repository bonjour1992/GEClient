import { LoadLink } from "../../../Component/LoadAndDisplay";
import { TableInput } from "../../../Input/TableInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { BooleanInput } from "../../../Input/BooleanInput";
import { TextInput } from "../../../Input/TextInput";
import { Link } from "../../../lib/datatype";


export class ContenuCarac {
    contenus = [];          // [Link]
    contenusUnlock = [];    // [boolean] false = débloqué, true = évolution
    contenusGroup = [];     // [string]
    contenuNum = 0;         // nombre de lignes
}


/*
 * FORMULAIRE
 *
 * types permet de choisir les types de contenus
 * acceptés par le ModalPickerInput.
 */
export function ContenuForm({
    content,
    onChange,
    types = [  ]
}) {

    function contenuLine(x) {
        return [
            (
                <ModalPickerInput
                    onChange={onChange}
                    name="contenus"
                    value={content}
                    index={x}
                    type={types}
                    label="Contenu"
                />
            ),

            (
                <BooleanInput
                    onChange={onChange}
                    name="contenusUnlock"
                    value={content}
                    index={x}
                    label="Évolution"
                />
            ),

            (
                <TextInput
                    onChange={onChange}
                    name="contenusGroup"
                    value={content}
                    index={x}
                    label="Groupe"
                />
            )
        ];
    }


    return (
        <TableInput
            onChange={onChange}
            Line={contenuLine}
            name="contenuNum"
            value={content}
            label="Contenus"
            composant={[
                "contenus",
                "contenusUnlock",
                "contenusGroup"
            ]}
        />
    );
}


/*
 * AFFICHAGE
 */
export const Contenu = ({
    content,
    explication
}) => {

    const {
        contenus = [],
        contenusUnlock = [],
        contenusGroup = [],
        contenuNum = 0
    } = content || {};


    /*
     * Construction des éléments.
     *
     * unlock === false -> Débloqué
     * unlock === true  -> Évolution
     */
    const elements = [];

    for (let i = 0; i < contenuNum; i++) {

        const contenu =
            contenus[i] || new Link("trait");

        const group =
            contenusGroup[i]?.trim() || "Autres";

        const evolution =
            contenusUnlock[i] === true;


        // On ignore les lignes sans contenu.
        if (!contenus[i])
            continue;


        elements.push({
            contenu,
            group,
            evolution,
            index: i
        });
    }


    if (!elements.length)
        return null;


    /*
     * Regroupement par groupe.
     */
    const groups = {};

    elements.forEach(element => {

        if (!groups[element.group])
            groups[element.group] = [];

        groups[element.group].push(element);
    });


    return (
        <div
            style={{
                width: "100%"
            }}
        >

            {Object.entries(groups).map(
                ([group, groupElements]) => (

                    <table
                        key={group}
                        style={{
                            borderCollapse: "collapse",
                            width: "100%",
                            marginBottom: "10px"
                        }}
                    >

                        <thead>
                            <tr>

                                <th style={headerStyle}>
                                    {group}
                                </th>

                                <th
                                    style={{
                                        ...headerStyle,
                                        width: "120px",
                                        textAlign: "center"
                                    }}
                                >
                                    Statut
                                </th>

                            </tr>
                        </thead>


                        <tbody>

                            {groupElements.map(
                                element => (

                                    <tr
                                        key={element.index}
                                        style={{
                                            opacity:
                                                element.evolution
                                                    ? 0.7
                                                    : 1
                                        }}
                                    >

                                        <td style={cellStyle}>

                                            <LoadLink
                                                link={
                                                    element.contenu
                                                }
                                                explication={
                                                    explication
                                                }
                                            />

                                        </td>


                                        <td
                                            style={{
                                                ...cellStyle,
                                                textAlign: "center",
                                                fontSize: 12,
                                                color:
                                                    element.evolution
                                                        ? "#777"
                                                        : "#16803c"
                                            }}
                                        >

                                            {element.evolution
                                                ? "Évolution"
                                                : "Débloqué"}

                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>

                )
            )}

        </div>
    );
};


const headerStyle = {
    padding: "4px 8px",
    textAlign: "left",
    border: "1px solid #ccc",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold"
};


const cellStyle = {
    padding: "4px 8px",
    border: "1px solid #ddd",
    verticalAlign: "middle"
};
