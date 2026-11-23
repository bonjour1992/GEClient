// ============================================================
// AGENDAS EN JEU (règle pure)
//
// Une loi ou un traité vaut tant que sa carte est sur la table
// (general:table). Quand son vote élit quelque chose, son script de
// résolution (resolutionsAgendas.js) l'écrit en marque sur la carte :
//
//   Activité réprimée (#332)        agentReprime : id de l'agent de base élu
//   Orientation de l'empire (#728)  orientation : "expansion", "economique",
//                                   "diplomatique" ou "scientifique"
//   Zone démilitarisée (#579)       systeme : numéro de la case élue
//   Prime (#337)                    elu : la faction élue (et son marqueur sur
//                                   la carte), avec un jeton de commerce posé dessus
//
// Les scripts qui appliquent l'effet (aScript : la carte est sur la table)
// lisent ces marques ici.
// ============================================================

import { MARQUEUR } from "./etat.js";
import { RESSOURCES } from "./miseEnPlace.js";

export const ACTIVITE_REPRIMEE = 332;
export const ORIENTATION_DE_L_EMPIRE = 728;
export const ZONE_DEMILITARISEE = 579;
export const MONUMENT_SUPREME = 555;
export const MONUMENT_ETERNEL = 554;
export const TROU_DE_VER_BETA = 827;
export const PRIME = 337;
export const PREMIER_MINISTRE = 223;
export const CONCLAVE = 718;
export const SOUTIEN_POLITIQUE = 227;
export const MECATOL_REX = 34;
export const MILICIEN_MERCENAIRE = 723;
export const CUIRASSE_IMPERIAL = 496;

// Zone d'une planète sur la carte (hex:<case>:planete:<k>), la case dont la tuile la porte ; ou null
//   contenuDe(id) : contenu d'un élément déjà chargé (les systèmes de la carte)
export const zoneDePlanete = (index, contenuDe, idPlanete) => [...index.parZone].flatMap(([z, contenu]) => {
    const tuile = /^hex:\d+$/.test(z) && contenu.find(x => x.ref?.type === "system");
    const k = tuile ? (contenuDe?.(tuile.ref.id)?.elems || []).findIndex(lien => Number(lien?.id) === idPlanete) : -1;
    return k >= 0 ? [`${z}:planete:${k}`] : [];
})[0] ?? null;

// Prime (#337) sur la table : { carte, elu (la faction élue), jetons (commerce posé sur la carte),
// reste (commerce restant) }, ou null
export function primeEnJeu(etat, index) {

    const carte = agendaSurLaTable(index, PRIME);

    if (!carte) {
        return null;
    }

    const jetons = Object.values(etat.composants)
        .filter(x => x.sur === carte.id && !x.ref && x.jeton === RESSOURCES.commerce[0]);

    return {
        carte,
        elu: Number(carte.marques?.elu) || null,
        jetons,
        reste: jetons.reduce((total, x) => total + (Number(x.marques?.montant) || 1), 0),
    };
}

// Prime : chaque vaisseau de la faction élue détruit fait prendre 1 commerce sur la carte à la
// faction qui l'a détruit, tant qu'il en reste ; vide, la carte est dépensée (retirée du jeu, sans
// ses marqueurs).
//   destructeurs : la faction qui a détruit chaque vaisseau, dans l'ordre
//   -> { actions, gains: Map(faction -> commerce pris), vide }
export function partagePrime(etat, prime, destructeurs) {

    const gains = new Map();
    const pris = Math.min(prime.reste, destructeurs.length);

    destructeurs.slice(0, pris).forEach(camp => gains.set(camp, (gains.get(camp) || 0) + 1));

    const actions = [...gains].map(([camp, n]) => ({ type: "compteur", id: `joueur:${camp}:commerce`, delta: n }));
    let aPrendre = pris;

    for (const jeton of prime.jetons) {

        if (aPrendre <= 0) {
            break;
        }

        const montant = Number(jeton.marques?.montant) || 1;
        const n = Math.min(montant, aPrendre);

        actions.push(n === montant
            ? { type: "supprimer", c: jeton.id }
            : { type: "marquer", c: jeton.id, marque: "montant", valeur: montant - n });
        aPrendre -= n;
    }

    const vide = pris > 0 && pris >= prime.reste;

    if (vide) {
        actions.push(
            ...Object.values(etat.composants).filter(x => x.sur === prime.carte.id && !x.ref && x.jeton === MARQUEUR)
                .map(x => ({ type: "supprimer", c: x.id })),
            { type: "deplacer", c: prime.carte.id, vers: "horsJeu" },
        );
    }

    return { actions, gains, vide };
}

export const ORIENTATIONS = ["expansion", "economique", "diplomatique", "scientifique"];

// Carte d'agenda posée sur la table, ou null
export const agendaSurLaTable = (index, id) =>
    (index.parZone.get("general:table") || []).find(c => !c.cache && c.ref?.type === "Agenda" && c.ref.id === id) || null;

// Ce que le vote d'une loi ou d'un traité de la table a élu (marque de sa carte), ou null
export const eluDeLAgenda = (index, id, marque) => {
    const valeur = agendaSurLaTable(index, id)?.marques?.[marque];

    return valeur === undefined || valeur === null || valeur === "" ? null : valeur;
};

// Agent de base dont le recrutement coûte 1 influence de plus (Activité réprimée), ou null
export const agentReprime = index => {
    const id = Number(eluDeLAgenda(index, ACTIVITE_REPRIMEE, "agentReprime"));

    return id > 0 ? id : null;
};

// Case où les engagements sont interdits (Zone démilitarisée), ou null
export const caseDemilitarisee = index => {
    const valeur = eluDeLAgenda(index, ZONE_DEMILITARISEE, "systeme");

    return valeur === null ? null : Number(valeur);
};

// Orientation de l'empire votée, ou null
export const orientationElue = index => {
    const valeur = eluDeLAgenda(index, ORIENTATION_DE_L_EMPIRE, "orientation");

    return ORIENTATIONS.includes(valeur) ? valeur : null;
};

// Mandat d'agenda d'un joueur (dans ses éléments actifs), ou null
export const mandatDe = (index, u, id) =>
    (index.parZone.get(`joueur:${u}:actif`) || []).find(c => !c.cache && c.ref?.type === "Agenda" && c.ref.id === id) || null;

// Texte sans accents, en minuscules (« Économique » -> « economique »)
export const sansAccents = texte => String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
