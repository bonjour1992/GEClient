import { useEngine, BoutonRegle, agentDisponible, nomElement, aMotCle, carteUsee, actionsUserCarte } from "./Interaction";
import { contenuEnCache, useElement, useElements } from "./sync";
import { SCRIPTS } from "./scripts";
import { ACTIVATION, FAVEUR, FRAGMENTS, MARQUEUR, actionsPoints, actionsPiste, typeUnite } from "./miseEnPlace";
import { depenserAgent } from "./effets";
import { actionsPossession } from "./Controle";
import { noter } from "./recherche";

// ============================================================
// BOUTONS D'ACTION DES SCRIPTS (sorte « action », scripts.js)
//
// Un bouton par action qu'une unité, une planète, une habilité, un
// mercenaire ou une promesse permet : « Hopeld — Production : dépensez un logisticien, produit
// un Mech géant ». Le script décrit l'action ; ce composant en fait
// un bouton, vert ou rouge gris comme les autres effets du jeu.
//
//   lieu      "unite"    fiche d'une de mes unités (ScriptsCarte.jsx)
//             "carte"    fiche d'une carte qui n'est pas une unité (habilité posée sur la table ;
//                        mercenaire ou promesse : seulement la mienne)
//             "planete"  à côté de la planète, dans la fiche du système — la planète
//                        du script, ou (habilité) celle de son champ surPlanete
//             "systeme"  en tête de la fiche du système (habilités)
//             "bandeau"  bandeau « À faire » (habilités de phase)
//             "plateau"  onglet Plateau joueur (habilités utilisables à tout moment)
//
//   phase     motif du nom de la phase attendue (nomPhase : son nom)
//   possede   la planète doit être à moi
//   agent     { motif, nom, depense, pose, surCarte } — utilisé ; dépensé ; posé
//             sur le lieu (il y reste) ; ou posé sur l'unité ou la carte de la fiche
//   cout      { res, inf, commerce } (habilité Sans influence : l'influence se paie en ressources)
//   fragments { ancien, mil, civ, spa, autres } — fragments de relique à dépenser
//             (autres : de n'importe quel type, les anciens en dernier)
//   depense   [{ type, id, n, nom, use } | { esclaves: n }] — cartes ou tokens de mes éléments
//             actifs à retirer (use : ils sont usés au lieu d'être retirés, jusqu'au
//             nouveau tour) ; esclaves : infanteries capturées (unités d'un autre camp
//             dans mes éléments actifs)
//   gains     { res, inf, commerce, points }
//   faveur    nombre de mes faveurs gagnées ; faveurNeutre : faveurs neutres
//             (jeton sans propriétaire)
//   recherche [[type, n]…] — notée au journal de recherche du tour (sorte « a »)
//   cree      { unite, n, bord } — unités posées là où est la source (unite "inf" :
//             l'infanterie de ma faction ; bord : embarquées sur l'unité de la fiche)
//   donne     [{ type, id }] — cartes qui arrivent dans mes éléments actifs
//   donneCarte identifiant d'une planète dont la carte arrive dans mes éléments actifs
//   remplace  [[de, vers]…] — les unités « de » du lieu deviennent « vers »
//   retire    identifiant d'une unité : toutes celles du lieu sont retirées
//   reparer   répare mes unités non biologiques du système et les unités
//             du lieu : 1 ressource par dégât
//   soigne    type d'unité (« pds ») : celles du lieu perdent leurs dégâts, sans rien payer
//   degat     variation des dégâts de l'unité (+1, −1)
//   use       l'unité ou la carte est usée (refusé si elle l'est déjà) ; pour un mercenaire,
//             c'est son cube noir qui passe dans les agents usés (il revient à l'entretien),
//             même quand le bouton est sur la fiche d'une unité ; pour une technologie, son
//             compteur « utilisée ce tour »
//   cible     (contenu de l'unité, composant) -> vrai : le bouton d'un mercenaire est montré
//             sur la fiche de mes unités qui conviennent (lieu "unite")
//   demande   { question (texte, ou (outils) -> texte), max(outils) } — le joueur choisit un
//             nombre X (un montant, ou le rang d'un choix listé dans la question) : calcul(outils, X)
//   activer   un marqueur d'activation est posé sur le lieu (refusé s'il y en a un)
//   prendre   la carte de la planète va dans mes éléments actifs
//   pioche    { de, vers, n } — cartes piochées (vers "main")
//   parTour   une seule fois par tour
//   visible   (outils) -> faux pour ne pas montrer le bouton ici
//   calcul    (outils, X) -> champs qui remplacent ceux du script (ou { sans: raison }) ;
//             en plus : actions (ajoutées au coup), agentDepense (composant d'un agent à dépenser)
//   special   (atelier) -> { actions, avis, sans } : effet propre au script
//
// outils  : { systeme (contenu du système), idSysteme, numero, possede, phase, etat, index, moi,
//             c (composant de la fiche), contenu (de l'élément du lieu), nom(ref), infanterie (id),
//             connaissance(type), agentIci(motif), surLaCarte(idUnite), mienneSurLaCarte(idUnite),
//             ici(idUnite), mesUnitesDansLeSysteme(), aCarte(type, id), agentsUses(), compte(cle),
//             planetesPossedees(), alliances(), anomalies(), factionsVoisines() }
// atelier : { etat, index, moi, joueurs, nomDe, connaissance(joueur, type), points(joueur, n),
//             cartes(type, id, zone), c (la carte de la fiche), numero (la case), infamie(joueur, n),
//             recherche(joueur, idElement, n), donneur(carte), marqueurs(carte),
//             zonesDePlanete(id), activee(zone), zone (du lieu), idElement, contenu, nom(ref) }
// ============================================================

