import { useEffect, useState } from "react";
import * as fAPI from "../lib/fetch.js";

export default function Admin() {

    const [users, setUsers] = useState([]);
    const [invite, setInvite] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadUsers() {

        setLoading(true);
        setError("");

        try {

            const result = await fAPI.getUsers();

            setUsers(result);

        } catch (e) {

            console.error(e);

            setError(
                "Impossible de récupérer les utilisateurs."
            );
        }

        setLoading(false);
    }


    async function handleCreateInvite() {

        setError("");
        setInvite("");

        try {

            const result = await fAPI.createInvite();

            setInvite(result.code);

        } catch (e) {

            console.error(e);

            setError(
                "Impossible de créer le code d'invitation."
            );
        }
    }


    useEffect(() => {
        loadUsers();
    }, []);


    // URL de base du site actuel
    const inviteUrl = invite
        ? `${window.location.origin}/GE/invite/${invite}`
        : "";


    return (
        <div
            style={{
                padding: 20
            }}
        >

            <h2>Administration</h2>


            <section
                style={{
                    marginBottom: 30
                }}
            >

                <h3>Utilisateurs</h3>

                {loading && (
                    <p>
                        Chargement...
                    </p>
                )}

                {!loading && users.length === 0 && (
                    <p>
                        Aucun utilisateur.
                    </p>
                )}

                {!loading && users.length > 0 && (

                    <table
                        style={{
                            borderCollapse: "collapse"
                        }}
                    >

                        <thead>
                            <tr>

                                <th
                                    style={{
                                        border: "1px solid black",
                                        padding: 5
                                    }}
                                >
                                    ID
                                </th>

                                <th
                                    style={{
                                        border: "1px solid black",
                                        padding: 5
                                    }}
                                >
                                    Login
                                </th>

                            </tr>
                        </thead>

                        <tbody>

                            {users.map(user => (

                                <tr key={user.id}>

                                    <td
                                        style={{
                                            border: "1px solid black",
                                            padding: 5
                                        }}
                                    >
                                        {user.id}
                                    </td>

                                    <td
                                        style={{
                                            border: "1px solid black",
                                            padding: 5
                                        }}
                                    >
                                        {user.login}
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </section>


            <section>

                <h3>Invitation</h3>

                <button
                    onClick={handleCreateInvite}
                >
                    Créer un code d'invitation
                </button>


                {invite && (

                    <div
                        style={{
                            marginTop: 15,
                            padding: 10,
                            border: "1px solid green"
                        }}
                    >

                        <div>
                            Lien d'invitation :
                        </div>

                        <a
                            href={inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {inviteUrl}
                        </a>

                    </div>

                )}

            </section>


            {error && (

                <p
                    style={{
                        color: "red"
                    }}
                >
                    {error}
                </p>

            )}

        </div>
    );
}
