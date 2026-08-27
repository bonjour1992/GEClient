import { ElementContent, Link } from "../../lib/datatype"
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { BooleanInput } from "../../Input/BooleanInput"
import { ImagePicker } from "../../Input/ImagePicker"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { EditorInput } from "../../Input/EditorInput"
import { ColorInput } from "../../Input/ColorInput"
import { backgroundColor, techType, techIcon, planeteIcon } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"
import { pub } from "../../lib/fetch"
import { LoadAndDisplay } from "../../Component/LoadAndDisplay"


const objectType = {
    pla: "Planete",
    sat: "Sattelite",
    spe: "Special"
}
const ruineType = {
    normal: "Normal",
    mil: "Militaire",
    ancien: "Ancien",
    civ: "Civile",
    spa: "Spatiale"
}
const planetType = {
    civ: "Civile",
    mil: "Militaire",
    sauv: "Sauvage"
}

const stationType = {
    mil: "militaire",
    log: "logistique",
    scien: "scientifique",
    com: "commercialle",
    diplo: "diplomatique",
    pol: "politique",
    spe:"spécial"
}

class Classe extends ElementContent {
    img = ""
    planetType = ""
    stationType = ""
    res
    inf
    type = "pla"
    techSpe = []
    legendary = false
    ruine = false
    ruineType = "normal"
    ruine2 = false
    ruineType2 = "normal"
    habilite = ""
    nativeUnit = new Link("unit")
    unitNum = 1
    homePlanet = new Link("faction")
}

//TODO: native unit color for type of planet

export default { name: "Planete", classe: Classe, form: Form, display: { default: Display, pict: PlanetPict }, print: "grid-cols-6" }

export function PlanetPict({ content, style, context, explication }) {
    return (<div style={{ position: "relative" }} >
        <img src={pub + (content.img || "/404.jpeg")} alt="data.img" style={{
            width: 120,
            height: 120,
            margin: "0 auto",
            paddingTop: 5,
            display: "block",
            objectFit: "contain"
        }} />
        <div style={{
            position: "absolute",
            top: 0,
            width: "100%",
        }}>
            <div style={{
                width:"100%",
                textAlign:"center",
                padding:2
            }}>
            {
                content.homePlanet&& content.homePlanet.id!==-1 && 
                <LoadAndDisplay link={content.homePlanet} displayeur={"logo"} style={{display:"inline",fontSize:18}}/>
            }
            <Text style={{
                display:"inline",
                textAlign: "center",
                color: content.legendary ? "rgb(206, 186, 2)" : "white",
                fontSize: 18,
                fontWeight: 600,
                textShadow: "2px 0px 3px black"
            }}
                text={(content.planetType ? "#img[" + planeteIcon.get(content.planetType) + "]" : "") + content.name} />
                </div>
            {(content.type === "sat" && content.stationType) ? (
                <Text style={{
                    textAlign: "center",
                    fontSize: 9,
                    fontWeight: 600,
                    textShadow: "1px 0px 2px black"
                }}
                    text={"Station " + stationType[content.stationType]} />

            ) : ""}
        </div>
        <div style={{
            width: "100%",
            position: "absolute",
            top: 100

        }} >
            <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 3
            }} >
                {content.res ? <Hexagone color="yellow">{content.res}</Hexagone> : ""}
                {content.inf ? <Hexagone color="blue">{content.inf}</Hexagone> : ""}
                {content.ruine ? <Ruine type={content.ruineType} /> : ""}
                {content.ruine2 ? <Ruine type={content.ruineType2} /> : ""}
                {content.techSpe.map((e, i) => <img key={i} src={pub + (techIcon.get(e) || "/404.jpeg")} alt={techIcon.get(e) || "/404.jpeg"} width={20} height={20} />)}
            </div>
        </div>
    </div>)
}

function Display({ content, dep, className }) {

    return (<div style={{
        ...SmallPo,
        backgroundImage: "url(" + pub + "/ti/bg.png)",
        color: "white",
        position: "relative"

    }}>

        <PlanetPict content={content} dep={dep} />
        <Text text={content.habilite} style=
            {{
                fontSize: 9,
                height: 122,
                position: "relative",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                margin: 4,
                borderRadius: 12,
                padding: 1
            }} />
        {(content.nativeUnit?.__link && content.nativeUnit.id !== -1) ?
            <LoadAndDisplay link={content.nativeUnit} displayeur={"neutral"} context={{ num: content.unitNum }}
                style={{
                    position: "absolute",
                    left: 4,
                    width: 157,
                    top: 187,
                    height: 66,
                    borderWidth: 2,
                    borderRadius: 12,
                    fontSize:7
                }} /> : ""}
    </div>)
}

