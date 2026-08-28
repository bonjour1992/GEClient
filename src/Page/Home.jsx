import { NavLink, Outlet } from "react-router";
import { games } from "../Game/games";
import { pub } from "../lib/fetch";


export default function Home() {
    return (
        <>
            <div>Home</div>

            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                padding: 20
            }}>
                {Object.keys(games).map((e, i) => (
                    <Games
                        key={i}
                        jeu={e}
                    />
                ))}
            </div>
        </>
    );
}



function Games({ jeu }) {
    const game = games[jeu];

    return (
        <NavLink
            to={jeu}
            style={{
                display: "flex",
                flexDirection: "column",
                width: 300,
                border: "1px solid #ccc",
                borderRadius: 10,
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "#fff"
            }}
        >
            <div style={{
                width: "100%",
                height: 180,
                backgroundColor: "#e8dcc8"
            }}>
                {game.pict && (
                    <img
                        src={pub + game.pict}
                        alt={game.name}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block"
                        }}
                    />
                )}
            </div>

            <div style={{
                padding: 12,
                textAlign: "center",
                fontSize: 18,
                fontWeight: 600
            }}>
                {game.name}
            </div>
        </NavLink>
    );
}

