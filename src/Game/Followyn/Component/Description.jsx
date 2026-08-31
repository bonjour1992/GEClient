import { Text } from "../../../Component/Text";


export function Description({ content }) {
    return (
        <Text style={{
            fontSize: 12,
            backgroundColor: "#bef7f0",
            margin: "0px 5px ",
            fontStyle: "italic"
        }} text={content.description} />
    );
}