function Form({ content, onChange, onSubmit, style }) {

    if (!content.homePlanet) content.homePlanet = new Link("faction")

    return (
        <>
            <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
                <EnumInput onChange={onChange} name="type" value={content} enumClass={objectType} label="Type" />
                <EnumInput onChange={onChange} name="planetType" value={content} enumClass={planetType} aucun={true} style={{ display: content.type === "pla" ? "inline" : "none" }} />
                <EnumInput onChange={onChange} name="stationType" value={content} enumClass={stationType} aucun={true} style={{ display: content.type === "sat" ? "inline" : "none" }} />

                <BooleanInput onChange={onChange} name="legendary" value={content} />
                <ImagePicker onChange={onChange} name="img" value={content} />
                <NumberInput onChange={onChange} name="res" value={content} min={0} max={9} lebel="res"/>
                <NumberInput onChange={onChange} name="inf" value={content} min={0} max={9} label="inf"/>
                <TagInput onChange={onChange} name="techSpe" value={content} tagClass={techType} />
                <BooleanInput onChange={onChange} name="ruine" value={content} lebal="ruine" />
                <EnumInput onChange={onChange} name="ruineType" value={content} enumClass={ruineType} className={content.ruine ? "" : "hidden"} />
                <BooleanInput onChange={onChange} name="ruine2" value={content} />
                <EnumInput onChange={onChange} name="ruineType2" value={content} enumClass={ruineType} className={content.ruine2 ? "" : "hidden"} />
                <br />
                <EditorInput onChange={onChange} name="habilite" value={content} label="effet"/>
                <br />

                <br />
                <ModalPickerInput onChange={onChange} name="nativeUnit" value={content} type={["unit"]} label="Unité native" />
                <NumberInput onChange={onChange} name="unitNum" value={content} min={0} max={99} label="quantité" style={{display:content.nativeUnit&&content.nativeUnit.id!==-1?"inline":"none"}}/>

                <ModalPickerInput onChange={onChange} name={"homePlanet"} value={content} type={["faction"]} label="Systéme natal"/>

                <br />
            </FormBase>
        </>
    )
}

//svg des ruine colorisé
function Ruine({ type }) {
    return (<svg
        width="20px"
        height="20px"
        viewBox="0 0 16.270361 15.88821"
        version="1.1"
        id="svg1"
        xmlSpace="preserve"
        xmlns="http://www.w3.org/2000/svg"><g
            id="layer1"
            transform="translate(-114.52802,-118.86361)"><path
                fill={{ normal: "#FFFFFF", mil: "#FF0000", ancien: "#8800FF", civ: "#AAAA00", spa: "#2222DD" }[type]}
                d="m 114.52808,133.36352 v -1.38834 l 0.44097,-0.14737 0.44097,-0.14737 -0.004,-6.40842 -0.004,-6.40841 h 3.09077 3.09078 v 1.41111 1.41111 h -0.35278 -0.35278 v 4.03612 4.03613 l 0.35278,0.21803 0.35278,0.21803 v 0.86112 0.86112 h 1.05833 1.05833 v -1.05833 -1.05833 h 0.35278 0.35278 v -4.05695 -4.05694 h 1.40205 1.40205 l 0.58602,1.14653 0.58602,1.14652 0.48138,0.28212 0.48137,0.28211 v 2.6283 2.62831 h 0.35278 0.35277 v 1.05833 1.05833 h 0.37408 0.37407 l -0.10949,1.32292 -0.10949,1.32292 -8.02569,0.0948 -8.02569,0.0948 z m 14.81667,-0.036 v -0.35278 h -6.87917 -6.87917 v 0.35278 0.35277 h 6.87917 6.87917 z m -9.16411,-1.94028 v -0.35278 l -1.94433,-0.1058 -1.94434,-0.1058 v 0.56438 0.56437 l 1.94434,-0.1058 1.94433,-0.10579 z m 8.72466,0.0882 -0.14546,-0.44097 -2.0006,-0.1058 -2.0006,-0.1058 v 0.54677 0.54677 h 2.14606 2.14607 z m -11.20222,-5.73264 v -4.05694 h -0.52917 -0.52916 v 4.05694 4.05695 h 0.52916 0.52917 z m 2.11667,0 v -4.05694 h -0.52917 -0.52916 v 4.05694 4.05695 h 0.52916 0.52917 z m 6.35,0.52917 v -3.52778 h -0.35278 -0.35278 v 3.52778 3.52778 h 0.35278 0.35278 z m 2.04459,1.17464 -0.10431,-2.35313 -0.35278,-0.11719 -0.35278,-0.1172 0.11714,2.47033 0.11715,2.47033 h 0.33994 0.33995 z m -7.68904,-7.17186 v -0.35278 h -2.11666 -2.11667 v 0.35278 0.35278 h 2.11667 2.11666 z"
                id="path1" /></g></svg>)
}

//Hexagone de couleur pour l'influence et les ressources
function Hexagone(props) {


    return (
        <div
            style={{
                position: "relative",
                height: 19,
                width: 24,
                backgroundColor: props.color === "blue" ? "#3b82f6" : "#fcd34d",
                textAlign: "center",
                color: "#fff",
                lineHeight: 1,
                fontSize: 16,
                fontWeight: 700,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    bottom: "100%",
                    borderRight: "12px solid transparent",
                    borderBottom: `5px solid ${props.color === "blue" ? "#3b82f6" : "#fcd34d"
                        }`,
                    borderLeft: "12px solid transparent",
                }}
            />

            <div
                style={{
                    margin: "auto",
                    top: 2,
                    position: "relative",
                    height: 16,
                    width: 19,
                    backgroundColor: "#000",
                    textAlign: "center",
                    lineHeight: 1,
                    fontSize: 16,
                    fontWeight: 700,
                    zIndex: 20,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        bottom: "100%",
                        borderRight: "10px solid transparent",
                        borderBottom: "4px solid #000",
                        borderLeft: "10px solid transparent",
                    }}
                />

                {props.children}

                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        borderTop: "4px solid #000",
                        borderRight: "10px solid transparent",
                        borderLeft: "10px solid transparent",
                    }}
                />
            </div>

            <div
                style={{
                    position: "absolute",
                    top: "100%",
                    borderTop: `5px solid ${props.color === "blue" ? "#3b82f6" : "#fcd34d"
                        }`,
                    borderRight: "12px solid transparent",
                    borderLeft: "12px solid transparent",
                }}
            />
        </div>
    )
}


