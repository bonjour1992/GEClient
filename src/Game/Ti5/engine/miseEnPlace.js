// ============================================================
// MISE EN PLACE D'UNE PARTIE TI5
//
// JavaScript sans dépendance d'affichage, exécuté par le serveur
// au lancement d'une partie. Voir doc/structure.md.
// ============================================================

import { normaliserPlateau } from "../hexSpirale.js";
import { nouvelEtat, ajouter, composantsDeZone, appliquer } from "./etat.js";

// Une pioche par type de carte
export const TYPES_PIOCHE = ["Agenda", "militaire", "relique", "evenement", "mercenaire"];

// Une feuille de technologie par type : celle de la faction, sinon la commune
export const TYPES_FEUILLE = ["gen", "mil", "soc", "spa"];

// Marqueur d'un joueur : un carré de sa couleur avec le logo de sa faction.
// Un sur la case 0 des points, de l'infamie et des sièges, un sur sa case
// d'initiative.
export const MARQUEUR = "marqueur";

export const PISTES = ["points", "infamie", "sieges"];

// Faveur d'une faction : un jeton triangulaire à sa couleur, avec son logo
export const FAVEUR = "faveur";

// Dette : un jeton dont le montant (marques.montant) se modifie depuis sa
// fiche, avec le marqueur du créancier posé dessus
export const DETTE = "Dette";

// Tuiles système : pioche des tuiles non spéciales qui ne sont pas sur la
// carte, tuiles piochées en attente d'être posées, réserve des spéciales
export const PIOCHE_TUILES = "pioche:system";
export const TUILES_PIOCHEES = "general:tuiles";
export const RESERVE_TUILES = "general:systemes";

// Numéro d'une phase dans le tour : son champ « numero », sinon le nombre
// au début de son nom (« 02.Phase de recrutement » -> 2). 0 : phase
// spéciale (champ « horsTour », ou aucun numéro), qui n'apparaît pas dans
// le déroulement d'un tour.
export function numeroPhase(contenu) {

    if (contenu?.horsTour) {
        return 0;
    }

    const m = /^\s*(\d+)\s*\./.exec(nomSansPrefixe(contenu?.name));

    return Number(contenu?.numero) || (m ? Number(m[1]) : 0);
}

// Le préfixe !...! d'un nom n'est pas affiché
const nomSansPrefixe = nom => (nom || "").replace(/^!([^!]*)!/, "");

// Phases d'un tour, dans l'ordre : [{ id, nom, numero }]
// phases : [{ id, content }] (seuls name, numero et horsTour sont lus)
export function phasesDuTour(phases) {
    return phases
        .map(p => ({ id: p.id, nom: nomSansPrefixe(p.content?.name), numero: numeroPhase(p.content) }))
        .filter(p => p.numero > 0)
        .sort((a, b) => a.numero - b.numero);
}

// Nombre de figurines par joueur, selon le type de l'unité (unit.jsx).
// Un type absent (infanterie) est illimité : on en crée à la demande, en
// glissant sa source depuis la réserve.
export const LIMITES_UNITES = {
    mech: 4,      // mécha
    fact: 5,      // usine
    dn: 5,        // cuirassé
    trans: 4,     // transport
    cruiser: 8,   // croiseur
    dest: 8,      // destroyeur
    sun: 2,       // soleil de guerre
    fs: 1,        // vaisseau amiral
    dock: 3,      // dock
    pds: 6,       // système de défense
    com: 10,      // frégate marchande
    mon: 1,       // monument
};

// Type d'une unité. Une « infanterie » qui est un vaisseau de commerce
// (mots-clés ship et com) est une frégate marchande mal typée.
export function typeUnite(contenu) {

    const motsCles = contenu?.mot_cle || [];

    if (contenu?.type === "inf" && motsCles.includes("ship") && motsCles.includes("com")) {
        return "com";
    }

    return contenu?.type ?? null;
}

// Sac d'agents : on y tire au hasard les jetons du recrutement
export const SAC = "pioche:sac";

export const AGENTS_PAR_TYPE = 50;

