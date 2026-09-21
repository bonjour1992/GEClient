import { useLoaderData, useNavigate, useParams } from "react-router";
import { ArrowLeft, Eye, RotateCcw } from "lucide-react";
import { restoreElement } from "../lib/fetch";


export default function Versions() {

    const versions = useLoaderData().versions || [];
    const { jeu, elem, id } = useParams();
    const navigate = useNavigate();


    function formatDate(timestamp) {

        if (!timestamp) {
            return "";
        }

        return new Date(timestamp).toLocaleString();
    }


    function formatAuthor(author) {

        if (!author || typeof author !== "object") {
            return "";
        }

        return author.name || "";
    }


    async function restore(version) {

        const confirmation = window.confirm(
            "Restaurer cette version ?"
        );

        if (!confirmation) {
            return;
        }

        try {

            await restoreElement(
                id,
                version._id,
                jeu
            );

            navigate(
                `/GE/${jeu}/${elem}/${id}`
            );

        } catch (e) {

            console.error(e);

            alert(
                "Impossible de restaurer cette version."
            );
        }
    }


    return (
        <div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20
                }}
            >

                <button
                    onClick={() =>
                        navigate(`/GE/${jeu}/${elem}/${id}`)
                    }
                >
                    <ArrowLeft size={18} />
                </button>

                <h2>
                    Versions de l'élément {id}
                </h2>

            </div>


            {versions.length === 0 && (
                <p>
                    Aucune version.
                </p>
            )}


            {versions.length > 0 && (

                <table
                    style={{
                        borderCollapse: "collapse",
                        width: "100%"
                    }}
                >

                    <thead>

                        <tr>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                Version
                            </th>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                Date
                            </th>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                Auteur
                            </th>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                Statut
                            </th>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                Actions
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {versions.map(version => {

                            const isDeleted =
                                version.meta?.status === "DELETED";

                            return (
                                <tr key={version._id}>

                                    <td style={{
                                        border: "1px solid black",
                                        padding: 8,
                                        fontFamily: "monospace"
                                    }}>
                                        {version._id}
                                    </td>


                                    <td style={{
                                        border: "1px solid black",
                                        padding: 8
                                    }}>
                                        {formatDate(
                                            version.meta?.created
                                        )}
                                    </td>


                                    <td style={{
                                        border: "1px solid black",
                                        padding: 8
                                    }}>
                                        {formatAuthor(
                                            version.meta?.author
                                        )}
                                    </td>


                                    <td style={{
                                        border: "1px solid black",
                                        padding: 8
                                    }}>
                                        {version.meta?.status}
                                    </td>


                                    <td style={{
                                        border: "1px solid black",
                                        padding: 8,
                                        display: "flex",
                                        gap: 5
                                    }}>

                                        {!isDeleted && (
                                            <button
                                                title="Voir cette version"
                                                onClick={() =>
                                                    navigate(
                                                        `/GE/${jeu}/${elem}/${id}/version/${version._id}`
                                                    )
                                                }
                                            >
                                                <Eye size={18} />
                                            </button>
                                        )}


                                        <button
                                            title="Restaurer cette version"
                                            onClick={() =>
                                                restore(version)
                                            }
                                        >
                                            <RotateCcw size={18} />
                                        </button>

                                    </td>

                                </tr>
                            );
                        })}

                    </tbody>

                </table>

            )}

        </div>
    );
}
