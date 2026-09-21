import {
    useLoaderData,
    useParams
} from "react-router";

import {
    getHandler,
    SelecteurDisplayeur
} from "../Game/games";

import { Action } from "../Component/Action";


export default function Affichage() {

    const params = useParams();

    const jeu = params.jeu;

    const element =
        useLoaderData().element ||
        {
            meta: null,
            content: null
        };


    const Display =
        getHandler(
            jeu,
            element.meta.type
        ).display.default;


    const isVersion =
        !!params.version;


    return (
        <>

            <div>
                {isVersion
                    ? "Affichage d'une version"
                    : "Affichage"
                }
            </div>


            {isVersion && (

                <div
                    style={{
                        padding: 10,
                        margin: "10px 0",
                        border: "1px solid #ccc",
                        fontFamily: "monospace"
                    }}
                >
                    Version : {params.version}
                </div>

            )}


            <Action
                jeu={jeu}
                type={element.meta.type}
                id={element.id}
                version={params.version}
            />


            <SelecteurDisplayeur
                jeu={jeu}
                type={element.meta.type}
                content={element.content}
            />


            <p>
                {JSON.stringify(element)}
            </p>

        </>
    );
}
