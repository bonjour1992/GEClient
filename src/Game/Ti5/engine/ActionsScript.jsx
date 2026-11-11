import { useEngine, BoutonRegle, agentDisponible, nomElement, aMotCle } from "./Interaction";
import { SCRIPTS } from "./scripts";
import { ACTIVATION, FAVEUR, FRAGMENTS, actionsPoints } from "./miseEnPlace";
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
//   agent     { motif, nom, depense, pose } — utilisé ; dépensé ; ou posé
//             sur le lieu (il y reste)
//   cout      { res, inf, commerce }
//   fragments { ancien, mil, civ, spa, autres } — fragments de relique à dépenser
//             (autres : de n'importe quel type, les anciens en dernier)
//   gains     { res, inf, commerce, points }
//   faveur    nombre de mes faveurs gagnées ; faveurNeutre : faveurs neutres
//             (jeton sans propriétaire)
//   recherche [[type, n]…] — notée au journal de recherche du tour (sorte « a »)
//   cree      { unite, n } — unités posées là où est la source
//   donneCarte identifiant d'une planète dont la carte arrive dans mes éléments actifs
//   remplace  [[de, vers]…] — les unités « de » du lieu deviennent « vers »
//   retire    identifiant d'une unité : toutes celles du lieu sont retirées
//   reparer   répare mes unités non biologiques du système et les unités
//             du lieu : 1 ressource par dégât
//   degat     variation des dégâts de l'unité (+1, −1)
//   use       l'unité est usée (refusé si elle l'est déjà)
//   activer   un marqueur d'activation est posé sur le lieu (refusé s'il y en a un)
//   prendre   la carte de la planète va dans mes éléments actifs
//   pioche    { de, vers, n } — cartes piochées (vers "main")
//   parTour   une seule fois par tour
//   visible   (outils) -> faux pour ne pas montrer le bouton ici
//   calcul    (outils) -> champs qui remplacent ceux du script (ou { sans: raison })
//
// outils : { systeme (contenu du système), idSysteme, numero, possede, phase,
//            connaissance(type), agentIci(motif) : un agent de ce nom est posé sur le lieu }
// ============================================================

const NOMS = { res: "ressource", inf: "influence", commerce: "commerce", points: "point" };

const campDe = c => c.marques?.possession ?? c.proprio ?? 0;

