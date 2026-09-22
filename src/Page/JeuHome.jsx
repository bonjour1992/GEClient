import { NavLink, useLoaderData, useParams } from "react-router";
import { games } from "../Game/games";

export default function JeuHome() {

    const jeu = games[useParams().jeu];
    const stat = useLoaderData();

    return (
        <>
            <div>{jeu.name}</div>

            <NavLink to="./remp">
                Macro de remplacement
            </NavLink>


            {/* ==================================================
                ELEMENTS
               ================================================== */}

            <h2>Elements</h2>

            {
                Object.keys(jeu.handlers).map((e, i) => {
                    return (
                        <Elem
                            key={i}
                            elem={e}
                            quantity={stat[e]}
                            jeu={jeu}
                        />
                    )
                })
            }


            {/* ==================================================
                OUTILS
               ================================================== */}

            <h3>Outils</h3>

            {
                Object.keys(jeu.tools || {}).map((tool, i) => (
                    <Tool
                        key={i}
                        tool={tool}
                        jeu={jeu}
                    />
                ))
            }
        </>
    );
}


function Tool({ tool, jeu }) {

    return (
        <p>
            <NavLink to={"./tools/" + tool}>
                {jeu.tools[tool].name}
            </NavLink>
        </p>
    );
}


function Elem({ elem, quantity, jeu }) {

    return (
        <p>
            <NavLink to={"./" + elem}>
                {jeu.handlers[elem].name}
            </NavLink>
            ({quantity})
        </p>
    );
}
