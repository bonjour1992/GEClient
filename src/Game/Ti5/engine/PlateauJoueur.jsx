import { useMemo, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import {
    useEngine, Emplacements, Zone, Source, Defilable, IconeRessource,
} from "./Interaction";
import { useElement, useElements } from "./sync";
import { LIMITES_UNITES, RESSOURCES, typeUnite } from "./miseEnPlace";
import { ActionsTechnologies } from "./ActionsTechnologies";
import { ReserveProductible } from "./Production";
import { useExploitationDuVide } from "./Controle";
import { EntretienAuto } from "./Entretien";
import { BoutonsScripts } from "./ActionsScript";

// ============================================================
// ONGLET PLATEAU JOUEUR
//
// Compteurs, réserve, éléments actifs, main (cartes en entier),
// puis la feuille de faction :
//
//   - chaque case d'agent (data-emplacement "agents" + data-filtre)
//     montre les agents disponibles de ce type, en cubes ;
//   - la zone des agents usés est juste à côté ;
//   - les cases de tour (data-emplacement "tour:<t>") reçoivent
//     les éléments timés et les alliances.
// ============================================================

const COMPTEURS = [
    ["res", "Ressources"],
    ["inf", "Influence"],
    ["commerce", "Commerce"],
];

// Icône d'un de mes compteurs, à glisser : crée un jeton portant la
// quantité choisie (1 par défaut ; un clic sur l'icône la change) là où
// elle est déposée — sur un élément ou dans une zone. Simple marqueur : le
// compteur ne change pas (Interaction.jsx, poserRessource).
function SourceRessource({ ressource }) {

    const [quantite, setQuantite] = useState(1);
    const [choix, setChoix] = useState(false);

    const [jeton] = RESSOURCES[ressource];

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <span
                data-source={JSON.stringify({ ressource, n: quantite })}
                data-nom={`${jeton} ${quantite}`}
                title={`Glisser pour poser ${quantite} ${jeton.toLowerCase()} sur un élément ou dans une zone. Clic : changer la quantité.`}
                onClick={() => setChoix(c => !c)}
                style={{ cursor: "grab", touchAction: "none", userSelect: "none" }}
            >
                <IconeRessource ressource={ressource} n={quantite} cote={22} />
            </span>

            {choix && (
                <input
                    type="number"
                    min={1}
                    max={99}
                    autoFocus
                    value={quantite}
                    aria-label={`Quantité de ${jeton.toLowerCase()} à glisser`}
                    onChange={e => setQuantite(Math.max(1, Math.min(99, Math.floor(Number(e.target.value) || 1))))}
                    onBlur={() => setChoix(false)}
                    onKeyDown={e => (e.key === "Enter" || e.key === "Escape") && setChoix(false)}
                    style={{ width: 42 }}
                />
            )}
        </span>
    );
}

// glisser : clé du compteur (« res », « inf », « commerce ») dont l'icône
// se glisse pour poser un jeton (data-compteur : repère pour l'interface).
export function Compteur({ id, libelle, glisser }) {

    const { etat, jouer, joueur } = useEngine();

    const valeur = Number(etat.compteurs[id]) || 0;

    return (
        <span
            data-compteur={id}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                padding: "4px 8px",
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
                color: "#000",
            }}
        >
            {glisser && joueur && <SourceRessource ressource={glisser} />}
            <span style={{ flex: 1 }}>{libelle}</span>
            {/* Ctrl + clic : 5 d'un coup (un seul coup au journal) */}
            <button
                type="button"
                disabled={!joueur}
                title="−1 (Ctrl + clic : −5)"
                onClick={event => jouer({ type: "compteur", id, delta: event.ctrlKey ? -5 : -1 })}
            >
                −
            </button>
            <b style={{ minWidth: 22, textAlign: "center", fontSize: 18 }}>{valeur}</b>
            <button
                type="button"
                disabled={!joueur}
                title="+1 (Ctrl + clic : +5)"
                onClick={event => jouer({ type: "compteur", id, delta: event.ctrlKey ? 5 : 1 })}
            >
                +
            </button>
        </span>
    );
}

// Ressources, influence et commerce d'un joueur, avec leurs boutons − / +
// (volet de droite de la partie) ; l'icône devant le nom se glisse
export function MesCompteurs({ userId }) {
    return (
        <div style={{ display: "grid", gap: 3 }}>
            {COMPTEURS.map(([nom, libelle]) => (
                <Compteur key={nom} id={`joueur:${userId}:${nom}`} libelle={libelle} glisser={nom} />
            ))}
        </div>
    );
}

