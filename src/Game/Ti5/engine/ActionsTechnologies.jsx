import { useState } from "react";
import { useEngine, BoutonRegle, agentDisponible, nomElement } from "./Interaction";
import { useElement, useElements } from "./sync";
import { MARQUEUR, DETTE } from "./miseEnPlace";
import { turnNumber } from "../ti5Const";

// ============================================================
// ACTIONS DE MES TECHNOLOGIES (plateau joueur)
//
// Les nouveaux boutons des scripts d'effet (scripts.js) qui ne
// tiennent ni à un système ni à un combat : un bloc par technologie
// débloquée, sur mon plateau, sous « Entretien ».
// ============================================================

const styleBloc = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 };

export function ActionsTechnologies() {

    const { aScript, moi } = useEngine();

    const blocs = [
        aScript(moi, "apprentissage") && <Apprentissage key="apprentissage" />,
        aScript(moi, "arme-amplifiee") && <ArmeAmplifiee key="arme-amplifiee" />,
        aScript(moi, "art-du-commerce-livraison") && <Livraison key="livraison" />,
        aScript(moi, "reparation") && (
            <Dette
                key="reparation"
                script="reparation"
                nom="Réparation"
                phase={/revendic/i}
                nomPhase="la phase de revendication"
                titre="Quand cette faction a pris le contrôle d'une de vos planètes : use un diplomate, elle vous doit 3 dans 3 tours"
            />
        ),
        aScript(moi, "extorsion") && (
            <Dette
                key="extorsion"
                script="extorsion"
                nom="Extorsion"
                phase={/diplo/i}
                nomPhase="la phase de diplomatie"
                titre="Use un diplomate : la faction choisie vous doit 3 dans 3 tours"
            />
        ),
        aScript(moi, "universite") && <Universite key="universite" />,
        aScript(moi, "reseau-de-commerce") && <ReseauDeCommerce key="reseau-de-commerce" />,
        aScript(moi, "micro-teleporteur") && <MicroTeleporteur key="micro-teleporteur" />,
    ].filter(Boolean);

    return blocs.length > 0 && (
        <div
            data-actions-technologies
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "4px 8px",
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
                color: "#000",
                fontSize: 13,
            }}
        >
            <b>Actions de mes technologies</b>
            {blocs}
        </div>
    );
}

// Les autres joueurs, pour choisir une faction
function useAutres() {

    const { partie, moi } = useEngine();
    const autres = partie.joueurs.filter(j => j.userId !== moi);
    const [cible, setCible] = useState("");

    const choix = (
        <select value={cible} onChange={e => setCible(e.target.value)}>
            <option value="">Faction…</option>
            {autres.map(j => <option key={j.userId} value={j.userId}>{j.nom}</option>)}
        </select>
    );

    return [Number(cible) || null, choix];
}

// ------------------------------------------------------------
// Apprentissage : un de mes agents devient un autre agent de base
// (celui de ma faction s'il le réimplémente). Sont exclus les
// mercenaires et les agents spéciaux de faction.
// ------------------------------------------------------------

