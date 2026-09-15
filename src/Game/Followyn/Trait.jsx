
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { Comp, CompCarac, CompForm } from "./Component/Comp"
import { Prerequis, PrerequisCarac, PrerequisForm } from "./Component/Prerequis"
import { aggregation } from "../../lib/datatype"
import { Contenu, ContenuCarac, ContenuForm } from "./Component/Contenu"


const elementColor = "rgb(16, 93, 10)"

class Classe extends aggregation(ElementJDR, CompCarac, PrerequisCarac, ContenuCarac) {



}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {



    return (
        <Card content={content} color={elementColor} explication={explication}>
            <Prerequis content={content} explication={explication} />
            <Description content={content} explication={explication} />
            <Comp content={content} explication={explication} />
            <Contenu content={content} explication={explication} />
        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <PrerequisForm content={content} onChange={onChange} />
            <CompForm content={content} onChange={onChange} />
            <ContenuForm content={content} onChange={onChange} types={["trait", "habilite", "passif", "action","domaine"]} />
        </FormElementJDR>
    )
}


export default { name: "Traits", classe: Classe, form: Form, display: { default: Display, nom: Nom } }