
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { Prerequis, PrerequisCarac, PrerequisForm } from "./Component/Prerequis"
import { aggregation } from "../../lib/datatype"
import { pub } from "../../lib/fetch"
import { XP, XPCarac, XPForm } from "./Component/xp"
import { Effet, EffetCarac, EffetForm } from "./Component/effet"

const elementColor = "#0B0"



class Classe extends aggregation(ElementJDR, PrerequisCarac, XPCarac, EffetCarac) {


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
            <Prerequis content={content} />
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
                    <Effet content={content} explication={explication}/>
                </div>
            </div>

        </Card>
    );
}


function Form({ content, onChange, onSubmit, style }) {



    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <XPForm content={content} onChange={onChange} />
            <PrerequisForm content={content} onChange={onChange} />
            <EffetForm content={content} onChange={onChange} />
        </FormElementJDR>
    )
}


export default { name: "Passif", classe: Classe, form: Form, display: { default: Display, nom: Nom }, editor: "noSplit" }

