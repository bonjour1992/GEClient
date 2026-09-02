import { Text } from "../../../Component/Text";
import { stripTags } from "../../../Input/EditorInput";

export function Description({ content ,explication}) {
    return stripTags(content.description)!==""?(
        <Text style={{
            backgroundColor: "#bef7f0",
            margin: "2px 5px ",
            fontStyle: "italic",
            padding:2,
            borderRadius:6
        }} text={content.description} rule={explication}/>
    ):null
}
