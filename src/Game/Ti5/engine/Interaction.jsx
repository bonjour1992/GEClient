import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getHandler } from "../../games";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { PlayerColor, turnNumber } from "../ti5Const";
import { pub } from "../../../lib/fetch";
import { useElement, useElements, contenuEnCache } from "./sync";
import { capaciteDe, victimesBombe, depenserAgent, placePrise } from "./effets";
import { demander } from "./demande";
import { possesseurAuControle, actionsPossessionPerdue, demanderControle, unitesDuControle, ESPACE_CONTROLE } from "./Controle";
import { demanderBlocage } from "./BlocageAction";
import { MARQUE_AGI, estBloquee } from "./regleBlocage";
import { rangDePhase } from "./regleControle";
import { obstacleSousPhase, DEBARQUEMENT } from "./regleSousPhases";
import { estHyperlane } from "./hyperlane";
import { estProductible, effetsMercenaires } from "./Production";
import { typeUnite } from "./miseEnPlace";
import {
    MARQUEUR,
    FAVEUR,
    DETTE,
    ACTIVATION,
    RESSOURCES,
    LIBRE,
    COULEUR_LIBRE,
    estFragment,
    ressourceDe,
    typeUnite as typeDeUnite,
    estUniteMercenaire,
    CUBES,
    campDe,
    NEUTRE,
    aMot,
    MOTIF_LOGISTICIEN,
    FRAGMENTS,
    actionsPoints,
    REFORGE_PORTAIL,
} from "./miseEnPlace";
import { joueurDeMain, estPioche } from "./etat";
import { distanceIndex, distanceBande } from "../hexSpirale";
import { ICONE_MERCENAIRE } from "../Component/Nom";

// ============================================================
// COUCHE D'INTERACTION DE L'ENGINE
//
// Les composants d'affichage existants restent purs. L'engine
// repère les emplacements grâce à des attributs :
//
//   data-zone="joueur:3:main"     zone complète (rendue par l'engine)
//   data-emplacement="tour:4"     emplacement dans un affichage existant ;
//                                 la zone est préfixée par le data-prefixe
//                                 ou la case (data-case) qui le contient
//   data-case="12"                case de la carte -> zone hex:12
//   data-composant="c42"          un pion
//
// <Plan> gère le glisser par délégation (pointer events).
// ============================================================

export const Engine = createContext(null);

export const useEngine = () => useContext(Engine);

// ============================================================
// CODE COULEUR DE TOUTE L'INTERFACE
//
//   jaune : j'ai quelque chose à faire (un bouton qui m'attend)
//   vert  : c'est fait
//   rouge : un problème, une erreur
// ============================================================

export const COULEUR_A_FAIRE = "#ffe082";
export const COULEUR_FAIT = "#c8e6c9";
export const COULEUR_PROBLEME = "#ffcdd2";
export const COULEUR_NEUTRE = "#f5f5f5";

// Bouton « indisponible » qui reste utilisable (rouge gris) : la condition
// habituelle manque, l'engine le signale, les joueurs décident.
export const STYLE_INDISPONIBLE = {
    backgroundColor: "#e3cdcd",
    color: "#7a1f1f",
    border: "1px solid #b08a8a",
    borderRadius: 3,
};

// ============================================================
// BOUTONS : TROIS SORTES
//
//   gris        action simple, sans règle du jeu (« Envoyer vers… »,
//               « Fermer ») : le bouton ordinaire du navigateur ;
//   vert        effet du jeu, utilisable : bonne phase, conditions
//               remplies, ressources et agents disponibles ;
//   rouge gris  le même effet, qui ne devrait pas être fait : il reste
//               utilisable, après une confirmation qui dit pourquoi.
//
// Le coup d'un effet du jeu porte un commentaire marqué (✔ ou ⚠) :
// le journal l'affiche en vert ou en rouge (Journal.jsx, lireRegle).
// Vaut aussi pour les effets déclenchés par un clic ou un Ctrl + clic
// (confirmerRegle).
// ============================================================

export const STYLE_REGLE = {
    backgroundColor: "#c8e6c9",
    color: "#1b5e20",
    border: "1px solid #2e7d32",
    borderRadius: 3,
    fontWeight: "bold",
};

const MARQUE_REGLE = "✔ ";
const MARQUE_HORS_REGLE = "⚠ ";

// Commentaire d'un coup -> { hors } si c'est un effet du jeu, sinon null
export function lireRegle(commentaire) {

    const texte = String(commentaire || "");

    return texte.startsWith(MARQUE_REGLE)
        ? { hors: false }
        : (texte.startsWith(MARQUE_HORS_REGLE) ? { hors: true } : null);
}

// Effet du jeu sur le point d'être fait. obstacles : raisons pour lesquelles
// il ne devrait pas l'être (les valeurs fausses sont ignorées). S'il y en a,
// une confirmation les rappelle : c'est la seule fenêtre du navigateur qui
// reste (voulu par l'auteur) — toute autre question est une décision de
// l'onglet Décision (demande.js). Retourne le commentaire du coup (à passer à
// envoyer), ou null si le joueur renonce.
export function confirmerRegle(nom, obstacles = []) {

    const raisons = obstacles.filter(Boolean);

    if (!raisons.length) {
        return MARQUE_REGLE + nom;
    }

    return window.confirm(`${nom} ?\n\nNormalement impossible :\n- ${raisons.join("\n- ")}\n\nLe faire quand même ?`)
        ? `${MARQUE_HORS_REGLE}${nom} (${raisons.join(" ; ")})`.slice(0, 200)
        : null;
}

// Bouton d'un effet du jeu : vert, ou rouge gris s'il y a des obstacles.
// faire(commentaire) reçoit le commentaire à donner au coup.
export function BoutonRegle({ nom, obstacles = [], faire, children, style, title, ...reste }) {

    const raisons = obstacles.filter(Boolean);

    return (
        <button
            type="button"
            data-regle={raisons.length ? "hors" : "ok"}
            title={raisons.length
                ? `Ne devrait pas être fait : ${raisons.join(" ; ")} (reste utilisable, après confirmation)`
                : title}
            onClick={() => {
                const commentaire = confirmerRegle(nom || String(children), raisons);

                if (commentaire) {
                    faire(commentaire);
                }
            }}
            style={{
                ...(raisons.length ? STYLE_INDISPONIBLE : STYLE_REGLE),
                // (désactivé : l'action n'existe pas ici, par exemple après le dernier tour)
                ...(reste.disabled ? { opacity: 0.5, cursor: "default" } : {}),
                ...style,
            }}
            {...reste}
        >
            {children}
        </button>
    );
}

// ============================================================
// BLOCS REPLIABLES (volet de droite, en-tête)
//
// L'état replié est gardé dans le navigateur, par bloc.
// ============================================================

export function useRepli(cle) {

    const nom = "ge-engine-repli-" + cle;

    const [ferme, setFerme] = useState(() => {
        try {
            return !!cle && localStorage.getItem(nom) === "1";
        } catch {
            return false;
        }
    });

    function basculer() {
        setFerme(precedent => {
            try {
                localStorage.setItem(nom, precedent ? "0" : "1");
            } catch {
                // préférence non enregistrée
            }

            return !precedent;
        });
    }

    return [ferme, basculer];
}

// Bouton ▾ / ▸ d'un bloc repliable
export function BoutonRepli({ ferme, basculer }) {
    return (
        <button
            type="button"
            onClick={basculer}
            title={ferme ? "Déplier" : "Replier"}
            aria-expanded={!ferme}
            style={{
                padding: "0 4px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1,
            }}
        >
            {ferme ? "▸" : "▾"}
        </button>
    );
}

// Une boîte repliable avec son titre (pour ce qui n'est pas une zone)
export function Repli({ cle, titre, children, style }) {

    const [ferme, basculer] = useRepli(cle);

    return (
        <div style={{ padding: 6, border: "1px solid #aaa", borderRadius: 8, backgroundColor: COULEUR_NEUTRE, color: "#000", ...style }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: "bold", fontSize: 13 }}>
                <BoutonRepli ferme={ferme} basculer={basculer} />
                <span onClick={basculer} style={{ cursor: "pointer" }}>{titre}</span>
            </div>

            {!ferme && children}
        </div>
    );
}

// ============================================================
// OUTILS
// ============================================================

// Tuile système posée sur une case de la carte (undefined : case vide)
export const tuileDe = (index, numero) =>
    (index.parZone.get("hex:" + numero) || []).find(c => c.ref?.type === "system");

// Esclaves d'un joueur : infanteries d'un autre camp dans ses éléments actifs
export const esclavesDe = (index, u) => (index.parZone.get(`joueur:${u}:actif`) || []).filter(x =>
    !x.cache && x.ref?.type === "unit" && campDe(x) !== u && typeUnite(contenuEnCache(x.ref.id)) === "inf");

// Écrans de conflit et de déplacement : nom d'un camp (les unités sans
// propriétaire sont « Neutres »), pastille ronde à sa couleur, petit bouton
export const nomDuCamp = (nomDe, camp) => (camp === NEUTRE ? "Neutres" : nomDe(camp));

