import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text, Explication } from "../../Component/Text"
import { backgroundColor, borderColor } from "./ti5"
import { bottomBorder, fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"





class Classe extends ElementContent {

    usage=""
        special=""


}

function Display({ content,style={},explication }) {


    return (
     <div style={{
            width: 600,
            ...backgroundColor,
            boxSizing: "border-box",
            ...borderColor,
            color: "white",
            ...fullBorder,
            ...style,
        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth/2||2,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize||10,
                paddingLeft: 3,
                paddingBottom: 3,
                ...bottomBorder(2),
                ...borderColor,
            }} text={content.usage} rule={explication} />
            <Text style={{
                fontSize: style.fontSize||10,
                paddingLeft: 3,
                paddingBottom: 3
            }} text={content.special} rule={explication} />
        </div>
)
}

function Form({ content, onChange, onSubmit,style }) {

    return (
        <>
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

                <EditorInput onChange={onChange} name="usage" value={content} className=" w-190 min-h-80" label="Regles" />
                <EditorInput onChange={onChange} name="special" value={content} className=" w-190 min-h-40" label="Spécialité des factions" />

              
            </FormBase>
        </>
    )
}


export default { name: "Phase de jeu", classe: Classe, form: Form, display:{default: Display} }