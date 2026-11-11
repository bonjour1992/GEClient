import { useEngine, BoutonRegle, nomCase, DECALAGE_SECONDAIRE, agentDisponible } from "./Interaction";
import { chargerContenu } from "./sync";
import { normaliserPlateau, COLONNES_BANDE } from "../hexSpirale";
import { typeUnite } from "./miseEnPlace";
import { scriptsActifs, concerne } from "./scripts";

// ============================================================
// MISE EN PLACE DE MA FACTION (tour 0)
//
// Chaque joueur commence avec la tuile de son système natal et
// ses unités de départ dans ses éléments actifs. Ce bouton :
//
//   1. pose le système natal sur une case natale libre du plateau,
//      tirée au hasard — sauf si le joueur l'a déjà posé lui-même
//      (glissé sur la carte) : il reste alors où il est ;
//   2. pose les unités de départ : les vaisseaux dans l'espace du
//      système, les unités terrestres sur la planète de départ
//      (celle de la faction, sinon la première). Une unité qui ne
//      peut pas être posée reste dans les éléments actifs ;
//   3. applique les scripts de mise en place de la faction
//      (scripts.js) : destinations particulières, compteurs, pioches.
//
// Tout part en un seul coup. Le compteur joueur:<u>:miseEnPlace
// retient que c'est fait.
// ============================================================

const compteurFait = u => `joueur:${u}:miseEnPlace`;

// Nombre de lignes de la bande des systèmes secondaires (voir Espace.jsx)
const LIGNES_SECONDAIRES = "espace:secondaire:lignes";

