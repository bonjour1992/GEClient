import { useMemo, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { LigneElement } from "../../../Component/NomElement";
import { getFromType } from "../../../lib/store";
import { pub } from "../../../lib/fetch";
import { useEngine, Emplacements, Zone, Source, Defilable, nomElement, COULEUR_A_FAIRE } from "./Interaction";
import { useElements } from "./sync";
import { FAVEUR } from "./miseEnPlace";
import { stylePions } from "./PlateauJoueur";
import { affichageFeuille } from "./Technologie";
import { EnvoyerVers, MontrerA } from "./Envoi";

// ============================================================
// BAS DU PLATEAU GÉNÉRAL
//
//   - réserve illimitée des unités neutres (celles des factions
//     neutres) : glisser une source crée une unité sans propriétaire ;
//   - factions neutres : leur feuille, dont les unités et habilités
//     (data-emplacement « unite:<i> », « habilite:<i> ») reçoivent
//     des éléments (zones neutre:<id>:unite:<i>...) ; un clic sur
//     son nom ouvre sa fenêtre, avec « Obtenir une faveur » et
//     « Envoyer vers… » (sa feuille est créée dans la zone choisie) ;
//   - feuilles de technologie spéciales (type de lien ni commun ni
//     faction : Tempête stellaire, Rupture...), au format small
//     quand c'est possible ; un clic ouvre sa fenêtre, avec
//     « Envoyer dans les technologies de chaque joueur » et
//     « Envoyer vers… » (un joueur, ou une autre zone).
// ============================================================

const styleBoite = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 6,
    border: "1px solid #aaa",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    color: "#000",
};

const styleListe = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 };

const sansPrefixe = nom => (nom || "").replace(/^!([^!]*)!/, "");

// Éléments d'un type, rangés par nom, avec leur contenu
function useListe(type) {

    const { search } = useEngine();

    const elements = getFromType(search, [type])
        .slice()
        .sort((a, b) => sansPrefixe(a.name).localeCompare(sansPrefixe(b.name)));

    const contenus = useElements(elements.map(e => e.id));

    return elements.map(e => ({ id: e.id, nom: sansPrefixe(e.name), contenu: contenus[e.id] }));
}

