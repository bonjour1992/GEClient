// ============================================================
// ÉTAT D'UNE PARTIE ET ACTIONS
//
// JavaScript sans dépendance, chargé par le client ET par le
// serveur (server/partie.js) : les deux appliquent exactement
// la même logique. Voir doc/structure.md.
//
// L'engine ne valide pas les règles du jeu. Il refuse seulement
// ce qui est techniquement impossible.
// ============================================================

// Actions que seul le serveur exécute (hasard, création d'identifiants)
export const ACTIONS_SERVEUR = ["piocher", "verser", "melanger", "des", "reveler", "consulter", "encaisser", "engager", "donnerCarte", "reinitialiserVotes"];

// Zone libre du plateau général : une pile comme une pioche (on pioche sa
// carte du dessus), mais dont le contenu reste visible sauf si elle est cachée
export const ZONE_PILE_LIBRE = "general:libre";
const estPile = zone => estPioche(zone) || zone === ZONE_PILE_LIBRE;

export const FACES = ["recto", "verso", "cache"];

// Refus de « donnerCarte » : celui qui doit donner la carte ne l'a ni en
// main ni en jeu (la transaction est alors annulée, Transaction.jsx)
// Dos d'un composant caché : la marque « dos » s'il en a une (unité
// mercenaire : « mercenaire », comme les cartes de sa pioche), sinon son type
export const dosDe = c => (typeof c.marques?.dos === "string" && c.marques.dos) || c.ref?.type || "jeton";

export const ERREUR_CARTE_ABSENTE = "la carte à donner n'est ni en main ni en jeu chez celui qui la donne";

const ZONE_VALIDE =
    /^(hex:\d+(:planete:\d+)?|carte:[\w-]+:\d+|joueur:\d+:[\w:-]+|neutre:\d+:[\w:-]+|pioche:[\w-]+|defausse:[\w-]+|general:[\w:-]+|horsJeu)$/;

// Zones privées d'un joueur : sa main, et les cartes parmi lesquelles il
// choisit (propositions piochées), que lui seul voit.
const MAIN = /^joueur:(\d+):(main|choix)$/;

// Plafonds techniques : au-delà, la création est refusée (une partie réelle
// compte quelques milliers de composants et quelques centaines de compteurs)
export const MAX_COMPOSANTS = 20000;
export const MAX_COMPTEURS = 5000;

// Type d'élément d'un composant : un nom simple, jamais une clé héritée
const TYPE_VALIDE = /^[A-Za-z][\w-]{0,39}$/;
const TYPES_INTERDITS = ["__proto__", "constructor", "prototype"];

export function typeValide(type) {
    return typeof type === "string" && TYPE_VALIDE.test(type) && !TYPES_INTERDITS.includes(type);
}

// Valeur d'une marque : scalaire court
const valeurMarque = v =>
    ["number", "boolean", "string"].includes(typeof v) && String(v).length <= 120;

// Marques données à la création : mêmes règles que l'action "marquer"
function marquesValides(marques) {

    if (marques === undefined || marques === null) {
        return {};
    }

    if (typeof marques !== "object" || Array.isArray(marques)) {
        return null;
    }

    const cles = Object.keys(marques);

    if (cles.length > 20 || cles.some(k => !/^\w{1,30}$/.test(k) || !valeurMarque(marques[k]))) {
        return null;
    }

    return Object.fromEntries(cles.map(k => [k, marques[k]]));
}

export function zoneValide(zone) {
    return typeof zone === "string" && zone.length <= 80 && ZONE_VALIDE.test(zone);
}

export function estPioche(zone) {
    return zone.startsWith("pioche:");
}

// Joueur propriétaire d'une main, ou null si la zone n'est pas une main
export function joueurDeMain(zone) {
    const m = MAIN.exec(zone);
    return m ? Number(m[1]) : null;
}

// ============================================================
// ÉTAT
// ============================================================

export function nouvelEtat() {
    return {
        tour: 1,
        phase: "",
        joueurActif: null,
        anneaux: 3,
        composants: {},
        compteurs: {},
        references: {},      // éléments GE utiles à l'affichage (déroulé)
        secrets: {},         // choix scellés : { <joueur>: { faveurs: [ids] } }, jamais envoyés aux autres
        prochainId: 1,
        prochainOrdre: 1,
    };
}

// Ajoute un composant (mise en place et action "creer"). Retourne le composant.
// id : identifiant imposé (création provisoire côté client, voir "creer")
export function ajouter(etat, { ref = null, jeton = "", zone, sur = null, proprio = null, face = "recto", marques = {}, id: idImpose }) {
    const id = idImpose || "c" + etat.prochainId++;

    etat.composants[id] = {
        id,
        ref: ref ? { type: ref.type, id: ref.id } : null,
        jeton: ref ? "" : String(jeton || "jeton"),
        zone,
        sur,
        proprio,
        face,
        marques: { ...marques },
        ordre: etat.prochainOrdre++,
    };

    return etat.composants[id];
}

