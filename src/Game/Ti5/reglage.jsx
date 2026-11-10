import { ElementContent } from "../../lib/datatype";
import FormBase from "../../Input/FormBase";

// ============================================================
// RÉGLAGE
//
// Un réglage du jeu gardé avec ses données : il vaut pour toutes
// les parties. Aujourd'hui un seul, « Scripts désactivés » : la
// liste des scripts de règles hors service (engine/scripts.js).
// Il se règle dans l'outil « Scripts de règles », pas ici.
// ============================================================

class Reglage extends ElementContent {
    // Identifiants des scripts désactivés
    desactives = []
}

function Display({ content }) {

    const liste = Array.isArray(content?.desactives) ? content.desactives : [];

    return (
        <div style={{ padding: 8, border: "1px solid #aaa", borderRadius: 8, backgroundColor: "#f5f5f5", color: "#000", maxWidth: 480 }}>
            <b>{content?.name}</b>
            <div style={{ fontSize: 13, marginTop: 4 }}>
                {liste.length
                    ? "Scripts désactivés : " + liste.join(", ")
                    : "Aucun script désactivé."}
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                Se règle dans l'outil « Scripts de règles ».
            </div>
        </div>
    );
}

function Form({ content, onChange, onSubmit, style }) {
    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <p>Ce réglage se modifie dans l'outil « Scripts de règles ».</p>
        </FormBase>
    );
}

export default { name: "Réglage", classe: Reglage, form: Form, display: { default: Display } };
