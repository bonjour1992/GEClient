import { useEffect, useMemo, useRef } from "react";
import { getHandler } from "../../games";
import { useEngine, Emplacements, nomElement, confirmerRegle } from "./Interaction";
import { Text } from "../../../Component/Text";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { getFromType } from "../../../lib/store";
import { lireJournal, noter, noterFinie } from "./recherche";
import { useElement, useElements, chargerContenu } from "./sync";
import { SCRIPTS, rechercheDeSource } from "./scripts";

// ============================================================
// ONGLET TECHNOLOGIE
//
// Une feuille de technologie est un composant de la zone
// joueur:<u>:tech. L'avancement est dans des compteurs :
//
//   joueur:<u>:tech:<composant>:<k>      nombre de cases de
//                                        recherche cochées (0 à coût)
//   joueur:<u>:techUse:<composant>:<k>   1 = utilisée ce tour
//
// Une technologie peut être partiellement recherchée (2 cases
// sur 6) ; elle est obtenue quand toutes ses cases sont cochées.
//
// L'affichage est celui de la feuille (techSheet.jsx), dont
// chaque technologie porte l'attribut data-tech="<k>".
//
//   clic         -> une case de recherche de plus
//   Ctrl + clic  -> une case de moins
//   Maj + clic   -> utilisée ce tour / disponible
//
// Connaissance d'une feuille (grille de droite, data-connaissance) :
// 2 points par technologie obtenue, plus ceux qu'on y recherche
// (clic / Ctrl + clic : compteur joueur:<u>:tech:<composant>:connaissance).
// Une ligne pleine (connaissanceReq points) est un niveau. Une
// technologie à prérequis — son rang (tier) moins un — demande autant
// de niveaux de connaissance de sa feuille : sinon la case cochée
// demande une confirmation.
// ============================================================

// Pions posés sur une technologie : par-dessus le bas de sa carte
const stylePions = () => ({
    position: "relative",
    zIndex: 5,
    // Dans la carte, en bas à droite, au-dessus de la barre de recherche
    display: "flex",
    top: -66,
    paddingRight: 16,
    justifyContent: "flex-end",
});

const estFeuille = c => c.ref?.type === "techsheet";

// ------------------------------------------------------------
// JOURNAL DE RECHERCHE DU TOUR (cadre en haut de l'onglet)
//
// Ce que le joueur gagne et applique en recherche, phase par phase et
// dans l'ordre (compteurs : recherche.js) :
//
//   Ravitaillement
//     Forge du vide génère [rech]
//     Apprentissage + [gen]
//   Science
//     Recherche sur Hercant [rech](2)
//     Recherche sur Antarès [rech](2) spé mil
//     Récupération + [mil](4) fini ✓
//
// « Rechercher » (fiche d'un système) y note la recherche gagnée ; une
// case cochée sur une technologie ou sur la connaissance d'une feuille
// s'y ajoute ; une autre source se note à la main. Effacé à « Nouveau tour ».
// ------------------------------------------------------------

const styleMacro = { display: "inline-block", verticalAlign: "middle" };
const styleMini = { fontSize: 11, padding: "0 4px" };

// Sources qu'on peut noter à la main
const TYPES_SOURCE = ["tech", "unit", "planet", "relique", "habilite", "mercenaire", "agent", "faction"];

