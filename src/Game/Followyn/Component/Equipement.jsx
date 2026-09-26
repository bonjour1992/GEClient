import { LoadLink } from "../../../Component/LoadAndDisplay";
import { TableInput } from "../../../Input/TableInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { BooleanInput } from "../../../Input/BooleanInput";
import { TextInput } from "../../../Input/TextInput";
import { Link } from "../../../lib/datatype";
import { NumberInput } from "../../../Input/NumberInput";


export class EquipementCarac {
    equipements = [];          // [Link]
    equipementsQty = [];    // [boolean] false = débloqué, true = évolution

    equipementNum = 0;         // nombre de lignes
}


/*
 * FORMULAIRE
 *
 * types permet de choisir les types de contenus
 * acceptés par le ModalPickerInput.
 */
export function EquipementForm({
    content,
    onChange,
    types = []
}) {

    function contenuLine(x) {
        return [
            (
                <ModalPickerInput
                    onChange={onChange}
                    name="equipements"
                    value={content}
                    index={x}
                    type={types}
                    label="Contenu"
                />
            ),

            (
                <NumberInput
                    onChange={onChange}
                    name="equipementsQty"
                    value={content}
                    index={x}
                    label="Quantité"
                />
            )
        ];
    }


    return (
        <TableInput
            onChange={onChange}
            Line={contenuLine}
            name="equipementNum"
            value={content}
            label="Equipements"
            composant={[
                "equipements",
                "equipementsQty"
            ]}
        />
    );
}


/*
 * AFFICHAGE
 */
export const Equipement = ({
    content,
    explication
}) => {

    const {
        equipements = [],
        equipementsQty = [],
        equipementNum = 0
    } = content || {};


    // On ne garde que les équipements renseignés.
    const elements = [];

    for (let i = 0; i < equipementNum; i++) {

        if (!equipements[i])
            continue;

        elements.push({
            contenu: equipements[i],
            quantite: equipementsQty[i] ?? 0,
            index: i
        });
    }


    if (!elements.length)
        return null;


    return (
        <div
            style={{
                width: "100%"
            }}
        >

            <table
                style={{
                    borderCollapse: "collapse",
                    width: "100%"
                }}
            >

                <thead>
                    <tr>

                        <th style={headerStyle}>
                            Équipement
                        </th>

                        <th
                            style={{
                                ...headerStyle,
                                width: "100px",
                                textAlign: "center"
                            }}
                        >
                            Quantité
                        </th>

                    </tr>
                </thead>


                <tbody>

                    {elements.map(element => (

                        <tr key={element.index}>

                            <td style={cellStyle}>

                                <LoadLink
                                    link={element.contenu}
                                    explication={explication}
                                />

                            </td>

                            <td
                                style={{
                                    ...cellStyle,
                                    textAlign: "center"
                                }}
                            >
                                {element.quantite}
                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

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
