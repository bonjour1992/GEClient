import { useState } from "react";
import { useEngine, BoutonRegle, agentDisponible, nomElement, nomCase } from "./Interaction";
import { useElement, useElements } from "./sync";
import { MARQUEUR, actionsPiste, typeUnite } from "./miseEnPlace";
import { faceD10 } from "./effets";

// ============================================================
// ONGLET « DÉCISION »
//
// Les choix qu'un joueur doit faire avant qu'une action ne parte :
// au lieu d'une fenêtre surgissante, l'action crée une décision,
// l'onglet s'ouvre, et l'action est validée une fois la décision
// prise (ou abandonnée).
//
// Deux sortes :
//
//   ponctuelle  `decider({ titre, texte, choix, nombre })` (contexte de l'engine,
//               Partie.jsx) rend une promesse : la valeur choisie, ou null si le
//               joueur renonce. Elle ne vit que dans ce navigateur.
//                 choix   [{ valeur, libelle }] : un bouton par choix
//                 nombre  { min, max, defaut }  : un montant à saisir
//               Les boutons de script à `demande` (ActionsScript.jsx), So Ata
//               (Combat.jsx) et Propagande (PlateauGeneral.jsx) passent par là.
//
//   durable     lue dans l'état de la partie : elle reste tant qu'elle n'est pas
//               réglée, d'un navigateur à l'autre. Recomposition (Arborec) : le jet,
//               puis les vaisseaux produits jusqu'au nombre de réussites.
//
// decisionsDurables(ctx) compte les durables (pastille de l'onglet).
// ============================================================

// Texte d'une question dont les choix sont écrits « 1 = Amiral » ligne à ligne
// -> { texte, choix } (choix vide : c'est un montant à saisir)
export function lireQuestion(question) {

    const lignes = String(question || "").split("\n");
    const choix = [];
    const texte = [];

    for (const ligne of lignes) {
        const m = /^\s*(\d+)\s*[=:]\s*(.+)$/.exec(ligne);

        if (m) {
            choix.push({ valeur: Number(m[1]), libelle: m[2].trim() });
        } else if (ligne.trim()) {
            texte.push(ligne.trim());
        }
    }

    return { texte: texte.join(" "), choix };
}

const styleCarte = {
    border: "2px solid #ef6c00",
    borderRadius: 8,
    backgroundColor: "#fff3e0",
    color: "#000",
    padding: "8px 12px",
    fontFamily: "Arial, sans-serif",
    fontSize: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

const styleChoix = { padding: "5px 12px", fontWeight: "bold", textAlign: "left" };

// ------------------------------------------------------------
// Décision ponctuelle
// ------------------------------------------------------------

function Ponctuelle({ decision }) {

    const { repondre } = useEngine();

    const nombre = decision.nombre;
    const [valeur, setValeur] = useState(String(nombre?.defaut ?? nombre?.min ?? 1));

    const n = Math.floor(Number(valeur));
    const valide = !!nombre && Number.isFinite(n) && n >= (nombre.min ?? 1) && (nombre.max === undefined || n <= nombre.max);

    return (
        <div data-decision={decision.id} style={styleCarte}>
            <b>{decision.titre}</b>
            {decision.texte && <div style={{ whiteSpace: "pre-wrap" }}>{decision.texte}</div>}

            {(decision.choix || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                    {decision.choix.map(c => (
                        <button
                            key={c.valeur}
                            type="button"
                            data-choix={c.valeur}
                            style={styleChoix}
                            onClick={() => repondre(decision.id, c.valeur)}
                        >
                            {c.libelle}
                        </button>
                    ))}
                </div>
            )}

            {!(decision.choix || []).length && nombre && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <input
                        type="number"
                        data-montant
                        value={valeur}
                        min={nombre.min ?? 1}
                        max={nombre.max}
                        onChange={e => setValeur(e.target.value)}
                        style={{ width: 80 }}
                    />
                    {nombre.max !== undefined && <span>(de {nombre.min ?? 1} à {nombre.max})</span>}
                    <button
                        type="button"
                        data-action="decision-valider"
                        disabled={!valide}
                        style={{ ...styleChoix, backgroundColor: valide ? "#c8e6c9" : undefined }}
                        onClick={() => repondre(decision.id, n)}
                    >
                        Valider
                    </button>
                </div>
            )}

            <div>
                <button type="button" data-action="decision-renoncer" onClick={() => repondre(decision.id, null)}>
                    Renoncer (l'action n'est pas faite)
                </button>
            </div>
        </div>
    );
}

