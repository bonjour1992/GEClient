import { Link, LinkToString } from "../lib/datatype";
import { ReactNode, useState } from "react";
import { Label } from "./inputUtils";
import { useSearch, getFromSearch, getFromType } from "../lib/store";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { Text } from "../Component/Text";
import { getHandler } from "../Game/games";
import { useParams } from "react-router";


export function ModalPickerInput({ onChange, name, value, label, type, index }) {
    
    const search = useSearch(state => state.search)

    const ModalId = "modal" + name + index
    const val = index !== undefined ? value[name][index] : value[name]
    const jeu = useParams().jeu
    let [selected, setSelected] = useState((val && val.__link && val?.id !== -1) ? val : new Link(type[0]))
    let options = getFromType(search, type)

    function close(e) {
        document.getElementById(ModalId).style.display = "none"
        //setSelected(val)
    }

    return (<div >
        {label && (<Label name={label} />)}
        <button onClick={(e) => {
            setSelected(val)
            document.getElementById(ModalId).style.display = "block"
        }}
        > <Text text={getFromSearch(search, val?.id||-1, { name: "Aucun" }).name} /> </button>

        <div id={ModalId} style={{
            display: "none",
            position: "fixed",
            backgroundColor: "#DDDDDD88",

            zIndex: 10,
            left: 0,
            top: 0,
            width: "100%",
            height: "100%"
        }}>
            <div style={{
                position: "relative",
                margin: "auto",
                top: 50,
                width: 400,
                height: 400,
                backgroundColor: "#FFF",
                borderColor: "#444",
                borderStyle: "solid",
                borderRadius: 12,
                borderWidth: 5,
            }}>
                <div >
                    <button onClick={close} style={{ float: "right" }} >Fermer</button>
                    <span style={{
                        fontSize: 20,
                        fontWeight: 700
                    }}>Selection de {type.map(e => getHandler(jeu, e).name)} </span>
                </div>
                <div className="w-full border-b-2 pt-1 pb-1">
                    <select id={"select" + name + index}
                        value={LinkToString(selected||new Link(type[0]))}
                        onChange={(e) => { setSelected((new Link).fromString(e.target.value)) }} >
                        <option key={-1} value={type[0] + "#-1"} >Aucun</option>
                        {
                            options.map((e, i) => {
                                return (<option key={i} value={(new Link(e.type, e.id)).toString()} >{e.name}</option>)
                            })}
                    </select>

                    <button onClick={
                        (e) => {
                            onChange(name, selected, index)
                            close(e)
                        }
                    }>Valider</button>
                </div>
                <div className=" m-2  w-140 h-72 rounded-lg  overflow-scroll ">
                    {<LoadAndDisplay link={(selected && selected.__link)?selected:new Link(type[0])} />}
                </div>
            </div>

        </div>
    </div>)
}