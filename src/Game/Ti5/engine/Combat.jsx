import { useEffect, useRef, useState } from "react";
import {
    useEngine, nomElement, nomCase, distanceCases, DORE, confirmerRegle, BoutonRegle, agentDisponible, carteUsee, actionsUserCarte,
} from "./Interaction";
import { useElement, useElements, contenuEnCache } from "./sync";
import { resistanceDe, victimesBombe } from "./effets";
import { CombatResolu } from "./CombatResolu";
import { Sauvetage } from "./Sauvetage";
import { MARQUEUR, ACTIVATION, actionsPiste, typeUnite } from "./miseEnPlace";
import { lirePillage, auteurDesDegats } from "./effets";
import { noter } from "./recherche";
import { Blocages } from "./Blocage";
import { Controles } from "./Controle";

// ============================================================
// ONGLET CONFLIT : les combats, et les blocages de déplacement
// (Blocage.jsx) au-dessus
//
// Plusieurs combats peuvent être en cours : le compteur
// combat:<i> vaut 1 pour chaque système (case i) où l'on se bat,
// et toute la table les voit, chacun dans un sous-onglet.
//
// Les vaisseaux (unités à mot-clé « ship ») de l'espace du
// système sont rangés par faction, militaires puis non
// militaires. Chaque vaisseau militaire a une liste ordonnée
// d'engagements, gardée dans sa marque « engage » :
//
//   @c12   le vaisseau c12 (cible spécifique : -2 pour toucher)
//   j3     les militaires du joueur 3
//   J3     ses non-militaires (seulement après ses militaires)
//   n, N   les neutres, militaires puis non-militaires
//
// Les dés d'un vaisseau sont lancés par le serveur et gardés
// dans sa marque « des » (« 7,3 »). desF liste les dés dont on
// a inversé le résultat (Ctrl + clic), desA ceux dont le dégât
// a été attribué (glissé sur un vaisseau).
//
// L'engine ne juge pas les règles : il lance, affiche, et laisse
// les joueurs répartir les dégâts. Voir doc/combat.md.
// ============================================================

// Lieu d'un combat, i étant la case du système et k une de ses planètes :
//
//   "41"      combat spatial dans l'espace du système
//   "41c"     canons spatiaux sur les vaisseaux du système
//   "41p0"    combat terrestre sur la planète
//   "41p0b"   bombardement de la planète
//   "41p0r"   raid sur la planète (#raid : bombardement spécial qui capture les infanteries)
//
// Compteurs : combat:<lieu> (1 = en cours),
//   combat:<lieu>:etape     0 engagements, 1 frappe en premier lancée, 2 autres attaques
//                           lancées, 3 dernières attaques lancées (Troupe de détournement)
//   combat:<lieu>:pret:<u>  le joueur u est prêt
export const cleCombat = lieu => "combat:" + lieu;

const RE_LIEU = /^(\d+)(?:p(\d+))?([bcr])?$/;

export const SORTES = {
    spatial: "Combat spatial",
    canons: "Canons spatiaux",
    terrestre: "Combat terrestre",
    bombardement: "Bombardement",
    raid: "Raid",
};

// { numero, planete (ou null), sorte, zone des cibles }
export function lireLieu(lieu) {

    const m = RE_LIEU.exec(String(lieu));

    if (!m) {
        return null;
    }

    const numero = Number(m[1]);
    const planete = m[2] === undefined ? null : Number(m[2]);

    return {
        numero,
        planete,
        sorte: planete === null
            ? (m[3] === "c" ? "canons" : "spatial")
            : (m[3] === "b" ? "bombardement" : (m[3] === "r" ? "raid" : "terrestre")),
        zone: planete === null ? "hex:" + numero : `hex:${numero}:planete:${planete}`,
    };
}

// Lieux des combats encore ouverts (les combats résolus, gardés jusqu'à la fin
// de la phase, n'en font pas partie)
export const combatsActifs = etat => combatsEnCours(etat).filter(lieu => Number(etat.compteurs[cleCombat(lieu)]) === 1);

// Lieux des combats de l'onglet : en cours (compteur à 1) ou résolus (à 2)
export function combatsEnCours(etat) {
    return Object.keys(etat.compteurs)
        .filter(id => id.startsWith("combat:") && etat.compteurs[id])
        .map(id => id.slice(7))
        .filter(lieu => RE_LIEU.test(lieu))
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
}

// Le joueur a-t-il des unités dans ce combat ? (dans le système pour un
// combat spatial ou des canons, sur la planète ou au-dessus pour le reste)
export function aDesUnites(index, lieu, userId) {

    const l = lireLieu(lieu);

    if (!l) {
        return false;
    }

    const zones = ["bombardement", "raid"].includes(l.sorte) ? [l.zone, "hex:" + l.numero] : [l.zone];

    return zones.some(zone => (index.parZone.get(zone) || [])
        .some(c => c.ref?.type === "unit" && (c.marques?.possession ?? c.proprio) === userId));
}

// Capacité d'attaque à distance d'une unité : #bomb(5,2) -> [5, 2]
// Notation à étoiles : « #can 6** » -> [6, 2] (une étoile par dé).
function capacite(u, cle) {

    const texte = u?.habilite || "";
    const m = new RegExp(`#${cle}\\((\\d+)(?:,\\s*(\\d+))?\\)`, "i").exec(texte);

    if (m) {
        return [Number(m[1]), Number(m[2]) || 1];
    }

    const etoiles = new RegExp(`#${cle}\\s*(\\d+)(\\*+)`, "i").exec(texte);

    return etoiles ? [Number(etoiles[1]), etoiles[2].length] : null;
}

// Camp des unités sans propriétaire
const NEUTRE = 0;

const FACES = 10;

const liste = valeur => String(valeur ?? "").split(",").filter(x => x !== "");

// Marques d'un combat sur une unité. Chaque sorte de combat a les siennes
// (engage, engageC, engageT, engageB...) : une unité peut être dans un
// combat spatial et dans un bombardement sans que les deux se mélangent.
const SUFFIXE = { spatial: "", canons: "C", terrestre: "T", bombardement: "B", raid: "R" };

// ajust, ajustN : bonus ou malus manuel à la valeur de combat et au nombre
// d'attaques de l'unité, pour ce combat.
const marquesDe = sorte => Object.fromEntries(
    ["engage", "des", "desF", "desA", "ajust", "ajustN"].map(m => [m, m + SUFFIXE[sorte]]));

const lireIndices = (c, marque) => liste(c.marques?.[marque]).map(Number);

const marquer = (id, marque, valeurs) => ({
    type: "marquer",
    c: id,
    marque,
    valeur: valeurs.length ? valeurs.join(",") : null,
});

const styleBouton = { fontSize: 12, padding: "1px 6px" };

// Les quatre phases d'un combat (voir « prêt au combat », plus bas)
// (5 et 6 : seulement si une unité attaque en dernier, Troupe de détournement)
const PHASES_COMBAT = [
    "Frappe en premier",
    "Dégâts de la frappe en premier",
    "Autres attaques",
    "Dégâts",
    "Dernières attaques",
    "Dégâts des dernières attaques",
];

// Libellés selon la sorte de combat
const NOM_ATTAQUE = { spatial: "att.", terrestre: "att.", bombardement: "bomb.", canons: "canon", raid: "raid" };
const NOM_TIREURS = { spatial: "Tirent", terrestre: "Tirent", bombardement: "Bombardent", canons: "Canons", raid: "Raid" };

// D'où tire une unité à distance : « case 12 », « case 12, planète 1 »
const nomLieu = zone => {
    const m = /^hex:(\d+)(?::planete:(\d+))?$/.exec(zone);
    return m ? nomCase(m[1]) + (m[2] !== undefined ? `, planète ${Number(m[2]) + 1}` : "") : zone;
};

// ============================================================
// L'ONGLET : un sous-onglet par combat en cours
//
// Couleur d'un sous-onglet : rouge si j'ai des unités dans ce
// système, gris sinon.
// ============================================================

export const COULEUR_COMBAT = { avecMoi: "#ffcdd2", sansMoi: "#e0e0e0" };

export function Combat() {

    const { etat, index, moi, combatVu, setCombatVu } = useEngine();

    const combats = combatsEnCours(etat);

    const tuiles = combats.map(lieu =>
        (index.parZone.get("hex:" + lireLieu(lieu).numero) || []).find(c => c.ref?.type === "system"));

    const systemes = useElements(tuiles.filter(Boolean).map(t => t.ref.id));

    if (!combats.length) {
        return (
            <div style={{ padding: 8, color: "#444" }}>
                <Controles />
                <Blocages />
                Aucun combat en cours. Dans l'onglet Espace, ouvrir la fiche d'un système :
                « Combat spatial » ou « Canons spatiaux » pour le système, « Combat terrestre »
                ou « Bombardement » à côté d'une planète.
            </div>
        );
    }

    // Combat résolu : gardé dans l'onglet jusqu'à la fin de la phase
    const resolu = n => Number(etat.compteurs[cleCombat(n)]) === 2;

    // Combat affiché : celui qu'on a choisi, sinon le premier, encore ouvert, où j'ai des unités
    const choisi = combats.includes(combatVu)
        ? combatVu
        : (combats.find(n => !resolu(n) && aDesUnites(index, n, moi)) ?? combats.find(n => !resolu(n)) ?? combats[0]);

    return (
        <div>
            <Controles />
            <Blocages />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {combats.map((n, k) => {
                    const avecMoi = aDesUnites(index, n, moi);
                    const l = lireLieu(n);
                    const nom = (systemes[tuiles[k]?.ref.id]?.name || "système").replace(/^!([^!]*)!/, "");

                    return (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setCombatVu(n)}
                            title={avecMoi ? "Vous avez des unités dans ce combat" : "Vous n'avez pas d'unité dans ce combat"}
                            style={{
                                padding: "5px 12px",
                                borderRadius: 5,
                                fontWeight: choisi === n ? "bold" : "normal",
                                border: choisi === n ? "3px solid #b71c1c" : "1px solid #555",
                                backgroundColor: avecMoi && !resolu(n) ? COULEUR_COMBAT.avecMoi : COULEUR_COMBAT.sansMoi,
                                opacity: resolu(n) ? 0.7 : 1,
                            }}
                        >
                            {resolu(n) ? "✔ résolu : " : ""}
                            {SORTES[l.sorte]} — {nom}, {nomCase(l.numero)}
                            {l.planete !== null ? `, planète ${l.planete + 1}` : ""}
                            {avecMoi ? " ⚔" : ""}
                        </button>
                    );
                })}
            </div>

            <CombatSysteme key={choisi} lieu={choisi} />
        </div>
    );
}

// ============================================================
// UN COMBAT
// ============================================================

