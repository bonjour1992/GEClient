import { ElementContent } from "../../lib/datatype"
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput } from "../../Input/EditorInput"
import { ColorInput } from "../../Input/ColorInput"
import { backgroundColor, techType } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
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