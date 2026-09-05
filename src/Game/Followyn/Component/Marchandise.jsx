import { NumberInput } from "../../../Input/NumberInput"

export class MarchandiseCarac {
    encombrement
    prix
    lot=1

}

export function MarchandiseForm({ onChange, content }) {
    return (
        <>
            <NumberInput onChange={onChange} value={content} name={"encombrement"} label="Encombrement" />
            <NumberInput onChange={onChange} value={content} name={"prix"} label="Prix" />
            <NumberInput onChange={onChange} value={content} name={"lot"} label="En lot de" />

        </>
    )
}

export function Marchandise({content,explication,style={}}){

    return (
        <>
        <span>{content.lot>1?"Un lot de "+content.lot+" ":""} Cout: {content.prix} écu. Encombrement: {content.encombrement}</span>
        </>
    )
}