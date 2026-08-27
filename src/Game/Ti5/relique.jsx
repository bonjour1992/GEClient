import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text, Explication } from "../../Component/Text"
import { backgroundColor, backgroundColorFull, borderColor } from "./ti5"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"
import { LoadAndDisplay } from "../../Component/LoadAndDisplay"
import { pub } from "../../lib/fetch"
import { NumberInput } from "../../Input/NumberInput"

class Habilite extends ElementContent {

    usage = ""
    coutAnc = 0
    coutMil = 0
    coutSpa = 0
    coutCiv = 0
    point = 1
}

function Display({ content, explication, style = {} }) {


    return (
        <div style={{
            ...SmallPo,
            ...backgroundColorFull,
            ...borderColor,
            color: "white",
            ...fullBorder,
            ...style,
            position: "relative"
        }}>


            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth / 2 || 2,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center",
                width: "80%",
                height: 30,
                float: "left",
            }} text={content.name} />
            <div style={{
                textAlign: "center",
                width: "16.1%",
                height: 30,
                float: "left",
                fontSize: 24,
                fontWeight: 700,
                ...borderColor,
                borderBottomWidth: style.borderWidth / 2 || 2,
                borderBottomStyle: "solid",
                borderLeftWidth: style.borderWidth / 2 || 2,
                borderLeftStyle: "solid",
            }}>
                {content.point}
            </div>
            <Text style={{
                fontSize: style.fontSize || 10,
                paddingLeft: 2,
                paddingBottom: 2
            }} text={content.usage} rule={explication} />

            <div style={{
                position: "absolute",
                width: "100%",
                bottom: 0,
                paddingBottom: 1,
                textAlign: "center"
            }}>
                {(new Array(content.coutAnc).fill(1)).map((a, i) => <img style={{ display: "inline" }} key={i} src={pub + "/ti/relic/relicAnc.png"} alt="relique Ancienne" width={20} height={20} />)}
                {(new Array(content.coutMil).fill(1)).map((a, i) => <img style={{ display: "inline" }} key={i} src={pub + "/ti/relic/relicMil.png"} alt="relique militaire" width={20} height={20} />)}
                {(new Array(content.coutSpa).fill(1)).map((a, i) => <img style={{ display: "inline" }} key={i} src={pub + "/ti/relic/relicSpa.png"} alt="relique spatiale" width={20} height={20} />)}
                {(new Array(content.coutCiv).fill(1)).map((a, i) => <img style={{ display: "inline" }} key={i} src={pub + "/ti/relic/relicCiv.png"} alt="relique civile" width={20} height={20} />)}
            </div>

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
            <img src={pub + "/ti/relic/relicCiv.png"} height="140px" />

        </div>
    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <EditorInput onChange={onChange} name="usage" value={content} label="Effet" />
            <NumberInput onChange={onChange} name="point" value={content} label="Point" />
            <br /><span>Fragments:</span>
            <NumberInput onChange={onChange} name="coutAnc" value={content} label="Ancien" />
            <NumberInput onChange={onChange} name="coutMil" value={content} label="Militaire" />
            <NumberInput onChange={onChange} name="coutSpa" value={content} label="Spatial" />
            <NumberInput onChange={onChange} name="coutCiv" value={content} label="Civilationnel" />
        </FormBase>
    )
}


export default { name: "Relique", classe: Habilite, form: Form, display: { default: Display, verso: Verso } }