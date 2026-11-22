import { useState } from "react";
import { useEngine, BoutonRegle, agentDisponible, nomElement, tuileDe, confirmerRegle } from "./Interaction";
import { demanderBlocage } from "./BlocageAction";
import { lieuDe } from "./regleBlocage";
import { useElement, contenuEnCache } from "./sync";
import { DETTE, campDe, MOTIF_NEGOCIANT } from "./miseEnPlace";
import { demander } from "./demande";

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
// livrée l'a), Science intégrée (une décision propose d'user un
// scientifique : la faction livrée gagne 4 cases de recherche d'une
// technologie que je possède, qu'elle ajoute à la main).
// ============================================================

// Actions d'une livraison de `valeur` commerce à `cible` -> { actions, messages }
// (asynchrone : Science intégrée pose une question, onglet Décision)
export async function livrer({ etat, index, moi, search, aScript, nomDe }, cible, valeur) {

    // Règle de Perimeter : mes livraisons valent 1 commerce de plus si je possède la planète
    const perimeter = aScript(moi, "perimeter") && Object.values(etat.composants).some(c =>
        !c.cache && c.ref?.type === "planet" && c.ref.id === 60 && c.zone === `joueur:${moi}:actif`);

    const total = valeur +
        (perimeter ? 1 : 0) +
        (aScript(moi, "commerce-profitable") ? 1 : 0) +
        (aScript(cible, "commerce-profitable") ? 1 : 0);

    const actions = [{ type: "compteur", id: `joueur:${cible}:commerce`, delta: total }];
    const messages = [`Livraison commerciale : ${nomDe(cible)} gagne ${total} commerce${total !== valeur ? ` (${[perimeter && "Perimeter", total - valeur > (perimeter ? 1 : 0) && "Commerce profitable"].filter(Boolean).join(", ")})` : ""}.`];

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

    // Science intégrée : décision (onglet Décision), lors d'une livraison
    const scientifique = aScript(moi, "science-integree-livraison")
        ? agentDisponible({ index, moi, search }, "scientifique")
        : null;

    if (scientifique && (await demander({
        titre: "Science intégrée",
        texte: `Vous livrez du commerce à ${nomDe(cible)}.`,
        choix: [
            { valeur: 1, libelle: `User un scientifique : ${nomDe(cible)} gagne 4 cases de recherche d'une technologie que vous possédez` },
            { valeur: 2, libelle: "Ne pas user de scientifique" },
        ],
        renoncer: false,
    })) === 1) {
        actions.push({ type: "deplacer", c: scientifique.id, vers: `joueur:${moi}:agentsUses` });
        messages.push(`Science intégrée : ${nomDe(cible)} gagne 4 cases de recherche d'une technologie que vous possédez (à cocher dans son onglet Technologie).`);
    }

    return { actions, messages };
}

// Bouton de livraison, sur la fiche d'une de mes unités à « #livr(n) »
export function LivraisonCommerciale({ c, fermer }) {

    const ctx = useEngine();
    const { etat, index, envoyer, moi, search, nomDe, aviser, allerA } = ctx;

    const contenu = useElement(c.ref.id);
    const [choisie, setChoisie] = useState("");

    const texte = contenu?.habilite || "";
    const valeur = Number(/#livr\((\d+)\)/i.exec(texte)?.[1]) || 0;
    const m = /^hex:(\d+)/.exec(c.zone || "");

    if (!valeur || !m) {
        return null;
    }

    // Promesse Concession commerciale (#228, mandat des Winnu) : son détenteur compte comme
    // ayant un comptoir sur Mecatol Rex (#34) — dans le système qui la porte, mandat non épuisé
    const tuile = tuileDe(ctx.index, m[1]);
    const mecatolIci = (contenuEnCache(tuile?.ref.id)?.elems || []).some(lien => Number(lien?.id) === 34);

    const concessions = !mecatolIci ? [] : ctx.partie.joueurs.map(j => j.userId).filter(u => u !== moi && ctx.aScript(u, "concession-commerciale") &&
        Object.values(etat.composants).some(x => !x.cache && x.ref?.type === "Promesse" && x.ref.id === 228 && !x.marques?.use &&
            new RegExp(`^joueur:${u}:(actif|tour:\\d+)$`).test(x.zone || "")));

    // Factions qui ont un comptoir dans le système (espace ou planètes)
    const comptoirs = [...new Set([...Object.values(etat.composants)
        .filter(x => x.ref?.type === "unit" && (x.zone === m[0] || x.zone?.startsWith(m[0] + ":")) &&
            campDe(x) > 0 && campDe(x) !== moi && /#comp\b/i.test(contenuEnCache(x.ref.id)?.habilite || ""))
        .map(campDe), ...concessions])];

    const cible = comptoirs.length === 1 ? comptoirs[0] : (Number(choisie) || null);

    // D'après le texte : un négociant est utilisé, l'unité est dépensée
    const avecNegociant = /#use\s*#neg/i.test(texte);
    const depensee = /#spend[^<]*#livr/i.test(texte);
    const negociant = avecNegociant ? agentDisponible({ index, moi, search }, MOTIF_NEGOCIANT) : null;

    async function faire(commentaire) {

        // « Nécessite que l'unité soit non bloquée » : test de blocage là où est l'unité, si
        // d'autres factions peuvent la bloquer (BlocageAction.jsx)
        const blocage = await demanderBlocage({ etat, index, moi, envoyer, aviser, allerA },
            { ...lieuDe(c), action: "livraison", libelle: `Livraison commerciale par ${nomElement(search, c.ref)}` });

        // Blocage raté (test abandonné, ou l'unité y a été engagée) : le négociant est utilisé
        // quand même, rien n'est livré et l'unité reste telle quelle
        const rate = () => {

            if (negociant) {
                envoyer([{ type: "deplacer", c: negociant.id, vers: `joueur:${moi}:agentsUses` }],
                    "Livraison commerciale — bloquée : le négociant est utilisé, rien n'est livré");
            }

            aviser("Livraison commerciale : bloquée. " + (negociant ? "Le négociant est utilisé, rien n'est livré." : "Rien n'est livré."));
        };

        if (!blocage) {
            rate();
            return;
        }

        if (blocage.engagees.includes(c.id) && confirmerRegle("Livraison commerciale", [
            "cette unité est bloquée pour cette phase (engagée dans le test de blocage)",
        ]) === null) {
            rate();
            return;
        }

        const { actions, messages } = await livrer(ctx, cible, valeur);

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
