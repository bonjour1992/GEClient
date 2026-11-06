
import { Text } from "../../Component/Text"
import { ElementJDR } from "./FollowynDatatype"
import { FormElementJDR } from "./Component/FormElementJDR"
import { Card } from "./Component/Card"
import { Description } from "./Component/Description"
import { aggregation } from "../../lib/datatype"
import { TableResolution, TableResolutionCarac, TableResolutionForm } from "./Component/TableResolution"
import { pub } from "../../lib/fetch"
import { Effet, EffetCarac, EffetForm } from "./Component/effet"
import { FormJet, Jet, JetCarac } from "./Component/Jet"
import { NumberInput } from "../../Input/NumberInput"
import { TagInput } from "../../Input/TagInput"
const elementColor = "#64366a"

const enumMenbres ={
    1:"bras gauche",
    2:"bras doit",
    3:"jambes",
    4:"torse",
    5:"tete",
    6:"nécrotique"
}
class Classe extends aggregation(ElementJDR,JetCarac, TableResolutionCarac, EffetCarac) {
 menbres=[]
intensite=2
gravité=1
}

function Nom({ content, explication, style = {} }) {
    return (
        <Text text={content.name} style={{ ...style, color: elementColor }} />
    )
}

function Display({ content, explication, style }) {

    return (
        <Card content={content} color={elementColor}>
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
                    <Effet content={content} explication={explication} />
                    <Jet  content={content} explication={explication} />
                </div>
            </div>
            <TableResolution content={content}  explication={explication} />
        </Card>
    );
}


function Form({ content, onChange, onSubmit, style }) {



    return (
        <FormElementJDR content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <TagInput onChange={onChange} name="menbres" value={content} tagClass={enumMenbres} label="Localisations Possibles"/>
            <br />
            <NumberInput onChange={onChange} name="gravité" value={content} min={0} label="Gravité"/>

<NumberInput onChange={onChange} name="intensite" value={content} min={0} label="Intensité"/>
            <EffetForm content={content} onChange={onChange} />
            <FormJet content={content} onChange={onChange} />
            <TableResolutionForm content={content} onChange={onChange} />
        </FormElementJDR>
    )
}


export default { name: "Blessure", classe: Classe, form: Form, display: { default: Display, nom: Nom }, editor: "noSplit" }

