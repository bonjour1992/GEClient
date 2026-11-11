import { useEngine, BoutonRegle, nomElement, distanceCases } from "./Interaction";
import { useElement, useElements } from "./sync";
import { SCRIPTS } from "./scripts";
import { actionsPoints, typeUnite } from "./miseEnPlace";
import { noter, numeroPhase } from "./recherche";

// ============================================================
// REVENUS DE PHASE (scripts de sorte « revenu », scripts.js)
//
// Ce que rapportent, à une phase donnée, les unités d'un joueur
// posées sur la carte et les planètes ou stations qu'il possède :
// « Usine — Ravitaillement : génère 2 ressources », « SR-42 —
// Science : génère 2 de recherche spatiale », « Arbre père —
// Ravitaillement : produit un Fruit de vie »…
//
//   - au ravitaillement, tout s'ajoute au bouton « Entretien » du
//     plateau joueur (PlateauJoueur.jsx) ;
//   - aux autres phases, un bouton « Revenus de la phase » apparaît
//     dans le bandeau « À faire » (RevenusDePhase), une fois par tour.
//
// Un script décrit, pour UNE source (une unité, une planète possédée) :
//
//   gains      { res, inf, commerce, points }
//   recherche  [[type, n]…] — type "" : recherche libre ; le gain est noté
//              au journal de recherche du tour (recherche.js), à cocher ensuite
//   cree       { unite, n, ou } — unite : identifiant d'une unité, ou le type
//              d'une unité de ma faction ("inf", "dest") ; ou : "espace" (du
//              système de la source), "ici" (là où est la source), "bord"
//              (embarquée sur la source)
//   calcul     (source, outils) -> { gains, recherche, cree, sans } qui remplace
//              ce qui précède (sans : raison pour laquelle la source ne rapporte rien)
// ============================================================

const campDe = c => c.marques?.possession ?? c.proprio ?? 0;

const NOMS_GAINS = { res: "ressource", inf: "influence", commerce: "commerce", points: "point" };

const pluriel = (n, mot) => `${n} ${mot}${n > 1 && ["ressource", "point"].includes(mot) ? "s" : ""}`;

// Clé de la phase en cours pour les revenus : "ravit", "science", "production" ou null
export const phaseDeRevenu = etat => (/ravitaill/i.test(etat?.phase || "") ? "ravit"
    : (/science/i.test(etat?.phase || "") ? "science"
        : (/production/i.test(etat?.phase || "") ? "production" : null)));

