import { useEffect } from "react";
import { useEngine, nomCase, nomElement, agentDisponible, tuileDe, choisirRemplacants, mercenairesQuiAgissent } from "./Interaction";
import { contenuEnCache, chargerContenu } from "./sync";
import { ACTIVATION, typeUnite, MOTIF_LOGISTICIEN } from "./miseEnPlace";
import { demanderBlocage } from "./BlocageAction";
import { lieuDe, MARQUE_AGI } from "./regleBlocage";
import { rangDePhase } from "./regleControle";

// ============================================================
// PRODUCTION
//
// Phase de production : Ctrl + clic sur une de mes unités qui a la
// capacité « #prod(quantité, types) » ouvre une production. Un
// logisticien est utilisé, un marqueur d'activation est posé sur
// l'unité, un bandeau au-dessus de l'espace dit où l'on en est
// (« Dock, case 59 : 1/3 ») et « Terminer la production » la clôt.
// Un élément qui n'est pas une unité (une station, une planète dont
// l'habilité porte #prod) produit de même : bouton « Produire ici »
// de la fiche du système (ouvrirProductionLieu).
//
// Tant qu'elle est ouverte :
//   - glisser une unité hors de ma réserve la paie en ressources et
//     compte dans la quantité produite (pas si les ressources manquent) ;
//   - la poser hors du système de la production demande une confirmation ;
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
//   { source, nom, numero, max, types, fait, reduction, mercenaires, produits, enPlus, gratuit }
//   (mercenaires : ceux qui ont servi de logisticien à cette production — effetsMercenaires)
// Scripts : Logistique améliorée (un dock produit la capacité
// logistique), IA industrielle (docks : +2 ; sur une planète
// militaire, le coût total baisse de 2).
// ============================================================