function Apprentissage() {

    const { etat, index, envoyer, moi, search, factionDe } = useEngine();

    const miens = [`joueur:${moi}:agents`, `joueur:${moi}:agentsUses`]
        .flatMap(zone => index.parZone.get(zone) || [])
        .filter(c => !c.cache && c.ref?.type === "agent");

    const base = etat.references?.agentsBase || [];
    const faction = useElement(factionDe(moi) ?? -1);
    const idsFaction = (faction?.agents || []).map(lien => Number(lien?.id)).filter(id => id > 0);
    const contenus = useElements([...new Set([...miens.map(c => c.ref.id), ...idsFaction])]);

    // Agent de base dont celui-ci est une version (lui-même s'il est de base), ou null
    const baseDe = id => (base.includes(id) ? id
        : (base.includes(Number(contenus[id]?.reimplemente?.id)) ? Number(contenus[id].reimplemente.id) : null));

    // Types d'agents que je peux changer : un par type (le premier disponible)
    const changeables = [...new Map(miens.filter(c => baseDe(c.ref.id)).map(c => [c.ref.id, c])).values()];

    const [idAgent, setIdAgent] = useState("");
    const [idCible, setIdCible] = useState("");

    const agent = changeables.find(c => c.id === idAgent) || null;

    // L'agent de base choisi devient celui de ma faction qui le réimplémente
    const devient = id => idsFaction.find(f => Number(contenus[f]?.reimplemente?.id) === id) ?? id;

    function changer(commentaire) {
        envoyer([{ type: "remplacer", c: agent.id, ref: { type: "agent", id: devient(Number(idCible)) } }], commentaire);
        setIdAgent("");
    }

    return (
        <div data-script="apprentissage" style={styleBloc}>
            <b>Apprentissage</b>
            <select value={idAgent} onChange={e => setIdAgent(e.target.value)}>
                <option value="">Agent…</option>
                {changeables.map(c => <option key={c.id} value={c.id}>{nomElement(search, c.ref)}</option>)}
            </select>
            devient
            <select value={idCible} onChange={e => setIdCible(e.target.value)}>
                <option value="">Agent de base…</option>
                {base.filter(id => !agent || id !== baseDe(agent.ref.id)).map(id => (
                    <option key={id} value={id}>{nomElement(search, { type: "agent", id: devient(id) })}</option>
                ))}
            </select>
            <BoutonRegle
                data-action="apprentissage"
                disabled={!agent || !idCible}
                nom={agent && idCible
                    ? `Apprentissage : ${nomElement(search, agent.ref)} devient ${nomElement(search, { type: "agent", id: devient(Number(idCible)) })}`
                    : "Apprentissage"}
                obstacles={[!/recrut/i.test(etat.phase) && "ce n'est pas la phase de recrutement"]}
                faire={changer}
                title="Remplace un de vos agents par un autre agent de base"
            >
                Changer
            </BoutonRegle>
        </div>
    );
}

// ------------------------------------------------------------
// Arme amplifiée : un scientifique est posé sur un type de vaisseau
// de ma feuille (case « unite:<i> », qui n'en porte pas déjà un).
// Au combat spatial, mes vaisseaux de ce type ont +2 (Combat.jsx).
// ------------------------------------------------------------

function ArmeAmplifiee() {

    const { etat, index, envoyer, moi, search, factionDe } = useEngine();

    const faction = useElement(factionDe(moi) ?? -1);
    const liens = (faction?.units || []).map((lien, i) => ({ id: Number(lien?.id), i })).filter(x => x.id > 0);
    const unites = useElements(liens.map(x => x.id));

    const porteUnScientifique = i => (index.parZone.get(`joueur:${moi}:unite:${i}`) || [])
        .some(c => c.ref?.type === "agent" && /scientifique/i.test(nomElement(search, c.ref)));

    const types = liens.filter(x => unites[x.id]?.mot_cle?.includes("ship") && !porteUnScientifique(x.i));

    const [choisi, setChoisi] = useState("");
    const type = types.find(x => String(x.i) === choisi) || null;
    const scientifique = agentDisponible({ index, moi, search }, "scientifique");

    return (
        <div data-script="arme-amplifiee" style={styleBloc}>
            <b>Arme amplifiée</b>
            <select value={choisi} onChange={e => setChoisi(e.target.value)}>
                <option value="">Type de vaisseau…</option>
                {types.map(x => <option key={x.i} value={x.i}>{nomElement(search, { type: "unit", id: x.id })}</option>)}
            </select>
            <BoutonRegle
                data-action="arme-amplifiee"
                disabled={!type}
                nom={`Arme amplifiée : un scientifique sur ${type ? nomElement(search, { type: "unit", id: type.id }) : "un type de vaisseau"}`}
                obstacles={[
                    !/science/i.test(etat.phase) && "ce n'est pas la phase de science",
                    !scientifique && "vous n'avez pas de scientifique disponible (aucun ne sera posé)",
                ]}
                faire={commentaire => envoyer(
                    [scientifique && { type: "deplacer", c: scientifique.id, vers: `joueur:${moi}:unite:${type.i}` }],
                    commentaire
                )}
                title="Dépense un scientifique : il est posé sur ce type de vaisseau de votre feuille, qui a +2 au combat spatial"
            >
                Poser un scientifique (+2 au combat)
            </BoutonRegle>
        </div>
    );
}

// ------------------------------------------------------------
// Art du commerce : la technologie est utilisée, la faction choisie
// gagne 2 commerce (livraison de 2 ; les dettes se réduisent à la main).
// ------------------------------------------------------------

