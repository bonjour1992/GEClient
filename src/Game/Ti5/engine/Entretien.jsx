import { useEffect, useRef, useState } from "react";
import { useEngine, BoutonRegle, aMotCle, CUBE_MERCENAIRE, cubeDeMercenaire, nomElement } from "./Interaction";
import { useElement, useElements } from "./sync";
import { FAVEUR, actionsPoints } from "./miseEnPlace";
import { useExploitationDuVide } from "./Controle";
import { useRevenus } from "./Revenus";

// Planète Haven : compte comme une planète natale pour la faction qui la possède
const HAVEN = 1041;

// ============================================================
// RAVITAILLEMENT (ENTRETIEN) AUTOMATIQUE
//
// Une fois par tour, au début de la phase de ravitaillement, sans
// bouton : le navigateur de chaque joueur envoie son entretien dès
// que la phase commence (EntretienAuto, toujours monté), puis affiche
// un compte rendu détaillé, ligne par ligne :
//
//   Archon Tau : +2 res +5 inf
//   Usine sur Archon Tau : +2 influence
//   Agents récupérés : 2 Amiral, 3 Logisticien
//   Système natal : Archon Tau : 1 faveur
//   Diversité : +2 inf
//
// L'entretien ajoute les ressources et l'influence des planètes du
// joueur (éléments actifs) à ses compteurs, renvoie les agents usés
// parmi les agents disponibles, rend de nouveau disponibles les
// technologies utilisées ce tour, et donne une de ses faveurs au
// joueur qui possède une planète de son système natal. (Les unités
// « usées » redeviennent disponibles à chaque fin de phase : Partie.jsx.)
//
// Le compteur joueur:<u>:entretien garde le tour du dernier entretien
// (rien ne se double). Le compte rendu est gardé dans le navigateur
// (localStorage) pour le tour ; le journal en a le résumé.
//
// Hors de la phase, si l'entretien du tour n'a pas été fait (joueur
// absent pendant la phase), un bouton rouge gris permet de le faire.
// ============================================================

// Entretien : chaque carte mercenaire du joueur retrouve son cube noir — celui qui en
// vient (marque « carte »), sinon un autre de ses agents usés, sinon un cube neuf (un
// mercenaire arrivé sans cube) ; un cube resté sans carte est retiré. -> actions
function retourDesCubes(index, base, cubesUses) {

    const sansCube = (index.parZone.get(base + ":actif") || [])
        .filter(c => !c.cache && c.ref?.type === "mercenaire" && !cubeDeMercenaire(index, c));

    const libres = [...cubesUses];
    const actions = [];

    for (const carte of sansCube) {

        const k = libres.findIndex(x => x.marques?.carte === carte.id);
        const i = k >= 0 ? k : libres.findIndex(x => !sansCube.some(autre => autre.id === x.marques?.carte));

        if (i < 0) {
            actions.push({ type: "creer", jeton: CUBE_MERCENAIRE, sur: carte.id });
            continue;
        }

        const [cube] = libres.splice(i, 1);

        actions.push({ type: "deplacer", c: cube.id, sur: carte.id });

        if (cube.marques?.carte) {
            actions.push({ type: "marquer", c: cube.id, marque: "carte", valeur: null });
        }
    }

    return [...actions, ...libres.map(c => ({ type: "supprimer", c: c.id }))];
}

const charges = (ids, contenus) => ids.every(id => !(id > 0) || id in contenus);

