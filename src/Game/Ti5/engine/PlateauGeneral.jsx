import { useMemo, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useEngine, Emplacements, Zone, Source, Defilable, Dos, nomType, nomElement, BoutonRegle, agentDisponible } from "./Interaction";
import { depenserAgent } from "./effets";
import { getHandler } from "../../games";
import {
    TYPES_PIOCHE,
    SAC,
    CUBES,
    SAC_FRAGMENTS,
    FRAGMENTS,
    TREVE,
    MARQUEUR,
    ACTIVATION,
    PIOCHE_TUILES,
    TUILES_PIOCHEES,
    casesRecrutement,
    actionsPiste,
    horsReserveCommune,
} from "./miseEnPlace";
import { useElement, useElements } from "./sync";
import { getFromType } from "../../../lib/store";
import { ReserveNeutre, FactionsNeutres, FeuillesSpeciales, ReserveTokens, RechercheCarte, Fenetre } from "./Neutres";
import { ZONE_LIBRE } from "./Envoi";

// Commentaire du coup qui désigne un système au hasard (lu par le lanceur de dés)
const TIRAGE_SYSTEME = "Système au hasard";

// Jetons retirés qu'on ne montre pas dans la case « Hors jeu » : transactions
// et lignes de transaction (Transaction.jsx), marqueurs de faction et
// d'activation (dont ceux d'une ruine)
const CACHES_HORS_JEU = new Set([MARQUEUR, ACTIVATION, "transaction", "ligne de transaction"]);
const visibleHorsJeu = c => c.ref || !CACHES_HORS_JEU.has(c.jeton);

// ============================================================
// ONGLET PLATEAU GÉNÉRAL
//
// De haut en bas :
//   - dés et recrutement du tour
//   - ce qui est en cours : la table (lois, traités, règles, objectifs ne
//     s'affichent plus que s'ils contiennent encore quelque chose)
//   - le déroulé, ses 3 pages côte à côte (un seul plateau) ; ses
//     cases du haut (data-emplacement "boite:<n>") et d'initiative
//     ("initiative:<n>") reçoivent des pions
//   - les réserves : promesses, agents, sac d'agents, pioches
// ============================================================

const ZONES_EN_COURS = [
    ["general:table", "Table (cartes révélées)"],
];

// Anciennes zones retirées du plateau : montrées seulement si une partie
// existante y a encore des éléments (pour pouvoir les en sortir)
const ZONES_RETIREES = [
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

// Une carte du déroulé qui déborde sur la colonne du tour suivant passe
// au-dessus de celle de ce tour : plus le tour est petit, plus elle est devant
const devantLeTourSuivant = zone => {

    const tour = /^general:(militaire|evenement|agenda):(\d+)$/.exec(zone)?.[2];

    return tour === undefined ? null : { position: "relative", zIndex: Math.max(1, 50 - Number(tour)) };
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
        systemes[t.id] && !horsReserveCommune(systemes[t.id]) && systemes[t.id].anomaly !== "sup");

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

    const { etat, index, envoyer, joueur, partie } = useEngine();

    const deroule = useElement(etat.references?.deroule);

    const cases = casesRecrutement(deroule?.recru?.[etat.tour - 1]);
    const parCase = partie.joueurs.length;
    const total = cases.length * parCase;
    const reste = (index.parZone.get(SAC) || []).length;

    // Une seule mise en place par tour : le compteur garde le tour de la dernière
    const dejaFait = etat.tour > 0 && Number(etat.compteurs[RECRUTEMENT_FAIT]) === etat.tour;

    function mettreEnPlace(commentaire) {
        envoyer([
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
        ], commentaire);
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
                <BoutonRegle
                    nom="Mettre en place le recrutement"
                    obstacles={[
                        !/ravitaill/i.test(etat.phase) && "ce n'est pas la phase de ravitaillement",
                        dejaFait && "le recrutement de ce tour est déjà en place",
                        !cases.length && "le déroulé ne prévoit aucune case pour ce tour",
                        !reste && "le sac d'agents est vide",
                    ]}
                    faire={mettreEnPlace}
                    title="Tire du sac les agents du tour et les pose sur les cases du déroulé"
                >
                    Mettre en place le recrutement
                </BoutonRegle>
            )}

            {dejaFait && <span style={{ color: "#1b5e20" }}>✔ déjà mis en place ce tour</span>}
        </div>
    );
}

