import { useEngine, BoutonRegle, nomElement, distanceCases, agentDisponible } from "./Interaction";
import { chargerContenu, useElement } from "./sync";
import { normaliserPlateau } from "../hexSpirale";
import { turnNumber } from "../ti5Const";
import { scriptsActifs, concerne } from "./scripts";
import { RESERVE_TUILES, PIOCHE_TUILES, exemplaires } from "./miseEnPlace";

// ============================================================
// BOUTONS DES SCRIPTS SUR LA FICHE D'UNE CARTE
//
// Les scripts de sorte « bouton » (scripts.js) rattachés à la
// carte ajoutent chacun un bouton à sa fiche ; de même le script
// d'effet Réparation improvisée, sur la fiche d'un de mes vaisseaux.
// ============================================================

export function ScriptsCarte({ c, fermer }) {

    const { joueur, scriptsDesactives, aScript, moi } = useEngine();

    if (!joueur || !c?.ref || c.cache) {
        return null;
    }

    return [
        ...scriptsActifs(scriptsDesactives)
            .filter(s => s.sorte === "bouton" && concerne(s, c.ref))
            .map(s => (s.bouton === "evenement"
                ? <MettreEnPlaceEvenement key={s.id} c={c} script={s} fermer={fermer} />
                : null)),
        c.ref.type === "unit" && (c.marques?.possession ?? c.proprio) === moi && aScript(moi, "reparation-improvisee") &&
            <ReparationImprovisee key="reparation-improvisee" c={c} fermer={fermer} />,
    ];
}

// ------------------------------------------------------------
// RÉPARATION IMPROVISÉE (fiche d'un de mes vaisseaux endommagés)
//
// Use un logisticien et répare le vaisseau : 1 ressource par dégât.
// ------------------------------------------------------------

