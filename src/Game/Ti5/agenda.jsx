import { ElementContent } from "../../lib/datatype"
import { EnumInput } from "../../Input/EnumInput"
import { EditorInput } from "../../Input/EditorInput"
import { backgroundColor } from "./ti5"
import { bottomBorder } from "../../Component/style"
import { fullBorder } from "../../Component/style"
import { Text } from "../../Component/Text"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"


const bColor="#040164"

const typeLoi= {
    loi: "Loi",
    dir: "Directive",
    mand: "Mandat",
    trai: "Traité"
}

class Classe extends ElementContent {
    usage = ""
    type = "loi"
}

function Display({ content, style, explication }) {


    return (


        <div
            style={{
                ...SmallPo,
                ...style,
                color: "white",
                borderColor:bColor,
                ...backgroundColor,
                ...fullBorder

            }}>
            <Text style={{
                borderColor: bColor,
                ...bottomBorder(4),
                paddingLeft: 4,
                paddingRight: 4,
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center"
            }} text={content.name} />
            <Text style={{
                fontSize: 10,
                paddingLeft: 2,
                fontWeight: "bold",
                width: "100%",
                ...bottomBorder(2),
                 borderColor: bColor,
                 textAlign: "center"
            }}
                text={typeLoi[content.type]} />
            <Text style={{ fontSize: 10, paddingLeft: 2, paddingBottom: 2 }} text={content.usage} rule={explication} />

        </div>

    )
}

function Form({ content, onChange, onSubmit,style}) {

    return (
        <>
            <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
                <EnumInput onChange={onChange} name="type" value={content} enumClass={typeLoi} />
                <EditorInput onChange={onChange} name="usage" value={content} />

            </FormBase>
        </>
    )
}


export default { name: "Agenda", classe: Classe, form: Form, display: {default:Display}, print: "grid-cols-6" }