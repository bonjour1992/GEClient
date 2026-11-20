import { useEngine, BoutonRegle, nomCase, nomElement, nomDuCamp, pastilleCamp, styleMini, tuileDe } from "./Interaction";
import { useElement, useElements, contenuEnCache } from "./sync";
import { NEUTRE, campDe } from "./miseEnPlace";
import { unitesDuLieu, rangDePhase, ESPACE_CONTROLE } from "./regleControle";
import {
    MARQUE_BLOQUEE, MARQUE_CHOIX, ACTIONS_BLOQUABLES, cleBlocage, cleSubi, estBloquee, blocageSubi,
    blocagesActionEnCours, choixDe, peutEtreBloque, bilanBlocage,
} from "./regleBlocage";
import { RapportDeForce } from "./Controle";

// ============================================================
// TEST DE BLOCAGE D'UNE ACTION (onglet Conflit)
//
// Bombardement, raid, débarquement, canons spatiaux, production,
// réparation, livraison commerciale : l'action demande des unités non
// bloquées. Même modèle que le blocage d'un déplacement (Blocage.jsx),
// mais unité par unité — la règle et le calcul sont dans
// regleBlocage.js. Le test se fait là où est l'unité qui agit
// (l'espace de son système, ou sa planète) :
//   - chaque autre camp engage ses unités militaires du lieu pour
//     bloquer, ou des unités pour aider ;
//   - la faction qui agit égalise le surplus de blocage avec ses
//     propres unités (les militaires d'abord), qui sont alors bloquées ;
//   - à la conclusion, toutes les unités qui ont servi sont engagées
//     pour la phase ; la faction a « subi le blocage » dans ce système :
//     ses unités restées libres y agissent sans nouveau test.
//
// demanderBlocage (appelée par l'action) rend une promesse :
//   null                     l'action n'a pas lieu (test abandonné) ;
//   { engagees, attendu }    le test est fait (ou inutile) : engagees = mes unités
//                            bloquées dans ce système ; attendu = un test a dû trancher.
// ============================================================

const attentes = new Map();     // clé du test -> resolve de la promesse en attente

function conclureAttente(cle, resultat) {
    const resolve = attentes.get(cle);
    attentes.delete(cle);
    resolve?.(resultat);
    return !!resolve;
}

const unitesIci = (index, numero, k, contenuDe = contenuEnCache) => unitesDuLieu({ index, contenuDe, numero, k });

// Mes unités de ce lieu déjà bloquées à cette phase
const mesBloquees = (etat, index, numero, k, moi) =>
    unitesIci(index, numero, k).filter(c => campDe(c) === moi && estBloquee(etat, c)).map(c => c.id);

//   ctx     { etat, index, moi, envoyer, aviser, allerA } (contexte de l'engine)
//   numero, k  le lieu de l'unité qui agit : l'espace de la case (k absent), ou sa planète k
//   action  clé d'ACTIONS_BLOQUABLES ; libelle : l'action, pour le journal
export async function demanderBlocage(ctx, { numero, k = ESPACE_CONTROLE, action, libelle }) {

    const { etat, index, moi, envoyer, aviser, allerA } = ctx;

    const unites = unitesIci(index, numero, k);

    // Test déjà subi ici à cette phase, ou personne pour bloquer : les unités libres agissent
    if (blocageSubi(etat, numero, moi, k) || !peutEtreBloque({ etat, unites, contenuDe: contenuEnCache, acteur: moi })) {
        return { engagees: mesBloquees(etat, index, numero, k, moi), attendu: false };
    }

    const cle = cleBlocage(numero, moi, k);

    if (!etat.compteurs[cle]) {
        await envoyer([
            // (les choix d'un test précédent sont oubliés)
            ...unites.filter(c => new RegExp(`^[bapn]${moi}$`).test(String(c.marques?.[MARQUE_CHOIX] || "")))
                .map(c => ({ type: "marquer", c: c.id, marque: MARQUE_CHOIX, valeur: null })),
            ...Object.keys(etat.compteurs).filter(id => id.startsWith(cle + ":") && etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 })),
            { type: "compteur", id: cle, valeur: ACTIONS_BLOQUABLES[action]?.[0] || 1 },
        ], `${libelle} (${nomCase(numero)}) — test de blocage ouvert`);
    }

    aviser?.("D'autres factions peuvent vous bloquer : un test de blocage est ouvert (onglet Conflit). " +
        "Concluez-le pour savoir lesquelles de vos unités restent libres d'agir.");
    allerA?.("combat");

    return new Promise(resolve => {
        conclureAttente(cle, null);    // (une attente précédente au même endroit est abandonnée)
        attentes.set(cle, resolve);
    });
}

// ------------------------------------------------------------
// Les tests de blocage en cours (onglet Conflit)
// ------------------------------------------------------------

export function BlocagesAction() {

    const { etat } = useEngine();

    const tests = blocagesActionEnCours(etat);

    return tests.length > 0 && (
        <div data-blocages-action style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>Tests de blocage</b>
            {tests.map(t => <BlocageAction key={t.cle} test={t} />)}
        </div>
    );
}

