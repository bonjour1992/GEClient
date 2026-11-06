import { useMemo, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useEngine, Emplacements, Zone, Source, Defilable, nomType, nomElement } from "./Interaction";
import {
    TYPES_PIOCHE,
    SAC,
    CUBES,
    SAC_FRAGMENTS,
    FRAGMENTS,
    TREVE,
    casesRecrutement,
    actionsPiste,
} from "./miseEnPlace";
import { useElement, useElements } from "./sync";

// Commentaire du coup qui désigne un système au hasard (lu par le lanceur de dés)
const TIRAGE_SYSTEME = "Système au hasard";

// ============================================================
// ONGLET PLATEAU GÉNÉRAL
//
// De haut en bas :
//   - dés et recrutement du tour
//   - ce qui est en cours : table, lois, traités, règles, objectifs
//   - le déroulé, ses 3 pages côte à côte (un seul plateau) ; ses
//     cases du haut (data-emplacement "boite:<n>") et d'initiative
//     ("initiative:<n>") reçoivent des pions
//   - les réserves : promesses, agents, sac d'agents, pioches
// ============================================================

const ZONES_EN_COURS = [
    ["general:table", "Table (cartes révélées)"],
    ["general:lois", "Lois en cours"],
    ["general:traites", "Traités"],
    ["general:regles", "Règles spéciales"],
    ["general:objectifs", "Objectifs"],
];

// Les cases « événement », « objectif militaire » et « agenda » du déroulé
// montrent les cartes en entier ; les autres cases, des pions. Les cartes
// rétrécissent quand la case en contient plusieurs (jusqu'à 6 agendas).
const zoomCartes = n => (n <= 1 ? 0.9 : n <= 2 ? 0.55 : 0.38);

// Dans les cases de recrutement, les cartes mercenaire et relique sont
// affichées en petit, à côté des cubes d'agents.
const cartesDuDeroule = zone => {

    if (zone.startsWith("general:boite:")) {
        return 0.36;
    }

    // Agendas : une carte tient dans une demi-colonne (2 de large, 3 de haut)
    if (zone.startsWith("general:agenda:")) {
        return 0.54;
    }

    return /^general:(militaire|evenement):/.test(zone) ? zoomCartes : null;
};

// Recrutement : un cube noir tiré fait venir une carte mercenaire, sur
// laquelle il est posé ; un cube blanc est remplacé par une relique.
const REMPLACEMENTS = {
    [CUBES[0][0]]: { pioche: "pioche:mercenaire", garder: true },
    [CUBES[1][0]]: { pioche: "pioche:relique", garder: false },
};

// Compteur : tour du dernier recrutement mis en place (une fois par tour)
const RECRUTEMENT_FAIT = "general:recrutement";

// Cases de recrutement : un cube par agent, sans regrouper les identiques
const cubesSepares = zone => zone.startsWith("general:boite:");

const styleBoite = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    padding: 6,
    border: "1px solid #aaa",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    color: "#000",
};

const styleNu = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 };

const styleGrille = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 8,
};

// ============================================================
// DÉS
// ============================================================

