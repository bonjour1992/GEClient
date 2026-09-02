
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
import { pub } from "../../lib/fetch"
import { XP, XPCarac, XPForm } from "./Component/xp"

const elementColor = {
    occupation: "#34495e",
    occupationProlonge: "#34495e",
    reaction: "#843fa1",
    actionPA: "#B22",
    actionTempsReel: "Action en temps réel"
}


const actionType = {
    occupation: "Occupation",
    occupationProlonge: "Occupation prolongé",
    reaction: "Réaction",
    actionPA: "Action temps fin",
    actionTempsReel: "Action en temps réel"
}


class Classe extends aggregation(ElementJDR, JetCarac, PrerequisCarac, CoutCarac, ObjectifCarac, TableResolutionCarac, XPCarac) {
    actionType = "actionPA"
    parametre = ""


}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor[content.actionType] }} />
    )
}

function Display({ content, explication, style }) {

    return (
        <Card content={content} color={elementColor[content.actionType]} explication={explication} >
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: 8
            }} >
                <XP content={content} />
                <Prerequis content={content} />
                <Description content={content} explication={explication} />
            </div>
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
                        width: content.icone ? "70%" : "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                    }}
                >
                    <Cout content={content} explication={explication} />

                    {content.parametre &&
                        stripTags(content.parametre) !== "" &&
                        <Text
                            text={
                                "<span><b>Paramétre de l'action:</b></span>" +
                                content.parametre
                            }
                        />
                    }

                    <Objectif content={content} />
                    <Jet content={content} />
                    <TableResolution content={content} monoLigne={true} />

                </div>
            </div>
            <div style={{ marginTop: 8 }}>
                <TableResolution content={content} monoLigne={false} />
            </div>
        </Card>
    );
}


function Form({ content, onChange, onSubmit, style }) {



    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EnumInput value={content} name="actionType" onChange={onChange} label="Type d'action" enumClass={actionType} />
            <XPForm content={content} onChange={onChange} />
            <PrerequisForm content={content} onChange={onChange} />
            <CoutForm content={content} onChange={onChange} />
            <EditorInput value={content} name="parametre" onChange={onChange} label="Parametre de l'action" />
            <ObjectifForm content={content} onChange={onChange} />
            <FormJet content={content} onChange={onChange} />
            <TableResolutionForm content={content} onChange={onChange} />
        </FormElementJDR>
    )
}


export default { name: "Action", classe: Classe, form: Form, display: { default: Display, nom: Nom }, editor: "noSplit" }

