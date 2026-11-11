import { useState } from "react";
import { useEngine, BoutonRegle, nomCase, nomElement, Pions } from "./Interaction";
import { useElements } from "./sync";
import { MARQUEUR } from "./miseEnPlace";
import { capaciteDe, depenserAgent, estDeplacementFurtif } from "./effets";
import {
    TRAJET, DEPART, useCarte, sorteEtape, sorteJet, campsAdverses, rangArret, passagesEnCours, Passage,
} from "./Blocage";

// ============================================================
// DÉPLACEMENT ASSISTÉ (onglet Espace, phase de déplacement)
//
// Le glisser-déposer des vaisseaux reste possible. Cet assistant
// déroule un déplacement selon les règles, et l'envoie en un coup :
//
//   1. un système est activé (Ctrl + clic : mon marqueur y est posé) :
//      c'est la destination ;
//   2. un système de départ (bouton, puis clic sur la carte) ;
//   3. les vaisseaux qui partent (leur pion : dégâts et unités
//      embarquées y sont visibles), et les unités transportables du
//      système, rangées par planète : on les glisse sur le vaisseau qui
//      les embarque (c'est fait tout de suite, comme sur la carte). Les
//      vaisseaux sont rangés par agent
//      (amiral : militaires et transports ; négociant : commerce ;
//      logisticien : civils ; scientifique : scientifiques) et en
//      flottes de 3 : un vaisseau seul coûte un agent, une flotte
//      deux. Les agents sont utilisés, ou dépensés si le système de
//      départ est déjà activé ;
//   4. le trajet : on le trace sur la carte (cliquer ou glisser de
//      case en case). Deux cases se suivent si elles sont voisines ou
//      si elles ont un trou de ver de la même catégorie (carte du
//      système ou token posé) ;
//   5. « Partir » : rouge gris si quelque chose cloche (mouvement
//      dépassé, agents manquants, trajet qui ne mène pas au système
//      activé…) ; le coût du trajet est alors écrit en rouge au journal ;
//   6. le blocage, case par case (Blocage.jsx) : les vaisseaux vont
//      d'un coup jusqu'à la première case à risque — unités militaires
//      spatiales d'un autre camp, rupture gravitationnelle, trou de ver
//      oméga — ou jusqu'à l'arrivée. Sur une case à risque, le
//      déplacement se poursuit dans le cadre « Déplacements en cours »
//      (ici et dans l'onglet Conflit) ;
//   7. « Finir le déplacement » passe la main au joueur suivant : vert dès
//      qu'un vaisseau au moins a été déplacé (compteur joueur:<u>:deplaces,
//      remis à zéro en finissant et à chaque changement de phase).
//
// useDeplacement est appelé par Espace.jsx, qui affiche le panneau,
// transmet les clics sur les cases et dessine le trajet (decor).
// ============================================================


// Agent du déplacement, selon les mots-clés du vaisseau
const AGENTS = {
    amiral: { nom: "amiral", pluriel: "amiraux", motif: "amiral" },
    negociant: { nom: "négociant", pluriel: "négociants", motif: "n[ée]gociant" },
    logisticien: { nom: "logisticien", pluriel: "logisticiens", motif: "logisticien|g[ée]n[ée]ticien" },
    scientifique: { nom: "scientifique", pluriel: "scientifiques", motif: "scientifique" },
};

function agentDe(contenu) {

    const mots = contenu?.mot_cle || [];

    return mots.includes("mil") || mots.includes("trans") ? "amiral"
        : (mots.includes("com") ? "negociant"
            : (mots.includes("science") ? "scientifique"
                : (mots.includes("civ") ? "logisticien" : "amiral")));
}

// Agents pour n vaisseaux : une flotte (autant de vaisseaux que la capacité
// logistique du joueur, 3 par défaut) en coûte deux, un vaisseau seul un
const agentsPour = (n, flotte) => Math.floor(n / flotte) * 2 + Math.min(n % flotte, 2);

