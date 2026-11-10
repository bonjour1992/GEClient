import { useState } from "react";
import { useEngine, BoutonRegle, nomCase, distanceCases, nomElement, agentDisponible } from "./Interaction";
import { useElements } from "./sync";
import { MARQUEUR } from "./miseEnPlace";

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
//   unités   des unités militaires spatiales d'un autre camp sont
//            dans l'espace de la case. Chaque camp qui en a choisit :
//            s'abstenir, aider à passer ou bloquer. Son contrôle
//            vaut 1 par unité militaire spatiale. Surplus de blocage
//            = contrôle de ceux qui bloquent − contrôle de ceux qui
//            aident : autant de vaisseaux sont arrêtés, les
//            militaires d'abord, puis les autres ;
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

const NEUTRE = 0;

const CHOIX = [[1, "S'abstenir", "s'abstient"], [2, "Aider à passer", "aide à passer"], [3, "Bloquer", "bloque"]];
const nomChoix = valeur => CHOIX.find(c => c[0] === valeur)?.[2];

// Camp d'une unité : son possesseur, sinon son propriétaire ; 0 pour une unité neutre
export const campDe = c => c.marques?.possession ?? c.proprio ?? NEUTRE;

// Catégorie d'un trou de ver, d'après son image (/ti/icon/wormhole/alpha.png)
const typeTrou = image => /wormhole\/(\w+)\./.exec(image || "")?.[1] || null;

const styleMini = { fontSize: 12, padding: "1px 6px" };

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

