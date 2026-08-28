import { ElementContent, Link } from "../../lib/datatype.js";
import { TextInput } from "../../Input/TextInput.jsx";
import { backgroundColor, borderColor, turnNumber } from "./ti5.jsx";
import { ModalPickerInput } from "../../Input/ModalPickerInput";
import { ImagePicker } from "../../Input/ImagePicker.jsx";
import { ColorInput } from "../../Input/ColorInput.jsx";
import { TableInput } from "../../Input/TableInput";
import { EditorInput } from "../../Input/EditorInput.jsx";
import { Text } from "../../Component/Text.jsx";
import { Image } from "../../Component/Image.jsx";
import { imgURL } from "../../lib/styleUtils.js";
import { LoadAndDisplay } from "../../Component/LoadAndDisplay.jsx";
import FormBase from "../../Input/FormBase"
import { NumberInput } from "../../Input/NumberInput.jsx";
import { bottomBorder, fullBorder } from "../../Component/style.jsx";
import { A4Pa, demiA4Pa } from "../../Component/Size.jsx";
import { TechColor } from "./tech.jsx";
import { EnumInput } from "../../Input/EnumInput.jsx";
import { techType } from "./ti5.jsx";
import { BooleanInput } from "../../Input/BooleanInput.jsx";

class TechSheet extends ElementContent {
    logo = "/404.jpeg"
    techType = "spa";
    techs = new Array(18).fill(new Link("tech"))
    unlocked = new Array(18).fill(false)
    faction = new Link("faction")
    connaissance = "<p>#pscience<br />Obtenir une tech de ce type vous fait gagner 2 de recherches en connaissance.<br /><br />La connaissance est nécessaire pour rechercher les technologies qui ont un prérequis.<br /><br /></p><p>#decomp:<br />Chaque niveau de connaissance rapporte un #point</p><p>Si aucune faction n'a plus de connaissance que vous gagnez 2 #point</p>"
    habilite = new Link("habilite")
    connaissanceReq = 8
}

function techPoint(content) {

    return content.unlocked.reduce((res, e) => e ? res + 2 : res, 0)
}

function Display({ content, explication, style = {} }) {
    const LineNumber = 10
    function TechDisplayeur({ i, style }) {
        return (<div style={{ width: 225, height: 155, ...style }}>
            {content?.techs && content.techs[i] && content?.techs[i].id !== -1 &&
                <LoadAndDisplay link={content.techs[i]} context={{ unlocked: content.unlocked[i] }} style={{ transform: "scale(0.85) translateX(-15px) translateY(-9px)" }} />}
        </div>)
    }

    return (<div style={{
        backgroundImage: imgURL("/ti/bg%20star.jpg"),
        ...A4Pa
    }}>
        <div style={{
            width: "auto",
            height: 150,
            padding: "5px 20px"
        }}  >
            <TechDisplayeur i={16} style={{ float: "right" }} />
            <TechDisplayeur i={17} style={{ float: "right" }} />
            <Text text={"#img[" + content.logo + "] " + content.name} style={{ fontSize: 55, color: "white", textWrap: "nowrap" }} />
            {content.faction && content.faction.id !== -1 && <LoadAndDisplay style={{ fontSize: 24 }} link={content.faction} displayeur={"nom"} />}
        </div>
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            width: "80%",
            float: "left"
        }}>
            {Array.from(new Array(16).keys()).map((i) => {
                return (<TechDisplayeur key={i} i={i} />)
            })}
        </div>
        <div style={{
            width: "17.8%",
            float: "left",
            padding: 10
        }}>
            {content?.habilite && content.habilite.id !== -1 && <LoadAndDisplay link={content.habilite}
                style={{ width: "100%", maxHeight: 160, marginBottom: 4 }} />}

            <Connaissance content={content} LineNumber={LineNumber} explication={explication} style={{ height: 440, width: "100%", }} />

        </div>
    </div>)
}

