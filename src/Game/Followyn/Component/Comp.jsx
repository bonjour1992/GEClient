import { LoadLink } from "../../../Component/LoadAndDisplay";
import { TableInput } from "../../../Input/TableInput";
import { NumberInput } from "../../../Input/NumberInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { BooleanInput } from "../../../Input/BooleanInput";
import { Link } from "../../../lib/datatype";


export class CompCarac {
    comps = [];              // [Link("competence")]
    compsMaitrise = [];      // [number]
    compsPuissance = [];     // [number]
    compsMaitriseMod = [];   // [boolean]
    compsPuissanceMod = [];  // [boolean]
    compNum = 0;             // nombre de lignes
}


export function CompForm({ content, onChange }) {

    function competenceLine(x) {
        return [
            (
                <ModalPickerInput
                    onChange={onChange}
                    name="comps"
                    value={content}
                    index={x}
                    type={["competence"]}
                    label="Compétence"
                />
            ),

            (
                <NumberInput
                    onChange={onChange}
                    name="compsMaitrise"
                    value={content}
                    index={x}
                    label="Maîtrise"
                />
            ),

            (
                <BooleanInput
                    onChange={onChange}
                    name="compsMaitriseMod"
                    value={content}
                    index={x}
                    label="Mod."
                />
            ),

            (
                <NumberInput
                    onChange={onChange}
                    name="compsPuissance"
                    value={content}
                    index={x}
                    label="Puissance"
                />
            ),

            (
                <BooleanInput
                    onChange={onChange}
                    name="compsPuissanceMod"
                    value={content}
                    index={x}
                    label="Mod."
                />
            )
        ];
    }

    return (
        <TableInput
            onChange={onChange}
            Line={competenceLine}
            name="compNum"
            value={content}
            label="Compétences"
            composant={[
                "comps",
                "compsMaitrise",
                "compsMaitriseMod",
                "compsPuissance",
                "compsPuissanceMod"
            ]}
        />
    );
}


export const Comp = ({ content, explication }) => {

    const {
        comps = [],
        compsMaitrise = [],
        compsPuissance = [],
        compsMaitriseMod = [],
        compsPuissanceMod = [],
        compNum = 0
    } = content || {};


    const formatValue = (value, mod) => {

        if (!value || value === 0)
            return null;

        if (mod) {
            return value > 0
                ? `+${value}`
                : `${value}`;
        }

        return value;
    };


    const elements = [];

    for (let i = 0; i < compNum; i++) {

        const competence =
            comps[i] || new Link("competence");

        const maitrise =
            formatValue(
                compsMaitrise[i],
                compsMaitriseMod[i]
            );

        const puissance =
            formatValue(
                compsPuissance[i],
                compsPuissanceMod[i]
            );


        // Si maîtrise ET puissance valent 0,
        // on ignore complètement la ligne.
        if (maitrise === null && puissance === null)
            continue;


        elements.push({
            competence,
            maitrise,
            puissance,
            index: i
        });
    }


    if (!elements.length)
        return null;


    return (
        <table
            style={{
                borderCollapse: "collapse",
                width: "100%"
            }}
        >
            <thead>
                <tr>
                    <th style={headerStyle}>
                        Compétence
                    </th>

                    <th style={headerStyle}>
                        Maîtrise
                    </th>

                    <th style={headerStyle}>
                        Puissance
                    </th>
                </tr>
            </thead>

            <tbody>
                {elements.map((element) => (
                    <tr key={element.index}>

                        <td style={cellStyle}>
                            <LoadLink
                                link={element.competence}
                                explication={explication}
                            />
                        </td>

                        <td
                            style={{
                                ...cellStyle,
                                textAlign: "center"
                            }}
                        >
                            {element.maitrise ?? ""}
                        </td>

                        <td
                            style={{
                                ...cellStyle,
                                textAlign: "center"
                            }}
                        >
                            {element.puissance ?? ""}
                        </td>

                    </tr>
                ))}
            </tbody>
        </table>
    );
};


const headerStyle = {
    padding: "4px 8px",
    textAlign: "left",
    border: "1px solid #ccc",
    backgroundColor: "#eee",
    fontWeight: "bold"
};


const cellStyle = {
    padding: "4px 8px",
    border: "1px solid #ddd",
    verticalAlign: "middle"
};
