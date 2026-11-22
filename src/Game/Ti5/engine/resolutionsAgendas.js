import { CONTRE, POUR, estValide, resultatLoi, cleResolution, VERS_HORS_JEU, VERS_TABLE } from "./optionsVote.js";
import { COLONNES_VOTE, joueurDeColonne } from "./voteCouleurs.js";
import { actionsPiste, MARQUEUR } from "./etat.js";

// ============================================================
// SCRIPTS DE RÉSOLUTION DES LOIS ET DIRECTIVES
//
// Bouton « Résoudre » de l'onglet Vote, sous le décompte d'une loi,
// une fois les votes révélés (Vote.jsx). Le mandat et le traité ont
// leur résolution générale (optionsVote.js) ; une loi ou une directive
// n'en a une que si elle est ici — sinon, résolution manuelle.
//
// Le script applique l'effet tout de suite, et dit où va la carte à
// la fin de la phase de vote (compteur agenda:<tour>:<loi>:resolution) :
// une directive est retirée du jeu ; une loi adoptée va sur la table.
//
//   id de l'agenda -> { script, resoudre }
//     script    id du script (scripts.js : désactivable dans l'outil « Scripts de règles »)
//     resoudre  ({ etat, index, joueurs, votes, loi, carte, options, nomDe }) ->
//               { code, texte, actions, obstacles }
// ============================================================

// Faction élue (colonne gagnante parmi les options de la loi) : { elu, egalite }
function factionElue({ options, votes, loi, joueurs }) {
    const { gagnant, egalite } = resultatLoi(options, votes, loi);

    return { elu: gagnant !== null ? joueurDeColonne(joueurs, gagnant) : null, egalite };
}

const egaliteNonDepartagee = egalite => egalite && "égalité non départagée (le responsable du sénat départage avec ↑)";

// Résultat d'un vote pour ou contre : { adopte, voixPour, voixContre, egalite }
function pourOuContre({ options, votes, loi }) {
    const { gagnant, egalite } = resultatLoi(options, votes, loi);

    return { adopte: gagnant === POUR, voixPour: votes.total(loi, POUR), voixContre: votes.total(loi, CONTRE), egalite };
}

// Directive dont l'effet ne demande qu'un vote pour ou contre
const directivePourContre = (effet, rejet = "rejetée : sans effet") => ctx => {
    const { adopte, voixPour, voixContre, egalite } = pourOuContre(ctx);
    const applique = adopte ? effet(ctx) : { texte: rejet, actions: [] };

    return {
        code: VERS_HORS_JEU,
        texte: `${adopte ? "adoptée" : "rejetée"} (${voixPour} pour, ${voixContre} contre)${adopte ? " : " + applique.texte : ""}`,
        actions: applique.actions,
        obstacles: [egaliteNonDepartagee(egalite), ...(applique.obstacles || [])],
    };
};

// Directive qui élit une faction : effet(elu, ctx) -> { texte, actions, obstacles }
const directiveFaction = effet => ctx => {
    const { elu, egalite } = factionElue(ctx);
    const applique = elu ? effet(elu, ctx) : null;

    return {
        code: VERS_HORS_JEU,
        texte: elu ? `${elu.nom} élue : ${applique.texte}` : "aucune faction élue : sans effet",
        actions: applique?.actions || [],
        obstacles: [egaliteNonDepartagee(egalite), ...(applique?.obstacles || [])],
    };
};

// Carte révélée à côté de la loi (Agendas.jsx, zone general:revele:<id de la loi>) qui va à la faction élue
const gagneLaCarteRevelee = sorte => (elu, { index, carte, nom }) => {
    const revelee = (index.parZone.get("general:revele:" + carte.id) || []).find(c => !c.cache && c.ref);

    return revelee
        ? {
            texte: `elle gagne ${nom(revelee.ref)}`,
            actions: [{ type: "deplacer", c: revelee.id, vers: `joueur:${elu.userId}:actif` }],
        }
        : { texte: `elle gagne le ${sorte} révélé`, actions: [], obstacles: [`aucun ${sorte} révélé à côté de la loi`] };
};

