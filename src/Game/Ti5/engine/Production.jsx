import { useEffect } from "react";
import { useEngine, nomCase, nomElement } from "./Interaction";
import { contenuEnCache, chargerContenu } from "./sync";
import { ACTIVATION, typeUnite } from "./miseEnPlace";

// ============================================================
// PRODUCTION
//
// Phase de production : Ctrl + clic sur une de mes unités qui a la
// capacité « #prod(quantité, types) » ouvre une production. Un
// marqueur d'activation est posé sur l'unité, un bandeau au-dessus
// de l'espace dit où l'on en est (« Dock, case 59 : 1/3 ») et
// « Terminer la production » la clôt.
//
// Tant qu'elle est ouverte :
//   - glisser une unité hors de ma réserve la paie en ressources et
//     compte dans la quantité produite ;
//   - dans la réserve, ce que cette unité ne peut pas produire est
//     cerclé de rouge (le produire quand même demande une confirmation) ;
//   - une unité capturée (une unité d'un autre joueur dans mes éléments
//     actifs) glissée sur la carte me donne mon unité du même type, sans
//     coût, et retourne dans la réserve de son propriétaire.
//
// Une capacité de production que l'outil ne sait pas lire (pas de
// quantité, pas de types) laisse tout produire : c'est aussi le cas
// de la case « Production » de la réserve, cochée à la main.
//
// État (contexte de la partie, `production`) : false, true (case
// cochée, production libre), ou
//   { source, nom, numero, max, types, fait, reduction }
// Scripts : Logistique améliorée (un dock produit la capacité
// logistique), IA industrielle (docks : +2 ; sur une planète
// militaire, le coût total baisse de 2).
// ============================================================

const sansAccent = texte => String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Capacité de production écrite sur une unité : { quantite, types } ou null
//   quantite : nombre, "clog" (capacité logistique du joueur) ou null (non lue)
//   types    : ["vaisseau", "mech"] ou null (tout est productible)
export function lireProduction(contenu) {

    const m = /#prod(?:\(([^,)]*)(?:,([^)]*))?\))?/i.exec(contenu?.habilite || "");

    if (!m) {
        return null;
    }

    const quantite = /clog/i.test(m[1] || "") ? "clog" : (Number(m[1]) > 0 ? Number(m[1]) : null);
    const types = (m[2] || "").split("/").map(sansAccent).filter(Boolean);

    return { quantite, types: types.length ? types : null };
}

// Cette unité fait-elle partie des types productibles ? (types null : tout l'est)
export function estProductible(contenu, types) {

    if (!types || !contenu) {
        return true;
    }

    const mots = contenu.mot_cle || [];
    const nom = sansAccent(contenu.name);

    return types.some(type =>
        (/^vaisseaux?$/.test(type) && mots.includes("ship")) ||
        (/^vaisseaux? militaires?$/.test(type) && mots.includes("ship") && mots.includes("mil")) ||
        (/^mechs?$/.test(type) && typeUnite(contenu) === "mech") ||
        (/^infanteries?$/.test(type) && typeUnite(contenu) === "inf") ||
        (/^structures?$/.test(type) && mots.includes("struc")) ||
        nom.includes(type.replace(/s$/, "")));
}

