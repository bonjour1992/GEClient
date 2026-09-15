
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { aggregation } from "../../lib/datatype"
import { pub } from "../../lib/fetch"
import { FullEditorInput } from "../../Input/FullEditorInput"

const elementColor = "#000"



class Classe extends aggregation(ElementJDR) {
info=""

}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {

    return (
        <Card content={content} color={elementColor} >
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
                        width: content.icone ? "70%" : "100%"
                    }}
                >
                    <Text text={content.info} rule={explication}/>
                </div>
            </div>

        </Card>
    );
}


function Form({ content, onChange, onSubmit, style }) {



    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <FullEditorInput onChange={onChange} value={content} name="info" />
        </FormElementJDR>
    )
}


export default { name: "Lore", classe: Classe, form: Form, display: { default: Display, nom: Nom }, editor: "noSplit" }

