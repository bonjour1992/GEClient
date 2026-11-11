import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import { getElement, updateElement } from "../../../lib/fetch";
import { useSearch } from "../../../lib/store";
import { getHandler } from "../../games";
import { nameAff } from "../../../Component/Text";
import { SCRIPTS, SCRIPTS_DESACTIVES } from "./scripts";

// ============================================================
// OUTIL « SCRIPTS DE RÈGLES »   /GE/ti5/tools/scripts
//
// Liste les scripts de règles (scripts.js) : la carte à laquelle
// chacun est rattaché, la version de cette carte quand il a été
// écrit, sa version actuelle, et une case « désactivé » qui vaut
// pour toutes les parties.
//
// Les scripts désactivés sont gardés dans l'élément « reglage »
// nommé « Scripts désactivés » (créé par claude). Une partie
// ouverte en tient compte à son prochain chargement.
// ============================================================

const SORTES = {
    recrutement: "Action construite (recrutement)",
    miseEnPlace: "Mise en place d'une faction",
    bouton: "Bouton de la fiche d'une carte",
    effet: "Effet de technologie",
    revenu: "Revenu de phase (unité, planète)",
    regle: "Règle d'une unité, d'une planète ou d'une habilité",
};

// Ce que le script change à l'interface (champ mode) : [libellé, couleur]
const MODES = {
    nouveau: ["Nouveau bouton", "#bbdefb"],
    modifie: ["Bouton existant modifié", "#ffe0b2"],
    auto: ["Automatique (aucun bouton)", "#e0e0e0"],
};

const date = ms => (ms
    ? new Date(ms).toLocaleDateString("fr-FR") + " " +
        new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "—");

const cellule = { border: "1px solid #bbb", padding: "4px 8px", textAlign: "left", verticalAlign: "top" };

export default function OutilScripts() {

    const jeu = useParams().jeu;
    const search = useSearch(state => state.search);

    const reglage = search.find(e => e.type === "reglage" && e.name === SCRIPTS_DESACTIVES);

    // Élément « Scripts désactivés » (son contenu entier : il est réécrit tel quel)
    const [element, setElement] = useState(null);

    // Version actuelle de chaque carte : { id: meta.created }
    const [versions, setVersions] = useState({});
    const [message, setMessage] = useState("");

    useEffect(() => {
        useSearch.getState().update(jeu);
    }, [jeu]);

    useEffect(() => {

        let annule = false;

        if (reglage) {
            getElement(reglage.id).then(e => !annule && setElement(e)).catch(() => { });
        }

        const cartes = [...new Set(SCRIPTS.map(s => s.carte.id).filter(Boolean))];

        Promise.all(cartes.map(id => getElement(id).then(e => [id, e?.meta?.created]).catch(() => [id, null])))
            .then(liste => !annule && setVersions(Object.fromEntries(liste)));

        return () => {
            annule = true;
        };
    }, [reglage?.id]);

    const desactives = Array.isArray(element?.content?.desactives) ? element.content.desactives : [];

    async function basculer(id) {

        if (!element) {
            return;
        }

        const liste = desactives.includes(id) ? desactives.filter(x => x !== id) : [...desactives, id];
        const contenu = { ...element.content, desactives: liste };

        setMessage("Enregistrement…");

        try {
            await updateElement(element.id, { content: contenu, meta: { jeu, type: "reglage" } }, jeu);
            setElement({ ...element, content: contenu });
            setMessage("Enregistré. Les parties ouvertes en tiennent compte à leur prochain chargement.");
        } catch {
            setMessage("Enregistrement impossible.");
        }
    }

    return (
        <div style={{ padding: 10, fontFamily: "Arial, sans-serif", color: "#000", backgroundColor: "#fff" }}>

            <h2 style={{ margin: "4px 0" }}>Scripts de règles</h2>

            <p style={{ margin: "4px 0 10px", fontSize: 14, maxWidth: 900 }}>
                Un script applique, à la place du joueur, l'effet d'une carte. L'outil de partie reste
                permissif : tout peut toujours se faire à la main. Un script désactivé ici ne joue plus
                dans aucune partie. « À revoir » : la carte a changé depuis l'écriture du script.
                La colonne « Interface » dit si le script ajoute un bouton, change le comportement d'un
                bouton qui existait déjà, ou agit sans bouton — et où.
            </p>

            {!reglage && (
                <p style={{ color: "#a00" }}>
                    L'élément « {SCRIPTS_DESACTIVES} » (type Réglage) est introuvable : les scripts ne peuvent
                    pas être désactivés.
                </p>
            )}

            {message && <p style={{ color: "#1b5e20", fontWeight: "bold" }}>{message}</p>}

            <table style={{ borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                    <tr style={{ backgroundColor: "#eee" }}>
                        <th style={cellule}>Désactivé</th>
                        <th style={cellule}>Script</th>
                        <th style={cellule}>Interface</th>
                        <th style={cellule}>Carte</th>
                        <th style={cellule}>Version à l'écriture</th>
                        <th style={cellule}>Version actuelle</th>
                    </tr>
                </thead>
                <tbody>
                    {SCRIPTS.map(s => {

                        const carte = s.carte.id ? search.find(e => e.id === s.carte.id) : null;
                        const actuelle = s.carte.id ? versions[s.carte.id] : null;
                        const aRevoir = !!s.ecritLe && !!actuelle && actuelle !== s.ecritLe;

                        return (
                            <tr key={s.id} data-script={s.id} style={{ opacity: desactives.includes(s.id) ? 0.55 : 1 }}>
                                <td style={{ ...cellule, textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        disabled={!element}
                                        checked={desactives.includes(s.id)}
                                        onChange={() => basculer(s.id)}
                                    />
                                </td>
                                <td style={cellule}>
                                    <b>{s.nom}</b>
                                    <div style={{ fontSize: 12, color: "#444", maxWidth: 420 }}>{s.description}</div>
                                    <code style={{ fontSize: 11, color: "#777" }}>{s.id}</code>
                                </td>
                                <td style={{ ...cellule, maxWidth: 300 }}>
                                    <b data-mode={s.mode} style={{ padding: "0 6px", borderRadius: 8, backgroundColor: MODES[s.mode]?.[1] }}>
                                        {MODES[s.mode]?.[0] || "—"}
                                    </b>
                                    <div style={{ fontSize: 12 }}>{s.ou}</div>
                                    <div style={{ fontSize: 11, color: "#777" }}>{SORTES[s.sorte] || s.sorte}</div>
                                </td>
                                <td style={cellule}>
                                    {s.carte.id
                                        ? (
                                            <NavLink to={`/GE/${jeu}/${s.carte.type}/${s.carte.id}`}>
                                                {carte ? nameAff(carte.name) : `n° ${s.carte.id}`}
                                            </NavLink>
                                        )
                                        : <i>toutes les cartes du type</i>}
                                    <div style={{ fontSize: 12, color: "#666" }}>
                                        {getHandler(jeu, s.carte.type)?.name || s.carte.type}
                                    </div>
                                </td>
                                <td style={cellule}>{date(s.ecritLe)}</td>
                                <td style={{ ...cellule, backgroundColor: aRevoir ? "#fff3cd" : undefined }}>
                                    {s.carte.id ? date(actuelle) : "—"}
                                    {aRevoir && <b style={{ color: "#a15c00" }}> — à revoir</b>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
