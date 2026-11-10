import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { games } from "../Game/games";
import { useSearch, useUser } from "../lib/store";
import * as fAPI from "../lib/fetch.js";

export default function HeaderBar() {
    const loc = useLocation()

    return (
        <>
            <style>{STYLE_PETIT_ECRAN}</style>
            <Location location={loc} />
            <User />
            <div
                className="no-print ge-bar-espace"
                style={{ height: 40 }}
            ></div>
            <Outlet />
        </>
    )
}

// Petit écran : l'en-tête passe sur deux lignes. Le fil d'Ariane prend toute
// la première (il défile de côté au lieu de passer à la ligne) ; recherche,
// « Ajouter » et compte se partagent la seconde. (Les barres ont des styles
// en ligne, d'où les !important.)
const STYLE_PETIT_ECRAN = `
@media (max-width: 800px) {
    .ge-bar-fil { width: 100% !important; margin-right: 0 !important; display: flex !important; overflow-x: auto; overflow-y: hidden; box-sizing: border-box; }
    .ge-bar-fil > div { flex: none; }
    .ge-bar-search { top: 40px !important; margin-left: 0 !important; width: 45% !important; white-space: nowrap; overflow: hidden; }
    .ge-bar-search > span { font-size: 18px !important; }
    .ge-bar-search > input { font-size: 15px !important; width: calc(100% - 34px) !important; box-sizing: border-box; }
    .ge-bar-add { top: 40px !important; margin-left: 45% !important; width: 25% !important; gap: 4px !important; }
    .ge-bar-add button { font-size: 15px !important; }
    .ge-bar-user { top: 40px !important; margin-left: 70% !important; width: 30% !important; box-sizing: border-box; font-size: 12px; gap: 4px; overflow: hidden; }
    .ge-bar-user button { font-size: 12px; padding: 1px 4px; }
    .ge-bar-espace { height: 80px !important; }
    [data-resultats-recherche] { top: 80px !important; left: 0 !important; width: 100vw !important; box-sizing: border-box; }
}
`;

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
        else if (part[3] === "tools") {

            // Outil du jeu (/GE/<jeu>/tools/<outil>) : son nom, et non un élément
            const outil = jeu.tools?.[part[4]];

            fil.push([
                outil ? outil.name : (part[4] || "Outils"),
                "/GE/" + part[2] + "/tools/" + (part[4] || "")
            ]);

            return (
                <LocationBar fil={fil} />
            );
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
                // (sans l'ancien préfixe !...! des noms)
                r ? String(r.name || "").replace(/^(![^!]*!)+/, "") : "erreur",
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
            className="no-print ge-bar-fil"
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
    const admin = useUser((state) => state.admin);
    const setAdmin = useUser((state) => state.setAdmin);

    // Rafraîchit le statut admin (sessions ouvertes avant l'ajout du rôle)
    useEffect(() => {
        fAPI.getMe()
            .then(me => {
                if (me) {
                    setAdmin(me.data?.admin === true);
                }
            })
            .catch(e => console.error(e));
    }, [setAdmin]);

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
            className="no-print ge-bar-user"
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
            }}
        >


                <span>
                    {login}
                </span>

                {admin && (
                    <NavLink
                        to="/GE/admin"
                    >
                        Admin
                    </NavLink>
                )}

                <button
                    onClick={handleLogout}
                >
                    Déconnexion
                </button>



        </div>
    );
}
