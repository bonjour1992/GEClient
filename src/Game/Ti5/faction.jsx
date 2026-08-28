import { ElementContent, Link } from "../../lib/datatype.js";
import { TextInput } from "../../Input/TextInput.jsx";
import { turnNumber } from "./ti5.jsx";
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
import { bottomBorder } from "../../Component/style.jsx";
import { A4Pa } from "../../Component/Size.jsx";

class Faction extends ElementContent {
    logo = "/404.jpeg"
    color = "#FFFFFF"
    units = new Array(12).fill(new Link("unit"))
    agents = new Array(7).fill(new Link("agent"))
    rules = new Array(5).fill(new Link("habilite"))
    agentNum = 0
    ruleNum = 0
    agentSetup = new Array(7).fill(0)
    unitNum = new Array(12).fill(0)
    setup = ""
    lore = ""
    system = new Link("system")
}

function Display({ content, style, context, explication }) {
    let turn = Array.from(Array(turnNumber - 1)).map((e, i) => i + 2)


    return (<div
        style={{
            backgroundImage: imgURL("/ti/bg%20star.jpg"),
            ...A4Pa
        }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(" + turn.length + ", 1fr)" }}>
            {turn.map((e) => {
                return (<div key={e} style={{
                    borderTop: 0,
                    borderLeft: 6,
                    borderRight: 6,
                    borderBottom: 12,
                    height: 60,
                    borderStyle: "solid",
                    borderColor: "#999999",
                    textAlign: "center"
                }}
                >
                    <span style={{ fontSize: 50, color: "#999999" }}>    {e}</span></div>)
            })}
        </div>
        <FactionName content={content} style={{ marginLeft: 20, fontSize: 50, fontWeight: 1000 }} />
        <div style={{
            height: 630,
            width: 160,
            gap: 5,
            padding: 5,
            paddingLeft: 15,
            display: "flex",
            flexDirection: "column",
            float: "left"
        }}>
            {Array.from((new Faction).agents.keys()).map((i) => {
                return content.agents &&
                    <LoadAndDisplay key={i} link={content.agents[i]} style={{ flexGrow: 1, display: content.agents[i].id === -1 ? "none" : "block" }} />
            })}
        </div>
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            height: 630,
            width: 700,
            float: "left",
            paddingTop: 5
        }}
        >
            {Array.from((new Faction).units.keys()).map((i) => {
                return content.units &&
                    <LoadAndDisplay key={i} link={content.units[i]} style={{ width: 230, visibility: content.units[i].id === -1 ? "hidden" : "visible" }} />
            })}
        </div>
        <div style={{
            height: 630,
            width: 220,
            gap: 5,
            padding: 5,
            paddingRigth: 15,
            display: "flex",
            flexDirection: "column",
            float: "left"
        }}>
            {Array.from((new Faction).rules.keys()).map((i) => {
                return content.rules &&
                    <LoadAndDisplay key={i} link={content.rules[i]} style={{ width: 220, display: content.rules[i].id === -1 ? "none" : "block" }} />
            })}
        </div>
    </div>)
}

export function FactionName({ content, style }) {
    return (
        <Text text={"#img[" + content.logo + "]" + content.name} style={{ ...style, color: content.color }} />
    )
}

export function FactionLogo({ content, style }) {
    return (

        <Text text={"#img[" + content.logo + "]"} style={{ ...style, color: content.color }} />
    )
}

export function Verso({ content, style, explication }) {

    function Separateur() {
        return (<div style={{ width: "102%", height: 0, borderColor: "white", ...bottomBorder(2), margin: "5px -3px" }}></div>)
    }

    return (<div
        style={{
            backgroundImage: imgURL("/ti/bg%20star.jpg"),
            ...A4Pa,
            display: "grid",
            gridTemplate: "30% 69% / 30% 35% 35%"
        }}>
        <div style={{
            gridColumn: 1,
            gridRow: "1 / 3",
            margin: 5,
            backgroundColor: "#BBBBBB66",
            borderRadius: 12,
            padding: 4,
        }}>
            {Array.from((new Faction).agents.keys()).map((i) => {
                return content.agents && content.agents[i].id !== -1 && content.agentSetup[i] != 0 && <div key={i} >
                    <LoadAndDisplay link={content.agents[i]} displayeur="nom" style={{ display: "inline" }} />
                    <span style={{ color: "white" }}>: {content.agentSetup[i]}</span>
                    <br />
                </div>
            })}
            <Separateur />
            {Array.from((new Faction).units.keys()).map((i) => {
                return content.units && content.units[i].id !== -1 && content.unitNum[i] != 0 && <div key={i} >
                    <LoadAndDisplay link={content.units[i]} displayeur="nom" style={{ display: "inline", color: "white" }} />
                    <span style={{ color: "white" }}>: {content.unitNum[i]}</span>
                    <br />
                </div>
            })}
            <Separateur />
            <Text text={content.setup} style={{ color: "white", fontSize: 12 }} rule={explication} />
        </div>
        <div style={{
            gridColumn: 2,
            gridRow: 1,
        }}>
            Image
        </div>
        <div style={{
            gridColumn: 3,
            gridRow: 1,
        }}>
            <LoadAndDisplay link={content.system || new Link("system")} style={{ transform: "scale(0.7) ", marginTop: -30 }} />
        </div>
        <div style={{
            gridColumn: "2 / 4",
            gridRow: 2,
            margin: 5,
            backgroundColor: "#BBBBBB66",
            borderRadius: 12,
            padding: 4,
        }}>
            <Text text={content.lore} style={{ color: "white", fontSize: 9 }} rule={explication} />
        </div>
    </div>)
}



function Form({ content, onChange, onSubmit, style }) {

    if (!content.rules) {
        content.rules = new Array(5).fill(new Link("habilite"))
        content.ruleNum = 0
    }

    if (!content.agentSetup) {
        content.agentSetup = new Array(7).fill(0)

    }
    if (!content.unitNum) {
        content.unitNum = new Array(12).fill(0)
    }


    function agentLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"agents"} value={content} index={x} type={["agent"]} />),
        (<NumberInput onChange={onChange} name={"agentSetup"} value={content} index={x} min={0} />)]
    }

    function ruleLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"rules"} value={content} index={x} type={["habilite"]} />)]
    }

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <ImagePicker onChange={onChange} name={"logo"} value={content} />
            <ColorInput onChange={onChange} name={"color"} value={content} />

            <h2>Agents</h2>
            <TableInput onChange={onChange} Line={agentLine} max={7} name="agentNum" value={content} />
            <h2>Unités</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {Array.from((new Faction).units.keys()).map((i) => {
                    return (<div key={i} className="p-2" >
                        <ModalPickerInput onChange={onChange} name={"units"} value={content} index={i} type={["unit"]} />
                        <NumberInput onChange={onChange} name={"unitNum"} value={content} index={i} min={0} />
                    </div>)
                })}

            </div>
            <h2>Rule</h2>
            <TableInput onChange={onChange} Line={ruleLine} max={5} name="ruleNum" value={content} />
            <h2>Mise en place</h2>
            <EditorInput onChange={onChange} value={content} name="setup" label="Mise en place" />
            <ModalPickerInput onChange={onChange} value={content} name="system" label="Systeme de depart" type={["system"]} />
            <EditorInput onChange={onChange} value={content} name="lore" label="Lore" />
        </FormBase>
    )
}

//

export default { name: "Faction", classe: Faction, form: Form, display: { default: Display, verso: Verso, nom: FactionName, logo: FactionLogo }, print: "grid-cols-1" }