export function useCarte(cases) {

    const { index } = useEngine();

    const uniques = [...new Set(cases)];
    const ids = liste => [...new Set(liste.filter(id => Number.isInteger(id) && id > 0))];

    const dans = i => index.parZone.get("hex:" + i) || [];
    const tuile = i => dans(i).find(c => c.ref?.type === "system");
    const tokens = i => dans(i).filter(c => !c.cache && c.ref?.type === "token");

    // Unités de l'espace de la case (celles qu'un vaisseau porte ne comptent pas)
    const unites = i => dans(i).filter(c => !c.cache && c.ref?.type === "unit" && !c.sur);

    const idsSystemes = ids(uniques.map(i => tuile(i)?.ref.id));
    const systemes = useElements(idsSystemes);

    const idsPlanetes = ids(uniques.flatMap(i => (systemes[tuile(i)?.ref.id]?.elems || []).map(lien => Number(lien?.id))));
    const planetes = useElements(idsPlanetes);

    const idsTokens = ids(uniques.flatMap(i => tokens(i).map(c => c.ref.id)));
    const contenusTokens = useElements(idsTokens);

    const idsUnites = ids(uniques.flatMap(i => unites(i).map(c => c.ref.id)));
    const contenus = useElements(idsUnites);

    const charge = (liste, table) => liste.every(id => id in table);

    return {
        // Tout est chargé : les risques peuvent être évalués
        pret: charge(idsSystemes, systemes) && charge(idsPlanetes, planetes) &&
            charge(idsTokens, contenusTokens) && charge(idsUnites, contenus),
        contenus,
        anomalie: i => systemes[tuile(i)?.ref.id]?.anomaly || "",
        trous: i => new Set([
            ...(systemes[tuile(i)?.ref.id]?.elems || []).map(lien => typeTrou(planetes[lien?.id]?.img)),
            ...tokens(i).map(c => typeTrou(contenusTokens[c.ref.id]?.img)),
        ].filter(Boolean)),
        // Unités militaires spatiales de la case
        militaires: i => unites(i).filter(c => contenus[c.ref.id]?.mot_cle?.includes("mil")),
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

// Camps qui ont des unités militaires spatiales sur la case, hors celui qui se déplace
//   [{ camp, unites, controle }] — contrôle : 1 par unité, pour l'instant
export function campsAdverses(carte, numero, mover) {

    const parCamp = new Map();

    for (const c of carte.militaires(numero)) {

        const camp = campDe(c);

        if (camp !== mover) {
            parCamp.set(camp, [...(parCamp.get(camp) || []), c]);
        }
    }

    return [...parCamp].map(([camp, unites]) => ({ camp, unites, controle: unites.length }));
}

// Jusqu'où va un groupe sans risque de blocage : rang, dans `trajet`, de la
// première case à risque — ou de la dernière (l'arrivée) ; -1 s'il y a un
// risque là où il est (ignoré si `resolu` : ce risque vient d'être traité)
export function rangArret(carte, mover, ici, trajet, resolu) {

    const risque = (de, a) => campsAdverses(carte, de, mover).length > 0 || !!sorteJet(carte, de, a);

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

    const carte = useCarte([numero, ...trajet]);

    // Vaisseaux que le joueur arrête ici (cases cochées)
    const [stoppes, setStoppes] = useState([]);

    const estMover = !!joueur && moi === mover;
    const suivante = trajet[0];
    const arrivee = trajet[trajet.length - 1];

    const nom = c => nomElement(search, c.ref);
    const nomCamp = camp => (camp === NEUTRE ? "Neutres" : nomDe(camp));
    const estMilitaire = v => !!carte.contenus[v.ref.id]?.mot_cle?.includes("mil");

    // --------------------------------------------------------
    // OÙ EN EST-ON SUR CETTE CASE
    // --------------------------------------------------------

    const adverses = campsAdverses(carte, numero, mover);
    const jet = sorteJet(carte, numero, suivante);

    const stade = !carte.pret ? "charge"
        : (adverses.length > 0 && vaisseaux.some(v => v.marques?.[PASSE] !== "c" + numero) ? "unites"
            : (jet ? (vaisseaux.every(v => v.marques?.[JET]) ? "jets" : "lancer") : "libre"));

    // --------------------------------------------------------
    // BLOCAGE PAR DES UNITÉS
    //
    // Choix de chaque camp : compteur blocage:<case>:<joueur qui se
    // déplace>:<camp> (1 s'abstient, 2 aide, 3 bloque). Les neutres
    // bloquent, sauf si un joueur en décide autrement.
    // --------------------------------------------------------

    const cleChoix = camp => `blocage:${numero}:${mover}:${camp}`;
    const choixDe = camp => Number(etat.compteurs[cleChoix(camp)]) || (camp === NEUTRE ? 3 : 0);

    // Mes propres unités militaires restées sur la case aident d'office
    const allies = carte.militaires(numero).filter(c => campDe(c) === mover && !c.marques?.[TRAJET]).length;

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

    const controle = valeur => adverses.filter(a => choixDe(a.camp) === valeur)
        .reduce((s, a) => s + a.controle + plus(a.camp), 0);

    const surplus = controle(3) - controle(2) - allies - plus(mover);
    const aBloquer = stade === "unites" ? Math.max(0, Math.min(surplus, vaisseaux.length)) : 0;

    const militaires = vaisseaux.filter(estMilitaire);
    const milRequis = Math.min(aBloquer, militaires.length);
    const autresRequis = aBloquer - milRequis;

    // --------------------------------------------------------
    // JETS (rupture gravitationnelle, trou de ver oméga)
    // --------------------------------------------------------

    const de = v => Number(v.marques?.[JET]) || 0;
    const bloqueParJet = v => stade === "jets" && de(v) <= 3;
    const touche = v => stade === "jets" && jet === "omega" && de(v) >= 9;

    // --------------------------------------------------------
    // QUI S'ARRÊTE, QUI CONTINUE
    // --------------------------------------------------------

    const arretes = vaisseaux.filter(v => stoppes.includes(v.id) || bloqueParJet(v));
    const continuent = vaisseaux.filter(v => !arretes.includes(v));

    const obstacles = stade === "unites" ? [
        ...adverses.filter(a => !choixDe(a.camp)).map(a => `${nomCamp(a.camp)} n'a pas encore choisi (compté comme une abstention)`),
        arretes.filter(estMilitaire).length < milRequis &&
            `le surplus de blocage est de ${aBloquer} : il faut arrêter ${milRequis} vaisseau(x) militaire(s) d'abord`,
        arretes.filter(v => !estMilitaire(v)).length < autresRequis &&
            `il faut arrêter encore ${autresRequis} vaisseau(x) non militaire(s)`,
    ] : [];

    // Retire les marques de déplacement d'un vaisseau
    const liberer = v => [TRAJET, DEPART, PASSE, JET]
        .filter(marque => v.marques?.[marque] !== undefined)
        .map(marque => ({ type: "marquer", c: v.id, marque, valeur: null }));

    // Fait avancer des vaisseaux jusqu'à la prochaine case à risque, ou l'arrivée
    function avancer(navires) {

        const k = rangArret(carte, mover, numero, trajet, true);
        const reste = trajet.slice(k + 1);

        return navires.flatMap(v => [
            { type: "deplacer", c: v.id, vers: "hex:" + trajet[k], de: "hex:" + numero },
            ...(reste.length
                ? [{ type: "marquer", c: v.id, marque: TRAJET, valeur: reste.join(">") }]
                : liberer(v).filter(a => a.marque === TRAJET || a.marque === DEPART)),
            ...liberer(v).filter(a => a.marque === PASSE || a.marque === JET),
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

    // Applique le stade en cours : arrête ceux qui s'arrêtent, fait suivre les autres
    function appliquer(commentaire) {

        // Après un blocage par unités, s'il reste un jet à faire, les
        // vaisseaux qui passent restent sur la case le temps du jet
        const resteUnJet = stade === "unites" && !!jet;

        envoyer([
            ...arretes.flatMap(liberer),
            ...activation(),
            ...[...adverses.map(a => a.camp), mover].flatMap(camp => [cleChoix(camp), clePlus(camp)])
                .filter(id => etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 })),
            ...continuent.filter(touche).map(v => ({
                type: "marquer",
                c: v.id,
                marque: "degat",
                valeur: (Number(v.marques?.degat) || 0) + 1,
            })),
            ...(resteUnJet
                ? continuent.map(v => ({ type: "marquer", c: v.id, marque: PASSE, valeur: "c" + numero }))
                : avancer(continuent)),
        ], commentaire);

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

    function choisir(camp, valeur) {
        envoyer(
            [{ type: "compteur", id: cleChoix(camp), valeur }],
            `Blocage ${nomCase(numero)} : ${nomCamp(camp)} ${nomChoix(valeur)}`
        );
    }

    // Coche d'office ce qu'il faut arrêter : les militaires d'abord
    const proposer = () => setStoppes([
        ...militaires.slice(0, milRequis),
        ...vaisseaux.filter(v => !estMilitaire(v)).slice(0, autresRequis),
    ].map(v => v.id));

    // --------------------------------------------------------
    // AFFICHAGE
    // --------------------------------------------------------

    const pastille = camp => (
        <span
            style={{
                display: "inline-block",
                width: 10,
                height: 10,
                marginRight: 4,
                borderRadius: "50%",
                border: "1px solid #000",
                backgroundColor: camp === NEUTRE ? "#9e9e9e" : couleurDe(camp) || "#888",
            }}
        />
    );

    const titreStade = {
        charge: "chargement…",
        unites: "blocage par des unités",
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

            {/* BLOCAGE PAR DES UNITÉS : le choix de chaque camp */}
            {stade === "unites" && (
                <div data-blocage-unites style={{ marginTop: 4 }}>
                    {adverses.map(a => {

                        const choix = choixDe(a.camp);

                        // Chacun répond pour son camp ; tout joueur peut répondre pour les neutres
                        const repond = !!joueur && (a.camp === moi || a.camp === NEUTRE);

                        return (
                            <div key={a.camp} data-camp={a.camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                                <span>
                                    {pastille(a.camp)}
                                    <b>{nomCamp(a.camp)}</b> : contrôle {a.controle}
                                    {plus(a.camp) > 0 && <b style={{ color: "#1b5e20" }}> + {plus(a.camp)} (Rapport de force)</b>}{" "}
                                    <span style={{ color: "#555" }}>({a.unites.map(nom).join(", ")})</span>
                                </span>

                                {repond
                                    ? CHOIX.map(([valeur, libelle]) => (
                                        <button
                                            key={valeur}
                                            type="button"
                                            data-choix={valeur}
                                            onClick={() => choisir(a.camp, valeur)}
                                            style={{
                                                ...styleMini,
                                                fontWeight: choix === valeur ? "bold" : "normal",
                                                backgroundColor: choix === valeur ? "#ffb74d" : undefined,
                                            }}
                                        >
                                            {libelle}
                                        </button>
                                    ))
                                    : <b style={{ color: choix ? "#000" : "#b71c1c" }}>{nomChoix(choix) || "n'a pas encore choisi"}</b>}

                                {rapportDeForce(a.camp)}
                            </div>
                        );
                    })}

                    {allies > 0 && (
                        <div style={{ marginTop: 2 }}>
                            {pastille(mover)}{nomCamp(mover)} : {allies} unité(s) militaire(s) déjà sur place, qui aident à passer.
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
                        Surplus de blocage : {controle(3)} (bloquent) − {controle(2) + allies + plus(mover)} (aident) = <b>{surplus}</b>.{" "}
                        {aBloquer > 0
                            ? <b style={{ color: "#b71c1c" }}>
                                {aBloquer} vaisseau{aBloquer > 1 ? "x" : ""} à arrêter : {milRequis} militaire{milRequis > 1 ? "s" : ""}
                                {autresRequis > 0 ? `, puis ${autresRequis} non militaire${autresRequis > 1 ? "s" : ""}` : ""}.
                            </b>
                            : <b style={{ color: "#1b5e20" }}>Personne n'est arrêté.</b>}
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
                            {nom(v)} <span style={{ color: "#555" }}>({estMilitaire(v) ? "militaire" : "non militaire"})</span>
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
                            Cocher les {aBloquer} à arrêter
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
                        : `En attente de ${nomCamp(mover)}.`}
                </div>
            )}
        </div>
    );
}
