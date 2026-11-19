import { Text } from "../../Component/Text"
import { LoadLink } from "../../Component/LoadAndDisplay"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { EditorInput, stripTags } from "../../Input/EditorInput"
import { NumberInput } from "../../Input/NumberInput"
import { TableInput } from "../../Input/TableInput"
import { ModalPickerInput } from "../../Input/ModalPickerInput"

const elementColor = "#7a1f1f"

/*
 * Type de dégâts : sa règle propre et sa table de blessure.
 *
 * La table donne, pour le total du jet de blessure (règle « Application des
 * dégâts »), la blessure subie : chaque ligne vaut de son minimum jusqu'au
 * minimum de la ligne suivante, la dernière n'a pas de maximum.
 */
class Classe extends ElementJDR {
    regle = ""             // règle propre à ce type de dégâts
    tableMin = []          // [nombre] total minimum du jet de blessure
    tableBlessure = []     // [Link] blessure subie
    tableNum = 0           // nombre de lignes
}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

// Lignes remplies, par minimum croissant, avec le total jusqu'où chacune vaut.
function lignesDe(content) {
    const { tableMin = [], tableBlessure = [], tableNum = 0 } = content || {}
    const lignes = []

    for (let i = 0; i < tableNum; i++) {
        if (tableBlessure[i]?.id > 0) {
            lignes.push({ min: Number(tableMin[i]) || 0, blessure: tableBlessure[i], index: i })
        }
    }

    lignes.sort((a, b) => a.min - b.min)
    lignes.forEach((ligne, i) => { ligne.max = i + 1 < lignes.length ? lignes[i + 1].min - 1 : null })

    return lignes
}

function intervalle(ligne) {
    if (ligne.max === null) return ligne.min + " ou plus"
    if (ligne.max <= ligne.min) return String(ligne.min)
    return ligne.min + " à " + ligne.max
}

function Display({ content, explication, style }) {

    const lignes = lignesDe(content)

    return (
        <Card content={content} color={elementColor}>
            <Description content={content} explication={explication} />

            {stripTags(content.regle || "") !== "" && (
                <Text text={content.regle} rule={explication} />
            )}

            {lignes.length > 0 && (
                <table data-table-blessure style={{ borderCollapse: "collapse", width: "100%", marginTop: 6 }}>
                    <thead>
                        <tr>
                            <th style={{ ...headerStyle, width: "22%" }}>Jet</th>
                            <th style={headerStyle}>Blessure</th>
                        </tr>
                    </thead>

                    <tbody>
                        {lignes.map(ligne => (
                            <tr key={ligne.index} data-ligne-blessure={ligne.index}>
                                <td style={{ ...cellStyle, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                    {intervalle(ligne)}
                                </td>

                                <td style={cellStyle}>
                                    <LoadLink link={ligne.blessure} displayeur="ligne" explication={explication} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    )
}

function Form({ content, onChange, onSubmit, style }) {

    function ligneTable(x) {
        return [
            (<NumberInput onChange={onChange} name="tableMin" value={content} index={x} min={0} label="À partir de" />),
            (<ModalPickerInput onChange={onChange} name="tableBlessure" value={content} index={x} type={["blessure"]} label="Blessure" />),
        ]
    }

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EditorInput onChange={onChange} name="regle" value={content} label="Règle propre" />
            <TableInput onChange={onChange} Line={ligneTable} name="tableNum" value={content} label="Table de blessure"
                composant={["tableMin", "tableBlessure"]} />
        </FormElementJDR>
    )
}

const headerStyle = {
    padding: "4px 8px",
    textAlign: "left",
    border: "1px solid #ccc",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold"
}

const cellStyle = {
    padding: "3px 8px",
    border: "1px solid #ddd",
    verticalAlign: "middle"
}

export default { name: "Type de dégâts", classe: Classe, form: Form, display: { default: Display, nom: Nom }, editor: "noSplit" }
