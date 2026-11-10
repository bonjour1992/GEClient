import { useState } from "react";
import { useEngine, nomElement } from "./Interaction";
import { TYPES_PIOCHE, SAC, PIOCHE_TUILES, TUILES_PIOCHEES, RESERVE_TUILES } from "./miseEnPlace";

// ============================================================
// ENVOYER UN ÉLÉMENT AILLEURS, MONTRER UNE CARTE
//
//   EnvoyerVers : bouton « Envoyer vers… » et sa fenêtre, qui
//                 liste les destinations possibles d'un composant
//                 (fiche d'un composant, fiche d'un système), ou d'un
//                 élément pas encore en jeu (lien : faction neutre,
//                 feuille de technologie), qui y est alors créé.
//   MontrerA    : envoie dans le chat privé d'un joueur un lien
//                 vers une carte qu'il ne voit pas (|id|).
// ============================================================

// Zone libre de la réserve (plateau général) : une pile où l'on pose
// n'importe quel élément
export const ZONE_LIBRE = "general:libre";

const DESTINATIONS_GENERALES = [
    ["general:table", "Table"],
    [ZONE_LIBRE, "Zone libre (réserve)"],
];

// Destinations d'un composant, par groupe : [[titre, [[zone, libellé]]]]
export function destinationsDe(c, { moi, partie }) {

    const type = c.ref?.type;

    const groupes = [
        ["Moi", [
            [`joueur:${moi}:main`, "Ma main"],
            [`joueur:${moi}:reserve`, "Ma réserve"],
            [`joueur:${moi}:actif`, "Mes éléments actifs"],
            [`joueur:${moi}:agents`, "Mes agents"],
            [`joueur:${moi}:agentsUses`, "Mes agents usés"],
        ]],
        ["Autres joueurs", partie.joueurs
            .filter(j => j.userId !== moi)
            .flatMap(j => [
                [`joueur:${j.userId}:main`, "Main de " + j.nom],
                [`joueur:${j.userId}:actif`, "Éléments actifs de " + j.nom],
            ])],
        ["Plateau général", DESTINATIONS_GENERALES],
    ];

    if (TYPES_PIOCHE.includes(type)) {
        groupes.push(["Pioche", [["defausse:" + type, "Défausse"], ["pioche:" + type, "Dessus de la pioche"]]]);
    }

    // Tuiles système : pioche, tuiles piochées, réserve des tuiles spéciales
    if (type === "system") {
        groupes.push(["Tuiles", [
            [TUILES_PIOCHEES, "Tuiles piochées"],
            [RESERVE_TUILES, "Réserve de tuiles spéciales"],
            [PIOCHE_TUILES, "Dessus de la pioche de tuiles"],
        ]]);
    }

    // Feuilles de technologie : l'onglet Technologie de chaque joueur
    if (type === "techsheet") {
        groupes.push(["Technologies", partie.joueurs.map(j => [
            `joueur:${j.userId}:tech`,
            j.userId === moi ? "Mes technologies" : "Technologies de " + j.nom,
        ])]);
    }

    // Agents et cubes retournent dans le sac
    if (type === "agent" || !c.ref) {
        groupes.push(["Agents", [[SAC, "Sac d'agents"], ["general:agents", "Réserve d'agents"]]]);
    }

    return groupes
        .map(([titre, liste]) => [titre, liste.filter(([zone]) => zone !== c.zone || c.sur)])
        .filter(([, liste]) => liste.length);
}

// c        : composant à déplacer
// lien     : sinon, élément à créer dans la zone choisie (il appartient au
//            joueur dont c'est une zone)
// surEnvoi : remplace l'envoi par défaut (zone) => ...
export function EnvoyerVers({ c: composant, lien, surEnvoi, apres, libelle = "Envoyer vers…" }) {

    const ctx = useEngine();
    const { jouer, moi, nomDe, search, joueur } = ctx;

    const [ouvert, setOuvert] = useState(false);

    // Élément pas encore en jeu : un composant fictif, nulle part
    const c = composant || (lien ? { ref: lien, zone: null } : null);

    if (!c || c.cache || (!composant && !joueur)) {
        return null;
    }

    function envoyer(zone) {

        // Vers la main d'un autre : on ne pourra pas la reprendre soi-même
        const autre = /^joueur:(\d+):main$/.exec(zone);

        if (autre && Number(autre[1]) !== moi &&
            !window.confirm(`Donner cet élément à ${nomDe(Number(autre[1]))} ? Il ira dans sa main, que vous ne voyez pas.`)) {
            return;
        }

        if (surEnvoi) {
            surEnvoi(zone);
        } else if (composant) {
            jouer({ type: "deplacer", c: c.id, vers: zone });
        } else {
            jouer({
                type: "creer",
                ref: { type: lien.type, id: lien.id },
                zone,
                proprio: Number(/^joueur:(\d+):/.exec(zone)?.[1]) || undefined,
            });
        }

        setOuvert(false);
        apres?.();
    }

    const nom = c.ref ? nomElement(search, c.ref) : c.jeton;

    return (
        <>
            <button type="button" onClick={() => setOuvert(true)}>{libelle}</button>

            {ouvert && (
                <div
                    onClick={event => {
                        event.stopPropagation();
                        setOuvert(false);
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9500,
                        backgroundColor: "#0006",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: 80,
                    }}
                >
                    <div
                        role="dialog"
                        aria-label={"Envoyer " + nom}
                        onClick={event => event.stopPropagation()}
                        style={{
                            maxWidth: "min(720px, 92vw)",
                            maxHeight: "80vh",
                            overflow: "auto",
                            padding: 12,
                            backgroundColor: "#fff",
                            color: "#000",
                            border: "3px solid #444",
                            borderRadius: 10,
                            fontFamily: "Arial, sans-serif",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <b style={{ fontSize: 16 }}>Envoyer « {nom} » vers…</b>
                            <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "auto" }}>
                                Annuler
                            </button>
                        </div>

                        {destinationsDe(c, ctx).map(([titre, liste]) => (
                            <div key={titre} style={{ marginBottom: 8 }}>
                                <div style={{ fontWeight: "bold", fontSize: 13, color: "#555", marginBottom: 3 }}>{titre}</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                    {liste.map(([zone, texte]) => (
                                        <button key={zone} type="button" onClick={() => envoyer(zone)}>
                                            {texte}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// Montrer une carte à un autre joueur : un lien |id| dans notre
// conversation privée (onglet Chat), que lui seul reçoit
export function MontrerA({ lien }) {

    const { partie, moi, ecrire, joueur } = useEngine();

    const [montree, setMontree] = useState("");

    const autres = partie.joueurs.filter(j => j.userId !== moi);

    if (!joueur || !lien?.id || !autres.length || !ecrire) {
        return null;
    }

    async function montrer(userId) {

        const j = autres.find(x => x.userId === userId);

        if (await ecrire(`Je vous montre une carte : |${lien.id}|`, userId)) {
            setMontree(j?.nom || "");
        }
    }

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <select
                value=""
                title="Envoie un lien vers cette carte dans votre conversation privée avec ce joueur"
                onChange={e => e.target.value && montrer(Number(e.target.value))}
            >
                <option value="">Montrer à…</option>
                {autres.map(j => (
                    <option key={j.userId} value={j.userId}>{j.nom}</option>
                ))}
            </select>
            {montree && <span style={{ color: "#1b5e20" }}>✔ montrée à {montree} (chat privé)</span>}
        </span>
    );
}