const SENS = [["b", "Bloquer", "bloque"], ["a", "Aider", "aide"], ["n", "Rien", "ne fait rien"]];

function BlocageAction({ test }) {

    const { etat, index, envoyer, moi, joueur, search, nomDe, couleurDe, aviser, aScript } = useEngine();

    const { cle, numero, k, acteur, action } = test;

    // (test sur une planète : son nom)
    const systeme = useElement(tuileDe(index, numero)?.ref.id ?? -1);
    const planete = useElement(k === ESPACE_CONTROLE ? -1 : (Number(systeme?.elems?.[k]?.id) || -1));
    const nomLieu = k === ESPACE_CONTROLE
        ? `dans le système ${nomCase(numero)}`
        : `sur ${planete?.name || "la planète"} (${nomCase(numero)})`;

    // (contenus de toutes les unités du système : un système de défense posé sur une planète compte dans l'espace)
    const toutes = [...index.parZone]
        .filter(([zone]) => zone === "hex:" + numero || zone.startsWith(`hex:${numero}:`))
        .flatMap(([, liste]) => liste.filter(c => !c.cache && c.ref?.type === "unit"));

    const contenus = useElements([...new Set(toutes.map(c => c.ref.id))].sort((a, b) => a - b));
    const contenuDe = id => contenus[id];
    const unites = unitesIci(index, numero, k, contenuDe);

    const clePlus = camp => `${cle}:${camp}:plus`;
    const plus = camp => Number(etat.compteurs[clePlus(camp)]) || 0;

    const bilan = bilanBlocage({ etat, unites, contenuDe, aScript, acteur, plus });
    const { autres, miennes, net, egalise, impossible } = bilan;

    const nomCamp = camp => nomDuCamp(nomDe, camp);
    const nom = c => nomElement(search, c.ref);
    const pastille = camp => pastilleCamp(couleurDe, camp);
    const nomAction = ACTIONS_BLOQUABLES[action]?.[1] || "une action";
    const estActeur = !!joueur && moi === acteur;

    const campsAutres = [...new Set(autres.map(campDe))];

    // Marque le choix d'une unité pour ce test (b, a, p, n ; null : efface)
    const choisir = (c, sens, texte) => envoyer(
        [{ type: "marquer", c: c.id, marque: MARQUE_CHOIX, valeur: sens ? sens + acteur : null }],
        `Blocage ${nomCase(numero)} (${nomCamp(acteur)}) : ${nom(c)} de ${nomCamp(campDe(c))} ${texte}`
    );

    // Clôture : compteurs du test et choix des unités effacés
    const effacement = () => [
        ...unites.filter(c => new RegExp(`^[bapn]${acteur}$`).test(String(c.marques?.[MARQUE_CHOIX] || "")))
            .map(c => ({ type: "marquer", c: c.id, marque: MARQUE_CHOIX, valeur: null })),
        ...[cle, ...[acteur, ...campsAutres].map(clePlus)].filter(id => etat.compteurs[id])
            .map(id => ({ type: "compteur", id, valeur: 0 })),
    ];

    async function conclure(commentaire) {

        const rang = rangDePhase(etat);
        const engagees = bilan.engagees;
        const miennesEngagees = engagees.filter(c => campDe(c) === acteur).map(c => c.id);

        await envoyer([
            ...engagees.map(c => ({ type: "marquer", c: c.id, marque: MARQUE_BLOQUEE, valeur: rang })),
            ...effacement(),
            { type: "compteur", id: cleSubi(numero, acteur, k), valeur: rang },
        ], [
            commentaire,
            `${engagees.length} unité(s) engagée(s) pour la phase`,
            impossible && `${nomCamp(acteur)} ne peut pas égaliser : toutes ses unités sont bloquées`,
        ].filter(Boolean).join(" — ").slice(0, 300));

        conclureAttente(cle, { engagees: miennesEngagees, attendu: true });

        aviser(impossible
            ? "Blocage : vous ne pouvez pas égaliser, toutes vos unités de ce lieu sont bloquées pour cette phase."
            : `Blocage résolu : ${miennesEngagees.length} de vos unités sont bloquées ; les autres peuvent agir ici, sans nouveau test à cette phase.`);
    }

    // Une unité, avec ses boutons si je réponds pour elle
    function ligneUnite(c) {

        const choix = choixDe(c, acteur);
        const repond = !!joueur && (campDe(c) === moi || campDe(c) === NEUTRE);
        const peutBloquer = bilan.militaire(c);

        return (
            <span key={c.id} data-unite-blocage={c.id} data-choix={choix || ""} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginRight: 8 }}>
                {nom(c)} ({bilan.controle(c)})
                {repond
                    ? SENS.filter(([sens]) => sens !== "b" || peutBloquer).map(([sens, libelle, texte]) => (
                        <button
                            key={sens}
                            type="button"
                            data-sens={sens}
                            onClick={() => choisir(c, sens === "n" && campDe(c) !== NEUTRE ? null : sens, texte)}
                            style={{
                                ...styleMini,
                                fontWeight: (choix || "n") === sens ? "bold" : "normal",
                                backgroundColor: (choix || "n") === sens ? "#ffcc80" : undefined,
                            }}
                        >
                            {libelle}
                        </button>
                    ))
                    : <b>{SENS.find(s => s[0] === (choix || "n"))?.[2]}</b>}
            </span>
        );
    }

    return (
        <div
            data-blocage-action={cle}
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
                {pastille(acteur)}
                <b>{nomCamp(acteur)}</b> veut faire <b>{nomAction}</b> {nomLieu} : <b>test de blocage</b>.
                {" "}Les autres camps engagent leurs unités militaires pour bloquer, ou des unités pour aider ; {nomCamp(acteur)}{" "}
                égalise le surplus avec ses propres unités, qui sont alors bloquées. Toute unité qui sert est engagée pour la phase.
            </div>

            {campsAutres.map(camp => (
                <div key={camp} data-camp={camp} style={{ marginTop: 3 }}>
                    {pastille(camp)}<b>{nomCamp(camp)}</b> :{" "}
                    {autres.filter(c => campDe(c) === camp).map(ligneUnite)}
                    {camp === moi && <RapportDeForce clePlus={clePlus(camp)} numero={numero} />}
                    {plus(camp) > 0 && <i> Rapport de force : +{plus(camp)}</i>}
                </div>
            ))}

            {campsAutres.length === 0 && <div style={{ marginTop: 3 }}><i>Aucune autre unité libre ici.</i></div>}

            <div data-camp={acteur} style={{ marginTop: 3 }}>
                {pastille(acteur)}<b>{nomCamp(acteur)}</b> égalise avec :{" "}
                {miennes.length === 0 && <i>aucune unité libre</i>}
                {miennes.map(c => (
                    <label key={c.id} data-unite-blocage={c.id} style={{ marginRight: 8 }}>
                        <input
                            type="checkbox"
                            checked={choixDe(c, acteur) === "p"}
                            disabled={!estActeur}
                            onChange={() => choisir(c, choixDe(c, acteur) === "p" ? null : "p",
                                choixDe(c, acteur) === "p" ? "n'égalise plus" : "égalise")}
                        />{" "}
                        {nom(c)} ({bilan.controle(c)}{bilan.militaire(c) ? "" : ", non militaire"})
                    </label>
                ))}
                {acteur === moi && <RapportDeForce clePlus={clePlus(acteur)} numero={numero} />}
                {plus(acteur) > 0 && <i> Rapport de force : +{plus(acteur)}</i>}
            </div>

            <div data-bilan-blocage style={{ marginTop: 4 }}>
                Blocage {bilan.blocage} − aide {bilan.aide} = <b>{net}</b> à égaliser ; {nomCamp(acteur)} engage {egalise}.{" "}
                {impossible
                    ? <b style={{ color: "#b71c1c" }}>Il ne peut pas égaliser ({bilan.disponible} disponible) : toutes ses unités seront bloquées.</b>
                    : (egalise >= net
                        ? <b style={{ color: "#1b5e20" }}>Égalisé : ses unités non engagées pourront agir.</b>
                        : <b style={{ color: "#b71c1c" }}>Il manque {net - egalise} de contrôle à engager.</b>)}
            </div>

            {estActeur && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <BoutonRegle
                        data-action="conclure-blocage"
                        nom={`Conclure le test de blocage ${nomCase(numero)} (${nomAction}) : blocage ${bilan.blocage}, aide ${bilan.aide}`}
                        obstacles={[
                            !impossible && egalise < net && `il manque ${net - egalise} de contrôle à engager pour égaliser le blocage`,
                            bilan.ordre && "vos unités militaires s'engagent avant vos unités non militaires",
                        ]}
                        faire={conclure}
                        title="Les unités qui ont bloqué, aidé ou égalisé sont engagées pour la phase ; vos unités restées libres peuvent agir dans ce système"
                        style={{ padding: "3px 14px" }}
                    >
                        Conclure le blocage
                    </BoutonRegle>

                    <button
                        type="button"
                        data-action="renoncer-blocage"
                        title="Le test est abandonné : l'action n'a pas lieu, aucune unité n'est engagée"
                        style={styleMini}
                        onClick={() => {
                            envoyer(effacement(), `Test de blocage ${nomCase(numero)} abandonné : ${nomCamp(acteur)} renonce à ${nomAction}`);
                            conclureAttente(cle, null);
                        }}
                    >
                        Renoncer
                    </button>
                </div>
            )}

            {!estActeur && (
                <div style={{ marginTop: 4, color: "#555" }}>
                    Chaque camp choisit pour ses unités ; {nomCamp(acteur)} égalise puis conclut, ou renonce.
                </div>
            )}
        </div>
    );
}