// ============================================================
// RÉSERVES
// ============================================================

// Réserve infinie : une source par type d'agent de base, à glisser où
// l'on veut (réserve, plateau joueur, carte...) pour les effets qui font
// apparaître des agents sans passer par le sac. La case « autres agents »
// ajoute tous les autres agents du jeu (noble, généticien...).
function ReserveAgents() {

    const { etat, joueur, search } = useEngine();

    const [tous, setTous] = useState(false);

    const base = etat.references?.agentsBase || [];

    const autres = tous
        ? getFromType(search, ["agent"])
            .filter(e => !base.includes(e.id))
            .sort((a, b) => nomElement(search, { type: "agent", id: a.id })
                .localeCompare(nomElement(search, { type: "agent", id: b.id })))
            .map(e => e.id)
        : [];

    // Agent créé sans propriétaire : il appartient à la zone où il est posé
    const source = id => <Source key={id} lien={{ type: "agent", id }} neutre />;

    return (
        <Zone zone="general:agents" titre="Agents (réserve infinie : glisser pour en poser un)">
            {joueur && (<>
                {base.map(source)}
                <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={tous} onChange={e => setTous(e.target.checked)} />{" "}
                    autres agents
                </label>
                {autres.map(source)}
            </>)}
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
// Un fragment d'un type donné se prend dans la réserve infinie en glissant
// sa source là où on le veut (Source, sans propriétaire). Les fragments
// tirés vont dans la zone « Fragments » du joueur ; on en remet un dans le
// sac en le glissant ici.
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

                    <span style={{ fontWeight: "normal" }}>Réserve infinie (glisser) :</span>

                    {Object.values(FRAGMENTS).map(([jeton]) => (
                        <Source key={jeton} jeton={jeton} neutre libelle={jeton.replace(/^Fragment /, "")} />
                    ))}
                </>
            )}
        </Zone>
    );
}

// Zone libre : une pile comme une pioche vide en début de partie (verso
// noir), où l'on pose n'importe quel élément (glisser, « Envoyer vers… »).
// On en pioche le dessus ; « Consulter » montre tout son contenu.
function ZoneLibre() {
    return <Pioche type="libre" pioche={ZONE_LIBRE} defausse={null} titre="Zone libre" verso="noir" />;
}

// Zones de dépôt d'une pile : cachées, elles apparaissent quand un pion
// glissé survole la pile (data-survol, posé par le Plan)
const STYLE_PILE = `
[data-pile] > .zones-pile { display: none; }
[data-pile][data-survol] > .zones-pile { display: flex; }
.zones-pile > [data-position][data-actif] { background: #ff9800; color: #000; }
`;

const POSITIONS_PILE = [
    ["dessus", "Ajouter en haut"],
    ["melanger", "Ajouter et mélanger"],
    ["dessous", "Ajouter en bas"],
];

