import { MARQUEUR, MAX_POINTS } from "./etat.js";
import { campDe, NEUTRE, RESSOURCES } from "./miseEnPlace.js";

// ============================================================
// DÉCOMPTE DES POINTS (règle pure)
//
// Phase de décompte (fin du tour 10, ou fin de partie déclenchée par
// un événement) : « comptez vos points ». Les points gagnés pendant
// la partie sont déjà sur la piste Points ; s'y ajoute ce que les
// cartes donnent ou retirent « #Decomp » :
//
//   connaissance  chaque niveau d'une feuille de technologie rapporte
//                 les points écrits sur la feuille (1 ou 2) ; « les
//                 factions qui ont le plus de connaissances gagnent
//                 2/1 » : 2 points pour la faction qui a seule le plus
//                 haut niveau de ce type, 1 pour chacune à égalité
//                 (variante : « si aucune faction n'a plus de
//                 connaissance que vous » — le bonus même à égalité)
//   sièges        1 point par siège au sénat
//   infamie       la case du marqueur dit les points retirés ; loi
//                 Sévérité (#306) en jeu : 1 de plus par infamie
//   éléments      Canon restauré (#30, à qui le possède), Colonie
//                 Ladaran (#590), Armageddon conquis (#490, 2 de plus
//                 reforgé), Arbre de vie éternelle (#571, sans dégât),
//                 Graine d'eden (#470, si New eden #469 est posé sur
//                 sa planète), Monument éternel (#554, 1 point par
//                 4 contributions de la faction)
//   reliques      Spectre de l'empereur (#387, système natal
//                 contrôlé), Plan ancien (#853, 1 par relique forgée)
//
// Une unité rapporte à son camp ; l'unité neutre posée sur une
// planète, à qui possède la planète ; l'unité neutre de l'espace
// n'est attribuée à personne (liste `nonAttribues`).
// ============================================================

// Points retirés par la case d'infamie (piste du déroulé : deroule.jsx, tableau `infa`)
export const INFAMIE_POINTS = [
    0, 3, 5, 7, 8, 9, 10, 11, 11, 12,
    12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17,
    18, 18, 19, 19, 20,
];

export const cleDecompte = userId => `decompte:${userId}`;

// Marqueurs d'un joueur sur une piste du déroulé
const marqueursDe = (etat, userId, piste) => Object.values(etat.composants).filter(m =>
    !m.ref && m.jeton === MARQUEUR && m.proprio === userId && new RegExp(`^general:${piste}:\\d+$`).test(m.zone || ""));

const caseDe = m => Number(m.zone.split(":")[2]);

// Total d'un joueur sur une piste : la somme des cases de ses marqueurs (un marqueur resté sur
// la dernière case est un tour de piste — actionsPiste, etat.js)
export const totalPiste = (etat, userId, piste) =>
    marqueursDe(etat, userId, piste).reduce((total, m) => total + caseDe(m), 0);

// Infamie d'un joueur : la case de son marqueur
export const infamieDe = (etat, userId) => Math.max(0, ...marqueursDe(etat, userId, "infamie").map(caseDe));

// Texte d'une carte, sans balises
const texteDe = html => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

