
import { EditorInput } from "../../Input/EditorInput"
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { ContenuCarac,Contenu,ContenuForm } from "./Component/Contenu"
import { aggregation } from "../../lib/datatype"

const elementColor = "rgb(16, 93, 10)"

class Classe extends aggregation(ElementJDR, ContenuCarac) {

    capacite = ""
    background = ""

}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {



    return (
        <Card content={content} color={elementColor}>
            <Description content={content} />
            <Text text={"<span><b>Background:</b></span>" + content.background} />
            <Text text={"<span><b>Capacité:</b></span>" + content.capacite} />
            <Contenu content={content} explication={explication} />

        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EditorInput value={content} name="background" onChange={onChange} label="Background" />
            <EditorInput value={content} name="capacite" onChange={onChange} label="Capacité" />
            <ContenuForm content={content} onChange={onChange} types={["trait", "habilite", "passif", "action","domaine"]} />

        </FormElementJDR>
    )
}


export default { name: "Personnage", classe: Classe, form: Form, display: { default: Display, nom: Nom } }