import { useEffect, useRef, useState } from "react";
import { useEngine, nomElement, nomCase, distanceCases, DORE, confirmerRegle } from "./Interaction";
import { useElement, useElements, contenuEnCache } from "./sync";
import { resistanceDe } from "./effets";
import { Sauvetage } from "./Sauvetage";
import { MARQUEUR } from "./miseEnPlace";
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
//
// Compteurs : combat:<lieu> (1 = en cours),
//   combat:<lieu>:etape     0 engagements, 1 frappe en premier lancée, 2 tout lancé
//   combat:<lieu>:pret:<u>  le joueur u est prêt
export const cleCombat = lieu => "combat:" + lieu;

const RE_LIEU = /^(\d+)(?:p(\d+))?([bc])?$/;

export const SORTES = {
    spatial: "Combat spatial",
    canons: "Canons spatiaux",
    terrestre: "Combat terrestre",
    bombardement: "Bombardement",
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
            : (m[3] === "b" ? "bombardement" : "terrestre"),
        zone: planete === null ? "hex:" + numero : `hex:${numero}:planete:${planete}`,
    };
}

// Lieux des combats en cours
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

    const zones = l.sorte === "bombardement" ? [l.zone, "hex:" + l.numero] : [l.zone];

    return zones.some(zone => (index.parZone.get(zone) || [])
        .some(c => c.ref?.type === "unit" && (c.marques?.possession ?? c.proprio) === userId));
}

// Capacité d'attaque à distance d'une unité : #bomb(5,2) -> [5, 2]
function capacite(u, cle) {
    const m = new RegExp(`#${cle}\\((\\d+)(?:,\\s*(\\d+))?\\)`, "i").exec(u?.habilite || "");
    return m ? [Number(m[1]), Number(m[2]) || 1] : null;
}

// Camp des unités sans propriétaire
const NEUTRE = 0;

const FACES = 10;

const liste = valeur => String(valeur ?? "").split(",").filter(x => x !== "");

// Marques d'un combat sur une unité. Chaque sorte de combat a les siennes
// (engage, engageC, engageT, engageB...) : une unité peut être dans un
// combat spatial et dans un bombardement sans que les deux se mélangent.
const SUFFIXE = { spatial: "", canons: "C", terrestre: "T", bombardement: "B" };

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
const PHASES_COMBAT = [
    "Frappe en premier",
    "Dégâts de la frappe en premier",
    "Autres attaques",
    "Dégâts",
];

