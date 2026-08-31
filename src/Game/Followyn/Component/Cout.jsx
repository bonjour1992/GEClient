import { LoadLink } from "../../../Component/LoadAndDisplay";
import { Text } from "../../../Component/Text";
import { stripTags } from "../../../Input/EditorInput";
import { Link } from "../../../lib/datatype";
import { TableInput } from "../../../Input/TableInput";
import { NumberInput } from "../../../Input/NumberInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { BooleanInput } from "../../../Input/BooleanInput";
import { EditorInput } from "../../../Input/EditorInput";


export class CoutCarac{
        couts = []
    coutsAttribut = []
    coutsNum = []
    coutsGain = []
    coutNum = 0
}


export function CoutForm({content,onChange})
{

    function coutLine(x) {
        return [
            (<NumberInput onChange={onChange} name={"coutsNum"} value={content} index={x} label="Quantité" />),
            (<BooleanInput onChange={onChange} name={"coutsGain"} value={content} index={x} label="gain?" />),
            (<ModalPickerInput onChange={onChange} name={"coutsAttribut"} value={content} index={x} type={["attribut"]} label="Att" />),
            (<EditorInput onChange={onChange} name={"couts"} value={content} index={x} type="compact" label="ou " />)
        ]
    }
    return (<>
                <TableInput onChange={onChange} Line={coutLine} name="coutNum" value={content} label="Cout"
                composant={["coutsNum", "coutsGain", "coutsAttribut", "couts"]} />
    </>)
}

export const Cout = ({ content }) => {
    const {
        couts = [], coutsAttribut = [], coutsNum = [], coutsGain = [], coutNum = 0,
    } = content || {};

    const separateur = ((elements) => elements.flatMap((element, index) => {
        const length = elements.length;

        if (length === 1 || index === 0) {
            return [element];
        }

        if (length === 2 || index === length - 1) {
            return [(<span>{"\u00A0"}et{"\u00A0"}</span>), element];
        }

        return [(<span>,{"\u00A0"}</span>), element];
    }));

    const renderElement = (index) => {
        const cout = couts[index];
        const coutAttribut = coutsAttribut[index];
        const coutNumValue = coutsNum[index];

        return (
            <span
                key={index}
                style={{
                    display: "inline-flex"
                }}
            >
                <span>{coutNumValue}{"\u00A0"}</span>

                {stripTags(cout) ? (
                    <Text text={cout} style={{ display: "inline" }} />
                ) : (
                    <LoadLink link={coutAttribut || new Link("attribut")} />
                )}
            </span>
        );
    };

    let coutElements = [];
    let gainElements = [];

    for (let i = 0; i < coutNum; i++) {
        if (coutsGain[i] === true) {
            gainElements.push(renderElement(i));
        } else {
            coutElements.push(renderElement(i));
        }
    }

    coutElements = separateur(coutElements);
    gainElements = separateur(gainElements);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
            }}
        >
            {/* Ligne des coûts */}
            {coutElements.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                        Cout:
                    </span>

                    {coutElements}
                </div>
            )}

            {/* Ligne des gains */}
            {gainElements.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                        Gagnez:
                    </span>

                    {gainElements}
                </div>
            )}
        </div>
    );
};
