
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { aggregation } from "../../lib/datatype"
import { Contenu, ContenuCarac, ContenuForm } from "./Component/Contenu"


const elementColor = "rgb(177, 159, 0)"

class Classe extends aggregation(ElementJDR, ContenuCarac) {



}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {



    return (
        <Card content={content} color={elementColor} explication={explication}>
            <Description content={content} explication={explication} />
            <Contenu content={content} explication={explication} />
        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <ContenuForm content={content} onChange={onChange} types={[ "habilite"]} />
        </FormElementJDR>
    )
}


export default { name: "Domaines", classe: Classe, form: Form, display: { default: Display, nom: Nom } }