// Entretien d'un joueur :
//   pret      toutes les données sont chargées (sinon le calcul est incomplet)
//   fait      l'entretien de ce tour est fait
//   attente   raisons d'attendre (conflits de domination d'Exploitation du vide)
//   lignes    compte rendu détaillé (textes)
//   resume    une ligne pour le journal
//   actions   le coup à envoyer
export function useEntretien(u, idFaction) {

    const { etat, index, aScript, search } = useEngine();

    const base = "joueur:" + u;
    const faction = useElement(idFaction);

    const planetes = (index.parZone.get(base + ":actif") || [])
        .filter(c => c.ref?.type === "planet");

    const contenuPlanetes = useElements(planetes.map(c => c.ref.id));

    const nom = ref => nomElement(search, ref);
    const sansInfluence = aScript(u, "sans-influence");

    const valeur = (c, champ) => Number(contenuPlanetes[c.ref.id]?.[champ]) || 0;
    const somme = champ => planetes.reduce((total, c) => total + valeur(c, champ), 0);

    // Script Exploitation du vide : 1 ressource par système vide dominé (3 pour une
    // nébuleuse) ; un système vide disputé demande un conflit de domination (Controle.jsx)
    const vide = useExploitationDuVide(u);

    // Scripts de revenu : ce que rapportent au ravitaillement les unités posées
    // et les planètes possédées (Revenus.jsx)
    const revenus = useRevenus(u, "ravit");

    const ressources = somme("res") + vide.gain + revenus.res;

    // Scripts d'entretien. Diversité : +1 influence par planète. Culture
    // courtisane : +1 influence par alliance en jeu chez moi (promesse de
    // type alliance dans mes éléments actifs ou sur une case de tour).
    const promesses = [...index.parZone]
        .filter(([zone]) => zone === base + ":actif" || zone.startsWith(base + ":tour:"))
        .flatMap(([, contenu]) => contenu.filter(c => !c.cache && c.ref?.type === "Promesse"));

    const contenuPromesses = useElements(promesses.map(c => c.ref.id));
    const alliances = promesses.filter(c => contenuPromesses[c.ref.id]?.type === "alli").length;

    const bonusInfluence = [
        aScript(u, "diversite") && planetes.length > 0 && [planetes.length, "Diversité"],
        aScript(u, "culture-courtisane-alliances") && alliances > 0 && [alliances, "Culture courtisane"],
    ].filter(Boolean);

    // (habilité Sans influence : l'entretien ne rapporte pas d'influence)
    const influence = sansInfluence
        ? 0
        : somme("inf") + bonusInfluence.reduce((total, [n]) => total + n, 0) + revenus.inf;

    // Habilités qui jouent à l'entretien (scripts de sorte « regle »)
    //   Sève de vie       mes unités biologiques de la carte récupèrent 1 de résistance
    //                     (2 avec la technologie Vie fructifiante)
    //   Destin légendaire 1 point par planète légendaire possédée
    //   Conclave secret   aux tours 1, 4, 6, 8, 9 et 10 : un objectif militaire en main
    //   Signal            un marqueur de signal sur un système tiré au hasard
    const bioBlessees = !aScript(u, "seve-de-vie") ? [] : Object.values(etat.composants).filter(c =>
        !c.cache && c.ref?.type === "unit" && (c.marques?.possession ?? c.proprio) === u && /^hex:\d+/.test(c.zone || "") &&
        Number(c.marques?.degat) > 0 && aMotCle(c, "bio"));

    const soin = aScript(u, "vie-fructifiante") ? 2 : 1;

    const legendaires = aScript(u, "destin-legendaire")
        ? planetes.filter(c => contenuPlanetes[c.ref.id]?.legendary).length
        : 0;

    const conclave = aScript(u, "conclave-secret") && [1, 4, 6, 8, 9, 10].includes(etat.tour);

    const systemesPoses = !aScript(u, "signal") ? [] : [...index.parZone]
        .filter(([zone, contenu]) => /^hex:\d{1,3}$/.test(zone) && contenu.some(c => c.ref?.type === "system"))
        .map(([zone]) => zone);

    const agentsUses = index.parZone.get(base + ":agentsUses") || [];

    // Cubes noirs des mercenaires utilisés : à l'entretien, ils retournent sur leur carte
    const cubesUses = agentsUses.filter(c => !c.ref && c.jeton === CUBE_MERCENAIRE);
    const retourCubes = retourDesCubes(index, base, cubesUses);
    const agentsRendus = agentsUses.filter(c => !cubesUses.includes(c));

    // (le Noble cryogénisé usé redevient disponible)
    const noblesUses = (index.parZone.get(base + ":actif") || [])
        .filter(c => !c.cache && c.ref?.type === "relique" && c.ref.id === 396 && c.marques?.use);

    const techsUtilisees = Object.keys(etat.compteurs)
        .filter(id => id.startsWith(base + ":techUse:") && etat.compteurs[id]);

    // Faveur : le joueur qui possède une planète de son système natal (sa carte est
    // dans ses éléments actifs) reçoit une de ses faveurs.
    const idNatal = faction?.system?.id;
    const systemeNatal = useElement(idNatal);

    // Règle de Haven (#1041) : la posséder compte comme posséder une planète natale
    const haven = aScript(u, "haven") && planetes.some(c => c.ref.id === HAVEN);

    const natales = (systemeNatal?.elems || [])
        .filter(lien => lien?.id > 0)
        .map(lien => lien.id)
        .filter(id => planetes.some(c => c.ref.id === id))
        .concat(haven ? [HAVEN] : []);

    const possedeNatale = natales.length > 0;

    // Une fois par tour : le compteur garde le tour du dernier entretien
    const fait = etat.tour > 0 && Number(etat.compteurs[base + ":entretien"]) === etat.tour;

    const pret = !!faction && charges(planetes.map(c => c.ref.id), contenuPlanetes) &&
        charges(promesses.map(c => c.ref.id), contenuPromesses) &&
        (!(idNatal > 0) || !!systemeNatal) && revenus.pret;

    // ----- compte rendu -----

    const gain = (n, mot) => (n > 0 ? `+${n} ${mot}` : "");

    // « 2 Amiral, 3 Logisticien »
    const parNom = new Map();

    for (const c of agentsRendus) {
        const n = c.ref ? nom(c.ref) : (c.jeton || "agent");
        parNom.set(n, (parNom.get(n) || 0) + 1);
    }

    const lignes = [
        ...planetes
            .map(c => ({ c, texte: [gain(valeur(c, "res"), "res"), sansInfluence ? "" : gain(valeur(c, "inf"), "inf")].filter(Boolean).join(" ") }))
            .map(x => `${nom(x.c.ref)} : ${x.texte || "rien"}`),
        ...revenus.lignes.filter(l => !l.vide).map(l => `${l.nom}${l.ou ? " sur " + l.ou : ""} : ${l.texte}`),
        vide.gain > 0 && `Exploitation du vide : +${vide.gain} res`,
        ...(sansInfluence ? ["Sans influence : aucune influence gagnée"] : bonusInfluence.map(([n, titre]) => `${titre} : +${n} inf`)),
        agentsRendus.length > 0 && `Agents récupérés : ${[...parNom].map(([n, k]) => `${k} ${n}`).join(", ")}`,
        cubesUses.length > 0 && `Mercenaires : ${cubesUses.length} cube(s) de retour sur leur carte`,
        techsUtilisees.length > 0 && `Technologies de nouveau disponibles : ${techsUtilisees.length}`,
        noblesUses.length > 0 && "Noble cryogénisé : de nouveau disponible",
        possedeNatale && `Planète natale : ${natales.map(id => nom({ type: "planet", id })).join(", ")} : 1 faveur`,
        !possedeNatale && idNatal > 0 && "Planète natale : aucune possédée, pas de faveur",
        bioBlessees.length > 0 && `Sève de vie : ${bioBlessees.length} unité(s) soignée(s)${soin > 1 ? ` (Vie fructifiante : ${soin} de résistance)` : ""}`,
        legendaires > 0 && `Destin légendaire : +${legendaires} point(s)`,
        conclave && "Conclave secret : 1 objectif militaire pioché",
        systemesPoses.length > 0 && "Signal : 1 marqueur sur un système au hasard",
        `Total : +${ressources} res, +${influence} inf`,
    ].filter(Boolean);

    const actions = [
        // (si : refusé si l'entretien vient d'être fait depuis une autre fenêtre)
        { type: "compteur", id: base + ":entretien", valeur: etat.tour, si: Number(etat.compteurs[base + ":entretien"]) || 0 },
        ressources && { type: "compteur", id: base + ":res", delta: ressources },
        influence && { type: "compteur", id: base + ":inf", delta: influence },
        ...agentsRendus.map(c => ({ type: "deplacer", c: c.id, vers: base + ":agents" })),
        ...retourCubes,
        ...noblesUses.map(c => ({ type: "marquer", c: c.id, marque: "use", valeur: false })),
        ...techsUtilisees.map(id => ({ type: "compteur", id, valeur: 0 })),
        ...revenus.actions,
        ...bioBlessees.map(c => ({ type: "marquer", c: c.id, marque: "degat", valeur: Math.max(0, Number(c.marques.degat) - soin) })),
        ...actionsPoints(etat, u, legendaires),
        conclave && { type: "piocher", de: "pioche:militaire", vers: base + ":main" },
        systemesPoses.length > 0 && {
            type: "creer",
            ref: { type: "token", id: 859 },
            zone: systemesPoses[Math.floor(Math.random() * systemesPoses.length)],
            proprio: u,
        },
        possedeNatale && { type: "creer", jeton: FAVEUR, zone: base + ":faveurs", proprio: u },
    ].filter(Boolean);

    return {
        pret,
        fait,
        attente: [
            vide.aResoudre.length > 0 &&
                `Exploitation du vide : ${vide.aResoudre.length} système(s) vide(s) disputé(s), conflit(s) de domination à résoudre (onglet Conflit)`,
            // (scripts de revenu qui attendent : Extraction de la faille sur une Faille disputée)
            ...revenus.attentes,
        ].filter(Boolean),
        vide,
        lignes,
        resume: `Ravitaillement : +${ressources} res, +${influence} inf, ${agentsRendus.length} agent(s)` +
            (possedeNatale ? ", +1 faveur" : ""),
        actions,
    };
}

