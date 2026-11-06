import { EditorInput } from "../../Input/EditorInput"
import { ElementContent } from "../../lib/datatype"
import { Text } from "../../Component/Text"
import { backgroundColor, borderColor } from "./ti5Const"
import { bottomBorder, fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"
import { NumberInput } from "../../Input/NumberInput"
import { BooleanInput } from "../../Input/BooleanInput"





class Classe extends ElementContent {

    usage=""
        special=""

    // Numéro de la phase dans le tour (1, 2, 3...). À 0, le nombre au début
    // du nom est utilisé (« 02.Phase de recrutement » -> 2).
    numero = 0

    // Phase spéciale : elle n'apparaît pas dans le déroulement d'une partie.
    // Une phase sans numéro (ou de numéro 0, « 00. Controle ») est spéciale.
    horsTour = false

    // Jeu en ligne : ce qu'il faut faire sur le moteur de jeu à cette phase
    enLigne = ""


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

// Affichage « jeu en ligne » : seulement ce qu'il faut faire sur le moteur
// de jeu à cette phase (onglet Aide d'une partie).
function EnLigne({ content, style = {}, explication }) {

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
                borderBottomWidth: 2,
                paddingLeft: 4,
                fontSize: 12,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize || 10,
                paddingLeft: 3,
                paddingBottom: 3
            }} text={content.enLigne} rule={explication} />
        </div>
    )
}

function Form({ content, onChange, onSubmit,style }) {

    return (
        <>
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

                <NumberInput onChange={onChange} name="numero" value={content} min={0}
                    label="Numéro de la phase dans le tour (0 = le nombre au début du nom)" />
                <BooleanInput onChange={onChange} name="horsTour" value={content}
                    label="Phase spéciale (non affichée dans le déroulement d'une partie) ?" />

                <EditorInput onChange={onChange} name="usage" value={content} className=" w-190 min-h-80" label="Regles" />
                <EditorInput onChange={onChange} name="special" value={content} className=" w-190 min-h-40" label="Spécialité des factions" />
                <EditorInput onChange={onChange} name="enLigne" value={content} className=" w-190 min-h-40" label="Jeu en ligne (ce qu'il faut faire sur le moteur en ligne à cette phase)" />

              
            </FormBase>
        </>
    )
}


export default { name: "Phase de jeu", classe: Classe, form: Form, display:{default: Display, enLigne: EnLigne} }