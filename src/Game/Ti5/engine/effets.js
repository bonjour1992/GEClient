// ============================================================
// EFFETS DES TECHNOLOGIES (scripts de sorte « effet », scripts.js)
//
// Calculs partagés par plusieurs écrans. Chacun prend `aScript`
// (contexte de la partie) : aScript(joueur, id) dit si le script est
// en service et si le joueur a débloqué sa technologie. Ce fichier
// n'importe que miseEnPlace.js (constantes et fonctions pures) : tout
// écran peut s'en servir.
// ============================================================

import { campDe, ACTIVATION } from "./miseEnPlace.js";
import { demander } from "./demande.js";

// ------------------------------------------------------------
// DÉ À 10 FACES : NUMÉROTÉ DE 0 À 9
//
// Les dés du jeu sont des D10 classiques, numérotés de 0 à 9 : le 0 vaut
// zéro, pas dix (règle « Jet »). Le serveur les tire ainsi (etat.js,
// action « des », premiereFace) et la marque d'un dé garde la face tirée :
// « 0 » est donc un résultat, et un dé pas encore lancé se reconnaît à sa
// marque ABSENTE, jamais à une valeur nulle. Les dés d'un autre nombre de
// faces (1D6, 1D3) vont de 1 à leur nombre de faces.
// ------------------------------------------------------------

// Face d'un jet isolé gardé dans une marque (« 7 », « 0 »), ou null tant que le
// dé n'est pas lancé — une marque absente, ou qui ne porte pas un nombre.
export const faceDe = marque => (/^\d+$/.test(String(marque ?? "")) ? Number(marque) : null);

// Dés lancés par le serveur et lus dans sa réponse. Un coup lance 30 dés au
// plus : lotsDeDes découpe un jet en actions « des ». desDeLaReponse rend,
// dans l'ordre, les faces des dés du dernier coup de `moi` dans la
// réponse d'envoyer() — undefined si elle est illisible.
export const lotsDeDes = (n, faces) => Array.from({ length: Math.ceil(n / 30) },
    (_, i) => ({ type: "des", n: Math.min(30, n - 30 * i), faces }));

export const desDeLaReponse = (reponse, moi) => [...(reponse?.coups || [])]
    .sort((a, b) => b.n - a.n)
    .find(x => x.auteur === moi)?.actions.filter(a => a.type === "des").flatMap(a => a.resultats || []);

// ------------------------------------------------------------
// PILLAGE (#pill)
//
// Qui détruit l'unité gagne ce que dit son texte, toujours entre
// parenthèses : « #pill(4) » — du commerce ; « #pill(#point(1)) »,
// « #Pill(#Infa(1) et #Point(1)) », « #pill(#rerupt(3)) » — des points,
// de l'infamie, de la recherche. -> { commerce, points, infamie,
// recherche: [[type, n]…], aLaMain } ou null si l'unité n'a pas de pillage.
// (aLaMain : butin que l'outil ne sait pas compter, « #com ici ».)
// ------------------------------------------------------------

