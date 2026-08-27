import { NavLink, useLoaderData, useParams } from "react-router";
import { games, getHandler } from "../Game/games";

export default function JeuHome() {
    const jeu = games[useParams().jeu]
    const stat = useLoaderData()
    return (<>
        <div>{jeu.name}</div>
        <NavLink to="./remp">Macro de remplacement</NavLink>
        {
            Object.keys(jeu.handlers).map((e, i) => {
                return (<Elem key={i} elem={e} quantity={stat[e]} jeu={jeu}/>)
            })
        }
    </>)
}

function Elem({ elem, quantity ,jeu}) {
    return (<p><NavLink to={"./" + elem}>{jeu.handlers[elem].name}</NavLink>({quantity})</p>)
}