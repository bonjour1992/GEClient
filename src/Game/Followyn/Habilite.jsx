
import { divider } from "../../lib/styleUtils"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { TextInput } from "../../Input/TextInput"
import { NumberInput } from "../../Input/NumberInput"
import { EditorInput, stripTags } from "../../Input/EditorInput"
import { bottomBorder, fullBorder } from "../../Component/style"
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
import { pub } from "../../lib/fetch"
import { XP, XPCarac, XPForm } from "./Component/xp"
import { Effet, EffetCarac, EffetForm } from "./Component/effet"

const elementColor = "#ab4500"

class Classe extends aggregation(ElementJDR, ObjectifCarac, TableResolutionCarac, XPCarac, EffetCarac) {
    puissanceMin = 0
    puissancePlus

}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {

    return (
        <Card content={content} color={elementColor}>
            <XP content={content} />
            <Description content={content} />

            <div
                style={{
                    display: "flex",
                    width: "100%",
                    gap: 10
                }}
            >
                {content.icone && (
                    <div
                        style={{
                            width: "30%",
                            flexShrink: 0
                        }}
                    >
                        <img
                            src={pub + content.icone}
                            style={{
                                width: "100%",
                                height: "auto",
                                objectFit: "contain"
                            }}
                        />
                    </div>
                )}

                <div
                    style={{
                        width: content.icone ? "70%" : "100%"
                    }}
                >
                    <Objectif content={content} />
                    <Effet content={content} />
                </div>
            </div>
            <TableResolution content={content} />
        </Card>
    );
}


function Form({ content, onChange, onSubmit, style }) {



    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <XPForm content={content} onChange={onChange} />
            <NumberInput value={content} name="puissanceMin" onChange={onChange} label="Puissance Min" />
            <BooleanInput value={content} name="puissancePlus" onChange={onChange} label="+?" />
            <ObjectifForm content={content} onChange={onChange} />
            <EffetForm content={content} onChange={onChange} />
            <TableResolutionForm content={content} onChange={onChange} />
        </FormElementJDR>
    )
}


export default { name: "Habilité", classe: Classe, form: Form, display: { default: Display, nom: Nom }, editor: "noSplit" }

