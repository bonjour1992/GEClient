import { Navigate, Outlet, useLoaderData, useNavigate, useParams } from "react-router";
import { getHandler, Displayeur, SelecteurDisplayeur } from "../Game/games";
import { useState } from "react";
import { updateElement } from "../lib/fetch";
import Editor from "./Editor";

export default function Edit() {
    const elem = useLoaderData().element
   


   return (
    <Editor elem={elem} creer={true} />
   )
}
   
   
 