export const pastilleCamp = (couleurDe, camp) => (
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

export const styleMini = { fontSize: 12, padding: "1px 6px" };

// Joueur qui possède une planète (sa carte est dans ses éléments actifs), ou null
export const possesseurDe = (index, joueurs, idPlanete) =>
    joueurs.find(j => (index.parZone.get(`joueur:${j.userId}:actif`) || [])
        .some(c => !c.cache && c.ref?.type === "planet" && c.ref.id === idPlanete))?.userId ?? null;

// Carte d'une planète déjà en jeu (chez un joueur), ou undefined
export const carteDePlanete = (etat, idPlanete) => Object.values(etat?.composants || {})
    .find(c => !c.cache && c.ref?.type === "planet" && c.ref.id === idPlanete && c.zone !== "horsJeu");

// Composants rangés par zone et par porteur
export function indexer(etat) {

    const parZone = new Map();
    const parPorteur = new Map();

    for (const c of Object.values(etat?.composants || {})) {

        const table = c.sur ? parPorteur : parZone;
        const cle = c.sur || c.zone;

        if (!table.has(cle)) {
            table.set(cle, []);
        }

        table.get(cle).push(c);
    }

    for (const liste of [...parZone.values(), ...parPorteur.values()]) {
        liste.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    }

    return { parZone, parPorteur };
}

// Nom affiché d'un élément : le préfixe !...! des noms n'est pas affiché
// Mercenaire : une carte mercenaire, ou une unité mercenaire (marque « dos »
// posée à la mise en place, ou type de lien « mercenaire » de son contenu)
export const estMercenaire = c => c?.ref?.type === "mercenaire" ||
    (c?.ref?.type === "unit" &&
        (c.marques?.dos === "mercenaire" || estUniteMercenaire(contenuEnCache(c.ref.id))));

export function nomElement(search, ref) {
    const element = search.find(e => e.id === ref.id);

    return element?.name || `${ref.type} #${ref.id}`;
}

export function nomType(jeu, type) {
    return type === "jeton" ? "jeton" : getHandler(jeu, type)?.name || type;
}

export function couleurJoueur(joueur) {
    return PlayerColor[joueur?.couleur] || joueur?.couleur || "#666";
}

// ============================================================
// SYSTÈMES SECONDAIRES
//
// Des systèmes à part du plan central (on y accède par des trous
// de ver) : un second groupe de cases, sous la carte de l'onglet
// Espace. Ce sont des zones hex:<i> comme les autres, d'indice
// 1000 et plus : tout ce qui vaut pour un système vaut pour eux
// (fiche, planètes, unités, combats). L'indice dans leur groupe
// est i - 1000, et deux cases ne sont voisines que dans le même
// groupe.
// ============================================================

export const DECALAGE_SECONDAIRE = 1000;

export const estSecondaire = numero => Number(numero) >= DECALAGE_SECONDAIRE;

// « case 12 », « secondaire 3 »
export const nomCase = numero => (estSecondaire(numero)
    ? `secondaire ${Number(numero) - DECALAGE_SECONDAIRE + 1}`
    : `case ${Number(numero) + 1}`);

// Distance entre deux cases, en pas d'hexagone ; infinie d'un groupe à l'autre
export const distanceCases = (a, b) => (estSecondaire(a) !== estSecondaire(b)
    ? Infinity
    : (estSecondaire(a) ? distanceBande : distanceIndex)(Number(a) % DECALAGE_SECONDAIRE, Number(b) % DECALAGE_SECONDAIRE));

// Nom lisible d'une zone, pour le journal et les menus
export function nomZone(zone, nomDe) {

    if (!zone || typeof zone !== "string") {
        return "?";
    }

    const parties = zone.split(":");

    switch (parties[0]) {

        case "hex":
            return nomCase(parties[1]) +
                (parties[2] === "planete" ? `, planète ${Number(parties[3]) + 1}` : "");

        case "joueur": {
            const qui = nomDe(Number(parties[1]));
            const reste = parties.slice(2).join(":");

            if (parties[2] === "vote") {
                return `plateau de vote de ${qui}`;
            }

            const noms = {
                main: "main",
                faveurs: "faveurs",
                reserve: "réserve",
                actif: "éléments actifs",
                agents: "agents",
                agentsUses: "agents usés",
                tech: "technologies",
                fragments: "fragments",
                choix: "cartes à choisir",
            };

            if (parties[2] === "tour") {
                return `tour ${parties[3]} de ${qui}`;
            }

            // Emplacements de la feuille de faction (unités, habilités)
            if (parties[2] === "unite" || parties[2] === "habilite") {
                return `${parties[2] === "unite" ? "unité" : "habilité"} ${Number(parties[3]) + 1} de ${qui}`;
            }

            return `${noms[reste] || reste} de ${qui}`;
        }

        // Feuille d'une faction neutre (unités, habilités)
        case "neutre":
            return ["unite", "habilite"].includes(parties[2])
                ? `${parties[2] === "unite" ? "unité" : "habilité"} ${Number(parties[3]) + 1} de la faction neutre`
                : "faction neutre : " + parties.slice(2).join(":");

        case "pioche":
            if (parties[1] === "system") {
                return "pioche de tuiles";
            }

            if (parties[1] === "fragments") {
                return "sac de fragments";
            }

            return parties[1] === "sac" ? "sac d'agents" : "pioche " + parties[1];

        case "defausse":
            return "défausse " + parties[1];

        case "general": {
            const noms = {
                promesses: "promesses",
                agents: "réserve d'agents",
                tuiles: "tuiles piochées",
                systemes: "réserve de tuiles spéciales",
                table: "table",
                libre: "zone libre",
                neutres: "unités neutres",
            };

            if (parties[1] === "boite") {
                return "case " + parties[2] + " du déroulé";
            }

            if (["points", "infamie", "sieges"].includes(parties[1])) {
                const pistes = { points: "points", infamie: "infamie", sieges: "sièges au conseil" };
                return `case ${parties[2]} des ${pistes[parties[1]]}`.replace("des infamie", "de l'infamie");
            }

            if (parties[1] === "militaire") {
                return "objectif militaire du tour " + parties[2];
            }

            if (parties[1] === "evenement") {
                return "événement du tour " + parties[2];
            }

            if (parties[1] === "agenda") {
                return "agendas du tour " + parties[2];
            }

            if (parties[1] === "initiative") {
                return "initiative " + parties[2];
            }

            return noms[parties[1]] || parties.slice(1).join(":");
        }

        case "horsJeu":
            return "hors jeu";

        default:
            return zone;
    }
}

// L'unité a-t-elle ce mot-clé (« ship », « transportable »...) ?
// Lu dans le cache des éléments : les pions affichés y sont déjà.
// Une unité peut-elle être posée sur une planète ? Seulement si elle porte le
// mot-clé « Terrestre » (terre). Contenu pas encore chargé : on laisse faire.
export function estTerrestre(contenu) {
    return !contenu || aMot(contenu, "terre");
}

// Zone d'une planète
const estPlanete = zone => /^hex:\d+:planete:\d+$/.test(zone || "");

export function aMotCle(composant, motCle) {
    return composant?.ref?.type === "unit" &&
        !!contenuEnCache(composant.ref.id)?.mot_cle?.includes(motCle);
}

// Zone désignée par un élément du DOM (ou null)
export function trouverZone(element) {

    for (let e = element; e && e.dataset; e = e.parentElement) {

        if (e.dataset.zone) {
            return e.dataset.zone;
        }

        if (e.dataset.emplacement) {
            const base = baseEmplacement(e);

            if (base) {
                return base + ":" + e.dataset.emplacement;
            }
        }

        if (e.dataset.case !== undefined) {
            return "hex:" + e.dataset.case;
        }
    }

    return null;
}

function baseEmplacement(element) {

    for (let e = element.parentElement; e && e.dataset; e = e.parentElement) {

        if (e.dataset.case !== undefined) {
            return "hex:" + e.dataset.case;
        }

        if (e.dataset.prefixe) {
            return e.dataset.prefixe;
        }
    }

    return null;
}

// ============================================================
// PIONS
// ============================================================

// Regroupe les composants identiques (même élément, même propriétaire,
// mêmes marques). Un composant qui en porte d'autres reste seul.
function grouper(liste, index) {

    const groupes = new Map();

    for (const c of liste) {

        let cle;

        if (c.cache) {
            cle = `cache|${c.dos}|${c.proprio}`;
        } else if (index.parPorteur.has(c.id)) {
            cle = c.id;
        } else if (c.ref?.type === "agent" && /^joueur:\d+:agents(Uses)?$/.test(c.zone || "")) {
            // Agents d'un joueur (disponibles, usés) : toujours un seul pion par
            // type d'agent, d'où qu'ils viennent (départ, recrutement, réserve)
            cle = "agent|" + c.ref.id;
        } else {
            cle = [
                c.ref?.type, c.ref?.id, c.jeton, c.proprio, c.face,
                JSON.stringify(c.marques),
            ].join("|");
        }

        if (!groupes.has(cle)) {
            groupes.set(cle, []);
        }

        groupes.get(cle).push(c);
    }

    return [...groupes.values()];
}

const stylePion = {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 3,
    margin: 1,
    padding: "1px 5px",
    borderRadius: 9,
    backgroundColor: "#fff",
    color: "#000",
    border: "2px solid #666",
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    userSelect: "none",
    touchAction: "none",
    cursor: "grab",
    pointerEvents: "auto",
};

// Liseré des unités qui ne sont pas sur la fiche de faction de leur joueur
export const DORE = "#ffc400";

// Icônes des fragments de relique (celles des cartes relique)
const ICONES_FRAGMENT = {
    "Fragment ancien": "/ti/relic/relicAnc.png",
    "Fragment militaire": "/ti/relic/relicMil.png",
    "Fragment civil": "/ti/relic/relicCiv.png",
    "Fragment spatial": "/ti/relic/relicSpa.png",
};

// Icône d'une ressource (« res », « inf », « commerce ») portant un nombre :
// hexagone ou rond de la couleur des remplacements #res, #inf, #com
export function IconeRessource({ ressource, n, cote = 22 }) {

    const [, couleur, forme] = RESSOURCES[ressource] || [null, "#999", "rond"];
    const clair = ressource !== "inf";

    return (
        <svg viewBox="0 0 24 24" width={cote} height={cote} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
            {forme === "hex"
                ? <polygon points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5" fill={couleur} stroke="#000" strokeWidth="1.2" />
                : <circle cx="12" cy="12" r="10.5" fill={couleur} stroke="#000" strokeWidth="1.2" />}
            {n !== undefined && n !== null && (
                <text
                    x="12"
                    y="16.5"
                    textAnchor="middle"
                    fontSize={String(n).length > 1 ? 11 : 13}
                    fontWeight="bold"
                    fontFamily="Arial, sans-serif"
                    fill={clair ? "#000" : "#fff"}
                >
                    {n}
                </text>
            )}
        </svg>
    );
}

// ------------------------------------------------------------
// Script Connexion : « vos négociants peuvent être utilisés comme
// n'importe quel agent en dépensant 2 commerce ».
//
// Quand le joueur n'a pas l'agent demandé mais a un négociant, c'est
// le négociant qui est rendu, et la substitution est notée. Au moment
// d'envoyer le coup (payerConnexion, appelé par Partie.jsx), une
// fenêtre demande s'il faut utiliser ce négociant pour 2 commerce :
// oui, le coût s'ajoute au coup ; non, l'agent n'est pas utilisé.
// ------------------------------------------------------------

// Contexte de la partie affichée ({ aScript, moi, etat, index, search, aviser }), tenu à jour par Partie.jsx
let connexion = null;

export const reglerConnexion = contexte => {
    connexion = contexte;
};

// Négociant rendu à la place d'un autre agent -> nom de l'agent demandé
const substitutions = new Map();

// Ajoute au coup le prix des négociants utilisés à la place d'un autre agent
// (asynchrone : chaque substitution est une décision du joueur)
export async function payerConnexion(actions) {

    const liste = (Array.isArray(actions) ? actions : [actions]).filter(Boolean);
    const vues = new Set();
    const gardees = [];
    let payes = 0;

    for (const action of liste) {

        const demande = (action.type === "deplacer" || action.type === "supprimer") && substitutions.get(action.c);

        if (!demande || vues.has(action.c)) {
            gardees.push(action);
            continue;
        }

        vues.add(action.c);
        substitutions.delete(action.c);

        const reponse = await demander({
            titre: "Connexion",
            texte: `Vous n'avez pas l'agent demandé (${demande.replace(/[|\\[\]]/g, " ")}).`,
            choix: [
                { valeur: 1, libelle: "Utiliser un négociant à sa place, pour 2 commerce" },
                { valeur: 2, libelle: "N'utiliser aucun agent" },
            ],
            renoncer: false,
        });

        if (reponse === 1) {
            payes++;
            gardees.push(action);
        }
    }

    return payes && connexion
        ? [...gardees, { type: "compteur", id: `joueur:${connexion.moi}:commerce`, delta: -2 * payes }]
        : gardees;
}

// ------------------------------------------------------------
// REMPLAÇANTS D'AGENT : « utilisable comme »
//
// Un mercenaire « utilisable comme » un agent et la relique Noble
// cryogénisé (« compte comme tout type d'agent de base ») remplacent
// un agent : leur carte, dans les éléments actifs du joueur, porte la
// marque « comme » = identifiant du type d'agent (posée en glissant le
// cube noir du mercenaire, ou la carte, sur ce type d'agent de sa
// réserve). L'agent Héritier des Winnu remplace un politique si son
// joueur possède Mecatol Rex, un amiral sinon.
//
// Quand un agent de ce type est utilisé ou dépensé, une fenêtre
// demande qui agit (choisirRemplacants, appelé par Partie.jsx à
// l'envoi du coup). Sans agent de ce type, agentDisponible rend le
// remplaçant, et l'action qui le vise est traduite :
//
//   mercenaire  utilisé : son cube noir passe dans les agents usés ;
//               dépensé : sa carte est retirée du jeu
//   Noble       sa carte est usée, même quand il devrait être dépensé
//   Héritier    utilisé comme un agent ; dépensé : il attend deux tours
//               (zone joueur:<u>:tour:<tour + 2>)
// ------------------------------------------------------------

export const NOBLE = 396;
export const HERITIER = 142;

// ------------------------------------------------------------
// CUBE NOIR D'UN MERCENAIRE
//
// Le cube est posé sur la carte du mercenaire tant qu'il est
// disponible. Tout ce qui utilise le mercenaire (comme agent, ou
// pour son propre effet) envoie son cube dans les agents usés de son
// joueur (marque « carte » du cube : la carte d'où il vient) ; sans
// cube sur sa carte, le mercenaire est usé. À l'entretien, chaque
// carte mercenaire retrouve son cube (PlateauJoueur.jsx).
// ------------------------------------------------------------

export const CUBE_MERCENAIRE = CUBES[0][0];

export const cubeDeMercenaire = (index, carte) =>
    (index.parPorteur.get(carte?.id) || []).find(x => !x.ref && x.jeton === CUBE_MERCENAIRE) || null;

// La carte (ou l'unité) est-elle usée ? Mercenaire : son cube n'est plus sur sa carte
export const carteUsee = (index, carte) => (carte?.ref?.type === "mercenaire"
    ? !cubeDeMercenaire(index, carte)
    : !!carte?.marques?.use);

// Actions qui usent une carte ou une unité. Mercenaire : son cube passe dans les agents
// usés (utilisation forcée, sans cube : un cube y est créé, il reviendra à l'entretien)
export function actionsUserCarte(index, moi, carte) {

    if (carte.ref?.type !== "mercenaire") {
        return [{ type: "marquer", c: carte.id, marque: "use", valeur: true }];
    }

    const cube = cubeDeMercenaire(index, carte);
    const uses = `joueur:${moi}:agentsUses`;

    return cube
        ? [
            { type: "marquer", c: cube.id, marque: "carte", valeur: carte.id },
            { type: "deplacer", c: cube.id, vers: uses },
        ]
        : [{ type: "creer", jeton: CUBE_MERCENAIRE, zone: uses, marques: { carte: carte.id } }];
}

export const estCarteRemplacant = c => !!c && !c.cache &&
    (c.ref?.type === "mercenaire" || (c.ref?.type === "relique" && c.ref.id === NOBLE));

// Carte de remplaçant que désigne un composant : elle-même, ou la carte qui porte ce cube
export const carteRemplacant = (etat, c) => {
    const carte = c && !c.ref && c.sur ? etat.composants[c.sur] : c;
    return estCarteRemplacant(carte) ? carte : null;
};

const AGENTS_MACRO = {
    log: /logisticien|g[ée]n[ée]ticien/i,
    scien: /scientifique/i,
    neg: /n[ée]gociant/i,
    diplo: /diplomate/i,
    pol: /politique/i,
    amiral: /amiral/i,
};

// Le texte de la carte dit-il « utilisable comme » ce type d'agent ? (null : texte inconnu)
export function remplaceType(carte, nomType) {

    if (carte.ref.type === "relique") {
        return true;
    }

    const usage = contenuEnCache(carte.ref.id)?.usage;

    if (typeof usage !== "string") {
        return null;
    }

    return usage.split(/<[^>]+>|\./)
        .filter(phrase => /comme/i.test(phrase))
        .flatMap(phrase => [...phrase.matchAll(/#(log|scien|neg|diplo|pol|amiral)\b/gi)].map(m => m[1].toLowerCase()))
        .some(macro => AGENTS_MACRO[macro].test(nomType));
}

// Remplaçants disponibles (non usés) du joueur pour un type d'agent — test(nom du type) -> vrai
export function remplacantsDisponibles({ index, moi, search }, test) {

    const actifs = index.parZone.get(`joueur:${moi}:actif`) || [];
    const enService = id => !connexion || connexion.moi !== moi || connexion.aScript(moi, id);

    const cartes = actifs.filter(c => estCarteRemplacant(c) && c.marques?.comme && !carteUsee(index, c) &&
        (c.ref.type !== "relique" || enService("noble-cryogenise")) &&
        test(nomElement(search, { type: "agent", id: Number(c.marques.comme) })));

    // Héritier : politique si son joueur possède Mecatol Rex, amiral sinon
    const role = actifs.some(c => !c.cache && c.ref?.type === "planet" && c.ref.id === 34) ? "Politique" : "Amiral";

    const heritiers = enService("heritier") && test(role)
        ? (index.parZone.get(`joueur:${moi}:agents`) || []).filter(c => c.ref?.type === "agent" && c.ref.id === HERITIER).slice(0, 1)
        : [];

    return [...cartes, ...heritiers];
}

// Actions pour lesquelles le joueur a déjà répondu « l'agent de base » : la question
// n'est pas reposée si le coup repasse par choisirRemplacants (fouille d'une ruine,
// qui résout le choix avant d'envoyer pour savoir si Ahk Ravin fouille)
const decides = new WeakSet();

// À l'envoi d'un coup : qui agit, l'agent de base ou un remplaçant ?
// (asynchrone : le choix est une décision du joueur, onglet Décision)
export async function choisirRemplacants(actions) {

    const liste = (Array.isArray(actions) ? actions : [actions]).filter(Boolean);

    if (!connexion?.etat) {
        return liste;
    }

    const { etat, index, moi, search } = connexion;
    const stock = `joueur:${moi}:agents`;
    const uses = `joueur:${moi}:agentsUses`;
    const pris = new Set();
    const messages = [];

    // Ce que devient l'action quand c'est ce remplaçant qui agit
    const pour = (r, use) => {

        pris.add(r.id);

        const nom = nomElement(search, r.ref);

        if (r.ref.type === "agent") {

            if (use) {
                return [{ type: "deplacer", c: r.id, vers: uses }];
            }

            const retour = etat.tour + 2;

            if (retour > turnNumber) {
                return [{ type: "supprimer", c: r.id }];
            }

            messages.push(`${nom} dépensé : il reviendra au tour ${retour} (case du tour ${retour} de votre feuille).`);

            return [{ type: "deplacer", c: r.id, vers: `joueur:${moi}:tour:${retour}` }];
        }

        if (r.ref.type === "relique") {

            if (!use) {
                messages.push(`${nom} : usé au lieu d'être dépensé.`);
            }

            return actionsUserCarte(index, moi, r);
        }

        if (use) {
            return actionsUserCarte(index, moi, r);
        }

        messages.push(`${nom} (mercenaire) est dépensé : sa carte est retirée du jeu.`);

        const cube = cubeDeMercenaire(index, r);

        return [cube && { type: "supprimer", c: cube.id }, { type: "supprimer", c: r.id }].filter(Boolean);
    };

    const precision = (r, use) => (r.ref.type === "agent"
        ? (use ? "" : " — il reviendra dans 2 tours")
        : (r.ref.type === "relique"
            ? (use ? " (relique)" : " (relique : usé au lieu d'être dépensé)")
            : (use ? " (mercenaire)" : " (mercenaire : sa carte sera retirée du jeu)")));

    // Ce que devient une action du coup
    const traduire = async action => {

        const c = etat.composants[action.c];
        const use = action.type === "deplacer" && action.vers === uses;
        const depense = action.type === "supprimer";

        if (!c || c.cache || !(use || depense) || pris.has(c.id) || decides.has(action)) {
            return [action];
        }

        // Un remplaçant visé directement (rendu par agentDisponible faute d'agent, ou
        // utilisé depuis le cube à zéro de la réserve)
        if (estCarteRemplacant(c) && c.marques?.comme && c.zone === `joueur:${moi}:actif`) {
            return pour(c, use);
        }

        if (c.ref?.type === "agent" && c.ref.id === HERITIER && c.zone === stock && connexion.aScript(moi, "heritier")) {
            return depense ? pour(c, false) : [action];
        }

        // Un de mes agents disponibles : un remplaçant de son type peut agir à sa place
        if (c.ref?.type !== "agent" || c.zone !== stock) {
            return [action];
        }

        const type = nomElement(search, c.ref);

        const candidats = remplacantsDisponibles({ index, moi, search }, nom => nom.toLowerCase() === type.toLowerCase())
            .filter(r => !pris.has(r.id));

        if (!candidats.length) {
            return [action];
        }

        const reponse = await demander({
            titre: `${type} à ${use ? "utiliser" : "dépenser"}`,
            texte: "Qui agit ?",
            choix: [
                { valeur: 1, libelle: `${type} (agent de base)` },
                ...candidats.map((r, k) => ({ valeur: k + 2, libelle: `${nomElement(search, r.ref)}${precision(r, use)}` })),
            ],
            renoncer: false,
        });

        const choisi = candidats[Math.floor(Number(reponse)) - 2];

        if (!choisi) {
            decides.add(action);
            return [action];
        }

        return pour(choisi, use);
    };

    const resultat = [];

    for (const action of liste) {
        resultat.push(...await traduire(action));
    }

    if (messages.length) {
        connexion.aviser?.(messages.join(" "));
    }

    return resultat;
}

// Mercenaires (identifiants de carte) qui agissent comme agent dans ces actions, une fois passées
// par choisirRemplacants : leur cube part dans les agents usés (marque « carte »). Sert aux
// mercenaires dont l'effet dépend de ce pour quoi on les utilise (Farran, Trillossa…).
export function mercenairesQuiAgissent(actions) {

    const composants = connexion?.etat?.composants;

    if (!composants) {
        return [];
    }

    return (Array.isArray(actions) ? actions : [actions]).filter(Boolean)
        .map(a => (a.type === "marquer" && a.marque === "carte" ? a.valeur : (a.type === "creer" ? a.marques?.carte : null)))
        .map(id => composants[id])
        .filter(c => c?.ref?.type === "mercenaire")
        .map(c => c.ref.id);
}

// Carte de ce mercenaire s'il est disponible comme remplaçant d'un agent de ce type (son cube
// est sur sa carte, elle-même posée sur ce type d'agent) ; null sinon. motif : expression
// régulière du nom de l'agent.
export function mercenaireDisponible({ index, moi, search }, idMercenaire, motif) {

    const test = new RegExp(motif, "i");

    return remplacantsDisponibles({ index, moi, search }, nom => test.test(nom))
        .find(c => c.ref.type === "mercenaire" && c.ref.id === idMercenaire) || null;
}

// Agent disponible (non usé) du joueur dont le nom contient `nom`, ou null. Faute
// d'agent de ce type, un remplaçant (sauf sansRemplacant : l'agent sera posé quelque part)
export function agentDisponible({ index, moi, search }, nom, { sansRemplacant = false } = {}) {

    const motif = new RegExp(nom, "i");
    const agents = (index.parZone.get(`joueur:${moi}:agents`) || []).filter(c => c.ref);
    const trouve = agents.find(c => motif.test(nomElement(search, c.ref))) || null;

    if (trouve) {
        // (un négociant demandé pour lui-même n'est pas une substitution)
        substitutions.delete(trouve.id);
        return trouve;
    }

    const remplacant = sansRemplacant
        ? null
        : remplacantsDisponibles({ index, moi, search }, type => motif.test(type))[0];

    if (remplacant) {
        return remplacant;
    }

    const negociant = connexion?.moi === moi && connexion.aScript(moi, "connexion")
        ? agents.find(c => /n[ée]gociant/i.test(nomElement(search, c.ref)))
        : null;

    if (negociant) {
        substitutions.set(negociant.id, nom);
    }

    return negociant || null;
}

// Couleur d'un cube : celle de l'agent, noir pour un cube mercenaire (■),
// blanc pour un cube plan de relique (□). null si ce n'est pas un cube.
function couleurCube(c, agent) {

    if (c.ref?.type === "agent") {
        return agent?.color || "#999";
    }

    if (!c.ref && c.jeton?.startsWith("■")) {
        return "#000";
    }

    if (!c.ref && c.jeton?.startsWith("□")) {
        return "#fff";
    }

    return null;
}

// Miniatures d'unité : copies des images de public/ti/unit_icon recadrées
// sur la silhouette (public/ti/unit_mini, mêmes noms). Largeur et hauteur de
// chaque copie, en pixels : la miniature garde l'échelle de l'image d'origine
// (un croiseur reste plus long qu'une frégate), sans marge autour.
const MINIS = {
    com: [240, 176], cruiser: [585, 187], dest: [355, 185], dn: [589, 218], dock: [251, 206],
    fs: [434, 151], inf: [212, 235], mech: [199, 213], mon: [278, 267], pds: [209, 222],
    sun: [650, 321], trans: [561, 194],
    // (image d'origine plus petite que les autres : ramenée à leur échelle)
    fact: [81 * 2.6, 96 * 2.6],
};

// Taille d'affichage de la miniature d'un type d'unité, ou null s'il n'en a pas
export function tailleMini(type, petit) {

    const taille = MINIS[type];

    if (!taille) {
        return null;
    }

    // Échelle de l'image d'origine (750 px de large), puis une hauteur minimale lisible
    const echelle = Math.max(petit ? 0.06 : 0.073, (petit ? 12 : 15) / taille[1]);

    return { width: Math.round(taille[0] * echelle), height: Math.round(taille[1] * echelle) };
}

// Cerne blanc d'une silhouette d'unité : un pixel plein dans les quatre directions, puis un léger
// halo — elle se détache du fond sombre de l'espace, quelle que soit la couleur du joueur (le
// noir compris). (À poser sur un élément qui englobe la silhouette masquée, pas sur elle.)
const CONTOUR_BLANC = "drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff) drop-shadow(0 0 1px #fff)";

// Marqueur de trêve : le token « Trêve » des données du jeu (reconnu à son
// nom, comme les agents)
const RE_TREVE = /^tr[eê]ve$/i;

export const tokenTreve = search =>
    search.find(e => e.type === "token" && RE_TREVE.test((e.name || "").trim())) || null;

export const estTreve = (c, search) => !!c && !c.cache &&
    c.ref?.type === "token" && c.ref.id === tokenTreve(search)?.id;

// Token (type « token » des données du jeu) en miniature : sa forme (rond
// ou triangle), sa couleur de fond et son image, sur un côté de `cote` px.
// bord : couleur du joueur qui l'a posé (liseré d'un token rond)
export function MiniToken({ contenu, cote = 22, bord }) {

    const triangle = contenu?.forme === "triangle";

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: triangle ? "flex-end" : "center",
                justifyContent: "center",
                flex: "none",
                width: cote,
                height: triangle ? cote * Math.sqrt(3) / 2 : cote,
                boxSizing: "border-box",
                overflow: "hidden",
                backgroundColor: contenu?.couleur || "#fff",
                ...(triangle
                    ? { clipPath: "polygon(50% 0, 100% 100%, 0 100%)", filter: "drop-shadow(0 0 1px #000)" }
                    : { borderRadius: "50%", border: bord ? "2px solid " + bord : "1px solid #444" }),
            }}
        >
            {contenu?.img && (
                <img
                    src={encodeURI(pub + contenu.img)}
                    alt=""
                    draggable={false}
                    style={{
                        width: triangle ? "50%" : "88%",
                        height: triangle ? "50%" : "88%",
                        marginBottom: triangle ? "8%" : 0,
                        objectFit: "contain",
                        pointerEvents: "none",
                    }}
                />
            )}
        </span>
    );
}

// Coque d'un pion sans cadre (cube, marqueur, jeton, token, unité) : les
// attributs que lit le glisser-déposer (data-composant, data-groupe, data-nom)
// et l'info-bulle, autour de sa figure. `style` ne dit que ce qui change.
function CoquePion({ c, groupe, nom, titre, agentType, style, children }) {
    return (
        <span
            data-composant={c.id}
            data-groupe={groupe.map(x => x.id).join(",")}
            data-nom={nom}
            data-agent-type={agentType}
            title={titre}
            style={{ ...stylePion, padding: 0, border: "none", backgroundColor: "transparent", gap: 1, ...style }}
        >
            {children}
        </span>
    );
}

function Pion({ groupe, petit }) {

    const { search, jeu, couleurDe, nomDe, factionDe, index, jouer, joueur, ouvrirCachee, etat } = useEngine();

    const c = groupe[groupe.length - 1];
    const n = groupe.length;
    const taille = petit ? { fontSize: 10, padding: "0 3px", borderWidth: 1.5 } : {};

    // Contenu de l'élément : couleur d'un agent (affiché comme un cube),
    // type d'une unité (icône de public/ti/unit_icon).
    //                       logo de la faction pour un marqueur de joueur.
    const typeRef = c.cache ? null : c.ref?.type;
    const faveur = !c.cache && !c.ref && c.jeton === FAVEUR;
    const marqueur = !c.cache && !c.ref && (c.jeton === MARQUEUR || faveur);

    let idContenu = -1;

    // Faveur obtenue d'une faction neutre : sans propriétaire, elle porte
    // l'identifiant de la faction neutre (marques.neutre)
    const neutre = faveur && (c.proprio === null || c.proprio === undefined)
        ? Number(c.marques?.neutre) || null
        : null;

    if (typeRef === "agent" || typeRef === "unit" || typeRef === "token") {
        idContenu = c.ref.id;
    } else if (neutre) {
        idContenu = neutre;
    } else if (marqueur) {
        idContenu = factionDe(c.proprio) ?? -1;
    }

    const contenu = useElement(idContenu);
    const agent = typeRef === "agent" ? contenu : null;

    const typeUnite = typeRef === "unit" ? typeDeUnite(contenu) : null;

    // Unité qui n'est pas sur la fiche de faction de son joueur (mercenaire,
    // unité créée par une relique, unité spéciale) : liseré doré
    const detenteur = typeRef === "unit" ? (c.marques?.possession ?? c.proprio) : null;
    const fiche = useElement(detenteur ? (factionDe(detenteur) ?? -1) : -1);
    const horsFiche = !!fiche?.units && !fiche.units.some(lien => lien?.id === c.ref?.id);

    // Composant dont on ne voit que le dos
    if (c.cache) {

        // Dans une zone publique, un Ctrl + clic retourne la carte face visible
        const revelable = joueur && joueurDeMain(c.zone) === null && !estPioche(c.zone);

        return (
            <span
                title={revelable
                    ? "Face cachée : clic pour consulter ou révéler, Ctrl + clic pour révéler"
                    : "Contenu caché"}
                onClick={revelable
                    ? event => (event.ctrlKey
                        ? jouer({ type: "reveler", zone: c.zone })
                        : ouvrirCachee(c.zone))
                    : undefined}
                style={{
                    ...stylePion,
                    ...taille,
                    cursor: revelable ? "pointer" : "default",
                    backgroundColor: "#444",
                    color: "#fff",
                    borderColor: couleurDe(c.proprio) || "#222",
                }}
            >
                🂠 {nomType(jeu, c.dos)}{n > 1 && <b>×{n}</b>}
            </span>
        );
    }

    // (cube noir d'un mercenaire utilisé : le nom du mercenaire, marque « carte »)
    const carteDuCube = !c.ref && c.jeton === CUBE_MERCENAIRE ? etat.composants[c.marques?.carte] : null;

    const nom = c.ref
        ? nomElement(search, c.ref)
        : (carteDuCube?.ref ? `${c.jeton} : ${nomElement(search, carteDuCube.ref)} (utilisé)` : c.jeton);

    const portes = index.parPorteur.get(c.id) || [];
    const degat = Number(c.marques?.degat) || 0;
    const cube = couleurCube(c, agent);
    const dette = !c.ref && c.jeton === DETTE;

    // Pastille du nombre d'éléments d'un groupe
    const badge = {
        padding: "0 3px",
        borderRadius: 6,
        backgroundColor: "#fff",
        color: "#000",
        fontSize: petit ? 9 : 11,
    };

    // Agents et cubes du sac : un cube de couleur, le nom en info-bulle
    if (cube) {

        const cote = petit ? 12 : 18;

        return (
            <CoquePion
                c={c}
                groupe={groupe}
                nom={nom}
                agentType={typeRef === "agent" ? c.ref.id : undefined}
                titre={nom + (n > 1 ? ` ×${n}` : "")}
                style={{ opacity: c.marques?.use ? 0.5 : 1 }}
            >
                <span
                    style={{
                        display: "inline-block",
                        width: cote,
                        height: cote,
                        boxSizing: "border-box",
                        backgroundColor: cube,
                        border: "2px solid " + (couleurDe(c.marques?.possession ?? c.proprio) || "#222"),
                        borderRadius: 3,
                        boxShadow: "0 0 0 1px #fff8",
                    }}
                />
                {n > 1 && <b style={badge}>{n}</b>}
            </CoquePion>
        );
    }

    // Marqueur de joueur : un carré de sa couleur avec le logo de sa faction
    if (marqueur) {

        // Une faveur est un triangle, un marqueur un carré
        const cote = faveur ? (petit ? 20 : 28) : (petit ? 16 : 22);
        const titre = (faveur ? "Faveur de " : "Marqueur de ") +
            (neutre ? (contenu?.name || "faction neutre") : nomDe(c.proprio));
        const fond = neutre ? contenu?.color || "#9e9e9e" : couleurDe(c.proprio) || "#888";

        return (
            <CoquePion c={c} groupe={groupe} nom={titre} titre={titre + (n > 1 ? ` ×${n}` : "")}>
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: cote,
                        height: cote,
                        boxSizing: "border-box",
                        backgroundColor: fond,
                        ...(faveur
                            ? {
                                clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                                alignItems: "flex-end",
                                filter: "drop-shadow(0 0 1px #000)",
                            }
                            : {
                                border: "1px solid #fff",
                                outline: "1px solid #000",
                                borderRadius: 3,
                            }),
                    }}
                >
                    {contenu?.logo && (
                        <img
                            src={encodeURI(pub + contenu.logo)}
                            alt=""
                            draggable={false}
                            style={{
                                width: faveur ? "52%" : "82%",
                                height: faveur ? "52%" : "82%",
                                marginBottom: faveur ? 1 : 0,
                                objectFit: "contain",
                                pointerEvents: "none",
                            }}
                        />
                    )}
                </span>
                {n > 1 && <b style={badge}>{n}</b>}
            </CoquePion>
        );
    }

    // Marqueur libre : une étiquette de sa couleur portant son texte
    // (raccourci sur la carte ; le texte entier en info-bulle)
    if (!c.ref && c.jeton === LIBRE) {

        const texte = String(c.marques?.texte ?? "");
        const fond = c.marques?.couleur || COULEUR_LIBRE;
        const sombre = /^#([0-9a-f]{6})$/i.test(fond) &&
            parseInt(fond.slice(1, 3), 16) * 0.3 + parseInt(fond.slice(3, 5), 16) * 0.59 + parseInt(fond.slice(5, 7), 16) * 0.11 < 128;

        return (
            <span
                data-composant={c.id}
                data-groupe={groupe.map(x => x.id).join(",")}
                data-nom={texte || "Marqueur libre"}
                title={(texte || "Marqueur libre (sans texte)") +
                    (c.proprio ? ` — ${nomDe(c.proprio)}` : "") + " — clic : modifier"}
                style={{
                    ...stylePion,
                    ...taille,
                    display: "inline-block",
                    maxWidth: petit ? 70 : 170,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    backgroundColor: fond,
                    color: sombre ? "#fff" : "#000",
                    borderColor: couleurDe(c.proprio) || "#444",
                    borderRadius: 4,
                    fontWeight: "bold",
                    cursor: "pointer",
                }}
            >
                {texte || "✎"}
                {n > 1 && <b> ×{n}</b>}
            </span>
        );
    }

    // Jeton de ressource, d'influence ou de commerce : son icône portant le montant
    const ressource = ressourceDe(c);

    if (ressource) {

        const montant = Number(c.marques?.montant) || 0;
        const titre = `${nom} : ${montant}` + (c.proprio ? ` (${nomDe(c.proprio)})` : "");

        return (
            <CoquePion c={c} groupe={groupe} nom={`${nom} ${montant}`} titre={titre + (n > 1 ? ` ×${n}` : "")}>
                <IconeRessource ressource={ressource} n={montant} cote={petit ? 18 : 24} />
                {n > 1 && <b style={badge}>×{n}</b>}
            </CoquePion>
        );
    }

    // Token (données du jeu) : sa forme en miniature, suivie du nom hors de la carte
    if (typeRef === "token") {
        return (
            <CoquePion
                c={c}
                groupe={groupe}
                nom={nom}
                titre={nom + (n > 1 ? ` ×${n}` : "") + (c.proprio ? ` — ${nomDe(c.proprio)}` : "")}
                style={{ padding: "0 3px", gap: 4 }}
            >
                <MiniToken contenu={contenu} cote={petit ? 18 : 24} bord={couleurDe(c.proprio)} />
                {!petit && <span style={{ fontSize: 11 }}>{nom}</span>}
                {n > 1 && <b style={badge}>{n}</b>}
            </CoquePion>
        );
    }

    // Marqueur d'activation : un carré noir neutre (« R » sur une ruine).
    // Fragment de relique : l'icône de son type.
    const activation = !c.ref && c.jeton === ACTIVATION;

    if (activation || estFragment(c)) {

        const cote = activation ? (petit ? 13 : 18) : (petit ? 18 : 24);
        const titre = activation
            ? "Marqueur d'activation" + (c.marques?.ruine ? " (ruine)" : "")
            : nom;

        return (
            <CoquePion
                c={c}
                groupe={groupe}
                nom={titre}
                titre={titre + (n > 1 ? ` ×${n}` : "")}
                style={activation ? undefined : { padding: "0 3px", gap: 4 }}
            >
                {activation ? (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: cote,
                            height: cote,
                            boxSizing: "border-box",
                            backgroundColor: "#000",
                            border: "1.5px solid #fff",
                            outline: "1px solid #000",
                            borderRadius: 3,
                            color: "#fff",
                            fontSize: petit ? 8 : 11,
                            fontWeight: "bold",
                        }}
                    >
                        {c.marques?.ruine ? "R" : ""}
                    </span>
                ) : (
                    <img
                        src={encodeURI(pub + ICONES_FRAGMENT[c.jeton])}
                        alt=""
                        draggable={false}
                        style={{ width: cote, height: cote, objectFit: "contain", pointerEvents: "none" }}
                    />
                )}
                {n > 1 && <b style={badge}>{n}</b>}
            </CoquePion>
        );
    }

    // Unité : la silhouette de son type, sans cadre, à la couleur du joueur
    // (gris clair pour une unité sans propriétaire). Sur la carte (petit),
    // la silhouette seule ; ailleurs, suivie du nom.
    if (typeUnite) {

        // Miniature recadrée au plus juste (unit_mini) ; à défaut, l'image
        // d'origine, agrandie dans un cadre fixe
        const mini = tailleMini(typeUnite, petit);
        const icone = `url("${pub}/ti/${mini ? "unit_mini" : "unit_icon"}/${typeUnite}.png")`;

        return (
            <CoquePion
                c={c}
                groupe={groupe}
                nom={nom}
                titre={nom + (n > 1 ? ` ×${n}` : "") +
                    // Le propriétaire est dit en toutes lettres, pas seulement par la couleur
                    (detenteur ? ` — ${nomDe(detenteur)}` : " — neutre") +
                    (degat > 0 ? ` — ${degat} dégât(s)` : (degat < 0 ? ` — ${-degat} de résistance en plus` : "")) +
                    (horsFiche ? " — hors fiche de faction" : "") +
                    (n > 1 ? " — Ctrl + glisser : tout le groupe" : "")}
                style={{ gap: 2, opacity: c.marques?.use ? 0.5 : 1 }}
            >
                {/* L'infanterie est un simple petit rond : son icône (l'étendard)
                    sert de marqueur de possession des planètes. */}
                {typeUnite === "inf" ? (
                    <span
                        style={{
                            display: "inline-block",
                            width: petit ? 13 : 16,
                            height: petit ? 13 : 16,
                            boxSizing: "border-box",
                            borderRadius: "50%",
                            backgroundColor: couleurDe(c.marques?.possession ?? c.proprio) || "#c8c8c8",
                            border: horsFiche ? "2px solid " + DORE : "2px solid #fff",
                            outline: "1px solid #000",
                        }}
                    />
                ) : (
                // Cerne clair : lisible sur le fond sombre de l'espace (doré pour une unité hors
                // fiche de faction). Le filtre est sur un élément englobant : posé sur la
                // silhouette elle-même, son masque le rognerait et le cerne ne se verrait pas.
                <span
                    data-cerne
                    style={{
                        display: "inline-block",
                        lineHeight: 0,
                        filter: horsFiche
                            ? `drop-shadow(0 0 1px ${DORE}) drop-shadow(0 0 1px ${DORE}) drop-shadow(0 0 2px ${DORE})`
                            : CONTOUR_BLANC,
                    }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            width: mini ? mini.width : (petit ? 36 : 44),
                            height: mini ? mini.height : (petit ? 24 : 29),
                            backgroundColor: couleurDe(c.marques?.possession ?? c.proprio) || "#c8c8c8",
                            WebkitMaskImage: icone,
                            maskImage: icone,
                            WebkitMaskSize: mini ? "100% 100%" : "125%",
                            maskSize: mini ? "100% 100%" : "125%",
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                        }}
                    />
                </span>
                )}
                {/* Hors de la carte : le logo de la faction à laquelle l'unité est liée, puis son nom */}
                {!petit && <LogoFaction id={c.ref.id} />}
                {!petit && <span style={{ fontSize: 11 }}>{nom}</span>}
                {degat > 0 && <b style={{ ...badge, color: "#c00" }}>✹{degat}</b>}
                {/* (résistance au-delà du maximum : Graine d'eden) */}
                {degat < 0 && <b style={{ ...badge, color: "#2e7d32" }}>+{-degat}</b>}
                {n > 1 && <b style={badge}>{n}</b>}
                <Portes liste={portes} />
            </CoquePion>
        );
    }

    return (
        <span
            data-composant={c.id}
            data-groupe={groupe.map(x => x.id).join(",")}
            data-nom={nom}
            title={nom + (n > 1 ? ` ×${n}` : "") + (degat > 0 ? ` — ${degat} dégât(s)` : (degat < 0 ? ` — ${-degat} de résistance en plus` : ""))}
            style={{
                ...stylePion,
                ...taille,
                borderColor: couleurDe(c.marques?.possession ?? c.proprio) || "#666",
                opacity: c.marques?.use ? 0.5 : 1,
                fontStyle: c.face === "verso" ? "italic" : "normal",
                ...(dette
                    ? { backgroundColor: "#fde0e0", borderColor: "#c00", borderStyle: "dashed", fontWeight: "bold" }
                    : {}),
            }}
        >
            {c.face === "cache" && "🂠 "}
            {c.ref && <LogoFaction id={c.ref.id} cote={petit ? 10 : 14} />}
            {dette ? `Dette ${Number(c.marques?.montant) || 0}` : nom}
            {c.face === "verso" && " ↺"}
            {degat > 0 && <b style={{ color: "#c00" }}>✹{degat}</b>}
            {degat < 0 && <b style={{ color: "#2e7d32" }}>+{-degat}</b>}
            {n > 1 && <b>×{n}</b>}
            {/* Une dette porte le marqueur du créancier, affiché tel quel */}
            {dette
                ? grouper(portes, index).map(g => <Pion key={g[0].id} groupe={g} petit />)
                : <Portes liste={portes} />}
        </span>
    );
}

