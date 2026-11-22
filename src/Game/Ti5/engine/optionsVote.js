import { COLONNES_VOTE, joueurDeColonne } from "./voteCouleurs.js";
import { techType } from "../ti5Const.js";

// ============================================================
// OPTIONS DE VOTE D'UNE LOI ET SA RÉSOLUTION
//
// Ce pour quoi on vote, lu sur le texte de la carte (une carte modifiée est
// donc suivie sans rien changer ici). Colonnes du plateau : 0 Contre, 1 Pour,
// 2 à 7 « 1 » à « 6 » ; chaque colonne a la couleur d'un joueur.
//
//   mandat, « Élisez une faction », « Votez pour une / des factions »,
//   « la faction élue », « Élisez une planète / un système »
//       -> les colonnes des factions en jeu (une planète ou un système se
//          vote dans la colonne de la faction qui l'a proposé à la prévote ;
//          une faction qui n'a rien proposé n'est pas une option)
//   autre élection (type de technologie, type d'agent, loi ou traité,
//   objectif révélé, « Votez pour A, B ou C »…)
//       -> colonnes 1 à N, N le nombre de choix connus (6 s'il ne l'est pas)
//   sinon (« Votez pour ou contre », pas d'élection)
//       -> Contre et Pour
//
// « … ou votez contre » ajoute Contre. Une colonne hors des options est
// grisée sur le plateau et dans le décompte ; y poser un agent est
// semi-bloqué (Interaction.jsx).
//
// Résolution (bouton « Résoudre » sous chaque loi, une fois les votes
// révélés) — la carte change de place à la fin de la phase de vote (le
// numéro d'une loi est son rang dans la case Agenda : la sortir plus tôt
// décalerait les suivantes) :
//   mandat  -> éléments actifs de la faction qui gagne le vote ; sans
//              aucune voix, retiré du jeu
//   traité  -> sur la table si l'option en tête (hors Contre) a plus de
//              voix que Contre ; sinon retiré du jeu
//   loi, directive -> leur script de résolution (RESOLUTIONS) ; sans
//              script, résolution manuelle
// ============================================================

export const CONTRE = 0;
export const POUR = 1;
const PREMIERE_OPTION = 2;
const OPTIONS_MAX = COLONNES_VOTE.length - PREMIERE_OPTION;

// Les 4 types de technologie de base
const TYPES_TECHNOLOGIE = ["gen", "spa", "mil", "soc"].map(t => techType[t]);

const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6 };

const texteDe = contenu => String(contenu?.usage || "")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// Scripts de résolution des lois et directives : id de l'agenda ->
//   ({ etat, index, joueurs, votes, loi, carte }) -> { actions, message }
// (aucun pour l'instant : résolution manuelle)
export const RESOLUTIONS = {};

// Compteur de la résolution d'une loi : où va la carte à la fin de la phase de vote
//   > 0 : éléments actifs de ce joueur ; -1 : retirée du jeu ; -2 : sur la table
export const cleResolution = (tour, loi) => `agenda:${tour}:${loi}:resolution`;
export const VERS_HORS_JEU = -1;
export const VERS_TABLE = -2;

export const zoneDeResolution = code => (code > 0 ? `joueur:${code}:actif` : (code === VERS_TABLE ? "general:table" : "horsJeu"));

