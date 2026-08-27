import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text, Explication } from "../../Component/Text"
import { backgroundColor, borderColor } from "./ti5"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"

const typeEvenement = {
    min: "Mineur",
    maj: "Majeur"
}


class Habilite extends ElementContent {

    usage = ""
    type="min"
}

function Display({ content, explication, style ={}}) {


    return (
        <div style={{
            ...SmallPo,
            ...backgroundColor,
            boxSizing: "border-box",
            ...borderColor,
            color: "white",
            ...fullBorder,
            ...style,
        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth/2||2,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize||10,
                paddingLeft: 2,
                paddingBottom: 2
            }} text={content.usage} rule={explication} />

        </div>


    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <EditorInput onChange={onChange} name="usage" value={content} />

        </FormBase>
    )
}


export default { name: "Evenement", classe: Habilite, form: Form, display: { default: Display } }