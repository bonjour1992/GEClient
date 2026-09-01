import { Outlet, useLoaderData, useParams, Link, NavLink } from "react-router";
import { getHandler } from "../Game/games";
import { Action } from "../Component/Action";

export default function Liste() {

    return (<>
        <div>Liste</div>
        <NavLink to={"./new"}>Créer nouveau</NavLink>
        <br />
        <NavLink to={"./print"}>Page impression</NavLink>

        <div style={{
            display: "flex",
            flexWrap: "wrap"
        }}>
            {useLoaderData().element.map((e, i) =>
                <Displayeur key={i} elem={e} />
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