import { useEffect, useRef, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useEngine, nomElement } from "./Interaction";

// ============================================================
// ONGLET CHAT
//
// Un sous-onglet « Général » (messages à tous) et un sous-onglet
// par autre joueur (conversation privée avec lui). Un message
// privé n'est envoyé par le serveur qu'à son auteur et à son
// destinataire.
//
// Les messages arrivent avec l'interrogation périodique de la
// partie (sync.js). Le dernier message lu de chaque conversation
// est gardé par Partie.jsx (lu, marquerLu).
// ============================================================

export const GENERAL = "general";

// Conversation d'un message : « general », ou l'identifiant de l'autre joueur
export function conversationDe(message, moi) {

    if (message.a === null || message.a === undefined) {
        return GENERAL;
    }

    return String(message.auteur === moi ? message.a : message.auteur);
}

const heure = date => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Texte d'un message : un lien |123| (carte montrée par « Montrer à… »)
// devient un bouton au nom de la carte, qui l'affiche en entier
function TexteMessage({ texte }) {

    const { search } = useEngine();

    const [ouverts, setOuverts] = useState([]);

    const morceaux = String(texte).split(/\|(\d+)\|/);

    const liens = morceaux
        .filter((x, i) => i % 2 === 1)
        .map(Number)
        .map(id => ({ id, element: search.find(e => e.id === id) }))
        .filter(x => x.element);

    return (
        <>
            {morceaux.map((morceau, i) => {

                if (i % 2 === 0) {
                    return <span key={i}>{morceau}</span>;
                }

                const id = Number(morceau);
                const element = search.find(e => e.id === id);

                if (!element) {
                    return <span key={i}>|{morceau}|</span>;
                }

                const ouvert = ouverts.includes(id);

                return (
                    <button
                        key={i}
                        type="button"
                        aria-expanded={ouvert}
                        onClick={() => setOuverts(o => (ouvert ? o.filter(x => x !== id) : [...o, id]))}
                        style={{ padding: "0 6px", borderRadius: 6, fontWeight: "bold" }}
                    >
                        🂠 {nomElement(search, { type: element.type, id })} {ouvert ? "▾" : "▸"}
                    </button>
                );
            })}

            {liens.filter(x => ouverts.includes(x.id)).map(x => (
                <div key={x.id} style={{ marginTop: 4, whiteSpace: "normal" }}>
                    <LoadAndDisplay link={{ type: x.element.type, id: x.id }} />
                </div>
            ))}
        </>
    );
}

export function Chat({ messages, ecrire, lu, marquerLu }) {

    const { partie, moi, joueur, couleurDe } = useEngine();

    const [conversation, setConversation] = useState(GENERAL);
    const [texte, setTexte] = useState("");

    const autres = partie.joueurs.filter(j => j.userId !== moi);

    const visibles = messages.filter(m => conversationDe(m, moi) === conversation);
    const dernier = visibles.length ? visibles[visibles.length - 1].n : 0;

    // La conversation affichée est lue ; son dernier message reste visible
    const fin = useRef(null);

    useEffect(() => {
        marquerLu(conversation, dernier);
        fin.current?.scrollIntoView({ block: "nearest" });
    }, [conversation, dernier, marquerLu]);

    const nonLus = conv => messages.filter(m =>
        m.auteur !== moi && conversationDe(m, moi) === conv && m.n > (lu[conv] || 0)).length;

    async function envoyer(event) {

        event.preventDefault();

        const contenu = texte.trim();

        if (!contenu) {
            return;
        }

        if (await ecrire(contenu, conversation === GENERAL ? null : Number(conversation))) {
            setTexte("");
        }
    }

    const onglets = [
        [GENERAL, "Général", "#666"],
        ...autres.map(j => [String(j.userId), j.nom, couleurDe(j.userId) || "#666"]),
    ];

    return (
        <div style={{ maxWidth: 900 }}>

            {/* SOUS-ONGLETS : général, puis une conversation privée par joueur */}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {onglets.map(([cle, libelle, couleur]) => {

                    const attente = cle === conversation ? 0 : nonLus(cle);

                    return (
                        <button
                            key={cle}
                            type="button"
                            onClick={() => setConversation(cle)}
                            title={cle === GENERAL ? "Messages à tous les joueurs" : "Conversation privée avec " + libelle}
                            style={{
                                padding: "4px 12px",
                                borderRadius: 12,
                                fontWeight: conversation === cle ? "bold" : "normal",
                                border: `${conversation === cle ? 4 : 2}px solid ${couleur}`,
                                backgroundColor: attente ? "#ffe082" : undefined,
                            }}
                        >
                            {libelle}
                            {attente > 0 && (
                                <b
                                    style={{
                                        marginLeft: 6,
                                        padding: "0 6px",
                                        borderRadius: 9,
                                        backgroundColor: "#c00",
                                        color: "#fff",
                                    }}
                                >
                                    {attente}
                                </b>
                            )}
                        </button>
                    );
                })}
            </div>

            <div
                style={{
                    height: "56vh",
                    overflowY: "auto",
                    padding: 8,
                    border: "1px solid #aaa",
                    borderRadius: 8,
                    backgroundColor: conversation === GENERAL ? "#fafafa" : "#fffbe6",
                }}
            >
                {visibles.length === 0 && (
                    <i style={{ color: "#666" }}>
                        {conversation === GENERAL
                            ? "Aucun message pour l'instant."
                            : "Aucun message privé avec ce joueur. Lui seul verra ce que vous écrivez ici."}
                    </i>
                )}

                {visibles.map(m => (
                    <div
                        key={m.n}
                        style={{
                            marginBottom: 4,
                            padding: "2px 6px",
                            borderLeft: "4px solid " + (couleurDe(m.auteur) || "#999"),
                            overflowWrap: "anywhere",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        <span style={{ color: "#666", fontSize: 12 }}>{heure(m.date)} </span>
                        <b>{m.nom}</b>
                        {" : "}
                        <TexteMessage texte={m.texte} />
                    </div>
                ))}

                <div ref={fin} />
            </div>

            {joueur ? (
                <form onSubmit={envoyer} style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                        type="text"
                        value={texte}
                        maxLength={500}
                        placeholder={conversation === GENERAL
                            ? "Message à tous…"
                            : "Message privé à " + (onglets.find(o => o[0] === conversation)?.[1] || "") + "…"}
                        onChange={e => setTexte(e.target.value)}
                        style={{ flex: 1, padding: "4px 6px" }}
                    />
                    <button type="submit" disabled={!texte.trim()} style={{ fontWeight: "bold" }}>
                        Envoyer
                    </button>
                </form>
            ) : (
                <i style={{ color: "#666" }}>Seuls les joueurs de la partie peuvent écrire.</i>
            )}
        </div>
    );
}