function CombatSysteme({ lieu }) {

    const {
        etat, index, jouer, envoyer, joueur, moi, partie, search, nomDe, couleurDe, signaler, aScript, aviser,
        connaissance, capaciteLogistique,
    } = useEngine();

    // zone : celle des cibles (espace du système, ou planète)
    const { numero, planete, sorte, zone } = lireLieu(lieu);

    // Bombardement ou raid (un raid subit les effets qui touchent les bombardements)
    const bombe = sorte === "bombardement" || sorte === "raid";

    // Compteurs de ce combat
    const COMBAT = cleCombat(lieu);
    const ETAPE = COMBAT + ":etape";
    const PRET = COMBAT + ":pret:";

    // Mercenaires de combat : effet en vigueur le temps de ce combat
    // (compteur combat:<lieu>:merc<id>:<camp>) ; vaisseaux perdus par un camp
    // (combat:<lieu>:perdus:<camp>, pour Henry Storcher)
    const MERC = id => `${COMBAT}:merc${id}:`;
    const PERDUS = COMBAT + ":perdus:";
    const estVaisseau = v => (v.u.mot_cle || []).includes("ship");

    const tuile = (index.parZone.get("hex:" + numero) || []).find(c => c.ref?.type === "system");
    const systeme = useElement(tuile ? tuile.ref.id : -1);
    const laPlanete = useElement(planete === null ? -1 : (systeme?.elems?.[planete]?.id ?? -1));

    // --------------------------------------------------------
    // UNITÉS DU COMBAT
    //
    //   spatial       les vaisseaux de l'espace du système ; les
    //                 militaires tirent
    //   terrestre     les unités de la planète ; les militaires tirent
    //   bombardement  tirent : les unités de l'espace du système qui ont
    //                 #bomb(a,n) ; cibles : les unités de la planète
    //   canons        tirent : les unités qui ont #can(a,n), dans le
    //                 système ou un système voisin (portée 1), planètes
    //                 comprises ; cibles : les vaisseaux du système
    // --------------------------------------------------------

    const unitesDe = z => (index.parZone.get(z) || []).filter(c => c.ref?.type === "unit");

    const aDistance = [];

    if (bombe) {
        aDistance.push(...unitesDe("hex:" + numero));
    }

    // Mech aérien : depuis une planète du système, il attaque au combat spatial
    if (sorte === "spatial" && aScript(moi, "mech-aerien")) {
        for (const z of index.parZone.keys()) {
            if (z.startsWith(`hex:${numero}:planete:`)) {
                aDistance.push(...unitesDe(z).filter(c => c.ref.id === 171));
            }
        }
    }

    if (sorte === "canons") {
        for (const z of index.parZone.keys()) {
            const m = /^hex:(\d+)(:planete:\d+)?$/.exec(z);

            // (jusqu'à 3 cases : la portée de chaque canon est vérifiée plus bas)
            if (m && distanceCases(numero, Number(m[1])) <= 3) {
                aDistance.push(...unitesDe(z));
            }
        }
    }

    const unites = [...new Map([...unitesDe(zone), ...aDistance].map(c => [c.id, c])).values()];
    const contenus = useElements(unites.map(c => c.ref.id));

    // Armageddon (#850) détruit : son destructeur prend le contrôle d'un Armageddon (#490)
    const armageddon = useElement(unites.some(c => c.ref.id === 850) ? 490 : -1);

    // Fiches des factions des joueurs : une unité qui n'est pas sur la fiche
    // de son joueur (mercenaire, relique, spéciale) a un liseré doré
    const fiches = useElements(partie.joueurs.map(j => j.faction));

    const horsFiche = v => {
        const fiche = fiches[partie.joueurs.find(j => j.userId === v.camp)?.faction];
        return !!fiche?.units && !fiche.units.some(lien => lien?.id === v.c.ref.id);
    };

    // Noms des marques de ce combat, et leur lecture
    const M = marquesDe(sorte);
    const lireEngagement = c => liste(c.marques?.[M.engage]);
    const lireDes = c => liste(c.marques?.[M.des]).map(Number);

    // Mes unités cochées, pour leur ajouter un engagement
    const [selection, setSelection] = useState([]);

    const campDe = c => c.marques?.possession ?? c.proprio ?? NEUTRE;
    const nomCamp = camp => (camp === NEUTRE ? "Neutres" : nomDe(camp));

    // Canons spatiaux : distance d'une unité au système, et portée — 1, +1 avec le
    // script Canon longue portée ; une case de plus encore avec Laser longue
    // portée, au prix d'un scientifique. -> "oui", "scientifique" ou null
    const distanceDe = c => distanceCases(numero, Number(/^hex:(\d+)/.exec(c.zone || "")?.[1]));

    const aPortee = c => {
        const camp = campDe(c);
        const portee = 1 + (camp !== NEUTRE && aScript(camp, "canon-longue-portee") ? 1 : 0);
        const d = distanceDe(c);

        return d <= portee ? "oui"
            : (d === portee + 1 && camp !== NEUTRE && aScript(camp, "laser-longue-portee") ? "scientifique" : null);
    };

    // Canon d'une unité : celui de son texte ; script Laser longue portée : le
    // vaisseau amiral en gagne un (6, 3 dés)
    const canonDe = c => capacite(contenus[c.ref.id], "can") ||
        (contenus[c.ref.id]?.type === "fs" && campDe(c) !== NEUTRE && aScript(campDe(c), "laser-longue-portee") ? [6, 3] : null);

    // Mes canons à portée qui n'ont pas encore été choisis pour tirer
    const canonsEnAttente = sorte !== "canons" ? [] : unites.filter(c =>
        contenus[c.ref.id] && campDe(c) !== NEUTRE && !c.marques?.canon && canonDe(c) && aPortee(c));

    // tire : peut attaquer ; cible : peut être engagée ; att, nb : seuil et nombre de dés
    const vaisseaux = unites
        .map(c => {
            const u = contenus[c.ref.id];

            if (!u) {
                return null;
            }

            const mots = u.mot_cle || [];
            const ici = c.zone === zone;
            const militaire = mots.includes("mil");

            let tire, cible, att, nb;

            if (sorte === "spatial" || sorte === "terrestre") {
                cible = ici && (sorte === "terrestre" || mots.includes("ship"));
                // (Mech aérien : il tire depuis sa planète sans être une cible du combat spatial)
                tire = (cible || (sorte === "spatial" && c.ref.id === 171)) && militaire;
                [att, nb] = [u.combat, u.combat_touche];
            } else {
                // Raid (#raid) : bombardement spécial ; Épineux géant : au bombardement de sa
                // planète, il attaque aussi les unités terrestres, avec sa valeur de combat
                const epineux = sorte === "bombardement" && ici && c.ref.id === 466 && aScript(moi, "epineux-geant");
                const tir = epineux ? [u.combat, u.combat_touche]
                    : (sorte === "bombardement" ? capacite(u, "bomb") : (sorte === "raid" ? capacite(u, "raid") : canonDe(c)));

                // Un canon spatial ne tire que s'il a été choisi (marque « canon » : un
                // amiral est usé, un marqueur d'activation posé dessus) ; ceux des
                // neutres tirent d'office, à portée 1
                tire = !!tir && (sorte !== "canons" ||
                    (campDe(c) === NEUTRE ? distanceDe(c) <= 1 : !!c.marques?.canon));
                // (raid : seules les infanteries sont des cibles)
                cible = ici && (sorte === "bombardement" || (sorte === "raid" ? typeUnite(u) === "inf" : mots.includes("ship")));
                [att, nb] = tir || [0, 1];
            }

            return (tire || cible) && {
                c,
                u,
                id: c.id,
                camp: campDe(c),
                militaire,
                tire,
                cible,
                att: Number(att) || 0,
                nb: Math.max(1, Number(nb) || 1),
                nom: nomElement(search, c.ref),
            };
        })
        .filter(Boolean);

    const parId = Object.fromEntries(vaisseaux.map(v => [v.id, v]));

    // Rang d'initiative et points d'un joueur (pour l'ordre des camps et
    // l'engagement des neutres agressifs)
    const rang = u => {
        for (let k = 1; k <= partie.joueurs.length; k++) {
            if ((index.parZone.get("general:initiative:" + k) || [])
                .some(m => m.jeton === MARQUEUR && m.proprio === u)) {
                return k;
            }
        }

        return 99;
    };

    const points = u => {
        let total = 0;

        for (const [z, contenu] of index.parZone) {
            if (z.startsWith("general:points:")) {
                total += Number(z.split(":")[2]) *
                    contenu.filter(m => m.jeton === MARQUEUR && m.proprio === u).length;
            }
        }

        return total;
    };

    const campsJoueurs = partie.joueurs
        .map(j => j.userId)
        .filter(u => vaisseaux.some(v => v.camp === u))
        .sort((a, b) => rang(a) - rang(b));

    const camps = vaisseaux.some(v => v.camp === NEUTRE)
        ? [...campsJoueurs, NEUTRE]
        : campsJoueurs;

    // Unités engageables d'un camp
    const nombre = camp => vaisseaux.filter(v => v.camp === camp && v.cible).length;

    // --------------------------------------------------------
    // ENGAGEMENTS
    // --------------------------------------------------------

    // Neutres : leur engagement est calculé, pas saisi.
    //   agressifs  engagent toujours : factions par nombre d'unités
    //              engageables, puis points, puis initiative ; les
    //              militaires d'abord, puis les non-militaires
    //   défensifs  n'engagent que les factions qui engagent les neutres,
    //              et jamais leurs non-militaires
    function engagementNeutre(v) {

        const mots = v.u.mot_cle || [];
        const aDesVaisseaux = (camp, militaire) =>
            vaisseaux.some(x => x.camp === camp && x.cible && x.militaire === militaire);

        if (mots.includes("agg")) {
            const tri = [...campsJoueurs].sort((a, b) =>
                nombre(b) - nombre(a) || points(b) - points(a) || rang(a) - rang(b));

            return [
                ...tri.filter(u => aDesVaisseaux(u, true)).map(u => "j" + u),
                ...tri.filter(u => aDesVaisseaux(u, false)).map(u => "J" + u),
            ];
        }

        // (un défensif furtif — Rebelle — ne répond qu'à ceux qui le ciblent)
        if (mots.includes("def")) {
            const furtif = (sorte === "spatial" || sorte === "terrestre") && furtifDeNature(v);

            return campsJoueurs
                .filter(u => vaisseaux.some(x => x.camp === u && lireEngagement(x.c).some(e => (furtif
                    ? e === "@" + v.id
                    : e === "n" || e === "N" || (e.startsWith("@") && parId[e.slice(1)]?.camp === NEUTRE)))))
                .map(u => "j" + u);
        }

        return [];
    }

    const engagement = v => (v.camp === NEUTRE ? engagementNeutre(v) : lireEngagement(v.c));

    function libelle(code) {

        if (code.startsWith("@")) {
            const cible = parId[code.slice(1)];
            return cible ? `${cible.nom} (${nomCamp(cible.camp)})` : "cible absente";
        }

        if (code === "n") {
            return "militaires neutres";
        }

        if (code === "N") {
            return "non-militaires neutres";
        }

        return (code[0] === "j" ? "militaires de " : "non-militaires de ") + nomDe(Number(code.slice(1)));
    }

    const codeCamp = (camp, militaire) =>
        (camp === NEUTRE ? (militaire ? "n" : "N") : (militaire ? "j" : "J") + camp);

    // Ajoute un engagement à mes vaisseaux cochés. Les cibles spécifiques
    // passent avant les factions ; les non-militaires d'une faction ne
    // s'engagent qu'après ses militaires.
    function engager(code) {

        const choisis = selection.map(id => parId[id]).filter(v => v && v.camp === moi);

        if (!choisis.length) {
            signaler("Cocher d'abord les unités qui engagent.");
            return;
        }

        const militaires = code === "N" ? "n" : (code[0] === "J" ? "j" + code.slice(1) : null);
        const campVise = code === "N" ? NEUTRE : Number(code.slice(1));

        // Raid : des unités militaires autres que des infanteries défendent la planète — il faut cibler
        if (sorte === "raid" && !code.startsWith("@") && unitesDe(zone).some(c => campDe(c) === campVise &&
            (contenus[c.ref.id]?.mot_cle || []).includes("mil") && typeUnite(contenus[c.ref.id]) !== "inf")) {
            signaler("Raid : des unités militaires autres que des infanteries défendent la planète — il faut cibler les infanteries une à une.");
            return;
        }

        // Une faction sans vaisseau militaire : ses non-militaires s'engagent directement
        const aDesMilitaires = vaisseaux.some(x => x.camp === campVise && x.cible && x.militaire);
        const actions = [];

        for (const v of choisis) {

            const actuel = lireEngagement(v.c);

            if (actuel.includes(code)) {
                continue;
            }

            if (militaires && aDesMilitaires && !actuel.includes(militaires)) {
                signaler(`${v.nom} doit d'abord engager les ${libelle(militaires)}.`);
                return;
            }

            const suivant = code.startsWith("@")
                ? [...actuel.filter(e => e.startsWith("@")), code, ...actuel.filter(e => !e.startsWith("@"))]
                : [...actuel, code];

            actions.push(marquer(v.id, M.engage, suivant));
        }

        jouer(actions);
    }

    // (nom distinct de « retirer », le retrait des unités détruites)
    function retirerEngagement(v, code) {

        // Sans ses militaires, plus d'engagement de ses non-militaires
        const lies = code === "n" ? ["N"] : (code[0] === "j" ? ["J" + code.slice(1)] : []);

        jouer(marquer(v.id, M.engage, lireEngagement(v.c).filter(e => e !== code && !lies.includes(e))));
    }

    // Remonte d'un rang, parmi les engagements de même sorte
    function monter(v, code) {

        const actuel = lireEngagement(v.c);
        const i = actuel.indexOf(code);

        if (i > 0 && actuel[i - 1].startsWith("@") === code.startsWith("@")) {
            [actuel[i - 1], actuel[i]] = [actuel[i], actuel[i - 1]];
            jouer(marquer(v.id, M.engage, actuel));
        }
    }

    // --------------------------------------------------------
    // DÉS
    // --------------------------------------------------------

    // Une valeur de combat de 5 touche sur un dé de 5 ou moins.
    // Ajustements manuels (effets que l'engine ne connaît pas) : ils
    // s'ajoutent à la valeur de combat et au nombre d'attaques.
    const ajust = v => Number(v.c.marques?.[M.ajust]) || 0;
    const ajustN = v => Number(v.c.marques?.[M.ajustN]) || 0;

    const attaque = v => v.att;

    // Nombre d'attaques fixé par une unité (sinon null) : Duha Menaimon au combat spatial
    // (niveau de connaissance génétique), Nekro Acidos au combat terrestre (militaire)
    const attaquesScripts = v => (v.camp === NEUTRE ? null
        : (v.c.ref?.id === 472 && sorte === "spatial" && aScript(v.camp, "duha-menaimon-attaques") ? connaissance(v.camp, "gen")
            : (v.c.ref?.id === 600 && sorte === "terrestre" && aScript(v.camp, "nekro-acidos") ? connaissance(v.camp, "mil") : null)));

    // Destroyeur de la Volée argentée : 1 influence dépensée ce tour (marque « deuxAttaques »),
    // deux attaques au lieu d'une
    const doubleAttaque = v => sorte === "spatial" && Number(v.c.marques?.deuxAttaques) === etat.tour;

    // (0 attaque fixée par une unité : elle ne tire pas)
    const nombreDes = v => (attaquesScripts(v) === 0 ? 0
        : Math.max(1, (attaquesScripts(v) ?? v.nb) * (doubleAttaque(v) ? 2 : 1) + ajustN(v)));

    const ajuster = (v, marque, delta) => jouer({
        type: "marquer",
        c: v.id,
        marque,
        valeur: (Number(v.c.marques?.[marque]) || 0) + delta,
    });

    // L'unité a-t-elle cette capacité (#fpre, #prec, #indes) ? Elle doit
    // ouvrir une ligne de son texte ou suivre une virgule : un texte qui ne
    // fait que la citer (« si vous avez #fpre ») ne compte pas.
    const aCapacite = (v, cle) =>
        new RegExp(`(^|<p[^>]*>|<br\\s*/?>|<li[^>]*>|,)\\s*(<strong>)?\\s*#${cle}\\b`, "i")
            .test(v.u.habilite || "");

    // Script Stratégie de saut : le vaisseau est arrivé ce tour par un trou de ver
    const aSaute = v => sorte === "spatial" && Number(v.c.marques?.saut) === etat.tour &&
        v.camp !== NEUTRE && aScript(v.camp, "strategie-de-saut");

    // Script Prévision des combats : la flotte du joueur dans ce système a la frappe en premier
    // ce tour (compteur joueur:<u>:prevision = tour × 1000 + case + 1)
    const prevision = v => sorte === "spatial" && v.camp !== NEUTRE && (v.u.mot_cle || []).includes("ship") &&
        Number(etat.compteurs[`joueur:${v.camp}:prevision`]) === etat.tour * 1000 + numero + 1;

    // (scripts : Avantage aérien pour les infanteries au combat terrestre, Stratégie de saut,
    // Prévision des combats)
    const aFrappePreventive = v => aCapacite(v, "fpre") || aSaute(v) || prevision(v) ||
        (sorte === "terrestre" && v.u.type === "inf" && v.camp !== NEUTRE && aScript(v.camp, "avantage-aerien"));

    // Cible spécifique : -2 pour toucher, sauf capacité de précision
    // (script Stratégie dominante de la cible : -2 de plus)
    // Palais du khan : l'engager (ciblé ou dans un groupe) coûte −1 par frégate du khan du
    // combat, moitié moins (arrondi au-dessus) avec #prec ; ce malus remplace le −2 du ciblage
    const malus = v => {
        const codes = engagement(v);
        const cible = codes.find(e => e.startsWith("@"));
        const precis = aCapacite(v, "prec");

        const fregates = vaisseaux.filter(x => x.c.ref?.id === 524 && x.cible).length;
        const palais = fregates > 0 && aScript(moi, "palais-du-khan") &&
            codes.some(code => ciblesDe(code).some(x => x.c.ref?.id === 525));
        const visePalais = palais ? (precis ? Math.ceil(fregates / 2) : fregates) : 0;

        if (!cible || precis || parId[cible.slice(1)]?.c.ref?.id === 525) {
            return visePalais;
        }

        const camp = parId[cible.slice(1)]?.camp;

        return visePalais + 2 + (camp && aScript(camp, "strategie-dominante") ? 2 : 0);
    };

    // --------------------------------------------------------
    // BONUS DES SCRIPTS (technologies débloquées, scripts.js) : ils
    // s'ajoutent d'office à la valeur de combat du tireur, et sont
    // dits sur sa ligne. -> [[variation, nom du script]]
    // --------------------------------------------------------

    const contenuDe = c => contenus[c.ref.id] ?? contenuEnCache(c.ref.id);

    // Unités d'un camp dans le système (espace et planètes)
    const dansLeSysteme = camp => Object.values(etat.composants).filter(c =>
        c.ref?.type === "unit" && campDe(c) === camp &&
        (c.zone === "hex:" + numero || c.zone?.startsWith(`hex:${numero}:`)));

    // Possesseur de la planète du combat : sa carte est dans ses éléments actifs
    const idPlanete = planete === null ? null : systeme?.elems?.[planete]?.id;

    const possesseur = idPlanete > 0
        ? partie.joueurs.find(j => (index.parZone.get(`joueur:${j.userId}:actif`) || [])
            .some(c => c.ref?.type === "planet" && c.ref.id === idPlanete))?.userId ?? null
        : null;

    // Camp visé par le premier engagement d'un tireur (ou null)
    const campVise = v => {
        const code = engagement(v)[0];

        return !code ? null
            : (code.startsWith("@") ? parId[code.slice(1)]?.camp ?? null
                : (/^n$/i.test(code) ? NEUTRE : Number(code.slice(1))));
    };

    // Arme amplifiée : un scientifique est posé sur ce type de vaisseau de la feuille du joueur
    const amplifie = v => {
        const fiche = fiches[partie.joueurs.find(j => j.userId === v.camp)?.faction];
        const i = (fiche?.units || []).findIndex(lien => lien?.id === v.c.ref.id);

        return i >= 0 && (index.parZone.get(`joueur:${v.camp}:unite:${i}`) || [])
            .some(c => c.ref?.type === "agent" && /scientifique/i.test(nomElement(search, c.ref)));
    };

    // Habilité Entraîner les milices : un amiral est posé sur une alliance « Tuteur des réfugiés » (#454)
    const milicesEntrainees = Object.values(etat.composants).some(x => !x.cache && x.ref?.type === "agent" &&
        x.sur && etat.composants[x.sur]?.ref?.type === "Promesse" && etat.composants[x.sur].ref.id === 454 &&
        /amiral/i.test(nomElement(search, x.ref)));

    // Rang d'une unité parmi celles de son camp qui tirent (Sharsiss : les N premières)
    const rangDansCamp = v => vaisseaux.filter(x => x.camp === v.camp && x.tire).findIndex(x => x.id === v.id);

    // Salai Sai Corian : vaisseaux adverses que visent ses engagements
    const salai = v => new Set(engagement(v).flatMap(code => ciblesDe(code))
        .filter(x => x.camp !== v.camp && estVaisseau(x)).map(x => x.id)).size;

    // Complexe de guerre d'un camp dans ce système ou un système adjacent
    const complexeProche = camp => Object.values(etat.composants).some(c => {
        const m = /^hex:(\d+)/.exec(c.zone || "");
        return !!m && c.ref?.type === "unit" && c.ref.id === 164 && campDe(c) === camp && distanceCases(numero, Number(m[1])) <= 1;
    });

    // Choix faits sur l'écran de ce combat, pour ce tour (Olivier Dubois, Stratégie d'évitement)
    const CE_COMBAT = `${lieu}:${etat.tour}`;
    const evitant = x => x.c.marques?.evitement === CE_COMBAT;

    // Stratégie d'évitement : le premier engagement du tireur ne vise que des vaisseaux « évitants »
    const viseEvitement = v => {
        const code = engagement(v)[0];
        const cibles = code ? ciblesDe(code) : [];
        return cibles.length > 0 && cibles.every(evitant);
    };

    // Tireur d'un bombardement ou d'un raid (pas l'Épineux géant, qui tire depuis la planète)
    const bombarde = v => bombe && v.c.zone !== zone;

    function bonusScripts(v) {

        if (!v.tire) {
            return [];
        }

        const a = id => v.camp !== NEUTRE && aScript(v.camp, id);

        return [
            sorte === "spatial" && etat.compteurs[`${COMBAT}:plus:${v.camp}`] && [1, "Écoles militaires"],
            sorte === "spatial" && a("arme-amplifiee") && amplifie(v) && [2, "Arme amplifiée"],
            sorte === "spatial" && a("centre-de-coordination") &&
                dansLeSysteme(v.camp).some(c => ["dock", "fs"].includes(contenuDe(c)?.type)) && [1, "Centre de coordination"],
            sorte === "spatial" && a("pc") &&
                dansLeSysteme(v.camp).some(c => ["dock", "fs"].includes(contenuDe(c)?.type)) && [1, "PC"],
            sorte === "spatial" && a("strategie-dominante") && aFrappePreventive(v) && [1, "Stratégie dominante"],
            aSaute(v) && [1, "Stratégie de saut"],
            // Cartographie de l'espace : les attaques contre ses vaisseaux ont −1 dans un système à anomalie
            (sorte === "spatial" || sorte === "canons") && campVise(v) && aScript(campVise(v), "cartographie-de-l-espace") &&
                systeme?.anomaly && !/^hpl/.test(systeme.anomaly) && [-1, "Cartographie de l'espace"],
            sorte === "terrestre" && v.u.type === "inf" && a("troupe-d-elite") && [1, "Troupe d'élite"],
            // Énergie de la faille, Soldats déphasés : +1 aux vaisseaux, aux forces terrestres
            sorte === "spatial" && a("energie-de-la-faille") && [1, "Énergie de la faille"],
            sorte === "terrestre" && a("soldats-dephases") && [1, "Soldats déphasés"],
            // Centre d'expansion : système désigné au ravitaillement (tour × 1000 + case + 1)
            sorte === "spatial" && v.camp !== NEUTRE &&
                Number(etat.compteurs[`joueur:${v.camp}:expansion`]) === etat.tour * 1000 + numero + 1 && [1, "Centre d'expansion"],
            // Vaisseau relique : un fragment militaire dépensé ce tour, +3
            sorte === "spatial" && v.c.ref?.id === 854 && Number(v.c.marques?.reliqueMil) === etat.tour && [3, "Vaisseau relique"],
            // Salai Sai Corian : +1 par vaisseau adverse engagé
            sorte === "spatial" && v.c.ref?.id === 148 && aScript(moi, "salai-sai-corian") && salai(v) > 0 && [salai(v), "Salai Sai Corian"],
            // Complexe de guerre : destroyers de ce système ou d'un système adjacent, +1 (non cumulable)
            sorte === "spatial" && v.u.type === "dest" && v.camp !== NEUTRE && aScript(v.camp, "complexe-de-guerre-destroyers") &&
                complexeProche(v.camp) && [1, "Complexe de guerre"],
            // Olivier Dubois : infanteries choisies sur l'écran du combat, +2
            sorte === "terrestre" && v.c.marques?.dubois === CE_COMBAT && [2, "Olivier Dubois"],
            // Stratégie d'évitement : vaisseaux choisis, −1 ; qui ne vise qu'eux, −1
            sorte === "spatial" && evitant(v) && [-1, "Stratégie d'évitement"],
            sorte === "spatial" && viseEvitement(v) && [-1, "Stratégie d'évitement (cible)"],
            // Habilités des neutres : Armer les rebelles (+1 aux Rebelles ce tour), Entraîner les milices (+2 aux Milices)
            v.c.ref?.id === 557 && Number(etat.compteurs["general:armer-rebelles"]) === etat.tour && [1, "Armer les rebelles"],
            v.c.ref?.id === 835 && milicesEntrainees && [2, "Entraîner les milices"],
            // Générateur de tempête : −1 à tous les vaisseaux du système ce tour ; si la tempête n'est
            // plus active, les factions qui ont Adaptation de la visée y échappent
            sorte === "spatial" && Number(etat.compteurs[`general:tempete:${numero}`]) === etat.tour &&
                !(v.camp !== NEUTRE && !aScript(v.camp, "tempete-spatiale") && a("adaptation-de-la-visee")) && [-1, "Générateur de tempête"],
            // Mercenaires (un bouton chacun, sous le combat) : le temps de ce combat
            sorte === "terrestre" && v.u.type === "inf" && etat.compteurs[MERC(281) + v.camp] && [1, "Claire Gibson"],
            sorte === "terrestre" && etat.compteurs[MERC(357) + v.camp] && [1, "Jace X"],
            sorte === "spatial" && rangDansCamp(v) < (Number(etat.compteurs[MERC(299) + v.camp]) || 0) && [1, "Sharsiss"],
            // Mirik Aun Sissiri : +1 au combat spatial dans le système désigné à la phase de mandat
            sorte === "spatial" && v.camp !== NEUTRE &&
                Number(etat.compteurs[`joueur:${v.camp}:mirik`]) === numero + 1 && [1, "Mirik Aun Sissiri"],
            // Règles de planètes : Jeollr (bombardements −2), Loki (−1 contre qui possède la planète)
            bombarde(v) && idPlanete === 59 && aScript(v.camp, "jeollr") && [-2, "Jeollr"],
            idPlanete === 62 && possesseur !== null && campVise(v) === possesseur && aScript(v.camp, "loki") && [-1, "Loki"],
            // Habilité Tempête spatiale : canons et combats ont −1
            // (Adaptation de la visée : le malus de la tempête est ignoré)
            aScript(v.camp, "tempete-spatiale") && !a("adaptation-de-la-visee") && [-1, "Tempête spatiale"],
            (sorte === "canons" || bombarde(v)) && a("systeme-de-visee") && [1, "Système de visée"],
            sorte === "canons" && campVise(v) && aScript(campVise(v), "bouclier-deflecteur") && [-1, "Bouclier déflecteur"],
            bombarde(v) && possesseur && possesseur !== v.camp && aScript(possesseur, "batiment-resistant") && [
                unitesDe(zone).some(c => campDe(c) === possesseur && contenuDe(c)?.mot_cle?.includes("struc")) ? -2 : -1,
                "Bâtiment résistant",
            ],
        ].filter(Boolean);
    }

    // Script Bombe bactériologique : au bombardement, les dégâts de ce tireur sont verts
    const degatsVerts = v => sorte === "bombardement" && bombarde(v) && v.camp !== NEUTRE && aScript(v.camp, "bombe-bacteriologique");

    // Le dé touche s'il fait le seuil ou moins
    const seuil = v => attaque(v) - malus(v) + ajust(v) + bonusScripts(v).reduce((s, [n]) => s + n, 0);

    // Résistance d'une unité, Blindage en duranium compris : { valeur, bonus }
    const pv = v => resistanceDe(v.u, v.camp, aScript);

    const estDetruit = v => {
        const resistance = pv(v).valeur;
        return resistance > 0 && (Number(v.c.marques?.degat) || 0) >= resistance;
    };

    // --------------------------------------------------------
    // PILLAGE (#pill, effets.js) et autres gains à la destruction
    //
    // Le camp qui a infligé le dernier dégât à l'unité (marque « degatDe »,
    // posée avec chaque dégât) gagne son pillage quand elle est retirée —
    // seulement s'il a encore une unité dans le système.
    //   Maître du pillage (habilité) : 1 commerce de plus par pillage ;
    //   Libre échange (habilité) : 1 infamie pour une unité commerciale
    //   non militaire détruite.
    // -> { camp, texte, actions } ou null
    // --------------------------------------------------------

    // Esclaves d'un joueur : infanteries d'un autre camp dans ses éléments actifs
    const esclavesDe = u => (index.parZone.get(`joueur:${u}:actif`) || []).filter(x => !x.cache && x.ref?.type === "unit" &&
        campDe(x) !== u && typeUnite(contenuEnCache(x.ref.id)) === "inf");

    // Conséquences d'une destruction, données avec le butin (pas de pillage nécessaire) :
    //   Myru Vos : un vaisseau de commerce qu'il détruit (marque « degatPar ») rapporte 2 commerce ;
    //   Armageddon (#850) : son destructeur prend le contrôle d'un Armageddon (#490), 1 de résistance restante ;
    //   Camp de travail : 2 esclaves de son propriétaire sont libérés sur sa planète (ceux du destructeur d'abord).
    // -> { actions, gains }
    function consequences(v, camp) {

        const actions = [];
        const gains = [];
        const mots = v.u.mot_cle || [];

        if (mots.includes("ship") && mots.includes("com") && etat.composants[v.c.marques?.degatPar]?.ref?.id === 597 &&
            aScript(camp, "myru-vos")) {
            actions.push({ type: "compteur", id: `joueur:${camp}:commerce`, delta: 2 });
            gains.push("2 commerce (Myru Vos)");
        }

        if (v.c.ref?.id === 850 && aScript(camp, "armageddon-capture")) {
            const local = "t" + (String(v.id).replace(/\D/g, "").slice(-11) || "1");
            const resistance = Number(armageddon?.PV) || 1;

            actions.push({ type: "creer", ref: { type: "unit", id: 490 }, zone: v.c.zone, proprio: camp, idLocal: local });

            if (resistance > 1) {
                actions.push({ type: "marquer", c: local, marque: "degat", valeur: resistance - 1 });
            }

            gains.push("il prend le contrôle de l'Armageddon (1 de résistance restante)");
        }

        if (v.c.ref?.id === 154 && v.camp !== NEUTRE && aScript(v.camp, "camp-de-travail-destruction")) {
            const liberes = esclavesDe(v.camp)
                .sort((a, b) => (campDe(b) === camp) - (campDe(a) === camp))
                .slice(0, 2);

            actions.push(...liberes.map(x => ({ type: "deplacer", c: x.id, vers: v.c.zone })));
            gains.push(liberes.length
                ? `${liberes.length} esclave(s) libéré(s) sur la planète, sous le contrôle de leur propriétaire`
                : "aucun esclave à libérer");
        }

        return { actions, gains };
    }

    // Troupe de détournement : un vaisseau qu'elle a détruit (marque « degatPar ») est capturé —
    // il part dans les éléments actifs de son camp au lieu d'être retiré. -> camp ou null
    function captureePar(v) {

        const tireur = etat.composants[v.c.marques?.degatPar];
        const camp = auteurDesDegats(v.c);

        return estVaisseau(v) && tireur?.ref?.type === "unit" && ![null, NEUTRE, v.camp].includes(camp) &&
            aScript(moi, "troupe-de-detournement") &&
            /attaque après toutes les autres/i.test(contenuDe(tireur)?.habilite || "") ? camp : null;
    }

    function butinDe(v) {

        const camp = auteurDesDegats(v.c);

        if (camp === null || camp === NEUTRE || camp === v.camp) {
            return null;
        }

        if (captureePar(v) !== null) {
            return {
                camp,
                actions: [],
                texte: `${nomElement(search, v.c.ref)} capturé(e) par ${nomCamp(camp)} (Troupe de détournement : éléments actifs)`,
            };
        }

        const nomUnite = nomElement(search, v.c.ref);
        const actions = [];
        const gains = [];

        const pillage = aScript(camp, "pillage-unite") ? lirePillage(v.u) : null;
        const present = dansLeSysteme(camp).length > 0;

        if (pillage && !present) {
            gains.push("pas de pillage (plus aucune unité dans le système)");
        } else if (pillage) {

            const commerce = pillage.commerce + (aScript(camp, "maitre-du-pillage") ? 1 : 0);
            const recherche = pillage.recherche.reduce((total, [, n]) => total + n, 0);

            if (commerce > 0) {
                actions.push({ type: "compteur", id: `joueur:${camp}:commerce`, delta: commerce });
                gains.push(`${commerce} commerce` + (commerce > pillage.commerce ? " (dont 1 : Maître du pillage)" : ""));
            }

            if (pillage.points > 0) {
                actions.push(...actionsPiste(etat, camp, "points", pillage.points));
                gains.push(`${pillage.points} point(s)`);
            }

            if (pillage.infamie > 0) {
                actions.push(...actionsPiste(etat, camp, "infamie", pillage.infamie));
                gains.push(`${pillage.infamie} infamie`);
            }

            if (recherche > 0) {
                actions.push(noter(etat, camp, "g", v.c.ref.id, recherche));
                gains.push(`${recherche} de recherche (${pillage.recherche.map(([type, n]) => `${type} ${n}`).join(", ")})`);
            }

            if (pillage.aLaMain) {
                gains.push("butin posé sur l'unité : à prendre à la main");
            }
        }

        if ((v.u.mot_cle || []).includes("com") && !(v.u.mot_cle || []).includes("mil") && aScript(camp, "libre-echange")) {
            actions.push(...actionsPiste(etat, camp, "infamie", 1));
            gains.push("1 infamie (Libre échange)");
        }

        // Habilité Infiltration : détruire un vaisseau donne un token Infiltration,
        // aux couleurs de la faction touchée
        if ((v.u.mot_cle || []).includes("ship") && aScript(camp, "infiltration")) {
            actions.push({
                type: "creer",
                ref: { type: "token", id: 882 },
                zone: `joueur:${camp}:actif`,
                ...(v.camp !== NEUTRE ? { proprio: v.camp } : {}),
            });
            gains.push(`1 infiltration${v.camp !== NEUTRE ? " envers " + nomCamp(v.camp) : ""}`);
        }

        const suites = consequences(v, camp);
        actions.push(...suites.actions);
        gains.push(...suites.gains);

        return gains.length
            ? { camp, actions: actions.filter(Boolean), texte: `${nomUnite} détruit(e) par ${nomCamp(camp)} : ${gains.join(", ")}` }
            : null;
    }

    // Retrait d'une unité détruite : elle garde la trace du combat (marque
    // « detruitA »), pour le Grappin de capture d'un combat résolu ; le
    // butin de sa destruction est donné à qui l'a détruite
    // (capturé par la Troupe de détournement : il part, réparé et sans ses marques de
    // combat, dans les éléments actifs du camp qui l'a détruit)
    const retrait = v => (captureePar(v) !== null ? [
        ...Object.values(M).filter(m => v.c.marques?.[m] !== undefined).map(m => marquer(v.id, m, [])),
        { type: "marquer", c: v.id, marque: "degat", valeur: 0 },
        ...["degatDe", "degatPar"].filter(m => v.c.marques?.[m] !== undefined)
            .map(m => ({ type: "marquer", c: v.id, marque: m, valeur: null })),
        { type: "deplacer", c: v.id, vers: `joueur:${captureePar(v)}:actif`, proprio: captureePar(v) },
    ] : [
        ...(butinDe(v)?.actions || []),
        { type: "marquer", c: v.id, marque: "detruitA", valeur: `${lieu}:${etat.tour}` },
        v.c.marques?.medecine && { type: "marquer", c: v.id, marque: "medecine", valeur: null },
        { type: "supprimer", c: v.id },
    ].filter(Boolean));

    // Retire ces unités, et dit le butin de chacune (journal, message orange)
    function retirer(liste) {

        const butins = liste.map(butinDe).filter(Boolean).map(b => b.texte);

        envoyer(
            [
                ...liste.flatMap(retrait),
                { type: "compteur", id: DETRUITS, delta: liste.length },
                // Henry Storcher : les vaisseaux perdus de son joueur sont comptés
                ...campsJoueurs.filter(u => aScript(u, "henry-storcher"))
                    .map(u => ({ type: "compteur", id: PERDUS + u, delta: liste.filter(v => v.camp === u && estVaisseau(v)).length }))
                    .filter(action => action.delta > 0),
            ],
            [`Combat : ${liste.length} unité(s) détruite(s) retirée(s)`, ...butins].join(" — ")
        );

        if (butins.length) {
            aviser(butins.join(" ; "));
        }
    }

    // Script Médecine : une de mes unités biologiques, et son jet de capture
    const medecine = v => v.camp === moi && (v.u.mot_cle || []).includes("bio") && aScript(moi, "medecine");
    const jetMedecine = v => Number(v.c.marques?.medecine) || 0;

    // Frégate du khan détruite : un dé pour son destructeur — 6 ou moins (4 si l'unité qui l'a
    // détruite a #fpre) = 1 dégât qu'il répartit sur ses unités du combat. Marques de la
    // frégate : « khan » (le jet), « khanPris » (le dégât encaissé). Retirée ensuite.
    const estFregateKhan = v => v.c.ref?.id === 524 && aScript(moi, "fregate-du-khan");
    const tueurKhan = v => parId[v.c.marques?.degatPar];
    const seuilKhan = v => (tueurKhan(v) && aCapacite(tueurKhan(v), "fpre") ? 4 : 6);
    const jetKhan = v => Number(v.c.marques?.khan) || 0;
    const riposteDue = v => estFregateKhan(v) && estDetruit(v) && jetKhan(v) > 0 && jetKhan(v) <= seuilKhan(v) && !v.c.marques?.khanPris;
    const khanEnAttente = v => estFregateKhan(v) && estDetruit(v) && ![null, NEUTRE].includes(auteurDesDegats(v.c)) &&
        (!jetKhan(v) || riposteDue(v));
    const ripostesKhan = camp => vaisseaux.filter(v => riposteDue(v) && auteurDesDegats(v.c) === camp);

    // Memoria D : une de mes infanteries détruites est sauvée sur un jet de 6 ou moins
    // (marque « memoria ») — elle est posée à bord de mon Memoria D
    const memoriaD = Object.values(etat.composants).find(c => !c.cache && c.ref?.type === "unit" && c.ref.id === 769 &&
        campDe(c) === moi && /^hex:\d+/.test(c.zone || ""));
    const sauvableMemoria = v => v.camp === moi && !!memoriaD && typeUnite(v.u) === "inf" && aScript(moi, "memoria-d");
    const jetMemoria = v => Number(v.c.marques?.memoria) || 0;
    const sauveeMemoria = v => sauvableMemoria(v) && jetMemoria(v) > 0 && jetMemoria(v) <= 6;

    // Unités détruites à retirer du jeu (bouton « Retirer tous les détruits »)
    // (pas une frégate du khan dont la riposte n'est pas faite)
    const aRetirer = vaisseaux.filter(v => estDetruit(v) && !aCapacite(v, "indes") && !khanEnAttente(v));

    // --------------------------------------------------------
    // DÉGÂTS À ENCAISSER
    //
    // Les dégâts d'un tireur (ses dés qui touchent, pas encore
    // attribués) vont à son premier engagement qui a encore une unité
    // debout : le surplus passe ainsi à l'engagement suivant, et il est
    // perdu s'il n'y en a plus. C'est le joueur visé qui les répartit
    // entre ses unités ; ceux des neutres sont appliqués d'office.
    // --------------------------------------------------------

    const debout = x => !estDetruit(x);

    // Unités visées par un engagement
    // Furtif (#furtif, script Camouflage) : tant qu'elle n'a engagé personne,
    // l'unité ne peut qu'être ciblée — un engagement de faction ne l'atteint pas
    // (aussi au combat terrestre : Rebelle ; Vaisseau pirate : furtif dans une anomalie)
    const furtifDeNature = x => aCapacite(x, "furtif") ||
        (sorte === "spatial" && x.camp !== NEUTRE && aScript(x.camp, "camouflage")) ||
        (sorte === "spatial" && x.c.ref?.id === 407 && aScript(moi, "vaisseau-pirate") &&
            !!systeme?.anomaly && !/^hpl/.test(systeme.anomaly));

    const estFurtif = x => (sorte === "spatial" || sorte === "terrestre") && x.cible && engagement(x).length === 0 &&
        furtifDeNature(x);

    // Lune noire : elle doit être ciblée pour être engagée (même après avoir engagé)
    const ciblageObligatoire = x => /doit être ciblée/i.test(x.u.habilite || "") && aScript(moi, "lune-noire");

    const ciblesDe = code => {

        if (code.startsWith("@")) {
            return [parId[code.slice(1)]].filter(Boolean);
        }

        const militaire = code === "n" || code[0] === "j";
        const camp = code === "n" || code === "N" ? NEUTRE : Number(code.slice(1));

        return vaisseaux.filter(x => x.cible && x.camp === camp && x.militaire === militaire && !estFurtif(x) && !ciblageObligatoire(x));
    };

    const cibleActuelle = v => engagement(v).find(code => ciblesDe(code).some(debout)) ?? null;

    // Dés d'un tireur qui touchent et dont le dégât n'est pas attribué
    const touchesLibres = v => {
        const inverses = lireIndices(v.c, M.desF);
        const attribues = lireIndices(v.c, M.desA);

        return lireDes(v.c)
            .map((valeur, k) => ((valeur <= seuil(v)) !== inverses.includes(k) && !attribues.includes(k) ? k : -1))
            .filter(k => k >= 0);
    };

    // Dégâts en attente, par engagement visé : { "j3": [{ v, k }] } ; perdus : sans cible
    const enAttente = {};
    let perdus = 0;

    for (const v of vaisseaux) {

        const touches = touchesLibres(v);

        if (!touches.length) {
            continue;
        }

        const code = cibleActuelle(v);

        if (code) {
            (enAttente[code] ||= []).push(...touches.map(k => ({ v, k })));
        } else {
            perdus += touches.length;
        }
    }

    // Dégâts que cette unité peut encaisser : ceux qui la ciblent, puis ceux de son groupe
    // Vaisseau pirate : ses touches sur un camp vont d'abord à ses vaisseaux de commerce
    const estCommerce = x => estVaisseau(x) && (x.u.mot_cle || []).includes("com");
    const dePirate = d => d.v.c.ref?.id === 407 && aScript(moi, "vaisseau-pirate");
    const permis = (x, d) => !(dePirate(d) && !estCommerce(x) &&
        vaisseaux.some(y => y.camp === x.camp && y.cible && debout(y) && estCommerce(y)));

    const aEncaisser = x => (x.cible && debout(x)
        ? [
            ...(enAttente["@" + x.id] || []),
            ...(enAttente[codeCamp(x.camp, x.militaire)] || []),
            // (un vaisseau de commerce prend aussi les touches pirates destinées à l'autre groupe de son camp)
            ...(estCommerce(x) ? (enAttente[codeCamp(x.camp, !x.militaire)] || []).filter(dePirate) : []),
        ].filter(d => permis(x, d))
        : []);

    // Résistance qu'il reste à une unité (sans résistance : elle encaisse tout)
    const reste = x => (pv(x).valeur > 0 ? pv(x).valeur - (Number(x.c.marques?.degat) || 0) : Infinity);

    const aRepartir = camp => Object.entries(enAttente)
        .filter(([code]) => ciblesDe(code)[0]?.camp === camp)
        .reduce((n, [, liste]) => n + liste.length, 0);

    // Actions : ces dégâts ({ v, k }) sont attribués, et chaque unité prend les siens
    // (si : refusé si un autre vient d'appliquer les mêmes)
    function attribution(couples) {

        const parTireur = new Map();
        const parCible = new Map();

        // Paternité des dégâts : camp et unité du dernier tireur, par unité touchée
        const auteurs = new Map();
        const tueurs = new Map();

        for (const { x, v, k } of couples) {
            parTireur.set(v.id, [...(parTireur.get(v.id) || lireIndices(v.c, M.desA)), k]);
            parCible.set(x.id, (parCible.get(x.id) || 0) + 1);
            auteurs.set(x.id, v.camp);
            tueurs.set(x.id, v.id);
        }

        const desAttribues = [...parTireur].map(([id, indices]) => ({
            ...marquer(id, M.desA, indices),
            si: parId[id].c.marques?.[M.desA] ?? 0,
        }));

        // Raid : chaque infanterie touchée est capturée — elle part dans les éléments actifs du
        // raideur (un esclave), sans dégât
        if (sorte === "raid" && [...auteurs.values()].every(camp => camp !== NEUTRE)) {
            return [
                ...desAttribues,
                ...[...auteurs].map(([id, camp]) => ({ type: "deplacer", c: id, vers: `joueur:${camp}:actif` })),
            ];
        }

        // Script Bombe bactériologique : une infanterie biologique détruite par un
        // de ses dégâts en entraîne deux autres, identiques
        const epidemie = couples
            .filter(({ x, v }) => degatsVerts(v) &&
                (Number(x.c.marques?.degat) || 0) + parCible.get(x.id) >= pv(x).valeur)
            .flatMap(({ x }) => victimesBombe(etat, x.c, x.u, [...parCible.keys()]));

        return [
            ...epidemie,
            ...desAttribues,
            // (noté avant le dégât lui-même : le pillage lit qui a détruit l'unité ; « degatPar » :
            // l'unité qui a tiré — Myru Vos, frégate du khan)
            ...[...auteurs].map(([id, camp]) => ({ type: "marquer", c: id, marque: "degatDe", valeur: "c" + camp })),
            ...[...tueurs].map(([id, tireur]) => ({ type: "marquer", c: id, marque: "degatPar", valeur: tireur })),
            ...[...parCible].map(([id, n]) => {
                const degat = Number(parId[id].c.marques?.degat) || 0;
                return { type: "marquer", c: id, marque: "degat", valeur: degat + n, si: degat };
            }),
        ];
    }

    // Mon unité encaisse un des dégâts qui la visent
    function encaisser(x) {

        const [du] = aEncaisser(x);

        if (du) {
            jouer(attribution([{ x, ...du }]));
        }
    }

    // Annuler une touche : J.N.S. Hylarim (combat spatial), Bouclier mobile (combat terrestre),
    // Système de défense (bombardement, raid) — une autre de mes unités de ce lieu, encore debout ;
    // 1 ressource, le dégât est attribué sans être subi
    const annuleurs = x => unites.filter(c => campDe(c) === moi && c.id !== x.id && c.zone === zone &&
        (Number(c.marques?.degat) || 0) < (Number(contenus[c.ref.id]?.PV) || 1) && (
        (sorte === "spatial" && c.ref.id === 172 && aScript(moi, "jns-hylarim-annuler")) ||
        (sorte === "terrestre" && c.ref.id === 175 && aScript(moi, "bouclier-mobile-annuler")) ||
        (bombe && c.ref.id === 177 && aScript(moi, "systeme-de-defense-annuler"))));

    function annuler(x, commentaire) {

        const [du] = aEncaisser(x);

        if (du) {
            envoyer([
                { ...marquer(du.v.id, M.desA, [...lireIndices(du.v.c, M.desA), du.k]), si: du.v.c.marques?.[M.desA] ?? 0 },
                { type: "compteur", id: `joueur:${moi}:res`, delta: -1 },
            ], commentaire);
        }
    }

    // Neutres : les dégâts vont d'abord à l'unité qui a le moins de résistance,
    // et une unité est achevée avant de passer à la suivante. (Le surplus
    // d'un engagement n'est pas réparti ici : il passera au suivant une fois
    // ces dégâts appliqués.)
    const degatsNeutres = [];
    const resteNeutre = new Map();

    for (const [code, liste] of Object.entries(enAttente)) {

        const cibles = ciblesDe(code)
            .filter(x => x.camp === NEUTRE && debout(x))
            .sort((a, b) => reste(a) - reste(b) || (Number(a.u.PV) || 0) - (Number(b.u.PV) || 0) || a.id.localeCompare(b.id));

        let i = 0;

        for (const du of liste) {

            while (cibles[i] && (resteNeutre.get(cibles[i].id) ?? reste(cibles[i])) <= 0) {
                i++;
            }

            if (!cibles[i]) {
                break;
            }

            const x = cibles[i];

            resteNeutre.set(x.id, (resteNeutre.get(x.id) ?? reste(x)) - 1);
            degatsNeutres.push({ x, ...du });
        }
    }

    const appliquerAuxNeutres = () => envoyer(
        attribution(degatsNeutres),
        `Combat : ${degatsNeutres.length} dégât(s) appliqué(s) aux neutres`
    );

    // Application d'office : par le navigateur d'un seul joueur (le premier
    // du combat dans l'ordre d'initiative, sinon le premier de la partie),
    // pour qu'elle ne parte pas plusieurs fois. Les autres ont un bouton.
    const responsable = campsJoueurs[0] ?? partie.joueurs[0]?.userId;
    const signature = degatsNeutres.map(d => `${d.v.id}:${d.k}>${d.x.id}`).join(",");
    const dejaEnvoye = useRef("");

    useEffect(() => {
        if (joueur && moi === responsable && signature && dejaEnvoye.current !== signature) {
            dejaEnvoye.current = signature;
            appliquerAuxNeutres();
        }
    });

    // Ceux qui tirent : les militaires engagés et pas détruits, de toutes
    // les factions et des neutres
    // (raid sur une planète sans infanterie : les raideurs tirent sans engagement — une
    // réussite capture un esclave du possesseur de la planète)
    const sansInfanterie = sorte === "raid" && !vaisseaux.some(v => v.cible);

    const tireurs = vaisseaux.filter(v =>
        v.tire && attaque(v) > 0 && nombreDes(v) > 0 && (engagement(v).length > 0 || sansInfanterie) && !estDetruit(v));

    // Troupe de détournement : elle attaque après toutes les autres unités (3e temps)
    const attaqueEnDernier = v => /attaque après toutes les autres/i.test(v.u.habilite || "") &&
        (sorte === "spatial" || sorte === "terrestre") && aScript(moi, "troupe-de-detournement");

    const preventifs = tireurs.filter(v => aFrappePreventive(v) && !attaqueEnDernier(v));
    const autres = tireurs.filter(v => !aFrappePreventive(v) && !attaqueEnDernier(v));
    const derniers = tireurs.filter(attaqueEnDernier);

    // Un nouveau jet remplace l'ancien : ses dés inversés ou attribués sont oubliés
    const jets = ceux => ceux.flatMap(v => [
        v.c.marques?.[M.desF] !== undefined && marquer(v.id, M.desF, []),
        v.c.marques?.[M.desA] !== undefined && marquer(v.id, M.desA, []),
        { type: "des", n: nombreDes(v), faces: FACES, c: v.id, marque: M.des },
    ]).filter(Boolean);

    // --------------------------------------------------------
    // PRÊT AU COMBAT
    //
    // Chaque joueur qui a des vaisseaux dans le combat se dit prêt
    // (compteur combat:pret:<u>). Quand tous le sont, toutes les
    // attaques partent, en deux ou trois temps (compteur combat:etape) :
    //
    //   0  engagements        -> la frappe en premier part (1)
    //   1  frappe en premier  -> les autres attaques partent (2)
    //   2  autres attaques    -> les dernières attaques partent (3), s'il y en a
    //   3  tout est lancé
    //
    // Sans vaisseau à frappe en premier, on passe de 0 à 2 ; sans unité qui
    // attaque en dernier (Troupe de détournement), tout est lancé à 2. Entre
    // deux temps, les joueurs répartissent les dégâts : une unité détruite
    // avant son temps ne tire pas.
    // --------------------------------------------------------

    const etape = Number(etat.compteurs[ETAPE]) || 0;
    const estPret = u => !!etat.compteurs[PRET + u];
    const tousPrets = campsJoueurs.length > 0 && campsJoueurs.every(estPret);
    const jeCombats = joueur && campsJoueurs.includes(moi);

    // Dernière étape : 3 si une unité engagée et debout attaque en dernier
    const etapeFinale = derniers.length > 0 || etape >= 3 ? 3 : 2;
    const enDerniers = etape === 2 && etapeFinale === 3;

    const enPreventive = etape === 0 && preventifs.length > 0;
    const prochains = enPreventive ? preventifs : (enDerniers ? derniers : autres);

    // Phase affichée (PHASES_COMBAT). Avant un lancement, c'est la
    // phase d'attaque qui va partir ; après, celle des dégâts.
    const phaseCombat = etape === 0 ? (enPreventive ? 1 : 3) : etape * 2;

    // Aucune unité du combat n'a la frappe en premier : les phases 1 et 2 n'ont pas lieu
    const sansPreventive = !vaisseaux.some(v => v.tire && attaque(v) > 0 && aFrappePreventive(v) && !attaqueEnDernier(v));

    // Une unité du combat attaque en dernier : les phases 5 et 6 sont affichées
    const avecDerniers = etapeFinale === 3 || vaisseaux.some(v => v.tire && attaque(v) > 0 && attaqueEnDernier(v));

    // Toutes les attaques de l'étape, et plus personne n'est prêt
    const lancement = () => [
        ...campsJoueurs.filter(estPret).map(u => ({ type: "compteur", id: PRET + u, valeur: 0 })),
        // (si : refusé si un autre joueur vient de lancer la même étape —
        // les dés ne sont pas relancés par un double clic)
        { type: "compteur", id: ETAPE, valeur: enPreventive ? 1 : (enDerniers ? 3 : 2), si: etape },
        ...jets(prochains),
    ];

    const titreLancement = enPreventive ? "Combat : frappe en premier" : (enDerniers ? "Combat : dernières attaques" : "Combat : attaques");

    function basculerPret() {

        if (estPret(moi)) {
            envoyer([{ type: "compteur", id: PRET + moi, valeur: 0 }], "");
            return;
        }

        // Je suis le dernier attendu : les attaques partent avec mon « prêt »
        if (campsJoueurs.every(u => u === moi || estPret(u))) {
            envoyer(lancement(), titreLancement);
        } else {
            envoyer([{ type: "compteur", id: PRET + moi, valeur: 1 }], "");
        }
    }

    // Ctrl + clic sur un dé : réussite <-> échec
    function inverser(v, k) {
        const inverses = lireIndices(v.c, M.desF);

        jouer(marquer(v.id, M.desF, inverses.includes(k)
            ? inverses.filter(x => x !== k)
            : [...inverses, k]));
    }

    const avecMarques = vaisseaux.filter(v =>
        Object.values(M).some(m => v.c.marques?.[m] !== undefined));

    const effacer = marques => avecMarques.flatMap(v =>
        marques.filter(m => v.c.marques?.[m] !== undefined).map(m => marquer(v.id, m, [])));

    // Remet le combat à l'étape des engagements : plus personne n'est prêt
    const remiseEtape = [
        ...partie.joueurs
            .filter(j => estPret(j.userId))
            .map(j => ({ type: "compteur", id: PRET + j.userId, valeur: 0 })),
        etape > 0 && { type: "compteur", id: ETAPE, valeur: 0 },
    ].filter(Boolean);

    // Un combat ne compte qu'une salve (frappe en premier puis attaques) : il
    // n'y a pas de nouvelle manche. Pour recommencer, terminer le combat et
    // le rouvrir depuis la fiche du système.

    // Efface les engagements, les dés et les dégâts non attribués de toute la
    // table : demande une confirmation.
    //
    // Script Récupération (combat spatial) : chaque joueur du combat qui a la
    // technologie a une case, cochée d'office (compteur combat:<lieu>:recup:<u>
    // à 2 = décochée) ; à la fin du combat il gagne 1 ressource par unité
    // détruite pendant ce combat (compteur combat:<lieu>:detruits, plus celles
    // qui ne sont pas encore retirées). Deux cases cochées : une seule faction
    // domine le système, le bouton le dit avant de confirmer.
    const DETRUITS = COMBAT + ":detruits";
    const RECUP = COMBAT + ":recup:";

    const recuperateurs = sorte === "spatial" ? campsJoueurs.filter(u => aScript(u, "recuperation")) : [];
    const recupCochee = u => Number(etat.compteurs[RECUP + u]) !== 2;
    const epaves = (Number(etat.compteurs[DETRUITS]) || 0) + aRetirer.length;

    function terminer() {

        const cochees = recuperateurs.filter(recupCochee);

        const obstacles = [
            cochees.length > 1 &&
                `Récupération est cochée par ${cochees.map(nomDe).join(" et ")} : une seule faction domine le système`,
        ];

        const commentaire = obstacles.some(Boolean)
            ? confirmerRegle("Terminer le combat", obstacles)
            : (window.confirm("Terminer ce combat ? Les engagements et les dés seront effacés pour tout le monde.") ? "Combat terminé" : null);

        if (!commentaire) {
            return;
        }

        const gain = epaves > 0 && cochees.length > 0;

        envoyer([
            ...effacer([M.engage, M.des, M.desF, M.desA, M.ajust, M.ajustN]),
            ...remiseEtape,
            ...(gain ? cochees.map(u => ({ type: "compteur", id: `joueur:${u}:res`, delta: epaves })) : []),
            // Compteurs des scripts de ce combat (Écoles militaires, Récupération, esclave du raid)
            ...Object.keys(etat.compteurs)
                .filter(id => id.startsWith(COMBAT + ":") && /:(plus|recup|perdus|merc\d+):\d+$|:(detruits|esclave)$/.test(id) && etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 })),
            ...unites.filter(c => c.marques?.canon).map(c => ({ type: "marquer", c: c.id, marque: "canon", valeur: null })),
            // Marques des choix et des jets de ce combat (Olivier Dubois, Stratégie d'évitement,
            // frégate du khan, Memoria D, Duha Menaimon)
            ...unites.flatMap(c => ["dubois", "evitement", "khan", "khanPris", "memoria", "duha"]
                .filter(m => c.marques?.[m] !== undefined)
                .map(m => ({ type: "marquer", c: c.id, marque: m, valeur: null }))),
            // (2 : résolu — il reste dans l'onglet jusqu'à la fin de la phase, CombatResolu.jsx)
            { type: "compteur", id: COMBAT, valeur: 2 },
        ], commentaire + (gain ? ` — Récupération : +${epaves} ressource(s) pour ${cochees.map(nomDe).join(", ")}` : ""));
    }

    const maSelection = selection.filter(id => parId[id]?.camp === moi);

    // --------------------------------------------------------
    // MERCENAIRES DE COMBAT (scripts.js)
    //
    // Un bouton par mercenaire dont j'ai la carte (éléments actifs).
    // Son cube noir passe dans les agents usés (il revient à l'entretien) ;
    // l'effet vaut pour ce combat : bonusScripts lit le compteur
    // combat:<lieu>:merc<id>:<camp>.
    // --------------------------------------------------------

    const carteMerc = id => (index.parZone.get(`joueur:${moi}:actif`) || [])
        .find(c => !c.cache && c.ref?.type === "mercenaire" && c.ref.id === id);

    const userMerc = id => actionsUserCarte(index, moi, carteMerc(id));

    const dejaUse = id => !!carteMerc(id) && carteUsee(index, carteMerc(id)) &&
        "le cube de ce mercenaire n'est pas sur sa carte : il est déjà utilisé (son cube revient à l'entretien)";
    const enVigueur = (id, camp = moi) => !!etat.compteurs[MERC(id) + camp] && "déjà en vigueur dans ce combat";

    // (unités encore debout : Sharsiss compte celles qui sont au combat)
    const mesUnites = vaisseaux.filter(v => v.camp === moi && !estDetruit(v)).length;
    const mesPertes = (Number(etat.compteurs[PERDUS + moi]) || 0) + aRetirer.filter(v => v.camp === moi && estVaisseau(v)).length;
    const capturables = aRetirer.filter(v => v.camp !== moi && estVaisseau(v) && !["fs", "sun"].includes(v.u.type));

    // Skarvald : 3 dés lancés par le serveur (marque de sa carte), puis le vol dans un second coup
    function skarvald(commentaire) {

        const carte = carteMerc(350);

        envoyer([...userMerc(350), { type: "des", n: 3, faces: 10, c: carte.id, marque: "jetSkarvald" }], commentaire)
            .then(reponse => {

                const jets = String(reponse?.etat?.composants?.[carte.id]?.marques?.jetSkarvald ?? "")
                    .split(",").filter(Boolean).map(Number);

                if (!jets.length) {
                    return;
                }

                const reussites = jets.filter(jet => jet <= 5).length;

                const vol = possesseur && possesseur !== moi
                    ? Math.min(reussites, Number(etat.compteurs[`joueur:${possesseur}:commerce`]) || 0)
                    : 0;

                const texte = `Skarvald : ${jets.join(", ")} — ${reussites} réussite(s)` +
                    (possesseur && possesseur !== moi ? `, ${vol} commerce volé(s) à ${nomDe(possesseur)}` : "");

                envoyer([
                    { type: "marquer", c: carte.id, marque: "jetSkarvald", valeur: null },
                    vol > 0 && { type: "compteur", id: `joueur:${possesseur}:commerce`, delta: -vol },
                    vol > 0 && { type: "compteur", id: `joueur:${moi}:commerce`, delta: vol },
                ].filter(Boolean), texte);

                aviser(texte + ".");
            });
    }

    // So Ata : un vaisseau adverse détruit (pas encore retiré) est capturé — il va dans mes éléments actifs
    function capturer(commentaire) {

        const reponse = capturables.length > 1
            ? window.prompt("So Ata : quel vaisseau capturer ? Tapez son numéro :\n\n" +
                capturables.map((v, k) => `${k + 1} : ${nomElement(search, v.c.ref)} (${nomCamp(v.camp)})`).join("\n"), "1")
            : "1";

        const v = capturables[Math.floor(Number(reponse)) - 1];

        if (!v) {
            return;
        }

        envoyer([
            ...userMerc(284),
            { type: "marquer", c: v.id, marque: "degat", valeur: 0 },
            { type: "deplacer", c: v.id, vers: `joueur:${moi}:actif` },
            { type: "compteur", id: DETRUITS, delta: 1 },
            v.camp !== NEUTRE && aScript(v.camp, "henry-storcher") && { type: "compteur", id: PERDUS + v.camp, delta: 1 },
        ].filter(Boolean), `${commentaire} — ${nomElement(search, v.c.ref)} (${nomCamp(v.camp)}) capturé`);
    }

    const boutonsMercenaires = !joueur ? [] : [

        jeCombats && sorte === "terrestre" && aScript(moi, "claire-gibson") && {
            cle: "281",
            nom: "Claire Gibson : +1 au combat pour vos infanteries, ce combat",
            libelle: "Claire Gibson : +1 à vos infanteries",
            titre: "Combat terrestre : son cube part dans les agents usés, vos infanteries ont +1 pour ce combat",
            obstacles: [dejaUse(281), enVigueur(281)],
            faire: commentaire => envoyer([...userMerc(281), { type: "compteur", id: MERC(281) + moi, valeur: 1 }], commentaire),
        },

        jeCombats && sorte === "terrestre" && aScript(moi, "jace-x") && {
            cle: "357",
            nom: "Jace X : +1 au combat pour vos unités terrestres, ce combat",
            libelle: "Jace X : +1 à vos unités terrestres",
            titre: "Combat terrestre : son cube part dans les agents usés, vos unités ont +1 pour ce combat",
            obstacles: [dejaUse(357), enVigueur(357)],
            faire: commentaire => envoyer([...userMerc(357), { type: "compteur", id: MERC(357) + moi, valeur: 1 }], commentaire),
        },

        // Sharsiss : un bouton par autre faction du combat
        ...(jeCombats && sorte === "spatial" && aScript(moi, "sharsiss") ? campsJoueurs.filter(u => u !== moi).map(u => ({
            cle: "299-" + u,
            nom: `Sharsiss : +1 au combat pour ${mesUnites} unité(s) de ${nomDe(u)}, ce combat`,
            libelle: `Sharsiss : +1 pour ${mesUnites} unité(s) de ${nomDe(u)}`,
            titre: "Combat spatial : son cube part dans les agents usés ; autant d'unités de cette faction que vous en avez dans ce combat ont +1 (les premières qui tirent, dans l'ordre de la liste)",
            obstacles: [dejaUse(299), enVigueur(299, u)],
            faire: commentaire => envoyer([...userMerc(299), { type: "compteur", id: MERC(299) + u, valeur: mesUnites }], commentaire),
        })) : []),

        sorte === "spatial" && aScript(moi, "henry-storcher") && (jeCombats || mesPertes > 0) && {
            cle: "356",
            nom: `Henry Storcher : +${mesPertes} commerce (vos vaisseaux détruits dans ce combat)`,
            libelle: `Henry Storcher : +${mesPertes} commerce`,
            titre: "Combat spatial : son cube part dans les agents usés, 1 commerce par vaisseau que vous avez perdu dans ce combat",
            obstacles: [dejaUse(356), mesPertes === 0 && "aucun de vos vaisseaux n'a été détruit dans ce combat"],
            faire: commentaire => envoyer([
                ...userMerc(356),
                mesPertes > 0 && { type: "compteur", id: `joueur:${moi}:commerce`, delta: mesPertes },
            ].filter(Boolean), commentaire),
        },

        jeCombats && sorte === "bombardement" && aScript(moi, "skarvald") && {
            cle: "350",
            nom: "Skarvald : 3 dés à 5, 1 commerce volé par réussite à qui possède la planète",
            libelle: "Skarvald : voler du commerce (3 dés à 5)",
            titre: "Bombardement : son cube part dans les agents usés, 3 dés ; chaque 5 ou moins vole 1 commerce à la faction qui possède la planète",
            obstacles: [
                dejaUse(350),
                (!possesseur || possesseur === moi) && "aucune autre faction ne possède cette planète (les dés seront lancés pour rien)",
            ],
            faire: skarvald,
        },

        jeCombats && sorte === "spatial" && aScript(moi, "so-ata") && {
            cle: "284-designer",
            nom: "So Ata : désigner un vaisseau adverse, qui ne peut engager que les vaisseaux qui l'ont engagé",
            libelle: "So Ata : désigner un vaisseau (début du combat)",
            titre: "Début du combat spatial : son cube part dans les agents usés ; le vaisseau désigné (hors vaisseau amiral et soleil de guerre) ne peut engager que les vaisseaux qui l'ont engagé — à respecter à la main",
            obstacles: [dejaUse(284), etape > 0 && "le combat a déjà commencé"],
            faire: commentaire => {
                envoyer([...userMerc(284)], commentaire);
                aviser("So Ata : le vaisseau désigné ne peut engager que les vaisseaux qui l'ont engagé (à respecter à la main).");
            },
        },

        sorte === "spatial" && aScript(moi, "so-ata") && {
            cle: "284-capturer",
            nom: "So Ata : capturer un vaisseau adverse détruit",
            libelle: `So Ata : capturer un vaisseau détruit${capturables.length ? ` (${capturables.length})` : ""}`,
            titre: "Fin du combat spatial : son cube part dans les agents usés ; un vaisseau adverse détruit, pas encore retiré (hors vaisseau amiral et soleil de guerre), va dans vos éléments actifs",
            obstacles: [dejaUse(284), !capturables.length && "aucun vaisseau adverse détruit à capturer (avant « Retirer »)"],
            faire: commentaire => (capturables.length ? capturer(commentaire) : envoyer([...userMerc(284)], commentaire)),
        },
    ].filter(Boolean);

    // --------------------------------------------------------
    // BOUTONS D'UNITÉS ET DE TECHNOLOGIES (scripts.js)
    //
    //   Olivier Dubois (combat terrestre) : +2 à mes infanteries cochées, au plus ma
    //     capacité logistique (marque « dubois » = <lieu>:<tour>)
    //   Stratégie d'évitement (combat spatial, au début) : mes vaisseaux cochés (marque
    //     « evitement »), −1 au combat et −1 pour qui ne vise qu'eux
    //   Raid sans infanterie : une réussite capture un esclave du possesseur de la planète
    //     (compteur combat:<lieu>:esclave)
    //   Duha Menaimon (bombardement) : un dé, au plus mon niveau de connaissance génétique —
    //     un Letani est posé sur la planète (marque « duha » : le jet, puis « pose »)
    // --------------------------------------------------------

    const cochees = maSelection.map(id => parId[id]).filter(Boolean);
    const remplacerMarque = (marque, choisis) => [
        ...vaisseaux.filter(v => v.camp === moi && v.c.marques?.[marque] === CE_COMBAT && !choisis.includes(v))
            .map(v => ({ type: "marquer", c: v.id, marque, valeur: null })),
        ...choisis.map(v => ({ type: "marquer", c: v.id, marque, valeur: CE_COMBAT })),
    ];

    const infCochees = cochees.filter(v => typeUnite(v.u) === "inf");
    const clog = capaciteLogistique(moi);

    const ESCLAVE = COMBAT + ":esclave";
    const reussitesRaid = sansInfanterie
        ? vaisseaux.filter(v => v.camp === moi).reduce((n, v) => n + touchesLibres(v).length, 0)
        : 0;
    const esclavePris = possesseur && possesseur !== moi ? esclavesDe(possesseur)[0] : null;

    const duha = sorte === "bombardement" && aScript(moi, "duha-menaimon-letani")
        ? unitesDe("hex:" + numero).find(c => c.ref.id === 472 && campDe(c) === moi) : null;
    const jetDuha = duha ? Number(duha.marques?.duha) || 0 : 0;
    const niveauGen = connaissance(moi, "gen");

    const boutonsUnites = !joueur ? [] : [

        jeCombats && sorte === "terrestre" && aScript(moi, "olivier-dubois") && dansLeSysteme(moi).some(c => c.ref?.id === 745) && {
            action: "olivier-dubois",
            nom: `Olivier Dubois : +2 au combat pour ${infCochees.length} infanterie(s) cochée(s)`,
            libelle: `Olivier Dubois : +2 aux infanteries cochées (au plus ${clog})`,
            titre: "Combat terrestre : jusqu'à votre capacité logistique de vos infanteries cochées ont +2 pour ce combat (un nouveau choix remplace le précédent)",
            obstacles: [
                etape > 0 && "le combat a déjà commencé",
                !infCochees.length && "cochez d'abord vos infanteries",
                infCochees.length > clog && `au plus ${clog} infanteries (votre capacité logistique)`,
            ],
            faire: commentaire => envoyer(remplacerMarque("dubois", infCochees), commentaire),
        },

        jeCombats && sorte === "spatial" && aScript(moi, "strategie-d-evitement") && {
            action: "strategie-d-evitement",
            nom: `Stratégie d'évitement : ${cochees.length} vaisseau(x) coché(s)`,
            libelle: "Stratégie d'évitement : vaisseaux cochés",
            titre: "Début du combat spatial : vos vaisseaux militaires cochés ont −1 au combat, et −1 pour être touchés (le tireur dont le premier engagement ne vise qu'eux a −1). Un nouveau choix remplace le précédent.",
            obstacles: [
                etape > 0 && "le combat a déjà commencé",
                !cochees.length && "cochez d'abord vos vaisseaux militaires",
            ],
            faire: commentaire => envoyer(remplacerMarque("evitement", cochees), commentaire),
        },

        sansInfanterie && reussitesRaid > 0 && !etat.compteurs[ESCLAVE] && {
            action: "raid-esclave",
            nom: `Raid : capturer un esclave de ${possesseur ? nomDe(possesseur) : "personne"}`,
            libelle: "Raid : capturer un esclave",
            titre: "Raid sur une planète sans infanterie : au moins une réussite, un esclave de qui possède la planète passe dans vos éléments actifs",
            obstacles: [
                !possesseur && "personne ne possède cette planète",
                possesseur === moi && "vous possédez cette planète",
                possesseur && possesseur !== moi && !esclavePris && `${nomDe(possesseur)} n'a pas d'esclave`,
            ],
            faire: commentaire => envoyer([
                esclavePris && { type: "deplacer", c: esclavePris.id, vers: `joueur:${moi}:actif` },
                { type: "compteur", id: ESCLAVE, valeur: 1 },
            ].filter(Boolean), commentaire),
        },

        duha && !jetDuha && duha.marques?.duha === undefined && {
            action: "duha-menaimon-jet",
            nom: `Duha Menaimon : jet (au plus ${niveauGen}, votre connaissance génétique)`,
            libelle: `Duha Menaimon : jet (au plus ${niveauGen})`,
            titre: "Bombardement : un dé ; s'il fait au plus votre niveau de connaissance génétique, un Letani est posé sur la planète",
            obstacles: [niveauGen === 0 && "aucun niveau de connaissance génétique : le jet ne peut pas réussir"],
            faire: commentaire => envoyer([{ type: "des", n: 1, faces: FACES, c: duha.id, marque: "duha" }], commentaire),
        },

        duha && jetDuha > 0 && jetDuha <= niveauGen && {
            action: "duha-menaimon-letani",
            nom: "Duha Menaimon : poser un Letani sur la planète",
            libelle: `Duha Menaimon (${jetDuha}) : poser un Letani`,
            titre: "Le jet a réussi : un Letani est posé sur la planète bombardée",
            obstacles: [],
            faire: commentaire => envoyer([
                { type: "creer", ref: { type: "unit", id: 423 }, zone, proprio: moi },
                { type: "marquer", c: duha.id, marque: "duha", valeur: "pose" },
            ], commentaire),
        },
    ].filter(Boolean);

    // --------------------------------------------------------
    // UNE LIGNE DE VAISSEAU
    // --------------------------------------------------------

    function ligne(v) {

        const aMoi = v.camp === moi;
        const degat = Number(v.c.marques?.degat) || 0;
        const { valeur: resistance, bonus: blindage } = pv(v);
        const detruit = resistance > 0 && degat >= resistance;
        const indestructible = aCapacite(v, "indes");
        const engage = v.tire ? engagement(v) : [];
        const des = lireDes(v.c);
        const inverses = lireIndices(v.c, M.desF);
        const attribues = lireIndices(v.c, M.desA);

        return (
            <div
                key={v.id}
                style={{
                    padding: "3px 4px",
                    borderTop: "1px solid #ddd",
                    backgroundColor: detruit ? "#fde0e0" : undefined,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>

                    {joueur && aMoi && v.tire && (
                        <input
                            type="checkbox"
                            title="Cocher pour lui ajouter un engagement"
                            checked={selection.includes(v.id)}
                            onChange={e => setSelection(s => (e.target.checked
                                ? [...s, v.id]
                                : s.filter(x => x !== v.id)))}
                        />
                    )}

                    {/* Le vaisseau : on y dépose un dégât ; un clic ouvre sa fiche */}
                    <span
                        data-composant={v.id}
                        data-nom={v.nom}
                        title={"Déposer ici un dégât. Clic : fiche de l'unité." +
                            (horsFiche(v) ? " Unité hors fiche de faction." : "")}
                        style={{
                            padding: "1px 8px",
                            borderRadius: 9,
                            border: "2px solid " + (couleurDe(v.camp) || "#888"),
                            boxShadow: horsFiche(v) ? "0 0 0 3px " + DORE : undefined,
                            backgroundColor: "#fff",
                            fontWeight: "bold",
                            cursor: "pointer",
                            userSelect: "none",
                            textDecoration: detruit ? "line-through" : undefined,
                        }}
                    >
                        {v.nom}
                    </span>

                    <span style={{ fontSize: 12, color: "#444" }}>
                        {v.tire && attaque(v) > 0 && nombreDes(v) > 0
                            ? `${NOM_ATTAQUE[sorte]} ${attaque(v)}${nombreDes(v) > 1 ? " ×" + nombreDes(v) : ""}`
                            : (v.tire && attaque(v) > 0 ? "aucune attaque (niveau de connaissance à 0)" : "sans attaque")}
                        {" · "}rés. {blindage
                            ? <b data-resistance-modifiee title={`Blindage en duranium : ${resistance - blindage} + ${blindage}`} style={{ color: "#1b5e20" }}>{resistance} (+{blindage})</b>
                            : resistance}
                        {/* Tireur à distance : dit d'où il tire */}
                        {v.tire && !v.cible && v.c.zone !== "hex:" + numero && ` · ${nomLieu(v.c.zone)}`}
                    </span>

                    {/* Bonus / malus manuels : valeur de combat, nombre d'attaques */}
                    {v.tire && attaque(v) > 0 && [
                        [M.ajust, "valeur", "à la valeur de combat (touche sur la valeur ou moins)"],
                        [M.ajustN, "attaques", "au nombre d'attaques"],
                    ].map(([marque, nom, titre]) => {
                        const n = Number(v.c.marques?.[marque]) || 0;

                        return (joueur || n !== 0) && (
                            <span
                                key={marque}
                                data-ajustement={marque}
                                title={"Bonus ou malus manuel " + titre}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 2,
                                    fontSize: 11,
                                    color: n ? "#a15c00" : "#666",
                                    fontWeight: n ? "bold" : "normal",
                                }}
                            >
                                {joueur && (
                                    <button type="button" style={{ ...styleBouton, padding: "0 4px" }} onClick={() => ajuster(v, marque, -1)}>−</button>
                                )}
                                {nom} {n > 0 ? "+" : ""}{n}
                                {joueur && (
                                    <button type="button" style={{ ...styleBouton, padding: "0 4px" }} onClick={() => ajuster(v, marque, 1)}>+</button>
                                )}
                            </span>
                        );
                    })}

                    {/* Bonus et malus des scripts, déjà comptés dans la valeur pour toucher */}
                    {bonusScripts(v).map(([n, nom]) => (
                        <span key={nom} data-bonus-script={n} style={{ fontSize: 11, fontWeight: "bold", color: n > 0 ? "#1b5e20" : "#b71c1c" }}>
                            {n > 0 ? "+" : "−"}{Math.abs(n)} {nom}
                        </span>
                    ))}

                    {degat > 0 && <b style={{ color: "#c00" }}>✹{degat}</b>}

                    {aFrappePreventive(v) && !attaqueEnDernier(v) && (
                        <span style={{ fontSize: 11, color: "#6a1b9a" }}>frappe en premier</span>
                    )}

                    {attaqueEnDernier(v) && (
                        <span data-attaque-en-dernier style={{ fontSize: 11, color: "#6a1b9a" }}>attaque en dernier</span>
                    )}

                    {detruit && (
                        <b style={{ color: "#c00" }}>{indestructible ? "désactivé" : "détruit"}</b>
                    )}

                    {/* Script Médecine : une de mes unités biologiques détruite peut être capturée
                        (sauvée) sur un jet de 5 ou moins — elle va alors dans mes éléments actifs */}
                    {joueur && detruit && !indestructible && medecine(v) && !jetMedecine(v) && (
                        <button
                            type="button"
                            data-action="medecine-jet"
                            style={styleBouton}
                            onClick={() => envoyer([{ type: "des", n: 1, faces: 10, c: v.id, marque: "medecine" }], "Médecine : jet de capture")}
                        >
                            Médecine : jet (5 ou moins)
                        </button>
                    )}

                    {joueur && detruit && !indestructible && medecine(v) && jetMedecine(v) > 0 && (
                        <b style={{ color: jetMedecine(v) <= 5 ? "#1b5e20" : "#b71c1c" }}>Médecine : {jetMedecine(v)}</b>
                    )}

                    {joueur && detruit && !indestructible && medecine(v) && jetMedecine(v) > 0 && jetMedecine(v) <= 5 && (
                        <button
                            type="button"
                            data-action="medecine-capturer"
                            style={styleBouton}
                            onClick={() => envoyer([
                                { type: "marquer", c: v.id, marque: "degat", valeur: 0 },
                                { type: "marquer", c: v.id, marque: "medecine", valeur: null },
                                { type: "deplacer", c: v.id, vers: `joueur:${moi}:actif` },
                            ], `Médecine : ${v.nom} capturée (éléments actifs)`)}
                        >
                            Capturer
                        </button>
                    )}

                    {/* Memoria D : une de mes infanteries détruites, sauvée sur un jet de 6 ou moins */}
                    {joueur && detruit && sauvableMemoria(v) && !jetMemoria(v) && (
                        <button
                            type="button"
                            data-action="memoria-jet"
                            style={styleBouton}
                            onClick={() => envoyer([{ type: "des", n: 1, faces: FACES, c: v.id, marque: "memoria" }], "Memoria D : jet de sauvetage")}
                        >
                            Memoria D : jet (6 ou moins)
                        </button>
                    )}

                    {joueur && detruit && sauvableMemoria(v) && jetMemoria(v) > 0 && (
                        <b style={{ color: sauveeMemoria(v) ? "#1b5e20" : "#b71c1c" }}>Memoria D : {jetMemoria(v)}</b>
                    )}

                    {joueur && detruit && sauveeMemoria(v) && (
                        <button
                            type="button"
                            data-action="memoria-sauver"
                            style={styleBouton}
                            onClick={() => envoyer([
                                { type: "marquer", c: v.id, marque: "degat", valeur: 0 },
                                { type: "marquer", c: v.id, marque: "memoria", valeur: null },
                                { type: "deplacer", c: v.id, sur: memoriaD.id },
                            ], `Memoria D : ${v.nom} sauvée, posée à bord`)}
                        >
                            Poser sur Memoria D
                        </button>
                    )}

                    {/* Frégate du khan détruite : son destructeur lance la riposte */}
                    {detruit && khanEnAttente(v) && !jetKhan(v) && (joueur && auteurDesDegats(v.c) === moi
                        ? (
                            <button
                                type="button"
                                data-action="riposte-khan-jet"
                                style={styleBouton}
                                onClick={() => envoyer([{ type: "des", n: 1, faces: FACES, c: v.id, marque: "khan" }],
                                    `Frégate du khan : riposte contre ${nomDe(moi)}`)}
                            >
                                Riposte du khan : jet ({seuilKhan(v)} ou moins)
                            </button>
                        )
                        : <i style={{ fontSize: 12 }}>riposte du khan à lancer par {nomCamp(auteurDesDegats(v.c))}</i>)}

                    {estFregateKhan(v) && detruit && jetKhan(v) > 0 && (
                        <b data-riposte-khan={jetKhan(v)} style={{ color: jetKhan(v) <= seuilKhan(v) ? "#b71c1c" : "#1b5e20" }}>
                            Riposte du khan : {jetKhan(v)}{jetKhan(v) <= seuilKhan(v)
                                ? (v.c.marques?.khanPris ? " (encaissée)" : ` — 1 dégât pour ${nomCamp(auteurDesDegats(v.c))}`)
                                : " (manquée)"}
                        </b>
                    )}

                    {joueur && aMoi && v.cible && !detruit && ripostesKhan(moi).length > 0 && (
                        <button
                            type="button"
                            data-action="riposte-khan-encaisser"
                            title="Cette unité prend le dégât de la riposte d'une frégate du khan"
                            onClick={() => {
                                const fregate = ripostesKhan(moi)[0];

                                envoyer([
                                    { type: "marquer", c: v.id, marque: "degatDe", valeur: "c" + fregate.camp },
                                    { type: "marquer", c: v.id, marque: "degat", valeur: degat + 1, si: degat },
                                    { type: "marquer", c: fregate.id, marque: "khanPris", valeur: 1 },
                                ], `Riposte du khan : ${v.nom} encaisse 1 dégât`);
                            }}
                            style={{ ...styleBouton, backgroundColor: "#6a1b9a", color: "#fff", fontWeight: "bold" }}
                        >
                            ✹ Riposte du khan
                        </button>
                    )}

                    {joueur && detruit && !indestructible && !khanEnAttente(v) && !sauveeMemoria(v) &&
                        !(medecine(v) && jetMedecine(v) > 0 && jetMedecine(v) <= 5) && (
                        <button
                            type="button"
                            style={styleBouton}
                            title={butinDe(v)?.texte}
                            onClick={() => retirer([v])}
                        >
                            Retirer{captureePar(v) !== null ? " (capturé)" : (butinDe(v) ? " (butin)" : "")}
                        </button>
                    )}

                    {/* Cible spécifique pour mes vaisseaux cochés */}
                    {joueur && !aMoi && v.cible && maSelection.length > 0 && (
                        <button
                            type="button"
                            style={styleBouton}
                            title="Mes unités cochées engagent cette unité précise (−2 pour toucher)"
                            onClick={() => engager("@" + v.id)}
                        >
                            Cibler
                        </button>
                    )}

                    {/* Mon unité est visée par des dégâts : je choisis qu'elle en prenne un */}
                    {joueur && aMoi && aEncaisser(v).length > 0 && (
                        <button
                            type="button"
                            data-action="encaisser"
                            title="Cette unité prend un des dégâts qui la visent (à vous de les répartir entre vos unités visées)"
                            onClick={() => encaisser(v)}
                            style={{ ...styleBouton, backgroundColor: "#c62828", color: "#fff", fontWeight: "bold" }}
                        >
                            ✹ Encaisser 1 (sur {aEncaisser(v).length})
                        </button>
                    )}

                    {/* J.N.S. Hylarim, Bouclier mobile, Système de défense : annuler une touche */}
                    {joueur && aMoi && aEncaisser(v).length > 0 && annuleurs(v).length > 0 && (
                        <BoutonRegle
                            data-action="annuler-touche"
                            nom={`Annuler une touche sur ${v.nom} (${nomElement(search, annuleurs(v)[0].ref)}, 1 ressource)`}
                            obstacles={[(Number(etat.compteurs[`joueur:${moi}:res`]) || 0) < 1 && "vous n'avez pas de ressource"]}
                            faire={commentaire => annuler(v, commentaire)}
                            title={`${nomElement(search, annuleurs(v)[0].ref)} : 1 ressource, un des dégâts qui visent cette unité est annulé`}
                            style={styleBouton}
                        >
                            Annuler 1 (1 ressource)
                        </BoutonRegle>
                    )}
                </div>

                {/* ENGAGEMENTS, dans l'ordre */}

                {engage.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2, fontSize: 12 }}>
                        <span style={{ color: "#666" }}>engage :</span>

                        {engage.map((code, k) => (
                            <span
                                key={code}
                                style={{
                                    padding: "0 5px",
                                    borderRadius: 8,
                                    border: "1px solid #999",
                                    backgroundColor: code.startsWith("@") ? "#fff3cd" : "#eef3f8",
                                }}
                            >
                                {k + 1}. {libelle(code)}
                                {joueur && aMoi && (
                                    <>
                                        {" "}
                                        <button
                                            type="button"
                                            title="Remonter"
                                            style={{ ...styleBouton, padding: "0 3px" }}
                                            onClick={() => monter(v, code)}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            title="Ne plus engager"
                                            style={{ ...styleBouton, padding: "0 3px" }}
                                            onClick={() => retirerEngagement(v, code)}
                                        >
                                            ×
                                        </button>
                                    </>
                                )}
                            </span>
                        ))}

                        {malus(v) > 0 && <span data-malus-visee={malus(v)} style={{ color: "#a15c00" }}>(−{malus(v)} pour toucher)</span>}
                    </div>
                )}

                {/* DÉS : vert = touche. Ctrl + clic inverse. Le dégât d'un dé
                    qui touche se glisse sur un vaisseau. */}

                {des.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 3 }}>
                        <span style={{ fontSize: 12, color: "#666" }}>
                            dés (touche sur {seuil(v)} ou moins) :
                        </span>

                        {des.map((valeur, k) => {
                            const touche = (valeur <= seuil(v)) !== inverses.includes(k);

                            return (
                                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                    <span
                                        title="Ctrl + clic : réussite ↔ échec"
                                        onClick={event => {
                                            if (joueur && event.ctrlKey) {
                                                inverser(v, k);
                                            }
                                        }}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 24,
                                            height: 24,
                                            borderRadius: 5,
                                            border: "2px solid " + (touche ? "#1b5e20" : "#888"),
                                            backgroundColor: touche ? "#a5d6a7" : "#e0e0e0",
                                            color: "#000",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                    >
                                        {valeur}
                                    </span>

                                    {touche && !attribues.includes(k) && (
                                        <span
                                            data-degat={`${v.id}:${k}:${M.desA}${degatsVerts(v) ? ":vert" : ""}`}
                                            data-nom="Dégât"
                                            title={degatsVerts(v)
                                                ? "Dégât de Bombe bactériologique : s'il détruit une infanterie biologique, deux autres identiques sont détruites"
                                                : "Dégât : le glisser sur le vaisseau touché"}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 22,
                                                height: 22,
                                                borderRadius: "50%",
                                                backgroundColor: degatsVerts(v) ? "#2e7d32" : "#c62828",
                                                color: "#fff",
                                                fontWeight: "bold",
                                                cursor: "grab",
                                                userSelect: "none",
                                                touchAction: "none",
                                            }}
                                        >
                                            ✹
                                        </span>
                                    )}

                                    {touche && attribues.includes(k) && (
                                        <span title="Dégât attribué" style={{ color: "#1b5e20", fontWeight: "bold" }}>✓</span>
                                    )}
                                </span>
                            );
                        })}

                        {/* Où vont ses dégâts restants : son premier engagement encore debout */}
                        {touchesLibres(v).length > 0 && (
                            <span data-destination={cibleActuelle(v) || "perdu"} style={{ fontSize: 12, color: "#a15c00" }}>
                                {cibleActuelle(v)
                                    ? `→ à encaisser par : ${libelle(cibleActuelle(v))}`
                                    : "→ perdus (plus aucune cible engagée debout)"}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // --------------------------------------------------------
    // RENDU
    // --------------------------------------------------------

    const titre = `${SORTES[sorte]} — ` +
        (planete !== null ? `${(laPlanete?.name || "planète " + (planete + 1)).replace(/^!([^!]*)!/, "")}, ` : "") +
        `${(systeme?.name || "système").replace(/^!([^!]*)!/, "")}, ${nomCase(numero)}`;

    if (Number(etat.compteurs[COMBAT]) === 2) {
        return <CombatResolu lieu={lieu} compteur={COMBAT} titre={titre} />;
    }

    // Tirer avec un de mes canons spatiaux : un amiral est usé (et un scientifique
    // au-delà de sa portée, script Laser longue portée), un marqueur d'activation
    // est posé sur le canon, qui rejoint les tireurs
    const amiral = agentDisponible({ index, moi, search }, "amiral");
    const scientifique = agentDisponible({ index, moi, search }, "scientifique");

    const tirerAvec = (c, commentaire) => envoyer([
        amiral && { type: "deplacer", c: amiral.id, vers: `joueur:${moi}:agentsUses` },
        aPortee(c) === "scientifique" && scientifique && { type: "deplacer", c: scientifique.id, vers: `joueur:${moi}:agentsUses` },
        { type: "creer", jeton: ACTIVATION, sur: c.id },
        { type: "marquer", c: c.id, marque: "canon", valeur: 1 },
    ], commentaire);

    const mesCanons = canonsEnAttente.filter(c => campDe(c) === moi);

    return (
        <div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 8,
                    padding: 6,
                    border: "1px solid #aaa",
                    borderRadius: 8,
                    backgroundColor: "#f5f5f5",
                }}
            >
                <b style={{ fontSize: 16 }}>{titre}</b>

                {/* Les quatre phases du combat : celle en cours est en gras. Les
                    attaques d'une phase partent quand tout le monde est prêt. */}
                <span data-phase-combat={phaseCombat} style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
                    {PHASES_COMBAT.slice(0, avecDerniers ? 6 : 4).map((nom, k) => (
                        <span
                            key={nom}
                            style={{
                                padding: "1px 8px",
                                borderRadius: 10,
                                border: "1px solid " + (k + 1 === phaseCombat ? "#b71c1c" : "#bbb"),
                                backgroundColor: k + 1 === phaseCombat ? "#ffcdd2" : (k + 1 < phaseCombat ? "#e0e0e0" : "#fff"),
                                color: k + 1 < phaseCombat ? "#777" : "#000",
                                fontWeight: k + 1 === phaseCombat ? "bold" : "normal",
                                // Sans unité à frappe en premier, ses deux phases sont sautées
                                textDecoration: k < 2 && sansPreventive ? "line-through" : undefined,
                                fontSize: 13,
                            }}
                        >
                            {k + 1}. {nom}
                        </span>
                    ))}
                </span>

                <span>
                    {etape === 0 && "Engagements, puis « Prêt au combat »."}
                    {etape > 0 && "Chacun encaisse les dégâts qu'il reçoit."}
                    {etape < etapeFinale && (
                        <>
                            {" "}Quand tout le monde est prêt :{" "}
                            <b>
                                {enPreventive ? "frappe en premier" : (enDerniers ? "dernières attaques" : "autres attaques")}
                                {" "}({prochains.length} unité{prochains.length > 1 ? "s" : ""})
                            </b>
                            .
                        </>
                    )}
                    {perdus > 0 && <span style={{ color: "#a15c00" }}> {perdus} dégât(s) perdu(s), sans cible.</span>}
                </span>

                {jeCombats && etape < etapeFinale && (
                    <button
                        type="button"
                        onClick={basculerPret}
                        title={estPret(moi)
                            ? "Vous êtes prêt : cliquer pour ne plus l'être"
                            : "Quand tous les joueurs du combat sont prêts, les attaques partent"}
                        style={{
                            fontWeight: "bold",
                            padding: "4px 12px",
                            backgroundColor: estPret(moi) ? "#2e7d32" : "#ffe082",
                            color: estPret(moi) ? "#fff" : "#000",
                        }}
                    >
                        {estPret(moi) ? "Prêt ✔" : "Prêt au combat"}
                    </button>
                )}

                {/* Tout le monde est prêt mais rien n'est parti (deux « prêt »
                    en même temps) : n'importe qui lance */}
                {joueur && etape < etapeFinale && tousPrets && (
                    <button
                        type="button"
                        style={{ fontWeight: "bold" }}
                        onClick={() => envoyer(lancement(), titreLancement)}
                    >
                        Lancer les attaques
                    </button>
                )}

                {joueur && (
                    <>
                        {/* Retire d'un coup toutes les unités détruites du combat */}
                        <button
                            type="button"
                            disabled={!aRetirer.length}
                            title="Retire du jeu toutes les unités détruites de ce combat (pas les unités indestructibles, qui sont seulement désactivées)"
                            onClick={() => retirer(aRetirer)}
                        >
                            Retirer tous les détruits{aRetirer.length ? ` (${aRetirer.length})` : ""}
                        </button>

                        {/* Mercenaires de combat : un bouton par mercenaire dont j'ai la carte */}
                        {boutonsMercenaires.map(b => (
                            <BoutonRegle
                                key={b.cle}
                                data-action={"mercenaire-" + b.cle}
                                nom={b.nom}
                                obstacles={b.obstacles}
                                faire={b.faire}
                                title={b.titre}
                            >
                                {b.libelle}
                            </BoutonRegle>
                        ))}

                        {/* Unités et technologies : Olivier Dubois, Stratégie d'évitement, raid, Duha Menaimon */}
                        {boutonsUnites.map(b => (
                            <BoutonRegle
                                key={b.action}
                                data-action={b.action}
                                nom={b.nom}
                                obstacles={b.obstacles}
                                faire={b.faire}
                                title={b.titre}
                            >
                                {b.libelle}
                            </BoutonRegle>
                        ))}

                        {/* Duha Menaimon : jet manqué, ou Letani posé */}
                        {duha && jetDuha > niveauGen && <b data-jet-duha={jetDuha} style={{ color: "#b71c1c" }}>Duha Menaimon : {jetDuha} (manqué)</b>}
                        {duha && duha.marques?.duha === "pose" && <b style={{ color: "#1b5e20" }}>Duha Menaimon : Letani posé</b>}

                        {/* Script Récupération : une case par joueur qui a la technologie */}
                        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            {recuperateurs.map(u => (
                                <label
                                    key={u}
                                    data-recuperation={u}
                                    title="Récupération : à la fin du combat, si vous dominez le système, +1 ressource par vaisseau détruit pendant ce combat"
                                    style={{ fontSize: 12 }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={recupCochee(u)}
                                        disabled={u !== moi}
                                        onChange={() => envoyer([{ type: "compteur", id: RECUP + u, valeur: recupCochee(u) ? 2 : 0 }], "")}
                                    />{" "}
                                    Récupération ({nomDe(u)}) : +{epaves}
                                </label>
                            ))}

                            <button type="button" data-action="terminer-combat" onClick={terminer}>
                                Terminer le combat
                            </button>
                        </span>
                    </>
                )}
            </div>

            <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>
                Cocher ses unités qui tirent, puis « Engager » une faction ou « Cibler » une unité
                précise (−2 pour toucher), puis « Prêt au combat ». Un dé vert touche (valeur de combat
                ou moins) ; Ctrl + clic l'inverse. Chacun répartit les dégâts qu'il reçoit : « ✹ Encaisser »
                sur ses unités visées ; le surplus passe à l'engagement suivant du tireur. Les neutres
                encaissent d'office. Le dégât rouge d'un dé se glisse toujours à la main sur une unité.
            </div>

            {/* Raid : bombardement spécial (#raid) */}
            {sorte === "raid" && (
                <div data-raid style={{ fontSize: 13, marginBottom: 6, padding: "4px 8px", border: "1px solid #6a1b9a", borderRadius: 6 }}>
                    <b>Raid</b> (après les bombardements) : seules les infanteries sont des cibles, et chaque
                    infanterie touchée est capturée — elle part dans les éléments actifs du raideur (un esclave).
                    S'il y a sur la planète des unités militaires qui ne sont pas des infanteries, il faut cibler.
                    {sansInfanterie && " Aucune infanterie : les raideurs tirent sans engager ; une réussite capture un esclave de qui possède la planète."}
                </div>
            )}

            {vaisseaux.length === 0 && (
                <i style={{ color: "#666" }}>Aucune unité dans ce combat.</i>
            )}

            {/* Canons spatiaux : mes canons à portée, à choisir pour tirer */}
            {sorte === "canons" && joueur && mesCanons.length > 0 && (
                <div
                    data-canons-accessibles
                    style={{ marginBottom: 8, padding: "6px 10px", border: "2px solid #b71c1c", borderRadius: 8, backgroundColor: "#fff", fontSize: 13 }}
                >
                    <b>Mes canons spatiaux à portée</b>{" "}
                    <span style={{ color: "#555" }}>
                        — en choisir un le fait tirer : un amiral est utilisé et un marqueur d'activation posé dessus.
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 4 }}>
                        {mesCanons.map(c => (
                            <span key={c.id} data-canon={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <b>{nomElement(search, c.ref)}</b>
                                <span style={{ color: "#444" }}>
                                    {nomLieu(c.zone)}, distance {distanceDe(c)}, canon {canonDe(c)[0]}{canonDe(c)[1] > 1 ? " ×" + canonDe(c)[1] : ""}
                                </span>
                                <BoutonRegle
                                    data-action="tirer-canon"
                                    nom={`Canon spatial : ${nomElement(search, c.ref)} tire (${nomLieu(c.zone)}, distance ${distanceDe(c)})`}
                                    obstacles={[
                                        !amiral && "vous n'avez pas d'amiral disponible (aucun ne sera usé)",
                                        aPortee(c) === "scientifique" && !scientifique &&
                                            "Laser longue portée : il faut aussi un scientifique disponible pour tirer à cette distance",
                                    ]}
                                    faire={commentaire => tirerAvec(c, commentaire)}
                                    title="Use un amiral et pose un marqueur d'activation sur ce canon : il rejoint les tireurs"
                                    style={styleBouton}
                                >
                                    Tirer (use un amiral{aPortee(c) === "scientifique" ? " et un scientifique" : ""})
                                </BoutonRegle>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Script Capsule de secours : infanteries des vaisseaux détruits */}
            {(sorte === "spatial" || sorte === "canons") && (
                <Sauvetage
                    numero={numero}
                    navires={vaisseaux.filter(estDetruit).map(v => v.c)}
                    planetes={(systeme?.elems || []).map((lien, k) => (lien?.id > 0 ? k : -1)).filter(k => k >= 0)}
                />
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 8 }}>
                {camps.map(camp => (
                    <div
                        key={camp}
                        style={{
                            border: "3px solid " + (couleurDe(camp) || "#888"),
                            borderRadius: 8,
                            padding: 6,
                            backgroundColor: "#fafafa",
                        }}
                    >
                        <b style={{ fontSize: 15 }}>{nomCamp(camp)}</b>
                        {camp !== NEUTRE && (
                            <span style={{ color: "#666", fontSize: 12 }}> · initiative {rang(camp) === 99 ? "?" : rang(camp)}</span>
                        )}

                        {camp !== NEUTRE && etape < etapeFinale && (
                            <b style={{ marginLeft: 8, fontSize: 12, color: estPret(camp) ? "#2e7d32" : "#a15c00" }}>
                                {estPret(camp) ? "✔ prêt" : "pas encore prêt"}
                            </b>
                        )}

                        {/* Dégâts que ce camp doit encore répartir entre ses unités */}
                        {aRepartir(camp) > 0 && (
                            <b data-a-encaisser={camp} style={{ marginLeft: 8, fontSize: 12, color: "#c62828" }}>
                                ✹ {aRepartir(camp)} dégât{aRepartir(camp) > 1 ? "s" : ""} à encaisser
                            </b>
                        )}

                        {/* Neutres : appliqués d'office ; le bouton sert si rien n'est parti */}
                        {camp === NEUTRE && joueur && degatsNeutres.length > 0 && (
                            <button
                                type="button"
                                data-action="degats-neutres"
                                style={{ ...styleBouton, marginLeft: 8 }}
                                title="Les dégâts vont d'abord à l'unité neutre la moins résistante ; une unité est achevée avant la suivante"
                                onClick={appliquerAuxNeutres}
                            >
                                Appliquer aux neutres ({degatsNeutres.length})
                            </button>
                        )}

                        {/* Tireurs à distance (bombardiers, canons) : ils ne sont pas des
                            cibles. Puis les cibles, militaires et non militaires. */}
                        {[null, true, false].map(militaire => {

                            const bloc = vaisseaux.filter(v => v.camp === camp && (militaire === null
                                ? !v.cible
                                : v.cible && v.militaire === militaire));

                            if (!bloc.length) {
                                return null;
                            }

                            return (
                                <div key={String(militaire)} style={{ marginTop: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <b style={{ fontSize: 13 }}>
                                            {militaire === null
                                                ? NOM_TIREURS[sorte]
                                                : (militaire ? "Militaires" : "Non militaires")} ({bloc.length})
                                        </b>

                                        {joueur && militaire !== null && camp !== moi && maSelection.length > 0 && (
                                            <button
                                                type="button"
                                                style={styleBouton}
                                                title={militaire
                                                    ? "Mes unités cochées engagent les militaires de cette faction"
                                                    : "Mes unités cochées engagent ses non-militaires (après ses militaires)"}
                                                onClick={() => engager(codeCamp(camp, militaire))}
                                            >
                                                Engager
                                            </button>
                                        )}
                                    </div>

                                    {bloc.map(ligne)}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
