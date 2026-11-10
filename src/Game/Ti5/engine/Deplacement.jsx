import { useState } from "react";
import { useEngine, BoutonRegle, nomCase, distanceCases, nomElement } from "./Interaction";
import { useElements } from "./sync";
import { MARQUEUR } from "./miseEnPlace";

// ============================================================
// DÉPLACEMENT ASSISTÉ (onglet Espace, phase de déplacement)
//
// Le glisser-déposer des vaisseaux reste possible. Cet assistant
// déroule un déplacement selon les règles, et l'envoie en un coup :
//
//   1. un système est activé (Ctrl + clic : mon marqueur y est posé) :
//      c'est la destination ;
//   2. un système de départ (bouton, puis clic sur la carte) ;
//   3. les vaisseaux qui partent, et les unités transportables du
//      système qu'ils chargent. Les vaisseaux sont rangés par agent
//      (amiral : militaires et transports ; négociant : commerce ;
//      logisticien : civils ; scientifique : scientifiques) et en
//      flottes de 3 : un vaisseau seul coûte un agent, une flotte
//      deux. Les agents sont utilisés, ou dépensés si le système de
//      départ est déjà activé ;
//   4. le trajet : on le trace sur la carte (cliquer ou glisser de
//      case en case). Deux cases se suivent si elles sont voisines ou
//      si elles ont un trou de ver de la même catégorie (carte du
//      système ou token posé) ;
//   5. le blocage, case par case : chaque vaisseau peut s'arrêter sur
//      une case du trajet. Rupture gravitationnelle quittée par un
//      bord et trou de ver oméga : un jet par vaisseau ;
//   6. « Déplacer » : rouge gris si quelque chose cloche (mouvement
//      dépassé, agents manquants, trajet qui ne mène pas au système
//      activé…) ; le coût du trajet est alors écrit en rouge au journal.
//      Un système où des vaisseaux se sont arrêtés est activé à son tour.
//
// useDeplacement est appelé par Espace.jsx, qui affiche le panneau,
// transmet les clics sur les cases et dessine le trajet (decor).
// ============================================================

const TAILLE_FLOTTE = 3;

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

// Agents pour n vaisseaux : une flotte de 3 en coûte deux, un vaisseau seul un
const coutEnAgents = n => Math.floor(n / TAILLE_FLOTTE) * 2 + Math.min(n % TAILLE_FLOTTE, 2);

const ANOMALIES = {
    neb: "nébuleuse",
    rift: "rupture gravitationnelle",
    sup: "supernova",
    ast: "champ d'astéroïdes",
};

const NOMS_TROU = { alpha: "alpha", beta: "bêta", gamma: "gamma", delta: "delta", omega: "oméga" };

// Catégorie d'un trou de ver, d'après son image (/ti/icon/wormhole/alpha.png)
const typeTrou = image => /wormhole\/(\w+)\./.exec(image || "")?.[1] || null;

const styleMini = { fontSize: 12, padding: "1px 6px" };