// Composants d'une zone (hors composants portés), du plus ancien au plus récent
export function composantsDeZone(etat, zone) {
    return Object.values(etat.composants)
        .filter(c => c.zone === zone && !c.sur)
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
}

// Composants portés directement par un autre
export function portes(etat, id) {
    return Object.values(etat.composants).filter(c => c.sur === id);
}

// Tous les composants portés, à tous les niveaux
function descendants(etat, id) {
    const resultat = [];
    const pile = [id];

    while (pile.length) {
        for (const c of portes(etat, pile.pop())) {
            resultat.push(c);
            pile.push(c.id);
        }
    }

    return resultat;
}

// ============================================================
// VISIBILITÉ
// ============================================================

// Joueur propriétaire d'un plateau de vote, ou null si la zone n'en est pas un
export function joueurDeVote(zone) {
    const m = /^joueur:(\d+):vote:/.exec(zone);
    return m ? Number(m[1]) : null;
}

// Joueur propriétaire d'une zone secrète (joueur:<u>:secret:<nom>), ou null.
// Comme un plateau de vote caché : les autres n'en reçoivent rien du tout.
export function joueurDeSecret(zone) {
    const m = /^joueur:(\d+):secret:/.exec(zone);
    return m ? Number(m[1]) : null;
}

// Propriétaire d'une zone dont les autres joueurs ne reçoivent rien — zone
// secrète, ou plateau de vote que son joueur n'a pas révélé (compteur
// joueur:<u>:voteRevele) — ou null si la zone n'est pas de cette sorte.
export function zoneInvisible(zone, etat) {

    const secret = joueurDeSecret(zone || "");

    if (secret !== null) {
        return secret;
    }

    const votant = joueurDeVote(zone || "");

    return votant !== null && !etat?.compteurs?.[`joueur:${votant}:voteRevele`]
        ? votant
        : null;
}

// Qui voit le contenu d'un composant : "tous", un id de joueur, ou null (personne)
export function quiVoit(c, etat) {

    if (estPioche(c.zone)) {
        return null;
    }

    const joueur = joueurDeMain(c.zone);

    if (joueur !== null) {
        return joueur;
    }

    // Plateau de vote non révélé, zone secrète : visible de son joueur seul
    const invisible = zoneInvisible(c.zone, etat);

    if (invisible !== null) {
        return invisible;
    }

    if (c.face === "cache") {
        return c.proprio ?? null;
    }

    return "tous";
}

export function voit(c, userId, etat) {
    const v = quiVoit(c, etat);
    return v === "tous" || (v !== null && v === userId);
}

// Ce qu'un joueur a le droit de recevoir : les composants qu'il ne voit pas
// sont remplacés par des composants anonymes (zone et dos seulement), avec
// un identifiant qui ne permet pas de les suivre d'une zone à l'autre.
//
// versoDe (facultatif, fourni par le serveur) : c -> champs du contenu dont
// dépend son verso, visibles de tous sur une carte face cachée (icône rouge
// d'un événement majeur). Pas dans une pioche : on n'y sait pas laquelle est
// dessus, et ce serait dire le contenu de la pioche carte par carte.
export function filtrerEtat(etat, userId, versoDe) {

    const composants = {};
    const caches = [];

    for (const c of Object.values(etat.composants)) {
        if (voit(c, userId, etat)) {
            composants[c.id] = { ...c };
        } else if (joueurDeVote(c.zone) === null && joueurDeSecret(c.zone) === null) {
            caches.push(c);
        }

        // Plateau de vote caché, zone secrète : les autres n'en reçoivent
        // rien du tout, pas même le nombre d'éléments posés.
    }

    const dos = dosDe;

    caches.sort((a, b) =>
        a.zone.localeCompare(b.zone) || dos(a).localeCompare(dos(b))
    );

    const alias = {};
    caches.forEach((c, k) => { alias[c.id] = "x" + k; });

    // Dessus de chaque pile cachée (pioche, zone libre cachée) : marqué
    // `dessus`, pour en montrer le dos (une pile peut mêler plusieurs dos)
    const dessus = new Map();

    for (const c of caches) {
        if (estPile(c.zone) && !c.sur && (!dessus.has(c.zone) || (c.ordre || 0) > (dessus.get(c.zone).ordre || 0))) {
            dessus.set(c.zone, c);
        }
    }

    for (const c of caches) {
        const verso = versoDe && !estPioche(c.zone) ? versoDe(c) : null;

        composants[alias[c.id]] = {
            id: alias[c.id],
            zone: c.zone,
            sur: c.sur ? (alias[c.sur] || c.sur) : null,
            proprio: c.proprio,
            cache: true,
            dos: dos(c),
            ...(verso ? { verso } : {}),
            ...(dessus.get(c.zone) === c ? { dessus: true } : {}),
        };
    }

    for (const c of Object.values(composants)) {
        if (!c.cache && c.sur && alias[c.sur]) {
            c.sur = alias[c.sur];
        }
    }

    // prochainId / prochainOrdre restent au serveur : leur écart trahirait
    // le nombre de poses faites dans une zone invisible
    const visible = { ...etat, composants };

    delete visible.prochainId;
    delete visible.prochainOrdre;

    // Choix scellés : chacun ne reçoit que le sien
    visible.secrets = etat.secrets && userId !== null && userId !== undefined && Object.hasOwn(etat.secrets, userId)
        ? { [userId]: etat.secrets[userId] }
        : {};

    return visible;
}

