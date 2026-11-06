import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getHandler } from "../../games";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { PlayerColor } from "../ti5Const";
import { pub } from "../../../lib/fetch";
import { useElement, contenuEnCache } from "./sync";
import { MARQUEUR, FAVEUR, DETTE, ACTIVATION, TREVE, estFragment, typeUnite as typeDeUnite } from "./miseEnPlace";
import { joueurDeMain, estPioche } from "./etat";

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

// Icône du marqueur de trêve : une colombe portant un rameau d'olivier
function Colombe() {
    return (
        <svg viewBox="0 0 24 24" style={{ display: "block", width: "100%", height: "100%" }} aria-hidden="true">
            {/* rameau d'olivier, tenu dans le bec */}
            <path d="M3.2 10 C2.6 12.4 3 15 4.6 18" fill="none" stroke="#2e7d32" strokeWidth="1.1" strokeLinecap="round" />
            <ellipse cx="1.9" cy="12.6" rx="1.7" ry="0.85" transform="rotate(-55 1.9 12.6)" fill="#2e7d32" />
            <ellipse cx="4.9" cy="13.2" rx="1.7" ry="0.85" transform="rotate(35 4.9 13.2)" fill="#2e7d32" />
            <ellipse cx="2.4" cy="16.2" rx="1.7" ry="0.85" transform="rotate(-50 2.4 16.2)" fill="#2e7d32" />
            <ellipse cx="5.9" cy="16.6" rx="1.7" ry="0.85" transform="rotate(30 5.9 16.6)" fill="#2e7d32" />
            {/* colombe : bec à gauche, aile levée, queue à droite */}
            <path
                d="M2.6 9.6 L5.2 8.3 C6.2 6.8 8.2 6.6 9.4 7.8 L11 9.4 C11.6 6 14.2 3.6 18.4 3 C17.6 5.2 17.4 7 17.8 9 C19.6 9.4 21.2 10.6 22.2 12.4 C19.8 12.2 18.2 12.8 16.8 14.2 C14.8 16.4 12 17 9.6 16 C7.2 15 5.8 12.8 5.6 10.6 Z"
                fill="#fff"
                stroke="#222"
                strokeWidth="1"
                strokeLinejoin="round"
            />
            <path d="M11 9.4 C12.4 11.2 14.6 12 17.8 9" fill="none" stroke="#222" strokeWidth="0.8" />
            <circle cx="7.2" cy="8.9" r="0.55" fill="#222" />
        </svg>
    );
}

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
export function nomElement(search, ref) {
    const element = search.find(e => e.id === ref.id);

    return (element?.name || `${ref.type} #${ref.id}`).replace(/^!([^!]*)!/, "");
}

export function nomType(jeu, type) {
    return type === "jeton" ? "jeton" : getHandler(jeu, type)?.name || type;
}

export function couleurJoueur(joueur) {
    return PlayerColor[joueur?.couleur] || joueur?.couleur || "#666";
}

// Nom lisible d'une zone, pour le journal et les menus
export function nomZone(zone, nomDe) {

    if (!zone || typeof zone !== "string") {
        return "?";
    }

    const parties = zone.split(":");

    switch (parties[0]) {

        case "hex":
            return `case ${Number(parties[1]) + 1}` +
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
                "secret:faveurs": "faveurs à encaisser",
            };

            if (parties[2] === "tour") {
                return `tour ${parties[3]} de ${qui}`;
            }

            return `${noms[reste] || reste} de ${qui}`;
        }

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
                lois: "lois",
                traites: "traités",
                regles: "règles spéciales",
                objectifs: "objectifs",
                promesses: "promesses",
                agents: "réserve d'agents",
                tuiles: "tuiles piochées",
                systemes: "réserve de tuiles spéciales",
                table: "table",
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
    return !contenu || (contenu.mot_cle || []).includes("terre");
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