const NOMS = { res: "ressource", inf: "influence", commerce: "commerce", points: "point" };

const campDe = c => c.marques?.possession ?? c.proprio ?? 0;

export function BoutonsScripts({ lieu, c = null, idElement = null, numero = null, zone = null, possede = true, systeme = null, idSysteme = null, apres }) {

    const {
        etat, index, envoyer, moi, joueur, search, aScript, connaissance, nomDe, aviser, scriptsDesactives, partie,
        factionDe, techDuScript,
    } = useEngine();

    // Mes promesses (éléments actifs, promesses à durée) : leur contenu dit lesquelles sont des alliances
    const estAMoi = x => new RegExp(`^joueur:${moi}:(actif|tour:\\d+)$`).test(x?.zone || "");

    const mesPromesses = Object.values(etat.composants).filter(x => !x.cache && x.ref?.type === "Promesse" && estAMoi(x));
    const contenuPromesses = useElements(mesPromesses.map(x => x.ref.id));

    // Infanterie de ma faction (cree : { unite: "inf" })
    const faction = useElement(factionDe(moi) ?? -1);
    const liensUnites = (faction?.units || []).filter(lien => lien?.id > 0);
    const unitesFaction = useElements(liensUnites.map(lien => lien.id));
    const idInfanterie = liensUnites.find(lien => typeUnite(unitesFaction[lien.id]) === "inf")?.id ?? null;

    if (!joueur) {
        return null;
    }

    const ici = zone ? (index.parZone.get(zone) || []) : [];
    const mesActifs = index.parZone.get(`joueur:${moi}:actif`) || [];

    // Cases où j'ai une unité ; contenu du système d'une case
    const mesCases = () => [...new Set(Object.values(etat.composants)
        .filter(x => !x.cache && x.ref?.type === "unit" && campDe(x) === moi && /^hex:\d+/.test(x.zone || ""))
        .map(x => Number(/^hex:(\d+)/.exec(x.zone)[1])))];

    const systemeDe = n => {
        const tuile = (index.parZone.get("hex:" + n) || []).find(x => x.ref?.type === "system");
        return tuile ? contenuEnCache(tuile.ref.id) : null;
    };

    // Zones d'une planète posée sur la carte : une par exemplaire de son système
    const zonesDePlanete = idPlanete => [...index.parZone].flatMap(([z, contenu]) => {
        const tuile = /^hex:\d+$/.test(z) && contenu.find(x => x.ref?.type === "system");
        const k = tuile ? (contenuEnCache(tuile.ref.id)?.elems || []).findIndex(lien => Number(lien?.id) === idPlanete) : -1;
        return k >= 0 ? [`${z}:planete:${k}`] : [];
    });

    // Habilité Sans influence : ce qui se paie en influence se paie en ressources
    const compteurDe = cle => (cle === "inf" && aScript(moi, "sans-influence") ? "res" : cle);
    const compte = cle => Number(etat.compteurs[`joueur:${moi}:${compteurDe(cle)}`]) || 0;

    const outils = {
        systeme,
        idSysteme,
        numero,
        possede,
        etat,
        index,
        moi,
        c,
        contenu: idElement ? contenuEnCache(idElement) : null,
        nom: ref => nomElement(search, ref),
        infanterie: idInfanterie,
        phase: etat.phase || "",
        // Une de mes unités de cet élément est-elle sur la carte ? Unités de cet élément au lieu
        mienneSurLaCarte: idUnite => Object.values(etat.composants).some(x =>
            !x.cache && x.ref?.type === "unit" && x.ref.id === idUnite && campDe(x) === moi && /^hex:\d+/.test(x.zone || "")),
        ici: idUnite => ici.filter(x => !x.cache && x.ref?.type === "unit" && x.ref.id === idUnite).length,
        // Mes unités dans le système de la fiche (espace, planètes, embarquées)
        mesUnitesDansLeSysteme: () => numero === null ? 0 : Object.values(etat.composants).filter(x =>
            !x.cache && x.ref?.type === "unit" && campDe(x) === moi &&
            (x.zone === "hex:" + numero || x.zone?.startsWith(`hex:${numero}:`))).length,
        // Ai-je cette carte (éléments actifs, promesse à durée) ?
        aCarte: (type, id) => Object.values(etat.composants).some(x => !x.cache && x.ref?.type === type && x.ref.id === id && estAMoi(x)),
        // Mes agents usés (agents, cubes noirs des mercenaires)
        agentsUses: () => (index.parZone.get(`joueur:${moi}:agentsUses`) || []).filter(x => !x.cache),
        connaissance: type => connaissance(moi, type),
        agentIci: motif => ici.some(x => !x.cache && x.ref?.type === "agent" && new RegExp(motif, "i").test(nomElement(search, x.ref))),
        // Une unité de cet élément est-elle posée sur la carte ?
        surLaCarte: idUnite => Object.values(etat.composants).some(x =>
            !x.cache && x.ref?.type === "unit" && x.ref.id === idUnite && /^hex:\d+/.test(x.zone || "")),
        // Ce que j'ai d'une ressource (« res », « inf », « commerce »)
        compte: cle => compte(cle),
        // Planètes que je possède ; alliances en cours chez moi (promesses de type alliance)
        planetesPossedees: () => mesActifs.filter(x => !x.cache && x.ref?.type === "planet").length,
        alliances: () => mesPromesses.filter(x => contenuPromesses[x.ref.id]?.type === "alli").length,
        // Systèmes à anomalie (hors hyperlane) où j'ai une unité
        anomalies: () => mesCases().filter(n => systemeDe(n)?.anomaly && !/^hpl/.test(systemeDe(n).anomaly)).length,
        // Factions qui possèdent une planète dans un système où j'ai une unité
        factionsVoisines: () => {
            const planetes = new Set(mesCases().flatMap(n => (systemeDe(n)?.elems || []).map(lien => Number(lien?.id)).filter(id => id > 0)));

            return partie.joueurs.filter(j => (index.parZone.get(`joueur:${j.userId}:actif`) || [])
                .some(x => !x.cache && x.ref?.type === "planet" && planetes.has(x.ref.id))).length;
        },
    };

    const atelier = {
        etat,
        index,
        moi,
        joueurs: partie.joueurs,
        nomDe,
        connaissance,
        points: (userId, n) => actionsPoints(etat, userId, n),
        cartes: (type, id, ou) => (index.parZone.get(ou) || []).filter(x => !x.cache && x.ref?.type === type && x.ref.id === id),
        c,
        numero,
        infamie: (userId, n) => actionsPiste(etat, userId, "infamie", n),
        recherche: (userId, idElement, n) => noter(etat, userId, "a", idElement, n),
        // Marqueurs de faction posés sur une carte ; faction qui a fait une promesse (celle du marqueur)
        marqueurs: carte => Object.values(etat.composants).filter(x => carte && x.sur === carte.id && x.jeton === MARQUEUR),
        donneur: carte => Object.values(etat.composants).find(x => carte && x.sur === carte.id && x.jeton === MARQUEUR)?.proprio ?? null,
        zonesDePlanete,
        activee: z => (index.parZone.get(z) || []).some(x => !x.ref && x.jeton === ACTIVATION && !x.marques?.ruine),
        zone,
        idElement,
        contenu: idElement ? contenuEnCache(idElement) : null,
        nom: ref => nomElement(search, ref),
    };

    // Le bouton est-il à montrer ici ?
    const concerne = s => {

        // Mercenaire qui agit sur une de mes unités
        if (lieu === "unite" && s.cible) {
            return aScript(moi, s.id) && !!s.cible(contenuEnCache(idElement), c);
        }

        if (lieu === "unite" || lieu === "carte") {
            return [s.carte.id, ...(s.aussi || [])].includes(idElement) &&
                // (carte d'un mercenaire, promesse : seulement la mienne)
                (lieu === "unite" || !["mercenaire", "Promesse"].includes(s.carte.type) || estAMoi(c));
        }

        if (lieu === "planete") {
            return s.carte.type === "habilite"
                // (surPlanete true : n'importe quelle planète, le script dit où avec visible)
                ? (s.surPlanete === true || s.surPlanete === idElement) && aScript(moi, s.id)
                : [s.carte.id, ...(s.aussi || [])].includes(idElement);
        }

        return aScript(moi, s.id);
    };

    const scripts = SCRIPTS.filter(s =>
        s.sorte === "action" && s.lieu === lieu && !scriptsDesactives.includes(s.id) && concerne(s) &&
        (!s.visible || s.visible(outils)));


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

    // Esclaves : infanteries capturées — unités d'infanterie d'un autre camp dans mes éléments actifs
    const esclaves = mesActifs.filter(x => !x.cache && x.ref?.type === "unit" && campDe(x) !== moi &&
        typeUnite(contenuEnCache(x.ref.id)) === "inf");

    // Ce qu'une ligne de « depense » retire : { voulus, trouves, nom }
    const depenseDe = ligne => (ligne.esclaves
        ? { voulus: ligne.esclaves, trouves: esclaves.slice(0, ligne.esclaves), nom: "esclave" }
        : {
            voulus: ligne.n,
            trouves: mesActifs
                .filter(x => !x.cache && x.ref?.type === ligne.type && x.ref.id === ligne.id && !(ligne.use && x.marques?.use))
                .slice(0, ligne.n),
            nom: ligne.nom || nomElement(search, { id: ligne.id }),
            use: !!ligne.use,
        });

    return scripts.map(s => {

        const effet = { ...s, ...(s.calcul ? s.calcul(outils) : {}) };
        const propre = s.special ? s.special(atelier) : { actions: [] };

        // (un agent à poser : pas de remplaçant)
        const agent = s.agent ? agentDisponible({ index, moi, search }, s.agent.motif, { sansRemplacant: !!(s.agent.pose || s.agent.surCarte) }) : null;

        // Technologie usée : son compteur « utilisée ce tour »
        const utiliseeTech = s.use && s.carte.type === "tech" ? techDuScript(moi, s.id) : null;

        // Unité créée : « inf », l'infanterie de ma faction
        const idCree = effet.cree ? (effet.cree.unite === "inf" ? idInfanterie : effet.cree.unite) : null;
        const degat = Number(c?.marques?.degat) || 0;

        // Ce que le bouton use : la carte du mercenaire (dans mes éléments actifs) quand le
        // bouton est ailleurs que sur sa fiche ; sinon la carte ou l'unité de la fiche
        const porteur = s.carte.type === "mercenaire" && c?.ref?.id !== s.carte.id
            ? mesActifs.find(x => !x.cache && x.ref?.type === "mercenaire" && x.ref.id === s.carte.id) || null
            : c;

        const lieuActive = ici.some(x => !x.ref && x.jeton === ACTIVATION && !x.marques?.ruine);

        const cleTour = `joueur:${moi}:script:${s.carte.id}`;
        const fait = s.parTour && Number(etat.compteurs[cleTour]) === etat.tour;

        // Réparation : mes unités non biologiques du système, et les unités du lieu
        const aReparer = !s.reparer || numero === null ? [] : Object.values(etat.composants).filter(x =>
            !x.cache && x.ref?.type === "unit" && Number(x.marques?.degat) > 0 && !aMotCle(x, "bio") &&
            ((campDe(x) === moi && (x.zone === "hex:" + numero || x.zone?.startsWith(`hex:${numero}:`))) || x.zone === zone));

        const coutReparation = aReparer.reduce((total, x) => total + Number(x.marques.degat), 0);

        const aSoigner = s.soigne ? ici.filter(x => x.ref?.type === "unit" && Number(x.marques?.degat) > 0 &&
            typeUnite(contenuEnCache(x.ref.id)) === s.soigne) : [];

        const coutDe = e => Object.entries({ ...(e.cout || {}), ...(s.reparer ? { res: coutReparation } : {}) }).filter(([, n]) => n > 0);
        const cout = coutDe(effet);

        const voulus = effet.fragments || {};
        const fragmentsVoulus = Object.values(voulus).reduce((total, n) => total + n, 0);
        const payes = fragmentsVoulus ? fragmentsPour(voulus) : [];

        const depenses = (s.depense || []).map(depenseDe);

        const aRetirer = s.retire ? ici.filter(x => x.ref?.type === "unit" && x.ref.id === s.retire) : [];

        const obstacles = [
            s.phase && !new RegExp(s.phase, "i").test(etat.phase || "") &&
                `ce n'est pas la phase ${/^[aeiouyéè]/i.test(s.nomPhase || s.phase) ? "d'" : "de "}${s.nomPhase || s.phase}`,
            s.possede && !possede && "vous ne possédez pas cette planète",
            effet.sans,
            propre.sans,
            s.agent && !agent && `vous n'avez pas de ${s.agent.nom} disponible (aucun ne sera ${s.agent.depense ? "dépensé" : (s.agent.pose ? "posé" : "usé")})`,
            ...cout.filter(([cle, n]) => compte(cle) < n).map(([cle, n]) =>
                `${NOMS[cle]} insuffisant${compteurDe(cle) !== cle ? " (payé en ressources)" : ""} : ${n} à payer, vous avez ${compte(cle)}`),
            fragmentsVoulus > payes.length &&
                `fragments de relique insuffisants : ${fragmentsVoulus} à dépenser, ${payes.length} trouvé(s) (seuls ceux-là seront dépensés)`,
            ...depenses.filter(d => d.trouves.length < d.voulus).map(d =>
                `il faut ${d.voulus} ${d.nom}(s)${d.use ? " non usé(e)(s)" : ""}, vous en avez ${d.trouves.length} (seuls ceux-là seront ${d.use ? "usés" : "dépensés"})`),
            utiliseeTech && etat.compteurs[utiliseeTech] && "la technologie est déjà utilisée ce tour",
            effet.cree && !idCree && "l'infanterie de votre faction est introuvable",
            s.use && s.carte.type !== "tech" && porteur && carteUsee(index, porteur) && (porteur.ref?.type === "unit"
                ? "cette unité est déjà usée"
                : (porteur.ref?.type === "mercenaire"
                    ? "le cube de ce mercenaire n'est pas sur sa carte : il est déjà utilisé (son cube revient à l'entretien)"
                    : "cette carte est déjà usée")),
            s.activer && lieuActive && "ce lieu est déjà activé",
            s.reparer && !aReparer.length && "aucune unité à réparer ici",
            s.soigne && !aSoigner.length && "aucune unité endommagée de ce type ici",
            s.retire && !aRetirer.length && `aucune unité « ${nomElement(search, { id: s.retire })} » ici`,
            effet.degat < 0 && degat <= 0 && "cette unité n'a aucun dégât",
            fait && "déjà fait ce tour",
        ];

        const rechercheDe = e => (e.recherche || []).reduce((total, [, n]) => total + n, 0);

        function faire(commentaire) {

            // Montant choisi par le joueur : le script est recalculé avec lui
            const question = typeof s.demande?.question === "function" ? s.demande.question(outils) : s.demande?.question;

            const x = s.demande
                ? Math.floor(Number(window.prompt(question, String(s.demande.max(outils)))))
                : null;

            if (s.demande && !(x > 0)) {
                return;
            }

            const choisi = s.demande ? { ...s, ...s.calcul(outils, x) } : effet;

            if (choisi.sans) {
                aviser(`${s.nom} : ${choisi.sans}.`);
                return;
            }

            const idChoisi = choisi.cree ? (choisi.cree.unite === "inf" ? idInfanterie : choisi.cree.unite) : null;

            const possession = s.prendre
                ? actionsPossession({ etat, moi, aScript, nomDe }, zone, idElement, null, false)
                : { actions: [], messages: [] };

            envoyer([
                ...(agent ? (s.agent.depense
                    ? depenserAgent({ aScript, moi, etat }, agent, `le ${s.agent.nom} (${s.nom})`)
                    : [s.agent.surCarte && c
                        ? { type: "deplacer", c: agent.id, sur: c.id, proprio: moi }
                        : (s.agent.pose && zone
                            ? { type: "deplacer", c: agent.id, vers: zone, proprio: moi }
                            : { type: "deplacer", c: agent.id, vers: `joueur:${moi}:agentsUses` })]) : []),
                ...(choisi.agentDepense ? depenserAgent({ aScript, moi, etat }, choisi.agentDepense, `l'agent (${s.nom})`) : []),
                ...coutDe(choisi).map(([cle, n]) => ({ type: "compteur", id: `joueur:${moi}:${compteurDe(cle)}`, delta: -n })),
                ...payes.map(f => ({ type: "supprimer", c: f.id })),
                ...depenses.flatMap(d => d.trouves.map(x => (d.use
                    ? { type: "marquer", c: x.id, marque: "use", valeur: true }
                    : { type: "supprimer", c: x.id }))),
                ...Object.entries(choisi.gains || {}).filter(([, n]) => n > 0).flatMap(([cle, n]) => (cle === "points"
                    ? actionsPoints(etat, moi, n)
                    : [{ type: "compteur", id: `joueur:${moi}:${cle}`, delta: n }])),
                ...Array.from({ length: choisi.faveur || 0 }, () => ({ type: "creer", jeton: FAVEUR, zone: `joueur:${moi}:faveurs`, proprio: moi })),
                ...Array.from({ length: choisi.faveurNeutre || 0 }, () => ({ type: "creer", jeton: FAVEUR, zone: `joueur:${moi}:faveurs` })),
                rechercheDe(choisi) > 0 && noter(etat, moi, "a", s.carte.id, rechercheDe(choisi)),
                ...(choisi.cree && idChoisi && (choisi.cree.bord ? c : zone)
                    ? Array.from({ length: choisi.cree.n }, () => (choisi.cree.bord
                        ? { type: "creer", ref: { type: "unit", id: idChoisi }, sur: c.id, proprio: moi }
                        : { type: "creer", ref: { type: "unit", id: idChoisi }, zone, proprio: moi }))
                    : []),
                choisi.donneCarte && { type: "creer", ref: { type: "planet", id: choisi.donneCarte }, zone: `joueur:${moi}:actif`, proprio: moi },
                ...(choisi.donne || []).map(ref => ({ type: "creer", ref, zone: `joueur:${moi}:actif`, proprio: moi })),
                ...(choisi.remplace || []).flatMap(([de, vers]) => ici
                    .filter(x => x.ref?.type === "unit" && x.ref.id === de)
                    .map(x => ({ type: "remplacer", c: x.id, ref: { type: "unit", id: vers } }))),
                ...aRetirer.map(x => ({ type: "supprimer", c: x.id })),
                ...aReparer.map(x => ({ type: "marquer", c: x.id, marque: "degat", valeur: 0, si: x.marques.degat })),
                ...aSoigner.map(x => ({ type: "marquer", c: x.id, marque: "degat", valeur: 0, si: x.marques.degat })),
                choisi.degat && c && { type: "marquer", c: c.id, marque: "degat", valeur: Math.max(0, degat + choisi.degat) },
                ...(s.use && s.carte.type !== "tech" && porteur ? actionsUserCarte(index, moi, porteur) : []),
                utiliseeTech && { type: "compteur", id: utiliseeTech, valeur: 1 },
                ...(choisi.actions || []),
                s.activer && zone && { type: "creer", jeton: ACTIVATION, zone },
                s.pioche && { type: "piocher", de: s.pioche.de, vers: `joueur:${moi}:${s.pioche.vers}`, n: s.pioche.n || 1 },
                ...possession.actions,
                ...(propre.actions || []),
                s.parTour && { type: "compteur", id: cleTour, valeur: etat.tour },
            ], [commentaire, ...possession.messages].join(" — "));

            if (choisi.avis || propre.avis) {
                aviser([choisi.avis, propre.avis].filter(Boolean).join(" "));
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