// Logo de la faction (ou faction neutre) à laquelle un élément est lié (type
// de lien, Component/TypeLien.jsx), devant son nom quand il est affiché en
// nom dans un cadre (pion, source). Rien pour un élément commun.
const TYPES_LIEN_FACTION = ["faction", "neutre"];

function LogoFaction({ id, cote = 14 }) {

    const contenu = useElement(id ?? -1);

    const lie = TYPES_LIEN_FACTION.includes(contenu?.lienType) && Number(contenu.lienElement?.id) > 0
        ? Number(contenu.lienElement.id)
        : -1;

    const faction = useElement(lie);

    const style = { width: cote, height: cote, objectFit: "contain", flexShrink: 0, pointerEvents: "none" };

    // Mêmes icônes que l'affichage « nom » des données (Component/Nom.jsx) :
    // lié à un mercenaire, l'icône des mercenaires ; une feuille de
    // technologie, son propre logo
    if (contenu?.lienType === "mercenaire") {
        return <img src={encodeURI(pub + ICONE_MERCENAIRE)} alt="" title="Mercenaire" draggable={false} style={style} />;
    }

    if (contenu?.techs && contenu.logo && contenu.logo !== "/404.jpeg") {
        return <img src={encodeURI(pub + contenu.logo)} alt="" draggable={false} style={style} />;
    }

    if (!faction?.logo || faction.logo === "/404.jpeg") {
        return null;
    }

    return (
        <img
            src={encodeURI(pub + faction.logo)}
            alt=""
            title={faction.name}
            draggable={false}
            style={style}
        />
    );
}

