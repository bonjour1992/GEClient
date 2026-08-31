
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput, stripTags } from "../../Input/EditorInput"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text, Explication } from "../../Component/Text"
import ReactDOMServer from "react-dom/server"
import FormBase from "../../Input/FormBase"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { TableInput } from "../../Input/TableInput"
import { Prerequis, PrerequisCarac, PrerequisForm } from "./Component/Prerequis"
import { BooleanInput } from "../../Input/BooleanInput"
import { Cout, CoutCarac, CoutForm } from "./Component/Cout"
import { Objectif, ObjectifCarac, ObjectifForm } from "./Component/Objectif"
import { FormJet, Jet, JetCarac } from "./Component/Jet"
import { aggregation } from "../../lib/datatype"
import { TableResolution, TableResolutionCarac, TableResolutionForm } from "./Component/TableResolution"
const elementColor = "#F00"

class Classe extends aggregation(ElementJDR, JetCarac, PrerequisCarac, CoutCarac, ObjectifCarac, TableResolutionCarac) {

    parametre = ""



    avantage = 0

}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {



    return (
        <Card content={content} color={elementColor}>
            <Prerequis content={content} />
            <Cout content={content} />
            {content.parametre && stripTags(content.parametre) !== "" &&
                <Text text={"<span><b>Paramétre de l'action:</b></span>" + content.parametre} />}
            <Description content={content} />
            <Objectif content={content} />
            <Jet content={content} />
            <TableResolution content={content} />
        </Card>

    )
}

function Form({ content, onChange, onSubmit, style }) {



    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <PrerequisForm content={content} onChange={onChange} />
            <CoutForm content={content} onChange={onChange} />
            <EditorInput value={content} name="parametre" onChange={onChange} label="Parametre de l'action" />
            <ObjectifForm content={content} onChange={onChange} />
            <FormJet content={content} onChange={onChange} />
            <TableResolutionForm content={content} onChange={onChange} />
        </FormElementJDR>
    )
}


export default { name: "Action", classe: Classe, form: Form, display: { default: Display, nom: Nom },editor:"noSplit" }

