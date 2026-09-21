import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
    ArrowLeft,
    History,
    RotateCcw
} from "lucide-react";

import {
    getDeletedElements,
    restoreDeletedElement
} from "../lib/fetch";


export default function Deleted() {

    const { jeu } = useParams();
    const navigate = useNavigate();

    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);


    async function loadDeleted() {

        try {

            setLoading(true);

            const result = await getDeletedElements(jeu);

            setElements(result || []);

        } catch (e) {

            console.error(e);

            setElements([]);

        } finally {

            setLoading(false);

        }
    }


    useEffect(() => {

        loadDeleted();

    }, [jeu]);


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


    async function restore(element) {

        const confirmation = window.confirm(
            `Restaurer "${element.name || "cet élément"}" ?`
        );

        if (!confirmation) {
            return;
        }

        try {

            await restoreDeletedElement(
                element.id,
                jeu
            );

            await loadDeleted();

        } catch (e) {

            console.error(e);

            alert(
                "Impossible de restaurer cet élément."
            );
        }
    }


    function showVersions(element) {

        navigate(
            `/GE/${jeu}/${element.type}/${element.id}/versions`
        );

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
                        navigate(`/GE/${jeu}`)
                    }
                >
                    <ArrowLeft size={18} />
                </button>

                <h2>
                    Éléments supprimés
                </h2>

            </div>


            {loading && (
                <p>
                    Chargement...
                </p>
            )}


            {!loading && elements.length === 0 && (
                <p>
                    Aucun élément supprimé.
                </p>
            )}


            {!loading && elements.length > 0 && (

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
                                Nom
                            </th>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                ID
                            </th>

                            <th style={{
                                border: "1px solid black",
                                padding: 8
                            }}>
                                Type
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
                                Actions
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {elements.map(element => (

                            <tr key={element._id}>

                                <td style={{
                                    border: "1px solid black",
                                    padding: 8
                                }}>
                                    {element.name || ""}
                                </td>


                                <td style={{
                                    border: "1px solid black",
                                    padding: 8,
                                    fontFamily: "monospace"
                                }}>
                                    {element.id}
                                </td>


                                <td style={{
                                    border: "1px solid black",
                                    padding: 8
                                }}>
                                    {element.type || ""}
                                </td>


                                <td style={{
                                    border: "1px solid black",
                                    padding: 8
                                }}>
                                    {formatDate(
                                        element.created
                                    )}
                                </td>


                                <td style={{
                                    border: "1px solid black",
                                    padding: 8
                                }}>
                                    {formatAuthor(
                                        element.author
                                    )}
                                </td>


                                <td style={{
                                    border: "1px solid black",
                                    padding: 8,
                                    display: "flex",
                                    gap: 5
                                }}>

                                    <button
                                        title="Voir les versions"
                                        onClick={() =>
                                            showVersions(element)
                                        }
                                    >
                                        <History size={18} />
                                    </button>


                                    <button
                                        title="Restaurer"
                                        onClick={() =>
                                            restore(element)
                                        }
                                    >
                                        <RotateCcw size={18} />
                                    </button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            )}

        </div>
    );
}
