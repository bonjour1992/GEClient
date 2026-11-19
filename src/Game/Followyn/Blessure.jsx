
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
    2:"bras droit",
    3:"jambes",
    4:"torse",
    5:"tête",
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

// Localisations d'une blessure, en clair (« toute localisation » si le corps entier est possible).
function localisations(content) {
    const menbres = (content.menbres || []).map(String)
    if (["1", "2", "3", "4", "5"].every(m => menbres.includes(m))) return "toute localisation"
    return menbres.map(m => enumMenbres[m]).filter(Boolean).join(", ")
}

// Une ligne de table de blessure : nom, localisations, gravité.
function Ligne({ content, style = {} }) {
    const lieux = localisations(content)
    return (
        <span data-blessure-ligne style={{ fontFamily: "EB Garamond, sans-serif", fontWeight: 500, ...style }}>
            <span style={{ color: elementColor, fontWeight: 700 }}>{content.name}</span>
            <span style={{ color: "#555" }}>{lieux ? " — " + lieux : ""} · gravité {content.gravité}</span>
        </span>
    )
}

function Display({ content, explication, style }) {

    const lieux = localisations(content)

    return (
        <Card content={content} color={elementColor}>
            <Description content={content} explication={explication}/>

            <div data-blessure-infos style={{ fontFamily: "EB Garamond, sans-serif", fontWeight: 500, margin: "2px 0 4px" }}>
                {lieux && (<span><b>Localisation :</b> {lieux} · </span>)}
                <span><b>Gravité :</b> {content.gravité}</span>
                {content.intensite > 0 && (<span> · <b>Intensité :</b> {content.intensite}</span>)}
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


export default { name: "Blessure", classe: Classe, form: Form, display: { default: Display, nom: Nom, ligne: Ligne }, editor: "noSplit" }