// Options d'une loi
//   contenu : contenu de la carte d'agenda (null : pas encore chargé -> null, rien n'est grisé)
//   ctx : { joueurs, agents: [noms des agents de base], loisSurTable: [noms], revelees: [noms],
//           designation: u => texte de ce que ce joueur a proposé (planète ou système), ou null }
//   -> { sorte: "factions" | "choix" | "pour-contre", colonnes: [col…], libelles: { col: texte } }
export function optionsDeLoi(contenu, ctx = {}) {

    if (!contenu) {
        return null;
    }

    const texte = texteDe(contenu);
    const joueurs = ctx.joueurs || [];
    const contre = /ou\s+votez\s+contre/i.test(texte);

    const avecContre = (sorte, libelles) => {
        const colonnes = Object.keys(libelles).map(Number);

        if (contre) {
            libelles[CONTRE] = libelles[CONTRE] ? `Contre ou ${libelles[CONTRE]}` : "Contre";
            if (!colonnes.includes(CONTRE)) {
                colonnes.push(CONTRE);
            }
        }

        return { sorte, colonnes: colonnes.sort((a, b) => a - b), libelles };
    };

    const designe = /[ée]lisez\s+(une\s+plan[èe]te|un\s+syst[èe]me)/i.test(texte);

    // Factions : la colonne de chaque joueur, à son nom (ou à ce qu'il a désigné)
    if (contenu.type === "mand" || designe ||
        /[ée]lisez\s+une\s+faction|votez\s+pour\s+(une|des)\s+factions?|factions?\s+[ée]lues?/i.test(texte)) {

        const libelles = {};

        COLONNES_VOTE.forEach((_, col) => {
            const j = joueurDeColonne(joueurs, col);

            // (planète ou système : seules les factions qui en ont proposé un sont des options)
            const choisi = j && designe ? ctx.designation?.(j.userId) : null;

            if (j && (!designe || choisi)) {
                libelles[col] = designe ? `${choisi} (${j.nom})` : j.nom;
            }
        });

        return avecContre("factions", libelles);
    }

    // Autre élection : colonnes 1 à N
    const revele = /^r[ée]v[ée]lez\s+(\d+|une?|deux|trois|quatre|cinq|six)\s/i.exec(texte);
    const liste = /votez\s+pour\s+(?!ou\s+contre)(.+?)\s*[.#]/i.exec(texte);

    let choix = null;

    if (/type\s+de\s+technologie/i.test(texte)) {
        choix = TYPES_TECHNOLOGIE;
    } else if (/type\s+d['’]agent/i.test(texte)) {
        choix = ctx.agents?.length ? ctx.agents : null;
    } else if (/loi\s+ou\s+trait/i.test(texte)) {
        choix = ctx.loisSurTable || [];
    } else if (revele && /[ée]lu/i.test(texte)) {
        choix = ctx.revelees?.length ? ctx.revelees : Array(NOMBRES[revele[1].toLowerCase()] || Number(revele[1]) || 1).fill("");
    } else if (liste) {
        choix = liste[1].split(/\s*,\s*|\s+ou\s+/).map(s => s.trim()).filter(Boolean);
    } else if (!/[ée]lisez/i.test(texte)) {
        // Pas d'élection : pour ou contre
        return { sorte: "pour-contre", colonnes: [CONTRE, POUR], libelles: { [CONTRE]: "Contre", [POUR]: "Pour" } };
    }

    // (choix inconnus : les 6 colonnes, sans texte)
    const libelles = {};

    (choix || Array(OPTIONS_MAX).fill("")).slice(0, OPTIONS_MAX)
        .forEach((nom, k) => { libelles[PREMIERE_OPTION + k] = nom; });

    return avecContre("choix", libelles);
}

export const estValide = (options, col) => !options || options.colonnes.includes(col);

// Options de toutes les lois du tour, par ligne du plateau de vote (index 0 : loi 1) ; null pour une
// carte cachée ou pas encore chargée. Au-delà des lois du tour, une ligne n'a aucune option.
//   contenuDe(id) : contenu d'un agenda ; nom(ref) : nom d'un élément ;
//   designationTexte(valeur, contenu) : nom de la planète ou du système proposé
export function optionsDesLois({ etat, index, joueurs, contenuDe, nom = () => "", designationTexte = () => "✔" }) {

    const lois = index.parZone.get("general:agenda:" + etat.tour) || [];
    const agents = (etat.references?.agentsBase || []).map(id => nom({ type: "agent", id }));
    const loisSurTable = (index.parZone.get("general:table") || [])
        .filter(c => !c.cache && c.ref?.type === "Agenda").map(c => nom(c.ref));

    return lois.map((carte, k) => {

        const contenu = !carte.cache && carte.ref ? contenuDe(carte.ref.id) : null;

        if (!contenu) {
            return null;
        }

        const revelees = (index.parZone.get("general:revele:" + carte.id) || [])
            .map(c => (c.cache || !c.ref ? "carte cachée" : nom(c.ref)));

        const designation = u => {
            const valeur = Number(etat.compteurs[`agenda:${etat.tour}:${k + 1}:designe:${u}`]) || 0;

            return valeur > 0 ? designationTexte(valeur, contenu) : null;
        };

        return optionsDeLoi(contenu, { joueurs, agents, loisSurTable, revelees, designation });
    });
}

// Options de la ligne <loi> (1, 2…) : au-delà des lois du tour, aucune
export const optionsDeLigne = (toutes, loi) => (loi <= toutes.length ? toutes[loi - 1] : { sorte: "aucune", colonnes: [], libelles: {} });

// Résultat d'une loi d'après le décompte (votes : decompteVotes de Vote.jsx)
//   -> { gagnant: colonne ou null (aucune voix), egalite: vrai si le premier est à égalité non départagée }
export function resultatLoi(options, votes, loi) {

    const valides = votes.classement(loi).filter(col => estValide(options, col));
    const [premier, second] = valides;

    if (premier === undefined || votes.total(loi, premier) <= 0) {
        return { gagnant: null, egalite: false };
    }

    return {
        gagnant: premier,
        egalite: second !== undefined && votes.total(loi, second) === votes.total(loi, premier) &&
            votes.ordre(loi, second) === votes.ordre(loi, premier),
    };
}

// Résolution d'une loi de type mandat ou traité
//   -> { code (cleResolution), texte, obstacles: [] } ; null pour une loi ou une directive
export function resolutionAutomatique({ contenu, options, votes, loi, joueurs }) {

    if (contenu?.type === "mand") {
        const { gagnant, egalite } = resultatLoi(options, votes, loi);
        const elu = gagnant !== null ? joueurDeColonne(joueurs, gagnant) : null;

        return elu
            ? {
                code: elu.userId,
                texte: `mandat pour ${elu.nom}`,
                obstacles: [egalite && "égalité non départagée (le responsable du sénat départage avec ↑)"],
            }
            : {
                code: VERS_HORS_JEU,
                texte: "aucune faction élue : retiré du jeu",
                obstacles: [gagnant !== null && "la colonne en tête n'est celle d'aucune faction"],
            };
    }

    if (contenu?.type === "trai") {
        const pour = votes.classement(loi).find(col => col !== CONTRE && estValide(options, col));
        const voixPour = pour === undefined ? 0 : votes.total(loi, pour);
        const voixContre = votes.total(loi, CONTRE);
        const adopte = voixPour > voixContre;

        return {
            code: adopte ? VERS_TABLE : VERS_HORS_JEU,
            texte: adopte
                ? `adopté (${voixPour} contre ${voixContre}) : sur la table`
                : `rejeté (${voixPour} contre ${voixContre}) : retiré du jeu`,
            obstacles: [],
        };
    }

    return null;
}
