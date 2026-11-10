import { useEngine, BoutonRegle, nomCase, nomElement } from "./Interaction";
import { useElement, useElements } from "./sync";
import { typeUnite } from "./miseEnPlace";
import { controleDe } from "./effets";

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
// Compteurs :
//   controle:<case>p<planète>          joueur qui veut prendre possession (0 : clos)
//   controle:<case>p<planète>:<camp>   1 s'abstient, 2 soutient, 3 s'oppose
// ============================================================

const NEUTRE = 0;

const CHOIX = [[1, "S'abstenir", "s'abstient"], [2, "Soutenir", "soutient"], [3, "S'opposer", "s'oppose"]];
const nomChoix = valeur => CHOIX.find(c => c[0] === valeur)?.[2];

const campDe = c => c.marques?.possession ?? c.proprio ?? NEUTRE;

export const cleControle = (numero, k) => `controle:${numero}p${k}`;

const styleMini = { fontSize: 12, padding: "1px 6px" };

// Conflits de contrôle en cours : [{ cle, numero, k, demandeur }]
export function controlesEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^controle:(\d+)p(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({ cle: m[0], numero: Number(m[1]), k: Number(m[2]), demandeur: Number(etat.compteurs[m[0]]) }));
}

// Actions d'une prise de possession : la carte de la planète va dans mes
// éléments actifs (elle est créée si personne ne l'avait encore).
// Scripts — Assimilation : une planète qu'aucun joueur ne possédait reçoit une
// de mes infanteries ; Pillage : prise par les armes à une autre faction, je lui
// vole 2 commerce (ce qu'elle a, au plus). -> { actions, messages }
export function actionsPossession({ etat, moi, aScript, nomDe }, zonePlanete, idPlanete, idInfanterie, militaire = true) {

    const carte = Object.values(etat.composants)
        .find(c => !c.cache && c.ref?.type === "planet" && c.ref.id === idPlanete && c.zone !== "horsJeu");

    const zone = `joueur:${moi}:actif`;

    const ancien = Number(/^joueur:(\d+):actif$/.exec(carte?.zone || "")?.[1]) || null;

    const assimilation = !!idInfanterie && aScript(moi, "assimilation") && !ancien;

    const butin = militaire && ancien && ancien !== moi && aScript(moi, "pillage")
        ? Math.min(2, Number(etat.compteurs[`joueur:${ancien}:commerce`]) || 0)
        : 0;

    // (de / si : refusé si un autre joueur vient de la prendre — pas de carte en double)
    const verrou = "planete:" + idPlanete;
    const prises = Number(etat.compteurs[verrou]) || 0;

    return {
        messages: [
            assimilation && "Assimilation : planète neutre obtenue, une infanterie y est posée.",
            butin > 0 && `Pillage : ${butin} commerce volé(s) à ${nomDe?.(ancien) ?? "son ancien possesseur"}.`,
        ].filter(Boolean),
        actions: [
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
// Les conflits de contrôle en cours
// ------------------------------------------------------------

export function Controles() {

    const { etat } = useEngine();

    const conflits = controlesEnCours(etat);
    const dominations = dominationsEnCours(etat);

    return conflits.length + dominations.length > 0 && (
        <div data-controles style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>Conflits de contrôle</b>
            {conflits.map(c => <Controle key={c.cle} conflit={c} />)}
            {dominations.map(d => <Domination key={d.cle} conflit={d} />)}
        </div>
    );
}

function Controle({ conflit }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, couleurDe, aviser, aScript, factionDe } = useEngine();

    const { cle, numero, k, demandeur } = conflit;
    const zonePlanete = `hex:${numero}:planete:${k}`;

    const tuile = (index.parZone.get("hex:" + numero) || []).find(c => c.ref?.type === "system");
    const systeme = useElement(tuile ? tuile.ref.id : -1);
    const idPlanete = Number(systeme?.elems?.[k]?.id) || -1;
    const planete = useElement(idPlanete);

    // Unités militaires de la planète, par camp : 1 de contrôle chacune
    const unites = (index.parZone.get(zonePlanete) || []).filter(c => !c.cache && c.ref?.type === "unit");
    const contenus = useElements([...new Set(unites.map(c => c.ref.id))]);

    const parCamp = new Map();

    for (const c of unites.filter(x => contenus[x.ref.id]?.mot_cle?.includes("mil"))) {
        parCamp.set(campDe(c), [...(parCamp.get(campDe(c)) || []), c]);
    }

    // (le demandeur est toujours de la partie, même sans unité militaire)
    const camps = [...new Set([demandeur, ...parCamp.keys()])]
        .map(camp => ({
            camp,
            unites: parCamp.get(camp) || [],
            // (contrôle de chaque unité : effets.js — #con, Rayon tracteur)
            controle: (parCamp.get(camp) || []).reduce((s, c) => s + controleDe(contenus[c.ref.id], camp, aScript), 0),
        }));

    const cleChoix = camp => `${cle}:${camp}`;

    const choixDe = camp => Number(etat.compteurs[cleChoix(camp)]) ||
        (camp === demandeur ? 2 : (camp === NEUTRE ? 3 : 0));

    const controle = valeur => camps.filter(c => choixDe(c.camp) === valeur).reduce((s, c) => s + c.controle, 0);
    const [pour, contre] = [controle(2), controle(3)];

    // Mon infanterie (script Assimilation)
    const faction = useElement(factionDe(moi) ?? -1);
    const liens = (faction?.units || []).filter(lien => lien?.id > 0);
    const mesUnites = useElements(liens.map(lien => lien.id));
    const idInfanterie = liens.find(lien => typeUnite(mesUnites[lien.id]) === "inf")?.id ?? null;

    const nomCamp = camp => (camp === NEUTRE ? "Neutres" : nomDe(camp));
    const nomPlanete = planete?.name || "la planète";
    const estDemandeur = !!joueur && moi === demandeur;

    // Clôt le conflit : le compteur et les choix sont remis à zéro
    const cloture = () => [cle, ...camps.map(c => cleChoix(c.camp))]
        .filter(id => etat.compteurs[id])
        .map(id => ({ type: "compteur", id, valeur: 0 }));

    function prendre(commentaire) {

        const { actions, messages } = actionsPossession({ etat, moi, aScript, nomDe }, zonePlanete, idPlanete, idInfanterie);

        envoyer([...actions, ...cloture()], [commentaire, ...messages].join(" — "));

        if (messages.length) {
            aviser(messages.join(" "));
        }
    }

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
                <b>{nomCamp(demandeur)}</b> veut prendre possession de <b>{nomPlanete}</b> ({nomCase(numero)}).
            </div>

            {camps.map(c => {

                const choix = choixDe(c.camp);

                // Chacun répond pour son camp (le demandeur soutient) ; tout joueur peut répondre pour les neutres
                const repond = !!joueur && c.camp !== demandeur && (c.camp === moi || c.camp === NEUTRE);

                return (
                    <div key={c.camp} data-camp={c.camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                        <span>
                            {pastille(c.camp)}
                            <b>{nomCamp(c.camp)}</b> : contrôle {c.controle}{" "}
                            <span style={{ color: "#555" }}>({c.unites.map(u => nomElement(search, u.ref)).join(", ") || "aucune unité militaire"})</span>
                        </span>

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
                    ? <b style={{ color: "#1b5e20" }}>La prise de possession est possible.</b>
                    : <b style={{ color: "#b71c1c" }}>Impossible : il faut plus de contrôle pour que contre.</b>}
            </div>

            {estDemandeur && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <BoutonRegle
                        data-action="prendre-possession-controle"
                        disabled={idPlanete < 0}
                        nom={`Prendre possession de ${nomPlanete} (contrôle : ${pour} pour, ${contre} contre)`}
                        obstacles={[
                            ...camps.filter(c => !choixDe(c.camp)).map(c => `${nomCamp(c.camp)} n'a pas encore choisi (compté comme une abstention)`),
                            pour <= contre && `contrôle insuffisant : ${pour} pour, ${contre} contre`,
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
                    Les camps présents choisissent ; {nomCamp(demandeur)} prend ensuite possession, ou renonce.
                </div>
            )}
        </div>
    );
}

// ============================================================
// CONFLIT DE DOMINATION (script Exploitation du vide)
//
// Test de domination d'un système : chaque camp qui y a des unités
// militaires dans l'espace les fait participer à la domination du
// camp de son choix (le sien par défaut ; les neutres, la leur). Le
// camp qui réunit, seul, le plus de contrôle domine le système.
//
// Compteurs :
//   domination:<case>           joueur qui a ouvert le conflit (0 : clos)
//   domination:<case>:<camp>    camp soutenu (−1 : s'abstient)
//   dominant:<case>             camp qui domine, une fois le conflit clos
//   dominant:<case>:tour        tour de ce résultat
//
// L'entretien d'un joueur qui a « Exploitation du vide » compte ses
// systèmes vides dominés : sans autre unité, ou dont il a gagné le
// conflit ce tour (useExploitationDuVide, PlateauJoueur.jsx).
// ============================================================

export function dominationsEnCours(etat) {
    return Object.keys(etat.compteurs)
        .map(id => /^domination:(\d+)$/.exec(id))
        .filter(m => m && etat.compteurs[m[0]])
        .map(m => ({ cle: m[0], numero: Number(m[1]), demandeur: Number(etat.compteurs[m[0]]) }));
}

// Systèmes vides (sans planète) où le joueur a des unités dans l'espace :
//   gain       ressources de l'entretien (1 par système dominé, 3 pour une nébuleuse)
//   aResoudre  cases disputées dont le conflit de domination n'est pas résolu ce tour
export function useExploitationDuVide(userId) {

    const { etat, index, aScript } = useEngine();

    const actif = aScript(userId, "exploitation-du-vide");
    const tuile = n => (index.parZone.get("hex:" + n) || []).find(c => c.ref?.type === "system");

    const cases = !actif ? [] : [...new Set(Object.values(etat.composants)
        .filter(c => c.ref?.type === "unit" && campDe(c) === userId && /^hex:\d+$/.test(c.zone || ""))
        .map(c => Number(c.zone.slice(4))))];

    const systemes = useElements(cases.map(n => tuile(n)?.ref.id).filter(Boolean));

    const systeme = n => systemes[tuile(n)?.ref.id];
    const vides = cases.filter(n => systeme(n) && !(systeme(n).elems || []).some(lien => lien?.id > 0));

    const dispute = n => (index.parZone.get("hex:" + n) || []).some(c => c.ref?.type === "unit" && campDe(c) !== userId);

    // Camp qui domine d'après un conflit clos ce tour, ou null
    const resultat = n => (Number(etat.compteurs[`dominant:${n}:tour`]) === etat.tour
        ? Number(etat.compteurs[`dominant:${n}`]) || 0
        : null);

    const domines = vides.filter(n => !dispute(n) || resultat(n) === userId);

    return {
        gain: domines.reduce((s, n) => s + (systeme(n).anomaly === "neb" ? 3 : 1), 0),
        aResoudre: vides.filter(n => dispute(n) && resultat(n) === null),
    };
}

function Domination({ conflit }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, couleurDe, aScript } = useEngine();

    const { cle, numero, demandeur } = conflit;

    const unites = (index.parZone.get("hex:" + numero) || []).filter(c => !c.cache && c.ref?.type === "unit" && !c.sur);
    const contenus = useElements([...new Set(unites.map(c => c.ref.id))]);

    const parCamp = new Map();

    for (const c of unites.filter(x => contenus[x.ref.id]?.mot_cle?.includes("mil"))) {
        parCamp.set(campDe(c), (parCamp.get(campDe(c)) || 0) + controleDe(contenus[c.ref.id], campDe(c), aScript));
    }

    const camps = [...parCamp].map(([camp, controle]) => ({ camp, controle }));
    const cleChoix = camp => `${cle}:${camp}`;

    // Camp soutenu : le sien par défaut ; −1 : s'abstient (les neutres soutiennent les neutres)
    const soutien = camp => (camp === NEUTRE ? NEUTRE : (Number(etat.compteurs[cleChoix(camp)]) || camp));

    const totaux = new Map();

    for (const c of camps) {
        if (soutien(c.camp) >= 0) {
            totaux.set(soutien(c.camp), (totaux.get(soutien(c.camp)) || 0) + c.controle);
        }
    }

    const classes = [...totaux].sort((a, b) => b[1] - a[1]);
    const gagnant = classes.length && (classes.length === 1 || classes[0][1] > classes[1][1]) ? classes[0][0] : null;

    const nomCamp = camp => (camp === NEUTRE ? "Neutres" : nomDe(camp));

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

    return (
        <div
            data-domination={cle}
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
                <b>Domination du système {nomCase(numero)}</b> — conflit ouvert par {nomCamp(demandeur)} (Exploitation du vide).
            </div>

            {camps.map(c => (
                <div key={c.camp} data-camp={c.camp} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    <span>{pastille(c.camp)}<b>{nomCamp(c.camp)}</b> : contrôle {c.controle}, soutient</span>

                    {joueur && c.camp === moi
                        ? (
                            <select
                                value={soutien(c.camp)}
                                onChange={e => envoyer(
                                    [{ type: "compteur", id: cleChoix(c.camp), valeur: Number(e.target.value) }],
                                    `Domination ${nomCase(numero)} : ${nomCamp(c.camp)} ` +
                                        (Number(e.target.value) < 0 ? "s'abstient" : `soutient ${nomCamp(Number(e.target.value))}`)
                                )}
                            >
                                {camps.filter(x => x.camp !== NEUTRE).map(x => <option key={x.camp} value={x.camp}>{nomCamp(x.camp)}</option>)}
                                <option value={-1}>personne (s'abstient)</option>
                            </select>
                        )
                        : <b>{soutien(c.camp) < 0 ? "personne (s'abstient)" : nomCamp(soutien(c.camp))}</b>}
                </div>
            ))}

            <div data-bilan-domination style={{ marginTop: 4 }}>
                {classes.map(([camp, total]) => `${nomCamp(camp)} : ${total}`).join(" ; ") || "Aucune unité militaire."}{" — "}
                {gagnant !== null
                    ? <b style={{ color: "#1b5e20" }}>{nomCamp(gagnant)} domine le système.</b>
                    : <b style={{ color: "#b71c1c" }}>Personne ne domine le système.</b>}
            </div>

            {joueur && (
                <BoutonRegle
                    data-action="clore-domination"
                    nom={`Clore le conflit de domination ${nomCase(numero)} : ${gagnant !== null ? nomCamp(gagnant) + " domine" : "personne ne domine"}`}
                    faire={commentaire => envoyer([
                        { type: "compteur", id: `dominant:${numero}`, valeur: gagnant ?? 0 },
                        // (0 : personne, ou les neutres ; le tour dit que le conflit est résolu)
                        { type: "compteur", id: `dominant:${numero}:tour`, valeur: etat.tour },
                        ...camps.filter(c => etat.compteurs[cleChoix(c.camp)]).map(c => ({ type: "compteur", id: cleChoix(c.camp), valeur: 0 })),
                        { type: "compteur", id: cle, valeur: 0 },
                    ], commentaire)}
                    title="Enregistre qui domine le système pour ce tour et clôt le conflit"
                    style={{ marginTop: 4, padding: "3px 14px" }}
                >
                    Clore le conflit
                </BoutonRegle>
            )}
        </div>
    );
}
