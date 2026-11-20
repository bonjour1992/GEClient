import { useEngine, BoutonRegle, nomCase, nomElement, agentDisponible, tuileDe, nomDuCamp, pastilleCamp, styleMini, possesseurDe, carteDePlanete } from "./Interaction";
import { useElement, useElements, contenuEnCache, useUnitesDeFaction } from "./sync";
import { typeUnite, actionsPiste, NEUTRE, campDe, MOTIF_LOGISTICIEN, MOTIF_NEGOCIANT } from "./miseEnPlace";
import { SCRIPTS } from "./scripts";
import {
    cleControle, cleAcquis, rangDePhase, controleAcquis, ESPACE_CONTROLE, CONTROLE_POSSESSION,
    campsDeControle, evaluerControle as evaluer, unitesDuLieu,
    cleDominant, resultatDomination, SUJETS_DOMINATION, actionsOuvrirDomination,
} from "./regleControle";

// ============================================================
// CONFLIT DE CONTRÔLE (onglet Conflit)
//
// « Prendre possession » d'une planète où un autre camp a des
// unités militaires ouvre un test de contrôle (règle « Contrôle ») :
// chaque camp qui a des unités militaires sur la planète soutient,
// s'oppose ou s'abstient ; son contrôle vaut 1 par unité militaire.
// La prise de possession est possible si le contrôle de ceux qui
// soutiennent dépasse celui de ceux qui s'opposent. Le demandeur
// soutient d'office ; les neutres s'opposent, sauf si un joueur en
// décide autrement.
//
// Station (satellite) : le conflit est un contrôle spatial — ce sont
// les unités militaires de l'espace du système qui comptent — et la
// prise de possession pose sur la station l'agent adapté à son type
// (agentDeStation, actionsSatellite).
//
// Compteurs :
//   controle:<case>p<planète>          joueur qui veut prendre possession (0 : clos)
//   controle:<case>p<planète>:<camp>   1 s'abstient, 2 soutient, 3 s'oppose
//   controle:<case>p<planète>:agent    station spéciale : rang (1 à 6) de l'agent choisi
// ============================================================

const CHOIX = [[1, "S'abstenir", "s'abstient"], [2, "Soutenir", "soutient"], [3, "S'opposer", "s'oppose"]];
const nomChoix = valeur => CHOIX.find(c => c[0] === valeur)?.[2];

// Le calcul du contrôle est dans regleControle.js (une seule fonction pour tout le jeu)
export { cleControle, ESPACE_CONTROLE, CONTROLE_POSSESSION, controleAcquis };

// Test préalable d'une action (contenus lus dans le cache des éléments) — voir regleControle.js
export const evaluerControle = options => evaluer({ contenuDe: contenuEnCache, ...options });

// Unités qui comptent pour le contrôle d'un lieu (k : rang de la planète, ou ESPACE_CONTROLE)
export const unitesDuControle = (index, numero, k) => unitesDuLieu({ index, contenuDe: contenuEnCache, numero, k });

// Unités d'un système entier (espace et planètes) : leurs contenus sont à charger pour que
// unitesDuControle reconnaisse celles dont le contrôle « affecte aussi l'espace »
const unitesDuSysteme = (index, numero) => [...index.parZone]
    .filter(([zone]) => zone === "hex:" + numero || zone.startsWith(`hex:${numero}:`))
    .flatMap(([, liste]) => liste.filter(c => !c.cache && c.ref?.type === "unit"));

// Joueur qui possède la planète (sa carte est dans ses éléments actifs), ou null
export const possesseurActuel = (etat, idPlanete) =>
    Number(/^joueur:(\d+):actif$/.exec(carteDePlanete(etat, idPlanete)?.zone || "")?.[1]) || null;

// Conflits de contrôle en cours : [{ cle, numero, k, demandeur }]
export function controlesEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^controle:(\d+)p(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({ cle: m[0], numero: Number(m[1]), k: Number(m[2]), demandeur: Number(etat.compteurs[m[0]]) }));
}

// Effet au choix qui change le contrôle pendant un conflit — script Rapport de force (#205) :
// « Lors de l'évaluation du contrôle : usez un diplomate, ajoutez 2 à votre valeur de contrôle. »
// Le bonus est gardé dans <clé du choix du camp>:plus, pour ce conflit seulement.
export function RapportDeForce({ clePlus, numero }) {

    const { etat, index, envoyer, moi, joueur, search, aScript } = useEngine();

    if (!joueur || etat.compteurs[clePlus] || !aScript(moi, "rapport-de-force")) {
        return null;
    }

    return (
        <BoutonRegle
            data-action="rapport-de-force"
            nom={`Rapport de force (${nomCase(numero)}) : +2 à votre contrôle`}
            obstacles={[!agentDisponible({ index, moi, search }, "diplomate") && "vous n'avez pas de diplomate disponible (aucun ne sera usé)"]}
            faire={commentaire => {
                const diplomate = agentDisponible({ index, moi, search }, "diplomate");

                envoyer([
                    diplomate && { type: "deplacer", c: diplomate.id, vers: `joueur:${moi}:agentsUses` },
                    { type: "compteur", id: clePlus, valeur: 2 },
                ].filter(Boolean), commentaire);
            }}
            title="Rapport de force : use un diplomate, +2 à votre valeur de contrôle pour ce conflit"
            style={styleMini}
        >
            Rapport de force (+2, use un diplomate)
        </BoutonRegle>
    );
}

// ------------------------------------------------------------
// DEMANDER LE CONTRÔLE POUR UNE ACTION
//
// Toute action qui exige le contrôle (construire, effet d'une carte…) passe par
// demanderControle, qui rend une promesse :
//   vrai   le contrôle est acquis — l'action s'exécute ;
//   faux   il ne l'est pas (contrôle nul, conflit perdu ou abandonné) — rien ne se passe.
// Si un conflit doit trancher, il s'ouvre dans l'onglet Conflit en disant pour quelle
// action (motif), et la promesse attend sa conclusion par le demandeur : l'action part
// dès qu'il clique « Contrôle acquis ». Si la page a été rechargée entre-temps, la
// promesse est perdue : le contrôle reste acquis ici jusqu'à la fin de la phase
// (controleAcquis), il suffit de refaire l'action.
//
// Motif d'un conflit de contrôle :
//   (aucun)                        prendre possession de la planète ou de la station
//   controle:<…>:motif = id        construire cette structure (unité)
//   controle:<…>:script = rang + 1 effet d'une carte : le script de ce rang dans SCRIPTS
//   controle:<…>:action = code     action de phase (ACTIONS_DE_PHASE) : recherche, fouille…
//   planète 99 (ESPACE_CONTROLE)   l'espace du système
// ------------------------------------------------------------

// Actions de phase qui demandent le contrôle : code du compteur, et leur nom dans « pour … »
export const ACTIONS_DE_PHASE = {
    recherche: [1, "la recherche"],
    fouille: [2, "la fouille d'une ruine"],
    mobilisation: [3, "la mobilisation"],
    production: [4, "la production d'une unité spatiale"],
};