// Unités transportées par un pion : dans une capsule jaune, bien visible
function Portes({ liste }) {

    const { index } = useEngine();

    if (!liste.length) {
        return null;
    }

    return (
        <span
            title="Transporté"
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                padding: "0 3px 0 2px",
                border: "2px solid #ffd54a",
                borderRadius: 8,
                backgroundColor: "#000c",
            }}
        >
            <span style={{ color: "#ffd54a", fontSize: 11, fontWeight: "bold" }}>⤵</span>

            {grouper(liste, index).map(g => (
                <Pion key={g[0].id} groupe={g} petit />
            ))}
        </span>
    );
}

// Dos d'une carte qu'on ne voit pas : le verso de son type. Dans une zone
// publique (case du déroulé), un Ctrl + clic la retourne face visible.
// verso : champs du contenu dont dépend le dos (filtrerEtat, etat.js), par
// exemple { type: "maj" } pour un événement majeur
export function Dos({ type, zoom, zone, verso }) {

    const { jeu, jouer, joueur, ouvrirCachee } = useEngine();

    const handler = getHandler(jeu, type);
    const Verso = handler.display.verso;

    const cleVerso = JSON.stringify(verso || {});

    const contenu = useMemo(
        () => Object.assign(new handler.classe(), JSON.parse(cleVerso)),
        [handler, cleVerso]
    );

    const revelable = joueur && joueurDeMain(zone) === null && !estPioche(zone);

    return (
        <span
            title={revelable
                ? "Carte face cachée : clic pour la consulter ou la révéler, Ctrl + clic pour la révéler"
                : "Carte cachée"}
            onClick={revelable
                ? event => (event.ctrlKey ? jouer({ type: "reveler", zone }) : ouvrirCachee(zone))
                : undefined}
            style={{
                display: "inline-block",
                verticalAlign: "top",
                margin: 2,
                zoom,
                cursor: revelable ? "pointer" : "default",
                userSelect: "none",
            }}
        >
            <span style={{ display: "block", pointerEvents: "none" }}>
                <Verso content={contenu} />
            </span>
        </span>
    );
}

// Les pions d'une zone
// separes : un pion par composant, sans regrouper les identiques
export function Pions({ zone, filtre, petit, separes }) {

    const { index } = useEngine();

    let liste = index.parZone.get(zone) || [];

    if (filtre) {
        liste = liste.filter(filtre);
    }

    const groupes = separes ? liste.map(c => [c]) : grouper(liste, index);

    return groupes.map(g => (
        <Pion key={g[0].id} groupe={g} petit={petit} />
    ));
}

