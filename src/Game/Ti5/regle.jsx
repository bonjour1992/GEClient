import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text } from "../../Component/Text"
import { backgroundColor, borderColor } from "./ti5Const"
import { bottomBorder, fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"

// Règle générale du jeu, qui ne dépend pas d'une phase : jet, contrôle,
// ciblage, application des dégâts... Les phases y renvoient par un lien |id|.
class Regle extends ElementContent {

    // Texte de la règle
    usage = ""

    // Cas particuliers (factions, unités neutres...)
    special = ""
}

function Display({ content, style = {}, explication }) {

    return (
        <div style={{
            width: 600,
            ...backgroundColor,
            boxSizing: "border-box",
            ...borderColor,
            color: "white",
            ...fullBorder,
            ...style,
        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth / 2 || 2,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize || 10,
                paddingLeft: 3,
                paddingBottom: 3,
                ...bottomBorder(2),
                ...borderColor,
            }} text={content.usage} rule={explication} />
            <Text style={{
                fontSize: style.fontSize || 10,
                paddingLeft: 3,
                paddingBottom: 3
            }} text={content.special} rule={explication} />
        </div>
    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EditorInput onChange={onChange} name="usage" value={content} className=" w-190 min-h-80" label="Règle" />
            <EditorInput onChange={onChange} name="special" value={content} className=" w-190 min-h-40" label="Cas particuliers" />
        </FormBase>
    )
}

export default { name: "Règle", classe: Regle, form: Form, display: { default: Display } }
