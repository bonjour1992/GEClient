import { EditorInput } from "../../../Input/EditorInput";
import FormBase from "../../../Input/FormBase";
import { backgroundColor } from "../../Ti5/ti5";
import FreeTagInput from "../../../Input/FreeTagInput";
import { ImagePicker } from "../../../Input/ImagePicker";

export function FormElementJDR({ content, onChange, onSubmit, style, children }) {
    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <ImagePicker onChange={onChange} name="icone" value={content} label="Icone" />
            <EditorInput onChange={onChange} name="description" value={content} label="Description" />
            {children}
            <FreeTagInput onChange={onChange} name="tags" value={content} label="Mots clés" tagType={"tags"} />
        </FormBase>

    )
}