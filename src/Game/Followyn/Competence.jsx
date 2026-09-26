
import { EditorInput } from "../../Input/EditorInput"
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"

const elementColor = "rgb(17, 51, 114)"

class Classe extends ElementJDR {

maitrise=""
puissance=""

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
            <Text text={"<span><b>Maitrise:</b></span>"+content.maitrise} />
            <Text text={"<span><b>Puissance:</b></span>"+content.puissance} />
        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {

    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
<EditorInput value={content} name="maitrise" onChange={onChange} label="Maitrise" />
<EditorInput value={content} name="puissance" onChange={onChange} label="Puissance" />

        </FormElementJDR>
    )
}


export default { name: "Compétence", classe: Classe, form: Form, display: { default: Display, nom: Nom } }