// ============================================================
// ACTIONS
//
// appliquer(etat, action, ctx) modifie `etat` et retourne
//   { ok: true, composants: [ids], resultats? }  ou  { ok: false, erreur }
//
// ctx = { auteur: id utilisateur, alea: () => nombre dans [0, 1) }
// `alea` n'existe que sur le serveur.
// ============================================================

const refus = erreur => ({ ok: false, erreur });

function entier(valeur, min, max, defaut) {
    const n = Number(valeur);

    if (!Number.isInteger(n)) {
        return defaut;
    }

    return Math.min(max, Math.max(min, n));
}

// Composant manipulable par l'auteur, ou message d'erreur
function manipulable(etat, id, ctx) {
    const c = typeof id === "string" && Object.hasOwn(etat.composants, id)
        ? etat.composants[id]
        : null;

    if (!c) {
        return "composant introuvable";
    }

    if (c.cache || !voit(c, ctx.auteur, etat)) {
        return "composant non visible";
    }

    return c;
}

function poser(etat, c, zone, sur) {
    c.zone = zone;
    c.sur = sur;
    c.ordre = etat.prochainOrdre++;

    for (const d of descendants(etat, c.id)) {
        d.zone = zone;
    }
}

function melanger(etat, liste, alea) {
    const ordre = [...liste];

    for (let i = ordre.length - 1; i > 0; i--) {
        const j = Math.floor(alea() * (i + 1));
        [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    }

    for (const c of ordre) {
        c.ordre = etat.prochainOrdre++;
    }
}

// Avance le marqueur d'un joueur sur la piste des points (même règle que
// actionsPiste de miseEnPlace.js : au-delà de la dernière case, un marqueur
// y reste et le score repart de 0).
const DERNIERE_CASE = 25;

function avancerPoints(etat, userId, n) {

    if (!(n > 0)) {
        return;
    }

    const miens = Object.values(etat.composants).filter(m =>
        !m.ref && m.jeton === "marqueur" && m.proprio === userId && /^general:points:\d+$/.test(m.zone));

    const caseDe = m => Number(m.zone.split(":")[2]);
    const marqueur = miens.find(m => caseDe(m) < DERNIERE_CASE) || miens[0];

    if (!marqueur) {
        ajouter(etat, { jeton: "marqueur", zone: `general:points:${Math.min(n, DERNIERE_CASE)}`, proprio: userId });
        return;
    }

    const total = caseDe(marqueur) + n;

    if (total > DERNIERE_CASE) {
        ajouter(etat, { jeton: "marqueur", zone: `general:points:${DERNIERE_CASE}`, proprio: userId });
    }

    poser(etat, marqueur, `general:points:${total > DERNIERE_CASE ? total - DERNIERE_CASE : total}`, null);
}

export function appliquer(etat, action, ctx = {}) {

    if (!action || typeof action !== "object") {
        return refus("action invalide");
    }

    if (ACTIONS_SERVEUR.includes(action.type) && typeof ctx.alea !== "function") {
        return refus("action réservée au serveur");
    }

    switch (action.type) {

        // ----------------------------------------------------
        case "deplacer": {
            const c = manipulable(etat, action.c, ctx);

            if (typeof c === "string") {
                return refus(c);
            }

            // de : zone où l'auteur croit le composant. S'il n'y est plus (un
            // autre joueur vient de le prendre), l'action est refusée.
            if (action.de !== undefined && action.de !== c.zone) {
                return refus("la situation a changé");
            }

            let zone = action.vers;
            let sur = null;

            if (action.sur) {
                // Le porteur doit être visible de l'auteur : sinon poser un
                // pion « sur » un composant caché dirait où il se trouve
                const porteur = manipulable(etat, action.sur, ctx);

                if (typeof porteur === "string") {
                    return refus("porteur introuvable");
                }

                if (porteur.id === c.id || descendants(etat, c.id).some(d => d.id === porteur.id)) {
                    return refus("un composant ne peut pas se porter lui-même");
                }

                zone = porteur.zone;
                sur = porteur.id;
            }

            if (!zoneValide(zone)) {
                return refus("zone invalide");
            }

            // proprio : l'auteur prend le composant à son compte (achat d'une
            // unité mercenaire). On ne le donne pas à un autre joueur.
            if (action.proprio !== undefined) {
                if (action.proprio !== ctx.auteur) {
                    return refus("propriétaire invalide");
                }

                c.proprio = action.proprio;
            }

            poser(etat, c, zone, sur);

            // dessous : le composant passe sous tous ceux de la zone
            // (carte remise sous une pioche)
            if (action.dessous === true && !sur) {
                const autres = composantsDeZone(etat, zone).filter(x => x.id !== c.id);

                if (autres.length) {
                    c.ordre = Math.min(...autres.map(x => x.ordre || 0)) - 1;
                }
            }

            // avant / apres : le composant se range juste avant ou juste après
            // cet autre composant de la zone d'arrivée (on range sa main, ses
            // éléments actifs, la table)
            const idRepere = action.avant ?? action.apres;

            if (typeof idRepere === "string" && !sur) {
                const autres = composantsDeZone(etat, zone).filter(x => x.id !== c.id);
                const i = autres.findIndex(x => x.id === idRepere);

                if (i >= 0) {
                    const bas = autres[action.avant !== undefined ? i - 1 : i]?.ordre;
                    const haut = autres[action.avant !== undefined ? i : i + 1]?.ordre;

                    // (après le dernier : il y est déjà)
                    if (haut !== undefined) {
                        c.ordre = bas === undefined ? haut - 1 : (bas + haut) / 2;
                    }
                }
            }

            return { ok: true, composants: [c.id] };
        }

        // ----------------------------------------------------
        // Dessus d'une pioche, ou carte au hasard dans une main
        case "piocher": {
            if (!zoneValide(action.de) || !zoneValide(action.vers)) {
                return refus("zone invalide");
            }

            const pioche = estPile(action.de);

            if (!pioche && joueurDeMain(action.de) === null) {
                return refus("on ne pioche que dans une pioche ou une main");
            }

            const disponibles = composantsDeZone(etat, action.de);

            if (!disponibles.length) {
                return refus("zone vide");
            }

            const n = Math.min(entier(action.n, 1, 50, 1), disponibles.length);
            const pris = [];

            // remplacements : { "<jeton>": { pioche, garder } }. Un jeton tiré
            // fait venir la carte du dessus de cette pioche. Avec garder, le
            // jeton est posé sur la carte ; sinon la carte le remplace.
            const regles = {};

            for (const [jeton, r] of Object.entries(action.remplacements || {}).slice(0, 10)) {
                if (r && zoneValide(r.pioche) && estPioche(r.pioche)) {
                    regles[jeton] = { pioche: r.pioche, garder: r.garder === true };
                }
            }

            for (let i = 0; i < n; i++) {
                const k = pioche
                    ? disponibles.length - 1
                    : Math.floor(ctx.alea() * disponibles.length);

                const [c] = disponibles.splice(k, 1);

                const regle = c.ref ? null : regles[c.jeton];
                const carte = regle ? composantsDeZone(etat, regle.pioche).at(-1) : null;

                if (!carte) {
                    poser(etat, c, action.vers, null);
                    pris.push(c.id);
                    continue;
                }

                poser(etat, carte, action.vers, null);
                pris.push(carte.id);

                if (regle.garder) {
                    poser(etat, c, action.vers, carte.id);
                    pris.push(c.id);
                } else {
                    poser(etat, c, "horsJeu", null);
                }
            }

            return { ok: true, composants: pris };
        }

        // ----------------------------------------------------
        // Verse les n cartes du dessus d'une pile (pioche, zone libre) dans
        // une zone, toutes si n est absent, en gardant leur ordre : posées
        // sur le dessus, ou sous tout le reste avec dessous. Comme piocher,
        // les cartes n'ont pas à être visibles de l'auteur.
        case "verser": {
            if (!zoneValide(action.de) || !zoneValide(action.vers) || action.de === action.vers) {
                return refus("zone invalide");
            }

            if (!estPile(action.de)) {
                return refus("on ne verse qu'une pioche ou la zone libre");
            }

            const tas = composantsDeZone(etat, action.de);

            if (!tas.length) {
                return refus("zone vide");
            }

            const versees = action.n === undefined
                ? tas
                : tas.slice(-Math.min(entier(action.n, 1, tas.length, 1), tas.length));

            const restants = composantsDeZone(etat, action.vers);

            for (const c of versees) {
                poser(etat, c, action.vers, null);
            }

            // dessous : la pile versée passe sous les composants déjà là, dans
            // son ordre (sa carte du bas devient la carte du bas)
            if (action.dessous === true && restants.length) {
                const bas = Math.min(...restants.map(x => x.ordre || 0));

                versees.forEach((c, i) => {
                    c.ordre = bas - versees.length + i;
                });
            }

            return { ok: true, composants: versees.map(c => c.id) };
        }

        // ----------------------------------------------------
        case "melanger": {
            if (!zoneValide(action.zone)) {
                return refus("zone invalide");
            }

            melanger(etat, composantsDeZone(etat, action.zone), ctx.alea);

            return { ok: true, composants: [] };
        }

        // ----------------------------------------------------
        // Retourne face visible les composants posés face cachée dans une
        // zone publique (carte du déroulé). Le client ne connaît pas leur
        // contenu : seul le serveur peut le faire.
        case "reveler": {
            if (!zoneValide(action.zone) || estPioche(action.zone) || joueurDeMain(action.zone) !== null) {
                return refus("zone invalide");
            }

            const caches = composantsDeZone(etat, action.zone).filter(c => c.face === "cache");

            if (!caches.length) {
                return refus("rien à révéler");
            }

            for (const c of caches) {
                c.face = "recto";
            }

            return { ok: true, composants: caches.map(c => c.id) };
        }

        // ----------------------------------------------------
        // Regarde pour soi seul les cartes posées face cachée dans une zone
        // publique. Rien ne change ; le coup est noté au journal, où seul
        // l'auteur voit le contenu des cartes.
        case "consulter": {
            if (!zoneValide(action.zone) || estPioche(action.zone) || joueurDeMain(action.zone) !== null) {
                return refus("zone invalide");
            }

            const caches = composantsDeZone(etat, action.zone).filter(c => c.face === "cache");

            if (!caches.length) {
                return refus("rien à consulter");
            }

            return { ok: true, composants: caches.map(c => c.id) };
        }

        // ----------------------------------------------------
        case "des": {
            const n = entier(action.n, 1, 30, 1);
            const faces = entier(action.faces, 2, 100, 10);
            const resultats = [];

            // c + marque : le jet est celui d'un composant (les attaques d'un
            // vaisseau au combat). Le résultat est gardé dans cette marque,
            // « 7,3 », et reste visible de tous.
            let lanceur = null;

            if (action.c !== undefined) {
                lanceur = manipulable(etat, action.c, ctx);

                if (typeof lanceur === "string") {
                    return refus(lanceur);
                }

                if (typeof action.marque !== "string" || !/^\w{1,30}$/.test(action.marque)) {
                    return refus("marque invalide");
                }
            }

            for (let i = 0; i < n; i++) {
                resultats.push(1 + Math.floor(ctx.alea() * faces));
            }

            if (lanceur) {
                lanceur.marques[action.marque] = resultats.join(",");
            }

            return { ok: true, composants: lanceur ? [lanceur.id] : [], resultats };
        }

        // ----------------------------------------------------
        case "compteur": {
            if (typeof action.id !== "string" || !/^[\w:-]{1,80}$/.test(action.id)) {
                return refus("compteur invalide");
            }

            if (!Object.hasOwn(etat.compteurs, action.id) &&
                Object.keys(etat.compteurs).length >= MAX_COMPTEURS) {
                return refus("trop de compteurs");
            }

            const actuel = Number(etat.compteurs[action.id]) || 0;

            // si : valeur que l'auteur croit en place. Si elle a changé (un
            // autre joueur a cliqué le même bouton), l'action est refusée.
            if (action.si !== undefined && Number(action.si) !== actuel) {
                return refus("la situation a changé");
            }

            const valeur = action.valeur !== undefined
                ? Number(action.valeur)
                : actuel + Number(action.delta);

            if (!Number.isFinite(valeur)) {
                return refus("valeur invalide");
            }

            // Chacun se déclare lui-même prêt (vote) ou validé (faveurs), et
            // un plateau de vote n'est révélé par un autre joueur que si le
            // sien s'est dit prêt : sinon n'importe qui lirait un vote caché.
            const reserve = /^joueur:(\d+):(votePret|voteRevele|faveursValide)$/.exec(action.id);

            if (reserve && valeur && Number(reserve[1]) !== ctx.auteur &&
                (reserve[2] !== "voteRevele" || !etat.compteurs[`joueur:${reserve[1]}:votePret`])) {
                return refus("réservé au joueur concerné");
            }

            etat.compteurs[action.id] = valeur;

            return { ok: true, composants: [] };
        }

        // ----------------------------------------------------
        case "retourner": {
            const c = manipulable(etat, action.c, ctx);

            if (typeof c === "string") {
                return refus(c);
            }

            if (!FACES.includes(action.face)) {
                return refus("face invalide");
            }

            // Une carte sans propriétaire qu'on cache revient à celui qui la
            // cache : lui seul la voit (sinon plus personne ne la verrait).
            // Une unité neutre reste neutre.
            if (action.face === "cache" && (c.proprio === null || c.proprio === undefined) &&
                c.ref && c.ref.type !== "unit" && Number.isInteger(ctx.auteur)) {
                c.proprio = ctx.auteur;
            }

            c.face = action.face;

            return { ok: true, composants: [c.id] };
        }

        // ----------------------------------------------------
        case "marquer": {
            const c = manipulable(etat, action.c, ctx);

            if (typeof c === "string") {
                return refus(c);
            }

            if (typeof action.marque !== "string" || !/^\w{1,30}$/.test(action.marque)) {
                return refus("marque invalide");
            }

            // si : valeur actuelle de la marque selon l'auteur (0 si absente)
            if (action.si !== undefined && String(c.marques[action.marque] ?? 0) !== String(action.si ?? 0)) {
                return refus("la situation a changé");
            }

            const valeur = action.valeur;

            if (valeur === null || valeur === undefined || valeur === 0 || valeur === false) {
                delete c.marques[action.marque];
            } else if (valeurMarque(valeur)) {
                c.marques[action.marque] = valeur;
            } else {
                return refus("valeur invalide");
            }

            return { ok: true, composants: [c.id] };
        }

        // ----------------------------------------------------
        case "creer": {
            let zone = action.zone;
            let sur = null;

            if (action.sur) {
                const porteur = manipulable(etat, action.sur, ctx);

                if (typeof porteur === "string") {
                    return refus("porteur introuvable");
                }

                zone = porteur.zone;
                sur = porteur.id;
            }

            if (!zoneValide(zone)) {
                return refus("zone invalide");
            }

            const ref = action.ref;

            if (ref && (typeof ref !== "object" || !typeValide(ref.type) ||
                !Number.isInteger(ref.id) || ref.id < 1 || ref.id > 1e9)) {
                return refus("élément invalide");
            }

            const marques = marquesValides(action.marques);

            if (!marques) {
                return refus("marques invalides");
            }

            if (!ref && (typeof action.jeton !== "string" || !action.jeton.trim() || action.jeton.length > 40)) {
                return refus("jeton invalide");
            }

            // Côté client (action en attente), le composant reçoit l'identifiant
            // provisoire idLocal ("t3"). Le serveur lui donne son vrai
            // identifiant et l'applique aux actions suivantes du même coup.
            const local = typeof ctx.alea !== "function";

            if (local && (!/^t\d+$/.test(String(action.idLocal)) || etat.composants[action.idLocal])) {
                return refus("création locale invalide");
            }

            const n = local ? 1 : entier(action.n, 1, 50, 1);
            const crees = [];

            if (Object.keys(etat.composants).length + n > MAX_COMPOSANTS) {
                return refus("trop de composants");
            }

            for (let i = 0; i < n; i++) {
                crees.push(ajouter(etat, {
                    id: local ? action.idLocal : undefined,
                    ref,
                    jeton: action.jeton,
                    zone,
                    sur,
                    proprio: Number.isInteger(action.proprio) ? action.proprio : null,
                    marques,
                }).id);
            }

            return { ok: true, composants: crees };
        }

        // ----------------------------------------------------
        // Choix scellé des faveurs à dépenser. Les faveurs ne bougent pas :
        // leur liste est gardée dans etat.secrets, que seul le joueur reçoit,
        // et le compteur joueur:<u>:faveursValide passe à 1. Les autres ne
        // savent donc ni combien ni lesquelles. annuler : revenir sur son choix.
        case "engager": {
            const u = ctx.auteur;

            if (!Number.isInteger(u)) {
                return refus("joueur inconnu");
            }

            etat.secrets = etat.secrets || {};

            if (action.annuler === true) {
                delete etat.secrets[u];
                etat.compteurs[`joueur:${u}:faveursValide`] = 0;

                return { ok: true, composants: [] };
            }

            if (!Array.isArray(action.faveurs) || action.faveurs.length > 30) {
                return refus("choix invalide");
            }

            const ids = [...new Set(action.faveurs)];

            for (const id of ids) {
                const f = typeof id === "string" && Object.hasOwn(etat.composants, id) ? etat.composants[id] : null;

                if (!f || f.ref || f.jeton !== "faveur" || f.sur || f.zone !== `joueur:${u}:faveurs`) {
                    return refus("faveur invalide");
                }
            }

            etat.secrets[u] = { faveurs: ids };
            etat.compteurs[`joueur:${u}:faveursValide`] = 1;

            return { ok: true, composants: [] };
        }

        // ----------------------------------------------------
        // Encaissement des faveurs (phase d'événement). Chaque joueur a choisi
        // en secret les faveurs qu'il dépense (action « engager ») et a
        // validé (compteur joueur:<u>:faveursValide). Le serveur, seul à
        // tout voir, compte : 1 point par faveur dépensée (une par faction
        // au plus), et 2 points de plus à celui qui en dépense le plus
        // (1 chacun en cas d'égalité). Les marqueurs avancent sur la piste
        // des points, les faveurs dépensées sortent du jeu.
        case "encaisser": {
            const joueurs = Object.keys(etat.compteurs)
                .map(id => /^joueur:(\d+):faveursValide$/.exec(id))
                .filter(m => m && etat.compteurs[m[0]])
                .map(m => Number(m[1]));

            if (!joueurs.length) {
                return refus("personne n'a validé");
            }

            // Tous les joueurs de la partie (ctx.joueurs, donné par le
            // serveur) doivent avoir validé : un seul ne peut pas encaisser
            if (Array.isArray(ctx.joueurs) && ctx.joueurs.some(u => !joueurs.includes(u))) {
                return refus("tous les joueurs n'ont pas validé");
            }

            const resultats = [];
            const depensees = [];

            for (const u of joueurs) {
                const factions = new Set();
                let n = 0;

                // Faveurs choisies : celles du choix scellé encore en sa possession
                // (et, pour une partie d'avant le choix scellé, sa zone secrète)
                const choisies = (etat.secrets?.[u]?.faveurs || [])
                    .map(id => (Object.hasOwn(etat.composants, id) ? etat.composants[id] : null))
                    .filter(f => f && !f.sur && f.zone === `joueur:${u}:faveurs`);

                for (const f of [...choisies, ...composantsDeZone(etat, `joueur:${u}:secret:faveurs`)]) {

                    // Émetteur : le joueur, ou la faction neutre (marques.neutre)
                    // d'une faveur obtenue d'une faction neutre
                    const emetteur = f.proprio ?? (f.marques?.neutre ? "neutre:" + f.marques.neutre : null);

                    // Une seule faveur par faction : les autres reviennent
                    if (f.ref || f.jeton !== "faveur" || factions.has(emetteur)) {
                        if (f.zone !== `joueur:${u}:faveurs`) {
                            poser(etat, f, `joueur:${u}:faveurs`, null);
                        }

                        continue;
                    }

                    factions.add(emetteur);
                    depensees.push(f);
                    n++;
                }

                resultats.push({ joueur: u, faveurs: n, points: n });
            }

            const max = Math.max(...resultats.map(r => r.faveurs));
            const premiers = resultats.filter(r => r.faveurs === max);

            if (max > 0) {
                for (const r of premiers) {
                    r.points += premiers.length === 1 ? 2 : 1;
                }
            }

            for (const r of resultats) {
                avancerPoints(etat, r.joueur, r.points);
            }

            for (const f of depensees) {
                poser(etat, f, "horsJeu", null);
            }

            for (const u of joueurs) {
                delete etat.compteurs[`joueur:${u}:faveursValide`];

                if (etat.secrets) {
                    delete etat.secrets[u];
                }
            }

            // Nombre d'encaissements faits ce tour
            const fait = "faveurs:" + etat.tour;
            etat.compteurs[fait] = (Number(etat.compteurs[fait]) || 0) + 1;

            return { ok: true, composants: [], resultats };
        }

        // ----------------------------------------------------
        // Carte donnée par une transaction (ligne « carte ») : le serveur,
        // seul à voir toutes les mains, cherche la carte chez celui qui la
        // donne, d'abord dans sa main, puis en jeu (ses zones, ou une carte
        // dont il est le propriétaire). De sa main, elle va dans la main du
        // receveur ; d'ailleurs, dans ses éléments actifs. Introuvable :
        // l'action est refusée, et avec elle tout le coup (la transaction
        // n'est pas appliquée, aucun diplomate n'est utilisé).
        //
        // Réservée à une faction de la transaction, quand l'autre l'a validée.
        case "donnerCarte": {
            const ligne = typeof action.ligne === "string" && Object.hasOwn(etat.composants, action.ligne)
                ? etat.composants[action.ligne]
                : null;

            const m = ligne?.marques;

            if (!ligne || ligne.ref || ligne.jeton !== "ligne de transaction" ||
                ligne.zone !== "general:transactions" || m?.sorte !== "carte") {
                return refus("ligne de transaction introuvable");
            }

            const entete = Object.values(etat.composants).find(c =>
                !c.ref && c.jeton === "transaction" && c.zone === "general:transactions" &&
                c.marques?.tx === m.tx);

            if (!entete) {
                return refus("transaction introuvable");
            }

            const f1 = Number(entete.marques.f1);
            const f2 = Number(entete.marques.f2);

            if (ctx.auteur !== f1 && ctx.auteur !== f2) {
                return refus("réservé aux factions de la transaction");
            }

            if (!(ctx.auteur === f1 ? entete.marques.ok2 : entete.marques.ok1)) {
                return refus("l'autre faction n'a pas validé la transaction");
            }

            const de = Number(m.de);
            const a = Number(m.a);

            if (![f1, f2].includes(de) || ![f1, f2].includes(a) || de === a) {
                return refus("ligne de transaction invalide");
            }

            const memeCarte = c => c.ref && c.ref.type === m.carteType && c.ref.id === Number(m.carteId);
            const main = `joueur:${de}:main`;

            const enJeu = c =>
                (c.zone.startsWith(`joueur:${de}:`) && !/:(main|choix)$/.test(c.zone)) ||
                (c.proprio === de && !/^(pioche:|defausse:|horsJeu$|joueur:)/.test(c.zone));

            const cartes = Object.values(etat.composants).filter(memeCarte);
            const c = cartes.find(x => x.zone === main) || cartes.find(enJeu);

            if (!c) {
                return refus(ERREUR_CARTE_ABSENTE);
            }

            const depuisMain = c.zone === main;

            if (c.proprio !== null && c.proprio !== undefined) {
                c.proprio = a;
            }

            poser(etat, c, depuisMain ? `joueur:${a}:main` : `joueur:${a}:actif`, null);

            return { ok: true, composants: [c.id] };
        }

        // ----------------------------------------------------
        case "supprimer": {
            const c = manipulable(etat, action.c, ctx);

            if (typeof c === "string") {
                return refus(c);
            }

            poser(etat, c, "horsJeu", null);

            return { ok: true, composants: [c.id] };
        }

        // ----------------------------------------------------
        // Le composant devient un autre élément du jeu, sans changer de place
        // (un agent de base recruté devient celui de la faction qui le recrute)
        case "remplacer": {
            const c = manipulable(etat, action.c, ctx);

            if (typeof c === "string") {
                return refus(c);
            }

            const ref = action.ref;

            if (!c.ref || !ref || typeof ref !== "object" || !typeValide(ref.type) ||
                !Number.isInteger(ref.id) || ref.id < 1 || ref.id > 1e9) {
                return refus("élément invalide");
            }

            c.ref = { type: ref.type, id: ref.id };

            return { ok: true, composants: [c.id] };
        }

        // ----------------------------------------------------
        // Remet à zéro le vote du tour, pour tous les joueurs : sur chaque
        // plateau de vote (même caché : seul le serveur les connaît tous),
        // les agents des carrés de droite (zone « ...:d », utilisés) vont dans
        // les agents usés de leur joueur, le reste est retiré du jeu ; les
        // plateaux sont cachés, plus personne n'est « prêt », et les
        // ajustements manuels et départages du tour sont effacés.
        case "reinitialiserVotes": {
            const deplaces = [];

            for (const c of Object.values(etat.composants)) {

                const m = /^joueur:(\d+):vote:\d+:\d+(:d)?$/.exec(c.zone);

                if (!m || c.sur) {
                    continue;
                }

                poser(etat, c, m[2] && c.ref?.type === "agent" ? `joueur:${m[1]}:agentsUses` : "horsJeu", null);
                deplaces.push(c.id);
            }

            for (const id of Object.keys(etat.compteurs)) {
                if (/^joueur:\d+:(voteRevele|votePret)$/.test(id) || id.startsWith(`vote:${etat.tour}:`)) {
                    delete etat.compteurs[id];
                }
            }

            return { ok: true, composants: deplaces };
        }

        // ----------------------------------------------------
        case "partie": {
            if (action.tour !== undefined) {
                etat.tour = entier(action.tour, 0, 99, etat.tour);
            }

            if (action.phase !== undefined) {
                etat.phase = String(action.phase).slice(0, 100);
            }

            if (action.joueurActif !== undefined) {
                etat.joueurActif = Number.isInteger(action.joueurActif) ? action.joueurActif : null;
            }

            if (action.anneaux !== undefined) {
                etat.anneaux = entier(action.anneaux, 0, 12, etat.anneaux);
            }

            return { ok: true, composants: [] };
        }

        default:
            return refus("action inconnue");
    }
}