// ------------------------------------------------------------
// Compte rendu gardé dans le navigateur, par partie, joueur et tour
// ------------------------------------------------------------

const cleRapport = (idPartie, u, tour) => `ge-ti5-ravitaillement:${idPartie}:${u}:${tour}`;

function lireRapport(idPartie, u, tour) {
    try {
        return JSON.parse(window.localStorage.getItem(cleRapport(idPartie, u, tour)) || "null");
    } catch {
        return null;
    }
}

function garderRapport(idPartie, u, tour, lignes) {
    try {
        window.localStorage.setItem(cleRapport(idPartie, u, tour), JSON.stringify(lignes));
        // (le compte rendu du tour d'avant ne sert plus)
        window.localStorage.removeItem(cleRapport(idPartie, u, tour - 2));
    } catch {
        // (stockage indisponible : le compte rendu reste affiché tant que la page est ouverte)
    }
}

const styleRapport = {
    border: "1px solid #7cb342",
    backgroundColor: "#f1f8e9",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 13,
    color: "#000",
};

// Mon entretien : envoyé d'office au début du ravitaillement, puis son compte rendu.
//   auto    ce composant envoie l'entretien (un seul par page : celui de l'en-tête, toujours
//           monté) ; il ne montre le compte rendu que pendant la phase
//   plateau celui de l'onglet Plateau joueur : compte rendu de tout le tour, et bouton de
//           rattrapage si l'entretien du tour n'a pas été fait
export function EntretienAuto({ auto = false, plateau = false }) {

    const { etat, envoyer, moi, joueur, partie, factionDe } = useEngine();

    const entretien = useEntretien(moi, factionDe(moi) ?? -1);

    const enPhase = /ravitaill/i.test(etat.phase || "");
    const aFaire = !!joueur && etat.tour > 0 && !entretien.fait;

    const [rapport, setRapport] = useState(null);
    const enCours = useRef(false);

    // Compte rendu du tour (celui qui vient d'être envoyé, ou celui gardé par le navigateur)
    const lignes = rapport?.tour === etat.tour ? rapport.lignes : lireRapport(partie.id, moi, etat.tour);

    function faire(commentaire) {

        const texte = entretien.lignes;

        enCours.current = true;

        Promise.resolve(envoyer(entretien.actions, commentaire || entretien.resume)).then(reponse => {

            enCours.current = false;

            if (reponse) {
                garderRapport(partie.id, moi, etat.tour, texte);
                setRapport({ tour: etat.tour, lignes: texte });
            }
        });
    }

    // Début de la phase de ravitaillement : l'entretien part tout seul, une fois les
    // données chargées et les conflits de domination d'Exploitation du vide résolus
    const partir = auto && aFaire && enPhase && entretien.pret && entretien.attente.length === 0;

    useEffect(() => {

        if (!partir || enCours.current) {
            return undefined;
        }

        // (un court délai : les contenus encore en cache finissent de se charger)
        const minuteur = window.setTimeout(() => {
            if (!enCours.current) {
                faire();
            }
        }, 800);

        return () => window.clearTimeout(minuteur);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partir, etat.tour]);

    // (pendant la phase, c'est l'en-tête qui montre le compte rendu : pas de doublon sur le plateau)
    const montreRapport = entretien.fait && (plateau ? !enPhase : enPhase);
    const montreAttente = aFaire && enPhase && !plateau;
    // (pas avant la phase de ravitaillement : « 00. Controle » la précède)
    const rangPhase = Number(/^(\d+)/.exec(etat.phase || "")?.[1] ?? 99);
    const montreRattrapage = aFaire && !enPhase && plateau && rangPhase > 1;

    if (!joueur || etat.tour <= 0 || !(montreRapport || montreAttente || montreRattrapage)) {
        return null;
    }

    return (
        <div data-ravitaillement={entretien.fait ? "fait" : "a-faire"} style={{ display: "flex", flexDirection: "column", gap: 4 }}>

            {montreRapport && (
                <div style={styleRapport}>
                    <b>✔ Ravitaillement du tour {etat.tour}</b>
                    {lignes
                        ? lignes.map((ligne, k) => <div key={k} data-ligne-ravitaillement>{ligne}</div>)
                        : <div>Fait depuis une autre fenêtre : le résumé est dans le journal.</div>}
                </div>
            )}

            {montreAttente && (
                <div style={{ ...styleRapport, borderColor: "#f9a825", backgroundColor: "#fffde7" }}>
                    <b>Ravitaillement automatique…</b>
                    {entretien.attente.map(texte => <div key={texte}>En attente — {texte}</div>)}
                    {!entretien.pret && <div>Chargement des planètes et des unités…</div>}
                </div>
            )}

            {/* Joueur absent pendant la phase : l'entretien du tour reste possible, à la main */}
            {montreRattrapage && (
                <BoutonRegle
                    nom="Ravitaillement"
                    data-action="ravitaillement-manuel"
                    obstacles={[
                        "ce n'est pas la phase de ravitaillement (il se fait d'office au début de cette phase)",
                        !entretien.pret && "les données ne sont pas encore chargées",
                        ...entretien.attente,
                    ]}
                    faire={faire}
                    title="Le ravitaillement de ce tour n'a pas été fait : il part normalement tout seul au début de la phase de ravitaillement"
                    style={{ padding: "4px 10px" }}
                >
                    Ravitaillement du tour {etat.tour} non fait : le faire maintenant
                </BoutonRegle>
            )}
        </div>
    );
}
