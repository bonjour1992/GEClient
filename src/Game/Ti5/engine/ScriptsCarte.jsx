import {
    useEngine, BoutonRegle, nomElement, distanceCases, agentDisponible, estSecondaire, DECALAGE_SECONDAIRE, nomCase,
    confirmerRegle,
} from "./Interaction";
import { demanderBlocage } from "./BlocageAction";
import { lieuDe } from "./regleBlocage";
import { chargerContenu, useElement, useElements } from "./sync";
import { normaliserPlateau, distanceBande, COLONNES_BANDE } from "../hexSpirale";
import { turnNumber } from "../ti5Const";
import { scriptsActifs, concerne } from "./scripts";
import {
    RESERVE_TUILES, PIOCHE_TUILES, SAC_FRAGMENTS, exemplaires, LIBRE, COULEUR_LIBRE, MOTIF_LOGISTICIEN,
    systemesExplores, horsReserveCommune,
} from "./miseEnPlace";
import { premiereFace } from "./etat";
import { lotsDeDes, desDeLaReponse } from "./effets";
import { LivraisonCommerciale } from "./Livraison";
import { BoutonsScripts } from "./ActionsScript";

// ============================================================
// BOUTONS DES SCRIPTS SUR LA FICHE D'UNE CARTE
//
// Les scripts de sorte « bouton » (scripts.js) rattachés à la
// carte ajoutent chacun un bouton à sa fiche ; de même le script
// d'effet Réparation improvisée, sur la fiche d'un de mes vaisseaux,
// et « Réparer » sur la fiche d'une de mes unités endommagées d'un
// système où j'ai une unité à réparation illimitée (Dock).
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
                : (s.bouton === "arrivee"
                    ? <ArriveeNeutre key={s.id} c={c} script={s} fermer={fermer} />
                    : null))),
        c.ref.type === "unit" && (c.marques?.possession ?? c.proprio) === moi && aScript(moi, "reparation-improvisee") &&
            <ReparationImprovisee key="reparation-improvisee" c={c} fermer={fermer} />,
        // Réparation illimitée (#rep, Dock) : une de mes unités endommagées de la carte
        c.ref.type === "unit" && (c.marques?.possession ?? c.proprio) === moi && /^hex:\d+/.test(c.zone || "") &&
            Number(c.marques?.degat) > 0 &&
            <ReparationIllimitee key="reparation-illimitee" c={c} fermer={fermer} />,
        // Livraison commerciale : une de mes unités de la carte dont le texte porte #livr(n)
        c.ref.type === "unit" && (c.marques?.possession ?? c.proprio) === moi &&
            <LivraisonCommerciale key="livraison-commerciale" c={c} fermer={fermer} />,
        // Boutons d'action d'une carte qui n'est pas une unité (habilité posée sur la table…)
        c.ref.type !== "unit" &&
            <BoutonsScripts key="actions-carte" lieu="carte" c={c} idElement={c.ref.id} apres={fermer} />,
        // Boutons d'action de l'unité (scripts de sorte « action ») : une de mes unités de la carte ;
        // sur l'unité d'un autre camp, seulement les scripts qui le prévoient (« autrui » : Indigène)
        c.ref.type === "unit" && /^hex:\d+/.test(c.zone || "") &&
            <BoutonsScripts
                key="actions-unite"
                lieu="unite"
                autrui={(c.marques?.possession ?? c.proprio) !== moi}
                c={c}
                idElement={c.ref.id}
                numero={Number(/^hex:(\d+)/.exec(c.zone)[1])}
                zone={c.zone}
                apres={fermer}
            />,
    ];
}

// ------------------------------------------------------------
// RÉPARATION IMPROVISÉE (fiche d'un de mes vaisseaux endommagés)
//
// Use un logisticien et répare le vaisseau : 1 ressource par dégât.
// ------------------------------------------------------------