function ReparationImprovisee({ c, fermer }) {

    const { etat, index, envoyer, moi, search } = useEngine();

    const contenu = useElement(c.ref.id);
    const degat = Number(c.marques?.degat) || 0;

    if (!contenu?.mot_cle?.includes("ship") || !degat) {
        return null;
    }

    const logisticien = agentDisponible({ index, moi, search }, "logisticien|g[ée]n[ée]ticien");
    const ressources = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;

    return (
        <BoutonRegle
            data-action="reparation-improvisee"
            nom={`Réparation improvisée : ${nomElement(search, c.ref)} (${degat} dégât${degat > 1 ? "s" : ""})`}
            obstacles={[
                !/production/i.test(etat.phase) && "ce n'est pas la phase de production",
                !logisticien && "vous n'avez pas de logisticien disponible (aucun ne sera usé)",
                ressources < degat && `ressources insuffisantes : ${degat} à payer, vous en avez ${ressources}`,
            ]}
            faire={commentaire => {
                envoyer([
                    logisticien && { type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` },
                    { type: "compteur", id: `joueur:${moi}:res`, delta: -degat },
                    { type: "marquer", c: c.id, marque: "degat", valeur: 0, si: degat },
                ], commentaire);
                fermer?.();
            }}
            title="Réparation improvisée : use un logisticien et répare ce vaisseau, 1 ressource par dégât (le vaisseau ne doit pas être bloqué)"
        >
            Réparation improvisée ({degat} ressource{degat > 1 ? "s" : ""}, use un logisticien)
        </BoutonRegle>
    );
}

// ------------------------------------------------------------
// MISE EN PLACE D'UN ÉVÉNEMENT
//
// Chaque événement a son script (scripts.js) : la liste de ce qu'il
// met en jeu (`poses`) et où. T est le tour de l'événement : celui de
// sa case du déroulé, sinon le tour en cours. Une case au-delà du
// dernier tour n'existe pas : l'élément n'est alors pas posé.
// Le reste du texte (`reste`) se fait à la main ; le compteur
// evenement:<id>:place retient que la mise en place est faite.
// ------------------------------------------------------------

function MettreEnPlaceEvenement({ c, script, fermer }) {

    const { etat, index, envoyer, partie, search, aviser, signaler, moi } = useEngine();

    const compteur = `evenement:${c.ref.id}:place`;
    const nom = nomElement(search, c.ref);

    // Tour de l'événement
    const tour = Number(/^general:evenement:(\d+)$/.exec(c.zone || "")?.[1]) || etat.tour;

    // Zone d'une pose : { zone } ou { horsDeroule: tour }
    function zoneDe(vers) {

        if (vers === "table") {
            return { zone: "general:table" };
        }

        if (vers === "tuiles") {
            return { zone: RESERVE_TUILES };
        }

        if (vers === "promesses") {
            return { zone: "general:promesses" };
        }

        const [rangee, k] = Object.entries(vers)[0];
        const t = tour + k;

        return t <= turnNumber ? { zone: `general:${rangee}:${t}` } : { horsDeroule: t };
    }

    // Unités neutres posées sur les anomalies du plateau
    async function surAnomalies({ unite, n, types, loinDesNatals }) {

        const plateau = normaliserPlateau(await chargerContenu(partie.plateau));
        const natals = plateau.type.map((type, i) => (type === "natal" ? i : -1)).filter(i => i >= 0);

        const tuiles = Object.values(etat.composants)
            .filter(x => x.ref?.type === "system" && /^hex:\d+$/.test(x.zone));

        const cases = [];

        for (const tuile of tuiles) {

            const numero = Number(tuile.zone.slice(4));
            const contenu = await chargerContenu(tuile.ref.id);

            if (types.includes(contenu?.anomaly) &&
                !(loinDesNatals && natals.some(i => distanceCases(i, numero) <= 1))) {
                cases.push(numero);
            }
        }

        return cases.map(numero => ({ type: "creer", ref: { type: "unit", id: unite }, zone: "hex:" + numero, n }));
    }

    // Tuiles à mélanger aux n tuiles du dessus de la pioche : celles-ci passent
    // dans une pile à part, où les nouvelles tuiles les rejoignent (celles
    // déjà en jeu, la réserve par exemple, sont déplacées) ; la pile est
    // mélangée puis reversée sur la pioche.
    function melangerALaPioche(tuiles, n) {

        const A_PART = "pioche:melange";
        const enPioche = (index.parZone.get(PIOCHE_TUILES) || []).length;

        return [
            enPioche > 0 && { type: "verser", de: PIOCHE_TUILES, vers: A_PART, n: Math.min(n, enPioche) },
            ...tuiles.map(ref => {
                const enJeu = Object.values(etat.composants)
                    .find(x => !x.cache && x.ref?.type === ref.type && x.ref.id === ref.id && x.zone !== "horsJeu");

                return enJeu
                    ? { type: "deplacer", c: enJeu.id, vers: A_PART }
                    : { type: "creer", ref, zone: A_PART };
            }),
            { type: "melanger", zone: A_PART },
            { type: "verser", de: A_PART, vers: PIOCHE_TUILES },
        ];
    }

    // Jets de rébellion : un dé par planète possédée par un joueur, hors
    // système natal ; sur le seuil de son type ou plus, un dé « renforts »
    // d'unités neutres y est posé. Les dés sont lancés par le serveur, dans un
    // premier coup. -> { actions, bilan }, ou null si les dés n'ont pas pu être lus
    async function jetsDeRebellion({ unite, faces, seuils, defaut, renforts }) {

        const factions = await Promise.all(partie.joueurs.map(j => chargerContenu(j.faction)));
        const natals = new Set(factions.map(f => Number(f?.system?.id)).filter(id => id > 0));

        const possedee = id => partie.joueurs.some(j => (index.parZone.get(`joueur:${j.userId}:actif`) || [])
            .some(x => x.ref?.type === "planet" && x.ref.id === id));

        const cibles = [];

        for (const tuile of Object.values(etat.composants)
            .filter(x => x.ref?.type === "system" && /^hex:\d+$/.test(x.zone) && !natals.has(x.ref.id))) {

            const systeme = await chargerContenu(tuile.ref.id);

            for (const [k, lien] of (systeme?.elems || []).entries()) {

                if (lien?.id > 0 && possedee(lien.id)) {
                    const planete = await chargerContenu(lien.id);

                    cibles.push({
                        zone: `${tuile.zone}:planete:${k}`,
                        nom: planete?.name || "planète",
                        seuil: seuils[planete?.planetType] ?? defaut,
                    });
                }
            }
        }

        if (!cibles.length) {
            return { actions: [], bilan: "aucune planète possédée hors système natal : pas de jet de rébellion." };
        }

        // (un jet de dés du serveur compte 30 dés au plus)
        const lots = cotes => Array.from({ length: Math.ceil(cibles.length / 30) },
            (_, i) => ({ type: "des", n: Math.min(30, cibles.length - 30 * i), faces: cotes }));

        const r = await envoyer([...lots(faces), ...lots(renforts)], `${nom} : jets de rébellion (${cibles.length} planète(s))`);

        const des = [...(r?.coups || [])]
            .sort((a, b) => b.n - a.n)
            .find(x => x.auteur === moi)?.actions.filter(a => a.type === "des").flatMap(a => a.resultats || []);

        if (!Array.isArray(des) || des.length !== 2 * cibles.length) {
            return null;
        }

        const jets = cibles.map((cible, i) => ({ ...cible, jet: des[i], n: des[cibles.length + i] }));
        const reussis = jets.filter(j => j.jet >= j.seuil);

        return {
            actions: reussis.map(j => ({ type: "creer", ref: { type: "unit", id: unite }, zone: j.zone, n: j.n })),
            bilan: `Rébellion : ${jets.map(j => `${j.nom} ${j.jet}${j.jet >= j.seuil ? ` (${j.seuil}+) → ${j.n} rebelle(s)` : ` (${j.seuil}+ raté)`}`).join(" ; ")}.`,
        };
    }

    async function faire(commentaire) {

        const actions = [];
        const horsDeroule = [];
        const aMelanger = [];

        for (const pose of script.poses || []) {

            const ref = { type: pose.type, id: pose.id };

            if (pose.vers?.pioche) {
                aMelanger.push({ ref, n: pose.vers.pioche });
                continue;
            }

            if (pose.vers === "joueurs") {

                // Une feuille par joueur qui ne l'a pas encore
                const sans = partie.joueurs.filter(j =>
                    !(index.parZone.get(`joueur:${j.userId}:tech`) || []).some(x => x.ref?.id === pose.id));

                actions.push(...sans.map(j => ({ type: "creer", ref, zone: `joueur:${j.userId}:tech`, proprio: j.userId })));
                continue;
            }

            const { zone, horsDeroule: t } = zoneDe(pose.vers);

            if (!zone) {
                horsDeroule.push(`${nomElement(search, ref)} (tour ${t})`);
                continue;
            }

            const voulu = typeof pose.n === "function"
                ? pose.n(partie.joueurs.length)
                : pose.n ?? exemplaires(await chargerContenu(pose.id));

            // Tuiles : la réserve en a peut-être déjà (mise en place de la partie) ;
            // on complète jusqu'au nombre voulu, où qu'elles soient
            const n = pose.vers === "tuiles"
                ? voulu - Object.values(etat.composants).filter(x => x.ref?.type === pose.type && x.ref.id === pose.id).length
                : voulu;

            if (n > 0) {
                actions.push({ type: "creer", ref, zone, n });
            }
        }

        const pirates = script.anomalies ? await surAnomalies(script.anomalies) : [];

        const melange = aMelanger.length
            ? melangerALaPioche(aMelanger.map(x => x.ref), Math.max(...aMelanger.map(x => x.n)))
            : [];

        const rebellion = script.rebellion ? await jetsDeRebellion(script.rebellion) : { actions: [], bilan: "" };

        if (!rebellion) {
            signaler(`${nom} : les jets de rébellion n'ont pas pu être lus. Rien n'est mis en place : réessayez.`);
            return;
        }

        envoyer(
            [...actions, ...melange, ...pirates, ...rebellion.actions, { type: "compteur", id: compteur, valeur: 1 }],
            // (le journal garde le détail des jets, dans la limite d'un commentaire)
            [commentaire, rebellion.bilan].filter(Boolean).join(" — ").slice(0, 300)
        );

        aviser([
            `${nom} : mis en place — ${script.description}`,
            rebellion.bilan,
            script.anomalies && `${pirates.length} système(s) concerné(s).`,
            horsDeroule.length && `Après le dernier tour, non posé : ${horsDeroule.join(", ")}.`,
            script.reste && `Reste à faire à la main : ${script.reste}.`,
        ].filter(Boolean).join(" "));

        fermer?.();
    }

    return (
        <BoutonRegle
            data-action="evenement-mise-en-place"
            nom={`Mettre en place ${nom}`}
            obstacles={[etat.compteurs[compteur] && "cet événement est déjà mis en place"]}
            faire={faire}
            title={script.description + (script.reste ? ` Reste à la main : ${script.reste}.` : "")}
        >
            Mettre en place
        </BoutonRegle>
    );
}
