import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { ElementContent } from "../../lib/datatype"
import { ColorInput } from "../../Input/ColorInput"


class Classe extends ElementContent {
color="#FFFFFF"
}


function Display({content}){
    return (<div style={{width:"57mm",height:"87mm"}}>
        <div style={{width:"100%",height:"30mm",backgroundColor:content.color,position:"relative"}}>
            <div style={{width:"33mm",height:"22mm",borderRadius:60,backgroundColor:"white",left:"12mm",position:"absolute",top:"4mm"}}></div>

        </div>
<div style={{width:"100%",height:"24mm",borderBottom:"2px solid black",borderTop:"2px solid black"}}>
    <p style={{fontSize:24, color:"#bcbaba6f"}}> Ouverture</p> </div>
    </div>)

}

function Form({ content, onChange, onSubmit, style }){
    return (<FormBase content={content} onChange={onChange} onSubmit={onSubmit}>
                    <ColorInput onChange={onChange} name={"color"} value={content} />
        
    </FormBase>)
}


export default { name: "Voie", classe: Classe, form: Form, display: {default:Display}, print:{
    numPage:18,padding:12, page: "A4 paysage"
} }