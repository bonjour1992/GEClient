import { useState } from "react";
import { useEngine, BoutonRegle, agentDisponible, nomElement } from "./Interaction";
import { useElement, contenuEnCache } from "./sync";
import { DETTE } from "./miseEnPlace";

// ============================================================
// LIVRAISON COMMERCIALE
//
// Une unité dont le texte porte « #livr(n) » (frégate marchande,
// fruit de vie…) livre n commerce à une autre faction qui a un
// comptoir (« #comp ») dans le même système. Le bouton est sur la
// fiche de l'unité ; s'il y a plusieurs factions à comptoir, on
// choisit.
//
// La faction livrée gagne le commerce, et mes dettes envers elle
// baissent d'autant, les plus urgentes d'abord (jetons « Dette » de
// mes cases de tour qui portent son marqueur). D'après le texte de
// l'unité, un négociant est utilisé (« #use#neg ») et l'unité
// dépensée (« #spend »).
//
// Scripts : Commerce profitable (+1 si je l'ai, +1 si la faction
// livrée l'a), Science intégrée (une fenêtre propose d'user un
// scientifique : la faction livrée gagne 4 cases de recherche d'une
// technologie que je possède, qu'elle ajoute à la main).
// ============================================================

const campDe = c => c.marques?.possession ?? c.proprio ?? 0;

// Actions d'une livraison de `valeur` commerce à `cible` -> { actions, messages }
export function livrer({ etat, index, moi, search, aScript, nomDe }, cible, valeur) {

    const total = valeur +
        (aScript(moi, "commerce-profitable") ? 1 : 0) +
        (aScript(cible, "commerce-profitable") ? 1 : 0);

    const actions = [{ type: "compteur", id: `joueur:${cible}:commerce`, delta: total }];
    const messages = [`Livraison commerciale : ${nomDe(cible)} gagne ${total} commerce${total !== valeur ? " (Commerce profitable)" : ""}.`];

    // Mes dettes envers cette faction, de la plus urgente à la plus lointaine
    const dettes = Object.values(etat.composants)
        .filter(c => !c.ref && c.jeton === DETTE && new RegExp(`^joueur:${moi}:tour:\\d+$`).test(c.zone || "") &&
            Object.values(etat.composants).some(m => m.sur === c.id && m.proprio === cible))
        .sort((a, b) => Number(a.zone.split(":").pop()) - Number(b.zone.split(":").pop()));

    let reste = total;
    let rembourse = 0;

    for (const dette of dettes) {

        const montant = Number(dette.marques?.montant) || 0;
        const paye = Math.min(montant, reste);

        if (paye <= 0) {
            continue;
        }

        reste -= paye;
        rembourse += paye;

        actions.push(paye >= montant
            ? { type: "supprimer", c: dette.id }
            : { type: "marquer", c: dette.id, marque: "montant", valeur: montant - paye });
    }

    if (rembourse) {
        messages.push(`Vos dettes envers ${nomDe(cible)} baissent de ${rembourse}.`);
    }

    // Science intégrée : fenêtre, lors d'une livraison
    const scientifique = aScript(moi, "science-integree-livraison")
        ? agentDisponible({ index, moi, search }, "scientifique")
        : null;

    if (scientifique && window.confirm(
        `Science intégrée : user un scientifique pour que ${nomDe(cible)} gagne 4 cases de recherche ` +
        "d'une technologie que vous possédez ?")) {
        actions.push({ type: "deplacer", c: scientifique.id, vers: `joueur:${moi}:agentsUses` });
        messages.push(`Science intégrée : ${nomDe(cible)} gagne 4 cases de recherche d'une technologie que vous possédez (à cocher dans son onglet Technologie).`);
    }

    return { actions, messages };
}

// Bouton de livraison, sur la fiche d'une de mes unités à « #livr(n) »
export function LivraisonCommerciale({ c, fermer }) {

    const ctx = useEngine();
    const { etat, index, envoyer, moi, search, nomDe, aviser } = ctx;

    const contenu = useElement(c.ref.id);
    const [choisie, setChoisie] = useState("");

    const texte = contenu?.habilite || "";
    const valeur = Number(/#livr\((\d+)\)/i.exec(texte)?.[1]) || 0;
    const m = /^hex:(\d+)/.exec(c.zone || "");

    if (!valeur || !m) {
        return null;
    }

    // Factions qui ont un comptoir dans le système (espace ou planètes)
    const comptoirs = [...new Set(Object.values(etat.composants)
        .filter(x => x.ref?.type === "unit" && (x.zone === m[0] || x.zone?.startsWith(m[0] + ":")) &&
            campDe(x) > 0 && campDe(x) !== moi && /#comp\b/i.test(contenuEnCache(x.ref.id)?.habilite || ""))
        .map(campDe))];

    const cible = comptoirs.length === 1 ? comptoirs[0] : (Number(choisie) || null);

    // D'après le texte : un négociant est utilisé, l'unité est dépensée
    const avecNegociant = /#use\s*#neg/i.test(texte);
    const depensee = /#spend[^<]*#livr/i.test(texte);
    const negociant = avecNegociant ? agentDisponible({ index, moi, search }, "n[ée]gociant") : null;

    function faire(commentaire) {

        const { actions, messages } = livrer(ctx, cible, valeur);

        envoyer([
            negociant && { type: "deplacer", c: negociant.id, vers: `joueur:${moi}:agentsUses` },
            ...actions,
            depensee ? { type: "supprimer", c: c.id } : { type: "marquer", c: c.id, marque: "use", valeur: true },
        ], [commentaire, ...messages].join(" — "));

        aviser(messages.join(" "));
        fermer?.();
    }

    return (
        <span data-livraison style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            {comptoirs.length > 1 && (
                <select value={choisie} onChange={e => setChoisie(e.target.value)}>
                    <option value="">Faction à comptoir…</option>
                    {comptoirs.map(u => <option key={u} value={u}>{nomDe(u)}</option>)}
                </select>
            )}
            <BoutonRegle
                data-action="livraison-commerciale"
                disabled={comptoirs.length > 1 && !cible}
                nom={`Livraison commerciale de ${valeur} par ${nomElement(search, c.ref)}${cible ? " à " + nomDe(cible) : ""}`}
                obstacles={[
                    !comptoirs.length && "aucune autre faction n'a de comptoir commercial dans ce système (rien ne sera livré)",
                    avecNegociant && !negociant && "vous n'avez pas de négociant disponible (aucun ne sera usé)",
                ]}
                faire={commentaire => (cible
                    ? faire(commentaire)
                    : aviser("Livraison commerciale : aucune faction à comptoir dans ce système, rien n'est livré."))}
                title={`Livre ${valeur} commerce à une faction qui a un comptoir dans ce système${avecNegociant ? " ; use un négociant" : ""}${depensee ? " ; l'unité est dépensée" : ""}`}
            >
                Livraison commerciale ({valeur}{depensee ? ", l'unité est dépensée" : ""})
            </BoutonRegle>
        </span>
    );
}
