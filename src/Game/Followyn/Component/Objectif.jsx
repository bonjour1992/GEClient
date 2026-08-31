import { Text } from "../../../Component/Text";
import { stripTags } from "../../../Input/EditorInput";
import { NumberInput } from "../../../Input/NumberInput";
import { EditorInput } from "../../../Input/EditorInput";


export class ObjectifCarac{

    cibleType
    cibleDist
    cibleLibre
}

export function ObjectifForm({content, onChange})
{
              return ( <table style={{
                width: "100%"
            }}>
                <thead>
                    <tr>
                        <th >Ciblage precis </th>
                        <th > ou autre information de ciblage </th>
                    </tr>
                </thead>
                <tbody style={{
                    width: "100%"
                }}>
                    <tr><td >
                        <NumberInput onChange={onChange} name="cibleDist" value={content} label="Distance" />
                        <EditorInput onChange={onChange} name="cibleType" value={content} label="Type de cible" type="compact" />
                    </td>
                        <td>
                            <EditorInput onChange={onChange} name="cibleLibre" value={content} label="ciblage" />

                        </td>
                    </tr>
                </tbody>
            </table>)}

export function Objectif({ content }) {
    const {
        cibleType, cibleDist, cibleLibre
    } = content || {};

    const hasType = cibleType !== undefined && cibleType !== null && stripTags(cibleType) !== "";
    const hasDist = cibleDist !== undefined && cibleDist !== null;
    const hasLibre = cibleLibre !== undefined && cibleLibre !== null && stripTags(cibleLibre) !== "";

    // Aucun contenu à afficher
    if (!hasType && !hasDist && !hasLibre) {
        return null;
    }

    return (
        <div style={styles.container}>

            <Cible />

            <div style={styles.content}>

                {hasLibre ? (
                    <Text
                        text={cibleLibre}
                        style={styles.text} />
                ) : hasDist && !hasType ? (
                    <Text
                        text={`${cibleDist} m`}
                        style={styles.text} />
                ) : hasType ? (
                    <Text
                        text={`${stripTags(cibleType)}${hasDist ? cibleDist === 0 ? ' au contact' : ` à ${cibleDist} m` : ""}`}
                        style={styles.text} />
                ) : null}

            </div>

        </div>
    );
}
const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },

    content: {
        flex: 1,
    },

    text: {
        color: "#333",
    },
};

function Cible() {
    return (<svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2" />
        <circle
            cx="12"
            cy="12"
            r="5"
            stroke="currentColor"
            strokeWidth="2" />
        <circle
            cx="12"
            cy="12"
            r="1.5"
            fill="currentColor" />
    </svg>
    );
}