function Connaissance({ content, LineNumber, explication, style }) {
    return (
        <div style={{


            color: "white",
            position: "relative",
            boxSizing: "border-box",
            ...backgroundColor,
            ...fullBorder,
            ...borderColor,
            ...style
        }}>
            <div style={{ ...bottomBorder(2), ...borderColor }}>
                <span > Connaissance</span>
            </div>
            <Text text={content?.connaissance} explication={explication} style={{ height: 280, fontSize: 9 }} />
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(" + (content.connaissanceReq || 8) + ",1fr)",
                position: "absolute",
                bottom: 0,
                width: "100%"


            }}>
                {Array.from(Array(LineNumber * (content.connaissanceReq || 8)).keys()).map((e, i) => {
                    return (<div key={i} style={{
                        aspectRatio: "1 / 1",
                        boxSizing: "border-box",
                        width: "100%",
                        ...fullBorder,
                        borderRadius: 4,
                        boxSizing: "border-box",
                        ...TechColor[content?.techType],
                        textAlign: "center",
                        borderBottomLeftRadius: i === ((LineNumber - 1) * (content.connaissanceReq || 8)) ? 12 : 4,
                        borderBottomRightRadius: i === (LineNumber * (content.connaissanceReq || 8) - 1) ? 12 : 4,
                        lineHeight: (20 - (content.connaissanceReq || 8)) + "px"
                    }} >
                        {i < techPoint(content) ? <span style={{ fontSize: (20 - (content.connaissanceReq || 8)) + "px", fontWeight: 700, color: "black" }}>X</span> : ""}
                    </div>)
                })}
            </div>
        </div >)
}


function SmallDisplay({ content, explication, style = {} }) {
    const LineNumber = 7

    function TechDisplayeur({ i, style }) {
        return (<div style={{ width: 225, height: 143, ...style }}>
            {content?.techs && content.techs[i] && content?.techs[i].id !== -1 &&
                <LoadAndDisplay link={content.techs[i]} context={{ unlocked: content.unlocked[i] }} style={{ transform: "scale(0.85) translateX(-15px) translateY(-9px)" }} />}
        </div>)
    }

    return (<div style={{
        backgroundImage: imgURL("/ti/bg%20star.jpg"),
        ...demiA4Pa,
        position: "relative"
    }}>
        <div style={{
            width: "auto",
            height: 92,
            padding: "5px 20px",
            width: "51.7%",
            float: "left"
        }}  >
            <Text text={"#img[" + content.logo + "] " + content.name} style={{ fontSize: 55, color: "white", textWrap: "nowrap" }} />
        </div>
        {content?.habilite && content.habilite.id !== -1 && <LoadAndDisplay link={content.habilite}
            style={{ width: "25%", maxHeight: 88, marginTop: 4, float: "left" }} />}
        <Connaissance content={content} LineNumber={LineNumber} explication={explication} style={{ float: "right", width: "17.2%", height: 370, margin: 10, }} />



        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            width: "80%",

        }}>

            {[8, 9, 10, 11, 12, 13, 14, 15].map((i) => {
                return (<TechDisplayeur key={i} i={i} />)
            })}
        </div>


    </div>)
}

function Form({ content, onChange, onSubmit, style }) {

    if (content.faction === undefined) content.faction = new Link("faction")
    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <div>
                <ImagePicker onChange={onChange} name={"logo"} value={content} />
                <EnumInput onChange={onChange} name="techType" value={content} enumClass={techType} />
                <ModalPickerInput onChange={onChange} name={"faction"} value={content} type={["faction"]} label="faction" />
                <ModalPickerInput onChange={onChange} name={"habilite"} value={content} type={["habilite"]} label="habilite" />
                <NumberInput onChange={onChange} name={"connaissanceReq"} value={content} label="Connaissance requise" />
                <EditorInput onChange={onChange} name={"connaissance"} value={content} label="Connaissance" />
            </div>

            <h2>Technologie</h2>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)"
            }}>
                {Array.from((new TechSheet).techs.keys()).map((i) => {
                    return (<div key={i} className="p-2" >
                        <ModalPickerInput onChange={onChange} name={"techs"} value={content} index={i} type={["tech"]} />
                        <BooleanInput onChange={onChange} name={"unlocked"} value={content} index={i} /></div>)
                })}

            </div>


        </FormBase>

    )
}




export default { name: "Feuille de technologie", classe: TechSheet, form: Form, display: { default: Display, small: SmallDisplay }, print: "grid-cols-1" }
