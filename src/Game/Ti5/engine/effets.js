// ============================================================
// EFFETS DES TECHNOLOGIES (scripts de sorte « effet », scripts.js)
//
// Calculs partagés par plusieurs écrans. Chacun prend `aScript`
// (contexte de la partie) : aScript(joueur, id) dit si le script est
// en service et si le joueur a débloqué sa technologie. Ce fichier
// n'importe rien : tout écran peut s'en servir.
// ============================================================

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

export function resistanceDe(contenu, possesseur, aScript) {

    const base = Number(contenu?.PV) || 0;

    const bonus = base > 0 && TYPES_BLINDES.includes(contenu?.type) &&
        aScript?.(possesseur, "blindage-en-duranium") ? 1 : 0;

    return { valeur: base + bonus, bonus };
}

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
