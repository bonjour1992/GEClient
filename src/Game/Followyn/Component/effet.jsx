import { EditorInput } from "../../../Input/EditorInput"
import { Text } from "../../../Component/Text"
import { stripTags } from "../../../Input/EditorInput"
export class EffetCarac {
    effet = ""
}

export function Effet({ content }) {
    return stripTags(content.effet)!==""?(<div>
        <p style={{ fontWeight: 700 }}>Effet:</p>
        <Text text={content.effet} />
    </div>):null
}


export function EffetForm({ content, onChange }) {

    return (
        <EditorInput value={content} name="effet" onChange={onChange} label="Effet" />
    )
}