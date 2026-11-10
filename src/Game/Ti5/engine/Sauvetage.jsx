import { useEngine, nomCase, distanceCases, nomElement } from "./Interaction";
import { useElements } from "./sync";

// ============================================================
// SAUVETAGE (script Capsule de secours, dans un combat du système)
//
// Quand un vaisseau détruit — pas encore retiré du jeu — porte des
// infanteries, et que son joueur a la technologie : un jet par
// infanterie (dé de 10, sauvée sur 6 ou moins), puis les arrivées
// possibles : une planète du système, ou une planète voisine qui a
// un dock. L'accord du propriétaire du dock n'est pas géré.
// ============================================================

const JET = "jetSauv";
const SEUIL = 6;

const campDe = c => c.marques?.possession ?? c.proprio ?? 0;

// navires : composants des vaisseaux détruits du combat ; planetes : rangs des planètes du système
export function Sauvetage({ numero, navires, planetes }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, aScript } = useEngine();

    // Unités portées par un vaisseau détruit dont le joueur a la technologie
    const portees = Object.values(etat.composants).filter(c =>
        !c.cache && c.ref?.type === "unit" && c.sur &&
        navires.some(n => n.id === c.sur && aScript(campDe(n), "capsule-de-secours")));

    // Planètes des systèmes voisins, et leurs unités (pour y trouver un dock)
    const voisines = [...index.parZone.keys()]
        .map(zone => /^hex:(\d+):planete:(\d+)$/.exec(zone))
        .filter(m => m && distanceCases(numero, Number(m[1])) === 1);

    const unitesDe = zone => (index.parZone.get(zone) || []).filter(c => c.ref?.type === "unit");

    const contenus = useElements([...new Set(
        [...portees, ...voisines.flatMap(m => unitesDe(m[0]))].map(c => c.ref.id)
    )]);

    const infanteries = portees.filter(c => contenus[c.ref.id]?.type === "inf");

    if (!infanteries.length) {
        return null;
    }

    const arrivees = [
        ...planetes.map(k => ({ zone: `hex:${numero}:planete:${k}`, nom: `planète ${k + 1} du système` })),
        ...voisines.flatMap(m => {
            const dock = unitesDe(m[0]).find(c => contenus[c.ref.id]?.type === "dock");

            return dock
                ? [{ zone: m[0], nom: `${nomCase(m[1])}, planète ${Number(m[2]) + 1} (dock de ${campDe(dock) ? nomDe(campDe(dock)) : "neutres"})` }]
                : [];
        }),
    ];

    return (
        <div
            data-sauvetage
            style={{
                marginBottom: 8,
                padding: "6px 10px",
                border: "2px solid #1565c0",
                borderRadius: 8,
                backgroundColor: "#e3f2fd",
                color: "#000",
                fontSize: 13,
            }}
        >
            <b>Sauvetage (Capsule de secours)</b>{" "}
            <span style={{ color: "#444" }}>
                — infanteries d'un vaisseau détruit : sauvée sur un jet de {SEUIL} ou moins, puis débarquée sur une de ces planètes.
                À faire avant de retirer le vaisseau.
            </span>

            {infanteries.map(c => {

                const jet = Number(c.marques?.[JET]) || 0;
                const aMoi = joueur && campDe(c) === moi;

                return (
                    <div key={c.id} data-infanterie={c.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
                        <b>{nomElement(search, c.ref)}</b> de {nomDe(campDe(c))}

                        {!jet && (aMoi
                            ? (
                                <button
                                    type="button"
                                    data-action="jet-sauvetage"
                                    onClick={() => envoyer(
                                        [{ type: "des", n: 1, faces: 10, c: c.id, marque: JET }],
                                        "Capsule de secours : jet de sauvetage"
                                    )}
                                >
                                    Jet de sauvetage
                                </button>
                            )
                            : <i>jet à faire</i>)}

                        {jet > SEUIL && <b style={{ color: "#b71c1c" }}>jet {jet} : perdue</b>}

                        {jet > 0 && jet <= SEUIL && (
                            <>
                                <b style={{ color: "#1b5e20" }}>jet {jet} : sauvée.</b>
                                {aMoi && arrivees.map(a => (
                                    <button
                                        key={a.zone}
                                        type="button"
                                        data-arrivee={a.zone}
                                        onClick={() => envoyer([
                                            { type: "deplacer", c: c.id, vers: a.zone },
                                            { type: "marquer", c: c.id, marque: JET, valeur: null },
                                        ], `Capsule de secours : infanterie débarquée, ${a.nom}`)}
                                    >
                                        → {a.nom}
                                    </button>
                                ))}
                                {arrivees.length === 0 && <i>aucune planète où la débarquer</i>}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
