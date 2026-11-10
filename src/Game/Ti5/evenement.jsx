import { EditorInput } from "../../Input/EditorInput"
import { ElementContent, aggregation } from "../../lib/datatype"
import { ExemplairesCarac, ExemplairesForm } from "./Component/Exemplaires"
import { Text } from "../../Component/Text"
import { backgroundColor, backgroundColorFull, borderColor, police } from "./ti5Const"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { PokerPa } from "../../Component/Size"
import { pub } from "../../lib/fetch"
import { EnumInput } from "../../Input/EnumInput"

const typeEvenement = {
    min: "Mineur",
    maj: "Majeur"
}


class Habilite extends aggregation(ElementContent, ExemplairesCarac) {

    usage = ""
    type="min"
}

function Display({ content, explication, style ={}}) {


    return (
        <div style={{
            ...PokerPa,
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
                fontSize: police.titre,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize || police.texte,
                paddingLeft: 2,
                paddingBottom: 2
            }} text={content.usage} rule={explication} />

        </div>


    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <ExemplairesForm content={content} onChange={onChange} />
            <EnumInput onChange={onChange} name="type" value={content} enumClass={typeEvenement} />
            <EditorInput onChange={onChange} name="usage" value={content} />

        </FormBase>
    )
}

// Couleur de l'icône du verso : rouge pour les événements majeurs, or pour les mineurs
const filtreIcone = {
    min: "brightness(0) saturate(100%) invert(75%) sepia(100%)    saturate(800%) hue-rotate(5deg) brightness(110%)",
    maj: "brightness(0) saturate(100%) invert(14%) sepia(99%) saturate(7404%) hue-rotate(4deg) brightness(97%) contrast(118%)",
}

function Verso({ content, explication, style = {} }) {


    return (
        <div style={{
            ...PokerPa,
            ...backgroundColorFull,
            color: "white",
            ...style,
            position: "relative",
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <img src={pub + "/ti/Color/General Icons/Event.png"} height="120px"  style={{ filter: filtreIcone[content.type] || filtreIcone.min }}/>

        </div>
    )
}



export default { name: "Evenement", classe: Habilite, form: Form, display: { default: Display,verso:Verso } ,print:{
    numPage:9,padding:12,bgColor: backgroundColorFull.backgroundColor, page: "A4 paysage"
} }