// Factions classées par voix reçues (colonnes des factions, options de la loi), départagées par le
// responsable du sénat : [{ joueur, voix, col }] — seulement celles qui ont des voix
function classementDesFactions({ options, votes, loi, joueurs }) {
    return votes.classement(loi)
        .filter(col => estValide(options, col) && votes.total(loi, col) > 0 && joueurDeColonne(joueurs, col))
        .map(col => ({ joueur: joueurDeColonne(joueurs, col), voix: votes.total(loi, col), col }));
}

// Vote au conseil N : la première faction gagne N sièges, la deuxième N − 1… jusqu'à 1
const voteAuConseil = n => ctx => {
    const { etat, votes, loi } = ctx;
    const classees = classementDesFactions(ctx).slice(0, n);
    const ex = (a, b) => a && b && a.voix === b.voix && votes.ordre(loi, a.col) === votes.ordre(loi, b.col);
    const suivante = classementDesFactions(ctx)[n];

    return {
        code: VERS_HORS_JEU,
        texte: classees.length
            ? classees.map((x, k) => `${x.joueur.nom} +${n - k} siège${n - k > 1 ? "s" : ""}`).join(", ")
            : "aucune voix : sans effet",
        actions: classees.flatMap((x, k) => actionsPiste(etat, x.joueur.userId, "sieges", n - k)),
        obstacles: [
            (classees.some((x, k) => ex(x, classees[k + 1])) || ex(classees[classees.length - 1], suivante)) &&
                "égalité non départagée entre des factions classées (le responsable du sénat départage avec ↑)",
        ],
    };
};

// Cartes d'agenda en jeu : lois et traités sur la table, mandats chez les joueurs
const agendasEnJeu = index => [...index.parZone]
    .filter(([zone]) => zone === "general:table" || /^joueur:\d+:(actif|tour:\d+)$/.test(zone))
    .flatMap(([, contenu]) => contenu.filter(c => !c.cache && c.ref?.type === "Agenda"));

