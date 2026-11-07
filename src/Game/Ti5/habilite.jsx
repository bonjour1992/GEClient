import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text } from "../../Component/Text"
import { backgroundColor, borderColor, police } from "./ti5Const"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"

class Habilite extends ElementContent {

    effet = ""
}

function Display({ content, explication, style ={}}) {


    return (
        <div style={{
            width: 250,
            ...backgroundColor,
            boxSizing: "border-box",
            ...borderColor,
            color: "white",
            ...fullBorder,
            // Même bordure que les unités : fine et arrondie
            borderWidth: 3,
            borderRadius: 12,
            ...style,
        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth/2||2,
                paddingLeft: 4,
                fontSize: police.titre,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize || police.texte,
                paddingLeft: 3,
                paddingBottom: 3,
                                paddingRight:2,
            }} text={content.effet} rule={explication} />

        </div>


    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <EditorInput onChange={onChange} name="effet" value={content} />

        </FormBase>
    )
}


export default { name: "Habilité", classe: Habilite, form: Form, display: { default: Display } }