// « 11.Phase de science » -> « Science »
const libellePhase = nom => {
    const court = String(nom || "").replace(/^\s*\d+\s*\.?\s*/, "").replace(/^phase\s+(de\s+|d['’]\s*)?/i, "").trim();

    return court ? court[0].toUpperCase() + court.slice(1) : "Hors phase";
};

function RechercheDuTour({ base }) {

    const { etat, jouer, joueur, search } = useEngine();

    const userId = Number(base.split(":")[1]);
    const journal = lireJournal(etat, userId);

    const contenus = useElements([...new Set(journal.lignes.map(l => l.element))]);

    // Nom de chaque phase, par numéro
    const phases = new Map(getFromType(search, ["phase"]).map(e => {
        const nom = nomElement(search, { type: "phase", id: e.id });

        return [Number(/^\s*(\d+)/.exec(nom)?.[1]) || 0, libellePhase(nom)];
    }));

    const nom = l => (contenus[l.element]?.name || nomElement(search, { id: l.element }) || "…").replace(/^!([^!]*)!/, "");
    const macro = (type, n) => `#re${type}${n > 1 ? `(${n})` : ""}`;

    // Recherche générée par une source : typée si son script le dit (SR-42 : spatiale)
    const genere = l => {
        const typee = rechercheDeSource(l.element);
        const total = (typee || []).reduce((s, [, n]) => s + n, 0);
        const fois = total ? l.n / total : 0;

        return Number.isInteger(fois) && fois >= 1
            ? typee.map(([type, n]) => macro(type || "ch", n * fois)).join(" ")
            : macro("ch", l.n);
    };

    // Lignes groupées par phase, dans l'ordre d'arrivée
    const groupes = [];

    for (const ligne of journal.lignes) {
        if (groupes.at(-1)?.phase !== ligne.phase) {
            groupes.push({ phase: ligne.phase, lignes: [] });
        }

        groupes.at(-1).lignes.push(ligne);
    }

    const ajuster = (ligne, delta) => jouer({ type: "compteur", id: ligne.id, valeur: Math.max(0, ligne.n + delta) });

    return (
        <div
            data-recherche-du-tour
            style={{
                padding: "6px 10px",
                border: "2px solid #1565c0",
                borderRadius: 8,
                backgroundColor: "#e3f2fd",
                color: "#000",
                fontSize: 13,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <b>Recherche du tour</b>

                {journal.lignes.length === 0 && <i>rien pour l'instant (fiche d'un système, « Rechercher » ; puis cochez les cases).</i>}

                {/* Une source que l'outil ne connaît pas : notée à la main */}
                {joueur && (
                    <span data-ajouter-source style={{ marginLeft: "auto", fontSize: 12 }}>
                        <ModalPickerInput
                            name="source"
                            label="Autre source de recherche"
                            value={{ source: null }}
                            onChange={(champ, lien) => lien?.id > 0 && jouer(noter(etat, userId, "g", Number(lien.id), 1))}
                            type={TYPES_SOURCE}
                        />
                    </span>
                )}
            </div>

            {groupes.map((groupe, g) => (
                <div key={g} data-phase-recherche={groupe.phase} style={{ marginTop: 3 }}>
                    <b style={{ color: "#0d47a1" }}>{phases.get(groupe.phase) || "Hors phase"}</b>

                    {groupe.lignes.map(l => (
                        <div key={l.id} data-ligne-recherche={l.sorte + ":" + l.element} style={{ paddingLeft: 14 }}>
                            {l.sorte === "p" && (<>
                                Recherche sur {nom(l)} <Text text={`#rech(${l.n})`} style={styleMacro} />
                                {(contenus[l.element]?.techSpe || []).length > 0 && ` spé ${contenus[l.element].techSpe.join(", ")}`}
                            </>)}

                            {l.sorte === "g" && (<>
                                {nom(l)} génère <Text text={genere(l)} style={styleMacro} />
                            </>)}

                            {l.sorte === "t" && (<>
                                {nom(l)} + <Text text={macro(contenus[l.element]?.techType || "ch", l.n)} style={styleMacro} />
                                {/* (finie : dit sur sa dernière ligne, celle où elle l'a été) */}
                                {journal.finies.has(l.element) &&
                                    journal.lignes.findLast(x => x.sorte === "t" && x.element === l.element) === l &&
                                    <b style={{ color: "#1b5e20" }}> fini ✓</b>}
                            </>)}

                            {l.sorte === "c" && (<>
                                Connaissance ({nom(l)}) + <Text text={macro(contenus[l.element]?.techType || "ch", l.n)} style={styleMacro} />
                            </>)}

                            {/* Recherche gagnée : la quantité se corrige ici */}
                            {joueur && (l.sorte === "p" || l.sorte === "g") && (
                                <span style={{ marginLeft: 6 }}>
                                    <button type="button" title="Un point de moins" style={styleMini} onClick={() => ajuster(l, -1)}>−</button>{" "}
                                    <button type="button" title="Un point de plus" style={styleMini} onClick={() => ajuster(l, 1)}>+</button>{" "}
                                    <button type="button" title="Retirer cette ligne" style={styleMini} onClick={() => ajuster(l, -l.n)}>✕</button>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// Feuille « small » (ex. Signal, Tempête) : seules les cases 8 à 15 sont
// utilisées. Retourne l'affichage à utiliser pour cette feuille.
export function affichageFeuille(jeu, contenu) {

    const liens = contenu?.techs || [];
    const small = liens.every((lien, k) => (k >= 8 && k <= 15) || !lien || lien.id === -1);
    const affichages = getHandler(jeu, "techsheet").display;

    return small && affichages.small ? affichages.small : affichages.default;
}

function Feuille({ composant, base }) {

    const {
        etat, index, jouer, envoyer, joueur, jeu, ouvrirFiche, partie, factionDe, nomDe, aviser,
        aScript, aTechnologie, scriptsDesactives, search,
    } = useEngine();

    const contenu = useElement(composant.ref.id);
    const racine = useRef(null);

    // --------------------------------------------------------
    // TECHNOLOGIE POSÉE
    //
    // Une technologie (composant de type « tech ») déposée sur une case
    // vide de la feuille y prend la place d'une technologie imprimée :
    // même affichage, mêmes cases de recherche, « utilisée ce tour ».
    // Elle n'est donc pas montrée en pion ; un petit bouton ouvre sa
    // fiche (l'envoyer ailleurs, la retirer).
    // --------------------------------------------------------

    const zoneCase = k => `${base}:tech:${composant.id}:case:${k}`;
    const estTech = c => !c.cache && c.ref?.type === "tech";

    const imprimes = contenu?.techs || [];

    const posee = k => (imprimes[k]?.id > 0
        ? null
        : (index.parZone.get(zoneCase(k)) || []).find(estTech) || null);

    const signaturePosees = imprimes.map((lien, k) => posee(k)?.ref.id || 0).join(",");

    // Liens de la feuille, technologies posées comprises (mêmes références
    // d'un rendu à l'autre : les cartes ne se rechargent pas)
    const liens = useMemo(
        () => imprimes.map((lien, k) => (posee(k) ? { type: "tech", id: posee(k).ref.id, __link: true } : lien)),
        [contenu, signaturePosees]
    );

    // Coût de chaque technologie de la feuille
    const techs = useElements(liens.map(lien => lien?.id));
    const cout = k => Number(techs[liens[k]?.id]?.cout) || 1;

    const idProgres = k => `${base}:tech:${composant.id}:${k}`;
    const idUtilisee = k => `${base}:techUse:${composant.id}:${k}`;
    const progres = k => Number(etat.compteurs[idProgres(k)]) || 0;

    // Joueur à qui est la feuille
    const chercheur = Number(base.split(":")[1]);

    // Connaissance : 2 points par technologie obtenue, plus les points recherchés
    const idConnaissance = `${base}:tech:${composant.id}:connaissance`;
    const connaissancePlus = Number(etat.compteurs[idConnaissance]) || 0;
    const obtenues = liens.filter((lien, k) => lien?.id > 0 && progres(k) >= cout(k)).length;
    const parNiveau = Number(contenu?.connaissanceReq) || 8;
    const niveau = Math.floor((2 * obtenues + connaissancePlus) / parNiveau);

    // Marque les technologies utilisées ce tour. L'affichage de la feuille
    // recrée ses cases à chaque rendu : la marque est reposée à chaque fois.
    useEffect(() => {

        for (const noeud of racine.current?.querySelectorAll("[data-tech]") || []) {
            const use = !!etat.compteurs[idUtilisee(noeud.dataset.tech)];

            noeud.style.opacity = use ? 0.4 : "";
            noeud.style.cursor = "pointer";
            noeud.title = use ? "Utilisée ce tour" : "";
        }

        for (const noeud of racine.current?.querySelectorAll("[data-connaissance]") || []) {
            noeud.style.cursor = "pointer";
            noeud.title = `Connaissance : niveau ${niveau} (${2 * obtenues + connaissancePlus} points, ${parNiveau} par niveau). ` +
                "Clic : un point de recherche de plus. Ctrl + clic : un de moins.";
        }
    });

    if (!contenu) {
        return null;
    }

    // Feuille « small » (ex. Signal, Tempête) : seules les cases 8 à 15 sont utilisées
    const Display = affichageFeuille(jeu, contenu);

    const affiche = {
        ...contenu,
        techs: liens,
        progres: liens.map((lien, k) => progres(k)),
        // Obtenue : toutes ses cases de recherche sont cochées
        unlocked: liens.map((lien, k) => progres(k) >= cout(k)),
        // Points de connaissance recherchés, en plus de ceux des technologies obtenues
        connaissancePlus,
    };

    function onClick(event) {

        // Un clic sur un pion posé sur la technologie ouvre sa fiche
        if (event.target.closest("[data-composant]")) {
            return;
        }

        // Connaissance : un point de recherche de plus (Ctrl + clic : un de moins)
        if (joueur && event.target.closest("[data-connaissance]")) {

            const delta = event.ctrlKey ? -1 : 1;

            if (connaissancePlus + delta >= 0) {
                jouer([
                    { type: "compteur", id: idConnaissance, valeur: connaissancePlus + delta },
                    noter(etat, chercheur, "c", composant.ref.id, delta),
                ]);
            }

            return;
        }

        const noeud = event.target.closest("[data-tech]");

        if (!noeud || !joueur) {
            return;
        }

        const k = Number(noeud.dataset.tech);

        if (event.shiftKey) {
            const id = idUtilisee(k);

            jouer({ type: "compteur", id, valeur: etat.compteurs[id] ? 0 : 1 });
            return;
        }

        const valeur = Math.max(0, Math.min(cout(k), progres(k) + (event.ctrlKey ? -1 : 1)));

        if (valeur === progres(k)) {
            return;
        }

        const idTech = Number(liens[k]?.id);
        const plus = valeur > progres(k);

        // Prérequis : le rang de la technologie, moins un, en niveaux de connaissance
        // de cette feuille. S'il manque, la case cochée demande une confirmation.
        const prerequis = Math.max(0, (Number(techs[idTech]?.tier) || 1) - 1);

        const commentaire = plus && niveau < prerequis
            ? confirmerRegle(`Rechercher ${nomElement(search, { type: "tech", id: idTech })}`, [
                `prérequis : ${prerequis} niveau${prerequis > 1 ? "x" : ""} de connaissance, vous en avez ${niveau}`,
            ])
            : "";

        if (commentaire === null) {
            return;
        }

        // La case cochée (ou décochée) est notée au journal de recherche du tour
        const avance = [
            { type: "compteur", id: idProgres(k), valeur },
            noter(etat, chercheur, "t", idTech, plus ? 1 : -1),
            noterFinie(etat, chercheur, idTech, valeur >= cout(k)),
        ].filter(Boolean);

        // Une case de moins : rien d'autre
        if (!plus) {
            jouer(avance);
            return;
        }

        reactions(idTech, valeur >= cout(k)).then(({ actions, messages }) => {

            if (!actions.length && !commentaire) {
                jouer(avance);
                return;
            }

            envoyer([...avance, ...actions], [commentaire, ...messages].filter(Boolean).join(" — "));

            if (messages.length) {
                aviser(messages.join(" "));
            }
        });
    }

    // --------------------------------------------------------
    // SCRIPTS DÉCLENCHÉS PAR UNE CASE DE RECHERCHE (scripts.js)
    //
    //   Brevet            un autre joueur qui possède cette technologie
    //                     gagne 1 commerce (une fois par tour, par
    //                     chercheur et par technologie : compteur
    //                     brevet:<lui>:<chercheur>:<technologie>) ;
    //   Soleil de guerre  la technologie vient d'être obtenue : un soleil
    //                     de guerre de la faction arrive dans les éléments
    //                     actifs du joueur.
    // -> { actions, messages }
    // --------------------------------------------------------

    async function reactions(idTech, obtenue) {

        const chercheur = Number(base.split(":")[1]);
        const actions = [];
        const messages = [];

        for (const j of partie.joueurs) {

            const cle = `brevet:${j.userId}:${chercheur}:${idTech}`;

            if (j.userId !== chercheur && aScript(j.userId, "brevet") && aTechnologie(j.userId, idTech) &&
                Number(etat.compteurs[cle]) !== etat.tour) {
                actions.push({ type: "compteur", id: cle, valeur: etat.tour });
                actions.push({ type: "compteur", id: `joueur:${j.userId}:commerce`, delta: 1 });
                messages.push(`Brevet : ${nomDe(j.userId)} gagne 1 commerce (${nomDe(chercheur)} recherche une technologie qu'il possède).`);
            }
        }

        const soleil = SCRIPTS.find(s => s.id === "soleil-de-guerre");

        if (obtenue && idTech === soleil?.carte.id && !scriptsDesactives.includes(soleil.id)) {

            const faction = await chargerContenu(factionDe(chercheur) ?? -1);
            const ids = (faction?.units || []).map(lien => Number(lien?.id)).filter(id => id > 0);
            const unites = await Promise.all(ids.map(chargerContenu));
            const id = ids.find((x, i) => unites[i]?.type === "sun");

            if (id) {
                actions.push({ type: "creer", ref: { type: "unit", id }, zone: `${base}:actif`, proprio: chercheur });
                messages.push("Soleil de guerre : technologie obtenue, un soleil de guerre arrive dans les éléments actifs.");
            }
        }

        return { actions, messages };
    }

    return (
        <div ref={racine} onClick={onClick} style={{ width: "max-content" }}>
            {/* Chaque technologie (data-emplacement "case:<k>") reçoit des
                éléments : zone joueur:<u>:tech:<feuille>:case:<k> */}
            <Emplacements
                prefixe={`${base}:tech:${composant.id}`}
                stylePions={stylePions}
                // La technologie posée s'affiche déjà comme une technologie imprimée
                filtrePions={zone => c => c.id !== posee(Number(zone.split(":").pop()))?.id}
                extra={zone => {
                    const c = posee(Number(zone.split(":").pop()));

                    return c && joueur && (
                        <button
                            type="button"
                            data-tech-posee={c.id}
                            title="Technologie posée sur cette case : ouvrir sa fiche (l'envoyer ailleurs, la retirer)"
                            onClick={event => {
                                event.stopPropagation();
                                ouvrirFiche(c.id);
                            }}
                            style={{ fontSize: 11, padding: "0 4px", marginRight: 4 }}
                        >
                            ⚙ posée
                        </button>
                    );
                }}
            >
                <Display content={affiche} />
            </Emplacements>
        </div>
    );
}

export function Technologie({ vu }) {

    const { index, jouer, joueur, etat } = useEngine();

    const base = "joueur:" + vu.userId;
    const feuilles = (index.parZone.get(base + ":tech") || []).filter(estFeuille);

    // Fin de tour : toutes les technologies redeviennent disponibles
    function toutRendreDisponible() {
        jouer(
            Object.keys(etat.compteurs)
                .filter(id => id.startsWith(base + ":techUse:") && etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 }))
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <span>
                    Clic : une case de recherche de plus. Ctrl + clic : une de moins.
                    Maj + clic : utilisée ce tour.
                </span>
                {joueur && (
                    <button type="button" onClick={toutRendreDisponible}>
                        Tout rendre disponible
                    </button>
                )}
            </div>

            <RechercheDuTour base={base} />

            {feuilles.length === 0 && <div>Aucune feuille de technologie.</div>}

            <div style={{ overflowX: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {feuilles.map(f => (
                    <Feuille key={f.id} composant={f} base={base} />
                ))}
            </div>
        </div>
    );
}
