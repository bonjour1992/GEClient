import { useEffect, useRef, useState } from "react";
import { fetchAPI } from "../../../lib/fetch";
import { useEngine } from "./Interaction";

// ============================================================
// ONGLET NOTES : prise de notes libre, privée à chaque joueur
//
// La note est gardée par le serveur (collection partieNote,
// routes GET / PUT /partie/:id/note), hors de l'état de la
// partie : seul son auteur la lit, rien n'est noté au journal.
// Enregistrée automatiquement peu après la frappe.
// ============================================================

const DELAI = 1200;
const LONGUEUR = 20000;

const heure = date => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function Notes() {

    const { partie, joueur } = useEngine();

    // null : pas encore chargée
    const [texte, setTexte] = useState(null);
    const [etat, setEtat] = useState("");

    const minuteur = useRef(null);
    const dernier = useRef(null);

    useEffect(() => {

        if (!joueur) {
            return;
        }

        let annule = false;

        fetchAPI(`partie/${partie.id}/note`, "GET").then(r => {
            if (annule) {
                return;
            }

            if (r?.error) {
                setEtat("Lecture impossible : " + r.error);
                setTexte("");
                return;
            }

            dernier.current = r?.texte ?? "";
            setTexte(r?.texte ?? "");
            setEtat(r?.date ? "Enregistrée à " + heure(r.date) : "");
        });

        return () => {
            annule = true;
        };

    }, [partie.id, joueur]);

    async function enregistrer(valeur) {

        clearTimeout(minuteur.current);

        if (valeur === dernier.current) {
            return;
        }

        setEtat("Enregistrement…");

        try {
            const r = await fetchAPI(`partie/${partie.id}/note`, "PUT", { texte: valeur });

            if (r?.error) {
                setEtat("Non enregistrée : " + r.error);
                return;
            }

            dernier.current = valeur;
            setEtat("Enregistrée à " + heure(r?.date || Date.now()));
        } catch {
            setEtat("Non enregistrée : connexion au serveur impossible");
        }
    }

    // Enregistre ce qui reste à enregistrer en quittant l'onglet
    const enAttente = useRef(null);
    enAttente.current = texte;

    useEffect(() => () => {
        if (enAttente.current !== null && enAttente.current !== dernier.current) {
            enregistrer(enAttente.current);
        }
    // (au démontage seulement)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!joueur) {
        return <i style={{ color: "#666" }}>Les notes sont réservées aux joueurs de la partie.</i>;
    }

    if (texte === null) {
        return <div>Chargement de vos notes…</div>;
    }

    return (
        <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <b style={{ fontSize: 16 }}>Mes notes</b>
                <span style={{ color: "#666", fontSize: 13 }}>Privées : vous seul les voyez.</span>
                <span style={{ marginLeft: "auto", color: /Non|impossible/.test(etat) ? "#c00" : "#1b5e20", fontSize: 13 }}>
                    {etat}
                </span>
            </div>

            <textarea
                value={texte}
                maxLength={LONGUEUR}
                aria-label="Mes notes"
                placeholder="Vos notes sur la partie…"
                onChange={e => {
                    const valeur = e.target.value;

                    setTexte(valeur);
                    setEtat("Modifiée…");
                    clearTimeout(minuteur.current);
                    minuteur.current = setTimeout(() => enregistrer(valeur), DELAI);
                }}
                onBlur={() => enregistrer(texte)}
                style={{
                    minHeight: "60vh",
                    padding: 8,
                    fontFamily: "Arial, sans-serif",
                    fontSize: 14,
                    lineHeight: 1.4,
                    resize: "vertical",
                    border: "1px solid #aaa",
                    borderRadius: 8,
                    backgroundColor: "#fffef5",
                }}
            />
            <span style={{ color: "#666", fontSize: 12 }}>{texte.length} / {LONGUEUR} caractères</span>
        </div>
    );
}
