import { useParams } from "react-router";
import { getHandler } from "../Game/games";
import Editor from "./Editor";

export default function Create() {
    let jeu = useParams().jeu
    let type = useParams().elem
    return (
        <Editor elem={{ meta: { type: type, jeu: jeu }, content: new (getHandler(jeu, type).classe)() }} creer={true} />
    )
}

