import { useEngine, BoutonRegle, nomElement, tuileDe } from "./Interaction";
import { contenuEnCache, useElements } from "./sync";
import { possesseurActuel, etatDuControle } from "./Controle";
import { decompte, actionsPointsA, cleDecompte } from "./regleDecompte";

// ============================================================
// DÉCOMPTE DES POINTS
//
// Phase de décompte (tour 10, ou fin de partie déclenchée par un
// événement) : le cadre s'affiche en tête de la partie. Pour chaque
// faction : ses points sur la piste, ce que le décompte ajoute ou
// retire ligne par ligne (regleDecompte.js), le total, et le
// départage (commerce, influence, ressources). Chaque joueur marque
// ses propres points du décompte : « Marquer mes points du
// décompte » déplace son marqueur sur la piste Points (une fois).
//
// Hors de cette phase, le même cadre est un aperçu replié du
// Plateau général : « si la partie finissait maintenant ».
//
//   apercu : cadre replié (Plateau général)
// ============================================================

export const estPhaseDecompte = etat => /d[ée]compte/i.test(etat?.phase || "");

export function Decompte({ apercu = false }) {

    const { etat, index, moi, joueur, partie, nomDe, couleurDe, search, envoyer, aScript, factionDe, feuillesDe, scriptsDesactives } = useEngine();

    const joueurs = partie.joueurs.map(j => j.userId);

    // Feuilles de technologie (leur texte dit les points par niveau) et factions (système natal)
    const idsFeuilles = [...new Set(joueurs.flatMap(u => feuillesDe(u).map(f => f.id)))];
    const contenus = useElements([...idsFeuilles, ...joueurs.map(factionDe).filter(id => id > 0)]);

    // (script « decompte-des-points » désactivé : le décompte se fait à la main)
    if ((!apercu && !estPhaseDecompte(etat)) || scriptsDesactives.includes("decompte-des-points")) {
        return null;
    }

    // Possesseur de la planète d'une zone « hex:<case>:planete:<k> »
    const possesseurDe = zone => {
        const m = /^hex:(\d+):planete:(\d+)$/.exec(zone || "");
        const idPlanete = m ? Number(contenuEnCache(tuileDe(index, Number(m[1]))?.ref?.id)?.elems?.[Number(m[2])]?.id) || -1 : -1;

        return idPlanete > 0 ? possesseurActuel(etat, idPlanete) : null;
    };

    // Contrôle de son système natal par un joueur (Spectre de l'empereur)
    const controleNatal = u => {
        const idSysteme = Number(contenus[factionDe(u)]?.system?.id) || -1;
        const tuile = Object.values(etat.composants).find(c => !c.cache && c.ref?.type === "system" && c.ref.id === idSysteme && /^hex:\d+$/.test(c.zone || ""));

        return tuile ? etatDuControle({ etat, index, aScript }, u, Number(tuile.zone.slice(4))) : null;
    };

    const resultat = decompte({
        etat, index, joueurs,
        contenuDe: id => contenus[id] || contenuEnCache(id),
        feuillesDe,
        nomDe: ref => nomElement(search, ref),
        possesseurDe,
        controleNatal,
    });

    const compteur = (u, cle) => Number(etat.compteurs[`joueur:${u}:${cle}`]) || 0;

    // Classement : total, puis départage au commerce, à l'influence, aux ressources
    const classes = [...joueurs].sort((a, b) =>
        resultat.parJoueur[b].total - resultat.parJoueur[a].total ||
        compteur(b, "commerce") - compteur(a, "commerce") || compteur(b, "inf") - compteur(a, "inf") || compteur(b, "res") - compteur(a, "res"));

    const signe = n => (n > 0 ? "+" + n : String(n));
    const mien = resultat.parJoueur[moi];

    const cadre = (
        <div
            data-decompte
            style={{
                marginBottom: 8, padding: "6px 10px", border: "2px solid #4a148c", borderRadius: 8,
                backgroundColor: "#fff", color: "#000", fontFamily: "Arial, sans-serif", fontSize: 13,
            }}
        >
            {!apercu && <b style={{ fontSize: 14 }}>Décompte des points</b>}

            <table style={{ borderCollapse: "collapse", marginTop: 4 }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #999" }}>
                        <th style={{ padding: "2px 8px" }}>Faction</th>
                        <th style={{ padding: "2px 8px" }}>Piste</th>
                        <th style={{ padding: "2px 8px" }}>Décompte</th>
                        <th style={{ padding: "2px 8px" }}>Total</th>
                        <th style={{ padding: "2px 8px" }} title="Départage : commerce, puis influence, puis ressources">Com. / Inf. / Res.</th>
                        <th style={{ padding: "2px 8px" }}>Détail</th>
                    </tr>
                </thead>
                <tbody>
                    {classes.map((u, rang) => {

                        const d = resultat.parJoueur[u];

                        return (
                            <tr key={u} data-decompte-joueur={u} style={{ verticalAlign: "top", borderBottom: "1px solid #ddd" }}>
                                <td style={{ padding: "2px 8px", fontWeight: "bold", color: couleurDe(u) || undefined }}>
                                    {rang + 1}. {nomDe(u)}
                                </td>
                                <td style={{ padding: "2px 8px" }}>{d.piste}</td>
                                <td style={{ padding: "2px 8px" }}>
                                    {d.marque !== null ? `${signe(d.marque)} (marqué)` : signe(d.gains)}
                                </td>
                                <td data-decompte-total style={{ padding: "2px 8px", fontWeight: "bold" }}>{d.total}</td>
                                <td style={{ padding: "2px 8px" }}>
                                    {compteur(u, "commerce")} / {compteur(u, "inf")} / {compteur(u, "res")}
                                </td>
                                <td style={{ padding: "2px 8px", fontSize: 12, color: "#333" }}>
                                    {d.lignes.length === 0 && <i>rien au décompte</i>}
                                    {d.lignes.map((l, k) => (
                                        <div key={k}>
                                            {l.libelle} : <b>{signe(l.points)}</b>{l.note && <span style={{ color: "#666" }}> ({l.note})</span>}
                                        </div>
                                    ))}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {[...resultat.nonAttribues, ...resultat.aLaMain].map((texte, k) => (
                <div key={k} data-decompte-a-la-main style={{ marginTop: 4, color: "#b71c1c", fontSize: 12 }}>À compter à la main — {texte}</div>
            ))}

            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                {joueur && mien && (
                    <BoutonRegle
                        data-action="marquer-decompte"
                        nom="Marquer mes points du décompte"
                        obstacles={[
                            !estPhaseDecompte(etat) && "ce n'est pas la phase de décompte",
                            mien.marque !== null && "vos points du décompte sont déjà marqués sur la piste",
                        ]}
                        faire={commentaire => envoyer([
                            ...actionsPointsA(etat, moi, mien.piste + mien.gains),
                            { type: "compteur", id: cleDecompte(moi), valeur: mien.gains + 1000 },
                        ], `${commentaire} : ${signe(mien.gains)} point(s), total ${Math.max(0, mien.piste + mien.gains)}`)}
                        title="Déplace votre marqueur de la piste Points du montant de votre décompte (une seule fois)"
                    >
                        Marquer mes points du décompte ({signe(mien.gains)})
                    </BoutonRegle>
                )}
                <span style={{ fontSize: 12, color: "#555" }}>
                    Les points gagnés pendant la partie sont déjà sur la piste. Ce que l'outil ne compte pas s'ajuste avec le « + » de la piste Points.
                </span>
            </div>
        </div>
    );

    return apercu
        ? (
            <details data-decompte-apercu style={{ marginBottom: 8 }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Décompte des points — aperçu, si la partie finissait maintenant</summary>
                {cadre}
            </details>
        )
        : cadre;
}