// Libellés selon la sorte de combat
const NOM_ATTAQUE = { spatial: "att.", terrestre: "att.", bombardement: "bomb.", canons: "canon" };
const NOM_TIREURS = { spatial: "Tirent", terrestre: "Tirent", bombardement: "Bombardent", canons: "Canons" };

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

    // Combat affiché : celui qu'on a choisi, sinon le premier où j'ai des unités
    const choisi = combats.includes(combatVu)
        ? combatVu
        : (combats.find(n => aDesUnites(index, n, moi)) ?? combats[0]);

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
                                backgroundColor: avecMoi ? COULEUR_COMBAT.avecMoi : COULEUR_COMBAT.sansMoi,
                            }}
                        >
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

    const { etat, index, jouer, envoyer, joueur, moi, partie, search, nomDe, couleurDe, signaler, aScript } = useEngine();

    // zone : celle des cibles (espace du système, ou planète)
    const { numero, planete, sorte, zone } = lireLieu(lieu);

    // Compteurs de ce combat
    const COMBAT = cleCombat(lieu);
    const ETAPE = COMBAT + ":etape";
    const PRET = COMBAT + ":pret:";

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

    if (sorte === "bombardement") {
        aDistance.push(...unitesDe("hex:" + numero));
    }

    if (sorte === "canons") {
        for (const z of index.parZone.keys()) {
            const m = /^hex:(\d+)(:planete:\d+)?$/.exec(z);

            if (m && distanceCases(numero, Number(m[1])) <= 1) {
                aDistance.push(...unitesDe(z));
            }
        }
    }

    const unites = [...new Map([...unitesDe(zone), ...aDistance].map(c => [c.id, c])).values()];
    const contenus = useElements(unites.map(c => c.ref.id));

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
                tire = cible && militaire;
                [att, nb] = [u.combat, u.combat_touche];
            } else {
                const tir = capacite(u, sorte === "bombardement" ? "bomb" : "can");

                tire = !!tir;
                cible = ici && (sorte === "bombardement" || mots.includes("ship"));
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

        if (mots.includes("def")) {
            return campsJoueurs
                .filter(u => vaisseaux.some(x => x.camp === u && lireEngagement(x.c).some(e =>
                    e === "n" || e === "N" || (e.startsWith("@") && parId[e.slice(1)]?.camp === NEUTRE))))
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

    function retirer(v, code) {

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
    const nombreDes = v => Math.max(1, v.nb + ajustN(v));

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

    // (scripts : Avantage aérien pour les infanteries au combat terrestre, Stratégie de saut)
    const aFrappePreventive = v => aCapacite(v, "fpre") || aSaute(v) ||
        (sorte === "terrestre" && v.u.type === "inf" && v.camp !== NEUTRE && aScript(v.camp, "avantage-aerien"));

    // Cible spécifique : -2 pour toucher, sauf capacité de précision
    // (script Stratégie dominante de la cible : -2 de plus)
    const malus = v => {
        const cible = engagement(v).find(e => e.startsWith("@"));

        if (!cible || aCapacite(v, "prec")) {
            return 0;
        }

        const camp = parId[cible.slice(1)]?.camp;

        return 2 + (camp && aScript(camp, "strategie-dominante") ? 2 : 0);
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
            (sorte === "canons" || sorte === "bombardement") && a("systeme-de-visee") && [1, "Système de visée"],
            sorte === "canons" && campVise(v) && aScript(campVise(v), "bouclier-deflecteur") && [-1, "Bouclier déflecteur"],
            sorte === "bombardement" && possesseur && possesseur !== v.camp && aScript(possesseur, "batiment-resistant") && [
                unitesDe(zone).some(c => campDe(c) === possesseur && contenuDe(c)?.mot_cle?.includes("struc")) ? -2 : -1,
                "Bâtiment résistant",
            ],
        ].filter(Boolean);
    }

    // Le dé touche s'il fait le seuil ou moins
    const seuil = v => attaque(v) - malus(v) + ajust(v) + bonusScripts(v).reduce((s, [n]) => s + n, 0);

    // Résistance d'une unité, Blindage en duranium compris : { valeur, bonus }
    const pv = v => resistanceDe(v.u, v.camp, aScript);

    const estDetruit = v => {
        const resistance = pv(v).valeur;
        return resistance > 0 && (Number(v.c.marques?.degat) || 0) >= resistance;
    };

    // Unités détruites à retirer du jeu (bouton « Retirer tous les détruits »)
    const aRetirer = vaisseaux.filter(v => estDetruit(v) && !aCapacite(v, "indes"));

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
    const estFurtif = x => sorte === "spatial" && x.cible && engagement(x).length === 0 &&
        (aCapacite(x, "furtif") || (x.camp !== NEUTRE && aScript(x.camp, "camouflage")));

    const ciblesDe = code => {

        if (code.startsWith("@")) {
            return [parId[code.slice(1)]].filter(Boolean);
        }

        const militaire = code === "n" || code[0] === "j";
        const camp = code === "n" || code === "N" ? NEUTRE : Number(code.slice(1));

        return vaisseaux.filter(x => x.cible && x.camp === camp && x.militaire === militaire && !estFurtif(x));
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
    const aEncaisser = x => (x.cible && debout(x)
        ? [...(enAttente["@" + x.id] || []), ...(enAttente[codeCamp(x.camp, x.militaire)] || [])]
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

        for (const { x, v, k } of couples) {
            parTireur.set(v.id, [...(parTireur.get(v.id) || lireIndices(v.c, M.desA)), k]);
            parCible.set(x.id, (parCible.get(x.id) || 0) + 1);
        }

        return [
            ...[...parTireur].map(([id, indices]) => ({
                ...marquer(id, M.desA, indices),
                si: parId[id].c.marques?.[M.desA] ?? 0,
            })),
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
    const tireurs = vaisseaux.filter(v =>
        v.tire && attaque(v) > 0 && engagement(v).length > 0 && !estDetruit(v));

    const preventifs = tireurs.filter(aFrappePreventive);
    const autres = tireurs.filter(v => !aFrappePreventive(v));

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
    // attaques partent, en deux temps (compteur combat:etape) :
    //
    //   0  engagements        -> la frappe en premier part (1)
    //   1  frappe en premier  -> les autres attaques partent (2)
    //   2  tout est lancé
    //
    // Sans vaisseau à frappe en premier, on passe de 0 à 2. Entre les
    // deux temps, les joueurs répartissent les dégâts : un vaisseau
    // détruit par la frappe en premier ne tire pas.
    // --------------------------------------------------------

    const etape = Number(etat.compteurs[ETAPE]) || 0;
    const estPret = u => !!etat.compteurs[PRET + u];
    const tousPrets = campsJoueurs.length > 0 && campsJoueurs.every(estPret);
    const jeCombats = joueur && campsJoueurs.includes(moi);

    const enPreventive = etape === 0 && preventifs.length > 0;
    const prochains = enPreventive ? preventifs : autres;

    // Phase affichée (1 à 4, PHASES_COMBAT). Avant un lancement, c'est la
    // phase d'attaque qui va partir ; après, celle des dégâts.
    const phaseCombat = etape === 0 ? (enPreventive ? 1 : 3) : etape * 2;

    // Aucune unité du combat n'a la frappe en premier : les phases 1 et 2 n'ont pas lieu
    const sansPreventive = !vaisseaux.some(v => v.tire && attaque(v) > 0 && aFrappePreventive(v));

    // Toutes les attaques de l'étape, et plus personne n'est prêt
    const lancement = () => [
        ...campsJoueurs.filter(estPret).map(u => ({ type: "compteur", id: PRET + u, valeur: 0 })),
        // (si : refusé si un autre joueur vient de lancer la même étape —
        // les dés ne sont pas relancés par un double clic)
        { type: "compteur", id: ETAPE, valeur: enPreventive ? 1 : 2, si: etape },
        ...jets(prochains),
    ];

    const titreLancement = enPreventive ? "Combat : frappe en premier" : "Combat : attaques";

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
            // Compteurs des scripts de ce combat (Écoles militaires, Récupération)
            ...Object.keys(etat.compteurs)
                .filter(id => id.startsWith(COMBAT + ":") && /:(plus|recup):\d+$|:detruits$/.test(id) && etat.compteurs[id])
                .map(id => ({ type: "compteur", id, valeur: 0 })),
            { type: "compteur", id: COMBAT, valeur: 0 },
        ], commentaire + (gain ? ` — Récupération : +${epaves} ressource(s) pour ${cochees.map(nomDe).join(", ")}` : ""));
    }

    const maSelection = selection.filter(id => parId[id]?.camp === moi);

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
                        {v.tire && attaque(v) > 0
                            ? `${NOM_ATTAQUE[sorte]} ${attaque(v)}${nombreDes(v) > 1 ? " ×" + nombreDes(v) : ""}`
                            : "sans attaque"}
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

                    {aFrappePreventive(v) && (
                        <span style={{ fontSize: 11, color: "#6a1b9a" }}>frappe en premier</span>
                    )}

                    {detruit && (
                        <b style={{ color: "#c00" }}>{indestructible ? "désactivé" : "détruit"}</b>
                    )}

                    {joueur && detruit && !indestructible && (
                        <button
                            type="button"
                            style={styleBouton}
                            onClick={() => jouer([{ type: "supprimer", c: v.id }, { type: "compteur", id: DETRUITS, delta: 1 }])}
                        >
                            Retirer
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
                                            onClick={() => retirer(v, code)}
                                        >
                                            ×
                                        </button>
                                    </>
                                )}
                            </span>
                        ))}

                        {malus(v) > 0 && <span style={{ color: "#a15c00" }}>(−2 pour toucher)</span>}
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
                                            data-degat={`${v.id}:${k}:${M.desA}`}
                                            data-nom="Dégât"
                                            title="Dégât : le glisser sur le vaisseau touché"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 22,
                                                height: 22,
                                                borderRadius: "50%",
                                                backgroundColor: "#c62828",
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
                <b style={{ fontSize: 16 }}>
                    {SORTES[sorte]} —{" "}
                    {planete !== null && `${(laPlanete?.name || "planète " + (planete + 1)).replace(/^!([^!]*)!/, "")}, `}
                    {(systeme?.name || "système").replace(/^!([^!]*)!/, "")}, {nomCase(numero)}
                </b>

                {/* Les quatre phases du combat : celle en cours est en gras. Les
                    attaques d'une phase partent quand tout le monde est prêt. */}
                <span data-phase-combat={phaseCombat} style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
                    {PHASES_COMBAT.map((nom, k) => (
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
                    {etape < 2 && (
                        <>
                            {" "}Quand tout le monde est prêt :{" "}
                            <b>
                                {enPreventive ? "frappe en premier" : "autres attaques"}
                                {" "}({prochains.length} unité{prochains.length > 1 ? "s" : ""})
                            </b>
                            .
                        </>
                    )}
                    {perdus > 0 && <span style={{ color: "#a15c00" }}> {perdus} dégât(s) perdu(s), sans cible.</span>}
                </span>

                {jeCombats && etape < 2 && (
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
                {joueur && etape < 2 && tousPrets && (
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
                            onClick={() => envoyer(
                                [
                                    ...aRetirer.map(v => ({ type: "supprimer", c: v.id })),
                                    { type: "compteur", id: DETRUITS, delta: aRetirer.length },
                                ],
                                `Combat : ${aRetirer.length} unité(s) détruite(s) retirée(s)`
                            )}
                        >
                            Retirer tous les détruits{aRetirer.length ? ` (${aRetirer.length})` : ""}
                        </button>

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

            {vaisseaux.length === 0 && (
                <i style={{ color: "#666" }}>Aucune unité dans ce combat.</i>
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

                        {camp !== NEUTRE && etape < 2 && (
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
