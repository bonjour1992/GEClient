import { NavLink, Outlet } from "react-router";
import { games } from "../Game/games";


export default function Home()
{
    
    return (<>
    <div>Home</div>
{
    Object.keys(games).map((e,i)=>{
        return (<Games key={i} jeu={e} />)
    })
}
    </>)
}

function Games ({jeu})
{
return (<NavLink style={{display:"block"}} to={jeu} >{games[jeu].name} </NavLink>)
}