// Source d'une unité illimitée (infanterie) : on ne compte pas ces unités,
// on glisse la source vers la carte pour en créer une.
//
// Avec `jeton` au lieu de `lien`, la source crée un jeton : le marqueur de
// faction du joueur, ou (neutre) le marqueur d'activation noir.
export function Source({ lien, jeton, neutre, libelle, couleur }) {

    const { search, couleurDe, moi } = useEngine();

    const contenu = useElement(lien?.id ?? -1);
    const nom = jeton ? libelle || jeton : nomElement(search, lien);

    if (jeton) {
        return (
            <span
                data-source={JSON.stringify({ jeton, neutre: !!neutre })}
                data-nom={nom}
                title={nom + " : illimité. Glisser pour en poser un."}
                style={{
                    ...stylePion,
                    borderStyle: "dashed",
                    borderColor: neutre ? "#000" : couleurDe(moi) || "#666",
                }}
            >
                {/* Fragment de relique : l'icône de son type */}
                {estFragment({ jeton }) ? (
                    <img
                        src={encodeURI(pub + ICONES_FRAGMENT[jeton])}
                        alt=""
                        draggable={false}
                        style={{ width: 18, height: 18, objectFit: "contain", pointerEvents: "none" }}
                    />
                ) : (
                    <span
                        style={{
                            display: "inline-block",
                            width: 14,
                            height: 14,
                            boxSizing: "border-box",
                            borderRadius: 3,
                            backgroundColor: couleur || (neutre ? "#000" : couleurDe(moi) || "#888"),
                            border: "1.5px solid " + (couleur ? couleurDe(moi) || "#2e7d32" : "#fff"),
                            outline: "1px solid #000",
                        }}
                    />
                )}
                ∞ {nom}
            </span>
        );
    }

    // neutre : l'unité créée n'a pas de propriétaire (réserve des unités neutres)
    const teinte = neutre ? "#9e9e9e" : couleurDe(moi);

    return (
        <span
            data-source={JSON.stringify({ type: lien.type || "unit", id: lien.id, ...(neutre ? { neutre: true } : {}) })}
            data-nom={nom}
            title={(lien.type || "unit") === "unit"
                ? nom + (neutre ? " (neutre)" : "") + " : illimité. Glisser pour en poser une."
                : nom + " : illimité. Glisser pour en poser un."}
            style={{
                ...stylePion,
                borderStyle: "dashed",
                borderColor: teinte || "#666",
            }}
        >
            {lien.type === "token" && <MiniToken contenu={contenu} cote={18} />}
            {typeDeUnite(contenu) === "inf" && (
                <span
                    style={{
                        display: "inline-block",
                        width: 13,
                        height: 13,
                        boxSizing: "border-box",
                        borderRadius: "50%",
                        backgroundColor: teinte || "#c8c8c8",
                        border: "1.5px solid #fff",
                        outline: "1px solid #000",
                    }}
                />
            )}
            <LogoFaction id={lien.id} />
            ∞ {nom}
        </span>
    );
}

// Une carte affichée en entier (main). Le contenu ne capte pas la souris :
// un clic ou un glisser vise toujours la carte, jamais un lien de son texte.
function Carte({ c, zoom }) {

    const { search, jeu, index } = useEngine();

    const nom = nomElement(search, c.ref);
    const verso = c.face === "verso" && getHandler(jeu, c.ref.type)?.display?.verso;

    // Unité mercenaire : affichage « merc » (son verso : « mercVerso »)
    const merc = c.ref.type === "unit" && estMercenaire(c);
    const displayeur = merc ? (c.face === "verso" ? "mercVerso" : "merc") : verso ? "verso" : undefined;

    // Ce qui est posé sur la carte : marqueurs de faction, cube de mercenaire
    const portes = index.parPorteur.get(c.id) || [];

    return (
        <span
            data-composant={c.id}
            data-groupe={c.id}
            data-nom={nom}
            title={nom}
            style={{
                display: "inline-block",
                position: "relative",
                verticalAlign: "top",
                margin: 2,
                zoom,
                cursor: "grab",
                userSelect: "none",
                touchAction: "none",
                opacity: c.marques?.use ? 0.5 : 1,
            }}
        >
            <span style={{ display: "block", pointerEvents: "none" }}>
                <LoadAndDisplay link={c.ref} displayeur={displayeur} />
            </span>

            {/* Pions posés sur la carte, à taille constante quel que soit le zoom */}
            {portes.length > 0 && (
                <span
                    style={{
                        position: "absolute",
                        right: 3,
                        top: 3,
                        zoom: 1 / zoom,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        gap: 2,
                        maxWidth: "92%",
                    }}
                >
                    {grouper(portes, index).map(g => (
                        <Pion key={g[0].id} groupe={g} />
                    ))}
                </span>
            )}
        </span>
    );
}

// Les cartes d'une zone, affichées en entier. Ce qu'on ne voit pas
// (main d'un autre joueur) et les jetons restent des pions.
// zoom : un nombre, ou une fonction du nombre de cartes de la zone
// separes : un pion par composant pour ce qui n'est pas une carte
export function Cartes({ zone, zoom = 1, separes }) {

    const { index, jeu } = useEngine();

    const liste = index.parZone.get(zone) || [];
    const echelle = typeof zoom === "function" ? zoom(liste.length) : zoom;

    // Carte cachée dont le type a un verso : on montre son dos
    const aUnDos = c => c.cache && !!getHandler(jeu, c.dos)?.display?.verso;

    // Contenu des unités, pour reconnaître une unité mercenaire
    useElements(liste.filter(c => !c.cache && c.ref?.type === "unit").map(c => c.ref.id));

    // Agents et unités restent des pions (cubes, silhouettes) ; une unité
    // mercenaire est une carte, hors de la carte du jeu
    const estCarte = c => !c.cache && c.ref && c.ref.type !== "agent" && c.ref.type !== "token" &&
        (c.ref.type !== "unit" || estMercenaire(c));

    const visibles = liste.filter(estCarte);
    const dos = liste.filter(aUnDos);
    const autres = liste.filter(c => !estCarte(c) && !aUnDos(c));
    const pions = separes ? autres.map(c => [c]) : grouper(autres, index);

    return (
        <>
            {visibles.map(c => (
                <Carte key={c.id} c={c} zoom={echelle} />
            ))}

            {dos.map(c => (
                <Dos key={c.id} type={c.dos} zoom={echelle} zone={zone} verso={c.verso} />
            ))}

            {pions.map(g => (
                <Pion key={g[0].id} groupe={g} />
            ))}
        </>
    );
}

// Fenêtre modale : un fond sombre fixe et, au milieu, un panneau blanc défilant.
//   fermer : un clic sur le fond l'appelle (un clic dans le panneau ne remonte
//            alors pas jusqu'au fond) ; sans lui, la fenêtre ne se ferme pas ainsi
//   fond   : couleur du fond ; style : ce qui change du panneau (largeur…)
//   role, titre : rôle et nom accessibles du panneau
export function Modale({ fermer, fond = "#0008", style, role, titre, children }) {

    // Une question est posée au joueur (onglet Décision) : la fenêtre s'efface
    // le temps de la réponse, sans perdre son contenu
    const masquee = (useEngine()?.decisions?.length || 0) > 0;

    return (
        <div
            onClick={fermer}
            data-modale={masquee ? "masquee" : "ouverte"}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: fond,
                display: masquee ? "none" : "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                role={role}
                aria-label={titre}
                onClick={fermer ? event => event.stopPropagation() : undefined}
                style={{
                    maxWidth: "92vw",
                    maxHeight: "85vh",
                    overflow: "auto",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                    ...style,
                }}
            >
                {children}
            </div>
        </div>
    );
}

// Sélecteur − / + : la valeur entre deux petits boutons.
//   moins, plus : { onClick, disabled, title } de chaque bouton
//   style : celui des deux boutons ; styleValeur : celui du nombre
export function Pas({ valeur, moins, plus, style, styleValeur }) {
    return (
        <>
            <button type="button" style={style} {...moins}>−</button>
            <b style={styleValeur}>{valeur}</b>
            <button type="button" style={style} {...plus}>+</button>
        </>
    );
}

// Une zone sous forme de boîte : titre, boutons, pions.
// cartes = zoom : affiche les cartes en entier au lieu de pions.
// repli = clé : la zone se replie (son titre reste une cible où déposer).
export function Zone({ zone, titre, filtre, style, cartes, repli, children, apres }) {

    const { index } = useEngine();

    const [ferme, basculer] = useRepli(repli);
    const replie = !!repli && ferme;

    const n = (index.parZone.get(zone) || []).filter(filtre || (() => true)).length;

    return (
        <div
            data-zone={zone}
            style={{
                minHeight: replie ? 0 : 46,
                padding: 6,
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
                color: "#000",
                boxSizing: "border-box",
                ...style,
                ...(replie ? { minHeight: 0 } : {}),
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 3,
                    fontWeight: "bold",
                    fontSize: 13,
                }}
            >
                <span>
                    {repli && <BoutonRepli ferme={ferme} basculer={basculer} />}
                    {titre}
                </span>
                <span style={{ fontWeight: "normal", color: "#666" }}>{n}</span>
                {!replie && children}
            </div>

            {!replie && (cartes
                ? <Cartes zone={zone} zoom={cartes} />
                : <Pions zone={zone} filtre={filtre} />)}

            {/* (apres : sous les pions — types d'agent à zéro et remplaçants, Remplacants.jsx) */}
            {!replie && apres}
        </div>
    );
}

// ============================================================
// EMPLACEMENTS DANS UN AFFICHAGE EXISTANT
//
// Cherche les éléments [data-emplacement] rendus par les
// enfants et y affiche (par portail) les pions de la zone
// correspondante. L'affichage lui-même n'est pas modifié.
// ============================================================

//
//   data-filtre="<id>"  sur l'emplacement : n'y affiche que les composants
//                       de cet élément (case d'un type d'agent)
//   cartes(zone)        retourne un zoom pour afficher les cartes en entier
//   separes(zone)       vrai pour afficher un pion par composant
//   extra(zone)         élément ajouté avant les pions (marqueur de possession)
//   filtrePions(zone)   retourne un filtre des composants à afficher en pions
//                       (une technologie posée sur une feuille s'affiche déjà
//                       comme une technologie imprimée)
export function Emplacements({ prefixe, stylePions, petit, cartes, separes, extra, filtrePions, children, style }) {

    const racine = useRef(null);
    // Emplacements trouvés : [{ noeud, zone, filtre }]
    const [cibles, setCibles] = useState([]);

    useEffect(() => {

        const chercher = () => {

            const trouvees = [...racine.current.querySelectorAll("[data-emplacement]")]
                .map(noeud => ({
                    noeud,
                    zone: trouverZone(noeud),
                    filtre: noeud.dataset.filtre,
                }));

            setCibles(precedent =>
                precedent.length === trouvees.length &&
                    precedent.every((c, i) =>
                        c.noeud === trouvees[i].noeud &&
                        c.zone === trouvees[i].zone &&
                        c.filtre === trouvees[i].filtre
                    )
                    ? precedent
                    : trouvees
            );
        };

        chercher();

        // Les affichages se chargent de façon asynchrone : un élément apparaît
        // d'abord vide, puis ses attributs changent quand son contenu arrive.
        const observateur = new MutationObserver(chercher);

        observateur.observe(racine.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-emplacement", "data-filtre", "data-case"],
        });

        return () => observateur.disconnect();

    }, []);

    return (
        <div ref={racine} data-prefixe={prefixe || undefined} style={style}>
            {children}

            {cibles.map(({ noeud, zone, filtre: filtreId }, i) => {
                const zoom = zone && cartes?.(zone);

                return zone && createPortal(
                    <span
                        data-portail={zone}
                        style={{
                            display: "inline-flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            ...stylePions?.(zone, noeud),
                        }}
                    >
                        {extra?.(zone)}

                        {zoom
                            ? <Cartes zone={zone} zoom={zoom} separes={!!separes?.(zone)} />
                            : (
                                <Pions
                                    zone={zone}
                                    petit={petit}
                                    separes={!!separes?.(zone)}
                                    filtre={filtreId
                                        ? c => String(c.ref?.id) === filtreId
                                        : filtrePions?.(zone)}
                                />
                            )}
                    </span>,
                    noeud,
                    // Une même zone peut avoir plusieurs emplacements (pages du déroulé)
                    zone + "#" + i
                );
            })}
        </div>
    );
}

// ============================================================
// DÉFILABLE : cliquer-glisser sur le fond pour se déplacer
//
// Sur un pion, le glisser déplace le pion (voir Plan). Ailleurs, il
// fait défiler le contenu (carte, feuille de faction, déroulé), et la
// page si le contenu ne défile pas en hauteur.
// ============================================================

export function Defilable({ children, style }) {

    const cadre = useRef(null);
    const depart = useRef(null);

    function onPointerDown(event) {

        if (
            event.button !== 0 ||
            // (data-sans-defilement : la carte ne défile pas pendant qu'on y trace un trajet)
            event.target.closest("[data-composant], [data-source], [data-sans-defilement], button, input, select, textarea, a")
        ) {
            return;
        }

        depart.current = {
            x: event.clientX,
            y: event.clientY,
            gauche: cadre.current.scrollLeft,
            haut: cadre.current.scrollTop,
            dernierY: event.clientY,
            actif: false,
        };
    }

    function onPointerMove(event) {

        const d = depart.current;

        if (!d) {
            return;
        }

        const dx = event.clientX - d.x;
        const dy = event.clientY - d.y;

        if (!d.actif) {

            if (Math.hypot(dx, dy) < SEUIL_GLISSER) {
                return;
            }

            // Capturé : le clic qui suit ne vise plus ce qui est sous la souris
            d.actif = true;
            cadre.current.setPointerCapture(event.pointerId);
        }

        const el = cadre.current;

        el.scrollLeft = d.gauche - dx;
        el.scrollTop = d.haut - dy;

        if (el.scrollHeight <= el.clientHeight) {
            window.scrollBy(0, d.dernierY - event.clientY);
        }

        d.dernierY = event.clientY;
    }

    function fin() {
        depart.current = null;
    }

    return (
        <div
            ref={cadre}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={fin}
            onPointerCancel={fin}
            style={{ overflow: "auto", cursor: "grab", ...style }}
        >
            {children}
        </div>
    );
}

