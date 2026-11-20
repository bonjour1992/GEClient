import { useLoaderData, useParams, NavLink, useSearchParams } from "react-router";
import { getHandler } from "../Game/games";
import { Action } from "../Component/Action";
import { Filtres, filtrer } from "../Component/Filtres";

export default function Liste() {

    // Filtres : paramètres donnés par l'export « filter » du type d'élément
    // (Component/Filtres.jsx), choix gardés dans l'adresse de la page
    const { jeu, elem } = useParams()
    const handler = getHandler(jeu, elem)
    const elements = useLoaderData().element
    const [params] = useSearchParams()

    return (<>
        <div>Liste</div>
        <NavLink to={"./new"}>Créer nouveau</NavLink>
        <br />
        <NavLink to={"./print"}>Page impression</NavLink>

        <Filtres handler={handler} elements={elements} />

        <div style={{
            display: "flex",
            flexWrap: "wrap"
        }}>
            {filtrer(elements, handler, params).map((e) =>
                <Displayeur key={e.id} elem={e} />
            )}
        </div>
    </>)
}
function Displayeur({ elem }) {
    let Display = getHandler(useParams().jeu, useParams().elem).display.default
    return (
        <div style={{ float: "left", margin: 2 }}>
            <Action id={elem.id} jeu={useParams().jeu}  type={useParams().elem}/>
            <Display content={elem.content} />

        </div>
    )
}
