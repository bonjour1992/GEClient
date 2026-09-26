import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text } from "../../Component/Text"
import { backgroundColorFull, borderColor } from "./ti5Const"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { SmallPa } from "../../Component/Size"
import { bottomBorder } from "../../Component/style"
import { pub } from "../../lib/fetch"


function MercImage() {
    return (
        <img src={pub + "/ti/icon/merc.png"} style={{height:190,            filter :"brightness(0) saturate(100%) invert(34%) sepia(29%) saturate(1073%) hue-rotate(354deg) brightness(91%) contrast(89%)",
         }} />
    )
}

const bColor = "#000000"

class Habilite extends ElementContent {
    sousTitre = ""
    usage = ""
}

function Display({ content, explication, style = {} }) {


    return (
        <div style={{
            ...SmallPa,
            ...backgroundColorFull,
            boxSizing: "border-box",
            borderColor:"#92571b",
            color: "white",
            ...fullBorder,            ...style,

        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth / 2 || 2,
                paddingLeft: 4,
                fontSize: 14,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: 12,
                paddingLeft: 2,
                fontWeight: "bold",
                width: "100%",
                ...bottomBorder(2),
                ...borderColor,
            }}
                text={content.sousTitre} />
            <Text style={{
                fontSize: style.fontSize || 11,
                paddingLeft: 2,
                paddingBottom: 2
            }} text={content.usage} rule={explication} />

        </div>


    )
}

export function Verso({ content, explication, style }) {
    return (<div
        style={{
            ...SmallPa,
            ...backgroundColorFull,
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}
    >
        <MercImage />
    </div>)
}


function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <TextInput onChange={onChange} name="sousTitre" value={content} label="Titre" />
            <EditorInput onChange={onChange} name="usage" value={content} label="Effet" />

        </FormBase>
    )
}


export default {
    name: "Mercenaire", classe: Habilite, form: Form,
    display: { default: Display, verso: Verso },
    print: { bgColor: backgroundColorFull.backgroundColor, numPage: 18, padding: 8, page: "A4 portrait" }
}

