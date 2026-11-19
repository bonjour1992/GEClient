import { LoadLink } from "../../../Component/LoadAndDisplay";
import { Text } from "../../../Component/Text";
import { TableInput } from "../../../Input/TableInput";
import { NumberInput } from "../../../Input/NumberInput";
import { TextInput } from "../../../Input/TextInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { EditorInput, stripTags } from "../../../Input/EditorInput";


/*
 * Ressource à seuil : une ressource dont l'accumulation déclenche des effets.
 *
 * Le palier d'un personnage est la quantité qu'il a de la ressource, divisée
 * par son seuil et arrondie à l'inférieur ; il subit toutes les lignes dont le
 * palier est inférieur ou égal au sien.
 *
 * Un palier est un texte et non un nombre : certains dépendent du personnage
 * (« 5 + puissance de Résilience »).
 */
export class PalierCarac {
    seuilNom = "";          // nom du seuil (« Seuil d'humeur »)
    seuilBase = 0;          // valeur habituelle du seuil, 0 = non précisée
    paliers = [];           // [texte] palier de la ligne
    paliersCondition = [];  // [Link] condition subie à ce palier
    paliersTexte = [];      // [texte] effet sans condition, ou précision
    palierNum = 0;          // nombre de lignes
}


export function PalierForm({ content, onChange }) {

    function palierLine(x) {
        return [
            (<TextInput onChange={onChange} name="paliers" value={content} index={x} label="Palier" />),
            (<ModalPickerInput onChange={onChange} name="paliersCondition" value={content} index={x} type={["condition"]} label="Condition" />),
            (<EditorInput onChange={onChange} name="paliersTexte" value={content} index={x} type="compact" />),
        ];
    }

    return (<>
        <TextInput onChange={onChange} name="seuilNom" value={content} label="Nom du seuil" />
        <NumberInput onChange={onChange} name="seuilBase" value={content} min={0} label="Seuil habituel" />
        <TableInput onChange={onChange} Line={palierLine} name="palierNum" value={content} label="Paliers"
            composant={["paliers", "paliersCondition", "paliersTexte"]} />
    </>);
}


export function Palier({ content, explication }) {
    const {
        seuilNom = "",
        seuilBase = 0,
        paliers = [],
        paliersCondition = [],
        paliersTexte = [],
        palierNum = 0
    } = content || {};

    const lignes = [];

    for (let i = 0; i < palierNum; i++) {
        const condition = paliersCondition[i]?.id > 0 ? paliersCondition[i] : null;
        const texte = stripTags(paliersTexte[i] || "") !== "" ? paliersTexte[i] : null;

        // On ignore les lignes vides.
        if (condition || texte) {
            lignes.push({ palier: paliers[i] || "", condition, texte, index: i });
        }
    }

    if (!seuilNom && !lignes.length) {
        return null;
    }

    return (
        <div data-paliers style={{ width: "100%", marginTop: 6 }}>

            {seuilNom && (
                <div data-seuil style={{ marginBottom: 4, fontFamily: "EB Garamond, sans-serif", fontWeight: 500 }}>
                    <span style={{ fontWeight: "bold" }}>{seuilNom}</span>
                    {seuilBase ? ` : habituellement ${seuilBase}` : null}
                </div>
            )}

            {lignes.length > 0 && (
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={{ ...headerStyle, width: "30%" }}>Palier</th>
                            <th style={headerStyle}>Effet</th>
                        </tr>
                    </thead>

                    <tbody>
                        {lignes.map(ligne => (
                            <tr key={ligne.index} data-palier={ligne.index}>
                                <td style={{ ...cellStyle, fontWeight: "bold" }}>
                                    <Text text={ligne.palier} rule={explication} />
                                </td>

                                <td style={cellStyle}>
                                    {ligne.condition && (
                                        <LoadLink link={ligne.condition} explication={explication} />
                                    )}
                                    {ligne.texte && (
                                        <Text text={ligne.texte} rule={explication} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}


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
