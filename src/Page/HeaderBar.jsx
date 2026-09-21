import { NavLink, Outlet, useLocation } from "react-router";
import { games } from "../Game/games";
import { useSearch, useUser } from "../lib/store";
import * as fAPI from "../lib/fetch.js";

export default function HeaderBar() {
    const loc = useLocation()

    return (
        <>
            <Location location={loc} />
            <User />
            <div
                className="no-print"
                style={{ height: 40 }}
            ></div>
            <Outlet />
        </>
    )
}

const page = {
    remp: "Remplacement",
    edit: "Edition"
}

function Location({ location }) {

    const fil = [["Acceuil", "/GE/"]];
    const search = useSearch((state) => state.search);
    const part = location.pathname.split("/");

    /*
     * Pages générales
     */
    if (part[2] === "library") {

        fil.push([
            "Librairie d'image",
            "/GE/library"
        ]);

        return (
            <LocationBar fil={fil} />
        );
    }

    if (part[2] === "admin") {

        fil.push([
            "Administration",
            "/GE/admin"
        ]);

        return (
            <LocationBar fil={fil} />
        );
    }


    /*
     * Pages d'un jeu
     */
    if (part[2]) {

        const jeu = games[part[2]];

        if (!jeu) {
            return (
                <LocationBar fil={fil} />
            );
        }

        fil.push([
            jeu.name,
            "/GE/" + part[2]
        ]);


        /*
         * Type / handler
         */
        if (part[3] === "remp") {

            fil.push([
                "Remplacement",
                ""
            ]);

        }
        else if (part[3]) {

            const handler =
                jeu.handlers[part[3]];

            if (handler) {

                fil.push([
                    handler.name,
                    "/GE/" +
                    part[2] +
                    "/" +
                    part[3]
                ]);
            }
        }


        /*
         * Element
         */
        if (part[4] === "new") {

            fil.push([
                "Nouveau",
                ""
            ]);

        }
        else if (part[4] === "print") {

            fil.push([
                "Impression",
                ""
            ]);

        }
        else if (part[4]) {

            const r = search.find(
                e => e.id == part[4]
            );

            fil.push([
                r ? r.name : "erreur",
                "/GE/" +
                part[2] +
                "/" +
                part[3] +
                "/" +
                part[4]
            ]);
        }


        /*
         * Edition
         */
        if (part[5] === "edit") {

            fil.push([
                "Edit",
                "/GE/" +
                part[2] +
                "/" +
                part[3] +
                "/" +
                part[4] +
                "/edit"
            ]);
        }
    }


    return (
        <LocationBar fil={fil} />
    );
}
function LocationBar({ fil }) {

    return (
        <div
            className="no-print"
            style={{
                zIndex: 50,
                backgroundColor: "white",
                position: "fixed",
                top: 0,
                marginRight: "60%",
                width: "40%",
                height: 40,
                borderBottomWidth: 2,
                borderBottomStyle: "solid"
            }}
        >
            {fil.map((e, i) => {

                return (
                    <div
                        key={i}
                        className="no-print"
                        style={{
                            float: "left"
                        }}
                    >

                        <NavLink
                            style={{
                                float: "left",
                                borderWidth: 2,
                                borderStyle: "solid",
                                height: 12,
                                padding: "7px 2px",
                                borderColor: "blue",
                                borderBottomLeftRadius: 6,
                                borderTopLeftRadius: 6,
                                borderBottomRightRadius:
                                    i < (fil.length - 1)
                                        ? 0
                                        : 6,
                                borderTopRightRadius:
                                    i < (fil.length - 1)
                                        ? 0
                                        : 6,
                                fontSize: 12,
                                fontWeight: 800,
                                textDecoration: "none",
                                maxWidth: 150,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textWrap: "nowrap"
                            }}
                            to={e[1]}
                        >
                            {e[0]}
                        </NavLink>

                        {i < (fil.length - 1) &&
                            <div
                                style={{
                                    width: 0,
                                    height: 0,
                                    borderTop:
                                        "15px solid transparent",
                                    borderBottom:
                                        "15px solid transparent",
                                    borderLeft:
                                        "10px solid blue",
                                    float: "left"
                                }}
                            />
                        }

                    </div>
                );
            })}
        </div>
    );
}


function User() {

    const login = useUser((state) => state.login);
    const logoutStore = useUser((state) => state.logout);

    async function handleLogout() {

        try {
            await fAPI.logout();
        } catch (e) {
            console.error(e);
        }

        logoutStore();
    }

    return (
        <div
            className="no-print"
            style={{
                zIndex: 50,
                backgroundColor: "white",
                position: "fixed",
                top: 0,
                width: "20%",
                marginLeft: "80%",
                height: 40,
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 5px",
                boxSizing: "border-box"
            }}
        >


                <span>
                    {login}
                </span>

                <NavLink
                    to="/GE/admin"
                >
                    Admin
                </NavLink>

                <button
                    onClick={handleLogout}
                >
                    Déconnexion
                </button>



        </div>
    );
}