function Livraison() {

    const { etat, envoyer, moi, nomDe, techDuScript } = useEngine();

    const [cible, choix] = useAutres();
    const utilisee = techDuScript(moi, "art-du-commerce-livraison");

    return (
        <div data-script="art-du-commerce-livraison" style={styleBloc}>
            <b>Art du commerce</b> livraison de 2 à {choix}
            <BoutonRegle
                data-action="art-du-commerce-livraison"
                disabled={!cible}
                nom={`Art du commerce : livraison de 2 à ${cible ? nomDe(cible) : "une faction"}`}
                obstacles={[
                    !/diplo/i.test(etat.phase) && "ce n'est pas la phase de diplomatie",
                    utilisee && etat.compteurs[utilisee] && "la technologie est déjà utilisée ce tour",
                ]}
                faire={commentaire => envoyer([
                    utilisee && { type: "compteur", id: utilisee, valeur: 1 },
                    { type: "compteur", id: `joueur:${cible}:commerce`, delta: 2 },
                ], commentaire)}
                title="Utilise la technologie : la faction choisie gagne 2 commerce (elle réduit vos dettes à la main)"
            >
                Livrer
            </BoutonRegle>
        </div>
    );
}

// ------------------------------------------------------------
// Réparation, Extorsion : un diplomate est usé et la faction choisie
// reçoit une dette de 3 envers moi, à payer dans 3 tours (jeton de
// dette sur sa case de tour, comme celles des transactions).
// Réparation : quand elle a pris une de mes planètes (revendication) ;
// Extorsion : à la phase de diplomatie.
// ------------------------------------------------------------

const DETTE_REPARATION = 3;
const DELAI_REPARATION = 3;

function Dette({ script, nom, phase, nomPhase, titre }) {

    const { etat, index, envoyer, moi, search, nomDe } = useEngine();

    const [cible, choix] = useAutres();
    const diplomate = agentDisponible({ index, moi, search }, "diplomate");
    const echeance = etat.tour + DELAI_REPARATION;

    function endetter(commentaire) {

        // Identifiant provisoire du jeton, le temps du coup
        const idDette = "t97" + etat.tour;

        envoyer([
            diplomate && { type: "deplacer", c: diplomate.id, vers: `joueur:${moi}:agentsUses` },
            {
                type: "creer",
                idLocal: idDette,
                jeton: DETTE,
                zone: `joueur:${cible}:tour:${Math.min(echeance, turnNumber)}`,
                marques: { montant: DETTE_REPARATION },
            },
            { type: "creer", jeton: MARQUEUR, sur: idDette, proprio: moi },
        ], commentaire);
    }

    return (
        <div data-script={script} style={styleBloc}>
            <b>{nom}</b> dette de {DETTE_REPARATION} pour {choix}
            <BoutonRegle
                data-action={script}
                disabled={!cible}
                nom={`${nom} : ${cible ? nomDe(cible) : "une faction"} vous doit ${DETTE_REPARATION} (tour ${Math.min(echeance, turnNumber)})`}
                obstacles={[
                    !phase.test(etat.phase) && `ce n'est pas ${nomPhase}`,
                    !diplomate && "vous n'avez pas de diplomate disponible (aucun ne sera usé)",
                    echeance > turnNumber && `l'échéance (tour ${echeance}) dépasse le dernier tour : la dette est posée au tour ${turnNumber}`,
                ]}
                faire={endetter}
                title={titre}
            >
                Endetter (use un diplomate)
            </BoutonRegle>
        </div>
    );
}

// ------------------------------------------------------------
// Université (recrutement) : la technologie et un de mes agents sont
// utilisés ; un agent du même type m'attend sur ma case du tour
// suivant.
// ------------------------------------------------------------