// ============================================================
// PLAN : glisser un pion vers une zone
//
//   glisser            -> déplace un composant
//   Ctrl + glisser     -> déplace tout le groupe
//   Maj + déposer sur un pion -> le pose sur ce pion (transport)
//   clic               -> ouvre la fiche du composant
// ============================================================

const SEUIL_GLISSER = 5;

// Zones dont on range les éléments à la main (glisser l'un sur l'autre)
const ZONE_ORDONNABLE = /^(joueur:\d+:(main|actif)|general:table)$/;

// Marqueur libre, et carte qui peut en porter un (pas un agent ni une unité
// sur la carte du jeu ; une unité mercenaire est une carte)
const estLibre = c => !!c && !c.ref && c.jeton === LIBRE;
const estCarteCible = c => !!c?.ref && !c.cache && c.ref.type !== "agent" && c.ref.type !== "token" &&
    (c.ref.type !== "unit" || estMercenaire(c));

export function Plan({ children, style }) {

    const {
        etat, index, jouer, envoyer, ouvrirFiche, ouvrirLibre, joueur, moi, cliquer, production, setProduction, signaler,
        search, aScript, factionDe, connaissance, aviser, allerA,
    } = useEngine();

    const appui = useRef(null);
    const [glisser, setGlisser] = useState(null);

    // Hyperlane : aucune unité ne s'y pose (la tuile de la case est une hyperlane)
    const estSurHyperlane = zone => {
        const m = /^hex:(\d+)/.exec(zone || "");

        const tuile = m && Object.values(etat.composants)
            .find(c => c.zone === "hex:" + m[1] && c.ref?.type === "system");

        return !!tuile && estHyperlane(contenuEnCache(tuile.ref.id)?.anomaly);
    };

    const REFUS_HYPERLANE = "Une hyperlane n'est pas une case : aucune unité ne peut y être posée.";

    // Règle d'Arcturus : y poser des unités demande 2 niveaux de connaissance spatiale,
    // et 2 de connaissance génétique pour des unités biologiques. Simple avertissement :
    // les unités sont posées quand même.
    //   contenus : contenus des unités qu'on vient d'y poser
    function avertirArcturus(zone, contenus) {

        const m = /^hex:(\d+):planete:(\d+)$/.exec(zone || "");

        if (!m || !contenus.length || !aScript(moi, "arcturus")) {
            return;
        }

        const tuile = Object.values(etat.composants).find(c => c.zone === "hex:" + m[1] && c.ref?.type === "system");

        if (Number(contenuEnCache(tuile?.ref.id)?.elems?.[Number(m[2])]?.id) !== 783) {
            return;
        }

        const [spatiale, genetique] = [connaissance(moi, "spa"), connaissance(moi, "gen")];

        const manques = [
            spatiale < 2 && `2 niveaux de connaissance spatiale (vous en avez ${spatiale})`,
            genetique < 2 && contenus.some(u => u?.mot_cle?.includes("bio")) &&
                `2 niveaux de connaissance génétique pour les unités biologiques (vous en avez ${genetique})`,
        ].filter(Boolean);

        if (manques.length) {
            aviser?.(`Arcturus : pour y poser des unités il faut ${manques.join(", et ")}. Les unités sont posées : à vous de corriger si besoin.`);
        }
    }

    // Message non bloquant : après un embarquement, dit si le vaisseau porte
    // plus d'unités que sa capacité (l'embarquement est fait quand même).
    // embarques : composants qu'on vient d'y poser ; crees : unités qu'on vient d'y créer
    function signalerCapacite(idPorteur, embarques = [], crees = 0) {

        const vaisseau = etat.composants[idPorteur];
        const contenu = vaisseau?.ref?.type === "unit" ? contenuEnCache(vaisseau.ref.id) : null;

        if (!contenu?.mot_cle?.includes("ship")) {
            return;
        }

        const estUnite = c => c?.ref?.type === "unit";

        // (règle « Mech géant » : une unité peut prendre plusieurs places)
        const place = c => (aScript(moi, "mech-geant") ? placePrise(contenuEnCache(c.ref.id)) : 1);

        const deja = Object.values(etat.composants)
            .filter(c => c.sur === idPorteur && estUnite(c) && !embarques.includes(c.id))
            .reduce((total, c) => total + place(c), 0);

        const portees = deja + crees +
            embarques.map(id => etat.composants[id]).filter(estUnite).reduce((total, c) => total + place(c), 0);
        // (script Capsule de transport : capacité majorée)
        const capacite = capaciteDe(contenu, vaisseau.marques?.possession ?? vaisseau.proprio, aScript);

        if (portees > capacite) {
            signaler?.(`Attention : ${nomElement(search, vaisseau.ref)} porte ${portees} unité${portees > 1 ? "s" : ""} ` +
                `pour une capacité de ${capacite}. (L'embarquement est fait : à vous de corriger si besoin.)`);
        }
    }

    // Pile de pioche survolée pendant un glisser (data-pile) : elle reçoit
    // data-survol, qui fait apparaître ses trois zones de dépôt, et la zone
    // visée (data-position) reçoit data-actif
    const survol = useRef({ pile: null, position: null });

    function marquerSurvol(cible) {

        const s = survol.current;
        const pile = cible?.closest?.("[data-pile]") || null;
        const position = pile ? cible.closest("[data-position]") : null;

        if (s.pile !== pile) {
            s.pile?.removeAttribute("data-survol");
            pile?.setAttribute("data-survol", "");
            s.pile = pile;
        }

        if (s.position !== position) {
            s.position?.removeAttribute("data-actif");
            position?.setAttribute("data-actif", "");
            s.position = position;
        }
    }

    // Case « Production » (ou « Construction ») cochée : poser ces unités coûte
    // leur coût en ressources. Retourne les actions de paiement ([] s'il n'y a
    // rien à payer), ou null si les ressources ne suffisent pas ou si le
    // joueur renonce. Asynchrone : un logisticien dépensé peut poser une
    // question (Bio stimulant, onglet Décision).
    //   zone : là où les unités sont posées (celle du vaisseau qui les embarque)
    async function payerProduction(refs, zone) {

        if (!production) {
            return [];
        }

        const unites = refs.filter(ref => ref?.type === "unit");
        const noms = liste => liste.map(ref => nomElement(search, ref)).join(", ");

        const obstacles = [];

        // Ce qui s'ajoute au paiement une fois la pose confirmée (logisticien, activation)
        let apres = () => [];

        // Construction là où d'autres peuvent s'opposer : () => promesse du contrôle (vrai : acquis)
        let controleRequis = null;

        // Agents de l'action, utilisés quand même si le test de contrôle est raté (jamais dépensés)
        let agentsSiRate = () => [];

        // Production ouverte avec une unité ou une station (Production.jsx) : ce
        // qu'elle ne peut pas produire, une unité de trop ou posée hors de son
        // système demande une confirmation ; la quantité produite est comptée,
        // et la réduction d'IA industrielle vient en déduction du coût.
        const ouverte = production !== true ? production : null;

        // Mercenaires qui ont ouvert cette production comme logisticien (Production.jsx) : remise
        // sur un type d'unité, unité posée en plus, unité offerte qui ne compte pas
        const mercenaires = effetsMercenaires(ouverte, ouverte ? unites : [], contenuEnCache);

        if (ouverte && unites.length) {

            const refusees = unites.filter(ref => !estProductible(contenuEnCache(ref.id), ouverte.types));

            obstacles.push(
                refusees.length > 0 && `${ouverte.nom} ne produit pas : ${noms(refusees)}`,
                ouverte.max !== null && ouverte.fait + unites.length - mercenaires.gratuites > ouverte.max &&
                    `${ouverte.nom} produit ${ouverte.max} unité(s) au plus (${ouverte.fait} déjà)`,
                !new RegExp(`^hex:${ouverte.numero}(:|$)`).test(zone || "") &&
                    `${ouverte.nom} produit dans son système (${nomCase(ouverte.numero)}), pas ici`,
            );
        }

        // Unité terrestre qui produit une unité spatiale : « placez l'unité dans l'espace du système
        // que vous devez contrôler » (phase de production) — règle générale du contrôle
        if (ouverte && unites.length && /^hex:\d+$/.test(zone || "") &&
            /:planete:\d+$/.test(etat.composants[ouverte.source]?.zone || "")) {

            const caseProduction = Number(zone.slice(4));

            controleRequis = () => demanderControle({ etat, moi, envoyer, aviser, allerA, aScript }, {
                numero: caseProduction,
                k: ESPACE_CONTROLE,
                unites: unitesDuControle(index, caseProduction, ESPACE_CONTROLE),
                motif: { action: "production" },
                libelle: `Production de ${noms(unites)}`,
            });
        }

        // Règle « Soleil de guerre » : il demande sa technologie
        obstacles.push(
            unites.some(ref => typeUnite(contenuEnCache(ref.id)) === "sun") &&
            aScript(moi, "soleil-de-guerre-production") && !aScript(moi, "soleil-de-guerre") &&
                "un soleil de guerre nécessite la technologie « Soleil de guerre »",
            // Règle « Station météorologique » (#444) : elle demande sa technologie
            unites.some(ref => ref.id === 444) &&
            aScript(moi, "station-meteorologique-production") && !aScript(moi, "station-meteorologique-technologie") &&
                "une Station météorologique nécessite la technologie « Station météorologique »",
        );

        // Phase de construction (case « Construction ») : on ne construit que des
        // structures, pas deux fois la même au même endroit. Sur une planète, la
        // première construction de la phase l'active : un logisticien est utilisé,
        // ou dépensé si la planète portait déjà une structure. Dans l'espace, un
        // logisticien est utilisé par structure.
        const construction = !ouverte && unites.length > 0 &&
            /construction/i.test(etat.phase) && /^hex:\d+/.test(zone || "");

        if (construction) {

            const estStructure = id => !!contenuEnCache(id)?.mot_cle?.includes("struc");
            const sorte = id => typeUnite(contenuEnCache(id)) || id;

            const ici = Object.values(etat.composants).filter(c => c.zone === zone && !c.sur);
            const presentes = ici.filter(c => c.ref?.type === "unit" && estStructure(c.ref.id));
            const construites = unites.filter(ref => estStructure(ref.id));

            const doubles = construites.filter((ref, i) =>
                presentes.some(c => sorte(c.ref.id) === sorte(ref.id)) ||
                construites.findIndex(x => sorte(x.id) === sorte(ref.id)) !== i);

            // Structure qui se reforge au lieu de se construire (Portail de repli, script
            // portail-de-repli-reforger) : pas de logisticien ni de coût — un scientifique
            // et ses fragments de relique sont dépensés, et elle rapporte ses points.
            const reforge = ref => ref.id === REFORGE_PORTAIL.unite && aScript(moi, "portail-de-repli-reforger");
            const reforgees = construites.filter(reforge);
            const baties = construites.filter(ref => !reforge(ref));

            const scientifique = reforgees.length ? agentDisponible({ index, moi, search }, "scientifique") : null;
            const voulus = reforgees.length * REFORGE_PORTAIL.fragments;
            const fragments = (index.parZone.get(`joueur:${moi}:fragments`) || [])
                .filter(f => !f.ref && f.jeton === FRAGMENTS[REFORGE_PORTAIL.type][0]).slice(0, voulus);

            const surPlanete = estPlanete(zone);
            const activee = ici.some(c => !c.ref && c.jeton === ACTIVATION && !c.marques?.ruine);
            const besoin = baties.length > 0 && (!surPlanete || !activee);
            const depense = surPlanete && presentes.length > 0;
            const logisticien = besoin ? agentDisponible({ index, moi, search }, MOTIF_LOGISTICIEN) : null;

            // Mercenaire M'aban (#283), utilisable comme logisticien : il construit même s'il y a
            // déjà une structure sur la planète — il est utilisé, aucun logisticien n'est dépensé
            const maban = besoin && depense && aScript(moi, "m-aban")
                ? mercenaireDisponible({ index, moi, search }, 283, MOTIF_LOGISTICIEN)
                : null;

            // On construit sur une planète ou dans un système que l'on contrôle (phase de construction,
            // règle « Contrôle ») : sur une planète, les unités qui s'y trouvent comptent ; dans un
            // système, les vaisseaux et les structures spatiales. Mon contrôle doit dépasser celui des
            // unités militaires qui s'y opposent. Il faut y avoir une unité ou la possession : celle
            // de la planète (sa carte dans mes éléments actifs), qui y vaut 2 de contrôle, ou pour un
            // système celle d'une de ses planètes ou stations (mon drapeau dans le système).
            // L'opposition se déclare (conflit de contrôle) : l'outil ne la connaît pas, il compare
            // donc à toutes les unités militaires des autres camps.
            const [, caseDuLieu, rangPlanete] = /^hex:(\d+)(?::planete:(\d+))?/.exec(zone);

            // (unités qui comptent pour le contrôle du lieu : regleControle.js)
            const unitesIci = unitesDuControle(index, Number(caseDuLieu), surPlanete ? Number(rangPlanete) : ESPACE_CONTROLE);
            const elemsDuSysteme = contenuEnCache(tuileDe(index, Number(caseDuLieu))?.ref?.id)?.elems || [];
            const mesCartes = new Set((index.parZone.get(`joueur:${moi}:actif`) || [])
                .filter(c => !c.cache && c.ref?.type === "planet").map(c => c.ref.id));

            // (la possession d'une planète ne donne rien dans l'espace, et un système ne se possède
            //  pas : pour une structure spatiale il faut une unité qui compte dans l'espace)
            const possede = surPlanete && mesCartes.has(Number(elemsDuSysteme[Number(rangPlanete)]?.id));
            const present = unitesIci.some(c => campDe(c) === moi) || possede;

            // Le contrôle lui-même : un seul calcul pour tout le jeu (regleControle.js). Mes unités
            // militaires comptent, plus 2 pour la possession de la planète ; sans opposant possible le
            // test réussit (même à 0 contre 0). Si d'autres peuvent s'opposer, c'est un conflit de
            // contrôle « pour la construction de… » qui tranche (demanderControle, Controle.jsx) : la
            // construction part quand le contrôle est acquis, et n'a pas lieu s'il ne l'est pas.
            const numeroDuLieu = Number(caseDuLieu);
            const rangDuLieu = surPlanete ? Number(rangPlanete) : ESPACE_CONTROLE;
            const possesseur = surPlanete ? possesseurAuControle(etat, index, zone, Number(elemsDuSysteme[Number(rangPlanete)]?.id)) : null;
            if (construites.length > 0 && present) {
                controleRequis = () => demanderControle({ etat, moi, envoyer, aviser, allerA, aScript }, {
                    numero: numeroDuLieu,
                    k: rangDuLieu,
                    unites: unitesIci,
                    possesseur,
                    motif: { construction: construites[0].id },
                    libelle: `Construction de ${noms(construites)}`,
                });
            }

            obstacles.push(
                construites.length > 0 && !present &&
                    (surPlanete
                        ? "vous n'avez ni unité sur cette planète ni sa possession : vous ne la contrôlez pas"
                        : "vous n'avez aucune unité dans l'espace de ce système (la possession d'une planète n'y compte pas) : vous ne le contrôlez pas"),
                construites.length < unites.length &&
                    `ce n'est pas une structure : ${noms(unites.filter(ref => !estStructure(ref.id)))}`,
                doubles.length > 0 && `cette structure est déjà construite ici : ${noms(doubles)}`,
                besoin && !logisticien &&
                    `vous n'avez pas de logisticien disponible (aucun ne sera ${depense ? "dépensé" : "usé"})`,
                reforgees.length > 0 && !scientifique &&
                    `${noms(reforgees)} se reforge : vous n'avez pas de scientifique disponible (aucun ne sera dépensé)`,
                reforgees.length > 0 && fragments.length < voulus &&
                    `${noms(reforgees)} se reforge : il faut ${voulus} fragments spatiaux, vous en avez ${fragments.length} (seuls ceux-là seront dépensés)`,
            );

            agentsSiRate = () => [logisticien, scientifique].filter(Boolean)
                .map(agent => ({ type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` }));

            apres = async () => [
                // (Reforger : le scientifique est dépensé — Bio stimulant propose de l'user à la place —,
                //  les fragments aussi, et les points sont marqués)
                ...(!reforgees.length ? [] : [
                    ...await depenserAgent({ aScript, moi, etat }, scientifique, `le scientifique (${noms(reforgees)} : Reforger)`),
                    ...fragments.map(f => ({ type: "supprimer", c: f.id })),
                    ...actionsPoints(etat, moi, reforgees.length * REFORGE_PORTAIL.points),
                ]),
                ...(!logisticien ? [] : (depense
                    ? (maban && (await demander({
                        titre: "M'aban",
                        texte: "La planète porte déjà une structure : le logisticien qui construit est dépensé, sauf si c'est M'aban.",
                        choix: [
                            { valeur: 1, libelle: "M'aban construit : il est utilisé, aucun logisticien n'est dépensé" },
                            { valeur: 2, libelle: "Dépenser un logisticien" },
                        ],
                        renoncer: false,
                    })) === 1
                        ? actionsUserCarte(index, moi, maban)
                        // (dépensé : le script Bio stimulant propose de l'user à la place)
                        : await depenserAgent({ aScript, moi, etat }, logisticien, "le logisticien (la planète porte déjà une structure)"))
                    : [{ type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` }])),
                ...(besoin && surPlanete ? [{ type: "creer", jeton: ACTIVATION, zone }] : []),
            ];
        }

        const messages = obstacles.filter(Boolean);

        if (messages.length && !window.confirm(
            `${construction ? "Construction" : "Production"} normalement impossible :\n- ${messages.join("\n- ")}\n\n` +
            `${construction ? "Construire" : "Produire"} quand même ?`)) {
            return null;
        }

        const brut = unites.reduce((total, ref) => total + (Number(contenuEnCache(ref.id)?.cout) || 0), 0);
        const remise = Math.min(brut, mercenaires.remise);
        const reduction = Math.min(brut - remise, ouverte?.reduction || 0);
        const cout = brut - remise - reduction;

        const compteur = `joueur:${moi}:res`;
        const dispo = Number(etat.compteurs[compteur]) || 0;

        // (une production qui échoue faute de ressources ne compte pas dans la quantité produite)
        if (cout && dispo < cout) {
            signaler?.(`Ressources insuffisantes : cette ${construction ? "construction" : "production"} coûte ${cout}, vous avez ${dispo}.`);
            return null;
        }

        // Conflit de contrôle, s'il en faut un : la construction attend sa conclusion ; sans le
        // contrôle (conflit perdu ou abandonné), elle n'a pas lieu et rien n'est dépensé
        if (controleRequis) {

            const acquis = await controleRequis();

            if (!acquis) {

                // Test raté (conflit perdu ou abandonné) : les agents sont utilisés, jamais
                // dépensés ; le coût n'est pas payé, la planète n'est pas activée
                if (acquis === false) {

                    const uses = agentsSiRate();

                    if (uses.length) {
                        envoyer(uses, `${construction ? "Construction" : "Production"} — contrôle non obtenu : agent utilisé, rien n'est payé`);
                    }

                    aviser?.("Contrôle non obtenu : rien n'est posé ni payé. Les agents de l'action sont utilisés, la planète n'est pas activée.");
                }

                return null;
            }
        }

        if (ouverte && unites.length) {
            setProduction({
                ...ouverte,
                ...mercenaires.etat,
                fait: ouverte.fait + unites.length - mercenaires.gratuites,
                reduction: ouverte.reduction - reduction,
            });

            if (mercenaires.enPlus.length) {
                aviser?.(`Production : ${noms(mercenaires.enPlus)} de plus, sans coût (mercenaire qui a ouvert la production).`);
            }
        }

        return [
            ...(cout ? [{ type: "compteur", id: compteur, delta: -cout }] : []),
            // (mercenaire Trillossa Aun Mirik : un destroyeur de plus, posé au même endroit)
            ...mercenaires.enPlus.map(ref => ({ type: "creer", ref, zone, proprio: moi })),
            ...await apres(),
        ];
    }

    // Icône d'un compteur glissée (volet de droite) : un jeton portant
    // `n` est créé là où elle est déposée — sur un élément, ou dans une
    // zone. C'est un simple marqueur : le compteur ne change pas.
    function poserRessource({ ressource, n }, cible) {

        const [jeton] = RESSOURCES[ressource] || [];
        const montant = Math.max(1, Math.floor(Number(n) || 1));

        if (!jeton) {
            return;
        }

        const pionCible = cible.closest("[data-composant]");
        const zone = pionCible ? null : trouverZone(cible);

        if (!pionCible && !zone) {
            return;
        }

        jouer({
            type: "creer",
            jeton,
            proprio: moi,
            marques: { montant },
            ...(pionCible ? { sur: pionCible.dataset.composant } : { zone }),
        });
    }

    // Crée un marqueur libre, puis ouvre sa fenêtre : son identifiant n'est
    // connu qu'avec la réponse du serveur (le composant qui n'existait pas)
    async function creerLibre(actions) {

        const avant = new Set(Object.keys(etat.composants));
        const r = await envoyer(actions, "");

        const nouveau = Object.values(r?.etat?.composants || {})
            .find(c => !c.ref && c.jeton === LIBRE && c.proprio === moi && !avant.has(c.id));

        if (nouveau) {
            ouvrirLibre?.(nouveau.id);
        }
    }

    function onPointerDown(event) {

        if (event.button !== 0 || event.target.closest("button, input, select, textarea, a")) {
            return;
        }

        // Un pion, la source d'une unité illimitée (data-source), ou un
        // dégât de combat à attribuer (data-degat="<vaisseau>:<dé>")
        const pion = event.target.closest("[data-composant], [data-source], [data-degat]");

        if (!pion) {
            return;
        }

        appui.current = {
            id: pion.dataset.composant,
            ids: pion.dataset.groupe ? pion.dataset.groupe.split(",") : [],
            source: pion.dataset.source ? JSON.parse(pion.dataset.source) : null,
            degat: pion.dataset.degat || null,
            nom: pion.dataset.nom,
            x: event.clientX,
            y: event.clientY,
            actif: false,
        };
    }

    function onPointerMove(event) {

        const a = appui.current;

        if (!a) {
            return;
        }

        if (!a.actif) {

            if (!joueur || Math.hypot(event.clientX - a.x, event.clientY - a.y) < SEUIL_GLISSER) {
                return;
            }

            a.actif = true;
            event.currentTarget.setPointerCapture(event.pointerId);
        }

        setGlisser({
            x: event.clientX,
            y: event.clientY,
            nom: a.nom,
            // Ctrl : tout le groupe, ou toute la pile glissée
            n: !event.ctrlKey ? 1
                : a.source?.pioche ? Object.values(etat.composants).filter(c => c.zone === a.source.pioche && !c.sur).length
                : a.source ? 1 : a.ids.length,
        });

        // Un pion, ou le dessus d'une autre pile, glissé au-dessus d'une pile
        if ((!a.source || a.source.pioche) && !a.degat) {
            const cible = document.elementFromPoint(event.clientX, event.clientY);
            const autrePile = cible?.closest?.("[data-pile]")?.dataset.pile !== a.source?.pioche;

            marquerSurvol(autrePile ? cible : null);
        }
    }

    // (asynchrone : le paiement d'une production peut poser une question — payerProduction ;
    // tout ce qui se lit sur l'événement et sur la page l'est avant de l'attendre)
    async function onPointerUp(event) {

        const a = appui.current;
        appui.current = null;

        if (!a) {
            return;
        }

        if (!a.actif) {

            if (a.source || a.degat) {
                return;
            }

            // Clics particuliers (utiliser un agent, acheter au recrutement...),
            // sinon la fiche du composant
            if (!cliquer?.(a.id, event)) {
                ouvrirFiche(a.id);
            }

            return;
        }

        setGlisser(null);

        const cible = document.elementFromPoint(event.clientX, event.clientY);

        // Lu sous les zones de dépôt d'une pile, qui disparaissent ensuite
        marquerSurvol(null);

        if (!cible) {
            return;
        }

        // Dégât de combat déposé sur une unité : elle prend 1 dégât, et le
        // dé d'où il vient est noté « attribué » (marque desA du tireur)
        if (a.degat) {

            const idCible = cible.closest("[data-composant]")?.dataset.composant;
            const touchee = etat.composants[idCible];
            // "<tireur>:<dé>:<marque>" — la marque des dégâts attribués dépend
            // de la sorte de combat (desA, desAB pour un bombardement...)
            // (vert : dégât de Bombe bactériologique — une infanterie biologique
            // qu'il détruit en entraîne deux autres, effets.js)
            const [idTireur, de, marque = "desA", vert] = a.degat.split(":");
            const tireur = etat.composants[idTireur];

            if (touchee?.ref?.type === "unit" && tireur) {

                const contenuTouchee = contenuEnCache(touchee.ref.id);

                const epidemie = vert && (Number(touchee.marques?.degat) || 0) + 1 >= (Number(contenuTouchee?.PV) || 1)
                    ? victimesBombe(etat, touchee, contenuTouchee)
                    : [];

                jouer([
                    ...epidemie,
                    // Paternité du dégât : le camp du tireur, gardé sur l'unité touchée
                    // (pillage à sa destruction, Combat.jsx)
                    {
                        type: "marquer",
                        c: touchee.id,
                        marque: "degatDe",
                        valeur: "c" + campDe(tireur),
                    },
                    {
                        type: "marquer",
                        c: touchee.id,
                        marque: "degat",
                        valeur: (Number(touchee.marques?.degat) || 0) + 1,
                    },
                    {
                        type: "marquer",
                        c: tireur.id,
                        marque,
                        valeur: [...String(tireur.marques?.[marque] ?? "").split(",").filter(x => x !== ""), de].join(","),
                    },
                ]);
            }

            return;
        }

        // Dessus d'une pioche (plateau général) : la carte du dessus est
        // piochée vers la zone où elle est déposée
        // Ctrl : toute la pile est versée, dans son ordre. Sur une autre pile
        // (data-position) : ajoutée en haut, en bas, ou mélangée.
        if (a.source?.pioche) {
            const de = a.source.pioche;
            const zone = trouverZone(cible);

            if (!zone || zone === de) {
                return;
            }

            const position = cible.closest("[data-position]")?.dataset.position;

            if (!event.ctrlKey && !position) {
                jouer({ type: "piocher", de, vers: zone });
                return;
            }

            jouer([
                {
                    type: "verser",
                    de,
                    vers: zone,
                    ...(event.ctrlKey ? {} : { n: 1 }),
                    ...(position === "dessous" ? { dessous: true } : {}),
                },
                ...(position === "melanger" ? [{ type: "melanger", zone }] : []),
            ]);

            return;
        }

        // Source d'une unité illimitée (ou d'un jeton : marqueur de faction,
        // marqueur d'activation) : en crée un là où elle est déposée
        if (a.source?.ressource) {
            poserRessource(a.source, cible);
            return;
        }

        if (a.source) {

            const pionCible = cible.closest("[data-composant]");
            const jeton = a.source.jeton;

            const embarque = pionCible && (
                event.shiftKey ||
                // Marqueur libre déposé sur une carte : il s'y attache
                (jeton === LIBRE && estCarteCible(etat.composants[pionCible.dataset.composant])) ||
                (!jeton && contenuEnCache(a.source.id)?.mot_cle?.includes("transportable") &&
                    aMotCle(etat.composants[pionCible.dataset.composant], "ship"))
            );

            const zone = trouverZone(cible);

            // Une source neutre (réserve des unités neutres) crée sans propriétaire ;
            // un agent de la réserve infinie appartient au joueur dont il rejoint
            // une zone (il se regroupe ainsi avec ses autres agents)
            const proprioAgent = Number(/^joueur:(\d+):/.exec(zone || "")?.[1]) || undefined;

            const creation = jeton
                ? { type: "creer", jeton, proprio: a.source.neutre ? undefined : moi }
                : {
                    type: "creer",
                    ref: { type: a.source.type, id: a.source.id },
                    proprio: a.source.type === "agent" ? proprioAgent : a.source.neutre ? undefined : moi,
                };

            // Seule une unité terrestre se pose sur une planète (un agent, lui, s'y pose)
            if (!jeton && (a.source.type || "unit") === "unit" && !embarque && estPlanete(zone) &&
                !estTerrestre(contenuEnCache(a.source.id))) {
                signaler?.(`${a.nom || "Cette unité"} n'est pas une unité terrestre : elle ne peut pas être posée sur une planète.`);
                return;
            }

            if (!jeton && (a.source.type || "unit") === "unit" && estSurHyperlane(zone)) {
                signaler?.(REFUS_HYPERLANE);
                return;
            }

            const paiement = jeton || a.source.neutre
                ? []
                : await payerProduction([a.source], embarque ? etat.composants[pionCible.dataset.composant]?.zone : zone);

            if (!paiement) {
                return;
            }

            // Marqueur libre : sa fenêtre (texte, couleur) s'ouvre dès sa création
            const poser = jeton === LIBRE
                ? actions => creerLibre(actions)
                : actions => jouer(actions);

            if (jeton === LIBRE) {
                creation.marques = { couleur: COULEUR_LIBRE };
            }

            if (embarque) {
                poser([...paiement, { ...creation, sur: pionCible.dataset.composant }]);

                if (!jeton && (a.source.type || "unit") === "unit") {
                    signalerCapacite(pionCible.dataset.composant, [],
                        aScript(moi, "mech-geant") ? placePrise(contenuEnCache(a.source.id)) : 1);
                }
            } else if (zone) {
                poser([...paiement, { ...creation, zone }]);

                if (!jeton && (a.source.type || "unit") === "unit") {
                    avertirArcturus(zone, [contenuEnCache(a.source.id)]);
                }
            }

            return;
        }

        const ids = event.ctrlKey ? a.ids : [a.id];
        const pionCible = cible.closest("[data-composant]");

        // Remplaçant d'agent : le cube noir d'un mercenaire, sa carte ou le Noble
        // cryogénisé, déposé sur un type d'agent de ma réserve (ou de ma feuille),
        // s'utilisera comme cet agent
        const caseAgent = cible.closest("[data-agent-type]") || cible.closest('[data-emplacement="agents"][data-filtre]');

        const remplacant = caseAgent && trouverZone(cible) === `joueur:${moi}:agents`
            ? carteRemplacant(etat, etat.composants[a.id])
            : null;

        if (remplacant && remplacant.zone === `joueur:${moi}:actif`) {

            const idType = Number(caseAgent.dataset.agentType || caseAgent.dataset.filtre);
            const type = nomElement(search, { type: "agent", id: idType });
            const nomRemplacant = nomElement(search, remplacant.ref);

            const commentaire = confirmerRegle(`${nomRemplacant} utilisable comme ${type}`, [
                remplaceType(remplacant, type) === false &&
                    `le texte de ${nomRemplacant} ne dit pas « utilisable comme ${type} »`,
            ]);

            if (commentaire) {
                envoyer([{ type: "marquer", c: remplacant.id, marque: "comme", valeur: idType }], commentaire);
            }

            return;
        }

        // Embarquement : une unité transportable déposée sur un vaisseau,
        // ou n'importe quel pion déposé sur un autre avec la touche Maj.
        // Un jeton de ressource se pose toujours sur l'élément visé.
        const porteur = pionCible && (
            event.shiftKey ||
            !!ressourceDe(etat.composants[a.id]) ||
            // Marqueur libre déposé sur une carte : il s'y attache
            (estLibre(etat.composants[a.id]) && estCarteCible(etat.composants[pionCible.dataset.composant])) ||
            // Cube noir déposé sur une carte mercenaire : il s'y pose (le mercenaire est disponible)
            (!etat.composants[a.id]?.ref && etat.composants[a.id]?.jeton === CUBE_MERCENAIRE &&
                etat.composants[pionCible.dataset.composant]?.ref?.type === "mercenaire") ||
            (aMotCle(etat.composants[a.id], "transportable") &&
                aMotCle(etat.composants[pionCible.dataset.composant], "ship"))
        ) ? pionCible : null;

        if (porteur) {
            if (!ids.includes(porteur.dataset.composant)) {

                // Production : une unité de ma réserve embarquée se paie aussi
                const reserveDepart = `joueur:${moi}:reserve`;

                const paiement = etat.composants[porteur.dataset.composant]?.zone === reserveDepart
                    ? []
                    : await payerProduction(ids
                        .map(id => etat.composants[id])
                        .filter(c => c?.zone === reserveDepart)
                        .map(c => c.ref), etat.composants[porteur.dataset.composant]?.zone);

                if (!paiement) {
                    return;
                }

                jouer([...paiement, ...ids.map(c => ({ type: "deplacer", c, sur: porteur.dataset.composant }))]);

                // Prévient, sans rien empêcher, si le vaisseau dépasse sa capacité
                signalerCapacite(porteur.dataset.composant, ids);
            }

            return;
        }

        const zone = trouverZone(cible);

        if (!zone) {
            return;
        }

        if (ids.some(id => etat.composants[id]?.ref?.type === "unit") && estSurHyperlane(zone)) {
            signaler?.(REFUS_HYPERLANE);
            return;
        }

        // Rangement : déposé sur une autre carte d'une main, d'éléments actifs
        // ou de la table, le composant se range juste avant elle (moitié
        // gauche de la carte visée) ou juste après (moitié droite)
        const repere = pionCible && ZONE_ORDONNABLE.test(zone) && !ids.includes(pionCible.dataset.composant) &&
            etat.composants[pionCible.dataset.composant]?.zone === zone &&
            !etat.composants[pionCible.dataset.composant]?.sur
            ? pionCible
            : null;

        const cadre = repere?.getBoundingClientRect();
        const cote = repere && (event.clientX < cadre.x + cadre.width / 2 ? "avant" : "apres");

        // Déposé là où il est déjà : rien à faire (sauf rangement)
        const aDeplacer = ids.filter(id => {
            const c = etat.composants[id];
            return c && (repere || c.zone !== zone || c.sur);
        });

        // (rangés après le repère un par un, ils se suivraient à l'envers)
        if (cote === "apres") {
            aDeplacer.reverse();
        }

        // Seule une unité terrestre se pose sur une planète
        if (estPlanete(zone)) {

            const refusee = aDeplacer
                .map(id => etat.composants[id])
                .find(c => c.ref?.type === "unit" && !estTerrestre(contenuEnCache(c.ref.id)));

            if (refusee) {
                signaler?.(`${a.nom || "Cette unité"} n'est pas une unité terrestre : elle ne peut pas être posée sur une planète.`);
                return;
            }
        }

        // Plateau de vote d'une autre faction : y poser un agent (ou le cube d'un mercenaire) est
        // semi-bloqué — chacun vote sur son propre plateau
        const plateauAutrui = /^joueur:(\d+):vote:/.exec(zone);

        if (plateauAutrui && Number(plateauAutrui[1]) !== moi &&
            aDeplacer.some(id => etat.composants[id]?.ref?.type === "agent" ||
                (!etat.composants[id]?.ref && etat.composants[id]?.jeton === CUBE_MERCENAIRE)) &&
            !confirmerRegle("Poser un agent sur le plateau de vote d'une autre faction",
                ["ce plateau de vote est celui d'une autre faction"])) {
            return;
        }

        // Infanterie infectée (#1014) : « ne peut jamais être déplacée » — une fois sur la carte,
        // elle n'en bouge plus (règle semi-bloquante : la confirmation laisse faire)
        if (aScript(moi, "infanterie-infectee") &&
            aDeplacer.some(id => etat.composants[id]?.ref?.type === "unit" && etat.composants[id].ref.id === 1014 &&
                /^hex:/.test(etat.composants[id].zone || "")) &&
            !confirmerRegle("Déplacer une Infanterie infectée", ["l'Infanterie infectée ne peut jamais être déplacée"])) {
            return;
        }

        // Capture (Production.jsx) : pendant une production, une unité capturée — celle
        // d'un autre joueur, dans mes éléments actifs — glissée sur la carte me donne
        // mon unité du même type, sans coût, et retourne dans la réserve de son joueur
        const capturees = !production || !/^hex:/.test(zone) ? [] : aDeplacer
            .map(id => etat.composants[id])
            .filter(c => c.ref?.type === "unit" && c.zone === `joueur:${moi}:actif` &&
                Number.isInteger(c.proprio) && c.proprio !== moi);

        if (capturees.length) {

            const miennes = (contenuEnCache(factionDe(moi))?.units || []).map(lien => Number(lien?.id)).filter(id => id > 0);

            const equivalente = c => miennes.find(id =>
                typeUnite(contenuEnCache(id)) === typeUnite(contenuEnCache(c.ref.id)));

            const sans = capturees.find(c => !equivalente(c));

            if (sans) {
                signaler?.(`Capture : votre faction n'a pas d'unité du type de ${nomElement(search, sans.ref)}.`);
                return;
            }

            envoyer(capturees.flatMap(c => [
                { type: "creer", ref: { type: "unit", id: equivalente(c) }, zone, proprio: moi },
                { type: "marquer", c: c.id, marque: "degat", valeur: 0 },
                { type: "deplacer", c: c.id, vers: `joueur:${c.proprio}:reserve` },
            ]), `Production : ${capturees.length} unité(s) capturée(s) échangée(s) contre les miennes`);

            return;
        }

        // Production : une unité qui quitte ma réserve se paie en ressources
        const reserve = `joueur:${moi}:reserve`;

        // Pile d'une pioche : ajouté en haut, en bas (dessous), ou mélangé
        // data-position : zones de dépôt d'une pile (pioche, zone libre)
        // (lu avant le paiement, qui peut attendre une décision)
        const position = cible.closest("[data-position]")?.dataset.position;

        const paiement = zone === reserve
            ? []
            : await payerProduction(aDeplacer
                .map(id => etat.composants[id])
                .filter(c => c.zone === reserve)
                .map(c => c.ref), zone);

        if (!paiement) {
            return;
        }

        // Phase de débarquement : débarquer d'un vaisseau sur une planète demande une unité non
        // bloquée (« activer une unité non bloquée qui transporte… ») — test de blocage si d'autres
        // factions peuvent bloquer (BlocageAction.jsx). Pas de test vers une planète où j'ai un dock.
        // Le vaisseau qui a débarqué est engagé pour la phase.
        let marquesDebarquement = [];

        const porteurs = !/d[ée]barquement/i.test(etat.phase || "") || !estPlanete(zone) ? [] : [...new Set(aDeplacer
            .map(id => etat.composants[id])
            .filter(c => c?.ref?.type === "unit" && c.sur && campDe(c) === moi &&
                /^hex:\d+$/.test(c.zone || "") && zone.startsWith(c.zone + ":"))
            .map(c => c.sur))];

        const monDock = (index.parZone.get(zone) || []).some(c =>
            c.ref?.type === "unit" && campDe(c) === moi && typeUnite(contenuEnCache(c.ref.id)) === "dock");

        // (le débarquement se fait dans le système activé, à sa sous-phase de débarquement)
        const horsSousPhase = porteurs.length ? obstacleSousPhase(etat, Number(/^hex:(\d+)/.exec(zone)[1]), DEBARQUEMENT) : null;

        if (horsSousPhase && confirmerRegle("Débarquement", [horsSousPhase]) === null) {
            return;
        }

        if (porteurs.length && !monDock) {

            // (le test est celui de l'activation du vaisseau : un vaisseau qui a déjà débarqué à
            //  cette phase continue de débarquer sans nouveau test)
            const dejaActifs = porteurs.every(id => Number(etat.composants[id]?.marques?.[MARQUE_AGI]) === rangDePhase(etat));

            const blocage = dejaActifs
                ? { engagees: porteurs.filter(id => estBloquee(etat, etat.composants[id])) }
                : await demanderBlocage({ etat, index, moi, envoyer, aviser, allerA },
                    { numero: Number(/^hex:(\d+)/.exec(zone)[1]), action: "debarquement", libelle: "Débarquement" });

            if (!blocage) {
                return;
            }

            const bloques = porteurs.filter(id => blocage.engagees.includes(Number(id)) || blocage.engagees.includes(id));

            if (bloques.length && confirmerRegle("Débarquement", [
                `${bloques.map(id => nomElement(search, etat.composants[id]?.ref)).join(", ")} : unité bloquée pour cette phase (engagée dans le test de blocage)`,
            ]) === null) {
                return;
            }

            marquesDebarquement = porteurs
                .filter(id => Number(etat.composants[id]?.marques?.[MARQUE_AGI]) !== rangDePhase(etat))
                .map(id => ({ type: "marquer", c: id, marque: MARQUE_AGI, valeur: rangDePhase(etat) }));
        }

        // Possessions qui tombent d'elles-mêmes (Controle.jsx) : une station dont l'agent est repris,
        // Avar ou Arcturus que quitte la dernière unité du possesseur
        const zonesQuittees = [...new Set(aDeplacer.map(id => etat.composants[id]?.zone)
            .filter(z => /^hex:\d+:planete:\d+$/.test(z || "") && z !== zone))];

        const perdues = zonesQuittees.map(z => actionsPossessionPerdue({ etat, index, zone: z, partis: new Set(aDeplacer), aScript }));

        if (perdues.some(p => p.textes.length)) {
            aviser?.(perdues.flatMap(p => p.textes).join(" ; ") + ".");
        }

        // Réserve commune des promesses (« general:promesses ») : elle est infinie — quand la
        // dernière carte d'une promesse en sort, une autre y est créée
        const RESERVE_PROMESSES = "general:promesses";

        const promessesSorties = zone === RESERVE_PROMESSES ? [] : aDeplacer.map(id => etat.composants[id])
            .filter(c => c?.zone === RESERVE_PROMESSES && c.ref?.type === "Promesse");

        const promessesRemplacees = [...new Map(promessesSorties.map(c => [c.ref.id, c])).values()]
            .filter(c => !(index.parZone.get(RESERVE_PROMESSES) || [])
                .some(x => x.ref?.type === "Promesse" && x.ref.id === c.ref.id && !aDeplacer.includes(x.id)))
            .map(c => ({ type: "creer", ref: { type: "Promesse", id: c.ref.id }, zone: RESERVE_PROMESSES }));

        jouer([
            ...paiement,
            ...marquesDebarquement,
            ...promessesRemplacees,
            ...perdues.flatMap(p => p.actions),
            ...aDeplacer.map(c => ({
                type: "deplacer",
                c,
                vers: zone,
                ...(position === "dessous" ? { dessous: true } : {}),
                ...(repere ? { [cote]: repere.dataset.composant } : {}),
            })),
            ...(position === "melanger" && aDeplacer.length ? [{ type: "melanger", zone }] : []),
        ]);

        avertirArcturus(zone, aDeplacer
            .map(id => etat.composants[id])
            .filter(c => c?.ref?.type === "unit" && c.zone !== zone)
            .map(c => contenuEnCache(c.ref.id)));
    }

    function onPointerCancel() {
        appui.current = null;
        setGlisser(null);
        marquerSurvol(null);
    }

    return (
        <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            // Du texte sélectionné sous le pion ferait partir un glisser-déposer
            // natif du navigateur à la place du nôtre
            onDragStart={event => event.preventDefault()}
            style={{ userSelect: glisser ? "none" : undefined, ...style }}
        >
            {children}

            {glisser && (
                <div
                    style={{
                        ...stylePion,
                        position: "fixed",
                        left: glisser.x + 12,
                        top: glisser.y + 12,
                        zIndex: 20000,
                        pointerEvents: "none",
                        borderColor: "#ff9800",
                        boxShadow: "0 2px 6px #0006",
                    }}
                >
                    {glisser.nom}{glisser.n > 1 && <b>×{glisser.n}</b>}
                </div>
            )}
        </div>
    );
}
