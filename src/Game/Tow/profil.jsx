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

export class Profil extends ElementContent {

    mouv
    cc
    ct
    force
    endurance
    blessure
    initiative
    attaque
    commandement
    rules = new Array(12).fill(new Link("rule"))
    rulesNum = 0
}

function Name({ content, explication, style }){
    return(
        <Text style={style} text={content.name}/>
    )
}

function ProfilFull({ content, explication, style }) {

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(20, 1fr)",
            ...style

        }}>
            <Entete />
            <Stat content={content} explication={explication} style={style} />
        </div>
    )
}

function ProfilOnly({ content, explication, style,context={} }) {

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(19, 1fr)",
            ...style

        }}>

            <Stat content={content} explication={explication} style={style} />
           <div> {context.point||"" }</div>
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
            <div style={enteteStyle}>M</div>
            <div style={enteteStyle}>CC</div>
            <div style={enteteStyle}>CT</div>
            <div style={enteteStyle}>F</div>
            <div style={enteteStyle}>E</div>
            <div style={enteteStyle}>PV</div>
            <div style={enteteStyle}>I</div>
            <div style={enteteStyle}>A</div>
            <div style={enteteStyle}>Cd</div>
            <Text style={{
                gridColumn: "13 / 19"
            }} text={" "} />
            <div style={enteteStyle}>pts</div>

        </>

    )
}

function Stat({ content, explication, style }) {

    const CaracStyle = {
        textAlign: "center"
    }

    return (

        <>
            <Text style={{
                gridColumn: "1 / 4"
            }} text={content.name} />
            <div style={CaracStyle}>{content.mouv}</div>
            <div style={CaracStyle}>{content.cc}</div>
            <div style={CaracStyle}>{content.ct}</div>
            <div style={CaracStyle}>{content.force}</div>
            <div style={CaracStyle}>{content.endurance}</div>
            <div style={CaracStyle}>{content.blessure}</div>
            <div style={CaracStyle}>{content.initiative}</div>
            <div style={CaracStyle}>{content.attaque}</div>
            <div style={CaracStyle}>{content.commandement}</div>

            <div style={{
                gridColumn: "13 / 19"
            }}>
                {Array.from(content.rules.keys()).map((i) => {
                    return content.rules && i<content.rulesNum &&
                        <span key={i} ><LoadAndDisplay displayeur={"nom"} link={content.rules[i]} style={{}} /> {content.rules[i+1]&&content.rules[i+1].id!==-1 &&","} </span>
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

            <NumberInput onChange={onChange} name="mouv" value={content} min={0} max={99} label="M" />
            <NumberInput onChange={onChange} name="cc" value={content} min={0} max={99} label="CC" />
            <NumberInput onChange={onChange} name="ct" value={content} min={0} max={99} label="CT" />
            <NumberInput onChange={onChange} name="force" value={content} min={0} max={99} label="F" />
            <NumberInput onChange={onChange} name="endurance" value={content} min={0} max={99} label="E" />
            <NumberInput onChange={onChange} name="blessure" value={content} min={0} max={99} label="PV" />
            <NumberInput onChange={onChange} name="initiative" value={content} min={0} max={99} label="I" />
            <NumberInput onChange={onChange} name="attaque" value={content} min={0} max={99} label="A" />
            <NumberInput onChange={onChange} name="commandement" value={content} min={0} max={99} label="CD" />
            <TableInput onChange={onChange} Line={ruleLine} max={12} name="rulesNum" value={content} label="Régles additionelles" />

        </FormBase>
    )
}


export default { name: "Profil", classe: Profil, form: Form, display: { default: ProfilFull ,stat:ProfilOnly,nom:Name} }