export function useDeplacement({ tuiles, systemes }) {

    const { etat, index, envoyer, joueur, moi, search, signaler, aviser, nomDe } = useEngine();

    const enPhase = /d[ée]placement/i.test(etat.phase);

    const [ouvert, setOuvert] = useState(true);
    const [cible, setCible] = useState(null);       // système activé où l'on se rend
    const [depart, setDepart] = useState(null);
    const [mode, setMode] = useState(null);         // "depart" ou "trajet" : ce que choisit un clic sur la carte
    const [choisis, setChoisis] = useState([]);     // vaisseaux qui partent
    const [charges, setCharges] = useState([]);     // unités transportables à charger
    const [trajet, setTrajet] = useState([]);       // cases traversées, après le départ
    const [arrets, setArrets] = useState({});       // vaisseau -> case où il s'arrête
    const [jets, setJets] = useState(null);         // { cle, parVaisseau }

    const actif = joueur && ouvert && (enPhase || depart !== null);

    // --------------------------------------------------------
    // CARTE : trous de ver, anomalies, systèmes activés
    // --------------------------------------------------------

    const idsPlanetes = [...new Set(Object.values(tuiles).flatMap(t =>
        (systemes[t.ref.id]?.elems || []).map(lien => Number(lien?.id)).filter(id => id > 0)))];

    const planetes = useElements(actif ? idsPlanetes : []);

    const tokens = Object.values(etat.composants)
        .filter(c => !c.cache && c.ref?.type === "token" && /^hex:\d+$/.test(c.zone || ""));

    const contenusTokens = useElements(actif ? [...new Set(tokens.map(c => c.ref.id))] : []);

    // Catégories de trou de ver d'une case : celles de sa tuile et des tokens posés dessus
    const trous = i => new Set([
        ...(systemes[tuiles[i]?.ref.id]?.elems || []).map(lien => typeTrou(planetes[lien?.id]?.img)),
        ...tokens.filter(c => c.zone === "hex:" + i).map(c => typeTrou(contenusTokens[c.ref.id]?.img)),
    ].filter(Boolean));

    const anomalie = i => systemes[tuiles[i]?.ref.id]?.anomaly || "";

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

    const vaisseaux = miennes.filter(c => c.zone === zoneDepart && !c.sur && aMot(c, "ship"));
    const selection = vaisseaux.filter(c => choisis.includes(c.id));

    // Unités transportables du système qui ne sont pas déjà dans un vaisseau qui part
    const transportables = miennes.filter(c => aMot(c, "transportable") && !choisis.includes(c.sur));

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
    // CHARGEMENT : les unités cochées montent dans les vaisseaux qui
    // partent, selon la place qu'il leur reste
    // --------------------------------------------------------

    const aCharger = transportables.filter(c => charges.includes(c.id));
    const chargement = [];      // [{ unite, vaisseau }]
    let sansPlace = 0;

    {
        const place = new Map(selection.map(v => [
            v.id,
            (Number(contenus[v.ref.id]?.capacite) || 0) - Object.values(etat.composants).filter(c => c.sur === v.id).length,
        ]));

        for (const unite of aCharger) {
            const vaisseau = selection.find(v => place.get(v.id) > 0) || selection[selection.length - 1];

            if (!vaisseau) {
                break;
            }

            if (place.get(vaisseau.id) <= 0) {
                sansPlace++;
            }

            place.set(vaisseau.id, place.get(vaisseau.id) - 1);
            chargement.push({ unite, vaisseau });
        }
    }

    // --------------------------------------------------------
    // TRAJET
    // --------------------------------------------------------

    // Étapes : { de, a, sorte } — "bord" (cases voisines), "trou:<catégorie>", ou "saut"
    const etapes = trajet.map((a, k) => {
        const de = k === 0 ? depart : trajet[k - 1];
        const commun = [...trous(de)].find(t => trous(a).has(t));

        return { de, a, sorte: distanceCases(de, a) === 1 ? "bord" : (commun ? "trou:" + commun : "saut") };
    });

    const arrivee = trajet.length ? trajet[trajet.length - 1] : null;

    // Jets à faire, dans l'ordre du trajet : rupture quittée par un bord, trou de ver oméga
    const evenements = etapes
        .map((e, k) => (e.sorte === "bord" && anomalie(e.de) === "rift"
            ? { k, sorte: "rift", ou: e.de }
            : (e.sorte === "trou:omega" ? { k, sorte: "omega", ou: e.de } : null)))
        .filter(Boolean);

    const cleJets = [depart, trajet.join(">"), selection.map(c => c.id).join(",")].join("|");
    const tirages = jets?.cle === cleJets ? jets.parVaisseau : null;

    // Où s'arrête un vaisseau : rang dans le trajet (-1 : il reste au départ ; dernier rang : il arrive)
    const rangArret = v => {

        // (un arrêt choisi sur une case qui n'est plus sur le trajet est oublié)
        const manuel = arrets[v.id];
        const valide = manuel !== undefined && (manuel === depart || trajet.slice(0, -1).includes(manuel));
        const rangManuel = !valide ? trajet.length - 1 : (manuel === depart ? -1 : trajet.indexOf(manuel));

        return Math.min(rangManuel, tirages?.[v.id]?.arret ?? trajet.length - 1);
    };

    const caseArret = v => (rangArret(v) < 0 ? depart : trajet[rangArret(v)]);
    const mouvement = v => (Number(contenus[v.ref.id]?.move) || 0) + (tirages?.[v.id]?.bonus || 0);

    // Autres unités d'une case : celles d'un autre joueur, ou neutres
    const presence = i => {

        const autres = (index.parZone.get("hex:" + i) || [])
            .filter(c => c.ref?.type === "unit" && (c.marques?.possession ?? c.proprio) !== moi);

        const parCamp = new Map();

        for (const c of autres) {
            const camp = c.marques?.possession ?? c.proprio ?? null;
            parCamp.set(camp, (parCamp.get(camp) || 0) + 1);
        }

        return [...parCamp].map(([camp, n]) => `${n} ${camp === null ? "neutre" + (n > 1 ? "s" : "") : "de " + nomDe(camp)}`).join(", ");
    };

    // Cases où un vaisseau peut être bloqué ou arrêté : le départ, puis chaque case avant l'arrivée
    const casesArret = depart === null ? [] : [depart, ...trajet.slice(0, -1)];

    // --------------------------------------------------------
    // CE QUI CLOCHE (le bouton devient rouge gris, le coup reste possible)
    // --------------------------------------------------------

    const partent = selection.filter(v => rangArret(v) >= 0);

    const obstacles = [
        !enPhase && "ce n'est pas la phase de déplacement",
        destination === null && "aucun système n'est activé (Ctrl + clic sur le système de destination)",
        destination !== null && arrivee !== null && arrivee !== destination &&
            `le trajet finit ${nomCase(arrivee)}, pas sur le système activé (${nomCase(destination)})`,
        ...etapes.filter(e => e.sorte === "saut")
            .map(e => `${nomCase(e.de)} → ${nomCase(e.a)} : ni voisines, ni reliées par un trou de ver`),
        ...trajet.filter(i => !tuiles[i]).map(i => `${nomCase(i)} : pas de système sur cette case`),
        ...trajet.filter(i => anomalie(i) === "sup").map(i => `${nomCase(i)} : supernova, le déplacement y est impossible`),
        ...trajet.slice(0, -1).filter(i => anomalie(i) === "neb")
            .map(i => `${nomCase(i)} : une nébuleuse met fin au mouvement de qui y entre`),
        depart !== null && anomalie(depart) === "neb" && etapes.length > 1 && etapes[0].sorte === "bord" &&
            "quitter une nébuleuse par un bord met fin au mouvement à la case suivante",
        ...partent.filter(v => rangArret(v) + 1 > mouvement(v))
            .map(v => `${nom(v)} dépasse son mouvement (${mouvement(v)} pour ${rangArret(v) + 1} case${rangArret(v) > 0 ? "s" : ""})`),
        ...besoins.filter(b => b.dispo.length < b.cout)
            .map(b => `il faut ${b.cout} ${b.cout > 1 ? b.pluriel : b.nom}, ${b.dispo.length} disponible(s) : ` +
                (b.dispo.length ? `seuls ceux-là seront ${depuisActive ? "dépensés" : "utilisés"}` : "aucun agent ne sera pris")),
        sansPlace > 0 && `${sansPlace} unité(s) chargée(s) au-delà de la capacité des vaisseaux`,
        evenements.length > 0 && !tirages && "les jets de rupture gravitationnelle ou de trou de ver oméga ne sont pas lancés",
    ];

    // --------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------

    function reinitialiser(nouveauDepart = null) {
        setDepart(nouveauDepart);
        setChoisis([]);
        setCharges([]);
        setTrajet([]);
        setArrets({});
        setJets(null);
        setMode(nouveauDepart === null ? null : "trajet");
    }

    // Un jet de 10 par vaisseau et par événement (le serveur lance les dés)
    async function lancerJets() {

        const r = await envoyer(
            [{ type: "des", n: evenements.length * selection.length, faces: 10 }],
            `Déplacement : jets de ${[...new Set(evenements.map(e => (e.sorte === "rift" ? "rupture gravitationnelle" : "trou de ver oméga")))].join(" et de ")}`
        );

        const des = [...(r?.coups || [])]
            .sort((a, b) => b.n - a.n)
            .find(c => c.auteur === moi)?.actions.find(a => a.type === "des")?.resultats;

        if (!Array.isArray(des) || des.length !== evenements.length * selection.length) {
            signaler("Déplacement : les jets n'ont pas pu être lus. Réessayez.");
            return;
        }

        const parVaisseau = {};

        selection.forEach((v, s) => {

            const bilan = { arret: trajet.length - 1, bonus: 0, touches: 0, detail: [] };

            evenements.forEach((e, k) => {

                const de = des[k * selection.length + s];

                // Déjà arrêté avant cette étape : le jet ne compte pas
                if (bilan.arret < e.k) {
                    return;
                }

                if (de <= 3) {
                    bilan.arret = e.k - 1;
                    bilan.detail.push(`${de} : bloqué ${nomCase(e.ou)}`);
                } else if (e.sorte === "rift") {
                    bilan.bonus++;
                    bilan.detail.push(`${de} : rupture franchie, +1 mouvement`);
                } else if (de >= 9) {
                    bilan.touches++;
                    bilan.detail.push(`${de} : passe, 1 touche`);
                } else {
                    bilan.detail.push(`${de} : passe`);
                }
            });

            parVaisseau[v.id] = bilan;
        });

        setJets({ cle: cleJets, parVaisseau });
    }

    function deplacer(commentaire) {

        const uses = `joueur:${moi}:agentsUses`;
        const arretes = [...new Set(partent.map(caseArret).filter(i => i !== destination && i !== depart && !activees.includes(i)))];

        envoyer([
            // Agents : utilisés, ou dépensés si le système de départ est déjà activé
            ...besoins.flatMap(b => b.dispo.slice(0, b.cout).map(agent => (depuisActive
                ? { type: "supprimer", c: agent.id }
                : { type: "deplacer", c: agent.id, vers: uses }))),
            // Chargement, avant le départ : les unités suivent leur vaisseau
            ...chargement.filter(x => partent.includes(x.vaisseau))
                .map(x => ({ type: "deplacer", c: x.unite.id, sur: x.vaisseau.id })),
            ...partent.map(v => ({ type: "deplacer", c: v.id, vers: "hex:" + caseArret(v), de: zoneDepart })),
            // Touches du trou de ver oméga
            ...partent.filter(v => tirages?.[v.id]?.touches).map(v => ({
                type: "marquer",
                c: v.id,
                marque: "degat",
                valeur: (Number(v.marques?.degat) || 0) + tirages[v.id].touches,
            })),
            // Un système où des vaisseaux se sont arrêtés est activé à son tour
            ...arretes.map(i => ({ type: "creer", jeton: MARQUEUR, zone: "hex:" + i, proprio: moi })),
        ], commentaire);

        if (arretes.length) {
            aviser(`Des vaisseaux se sont arrêtés ${arretes.map(nomCase).join(", ")} : système activé. ` +
                `Faites-y vos déplacements, puis revenez à ${nomCase(destination)} (boutons « Systèmes activés »).`);
            setCible(arretes[0]);
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

    const panneau = joueur && (enPhase || depart !== null) && (
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

                    <button
                        type="button"
                        data-action="choisir-depart"
                        onClick={() => setMode(mode === "depart" ? null : "depart")}
                        style={{ ...styleMini, fontWeight: "bold", backgroundColor: mode === "depart" ? "#81d4fa" : undefined }}
                    >
                        {mode === "depart" ? "Cliquer le système de départ sur la carte…" : (depart === null ? "Choisir le système de départ" : "Changer de départ")}
                    </button>

                    {depart !== null && (
                        <button type="button" onClick={() => reinitialiser()} style={styleMini}>Abandonner ce déplacement</button>
                    )}
                </>)}
            </div>

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
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                            {vaisseaux.map(v => (
                                <label key={v.id} data-vaisseau={v.id}>
                                    <input type="checkbox" checked={choisis.includes(v.id)} onChange={() => basculer(choisis, setChoisis, v.id)} />{" "}
                                    {nom(v)} <span style={{ color: "#555" }}>(mouvement {Number(contenus[v.ref.id]?.move) || 0}, {AGENTS[agentDe(contenus[v.ref.id])].nom})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* CHARGEMENT */}
                    {selection.length > 0 && transportables.length > 0 && (
                        <div>
                            <b>Charger</b> (unités transportables du système) :{" "}
                            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "2px 12px" }}>
                                {transportables.map(c => (
                                    <label key={c.id}>
                                        <input type="checkbox" checked={charges.includes(c.id)} onChange={() => basculer(charges, setCharges, c.id)} />{" "}
                                        {nom(c)}
                                    </label>
                                ))}
                            </span>
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
                            {trajet.length > 0 && <b> — {trajet.length} case{trajet.length > 1 ? "s" : ""}</b>}
                        </span>
                    </div>

                    {/* BLOCAGE ET ARRÊTS */}
                    {selection.length > 0 && trajet.length > 0 && (
                        <div data-arrets>
                            <b>Blocage, case par case</b> : {casesArret.filter(i => presence(i)).length === 0
                                ? <i>aucune autre unité sur le trajet.</i>
                                : casesArret.filter(i => presence(i)).map(i => (
                                    <span key={i} style={{ marginRight: 10, color: "#a15c00" }}>{nomCase(i)} : {presence(i)}</span>
                                ))}

                            {evenements.length > 0 && (
                                <span style={{ marginLeft: 8 }}>
                                    <button type="button" data-action="jets-deplacement" style={{ ...styleMini, fontWeight: "bold" }} onClick={lancerJets}>
                                        {tirages ? "Relancer les jets" : "Lancer les jets"} ({evenements.map(e => (e.sorte === "rift" ? "rupture" : "oméga") + " " + nomCase(e.ou)).join(", ")})
                                    </button>
                                </span>
                            )}

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", marginTop: 2 }}>
                                {selection.map(v => (
                                    <label key={v.id}>
                                        {nom(v)} :{" "}
                                        <select
                                            value={arrets[v.id] ?? ""}
                                            onChange={e => setArrets({ ...arrets, [v.id]: e.target.value === "" ? undefined : Number(e.target.value) })}
                                        >
                                            <option value="">va jusqu'au bout</option>
                                            {casesArret.map((i, k) => (
                                                <option key={k} value={i}>
                                                    {i === depart ? "reste au départ (bloqué)" : `s'arrête ${nomCase(i)}`}{presence(i) ? " ⚠" : ""}
                                                </option>
                                            ))}
                                        </select>
                                        {tirages?.[v.id]?.detail.length > 0 && (
                                            <span style={{ color: "#6a1b9a" }}> jets : {tirages[v.id].detail.join(" ; ")}</span>
                                        )}
                                        {rangArret(v) >= 0 && rangArret(v) + 1 > mouvement(v) && (
                                            <b style={{ color: "#b71c1c" }}> mouvement dépassé</b>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <BoutonRegle
                            data-action="deplacer"
                            disabled={!partent.length || !trajet.length}
                            nom={`Déplacement ${nomCase(depart)} → ${arrivee === null ? "?" : nomCase(arrivee)} : ` +
                                `${partent.length} vaisseau${partent.length > 1 ? "x" : ""}, trajet de ${trajet.length}`}
                            obstacles={obstacles}
                            faire={deplacer}
                            title="Utilise les agents, charge les unités et déplace les vaisseaux en un seul coup"
                            style={{ padding: "3px 14px" }}
                        >
                            Déplacer {partent.length} vaisseau{partent.length > 1 ? "x" : ""}
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
