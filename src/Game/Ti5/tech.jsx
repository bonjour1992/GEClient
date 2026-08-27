import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text, Explication } from "../../Component/Text"
import { backgroundColor, borderColor, techType } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { SmallPa } from "../../Component/Size"
import { EnumInput } from "../../Input/EnumInput"
import { NumberInput } from "../../Input/NumberInput"
import { BooleanInput } from "../../Input/BooleanInput"
import FormBase from "../../Input/FormBase"

export const TechColor = {
    vide: { borderColor: "#666666", backgroundColor: "#DDDDDD" },
    spa: { borderColor: "#0000FF", backgroundColor: "#CCCCFF" },
    soc: { borderColor: "#BBBB00", backgroundColor: "#FFFFCC" },
    mil: { borderColor: "#FF0000", backgroundColor: "#FFCCCC" },
    gen: { borderColor: "#1a5b00", backgroundColor: "#CCFFCC" },
    storm: { borderColor: "#000000", backgroundColor: "#555555" },
}


class Tech extends ElementContent {
    techType = "spa";
    tier = 3;
    cout = 5;
    effet = ""
    special = false
}

function Display({ content, context = { unlocked: false }, style, explication }) {
    return (<div style={{
        ...SmallPa,
        ...backgroundColor,
        ...borderColor,
        color: "white",
        ...style,
        ...fullBorder,
        position: "relative",
        paddingTop:1
    }}>
        <Text text={("#re" + content.techType).repeat(content.tier - 1) + " " + content.name} style={{
            ...bottomBorder(2),
            paddingLeft: 7,
            ...borderColor,
            fontSize: 12,
            fontWeight: "bold",
        }} />
        <Text text={content.effet} style={{
            fontSize: 10,
            paddingLeft: 2,
            paddingBottom: 2
        }}
            rule={explication} />
        <div style={{
            height: 18,
            width: "100%",
            position: "absolute",
            bottom: 0,
            display: "grid",
            gridTemplateColumns: "repeat(" + 15 + ", 1fr)"
        }}>
            {Array(15).keys().map((e, i) => {
                return (<div key={i} style={{
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderBottomLeftRadius: e === 0 ? 12 : 0,
                    borderBottomRightRadius: e === 14 ? 12 : 0,
                    ...TechColor[e < content.cout ? content.techType : "vide"],
                    color:"black",
                    fontSize:12,
                    textAlign:"center",
                    fontWeight:700
                }}>
                    {context.unlocked && e < content.cout && "X"}
                </div>)
            })}
        </div>

    </div>)
}

function Form({ content, onChange, onSubmit, style }) {

    return (

            <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

                <EnumInput onChange={onChange} name="techType" value={content} enumClass={techType} />
                <NumberInput onChange={onChange} name="tier" value={content} min={1} max={5} />
                <NumberInput onChange={onChange} name="cout" value={content} min={1} max={16} />
                <EditorInput onChange={onChange} name="effet" value={content} />
                <BooleanInput onChange={onChange} name={"special"} value={content} label="Technologie spéciale?" />

            </FormBase>

    )
}


export default { name: "Technologie", classe: Tech, form: Form, display: { default: Display }, print: "grid-cols-3" }