function ReparationImprovisee({ c, fermer }) {

    const { etat, index, envoyer, moi, search, aviser, allerA } = useEngine();

    const contenu = useElement(c.ref.id);
    const degat = Number(c.marques?.degat) || 0;

    if (!contenu?.mot_cle?.includes("ship") || !degat) {
        return null;
    }

    const logisticien = agentDisponible({ index, moi, search }, MOTIF_LOGISTICIEN);
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
            faire={async commentaire => {

                // « Un de vos vaisseaux non bloqué » : test de blocage là où est le vaisseau, si
                // d'autres factions peuvent le bloquer (BlocageAction.jsx)
                const lieu = lieuDe(c);
                const blocage = !lieu ? { engagees: [] }
                    : await demanderBlocage({ etat, index, moi, envoyer, aviser, allerA }, { ...lieu, action: "reparation", libelle: "Réparation improvisée" });

                // Blocage raté (test abandonné, ou le vaisseau y a été engagé) : le logisticien est
                // utilisé quand même, rien n'est payé ni réparé
                const rate = () => {

                    if (logisticien) {
                        envoyer([{ type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` }],
                            "Réparation improvisée — bloquée : le logisticien est utilisé, rien n'est réparé");
                    }

                    aviser("Réparation improvisée : bloquée. " + (logisticien ? "Le logisticien est utilisé, rien n'est payé ni réparé." : "Rien n'est réparé."));
                };

                if (!blocage) {
                    rate();
                    return;
                }

                if (blocage.engagees.includes(c.id) && confirmerRegle("Réparation improvisée", [
                    "ce vaisseau est bloqué pour cette phase (engagé dans le test de blocage)",
                ]) === null) {
                    rate();
                    return;
                }

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
// RÉPARATION ILLIMITÉE (fiche d'une de mes unités endommagées)
//
// Une de mes unités du système porte #rep sans nombre (Dock) : l'unité est
// réparée, 1 ressource par dégât, à la phase de production (rouge gris
// sinon). Pas d'agent. Une unité biologique ne se répare pas.
//
// Réparation limitée « #Rep(n) » (Mech aérien, script mech-aerien-reparation) :
// l'unité qui la porte répare jusqu'à n unités de son système par tour,
// elle-même comprise. Sa marque « repare » = "<tour>:<nombre d'unités
// réparées>". Elle ne sert que s'il n'y a pas de réparation illimitée.
// ------------------------------------------------------------

const REPARATION_ILLIMITEE = /#rep\b(?!\()/i;
const REPARATION_LIMITEE = /#rep\((\d+)\)/i;

function ReparationIllimitee({ c, fermer }) {

    const { etat, envoyer, moi, search, aScript } = useEngine();

    const numero = /^hex:(\d+)/.exec(c.zone || "")?.[1];
    const zoneEspace = "hex:" + numero;

    // Mes unités du système (espace, planètes, embarquées)
    const duSysteme = Object.values(etat.composants).filter(x =>
        !x.cache && x.ref?.type === "unit" && (x.marques?.possession ?? x.proprio) === moi &&
        (x.zone === zoneEspace || x.zone?.startsWith(zoneEspace + ":")));

    const contenus = useElements([...new Set([c.ref.id, ...duSysteme.map(x => x.ref.id)])]);

    const illimitee = duSysteme.find(x => REPARATION_ILLIMITEE.test(contenus[x.ref.id]?.habilite || ""));

    // Réparation limitée : nombre d'unités que cette unité peut réparer par tour, et déjà réparées ce tour
    const limite = x => Number(REPARATION_LIMITEE.exec(contenus[x.ref.id]?.habilite || "")?.[1]) || 0;
    const faites = x => {
        const m = /^(\d+):(\d+)$/.exec(String(x.marques?.repare ?? ""));
        return m && Number(m[1]) === etat.tour ? Number(m[2]) : 0;
    };

    const limitee = !illimitee && aScript(moi, "mech-aerien-reparation")
        ? duSysteme.find(x => limite(x) > faites(x))
        : null;

    const reparatrice = illimitee || limitee;
    const degat = Number(c.marques?.degat) || 0;

    if (!reparatrice || !degat || contenus[c.ref.id]?.mot_cle?.includes("bio")) {
        return null;
    }

    const ressources = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;
    const nomReparatrice = nomElement(search, reparatrice.ref);

    return (
        <BoutonRegle
            data-action="reparation-illimitee"
            nom={`Réparer : ${nomElement(search, c.ref)} (${degat} dégât${degat > 1 ? "s" : ""}, ${nomReparatrice})`}
            obstacles={[
                !/production/i.test(etat.phase) && "ce n'est pas la phase de production",
                ressources < degat && `ressources insuffisantes : ${degat} à payer, vous en avez ${ressources}`,
            ]}
            faire={commentaire => {
                envoyer([
                    { type: "compteur", id: `joueur:${moi}:res`, delta: -degat },
                    // (si : refusé si les dégâts ont changé entre-temps)
                    { type: "marquer", c: c.id, marque: "degat", valeur: 0, si: degat },
                    // (réparation limitée : une unité de plus réparée ce tour par cette unité)
                    limitee && { type: "marquer", c: limitee.id, marque: "repare", valeur: `${etat.tour}:${faites(limitee) + 1}` },
                ], commentaire);
                fermer?.();
            }}
            title={limitee
                ? `Réparation limitée (${nomReparatrice} : ${faites(limitee)} unité(s) réparée(s) sur ${limite(limitee)} ce tour) : à la phase de production, 1 ressource par dégât`
                : `Réparation illimitée (${nomReparatrice} dans le système) : à la phase de production, 1 ressource par dégât`}
        >
            Réparer ({degat} ressource{degat > 1 ? "s" : ""}{limitee ? `, ${nomReparatrice} ${faites(limitee) + 1}/${limite(limitee)}` : ""})
        </BoutonRegle>
    );
}

// ------------------------------------------------------------
// SYSTÈMES TIRÉS AU SORT (« un endroit aléatoire de la galaxie »)
//
// n systèmes différents de la carte (hors systèmes secondaires), tirés
// par les dés du serveur dans un coup à part, commenté `motif`.
//   nonSpeciaux : seuls les systèmes communs sont tirés — ni natal, ni
//                 système d'événement ou spécial (horsReserveCommune)
// -> les numéros de case, dans l'ordre du tirage ; [] s'il n'y a aucun
//    système ; null si les dés n'ont pas pu être lus
// ------------------------------------------------------------

async function tirerSystemes({ etat, envoyer, moi }, n, motif, { nonSpeciaux = false } = {}) {

    const tuiles = Object.values(etat.composants)
        .filter(x => !x.cache && x.ref?.type === "system" && /^hex:\d+$/.test(x.zone || "") && !estSecondaire(x.zone.slice(4)));

    const cases = [];

    for (const tuile of tuiles) {
        if (!nonSpeciaux || !horsReserveCommune(await chargerContenu(tuile.ref.id))) {
            cases.push(Number(tuile.zone.slice(4)));
        }
    }

    cases.sort((a, b) => a - b);

    const voulu = Math.min(n, cases.length);

    if (voulu <= 0) {
        return [];
    }

    if (cases.length === 1) {
        return [cases[0]];
    }

    // (un dé du serveur a 100 faces au plus)
    const faces = Math.min(100, cases.length);
    const des = desDeLaReponse(await envoyer([{ type: "des", n: voulu, faces }], motif), moi);

    if (!Array.isArray(des) || des.length !== voulu) {
        return null;
    }

    // Chaque dé désigne un système parmi ceux qui restent
    const restantes = [...cases];

    return des.map(d => restantes.splice((d - premiereFace(faces)) % restantes.length, 1)[0]);
}

// Unités natives d'un système et de ses planètes (nativeUnit × unitNum), à poser avec sa tuile
async function unitesNatives(idSysteme, zone) {

    const natives = [];

    const ajouter = (contenu, ou) => {
        if (contenu?.nativeUnit?.id > 0 && contenu.nativeUnit.type === "unit") {
            natives.push({ type: "creer", ref: { type: "unit", id: contenu.nativeUnit.id }, zone: ou, n: Number(contenu.unitNum) || 1 });
        }
    };

    const systeme = await chargerContenu(idSysteme);

    ajouter(systeme, zone);

    for (const [k, lien] of (systeme?.elems || []).entries()) {
        if (lien?.id > 0) {
            ajouter(await chargerContenu(lien.id), `${zone}:planete:${k}`);
        }
    }

    return natives;
}

// ------------------------------------------------------------
// ARRIVÉE D'UNE FACTION NEUTRE (Invasion du grand Khan)
//
// Bouton de la fiche de la faction neutre, posée par son événement sur
// la case Événement du tour d'arrivée : ses unités (`unites` du script)
// arrivent dans un système tiré au sort. Le compteur `compteur` du
// script retient que c'est fait.
// ------------------------------------------------------------

function ArriveeNeutre({ c, script, fermer }) {

    const { etat, envoyer, search, aviser, signaler, moi } = useEngine();

    const nom = nomElement(search, c.ref);
    const tour = Number(/^general:evenement:(\d+)$/.exec(c.zone || "")?.[1]) || 0;

    async function faire(commentaire) {

        // (un système non spécial : ni natal, ni système d'événement ou spécial)
        const tirage = await tirerSystemes({ etat, envoyer, moi }, 1, `${nom} : tirage du système d'arrivée`, { nonSpeciaux: true });

        if (!tirage?.length) {
            signaler(`${nom} : le système d'arrivée n'a pas pu être tiré. Rien n'est posé : réessayez.`);
            return;
        }

        const numero = tirage[0];

        envoyer([
            ...script.unites.map(u => ({ type: "creer", ref: { type: "unit", id: u.id }, zone: "hex:" + numero, n: u.n })),
            { type: "compteur", id: script.compteur, valeur: 1 },
        ], `${commentaire} — ${nomCase(numero)}`.slice(0, 300));

        aviser(`${nom} : arrivée dans le système ${nomCase(numero)} — ` +
            `${script.unites.map(u => `${u.n} ${nomElement(search, { type: "unit", id: u.id })}`).join(", ")}.`);

        fermer?.();
    }

    return (
        <BoutonRegle
            data-action="arrivee-neutre"
            nom={`${script.nom}`}
            obstacles={[
                !/[ée]v[ée]nement/i.test(etat.phase || "") && "ce n'est pas la phase d'événement",
                tour !== etat.tour && "cette carte n'est pas sur la case Événement de ce tour",
                etat.compteurs[script.compteur] && "cette arrivée est déjà faite",
            ]}
            faire={faire}
            title={script.description}
        >
            {script.libelle}
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
        const lots = cotes => lotsDeDes(cibles.length, cotes);

        const r = await envoyer([...lots(faces), ...lots(renforts)], `${nom} : jets de rébellion (${cibles.length} planète(s))`);

        const des = desDeLaReponse(r, moi);

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

    // Systèmes secondaires (Rupture de l'espace-temps) : le système `centre` entouré de
    // n systèmes `autour`, dans la bande des systèmes secondaires, avec leurs unités
    // natives ; un jeton `jeton` sur autant de systèmes de la galaxie tirés au sort.
    // Faute de place libre dans la bande, les tuiles vont dans la réserve de tuiles.
    // -> { actions, bilan }, ou null si les dés n'ont pas pu être lus
    async function poserSecondaires({ centre, autour, n, jeton }) {

        const nombre = n(partie.joueurs.length);
        const lignes = Math.max(1, Math.min(10, Number(etat.compteurs["espace:secondaire:lignes"]) || 3));
        const cases = Array.from({ length: COLONNES_BANDE * lignes }, (_, j) => j);

        const libre = j => !Object.values(etat.composants)
            .some(x => x.ref?.type === "system" && x.zone === "hex:" + (DECALAGE_SECONDAIRE + j));

        const voisines = j => cases.filter(k => k !== j && libre(k) && distanceBande(j, k) === 1);

        // Tuile déjà en jeu (réserve de tuiles) : elle est déplacée, sinon créée
        const dejaPrises = new Set();

        const poser = (id, zone) => {
            const enJeu = Object.values(etat.composants)
                .find(x => !x.cache && x.ref?.type === "system" && x.ref.id === id && x.zone === RESERVE_TUILES && !dejaPrises.has(x.id));

            if (enJeu) {
                dejaPrises.add(enJeu.id);
                return { type: "deplacer", c: enJeu.id, vers: zone };
            }

            return { type: "creer", ref: { type: "system", id }, zone };
        };

        const milieu = cases.find(j => libre(j) && voisines(j).length >= nombre);
        const actions = [];
        let bilan;

        if (milieu === undefined) {
            // (la réserve est complétée : les tuiles déjà en jeu comptent)
            const manquantes = (id, voulu) => Math.max(0, voulu - Object.values(etat.composants)
                .filter(x => x.ref?.type === "system" && x.ref.id === id).length);

            actions.push(...[[centre, 1], [autour, nombre]]
                .filter(([id, voulu]) => manquantes(id, voulu) > 0)
                .map(([id, voulu]) => ({ type: "creer", ref: { type: "system", id }, zone: RESERVE_TUILES, n: manquantes(id, voulu) })));

            bilan ="pas de place libre dans les systèmes secondaires : les tuiles sont dans la réserve de tuiles, à poser à la main avec leurs unités.";
        } else {
            const zoneDuCentre = "hex:" + (DECALAGE_SECONDAIRE + milieu);

            actions.push(poser(centre, zoneDuCentre), ...await unitesNatives(centre, zoneDuCentre));

            for (const k of voisines(milieu).slice(0, nombre)) {
                const zone = "hex:" + (DECALAGE_SECONDAIRE + k);

                actions.push(poser(autour, zone), ...await unitesNatives(autour, zone));
            }

            bilan = `${nomElement(search, { type: "system", id: centre })} et ${nombre} ${nomElement(search, { type: "system", id: autour })}(s) posés dans les systèmes secondaires, avec leurs unités.`;
        }

        const tirage = await tirerSystemes({ etat, envoyer, moi }, nombre, `${nom} : tirage de ${nombre} système(s)`);

        if (!tirage) {
            return null;
        }

        return {
            actions: [...actions, ...tirage.map(numero => ({ type: "creer", ref: { type: "token", id: jeton }, zone: "hex:" + numero }))],
            bilan: `${bilan} ${nomElement(search, { type: "token", id: jeton })} : ${tirage.map(nomCase).join(", ") || "aucun système"}.`,
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

                // Une feuille — ou une technologie isolée — par joueur qui ne l'a pas encore
                // (une technologie déjà posée sur une case de feuille compte aussi)
                const sans = partie.joueurs.filter(j =>
                    !Object.values(etat.composants).some(x => x.ref?.type === pose.type && x.ref.id === pose.id &&
                        String(x.zone || "").startsWith(`joueur:${j.userId}:tech`)));

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

        // Signaux (Signal capté) : les cartes sont mélangées dans une pile, puis réparties une
        // par une dans les piles pioche:signal-1 à N — personne ne voit laquelle est où. Un
        // marqueur libre « Signal N » les représente sur la table ; la technologie SIG-N
        // pioche la carte de sa pile (scripts.js).
        const signaux = script.signaux || [];
        const PILE_SIGNAUX = "pioche:signaux";

        const actionsSignaux = signaux.length ? [
            ...signaux.map(ref => ({ type: "creer", ref, zone: PILE_SIGNAUX })),
            { type: "melanger", zone: PILE_SIGNAUX },
            ...signaux.map((_, k) => ({ type: "verser", de: PILE_SIGNAUX, vers: `pioche:signal-${k + 1}`, n: 1 })),
            ...signaux.map((_, k) => ({
                type: "creer",
                jeton: LIBRE,
                zone: "general:table",
                marques: { texte: `Signal ${k + 1}`, couleur: COULEUR_LIBRE },
            })),
        ] : [];

        // Systèmes explorés (Signal capté) : un fragment de relique, tiré du sac, sur chaque
        // système de la carte absent du plateau de départ (paramètres de départ, miseEnPlace.js)
        const explores = script.explores ? systemesExplores(etat) : [];

        const fragments = explores.slice(0, (index.parZone.get(SAC_FRAGMENTS) || []).length);

        const secondaires = script.secondaires ? await poserSecondaires(script.secondaires) : { actions: [], bilan: "" };

        if (!secondaires) {
            signaler(`${nom} : le tirage des systèmes n'a pas pu être lu. Rien n'est mis en place : réessayez.`);
            return;
        }

        envoyer(
            [
                ...actions, ...melange, ...pirates, ...rebellion.actions, ...actionsSignaux,
                ...fragments.map(tuile => ({ type: "piocher", de: SAC_FRAGMENTS, vers: tuile.zone })),
                ...secondaires.actions,
                { type: "compteur", id: compteur, valeur: 1 },
            ],
            // (le journal garde le détail des jets, dans la limite d'un commentaire)
            [commentaire, rebellion.bilan].filter(Boolean).join(" — ").slice(0, 300)
        );

        aviser([
            `${nom} : mis en place — ${script.description}`,
            rebellion.bilan,
            secondaires.bilan,
            script.explores && !etat.depart &&
                "Cette partie n'a pas ses paramètres de départ : les fragments de relique des systèmes explorés sont à poser à la main.",
            script.explores && !!etat.depart && `Un fragment de relique posé sur ${fragments.length} système(s) exploré(s)` +
                (fragments.length < explores.length ? ` (le sac est vide : il en manque ${explores.length - fragments.length})` : "") + ".",
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