// Verso d'une tuile système (le type n'en a pas) : un hexagone doré sur un
// fond d'espace étoilé, une étoile au centre
function VersoTuile() {
    const hexagone = r => Array.from({ length: 6 }, (_, k) => {
        const a = Math.PI / 3 * k;
        return `${40 + r * Math.cos(a)},${40 + r * Math.sin(a)}`;
    }).join(" ");

    return (
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ display: "block" }} aria-label="Verso d'une tuile système">
            <defs>
                <radialGradient id="espace-tuile" cx="50%" cy="45%" r="70%">
                    <stop offset="0%" stopColor="#24346b" />
                    <stop offset="100%" stopColor="#070b1f" />
                </radialGradient>
            </defs>
            <rect x="0" y="0" width="80" height="80" rx="6" fill="url(#espace-tuile)" stroke="#444" strokeWidth="2" />
            {[[9, 12], [68, 9], [72, 66], [11, 70], [24, 6], [60, 74], [6, 42], [75, 36]].map(([x, y]) => (
                <circle key={x + ":" + y} cx={x} cy={y} r="0.9" fill="#fff" opacity="0.8" />
            ))}
            <polygon points={hexagone(30)} fill="#0d1638" stroke="#e0b030" strokeWidth="3" />
            <polygon points={hexagone(22)} fill="none" stroke="#e0b030" strokeWidth="1" opacity="0.6" />
            <path d="M40 27 L43 37 L53 40 L43 43 L40 53 L37 43 L27 40 L37 37 Z" fill="#ffd54f" />
            <circle cx="40" cy="40" r="2.5" fill="#fff" />
        </svg>
    );
}

// La pile d'une pioche : le verso de sa carte du dessus, au format réduit.
// Un joueur la glisse vers la zone de son choix pour y piocher cette carte ;
// un pion glissé dessus y est ajouté en haut, mélangé ou en bas.
// verso="noir" : une carte noire quel que soit le contenu (zone libre)
function PilePioche({ pioche, type, reste, nom, verso }) {

    const { index, jeu, joueur } = useEngine();

    // Carte du dessus : marquée par le serveur quand la pile est cachée
    const liste = index.parZone.get(pioche) || [];
    const haut = liste.find(c => c.dessus) || liste.at(-1);
    const dos = verso === "noir" ? "noir" : haut?.dos || type;
    const aUnVerso = !!getHandler(jeu, dos)?.display?.verso;

    return (
        <span
            data-pile={pioche}
            data-source={joueur && reste > 0 ? JSON.stringify({ pioche }) : undefined}
            data-nom={"Dessus de " + nom}
            title={joueur
                ? (reste > 0
                    ? "Glisser vers une zone pour y piocher la carte du dessus (Ctrl + glisser : toute la pile). "
                    : "") +
                "Glisser un élément ici pour l'ajouter à la pile."
                : nom}
            style={{
                position: "relative",
                display: "inline-block",
                cursor: joueur && reste > 0 ? "grab" : "default",
                userSelect: "none",
                touchAction: "none",
                // effet de pile : deux cartes décalées derrière
                boxShadow: reste > 1 ? "3px 3px 0 #888, 6px 6px 0 #666" : "none",
                marginRight: reste > 1 ? 6 : 0,
                marginBottom: reste > 1 ? 6 : 0,
            }}
        >
            <style>{STYLE_PILE}</style>

            <span
                className="zones-pile"
                style={{
                    // aligné à gauche : la pile est au bord de son cadre
                    position: "absolute",
                    left: -4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 50,
                    width: 170,
                    flexDirection: "column",
                    border: "2px solid #ff9800",
                    borderRadius: 6,
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    boxShadow: "0 2px 8px #0008",
                }}
            >
                {POSITIONS_PILE.map(([position, libelle], i) => (
                    <span
                        key={position}
                        data-zone={pioche}
                        data-position={position}
                        style={{
                            display: "block",
                            padding: "12px 6px",
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: 13,
                            color: "#000",
                            borderTop: i ? "1px solid #ccc" : "none",
                        }}
                    >
                        {libelle}
                    </span>
                ))}
            </span>

            <span style={{ display: "block", pointerEvents: "none" }}>
                {reste === 0
                    ? (
                        <span
                            style={{
                                display: "inline-block",
                                width: 60,
                                height: 85,
                                boxSizing: "border-box",
                                borderRadius: 6,
                                border: "2px dashed #999",
                                color: "#888",
                                fontSize: 12,
                                lineHeight: "81px",
                                textAlign: "center",
                            }}
                        >
                            vide
                        </span>
                    )
                    : dos === "noir"
                    ? (
                        <span
                            style={{
                                display: "inline-block",
                                width: 60,
                                height: 85,
                                boxSizing: "border-box",
                                borderRadius: 6,
                                border: "2px solid #444",
                                backgroundColor: "#000",
                            }}
                        />
                    )
                    : dos === "system"
                    ? <VersoTuile />
                    : aUnVerso
                    ? <Dos type={dos} zoom={0.38} zone={pioche} />
                    : (
                        <span
                            style={{
                                display: "inline-block",
                                width: 60,
                                height: 85,
                                borderRadius: 6,
                                border: "2px solid #444",
                                backgroundColor: "#556",
                                color: "#fff",
                                fontSize: 30,
                                lineHeight: "85px",
                                textAlign: "center",
                            }}
                        >
                            🂠
                        </span>
                    )}
            </span>
        </span>
    );
}

