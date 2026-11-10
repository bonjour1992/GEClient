import { useEffect, useMemo, useRef } from "react";
import { getHandler } from "../../games";
import { useEngine, Zone, Emplacements } from "./Interaction";
import { useElement, useElements } from "./sync";

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
const pasFeuille = c => !estFeuille(c);

// Feuille « small » (ex. Signal, Tempête) : seules les cases 8 à 15 sont
// utilisées. Retourne l'affichage à utiliser pour cette feuille.
export function affichageFeuille(jeu, contenu) {

    const liens = contenu?.techs || [];
    const small = liens.every((lien, k) => (k >= 8 && k <= 15) || !lien || lien.id === -1);
    const affichages = getHandler(jeu, "techsheet").display;

    return small && affichages.small ? affichages.small : affichages.default;
}

function Feuille({ composant, base }) {

    const { etat, index, jouer, joueur, jeu, ouvrirFiche } = useEngine();

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

        if (valeur !== progres(k)) {
            jouer({ type: "compteur", id: idProgres(k), valeur });
        }
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

            <Zone zone={base + ":tech"} titre="Éléments posés sur les technologies" filtre={pasFeuille} />

            {feuilles.length === 0 && <div>Aucune feuille de technologie.</div>}

            <div style={{ overflowX: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {feuilles.map(f => (
                    <Feuille key={f.id} composant={f} base={base} />
                ))}
            </div>
        </div>
    );
}
