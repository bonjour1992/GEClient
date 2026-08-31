import { TableInput } from "../../../Input/TableInput";
import { EditorInput } from "../../../Input/EditorInput";
import { Text } from "../../../Component/Text";

export class PrerequisCarac{

        prerequis = []
    prerequisNum = 0
}

export function PrerequisForm({onChange,content})
{
    function prerequisLine(x) {
        return [(<EditorInput onChange={onChange} name={"prerequis"} value={content} index={x} type="compact" />)]
    }

    return (<>
                <TableInput onChange={onChange} Line={prerequisLine} name="prerequisNum" value={content} label="Prerequis" composant={["prerequis"]} />
    
    </>)
}


export function Prerequis({ content }) {
    const prerequis = content?.prerequis || [];
    const prerequisNum = content?.prerequisNum || 0;

    return (
        <div style={styles.container}>
            {prerequis.slice(0, prerequisNum).map((text, index) => (
                <div key={index} style={styles.bar}>
                    <div style={styles.icon}>
                        !
                    </div>

                    <Text
                        text={text}
                        style={styles.text}
                    />
                </div>
            ))}
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        width: "100%",
    },

    bar: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#fff3e0",
        borderLeft: "4px solid #f97316",
        borderRadius: "4px",
        padding: "2px 4px",

    },

    icon: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        backgroundColor: "#f97316",
        color: "white",
        fontWeight: "700",
        fontSize: "14px",
    },

    text: {
        flex: 1,
        color: "#7c2d12",
        fontSize: 12
    },
};

