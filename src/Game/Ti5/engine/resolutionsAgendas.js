import { CONTRE, POUR, estValide, resultatLoi, cleResolution, VERS_HORS_JEU, VERS_TABLE } from "./optionsVote.js";
import { COLONNES_VOTE, joueurDeColonne } from "./voteCouleurs.js";
import { actionsPiste, MARQUEUR } from "./etat.js";
import { MONUMENT_ETERNEL, ORIENTATIONS, TROU_DE_VER_BETA, sansAccents } from "./agendasEnJeu.js";

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
//   id de l'agenda -> { script, resoudre, remplaceAuto }
//     script    id du script (scripts.js : désactivable dans l'outil « Scripts de règles »)
//     resoudre  ({ etat, index, joueurs, votes, loi, carte, options, nomDe, nom, contenuDe }) ->
//               { code, texte, actions, obstacles }
//     remplaceAuto  un traité (ou un mandat) dont le script remplace la résolution
//               générale : il dit lui-même où va la carte (Zone démilitarisée,
//               Monument suprême : ce qui est élu est écrit sur la carte)
//
// Une loi ou un traité qui reste en jeu garde ce que son vote a élu en marque
// sur sa carte ; son effet est lu dans agendasEnJeu.js.
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

// Loi votée pour ou contre qui reste en jeu : adoptée, sur la table (son effet : un script « …-en-jeu »)
const loiPourContre = effet => ctx => {
    const { adopte, voixPour, voixContre, egalite } = pourOuContre(ctx);

    return {
        code: adopte ? VERS_TABLE : VERS_HORS_JEU,
        texte: adopte
            ? `adoptée (${voixPour} pour, ${voixContre} contre) : sur la table — ${effet}`
            : `rejetée (${voixPour} pour, ${voixContre} contre) : retirée du jeu`,
        actions: [],
        obstacles: [egaliteNonDepartagee(egalite)],
    };
};

// « Élisez … ou votez contre » : colonne gagnante, Contre (colonne 0) ou la faction de la colonne
function eluOuContre({ options, votes, loi, joueurs }) {
    const { gagnant, egalite } = resultatLoi(options, votes, loi);
    const contre = gagnant === CONTRE;

    return { gagnant, contre, elu: gagnant !== null && !contre ? joueurDeColonne(joueurs, gagnant) : null, egalite };
}

// Traité qui élit (règle des traités, optionsVote.js) : adopté si l'option en tête, hors Contre, a plus
// de voix que Contre -> { adopte, elu (faction de cette colonne), voixPour, voixContre, egalite }
function traiteElu({ options, votes, loi, joueurs }) {
    const valides = votes.classement(loi).filter(col => col !== CONTRE && estValide(options, col));
    const [pour, second] = valides;
    const voixPour = pour === undefined ? 0 : votes.total(loi, pour);
    const voixContre = votes.total(loi, CONTRE);
    const adopte = voixPour > voixContre;

    return {
        adopte,
        elu: adopte ? joueurDeColonne(joueurs, pour) : null,
        voixPour,
        voixContre,
        egalite: adopte && second !== undefined && votes.total(loi, second) === voixPour && votes.ordre(loi, second) === votes.ordre(loi, pour),
    };
}

