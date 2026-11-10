import { useEngine, BoutonRegle, agentDisponible, nomElement } from "./Interaction";
import { useElements } from "./sync";

// ============================================================
// COMBAT RÉSOLU (onglet Conflit)
//
// « Terminer le combat » ne le retire plus tout de suite : il reste
// affiché, résolu, jusqu'à la fin de la phase (compteur
// combat:<lieu> = 2 ; « Phase suivante » le remet à zéro). On y
// trouve ce qui se joue après un combat.
//
// Script Grappin de capture : use un logisticien, capture un vaisseau
// adverse détruit pendant ce combat (pas un soleil de guerre ni un
// vaisseau amiral). Les unités retirées d'un combat portent la
// marque « detruitA » (« <lieu>:<tour> ») ; le vaisseau capturé va
// dans mes éléments actifs (voir la capture, Production.jsx).
// ============================================================

const campDe = c => c.marques?.possession ?? c.proprio ?? 0;

export function CombatResolu({ lieu, compteur, titre }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, aScript } = useEngine();

    const detruites = Object.values(etat.composants).filter(c =>
        c.ref?.type === "unit" && c.marques?.detruitA === `${lieu}:${etat.tour}` &&
        /^(joueur:\d+:reserve|horsJeu)$/.test(c.zone || ""));

    const contenus = useElements([...new Set(detruites.map(c => c.ref.id))]);

    // Vaisseaux adverses que le grappin peut capturer
    const prises = detruites.filter(c => campDe(c) !== moi &&
        contenus[c.ref.id]?.mot_cle?.includes("ship") && !["sun", "fs"].includes(contenus[c.ref.id]?.type));

    const logisticien = agentDisponible({ index, moi, search }, "logisticien|g[ée]n[ée]ticien");

    return (
        <div
            data-combat-resolu={lieu}
            style={{
                padding: "8px 10px",
                border: "2px solid #777",
                borderRadius: 8,
                backgroundColor: "#eeeeee",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <b style={{ fontSize: 16 }}>{titre}</b>
                <b style={{ color: "#555" }}>Combat résolu</b>
                <span style={{ color: "#555" }}>
                    Il reste affiché jusqu'à la fin de la phase. {detruites.length} unité(s) détruite(s) pendant ce combat.
                </span>
                {joueur && (
                    <button
                        type="button"
                        data-action="retirer-combat-resolu"
                        style={{ marginLeft: "auto" }}
                        onClick={() => envoyer([{ type: "compteur", id: compteur, valeur: 0 }], "Combat résolu retiré de l'onglet Conflit")}
                    >
                        Retirer de l'onglet
                    </button>
                )}
            </div>

            {joueur && aScript(moi, "grappin-de-capture") && (
                <div data-script="grappin-de-capture" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    <b>Grappin de capture</b>
                    {prises.length === 0 && <i>aucun vaisseau adverse détruit à capturer.</i>}
                    {prises.map(c => (
                        <BoutonRegle
                            key={c.id}
                            data-action="grappin-de-capture"
                            nom={`Grappin de capture : ${nomElement(search, c.ref)} de ${campDe(c) ? nomDe(campDe(c)) : "neutres"}`}
                            obstacles={[!logisticien && "vous n'avez pas de logisticien disponible (aucun ne sera usé)"]}
                            faire={commentaire => envoyer([
                                logisticien && { type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` },
                                { type: "marquer", c: c.id, marque: "degat", valeur: 0 },
                                { type: "marquer", c: c.id, marque: "detruitA", valeur: null },
                                { type: "deplacer", c: c.id, vers: `joueur:${moi}:actif` },
                            ], commentaire)}
                            title="Si vous contrôlez le système à la fin du combat : use un logisticien, le vaisseau détruit arrive capturé dans vos éléments actifs"
                        >
                            Capturer {nomElement(search, c.ref)} ({campDe(c) ? nomDe(campDe(c)) : "neutre"})
                        </BoutonRegle>
                    ))}
                </div>
            )}
        </div>
    );
}