// Revenus d'un joueur pour une phase :
//   { lignes: [{ nom, texte }], res, inf, actions, resume }
// res et inf sont à ajouter aux compteurs par l'appelant (l'entretien les
// additionne aux siens) ; actions porte tout le reste.
export function useRevenus(userId, phase) {

    const { etat, index, search, factionDe, scriptsDesactives, connaissance, aScript } = useEngine();

    const scripts = !phase ? [] : SCRIPTS.filter(s =>
        s.sorte === "revenu" && s.phase === phase && !scriptsDesactives.includes(s.id));

    // Tuiles posées : pour situer une planète possédée
    const tuiles = [...index.parZone]
        .map(([zone, contenu]) => {
            const m = /^hex:(\d+)$/.exec(zone);
            const tuile = m && contenu.find(c => c.ref?.type === "system");

            return tuile ? { numero: Number(m[1]), id: tuile.ref.id } : null;
        })
        .filter(Boolean);

    const systemes = useElements(scripts.some(s => s.carte.type === "planet") ? tuiles.map(t => t.id) : []);

    // Unités de ma faction (créations « inf », « dest »)
    const faction = useElement(scripts.length ? (factionDe(userId) ?? -1) : -1);
    const liensUnites = (faction?.units || []).filter(lien => lien?.id > 0);
    const mesUnites = useElements(liensUnites.map(lien => lien.id));

    const uniteDeType = type => liensUnites.find(lien => typeUnite(mesUnites[lien.id]) === type)?.id ?? null;

    // Planètes que je possède (cartes de mes éléments actifs)
    const possedees = new Set((index.parZone.get(`joueur:${userId}:actif`) || [])
        .filter(c => !c.cache && c.ref?.type === "planet")
        .map(c => c.ref.id));

    // Où est une planète sur la carte : { numero, zone } ou null
    function lieuPlanete(idPlanete) {

        for (const tuile of tuiles) {
            const k = (systemes[tuile.id]?.elems || []).findIndex(lien => Number(lien?.id) === idPlanete);

            if (k >= 0) {
                return { numero: tuile.numero, zone: `hex:${tuile.numero}:planete:${k}` };
            }
        }

        return null;
    }

    const outils = {
        etat,
        index,
        userId,
        connaissance: type => connaissance(userId, type),
        // Fragments de relique du joueur
        fragments: (index.parZone.get(`joueur:${userId}:fragments`) || []).length,
        // Éléments du système de cette case dont le nom contient ce motif (planètes, trous de ver, tokens, unités)
        aDansLeSysteme: (numero, motif) => {
            const tuile = tuiles.find(t => t.numero === numero);

            return (systemes[tuile?.id]?.elems || []).some(lien => lien?.id > 0 && motif.test(nomElement(search, { id: lien.id }))) ||
                Object.values(etat.composants).some(c =>
                    !c.cache && c.ref && (c.zone === "hex:" + numero || c.zone?.startsWith(`hex:${numero}:`)) &&
                    motif.test(nomElement(search, c.ref)));
        },
        // Autres unités de cet élément, à cette distance au plus (cases)
        autresProches: (source, distance) => Object.values(etat.composants).filter(c =>
            c.id !== source.c?.id && !c.cache && c.ref?.type === "unit" && c.ref.id === source.ref.id &&
            /^hex:\d+/.test(c.zone || "") &&
            distanceCases(source.numero, Number(/^hex:(\d+)/.exec(c.zone)[1])) <= distance).length,
    };

    const lignes = [];
    const actions = [];
    let res = 0;
    let inf = 0;

    for (const script of scripts) {

        const ids = [script.carte.id, ...(script.aussi || [])];

        // Sources : mes unités de la carte, mes planètes posées sur la carte, ou
        // une habilité qui s'applique à moi (une seule source, sans lieu)
        const sources = script.carte.type === "habilite"
            ? (aScript(userId, script.id) ? [{ ref: script.carte, numero: null, zone: null }] : [])
            : script.carte.type === "unit"
            ? Object.values(etat.composants)
                .filter(c => !c.cache && c.ref?.type === "unit" && ids.includes(c.ref.id) && campDe(c) === userId &&
                    /^hex:\d+/.test(c.zone || ""))
                .map(c => ({ c, ref: c.ref, numero: Number(/^hex:(\d+)/.exec(c.zone)[1]), zone: c.zone }))
            : ids.filter(id => possedees.has(id))
                .map(id => ({ ref: { type: "planet", id }, ...lieuPlanete(id) }))
                .filter(s => s.zone);

        for (const source of sources) {

            const nom = nomElement(search, source.ref);
            const effet = script.calcul ? script.calcul(source, outils) : script;

            if (!effet || effet.sans) {
                if (effet?.sans) {
                    lignes.push({ nom, texte: `rien (${effet.sans})`, vide: true });
                }

                continue;
            }

            const morceaux = [];

            for (const [cle, n] of Object.entries(effet.gains || {})) {

                if (!(n > 0)) {
                    continue;
                }

                morceaux.push(`+${pluriel(n, NOMS_GAINS[cle] || cle)}`);

                if (cle === "res") {
                    res += n;
                } else if (cle === "inf") {
                    inf += n;
                } else if (cle === "commerce") {
                    actions.push({ type: "compteur", id: `joueur:${userId}:commerce`, delta: n });
                } else if (cle === "points") {
                    actions.push(...actionsPoints(etat, userId, n));
                }
            }

            // Recherche : notée au journal de recherche du tour (une ligne par élément)
            const recherche = (effet.recherche || []).reduce((total, [, n]) => total + n, 0);

            if (recherche > 0) {
                morceaux.push(`${recherche} de recherche` +
                    ((effet.recherche || []).some(([type]) => type) ? ` (${effet.recherche.map(([type, n]) => `${type || "libre"} ${n}`).join(", ")})` : ""));

                const deja = actions.find(a => a.rechercheDe === source.ref.id);

                if (deja) {
                    deja.valeur += recherche;
                } else {
                    const note = noter(etat, userId, "g", source.ref.id, recherche);

                    if (note) {
                        actions.push({ ...note, rechercheDe: source.ref.id });
                    }
                }
            }

            // Unités créées
            const cree = effet.cree;
            const idUnite = cree && (Number.isInteger(cree.unite) ? cree.unite : uniteDeType(cree.unite));

            if (cree && cree.n > 0 && idUnite) {

                morceaux.push(`${cree.n} × ${nomElement(search, { type: "unit", id: idUnite })}`);

                for (let k = 0; k < cree.n; k++) {
                    actions.push({
                        type: "creer",
                        ref: { type: "unit", id: idUnite },
                        proprio: userId,
                        ...(cree.ou === "bord" && source.c
                            ? { sur: source.c.id }
                            : { zone: cree.ou === "ici" ? source.zone : "hex:" + source.numero }),
                    });
                }
            }

            if (morceaux.length) {
                lignes.push({ nom, texte: morceaux.join(", ") + (effet.note ? ` — ${effet.note}` : "") });
            }
        }
    }

    return {
        lignes,
        res,
        inf,
        // (rechercheDe : repère interne, retiré avant l'envoi)
        actions: actions.map(({ rechercheDe, ...action }) => action),
        resume: lignes.filter(l => !l.vide).map(l => `${l.nom} : ${l.texte}`).join(" ; "),
    };
}