// Affiché dans le volet de droite de la partie (Partie.jsx)
// nu : sans cadre ni titre (le volet de droite le range dans un bloc repliable)
export function Des({ nu }) {

    const { jouer, envoyer, joueur, coups, nomDe, index } = useEngine();

    const [n, setN] = useState(1);
    const [faces, setFaces] = useState(10);

    // Dernier lancer du journal
    let dernier = null;

    for (const coup of coups) {
        // (un jet résumé — composant caché — n'a pas de résultats)
        const action = [...coup.actions].reverse()
            .find(a => a.type === "des" && !a.cache && Array.isArray(a.resultats));

        if (action) {
            dernier = { coup, action };
            break;
        }
    }

    // Systèmes du plateau qu'on peut désigner au hasard : ni spéciaux, ni
    // supernova. Rangés par case : le dé désigne le k-ième.
    const tuiles = [...index.parZone]
        .flatMap(([zone, contenu]) => {
            const m = /^hex:(\d+)$/.exec(zone);
            const tuile = m && contenu.find(c => c.ref?.type === "system");

            return tuile ? [{ numero: Number(m[1]), id: tuile.ref.id }] : [];
        })
        .sort((a, b) => a.numero - b.numero);

    const systemes = useElements(tuiles.map(t => t.id));

    const candidats = tuiles.filter(t =>
        systemes[t.id] && !systemes[t.id].special && systemes[t.id].anomaly !== "sup");

    // Dernier tirage d'un système : lisible tant que le plateau n'a pas changé
    const tirage = dernier && (dernier.coup.commentaire || "").startsWith(TIRAGE_SYSTEME);
    const designe = tirage && dernier.action.faces === candidats.length
        ? candidats[dernier.action.resultats[0] - 1]
        : null;

    return (
        <div style={nu ? styleNu : styleBoite}>
            {!nu && <b>Dés</b>}

            {joueur && (
                <>
                    <input
                        type="number"
                        min={1}
                        max={30}
                        value={n}
                        onChange={e => setN(Number(e.target.value))}
                        style={{ width: 50 }}
                    />
                    dé(s) à
                    <input
                        type="number"
                        min={2}
                        max={100}
                        value={faces}
                        onChange={e => setFaces(Number(e.target.value))}
                        style={{ width: 55 }}
                    />
                    faces
                    <button type="button" onClick={() => jouer({ type: "des", n, faces })}>
                        Lancer
                    </button>

                    {/* Désigne au hasard un système du plateau, hors spéciaux et supernova */}
                    <button
                        type="button"
                        disabled={candidats.length < 2}
                        title="Désigne au hasard un système du plateau qui n'est ni spécial ni une supernova"
                        onClick={() => envoyer(
                            [{ type: "des", n: 1, faces: candidats.length }],
                            `${TIRAGE_SYSTEME} parmi ${candidats.length}`
                        )}
                    >
                        Système au hasard
                    </button>
                </>
            )}

            {dernier && !tirage && (
                <span>
                    Dernier lancer ({nomDe(dernier.coup.auteur)}, {dernier.action.resultats.length}d{dernier.action.faces}) :{" "}
                    <b style={{ fontSize: 18 }}>{dernier.action.resultats.join("  ")}</b>
                </span>
            )}

            {tirage && (
                <span>
                    Système désigné ({nomDe(dernier.coup.auteur)}) :{" "}
                    {designe
                        ? (
                            <b style={{ fontSize: 15 }}>
                                {(systemes[designe.id]?.name || "système").replace(/^!([^!]*)!/, "")}, case {designe.numero + 1}
                            </b>
                        )
                        : <i>le plateau a changé depuis le tirage</i>}
                </span>
            )}
        </div>
    );
}

// ============================================================
// RECRUTEMENT DU TOUR
//
// La ligne « Recrutement » du déroulé liste, pour chaque tour,
// les cases du haut à remplir (ex. "3,4,5"). Chacune reçoit
// autant de jetons, tirés au hasard dans le sac, qu'il y a de
// joueurs. Les jetons déjà en place y restent.
// ============================================================

