import { ElementContent } from "../../lib/datatype"
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput } from "../../Input/EditorInput"
import { techType } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
import { MiniPa, SmallPa } from "../../Component/Size"
import { borderColor } from "./ti5"
import { backgroundColor } from "./ti5"
import FormBase from "../../Input/FormBase"
import { pub } from "../../lib/fetch"
import { BooleanInput } from "../../Input/BooleanInput"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { Link } from "../../lib/datatype"
import { LoadAndDisplay } from "../../Component/LoadAndDisplay"
import { Verso as MercVerso } from "./mercenaire"
//TODO: gestion image  
const shipClasse = {
    fs: "Vaisseau amiral",
    cruiser: "Croiseur",
    dn: "Cuirassé",
    dest: "Destroyeur",
    mech: "Mecha",
    pds: "Systéme de défense",
    com: "Commerce",
    fact: "Usine",
    dock: "Dock",
    sun: "Soleil de geurre",
    inf: "Infanterie",
    mon: "Monument",
    trans: "Transport"

}

const tag = {
    ship: "Vaisseau",
    struc: "Structure",
    sattelite: "Sattelite",
    mil: "Militaire",
    civ: "Civil",
    com: "Commercial",
    science: "Scientifique",
    trans: "Transport",
    terre: "Terrestre",
    space: "Spatiale",
    bio: "Biologique",
    transportable: "Transportable",
    agg: "Aggressif",
    def: "défensif"

}


class Ship extends ElementContent {
    type = "inf"
    habilite = ""
    move
    combat
    combat_touche = 1
    cout
    prod = 1
    capacite
    PV = 1
    mot_cle = []
    merc = false
    faction = new Link("faction")
}


function Nom({ content, style }) {
    return (
        <Text text={content.name} style={style} />
    )
}


function Merc({ content, explication, style })
{
    return (
        <Display content={content} explication={explication} style={SmallPa}/>
    )
}

//TODO: affichage ***
function Display({ content, explication, style }) {
    return (
        <div
            style={{
                ...MiniPa,
                ...style,
                ...borderColor,
                ...fullBorder,
                ...backgroundColor,
                position: "relative",
                color: "#FFFFCC"
            }}>
            <img style={{
                position: "absolute",
                left: "78%",
                top: -4,
                width: 45,
                height: 30,
            }}
                src={pub + "/ti/unit_icon/" + content.type + ".png"} />
            <Text style={{
                paddingLeft: 4,
                fontSize: 15,
                fontWeight: "bold",
                ...bottomBorder(4),
                ...borderColor
            }}
                text={content.name} />
            <Text style={{
                fontSize: 10,
                paddingLeft: 2,
                width: "100%",
                ...bottomBorder(2),
                ...borderColor
            }}
                text={content.mot_cle?.reduce((res, e, k, { length }) => {
                    return res + ReactDOMServer.renderToStaticMarkup(<span key={e} >{tag[e] + (k === length - 1 ? "" : ", ")}</span>)
                }, "")} />
            <Text style={{ fontSize: 9, paddingLeft: 2, lineHeight: 1.2 }} text={content.habilite} rule={explication} />
            <Stat data={[content.cout, content.move, content.combat, content.capacite, content.PV]}
                label={["Cout", "Mouvement", "Attaque", "Capacité", "Résistance"]}
                mult={[content.prod, null, content.combat_touche]}
            />
        </div>
    )
}

function Verso({ content, explication, style }) {
    return (<div
        style={{
            ...MiniPa,
            ...backgroundColor,
            textAlign: "center",
            lineHeight: MiniPa.height + "px"
        }}
    >
        {(content.faction && content.faction.id !== -1) ? <LoadAndDisplay link={content.faction} displayeur={"logo"} style={{
            fontSize: 50,
            verticalAlign: "middle"
        }} /> : ""}
    </div>)
}



