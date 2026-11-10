import {
    useLoaderData,
    useParams
} from "react-router";

import {
    getHandler,
    SelecteurDisplayeur
} from "../Game/games";

import { Action } from "../Component/Action";

// Libellé du statut d'une version
const STATUTS = {
    CREATED: "créé",
    UPDATED: "modifié",
    DELETED: "supprimé",
    RESTORED: "restauré",
};

// Date et heure d'une version : « 10/11/2026 à 18:20 »
function dateVersion(created) {

    const date = new Date(Number(created));

    if (!created || Number.isNaN(date.getTime())) {
        return "date inconnue";
    }

    return date.toLocaleDateString("fr-FR") + " à " +
        date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Affichage() {

    const params = useParams();

    const jeu = params.jeu;

    const element =
        useLoaderData().element ||
        {
            meta: null,
            content: null
        };

    const meta = element.meta || {};
    const handler = getHandler(jeu, meta.type);
    const isVersion = !!params.version;

    return (
        <>

            {/* En-tête : type, auteur et date de cette version */}
            <div
                data-entete-element
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    gap: "2px 12px",
                    margin: "4px 0 8px",
                    padding: "4px 8px",
                    borderLeft: "4px solid #1565c0",
                    backgroundColor: "#f5f7fa",
                    fontFamily: "Arial, sans-serif",
                    fontSize: 13,
                }}
            >
                <b style={{ fontSize: 15 }}>{handler?.name || meta.type}</b>
                <span style={{ color: "#555" }}>n° {element.id}</span>

                <span>
                    {STATUTS[meta.status] || "enregistré"} le <b>{dateVersion(meta.created)}</b>
                    {" "}par <b>{meta.author?.name || "inconnu"}</b>
                </span>

                {isVersion && (
                    <span
                        style={{
                            padding: "0 8px",
                            borderRadius: 10,
                            backgroundColor: "#fff3cd",
                            border: "1px solid #ff9800",
                        }}
                    >
                        version ancienne ({params.version})
                    </span>
                )}
            </div>

            <Action
                jeu={jeu}
                type={meta.type}
                id={element.id}
                version={params.version}
            />

            <SelecteurDisplayeur
                jeu={jeu}
                type={meta.type}
                content={element.content}
            />

            {/* Données brutes : repliées par défaut */}
            <details
                data-json-element
                style={{ margin: "12px 0", fontFamily: "Arial, sans-serif", fontSize: 13 }}
            >
                <summary style={{ cursor: "pointer", color: "#888" }}>
                    Code JSON de l'élément
                </summary>

                <blockquote
                    style={{
                        margin: "6px 0 0",
                        padding: 8,
                        borderLeft: "4px solid #bbb",
                        backgroundColor: "#f5f5f5",
                        fontFamily: "monospace",
                        fontSize: 12,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                    }}
                >
                    {JSON.stringify(element, null, 2)}
                </blockquote>
            </details>

        </>
    );
}
