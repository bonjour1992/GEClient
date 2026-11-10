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
