import { useState } from "react";
import { useEngine, BoutonRegle, nomCase, distanceCases, nomElement, agentDisponible, nomDuCamp, pastilleCamp, styleMini } from "./Interaction";
import { useElements } from "./sync";
import { MARQUEUR, campDe } from "./miseEnPlace";
import { estHyperlane, hyperlaneRelie } from "./hyperlane";
import { controleDe, estDeplacementFurtif } from "./effets";
import { contenuEnCache } from "./sync";
import { redevancesRompues, frontieresOuvertes, dettesAnnulables, estCommerceNonMilitaire } from "./effetsBlocage";
import { demander } from "./demande";
import { unitesDuLieu, rangDePhase, ESPACE_CONTROLE } from "./regleControle";
import { MARQUE_BLOQUEE, MARQUE_CHOIX, estEngagee, bilanBlocage, choixDe as choixBlocage } from "./regleBlocage";
import { ChoixDesCamps } from "./BlocageAction";

// ============================================================
// BLOCAGE D'UN DÉPLACEMENT, CASE PAR CASE (onglet Conflit)
//
// Un déplacement assisté (Deplacement.jsx) avance de case en case.
// Les vaisseaux en route portent leur trajet restant (marque
// « trajet ») : tout le monde voit le déplacement, et il survit à
// un changement d'onglet ou à un rechargement.
//
// Avant de quitter une case, deux risques de blocage :
//
//   unités   des unités militaires d'un autre camp, encore libres à
//            cette phase, sont dans l'espace de la case (un système de
//            défense posé sur une planète y compte aussi). Même test
//            que pour une action (regleBlocage.js), unité par unité :
//            chaque camp engage ses unités pour bloquer ou pour aider ;
//            le joueur qui se déplace égalise le surplus avec ses
//            propres unités — militaires d'abord, puis transports, puis
//            les autres : un vaisseau en route engagé s'arrête ici.
//            Toute unité qui a servi est engagée pour la phase, comme
//            tout vaisseau qui s'est déplacé (marque posée au départ,
//            Deplacement.jsx) ; le test n'est subi qu'une fois par case
//            et par phase ;
//   jets     rupture gravitationnelle quittée par un bord, ou trou
//            de ver oméga : un dé de 10 par vaisseau, 3 ou moins le
//            bloque (oméga : 9 ou plus, il passe avec une touche).
//            Le joueur peut arrêter d'autres vaisseaux avec lui.
//
// Sans risque, les vaisseaux vont d'un coup jusqu'à la prochaine
// case à risque, ou jusqu'à l'arrivée. Un système où des vaisseaux
// sont arrêtés est activé (marqueur du joueur).
//
// L'outil reste permissif : chaque bouton d'effet est un
// BoutonRegle (rouge gris hors règle, utilisable après confirmation).
// ============================================================

// Marques d'un vaisseau en route
export const TRAJET = "trajet";     // cases qu'il lui reste à parcourir : « 13>20>21 »
export const DEPART = "deplDe";     // « c12 » : la case d'où il est parti
const PASSE = "passe";              // « c13 » : le blocage par unités de cette case est résolu
const JET = "jetDepl";              // son jet (rupture, trou de ver oméga) sur cette case
const DRAIN = "drainOk";            // « c13 » : le Drain spatial de la case suivante est réglé


// Catégorie d'un trou de ver, d'après son image (/ti/icon/wormhole/alpha.png)
const typeTrou = image => /wormhole\/(\w+)\./.exec(image || "")?.[1] || null;

// Token « Repère de Suldhan Wraeg » (mercenaire #352) : posé dans une anomalie, elle n'affecte
// plus les déplacements de son propriétaire
export const REPERE_SULDHAN = 1265;

// ------------------------------------------------------------
// Déplacements en cours : les vaisseaux en route, groupés par
// joueur, case et trajet restant
//   [{ cle, mover, numero, trajet: [cases], vaisseaux: [composants] }]
// ------------------------------------------------------------

export function passagesEnCours(etat) {

    const groupes = new Map();

    for (const c of Object.values(etat.composants)) {

        const m = /^hex:(\d+)$/.exec(c.zone || "");
        const reste = c.marques?.[TRAJET];

        if (!m || c.ref?.type !== "unit" || c.sur || reste === undefined || reste === null) {
            continue;
        }

        const mover = campDe(c);
        const cle = `${mover}|${m[1]}|${reste}`;

        if (!groupes.has(cle)) {
            groupes.set(cle, { cle, mover, numero: Number(m[1]), trajet: String(reste).split(">").map(Number), vaisseaux: [] });
        }

        groupes.get(cle).vaisseaux.push(c);
    }

    return [...groupes.values()].sort((a, b) => a.numero - b.numero || a.cle.localeCompare(b.cle));
}

// ------------------------------------------------------------
// Ce qu'il faut savoir des cases d'un trajet : anomalie, trous de
// ver (tuile et tokens posés), unités militaires de l'espace
// ------------------------------------------------------------

