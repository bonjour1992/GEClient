import { NumberInput } from "../../../Input/NumberInput"


export class XPCarac{
    xp=0
}

export function XP({ content }) {
    return content.xp?(<div style={{
        position: "absolute", top: 0, right: 4,
        fontSize: 16,
        fontWeight: 700,
        color: "white"
    }}>
        {content.xp}
    </div>):null
}


export function XPForm({content,onChange}){

    return (
        <NumberInput value={content} name="xp" onChange={onChange} label="Cout(xp)" />
    )
}