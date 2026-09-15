import { useLoaderData, useParams, useNavigate } from "react-router";
import { getHandler, SelecteurDisplayeur } from "../Game/games";
import { deleteElement } from "../lib/fetch";
import { Action } from "../Component/Action";

export default function Affichage() {
    let jeu = useParams().jeu
    let element = useLoaderData().element || { meta: null, content: null }
    let navigate = useNavigate();

    let Display = getHandler(jeu, element.meta.type).display.default

    function suppr() {
        let f = async () => {
            let res = await deleteElement(element.id)
            navigate("./..")
        }
        f()
    }

    return (<>
        <div>Affichage</div>
        <Action jeu={jeu} type={element.meta.type} id={element.id} />
        <SelecteurDisplayeur jeu={jeu} type={element.meta.type} content={element.content} />
        <p>{JSON.stringify(element)}</p>
    </>)
}