const attentes = new Map();     // clé du conflit -> resolve de la promesse en attente

// Conclut l'attente d'un conflit (appelé par le conflit lui-même). Faux : personne n'attendait.
function conclureAttente(cle, acquis) {
    const resolve = attentes.get(cle);
    attentes.delete(cle);
    resolve?.(acquis);
    return !!resolve;
}

//   ctx    { etat, moi, envoyer, aviser, allerA, aScript } (contexte de l'engine)
//   motif  { construction: idUnite } | { script: idScript } | { action: clé d'ACTIONS_DE_PHASE } ;
//   libelle : l'action, pour le journal
export async function demanderControle(ctx, { numero, k, unites, possesseur = null, motif = {}, libelle = "Action" }) {

    const { etat, moi, envoyer, aviser, allerA, aScript } = ctx;

    const cle = cleControle(numero, k);
    const enCours = controlesEnCours(etat).find(c => c.cle === cle);

    // Tant qu'un conflit de contrôle est en cours ici, personne d'autre ne tente d'action sur ce lieu
    if (enCours && enCours.demandeur !== moi) {
        aviser?.("Un conflit de contrôle est déjà en cours ici : attendez qu'il soit clos (onglet Conflit).");
        return false;
    }

    // Conflit gagné alors que l'action n'attendait plus : ce contrôle sert une fois, pour cette action
    if (controleAcquis(etat, numero, k, moi)) {
        await envoyer([{ type: "compteur", id: cleAcquis(numero, k, moi), valeur: 0 }], `${libelle} (${nomCase(numero)}) — contrôle acquis au conflit`);
        return true;
    }

    const test = evaluerControle({ unites, moi, possesseur, aScript });

    // Personne ne peut s'opposer (ou seulement des neutres dépassés) : le test réussit, même à 0 contre 0
    if (!test.conflit) {
        return true;
    }

    if (!enCours) {
        const rangScript = motif.script ? SCRIPTS.findIndex(s => s.id === motif.script) + 1 : 0;

        await envoyer([
            // (les choix d'un conflit précédent au même endroit sont oubliés)
            ...Object.keys(etat.compteurs).filter(id => id.startsWith(cle + ":") && etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 })),
            motif.construction && { type: "compteur", id: cle + ":motif", valeur: motif.construction },
            rangScript > 0 && { type: "compteur", id: cle + ":script", valeur: rangScript },
            ACTIONS_DE_PHASE[motif.action] && { type: "compteur", id: cle + ":action", valeur: ACTIONS_DE_PHASE[motif.action][0] },
            { type: "compteur", id: cle, valeur: moi },
        ].filter(Boolean), `${libelle} (${nomCase(numero)}) — conflit de contrôle ouvert`);
    }

    aviser?.("D'autres peuvent s'opposer à votre contrôle : un conflit de contrôle est ouvert (onglet Conflit). " +
        "L'action se fera dès que vous y aurez conclu « Contrôle acquis ».");
    allerA?.("combat");

    return new Promise(resolve => {
        conclureAttente(cle, false);    // (une attente précédente au même endroit est abandonnée)
        attentes.set(cle, resolve);
    });
}

// Contrôle de l'espace d'un système pour l'effet d'une carte
//   ctx : { etat, index, moi, envoyer, aviser, allerA, aScript }
export const demanderControleSysteme = (ctx, numero, idScript, libelle) => demanderControle(ctx, {
    numero,
    k: ESPACE_CONTROLE,
    unites: unitesDuControle(ctx.index, numero, ESPACE_CONTROLE),
    motif: { script: idScript },
    libelle,
});

// Actions d'une prise de possession : la carte de la planète va dans mes
// éléments actifs (elle est créée si personne ne l'avait encore).
// Scripts — Assimilation : une planète qu'aucun joueur ne possédait reçoit une
// de mes infanteries ; Pillage : prise par les armes à une autre faction, je lui
// vole 2 commerce (ce qu'elle a, au plus). -> { actions, messages }
export function actionsPossession({ etat, moi, aScript, nomDe }, zonePlanete, idPlanete, idInfanterie, militaire = true) {

    const carte = carteDePlanete(etat, idPlanete);

    const zone = `joueur:${moi}:actif`;

    const ancien = Number(/^joueur:(\d+):actif$/.exec(carte?.zone || "")?.[1]) || null;

    const assimilation = !!idInfanterie && aScript(moi, "assimilation") && !ancien;

    const butin = militaire && ancien && ancien !== moi && aScript(moi, "pillage")
        ? Math.min(2, Number(etat.compteurs[`joueur:${ancien}:commerce`]) || 0)
        : 0;

    // (de / si : refusé si un autre joueur vient de la prendre — pas de carte en double)
    const verrou = "planete:" + idPlanete;
    const prises = Number(etat.compteurs[verrou]) || 0;

    // Règle de Wanno : en prendre le contrôle rapporte 1 infamie
    const wanno = idPlanete === 46 && aScript(moi, "wanno") && ancien !== moi;

    // Règle de Mecatol Rex : qui la possède prend aussi la carte Mecatol Rex spéciale (#229)
    const autreMecatol = idPlanete === 34 && aScript(moi, "mecatol-rex")
        ? Object.values(etat.composants).find(c => !c.cache && c.ref?.type === "planet" && c.ref.id === 229 && c.zone !== "horsJeu")
        : null;

    const prendreAutre = idPlanete === 34 && aScript(moi, "mecatol-rex") && autreMecatol?.zone !== zone;

    // Habilité Destin légendaire (de l'ancien possesseur) : qui lui prend une planète
    // légendaire gagne 1 point et 1 infamie
    const legendaire = !!ancien && ancien !== moi && !!contenuEnCache(idPlanete)?.legendary && aScript(ancien, "destin-legendaire");

    return {
        messages: [
            wanno && "Wanno : en prendre possession vous rapporte 1 infamie.",
            legendaire && `Destin légendaire : planète légendaire prise à ${nomDe?.(ancien) ?? "son possesseur"}, 1 point et 1 infamie pour vous.`,
            prendreAutre && "Mecatol Rex : la carte Mecatol Rex spéciale arrive aussi dans vos éléments actifs.",
            assimilation && "Assimilation : planète neutre obtenue, une infanterie y est posée.",
            butin > 0 && `Pillage : ${butin} commerce volé(s) à ${nomDe?.(ancien) ?? "son ancien possesseur"}.`,
        ].filter(Boolean),
        actions: [
            ...(wanno || legendaire ? actionsPiste(etat, moi, "infamie", (wanno ? 1 : 0) + (legendaire ? 1 : 0)) : []),
            ...(legendaire ? actionsPiste(etat, moi, "points", 1) : []),
            prendreAutre && (autreMecatol
                ? { type: "deplacer", c: autreMecatol.id, vers: zone }
                : { type: "creer", ref: { type: "planet", id: 229 }, zone, proprio: moi }),
            assimilation && { type: "creer", ref: { type: "unit", id: idInfanterie }, zone: zonePlanete, proprio: moi },
            butin > 0 && { type: "compteur", id: `joueur:${ancien}:commerce`, delta: -butin },
            butin > 0 && { type: "compteur", id: `joueur:${moi}:commerce`, delta: butin },
            ...(carte
                ? [{ type: "deplacer", c: carte.id, vers: zone, de: carte.zone }]
                : [
                    { type: "compteur", id: verrou, valeur: prises + 1, si: prises },
                    { type: "creer", ref: { type: "planet", id: idPlanete }, zone, proprio: moi },
                ]),
        ],
    };
}

