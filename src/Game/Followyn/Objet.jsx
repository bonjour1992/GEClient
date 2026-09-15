
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { aggregation } from "../../lib/datatype"
import { Contenu, ContenuCarac, ContenuForm } from "./Component/Contenu"
import { MarchandiseCarac, MarchandiseForm, Marchandise } from "./Component/Marchandise"


const elementColor = "rgb(16, 93, 10)"

class Classe extends aggregation(ElementJDR, ContenuCarac,MarchandiseCarac) {



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
            <Marchandise content={content} explication={explication} />
            <Contenu content={content} explication={explication} />
        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <MarchandiseForm content={content} onChange={onChange} />
            <ContenuForm content={content} onChange={onChange} types={[ "habilite","action","passif"]} />
        </FormElementJDR>
    )
}


export default { name: "Objet", classe: Classe, form: Form, display: { default: Display, nom: Nom } }