function Universite() {

    const { etat, index, envoyer, moi, search, techDuScript } = useEngine();

    const agents = [...new Map((index.parZone.get(`joueur:${moi}:agents`) || [])
        .filter(c => !c.cache && c.ref?.type === "agent")
        .map(c => [c.ref.id, c])).values()];

    const [choisi, setChoisi] = useState("");
    const agent = agents.find(c => c.id === choisi) || null;
    const utilisee = techDuScript(moi, "universite");

    return (
        <div data-script="universite" style={styleBloc}>
            <b>Université</b>
            <select value={choisi} onChange={e => setChoisi(e.target.value)}>
                <option value="">Agent…</option>
                {agents.map(c => <option key={c.id} value={c.id}>{nomElement(search, c.ref)}</option>)}
            </select>
            <BoutonRegle
                data-action="universite"
                disabled={!agent}
                nom={`Université : ${agent ? nomElement(search, agent.ref) : "un agent"} utilisé, un de plus au tour ${etat.tour + 1}`}
                obstacles={[
                    !/recrut/i.test(etat.phase) && "ce n'est pas la phase de recrutement",
                    utilisee && etat.compteurs[utilisee] && "la technologie est déjà utilisée ce tour",
                    etat.tour >= turnNumber && "il n'y a pas de tour suivant",
                ]}
                faire={commentaire => envoyer([
                    utilisee && { type: "compteur", id: utilisee, valeur: 1 },
                    // (agent?. : le compilateur React lit ces valeurs dès le rendu, même sans agent choisi)
                    { type: "deplacer", c: agent?.id, vers: `joueur:${moi}:agentsUses` },
                    {
                        type: "creer",
                        ref: { type: "agent", id: agent?.ref.id },
                        zone: `joueur:${moi}:tour:${Math.min(etat.tour + 1, turnNumber)}`,
                        proprio: moi,
                    },
                ], commentaire)}
                title="Utilise la technologie et l'agent choisi : un agent du même type est posé sur votre case du tour suivant"
            >
                Former (un agent de plus au prochain tour)
            </BoutonRegle>
        </div>
    );
}

// ------------------------------------------------------------
// Réseau de commerce : influence et ressources se valent — deux
// boutons de conversion, un pour un.
// ------------------------------------------------------------

function ReseauDeCommerce() {

    const { etat, envoyer, moi } = useEngine();

    const [quantite, setQuantite] = useState(1);
    const n = Math.max(1, Math.floor(Number(quantite)) || 1);

    const convertir = (de, vers, nomDe, nomVers) => (
        <BoutonRegle
            data-action={`reseau-de-commerce-${de}`}
            nom={`Réseau de commerce : ${n} ${nomDe} en ${n} ${nomVers}`}
            obstacles={[(Number(etat.compteurs[`joueur:${moi}:${de}`]) || 0) < n && `vous n'avez pas ${n} ${nomDe}`]}
            faire={commentaire => envoyer([
                { type: "compteur", id: `joueur:${moi}:${de}`, delta: -n },
                { type: "compteur", id: `joueur:${moi}:${vers}`, delta: n },
            ], commentaire)}
        >
            {n} {nomDe} → {n} {nomVers}
        </BoutonRegle>
    );

    return (
        <div data-script="reseau-de-commerce" style={styleBloc}>
            <b>Réseau de commerce</b>
            <input type="number" min={1} max={99} value={quantite} onChange={e => setQuantite(e.target.value)} style={{ width: 48 }} />
            {convertir("inf", "res", "influence", "ressource(s)")}
            {convertir("res", "inf", "ressource(s)", "influence")}
        </div>
    );
}

// ------------------------------------------------------------
// Micro-téléporteur (production) : un logisticien est usé ; les
// unités transportables se déplacent ensuite à la main, d'une planète
// où j'ai une structure à une autre (ou à un de mes soleils de guerre).
// ------------------------------------------------------------

function MicroTeleporteur() {

    const { etat, index, envoyer, moi, search, aviser, capaciteLogistique } = useEngine();

    const logisticien = agentDisponible({ index, moi, search }, "logisticien|g[ée]n[ée]ticien");

    return (
        <div data-script="micro-teleporteur" style={styleBloc}>
            <b>Micro-téléporteur</b>
            <BoutonRegle
                data-action="micro-teleporteur"
                nom="Micro-téléporteur : une flotte d'unités transportables d'une planète à structure à une autre"
                obstacles={[
                    !/production/i.test(etat.phase) && "ce n'est pas la phase de production",
                    !logisticien && "vous n'avez pas de logisticien disponible (aucun ne sera usé)",
                ]}
                faire={commentaire => {
                    envoyer([logisticien && { type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` }], commentaire);
                    aviser(`Micro-téléporteur : glissez jusqu'à ${capaciteLogistique(moi)} unités transportables d'une planète où vous avez ` +
                        "une structure vers une autre de vos planètes à structure, ou vers un de vos soleils de guerre.");
                }}
                title="Use un logisticien ; vous déplacez ensuite les unités à la main"
            >
                Téléporter (use un logisticien)
            </BoutonRegle>
        </div>
    );
}