//   mover : le joueur qui se déplace (script Stargate : ses systèmes à dock ont un trou de ver alpha)
export function useCarte(cases, mover) {

    const { etat, index, aScript } = useEngine();

    // Un dock du joueur dans le système (espace ou planètes) ?
    const aUnDock = i => [...index.parZone].some(([zone, contenu]) =>
        (zone === "hex:" + i || zone.startsWith(`hex:${i}:`)) &&
        contenu.some(c => c.ref?.type === "unit" && campDe(c) === mover && contenuEnCache(c.ref.id)?.type === "dock"));

    const uniques = [...new Set(cases)];
    const ids = liste => [...new Set(liste.filter(id => Number.isInteger(id) && id > 0))];

    const dans = i => index.parZone.get("hex:" + i) || [];
    const tuile = i => dans(i).find(c => c.ref?.type === "system");
    const tokens = i => dans(i).filter(c => !c.cache && c.ref?.type === "token");

    // Unités de l'espace de la case (celles qu'un vaisseau porte ne comptent pas), et celles de
    // ses planètes : un système de défense y compte aussi dans l'espace (regleControle.js)
    const unites = i => dans(i).filter(c => !c.cache && c.ref?.type === "unit" && !c.sur);

    const surPlanetes = i => [...index.parZone]
        .filter(([zone]) => zone.startsWith(`hex:${i}:planete:`))
        .flatMap(([, contenu]) => contenu.filter(c => !c.cache && c.ref?.type === "unit"));

    const idsSystemes = ids(uniques.map(i => tuile(i)?.ref.id));
    const systemes = useElements(idsSystemes);

    const idsPlanetes = ids(uniques.flatMap(i => (systemes[tuile(i)?.ref.id]?.elems || []).map(lien => Number(lien?.id))));
    const planetes = useElements(idsPlanetes);

    const idsTokens = ids(uniques.flatMap(i => tokens(i).map(c => c.ref.id)));
    const contenusTokens = useElements(idsTokens);

    const idsUnites = ids(uniques.flatMap(i => [...unites(i), ...surPlanetes(i)].map(c => c.ref.id)));
    const contenus = useElements(idsUnites);

    // Unités qui comptent dans l'espace de la case — le seul endroit qui le dit : unitesDuLieu
    const duLieu = i => unitesDuLieu({ index, contenuDe: id => contenus[id], numero: i, k: ESPACE_CONTROLE });
    const militaires = i => duLieu(i).filter(c => contenus[c.ref.id]?.mot_cle?.includes("mil"));

    const charge = (liste, table) => liste.every(id => id in table);

    // Mercenaire Suldhan Wraeg : un repère de celui qui se déplace est posé dans l'anomalie, elle
    // n'affecte plus ses déplacements (supernova, astéroïdes, nébuleuse, jet de la rupture)
    const repere = i => !!mover && tokens(i).some(c => c.ref.id === REPERE_SULDHAN && c.proprio === mover) &&
        aScript(mover, "suldhan-wraeg-reperes");

    return {
        // Tout est chargé : les risques peuvent être évalués
        pret: charge(idsSystemes, systemes) && charge(idsPlanetes, planetes) &&
            charge(idsTokens, contenusTokens) && charge(idsUnites, contenus),
        contenus,
        anomalie: i => (repere(i) ? "" : systemes[tuile(i)?.ref.id]?.anomaly || ""),
        repere,
        // Hyperlane (hyperlane.js) : on la traverse sans s'y arrêter, le long de ses lignes
        hyperlane: i => estHyperlane(systemes[tuile(i)?.ref.id]?.anomaly),
        relie: (i, de, vers) => hyperlaneRelie(systemes[tuile(i)?.ref.id]?.anomaly, tuile(i)?.marques?.rotation, i, de, vers),
        trous: i => {
            const trous = new Set([
                ...(systemes[tuile(i)?.ref.id]?.elems || []).map(lien => typeTrou(planetes[lien?.id]?.img)),
                ...tokens(i).map(c => typeTrou(contenusTokens[c.ref.id]?.img)),
                mover && aScript(mover, "stargate") && aUnDock(i) && "alpha",
            ].filter(Boolean));
            // Mercenaire Sai Seravus : les trous de ver alpha et bêta sont équivalents pour lui
            // (l'identifiant « sai-seravus » est celui d'Oriane Tesh, ex-Sai Seravus : scripts.js)
            if (mover && (trous.has("alpha") || trous.has("beta")) && aScript(mover, "sai-seravus-trous-de-ver")) {
                trous.add("alpha");
                trous.add("beta");
            }
            return trous;
        },
        // Script Drain spatial : joueurs qui l'ont, autres que celui qui se déplace, et
        // qui ont un vaisseau amiral, un soleil de guerre ou un système de défense
        // dans le système (espace ou planètes)
        drain: i => [...new Set([...index.parZone]
            .filter(([zone]) => zone === "hex:" + i || zone.startsWith(`hex:${i}:`))
            .flatMap(([, contenu]) => contenu
                .filter(c => c.ref?.type === "unit" && ["fs", "sun", "pds"].includes(contenuEnCache(c.ref.id)?.type))
                .map(campDe))
            .filter(camp => camp > 0 && camp !== mover && aScript(camp, "drain-spatial")))],
        // Contrôle d'une unité (effets.js : #con, Rayon tracteur)
        controle: c => controleDe(contenus[c.ref.id], campDe(c), aScript),
        // Unités qui comptent dans l'espace de la case ; ses unités militaires ; celles qui sont
        // encore libres à cette phase (non engagées, regleBlocage.js)
        unites: duLieu,
        militaires,
        libres: i => militaires(i).filter(c => !estEngagee(etat, c)),
    };
}