// Ouvre une production avec cette unité (Ctrl + clic, phase de production).
// Retourne vrai si le clic était pour elle.
export async function ouvrirProduction(ctx, c, confirmer) {

    const { etat, index, moi, search, envoyer, setProduction, capaciteLogistique, aScript } = ctx;

    const m = /^hex:(\d+)(?::planete:(\d+))?$/.exec(c.zone || "");

    if (!m || c.ref?.type !== "unit" || (c.marques?.possession ?? c.proprio) !== moi) {
        return false;
    }

    const contenu = await chargerContenu(c.ref.id);
    const capacite = lireProduction(contenu);

    if (!capacite) {
        return false;
    }

    const nom = nomElement(search, c.ref);
    const numero = Number(m[1]);
    const estDock = typeUnite(contenu) === "dock";
    const ia = estDock && aScript(moi, "ia-industrielle");

    // Planète militaire du dock (IA industrielle : le coût total baisse de 2)
    let militaire = false;

    if (ia && m[2] !== undefined) {
        const tuile = (index.parZone.get("hex:" + numero) || []).find(x => x.ref?.type === "system");
        const systeme = tuile && await chargerContenu(tuile.ref.id);
        const planete = await chargerContenu(Number(systeme?.elems?.[Number(m[2])]?.id) || -1);

        militaire = planete?.planetType === "mil";
    }

    const base = capacite.quantite === "clog" ? capaciteLogistique(moi) : capacite.quantite;
    const dejaActivee = Object.values(etat.composants).some(x => x.sur === c.id && !x.ref && x.jeton === ACTIVATION);

    const commentaire = confirmer(`Produire avec ${nom} (${nomCase(numero)})`, [
        !/production/i.test(etat.phase) && "ce n'est pas la phase de production",
        dejaActivee && "cette unité est déjà activée",
    ]);

    if (!commentaire) {
        return true;
    }

    envoyer([{ type: "creer", jeton: ACTIVATION, sur: c.id }], commentaire);

    setProduction({
        source: c.id,
        nom,
        numero,
        max: base === null ? null : base + (ia ? 2 : 0),
        types: capacite.types,
        fait: 0,
        reduction: militaire ? 2 : 0,
    });

    return true;
}

// ------------------------------------------------------------
// Bandeau « production en cours », au-dessus de l'espace
// ------------------------------------------------------------

export function ProductionEnCours() {

    const { production, setProduction } = useEngine();

    if (!production || production === true) {
        return null;
    }

    const depasse = production.max !== null && production.fait > production.max;

    return (
        <div
            data-production-en-cours={production.source}
            style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 8,
                padding: "6px 10px",
                border: "2px solid #ff9800",
                borderRadius: 8,
                backgroundColor: "#fff3cd",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 14,
            }}
        >
            <b>Production en cours</b>
            <span>
                {production.nom}, {nomCase(production.numero)} :{" "}
                <b style={{ color: depasse ? "#b71c1c" : undefined }}>
                    {production.fait}{production.max !== null ? " / " + production.max : ""}
                </b>
            </span>
            <span style={{ fontSize: 12, color: "#555" }}>
                {production.types ? `Productible : ${production.types.join(", ")}.` : "Tout est productible."}{" "}
                {production.reduction > 0 && `Coût réduit de ${production.reduction} (IA industrielle). `}
                Glissez les unités depuis votre réserve.
            </span>
            <button type="button" data-action="terminer-production" onClick={() => setProduction(false)} style={{ fontWeight: "bold" }}>
                Terminer la production
            </button>
        </div>
    );
}

// ------------------------------------------------------------
// Réserve : cercle de rouge ce que la production en cours ne peut
// pas produire. Les pions sont dessinés par l'engine : la marque
// est reposée à chaque rendu.
// ------------------------------------------------------------

export function ReserveProductible({ zone }) {

    const { etat, production } = useEngine();

    useEffect(() => {

        const types = production && production !== true ? production.types : null;

        for (const racine of document.querySelectorAll(`[data-zone="${zone}"]`)) {
            for (const pion of racine.querySelectorAll("[data-composant], [data-source]")) {

                let source = null;

                try {
                    source = pion.dataset.source ? JSON.parse(pion.dataset.source) : null;
                } catch {
                    source = null;
                }

                const idUnite = pion.dataset.composant
                    ? (etat.composants[pion.dataset.composant]?.ref?.type === "unit" ? etat.composants[pion.dataset.composant].ref.id : null)
                    : ((source?.type || "unit") === "unit" ? source?.id : null);

                const interdit = !!types && !!idUnite && !estProductible(contenuEnCache(idUnite), types);

                pion.style.outline = interdit ? "2px solid #c62828" : "";
                pion.style.opacity = interdit ? "0.55" : "";

                if (interdit) {
                    pion.dataset.nonProductible = "1";
                } else {
                    delete pion.dataset.nonProductible;
                }
            }
        }
    });

    return null;
}
