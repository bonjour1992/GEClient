import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { fetchAPI } from "../../../lib/fetch";
import { useSearch, getFromType } from "../../../lib/store";
import { Partie } from "./Partie";

// ============================================================
// OUTIL « PARTIES »
//
//   /GE/ti5/tools/partie         liste et création
//   /GE/ti5/tools/partie?id=12   une partie
// ============================================================

const STATUTS = {
    preparation: "en préparation",
    "en cours": "en cours",
    terminee: "terminée",
};

export default function Outil() {

    const [params, setParams] = useSearchParams();
    const id = params.get("id");

    return id
        ? <Partie key={id} id={id} />
        : <Liste ouvrir={partieId => setParams({ id: partieId })} />;
}

function Liste({ ouvrir }) {

    const jeu = useParams().jeu;
    const search = useSearch(state => state.search);

    const [parties, setParties] = useState(null);
    const [erreur, setErreur] = useState("");
    const [nom, setNom] = useState("");
    const [plateau, setPlateau] = useState("");

    useEffect(() => {

        let annule = false;

        useSearch.getState().update(jeu);

        fetchAPI("partie?jeu=" + encodeURIComponent(jeu), "GET")
            .then(r => {
                if (annule) {
                    return;
                }

                if (Array.isArray(r)) {
                    setParties(r);
                } else {
                    setErreur(r?.error || "Impossible de charger les parties.");
                }
            })
            .catch(() => {
                if (!annule) {
                    setErreur("Connexion au serveur impossible");
                }
            });

        return () => {
            annule = true;
        };

    }, [jeu]);

    const plateaux = getFromType(search, ["plateau"]);

    async function creer() {

        const r = await fetchAPI("partie", "POST", { jeu, nom, plateau: Number(plateau) });

        if (r?.partie) {
            ouvrir(r.partie.id);
        } else {
            setErreur(r?.error || "Création impossible.");
        }
    }

    return (
        <div
            style={{
                backgroundColor: "#fff",
                color: "#000",
                padding: 12,
                fontFamily: "Arial, sans-serif",
                maxWidth: 700,
            }}
        >
            <h2>Parties</h2>

            {erreur && (
                <div style={{ padding: 6, marginBottom: 8, backgroundColor: "#fdd", border: "1px solid #c00" }}>
                    {erreur}
                </div>
            )}

            {parties === null && !erreur && <p>Chargement…</p>}

            {parties?.length === 0 && <p>Aucune partie pour l'instant.</p>}

            {parties?.map(p => (
                <div
                    key={p.id}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 8px",
                        marginBottom: 4,
                        backgroundColor: "#f5f5f5",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                    }}
                >
                    <b>{p.nom}</b>
                    <span style={{ color: "#666" }}>
                        {STATUTS[p.statut] || p.statut} · {p.joueurs.map(j => j.nom).join(", ") || "aucun joueur"}
                        {p.statut !== "preparation" && p.tour !== null && p.tour !== undefined &&
                            ` · tour ${p.tour}${p.phase ? " — " + p.phase : ""}`}
                        {p.statut !== "preparation" && ` · ${p.version} coup(s)`}
                    </span>
                    <button type="button" onClick={() => ouvrir(p.id)} style={{ marginLeft: "auto" }}>
                        Ouvrir
                    </button>
                </div>
            ))}

            <h3>Nouvelle partie</h3>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>

                <input
                    placeholder="Nom de la partie"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                />

                <select value={plateau} onChange={e => setPlateau(e.target.value)}>
                    <option value="">Plateau…</option>
                    {plateaux.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>

                <button type="button" disabled={!nom.trim() || !plateau} onClick={creer}>
                    Créer
                </button>
            </div>
        </div>
    );
}
