import { ElementContent, Link } from "../../lib/datatype"
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { BooleanInput } from "../../Input/BooleanInput"
import { ImagePicker } from "../../Input/ImagePicker"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { RangeInput } from "../../Input/RangeInput"
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

const anomaly = {
    ast: "Champ d'astéroïde",
    sup: "Supernova",
    rift: "Rupture gravitationelle",
    neb: "Nébuleuse",
    hplt:"Hyperlane trait",
    hplc:"Hyperlane courbe",
    hpldc:"Hyperlane double courbe",
    hplpa:"Hyperlane patte d'oie",
    hplx: "Hyperlane en X"
}

const anomalyPict = new Map([["ast", "/ti/system/asteroide.png"],
["sup", "/ti/system/supernova.png"],
["rift", "/ti/system/gravit.png"],
["neb", "/ti/system/nebuleuse.png"],
["hplt", "/ti/system/hplane trait.png"],
["hplc", "/ti/system/hplane courbe.png"],
["hpldc", "/ti/system/hplane double courbe.png"],
["hplpa", "/ti/system/hplane pate oie.png"],
["hplx", "/ti/system/hplane x.png"]

])

class Classe extends ElementContent {
    anomaly = ""
    elems = new Array(3).fill(new Link("planet"))
    elemsX = new Array(3).fill(100)
    elemsY = new Array(3).fill(100)
    elemsSize = new Array(3).fill(120)
    nativeUnit = new Link("unit")
    unitNum = 1
}

function Display({ content, style, context, explication }) {
const w=339
const h= w/1.15306122

    return (<div style={{
        width: w,
        height: h,
        backgroundImage: "url(" + pub + "/ti/system/bgSystem.png)",
        backgroundSize: "cover",
        position: "relative",
        overflow: "hidden",
        ...style
    }}  >
        {content.anomaly  && <img src={pub + (anomalyPict.get(content.anomaly) || "/404.jpeg")} alt={content.anomaly} width={w} height={h} />}
        {content.anomaly && content.anomaly.indexOf("hpl")===-1  && <img src={pub + "/ti/system/anomalie.png"} alt="contient anomalie" width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }} />}

        {content.elems.map((e, i) =>
            <Sizer
                key={i}
                X={content.elemsX[i]}
                Y={content.elemsY[i]}
                size={content.elemsSize[i]} >
                {e.id !== -1 && <LoadAndDisplay link={e} displayeur="pict" />}
            </Sizer>)}

             {(content.nativeUnit?.__link && content.nativeUnit.id !== -1) ?
            <LoadAndDisplay link={content.nativeUnit} displayeur={content.nativeUnit.type==="unit"?"neutral":"default"} context={{ num: content.unitNum }}
                style={{
                    position: "absolute",
                    left: 81,
                    width: 177,
                    top: 228,
                    height: 66,
                    borderWidth: 2,
                    borderRadius: 12,
                    fontSize:7
                }} /> : ""}
    </div>)
}

function Sizer({ X, Y, size, children }) {
    return (<div
        style={{
            position: "absolute",
            top: Y + "px",
            left: X + "px",
            transform: "scale(" + (size / 100) + ")"
        }}>
        {children}
    </div>)
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <EnumInput onChange={onChange} name="anomaly" value={content} enumClass={anomaly} aucun={true} />
            {[0, 1, 2].map(e => <div key={e}>
                <ModalPickerInput onChange={onChange} label={"Element " + (e + 1)} name={"elems"} index={e} value={content} type={["planet"]} />
                <RangeInput onChange={onChange} name="elemsX" index={e} value={content} min={0} max={250} label="X" style={{ visibility: content.elems[e].id === -1 ? "hidden" : "block" }} />
                <RangeInput onChange={onChange} name="elemsY" index={e} value={content} min={0} max={200} label="Y" style={{ visibility: content.elems[e].id === -1 ? "hidden" : "block" }} />
                <RangeInput onChange={onChange} name="elemsSize" index={e} value={content} min={10} max={300} label="Scale" style={{ visibility: content.elems[e].id === -1 ? "hidden" : "block" }} />

            </div>)}
                <ModalPickerInput onChange={onChange} name="nativeUnit" value={content} type={["unit","habilite"]} />
                <NumberInput onChange={onChange} name="unitNum" value={content} min={0} max={99}
                 style={{display:(content.nativeUnit&& content.nativeUnit.id!==-1 && content.nativeUnit.type==="unit")?"inline":"none"}}/>
        </FormBase>
    )
}


export default { name: "Systéme", classe: Classe, form: Form, display: { default: Display }, print: "grid-cols-4" }