// Cubes d'agents : en bas à droite de la case de l'agent. Éléments posés
// sur une unité ou une habilité de la feuille (data-emplacement
// « unite:<i> », « habilite:<i> ») : en haut à droite de sa carte.
// Exporté : mêmes emplacements sur la feuille d'une faction neutre.
export function stylePions(zone) {

    if (zone.endsWith(":agents")) {
        return {
            position: "absolute",
            right: 3,
            bottom: 3,
            maxWidth: "95%",
            justifyContent: "flex-end",
            zIndex: 5,
        };
    }

    if (/:(unite|habilite):\d+$/.test(zone)) {
        return {
            position: "absolute",
            right: 4,
            top: 4,
            maxWidth: "90%",
            justifyContent: "flex-end",
            zIndex: 5,
        };
    }

    return undefined;
}

// Sources des unités illimitées (infanterie) de la faction d'un joueur : on
// n'en tient pas le compte, on en glisse une vers la carte pour la créer.
export function SourcesIllimitees({ userId }) {

    const { factionDe } = useEngine();

    const faction = useElement(factionDe(userId));
    const unites = (faction?.units || []).filter(lien => lien?.id > 0);
    const contenus = useElements(unites.map(lien => lien.id));

    return unites
        .filter(lien =>
            contenus[lien.id] &&
            LIMITES_UNITES[typeUnite(contenus[lien.id])] === undefined
        )
        .map(lien => <Source key={lien.id} lien={lien} />);
}

// Case « Production » de la réserve : tant qu'elle est cochée, poser une
// unité de sa réserve (ou une infanterie) retire son coût de ses ressources.
// À la phase de construction elle s'appelle « Construction » : seules les
// structures se construisent (le reste de la réserve est grisé), un
// logisticien est utilisé ou dépensé tout seul (Interaction.jsx, payerProduction).
export function CaseProduction() {

    const { production, setProduction, moi, etat } = useEngine();

    const construction = /construction/i.test(etat.phase);

    return (
        <label
            data-case-production={construction ? "construction" : "production"}
            title={construction
                ? "Cochée : glisser une structure hors de la réserve vers une planète ou un système la construit — son coût est payé, la planète est activée et un logisticien est utilisé (dépensé si la planète porte déjà une structure). Ce qui n'est pas une structure est grisé."
                : "Cochée : glisser une unité hors de la réserve coûte son coût en ressources. Ctrl + clic sur une unité à production (un dock…) ouvre une production comptée ; décocher la termine."}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                margin: "0 6px 2px 0",
                padding: "0 6px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: production ? "bold" : "normal",
                backgroundColor: production ? "#fff3cd" : "transparent",
                border: "1px solid " + (production ? "#ff9800" : "transparent"),
            }}
        >
            <input
                type="checkbox"
                checked={!!production}
                onChange={e => setProduction(e.target.checked)}
            />
            {construction ? "Construction" : "Production"}{production && production !== true ? ` : ${production.nom}` : ""}

            {/* Ce que la production en cours ne peut pas produire est cerclé de rouge */}
            <ReserveProductible zone={`joueur:${moi}:reserve`} />
        </label>
    );
}

