import { useEngine, BoutonRegle, agentDisponible } from "./Interaction";
import { SAC_FRAGMENTS } from "./miseEnPlace";

// ============================================================
// SCRIPT ARCHÉOLOGIE (technologie 209)
//
//   - Fouiller une ruine (fiche d'un système) rapporte deux fragments
//     au lieu d'un — celui de la ruine, et un second tiré du sac — posés
//     dans la zone joueur:<u>:fouille : le joueur en garde un, l'autre
//     retourne dans le sac (ChoixFouille, en haut du volet de droite).
//   - Bouton du bandeau de la phase de science : la technologie et un
//     scientifique sont utilisés, un plan de relique est pioché en main.
// ============================================================

export const zoneFouille = userId => `joueur:${userId}:fouille`;

const PIOCHE_PLANS = "pioche:relique";

// Les deux fragments d'une fouille : en garder un
export function ChoixFouille() {

    const { index, envoyer, moi, joueur } = useEngine();

    const fragments = index.parZone.get(zoneFouille(moi)) || [];

    if (!joueur || !fragments.length) {
        return null;
    }

    return (
        <div
            data-choix-fouille
            style={{
                padding: "6px 8px",
                border: "2px solid #ff9800",
                borderRadius: 8,
                backgroundColor: "#fff3cd",
                color: "#000",
                fontSize: 13,
            }}
        >
            <b>Archéologie</b> : gardez un des fragments de la fouille, l'autre retourne dans le sac.
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {fragments.map(c => (
                    <button
                        key={c.id}
                        type="button"
                        data-action="garder-fragment"
                        onClick={() => envoyer([
                            { type: "deplacer", c: c.id, vers: `joueur:${moi}:fragments` },
                            ...fragments.filter(x => x.id !== c.id).map(x => ({ type: "deplacer", c: x.id, vers: SAC_FRAGMENTS })),
                        ], `Archéologie : ${c.jeton || "fragment"} gardé`)}
                    >
                        Garder : {c.jeton || "fragment"}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Bouton du bandeau de la phase de science : piocher un plan de relique
export function PiocherPlan() {

    const { etat, index, envoyer, moi, search, aScript, techDuScript } = useEngine();

    if (!aScript(moi, "archeologie")) {
        return null;
    }

    const scientifique = agentDisponible({ index, moi, search }, "scientifique");
    const utilisee = techDuScript(moi, "archeologie");
    const enPioche = (index.parZone.get(PIOCHE_PLANS) || []).length;

    return (
        <BoutonRegle
            data-action="archeologie-plan"
            nom="Archéologie : piocher un plan de relique"
            obstacles={[
                !/science/i.test(etat.phase) && "ce n'est pas la phase de science",
                utilisee && etat.compteurs[utilisee] && "la technologie est déjà utilisée ce tour",
                !scientifique && "vous n'avez pas de scientifique disponible (aucun ne sera usé)",
                !enPioche && "la pioche de plans de relique est vide (rien ne sera pioché)",
            ]}
            faire={commentaire => envoyer([
                utilisee && { type: "compteur", id: utilisee, valeur: 1 },
                scientifique && { type: "deplacer", c: scientifique.id, vers: `joueur:${moi}:agentsUses` },
                enPioche > 0 && { type: "piocher", de: PIOCHE_PLANS, vers: `joueur:${moi}:main` },
            ], commentaire)}
            title="Archéologie : utilise la technologie et un scientifique, pioche un plan de relique dans votre main"
            style={{ marginLeft: 8 }}
        >
            Archéologie : piocher un plan (use un scientifique)
        </BoutonRegle>
    );
}