// ------------------------------------------------------------
// Bouton « Revenus de la phase » du bandeau « À faire » (phases
// autres que le ravitaillement, où l'entretien s'en charge)
// ------------------------------------------------------------

export function RevenusDePhase() {

    const { etat, envoyer, moi, joueur } = useEngine();

    const cle = phaseDeRevenu(etat);
    const revenus = useRevenus(moi, joueur && cle !== "ravit" ? cle : null);

    if (!joueur || !revenus.lignes.length) {
        return null;
    }

    const compteur = `joueur:${moi}:revenus:${numeroPhase(etat)}`;
    const fait = Number(etat.compteurs[compteur]) === etat.tour;

    return (
        <div data-revenus-phase style={{ marginTop: 4, fontSize: 13 }}>
            <BoutonRegle
                data-action="revenus-de-phase"
                nom="Revenus de la phase"
                obstacles={[fait && "les revenus de cette phase sont déjà encaissés ce tour"]}
                faire={commentaire => envoyer([
                    { type: "compteur", id: compteur, valeur: etat.tour },
                    revenus.res && { type: "compteur", id: `joueur:${moi}:res`, delta: revenus.res },
                    revenus.inf && { type: "compteur", id: `joueur:${moi}:inf`, delta: revenus.inf },
                    ...revenus.actions,
                ], commentaire)}
                title="Ce que rapportent à cette phase vos unités et les planètes ou stations que vous possédez (une fois par tour)"
            >
                {fait ? "✔ Revenus encaissés — " : "Revenus de la phase : "}{revenus.resume || "rien"}
            </BoutonRegle>
            {revenus.lignes.filter(l => l.vide).map((l, i) => (
                <span key={i} style={{ marginLeft: 8, color: "#777" }}>{l.nom} : {l.texte}</span>
            ))}
        </div>
    );
}
