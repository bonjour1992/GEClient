import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text } from "../../Component/Text"
import { backgroundColor, backgroundColorFull, borderColor } from "./ti5Const"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"
import { pub } from "../../lib/fetch"
import { EnumInput } from "../../Input/EnumInput"

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
            <EnumInput onChange={onChange} name="type" value={content} enumClass={typeEvenement} />
            <EditorInput onChange={onChange} name="usage" value={content} />

        </FormBase>
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
            <img src={pub + "/ti/Color/General Icons/Event.png"} height="120px"  style={{ filter: " brightness(0) saturate(100%) invert(75%) sepia(100%)    saturate(800%) hue-rotate(5deg) brightness(110%)" }}/>

        </div>
    )
}



export default { name: "Evenement", classe: Habilite, form: Form, display: { default: Display,verso:Verso } ,print:{
    numPage:18,padding:12,bgColor: backgroundColorFull.backgroundColor, page: "A4 paysage"
} }