// Ce que le texte d'une feuille de technologie dit du décompte :
//   { parNiveau, majorite : null | "partage" (2 seul, 1 à égalité) | "aucunePlus", bonus }
export function decompteDeFeuille(contenu) {

    const texte = texteDe(contenu?.connaissance);
    const parNiveau = Number(/niveau de connaissance rapporte #point\((\d+)\)/i.exec(texte)?.[1]) || 0;
    const aucunePlus = /aucune faction n'a plus de connaissance que vous[^#]*#point\((\d+)\)/i.exec(texte);

    return {
        parNiveau,
        majorite: aucunePlus ? "aucunePlus" : (/plus de connaissances? gagnent 2\/1/i.test(texte) ? "partage" : null),
        bonus: aucunePlus ? Number(aucunePlus[1]) : 2,
    };
}

// Le décompte de tous les joueurs.
//   etat, index
//   joueurs          [userId]
//   contenuDe        id -> contenu d'un élément (null s'il n'est pas chargé)
//   feuillesDe       userId -> [{ id (de la feuille), type, niveau }]
//   nomDe            ref -> nom d'un élément
//   possesseurDe     zone d'une planète -> userId du joueur qui la possède, ou null
//   controleNatal    userId -> "oui", "non", "dispute", "enCours" (contrôle de son système natal), ou null
// -> { parJoueur : { [userId]: { piste, lignes : [{ libelle, points, note }], gains, total } },
//      nonAttribues : [texte], aLaMain : [texte] }
export function decompte({ etat, index, joueurs, contenuDe, feuillesDe, nomDe, possesseurDe, controleNatal }) {

    const lignes = Object.fromEntries(joueurs.map(u => [u, []]));
    const nonAttribues = [];
    const aLaMain = [];
    const ajouter = (u, libelle, points, note = "") => lignes[u]?.push({ libelle, points, note });

    const surLaTable = (type, id) => (index.parZone.get("general:table") || []).some(c => !c.cache && c.ref?.type === type && c.ref.id === id);
    const actifs = u => (index.parZone.get(`joueur:${u}:actif`) || []).filter(c => !c.cache);

    // ---- connaissance ----
    const meilleur = {};

    for (const u of joueurs) {
        for (const f of feuillesDe(u)) {
            meilleur[f.type] = Math.max(meilleur[f.type] || 0, f.niveau);
        }
    }

    // (nombre de factions au plus haut niveau d'un type : leur meilleure feuille de ce type)
    const auSommet = type => joueurs.filter(u => feuillesDe(u).some(f => f.type === type && f.niveau === meilleur[type])).length;

    for (const u of joueurs) {
        for (const f of feuillesDe(u)) {

            const regle = decompteDeFeuille(contenuDe(f.id));
            const nom = `Connaissance ${nomDe({ type: "techsheet", id: f.id })}`;

            if (regle.parNiveau && f.niveau > 0) {
                ajouter(u, `${nom} : niveau ${f.niveau}`, f.niveau * regle.parNiveau,
                    regle.parNiveau > 1 ? `${regle.parNiveau} points par niveau` : "");
            }

            if (regle.majorite && f.niveau > 0 && f.niveau === meilleur[f.type]) {

                const seule = auSommet(f.type) === 1;

                ajouter(u, `${nom} : le plus de connaissance`, regle.majorite === "aucunePlus" || seule ? regle.bonus : 1,
                    seule ? "seule au plus haut niveau" : "à égalité au plus haut niveau");
            }
        }
    }

    // ---- sièges au sénat, infamie ----
    const severite = surLaTable("Agenda", 306);

    for (const u of joueurs) {

        const sieges = totalPiste(etat, u, "sieges");

        if (sieges > 0) {
            ajouter(u, `Sièges au sénat : ${sieges}`, sieges);
        }

        const infamie = infamieDe(etat, u);

        if (infamie > 0) {
            ajouter(u, `Infamie : case ${infamie}`, -(INFAMIE_POINTS[Math.min(infamie, INFAMIE_POINTS.length - 1)] || 0));

            if (severite) {
                ajouter(u, "Sévérité (loi) : 1 de plus par infamie", -infamie);
            }
        }
    }

    // ---- éléments de la carte ----
    const estPlanete = zone => /^hex:\d+:planete:\d+$/.test(zone || "");
    const portes = c => Object.values(etat.composants).filter(x => x.sur === c.id);

    // À qui rapporte une unité : son camp ; neutre sur une planète : à qui possède la planète
    const beneficiaire = c => {
        const camp = campDe(c);
        return camp !== NEUTRE ? camp : (estPlanete(c.zone) ? possesseurDe(c.zone) : null);
    };

    const attribuer = (c, libelle, points, note) => {

        const u = beneficiaire(c);

        if (u !== null && lignes[u]) {
            ajouter(u, libelle, points, note);
        } else {
            nonAttribues.push(`${libelle} (${points} point${points > 1 ? "s" : ""}) : unité neutre sans possesseur`);
        }
    };

    for (const c of Object.values(etat.composants)) {

        if (c.cache || c.ref?.type !== "unit" || !/^hex:\d+/.test(c.zone || "")) {
            continue;
        }

        if (c.ref.id === 590) {
            attribuer(c, "Colonie Ladaran", 2);
        } else if (c.ref.id === 490) {

            const reforge = portes(c).some(x => x.ref?.type === "agent");

            attribuer(c, "Armageddon conquis", reforge ? 4 : 2, reforge ? "reforgé : 2 de plus" : "");
        } else if (c.ref.id === 571 && !(Number(c.marques?.degat) > 0)) {
            attribuer(c, "Arbre de vie éternelle", 3, "sans dégât");
        } else if (c.ref.id === 470 && (index.parZone.get(c.zone) || []).some(x => !x.cache && x.ref?.type === "planet" && x.ref.id === 469)) {
            attribuer(c, "Graine d'eden", 5, "New eden posé sur la planète");
        } else if (c.ref.id === 554) {

            // (contributions : le commerce que chaque faction a posé sur le monument)
            for (const u of joueurs) {

                const contributions = portes(c)
                    .filter(x => !x.ref && x.jeton === RESSOURCES.commerce[0] && x.proprio === u)
                    .reduce((total, x) => total + (Number(x.marques?.montant) || 1), 0);

                if (contributions >= 4) {
                    ajouter(u, `Monument éternel : ${contributions} contributions`, Math.floor(contributions / 4), "1 point par 4");
                }
            }
        }
    }

    // ---- cartes des joueurs ----
    for (const u of joueurs) {

        const cartes = actifs(u);
        const a = (type, id) => cartes.some(c => c.ref?.type === type && c.ref.id === id);

        if (a("planet", 30)) {
            ajouter(u, "Canon restauré", 1);
        }

        if (a("relique", 387)) {

            const controle = controleNatal(u);

            if (controle === "oui") {
                ajouter(u, "Spectre de l'empereur", 3, "système natal contrôlé");
            } else if (controle === "dispute" || controle === "enCours") {
                ajouter(u, "Spectre de l'empereur", 0, "système natal disputé : 3 points si le conflit de contrôle est gagné");
            }
        }

        if (a("relique", 853)) {

            // (reliques forgées : cartes relique, Relique reforgée #131, Portail de repli #155)
            const forgees = cartes.filter(c => c.ref?.type === "relique").length + (a("planet", 131) ? 1 : 0) +
                Object.values(etat.composants).filter(c => !c.cache && c.ref?.type === "unit" && c.ref.id === 155 &&
                    /^hex:\d+/.test(c.zone || "") && campDe(c) === u).length;

            ajouter(u, `Plan ancien : ${forgees} relique(s) forgée(s)`, forgees);
        }
    }

    // ---- ce que l'outil ne compte pas ----
    if (surLaTable("Agenda", 728)) {
        aLaMain.push("Orientation de l'empire (loi) : selon l'orientation votée — expansion (1 par planète), économique (1 de plus par 5 commerce), " +
            "scientifique (3 par technologie à 4 de connaissance), diplomatique (2 par faveur encaissée au tour 10).");
    }

    const parJoueur = Object.fromEntries(joueurs.map(u => {

        const piste = totalPiste(etat, u, "points");
        const gains = lignes[u].reduce((total, l) => total + l.points, 0);
        // (points du décompte déjà marqués sur la piste : compteur à gains + 1000)
        const marque = etat.compteurs[cleDecompte(u)] ? Number(etat.compteurs[cleDecompte(u)]) - 1000 : null;

        return [u, { piste, lignes: lignes[u], gains, marque, total: Math.max(0, marque === null ? piste + gains : piste) }];
    }));

    return { parJoueur, nonAttribues, aLaMain };
}

// Actions qui amènent le total des points d'un joueur à `cible` (≥ 0) : son marqueur avance ou
// recule ; au-delà de la dernière case, un marqueur reste dessus par tour de piste.
export function actionsPointsA(etat, userId, cible) {

    const total = Math.max(0, Math.floor(cible));
    const zone = k => `general:points:${k}`;
    const miens = marqueursDe(etat, userId, "points");

    // Marqueurs voulus : des tours de piste sur la dernière case, et le reste
    const tours = total > MAX_POINTS ? Math.floor((total - 1) / MAX_POINTS) : 0;
    const voulus = [...Array.from({ length: tours }, () => MAX_POINTS), total - tours * MAX_POINTS];

    // (ceux de la dernière case d'abord : ils y restent)
    const tries = [...miens].sort((a, b) => caseDe(b) - caseDe(a));

    return [
        ...voulus.map((k, i) => (tries[i]
            ? (caseDe(tries[i]) !== k ? { type: "deplacer", c: tries[i].id, vers: zone(k) } : null)
            : { type: "creer", jeton: MARQUEUR, zone: zone(k), proprio: userId })),
        ...tries.slice(voulus.length).map(m => ({ type: "supprimer", c: m.id })),
    ].filter(Boolean);
}