export function PlateauJoueur({ vu }) {

    const { etat, index, jouer, envoyer, moi, joueur } = useEngine();

    const u = vu.userId;
    const base = "joueur:" + u;

    const faction = useElement(vu.faction);

    // L'entretien part tout seul au début du ravitaillement (Entretien.jsx).
    // Script Exploitation du vide : un système vide disputé demande un conflit de
    // domination (Controle.jsx) avant que l'entretien ne parte
    const vide = useExploitationDuVide(u);


    // Le lien doit garder la même référence d'un rendu à l'autre
    const lienFaction = useMemo(
        () => ({ type: "faction", id: vu.faction }),
        [vu.faction]
    );


    // Types d'agent qui ont une case sur la feuille
    const agentsDeLaFeuille = (faction?.agents || [])
        .filter(lien => lien?.id > 0)
        .map(lien => lien.id);

    const sansCase = c => !agentsDeLaFeuille.includes(c.ref?.id);

    // (tant que la feuille n'est pas chargée, on ne sait pas : rien)
    const horsFeuille = !!faction && (index.parZone.get(base + ":agents") || []).some(sansCase);


    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* COMPTEURS */}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>

                {/* Ravitaillement automatique : compte rendu du tour, ou rattrapage s'il n'a pas
                    été fait (Entretien.jsx) */}
                {joueur && u === moi && <EntretienAuto plateau />}

                {/* Script Exploitation du vide : ouvrir les conflits de domination qui manquent */}
                {joueur && u === moi && vide.aResoudre.some(n => !etat.compteurs[`domination:${n}`]) && (
                    <button
                        type="button"
                        data-action="ouvrir-dominations"
                        title="Exploitation du vide : d'autres factions ont des unités dans ces systèmes vides ; un conflit de domination s'ouvre pour chacun (onglet Conflit)"
                        onClick={() => envoyer(
                            vide.aResoudre.filter(n => !etat.compteurs[`domination:${n}`])
                                // (motif : la carte qui demande la domination — Exploitation du vide, #232)
                                .flatMap(n => [
                                    { type: "compteur", id: `domination:${n}:motif`, valeur: 232 },
                                    { type: "compteur", id: `domination:${n}`, valeur: moi },
                                ]),
                            "Exploitation du vide : conflits de domination ouverts"
                        )}
                    >
                        Exploitation du vide : ouvrir {vide.aResoudre.filter(n => !etat.compteurs[`domination:${n}`]).length} conflit(s) de domination
                    </button>
                )}
            </div>

            {/* Nouveaux boutons des scripts de mes technologies */}
            {joueur && u === moi && <ActionsTechnologies />}

            {/* Boutons d'action des habilités utilisables depuis le plateau (ActionsScript.jsx) */}
            {joueur && u === moi && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <BoutonsScripts lieu="plateau" />
                </div>
            )}

            {/* ZONES */}

            {/* Éléments possédés : les cartes sont affichées en entier */}
            <Zone
                zone={base + ":actif"}
                titre="Éléments actifs (planètes, mercenaires…)"
                cartes={0.6}
            />

            {/* MAIN : les cartes sont affichées en entier */}

            <Zone zone={base + ":main"} titre="Main" cartes={0.85}>
                {joueur && u !== moi && (
                    <button
                        type="button"
                        onClick={() => jouer({ type: "piocher", de: base + ":main", vers: `joueur:${moi}:main` })}
                    >
                        Prendre une carte au hasard
                    </button>
                )}
            </Zone>

            {/* BARRE DE GAUCHE + FEUILLE DE FACTION (recto, puis verso) */}

            <Defilable style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>

                {/* La barre longe le recto de la feuille, puis son verso */}
                <div
                    data-barre-joueur={u}
                    style={{ width: 175, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}
                >

                    {/* Réserves de ressources, d'influence et de commerce */}
                    {COMPTEURS.map(([nom, libelle]) => (
                        <Compteur key={nom} id={`${base}:${nom}`} libelle={libelle} />
                    ))}

                    {/* Faveurs détenues : les siennes et celles reçues des autres factions */}
                    <Zone zone={base + ":faveurs"} titre="Faveurs" />

                    {/* Fragments de relique obtenus en fouillant des ruines */}
                    <Zone zone={base + ":fragments"} titre="Fragments de relique" />

                    <Zone
                        zone={base + ":agentsUses"}
                        titre="Agents usés"
                        style={{ minHeight: 200 }}
                    />

                    {/* Agents d'un type qui n'a pas de case sur la feuille : la
                        zone n'apparaît que s'il y en a (sinon on ne les verrait nulle part) */}
                    {horsFeuille && (
                        <Zone zone={base + ":agents"} titre="Agents hors feuille" filtre={sansCase} />
                    )}

                    <Zone zone={base + ":reserve"} titre="Réserve">
                        {joueur && u === moi && <CaseProduction />}
                        {joueur && u === moi && <SourcesIllimitees userId={u} />}
                    </Zone>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Emplacements prefixe={base} stylePions={stylePions} style={{ width: "max-content" }}>
                        <LoadAndDisplay link={lienFaction} />
                    </Emplacements>

                    {/* L'autre face de la feuille : mise en place, système natal, histoire */}
                    <LoadAndDisplay link={lienFaction} displayeur="verso" />
                </div>
            </Defilable>
        </div>
    );
}
