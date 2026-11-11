import { useEffect, useRef, useState } from "react";
import { useEngine } from "./Interaction";
import { combatsActifs, aDesUnites } from "./Combat";
import { passagesEnCours } from "./Blocage";
import { controlesEnCours, accordsEnCours } from "./Controle";

// ============================================================
// NOTIFICATIONS DU NAVIGATEUR (case à cocher de l'en-tête)
//
// Cochée, la case demande au navigateur le droit de notifier, puis
// prévient le joueur quand quelque chose l'attend dans la partie :
//
//   - c'est son tour (il devient le joueur actif) ;
//   - un combat s'ouvre là où il a des unités ;
//   - un déplacement est arrêté sur une case où il a des unités
//     (blocage : bloquer, aider ou s'abstenir) ;
//   - un conflit de contrôle s'ouvre sur une planète où il a des unités ;
//   - une revendication demande son accord (il a des unités dans le système).
//
// Rien n'est notifié tant que la page de la partie est au premier
// plan : la notification sert quand on regarde ailleurs. Le choix
// est gardé dans le navigateur (il vaut pour toutes les parties).
// ============================================================

const CLE = "ge-engine-notifications";

const lire = () => {
    try {
        return localStorage.getItem(CLE) === "1";
    } catch {
        return false;
    }
};

const ecrire = valeur => {
    try {
        localStorage.setItem(CLE, valeur ? "1" : "0");
    } catch {
        // préférence non enregistrée
    }
};

export function Notifications() {

    const { etat, index, moi, joueur, partie, nomDe, signaler } = useEngine();

    const disponible = typeof window !== "undefined" && "Notification" in window;

    const [actif, setActif] = useState(() => lire() && disponible && Notification.permission === "granted");

    // Ce qui m'attend : { clé : message }
    const attentes = {};

    if (joueur) {

        if (etat.joueurActif === moi) {
            attentes[`tour:${etat.tour}:${etat.phase}`] = `C'est votre tour${etat.phase ? ` (${etat.phase})` : ""}.`;
        }

        for (const lieu of combatsActifs(etat)) {
            if (aDesUnites(index, lieu, moi)) {
                attentes["combat:" + lieu] = "Un combat est ouvert là où vous avez des unités.";
            }
        }

        for (const p of passagesEnCours(etat)) {
            if (p.mover !== moi && aDesUnites(index, String(p.numero), moi)) {
                attentes["blocage:" + p.cle] =
                    `${nomDe(p.mover)} traverse un système où vous avez des unités : bloquer, aider ou vous abstenir.`;
            }
        }

        for (const a of accordsEnCours(etat)) {
            if (a.demandeur !== moi && (aDesUnites(index, String(a.numero), moi) || aDesUnites(index, `${a.numero}p${a.k}`, moi))) {
                attentes["accord:" + a.cle] =
                    `${nomDe(a.demandeur)} veut revendiquer une planète d'un système où vous avez des unités : accepter ou refuser.`;
            }
        }

        for (const c of controlesEnCours(etat)) {
            if (c.demandeur !== moi && aDesUnites(index, `${c.numero}p${c.k}`, moi)) {
                attentes["controle:" + c.cle] =
                    `${nomDe(c.demandeur)} veut prendre possession d'une planète où vous avez des unités.`;
            }
        }
    }

    const signature = Object.keys(attentes).sort().join("|");

    // Attentes déjà connues : seule une attente nouvelle est notifiée
    const connues = useRef(null);

    useEffect(() => {

        const cles = Object.keys(attentes);
        const nouvelles = connues.current === null ? [] : cles.filter(k => !connues.current.has(k));

        connues.current = new Set(cles);

        // (page au premier plan : le joueur voit déjà la partie)
        if (!actif || (document.visibilityState === "visible" && document.hasFocus())) {
            return;
        }

        for (const k of nouvelles) {
            try {
                new Notification(partie.nom, { body: attentes[k], tag: `ge-partie-${partie.id}-${k}` });
            } catch {
                // notification impossible dans ce navigateur
            }
        }
    }, [signature, actif]);

    async function basculer() {

        if (actif) {
            setActif(false);
            ecrire(false);
            return;
        }

        if (!disponible || window.isSecureContext === false) {
            signaler("Les notifications du navigateur ne sont pas disponibles ici (il faut une adresse en https, ou localhost).");
            return;
        }

        const permission = Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        if (permission !== "granted") {
            signaler("Notifications refusées par le navigateur : autorisez-les pour ce site dans ses réglages, puis cochez de nouveau.");
            return;
        }

        ecrire(true);
        setActif(true);

        try {
            new Notification(partie.nom, {
                body: "Notifications activées : vous serez prévenu quand ce sera votre tour ou qu'un conflit vous attendra.",
                tag: `ge-partie-${partie.id}-activation`,
            });
        } catch {
            // notification impossible dans ce navigateur
        }
    }

    return (
        <label
            data-notifications={actif ? "oui" : "non"}
            title="Notifications du navigateur quand c'est votre tour, ou qu'un conflit (combat, blocage, contrôle) où vous avez des unités s'ouvre — seulement quand cette page n'est pas au premier plan"
            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13, whiteSpace: "nowrap" }}
        >
            <input type="checkbox" checked={actif} onChange={basculer} />
            🔔 Notifications
        </label>
    );
}
