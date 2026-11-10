import { useEffect, useState } from "react";
import * as fAPI from "../lib/fetch.js";
import { useUser } from "../lib/store";

// Statuts d'un utilisateur : [valeur, libellé]. « admin » = GEuser.data.admin
const STATUTS = [
    ["utilisateur", "Utilisateur"],
    ["admin", "Administrateur"],
];

const statutDe = user => (user.data?.admin === true ? "admin" : "utilisateur");

const styleCase = {
    border: "1px solid black",
    padding: 5
};

export default function Admin() {

    const [users, setUsers] = useState([]);
    const [invite, setInvite] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Statut en cours d'enregistrement : id de l'utilisateur
    const [enCours, setEnCours] = useState(null);

    const moi = useUser(state => state.login);

    async function changerStatut(user, statut) {

        if (statut === statutDe(user)) {
            return;
        }

        if (!window.confirm(`Passer ${user.login} au statut « ${STATUTS.find(s => s[0] === statut)[1]} » ?`)) {
            return;
        }

        setError("");
        setEnCours(user.id);

        try {

            const result = await fAPI.setStatut(user.id, statut);

            if (result?.error || !result) {
                setError(result?.error || "Impossible de changer le statut.");
            } else {
                // Le statut affiché suit celui enregistré
                setUsers(liste => liste.map(u => (u.id === user.id
                    ? { ...u, data: { ...u.data, admin: statut === "admin" ? true : undefined } }
                    : u)));
            }

        } catch (e) {

            console.error(e);
            setError("Impossible de changer le statut.");
        }

        setEnCours(null);
    }

    async function loadUsers() {

        setLoading(true);
        setError("");

        try {

            const result = await fAPI.getUsers();

            if (Array.isArray(result)) {
                setUsers(result);
            } else {
                setUsers([]);
                setError(result?.error || "Impossible de récupérer les utilisateurs.");
            }

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

            if (!result?.code) {
                setError(result?.error || "Impossible de créer le code d'invitation.");
                return;
            }

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

                                <th style={styleCase}>
                                    Statut
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

                                    <td style={styleCase}>
                                        <select
                                            value={statutDe(user)}
                                            disabled={enCours === user.id || (user.login === moi && statutDe(user) === "admin")}
                                            title={user.login === moi
                                                ? "Vous ne pouvez pas retirer votre propre statut d'administrateur"
                                                : "Changer le statut"}
                                            aria-label={"Statut de " + user.login}
                                            onChange={e => changerStatut(user, e.target.value)}
                                        >
                                            {STATUTS.map(([valeur, libelle]) => (
                                                <option key={valeur} value={valeur}>{libelle}</option>
                                            ))}
                                        </select>
                                        {user.data?.bot === true && (
                                            <span style={{ marginLeft: 6, color: "#666" }}>(bot)</span>
                                        )}
                                        {enCours === user.id && (
                                            <span style={{ marginLeft: 6, color: "#666" }}>enregistrement…</span>
                                        )}
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