function NeutralUnit({ content, explication, style = {}, context = { num: 1 } }) {

    return (
        <div
            style={{

                ...borderColor,
                ...fullBorder,
                ...backgroundColor,
                boxSizing: "border-box",
                position: "relative",
                color: "#FFFFCC",
                ...style
            }}>
            <Text style={{
                paddingLeft: 4,
                fontSize: style.fontSize * 1.25 || 15,
                fontWeight: "bold",
                ...bottomBorder(style.borderWidth || 4),
                ...borderColor
            }}
                text={content.name} />
            <Text style={{
                fontSize: style.fontSize || 10,
                paddingLeft: 2,
                width: "100%",
                ...bottomBorder(style.borderWidth / 2 || 2),
                ...borderColor
            }}
                text={content.mot_cle.reduce((res, e, k, { length }) => {
                    return res + ReactDOMServer.renderToStaticMarkup(<span key={e} >{tag[e] + (k === length - 1 ? "" : ", ")}</span>)
                }, "")} />
            <Text style={{ fontSize: style.fontSize || 9, paddingLeft: 2, lineHeight: 1.2 }} text={content.habilite} rule={explication} />
            <Stat data={[context.num, content.move, content.combat, content.PV]}
                label={["Nombre", "Mouvement", "Attaque", "Résistance"]}
                mult={[null, null, content.combat_touche]}
                style={{
                    height: style.fontSize * 2 || 24,
                    borderRadius: style.borderRadius - style.borderWidth || 12
                }}
            />
        </div>
    )
}


function Stat({ data, label, mult, style = {} }) {

    return (<div style={
        {
            width: "100%",
            height: style.height || 28,
            display: "grid",
            gridTemplateColumns: "repeat(" + data.length + ", 1fr)",
            bottom: 0,
            position: "absolute"
        }}>{data.map((d, i) => {

            return (<div key={i} style={{
                ...borderColor,
                borderWidth: 1,
                borderStyle: d ? "solid" : "none",
                textAlign: "center",
                borderBottomLeftRadius: i === 0 ? style.borderRadius || 12 : 0,
                borderBottomRightRadius: i === data.length - 1 ? style.borderRadius || 12 : 0,
                position: "relative"
            }} >
                {d ? (<><span style={{
                    fontSize: 3 + style.height / 8 || 6,
                    verticalAlign: "top",
                    paddingTop: 3
                }}>{label[i]}</span>
                    <div style={{
                        lineHeight: 0,
                        fontSize: style.height - 7 || 20,
                        fontWeight: "bolder",
                        width: "100%",
                        position: "absolute",
                        bottom: (style.height - 8) / 2 || 10
                    }}>
                        {d}{mult[i] ? mult[i] > 1 ? mult[i] === 2 ? "**" : "*" + mult[i] : "" : ""}
                    </div></>) : ""}
            </div>)
        })}
    </div>)
}

function Form({ content, onChange, onSubmit, style }) {
    return (

        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EnumInput onChange={onChange} name="type" value={content} enumClass={shipClasse} />
            <br />
            <TagInput onChange={onChange} name="mot_cle" value={content} tagClass={tag} />
            <br />
            <EditorInput onChange={onChange} label="Habilité" name="habilite" value={content} />
            <br />
            <NumberInput onChange={onChange} name="cout" value={content} min={0} max={99} label="Cout" />
            <NumberInput onChange={onChange} name="prod" value={content} min={1} max={9} label="Production" />
            <NumberInput onChange={onChange} name="move" value={content} min={0} max={9} label="Mouvement" />
            <NumberInput onChange={onChange} name="combat" value={content} min={0} max={9} label="Combat" />
            <NumberInput onChange={onChange} name="combat_touche" value={content} min={1} max={9} label="touche" />
            <NumberInput onChange={onChange} name="capacite" value={content} min={0} max={99} label="Capacité" />
            <NumberInput onChange={onChange} name="PV" value={content} min={0} max={9} label="Résistance" />
            <br />
            <p>Verso</p>
            <BooleanInput onChange={onChange} name="merc" value={content} label="Mercenaire" />
            <ModalPickerInput onChange={onChange} name="faction" value={content} type={["faction"]} label="Faction" />
        </FormBase>


    )
}

export default { name: "Unité", classe: Ship, form: Form, display: { default: Display, neutral: NeutralUnit, nom: Nom, verso: Verso ,merc:Merc,mercVerso:MercVerso}, print: "grid-cols-3" }




