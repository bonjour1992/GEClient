import { EditorInput } from "../../Input/EditorInput"
import { ElementContent, aggregation } from "../../lib/datatype"
import { ExemplairesCarac, ExemplairesForm } from "./Component/Exemplaires"
import { Text } from "../../Component/Text"
import { backgroundColor, borderColor as bordureDuJeu, police } from "./ti5Const"
import { fullBorder } from "../../Component/style"
import FormBase from "../../Input/FormBase"

class Habilite extends aggregation(ElementContent, ExemplairesCarac) {

    effet = ""
}

// context (feuille de faction) : couleur = nom, couleur2 = bordures.
// Sans lui, les couleurs habituelles du jeu.
function Display({ content, explication, style ={}, context }) {

    const borderColor = context?.couleur2 ? { borderColor: context.couleur2 } : bordureDuJeu

    return (
        <div style={{
            width: 250,
            ...backgroundColor,
            boxSizing: "border-box",
            ...borderColor,
            color: "white",
            ...fullBorder,
            // Même bordure que les unités : fine et arrondie
            borderWidth: 3,
            borderRadius: 12,
            ...style,
        }}>
            <Text style={{
                ...borderColor,
                borderBottomWidth: style.borderWidth/2||2,
                paddingLeft: 4,
                fontSize: police.titre,
                fontWeight: "bold",
                borderBottomStyle: "solid",
                textAlign: "center",
                ...(context?.couleur ? { color: context.couleur } : {})
            }} text={content.name} />
            <Text style={{
                fontSize: style.fontSize || police.texte,
                paddingLeft: 3,
                paddingBottom: 3,
                                paddingRight:2,
            }} text={content.effet} rule={explication} />

        </div>


    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <ExemplairesForm content={content} onChange={onChange} />

            <EditorInput onChange={onChange} name="effet" value={content} />

        </FormBase>
    )
}


export default { name: "Habilité", classe: Habilite, form: Form, display: { default: Display } }