// Pioche de tuiles système : la même que dans l'onglet Espace (mêmes zones).
// Une tuile piochée va dans les tuiles piochées, qui tiennent lieu de défausse.
const PIOCHE_DE_TUILES = {
    type: "system",
    pioche: PIOCHE_TUILES,
    defausse: TUILES_PIOCHEES,
    titre: "Tuiles système",
    titreDefausse: "Piochées",
    piocherVers: TUILES_PIOCHEES,
    reveler: false,
};

// type : type des cartes ; les autres options servent à la pioche de tuiles
// et à la zone libre (defausse null : pas de défausse, « Consulter » montre
// alors la pile elle-même ; verso, children : voir ZoneLibre)
function Pioche({
    type,
    pioche = "pioche:" + type,
    defausse = "defausse:" + type,
    titre,
    titreDefausse = "Défausse",
    piocherVers,
    reveler = true,
    verso,
    children,
}) {

    const { index, jouer, joueur, moi, jeu } = useEngine();

    const reste = (index.parZone.get(pioche) || []).length;
    const defaussees = defausse ? index.parZone.get(defausse) || [] : [];
    const nom = titre || nomType(jeu, type);

    // Fenêtre de la défausse (bouton « Consulter »)
    const [consulter, setConsulter] = useState(false);

    function remelanger() {
        jouer([
            ...defaussees.map(c => ({ type: "deplacer", c: c.id, vers: pioche })),
            { type: "melanger", zone: pioche },
        ]);
    }

    const styleBouton = { width: "100%" };

    // Format compact, tout en hauteur : titre et nombre, pile, boutons,
    // défausse (on y dépose un pion) et sa fenêtre
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 4,
                // assez large pour un verso en paysage (événements)
                width: 150,
                padding: 6,
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#e9e9e9",
                color: "#000",
                fontSize: 13,
                boxSizing: "border-box",
            }}
        >
            <b style={{ textAlign: "center" }}>{nom} : {reste}</b>

            <div style={{ display: "flex", justifyContent: "center" }}>
                <PilePioche pioche={pioche} type={type} reste={reste} nom={nom} verso={verso} />
            </div>

            {joueur && (
                <>
                    <button
                        type="button"
                        style={styleBouton}
                        disabled={!reste}
                        onClick={() => jouer({ type: "piocher", de: pioche, vers: piocherVers || `joueur:${moi}:main` })}
                    >
                        Piocher
                    </button>
                    {reveler && (
                        <button
                            type="button"
                            style={styleBouton}
                            disabled={!reste}
                            title="Pose la carte du dessus sur la table, visible de tous"
                            onClick={() => jouer({ type: "piocher", de: pioche, vers: "general:table" })}
                        >
                            Révéler
                        </button>
                    )}
                    <button
                        type="button"
                        style={styleBouton}
                        disabled={!reste}
                        onClick={() => jouer({ type: "melanger", zone: pioche })}
                    >
                        Mélanger
                    </button>
                </>
            )}

            {/* La défausse reste une zone de dépôt */}
            {defausse && (
                <div
                    data-zone={defausse}
                    title={"Glisser un élément ici : " + titreDefausse.toLowerCase()}
                    style={{
                        marginTop: 2,
                        padding: "4px 2px",
                        textAlign: "center",
                        border: "1px dashed #999",
                        borderRadius: 4,
                        backgroundColor: "#f5f5f5",
                    }}
                >
                    {titreDefausse} : {defaussees.length}
                </div>
            )}

            <button type="button" style={styleBouton} aria-haspopup="dialog" onClick={() => setConsulter(true)}>
                Consulter
            </button>

            {children}

            {consulter && !defausse && (
                <Fenetre titre={nom} fermer={() => setConsulter(false)}>
                    <div style={{ minWidth: 320 }}>
                        {reste
                            ? <Zone zone={pioche} titre={nom} cartes={0.6} />
                            : <i>Aucun élément.</i>}
                    </div>
                </Fenetre>
            )}

            {consulter && defausse && (
                <Fenetre
                    titre={titreDefausse + " — " + nom}
                    fermer={() => setConsulter(false)}
                    actions={joueur && defaussees.length > 0 && (
                        <button type="button" onClick={remelanger}>
                            Remettre dans la pioche
                        </button>
                    )}
                >
                    <div style={{ minWidth: 320 }}>
                        {defaussees.length
                            ? <Zone zone={defausse} titre={titreDefausse} cartes={0.6} />
                            : <i>Aucun élément.</i>}
                    </div>
                </Fenetre>
            )}
        </div>
    );
}