const ANOMALIES = {
    hplt: "hyperlane",
    hplc: "hyperlane",
    hpldc: "hyperlane",
    hplpa: "hyperlane",
    hplx: "hyperlane",
    neb: "nébuleuse",
    rift: "rupture gravitationnelle",
    sup: "supernova",
    ast: "champ d'astéroïdes",
};

const NOMS_TROU = { alpha: "alpha", beta: "bêta", gamma: "gamma", delta: "delta", omega: "oméga" };

const styleMini = { fontSize: 12, padding: "1px 6px" };

// Vaisseaux déplacés par le joueur depuis son dernier « Finir le déplacement »
export const compteurDeplaces = u => `joueur:${u}:deplaces`;

export function useDeplacement({ tuiles, systemes = {} }) {

    const {
        etat, index, envoyer, joueur, moi, search, aviser, nomDe, aScript, capaciteLogistique, finirTour,
    } = useEngine();

    // Taille d'une flotte : la capacité logistique du joueur (script Logistique améliorée)
    const TAILLE_FLOTTE = capaciteLogistique(moi);
    const coutEnAgents = n => agentsPour(n, TAILLE_FLOTTE);

    const enPhase = /d[ée]placement/i.test(etat.phase);

    const [ouvert, setOuvert] = useState(true);
    const [cible, setCible] = useState(null);       // système activé où l'on se rend
    const [depart, setDepart] = useState(null);
    const [mode, setMode] = useState(null);         // "depart" ou "trajet" : ce que choisit un clic sur la carte
    const [choisis, setChoisis] = useState([]);     // vaisseaux qui partent
    const [trajet, setTrajet] = useState([]);       // cases traversées, après le départ
    const [gravite, setGravite] = useState(false);  // script Moteur à gravité : +1 mouvement

    const actif = joueur && ouvert && (enPhase || depart !== null);

    // --------------------------------------------------------
    // CARTE : trous de ver, anomalies, unités des cases du trajet
    // (Blocage.jsx), systèmes activés
    // --------------------------------------------------------

    const carte = useCarte(actif && depart !== null ? [depart, ...trajet] : [], moi);

    const anomalie = carte.anomalie;

    // Mes vaisseaux en route (déplacement commencé, arrêté sur une case à risque)
    const enRoute = passagesEnCours(etat).filter(p => p.mover === moi);

    // Mes systèmes activés (mon marqueur de faction dans l'espace du système), le dernier en dernier
    const mesMarqueurs = Object.values(etat.composants)
        .filter(c => !c.ref && c.jeton === MARQUEUR && c.proprio === moi && /^hex:\d+$/.test(c.zone || ""))
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    const activees = [...new Set(mesMarqueurs.map(c => Number(c.zone.slice(4))))];

    const destination = activees.includes(cible) ? cible : (activees[activees.length - 1] ?? null);

    // --------------------------------------------------------
    // UNITÉS DU SYSTÈME DE DÉPART
    // --------------------------------------------------------

    const zoneDepart = depart === null ? null : "hex:" + depart;

    const miennes = depart === null ? [] : Object.values(etat.composants).filter(c =>
        !c.cache && c.ref?.type === "unit" && (c.marques?.possession ?? c.proprio) === moi &&
        (c.zone === zoneDepart || c.zone?.startsWith(zoneDepart + ":")));

    const contenus = useElements([...new Set(miennes.map(c => c.ref.id))]);

    const aMot = (c, mot) => !!contenus[c.ref.id]?.mot_cle?.includes(mot);

    // (un vaisseau déjà en route ne repart pas)
    const vaisseaux = miennes.filter(c => c.zone === zoneDepart && !c.sur && aMot(c, "ship") && !c.marques?.[TRAJET]);
    const selection = vaisseaux.filter(c => choisis.includes(c.id));

    // Unités transportables du système qui ne sont pas embarquées, par lieu
    // (espace du système, puis chaque planète) : on les glisse sur un vaisseau
    const transportable = c => c.ref?.type === "unit" && !c.sur &&
        (c.marques?.possession ?? c.proprio) === moi && aMot(c, "transportable");

    const elemsDepart = depart === null ? [] : (systemes[tuiles[depart]?.ref?.id]?.elems || []);

    const lieuxCharge = depart === null ? [] : [...new Set(miennes.filter(transportable).map(c => c.zone))]
        .sort()
        .map(zone => {
            const k = /:planete:(\d+)$/.exec(zone)?.[1];
            const idPlanete = k === undefined ? null : Number(elemsDepart[Number(k)]?.id);

            return {
                zone,
                nom: k === undefined
                    ? "Espace"
                    : (idPlanete > 0 ? nomElement(search, { type: "planet", id: idPlanete }) : `Planète ${Number(k) + 1}`),
            };
        });

    const nom = c => nomElement(search, c.ref);

    // --------------------------------------------------------
    // AGENTS : par type de vaisseau, en flottes de 3
    // --------------------------------------------------------

    const depuisActive = depart !== null && activees.includes(depart);

    const disponibles = motif => (index.parZone.get(`joueur:${moi}:agents`) || [])
        .filter(c => c.ref && new RegExp(motif, "i").test(nomElement(search, c.ref)));

    const besoins = Object.keys(AGENTS)
        .map(cle => {
            const n = selection.filter(c => agentDe(contenus[c.ref.id]) === cle).length;
            return { cle, ...AGENTS[cle], n, cout: coutEnAgents(n), dispo: disponibles(AGENTS[cle].motif) };
        })
        .filter(b => b.n > 0);

    // --------------------------------------------------------
    // CHARGEMENT : les unités se glissent sur le pion du vaisseau (elles
    // embarquent tout de suite). Ici, seulement ce qui dépasse la capacité.
    // --------------------------------------------------------

    // (script Capsule de transport : capacité majorée)
    const sansPlace = selection.reduce((total, v) => total + Math.max(0,
        Object.values(etat.composants).filter(c => c.sur === v.id && c.ref?.type === "unit").length -
            capaciteDe(contenus[v.ref.id], moi, aScript)), 0);

    // Vaisseaux déplacés depuis mon dernier « Finir le déplacement »
    const deplaces = Number(etat.compteurs[compteurDeplaces(moi)]) || 0;

    // --------------------------------------------------------
    // TRAJET
    // --------------------------------------------------------

    // Étapes : { de, a, sorte } — "bord" (cases voisines), "trou:<catégorie>", ou "saut"
    const etapes = trajet.map((a, k) => {
        const de = k === 0 ? depart : trajet[k - 1];

        return { de, a, sorte: sorteEtape(carte, de, a) };
    });

    const arrivee = trajet.length ? trajet[trajet.length - 1] : null;

    // Risques de blocage, case par case : chaque case que l'on quitte (le
    // départ, puis chaque case avant l'arrivée)
    //   { ou, camps: unités militaires spatiales d'un autre camp, jet: "rift", "omega" ou null }
    // Tous furtifs (#deplfurtif, script Camouflage) : les unités adverses ne les arrêtent pas
    const tousFurtifs = selection.length > 0 &&
        selection.every(v => estDeplacementFurtif(contenus[v.ref.id], moi, aScript));

    const risques = etapes
        .map(e => ({ ou: e.de, camps: tousFurtifs ? [] : campsAdverses(carte, e.de, moi), jet: sorteJet(carte, e.de, e.a) }))
        .filter(r => r.camps.length > 0 || r.jet);

    // Hyperlanes : elles ne coûtent pas de mouvement, mais on ne les traverse qu'en
    // suivant leurs lignes, d'une voisine à une autre
    const cout = trajet.filter(i => !carte.hyperlane(i)).length;

    const horsLigne = trajet
        .map((i, k) => ({ i, de: k === 0 ? depart : trajet[k - 1], vers: trajet[k + 1] }))
        .filter(x => carte.hyperlane(x.i) && x.vers !== undefined && !carte.relie(x.i, x.de, x.vers));

    // Mouvement d'un vaisseau : chaque rupture gravitationnelle franchie donne 1 de plus
    const ruptures = risques.filter(r => r.jet === "rift").length;
    // Scripts : Moteur FTL (+1), Moteur à gravité (+1, des scientifiques sont usés)
    const avecGravite = gravite && aScript(moi, "moteur-a-gravite");

    const mouvement = v => (Number(contenus[v.ref.id]?.move) || 0) + ruptures +
        (aScript(moi, "moteur-ftl") ? 1 : 0) + (avecGravite ? 1 : 0);

    // Moteur à gravité : un scientifique par vaisseau seul, deux par flotte
    const scientifiquesGravite = avecGravite ? disponibles("scientifique").slice(0, coutEnAgents(selection.length)) : [];

    const nomCamp = camp => (camp ? nomDe(camp) : "neutres");

    // --------------------------------------------------------
    // CE QUI CLOCHE (le bouton devient rouge gris, le coup reste possible)
    // --------------------------------------------------------

    const partent = selection;

    const obstacles = [
        !enPhase && "ce n'est pas la phase de déplacement",
        destination === null && "aucun système n'est activé (Ctrl + clic sur le système de destination)",
        destination !== null && arrivee !== null && arrivee !== destination &&
            `le trajet finit ${nomCase(arrivee)}, pas sur le système activé (${nomCase(destination)})`,
        ...etapes.filter(e => e.sorte === "saut")
            .map(e => `${nomCase(e.de)} → ${nomCase(e.a)} : ni voisines, ni reliées par un trou de ver`),
        ...trajet.filter(i => !tuiles[i]).map(i => `${nomCase(i)} : pas de système sur cette case`),
        ...trajet.filter(i => anomalie(i) === "sup").map(i => `${nomCase(i)} : supernova, le déplacement y est impossible`),
        // Champ d'astéroïdes : interdit, sauf avec le script Bouclier déflecteur
        ...(aScript(moi, "bouclier-deflecteur") ? [] : trajet.filter(i => anomalie(i) === "ast")
            .map(i => `${nomCase(i)} : champ d'astéroïdes, le déplacement y est interdit`)),
        ...trajet.slice(0, -1).filter(i => anomalie(i) === "neb")
            .map(i => `${nomCase(i)} : une nébuleuse met fin au mouvement de qui y entre`),
        depart !== null && anomalie(depart) === "neb" && etapes.length > 1 && etapes[0].sorte === "bord" &&
            "quitter une nébuleuse par un bord met fin au mouvement à la case suivante",
        ...horsLigne.map(x => `${nomCase(x.i)} : l'hyperlane ne relie pas ${nomCase(x.de)} à ${nomCase(x.vers)}`),
        arrivee !== null && carte.hyperlane(arrivee) && `${nomCase(arrivee)} : le trajet ne peut pas finir sur une hyperlane`,
        ...partent.filter(v => cout > mouvement(v))
            .map(v => `${nom(v)} dépasse son mouvement (${mouvement(v)}${ruptures ? ", ruptures franchies comprises," : ""} pour ${cout} case${cout > 1 ? "s" : ""})`),
        ...besoins.filter(b => b.dispo.length < b.cout)
            .map(b => `il faut ${b.cout} ${b.cout > 1 ? b.pluriel : b.nom}, ${b.dispo.length} disponible(s) : ` +
                (b.dispo.length ? `seuls ceux-là seront ${depuisActive ? "dépensés" : "utilisés"}` : "aucun agent ne sera pris")),
        sansPlace > 0 && `${sansPlace} unité(s) embarquée(s) au-delà de la capacité des vaisseaux`,
        avecGravite && scientifiquesGravite.length < coutEnAgents(selection.length) &&
            `Moteur à gravité : il faut ${coutEnAgents(selection.length)} scientifique(s), ${scientifiquesGravite.length} disponible(s)`,
        !carte.pret && "la carte du trajet n'est pas encore chargée (les risques de blocage ne sont pas connus)",
    ];

    // --------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------

    function reinitialiser(nouveauDepart = null) {
        setDepart(nouveauDepart);
        setChoisis([]);
        setTrajet([]);
        setGravite(false);
        setMode(nouveauDepart === null ? null : "trajet");
    }

    // Départ : agents, puis les vaisseaux vont jusqu'à la première
    // case à risque (ils y gardent leur trajet restant : Blocage.jsx prend la
    // suite), ou jusqu'à l'arrivée s'il n'y en a pas
    function partir(commentaire) {

        const uses = `joueur:${moi}:agentsUses`;

        const k = rangArret(carte, moi, depart, trajet, false, tousFurtifs);
        const reste = trajet.slice(k + 1);

        // Script Stratégie de saut : arrivée directe par un trou de ver (marque lue au combat)
        const saut = !reste.length && aScript(moi, "strategie-de-saut") &&
            (etapes[etapes.length - 1]?.sorte || "").startsWith("trou:");

        envoyer([
            // Agents : utilisés, ou dépensés si le système de départ est déjà activé
            // (dépensés : le script Bio stimulant propose de les user à la place)
            ...besoins.flatMap(b => b.dispo.slice(0, b.cout).flatMap(agent => (depuisActive
                ? depenserAgent({ aScript, moi, etat }, agent, `${b.nom} (départ d'un système déjà activé)`)
                : [{ type: "deplacer", c: agent.id, vers: uses }]))),
            ...scientifiquesGravite.map(agent => ({ type: "deplacer", c: agent.id, vers: uses })),
            // (compte des vaisseaux déplacés : « Finir le déplacement »)
            { type: "compteur", id: compteurDeplaces(moi), delta: partent.length },
            ...partent.flatMap(v => [
                saut && { type: "marquer", c: v.id, marque: "saut", valeur: etat.tour },
                k >= 0 && { type: "deplacer", c: v.id, vers: "hex:" + trajet[k], de: zoneDepart },
                reste.length > 0 && { type: "marquer", c: v.id, marque: TRAJET, valeur: reste.join(">") },
                reste.length > 0 && { type: "marquer", c: v.id, marque: DEPART, valeur: "c" + depart },
            ]),
        ], commentaire);

        if (reste.length) {
            aviser(`Risque de blocage ${nomCase(k < 0 ? depart : trajet[k])} : le déplacement s'y poursuit, ` +
                "dans le cadre « Déplacements en cours » (ici, et dans l'onglet Conflit).");
        }

        reinitialiser();
    }

    // --------------------------------------------------------
    // CLICS SUR LA CARTE (appelés par Espace.jsx)
    // --------------------------------------------------------

    // Retourne vrai si le clic a servi à l'assistant
    function clicCase(numero) {

        if (!actif || !mode) {
            return false;
        }

        if (mode === "depart") {
            reinitialiser(numero);
            return true;
        }

        // Trajet : la dernière case cliquée de nouveau est retirée, une autre est ajoutée
        setTrajet(t => (t[t.length - 1] === numero ? t.slice(0, -1) : (numero === depart && !t.length ? t : [...t, numero])));
        return true;
    }

    // Glisser sur la carte : chaque case où l'on entre s'ajoute au trajet
    function survolCase(numero) {
        if (actif && mode === "trajet") {
            setTrajet(t => (t[t.length - 1] === numero || (numero === depart && !t.length) ? t : [...t, numero]));
        }
    }

    // Repères dessinés sur une case : départ, rang dans le trajet, arrivée
    function decor(i) {

        if (!actif) {
            return null;
        }

        const rangs = trajet.map((c, k) => (c === i ? k + 1 : 0)).filter(Boolean);

        const texte = [
            i === depart && "départ",
            rangs.length > 0 && rangs.join(" · "),
            i === destination && "arrivée",
        ].filter(Boolean).join(" ");

        return texte && (
            <div
                data-deplacement={i === depart ? "depart" : (rangs.length ? "trajet" : "arrivee")}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 14,
                    display: "flex",
                    justifyContent: "center",
                    pointerEvents: "none",
                    zIndex: 18,
                }}
            >
                <b
                    style={{
                        padding: "0 6px",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "#000",
                        backgroundColor: i === depart ? "#81d4fa" : (rangs.length ? "#ffb74d" : "#a5d6a7"),
                        border: "1px solid #000",
                    }}
                >
                    {texte}
                </b>
            </div>
        );
    }

    // --------------------------------------------------------
    // PANNEAU
    // --------------------------------------------------------

    const basculer = (liste, setListe, id) =>
        setListe(liste.includes(id) ? liste.filter(x => x !== id) : [...liste, id]);

    const panneau = joueur && (enPhase || depart !== null || enRoute.length > 0) && (
        <div
            data-panneau-deplacement
            style={{
                marginBottom: 8,
                padding: "6px 10px",
                border: "2px solid #0277bd",
                borderRadius: 8,
                backgroundColor: "#f1f8fe",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                fontSize: 13,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={() => setOuvert(!ouvert)} style={styleMini}>{ouvert ? "▾" : "▸"}</button>
                <b>Déplacement assisté</b>

                {ouvert && (<>
                    <span>
                        Systèmes activés :{" "}
                        {activees.length === 0 && <i>aucun (Ctrl + clic sur le système où vous allez)</i>}
                        {activees.map(i => (
                            <button
                                key={i}
                                type="button"
                                title="Choisir ce système comme destination"
                                onClick={() => setCible(i)}
                                style={{ ...styleMini, marginRight: 4, fontWeight: i === destination ? "bold" : "normal", backgroundColor: i === destination ? "#a5d6a7" : undefined }}
                            >
                                {nomCase(i)}{i === destination ? " ◀ destination" : ""}
                            </button>
                        ))}
                    </span>

                    {/* Le départ ne se choisit qu'une fois la destination connue (un système activé) */}
                    {(destination !== null || depart !== null) && (
                        <button
                            type="button"
                            data-action="choisir-depart"
                            onClick={() => setMode(mode === "depart" ? null : "depart")}
                            style={{ ...styleMini, fontWeight: "bold", backgroundColor: mode === "depart" ? "#81d4fa" : undefined }}
                        >
                            {mode === "depart" ? "Cliquer le système de départ sur la carte…" : (depart === null ? "Choisir le système de départ" : "Changer de départ")}
                        </button>
                    )}

                    {depart !== null && (
                        <button type="button" onClick={() => reinitialiser()} style={styleMini}>Abandonner ce déplacement</button>
                    )}

                    {/* Fin de mon déplacement : la main passe au joueur suivant */}
                    {enPhase && (
                        <BoutonRegle
                            data-action="finir-deplacement"
                            nom="Finir le déplacement"
                            obstacles={[
                                !deplaces && "vous n'avez déplacé aucun vaisseau avec l'assistant",
                                enRoute.length > 0 && `${enRoute.length} déplacement(s) encore en route (blocage à résoudre)`,
                                etat.joueurActif !== moi && "ce n'est pas votre tour",
                            ]}
                            faire={commentaire => {
                                finirTour(deplaces ? [{ type: "compteur", id: compteurDeplaces(moi), valeur: 0 }] : [], commentaire);
                                reinitialiser();
                            }}
                            title="Votre déplacement est fini : la main passe au joueur suivant"
                            style={{ ...styleMini, marginLeft: "auto", fontWeight: "bold" }}
                        >
                            Finir le déplacement{deplaces ? ` (${deplaces} vaisseau${deplaces > 1 ? "x" : ""} déplacé${deplaces > 1 ? "s" : ""})` : ""}
                        </BoutonRegle>
                    )}
                </>)}
            </div>

            {/* Mes vaisseaux en route, arrêtés sur une case à risque (aussi dans l'onglet Conflit) */}
            {enRoute.map(p => <Passage key={p.cle} passage={p} />)}

            {ouvert && depart !== null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>

                    {/* VAISSEAUX */}
                    <div>
                        <b>Départ : {nomCase(depart)}{depuisActive ? " (système déjà activé : les agents sont dépensés)" : ""}.</b>{" "}
                        {vaisseaux.length === 0 && <i>Vous n'avez aucun vaisseau dans l'espace de ce système.</i>}
                        {vaisseaux.length > 0 && (
                            <button type="button" style={styleMini} onClick={() => setChoisis(choisis.length === vaisseaux.length ? [] : vaisseaux.map(c => c.id))}>
                                {choisis.length === vaisseaux.length ? "Aucun" : "Tous"}
                            </button>
                        )}
                        {/* Le pion du vaisseau : ses dégâts et ce qu'il transporte y sont visibles ;
                            une unité glissée dessus embarque */}
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", marginTop: 2 }}>
                            {vaisseaux.map(v => (
                                <span
                                    key={v.id}
                                    data-vaisseau={v.id}
                                    title={`${nom(v)} : mouvement ${Number(contenus[v.ref.id]?.move) || 0}, ${AGENTS[agentDe(contenus[v.ref.id])].nom}`}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                        padding: "1px 4px",
                                        borderRadius: 6,
                                        border: "1px solid " + (choisis.includes(v.id) ? "#0277bd" : "transparent"),
                                        backgroundColor: choisis.includes(v.id) ? "#b3e5fc" : undefined,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        aria-label={nom(v)}
                                        checked={choisis.includes(v.id)}
                                        onChange={() => basculer(choisis, setChoisis, v.id)}
                                    />
                                    <Pions zone={zoneDepart} filtre={c => c.id === v.id} separes petit />
                                    <span style={{ fontSize: 11, color: "#555" }}>{Number(contenus[v.ref.id]?.move) || 0}⇢</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* CHARGEMENT : les unités transportables, par lieu, à glisser sur un vaisseau */}
                    {vaisseaux.length > 0 && lieuxCharge.length > 0 && (
                        <div data-charger style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 14px" }}>
                            <b>Charger</b>
                            {lieuxCharge.map(lieu => (
                                <span key={lieu.zone} data-lieu-charge={lieu.zone} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                    {lieu.nom} :
                                    <Pions zone={lieu.zone} filtre={transportable} separes petit />
                                </span>
                            ))}
                            <i style={{ color: "#555" }}>glissez une unité sur le vaisseau qui l'embarque.</i>
                        </div>
                    )}

                    {/* AGENTS */}
                    {besoins.length > 0 && (
                        <div data-besoins-agents>
                            <b>Agents {depuisActive ? "dépensés (■)" : "utilisés (□)"} :</b>{" "}
                            {besoins.map(b => (
                                <span key={b.cle} style={{ marginRight: 12, color: b.dispo.length < b.cout ? "#b71c1c" : undefined }}>
                                    {b.n} vaisseau{b.n > 1 ? "x" : ""} → {Math.floor(b.n / TAILLE_FLOTTE) > 0 && `${Math.floor(b.n / TAILLE_FLOTTE)} flotte(s) de ${TAILLE_FLOTTE}`}
                                    {Math.floor(b.n / TAILLE_FLOTTE) > 0 && b.n % TAILLE_FLOTTE > 0 && " + "}
                                    {b.n % TAILLE_FLOTTE > 0 && `${b.n % TAILLE_FLOTTE} seul(s)`} = <b>{b.cout} {b.cout > 1 ? b.pluriel : b.nom}</b> ({b.dispo.length} disponible{b.dispo.length > 1 ? "s" : ""})
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Script Moteur à gravité */}
                    {selection.length > 0 && aScript(moi, "moteur-a-gravite") && (
                        <label data-script="moteur-a-gravite">
                            <input type="checkbox" checked={gravite} onChange={e => setGravite(e.target.checked)} />{" "}
                            <b>Moteur à gravité</b> : +1 mouvement, use {coutEnAgents(selection.length)} scientifique(s)
                        </label>
                    )}

                    {/* TRAJET */}
                    <div>
                        <b>Trajet</b>{" "}
                        <button
                            type="button"
                            data-action="tracer-trajet"
                            onClick={() => setMode(mode === "trajet" ? null : "trajet")}
                            style={{ ...styleMini, fontWeight: "bold", backgroundColor: mode === "trajet" ? "#ffb74d" : undefined }}
                        >
                            {mode === "trajet" ? "Tracé en cours : cliquer ou glisser de case en case" : "Tracer sur la carte"}
                        </button>{" "}
                        <button type="button" style={styleMini} disabled={!trajet.length} onClick={() => setTrajet(trajet.slice(0, -1))}>Retirer la dernière case</button>{" "}
                        <button type="button" style={styleMini} disabled={!trajet.length} onClick={() => setTrajet([])}>Effacer</button>{" "}
                        <span data-trajet>
                            {nomCase(depart)}
                            {etapes.map((e, k) => (
                                <span key={k} style={{ color: e.sorte === "saut" ? "#b71c1c" : undefined }}>
                                    {e.sorte === "bord" ? " → " : (e.sorte === "saut" ? " ⇢ (saut) " : ` ⇝ (trou de ver ${NOMS_TROU[e.sorte.slice(5)] || e.sorte.slice(5)}) `)}
                                    {nomCase(e.a)}{ANOMALIES[anomalie(e.a)] ? ` [${ANOMALIES[anomalie(e.a)]}]` : ""}
                                </span>
                            ))}
                            {trajet.length > 0 && <b> — {cout} case{cout > 1 ? "s" : ""}{cout < trajet.length ? " (hyperlanes non comptées)" : ""}</b>}
                        </span>
                    </div>

                    {/* RISQUES DE BLOCAGE, case par case */}
                    {selection.length > 0 && trajet.length > 0 && (
                        <div data-risques>
                            <b>Risques de blocage</b> : {risques.length === 0
                                ? <i>aucun, les vaisseaux iront d'un coup à l'arrivée.</i>
                                : risques.map((r, k) => (
                                    <span key={k} style={{ marginRight: 10, color: "#a15c00" }}>
                                        {nomCase(r.ou)} : {[
                                            ...r.camps.map(a => `${a.controle} unité(s) militaire(s) ${a.camp ? "de " : ""}${nomCamp(a.camp)}`),
                                            r.jet === "rift" && "rupture gravitationnelle (jets)",
                                            r.jet === "omega" && "trou de ver oméga (jets)",
                                        ].filter(Boolean).join(", ")}
                                    </span>
                                ))}
                            {risques.length > 0 && <i> Les vaisseaux s'arrêteront à chacune de ces cases, le temps de résoudre le blocage.</i>}
                        </div>
                    )}

                    <div>
                        <BoutonRegle
                            data-action="deplacer"
                            disabled={!partent.length || !trajet.length}
                            nom={`Déplacement ${nomCase(depart)} → ${arrivee === null ? "?" : nomCase(arrivee)} : ` +
                                `${partent.length} vaisseau${partent.length > 1 ? "x" : ""}, trajet de ${cout}`}
                            obstacles={obstacles}
                            faire={partir}
                            title="Utilise les agents, charge les unités et fait partir les vaisseaux : jusqu'à la première case à risque de blocage, ou jusqu'à l'arrivée"
                            style={{ padding: "3px 14px" }}
                        >
                            {risques.length ? "Faire partir" : "Déplacer"} {partent.length} vaisseau{partent.length > 1 ? "x" : ""}
                        </BoutonRegle>
                        {obstacles.filter(Boolean).length > 0 && partent.length > 0 && trajet.length > 0 && (
                            <span style={{ marginLeft: 8, color: "#b71c1c" }}>{obstacles.filter(Boolean).join(" ; ")}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return {
        panneau,
        // Mode en cours ("depart", "trajet" ou null) : la carte ne défile pas pendant un tracé
        mode: actif ? mode : null,
        clicCase,
        survolCase,
        decor,
        // Appelé quand un système vient d'être activé : il devient la destination
        activer: setCible,
    };
}
