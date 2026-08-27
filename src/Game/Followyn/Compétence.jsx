
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput } from "../../Input/EditorInput"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
import FormBase from "../../Input/FormBase"
import { ElementJDR } from "./FollowynDatatype"
import { Description, FormElementJDR,Card } from "./FollowynComponent"

const elementColor = "rgb(16, 93, 10)"

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
        <Card nom={content.name} color={elementColor}>
            <Description content={content} />
            <Text text={content.maitrise} />
            <Text text={content.puissance} />
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