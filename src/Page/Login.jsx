import { useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../lib/store";
import * as fAPI from "../lib/fetch.js";

export default function Login() {

    const [login, setLoginInput] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const setUser = useUser((state) => state.setUser);

    const navigate = useNavigate();

    async function handleSubmit(e) {

        e.preventDefault();

        setError("");

        const value = login.trim();

        if (!value) {
            setError("Veuillez saisir un login.");
            return;
        }

        if (!password) {
            setError("Veuillez saisir un mot de passe.");
            return;
        }

        try {

            const result = await fAPI.login(
                value,
                password
            );

            if (!result || !result.user) {

                setError(
                    result?.error ||
                    "Login ou mot de passe incorrect."
                );

                return;
            }

            /*
             * Stockage du login et du token.
             */
            setUser(
                result.user,
                result.token
            );

            navigate("/GE/");

        } catch (e) {

            console.error(e);

            setError(
                "Erreur lors de la connexion."
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

                <h2>Connexion</h2>

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

                {error &&
                    <p style={{ color: "red" }}>
                        {error}
                    </p>
                }

                <button type="submit">
                    Connexion
                </button>

            </form>
        </div>
    );
}
