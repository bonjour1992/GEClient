import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text, Explication } from "../../Component/Text"
import { backgroundColor, borderColor } from "./tow"
import FormBase from "../../Input/FormBase"
import { fullBorder } from "../../Component/style"
import { NumberInput } from "../../Input/NumberInput"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { TableInput } from "../../Input/TableInput"
import { Link } from "../../lib/datatype"
import { LoadAndDisplay } from "../../Component/LoadAndDisplay"
import { BooleanInput } from "../../Input/BooleanInput"

class Profil extends ElementContent {
    port = 0
    touche
    relTouche = true
    diceTouche = 1
    force
    relForce
    diceForce = 1
    degat = 1
    diceDegat
    pene
    dicePene = 1
    initiative
    relInitiative
    diceInitiative = 1
    attaque
    relAttaque
    diceAttaque = 1
    rules = new Array(12).fill(new Link("rule"))
    rulesNum = 0
}

function Name({ content, explication, style }) {
    return (
        <Text style={style} text={content.name} />
    )
}

function ProfilFull({ content, explication, style }) {

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(17, 1fr)",
...style
        }}>
            <Entete />
            <Stat content={content} explication={explication} style={style} />
        </div>
    )
}

function Entete() {

    const enteteStyle = {
        textAlign: "center"
    }

    return (

        <>
            <Text style={{
                gridColumn: "1 / 4"
            }} text={" "} />
            <div style={{ ...enteteStyle, gridColumn: "5 / 6" }}>Portée</div>
            <div style={enteteStyle}>A</div>
            <div style={enteteStyle}>Touche</div>
            <div style={enteteStyle}>F</div>
            <div style={enteteStyle}>AP</div>
            <div style={enteteStyle}>Deg</div>
            <div style={enteteStyle}>I</div>

            <Text style={{
                gridColumn: "12 / 18"
            }} text={" "} />
        </>


    )
}

function ProfilOnly({ content, explication, style }) {

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(17, 1fr)",
...style

        }}>
            <Stat content={content} explication={explication} style={style} />
        </div>
    )
}

function Stat({ content, explication, style }) {

    const CaracStyle = {
        textAlign: "center"
    }

    function StatDisplayeur({ val, rel, dice, label }) {
        return (<div style={CaracStyle}>{rel ? (label + (val > 0 ? "+" : "") + (val || "")) : val}{dice > 1 ? "D" + dice : ""}</div>)
    }


    return (

        <>
            <Text style={{
                gridColumn: "1 / 4"
            }} text={content.name} />
            <div style={{
                gridColumn: "5 / 6"
            }} > {content.port ? content.port + "\"" : "contact"} </div>
            <StatDisplayeur val={content.attaque} rel={content.relAttaque} dice={content.diceAttaque} label="A" />
            <StatDisplayeur val={content.touche} rel={content.reltouche} dice={content.diceTouche} label="" />

            <StatDisplayeur val={content.force} rel={content.relForce} dice={content.diceForce} label="F" />
            <StatDisplayeur val={content.pene} rel={false} dice={content.dicePene} label="AP" />
            <StatDisplayeur val={content.degat} rel={false} dice={content.diceDegat} label="Deg" />
            <StatDisplayeur val={content.initiative} rel={content.relInitiative} dice={content.diceInitiative} label="I" />

            <div style={{
                gridColumn: "12 / 18"
            }}>
                {Array.from(content.rules.keys()).map((i) => {
                    return content.rules &&
                        <span key={i} ><LoadAndDisplay displayeur={"nom"} link={content.rules[i]} style={{}} /> {content.rules[i + 1] && content.rules[i + 1].id !== -1 && ","} </span>
                })}
            </div>
        </>


    )
}

function Form({ content, onChange, onSubmit, style }) {

    function ruleLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"rules"} value={content} index={x} type={["rule"]} />)]
    }


    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <NumberInput onChange={onChange} name="port" value={content} min={0} max={100} label="Portée" />
            <br />
            <NumberInput onChange={onChange} name="attaque" value={content} min={-5} max={5} label="A" />
            <NumberInput onChange={onChange} name="diceAttaque" value={content} min={1} max={6} label="D" />
            <BooleanInput onChange={onChange} name="relAttaque" value={content} label="rel?" />
            <br />
            <NumberInput onChange={onChange} name="touche" value={content} min={-5} max={6} label="Touche" />
            <NumberInput onChange={onChange} name="diceTouche" value={content} min={1} max={6} label="D" />
            <BooleanInput onChange={onChange} name="relTouche" value={content} label="rel?" />
            <br />

            <NumberInput onChange={onChange} name="force" value={content} min={-9} max={9} label="F" />
            <NumberInput onChange={onChange} name="diceForce" value={content} min={1} max={6} label="D" />
            <BooleanInput onChange={onChange} name="relForce" value={content} label="rel?" />
            <br />

            <NumberInput onChange={onChange} name="degat" value={content} min={0} max={99} label="Deg" />
            <NumberInput onChange={onChange} name="diceDegat" value={content} min={1} max={6} label="D" />
            <br />
            <NumberInput onChange={onChange} name="pene" value={content} min={0} max={6} label="AP" />
            <NumberInput onChange={onChange} name="dicePene" value={content} min={1} max={6} label="D" />
            <br />
            <NumberInput onChange={onChange} name="initiative" value={content} min={-9} max={9} label="I" />
            <NumberInput onChange={onChange} name="diceInitiative" value={content} min={1} max={6} label="D" />
            <BooleanInput onChange={onChange} name="relInitiative" value={content} label="rel?" />
            <br />
            <TableInput onChange={onChange} Line={ruleLine} max={12} name="rulesNum" value={content} label="Régles additionelles" />

        </FormBase>
    )
}


export default { name: "Arme", classe: Profil, form: Form, display: { default: ProfilFull, stat: ProfilOnly, nom: Name } }