// ------------------------------------------------------------
// STATIONS (satellites)
//
// On prend possession d'une station en y posant l'agent adapté à son
// type (un amiral sur une station militaire…) ; il y reste tant qu'on
// la tient. L'agent qui s'y trouvait est rendu, usé, à son joueur.
// ------------------------------------------------------------

// [type de station, nom de l'agent, motif de son nom]
export const AGENTS_STATION = [
    ["mil", "amiral", "amiral"],
    ["log", "logisticien", MOTIF_LOGISTICIEN],
    ["scien", "scientifique", "scientifique"],
    ["com", "négociant", MOTIF_NEGOCIANT],
    ["diplo", "diplomate", "diplomate"],
    ["pol", "politique", "politi"],
];

// Agent à poser sur cette station : { nom, motif }, ou null (station sans type).
// Station « spéciale » : n'importe quel agent — choix : son rang (1 à 6).
export function agentDeStation(planete, choix) {

    const ligne = planete?.stationType === "spe"
        ? AGENTS_STATION[(Number(choix) || 1) - 1]
        : AGENTS_STATION.find(a => a[0] === planete?.stationType);

    return ligne ? { nom: ligne[1], motif: ligne[2] } : null;
}

// Actions qui posent mon agent sur la station, et rendent à la faction précédente
// l'agent qui s'y trouvait : il retourne, usé, chez son propriétaire — celui que
// porte l'agent, sinon le joueur qui possédait la station (sa carte était dans
// ses éléments actifs ; idPlanete sert à la retrouver).
// -> { actions, obstacles }
export function actionsSatellite({ etat, index, moi, search }, zonePlanete, voulu, idPlanete) {

    // (l'agent est posé sur la station : pas de remplaçant)
    const agent = voulu ? agentDisponible({ index, moi, search }, voulu.motif, { sansRemplacant: true }) : null;

    const carte = carteDePlanete(etat, idPlanete);

    const ancien = Number(/^joueur:(\d+):actif$/.exec(carte?.zone || "")?.[1]) || null;

    const proprietaire = c => (Number.isInteger(c.proprio) && c.proprio > 0 ? c.proprio : ancien);

    const presents = (index.parZone.get(zonePlanete) || [])
        .filter(c => !c.cache && c.ref?.type === "agent" && !c.sur && proprietaire(c));

    return {
        obstacles: [voulu && !agent && `vous n'avez pas de ${voulu.nom} disponible (aucun agent ne sera posé sur la station)`],
        actions: [
            ...presents.map(c => ({ type: "deplacer", c: c.id, vers: `joueur:${proprietaire(c)}:agentsUses` })),
            agent && { type: "deplacer", c: agent.id, vers: zonePlanete, proprio: moi },
        ].filter(Boolean),
    };
}

// ------------------------------------------------------------
// Les conflits de contrôle en cours
// ------------------------------------------------------------

export function Controles() {

    const { etat } = useEngine();

    const conflits = controlesEnCours(etat);
    const dominations = dominationsEnCours(etat);
    const accords = accordsEnCours(etat);

    return conflits.length + dominations.length + accords.length > 0 && (
        <div data-controles style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>Conflits de contrôle</b>
            {conflits.map(c => <Controle key={c.cle} conflit={c} />)}
            {accords.map(a => <Accord key={a.cle} conflit={a} />)}
            {dominations.map(d => <Domination key={d.cle} conflit={d} />)}
        </div>
    );
}

