import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import * as fAPI from "../lib/fetch.js";
import { useUser } from "../lib/store";

export default function Invite() {

    const { code } = useParams();
    const navigate = useNavigate();

    const setLogin = useUser((state) => state.setLogin);

    const [login, setLoginInput] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    const [error, setError] = useState("");

    async function handleSubmit(e) {

        e.preventDefault();

        setError("");

        if (!login.trim()) {
            setError("Veuillez saisir un login.");
            return;
        }

        if (!password) {
            setError("Veuillez saisir un mot de passe.");
            return;
        }

        if (password !== passwordConfirm) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        try {

            const result = await fAPI.invite(
                code,
                login.trim(),
                password
            );

            /*
             * Le backend renvoie un token et un User.
             */
            if (!result || !result.user) {
                setError(
                    result?.error ||
                    "Impossible de créer le compte."
                );
                return;
            }

            /*
             * Pour l'instant notre store ne contient
             * que le login.
             */
            setLogin(result.user.name);

            /*
             * On pourra stocker le token dans le store
             * à l'étape suivante.
             */

            navigate("/GE/");

        } catch (e) {

            console.error(e);

            setError(
                "Erreur lors de la création du compte."
            );
        }
    }

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh"
            }}
        >
            <form onSubmit={handleSubmit}>

                <h2>Créer un compte</h2>

                <div style={{ marginBottom: 10 }}>
                    <label>
                        Login
                    </label>
                    <br />

                    <input
                        type="text"
                        value={login}
                        onChange={(e) =>
                            setLoginInput(e.target.value)
                        }
                        autoFocus
                    />
                </div>

                <div style={{ marginBottom: 10 }}>
                    <label>
                        Mot de passe
                    </label>
                    <br />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                    />
                </div>

                <div style={{ marginBottom: 10 }}>
                    <label>
                        Confirmation du mot de passe
                    </label>
                    <br />

                    <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) =>
                            setPasswordConfirm(e.target.value)
                        }
                    />
                </div>

                {error &&
                    <p style={{ color: "red" }}>
                        {error}
                    </p>
                }

                <button type="submit">
                    Valider
                </button>

            </form>
        </div>
    );
}