// ------------------------------------------------------------
// Décision durable : Recomposition (technologie d'Arborec)
//
// À la fin des canons spatiaux et du combat spatial : autant de dés
// sur 3 que le coût cumulé de mes unités biologiques détruites à
// cette phase ; puis un généticien (ou un logisticien) usé par
// vaisseau produit, tant que le coût cumulé tient dans les réussites.
//
// Compteurs joueur:<u>:
//   recompCout / recompPhase   coût cumulé des pertes de la phase (Combat.jsx)
//   recomposition              réussites restantes
//   recompositionJet           réussites du jet
// ------------------------------------------------------------

const rangDePhase = etat => etat.tour * 100 + Number(/^(\d+)/.exec(etat.phase || "")?.[1] ?? 0);

function etatRecomposition({ etat, moi, aScript }) {

    if (!aScript(moi, "recomposition")) {
        return null;
    }

    const base = `joueur:${moi}:`;
    const credit = Number(etat.compteurs[base + "recomposition"]) || 0;
    const pertes = Number(etat.compteurs[base + "recompPhase"]) === rangDePhase(etat) ? Number(etat.compteurs[base + "recompCout"]) || 0 : 0;
    const enPhase = /canon|combat spatial/i.test(etat.phase || "");

    return credit > 0 || (enPhase && pertes > 0)
        ? { credit, pertes, jet: Number(etat.compteurs[base + "recompositionJet"]) || 0 }
        : null;
}

// Nombre de décisions durables qui m'attendent
export function decisionsDurables(ctx) {

    if (!ctx.joueur) {
        return 0;
    }

    return (etatRecomposition(ctx) ? 1 : 0) +
        (ctx.etat.compteurs[`embuscade:${ctx.moi}`] ? 1 : 0) +
        (ctx.etat.compteurs[`pupille:${ctx.moi}`] ? 1 : 0);
}

// ------------------------------------------------------------
// Décisions durables d'une promesse : elles reviennent à la faction
// qui l'a faite, quand celle qui la détient s'en sert (scripts.js).
//
//   Embuscade (Volée argentée)   embuscade:<moi> = le détenteur, embuscade:<moi>:case = case + 1
//       poser un de mes destroyers (un logisticien usé, 2 ressources) — il est au détenteur
//       pour ce combat spatial (marques possession, embuscade) — ou gagner 1 infamie
//   Pupille de l'empire (Winnu)  pupille:<moi> = le détenteur, pupille:<moi>:par = le conquérant
//       user un politique (le conquérant gagne 1 infamie) ou gagner 1 infamie
// ------------------------------------------------------------

// Carte de cette promesse chez ce joueur, avec mon marqueur dessus ; actions qui la rendent à la réserve
function cartePromesse(etat, detenteur, id, moi) {
    return Object.values(etat.composants).find(c => !c.cache && c.ref?.type === "Promesse" && c.ref.id === id &&
        new RegExp(`^joueur:${detenteur}:(actif|tour:\\d+)$`).test(c.zone || "") &&
        Object.values(etat.composants).some(m => m.sur === c.id && !m.ref && m.jeton === MARQUEUR && m.proprio === moi)) || null;
}

const rendre = (etat, carte) => (!carte ? [] : [
    ...Object.values(etat.composants).filter(m => m.sur === carte.id).map(m => ({ type: "supprimer", c: m.id })),
    { type: "deplacer", c: carte.id, vers: "general:promesses" },
]);

