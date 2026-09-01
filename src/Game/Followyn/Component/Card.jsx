import { A6l } from "../../../Component/Size";
import { fullBorder } from "../../../Component/style";
import { Text } from "../../../Component/Text";
import { Tags } from "./Tags";

export function Card({ content, color, children ,style}) {
    return (<div
        style={{
            borderColor: color,
            ...fullBorder,
            borderRadius: 12,
            width: A6l,
            minHeight: 65,
            position:"relative",
            paddingBottom:18,
            ...style
        }}>
        <Text style={{
            color: "white",
            backgroundColor: color,
            paddingLeft: 4,
            paddingBottom: 4,
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "left"
        }} text={content.name} />
        <div style={{margin:4}}>
        {children}
        </div>
        <Tags content={content} />
    </div>);
}
