import { useState } from "react";
import { useEngine, BoutonRegle, agentDisponible, nomElement, tuileDe } from "./Interaction";
import { demanderBlocage } from "./BlocageAction";
import { lieuDe } from "./regleBlocage";
import { elementsAchat, actionsVersStock, stockDe } from "./Achats";
import { possesseurActuel } from "./Controle";
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

// Valeur d'une de mes livraisons versée à un stock d'achat (pas de faction qui reçoit) :
// Perimeter et Commerce profitable de celui qui livre s'y ajoutent
const valeurAuStock = ({ etat, moi, aScript }, valeur) => valeur +
    (aScript(moi, "perimeter") && Object.values(etat.composants).some(c =>
        !c.cache && c.ref?.type === "planet" && c.ref.id === 60 && c.zone === `joueur:${moi}:actif`) ? 1 : 0) +
    (aScript(moi, "commerce-profitable") ? 1 : 0);

const texteDe = c => contenuEnCache(c.ref.id)?.habilite || "";
const valeurDe = c => Number(/#livr\((\d+)\)/i.exec(texteDe(c))?.[1]) || 0;

// Bouton de livraison, sur la fiche d'une de mes unités à « #livr(n) ».
// Destination : une faction qui a un comptoir dans le système (elle gagne le commerce, mes
// dettes envers elle baissent), ou le stock d'achat d'un élément à achat du système (Achats.jsx :
// station commerciale, Bazaar… — le stock est à moi, rien ne va au possesseur).
// Flotte : avec 2 négociants, tous mes vaisseaux à livraison du même espace livrent ensemble.
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

    // Factions qui ont un comptoir dans le système : une unité à #comp (espace ou planètes), ou la
    // possession d'une planète ou d'une station dont le texte porte #comp
    const stationsAComptoir = (contenuEnCache(tuile?.ref.id)?.elems || [])
        .map(lien => Number(lien?.id) || 0)
        .filter(id => id > 0 && /#comp\b/i.test(contenuEnCache(id)?.habilite || ""))
        .map(id => possesseurActuel(etat, id))
        .filter(u => u && u !== moi);

    const comptoirs = [...new Set([...Object.values(etat.composants)
        .filter(x => x.ref?.type === "unit" && (x.zone === m[0] || x.zone?.startsWith(m[0] + ":")) &&
            campDe(x) > 0 && campDe(x) !== moi && /#comp\b/i.test(contenuEnCache(x.ref.id)?.habilite || ""))
        .map(campDe), ...stationsAComptoir, ...concessions])];

    // Éléments à système d'achat du système : la livraison peut aller à mon stock d'achat
    const achats = elementsAchat({ etat, index }, Number(m[1]));

    // Destinations : « f<joueur> » une faction à comptoir, « s<clé> » le stock d'un élément à achat
    const destinations = [
        ...comptoirs.map(u => ["f" + u, `${nomDe(u)} (comptoir)`]),
        ...achats.map(a => ["s" + a.cle, `mon stock d'achat : ${a.nom}`]),
    ];

    const choix = destinations.length === 1 ? destinations[0][0] : choisie;
    const cible = choix.startsWith("f") ? Number(choix.slice(1)) : null;
    const stock = choix.startsWith("s") ? achats.find(a => "s" + a.cle === choix) : null;
    const nomDestination = cible ? nomDe(cible) : (stock ? `mon stock d'achat (${stock.nom})` : "");

    // D'après le texte : un négociant est utilisé, l'unité est dépensée
    const avecNegociant = /#use\s*#neg/i.test(texte);
    const depensee = /#spend[^<]*#livr/i.test(texte);

    const negociants = (index.parZone.get(`joueur:${moi}:agents`) || [])
        .filter(x => !x.cache && x.ref?.type === "agent" && new RegExp(MOTIF_NEGOCIANT, "i").test(nomElement(search, x.ref)));
    const negociant = avecNegociant ? agentDisponible({ index, moi, search }, MOTIF_NEGOCIANT) : null;

    // Flotte : mes autres vaisseaux à livraison du même espace, pas encore utilisés
    const flotte = /^hex:\d+$/.test(c.zone || "") ? Object.values(etat.composants).filter(x =>
        x.ref?.type === "unit" && x.zone === c.zone && !x.sur && campDe(x) === moi && !x.marques?.use && valeurDe(x) > 0) : [];

    // Fait livrer ces vaisseaux à la destination choisie ; agents : les négociants utilisés
    async function livrerAvec(navires, agents, commentaire) {

        // « Nécessite que l'unité soit non bloquée » : test de blocage là où est l'unité, si
        // d'autres factions peuvent la bloquer (BlocageAction.jsx)
        const blocage = await demanderBlocage({ etat, index, moi, envoyer, aviser, allerA },
            { ...lieuDe(c), action: "livraison", libelle: `Livraison commerciale par ${navires.map(x => nomElement(search, x.ref)).join(", ")}` });

        const usage = agents.map(agent => ({ type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` }));
        const libres = blocage ? navires.filter(x => !blocage.engagees.includes(x.id)) : [];

        // Blocage raté (test abandonné, ou tous les vaisseaux y ont été engagés) : les négociants
        // sont utilisés quand même, rien n'est livré et les vaisseaux restent tels quels
        if (!libres.length) {

            if (usage.length) {
                envoyer(usage, "Livraison commerciale — bloquée : négociant utilisé, rien n'est livré");
            }

            aviser("Livraison commerciale : bloquée. " + (usage.length ? "Le négociant est utilisé, rien n'est livré." : "Rien n'est livré."));
            return;
        }

        const actions = [];
        const messages = [];

        if (libres.length < navires.length) {
            messages.push(`${navires.length - libres.length} vaisseau(x) bloqué(s) ne livrent pas.`);
        }

        for (const navire of libres) {

            if (cible) {
                const livraison = await livrer(ctx, cible, valeurDe(navire));

                actions.push(...livraison.actions);
                messages.push(...livraison.messages);
            }

            // (dépensée ou usée d'après le texte de l'unité)
            actions.push(/#spend[^<]*#livr/i.test(texteDe(navire))
                ? { type: "supprimer", c: navire.id }
                : { type: "marquer", c: navire.id, marque: "use", valeur: true });
        }

        // Au stock d'achat : une seule écriture, la somme des livraisons
        if (stock) {
            const total = libres.reduce((s, navire) => s + valeurAuStock(ctx, valeurDe(navire)), 0);

            actions.push(...actionsVersStock(etat, stock, moi, total));
            messages.push(`Livraison commerciale : ${total} versé à votre stock d'achat sur ${stock.nom} (${stockDe(etat, stock, moi) + total} en tout).`);
        }

        envoyer([...usage, ...actions], [commentaire, ...messages].join(" — ").slice(0, 300));

        aviser(messages.join(" "));
        fermer?.();
    }

    const sansDestination = "aucune faction à comptoir ni élément à achat dans ce système (rien ne sera livré)";

    return (
        <span data-livraison style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            {destinations.length > 1 && (
                <select data-destination-livraison value={choisie} onChange={e => setChoisie(e.target.value)}>
                    <option value="">Destination de la livraison…</option>
                    {destinations.map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
                </select>
            )}

            <BoutonRegle
                data-action="livraison-commerciale"
                disabled={destinations.length > 1 && !choix}
                nom={`Livraison commerciale de ${valeur} par ${nomElement(search, c.ref)}${nomDestination ? " à " + nomDestination : ""}`}
                obstacles={[
                    !destinations.length && sansDestination,
                    avecNegociant && !negociant && "vous n'avez pas de négociant disponible (aucun ne sera usé)",
                ]}
                faire={commentaire => (choix
                    ? livrerAvec([c], negociant ? [negociant] : [], commentaire)
                    : aviser("Livraison commerciale : " + sansDestination + "."))}
                title={`Livre ${valeur} à une faction qui a un comptoir dans ce système, ou à votre stock d'achat sur un élément à achat${avecNegociant ? " ; use un négociant" : ""}${depensee ? " ; l'unité est dépensée" : ""}. Un test de blocage s'ouvre d'abord si d'autres factions peuvent bloquer l'unité.`}
            >
                Livraison commerciale ({valeur}{depensee ? ", l'unité est dépensée" : ""})
            </BoutonRegle>

            {/* Flotte : 2 négociants font livrer tous mes vaisseaux à livraison de cet espace */}
            {flotte.length > 1 && (
                <BoutonRegle
                    data-action="livraison-flotte"
                    disabled={destinations.length > 1 && !choix}
                    nom={`Livraison commerciale de la flotte (${flotte.length} vaisseaux)${nomDestination ? " à " + nomDestination : ""}`}
                    obstacles={[
                        !destinations.length && sansDestination,
                        negociants.length < 2 && `il faut 2 négociants disponibles pour une flotte, vous en avez ${negociants.length} (seuls ceux-là seront usés)`,
                    ]}
                    faire={commentaire => (choix
                        ? livrerAvec(flotte, negociants.slice(0, 2), commentaire)
                        : aviser("Livraison commerciale : " + sansDestination + "."))}
                    title="Use 2 négociants : tous vos vaisseaux à livraison de cet espace livrent à la même destination"
                >
                    Livrer avec la flotte ({flotte.length} vaisseaux, 2 négociants)
                </BoutonRegle>
            )}
        </span>
    );
}
