
import { NumberInput } from "../../Input/NumberInput"
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { BooleanInput } from "../../Input/BooleanInput"
import { Objectif, ObjectifCarac, ObjectifForm } from "./Component/Objectif"
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
            <Description content={content} explication={explication}/>

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
                    <Objectif content={content} explication={explication} />
                    <Effet content={content} explication={explication} />
                </div>
            </div>
            <TableResolution content={content}  explication={explication} />
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