function Controle({ conflit }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, couleurDe, aviser, aScript, factionDe } = useEngine();

    const { cle, numero, k, demandeur } = conflit;
    const zonePlanete = `hex:${numero}:planete:${k}`;

    const tuile = tuileDe(index, numero);
    const systeme = useElement(tuile ? tuile.ref.id : -1);
    const idPlanete = Number(systeme?.elems?.[k]?.id) || -1;
    const planete = useElement(idPlanete);

    // Motif du conflit, toujours affiché : une construction (la structure à construire), l'effet
    // d'une carte (son script), sinon une prise de possession
    const motif = Number(etat.compteurs[cle + ":motif"]) || 0;
    const construction = motif > 0;
    const script = SCRIPTS[(Number(etat.compteurs[cle + ":script"]) || 0) - 1] || null;
    const actionDePhase = Object.values(ACTIONS_DE_PHASE).find(a => a[0] === Number(etat.compteurs[cle + ":action"]))?.[1] || null;
    // (construction, carte, action de phase : l'action n'est pas faite ici — elle part quand le contrôle est acquis)
    const actionAilleurs = construction || !!script || !!actionDePhase;
    const espace = k === ESPACE_CONTROLE;

    // Station, ou espace du système : contrôle spatial (les unités de l'espace du système comptent)
    const spatial = espace || planete?.type === "sat";

    // (contenus de toutes les unités du système : un système de défense posé sur une planète
    //  compte aussi dans l'espace)
    const contenus = useElements([...new Set(unitesDuSysteme(index, numero).map(c => c.ref.id))].sort((a, b) => a - b));
    const unites = unitesDuLieu({ index, contenuDe: id => contenus[id], numero, k: spatial ? ESPACE_CONTROLE : k });

    // Possession de la planète : 2 de contrôle pour la faction qui l'a, même sans unité
    // (règle « Contrôle »). Pas pour une station : son contrôle est celui de l'espace du système.
    const possesseur = spatial ? null : possesseurActuel(etat, idPlanete);

    // Camps et contrôle de chacun : le calcul unique de regleControle.js. Seuls participent les
    // camps qui ont une unité militaire sur place ou la possession ; le demandeur est toujours
    // listé (contrôle 0 s'il ne peut pas participer : d'autres peuvent le soutenir).
    const camps = campsDeControle({ unites, contenuDe: id => contenus[id], aScript, possesseur, acteur: demandeur });

    const cleChoix = camp => `${cle}:${camp}`;

    const choixDe = camp => Number(etat.compteurs[cleChoix(camp)]) ||
        (camp === demandeur ? 2 : (camp === NEUTRE ? 3 : 0));

    // (Rapport de force : +2 au contrôle d'un camp pour ce conflit)
    const clePlus = camp => cleChoix(camp) + ":plus";
    const plus = camp => Number(etat.compteurs[clePlus(camp)]) || 0;

    const controle = valeur => camps.filter(c => choixDe(c.camp) === valeur).reduce((s, c) => s + c.controle + plus(c.camp), 0);
    const [pour, contre] = [controle(2), controle(3)];

    // Mon infanterie (script Assimilation)
    const { liens, contenus: mesUnites } = useUnitesDeFaction(factionDe(moi));
    const idInfanterie = liens.find(lien => typeUnite(mesUnites[lien.id]) === "inf")?.id ?? null;

    const nomCamp = camp => nomDuCamp(nomDe, camp);
    const nomPlanete = espace ? "l'espace du système" : (planete?.name || "la planète");
    const nomStructure = construction ? nomElement(search, { type: "unit", id: motif }) : "";
    // L'action pour laquelle le contrôle est demandé (toujours dite)
    const nomAction = construction ? `la construction de ${nomStructure}`
        : (script ? `« ${script.nom} »` : (actionDePhase || "la prise de possession"));
    const estDemandeur = !!joueur && moi === demandeur;

    // Clôt le conflit : le compteur et les choix sont remis à zéro
    const cloture = () => [cle, cle + ":agent", cle + ":motif", cle + ":script", cle + ":action", ...camps.flatMap(c => [cleChoix(c.camp), clePlus(c.camp)])]
        .filter(id => etat.compteurs[id])
        .map(id => ({ type: "compteur", id, valeur: 0 }));

    // Station : l'agent adapté y est posé
    const station = spatial
        ? actionsSatellite({ etat, index, moi, search }, zonePlanete, agentDeStation(planete, etat.compteurs[cle + ":agent"]), idPlanete)
        : { actions: [], obstacles: [] };

    function prendre(commentaire) {

        const { actions, messages } = actionsPossession(
            { etat, moi, aScript, nomDe }, zonePlanete, idPlanete, spatial ? null : idInfanterie);

        envoyer([...station.actions, ...actions, ...cloture()], [commentaire, ...messages].join(" — "));

        if (messages.length) {
            aviser(messages.join(" "));
        }
    }

    const pastille = camp => pastilleCamp(couleurDe, camp);

    return (
        <div
            data-controle={cle}
            style={{
                marginTop: 6,
                padding: "6px 10px",
                border: "2px solid #6a1b9a",
                borderRadius: 8,
                backgroundColor: "#f3e5f5",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
            }}
        >
            <div>
                {pastille(demandeur)}
                {actionAilleurs
                    ? <span data-motif={construction ? "construction" : (script ? "script" : "action")}><b>{nomCamp(demandeur)}</b> veut le contrôle de <b>{nomPlanete}</b> ({nomCase(numero)}) pour <b>{nomAction}</b>.</span>
                    : <span data-motif="possession"><b>{nomCamp(demandeur)}</b> veut prendre possession de <b>{nomPlanete}</b> ({nomCase(numero)}).</span>}
                {spatial && !espace && " Station : contrôle spatial, les unités militaires de l'espace du système comptent."}
                {espace && " Contrôle spatial : les vaisseaux et les structures spatiales comptent."}
            </div>

            {camps.map(c => {

                const choix = choixDe(c.camp);

                // Chacun répond pour son camp (le demandeur soutient) ; tout joueur peut répondre pour les neutres
                const repond = !!joueur && c.camp !== demandeur && (c.camp === moi || c.camp === NEUTRE);

                return (
                    <div key={c.camp} data-camp={c.camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                        <span>
                            {pastille(c.camp)}
                            <b>{nomCamp(c.camp)}</b> : contrôle {c.controle + plus(c.camp)}{" "}
                            <span style={{ color: "#555" }}>
                                ({[
                                    c.unites.map(u => nomElement(search, u.ref)).join(", ") ||
                                        (c.participe ? "aucune unité militaire" : "ni unité militaire ni possession : ne participe pas"),
                                    c.possession > 0 && `possession de la planète : ${c.possession}`,
                                    plus(c.camp) > 0 && `Rapport de force : ${plus(c.camp)}`,
                                ].filter(Boolean).join(" ; ")})
                            </span>
                        </span>

                        {/* (les autres effets ne s'ajoutent qu'au contrôle d'un camp qui participe) */}
                        {c.camp === moi && c.participe && <RapportDeForce clePlus={clePlus(c.camp)} numero={numero} />}

                        {repond
                            ? CHOIX.map(([valeur, libelle]) => (
                                <button
                                    key={valeur}
                                    type="button"
                                    data-choix={valeur}
                                    onClick={() => envoyer(
                                        [{ type: "compteur", id: cleChoix(c.camp), valeur }],
                                        `Contrôle de ${nomPlanete} : ${nomCamp(c.camp)} ${nomChoix(valeur)}`
                                    )}
                                    style={{
                                        ...styleMini,
                                        fontWeight: choix === valeur ? "bold" : "normal",
                                        backgroundColor: choix === valeur ? "#ce93d8" : undefined,
                                    }}
                                >
                                    {libelle}
                                </button>
                            ))
                            : <b style={{ color: choix ? "#000" : "#b71c1c" }}>{nomChoix(choix) || "n'a pas encore choisi"}</b>}
                    </div>
                );
            })}

            <div data-bilan-controle style={{ marginTop: 4 }}>
                Contrôle : {pour} pour, {contre} contre.{" "}
                {pour > contre
                    ? <b style={{ color: "#1b5e20" }}>{actionAilleurs ? "Le contrôle est acquis : l'action est possible." : "La prise de possession est possible."}</b>
                    : <b style={{ color: "#b71c1c" }}>Impossible : il faut plus de contrôle pour que contre.</b>}
            </div>

            {/* Construction, effet d'une carte : conclure fait partir l'action qui attendait
                (demanderControle) ; renoncer l'annule sans aucun effet */}
            {estDemandeur && actionAilleurs && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <BoutonRegle
                        data-action="controle-acquis"
                        nom={`Contrôle de ${nomPlanete} pour ${nomAction} (${pour} pour, ${contre} contre)`}
                        obstacles={[
                            ...camps.filter(c => !choixDe(c.camp)).map(c => `${nomCamp(c.camp)} n'a pas encore choisi (compté comme une abstention)`),
                            pour <= contre && `contrôle insuffisant : ${pour} pour, ${contre} contre`,
                        ]}
                        faire={async commentaire => {
                            // (le contrôle n'a pas de durée : il n'est noté acquis que si l'action n'attend
                            //  plus — page rechargée —, pour qu'elle puisse être refaite une fois)
                            const attendue = attentes.has(cle);

                            await envoyer(
                                [...cloture(), ...(attendue ? [] : [{ type: "compteur", id: cleAcquis(numero, k, demandeur), valeur: rangDePhase(etat) }])],
                                commentaire
                            );

                            // (page rechargée depuis l'ouverture : l'action n'attend plus, il faut la refaire)
                            if (!conclureAttente(cle, true)) {
                                aviser(`Contrôle acquis (${nomCase(numero)}) : refaites l'action — ${nomAction} — ce contrôle vaut pour elle, une fois, pendant cette phase.`);
                            }
                        }}
                        title="Le conflit est clos et l'action qui attendait le contrôle s'exécute"
                        style={{ padding: "3px 14px" }}
                    >
                        Contrôle acquis : faire l'action
                    </BoutonRegle>

                    <button
                        type="button"
                        data-action="renoncer-controle"
                        title="Le conflit est clos : l'action n'a pas lieu, rien n'est dépensé"
                        style={styleMini}
                        onClick={() => {
                            envoyer(cloture(), `Contrôle de ${nomPlanete} pour ${nomAction} : abandonné (${nomCase(numero)})`);
                            conclureAttente(cle, false);
                        }}
                    >
                        Renoncer
                    </button>
                </div>
            )}

            {estDemandeur && !actionAilleurs && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <BoutonRegle
                        data-action="prendre-possession-controle"
                        disabled={idPlanete < 0}
                        nom={`Prendre possession de ${nomPlanete} (contrôle : ${pour} pour, ${contre} contre)`}
                        obstacles={[
                            ...camps.filter(c => !choixDe(c.camp)).map(c => `${nomCamp(c.camp)} n'a pas encore choisi (compté comme une abstention)`),
                            pour <= contre && `contrôle insuffisant : ${pour} pour, ${contre} contre`,
                            ...station.obstacles,
                        ]}
                        faire={prendre}
                        title="La carte de la planète va dans vos éléments actifs ; le conflit est clos"
                        style={{ padding: "3px 14px" }}
                    >
                        Prendre possession
                    </BoutonRegle>

                    <button
                        type="button"
                        data-action="renoncer-controle"
                        style={styleMini}
                        onClick={() => envoyer(cloture(), `Prise de possession de ${nomPlanete} abandonnée`)}
                    >
                        Renoncer
                    </button>
                </div>
            )}

            {!estDemandeur && (
                <div style={{ marginTop: 4, color: "#555" }}>
                    Les camps présents choisissent ; {nomCamp(demandeur)} {actionAilleurs ? "fait ensuite son action" : "prend ensuite possession"}, ou renonce.
                </div>
            )}
        </div>
    );
}