// Ce qu'une faction a proposé à la prévote pour cette loi (Agendas.jsx) : id de la planète, ou
// numéro de case + 1 (système) ; 0 si rien
const designation = (etat, loi, userId) => Math.max(0, Number(etat.compteurs[`agenda:${etat.tour}:${loi}:designe:${userId}`]) || 0);

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

    // Embargo militaire (#307) : adoptée, sur la table — les unités militaires hors infanteries
    // coûtent 1 de plus à produire (Interaction.jsx, payerProduction)
    307: {
        script: "embargo-militaire",
        resoudre: loiPourContre("les unités militaires hors infanteries coûtent 1 de plus"),
    },

    // Mission de guerre (#309) : l'objectif militaire élu (révélé à côté de la loi, colonnes 1 à 3)
    // va dans la case Événement du tour T+2 ; les autres sont défaussés
    309: {
        script: "mission-de-guerre",
        resoudre: ({ etat, index, options, votes, loi, carte, nom }) => {
            const { gagnant, egalite } = resultatLoi(options, votes, loi);
            const revelees = (index.parZone.get("general:revele:" + carte.id) || []).filter(c => c.ref);
            const elue = gagnant !== null && gagnant >= 2 ? revelees[gagnant - 2] : null;
            const tour = etat.tour + 2;

            return {
                code: VERS_HORS_JEU,
                texte: elue
                    ? `« ${nom(elue.ref)} » ajouté à la phase d'événement du tour ${tour}${revelees.length > 1 ? ", les autres défaussés" : ""}`
                    : "aucun objectif élu : sans effet (les objectifs révélés restent à côté de la loi)",
                actions: elue
                    ? revelees.map(c => ({ type: "deplacer", c: c.id, vers: c === elue ? `general:evenement:${tour}` : "defausse:militaire" }))
                    : [],
                obstacles: [
                    egaliteNonDepartagee(egalite),
                    gagnant !== null && gagnant >= 2 && !elue && `la colonne « ${COLONNES_VOTE[gagnant]} » n'est plus un objectif révélé`,
                ],
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

    // Création trou de ver (#318) : un trou de ver bêta (jeton #827) est posé dans le système élu —
    // celui que la faction de la colonne gagnante a proposé à la prévote ; Contre : rien
    318: {
        script: "creation-trou-de-ver",
        resoudre: ctx => {
            const { contre, elu, egalite } = eluOuContre(ctx);
            const valeur = elu ? designation(ctx.etat, ctx.loi, elu.userId) : 0;
            const numero = valeur > 0 ? valeur - 1 : null;

            return {
                code: VERS_HORS_JEU,
                texte: numero !== null
                    ? `${elu.nom} : trou de ver bêta posé dans le système de la case ${numero + 1}`
                    : (contre ? "contre l'emporte : sans effet" : "aucun système élu : sans effet"),
                actions: numero !== null ? [{ type: "creer", ref: { type: "token", id: TROU_DE_VER_BETA }, zone: "hex:" + numero }] : [],
                obstacles: [egaliteNonDepartagee(egalite), elu && numero === null && `${elu.nom} n'a proposé aucun système à la prévote`],
            };
        },
    },

    // Activité réprimée (#332) : le type d'agent élu (colonnes 1 à N : les agents de base) est écrit
    // sur la carte, qui va sur la table — ces agents coûtent 1 influence de plus à recruter
    // (Partie.jsx, recrutement) ; Contre : retirée du jeu
    332: {
        script: "activite-reprimee",
        resoudre: ctx => {
            const { etat, carte, nom } = ctx;
            const { gagnant, contre, egalite } = eluOuContre(ctx);
            const agent = gagnant !== null && gagnant >= 2 ? (etat.references?.agentsBase || [])[gagnant - 2] ?? null : null;

            return {
                code: agent ? VERS_TABLE : VERS_HORS_JEU,
                texte: agent
                    ? `${nom({ type: "agent", id: agent })} : 1 influence de plus à recruter (sur la table)`
                    : (contre ? "contre l'emporte : retirée du jeu" : "aucun type d'agent élu : retirée du jeu"),
                actions: agent ? [{ type: "marquer", c: carte.id, marque: "agentReprime", valeur: agent }] : [],
                obstacles: [egaliteNonDepartagee(egalite), gagnant !== null && gagnant >= 2 && !agent && "type d'agent élu inconnu"],
            };
        },
    },

    // Péage au trou de ver (#334) : adoptée, sur la table — utiliser un trou de ver alpha ou bêta
    // coûte 1 influence par vaisseau (Deplacement.jsx)
    334: {
        script: "peage-au-trou-de-ver",
        resoudre: loiPourContre("un trou de ver alpha ou bêta coûte 1 influence par vaisseau"),
    },

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

    // Révolution anti intellectuel (#343) : adoptée, sur la table — rechercher une technologie use
    // un politique (Technologie.jsx)
    343: {
        script: "revolution-anti-intellectuel",
        resoudre: loiPourContre("rechercher une technologie use un politique"),
    },

    // Construire un monument (#344) : on ne vote que Pour (optionsVote.js). Chaque voix coûte
    // 2 ressources ; 1 point par faction qui a moins voté que vous (carte du 22 novembre : plus de
    // bonus pour la faction seule en tête). La directive s'applique quel que soit le total.
    344: {
        script: "construire-un-monument",
        resoudre: ({ etat, joueurs, votes, loi }) => {
            const voix = joueurs.map(j => ({ j, n: votes.voix(loi, POUR, j.userId) }));

            const gains = voix.filter(x => x.n > 0).map(x => ({
                ...x,
                cout: 2 * x.n,
                points: voix.filter(y => y.n < x.n).length,
            }));

            const manque = gains.filter(x => (Number(etat.compteurs[`joueur:${x.j.userId}:res`]) || 0) < x.cout);

            return {
                code: VERS_HORS_JEU,
                texte: gains.length
                    ? gains.map(x => `${x.j.nom} ${x.n} voix, −${x.cout} ressources, +${x.points} point${x.points > 1 ? "s" : ""}`).join(" ; ")
                    : "aucune voix : sans effet",
                actions: gains.flatMap(x => [
                    { type: "compteur", id: `joueur:${x.j.userId}:res`, delta: -x.cout },
                    ...actionsPiste(etat, x.j.userId, "points", x.points),
                ]),
                obstacles: manque.map(x => `${x.j.nom} n'a pas ${x.cout} ressources pour payer ses voix`),
            };
        },
    },

    // Monument suprême (#555, traité) : adopté, le Monument éternel (#554, neutre) est posé sur la
    // planète élue — celle que la faction de la colonne en tête a proposée à la prévote
    555: {
        script: "monument-supreme",
        remplaceAuto: true,
        resoudre: ctx => {
            const { etat, index, loi, nom, contenuDe } = ctx;
            const { adopte, elu, voixPour, voixContre, egalite } = traiteElu(ctx);
            const idPlanete = elu ? designation(etat, loi, elu.userId) : 0;

            // Zone de la planète : la case dont la tuile la porte
            const zone = idPlanete > 0 ? [...index.parZone].flatMap(([z, contenu]) => {
                const tuile = /^hex:\d+$/.test(z) && contenu.find(x => x.ref?.type === "system");
                const k = tuile ? (contenuDe?.(tuile.ref.id)?.elems || []).findIndex(lien => Number(lien?.id) === idPlanete) : -1;
                return k >= 0 ? [`${z}:planete:${k}`] : [];
            })[0] ?? null : null;

            return {
                code: adopte ? VERS_TABLE : VERS_HORS_JEU,
                texte: adopte
                    ? `adopté (${voixPour} contre ${voixContre}) : sur la table${zone ? ` — Monument éternel posé sur ${nom({ type: "planet", id: idPlanete })}` : ""}`
                    : `rejeté (${voixPour} contre ${voixContre}) : retiré du jeu`,
                actions: zone ? [{ type: "creer", ref: { type: "unit", id: MONUMENT_ETERNEL }, zone }] : [],
                obstacles: [
                    egaliteNonDepartagee(egalite),
                    adopte && !idPlanete && `${elu ? elu.nom : "la colonne en tête"} : aucune planète proposée à la prévote`,
                    adopte && idPlanete > 0 && !zone && "la planète élue n'est pas sur la carte : le Monument éternel est à poser à la main",
                ],
            };
        },
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

    // Zone démilitarisée (#579, traité) : adopté, le système élu (proposé à la prévote par la faction
    // de la colonne en tête) est écrit sur la carte — les engagements y sont semi-bloqués (Combat.jsx)
    579: {
        script: "zone-demilitarisee",
        remplaceAuto: true,
        resoudre: ctx => {
            const { etat, loi, carte } = ctx;
            const { adopte, elu, voixPour, voixContre, egalite } = traiteElu(ctx);
            const valeur = elu ? designation(etat, loi, elu.userId) : 0;
            const numero = valeur > 0 ? valeur - 1 : null;

            return {
                code: adopte ? VERS_TABLE : VERS_HORS_JEU,
                texte: adopte
                    ? `adopté (${voixPour} contre ${voixContre}) : sur la table${numero !== null ? ` — engagements interdits dans le système de la case ${numero + 1}` : ""}`
                    : `rejeté (${voixPour} contre ${voixContre}) : retiré du jeu`,
                actions: numero !== null ? [{ type: "marquer", c: carte.id, marque: "systeme", valeur: numero }] : [],
                obstacles: [
                    egaliteNonDepartagee(egalite),
                    adopte && numero === null && `${elu ? elu.nom : "la colonne en tête"} : aucun système proposé à la prévote`,
                ],
            };
        },
    },

    // Orientation de l'empire (#728) : l'orientation élue (colonnes 1 à 4 : expansion, économique,
    // diplomatique, scientifique) est écrite sur la carte, qui va sur la table — le décompte des points
    // la compte (regleDecompte.js)
    728: {
        script: "orientation-de-l-empire",
        resoudre: ({ options, votes, loi, carte }) => {
            const { gagnant, egalite } = resultatLoi(options, votes, loi);
            const libelle = gagnant !== null ? String(options?.libelles?.[gagnant] || "") : "";
            const orientation = ORIENTATIONS.find(o => sansAccents(libelle).startsWith(o)) || null;

            return {
                code: orientation ? VERS_TABLE : VERS_HORS_JEU,
                texte: orientation
                    ? `orientation « ${libelle} » : sur la table, comptée au décompte des points`
                    : "aucune orientation élue : retirée du jeu",
                actions: orientation ? [{ type: "marquer", c: carte.id, marque: "orientation", valeur: orientation }] : [],
                obstacles: [egaliteNonDepartagee(egalite), gagnant !== null && !orientation && `orientation inconnue : « ${libelle} »`],
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
