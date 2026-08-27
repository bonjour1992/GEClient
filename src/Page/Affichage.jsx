import { Outlet, useLoaderData, Link, useParams, useNavigate } from "react-router";
import { getHandler, Displayeur, SelecteurDisplayeur } from "../Game/games";
import { Button } from "../Component/Button";
import { deleteElement } from "../lib/fetch";

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
        <Link to="./edit" >Editer </Link>
        <Link to="./duplicate" >Dupliquer </Link>
        <button onClick={suppr}>Supprimer</button>
        <SelecteurDisplayeur jeu={jeu} type={element.meta.type} content={element.content} />
        <p>{JSON.stringify(element)}</p>
    </>)
}