// ============================================================
// CONFLIT D'ACCORD (revendication)
//
// « Revendiquer » une planète alors que d'autres camps ont des unités
// militaires dans le système (son espace, ou la planète) demande leur
// accord : chacun accepte ou refuse. La revendication se fait dès que
// tous ont accepté (le diplomate du demandeur est alors utilisé) ; un
// seul refus la bloque. Les neutres refusent, sauf si un joueur en
// décide autrement. Le demandeur peut passer outre (bouton rouge gris)
// ou renoncer.
//
// Station (satellite) : en plus du diplomate, l'agent adapté à la station y
// est posé (actionsSatellite). C'est alors le demandeur qui conclut, une fois
// tous d'accord : lui seul peut prendre un agent à son compte.
//
// Compteurs :
//   accord:<case>p<planète>          joueur qui revendique (0 : clos)
//   accord:<case>p<planète>:<camp>   2 accepte, 3 refuse
//   accord:<case>p<planète>:agent    station spéciale : rang (1 à 6) de l'agent choisi
// ============================================================

export const cleAccord = (numero, k) => `accord:${numero}p${k}`;

// Conflits d'accord en cours : [{ cle, numero, k, demandeur }]
export function accordsEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^accord:(\d+)p(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({ cle: m[0], numero: Number(m[1]), k: Number(m[2]), demandeur: Number(etat.compteurs[m[0]]) }));
}

// Camps (autres que le demandeur) qui ont des unités militaires dans l'espace
// du système ou sur la planète : ce sont eux qui peuvent refuser.
// (Une unité dont le contenu n'est pas encore connu est comptée comme militaire.)
export function campsAConsulter(index, contenuDe, numero, k, demandeur) {

    const unites = [...(index.parZone.get("hex:" + numero) || []), ...(index.parZone.get(`hex:${numero}:planete:${k}`) || [])]
        .filter(c => !c.cache && c.ref?.type === "unit" && contenuDe(c.ref.id)?.mot_cle?.includes("mil") !== false);

    return [...new Set(unites.map(campDe))].filter(camp => camp !== demandeur);
}

