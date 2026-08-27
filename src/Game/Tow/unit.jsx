import { ElementContent } from "../../lib/datatype"
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput } from "../../Input/EditorInput"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
import { MiniPa, SmallPa } from "../../Component/Size"
import { bottomBorder } from "../../Component/style"
import { backgroundColor, borderColor } from "./tow"
import FormBase from "../../Input/FormBase"
import { fullBorder } from "../../Component/style"
import { Link } from "../../lib/datatype"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { TableInput } from "../../Input/TableInput"
import { LoadAndDisplay } from "../../Component/LoadAndDisplay"
import Profil from "./profil"
import { BooleanInput } from "../../Input/BooleanInput"


const typeUnit = {
    inf: "infanterie",
    cav: "cavalerie",
    char: "char",
    mons: "monstre"

}

const subTypeUnit = {
    inf: {
        leg: "légere",
        lourd: "lourde",
        horde: "horde",
        disp: "dispersé"
    },
    cav: {
        leg: "légere",
        lourd: "lourde"
    },
    char: {
        leg: "légere",
        lourd: "lourde"
    },
    mons: {
        beh: "behemoth"
    }
}


class Unit extends ElementContent {
    type = "inf"
    subType = ""
    profils = new Array(10).fill(new Link("profil"))
    profilMin = new Array(10).fill("0")
    profilMax = new Array(10).fill("1")
    profilNum = 0
    profilPoint = new Array(10).fill(0)
    weapons = new Array(10).fill(new Link("weapon"))
    weaponBase = new Array(10).fill(false)
    weaponUnit = new Array(10).fill("a")
    weaponGroup = new Array(10).fill("")
    weaponPoint = new Array(10).fill(0)

    weaponNum = 0
    habilites = new Array(20).fill(new Link("rule"))
    habiliteBasenew = Array(20).fill(false)
    habiliteUnit = new Array(20).fill("a")
    habiliteGroup = new Array(20).fill("")

    habilitePoint = new Array(20).fill(0)
    habilitePointFig = new Array(20).fill(true)
    habiliteNum = 0
}

function Nom({ content, style }) {
    return (<span>{content.name}</span>)
}



function Display({ content, explication, style }) {

    function getWeapons(unit, base) {
        let res = []
        Array.from((new Unit).weapons.keys()).map(e => {
            if (content.weaponBase[e] === base && content.weaponUnit[e] == unit) res.push(e)
        })
        return res
    }
    function getHabilites(unit, base, group) {
        let res = []
        Array.from((new Unit).habilites.keys()).map(e => {
            if (content.habiliteBase[e] === base && content.habiliteUnit[e] == unit && content.habiliteGroup[e] == group) res.push(e)
        })
        return res
    }
    function getHabilitesGroup(unit) {
        var distinct = []
        for (var i = 0; i < content.habiliteGroup?.length||0; i++)
            if (content.habiliteGroup[i] != undefined && content.habiliteUnit[i] === unit && !distinct.includes(content.habiliteGroup[i]))
                distinct.push(content.habiliteGroup[i])
        console.log(distinct)
        return distinct
    }
    function getHabilitesUnit() {
        var distinct = []
        for (var i = 0; i < content.habiliteUnit?.length||0; i++)
            if (content.habiliteUnit[i] != undefined && content.habiliteUnit[i] != "" && !distinct.includes(content.habiliteUnit[i]))
                distinct.push(content.habiliteUnit[i])
        return distinct
    }


    return (

        <div
            style={{
                width: 561,
                ...style,
                ...borderColor,
                ...fullBorder,
                ...backgroundColor,
                position: "relative",
                color: "#000",
                padding: " 5px 0px",
                fontSize: 10
            }}>
            <Text style={{
                fontSize: 15,
                fontWeight: "bold",
                ...bottomBorder(4),
                ...borderColor,
                width: "50%",
                float: "left",
                height: 20,
            }}
                text={content.name} />
            <Text style={{
                fontSize: 10,
                width: "50%",
                ...bottomBorder(4),
                ...borderColor,
                float: "left",
                height: 20,
            }}
                text={typeUnit[content.type] + " " + subTypeUnit[content.type][content.subType]} />

            <div style={{
                clear: "both"
            }}>
                <LoadAndDisplay link={new Link("profil")} style={{ fontSize: 9 }} />
                {content.profils && content.profils.map((e, i) => {
                    return (<LoadAndDisplay key={i} link={e} displayeur={"stat"}
                        style={{ marginLeft: 2, fontSize: 9, width: "100%", ...(e.id !== -1 ? {} : { display: "none" }) }}
                        context={{ point: content.profilPoint[i] }} />)
                })}
            </div>
            <div>
                <span style={{ fontWeight: 700 }}>Composition d'unité:</span>
                {content.profils && content.profils.map((e, i) => {
                    return (e.id !== -1 ? <div key={i} >
                        {content.profilMin[i] + "-" + content.profilMax[i] + " "}
                        <LoadAndDisplay link={e} displayeur={"nom"} style={{ display: "inline", fontSize: 9 }} />
                    </div> : "")
                })}
            </div>
            <div>
                <span style={{ fontWeight: 700 }}>Armes:</span>
                {content.weapons && content.weapons.map((e, i) => {
                    return (<LoadAndDisplay key={"wp" + i} link={e} displayeur={"stat"}
                        style={{ marginLeft: 2, fontSize: 9, width: "100%", ...(e.id !== -1 ? {} : { display: "none" }) }} />)
                })}

                {getWeapons("a", true).length > 0 && <div>Toutes vos figurines ont : {
                    getWeapons("a", true).map((e, i) => {
                        return (<span key={"wo" + e}><LoadAndDisplay link={content.weapons[e]} displayeur="nom"
                            style={{ display: "inline" }} /> {getWeapons("a", true).length > i + 1 && ", "}</span>)
                    })}</div>}

            </div>
            <div>
                <span style={{ fontWeight: 700 }}>Option:</span>

                {getHabilitesUnit().map(u => {
                    return (
                        <div key={u}>
                            {getHabilitesGroup("a").map(g => {
                                {
                                    return (<div key={g}>
                                        {getHabilites(u, false, g).length > 0 && <div>Vous pouvez ajouter les options suivantes a tout vos {u == "a" ? " figurines" :
                                            <LoadAndDisplay link={content.profils[u]} displayeur="nom"
                                                style={{ display: "inline" }} />} : {
                                                getHabilites(u, false, g).map((e, i) => {
                                                    return (<span key={"wo" + e}>
                                                        <br />
                                                        <LoadAndDisplay link={content.habilites[e]} displayeur="nom"
                                                            style={{ display: "inline" }} />{getHabilites(u, false, g).false > i + 1 && (<br />)}
                                                        {" "}pour {content.habilitePoint[e]} {content.habilitePointFig[e] ? "pts par figurine" : "pts"}
                                                    </span>)
                                                })}
                                        </div>} </div>
                                    )
                                }
                            })}
                        </div>)
                })}
            </div>

        </div>
    )
}


