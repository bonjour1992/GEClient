import { ElementContent } from "../../lib/datatype"
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput } from "../../Input/EditorInput"
import { ColorInput } from "../../Input/ColorInput"
import { backgroundColor, backgroundColorFull, techType } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"
import { pub } from "../../lib/fetch"

const bColor="#990000"




class Classe extends ElementContent {
    usage = ""
}

function Display({ content, style, explication }) {


    return (


        <div
            style={{
                ...SmallPo,
                ...style,
                color: "white",
                borderColor: bColor,
                ...backgroundColor,
                ...fullBorder

            }}>
            <Text style={{
                borderColor: bColor,
                ...bottomBorder(4),
                paddingLeft: 4,
                paddingRight: 4,
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{ fontSize: 10, paddingLeft: 2, paddingBottom: 2 }} text={content.usage} rule={explication} />

        </div>

    )
}

function Verso({ content, explication, style = {} }) {


    return (
        <div style={{
            ...SmallPo,
            ...backgroundColorFull,
            color: "white",
            ...style,
            position: "relative",
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <img src={pub + "/ti/Color/General Icons/Secret regular.png"} height="120px" />

        </div>
    )
}

function Form({ content, onChange, onSubmit,style}) {

    return (
        <>
            <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
                <EditorInput onChange={onChange} name="usage" value={content} />

            </FormBase>
        </>
    )
}


export default { name: "Objectif militaire", classe: Classe, form: Form, display: {default:Display,verso:Verso}, print: "grid-cols-6" }