// Cubes du sac : noir = mercenaire, blanc = plan de relique
export const CUBES = [
    ["■ mercenaire", 30],
    ["□ plan de relique", 20],
];

// Dernière case de la piste des points du déroulé
export const MAX_POINTS = 25;

// Actions qui font gagner n points à un joueur : son marqueur avance sur la
// piste des points. Au-delà de la dernière case, un de ses marqueurs reste
// sur cette case (un tour de piste) et le score repart de 0. S'il a plusieurs
// marqueurs sur la piste, ceux de la dernière case sont des tours de piste.
export function actionsPoints(etat, userId, n) {
    return actionsPiste(etat, userId, "points", n);
}

// Même chose pour une piste du déroulé (« points », « infamie », « sieges »).
// Les points et les sièges rebouclent au bout de la piste ; l'infamie
// s'arrête à la dernière case.
export function actionsPiste(etat, userId, piste, n) {

    if (!(n > 0) || !PISTES.includes(piste)) {
        return [];
    }

    const boucle = piste !== "infamie";
    const zone = k => `general:${piste}:${k}`;

    const miens = Object.values(etat.composants).filter(m =>
        !m.ref && m.jeton === MARQUEUR && m.proprio === userId &&
        m.zone.startsWith(`general:${piste}:`));

    const caseDe = m => Number(m.zone.split(":")[2]);
    const marqueur = miens.find(m => caseDe(m) < MAX_POINTS) || miens[0];

    if (!marqueur) {
        return [{ type: "creer", jeton: MARQUEUR, zone: zone(Math.min(n, MAX_POINTS)), proprio: userId }];
    }

    const total = caseDe(marqueur) + n;

    if (total <= MAX_POINTS) {
        return [{ type: "deplacer", c: marqueur.id, vers: zone(total) }];
    }

    if (!boucle) {
        return caseDe(marqueur) < MAX_POINTS
            ? [{ type: "deplacer", c: marqueur.id, vers: zone(MAX_POINTS) }]
            : [];
    }

    return [
        { type: "creer", jeton: MARQUEUR, zone: zone(MAX_POINTS), proprio: userId },
        { type: "deplacer", c: marqueur.id, vers: zone(total - MAX_POINTS) },
    ];
}

// Marqueur d'activation : un marqueur neutre noir, posé sur une planète
// activée (ou sur une de ses ruines : marques.ruine = 1 ou 2)
export const ACTIVATION = "activation";

// Marqueur de trêve : posé sur un système à la phase de déclaration de trêve
// (un diplomate est détruit). Tous sont retirés quand on revient à cette phase.
export const TREVE = "trêve";

// Fragments de relique, obtenus en fouillant une ruine. Une ruine d'un type
// donné rapporte le fragment de ce type (réserve illimitée) ; une ruine
// « normale » fait tirer un fragment dans le sac.
export const SAC_FRAGMENTS = "pioche:fragments";

// type de ruine (champ ruineType d'une planète) -> [jeton, nombre dans le sac]
export const FRAGMENTS = {
    ancien: ["Fragment ancien", 20],
    mil: ["Fragment militaire", 50],
    civ: ["Fragment civil", 50],
    spa: ["Fragment spatial", 30],
};

export const estFragment = c => !c?.ref && Object.values(FRAGMENTS).some(f => f[0] === c?.jeton);

// Cases du haut du déroulé à remplir, lues dans la ligne « Recrutement »
// d'un tour : "3,4,5", "3 4 5" ou "3-5" -> [3, 4, 5]
export function casesRecrutement(texte) {

    const cases = [];

    for (const m of String(texte ?? "").matchAll(/(\d+)\s*-\s*(\d+)|(\d+)/g)) {
        if (m[3]) {
            cases.push(Number(m[3]));
        } else {
            for (let n = Number(m[1]); n <= Number(m[2]); n++) {
                cases.push(n);
            }
        }
    }

    return cases.filter(n => n >= 3 && n <= 9);
}