// Agent disponible (non usé) du joueur dont le nom contient `nom`, ou null
export function agentDisponible({ index, moi, search }, nom) {
    return (index.parZone.get(`joueur:${moi}:agents`) || [])
        .find(c => c.ref && new RegExp(nom, "i").test(nomElement(search, c.ref))) || null;
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

function Pion({ groupe, petit }) {

    const { search, jeu, couleurDe, nomDe, factionDe, index, jouer, joueur, ouvrirCachee } = useEngine();

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

    if (typeRef === "agent" || typeRef === "unit") {
        idContenu = c.ref.id;
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

    const nom = c.ref ? nomElement(search, c.ref) : c.jeton;
    const portes = index.parPorteur.get(c.id) || [];
    const degat = Number(c.marques?.degat) || 0;
    const cube = couleurCube(c, agent);
    const dette = !c.ref && c.jeton === DETTE;

    // Agents et cubes du sac : un cube de couleur, le nom en info-bulle
    if (cube) {

        const cote = petit ? 12 : 18;

        return (
            <span
                data-composant={c.id}
                data-groupe={groupe.map(x => x.id).join(",")}
                data-nom={nom}
                title={nom + (n > 1 ? ` ×${n}` : "")}
                style={{
                    ...stylePion,
                    padding: 0,
                    border: "none",
                    backgroundColor: "transparent",
                    gap: 1,
                    opacity: c.marques?.use ? 0.5 : 1,
                }}
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
                {n > 1 && (
                    <b
                        style={{
                            padding: "0 3px",
                            borderRadius: 6,
                            backgroundColor: "#fff",
                            color: "#000",
                            fontSize: petit ? 9 : 11,
                        }}
                    >
                        {n}
                    </b>
                )}
            </span>
        );
    }

    const badge = {
        padding: "0 3px",
        borderRadius: 6,
        backgroundColor: "#fff",
        color: "#000",
        fontSize: petit ? 9 : 11,
    };

    // Marqueur de joueur : un carré de sa couleur avec le logo de sa faction
    if (marqueur) {

        // Une faveur est un triangle, un marqueur un carré
        const cote = faveur ? (petit ? 20 : 28) : (petit ? 16 : 22);
        const titre = (faveur ? "Faveur de " : "Marqueur de ") + nomDe(c.proprio);

        return (
            <span
                data-composant={c.id}
                data-groupe={groupe.map(x => x.id).join(",")}
                data-nom={titre}
                title={titre + (n > 1 ? ` ×${n}` : "")}
                style={{
                    ...stylePion,
                    padding: 0,
                    border: "none",
                    backgroundColor: "transparent",
                    gap: 1,
                }}
            >
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: cote,
                        height: cote,
                        boxSizing: "border-box",
                        backgroundColor: couleurDe(c.proprio) || "#888",
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
            </span>
        );
    }

    // Marqueur de trêve : un carré blanc marqué « T », au liseré de la couleur
    // du joueur qui l'a posé.
    if (!c.ref && c.jeton === TREVE) {

        const cote = petit ? 18 : 24;
        const titre = "Marqueur de trêve" + (c.proprio ? " de " + nomDe(c.proprio) : "");

        return (
            <span
                data-composant={c.id}
                data-groupe={groupe.map(x => x.id).join(",")}
                data-nom={titre}
                title={titre + (n > 1 ? ` ×${n}` : "")}
                style={{ ...stylePion, padding: 0, border: "none", backgroundColor: "transparent", gap: 1 }}
            >
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: cote,
                        height: cote,
                        boxSizing: "border-box",
                        backgroundColor: "#fff",
                        border: "2px solid " + (couleurDe(c.proprio) || "#2e7d32"),
                        outline: "1px solid #000",
                        borderRadius: 3,
                    }}
                >
                    <Colombe />
                </span>
                {n > 1 && <b style={badge}>{n}</b>}
            </span>
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
            <span
                data-composant={c.id}
                data-groupe={groupe.map(x => x.id).join(",")}
                data-nom={titre}
                title={titre + (n > 1 ? ` ×${n}` : "")}
                style={{
                    ...stylePion,
                    padding: activation ? 0 : "0 3px",
                    border: "none",
                    backgroundColor: "transparent",
                    gap: activation ? 1 : 4,
                }}
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
                {!activation && !petit && <span style={{ fontSize: 11 }}>{nom.replace(/^Fragment /, "")}</span>}
                {n > 1 && <b style={badge}>{n}</b>}
            </span>
        );
    }

    // Unité : la silhouette de son type, sans cadre, à la couleur du joueur
    // (gris clair pour une unité sans propriétaire). Sur la carte (petit),
    // la silhouette seule ; ailleurs, suivie du nom.
    if (typeUnite) {

        const icone = `url("${pub}/ti/unit_icon/${typeUnite}.png")`;

        return (
            <span
                data-composant={c.id}
                data-groupe={groupe.map(x => x.id).join(",")}
                data-nom={nom}
                title={nom + (n > 1 ? ` ×${n}` : "") +
                    // Le propriétaire est dit en toutes lettres, pas seulement par la couleur
                    (detenteur ? ` — ${nomDe(detenteur)}` : " — neutre") +
                    (degat ? ` — ${degat} dégât(s)` : "") +
                    (horsFiche ? " — hors fiche de faction" : "") +
                    (n > 1 ? " — Ctrl + glisser : tout le groupe" : "")}
                style={{
                    ...stylePion,
                    padding: 0,
                    border: "none",
                    backgroundColor: "transparent",
                    gap: 2,
                    opacity: c.marques?.use ? 0.5 : 1,
                }}
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
                            border: horsFiche ? "2px solid " + DORE : "1.5px solid #fff",
                            outline: "1px solid #000",
                        }}
                    />
                ) : (
                <span
                    style={{
                        display: "inline-block",
                        width: petit ? 36 : 44,
                        height: petit ? 24 : 29,
                        backgroundColor: couleurDe(c.marques?.possession ?? c.proprio) || "#c8c8c8",
                        WebkitMaskImage: icone,
                        maskImage: icone,
                        WebkitMaskSize: "125%",
                        maskSize: "125%",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        // Liseré clair : lisible sur le fond sombre de l'espace
                        // (doré pour une unité hors fiche de faction)
                        filter: horsFiche
                            ? `drop-shadow(0 0 1px ${DORE}) drop-shadow(0 0 1px ${DORE}) drop-shadow(0 0 2px ${DORE})`
                            : "drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff)",
                    }}
                />
                )}
                {!petit && <span style={{ fontSize: 11 }}>{nom}</span>}
                {degat > 0 && <b style={{ ...badge, color: "#c00" }}>✹{degat}</b>}
                {n > 1 && <b style={badge}>{n}</b>}
                <Portes liste={portes} />
            </span>
        );
    }

    return (
        <span
            data-composant={c.id}
            data-groupe={groupe.map(x => x.id).join(",")}
            data-nom={nom}
            title={nom + (n > 1 ? ` ×${n}` : "") + (degat ? ` — ${degat} dégât(s)` : "")}
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
            {dette ? `Dette ${Number(c.marques?.montant) || 0}` : nom}
            {c.face === "verso" && " ↺"}
            {degat > 0 && <b style={{ color: "#c00" }}>✹{degat}</b>}
            {n > 1 && <b>×{n}</b>}
            {/* Une dette porte le marqueur du créancier, affiché tel quel */}
            {dette
                ? grouper(portes, index).map(g => <Pion key={g[0].id} groupe={g} petit />)
                : <Portes liste={portes} />}
        </span>
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
function Dos({ type, zoom, zone }) {

    const { jeu, jouer, joueur, ouvrirCachee } = useEngine();

    const handler = getHandler(jeu, type);
    const Verso = handler.display.verso;

    const contenu = useMemo(() => new handler.classe(), [handler]);

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
                ∞ {nom}
            </span>
        );
    }

    return (
        <span
            data-source={JSON.stringify({ type: lien.type || "unit", id: lien.id })}
            data-nom={nom}
            title={nom + " : illimité. Glisser vers la carte pour en poser une."}
            style={{
                ...stylePion,
                borderStyle: "dashed",
                borderColor: couleurDe(moi) || "#666",
            }}
        >
            {typeDeUnite(contenu) === "inf" && (
                <span
                    style={{
                        display: "inline-block",
                        width: 13,
                        height: 13,
                        boxSizing: "border-box",
                        borderRadius: "50%",
                        backgroundColor: couleurDe(moi) || "#c8c8c8",
                        border: "1.5px solid #fff",
                        outline: "1px solid #000",
                    }}
                />
            )}
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
                <LoadAndDisplay link={c.ref} displayeur={verso ? "verso" : undefined} />
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

    // Agents et unités restent des pions (cubes, silhouettes)
    const estCarte = c => !c.cache && c.ref && c.ref.type !== "agent" && c.ref.type !== "unit";

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
                <Dos key={c.id} type={c.dos} zoom={echelle} zone={zone} />
            ))}

            {pions.map(g => (
                <Pion key={g[0].id} groupe={g} />
            ))}
        </>
    );
}