const sansAccent = texte => String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Capacité de production écrite sur une unité : { quantite, types } ou null
//   quantite : nombre, "clog" (capacité logistique du joueur) ou null (non lue)
//   types    : ["vaisseau", "mech"] ou null (tout est productible)
export function lireProduction(contenu) {

    // (toujours entre parenthèses : #prod(2,Vaisseau/Mech), #prod(#clog,Vaisseau/Mech))
    const m = /#prod\(([^,)]*)(?:,([^)]*))?\)/i.exec(contenu?.habilite || "");

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

// ------------------------------------------------------------
// MERCENAIRES DE PRODUCTION
//
// Un mercenaire « utilisable comme logisticien » dont l'effet tient
// à ce qu'il produit : il vaut pour la production qu'il a ouverte
// (son cube est parti dans les agents usés à l'ouverture).
//   identifiant de carte -> script, type d'unité (typeUnite), effet
//     remise   chaque unité de ce type coûte 1 de moins
//     enPlus   au premier de ce type, un de plus est posé au même endroit, sans coût
//     gratuit  après le premier de ce type, un de plus est gratuit et ne compte pas
// ------------------------------------------------------------

export const MERCENAIRES_PRODUCTION = {
    219: { script: "rear-admiral-farran", type: "dn", effet: "remise", texte: "cuirassés à 1 de moins" },
    220: { script: "suffi-an", type: "cruiser", effet: "remise", texte: "croiseurs à 1 de moins" },
    280: { script: "evelyne-delouis", type: "trans", effet: "remise", texte: "transporteurs à 1 de moins" },
    221: { script: "trillossa-aun-mirik", type: "dest", effet: "enPlus", texte: "au premier destroyeur produit, un destroyeur de plus est posé" },
    292: { script: "carth-de-sabledor", type: "com", effet: "gratuit", texte: "après le premier vaisseau de commerce, un de plus est gratuit" },
};

// Ce que les mercenaires de la production changent à la pose de ces unités (refs) :
//   remise     ressources en moins
//   enPlus     unités à poser en plus, sans coût ([ref])
//   gratuites  nombre d'unités de la pose qui ne comptent pas dans la quantité produite
//   etat       ce qui change dans l'état de la production, une fois la pose faite
export function effetsMercenaires(production, refs, contenuDe) {

    const cout = ref => Number(contenuDe(ref.id)?.cout) || 0;
    const typeDe = ref => typeUnite(contenuDe(ref.id));

    const produits = { ...(production?.produits || {}) };
    const bilan = { remise: 0, enPlus: [], gratuites: 0, etat: { produits } };

    for (const id of production?.mercenaires || []) {

        const m = MERCENAIRES_PRODUCTION[id];
        const unites = m ? refs.filter(ref => typeDe(ref) === m.type) : [];

        if (!unites.length) {
            continue;
        }

        if (m.effet === "remise") {
            bilan.remise += unites.reduce((total, ref) => total + Math.min(1, cout(ref)), 0);
        } else if (m.effet === "enPlus" && !production.enPlus?.[id]) {
            bilan.enPlus.push(unites[0]);
            bilan.etat.enPlus = { ...(production.enPlus || {}), ...(bilan.etat.enPlus || {}), [id]: true };
        } else if (m.effet === "gratuit" && !production.gratuit?.[id]) {

            // (le premier se paie ; le suivant — posé avec lui ou plus tard — est offert)
            const offert = Number(produits[m.type]) > 0 ? unites[0] : unites[1];

            if (offert) {
                bilan.remise += cout(offert);
                bilan.gratuites += 1;
                bilan.etat.gratuit = { ...(production.gratuit || {}), ...(bilan.etat.gratuit || {}), [id]: true };
            }
        }
    }

    for (const ref of refs) {
        produits[typeDe(ref)] = (Number(produits[typeDe(ref)]) || 0) + 1;
    }

    return bilan;
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

    // Technologie Forge stellaire (Braises de Muaat) : un soleil de guerre qui se trouve dans
    // une supernova a #prod(3, Vaisseau/Mech)
    const tuileIci = tuileDe(index, Number(m[1]));
    const forge = !lireProduction(contenu) && typeUnite(contenu) === "sun" && aScript(moi, "forge-stellaire") &&
        (tuileIci && await chargerContenu(tuileIci.ref.id))?.anomaly === "sup";

    const capacite = lireProduction(contenu) || (forge ? { quantite: 3, types: ["vaisseau", "mech"] } : null);

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
        const tuile = tuileDe(index, numero);
        const systeme = tuile && await chargerContenu(tuile.ref.id);
        const planete = await chargerContenu(Number(systeme?.elems?.[Number(m[2])]?.id) || -1);

        militaire = planete?.planetType === "mil";
    }

    const dejaActivee = Object.values(etat.composants).some(x => x.sur === c.id && !x.ref && x.jeton === ACTIVATION);

    const commentaire = confirmer(`Produire avec ${nom} (${nomCase(numero)})`, [
        !/production/i.test(etat.phase) && "ce n'est pas la phase de production",
        dejaActivee && "cette unité est déjà activée",
        !agentDisponible({ index, moi, search }, MOTIF_LOGISTICIEN) && "vous n'avez pas de logisticien disponible (aucun ne sera usé)",
    ]);

    if (!commentaire) {
        return true;
    }

    // « Activer une unité avec #prod et non bloquée » : test de blocage là où est l'unité (l'espace
    // de son système, ou sa planète) si d'autres factions peuvent la bloquer (BlocageAction.jsx).
    // La production s'ouvre à sa conclusion ; une unité engagée dans le test est bloquée.
    const blocage = await demanderBlocage(ctx, { ...lieuDe(c), action: "production", libelle: `Production avec ${nom}` });

    // Blocage raté (test abandonné, ou l'unité y a été engagée) : le logisticien est utilisé
    // quand même, l'unité n'est pas activée et rien n'est produit
    const rate = () => {

        const logisticien = agentDisponible({ index, moi, search }, MOTIF_LOGISTICIEN);

        if (logisticien) {
            envoyer([{ type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` }],
                `Production avec ${nom} — bloquée : le logisticien est utilisé, l'unité n'est pas activée`);
        }

        ctx.aviser?.(`Production avec ${nom} : bloquée. Le logisticien est utilisé, l'unité n'est pas activée.`);

        return true;
    };

    if (!blocage) {
        return rate();
    }

    if (blocage.engagees.includes(c.id) && !confirmer(`Produire avec ${nom} (${nomCase(numero)})`, [
        "cette unité est bloquée pour cette phase (engagée dans le test de blocage)",
    ])) {
        return rate();
    }

    ouvrirProductionLieu(
        { index, moi, search, envoyer, setProduction, capaciteLogistique, aScript, aviser: ctx.aviser },
        {
            source: c.id, nom, numero, capacite, activation: { sur: c.id }, bonus: ia ? 2 : 0, reduction: militaire ? 2 : 0,
            // (l'unité qui a produit est engagée pour la phase : elle ne bloque plus)
            extra: [{ type: "marquer", c: c.id, marque: MARQUE_AGI, valeur: rangDePhase(etat) }],
        },
        commentaire
    );

    return true;
}

// Ouvre une production : un logisticien est utilisé (s'il y en a un), la source
// est activée, et la production devient celle en cours.
//   lieu : { source, nom, numero, capacite (lireProduction), activation ({ sur } ou
//            { zone } du marqueur), bonus (quantité en plus), reduction (coût en moins),
//            extra (actions de plus, dans le même coup) }
// (asynchrone : le choix du logisticien — agent de base ou remplaçant — est résolu ici, avant
//  l'envoi, pour savoir quel mercenaire ouvre la production : MERCENAIRES_PRODUCTION)
export async function ouvrirProductionLieu(ctx, lieu, commentaire) {

    const { index, moi, search, envoyer, setProduction, capaciteLogistique, aScript, aviser } = ctx;

    const logisticien = agentDisponible({ index, moi, search }, MOTIF_LOGISTICIEN);
    const base = lieu.capacite.quantite === "clog" ? capaciteLogistique(moi) : lieu.capacite.quantite;

    const actions = await choisirRemplacants([
        logisticien && { type: "deplacer", c: logisticien.id, vers: `joueur:${moi}:agentsUses` },
        { type: "creer", jeton: ACTIVATION, ...lieu.activation },
        ...(lieu.extra || []),
    ]);

    const mercenaires = mercenairesQuiAgissent(actions)
        .filter(id => MERCENAIRES_PRODUCTION[id] && (!aScript || aScript(moi, MERCENAIRES_PRODUCTION[id].script)));

    envoyer(actions, commentaire);

    if (mercenaires.length) {
        aviser?.(mercenaires.map(id => `${nomElement(search, { type: "mercenaire", id })} : ${MERCENAIRES_PRODUCTION[id].texte}.`).join(" "));
    }

    setProduction({
        mercenaires,
        source: lieu.source,
        nom: lieu.nom,
        numero: lieu.numero,
        max: base === null ? null : base + (lieu.bonus || 0),
        types: lieu.capacite.types,
        fait: 0,
        reduction: lieu.reduction || 0,
    });
}

// ------------------------------------------------------------
// Bandeau « production en cours », au-dessus de l'espace
// ------------------------------------------------------------

export function ProductionEnCours() {

    const { production, setProduction, search } = useEngine();

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
            {(production.mercenaires || []).map(id => (
                <span key={id} data-mercenaire-production={id} style={{ fontSize: 12, color: "#4a148c" }}>
                    <b>{nomElement(search, { type: "mercenaire", id })}</b> : {MERCENAIRES_PRODUCTION[id].texte}.
                </span>
            ))}
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

        // Production ouverte : ses types ; case « Construction » (phase de
        // construction) : les structures seulement ; sinon tout
        const types = production && production !== true
            ? production.types
            : (production === true && /construction/i.test(etat.phase) ? ["structure"] : null);

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