function Accord({ conflit }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, couleurDe, aviser, aScript, factionDe } = useEngine();

    const { cle, numero, k, demandeur } = conflit;
    const zonePlanete = `hex:${numero}:planete:${k}`;

    const tuile = tuileDe(index, numero);
    const systeme = useElement(tuile ? tuile.ref.id : -1);
    const idPlanete = Number(systeme?.elems?.[k]?.id) || -1;
    const planete = useElement(idPlanete);

    const unites = [...(index.parZone.get("hex:" + numero) || []), ...(index.parZone.get(zonePlanete) || [])]
        .filter(c => !c.cache && c.ref?.type === "unit");

    const contenus = useElements([...new Set(unites.map(c => c.ref.id))]);

    const camps = campsAConsulter(index, id => contenus[id], numero, k, demandeur);

    const cleChoix = camp => `${cle}:${camp}`;

    // (les neutres refusent, sauf si un joueur en décide autrement)
    const choixDe = camp => Number(etat.compteurs[cleChoix(camp)]) || (camp === NEUTRE ? 3 : 0);

    // Infanterie du demandeur (script Assimilation)
    const { liens, contenus: sesUnites } = useUnitesDeFaction(factionDe(demandeur));
    const idInfanterie = liens.find(lien => typeUnite(sesUnites[lien.id]) === "inf")?.id ?? null;

    const diplomate = agentDisponible({ index, moi: demandeur, search }, "diplomate");

    // Station : l'agent adapté du demandeur y est posé
    const estStation = planete?.type === "sat";

    const station = estStation
        ? actionsSatellite({ etat, index, moi: demandeur, search }, zonePlanete, agentDeStation(planete, etat.compteurs[cle + ":agent"]), idPlanete)
        : { actions: [], obstacles: [] };

    const nomCamp = camp => nomDuCamp(nomDe, camp);
    const nomPlanete = planete?.name || "la planète";
    const estDemandeur = !!joueur && moi === demandeur;

    const cloture = () => Object.keys(etat.compteurs)
        .filter(id => (id === cle || id.startsWith(cle + ":")) && etat.compteurs[id])
        .map(id => ({ type: "compteur", id, valeur: 0 }));

    // La revendication elle-même : le diplomate du demandeur est utilisé, la carte
    // de la planète va dans ses éléments actifs, le conflit est clos
    function revendiquer(commentaire) {

        const { actions, messages } = actionsPossession(
            { etat, moi: demandeur, aScript, nomDe }, zonePlanete, idPlanete, estStation ? null : idInfanterie, false);

        envoyer([
            diplomate && { type: "deplacer", c: diplomate.id, vers: `joueur:${demandeur}:agentsUses`, de: diplomate.zone },
            ...station.actions,
            ...actions,
            ...cloture(),
        ], [commentaire, ...messages].join(" — "));

        if (messages.length) {
            aviser(messages.join(" "));
        }
    }

    function repondre(camp, valeur) {

        // Le dernier accord : la revendication se fait dans le même coup
        // (station : seulement si c'est le demandeur qui répond — pour les neutres —,
        // car lui seul peut poser son agent ; sinon il conclut avec son bouton)
        const tousDAccord = valeur === 2 && idPlanete > 0 && camps.every(c => c === camp || choixDe(c) === 2) &&
            (!estStation || moi === demandeur);

        if (tousDAccord) {
            revendiquer(`Accord de tous : ${nomCamp(demandeur)} revendique ${nomPlanete}`);
            return;
        }

        envoyer(
            [{ type: "compteur", id: cleChoix(camp), valeur }],
            `Revendication de ${nomPlanete} : ${nomCamp(camp)} ${valeur === 2 ? "accepte" : "refuse"}`
        );
    }

    const pastille = camp => pastilleCamp(couleurDe, camp);

    const refus = camps.filter(c => choixDe(c) === 3);
    const muets = camps.filter(c => !choixDe(c));

    return (
        <div
            data-accord={cle}
            style={{
                marginTop: 6,
                padding: "6px 10px",
                border: "2px solid #00695c",
                borderRadius: 8,
                backgroundColor: "#e0f2f1",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
            }}
        >
            <div>
                {pastille(demandeur)}
                <b>{nomCamp(demandeur)}</b> veut revendiquer <b>{nomPlanete}</b> ({nomCase(numero)}) : accord des camps
                qui ont des unités militaires dans le système.
            </div>

            {camps.map(camp => {

                const choix = choixDe(camp);

                // Chacun répond pour son camp ; tout joueur peut répondre pour les neutres
                const repond = !!joueur && (camp === moi || camp === NEUTRE);

                // Habilité Fierté, promesse Vassal : on n'accepte pas la revendication d'une planète qu'on possède
                const fier = camp !== NEUTRE && (aScript(camp, "fierte") || aScript(camp, "vassal")) &&
                    (index.parZone.get(`joueur:${camp}:actif`) || []).some(x => x.ref?.type === "planet" && x.ref.id === idPlanete);

                return (
                    <div key={camp} data-camp={camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                        <span>{pastille(camp)}<b>{nomCamp(camp)}</b></span>

                        {repond
                            ? [[2, "Accepter"], [3, "Refuser"]].map(([valeur, libelle]) => (
                                <button
                                    key={valeur}
                                    type="button"
                                    data-choix={valeur}
                                    disabled={valeur === 2 && fier}
                                    title={valeur === 2 && fier ? "Fierté, Vassal : vous ne pouvez pas consentir à la revendication d'une de vos planètes" : undefined}
                                    onClick={() => repondre(camp, valeur)}
                                    style={{
                                        ...styleMini,
                                        fontWeight: choix === valeur ? "bold" : "normal",
                                        backgroundColor: choix === valeur ? "#80cbc4" : undefined,
                                    }}
                                >
                                    {libelle}
                                </button>
                            ))
                            : <b style={{ color: choix === 2 ? "#1b5e20" : "#b71c1c" }}>
                                {choix === 2 ? "accepte" : (choix === 3 ? "refuse" : "n'a pas encore répondu")}
                            </b>}
                    </div>
                );
            })}

            {camps.length === 0 && <div style={{ marginTop: 2 }}><i>Plus aucun autre camp n'a d'unité militaire ici.</i></div>}

            <div data-bilan-accord style={{ marginTop: 4 }}>
                {refus.length > 0
                    ? <b style={{ color: "#b71c1c" }}>Refusée par {refus.map(nomCamp).join(", ")}.</b>
                    : (muets.length > 0
                        ? <b style={{ color: "#a15c00" }}>En attente de {muets.map(nomCamp).join(", ")}.</b>
                        : <b style={{ color: "#1b5e20" }}>Tous d'accord.</b>)}
                {" "}{estStation
                    ? `Station : une fois tous d'accord, ${nomCamp(demandeur)} conclut (son agent y est posé).`
                    : "La revendication se fait dès que tous ont accepté."}
            </div>

            {estDemandeur && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <BoutonRegle
                        data-action="revendiquer-accord"
                        disabled={idPlanete < 0}
                        nom={`Revendiquer ${nomPlanete}`}
                        obstacles={[
                            ...refus.map(c => `${nomCamp(c)} refuse`),
                            ...muets.map(c => `${nomCamp(c)} n'a pas encore répondu`),
                            !diplomate && "vous n'avez pas de diplomate disponible (aucun ne sera usé)",
                            ...station.obstacles,
                        ]}
                        faire={revendiquer}
                        title="Use un diplomate ; la carte de la planète va dans vos éléments actifs ; le conflit est clos"
                        style={{ padding: "3px 14px" }}
                    >
                        Revendiquer (use un diplomate)
                    </BoutonRegle>

                    <button
                        type="button"
                        data-action="renoncer-accord"
                        style={styleMini}
                        onClick={() => envoyer(cloture(), `Revendication de ${nomPlanete} abandonnée`)}
                    >
                        Renoncer
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================================
// CONFLIT DE DOMINATION
//
// Test de domination d'un système : chaque camp qui y a des unités
// militaires dans l'espace les fait participer à la domination du
// camp de son choix (le sien par défaut ; les neutres, la leur). Le
// camp qui réunit, seul, le plus de contrôle domine le système.
//
// Un test par sujet (regleControle.js) : il est ouvert pour une carte
// ou un effet (domination:<case>:motif = son identifiant ; 0 : à la
// main). Son résultat ne vaut que pour ce sujet et il ne se rouvre
// pas une fois clos : toutes les factions qui veulent faire la même
// action passent par ce seul test, celle qui domine la fait, personne
// à égalité.
//
// Récupération (#185) : seules les factions qui ont la technologie et
// la demandent (recup:<case>:<joueur>) peuvent dominer. Chaque camp
// soutient l'une d'elles, s'engage contre toutes (−2) ou s'abstient ;
// le résultat qui réunit le plus de contrôle l'emporte, et la faction
// gagnante prend le butin (recup:<case>). Une seule faction à la
// demander : c'est un test de contrôle simple pour elle.
//
// Compteurs :
//   domination:<case>           joueur qui a ouvert le conflit (0 : clos)
//   domination:<case>:motif     sujet du test
//   domination:<case>:<camp>    camp soutenu (−1 : s'abstient ; −2 : contre tous)
//   dominant:<case>:s<sujet>    camp qui domine, une fois le conflit clos (+ :tour)
//
// L'entretien d'un joueur qui a « Exploitation du vide » compte ses
// systèmes vides dominés : sans autre unité, ou dont il a gagné le
// test ce tour (useExploitationDuVide, PlateauJoueur.jsx).
// ============================================================

const RECUPERATION = 185;
const RACKET = 942;
const ABSTENTION = -1;
const CONTRE_TOUS = -2;

export { actionsOuvrirDomination, resultatDomination, SUJETS_DOMINATION };

export function dominationsEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^domination:(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({ cle: m[0], numero: Number(m[1]), demandeur: Number(etat.compteurs[m[0]]) }));
}

// Récupération en attente dans un système : { butin, candidats } (compteurs recup:<case>…)
export const cleRecuperation = numero => `recup:${numero}`;

const recuperationDe = (etat, numero) => ({
    butin: Number(etat.compteurs[cleRecuperation(numero)]) || 0,
    candidats: Object.keys(etat.compteurs)
        .map(id => new RegExp(`^recup:${numero}:(\\d+)$`).exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => Number(m[1])),
});

// Systèmes vides (sans planète) où le joueur a des unités dans l'espace :
//   gain       ressources de l'entretien (1 par système dominé, 3 pour une nébuleuse)
//   aResoudre  cases disputées dont le test de domination n'est pas clos ce tour
export function useExploitationDuVide(userId) {

    const { etat, index, aScript } = useEngine();

    const actif = aScript(userId, "exploitation-du-vide");
    const tuile = n => tuileDe(index, n);

    const cases = !actif ? [] : [...new Set(Object.values(etat.composants)
        .filter(c => c.ref?.type === "unit" && campDe(c) === userId && /^hex:\d+$/.test(c.zone || ""))
        .map(c => Number(c.zone.slice(4))))];

    const systemes = useElements(cases.map(n => tuile(n)?.ref.id).filter(Boolean));

    const systeme = n => systemes[tuile(n)?.ref.id];
    const vides = cases.filter(n => systeme(n) && !(systeme(n).elems || []).some(lien => lien?.id > 0));

    const dispute = n => (index.parZone.get("hex:" + n) || []).some(c => c.ref?.type === "unit" && campDe(c) !== userId);

    // Camp qui domine d'après le test clos ce tour pour « Exploitation du vide », ou null
    const resultat = n => resultatDomination(etat, n, 232);

    const domines = vides.filter(n => !dispute(n) || resultat(n) === userId);

    return {
        gain: domines.reduce((s, n) => s + (systeme(n).anomaly === "neb" ? 3 : 1), 0),
        aResoudre: vides.filter(n => dispute(n) && resultat(n) === null),
    };
}

function Domination({ conflit }) {

    const { etat, index, envoyer, moi, joueur, nomDe, couleurDe, aScript, partie } = useEngine();

    const { cle, numero, demandeur } = conflit;

    const contenus = useElements([...new Set(unitesDuSysteme(index, numero).map(c => c.ref.id))].sort((a, b) => a - b));
    const unites = unitesDuLieu({ index, contenuDe: id => contenus[id], numero, k: ESPACE_CONTROLE });

    // Sujet du test (domination:<case>:motif) : la carte pour laquelle il a été ouvert
    const motif = Number(etat.compteurs[cle + ":motif"]) || 0;

    // Récupération : seules les factions qui la demandent peuvent dominer
    const recup = motif === RECUPERATION ? recuperationDe(etat, numero) : null;
    const candidats = recup ? recup.candidats : null;
    const simple = !!candidats && candidats.length === 1;

    // Contrôle de chaque camp : le calcul unique de regleControle.js (unités militaires de l'espace).
    // Une faction qui demande la Récupération est listée même sans unité (elle ne participe pas,
    // mais d'autres peuvent la soutenir).
    const presents = campsDeControle({ unites, contenuDe: id => contenus[id], aScript })
        .map(c => ({ camp: c.camp, controle: c.controle, participe: c.participe }));

    const camps = [
        ...presents,
        ...(candidats || []).filter(u => !presents.some(c => c.camp === u)).map(u => ({ camp: u, controle: 0, participe: false })),
    ];

    const cleChoix = camp => `${cle}:${camp}`;

    // Camp soutenu. Domination ordinaire : le sien par défaut (les neutres, la leur). Récupération :
    // une faction qui la demande se soutient ; les autres, et les neutres, s'engagent contre toutes.
    function soutien(camp) {

        const choisi = Number(etat.compteurs[cleChoix(camp)]) || 0;

        if (!candidats) {
            return camp === NEUTRE ? NEUTRE : (choisi || camp);
        }

        return camp === NEUTRE ? CONTRE_TOUS : (choisi || (candidats.includes(camp) ? camp : CONTRE_TOUS));
    }

    // (Rapport de force : +2 au contrôle d'un camp pour ce conflit)
    const clePlus = camp => cleChoix(camp) + ":plus";
    const plus = camp => Number(etat.compteurs[clePlus(camp)]) || 0;

    const totaux = new Map((candidats || []).map(u => [u, 0]));

    for (const c of camps) {
        if (c.participe && soutien(c.camp) !== ABSTENTION) {
            totaux.set(soutien(c.camp), (totaux.get(soutien(c.camp)) || 0) + c.controle + plus(c.camp));
        }
    }

    // Le résultat qui réunit, seul, le plus de contrôle l'emporte ; « contre tous » en tête : personne
    const classes = [...totaux].sort((a, b) => b[1] - a[1]);
    const premier = classes.length && (classes.length === 1 || classes[0][1] > classes[1][1]) ? classes[0][0] : null;
    const gagnant = premier === CONTRE_TOUS ? null : premier;

    const nomCamp = camp => nomDuCamp(nomDe, camp);
    const nomResultat = valeur => (valeur === CONTRE_TOUS ? "contre tous" : nomCamp(valeur));

    // Rackets en attente sur les planètes de ce système (script Racket, Pirate Mentak) :
    // compteur racket:<case>p<k> = le joueur qui réclame. À la clôture, s'il domine, il
    // gagne les ressources de la planète et son propriétaire les perd (au plus ce qu'il a).
    const tuile = tuileDe(index, numero);
    const systeme = useElement(tuile?.ref.id ?? -1);
    const liensPlanetes = (systeme?.elems || []).map(lien => Number(lien?.id) || 0);
    const planetes = useElements(liensPlanetes.filter(id => id > 0));

    // (un racket n'est tranché que par le test ouvert pour lui — ou par un test « à la main »)
    const rackets = motif !== RACKET && motif !== 0 ? [] : Object.keys(etat.compteurs)
        .map(id => new RegExp(`^racket:${numero}p(\\d+)$`).exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => {
            const idPlanete = liensPlanetes[Number(m[1])] || 0;
            const proprietaire = possesseurDe(index, partie.joueurs, idPlanete);
            const res = Number(planetes[idPlanete]?.res) || 0;

            return {
                cle: m[0],
                u: Number(etat.compteurs[m[0]]),
                proprietaire,
                res,
                pris: proprietaire ? Math.min(res, Number(etat.compteurs[`joueur:${proprietaire}:res`]) || 0) : 0,
                nom: planetes[idPlanete]?.name || "planète",
            };
        });

    const actionsRackets = rackets.flatMap(r => [
        { type: "compteur", id: r.cle, valeur: 0 },
        ...(gagnant === r.u && r.proprietaire && r.proprietaire !== r.u ? [
            { type: "compteur", id: `joueur:${r.u}:res`, delta: r.res },
            r.pris > 0 && { type: "compteur", id: `joueur:${r.proprietaire}:res`, delta: -r.pris },
            { type: "compteur", id: r.cle + ":tour", valeur: etat.tour },
        ].filter(Boolean) : []),
    ]);

    const bilanRackets = rackets.map(r => (gagnant === r.u && r.proprietaire && r.proprietaire !== r.u
        ? `Racket sur ${r.nom} : ${nomCamp(r.u)} +${r.res} ressource(s), ${nomCamp(r.proprietaire)} −${r.pris}`
        : `Racket sur ${r.nom} : ${nomCamp(r.u)} ne domine pas, rien n'est pris`));

    // Récupération : la faction gagnante prend le butin (1 ressource par vaisseau détruit au combat)
    const actionsRecup = !recup ? [] : [
        gagnant > 0 && recup.butin > 0 && { type: "compteur", id: `joueur:${gagnant}:res`, delta: recup.butin },
        ...[cleRecuperation(numero), ...recup.candidats.map(u => `${cleRecuperation(numero)}:${u}`)]
            .filter(id => etat.compteurs[id]).map(id => ({ type: "compteur", id, valeur: 0 })),
    ].filter(Boolean);

    const bilanRecup = !recup ? [] : [gagnant > 0
        ? `Récupération : ${nomCamp(gagnant)} +${recup.butin} ressource(s)`
        : "Récupération : personne ne l'emporte, rien n'est gagné"];

    const pastille = camp => pastilleCamp(couleurDe, camp);

    // Ce que mon camp peut choisir
    const options = candidats
        ? [
            ...candidats.map(u => [u, simple ? (u === moi ? "moi-même" : `soutenir ${nomCamp(u)}`) : nomCamp(u)]),
            [CONTRE_TOUS, simple ? "s'opposer" : "contre tous"],
            [ABSTENTION, "personne (s'abstient)"],
        ]
        : [
            ...camps.filter(x => x.camp !== NEUTRE).map(x => [x.camp, nomCamp(x.camp)]),
            [ABSTENTION, "personne (s'abstient)"],
        ];

    const nomChoixDe = camp => options.find(o => o[0] === soutien(camp))?.[1] || nomResultat(soutien(camp));
    const nomSujet = SUJETS_DOMINATION[motif];

    return (
        <div
            data-domination={cle}
            data-sujet={motif}
            style={{
                marginTop: 6,
                padding: "6px 10px",
                border: "2px solid #6a1b9a",
                borderRadius: 8,
                backgroundColor: "#f3e5f5",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
            }}
        >
            <div>
                <b>{simple ? "Contrôle" : "Domination"} du système {nomCase(numero)}</b> — test ouvert par {nomCamp(demandeur)}
                {/* (l'action qui demande la domination est toujours dite) */}
                <span data-motif-domination={motif || (rackets.length ? "racket" : "main")}>
                    {nomSujet
                        ? <> pour <b>« {nomSujet} »</b></>
                        : (rackets.length > 0 ? " pour un Racket" : " à la main, depuis la fiche du système")}
                </span>.
                {" "}
                {recup
                    ? (simple
                        ? `${nomCamp(candidats[0])} est seul à demander la Récupération : test de contrôle simple — s'il réunit plus de contrôle que ceux qui s'opposent, il gagne ${recup.butin} ressource(s).`
                        : `Chaque camp soutient une des factions qui demandent la Récupération, s'engage contre toutes ou s'abstient : le résultat qui réunit le plus de contrôle l'emporte (${recup.butin} ressource(s) en jeu).`)
                    : "Un seul test pour ce sujet : la faction qui domine fait l'action, personne à égalité. Il ne sera pas rouvert."}
            </div>

            {/* Rackets en attente du résultat (script Racket) */}
            {rackets.map(r => (
                <div key={r.cle} data-racket={r.cle} style={{ color: "#4a148c" }}>
                    Racket de <b>{nomCamp(r.u)}</b> sur <b>{r.nom}</b>
                    {r.proprietaire ? <> ({nomCamp(r.proprietaire)})</> : null} : s'il domine, +{r.res} ressource(s) pour lui,
                    −{r.pris} pour le propriétaire.
                </div>
            ))}

            {camps.map(c => (
                <div key={c.camp} data-camp={c.camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    <span>
                        {pastille(c.camp)}<b>{nomCamp(c.camp)}</b> :{" "}
                        {c.participe
                            ? <>contrôle {c.controle + plus(c.camp)}{plus(c.camp) > 0 ? ` (dont ${plus(c.camp)} : Rapport de force)` : ""}, choisit</>
                            : "aucune unité militaire ici : ne participe pas"}
                    </span>

                    {c.participe && (joueur && c.camp === moi
                        ? (
                            <select
                                data-choix-domination
                                value={soutien(c.camp)}
                                onChange={e => envoyer(
                                    [{ type: "compteur", id: cleChoix(c.camp), valeur: Number(e.target.value) }],
                                    `Domination ${nomCase(numero)} : ${nomCamp(c.camp)} — ` +
                                        (options.find(o => o[0] === Number(e.target.value))?.[1] || "")
                                )}
                            >
                                {options.map(([valeur, libelle]) => <option key={valeur} value={valeur}>{libelle}</option>)}
                            </select>
                        )
                        : <b>{nomChoixDe(c.camp)}</b>)}

                    {c.camp === moi && c.participe && <RapportDeForce clePlus={clePlus(c.camp)} numero={numero} />}
                </div>
            ))}

            <div data-bilan-domination style={{ marginTop: 4 }}>
                {classes.map(([valeur, total]) => `${nomResultat(valeur)} : ${total}`).join(" ; ") || "Aucune unité militaire."}{" — "}
                {gagnant !== null
                    ? <b style={{ color: "#1b5e20" }}>{nomCamp(gagnant)} {recup ? "l'emporte" : "domine le système"}.</b>
                    : <b style={{ color: "#b71c1c" }}>{recup ? "Personne ne l'emporte." : "Personne ne domine le système."}</b>}
            </div>

            {joueur && (
                <BoutonRegle
                    data-action="clore-domination"
                    nom={`Clore le test de domination ${nomCase(numero)}${nomSujet ? ` (${nomSujet})` : ""} : ` +
                        (gagnant !== null ? `${nomCamp(gagnant)} ${recup ? "l'emporte" : "domine"}` : "personne ne l'emporte")}
                    faire={commentaire => envoyer([
                        { type: "compteur", id: cleDominant(numero, motif), valeur: gagnant ?? 0 },
                        // (0 : personne, ou les neutres ; le tour dit que le test de ce sujet est clos)
                        { type: "compteur", id: cleDominant(numero, motif) + ":tour", valeur: etat.tour },
                        ...camps.flatMap(c => [cleChoix(c.camp), clePlus(c.camp)]).filter(id => etat.compteurs[id])
                            .map(id => ({ type: "compteur", id, valeur: 0 })),
                        { type: "compteur", id: cle, valeur: 0 },
                        ...(motif ? [{ type: "compteur", id: cle + ":motif", valeur: 0 }] : []),
                        // (rackets en attente : appliqués si leur auteur domine, effacés dans tous les cas)
                        ...actionsRackets,
                        ...actionsRecup,
                    ], [commentaire, ...bilanRackets, ...bilanRecup].join(" — ").slice(0, 300))}
                    title="Enregistre le résultat de ce test (il ne sera pas rouvert pour ce sujet) et clôt le conflit"
                    style={{ marginTop: 4, padding: "3px 14px" }}
                >
                    Clore le conflit
                </BoutonRegle>
            )}
        </div>
    );
}
