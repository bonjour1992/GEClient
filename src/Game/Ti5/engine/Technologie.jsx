import { useEffect, useMemo, useRef } from "react";
import { getHandler } from "../../games";
import { useEngine, Emplacements } from "./Interaction";
import { Text } from "../../../Component/Text";
import { techType } from "../ti5Const";
import { useElement, useElements, chargerContenu } from "./sync";
import { SCRIPTS } from "./scripts";

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
// RECHERCHE DU TOUR (cadre en haut de l'onglet)
//
//   <base>:rechTour:<planète>   points de recherche gagnés ce tour en
//                               recherchant sur cette planète (fiche du
//                               système, « Rechercher ») ;
//   <base>:rechFait:<type>      cases de recherche cochées ce tour, par
//                               type de technologie.
//
// Les deux sont remis à zéro à la fin de la phase de science (Partie.jsx).
// ------------------------------------------------------------

const RE_RECHERCHES = /^joueur:\d+:(rechTour|rechFait):/;

// Actions qui effacent les recherches du tour de tous les joueurs
export const effacerRecherches = etat => Object.keys(etat.compteurs)
    .filter(id => RE_RECHERCHES.test(id) && etat.compteurs[id])
    .map(id => ({ type: "compteur", id, valeur: 0 }));

const styleMacro = { display: "inline-block", verticalAlign: "middle" };

function RechercheDuTour({ base }) {

    const { etat, jouer, joueur } = useEngine();

    const lire = prefixe => Object.keys(etat.compteurs)
        .filter(id => id.startsWith(prefixe) && Number(etat.compteurs[id]) > 0)
        .map(id => ({ id, cle: id.slice(prefixe.length), n: Number(etat.compteurs[id]) }));

    const recherches = lire(base + ":rechTour:");
    const appliquees = lire(base + ":rechFait:");

    const planetes = useElements(recherches.map(r => Number(r.cle)));

    const nomPlanete = r => (planetes[Number(r.cle)]?.name || "une planète").replace(/^!([^!]*)!/, "");

    const specialites = r => (planetes[Number(r.cle)]?.techSpe || [])
        .map(t => (techType[t] || t).toLowerCase())
        .join(", ");

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
            <b>Recherche du tour</b>

            {recherches.length === 0 && <i style={{ marginLeft: 8 }}>aucune recherche lancée (fiche d'un système, « Rechercher »).</i>}

            {recherches.map(r => (
                <div key={r.id} data-recherche={r.cle}>
                    Recherche sur {nomPlanete(r)} <Text text={`#rech(${r.n})`} style={styleMacro} />
                    {specialites(r) && ` (spécialité ${specialites(r)})`}
                    {joueur && (
                        <button
                            type="button"
                            title="Retirer cette ligne"
                            onClick={() => jouer({ type: "compteur", id: r.id, valeur: 0 })}
                            style={{ marginLeft: 6, fontSize: 11, padding: "0 4px" }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            ))}

            <div data-recherche-appliquee style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid #90caf9" }}>
                <b>Recherche appliquée à ce tour</b> :{" "}
                {appliquees.length === 0
                    ? <i>aucune case cochée.</i>
                    : appliquees.map(a => (
                        <Text key={a.id} text={`#re${a.cle}${a.n > 1 ? `(${a.n})` : ""}`} style={{ ...styleMacro, marginRight: 6 }} />
                    ))}
            </div>
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
        aScript, aTechnologie, scriptsDesactives,
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

    // Marque les technologies utilisées ce tour. L'affichage de la feuille
    // recrée ses cases à chaque rendu : la marque est reposée à chaque fois.
    useEffect(() => {

        for (const noeud of racine.current?.querySelectorAll("[data-tech]") || []) {
            const use = !!etat.compteurs[idUtilisee(noeud.dataset.tech)];

            noeud.style.opacity = use ? 0.4 : "";
            noeud.style.cursor = "pointer";
            noeud.title = use ? "Utilisée ce tour" : "";
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
    };

    function onClick(event) {

        // Un clic sur un pion posé sur la technologie ouvre sa fiche
        if (event.target.closest("[data-composant]")) {
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

        // Recherche appliquée à ce tour : cases cochées, par type de technologie
        const type = techs[liens[k]?.id]?.techType;
        const idFait = `${base}:rechFait:${type}`;
        const fait = Number(etat.compteurs[idFait]) || 0;

        const avance = [
            { type: "compteur", id: idProgres(k), valeur },
            /^\w+$/.test(type || "") && (valeur > progres(k) || fait > 0) &&
                { type: "compteur", id: idFait, valeur: Math.max(0, fait + (valeur > progres(k) ? 1 : -1)) },
        ].filter(Boolean);

        // Une case de moins : rien d'autre
        if (valeur < progres(k)) {
            jouer(avance);
            return;
        }

        reactions(liens[k]?.id, valeur >= cout(k)).then(({ actions, messages }) => {

            if (!actions.length) {
                jouer(avance);
                return;
            }

            envoyer([...avance, ...actions], messages.join(" — "));
            aviser(messages.join(" "));
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