// Une zone sous forme de boîte : titre, boutons, pions.
// cartes = zoom : affiche les cartes en entier au lieu de pions.
// repli = clé : la zone se replie (son titre reste une cible où déposer).
export function Zone({ zone, titre, filtre, style, cartes, repli, children }) {

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
export function Emplacements({ prefixe, stylePions, petit, cartes, separes, extra, children, style }) {

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
                                        : undefined}
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
            event.target.closest("[data-composant], [data-source], button, input, select, textarea, a")
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

export function Plan({ children, style }) {

    const { etat, jouer, ouvrirFiche, joueur, moi, cliquer, production, signaler } = useEngine();

    const appui = useRef(null);
    const [glisser, setGlisser] = useState(null);

    // Case « Production » cochée : poser ces unités coûte leur coût en
    // ressources. Retourne les actions de paiement ([] s'il n'y a rien à
    // payer), ou null si les ressources ne suffisent pas.
    function payerProduction(refs) {

        if (!production) {
            return [];
        }

        const cout = refs
            .filter(ref => ref?.type === "unit")
            .reduce((total, ref) => total + (Number(contenuEnCache(ref.id)?.cout) || 0), 0);

        if (!cout) {
            return [];
        }

        const compteur = `joueur:${moi}:res`;
        const dispo = Number(etat.compteurs[compteur]) || 0;

        if (dispo < cout) {
            signaler?.(`Ressources insuffisantes : cette production coûte ${cout}, vous avez ${dispo}.`);
            return null;
        }

        return [{ type: "compteur", id: compteur, delta: -cout }];
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
            n: event.ctrlKey && !a.source ? a.ids.length : 1,
        });
    }

    function onPointerUp(event) {

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
            const [idTireur, de, marque = "desA"] = a.degat.split(":");
            const tireur = etat.composants[idTireur];

            if (touchee?.ref?.type === "unit" && tireur) {
                jouer([
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

        // Source d'une unité illimitée (ou d'un jeton : marqueur de faction,
        // marqueur d'activation) : en crée un là où elle est déposée
        if (a.source) {

            const pionCible = cible.closest("[data-composant]");
            const jeton = a.source.jeton;

            const embarque = pionCible && (
                event.shiftKey ||
                (!jeton && contenuEnCache(a.source.id)?.mot_cle?.includes("transportable") &&
                    aMotCle(etat.composants[pionCible.dataset.composant], "ship"))
            );

            const zone = trouverZone(cible);

            const creation = jeton
                ? { type: "creer", jeton, proprio: a.source.neutre ? undefined : moi }
                : { type: "creer", ref: a.source, proprio: moi };

            // Seule une unité terrestre se pose sur une planète
            if (!jeton && !embarque && estPlanete(zone) && !estTerrestre(contenuEnCache(a.source.id))) {
                signaler?.(`${a.nom || "Cette unité"} n'est pas une unité terrestre : elle ne peut pas être posée sur une planète.`);
                return;
            }

            const paiement = jeton ? [] : payerProduction([a.source]);

            if (!paiement) {
                return;
            }

            if (embarque) {
                jouer([...paiement, { ...creation, sur: pionCible.dataset.composant }]);
            } else if (zone) {
                jouer([...paiement, { ...creation, zone }]);
            }

            return;
        }

        const ids = event.ctrlKey ? a.ids : [a.id];
        const pionCible = cible.closest("[data-composant]");

        // Embarquement : une unité transportable déposée sur un vaisseau,
        // ou n'importe quel pion déposé sur un autre avec la touche Maj.
        const porteur = pionCible && (
            event.shiftKey ||
            (aMotCle(etat.composants[a.id], "transportable") &&
                aMotCle(etat.composants[pionCible.dataset.composant], "ship"))
        ) ? pionCible : null;

        if (porteur) {
            if (!ids.includes(porteur.dataset.composant)) {

                // Production : une unité de ma réserve embarquée se paie aussi
                const reserveDepart = `joueur:${moi}:reserve`;

                const paiement = etat.composants[porteur.dataset.composant]?.zone === reserveDepart
                    ? []
                    : payerProduction(ids
                        .map(id => etat.composants[id])
                        .filter(c => c?.zone === reserveDepart)
                        .map(c => c.ref));

                if (!paiement) {
                    return;
                }

                jouer([...paiement, ...ids.map(c => ({ type: "deplacer", c, sur: porteur.dataset.composant }))]);
            }

            return;
        }

        const zone = trouverZone(cible);

        if (!zone) {
            return;
        }

        // Déposé là où il est déjà : rien à faire
        const aDeplacer = ids.filter(id => {
            const c = etat.composants[id];
            return c && (c.zone !== zone || c.sur);
        });

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

        // Production : une unité qui quitte ma réserve se paie en ressources
        const reserve = `joueur:${moi}:reserve`;

        const paiement = zone === reserve
            ? []
            : payerProduction(aDeplacer
                .map(id => etat.composants[id])
                .filter(c => c.zone === reserve)
                .map(c => c.ref));

        if (!paiement) {
            return;
        }

        jouer([...paiement, ...aDeplacer.map(c => ({ type: "deplacer", c, vers: zone }))]);
    }

    function onPointerCancel() {
        appui.current = null;
        setGlisser(null);
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
