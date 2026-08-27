import React, { useState } from "react";
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
import * as fAPI from "./lib/fetch.js";
import Edit from "./Page/Edit";
import Create from "./Page/Create.jsx";
import Duplicate from "./Page/Duplicate.jsx";
import Print from "./Page/Print.jsx";




// router
const router = createBrowserRouter([
  {
    path: "/GE/",
    Component: HeaderBar,
    children: [
      {
        index: true, Component: Home
      },
      {
        path: ":jeu/", Component: JeuBar, children: [
          {
            index: true, Component: JeuHome,
            loader: async ({ params }) => {
              return await fAPI.getStat(params.jeu)
            }
          },
          { path: "remp", Component: Remp },
          {
            path: ":elem",
            Component: Liste,
            loader: async ({ params }) => {
              return { element: await fAPI.getList(params.jeu, params.elem) }
            }
          },
          {
            path: ":elem/new",
            Component: Create,

          },
          {
            path: ":elem/print",
            Component: Print,

          },
          {
            path: ":elem/:id",
            Component: Affichage,
            loader: async ({ params }) => {
              return { element: await fAPI.getElement(params.id) }
            }
          },
          {
            path: ":elem/:id/edit",
            Component: Edit,
            loader: async ({ params }) => {
              return { element: await fAPI.getElement(params.id) }
            }
          }, {
            path: ":elem/:id/duplicate",
            Component: Duplicate,
            loader: async ({ params }) => {
              return { element: await fAPI.getElement(params.id) }
            }
          }]
      }]
  },
]);

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <RouterProvider router={router} />,
);