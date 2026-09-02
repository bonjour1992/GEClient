import { Navigate, Outlet, useLoaderData, useNavigate, useParams } from "react-router";
import { getHandler, Displayeur, SelecteurDisplayeur } from "../Game/games";
import { useState } from "react";
import { updateElement,createElement } from "../lib/fetch";

export default function Editor({ elem, creer =false}) {
    let [element, setElement] = useState(elem || { meta: null, content: null })
    let navigate = useNavigate();
    let jeu = useParams().jeu


   

function handleInputChange(name, value, index) {
    setElement(prevElement => {
        if (index !== undefined) {
            const table = [...prevElement.content[name]];
            table[index] = value;

            return {
                ...prevElement,
                content: {
                    ...prevElement.content,
                    [name]: table
                }
            };
        }

        return {
            ...prevElement,
            content: {
                ...prevElement.content,
                [name]: value
            }
        };
    });
}


    function save(e) {
        let f = async () => {
            if (creer) {
                let res = await createElement(element)
                navigate("../" + element.meta.type + "/" + res.id)
            }
            else {
                let res = await updateElement(element.id, element)
                navigate("./..")
            }
        }
        f()
        e.preventDefault()
    }


    let Form = getHandler(jeu, element.meta.type).form
let split = getHandler(jeu, element.meta.type).editor!=="noSplit"?  { width: "49%",paddingRight:"1%", float: "left" }:{}
    return (<>
        <div>Edition</div>
        <div style={{maxWidth:1600,...split}}>
            <Form content={element.content} onChange={handleInputChange} onSubmit={save} />
        </div>
        <div style={split}>
            <SelecteurDisplayeur jeu={jeu} type={element.meta.type} content={element.content} />

        </div >
        <p style={{ clear: "both" }}>{JSON.stringify(element)}</p>
    </>)
}
