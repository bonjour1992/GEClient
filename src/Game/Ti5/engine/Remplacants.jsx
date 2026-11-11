import { useEngine, nomElement, remplacantsDisponibles, estCarteRemplacant } from "./Interaction";
import { useElement, useElements } from "./sync";

// ============================================================
// RÉSERVE D'AGENTS : TYPES À ZÉRO ET REMPLAÇANTS
//
// Sous « Mes agents » (volet de droite de la partie) :
//
//   - un cube en pointillé pour chaque type d'agent de ma feuille
//     dont il ne me reste aucun agent disponible : le type reste
//     ainsi visible, et on peut y déposer un remplaçant ;
//   - la liste de mes remplaçants : « ■ Suffi An → Logisticien ».
//
// Un remplaçant est une carte de mes éléments actifs (mercenaire
// « utilisable comme » un agent, relique Noble cryogénisé) dont la
// marque « comme » porte le type d'agent. On la pose en glissant le
// cube noir du mercenaire (ou la carte elle-même) sur un type d'agent
// de ma réserve ou de ma feuille (Interaction.jsx). Dès qu'un agent
// de ce type est utilisé ou dépensé, une fenêtre demande qui agit :
// l'agent de base ou le remplaçant (choisirRemplacants).
//
// Les cubes portent data-agent-type="<id du type d'agent>".
// ============================================================

export function ReserveAgents() {

    const { index, moi, joueur, factionDe, search, jouer, envoyer } = useEngine();

    const faction = useElement(factionDe(moi) ?? -1);
    const types = (faction?.agents || []).map(lien => Number(lien?.id)).filter(id => id > 0);
    const contenus = useElements(types);

    if (!joueur) {
        return null;
    }

    const stock = index.parZone.get(`joueur:${moi}:agents`) || [];
    const absents = types.filter(id => !stock.some(c => c.ref?.type === "agent" && c.ref.id === id));

    const cartes = (index.parZone.get(`joueur:${moi}:actif`) || [])
        .filter(c => estCarteRemplacant(c) && c.marques?.comme);

    const nomType = id => nomElement(search, { type: "agent", id });

    // Remplaçant disponible pour ce type (ou null) : un clic sur le cube à zéro l'utilise
    const remplacant = id => remplacantsDisponibles({ index, moi, search },
        nom => nom.toLowerCase() === nomType(id).toLowerCase())[0] || null;

    if (!absents.length && !cartes.length) {
        return null;
    }

    return (
        <div data-reserve-agents style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 3 }}>

            {absents.map(id => {

                const r = remplacant(id);

                return (
                    <span
                        key={id}
                        data-agent-type={id}
                        data-nom={nomType(id)}
                        title={`${nomType(id)} ×0` + (r
                            ? ` — clic : utiliser ${nomElement(search, r.ref)} à sa place`
                            : " — glisser ici le cube noir d'un mercenaire « utilisable comme » cet agent")}
                        onClick={r
                            ? () => jouer({ type: "deplacer", c: r.id, vers: `joueur:${moi}:agentsUses` })
                            : undefined}
                        style={{ display: "inline-flex", alignItems: "center", gap: 1, cursor: r ? "pointer" : "default" }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                width: 18,
                                height: 18,
                                boxSizing: "border-box",
                                backgroundColor: contenus[id]?.color || "#999",
                                border: "2px dashed #222",
                                borderRadius: 3,
                                opacity: 0.45,
                            }}
                        />
                        <b style={{ padding: "0 3px", borderRadius: 6, backgroundColor: "#fff", color: "#000", fontSize: 11 }}>0</b>
                    </span>
                );
            })}

            {cartes.map(c => (
                <span
                    key={c.id}
                    data-remplacant={c.id}
                    title={`${nomElement(search, c.ref)} s'utilise comme ${nomType(Number(c.marques.comme))}` +
                        (c.marques?.use ? " (usé)" : "") + " — × : ne plus l'utiliser comme agent"}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "0 4px",
                        border: "1px solid #999",
                        borderRadius: 8,
                        backgroundColor: "#fff",
                        fontSize: 11,
                        opacity: c.marques?.use ? 0.5 : 1,
                    }}
                >
                    <span style={{ display: "inline-block", width: 10, height: 10, backgroundColor: "#000", borderRadius: 2 }} />
                    {nomElement(search, c.ref)} → {nomType(Number(c.marques.comme))}
                    <button
                        type="button"
                        data-action="retirer-remplacant"
                        onClick={() => envoyer(
                            [{ type: "marquer", c: c.id, marque: "comme", valeur: null }],
                            `${nomElement(search, c.ref)} n'est plus utilisable comme ${nomType(Number(c.marques.comme))}`
                        )}
                        style={{ padding: "0 3px", lineHeight: 1, fontSize: 11 }}
                    >
                        ×
                    </button>
                </span>
            ))}
        </div>
    );
}
