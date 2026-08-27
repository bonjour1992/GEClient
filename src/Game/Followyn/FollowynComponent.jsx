import { A6l } from "../../Component/Size";
import { Text } from "../../Component/Text";
import { EditorInput } from "../../Input/EditorInput";
import FormBase from "../../Input/FormBase";
import { fullBorder } from "../../Component/style";
import { backgroundColor } from "../Ti5/ti5";
import FreeTagInput from "../../Input/FreeTagInput";

export function Card({ nom, color, children }) {
    return (<div
        style={{

            borderColor: color,
            ...fullBorder,
            borderRadius: 12,
            width: A6l,
            minHeight: 65
        }}>
        <Text style={{
            color: "white",
            backgroundColor: color,
            paddingLeft: 4,
            paddingBottom: 4,
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "left"
        }} text={nom} />
        {children}
    </div>)
}

export function Description({ content }) {
    return (
        <Text style={{
            fontSize: 12,
            backgroundColor: "#bef7f0",
            margin: "0px 5px ",
            fontStyle: "italic"
        }} text={content.description} />
    )
}

export function FormElementJDR({ content, onChange, onSubmit, style, children }) {
    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EditorInput onChange={onChange} name="description" value={content} label="Descrition" />
            {children}
            <FreeTagInput onChange={onChange} name="tags"  value={content} label="Mots clés" />
        </FormBase>

    )
}