function Embuscade() {

    const { etat, index, envoyer, moi, search, nomDe, factionDe } = useEngine();

    const detenteur = Number(etat.compteurs[`embuscade:${moi}`]) || 0;
    const numero = (Number(etat.compteurs[`embuscade:${moi}:case`]) || 0) - 1;

    // Mon destroyer : l'unité de type « dest » de ma faction
    const faction = useElement(factionDe(moi) ?? -1);
    const liens = (faction?.units || []).filter(lien => lien?.id > 0).map(lien => lien.id);
    const unites = useElements(liens);
    const idDestroyer = liens.find(id => typeUnite(unites[id]) === "dest") ?? null;

    if (!detenteur) {
        return null;
    }

    const logisticien = agentDisponible({ index, moi, search }, "logisticien|g[ée]n[ée]ticien");
    const ressources = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;
    const carte = cartePromesse(etat, detenteur, 262, moi);

    const cloture = [
        ...rendre(etat, carte),
        { type: "compteur", id: `embuscade:${moi}`, valeur: 0 },
        { type: "compteur", id: `embuscade:${moi}:case`, valeur: 0 },
    ];

    return (
        <div data-decision="embuscade" style={styleCarte}>
            <b>Embuscade</b>
            <div>
                <b>{nomDe(detenteur)}</b> dépense votre promesse Embuscade dans le système <b>{nomCase(numero)}</b> : posez-y un de vos
                destroyers (un logisticien usé, 2 ressources) — il sera à lui pour ce combat spatial, avec la frappe en premier et +2,
                puis vous sera rendu — ou gagnez 1 point d'infamie.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <BoutonRegle
                    data-action="embuscade-poser"
                    nom="Embuscade : poser un destroyer"
                    obstacles={[
                        !idDestroyer && "le destroyer de votre faction est introuvable",
                        !logisticien && "vous n'avez pas de logisticien disponible (aucun ne sera usé)",
                        ressources < 2 && `ressources insuffisantes : 2 à payer, vous avez ${ressources}`,
                    ]}
                    faire={commentaire => envoyer([
                        logisticien && { type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` },
                        { type: "compteur", id: `joueur:${moi}:res`, delta: -2 },
                        idDestroyer && {
                            type: "creer",
                            ref: { type: "unit", id: idDestroyer },
                            zone: "hex:" + numero,
                            proprio: moi,
                            marques: { possession: detenteur, embuscade: etat.tour },
                        },
                        ...cloture,
                    ].filter(Boolean), commentaire || `Embuscade : un destroyer posé pour ${nomDe(detenteur)} (${nomCase(numero)})`)}
                    style={styleChoix}
                >
                    Poser un destroyer (use un logisticien, 2 ressources)
                </BoutonRegle>
                <button
                    type="button"
                    data-action="embuscade-refuser"
                    style={styleChoix}
                    onClick={() => envoyer([...actionsPiste(etat, moi, "infamie", 1), ...cloture], "Embuscade : refusée, +1 infamie")}
                >
                    Refuser : +1 infamie
                </button>
            </div>
        </div>
    );
}

function Pupille() {

    const { etat, index, envoyer, moi, search, nomDe } = useEngine();

    const detenteur = Number(etat.compteurs[`pupille:${moi}`]) || 0;
    const conquerant = Number(etat.compteurs[`pupille:${moi}:par`]) || 0;

    if (!detenteur) {
        return null;
    }

    const politique = agentDisponible({ index, moi, search }, "politique");

    const cloture = [
        { type: "compteur", id: `pupille:${moi}`, valeur: 0 },
        { type: "compteur", id: `pupille:${moi}:par`, valeur: 0 },
    ];

    return (
        <div data-decision="pupille" style={styleCarte}>
            <b>Pupille de l'empire</b>
            <div>
                <b>{nomDe(detenteur)}</b>, qui a votre mandat Pupille de l'empire, s'est fait conquérir une planète par <b>{nomDe(conquerant)}</b> :
                usez un politique pour que {nomDe(conquerant)} gagne 1 point d'infamie, sinon c'est vous qui le gagnez.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <BoutonRegle
                    data-action="pupille-politique"
                    nom="Pupille de l'empire : user un politique"
                    obstacles={[!politique && "vous n'avez pas de politique disponible (aucun ne sera usé)"]}
                    faire={commentaire => envoyer([
                        politique && { type: "deplacer", c: politique.id, vers: `joueur:${moi}:agentsUses` },
                        ...actionsPiste(etat, conquerant, "infamie", 1),
                        ...cloture,
                    ].filter(Boolean), commentaire || `Pupille de l'empire : ${nomDe(conquerant)} gagne 1 infamie`)}
                    style={styleChoix}
                >
                    User un politique : {nomDe(conquerant)} gagne 1 infamie
                </BoutonRegle>
                <button
                    type="button"
                    data-action="pupille-infamie"
                    style={styleChoix}
                    onClick={() => envoyer([...actionsPiste(etat, moi, "infamie", 1), ...cloture], "Pupille de l'empire : +1 infamie pour le Winnu")}
                >
                    Ne rien faire : +1 infamie pour vous
                </button>
            </div>
        </div>
    );
}

function Recomposition() {

    const ctx = useEngine();
    const { etat, index, envoyer, moi, search, factionDe, aviser } = ctx;

    const recomposition = etatRecomposition(ctx);
    const base = `joueur:${moi}:`;

    const [cout, setCout] = useState("");
    const [idVaisseau, setIdVaisseau] = useState("");
    const [caseChoisie, setCaseChoisie] = useState("");

    // Vaisseaux de ma faction
    const faction = useElement(factionDe(moi) ?? -1);
    const liens = (faction?.units || []).filter(lien => lien?.id > 0).map(lien => lien.id);
    const unites = useElements(liens);

    if (!recomposition) {
        return null;
    }

    const { credit, pertes, jet } = recomposition;

    const vaisseaux = liens
        .filter(id => (unites[id]?.mot_cle || []).includes("ship"))
        .map(id => ({ id, nom: unites[id].name, cout: Number(unites[id].cout) || 0 }))
        .filter(v => v.cout <= credit);

    // Cases où j'ai des unités
    const mesCases = [...new Set(Object.values(etat.composants)
        .filter(c => !c.cache && c.ref?.type === "unit" && (c.marques?.possession ?? c.proprio) === moi && /^hex:\d+/.test(c.zone || ""))
        .map(c => Number(/^hex:(\d+)/.exec(c.zone)[1])))].sort((a, b) => a - b);

    const nomDuSysteme = n => {
        const tuile = (index.parZone.get("hex:" + n) || []).find(c => c.ref?.type === "system");
        return `${nomCase(n)}${tuile ? " — " + nomElement(search, tuile.ref) : ""}`;
    };

    const voulu = Math.floor(Number(cout === "" ? pertes : cout));
    const geneticien = agentDisponible({ index, moi, search }, "g[ée]n[ée]ticien|logisticien");
    const choisi = vaisseaux.find(v => String(v.id) === String(idVaisseau)) || null;
    const ou = caseChoisie === "" ? null : Number(caseChoisie);

    // Le jet : les dés sont lancés par le serveur, leur résultat lu dans la réponse
    async function lancer(commentaire) {

        const lots = Array.from({ length: Math.ceil(voulu / 30) }, (_, i) => ({ type: "des", n: Math.min(30, voulu - 30 * i), faces: 10 }));
        const r = await envoyer(lots, commentaire || `Recomposition : ${voulu} dé(s)`);

        // (D10 numérotés de 0 à 9 : faceD10, effets.js)
        const des = [...(r?.coups || [])]
            .sort((a, b) => b.n - a.n)
            .find(x => x.auteur === moi)?.actions.filter(a => a.type === "des").flatMap(a => a.resultats || []).map(faceD10);

        if (!Array.isArray(des) || des.length !== voulu) {
            aviser("Recomposition : les dés n'ont pas pu être lus, relancez.");
            return;
        }

        const reussites = des.filter(d => d <= 3).length;

        envoyer([
            { type: "compteur", id: base + "recomposition", valeur: reussites },
            { type: "compteur", id: base + "recompositionJet", valeur: reussites },
            { type: "compteur", id: base + "recompCout", valeur: 0 },
        ], `Recomposition : ${des.join(", ")} — ${reussites} réussite(s) sur 3 ou moins`.slice(0, 300));

        aviser(`Recomposition : ${des.join(", ")} — ${reussites} réussite(s).`);
    }

    return (
        <div data-decision="recomposition" style={styleCarte}>
            <b>Recomposition</b>

            {credit <= 0 ? (<>
                <div>
                    Fin de la phase : autant de dés (réussite sur 3 ou moins) que le coût cumulé de vos unités biologiques détruites
                    à cette phase. D'après les combats terminés : <b>{pertes}</b>.
                </div>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <label>
                        Coût cumulé :{" "}
                        <input
                            type="number"
                            data-recomposition-cout
                            min={1}
                            value={cout === "" ? pertes : cout}
                            onChange={e => setCout(e.target.value)}
                            style={{ width: 70 }}
                        />
                    </label>
                    <BoutonRegle
                        data-action="recomposition-jet"
                        nom="Recomposition : jet"
                        obstacles={[!(voulu > 0) && "le coût cumulé est nul"]}
                        faire={lancer}
                        style={styleChoix}
                    >
                        Lancer {voulu > 0 ? voulu : 0} dé(s)
                    </BoutonRegle>
                </div>
            </>) : (<>
                <div>
                    <b data-recomposition-credit={credit}>{credit}</b> réussite(s) restante(s) sur {jet} : produisez des vaisseaux tant que leur
                    coût cumulé tient dans ce nombre. Un généticien (ou un logisticien) est usé par vaisseau.
                </div>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <select data-recomposition-vaisseau value={idVaisseau} onChange={e => setIdVaisseau(e.target.value)}>
                        <option value="">Vaisseau…</option>
                        {vaisseaux.map(v => <option key={v.id} value={v.id}>{v.nom} (coût {v.cout})</option>)}
                    </select>
                    <select data-recomposition-case value={caseChoisie} onChange={e => setCaseChoisie(e.target.value)}>
                        <option value="">Système…</option>
                        {mesCases.map(n => <option key={n} value={n}>{nomDuSysteme(n)}</option>)}
                    </select>
                    <BoutonRegle
                        data-action="recomposition-produire"
                        nom="Recomposition : produire un vaisseau"
                        obstacles={[
                            !choisi && "choisissez un vaisseau",
                            ou === null && "choisissez un système",
                            !geneticien && "vous n'avez ni généticien ni logisticien disponible (aucun ne sera usé)",
                        ]}
                        faire={commentaire => choisi && ou !== null && envoyer([
                            geneticien && { type: "deplacer", c: geneticien.id, vers: base + "agentsUses" },
                            { type: "creer", ref: { type: "unit", id: choisi.id }, zone: "hex:" + ou, proprio: moi },
                            { type: "compteur", id: base + "recomposition", valeur: credit - choisi.cout, si: credit },
                        ].filter(Boolean), commentaire || `Recomposition : ${choisi.nom} produit (${nomCase(ou)})`)}
                        style={styleChoix}
                    >
                        Produire (use un généticien)
                    </BoutonRegle>
                    <button
                        type="button"
                        data-action="recomposition-finir"
                        onClick={() => envoyer([{ type: "compteur", id: base + "recomposition", valeur: 0 }], "Recomposition : terminée")}
                    >
                        Terminer (le reste est perdu)
                    </button>
                </div>
            </>)}
        </div>
    );
}

// ------------------------------------------------------------
// L'onglet
// ------------------------------------------------------------

export function Decisions() {

    const ctx = useEngine();
    const { decisions, joueur } = ctx;

    const rien = !decisions.length && !decisionsDurables(ctx);

    return (
        <div data-onglet-decision style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decisions.map(d => <Ponctuelle key={d.id} decision={d} />)}

            {joueur && <Recomposition />}
            {joueur && <Embuscade />}
            {joueur && <Pupille />}

            {rien && (
                <div style={{ color: "#000", fontSize: 14 }}>
                    <b>Aucune décision en attente.</b> Quand une action demande un choix (un montant, une unité, une faction),
                    elle s'ouvre ici au lieu d'une fenêtre : elle n'est validée qu'une fois la décision prise.
                </div>
            )}
        </div>
    );
}
