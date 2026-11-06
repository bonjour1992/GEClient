import { useState } from "react";
import { useNavigate } from "react-router";
import { useSearch, getFromType } from "../../../lib/store";
import { PlayerColor } from "../ti5Const";
import { couleurJoueur } from "./Interaction";

// ============================================================
// PRÉPARATION D'UNE PARTIE
//
// Chaque joueur prend lui-même un siège (faction et couleur).
// Le créateur lance la partie : le serveur fait la mise en place.
// ============================================================

const nomSansPrefixe = nom => nom.replace(/^!([^!]*)!/, "");

// Nom affiché des couleurs de joueur (clés de PlayerColor)
const NOMS_COULEUR = {
    black: "Noir",
    green: "Vert",
    pink: "Rose",
    orange: "Orange",
    blue: "Bleu",
    yellow: "Jaune",
    purple: "Violet",
    red: "Rouge",
};

export function Preparation({ p }) {

    const navigate = useNavigate();
    const search = useSearch(state => state.search);

    const { partie } = p.vue;
    const moi = p.moi;

    const monSiege = partie.joueurs.find(j => j.userId === moi);
    const createur = partie.createur === moi;

    // Couleurs et factions déjà prises par les autres joueurs
    const autres = partie.joueurs.filter(j => j.userId !== moi);
    const couleursPrises = autres.map(j => j.couleur);
    const factionsPrises = autres.map(j => j.faction);

    const [faction, setFaction] = useState(monSiege?.faction ?? "");

    // Par défaut : ma couleur, sinon la première encore libre
    const [choixCouleur, setCouleur] = useState(monSiege?.couleur || "");

    const couleur = choixCouleur && !couleursPrises.includes(choixCouleur)
        ? choixCouleur
        : (Object.keys(PlayerColor).find(c => !couleursPrises.includes(c)) || "red");

    const factions = getFromType(search, ["faction"]);
    const nomFaction = id => nomSansPrefixe(factions.find(f => f.id === id)?.name || "faction #" + id);

    const base = "partie/" + partie.id;

    async function supprimer() {

        if (!window.confirm(`Supprimer la partie « ${partie.nom} » ?`)) {
            return;
        }

        const r = await p.requete(base, "DELETE");

        if (r?.supprime) {
            navigate({ search: "" });
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
            <h2>{partie.nom} — préparation</h2>

            {p.erreur && (
                <div style={{ padding: 6, marginBottom: 8, backgroundColor: "#fdd", border: "1px solid #c00" }}>
                    {p.erreur}{" "}
                    <button type="button" onClick={() => p.setErreur("")}>×</button>
                </div>
            )}

            <h3>Joueurs</h3>

            {partie.joueurs.length === 0 && <p>Personne n'a encore pris de siège.</p>}

            {partie.joueurs.map((j, i) => (
                <div
                    key={j.userId}
                    style={{
                        padding: "4px 8px",
                        marginBottom: 4,
                        borderLeft: "8px solid " + couleurJoueur(j),
                        backgroundColor: "#f5f5f5",
                    }}
                >
                    {i + 1}. <b>{j.nom}</b> — {nomFaction(j.faction)}
                </div>
            ))}

            <h3>{monSiege ? "Mon siège" : "Prendre un siège"}</h3>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>

                <select value={faction} onChange={e => setFaction(e.target.value)}>
                    <option value="">Faction…</option>
                    {factions.map(f => (
                        <option key={f.id} value={f.id} disabled={factionsPrises.includes(f.id)}>
                            {nomSansPrefixe(f.name)}{factionsPrises.includes(f.id) ? " (prise)" : ""}
                        </option>
                    ))}
                </select>

                <select
                    value={couleur}
                    onChange={e => setCouleur(e.target.value)}
                    style={{ borderLeft: "14px solid " + (PlayerColor[couleur] || "#666") }}
                >
                    {Object.keys(PlayerColor).map(c => (
                        <option key={c} value={c} disabled={couleursPrises.includes(c)}>
                            {NOMS_COULEUR[c] || c}{couleursPrises.includes(c) ? " (prise)" : ""}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    disabled={!faction || p.envoi}
                    onClick={() => p.requete(base + "/siege", "POST", { faction: Number(faction), couleur })}
                >
                    {monSiege ? "Changer" : "Prendre un siège"}
                </button>

                {monSiege && (
                    <button type="button" disabled={p.envoi} onClick={() => p.requete(base + "/siege", "DELETE")}>
                        Quitter
                    </button>
                )}
            </div>

            <h3>Lancement</h3>

            <p>
                Au lancement, les systèmes des cases « hasard » sont tirés au sort, chaque
                faction reçoit son système natal dans l'ordre des sièges, ses unités et
                agents de départ, et les pioches sont mélangées.
            </p>

            {createur ? (
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        type="button"
                        disabled={!partie.joueurs.length || p.envoi}
                        onClick={() => p.requete(base + "/lancer", "POST")}
                        style={{ fontWeight: "bold", padding: "8px 14px" }}
                    >
                        Lancer la partie
                    </button>
                    <button type="button" onClick={supprimer}>Supprimer la partie</button>
                </div>
            ) : (
                <i>Le créateur de la partie la lancera quand tout le monde sera prêt.</i>
            )}
        </div>
    );
}
