import { ElementContent, Link, aggregation } from "../../lib/datatype"
import { TypeLienCarac, TypeLienForm } from "./Component/TypeLien"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { Nom as NomCommun } from "./Component/Nom"
import { EditorInput } from "../../Input/EditorInput"
import { ColorInput } from "../../Input/ColorInput"
import { backgroundColor, police } from "./ti5Const"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text } from "../../Component/Text"
import FormBase from "../../Input/FormBase"




// Type de lien : commun (réserve commune : sac d'agents, réserve infinie du
// plateau général) ou lié à une faction
class Classe extends aggregation(ElementContent, TypeLienCarac) {

    usage = ""
    color = "#000000"

    // Agent de base que cet agent de faction remplace (le Généticien
    // d'Arborec réimplémente le Logisticien) : au recrutement, une faction
    // qui l'a sur sa feuille reçoit cet agent à la place de l'agent de base.
    reimplemente = new Link("agent")
}

// Le nom de l'agent, à sa couleur, précédé du logo de sa faction s'il y est lié
function Nom({ content, explication, style={} })
{
    return (
        <NomCommun content={content} style={{...style,color: content.color}} />
    )
}

function Display({ content, explication, style }) {



    return (

        <div
            style={{
                ...style,
                color: "white",
                borderColor: content.color,
                ...backgroundColor,
                ...fullBorder,
                borderWidth:2,
                borderRadius:8,
                width: 150,
                minHeight: 65
            }}>
            <Text style={{
                color: content.color,
                borderColor: content.color,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{ fontSize: police.texteAgent, paddingLeft: 2, paddingBottom: 2 }} text={content.usage} rule={explication} />

        </div>
    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <TypeLienForm content={content} onChange={onChange} />
            <ModalPickerInput
                onChange={onChange}
                name="reimplemente"
                value={content}
                label="Réimplémente (agent de base)"
                type={["agent"]}
            />
            <EditorInput onChange={onChange} name="usage" value={content} label="Usage" />
            <ColorInput onChange={onChange} name="color" value={content} />
        </FormBase>
    )
}


export default { name: "Agent", classe: Classe, form: Form, display: { default: Display,nom:Nom } }