// Un nom qui commence par !N! donne N exemplaires (même convention que
// la génération des systèmes du plateau). Sinon un seul.
export function exemplaires(nom) {
    const m = /^!(\d+)!/.exec(nom || "");
    return m ? Number(m[1]) : 1;
}

const lienValide = lien => lien && Number.isInteger(lien.id) && lien.id > 0;

// Destinations d'un élément de départ d'une faction (Component/Depart.jsx).
// La première est celle d'une ligne où rien n'est choisi.
export const DESTINATIONS_DEPART = ["main", "actif", "reserve", "agents", "espace", "planete", "tech"];

// Éléments de départ d'une faction : [{ lien, nombre, zone }]
export function lignesDepart(content) {

    const lignes = [];

    for (let i = 0; i < (Number(content?.departNum) || 0); i++) {

        const lien = content.depart?.[i];

        if (!lienValide(lien)) {
            continue;
        }

        lignes.push({
            lien,
            nombre: Math.max(1, Number(content.departNombre?.[i]) || 1),
            zone: DESTINATIONS_DEPART.includes(content.departZone?.[i])
                ? content.departZone[i]
                : DESTINATIONS_DEPART[0],
        });
    }

    return lignes;
}

// Type de lien (Component/TypeLien.jsx) : un élément qui n'est pas « commun »
// (lié à une faction, une faction neutre ou un événement) est écarté des
// réserves communes. Sans ce champ, un élément est commun.
const estCommun = contenu => (contenu?.lienType ?? "commun") === "commun";