export function MiseEnPlaceJoueur() {

    const {
        etat, index, envoyer, moi, joueur, partie, factionDe, signaler, aviser, scriptsDesactives, search,
    } = useEngine();

    if (!joueur || etat.tour !== 0) {
        return null;
    }

    const faite = !!etat.compteurs[compteurFait(moi)];

    async function faire(commentaire) {

        const idFaction = factionDe(moi);
        const faction = idFaction > 0 ? await chargerContenu(idFaction) : null;

        if (!faction) {
            signaler("Mise en place : votre faction est introuvable.");
            return;
        }

        const actifs = `joueur:${moi}:actif`;
        const miens = index.parZone.get(actifs) || [];
        const actions = [];

        // ---------- 1. système natal ----------

        const idSysteme = Number(faction.system?.id);
        const estMaTuile = c => c.ref?.type === "system" && c.ref.id === idSysteme;

        const posee = Object.values(etat.composants)
            .find(c => estMaTuile(c) && c.proprio === moi && /^hex:\d+$/.test(c.zone));

        const tuile = miens.find(estMaTuile);

        let hex = posee?.zone ?? null;

        const scripts = scriptsActifs(scriptsDesactives)
            .filter(s => s.sorte === "miseEnPlace" && concerne(s, { type: "faction", id: idFaction }));

        const occupee = i => (index.parZone.get("hex:" + i) || []).some(c => c.ref?.type === "system");

        // Case natale libre du plateau, tirée au hasard (ou null)
        async function caseNatale() {

            const plateau = normaliserPlateau(await chargerContenu(partie.plateau));

            const libres = plateau.type
                .map((type, i) => (type === "natal" ? i : -1))
                .filter(i => i >= 0 && !occupee(i));

            return libres.length ? libres[Math.floor(Math.random() * libres.length)] : null;
        }

        // Script « porte » (Creuss) : c'est une autre tuile, la porte, qui va
        // sur la case natale ; le système natal va dans les systèmes
        // secondaires, sur la première case libre (la bande gagne une ligne au besoin)
        const porte = scripts.find(s => s.porte)?.porte;
        const tuilePorte = porte ? miens.find(c => c.ref?.type === "system" && c.ref.id === porte) : null;

        if (tuilePorte) {
            const i = await caseNatale();

            if (i !== null) {
                actions.push({ type: "deplacer", c: tuilePorte.id, vers: "hex:" + i, de: actifs });
            }
        }

        if (!hex && tuile && porte) {

            let j = 0;

            while (occupee(DECALAGE_SECONDAIRE + j)) {
                j++;
            }

            const lignes2 = Number(etat.compteurs[LIGNES_SECONDAIRES]) || 3;

            if (j >= COLONNES_BANDE * lignes2) {
                actions.push({ type: "compteur", id: LIGNES_SECONDAIRES, valeur: Math.floor(j / COLONNES_BANDE) + 1 });
            }

            hex = "hex:" + (DECALAGE_SECONDAIRE + j);
            actions.push({ type: "deplacer", c: tuile.id, vers: hex, de: actifs });

        } else if (!hex && tuile) {

            const i = await caseNatale();

            if (i !== null) {
                hex = "hex:" + i;
                actions.push({ type: "deplacer", c: tuile.id, vers: hex, de: actifs });
            }
        }

        if (!hex) {
            signaler(tuile
                ? "Mise en place : aucune case natale libre sur le plateau. Glissez votre système sur la carte, puis recommencez."
                : "Mise en place : votre système natal n'est ni dans vos éléments actifs ni sur la carte.");
            return;
        }

        // ---------- 2. planètes et unités ----------

        const systeme = await chargerContenu(idSysteme);

        const planetes = (systeme?.elems || [])
            .map((lien, k) => ({ id: Number(lien?.id), k }))
            .filter(p => p.id > 0);

        const contenus = await Promise.all(planetes.map(p => chargerContenu(p.id)));

        // Planète de départ : celle de la faction, sinon la première
        const depart = planetes.find((p, i) => Number(contenus[i]?.homePlanet?.id) === idFaction) || planetes[0] || null;

        const unites = [];

        for (const c of miens.filter(x => x.ref?.type === "unit")) {
            const contenu = await chargerContenu(c.ref.id);

            unites.push({
                c,
                contenu,
                type: typeUnite(contenu),
                vaisseau: !!contenu?.mot_cle?.includes("ship"),
                terrestre: !!contenu?.mot_cle?.includes("terre"),
            });
        }

        // Ce que les scripts de la faction ont sous la main
        const plan = {
            u: moi,
            hex,
            planetes,
            unites,
            vaisseaux: unites.filter(x => x.vaisseau),
            zonePlanete: id => {
                const p = planetes.find(x => x.id === id);
                return p ? `${hex}:planete:${p.k}` : null;
            },
            // Un de mes agents disponibles dont le nom contient ce motif (ou null)
            agent: motif => agentDisponible({ index, moi, search }, motif),
            // Zone d'une habilité de la feuille de faction (emplacement habilite:<rang>)
            habilite: id => {
                const i = (faction.rules || []).findIndex(lien => Number(lien?.id) === id);
                return i >= 0 ? `joueur:${moi}:habilite:${i}` : null;
            },
        };

        const restees = [];

        // Les vaisseaux d'abord : une unité peut ensuite y embarquer
        for (const unite of [...plan.vaisseaux, ...unites.filter(x => !x.vaisseau)]) {

            let destination;

            for (const script of scripts) {
                destination = script.placer?.(unite, plan);

                if (destination !== undefined) {
                    break;
                }
            }

            if (destination === undefined) {
                destination = unite.vaisseau
                    ? { zone: hex }
                    : (unite.terrestre && depart ? { zone: `${hex}:planete:${depart.k}` } : null);
            }

            if (!destination) {
                restees.push(unite);
            } else if (destination.sur) {
                actions.push({ type: "deplacer", c: unite.c.id, sur: destination.sur });
            } else {
                actions.push({ type: "deplacer", c: unite.c.id, vers: destination.zone });
            }
        }

        // ---------- 3. scripts de la faction ----------

        for (const script of scripts) {
            actions.push(...(script.actions?.(plan) || []));
        }

        actions.push({ type: "compteur", id: compteurFait(moi), valeur: 1 });

        envoyer(actions, commentaire);

        // Ce qui a été fait d'inhabituel, en orange
        aviser([
            posee ? "" : `Système natal posé (${nomCase(hex.slice(4))})`,
            ...scripts.map(s => s.nom + " : " + (s.message || s.description)),
            restees.length
                ? `${restees.length} unité(s) sans place sont restées dans vos éléments actifs`
                : "",
        ].filter(Boolean).join(" — "));
    }

    return (
        <BoutonRegle
            data-action="mise-en-place"
            nom="Mise en place de ma faction"
            obstacles={[faite && "votre mise en place est déjà faite"]}
            faire={faire}
            title="Pose votre système natal sur une case natale libre (s'il n'est pas déjà sur la carte), puis vos unités de départ : vaisseaux dans l'espace, unités terrestres sur votre planète de départ"
            style={{ padding: "3px 12px", marginTop: 4 }}
        >
            {faite ? "✔ Mise en place faite" : "Mise en place de ma faction"}
        </BoutonRegle>
    );
}