export const RESOLUTIONS = {

    // Pardon (#305) : l'infamie de chaque faction revient à 0
    305: {
        script: "pardon",
        resoudre: directivePourContre(({ etat, joueurs }) => {
            const marqueurs = u => Object.values(etat.composants).filter(m =>
                !m.ref && m.jeton === MARQUEUR && m.proprio === u && /^general:infamie:\d+$/.test(m.zone || ""));

            return {
                texte: "l'infamie de chaque faction revient à 0",
                actions: joueurs.flatMap(j => marqueurs(j.userId).map((m, k) =>
                    (k === 0 ? (m.zone !== "general:infamie:0" && { type: "deplacer", c: m.id, vers: "general:infamie:0" }) : { type: "supprimer", c: m.id })))
                    .filter(Boolean),
            };
        }),
    },

    // Sévérité (#306) : adoptée, sur la table (le décompte des points la compte : regleDecompte.js)
    306: {
        script: "severite",
        resoudre: ctx => {
            const { adopte, voixPour, voixContre, egalite } = pourOuContre(ctx);

            return {
                code: adopte ? VERS_TABLE : VERS_HORS_JEU,
                texte: adopte
                    ? `adoptée (${voixPour} pour, ${voixContre} contre) : sur la table`
                    : `rejetée (${voixPour} pour, ${voixContre} contre) : retirée du jeu`,
                actions: [],
                obstacles: [egaliteNonDepartagee(egalite)],
            };
        },
    },

    // Mercenaire (#312) : la faction élue gagne le mercenaire révélé
    312: { script: "mercenaire-directive", resoudre: directiveFaction(gagneLaCarteRevelee("mercenaire")) },

    // Révocation (#313) : la loi ou le traité élu (sur la table, options 1 à N dans l'ordre de la
    // table : optionsVote.js) est retiré du jeu ; Contre : rien
    313: {
        script: "revocation",
        resoudre: ({ index, options, votes, loi, nom }) => {
            const { gagnant, egalite } = resultatLoi(options, votes, loi);
            const surTable = (index.parZone.get("general:table") || []).filter(c => !c.cache && c.ref?.type === "Agenda");
            const revoquee = gagnant !== null && gagnant >= 2 ? surTable[gagnant - 2] : null;

            return {
                code: VERS_HORS_JEU,
                texte: revoquee
                    ? `« ${nom(revoquee.ref)} » révoquée (retirée du jeu)`
                    : (gagnant === CONTRE ? "contre l'emporte : sans effet" : "aucune loi élue : sans effet"),
                actions: revoquee ? [{ type: "deplacer", c: revoquee.id, vers: "horsJeu" }] : [],
                obstacles: [
                    egaliteNonDepartagee(egalite),
                    gagnant !== null && gagnant >= 2 && !revoquee && `la colonne « ${COLONNES_VOTE[gagnant]} » n'est plus une loi de la table`,
                ],
            };
        },
    },

    // Artefact retrouvé (#316) : la faction élue gagne la relique révélée (sans les points de fabrication)
    316: { script: "artefact-retrouve", resoudre: directiveFaction(gagneLaCarteRevelee("relique")) },

    // Révolution (#340) : toutes les lois, traités et mandats en jeu sont retirés du jeu — aussi ceux
    // résolus plus tôt dans ce tour, qui ne sont pas encore à leur place
    340: {
        script: "revolution",
        resoudre: directivePourContre(({ etat, index, loi }) => {
            const enJeu = agendasEnJeu(index);
            const duTour = (index.parZone.get("general:agenda:" + etat.tour) || [])
                .map((_, k) => cleResolution(etat.tour, k + 1))
                .filter((cle, k) => k + 1 !== loi && (Number(etat.compteurs[cle]) > 0 || Number(etat.compteurs[cle]) === VERS_TABLE));

            return {
                texte: `${enJeu.length + duTour.length} loi(s), traité(s) et mandat(s) retiré(s) du jeu`,
                actions: [
                    ...enJeu.map(c => ({ type: "deplacer", c: c.id, vers: "horsJeu" })),
                    ...duTour.map(id => ({ type: "compteur", id, valeur: VERS_HORS_JEU })),
                ],
            };
        }),
    },

    // Subvention (#556) : chaque voix reçue par une faction lui rapporte 1 commerce
    556: {
        script: "subvention",
        resoudre: ctx => {
            const classees = classementDesFactions(ctx);

            return {
                code: VERS_HORS_JEU,
                texte: classees.length ? classees.map(x => `${x.joueur.nom} +${x.voix} commerce`).join(", ") : "aucune voix : sans effet",
                actions: classees.map(x => ({ type: "compteur", id: `joueur:${x.joueur.userId}:commerce`, delta: x.voix })),
                obstacles: [],
            };
        },
    },

    // Ostracisme (#748) : la faction élue gagne 1 infamie
    748: {
        script: "ostracisme",
        resoudre: directiveFaction((elu, { etat }) => ({ texte: "+1 infamie", actions: actionsPiste(etat, elu.userId, "infamie", 1) })),
    },

    // Votes au conseil 1 à 5 (#798 à #802)
    798: { script: "vote-au-conseil", resoudre: voteAuConseil(1) },
    799: { script: "vote-au-conseil", resoudre: voteAuConseil(2) },
    800: { script: "vote-au-conseil", resoudre: voteAuConseil(3) },
    801: { script: "vote-au-conseil", resoudre: voteAuConseil(4) },
    802: { script: "vote-au-conseil", resoudre: voteAuConseil(5) },
};
