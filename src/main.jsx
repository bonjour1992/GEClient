import ReactDOM from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import HeaderBar from "./Page/HeaderBar";
import Home from "./Page/Home";
import JeuBar from "./Page/JeuBar";
import Remp from "./Page/Remp";
import JeuHome from "./Page/JeuHome";
import Liste from "./Page/Liste";
import Affichage from "./Page/Affichage";
import Edit from "./Page/Edit";
import Create from "./Page/Create.jsx";
import Duplicate from "./Page/Duplicate.jsx";
import Print from "./Page/Print.jsx";
import { ImageLibrary } from "./Page/ImageLibrary.jsx";
import Invite from "./Page/Invite.jsx";
import Login from "./Page/Login.jsx";
import RequireAuth from "./Page/RequireAuth.jsx";
import Admin from "./Page/Admin.jsx";
import * as fAPI from "./lib/fetch.js";
import Versions from "./Page/Versions.jsx";
import Deleted from "./Page/Deleted.jsx";
import { normalizeElement } from "./Game/games";


const router = createBrowserRouter([
    {
        path: "/GE/login",
        Component: Login
    },

    {
        path: "/GE/invite/:code",
        Component: Invite
    },

    {
        path: "/GE/",
        Component: RequireAuth,

        children: [

            {
                Component: HeaderBar,

                children: [

                    {
                        index: true,
                        Component: Home
                    },

                    {
                        path: "admin",
                        Component: Admin
                    },

                    {
                        path: "library",
                        Component: ImageLibrary
                    },

                    {
                        path: ":jeu/",
                        Component: JeuBar,

                        children: [

                            {
                                index: true,
                                Component: JeuHome,

                                loader: async ({ params }) => {

                                    return await fAPI.getStat(
                                        params.jeu
                                    );

                                }
                            },


                            {
                                path: "remp",
                                Component: Remp
                            },


                            // =========================
                            // CORBEILLE
                            // =========================

                            {
                                path: "deleted",
                                Component: Deleted
                            },


                            // =========================
                            // ELEMENTS
                            // =========================

                            {
                                path: ":elem",
                                Component: Liste,

                                loader: async ({ params }) => {

                                    return {
                                        element: await fAPI.getList(
                                            params.jeu,
                                            params.elem
                                        )
                                    };

                                }
                            },


                            {
                                path: ":elem/new",
                                Component: Create
                            },


                            {
                                path: ":elem/print",
                                Component: Print
                            },


                            // =========================
                            // VERSIONS
                            // =========================

                            {
                                path: ":elem/:id/versions",
                                Component: Versions,

                                loader: async ({ params }) => {

                                    return {
                                        versions: await fAPI.getElementVersions(
                                            params.id
                                        )
                                    };

                                }
                            },


                            // =========================
                            // VERSION PRECISE
                            // =========================

                            {
                                path: ":elem/:id/version/:version",
                                Component: Affichage,

                                loader: async ({ params }) => {

                                    const element =
                                        await fAPI.getElementVersion(
                                            params.id,
                                            params.version
                                        );

                                    return {
                                        element: normalizeElement(
                                            element
                                        )
                                    };

                                }
                            },


                            // =========================
                            // EDITION
                            // =========================

                            {
                                path: ":elem/:id/edit",
                                Component: Edit,

                                loader: async ({ params }) => {

                                    const element =
                                        await fAPI.getElement(
                                            params.id
                                        );

                                    return {
                                        element: normalizeElement(
                                            element
                                        )
                                    };

                                }
                            },


                            // =========================
                            // AFFICHAGE
                            // =========================

                            {
                                path: ":elem/:id",
                                Component: Affichage,

                                loader: async ({ params }) => {

                                    const element =
                                        await fAPI.getElement(
                                            params.id
                                        );

                                    return {
                                        element: normalizeElement(
                                            element
                                        )
                                    };

                                }
                            },


                            // =========================
                            // DUPLICATION
                            // =========================

                            {
                                path: ":elem/:id/duplicate",
                                Component: Duplicate,

                                loader: async ({ params }) => {

                                    const element =
                                        await fAPI.getElement(
                                            params.id
                                        );

                                    return {
                                        element: normalizeElement(
                                            element
                                        )
                                    };

                                }
                            }

                        ]
                    }
                ]
            }
        ]
    }
]);


const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
    <RouterProvider router={router} />
);
