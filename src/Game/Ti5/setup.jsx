import { ElementContent, Link } from "../../lib/datatype"
import { EnumInput } from "../../Input/EnumInput"
import { TagInput } from "../../Input/TagInput"
import { NumberInput } from "../../Input/NumberInput"
import { BooleanInput } from "../../Input/BooleanInput"
import { ImagePicker } from "../../Input/ImagePicker.jsx"
import { ModalPickerInput } from "../../Input/ModalPickerInput"
import { EditorInput } from "../../Input/EditorInput"
import { techType, techIcon, planeteIcon } from "./ti5"
import { Text } from "../../Component/Text"
import FormBase from "../../Input/FormBase"
import { SmallPo } from "../../Component/Size"
import { pub } from "../../lib/fetch"
import { LoadAndDisplay } from "../../Component/LoadAndDisplay"
import { FontSize } from "@tiptap/extension-text-style"



class Classe extends ElementContent {
    pict = "/404.jpeg"
    player = 6
}

//TODO: native unit color for type of planet

export default { name: "Plateau", classe: Classe, form: Form, display: { default: Display }, print: "grid-cols-6" }


function Display({ content }) {


    console.log("url(" + pub + content.pict + ")")
    return ( <div style={{
        width: 300,
        height: 330,

    }}>
        <Text text={content.name} style={{fontSize:24}}/>
<img src={  pub + content.pict} style={{
        maxWidth: 300,
        maxHeight: 300,
        width: "auto",
        height: "auto"
    }}/>

    </div>)
}

function Form({ content, onChange, onSubmit, style }) {

    if (!content.homePlanet) content.homePlanet = new Link("faction")

    return (
        <>
            <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
                <NumberInput onChange={onChange} name="playeur" value={content} min={0} max={9} label="Nombre de joueur" />

                <ImagePicker onChange={onChange} name="pict" value={content} label="Format" />

            </FormBase>
        </>
    )
}