// ============================================================
// ONGLET
// ============================================================

export function PlateauGeneral() {

    const { etat, index, partie, jouer, envoyer, joueur, moi, search, aScript } = useEngine();

    const [zoom, setZoom] = useState(0.7);

    // Clic sur le « + » de l'en-tête d'une piste du déroulé (data-action =
    // « points », « infamie » ou « sieges ») : mon marqueur avance d'une case.
    function onClickDeroule(event) {

        const piste = event.target.closest("[data-action]")?.dataset.action;

        if (!joueur || !piste) {
            return;
        }

        // Script Propagande : au gain d'un point d'infamie, une fenêtre propose
        // de dépenser un diplomate pour ne pas le gagner
        const diplomate = piste === "infamie" && aScript(moi, "propagande")
            ? agentDisponible({ index, moi, search }, "diplomate")
            : null;

        if (diplomate && window.confirm(
            "Propagande : vous gagnez un point d'infamie.\n\n" +
            "OK : dépenser un diplomate pour ne pas le gagner.\nAnnuler : gagner le point d'infamie.")) {
            envoyer(depenserAgent({ aScript, moi, etat }, diplomate, "le diplomate"),
                "Propagande : un diplomate dépensé, le point d'infamie n'est pas gagné");
            return;
        }

        jouer(actionsPiste(etat, moi, piste, 1));
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
                {[...ZONES_EN_COURS, ...ZONES_RETIREES.filter(([zone]) => (index.parZone.get(zone) || []).length)]
                    .map(([zone, titre]) => (
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
                            <Emplacements prefixe="general" cartes={cartesDuDeroule} separes={cubesSepares} stylePions={devantLeTourSuivant}>
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

                {/* (Marqueur de trêve : le token « Trêve » de la réserve de tokens, plus bas) */}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 8 }}>
                {TYPES_PIOCHE.map(type => (
                    <Pioche key={type} type={type} />
                ))}
                <Pioche {...PIOCHE_DE_TUILES} />

                {/* Zone libre : une pile de tout élément, contenu affiché ou caché */}
                <ZoneLibre />
            </div>

            {/* NEUTRES ET RÈGLES SPÉCIALES (Neutres.jsx) */}

            <ReserveNeutre />
            <FactionsNeutres />
            <FeuillesSpeciales />
            <ReserveTokens />

            {/* Ce qui a été retiré du jeu : on en ressort un pion en le glissant
                (rattrape une fausse manœuvre). Les transactions et leurs lignes,
                les marqueurs de faction et d'activation n'y sont pas montrés. */}
            <Zone zone="horsJeu" titre="Hors jeu (retirés)" filtre={visibleHorsJeu} />

            {/* Tout en bas : retrouver n'importe quel élément du jeu par son nom */}
            <RechercheCarte />
        </div>
    );
}
