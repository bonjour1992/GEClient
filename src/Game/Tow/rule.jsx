import { TextInput } from "../../Input/TextInput"
import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text, Explication } from "../../Component/Text"
import { backgroundColor,borderColor } from "./tow"
import FormBase from "../../Input/FormBase"
import { fullBorder } from "../../Component/style"
import { v4 as uuidv4 } from 'uuid';

class Habilite extends ElementContent {

    effet = ""
}

function Name({ content, explication, style }){
    const uid=uuidv4()
    function displayHelp()
    {
        document.getElementById(uid).setAttribute("style", "display:block;position:fixed;background-color:white;border-radius:4px;z-index:9;")
    }

    function closeHelp()
    {
        document.getElementById(uid).setAttribute("style", "display:none;")
    }

    return (
        <div onMouseEnter={displayHelp} onMouseLeave={closeHelp} style={{display:"inline"}}>
        <Text style={{display:"inline"}} text={content.name} />
        <div id={uid} style={{display:"none", backgroundColor:"white",borderRadius:4}}><Text text={content.effet}/> </div>
        </div>
    )
}

function Display({ content, explication, style }) {


    return (
        <div style={{
            width: 250,
            ...backgroundColor,
            ...borderColor,
            ...style,
            ...fullBorder


        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: 2,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: 10,
                paddingLeft: 2,
                paddingBottom: 2
            }} text={content.effet} rule={explication} />

        </div>


    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <EditorInput onChange={onChange} name="effet" value={content} />

        </FormBase>
    )
}


export default { name: "Regles", classe: Habilite, form: Form, display: { default: Display ,nom:Name} }