export function BoutonsScripts({ lieu, c = null, idElement = null, numero = null, zone = null, possede = true, systeme = null, idSysteme = null, apres }) {

    const {
        etat, index, envoyer, moi, joueur, search, aScript, connaissance, nomDe, aviser, scriptsDesactives,
    } = useEngine();

    if (!joueur) {
        return null;
    }

    const ici = zone ? (index.parZone.get(zone) || []) : [];

    const outils = {
        systeme,
        idSysteme,
        numero,
        possede,
        phase: etat.phase || "",
        connaissance: type => connaissance(moi, type),
        agentIci: motif => ici.some(x => !x.cache && x.ref?.type === "agent" && new RegExp(motif, "i").test(nomElement(search, x.ref))),
    };

    const scripts = SCRIPTS.filter(s =>
        s.sorte === "action" && s.lieu === lieu && !scriptsDesactives.includes(s.id) &&
        (lieu === "unite" || lieu === "planete"
            ? [s.carte.id, ...(s.aussi || [])].includes(idElement)
            : aScript(moi, s.id)) &&
        (!s.visible || s.visible(outils)));

    const compte = cle => Number(etat.compteurs[`joueur:${moi}:${cle}`]) || 0;

    // Mes fragments de relique
    const mesFragments = (index.parZone.get(`joueur:${moi}:fragments`) || []).filter(f => !f.ref);

    // Fragments que je peux donner pour ce qui est demandé : { ancien: 1, autres: 3 }
    function fragmentsPour(voulus) {

        const reste = [...mesFragments];
        const pris = [];

        const prendre = (filtre, n) => {
            for (let k = 0; k < n; k++) {
                const i = reste.findIndex(filtre);

                if (i < 0) {
                    return;
                }

                pris.push(...reste.splice(i, 1));
            }
        };

        for (const cle of Object.keys(FRAGMENTS)) {
            prendre(f => f.jeton === FRAGMENTS[cle][0], voulus[cle] || 0);
        }

        const avant = pris.length;

        prendre(f => f.jeton !== FRAGMENTS.ancien[0], voulus.autres || 0);
        prendre(() => true, (voulus.autres || 0) - (pris.length - avant));

        return pris;
    }

    return scripts.map(s => {

        const effet = { ...s, ...(s.calcul ? s.calcul(outils) : {}) };

        const agent = s.agent ? agentDisponible({ index, moi, search }, s.agent.motif) : null;
        const degat = Number(c?.marques?.degat) || 0;

        const lieuActive = ici.some(x => !x.ref && x.jeton === ACTIVATION && !x.marques?.ruine);

        const cleTour = `joueur:${moi}:script:${s.carte.id}`;
        const fait = s.parTour && Number(etat.compteurs[cleTour]) === etat.tour;

        // Réparation : mes unités non biologiques du système, et les unités du lieu
        const aReparer = !s.reparer || numero === null ? [] : Object.values(etat.composants).filter(x =>
            !x.cache && x.ref?.type === "unit" && Number(x.marques?.degat) > 0 && !aMotCle(x, "bio") &&
            ((campDe(x) === moi && (x.zone === "hex:" + numero || x.zone?.startsWith(`hex:${numero}:`))) || x.zone === zone));

        const coutReparation = aReparer.reduce((total, x) => total + Number(x.marques.degat), 0);

        const cout = Object.entries({ ...(effet.cout || {}), ...(s.reparer ? { res: coutReparation } : {}) }).filter(([, n]) => n > 0);

        const voulus = effet.fragments || {};
        const fragmentsVoulus = Object.values(voulus).reduce((total, n) => total + n, 0);
        const payes = fragmentsVoulus ? fragmentsPour(voulus) : [];

        const aRetirer = s.retire ? ici.filter(x => x.ref?.type === "unit" && x.ref.id === s.retire) : [];

        const obstacles = [
            s.phase && !new RegExp(s.phase, "i").test(etat.phase || "") && `ce n'est pas la phase de ${s.nomPhase || s.phase}`,
            s.possede && !possede && "vous ne possédez pas cette planète",
            effet.sans,
            s.agent && !agent && `vous n'avez pas de ${s.agent.nom} disponible (aucun ne sera ${s.agent.depense ? "dépensé" : (s.agent.pose ? "posé" : "usé")})`,
            ...cout.filter(([cle, n]) => compte(cle) < n).map(([cle, n]) => `${NOMS[cle]} insuffisant : ${n} à payer, vous avez ${compte(cle)}`),
            fragmentsVoulus > payes.length &&
                `fragments de relique insuffisants : ${fragmentsVoulus} à dépenser, ${payes.length} trouvé(s) (seuls ceux-là seront dépensés)`,
            s.use && c?.marques?.use && "cette unité est déjà usée",
            s.activer && lieuActive && "ce lieu est déjà activé",
            s.reparer && !aReparer.length && "aucune unité à réparer ici",
            s.retire && !aRetirer.length && `aucune unité « ${nomElement(search, { id: s.retire })} » ici`,
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
                    : [s.agent.pose && zone
                        ? { type: "deplacer", c: agent.id, vers: zone, proprio: moi }
                        : { type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` }]) : []),
                ...cout.map(([cle, n]) => ({ type: "compteur", id: `joueur:${moi}:${cle}`, delta: -n })),
                ...payes.map(f => ({ type: "supprimer", c: f.id })),
                ...Object.entries(effet.gains || {}).filter(([, n]) => n > 0).flatMap(([cle, n]) => (cle === "points"
                    ? actionsPoints(etat, moi, n)
                    : [{ type: "compteur", id: `joueur:${moi}:${cle}`, delta: n }])),
                ...Array.from({ length: effet.faveur || 0 }, () => ({ type: "creer", jeton: FAVEUR, zone: `joueur:${moi}:faveurs`, proprio: moi })),
                ...Array.from({ length: effet.faveurNeutre || 0 }, () => ({ type: "creer", jeton: FAVEUR, zone: `joueur:${moi}:faveurs` })),
                recherche > 0 && noter(etat, moi, "a", s.carte.id, recherche),
                ...(effet.cree && zone
                    ? Array.from({ length: effet.cree.n }, () => ({
                        type: "creer", ref: { type: "unit", id: effet.cree.unite }, zone, proprio: moi,
                    }))
                    : []),
                effet.donneCarte && { type: "creer", ref: { type: "planet", id: effet.donneCarte }, zone: `joueur:${moi}:actif`, proprio: moi },
                ...(effet.remplace || []).flatMap(([de, vers]) => ici
                    .filter(x => x.ref?.type === "unit" && x.ref.id === de)
                    .map(x => ({ type: "remplacer", c: x.id, ref: { type: "unit", id: vers } }))),
                ...aRetirer.map(x => ({ type: "supprimer", c: x.id })),
                ...aReparer.map(x => ({ type: "marquer", c: x.id, marque: "degat", valeur: 0, si: x.marques.degat })),
                effet.degat && c && { type: "marquer", c: c.id, marque: "degat", valeur: Math.max(0, degat + effet.degat) },
                s.use && c && { type: "marquer", c: c.id, marque: "use", valeur: true },
                s.activer && zone && { type: "creer", jeton: ACTIVATION, zone },
                s.pioche && { type: "piocher", de: s.pioche.de, vers: `joueur:${moi}:${s.pioche.vers}`, n: s.pioche.n || 1 },
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
                {(effet.libelle || s.libelle || s.nom) + (s.reparer && coutReparation ? ` — ${coutReparation} ressource(s)` : "")}
            </BoutonRegle>
        );
    });
}