// Comment on passe d'une case à l'autre : "bord" (voisines), "trou:<catégorie>", ou "saut"
export function sorteEtape(carte, de, a) {

    if (distanceCases(de, a) === 1) {
        return "bord";
    }

    const commun = [...carte.trous(de)].find(t => carte.trous(a).has(t));

    return commun ? "trou:" + commun : "saut";
}

// Jet à faire pour passer de `de` à `a` : "rift" (rupture quittée par un bord), "omega", ou null
export function sorteJet(carte, de, a) {

    if (a === undefined || a === null) {
        return null;
    }

    const sorte = sorteEtape(carte, de, a);

    return sorte === "bord" && carte.anomalie(de) === "rift" ? "rift" : (sorte === "trou:omega" ? "omega" : null);
}

// Camps qui peuvent bloquer sur la case : ceux qui y ont des unités militaires encore libres à
// cette phase, hors celui qui se déplace (le test est refait à chaque passage tant qu'il en reste)
//   [{ camp, unites, controle }] — contrôle : celui de chaque unité (1 par défaut)
export function campsAdverses(carte, numero, mover) {

    const parCamp = new Map();

    for (const c of carte.libres(numero)) {

        const camp = campDe(c);

        if (camp !== mover) {
            parCamp.set(camp, [...(parCamp.get(camp) || []), c]);
        }
    }

    return [...parCamp].map(([camp, unites]) => ({
        camp,
        unites,
        controle: unites.reduce((s, c) => s + carte.controle(c), 0),
    }));
}

// Jusqu'où va un groupe sans risque de blocage : rang, dans `trajet`, de la
// première case à risque — ou de la dernière (l'arrivée) ; -1 s'il y a un
// risque là où il est (ignoré si `resolu` : ce risque vient d'être traité).
// furtifs : tous les vaisseaux du groupe ont le déplacement furtif — les unités
// adverses ne les arrêtent pas.
export function rangArret(carte, mover, ici, trajet, resolu, furtifs = false) {

    const risque = (de, a) => (!furtifs && campsAdverses(carte, de, mover).length > 0) || !!sorteJet(carte, de, a) ||
        carte.drain(a).length > 0;

    if (!resolu && risque(ici, trajet[0])) {
        return -1;
    }

    for (let k = 0; k < trajet.length - 1; k++) {
        if (risque(trajet[k], trajet[k + 1])) {
            return k;
        }
    }

    return trajet.length - 1;
}

// ------------------------------------------------------------
// Les déplacements en cours (onglet Conflit)
// ------------------------------------------------------------

export function Blocages() {

    const { etat } = useEngine();

    const passages = passagesEnCours(etat);

    if (!passages.length) {
        return null;
    }

    return (
        <div data-blocages style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>Déplacements en cours</b>
            {passages.map(p => <Passage key={p.cle} passage={p} />)}
        </div>
    );
}

// ------------------------------------------------------------
// Un groupe de vaisseaux en route, arrêté sur une case
// ------------------------------------------------------------

