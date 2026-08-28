import { ElementContent, Link } from "../../lib/datatype.js";
import { TextInput } from "../../Input/TextInput.jsx";
import { turnNumber } from "./ti5.jsx";
import { ModalPickerInput } from "../../Input/ModalPickerInput";
import { ImagePicker } from "../../Input/ImagePicker.jsx";
import { ColorInput } from "../../Input/ColorInput.jsx";
import { TableInput } from "../../Input/TableInput";
import { EditorInput } from "../../Input/EditorInput.jsx";
import { Text } from "../../Component/Text.jsx";
import { Image } from "../../Component/Image.jsx";
import { imgURL } from "../../lib/styleUtils.js";
import { LoadAndDisplay } from "../../Component/LoadAndDisplay.jsx";
import FormBase from "../../Input/FormBase"
import { NumberInput } from "../../Input/NumberInput.jsx";
import { bottomBorder } from "../../Component/style.jsx";
import { demiA4Pa } from "../../Component/Size.jsx";

class FactionNeutre extends ElementContent {
    color = "#FFFFFF"
    units = new Array(3).fill(new Link("unit"))
    rules = new Array(4).fill(new Link("habilite"))
    ruleNum=0

}

function Display({ content, style, context, explication }) {
    let turn = Array.from(Array(turnNumber - 1)).map((e, i) => i + 2)


    return (<div
        style={{
            backgroundImage: imgURL("/ti/bg%20star.jpg"),
            ...demiA4Pa
        }}>
        <Text text={content.name} style={{ marginLeft: 20, fontSize: 50, fontWeight: 1000 ,color:content.color}} />

        <div style={{
            display: "grid",
            gridTemplate: "1fr 1fr / 1fr 1fr 1fr 400px ",
            height: 315,
            width: 1103,
            float: "left",
            paddingTop: 5,
            paddingLeft:8,
            gap :5
        }}
        >

            {Array.from((new FactionNeutre).rules.keys()).map((i) => {
                return content.rules &&
                    <LoadAndDisplay key={i} link={content.rules[i]} style={{ width: i===3?400:230, gridRow:i===3?" 1 / 3":1, height:i===3?315:155, visibility: content.rules[i].id === -1 ? "hidden" : "visible"  }} />
            })}

            {Array.from((new FactionNeutre).units.keys()).map((i) => {
                return content.units &&
                    <LoadAndDisplay key={i} link={content.units[i]} style={{ width: 230, visibility: content.units[i].id === -1 ? "hidden" : "visible" }} />
            })}
        </div>
    </div>)
}






function Form({ content, onChange, onSubmit, style }) {

    function ruleLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"rules"} value={content} index={x} type={["habilite"]} />)]
    }

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>


            <ColorInput onChange={onChange} name={"color"} value={content} />


            <h2>Unités</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                {Array.from((new FactionNeutre).units.keys()).map((i) => {
                    return (<div key={i} className="p-2" >
                        <ModalPickerInput onChange={onChange} name={"units"} value={content} index={i} type={["unit"]} />
                    </div>)
                })}

            </div>
            <h2>Rule</h2>
            <TableInput onChange={onChange} Line={ruleLine} max={(new FactionNeutre).rules.length} name="ruleNum" value={content} />

        </FormBase>
    )
}

//

export default { name: "Faction neutre", classe: FactionNeutre, form: Form, display: { default: Display,  }, print: "grid-cols-1" }