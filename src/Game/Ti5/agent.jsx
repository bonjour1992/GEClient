import { ElementContent } from "../../lib/datatype"
import { EditorInput } from "../../Input/EditorInput"
import { ColorInput } from "../../Input/ColorInput"
import { backgroundColor } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text } from "../../Component/Text"
import FormBase from "../../Input/FormBase"




class Classe extends ElementContent {

    usage = ""
    color = "#000000"
}

function Nom({ content, explication, style={} })
{
    return (
        <Text text={content.name} style={{...style,color: content.color}} />
    )
}

function Display({ content, explication, style }) {



    return (

        <div
            style={{
                ...style,
                color: "white",
                borderColor: content.color,
                ...backgroundColor,
                ...fullBorder,
                borderRadius:8,
                width: 150,
                minHeight: 65
            }}>
            <Text style={{
                color: content.color,
                borderColor: content.color,
                ...bottomBorder(4),
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{ fontSize: 8, paddingLeft: 2, paddingBottom: 2 }} text={content.usage} rule={explication} />

        </div>
    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <EditorInput onChange={onChange} name="usage" value={content} label="Usage" />
            <ColorInput onChange={onChange} name="color" value={content} />
        </FormBase>
    )
}


export default { name: "Agent", classe: Classe, form: Form, display: { default: Display,nom:Nom } }