export function lirePillage(contenu) {

    const texte = String(contenu?.habilite || "")
        .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

    const butin = { commerce: 0, points: 0, infamie: 0, recherche: [], aLaMain: false };
    let trouve = false;

    for (const m of texte.matchAll(/#pill\(((?:[^()]|\([^()]*\))*)\)/gi)) {

        trouve = true;

        const argument = m[1].trim();

        if (/^\d+$/.test(argument)) {
            butin.commerce += Number(argument);
            continue;
        }

        if (/\bici\b/i.test(argument)) {
            butin.aLaMain = true;
            continue;
        }

        for (const g of argument.matchAll(/#(point|infa|com|re[a-z]+)\s*(?:\((\d+)\))?/gi)) {

            const n = Number(g[2]) || 1;
            const cle = g[1].toLowerCase();

            if (cle === "point") {
                butin.points += n;
            } else if (cle === "infa") {
                butin.infamie += n;
            } else if (cle === "com") {
                butin.commerce += n;
            } else {
                butin.recherche.push([cle.slice(2), n]);
            }
        }
    }

    return trouve ? butin : null;
}

// Camp qui a infligé le dernier dégât à cette unité (marque « degatDe » : « c<camp> ») ou null
export function auteurDesDegats(c) {

    const m = /^c(\d+)$/.exec(String(c?.marques?.degatDe ?? ""));

    return m ? Number(m[1]) : null;
}

// Place que prend une unité à bord d'un vaisseau : « Nécessite 3 de capacité »
// dans son texte (Mech géant), sinon 1
export const placePrise = contenu =>
    Number(/n[ée]cessite\s+(\d+)\s+de\s+capacit/i.exec(String(contenu?.habilite || "").replace(/<[^>]+>/g, " "))?.[1]) || 1;

// Capacité d'un vaisseau. Capsule de transport : +1, +2 pour un transporteur.
export function capaciteDe(contenu, possesseur, aScript) {

    const base = Number(contenu?.capacite) || 0;

    return base && aScript?.(possesseur, "capsule-de-transport")
        ? base + (contenu.type === "trans" ? 2 : 1)
        : base;
}

// Résistance d'une unité : { valeur, bonus }. Blindage en duranium : +1 pour
// les vaisseaux amiraux, soleils de guerre, cuirassés et transporteurs — selon
// le type de l'unité, pas son nom (les cuirassés spéciaux en profitent).
const TYPES_BLINDES = ["fs", "sun", "dn", "trans"];

// Soleil de guerre : l'unité de ce type, ou celle qui en porte le nom (le vaisseau amiral
// des Braises de Muaat est un soleil de guerre) — technologies de la forge d'arme
export const estSoleilDeGuerre = contenu => contenu?.type === "sun" || /soleil de guerre/i.test(contenu?.name || "");

// Bouclier amplifié : +2 pour le vaisseau amiral et les systèmes de défense,
// +1 pour les boucliers mobiles.
// Coque stellaire (forge d'arme de Muaat) : +1 pour les soleils de guerre.
export function resistanceDe(contenu, possesseur, aScript) {

    const base = Number(contenu?.PV) || 0;
    const a = id => base > 0 && !!aScript?.(possesseur, id);

    const bonus =
        (a("coque-stellaire") && estSoleilDeGuerre(contenu) ? 1 : 0) +
        (a("blindage-en-duranium") && TYPES_BLINDES.includes(contenu?.type) ? 1 : 0) +
        (a("bouclier-amplifie")
            ? (["fs", "pds"].includes(contenu?.type) ? 2 : (/bouclier mobile/i.test(contenu?.name || "") ? 1 : 0))
            : 0);

    return { valeur: base + bonus, bonus };
}

// Valeur de contrôle d'une unité (blocage d'un déplacement, conflits de contrôle
// et de domination) : celle de son texte, « #con(3) », sinon 1. Rayon tracteur :
// +1 pour un vaisseau qui a plus de 1 de résistance.
export function controleDe(contenu, possesseur, aScript) {

    const ecrit = Number(/#con\((\d+)\)/i.exec(contenu?.habilite || "")?.[1]);

    return (Number.isFinite(ecrit) ? ecrit : 1) +
        (contenu?.mot_cle?.includes("ship") && Number(contenu?.PV) > 1 && aScript?.(possesseur, "rayon-tracteur") ? 1 : 0);
}

// Déplacement furtif : le vaisseau ne peut pas être bloqué par des unités adverses
// (capacité #deplfurtif de son texte, ou script Camouflage de son joueur)
export const estDeplacementFurtif = (contenu, possesseur, aScript) =>
    /#deplfurtif\b/i.test(contenu?.habilite || "") || !!aScript?.(possesseur, "camouflage");

// SR-217 (station de recherche) : quand je la possède (sa carte dans mes éléments actifs) et
// qu'elle n'est pas activée, un agent à dépenser peut être usé à la place — la station est
// activée et 3 ressources payées. -> zone de la station sur la carte, ou null
export const SR_217 = 1263;

async function stationSR217({ aScript, moi, etat }) {

    if (!aScript(moi, "sr-217-agent")) {
        return null;
    }

    const composants = Object.values(etat.composants);

    if (!composants.some(c => !c.cache && c.ref?.type === "planet" && c.ref.id === SR_217 && c.zone === `joueur:${moi}:actif`)) {
        return null;
    }

    // (import à la demande : les outils Node qui lisent ce fichier n'ont pas le cache des éléments)
    const { contenuEnCache } = await import("./sync.js");
    const rang = tuile => (contenuEnCache(tuile.ref.id)?.elems || []).findIndex(lien => Number(lien?.id) === SR_217);
    const tuile = composants.find(c => c.ref?.type === "system" && /^hex:\d+$/.test(c.zone || "") && rang(c) >= 0);

    if (!tuile) {
        return null;
    }

    const zone = `${tuile.zone}:planete:${rang(tuile)}`;
    const activee = composants.some(c => !c.ref && c.jeton === ACTIVATION && c.zone === zone && !c.marques?.ruine);

    return activee ? null : zone;
}

// Actions qui dépensent (détruisent) un de mes agents. Bio stimulant et SR-217 : une
// décision (onglet Décision) propose de l'utiliser à la place — 2 ressources (Bio
// stimulant), ou la station activée et 3 ressources (SR-217) ; la fonction est donc
// asynchrone.
//   nom : celui de l'agent, pour la question
export async function depenserAgent({ aScript, moi, etat }, agent, nom = "cet agent") {

    if (!agent) {
        return [];
    }

    const ressources = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;
    const estAgent = agent.ref?.type === "agent";

    const bio = estAgent && aScript(moi, "bio-stimulant");
    const station = estAgent ? await stationSR217({ aScript, moi, etat }) : null;

    const choix = (bio || station) ? await demander({
        titre: bio && station ? "Agent à dépenser" : (bio ? "Bio stimulant" : "SR-217"),
        texte: `${nom} doit être détruit.`,
        choix: [
            bio && { valeur: 1, libelle: `L'utiliser et payer 2 ressources à la place (Bio stimulant ; vous en avez ${ressources})` },
            station && { valeur: 3, libelle: `L'utiliser : activer SR-217 et payer 3 ressources à la place (vous en avez ${ressources})` },
            { valeur: 2, libelle: "Le détruire" },
        ].filter(Boolean),
        renoncer: false,
    }) : 2;

    const user = { type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` };

    if (choix === 1) {
        return [user, { type: "compteur", id: `joueur:${moi}:res`, delta: -2 }];
    }

    if (choix === 3 && station) {
        return [user, { type: "compteur", id: `joueur:${moi}:res`, delta: -3 }, { type: "creer", jeton: ACTIVATION, zone: station }];
    }

    return [{ type: "supprimer", c: agent.id }];
}

// Bombe bactériologique : quand un de ses dégâts (affichés en vert) détruit
// une infanterie biologique, deux autres infanteries identiques — même unité,
// même camp, même lieu, encore debout — sont détruites aussi.
//   deja : identifiants déjà touchés par le même coup
//   -> actions qui les marquent détruites
export function victimesBombe(etat, touchee, contenu, deja = []) {

    if (contenu?.type !== "inf" || !contenu.mot_cle?.includes("bio")) {
        return [];
    }

    const resistance = Number(contenu.PV) || 1;

    return Object.values(etat.composants)
        .filter(c => c.id !== touchee.id && !deja.includes(c.id) && c.zone === touchee.zone &&
            c.ref?.type === "unit" && c.ref.id === touchee.ref.id && campDe(c) === campDe(touchee) &&
            (Number(c.marques?.degat) || 0) < resistance)
        .slice(0, 2)
        .map(c => ({ type: "marquer", c: c.id, marque: "degat", valeur: resistance }));
}