function Recrutement() {

    const { etat, index, jouer, joueur, partie } = useEngine();

    const deroule = useElement(etat.references?.deroule);

    const cases = casesRecrutement(deroule?.recru?.[etat.tour - 1]);
    const parCase = partie.joueurs.length;
    const total = cases.length * parCase;
    const reste = (index.parZone.get(SAC) || []).length;

    // Une seule mise en place par tour : le compteur garde le tour de la dernière
    const dejaFait = etat.tour > 0 && Number(etat.compteurs[RECRUTEMENT_FAIT]) === etat.tour;

    function mettreEnPlace() {
        jouer([
            // (si : refusé si un autre joueur vient de le faire — pas de double tirage)
            { type: "compteur", id: RECRUTEMENT_FAIT, valeur: etat.tour, si: Number(etat.compteurs[RECRUTEMENT_FAIT]) || 0 },
            { type: "melanger", zone: SAC },
            ...cases.map(n => ({
                type: "piocher",
                de: SAC,
                vers: "general:boite:" + n,
                n: parCase,
                remplacements: REMPLACEMENTS,
            })),
        ]);
    }

    return (
        <div style={styleBoite}>
            <b>Recrutement du tour {etat.tour}</b>

            {!deroule && <span>Chargement du déroulé…</span>}

            {deroule && cases.length === 0 && (
                <span style={{ color: "#a00" }}>
                    La ligne « Recrutement » du déroulé est vide pour ce tour
                    (y indiquer les cases à remplir, par exemple 3,4,5).
                </span>
            )}

            {cases.length > 0 && (
                <span>
                    cases {cases.join(", ")} × {parCase} joueur{parCase > 1 ? "s" : ""} = {total} jeton{total > 1 ? "s" : ""} tiré{total > 1 ? "s" : ""} du sac
                    {reste < total && <b style={{ color: "#a00" }}> (il n'en reste que {reste})</b>}
                </span>
            )}

            {joueur && (
                <button
                    type="button"
                    disabled={!cases.length || !reste || dejaFait}
                    onClick={mettreEnPlace}
                    title={dejaFait ? "Le recrutement de ce tour est déjà en place" : undefined}
                    style={{ fontWeight: "bold" }}
                >
                    Mettre en place le recrutement
                </button>
            )}

            {dejaFait && <span style={{ color: "#1b5e20" }}>✔ déjà mis en place ce tour</span>}
        </div>
    );
}

// ============================================================
// RÉSERVES
// ============================================================

// Réserve infinie : crée un agent d'un type de base, pour les effets
// qui font apparaître des agents sans passer par le sac.
function ReserveAgents() {

    const { etat, jouer, joueur, search } = useEngine();

    const types = etat.references?.agentsBase || [];

    return (
        <Zone zone="general:agents" titre="Agents (réserve infinie)">
            {joueur && types.map(id => (
                <button
                    key={id}
                    type="button"
                    title="Fait apparaître un agent dans cette réserve"
                    onClick={() => jouer({
                        type: "creer",
                        ref: { type: "agent", id },
                        zone: "general:agents",
                    })}
                >
                    + {nomElement(search, { type: "agent", id })}
                </button>
            ))}
        </Zone>
    );
}

// Sac d'agents : son contenu est caché, on y tire au hasard
function Sac() {

    const { index, jouer, joueur } = useEngine();

    const reste = (index.parZone.get(SAC) || []).length;

    return (
        <Zone zone={SAC} titre="Sac d'agents (tirage au hasard)">
            {joueur && (
                <button
                    type="button"
                    disabled={!reste}
                    title="Tire un jeton au hasard et le pose sur la table"
                    onClick={() => jouer([
                        { type: "melanger", zone: SAC },
                        { type: "piocher", de: SAC, vers: "general:table" },
                    ])}
                >
                    Tirer un jeton
                </button>
            )}
        </Zone>
    );
}

// Sac de fragments de relique : on y tire au hasard (ruine « normale »).
// Un fragment d'un type donné se prend dans la réserve illimitée. Les
// fragments vont dans la zone « Fragments » du joueur ; on en remet un dans
// le sac en le glissant ici.
function SacFragments() {

    const { index, jouer, joueur, moi } = useEngine();

    const reste = (index.parZone.get(SAC_FRAGMENTS) || []).length;
    const vers = `joueur:${moi}:fragments`;

    return (
        <Zone zone={SAC_FRAGMENTS} titre="Sac de fragments de relique">
            {joueur && (
                <>
                    <button
                        type="button"
                        disabled={!reste}
                        title="Tire un fragment au hasard, qui rejoint vos fragments"
                        onClick={() => jouer([
                            { type: "melanger", zone: SAC_FRAGMENTS },
                            { type: "piocher", de: SAC_FRAGMENTS, vers },
                        ])}
                    >
                        Tirer un fragment
                    </button>

                    <span style={{ fontWeight: "normal" }}>Réserve :</span>

                    {Object.values(FRAGMENTS).map(([jeton]) => (
                        <button
                            key={jeton}
                            type="button"
                            title={`Prend un ${jeton.toLowerCase()} dans la réserve illimitée`}
                            onClick={() => jouer({ type: "creer", jeton, zone: vers })}
                        >
                            + {jeton.replace(/^Fragment /, "")}
                        </button>
                    ))}
                </>
            )}
        </Zone>
    );
}

function Pioche({ type }) {

    const { index, jouer, joueur, moi, jeu } = useEngine();

    const pioche = "pioche:" + type;
    const defausse = "defausse:" + type;

    const reste = (index.parZone.get(pioche) || []).length;
    const defaussees = index.parZone.get(defausse) || [];

    function remelanger() {
        jouer([
            ...defaussees.map(c => ({ type: "deplacer", c: c.id, vers: pioche })),
            { type: "melanger", zone: pioche },
        ]);
    }

    return (
        <div
            style={{
                padding: 6,
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#e9e9e9",
                color: "#000",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                <b>{nomType(jeu, type)}</b>
                <span>{reste} en pioche</span>

                {joueur && (
                    <>
                        <button
                            type="button"
                            disabled={!reste}
                            onClick={() => jouer({ type: "piocher", de: pioche, vers: `joueur:${moi}:main` })}
                        >
                            Piocher
                        </button>
                        <button
                            type="button"
                            disabled={!reste}
                            title="Pose la carte du dessus sur la table, visible de tous"
                            onClick={() => jouer({ type: "piocher", de: pioche, vers: "general:table" })}
                        >
                            Révéler
                        </button>
                        <button
                            type="button"
                            disabled={!reste}
                            onClick={() => jouer({ type: "melanger", zone: pioche })}
                        >
                            Mélanger
                        </button>
                    </>
                )}
            </div>

            <Zone zone={defausse} titre="Défausse">
                {joueur && defaussees.length > 0 && (
                    <button type="button" onClick={remelanger}>
                        Remettre dans la pioche
                    </button>
                )}
            </Zone>
        </div>
    );
}

// ============================================================
// ONGLET
// ============================================================

export function PlateauGeneral() {

    const { etat, partie, jouer, joueur, moi } = useEngine();

    const [zoom, setZoom] = useState(0.7);

    // Clic sur le « + » de l'en-tête d'une piste du déroulé (data-action =
    // « points », « infamie » ou « sieges ») : mon marqueur avance d'une case.
    function onClickDeroule(event) {

        const piste = event.target.closest("[data-action]")?.dataset.action;

        if (joueur && piste) {
            jouer(actionsPiste(etat, moi, piste, 1));
        }
    }

    const deroule = etat.references?.deroule;
    const nombreJoueurs = partie.joueurs.length;

    // Stable d'un rendu à l'autre : évite de redessiner le déroulé
    const contexteDeroule = useMemo(
        () => ({ coteACote: true, engine: true, joueurs: nombreJoueurs }),
        [nombreJoueurs]
    );

    const lienDeroule = useMemo(
        () => ({ type: "deroule", id: deroule }),
        [deroule]
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            <Recrutement />

            {/* EN COURS */}

            <div style={styleGrille}>
                {/* Les cartes y sont affichées en entier */}
                {ZONES_EN_COURS.map(([zone, titre]) => (
                    <Zone key={zone} zone={zone} titre={titre} cartes={0.6} />
                ))}
            </div>

            {/* DÉROULÉ : les 3 pages côte à côte */}

            {deroule && (
                <>
                    <label>
                        Zoom du plateau{" "}
                        <input
                            type="range"
                            min={0.4}
                            max={1.5}
                            step={0.05}
                            value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                        />
                    </label>

                    <Defilable style={{ border: "1px solid #aaa" }}>
                        <div onClick={onClickDeroule} style={{ zoom, width: "max-content" }}>
                            <Emplacements prefixe="general" cartes={cartesDuDeroule} separes={cubesSepares}>
                                <LoadAndDisplay link={lienDeroule} context={contexteDeroule} />
                            </Emplacements>
                        </div>
                    </Defilable>
                </>
            )}

            {/* RÉSERVES */}

            <b style={{ fontSize: 16 }}>Réserves</b>

            <div style={styleGrille}>
                <Zone zone="general:promesses" titre="Promesses" />
                <ReserveAgents />
                <Sac />
                <SacFragments />

                {/* Ce qui a été retiré du jeu : on en ressort un pion en le glissant
                    (rattrape une fausse manœuvre) */}
                <Zone zone="horsJeu" titre="Hors jeu (retirés)" />

                {/* Marqueurs de trêve : réserve infinie, à glisser sur un système */}
                <div style={{ ...styleBoite, alignItems: "flex-start" }}>
                    <b style={{ fontSize: 13 }}>Marqueurs de trêve (réserve infinie)</b>
                    {joueur && <Source jeton={TREVE} libelle="Trêve" couleur="#fff" />}
                </div>
            </div>

            <div style={styleGrille}>
                {TYPES_PIOCHE.map(type => (
                    <Pioche key={type} type={type} />
                ))}
            </div>
        </div>
    );
}
