import { Navigate, Outlet, useLoaderData, useNavigate, useParams } from "react-router";
import { getHandler, Displayeur } from "../Game/games";
import { useState } from "react";
import { createElement, updateElement } from "../lib/fetch";
import Editor from "./Editor";

export default function Create() {
    let jeu = useParams().jeu
    let type = useParams().elem
    return (
        <Editor elem={{ meta: { type: type, jeu: jeu }, content: new (getHandler(jeu, type).classe)() }} creer={true} />
    )
}