// Bouton d'une liste : le nom ; un clic ouvre sa fenêtre
function Onglet({ ouvert, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-haspopup="dialog"
            style={{ fontWeight: ouvert ? "bold" : "normal", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
            {children}
        </button>
    );
}

// Fenêtre ouverte par un clic, comme la fiche d'une carte (Partie.jsx) :
// un bandeau (titre, actions, Fermer) au-dessus du contenu
export function Fenetre({ titre, actions, fermer, children }) {
    return (
        <div
            onClick={fermer}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#0008",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                role="dialog"
                aria-label={titre}
                onClick={event => event.stopPropagation()}
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
                }}
            >
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                    <b style={{ fontSize: 18 }}>{titre}</b>
                    <button type="button" onClick={fermer} style={{ marginLeft: "auto" }}>Fermer</button>
                </div>

                {actions && (
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                        {actions}
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}

// ============================================================
// RÉSERVE DES UNITÉS NEUTRES
// ============================================================

export function ReserveNeutre() {

    const { joueur } = useEngine();

    const factions = useListe("neutral");

    return (
        <Zone zone="general:neutres" titre="Unités neutres (réserve illimitée : glisser pour en poser une)">
            {joueur && factions.map(f => (
                (f.contenu?.units || [])
                    .filter(lien => lien?.id > 0)
                    .map(lien => <Source key={f.id + ":" + lien.id} lien={{ type: "unit", id: lien.id }} neutre />)
            ))}
        </Zone>
    );
}

// ============================================================
// FACTIONS NEUTRES
// ============================================================

function FactionNeutre({ id, nom, fermer }) {

    const { jouer, joueur, moi, index } = useEngine();

    const lien = useMemo(() => ({ type: "neutral", id }), [id]);

    // Faveurs de cette faction déjà dans mes faveurs
    const mesFaveurs = (index.parZone.get(`joueur:${moi}:faveurs`) || [])
        .filter(f => f.jeton === FAVEUR && f.marques?.neutre === id).length;

    const actions = joueur && (<>
        <button
            type="button"
            title={`Une faveur de ${nom} rejoint vos faveurs`}
            onClick={() => jouer({
                type: "creer",
                jeton: FAVEUR,
                zone: `joueur:${moi}:faveurs`,
                marques: { neutre: id },
            })}
            style={{ fontWeight: "bold", padding: "4px 12px", backgroundColor: COULEUR_A_FAIRE }}
        >
            Obtenir une faveur
        </button>
        <EnvoyerVers lien={lien} apres={fermer} />
        {mesFaveurs > 0 && (
            <span style={{ color: "#1b5e20", fontSize: 13 }}>
                Vous en avez {mesFaveurs}.
            </span>
        )}
        <span style={{ color: "#555", fontSize: 13 }}>
            Ses unités et habilités reçoivent agents, ressources, fragments et cartes.
        </span>
    </>);

    return (
        <Fenetre titre={nom} actions={actions} fermer={fermer}>
            <Defilable style={{ border: "1px solid #aaa" }}>
                <Emplacements prefixe={"neutre:" + id} stylePions={stylePions} style={{ width: "max-content" }}>
                    <LoadAndDisplay link={lien} />
                </Emplacements>
            </Defilable>
        </Fenetre>
    );
}

export function FactionsNeutres() {

    const factions = useListe("neutral");

    // Faction regardée (sa fenêtre est ouverte)
    const [ouverte, setOuverte] = useState(null);

    const regardee = factions.find(f => f.id === ouverte);

    return (
        <div style={styleBoite}>
            <b style={{ fontSize: 13 }}>Factions neutres <span style={{ fontWeight: "normal", color: "#555" }}>(clic : voir, obtenir une faveur)</span></b>

            <div style={styleListe}>
                {factions.length === 0 && <i>Aucune faction neutre.</i>}

                {factions.map(f => (
                    <Onglet key={f.id} ouvert={ouverte === f.id} onClick={() => setOuverte(f.id)}>
                        {f.contenu?.logo && (
                            <img src={encodeURI(pub + f.contenu.logo)} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                        )}
                        {f.nom}
                    </Onglet>
                ))}
            </div>

            {regardee && (
                <FactionNeutre
                    id={regardee.id}
                    nom={regardee.nom}
                    fermer={() => setOuverte(null)}
                />
            )}
        </div>
    );
}

// ============================================================
// FEUILLES DE TECHNOLOGIE SPÉCIALES
// ============================================================

// Type de lien d'une feuille ni commun ni lié à une faction : elle n'est
// distribuée à personne à la mise en place (événement, règle spéciale)
const estSpeciale = contenu =>
    !!contenu?.lienType && !["commun", "faction"].includes(contenu.lienType);

function FeuilleSpeciale({ id, nom, contenu, fermer }) {

    const { jeu, jouer, envoyer, joueur, partie, index, search } = useEngine();

    const Display = affichageFeuille(jeu, contenu);

    const lienFeuille = useMemo(() => ({ type: "techsheet", id }), [id]);

    // Technologies déjà débloquées sur la feuille : toutes leurs cases
    // seront cochées, comme à la mise en place
    const liens = contenu?.techs || [];
    const techs = useElements(liens.map(lien => lien?.id));

    // Joueurs qui ont déjà cette feuille
    const aDeja = u => (index.parZone.get(`joueur:${u}:tech`) || [])
        .some(c => c.ref?.type === "techsheet" && c.ref.id === id);

    const destinataires = partie.joueurs.filter(j => !aDeja(j.userId));

    // Crée la feuille dans l'onglet Technologie de ces joueurs (identifiants)
    async function envoyerA(joueurs, commentaire) {

        // Feuilles déjà posées : les nouvelles sont celles qui n'y sont pas
        const avant = new Set(partie.joueurs.flatMap(j =>
            (index.parZone.get(`joueur:${j.userId}:tech`) || []).map(c => c.id)));

        const r = await envoyer(
            joueurs.map(u => ({
                type: "creer",
                ref: { type: "techsheet", id },
                zone: `joueur:${u}:tech`,
                proprio: u,
            })),
            commentaire
        );

        // Second coup : cocher les technologies déjà débloquées des
        // nouvelles feuilles (leur identifiant n'est connu qu'après création)
        const debloquees = (contenu?.unlocked || [])
            .map((oui, k) => (oui && liens[k]?.id > 0 ? k : null))
            .filter(k => k !== null);

        if (!r?.etat || !debloquees.length) {
            return;
        }

        const nouvelles = Object.values(r.etat.composants).filter(c =>
            c.ref?.type === "techsheet" && c.ref.id === id && !avant.has(c.id) &&
            /^joueur:\d+:tech$/.test(c.zone));

        jouer(nouvelles.flatMap(c => debloquees.map(k => ({
            type: "compteur",
            id: `${c.zone}:${c.id}:${k}`,
            valeur: Number(techs[liens[k].id]?.cout) || 1,
        }))));
    }

    const envoyerATous = () => envoyerA(
        destinataires.map(j => j.userId),
        `Feuille ${sansPrefixe(contenu?.name)} envoyée à chaque joueur`
    );

    // « Envoyer vers… » : vers l'onglet Technologie d'un joueur, comme
    // ci-dessus (technologies débloquées cochées) ; ailleurs, simple création
    function envoyerVers(zone) {

        const tech = /^joueur:(\d+):tech$/.exec(zone);

        if (tech) {
            envoyerA([Number(tech[1])], `Feuille ${sansPrefixe(contenu?.name)} envoyée`);
            return;
        }

        jouer({
            type: "creer",
            ref: { type: "techsheet", id },
            zone,
            proprio: Number(/^joueur:(\d+):/.exec(zone)?.[1]) || undefined,
        });
    }

    if (!contenu) {
        return null;
    }

    const actions = joueur && (<>
                    <EnvoyerVers lien={lienFeuille} surEnvoi={envoyerVers} apres={fermer} />
                    <button
                        type="button"
                        disabled={!destinataires.length}
                        onClick={envoyerATous}
                        title={destinataires.length
                            ? "Ajoute cette feuille à l'onglet Technologie de " +
                                destinataires.map(j => j.nom).join(", ")
                            : "Tous les joueurs ont déjà cette feuille"}
                        style={{ fontWeight: "bold", padding: "4px 12px", backgroundColor: destinataires.length ? COULEUR_A_FAIRE : undefined }}
                    >
                        Envoyer dans les technologies de chaque joueur
                    </button>
                    {destinataires.length < partie.joueurs.length && (
                        <span style={{ color: "#555", fontSize: 13 }}>
                            Déjà chez : {partie.joueurs.filter(j => aDeja(j.userId)).map(j => j.nom).join(", ")}
                        </span>
                    )}
                    {contenu.lienElement?.id > 0 && (
                        <span style={{ color: "#555", fontSize: 13 }}>
                            Liée à : {nomElement(search, contenu.lienElement)}
                        </span>
                    )}
    </>);

    return (
        <Fenetre titre={nom} actions={actions} fermer={fermer}>
            <Defilable style={{ border: "1px solid #aaa" }}>
                <div style={{ width: "max-content" }}>
                    <Display content={contenu} />
                </div>
            </Defilable>
        </Fenetre>
    );
}

// ============================================================
// TOKENS : tous les éléments de type « token » des données du jeu,
// en réserve illimitée. Glisser une source en crée un sans
// propriétaire là où on le dépose (Maj : posé sur un pion, une carte).
// ============================================================

export function ReserveTokens() {

    const { joueur } = useEngine();

    const tokens = useListe("token");

    return (
        <div style={styleBoite}>
            <b style={{ fontSize: 13 }}>Tokens <span style={{ fontWeight: "normal", color: "#555" }}>(réserve illimitée : glisser pour en poser un)</span></b>

            <div style={styleListe}>
                {tokens.length === 0 && <i>Aucun token.</i>}

                {joueur && tokens.map(t => (
                    <Source key={t.id} lien={{ type: "token", id: t.id }} neutre />
                ))}
            </div>
        </div>
    );
}

// ============================================================
// RECHERCHER UNE CARTE : parmi tous les éléments du jeu, par son nom.
// Un clic sur un résultat ouvre sa fenêtre : l'élément en entier,
// « Envoyer vers… » (il est créé dans la zone choisie) et « Montrer à… ».
// ============================================================

const MAX_RESULTATS = 40;

// Comparaison sans accents ni majuscules
const simplifier = texte => (texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function RechercheCarte() {

    const { search, jeu } = useEngine();

    const [texte, setTexte] = useState("");
    const [ouverte, setOuverte] = useState(null);

    const cherche = simplifier(texte.trim());

    const trouves = cherche.length < 2
        ? []
        : search
            .filter(e => simplifier(sansPrefixe(e.name)).includes(cherche))
            .sort((a, b) => sansPrefixe(a.name).localeCompare(sansPrefixe(b.name)));

    const regardee = ouverte && search.find(e => e.id === ouverte);

    return (
        <div data-recherche-carte style={styleBoite}>
            <label style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <b style={{ fontSize: 13 }}>Rechercher une carte</b>
                <input
                    type="search"
                    value={texte}
                    onChange={e => setTexte(e.target.value)}
                    placeholder="nom d'une carte, d'une unité, d'une technologie…"
                    style={{ flex: "1 1 220px", maxWidth: 420 }}
                />
                <span style={{ fontSize: 12, color: "#555" }}>
                    {cherche.length < 2
                        ? "parmi tous les éléments du jeu (2 lettres au moins)"
                        : `${trouves.length} résultat${trouves.length > 1 ? "s" : ""}` +
                            (trouves.length > MAX_RESULTATS ? `, les ${MAX_RESULTATS} premiers affichés` : "")}
                </span>
            </label>

            {trouves.length > 0 && (
                <div style={styleListe}>
                    {trouves.slice(0, MAX_RESULTATS).map(e => (
                        <Onglet key={e.id} ouvert={ouverte === e.id} onClick={() => setOuverte(e.id)}>
                            {/* Comme la recherche de l'en-tête : nom et icônes, lien, type */}
                            <LigneElement jeu={jeu} element={e} />
                        </Onglet>
                    ))}
                </div>
            )}

            {regardee && (
                <ElementTrouve element={regardee} fermer={() => setOuverte(null)} />
            )}
        </div>
    );
}

function ElementTrouve({ element, fermer }) {

    // Le lien doit garder la même référence d'un rendu à l'autre
    const lien = useMemo(() => ({ type: element.type, id: element.id }), [element.type, element.id]);

    return (
        <Fenetre
            titre={sansPrefixe(element.name)}
            fermer={fermer}
            actions={<>
                <EnvoyerVers lien={lien} apres={fermer} />
                <MontrerA lien={lien} />
            </>}
        >
            <LoadAndDisplay link={lien} />
        </Fenetre>
    );
}

export function FeuillesSpeciales() {

    const feuilles = useListe("techsheet").filter(f => estSpeciale(f.contenu));

    // Feuille regardée (sa fenêtre est ouverte)
    const [ouverte, setOuverte] = useState(null);

    const regardee = feuilles.find(f => f.id === ouverte);

    return (
        <div style={styleBoite}>
            <b style={{ fontSize: 13 }}>Feuilles de technologie spéciales (règles) <span style={{ fontWeight: "normal", color: "#555" }}>(clic : voir, envoyer aux joueurs)</span></b>

            <div style={styleListe}>
                {feuilles.length === 0 && <i>Aucune feuille spéciale.</i>}

                {feuilles.map(f => (
                    <Onglet key={f.id} ouvert={ouverte === f.id} onClick={() => setOuverte(f.id)}>
                        {f.nom}
                    </Onglet>
                ))}
            </div>

            {regardee && (
                <FeuilleSpeciale
                    id={regardee.id}
                    nom={regardee.nom}
                    contenu={regardee.contenu}
                    fermer={() => setOuverte(null)}
                />
            )}
        </div>
    );
}
