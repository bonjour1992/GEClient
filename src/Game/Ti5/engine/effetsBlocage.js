import { MARQUEUR, DETTE, NEUTRE, typeUnite, aMot } from "./miseEnPlace.js";
import { actionsPiste } from "./etat.js";

// ============================================================
// EFFETS DÉCLENCHÉS PAR UN BLOCAGE
//
// Quand un blocage a eu lieu (blocage d'un déplacement, Blocage.jsx ;
// test de blocage d'une action, BlocageAction.jsx), trois textes
// s'appliquent. « A eu lieu » : un camp a choisi de bloquer et le
// blocage a porté — au moins un vaisseau arrêté, ou un surplus à
// égaliser.
//
//   Redevance de protection (#226) : « Si vous engagez ou bloquez le
//       [Mentak] : #spend. » — la faction qui détient la promesse et
//       bloque celle qui la lui a faite la perd (retour à la réserve).
//       Automatique, pour tout blocage.
//   Frontière ouverte (#384) : « #Depl: Si la faction bloque un de vos
//       mouvements : #spend : elle gagne #infa(1). » — la faction
//       bloquée, qui détient la promesse, peut la dépenser : celle qui
//       l'a faite gagne 1 infamie. Question au joueur bloqué ;
//       déplacement seulement.
//   Dettes (règle « Contrôle », #1033) : bloquer le déplacement d'un
//       vaisseau de commerce non militaire d'une faction qui a des
//       dettes envers vous lui permet d'y mettre fin. Question au
//       joueur bloqué ; déplacement seulement.
//
// Une promesse est une carte chez la faction qui la détient (éléments
// actifs, ou déroulé) ; la faction qui l'a faite est celle du marqueur
// de faction posé dessus. Une dette est un jeton « Dette » dans le
// déroulé du débiteur, avec le marqueur du créancier posé dessus.
// Aucune dépendance à l'interface.
// ============================================================

export const REDEVANCE_DE_PROTECTION = 226;
export const FRONTIERE_OUVERTE = 384;

const composants = etat => Object.values(etat.composants);

// Faction qui a fait cette promesse (celle du marqueur de faction posé sur la carte), ou null
export const donneurDe = (etat, carte) =>
    composants(etat).find(x => x.sur === carte.id && x.jeton === MARQUEUR)?.proprio ?? null;

// Promesses de cet élément que `detenteur` tient de `donneur` (cartes non épuisées)
export const promessesTenues = (etat, idPromesse, detenteur, donneur) => composants(etat).filter(c =>
    !c.cache && c.ref?.type === "Promesse" && c.ref.id === idPromesse &&
    new RegExp(`^joueur:${detenteur}:(actif|tour:\\d+)$`).test(c.zone || "") &&
    donneurDe(etat, c) === donneur);

// Actions qui dépensent une promesse : ses marqueurs sont retirés, elle retourne à la réserve
export const actionsRendrePromesse = (etat, carte) => [
    ...composants(etat).filter(x => x.sur === carte.id && x.jeton === MARQUEUR).map(m => ({ type: "supprimer", c: m.id })),
    { type: "deplacer", c: carte.id, vers: "general:promesses" },
];

// Dettes de `debiteur` envers `creancier` : jetons du déroulé du débiteur qui portent le marqueur du créancier
export const dettesEnvers = (etat, debiteur, creancier) => composants(etat).filter(c =>
    !c.ref && c.jeton === DETTE && new RegExp(`^joueur:${debiteur}:tour:\\d+$`).test(c.zone || "") &&
    composants(etat).some(m => m.sur === c.id && m.proprio === creancier));

export const montantDettes = dettes => dettes.reduce((total, d) => total + (Number(d.marques?.montant) || 0), 0);

// Vaisseau de commerce non militaire (frégate marchande, mot-clé « com »)
export const estCommerceNonMilitaire = contenu =>
    !!contenu && (typeUnite(contenu) === "com" || aMot(contenu, "com")) && !aMot(contenu, "mil");

// Redevance de protection : les camps qui ont bloqué `bloque` et tiennent sa promesse la perdent.
//   bloqueurs : camps qui ont bloqué ; aScript(joueur, idScript)
//   -> [{ camp, actions, texte }]
export function redevancesRompues({ etat, bloqueurs, bloque, aScript }) {
    return bloqueurs
        .filter(camp => camp !== NEUTRE && camp !== bloque)
        .flatMap(camp => promessesTenues(etat, REDEVANCE_DE_PROTECTION, camp, bloque)
            .filter(() => !aScript || aScript(camp, "redevance-de-protection-rendre"))
            .map(carte => ({ camp, actions: actionsRendrePromesse(etat, carte), texte: "Redevance de protection dépensée" })));
}

// Frontière ouverte : promesses que le camp bloqué tient d'un camp qui l'a bloqué.
//   -> [{ camp (qui a bloqué et fait la promesse), carte, actions (promesse dépensée, +1 infamie) }]
export function frontieresOuvertes({ etat, bloqueurs, bloque, aScript }) {
    return bloqueurs
        .filter(camp => camp !== NEUTRE && camp !== bloque)
        .flatMap(camp => promessesTenues(etat, FRONTIERE_OUVERTE, bloque, camp)
            .filter(() => !aScript || aScript(bloque, "frontiere-ouverte-rompue"))
            .map(carte => ({
                camp,
                carte,
                actions: [...actionsRendrePromesse(etat, carte), ...actionsPiste(etat, camp, "infamie", 1)],
            })));
}

// Dettes auxquelles le camp bloqué peut mettre fin : celles qu'il a envers un camp qui a bloqué
// son vaisseau de commerce non militaire.
//   -> [{ camp, dettes, montant, actions (dettes supprimées) }]
export function dettesAnnulables({ etat, bloqueurs, bloque }) {
    return bloqueurs
        .filter(camp => camp !== NEUTRE && camp !== bloque)
        .map(camp => ({ camp, dettes: dettesEnvers(etat, bloque, camp) }))
        .filter(x => x.dettes.length > 0)
        .map(x => ({
            ...x,
            montant: montantDettes(x.dettes),
            // (le marqueur du créancier, posé sur la dette, la suit hors du jeu)
            actions: x.dettes.map(d => ({ type: "supprimer", c: d.id })),
        }));
}
