import { useEngine, BoutonRegle, nomElement, distanceCases } from "./Interaction";
import { chargerContenu } from "./sync";
import { normaliserPlateau } from "../hexSpirale";
import { turnNumber } from "../ti5Const";
import { scriptsActifs, concerne } from "./scripts";
import { RESERVE_TUILES, exemplaires } from "./miseEnPlace";

// ============================================================
// BOUTONS DES SCRIPTS SUR LA FICHE D'UNE CARTE
//
// Les scripts de sorte « bouton » (scripts.js) rattachés à la
// carte ajoutent chacun un bouton à sa fiche.
// ============================================================

export function ScriptsCarte({ c, fermer }) {

    const { joueur, scriptsDesactives } = useEngine();

    if (!joueur || !c?.ref || c.cache) {
        return null;
    }

    return scriptsActifs(scriptsDesactives)
        .filter(s => s.sorte === "bouton" && concerne(s, c.ref))
        .map(s => (s.bouton === "evenement"
            ? <MettreEnPlaceEvenement key={s.id} c={c} script={s} fermer={fermer} />
            : null));
}

// ------------------------------------------------------------
// MISE EN PLACE D'UN ÉVÉNEMENT
//
// Chaque événement a son script (scripts.js) : la liste de ce qu'il
// met en jeu (`poses`) et où. T est le tour de l'événement : celui de
// sa case du déroulé, sinon le tour en cours. Une case au-delà du
// dernier tour n'existe pas : l'élément n'est alors pas posé.
// Le reste du texte (`reste`) se fait à la main ; le compteur
// evenement:<id>:place retient que la mise en place est faite.
// ------------------------------------------------------------

function MettreEnPlaceEvenement({ c, script, fermer }) {

    const { etat, index, envoyer, partie, search, aviser } = useEngine();

    const compteur = `evenement:${c.ref.id}:place`;
    const nom = nomElement(search, c.ref);

    // Tour de l'événement
    const tour = Number(/^general:evenement:(\d+)$/.exec(c.zone || "")?.[1]) || etat.tour;

    // Zone d'une pose : { zone } ou { horsDeroule: tour }
    function zoneDe(vers) {

        if (vers === "table") {
            return { zone: "general:table" };
        }

        if (vers === "tuiles") {
            return { zone: RESERVE_TUILES };
        }

        if (vers === "promesses") {
            return { zone: "general:promesses" };
        }

        const [rangee, k] = Object.entries(vers)[0];
        const t = tour + k;

        return t <= turnNumber ? { zone: `general:${rangee}:${t}` } : { horsDeroule: t };
    }

    // Unités neutres posées sur les anomalies du plateau
    async function surAnomalies({ unite, n, types, loinDesNatals }) {

        const plateau = normaliserPlateau(await chargerContenu(partie.plateau));
        const natals = plateau.type.map((type, i) => (type === "natal" ? i : -1)).filter(i => i >= 0);

        const tuiles = Object.values(etat.composants)
            .filter(x => x.ref?.type === "system" && /^hex:\d+$/.test(x.zone));

        const cases = [];

        for (const tuile of tuiles) {

            const numero = Number(tuile.zone.slice(4));
            const contenu = await chargerContenu(tuile.ref.id);

            if (types.includes(contenu?.anomaly) &&
                !(loinDesNatals && natals.some(i => distanceCases(i, numero) <= 1))) {
                cases.push(numero);
            }
        }

        return cases.map(numero => ({ type: "creer", ref: { type: "unit", id: unite }, zone: "hex:" + numero, n }));
    }

    async function faire(commentaire) {

        const actions = [];
        const horsDeroule = [];

        for (const pose of script.poses || []) {

            const ref = { type: pose.type, id: pose.id };

            if (pose.vers === "joueurs") {

                // Une feuille par joueur qui ne l'a pas encore
                const sans = partie.joueurs.filter(j =>
                    !(index.parZone.get(`joueur:${j.userId}:tech`) || []).some(x => x.ref?.id === pose.id));

                actions.push(...sans.map(j => ({ type: "creer", ref, zone: `joueur:${j.userId}:tech`, proprio: j.userId })));
                continue;
            }

            const { zone, horsDeroule: t } = zoneDe(pose.vers);

            if (!zone) {
                horsDeroule.push(`${nomElement(search, ref)} (tour ${t})`);
                continue;
            }

            const voulu = typeof pose.n === "function"
                ? pose.n(partie.joueurs.length)
                : pose.n ?? exemplaires(await chargerContenu(pose.id));

            // Tuiles : la réserve en a peut-être déjà (mise en place de la partie) ;
            // on complète jusqu'au nombre voulu, où qu'elles soient
            const n = pose.vers === "tuiles"
                ? voulu - Object.values(etat.composants).filter(x => x.ref?.type === pose.type && x.ref.id === pose.id).length
                : voulu;

            if (n > 0) {
                actions.push({ type: "creer", ref, zone, n });
            }
        }

        const pirates = script.anomalies ? await surAnomalies(script.anomalies) : [];

        envoyer([...actions, ...pirates, { type: "compteur", id: compteur, valeur: 1 }], commentaire);

        aviser([
            `${nom} : mis en place — ${script.description}`,
            script.anomalies && `${pirates.length} système(s) concerné(s).`,
            horsDeroule.length && `Après le dernier tour, non posé : ${horsDeroule.join(", ")}.`,
            script.reste && `Reste à faire à la main : ${script.reste}.`,
        ].filter(Boolean).join(" "));

        fermer?.();
    }

    return (
        <BoutonRegle
            data-action="evenement-mise-en-place"
            nom={`Mettre en place ${nom}`}
            obstacles={[etat.compteurs[compteur] && "cet événement est déjà mis en place"]}
            faire={faire}
            title={script.description + (script.reste ? ` Reste à la main : ${script.reste}.` : "")}
        >
            Mettre en place
        </BoutonRegle>
    );
}
