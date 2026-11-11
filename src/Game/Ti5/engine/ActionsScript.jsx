import { useEngine, BoutonRegle, agentDisponible, nomElement } from "./Interaction";
import { SCRIPTS } from "./scripts";
import { ACTIVATION, actionsPoints } from "./miseEnPlace";
import { depenserAgent } from "./effets";
import { actionsPossession } from "./Controle";
import { noter } from "./recherche";

// ============================================================
// BOUTONS D'ACTION DES SCRIPTS (sorte « action », scripts.js)
//
// Un bouton par action qu'une unité, une planète ou une habilité
// permet : « Hopeld — Production : dépensez un logisticien, produit
// un Mech géant ». Le script décrit l'action ; ce composant en fait
// un bouton, vert ou rouge gris comme les autres effets du jeu.
//
//   lieu      "unite"    fiche d'une de mes unités (ScriptsCarte.jsx)
//             "planete"  à côté de la planète, dans la fiche du système
//             "systeme"  en tête de la fiche du système (habilités)
//             "bandeau"  bandeau « À faire » (habilités de phase)
//
//   phase     motif du nom de la phase attendue (nomPhase : son nom)
//   possede   la planète doit être à moi
//   agent     { motif, nom, depense } — utilisé, ou dépensé
//   cout      { res, inf, commerce }
//   gains     { res, inf, commerce, points }
//   recherche [[type, n]…] — notée au journal de recherche du tour
//   cree      { unite, n } — unités posées là où est la source
//   degat     variation des dégâts de l'unité (+1, −1)
//   use       l'unité est usée (refusé si elle l'est déjà)
//   activer   un marqueur d'activation est posé sur le lieu (refusé s'il y en a un)
//   prendre   la carte de la planète va dans mes éléments actifs
//   pioche    { de, vers } — une carte piochée (vers "main")
//   parTour   une seule fois par tour
//   visible   (outils) -> faux pour ne pas montrer le bouton ici
//   calcul    (outils) -> champs qui remplacent ceux du script (ou { sans: raison })
//
// outils : { systeme (contenu du système), idSysteme, numero, phase, connaissance(type) }
// ============================================================

const NOMS = { res: "ressource", inf: "influence", commerce: "commerce", points: "point" };

export function BoutonsScripts({ lieu, c = null, idElement = null, numero = null, zone = null, possede = true, systeme = null, idSysteme = null, apres }) {

    const {
        etat, index, envoyer, moi, joueur, search, aScript, connaissance, nomDe, aviser, scriptsDesactives,
    } = useEngine();

    if (!joueur) {
        return null;
    }

    const outils = { systeme, idSysteme, numero, possede, phase: etat.phase || "", connaissance: type => connaissance(moi, type) };

    const scripts = SCRIPTS.filter(s =>
        s.sorte === "action" && s.lieu === lieu && !scriptsDesactives.includes(s.id) &&
        (lieu === "unite" || lieu === "planete"
            ? [s.carte.id, ...(s.aussi || [])].includes(idElement)
            : aScript(moi, s.id)) &&
        (!s.visible || s.visible(outils)));

    const compte = cle => Number(etat.compteurs[`joueur:${moi}:${cle}`]) || 0;

    return scripts.map(s => {

        const effet = { ...s, ...(s.calcul ? s.calcul(outils) : {}) };

        const agent = s.agent ? agentDisponible({ index, moi, search }, s.agent.motif) : null;
        const cout = Object.entries(effet.cout || {}).filter(([, n]) => n > 0);
        const degat = Number(c?.marques?.degat) || 0;

        const lieuActive = zone && (index.parZone.get(zone) || []).some(x => !x.ref && x.jeton === ACTIVATION && !x.marques?.ruine);

        const cleTour = `joueur:${moi}:script:${s.carte.id}`;
        const fait = s.parTour && Number(etat.compteurs[cleTour]) === etat.tour;

        const obstacles = [
            s.phase && !new RegExp(s.phase, "i").test(etat.phase || "") && `ce n'est pas la phase de ${s.nomPhase || s.phase}`,
            s.possede && !possede && "vous ne possédez pas cette planète",
            effet.sans,
            s.agent && !agent && `vous n'avez pas de ${s.agent.nom} disponible (aucun ne sera ${s.agent.depense ? "dépensé" : "usé"})`,
            ...cout.filter(([cle, n]) => compte(cle) < n).map(([cle, n]) => `${NOMS[cle]} insuffisant : ${n} à payer, vous avez ${compte(cle)}`),
            s.use && c?.marques?.use && "cette unité est déjà usée",
            s.activer && lieuActive && "ce lieu est déjà activé",
            effet.degat < 0 && degat <= 0 && "cette unité n'a aucun dégât",
            fait && "déjà fait ce tour",
        ];

        const recherche = (effet.recherche || []).reduce((total, [, n]) => total + n, 0);

        function faire(commentaire) {

            const possession = s.prendre
                ? actionsPossession({ etat, moi, aScript, nomDe }, zone, idElement, null, false)
                : { actions: [], messages: [] };

            envoyer([
                ...(agent ? (s.agent.depense
                    ? depenserAgent({ aScript, moi, etat }, agent, `le ${s.agent.nom} (${s.nom})`)
                    : [{ type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` }]) : []),
                ...cout.map(([cle, n]) => ({ type: "compteur", id: `joueur:${moi}:${cle}`, delta: -n })),
                ...Object.entries(effet.gains || {}).filter(([, n]) => n > 0).flatMap(([cle, n]) => (cle === "points"
                    ? actionsPoints(etat, moi, n)
                    : [{ type: "compteur", id: `joueur:${moi}:${cle}`, delta: n }])),
                recherche > 0 && noter(etat, moi, "g", s.carte.id, recherche),
                ...(effet.cree && zone
                    ? Array.from({ length: effet.cree.n }, () => ({
                        type: "creer", ref: { type: "unit", id: effet.cree.unite }, zone, proprio: moi,
                    }))
                    : []),
                effet.degat && c && { type: "marquer", c: c.id, marque: "degat", valeur: Math.max(0, degat + effet.degat) },
                s.use && c && { type: "marquer", c: c.id, marque: "use", valeur: true },
                s.activer && zone && { type: "creer", jeton: ACTIVATION, zone },
                s.pioche && { type: "piocher", de: s.pioche.de, vers: `joueur:${moi}:${s.pioche.vers}` },
                ...possession.actions,
                s.parTour && { type: "compteur", id: cleTour, valeur: etat.tour },
            ], [commentaire, ...possession.messages].join(" — "));

            if (effet.avis) {
                aviser(effet.avis);
            }

            apres?.();
        }

        return (
            <BoutonRegle
                key={s.id}
                data-action={"script-" + s.id}
                nom={`${s.nom}${idElement ? ` (${nomElement(search, { id: idElement })})` : ""}`}
                obstacles={obstacles}
                faire={faire}
                title={s.description}
            >
                {effet.libelle || s.libelle || s.nom}
            </BoutonRegle>
        );
    });
}
