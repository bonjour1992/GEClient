// ============================================================
// EFFETS DES TECHNOLOGIES (scripts de sorte « effet », scripts.js)
//
// Calculs partagés par plusieurs écrans. Chacun prend `aScript`
// (contexte de la partie) : aScript(joueur, id) dit si le script est
// en service et si le joueur a débloqué sa technologie. Ce fichier
// n'importe rien : tout écran peut s'en servir.
// ============================================================

// Capacité d'un vaisseau. Capsule de transport : +1, +2 pour un transporteur.
// ------------------------------------------------------------
// PILLAGE (#pill)
//
// Qui détruit l'unité gagne ce que dit son texte : « #pill 2 » ou
// « #pill(4) » — du commerce ; « #pill(#point(1)) », « #Pill(#Infa(1)
// et #Point(1)) », « #pill #rerupt(3) » — des points, de l'infamie, de
// la recherche. -> { commerce, points, infamie, recherche: [[type, n]…],
// aLaMain } ou null si l'unité n'a pas de pillage.
// (aLaMain : butin que l'outil ne sait pas compter, « #com ici ».)
// ------------------------------------------------------------

export function lirePillage(contenu) {

    const texte = String(contenu?.habilite || "")
        .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

    const butin = { commerce: 0, points: 0, infamie: 0, recherche: [], aLaMain: false };
    let trouve = false;

    for (const m of texte.matchAll(/#pill\s*(?:\(((?:[^()]|\([^()]*\))*)\)|(\d+)|((?:\s*#re[a-z]+(?:\(\d+\))?)+))?/gi)) {

        trouve = true;

        const argument = (m[1] ?? m[2] ?? m[3] ?? "").trim();

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

// Bouclier amplifié : +2 pour le vaisseau amiral et les systèmes de défense,
// +1 pour les boucliers mobiles.
export function resistanceDe(contenu, possesseur, aScript) {

    const base = Number(contenu?.PV) || 0;
    const a = id => base > 0 && !!aScript?.(possesseur, id);

    const bonus =
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

// Actions qui dépensent (détruisent) un de mes agents. Bio stimulant : une
// fenêtre propose de l'utiliser et de payer 2 ressources à la place.
//   nom : celui de l'agent, pour la question
export function depenserAgent({ aScript, moi, etat }, agent, nom = "cet agent") {

    if (!agent) {
        return [];
    }

    const ressources = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;

    const epargne = agent.ref?.type === "agent" && aScript(moi, "bio-stimulant") && window.confirm(
        `Bio stimulant : ${nom} doit être détruit.\n\n` +
        `OK : l'utiliser et payer 2 ressources à la place (vous en avez ${ressources}).\n` +
        "Annuler : le détruire."
    );

    return epargne
        ? [
            { type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` },
            { type: "compteur", id: `joueur:${moi}:res`, delta: -2 },
        ]
        : [{ type: "supprimer", c: agent.id }];
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
    const camp = c => c.marques?.possession ?? c.proprio ?? 0;

    return Object.values(etat.composants)
        .filter(c => c.id !== touchee.id && !deja.includes(c.id) && c.zone === touchee.zone &&
            c.ref?.type === "unit" && c.ref.id === touchee.ref.id && camp(c) === camp(touchee) &&
            (Number(c.marques?.degat) || 0) < resistance)
        .slice(0, 2)
        .map(c => ({ type: "marquer", c: c.id, marque: "degat", valeur: resistance }));
}