function Form({ content, onChange, onSubmit, style }) {
    /*content.habiliteBase = new Array(10).fill(false)
     content.habiliteUnit = new Array(10).fill("")
     content.habilitePoint = new Array(10).fill(0)
     content.habiliteGroup = new Array(10).fill("")*/
    //content.habilites = new Array(10).fill(new Link("rule"))
    //content.habilitePointFig = new Array(10).fill(true)
    function profilTable(x) {
        return [(<ModalPickerInput onChange={onChange} name="profils" value={content} index={x} type={["profil"]} label={"#" + x} />),
        (<TextInput onChange={onChange} name="profilMin" value={content} index={x} />),
        (<TextInput onChange={onChange} name="profilMax" value={content} index={x} />),
        (<NumberInput onChange={onChange} name="profilPoint" value={content} index={x} />)]
    }

    function weaponTable(x) {
        return [(<ModalPickerInput onChange={onChange} name="weapons" value={content} index={x} type={["weapon"]} label={"#" + x} />),
        (<BooleanInput onChange={onChange} name="weaponBase" value={content} index={x} />),
        (<TextInput onChange={onChange} name="weaponUnit" value={content} index={x} />),
        (<NumberInput onChange={onChange} name="weaponPoint" value={content} index={x} />),
        (<TextInput onChange={onChange} name="weaponGroup" value={content} index={x} />),
        ]
    }
    function habiliteTable(x) {
        return [(<ModalPickerInput onChange={onChange} name="habilites" value={content} index={x} type={["rule"]} label={"#" + x} />),
        (<BooleanInput onChange={onChange} name="habiliteBase" value={content} index={x} />),
        (<TextInput onChange={onChange} name="habiliteUnit" value={content} index={x} />),
        (<NumberInput onChange={onChange} name="habilitePoint" value={content} index={x} />),
        (<BooleanInput onChange={onChange} name="habilitePointFig" value={content} index={x} />),
        (<TextInput onChange={onChange} name="habiliteGroup" value={content} index={x} />),
        ]
    }
    return (

        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EnumInput onChange={onChange} name="type" value={content} enumClass={typeUnit} label="type" />
            <EnumInput onChange={onChange} name="subType" value={content} enumClass={subTypeUnit[content.type]} aucun={true} />
            <TableInput onChange={onChange} Line={profilTable} max={10} name="profilNum" value={content} label="Profil" />
            <TableInput onChange={onChange} Line={weaponTable} max={10} name="weaponNum" value={content} label="Arme" />
            <TableInput onChange={onChange} Line={habiliteTable} max={20} name="habiliteNum" value={content} label="Arme" />
        </FormBase>


    )
}

export default { name: "Unité", classe: Unit, form: Form, display: { default: Display, nom: Nom }, print: "grid-cols-3" }




