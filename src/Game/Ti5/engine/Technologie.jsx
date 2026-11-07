import { useEffect, useRef } from "react";
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

function Feuille({ composant, base }) {

    const { etat, jouer, joueur, jeu } = useEngine();

    const contenu = useElement(composant.ref.id);
    const racine = useRef(null);

    // Coût de chaque technologie de la feuille
    const liens = contenu?.techs || [];
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
    const small = liens.every((lien, k) => (k >= 8 && k <= 15) || !lien || lien.id === -1);
    const affichages = getHandler(jeu, "techsheet").display;
    const Display = small && affichages.small ? affichages.small : affichages.default;

    const affiche = {
        ...contenu,
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
            <Emplacements prefixe={`${base}:tech:${composant.id}`} stylePions={stylePions}>
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
