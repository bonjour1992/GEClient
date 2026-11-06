import { useState } from "react";
import { useEngine } from "./Interaction";
import { useElement } from "./sync";
import { FAVEUR } from "./miseEnPlace";

// ============================================================
// ONGLET FAVEURS : encaisser les faveurs (phase d'événement)
//
// Aux tours où le déroulé le prévoit (ligne « Faveur » : nombre
// d'encaissements du tour), chaque joueur choisit en secret les
// faveurs qu'il dépense — une par faction au plus — et valide
// (action « engager ») : son choix est scellé sur le serveur
// (etat.secrets, que lui seul reçoit) et le compteur
// joueur:<u>:faveursValide passe à 1. Les faveurs ne bougent pas :
// les autres ne voient ni combien ni lesquelles sont choisies.
//
// Quand tous ont validé, le serveur compte (action « encaisser ») :
// 1 point par faveur dépensée, 2 points de plus à celui qui en
// dépense le plus (1 chacun en cas d'égalité). Le compteur
// faveurs:<tour> compte les encaissements faits.
//
// Tant qu'il en reste à faire, on ne peut pas quitter la phase.
// ============================================================

const estEvenement = phase => /[ée]v[ée]nement/i.test(phase || "");

// Encaissements prévus et faits ce tour : { prevus, faits, attendu }
export function faveursDuTour(etat, deroule) {

    const prevus = Number(deroule?.faveur?.[etat.tour - 1]) || 0;
    const faits = Number(etat.compteurs["faveurs:" + etat.tour]) || 0;

    return {
        prevus,
        faits,
        // Un encaissement est attendu à cette phase
        attendu: estEvenement(etat.phase) && faits < prevus,
    };
}

export function Faveurs() {

    const { etat, index, envoyer, joueur, moi, partie, nomDe, couleurDe } = useEngine();

    const deroule = useElement(etat.references?.deroule);
    const { prevus, faits, attendu } = faveursDuTour(etat, deroule);

    // Factions (joueurs) dont je dépense une faveur
    const [choix, setChoix] = useState([]);

    const joueurs = partie.joueurs;
    const jeJoue = joueur && joueurs.some(j => j.userId === moi);

    const aValide = u => !!etat.compteurs[`joueur:${u}:faveursValide`];
    const tousValides = joueurs.every(j => aValide(j.userId));

    const mesFaveurs = (index.parZone.get(`joueur:${moi}:faveurs`) || [])
        .filter(c => !c.cache && !c.ref && c.jeton === FAVEUR);

    // Mon choix scellé (le serveur ne l'envoie qu'à moi)
    const engagees = etat.secrets?.[moi]?.faveurs || [];

    // Mes faveurs par faction qui les a émises
    const parFaction = [...new Set(mesFaveurs.map(c => c.proprio))];

    function valider() {

        // Une faveur de chaque faction choisie
        const faveurs = choix
            .map(u => mesFaveurs.find(c => c.proprio === u))
            .filter(Boolean)
            .map(c => c.id);

        const dernier = joueurs.every(j => j.userId === moi || aValide(j.userId));

        envoyer([
            { type: "engager", faveurs },
            // Je suis le dernier attendu : le serveur compte tout de suite
            dernier && { type: "encaisser" },
        ].filter(Boolean), dernier ? "Encaissement des faveurs" : "");

        setChoix([]);
    }

    // Revenir sur son choix, tant que tout le monde n'a pas validé
    function annuler() {
        envoyer([{ type: "engager", annuler: true }], "");
    }

    return (
        <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 8 }}>

            <div style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 8, backgroundColor: "#f5f5f5" }}>
                <b style={{ fontSize: 16 }}>Encaisser les faveurs — tour {etat.tour}</b>
                <div>
                    {prevus === 0
                        ? "Le déroulé ne prévoit pas d'encaissement ce tour."
                        : `Encaissements du tour : ${faits} fait${faits > 1 ? "s" : ""} sur ${prevus}.`}
                    {prevus > 0 && !estEvenement(etat.phase) && " L'encaissement a lieu à la phase d'événement."}
                </div>
                <div style={{ fontSize: 13, color: "#444" }}>
                    Chacun choisit en secret les faveurs qu'il dépense, une par faction au plus. Chaque faveur
                    dépensée rapporte 1 point ; celui qui en dépense le plus gagne 2 points de plus (1 chacun
                    en cas d'égalité).
                </div>
            </div>

            {attendu && (
                <>
                    {/* Qui a validé */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {joueurs.map(j => (
                            <span
                                key={j.userId}
                                style={{
                                    padding: "1px 10px",
                                    borderRadius: 10,
                                    border: "2px solid " + (couleurDe(j.userId) || "#888"),
                                    backgroundColor: aValide(j.userId) ? "#c8e6c9" : "#fff",
                                }}
                            >
                                {j.nom} : {aValide(j.userId) ? "✔ a validé" : "choisit…"}
                            </span>
                        ))}
                    </div>

                    {jeJoue && !aValide(moi) && (
                        <div style={{ padding: 8, border: "1px solid #aaa", borderRadius: 8 }}>
                            <b>Mes faveurs à dépenser</b>

                            {parFaction.length === 0 && (
                                <div style={{ color: "#666" }}>Vous n'avez aucune faveur : validez pour continuer.</div>
                            )}

                            {parFaction.map(u => (
                                <label key={u} style={{ display: "block", margin: "3px 0" }}>
                                    <input
                                        type="checkbox"
                                        checked={choix.includes(u)}
                                        onChange={e => setChoix(c => (e.target.checked
                                            ? [...c, u]
                                            : c.filter(x => x !== u)))}
                                    />{" "}
                                    <span
                                        style={{
                                            padding: "0 8px",
                                            borderRadius: 8,
                                            border: "2px solid " + (couleurDe(u) || "#888"),
                                        }}
                                    >
                                        une faveur de {nomDe(u)}
                                    </span>
                                    <span style={{ color: "#666" }}>
                                        {" "}(vous en avez {mesFaveurs.filter(c => c.proprio === u).length})
                                    </span>
                                </label>
                            ))}

                            <button
                                type="button"
                                onClick={valider}
                                style={{ marginTop: 6, fontWeight: "bold", padding: "5px 14px", backgroundColor: "#ffe082" }}
                            >
                                Valider ({choix.length} faveur{choix.length > 1 ? "s" : ""})
                            </button>
                        </div>
                    )}

                    {jeJoue && aValide(moi) && (
                        <div style={{ padding: 8, border: "1px solid #aaa", borderRadius: 8 }}>
                            <b>Vous avez validé : {engagees.length} faveur{engagees.length > 1 ? "s" : ""} dépensée{engagees.length > 1 ? "s" : ""}.</b>
                            {" "}
                            {!tousValides && (
                                <button type="button" onClick={annuler}>Revenir sur mon choix</button>
                            )}
                        </div>
                    )}

                    {/* Tous ont validé mais rien n'est parti (deux validations en même temps) */}
                    {joueur && tousValides && (
                        <button
                            type="button"
                            style={{ fontWeight: "bold", alignSelf: "flex-start" }}
                            onClick={() => envoyer([{ type: "encaisser" }], "Encaissement des faveurs")}
                        >
                            Compter les faveurs
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