function melangerListe(liste, alea) {

    const resultat = [...liste];

    for (let i = resultat.length - 1; i > 0; i--) {
        const j = Math.floor(alea() * (i + 1));
        [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
    }

    return resultat;
}

// Lien vers une unité (un lien sans type est une unité)
const lienUnite = lien => lienValide(lien) && (lien.type || "unit") === "unit";

// partie  : { plateau, joueurs: [{ userId, faction }] }
// charger : async id   -> contenu d'un élément (ou null)
// lister  : async type -> [{ id, content }]
// alea    : () -> nombre dans [0, 1)
export async function miseEnPlace({ partie, charger, lister, alea }) {

    const etat = nouvelEtat();

    // Chaque élément n'est lu qu'une fois
    const lus = new Map();

    async function lire(id) {
        if (!lus.has(id)) {
            lus.set(id, await charger(id));
        }

        return lus.get(id);
    }

    // Planètes d'un système : [{ k: position dans le système, id, contenu }]
    async function planetesDe(systeme) {

        const planetes = [];

        for (const [k, lien] of (systeme?.elems || []).entries()) {
            if (lienValide(lien)) {
                planetes.push({ k, id: lien.id, contenu: await lire(lien.id) });
            }
        }

        return planetes;
    }

    // Pose une tuile système et ses unités natives (unités neutres
    // indiquées sur le système ou sur ses planètes).
    async function poserSysteme(id, index, proprio = null, rotation = 0) {

        const zone = "hex:" + index;

        ajouter(etat, {
            ref: { type: "system", id },
            zone,
            proprio,
            marques: rotation ? { rotation } : {},
        });

        const systeme = await lire(id);

        if (lienUnite(systeme?.nativeUnit)) {
            for (let k = 0; k < (Number(systeme.unitNum) || 1); k++) {
                ajouter(etat, { ref: { type: "unit", id: systeme.nativeUnit.id }, zone });
            }
        }

        for (const planete of await planetesDe(systeme)) {
            if (lienUnite(planete.contenu?.nativeUnit)) {
                for (let k = 0; k < (Number(planete.contenu.unitNum) || 1); k++) {
                    ajouter(etat, {
                        ref: { type: "unit", id: planete.contenu.nativeUnit.id },
                        zone: `${zone}:planete:${planete.k}`,
                    });
                }
            }
        }

        return systeme;
    }

    // --------------------------------------------------------
    // CARTE
    // --------------------------------------------------------

    const contenuPlateau = await charger(partie.plateau);

    if (!contenuPlateau) {
        throw new Error("Plateau introuvable");
    }

    const plateau = normaliserPlateau(contenuPlateau);
    const natals = [];
    const hasards = [];

    etat.anneaux = plateau.anneaux;

    for (const [index, type] of plateau.type.entries()) {

        if (type === "natal") {
            natals.push(index);
        }

        if (type === "rand") {
            hasards.push(index);
        }

        if (type === "select" && lienValide(plateau.systems[index])) {
            await poserSysteme(plateau.systems[index].id, index, null, plateau.rotates[index]);
        }
    }

    // Cases "hasard" : un système tiré au sort, comme le bouton « Générer »
    // de l'éditeur de plateau (systèmes spéciaux exclus, !N! exemplaires).
    {
        const reserve = [];       // tuiles non spéciales
        const speciales = [];     // tuiles spéciales

        // Le système natal d'une faction n'est jamais tiré au hasard
        const natauxDesFactions = new Set(
            (await lister("faction")).map(f => f.content?.system?.id)
        );

        for (const systeme of await lister("system")) {

            // (sauf une tuile en plusieurs exemplaires, comme « !30!vide », le
            // système natal de Winnu : elle reste dans la pioche)
            if (natauxDesFactions.has(systeme.id) && exemplaires(systeme.content?.name) === 1) {
                continue;
            }

            const cible = systeme.content?.special === true ? speciales : reserve;

            for (let k = 0; k < exemplaires(systeme.content?.name); k++) {
                cible.push(systeme.id);
            }
        }

        // Tuiles spéciales déjà posées par le plateau (à ne pas compter deux fois)
        const dejaPosees = Object.values(etat.composants)
            .filter(c => c.ref?.type === "system")
            .map(c => c.ref.id);

        for (const index of hasards) {
            if (!reserve.length) {
                break;
            }

            const [id] = reserve.splice(Math.floor(alea() * reserve.length), 1);

            await poserSysteme(id, index);
        }

        // Pioche de tuiles : les tuiles non spéciales qui restent, mélangées
        // (mélangées avant d'être créées : l'identifiant d'un composant ne
        // doit rien dire de la carte qu'il porte)
        for (const id of melangerListe(reserve, alea)) {
            ajouter(etat, { ref: { type: "system", id }, zone: PIOCHE_TUILES });
        }

        if (reserve.length) {
            appliquer(etat, { type: "melanger", zone: PIOCHE_TUILES }, { alea });
        }

        // Réserve de tuiles spéciales, visible de tous
        for (const id of speciales) {

            const i = dejaPosees.indexOf(id);

            if (i !== -1) {
                dejaPosees.splice(i, 1);
                continue;
            }

            ajouter(etat, { ref: { type: "system", id }, zone: RESERVE_TUILES });
        }
    }

    // --------------------------------------------------------
    // JOUEURS
    // --------------------------------------------------------

    const feuilles = await lister("techsheet");

    // Les places (cases natales) sont tirées au sort
    const places = melangerListe(natals, alea);

    for (const [siege, joueur] of partie.joueurs.entries()) {

        const u = joueur.userId;
        const faction = await charger(joueur.faction);

        for (const nom of ["res", "inf", "commerce"]) {
            etat.compteurs[`joueur:${u}:${nom}`] = 0;
        }

        if (!faction) {
            continue;
        }

        // Système natal, sur la case "natal" tirée au sort pour ce joueur
        let hex = null;
        let planeteDepart = null;

        if (places[siege] !== undefined && lienValide(faction.system)) {

            hex = "hex:" + places[siege];

            const systeme = await poserSysteme(faction.system.id, places[siege], u);
            const planetes = await planetesDe(systeme);

            // Planète de départ : celle de la faction, sinon la première
            planeteDepart =
                planetes.find(p => p.contenu?.homePlanet?.id === joueur.faction) ||
                planetes[0] ||
                null;

            // Le joueur contrôle les planètes de son système natal
            for (const planete of planetes) {
                ajouter(etat, {
                    ref: { type: "planet", id: planete.id },
                    zone: `joueur:${u}:actif`,
                    proprio: u,
                });
            }
        }

        // Unités de départ (unitNum) : les vaisseaux dans l'espace du système
        // natal, les autres sur la planète de départ. Sans système natal,
        // elles vont dans la réserve.
        // La réserve reçoit le reste des figurines du joueur : la limite du
        // type de l'unité, moins celles de départ. Rien pour un type illimité.
        for (const [i, lien] of (faction.units || []).entries()) {

            if (!lienValide(lien)) {
                continue;
            }

            const n = Number(faction.unitNum?.[i]) || 0;
            const unite = await lire(lien.id);
            const vaisseau = unite?.mot_cle?.includes("ship");
            const limite = LIMITES_UNITES[typeUnite(unite)];
            const reserve = `joueur:${u}:reserve`;

            let zone = reserve;

            if (hex) {
                zone = vaisseau || !planeteDepart
                    ? hex
                    : `${hex}:planete:${planeteDepart.k}`;
            }

            const total = limite === undefined ? n : Math.max(n, limite);

            for (let k = 0; k < total; k++) {
                ajouter(etat, {
                    ref: { type: lien.type || "unit", id: lien.id },
                    zone: k < n ? zone : reserve,
                    proprio: u,
                });
            }
        }

        // Agents de départ (agentSetup)
        (faction.agents || []).forEach((lien, i) => {
            const n = Number(faction.agentSetup?.[i]) || 0;

            for (let k = 0; lienValide(lien) && k < n; k++) {
                ajouter(etat, {
                    ref: { type: lien.type || "agent", id: lien.id },
                    zone: `joueur:${u}:agents`,
                    proprio: u,
                });
            }
        });

        // Pose une feuille de technologie : les technologies déjà débloquées
        // ont toutes leurs cases cochées
        async function poserFeuille(idFeuille) {

            // (la liste des feuilles est déjà chargée ; sinon on lit l'élément)
            const contenu = feuilles.find(f => f.id === idFeuille)?.content ?? await lire(idFeuille);

            const c = ajouter(etat, {
                ref: { type: "techsheet", id: idFeuille },
                zone: `joueur:${u}:tech`,
                proprio: u,
            });

            for (const [k, debloquee] of (contenu?.unlocked || []).entries()) {
                if (debloquee) {
                    const tech = lienValide(contenu.techs?.[k])
                        ? await lire(contenu.techs[k].id)
                        : null;

                    etat.compteurs[`joueur:${u}:tech:${c.id}:${k}`] = Number(tech?.cout) || 1;
                }
            }
        }

        // Éléments de départ propres à la faction (table de la faction)
        let feuillesChoisies = 0;

        for (const ligne of lignesDepart(faction)) {

            // Feuilles de technologie choisies à la main (destination « tech »)
            if (ligne.zone === "tech" && (ligne.lien.type || "") === "techsheet") {
                await poserFeuille(ligne.lien.id);
                feuillesChoisies++;
                continue;
            }

            const zone = {
                main: `joueur:${u}:main`,
                actif: `joueur:${u}:actif`,
                reserve: `joueur:${u}:reserve`,
                agents: `joueur:${u}:agents`,
                espace: hex || `joueur:${u}:reserve`,
                planete: hex && planeteDepart
                    ? `${hex}:planete:${planeteDepart.k}`
                    : (hex || `joueur:${u}:reserve`),
                tech: `joueur:${u}:tech`,
            }[ligne.zone];

            for (let k = 0; k < ligne.nombre; k++) {
                ajouter(etat, {
                    ref: { type: ligne.lien.type, id: ligne.lien.id },
                    zone,
                    proprio: u,
                });
            }
        }

        // Faction sans feuille choisie dans ses éléments de départ : pour
        // chaque type, celle de la faction, sinon la feuille commune. Une
        // feuille est à une faction par son lien « faction » ou par son type
        // de lien.
        const factionDe = f =>
            f.lienType === "faction" && lienValide(f.lienElement)
                ? f.lienElement.id
                : (lienValide(f.faction) ? f.faction.id : null);

        for (const type of feuillesChoisies ? [] : TYPES_FEUILLE) {

            const duType = feuilles.filter(f => f.content?.techType === type);

            const feuille =
                duType.find(f => factionDe(f.content) === joueur.faction) ||
                duType.find(f => factionDe(f.content) === null && estCommun(f.content));

            if (feuille) {
                await poserFeuille(feuille.id);
            }
        }
    }

    // --------------------------------------------------------
    // PIOCHES
    // --------------------------------------------------------

    for (const type of TYPES_PIOCHE) {

        const zone = "pioche:" + type;

        const cartes = [];

        for (const carte of await lister(type)) {
            for (let k = 0; estCommun(carte.content) && k < exemplaires(carte.content?.name); k++) {
                cartes.push(carte.id);
            }
        }

        // Mélangées avant d'être créées : l'identifiant ne dit rien de la carte
        for (const id of melangerListe(cartes, alea)) {
            ajouter(etat, { ref: { type, id }, zone });
        }

        if (composantsDeZone(etat, zone).length) {
            appliquer(etat, { type: "melanger", zone }, { alea });
        }
    }

    // Promesses : une réserve commune, visible de tous
    for (const carte of await lister("Promesse")) {
        for (let k = 0; estCommun(carte.content) && k < exemplaires(carte.content?.name); k++) {
            ajouter(etat, { ref: { type: "Promesse", id: carte.id }, zone: "general:promesses" });
        }
    }

    // --------------------------------------------------------
    // SAC D'AGENTS
    //
    // 50 agents de chaque type de base (les agents communs à
    // plusieurs factions), 30 cubes noirs et 20 cubes blancs.
    // --------------------------------------------------------

    const utilisations = new Map();

    for (const faction of await lister("faction")) {
        for (const lien of faction.content?.agents || []) {
            if (lienValide(lien)) {
                utilisations.set(lien.id, (utilisations.get(lien.id) || 0) + 1);
            }
        }
    }

    const agentsBase = (await lister("agent"))
        .filter(agent => utilisations.get(agent.id) >= 2)
        .map(agent => agent.id);

    // Sert aussi à la réserve infinie d'agents du plateau général
    etat.references.agentsBase = agentsBase;

    // Les sacs sont mélangés avant la création de leur contenu : l'identifiant
    // d'un composant ne dit pas ce qu'il est
    const contenuSac = [];

    for (const id of agentsBase) {
        for (let k = 0; k < AGENTS_PAR_TYPE; k++) {
            contenuSac.push({ ref: { type: "agent", id }, zone: SAC });
        }
    }

    for (const [jeton, nombre] of CUBES) {
        for (let k = 0; k < nombre; k++) {
            contenuSac.push({ jeton, zone: SAC });
        }
    }

    for (const composant of melangerListe(contenuSac, alea)) {
        ajouter(etat, composant);
    }

    appliquer(etat, { type: "melanger", zone: SAC }, { alea });

    // Sac de fragments de relique (fouille d'une ruine « normale »)
    const contenuFragments = [];

    for (const [jeton, nombre] of Object.values(FRAGMENTS)) {
        for (let k = 0; k < nombre; k++) {
            contenuFragments.push({ jeton, zone: SAC_FRAGMENTS });
        }
    }

    for (const composant of melangerListe(contenuFragments, alea)) {
        ajouter(etat, composant);
    }

    appliquer(etat, { type: "melanger", zone: SAC_FRAGMENTS }, { alea });

    // --------------------------------------------------------
    // PLATEAU GÉNÉRAL
    // --------------------------------------------------------

    const deroules = await lister("deroule");

    if (deroules.length) {

        etat.references.deroule = deroules[0].id;

        const deroule = deroules[0].content || {};

        // Objectifs militaires : un par tour qui en prévoit un, dans sa case du
        // déroulé. « Le prochain objectif militaire est toujours visible » :
        // le premier est face visible, les suivants face cachée.
        let premier = true;

        for (const [tour, prevu] of (deroule.militaire || []).entries()) {

            const dessus = composantsDeZone(etat, "pioche:militaire").at(-1);

            if (!prevu || !dessus) {
                continue;
            }

            dessus.zone = "general:militaire:" + (tour + 1);
            dessus.ordre = etat.prochainOrdre++;
            dessus.face = premier ? "recto" : "cache";
            premier = false;
        }

        // Événements : pour chaque tour, une carte du type prévu (mineur ou
        // majeur) tirée de la pioche. Le premier est visible, les autres cachés.
        const typeEvenement = new Map(
            (await lister("evenement")).map(e => [e.id, e.content?.type || "min"])
        );

        premier = true;

        for (const [tour, type] of (deroule.evenement || []).entries()) {

            if (type !== "min" && type !== "maj") {
                continue;
            }

            // La pioche est mélangée : la première carte du bon type en partant du dessus
            const carte = composantsDeZone(etat, "pioche:evenement")
                .reverse()
                .find(c => typeEvenement.get(c.ref.id) === type);

            if (!carte) {
                continue;
            }

            carte.zone = "general:evenement:" + (tour + 1);
            carte.ordre = etat.prochainOrdre++;
            carte.face = premier ? "recto" : "cache";
            premier = false;
        }

        // Postes de ministre : pour chaque tour, le nombre prévu d'agendas de
        // type « mandat » tirés de la pioche, dans la case Agenda du tour.
        // Les agendas de tous les tours sont visibles de tout le monde.
        const typeAgenda = new Map(
            (await lister("Agenda")).map(e => [e.id, e.content?.type])
        );

        for (const [tour, nombre] of (deroule.ministre || []).entries()) {

            for (let k = 0; k < (Number(nombre) || 0); k++) {

                const carte = composantsDeZone(etat, "pioche:Agenda")
                    .reverse()
                    .find(c => typeAgenda.get(c.ref.id) === "mand");

                if (!carte) {
                    break;
                }

                carte.zone = "general:agenda:" + (tour + 1);
                carte.ordre = etat.prochainOrdre++;
                carte.face = "recto";
            }
        }

        // Votes au conseil : pour chaque tour qui en prévoit (lignes « siège » du
        // déroulé), la directive « Vote au conseil N » correspondante, N étant le
        // nombre de sièges du premier. Ces cartes sont hors réserve commune.
        const votesConseil = new Map();

        for (const agenda of await lister("Agenda")) {

            const m = /^(?:!\d+!)?\s*vote au conseil\s*(\d+)/i.exec(agenda.content?.name || "");

            if (m) {
                votesConseil.set(Number(m[1]), agenda.id);
            }
        }

        for (const ligne of [deroule.siege, deroule.siege2]) {

            for (const [tour, nombre] of (ligne || []).entries()) {

                const id = votesConseil.get(Number(nombre) || 0);

                if (id) {
                    ajouter(etat, {
                        ref: { type: "Agenda", id },
                        zone: "general:agenda:" + (tour + 1),
                    });
                }
            }
        }
    }

    // Plateau de vote (onglet Vote)
    const votes = await lister("vote");

    if (votes.length) {
        etat.references.vote = votes[0].id;
    }

    // La partie commence au tour 0, sans phase : chaque joueur applique la
    // mise en place de sa faction. « Nouveau tour » lance le tour 1.
    etat.tour = 0;
    etat.phase = "";

    // --------------------------------------------------------
    // INITIATIVE
    //
    // Ordre tiré au sort : un marqueur par joueur sur les cases
    // d'initiative du déroulé (la 6e est le chef du sénat).
    // --------------------------------------------------------

    const ordre = melangerListe(partie.joueurs, alea);

    ordre.forEach((joueur, k) => {
        ajouter(etat, {
            jeton: MARQUEUR,
            zone: "general:initiative:" + (k + 1),
            proprio: joueur.userId,
        });
    });

    // Marqueurs sur la case 0 des points, de l'infamie et des sièges
    for (const joueur of partie.joueurs) {
        for (const piste of PISTES) {
            ajouter(etat, {
                jeton: MARQUEUR,
                zone: `general:${piste}:0`,
                proprio: joueur.userId,
            });
        }
    }

    etat.joueurActif = ordre[0]?.userId ?? null;

    return etat;
}