export function Passage({ passage }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, couleurDe, aviser, aScript } = useEngine();

    const { mover, numero, trajet, vaisseaux } = passage;

    const carte = useCarte([numero, ...trajet], mover);

    // Vaisseaux que le joueur arrête ici (cases cochées)
    const [stoppes, setStoppes] = useState([]);

    const estMover = !!joueur && moi === mover;
    const suivante = trajet[0];
    const arrivee = trajet[trajet.length - 1];

    const nom = c => nomElement(search, c.ref);
    const nomCamp = camp => nomDuCamp(nomDe, camp);
    const estMilitaire = v => !!carte.contenus[v.ref.id]?.mot_cle?.includes("mil");

    // --------------------------------------------------------
    // OÙ EN EST-ON SUR CETTE CASE
    // --------------------------------------------------------

    // Déplacement furtif (#deplfurtif, script Camouflage) : ces vaisseaux ne sont pas bloqués par des unités
    const furtif = v => estDeplacementFurtif(carte.contenus[v.ref.id], mover, aScript);
    const exposes = vaisseaux.filter(v => !furtif(v));

    const adverses = exposes.length ? campsAdverses(carte, numero, mover) : [];
    const jet = sorteJet(carte, numero, suivante);

    // Script Drain spatial : avant d'entrer dans la case suivante, chaque joueur qui
    // l'a (et y a un vaisseau amiral, un soleil de guerre ou un système de défense)
    // peut exiger 1 ressource par vaisseau — sinon le vaisseau reste ici
    const draineurs = carte.drain(suivante);
    const cleDrain = camp => `blocage:${numero}:${mover}:drain:${camp}`;
    const choixDrain = camp => Number(etat.compteurs[cleDrain(camp)]) || 0;

    const stade = !carte.pret ? "charge"
        : (adverses.length > 0 && vaisseaux.some(v => v.marques?.[PASSE] !== "c" + numero) ? "unites"
            : (draineurs.length > 0 && vaisseaux.some(v => v.marques?.[DRAIN] !== "c" + numero) ? "drain"
                : (jet ? (vaisseaux.every(v => v.marques?.[JET]) ? "jets" : "lancer") : "libre")));

    // --------------------------------------------------------
    // BLOCAGE PAR DES UNITÉS
    //
    // Même test que pour une action (regleBlocage.js, BlocageAction.jsx), unité par unité :
    // chaque autre camp engage ses unités militaires de la case pour bloquer, ou des unités
    // pour aider (marque « blocChoix » ; les neutres bloquent d'office). Le joueur qui se
    // déplace égalise le surplus avec ses propres unités — les militaires d'abord, puis les
    // transports, puis les autres : un vaisseau en route qu'il engage s'arrête ici ; une unité
    // restée sur la case (cochée) est seulement engagée. Toute unité qui a servi est engagée
    // pour la phase, et le joueur ne subit le test qu'une fois par case et par phase.
    // --------------------------------------------------------

    // (anciens compteurs de choix par camp : seulement effacés)
    const cleChoix = camp => `blocage:${numero}:${mover}:${camp}`;

    // Script Rapport de force : un diplomate usé ajoute 2 au contrôle d'un camp
    // pour ce blocage (compteur blocage:<case>:<joueur>:<camp>:plus)
    const clePlus = camp => cleChoix(camp) + ":plus";
    const plus = camp => Number(etat.compteurs[clePlus(camp)]) || 0;

    const rapportDeForce = camp => joueur && camp === moi && !plus(camp) && aScript(moi, "rapport-de-force") && (
        <BoutonRegle
            data-action="rapport-de-force"
            nom={`Rapport de force (${nomCase(numero)}) : +2 à votre contrôle`}
            obstacles={[!agentDisponible({ index, moi, search }, "diplomate") && "vous n'avez pas de diplomate disponible (aucun ne sera usé)"]}
            faire={commentaire => {
                const diplomate = agentDisponible({ index, moi, search }, "diplomate");

                envoyer([
                    diplomate && { type: "deplacer", c: diplomate.id, vers: `joueur:${moi}:agentsUses` },
                    { type: "compteur", id: clePlus(moi), valeur: 2 },
                ], commentaire);
            }}
            title="Rapport de force : use un diplomate, +2 à votre valeur de contrôle pour ce blocage"
            style={styleMini}
        >
            Rapport de force (+2, use un diplomate)
        </BoutonRegle>
    );

    // Bilan du test (regleBlocage.js) : unités des autres camps qui bloquent ou aident, surplus à égaliser
    const bilan = bilanBlocage({
        etat, unites: carte.unites(numero), contenuDe: id => carte.contenus[id], aScript, acteur: mover, plus,
    });

    const surplus = bilan.blocage - bilan.aide;
    const aBloquer = stade === "unites" ? bilan.net : 0;

    // Mes unités restées sur la case : elles égalisent si je les engage (marque « p »)
    const surPlace = bilan.miennes.filter(c => !c.marques?.[TRAJET]);
    const engageesSurPlace = surPlace.filter(c => choixBlocage(c, mover) === "p");

    // Ordre d'engagement de mes unités : 0 militaire, 1 transport, 2 autre
    const estTransport = v => !estMilitaire(v) && Number(carte.contenus[v.ref.id]?.capacite) > 0;
    const rangEngagement = v => (estMilitaire(v) ? 0 : (estTransport(v) ? 1 : 2));
    const controleDes = liste => liste.reduce((s, c) => s + bilan.controle(c), 0);

    // --------------------------------------------------------
    // JETS (rupture gravitationnelle, trou de ver oméga)
    // --------------------------------------------------------

    // (D10 numéroté de 0 à 9 — le jet n'est lu qu'au stade « jets », tous lancés)
    const de = v => Number(v.marques?.[JET]) || 0;
    // Nef de la rupture (#810) : elle ignore le blocage et les touches des trous de ver oméga — de
    // ceux-là seulement (un blocage par des unités, une rupture gravitationnelle l'arrêtent)
    const nefOmega = v => jet === "omega" && v.ref.id === 810 && aScript(mover, "nef-de-la-rupture");
    const bloqueParJet = v => stade === "jets" && de(v) <= 3 && !nefOmega(v);
    // (technologie Stabilisateur de rupture : les vaisseaux ignorent les touches des trous de ver oméga)
    const touche = v => stade === "jets" && jet === "omega" && de(v) >= 9 && !aScript(mover, "stabilisateur-de-rupture") && !nefOmega(v);

    // --------------------------------------------------------
    // QUI S'ARRÊTE, QUI CONTINUE
    // --------------------------------------------------------

    const arretes = vaisseaux.filter(v => stoppes.includes(v.id) || bloqueParJet(v));
    const continuent = vaisseaux.filter(v => !arretes.includes(v));

    // Blocage par des unités : j'égalise avec les vaisseaux que j'arrête et les unités restées
    // sur la case que j'engage — mes unités militaires et mes transports d'abord, autant qu'il
    // en faut (tous, si je ne peux pas égaliser). Mes vaisseaux civils ne viennent qu'ensuite,
    // et seulement jusqu'au blocage des camps qui bloquent aussi les civils (option « épargner
    // les vaisseaux civils » de chaque camp qui bloque : compteur …:<camp>:civils).
    const cleCivils = camp => cleChoix(camp) + ":civils";
    const epargne = camp => !!etat.compteurs[cleCivils(camp)];

    const blocageCivils = controleDes(bilan.bloquent.filter(c => !epargne(campDe(c)))) +
        [...new Set(bilan.bloquent.map(campDe))].filter(camp => !epargne(camp)).reduce((s, camp) => s + plus(camp), 0);

    const estCivil = c => rangEngagement(c) === 2;
    const idsArretes = new Set(arretes.map(v => v.id));
    const utilisees = [...engageesSurPlace, ...arretes];
    const mesUnites = [...surPlace, ...exposes];

    const capaciteMT = controleDes(mesUnites.filter(c => !estCivil(c)));
    const requisMT = Math.min(aBloquer, capaciteMT);
    const requisCivils = Math.min(Math.max(0, Math.min(aBloquer - capaciteMT, blocageCivils)), controleDes(mesUnites.filter(estCivil)));
    const engageMT = controleDes(utilisees.filter(c => !estCivil(c)));
    const engageCivils = controleDes(utilisees.filter(estCivil));

    const egalise = controleDes(utilisees);
    const libres = [...surPlace.filter(c => !engageesSurPlace.includes(c)), ...exposes.filter(v => !idsArretes.has(v.id))];
    const horsOrdre = aBloquer > 0 && utilisees.some(u => libres.some(l => rangEngagement(l) < rangEngagement(u)));

    // Drain spatial : 1 ressource par vaisseau qui continue, pour chaque joueur qui l'exige
    const coutDrain = stade === "drain"
        ? draineurs.filter(camp => choixDrain(camp) === 1).length * continuent.length
        : 0;

    const mesRessources = Number(etat.compteurs[`joueur:${mover}:res`]) || 0;

    const obstacles = stade === "drain" ? [
        ...draineurs.filter(camp => !choixDrain(camp)).map(camp => `${nomCamp(camp)} n'a pas encore dit s'il exige le Drain spatial (compté comme un passage libre)`),
        coutDrain > mesRessources && `Drain spatial : ${coutDrain} ressource(s) à payer, ${nomCamp(mover)} en a ${mesRessources}`,
    ] : stade === "unites" ? [
        engageMT < requisMT &&
            `blocage de ${aBloquer} : engagez encore ${requisMT - engageMT} de contrôle avec vos unités militaires et vos transports (vaisseaux arrêtés, unités restées sur place)`,
        engageCivils < requisCivils &&
            `il reste ${requisCivils - engageCivils} de blocage opposable à vos vaisseaux civils : arrêtez-en`,
        horsOrdre && "vos unités militaires s'engagent d'abord, puis vos transports, puis vos vaisseaux civils",
    ] : [];

    // Retire les marques de déplacement d'un vaisseau
    const liberer = v => [TRAJET, DEPART, PASSE, JET, DRAIN]
        .filter(marque => v.marques?.[marque] !== undefined)
        .map(marque => ({ type: "marquer", c: v.id, marque, valeur: null }));

    // Fait avancer des vaisseaux jusqu'à la prochaine case à risque, ou l'arrivée
    function avancer(navires) {

        const k = rangArret(carte, mover, numero, trajet, true, navires.every(furtif));
        const reste = trajet.slice(k + 1);

        // Script Stratégie de saut : arrivés par un trou de ver, les vaisseaux
        // le gardent en marque pour le combat de ce tour (Combat.jsx)
        const saut = !reste.length && aScript(mover, "strategie-de-saut") &&
            sorteEtape(carte, k > 0 ? trajet[k - 1] : numero, trajet[k]).startsWith("trou:");

        return navires.flatMap(v => [
            saut && { type: "marquer", c: v.id, marque: "saut", valeur: etat.tour },
            { type: "deplacer", c: v.id, vers: "hex:" + trajet[k], de: "hex:" + numero },
            ...(reste.length
                ? [{ type: "marquer", c: v.id, marque: TRAJET, valeur: reste.join(">") }]
                : liberer(v).filter(a => a.marque === TRAJET || a.marque === DEPART)),
            ...liberer(v).filter(a => a.marque === PASSE || a.marque === JET || a.marque === DRAIN),
        ]);
    }

    // Un système où des vaisseaux s'arrêtent en chemin est activé
    function activation() {

        const partiDIci = arretes.every(v => v.marques?.[DEPART] === "c" + numero);

        const dejaActive = (index.parZone.get("hex:" + numero) || [])
            .some(c => !c.ref && c.jeton === MARQUEUR && c.proprio === mover);

        return arretes.length && !partiDIci && !dejaActive
            ? [{ type: "creer", jeton: MARQUEUR, zone: "hex:" + numero, proprio: mover }]
            : [];
    }

    // Effets déclenchés par un blocage par unités qui a porté (effetsBlocage.js) : Redevance de
    // protection (automatique), Frontière ouverte et fin des dettes (questions au joueur bloqué,
    // onglet Décision). -> { actions, textes }
    async function effetsDuBlocage() {

        if (stade !== "unites" || aBloquer <= 0 || !arretes.length) {
            return { actions: [], textes: [] };
        }

        const bloqueurs = [...new Set(bilan.bloquent.map(campDe))];
        const actions = [];
        const textes = [];

        for (const r of redevancesRompues({ etat, bloqueurs, bloque: mover, aScript })) {
            actions.push(...r.actions);
            textes.push(`${nomCamp(r.camp)} bloque ${nomCamp(mover)} : sa Redevance de protection est dépensée`);
        }

        for (const f of frontieresOuvertes({ etat, bloqueurs, bloque: mover, aScript })) {

            if (await demander({
                titre: "Frontière ouverte",
                texte: `${nomCamp(f.camp)} bloque votre mouvement ${nomCase(numero)}. Dépenser la promesse « Frontière ouverte » ? ${nomCamp(f.camp)} gagne 1 infamie.`,
                choix: [{ valeur: 1, libelle: `Dépenser la promesse (${nomCamp(f.camp)} : +1 infamie)` }, { valeur: 2, libelle: "La garder" }],
                renoncer: false,
            }) === 1) {
                actions.push(...f.actions);
                textes.push(`Frontière ouverte dépensée : ${nomCamp(f.camp)} gagne 1 infamie`);
            }
        }

        // (dettes : seulement si un vaisseau de commerce non militaire est arrêté)
        if (arretes.some(v => estCommerceNonMilitaire(carte.contenus[v.ref.id]))) {

            // (seuls les camps qui bloquent aussi les civils ont bloqué ce vaisseau de commerce)
            for (const d of dettesAnnulables({ etat, bloqueurs: bloqueurs.filter(camp => !epargne(camp)), bloque: mover })) {

                if (await demander({
                    titre: "Vaisseau de commerce bloqué",
                    texte: `${nomCamp(d.camp)} bloque votre vaisseau de commerce ${nomCase(numero)} : vous pouvez mettre fin à vos dettes envers cette faction (${d.dettes.length} dette(s), ${d.montant} au total).`,
                    choix: [{ valeur: 1, libelle: `Mettre fin à mes dettes envers ${nomCamp(d.camp)}` }, { valeur: 2, libelle: "Les garder" }],
                    renoncer: false,
                }) === 1) {
                    actions.push(...d.actions);
                    textes.push(`dettes envers ${nomCamp(d.camp)} annulées (${d.montant})`);
                }
            }
        }

        return { actions, textes };
    }

    // Applique le stade en cours : arrête ceux qui s'arrêtent, fait suivre les autres
    async function appliquer(commentaire) {

        const effets = await effetsDuBlocage();

        // Après un blocage par unités, s'il reste un jet à faire, les
        // vaisseaux qui passent restent sur la case le temps du jet
        // (de même s'il reste un Drain spatial à régler, ou un jet après lui)
        const encoreIci = stade === "unites" ? (draineurs.length > 0 || !!jet) : (stade === "drain" && !!jet);
        const acquis = stade === "unites" ? PASSE : DRAIN;

        envoyer([
            ...arretes.flatMap(liberer),
            ...activation(),
            ...[...new Set([...bilan.autres.map(campDe), ...adverses.map(a => a.camp), mover])].flatMap(camp => [cleChoix(camp), clePlus(camp), cleCivils(camp)])
                .filter(id => etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 })),
            // Blocage par des unités conclu : les unités qui ont bloqué, aidé ou égalisé sont engagées
            // pour la phase (un vaisseau arrêté pour égaliser aussi), les choix sont effacés et le
            // test est noté subi sur cette case
            ...(stade !== "unites" ? [] : [
                ...[
                    ...bilan.bloquent, ...bilan.aident,
                    ...engageesSurPlace,
                    ...(aBloquer > 0 ? arretes : []),
                ].map(c => ({ type: "marquer", c: c.id, marque: MARQUE_BLOQUEE, valeur: rangDePhase(etat) })),
                ...carte.unites(numero)
                    .filter(c => new RegExp(`^[bapn]${mover}$`).test(String(c.marques?.[MARQUE_CHOIX] || "")))
                    .map(c => ({ type: "marquer", c: c.id, marque: MARQUE_CHOIX, valeur: null })),
            ]),
            ...continuent.filter(touche).map(v => ({
                type: "marquer",
                c: v.id,
                marque: "degat",
                valeur: (Number(v.marques?.degat) || 0) + 1,
            })),
            coutDrain > 0 && { type: "compteur", id: `joueur:${mover}:res`, delta: -coutDrain },
            ...draineurs.filter(camp => stade === "drain" && choixDrain(camp))
                .map(camp => ({ type: "compteur", id: cleDrain(camp), valeur: 0 })),
            ...(encoreIci
                ? continuent.map(v => ({ type: "marquer", c: v.id, marque: acquis, valeur: "c" + numero }))
                : avancer(continuent)),
            ...effets.actions,
        ], [commentaire, ...effets.textes].join(" — ").slice(0, 300));

        if (effets.textes.length) {
            aviser(effets.textes.join(" ; ") + ".");
        }

        if (arretes.length) {
            aviser(`${arretes.length} vaisseau(x) arrêté(s) ${nomCase(numero)}.` +
                (continuent.length ? "" : " Le déplacement s'arrête là."));
        }
    }

    function lancer() {
        envoyer(
            vaisseaux.map(v => ({ type: "des", n: 1, faces: 10, c: v.id, marque: JET })),
            `Déplacement : jets de ${jet === "rift" ? "rupture gravitationnelle" : "trou de ver oméga"} (${nomCase(numero)})`
        );
    }

    // Coche d'office ce qu'il faut arrêter : les militaires d'abord, puis les transports, autant
    // qu'il en faut ; puis les vaisseaux civils, jusqu'au blocage qui leur est opposable
    function proposer() {

        const choisis = [];
        let resteMT = requisMT - controleDes(engageesSurPlace.filter(c => !estCivil(c)));
        let resteCivils = requisCivils - controleDes(engageesSurPlace.filter(estCivil));

        for (const v of [...exposes].sort((a, b) => rangEngagement(a) - rangEngagement(b))) {

            if (!estCivil(v) && resteMT > 0) {
                choisis.push(v.id);
                resteMT -= bilan.controle(v);
            } else if (estCivil(v) && resteMT <= 0 && resteCivils > 0) {
                choisis.push(v.id);
                resteCivils -= bilan.controle(v);
            }
        }

        setStoppes(choisis);
    }

    // --------------------------------------------------------
    // AFFICHAGE
    // --------------------------------------------------------

    const pastille = camp => pastilleCamp(couleurDe, camp);

    const titreStade = {
        charge: "chargement…",
        unites: "blocage par des unités",
        drain: "Drain spatial",
        lancer: jet === "rift" ? "rupture gravitationnelle : jets à lancer" : "trou de ver oméga : jets à lancer",
        jets: jet === "rift" ? "rupture gravitationnelle" : "trou de ver oméga",
        libre: "aucun blocage",
    }[stade];

    return (
        <div
            data-passage={numero}
            data-stade={stade}
            style={{
                marginTop: 6,
                padding: "6px 10px",
                border: "2px solid #a15c00",
                borderRadius: 8,
                backgroundColor: "#fff8e1",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
            }}
        >
            <div>
                {pastille(mover)}
                <b>{nomCamp(mover)}</b> — {vaisseaux.length} vaisseau{vaisseaux.length > 1 ? "x" : ""} {nomCase(numero)},
                en route vers {trajet.map(nomCase).join(" → ")}
                {arrivee !== suivante ? "" : " (arrivée)"} : <b>{titreStade}</b>
            </div>

            {/* BLOCAGE PAR DES UNITÉS : chaque camp choisit unité par unité (ChoixDesCamps, BlocageAction.jsx) */}
            {stade === "unites" && (
                <div data-blocage-unites style={{ marginTop: 4 }}>
                    <ChoixDesCamps bilan={bilan} acteur={mover} numero={numero} clePlus={clePlus} plus={plus} civils={{ cle: cleCivils, epargne }} />

                    {/* Mes unités restées sur la case : je peux les engager pour égaliser */}
                    {surPlace.length > 0 && (
                        <div data-sur-place style={{ marginTop: 2 }}>
                            {pastille(mover)}{nomCamp(mover)}, unités restées sur place — les engager égalise le blocage :{" "}
                            {surPlace.map(c => (
                                <label key={c.id} data-unite-blocage={c.id} style={{ marginRight: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={choixBlocage(c, mover) === "p"}
                                        disabled={!estMover}
                                        onChange={() => envoyer(
                                            [{ type: "marquer", c: c.id, marque: MARQUE_CHOIX, valeur: choixBlocage(c, mover) === "p" ? null : "p" + mover }],
                                            `Blocage ${nomCase(numero)} : ${nom(c)} de ${nomCamp(mover)} ${choixBlocage(c, mover) === "p" ? "n'égalise plus" : "égalise"}`
                                        )}
                                    />{" "}
                                    {nom(c)} ({bilan.controle(c)}{estMilitaire(c) ? "" : ", non militaire"})
                                </label>
                            ))}
                        </div>
                    )}

                    {(plus(mover) > 0 || rapportDeForce(mover)) && (
                        <div style={{ marginTop: 2 }}>
                            {pastille(mover)}{nomCamp(mover)}
                            {plus(mover) > 0 && <b style={{ color: "#1b5e20" }}> : + {plus(mover)} (Rapport de force)</b>}{" "}
                            {rapportDeForce(mover)}
                        </div>
                    )}

                    <div data-surplus style={{ marginTop: 4 }}>
                        Surplus de blocage : {bilan.blocage} (bloquent) − {bilan.aide} (aident) = <b>{surplus}</b>.{" "}
                        {aBloquer > 0
                            ? <b style={{ color: "#b71c1c" }}>
                                {aBloquer} de contrôle à égaliser, {egalise} engagé : {requisMT} avec les unités militaires et les transports
                                {capaciteMT < aBloquer ? " (tous)" : ""}
                                {capaciteMT < aBloquer ? `, puis ${requisCivils} avec les vaisseaux civils (blocage qui leur est opposable : ${blocageCivils})` : ""}.
                            </b>
                            : <b style={{ color: "#1b5e20" }}>Personne n'est arrêté.</b>}
                        {" "}Les unités qui bloquent, aident ou égalisent sont engagées pour la phase.
                    </div>
                </div>
            )}

{/* DRAIN SPATIAL : chaque joueur qui l'a dit s'il l'exige */}
            {stade === "drain" && (
                <div data-drain-spatial style={{ marginTop: 4 }}>
                    {draineurs.map(camp => (
                        <div key={camp} data-camp={camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                            <span>{pastille(camp)}<b>{nomCamp(camp)}</b> a le Drain spatial sur {nomCase(suivante)} :</span>
                            {joueur && camp === moi
                                ? [[1, "Exiger 1 ressource par vaisseau"], [2, "Laisser passer"]].map(([valeur, libelle]) => (
                                    <button
                                        key={valeur}
                                        type="button"
                                        data-choix={valeur}
                                        onClick={() => envoyer(
                                            [{ type: "compteur", id: cleDrain(camp), valeur }],
                                            `Drain spatial ${nomCase(suivante)} : ${nomCamp(camp)} ${valeur === 1 ? "exige 1 ressource par vaisseau" : "laisse passer"}`
                                        )}
                                        style={{ ...styleMini, fontWeight: choixDrain(camp) === valeur ? "bold" : "normal", backgroundColor: choixDrain(camp) === valeur ? "#ffb74d" : undefined }}
                                    >
                                        {libelle}
                                    </button>
                                ))
                                : <b style={{ color: choixDrain(camp) ? "#000" : "#b71c1c" }}>
                                    {choixDrain(camp) === 1 ? "exige 1 ressource par vaisseau" : (choixDrain(camp) === 2 ? "laisse passer" : "n'a pas encore choisi")}
                                </b>}
                        </div>
                    ))}
                    <div style={{ marginTop: 4 }}>
                        Chaque vaisseau qui continue coûte 1 ressource par joueur qui l'exige :{" "}
                        <b>{coutDrain} ressource(s)</b> pour {continuent.length} vaisseau(x). Sinon, cochez ceux qui restent ici.
                    </div>
                </div>
            )}

            {/* LES VAISSEAUX : résultat du jet, et qui s'arrête ici */}
            {stade !== "charge" && (
                <div data-vaisseaux-passage style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", marginTop: 4 }}>
                    {vaisseaux.map(v => (
                        <label key={v.id} data-vaisseau={v.id} style={{ color: bloqueParJet(v) ? "#b71c1c" : undefined }}>
                            {estMover && (
                                <input
                                    type="checkbox"
                                    checked={arretes.includes(v)}
                                    disabled={bloqueParJet(v)}
                                    onChange={() => setStoppes(stoppes.includes(v.id) ? stoppes.filter(x => x !== v.id) : [...stoppes, v.id])}
                                />
                            )}{" "}
                            {nom(v)} <span style={{ color: "#555" }}>({estMilitaire(v) ? "militaire" : "non militaire"}{furtif(v) ? ", furtif : les unités ne le bloquent pas" : ""})</span>
                            {stade === "jets" && (
                                <b>
                                    {" "}: {de(v)} — {bloqueParJet(v) ? "bloqué" : (touche(v) ? "passe, 1 touche" : (jet === "rift" ? "passe, +1 mouvement" : "passe"))}
                                </b>
                            )}
                        </label>
                    ))}
                </div>
            )}

            {/* CE QUE FAIT LE JOUEUR QUI SE DÉPLACE */}
            {estMover && stade !== "charge" && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <span style={{ color: "#555" }}>Cocher les vaisseaux qui s'arrêtent {nomCase(numero)}.</span>

                    {stade === "unites" && aBloquer > 0 && (
                        <button type="button" data-action="proposer-blocage" style={styleMini} onClick={proposer}>
                            Cocher les vaisseaux à arrêter
                        </button>
                    )}

                    {stade === "lancer" && (
                        <button type="button" data-action="jets-deplacement" style={{ ...styleMini, fontWeight: "bold" }} onClick={lancer}>
                            Lancer les jets ({vaisseaux.length} d10 : 3 ou moins bloque)
                        </button>
                    )}

                    {stade !== "lancer" && (
                        <BoutonRegle
                            data-action="appliquer-passage"
                            nom={`Déplacement, ${nomCase(numero)} (${titreStade}) : ${arretes.length} arrêté(s), ${continuent.length} continue(nt)`}
                            obstacles={obstacles}
                            faire={appliquer}
                            title="Arrête les vaisseaux cochés et fait avancer les autres jusqu'à la prochaine case à risque, ou l'arrivée"
                            style={{ padding: "3px 14px" }}
                        >
                            {continuent.length
                                ? `Arrêter ${arretes.length}, faire passer ${continuent.length}`
                                : `Arrêter les ${arretes.length} vaisseau${arretes.length > 1 ? "x" : ""} ici`}
                        </BoutonRegle>
                    )}

                    <button
                        type="button"
                        data-action="abandonner-passage"
                        style={styleMini}
                        title="Les vaisseaux restent où ils sont ; leur trajet est oublié"
                        onClick={() => envoyer(vaisseaux.flatMap(liberer), `Déplacement abandonné ${nomCase(numero)}`)}
                    >
                        Abandonner
                    </button>

                    {obstacles.filter(Boolean).length > 0 && (
                        <span style={{ color: "#b71c1c" }}>{obstacles.filter(Boolean).join(" ; ")}</span>
                    )}
                </div>
            )}

            {!estMover && stade !== "charge" && (
                <div style={{ marginTop: 4, color: "#555" }}>
                    {stade === "unites"
                        ? `Les camps présents choisissent ; ${nomCamp(mover)} applique ensuite le blocage.`
                        : (stade === "drain"
                            ? `Les joueurs qui ont le Drain spatial choisissent ; ${nomCamp(mover)} paie ou s'arrête.`
                            : `En attente de ${nomCamp(mover)}.`)}
                </div>
            )}
        </div>
    );
}
