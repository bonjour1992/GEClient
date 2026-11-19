import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { aggregation } from "../../lib/datatype"
import { Palier, PalierCarac, PalierForm } from "./Component/Palier"

const elementColor = "rgb(118, 57, 8)"

class Classe extends aggregation(ElementJDR, PalierCarac) {



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
            <Palier content={content} explication={explication} />
        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <PalierForm content={content} onChange={onChange} />

        </FormElementJDR>
    )
}


export default { name: "Attribut", classe: Classe, form: Form, display: { default: Display, nom: Nom } }
