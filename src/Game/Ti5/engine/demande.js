// ============================================================
// QUESTIONS AU JOUEUR : UN CADRE DE L'ONGLET « DÉCISION »
//
// Plus aucune fenêtre du navigateur (confirm, prompt) : une action
// qui a une question à poser crée une décision ; l'onglet Décision
// s'ouvre, les fenêtres ouvertes s'effacent le temps de répondre
// (Modale, Interaction.jsx), et l'action reprend avec la réponse.
//
// Partie.jsx donne ici, à chaque rendu, le `decider` de la partie
// affichée : tout fichier peut ainsi poser une question, même hors
// d'un composant (effets.js, envoi d'un coup).
//
//   demander({ titre, texte, choix, nombre, renoncer })
//       -> la valeur choisie, ou null si le joueur renonce
//       choix     [{ valeur, libelle }] : un bouton par choix
//       nombre    { min, max, defaut } : un montant à saisir
//       renoncer  libellé du bouton qui renonce ; false : pas de bouton
//                 (la question n'a que ses choix)
//   confirmer(titre, texte, oui)
//       -> true si le joueur valide (bouton `oui`), false s'il renonce
// ============================================================

let decider = null;

export const reglerDemande = fonction => {
    decider = fonction;
};

export const demander = decision => (decider ? decider(decision) : Promise.resolve(null));

export const confirmer = async (titre, texte, oui = "Confirmer") =>
    (await demander({ titre, texte, choix: [{ valeur: 1, libelle: oui }], renoncer: "Annuler" })) === 1;
