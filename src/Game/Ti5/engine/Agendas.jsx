import { useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useEngine, BoutonRegle, nomElement, nomCase } from "./Interaction";
import { useElements, contenuEnCache } from "./sync";

// ============================================================
// AGENDAS DU TOUR : CARTES RÉVÉLÉES ET DÉSIGNATIONS
//
// Ce que demande le texte d'une loi du tour (case Agenda du tour,
// zone general:agenda:<tour>), lu sur la carte elle-même — une carte
// modifiée est donc suivie sans rien changer ici :
//
//   « Révélez 3 objectifs militaires », « Révélez un mercenaire »,
//   « Révélez une relique » (en tête du texte)
//       À l'arrivée en phase de mandat, les cartes sont piochées et
//       posées à côté de la loi (zone general:revele:<id de la loi>),
//       visibles dans l'onglet Vote. Un bouton les révèle à la main
//       si cela n'a pas été fait (contenu de la loi pas encore chargé
//       au changement de phase, loi arrivée après).
//
//   « Élisez une planète », « Élisez un système »
//       De la phase de mandat à la fin du vote, chaque faction a une
//       décision (onglet Décision) : désigner une planète ou un
//       système, ou ne rien désigner. Les désignations s'affichent à
//       côté de la loi, à la couleur de chaque faction.
//         agenda:<tour>:<ligne>:designe:<joueur> = id de la planète,
//         ou numéro de case + 1 (système), ou −1 (rien)
//
// Rien d'autre n'est appliqué : le vote et la loi se règlent à la main.
// ============================================================

const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5 };

// Ce qu'on révèle : [motif du texte, pioche, singulier, pluriel]
const PIOCHES = [
    [/objectifs?\s+militaires?/i, "pioche:militaire", "objectif militaire", "objectifs militaires"],
    [/mercenaires?/i, "pioche:mercenaire", "mercenaire", "mercenaires"],
    [/reliques?/i, "pioche:relique", "relique", "reliques"],
];

const texteDe = contenu => String(contenu?.usage || "")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// { revele: { n, pioche, nom }, designe: "planete" | "systeme" } (chacun ou null)
export function lireAgenda(contenu) {

    const texte = texteDe(contenu);

    // (en tête du texte seulement : « #Pman: #use: révélez un mercenaire » est l'effet d'un mandat en jeu)
    const r = /^r[ée]v[ée]lez\s+(\d+|une?|deux|trois|quatre|cinq)\s+([^.:]+)/i.exec(texte);
    const quoi = r && PIOCHES.find(([motif]) => motif.test(r[2]));
    const n = r ? (NOMBRES[r[1].toLowerCase()] || Number(r[1]) || 1) : 0;

    const d = /[ée]lisez\s+(une\s+plan[èe]te|un\s+syst[èe]me)/i.exec(texte);

    return {
        revele: quoi ? { n, pioche: quoi[1], nom: n > 1 ? quoi[3] : quoi[2] } : null,
        designe: d ? (/plan/i.test(d[1]) ? "planete" : "systeme") : null,
    };
}

export const zoneRevelee = carte => "general:revele:" + carte.id;
const cleDesignation = (tour, ligne, joueur) => `agenda:${tour}:${ligne}:designe:${joueur}`;

// Lois du tour, avec ce que demande leur texte (contenus lus dans le cache)
//   [{ carte, ligne, lecture }]
export function loisDuTour({ etat, index }) {
    return (index.parZone.get("general:agenda:" + etat.tour) || []).map((carte, k) => ({
        carte,
        ligne: k + 1,
        lecture: !carte.cache && carte.ref ? lireAgenda(contenuEnCache(carte.ref.id)) : { revele: null, designe: null },
    }));
}

// Charge le contenu des lois du tour (à appeler dans un composant toujours monté)
export function useLoisDuTour() {

    const { etat, index } = useEngine();

    useElements((index.parZone.get("general:agenda:" + etat.tour) || [])
        .filter(c => !c.cache && c.ref).map(c => c.ref.id).sort((a, b) => a - b));

    return loisDuTour({ etat, index });
}

// Actions qui révèlent ce que demandent les lois du tour, là où rien ne l'a encore été
export function actionsRevelation({ etat, index }, seulement = null) {
    return loisDuTour({ etat, index })
        .filter(l => l.lecture.revele && (!seulement || l.carte.id === seulement.id))
        .filter(l => !(index.parZone.get(zoneRevelee(l.carte)) || []).length)
        .filter(l => (index.parZone.get(l.lecture.revele.pioche) || []).length > 0)
        .map(l => ({ type: "piocher", de: l.lecture.revele.pioche, vers: zoneRevelee(l.carte), n: l.lecture.revele.n }));
}

const enPhaseDeDesignation = etat => /mandat|vote/i.test(etat.phase || "");

// Lois pour lesquelles je dois encore désigner une planète ou un système
export function designationsEnAttente({ etat, index, joueur, moi }) {

    if (!joueur || !enPhaseDeDesignation(etat)) {
        return [];
    }

    return loisDuTour({ etat, index })
        .filter(l => l.lecture.designe && !Number(etat.compteurs[cleDesignation(etat.tour, l.ligne, moi)]));
}

// ------------------------------------------------------------
// Planètes et systèmes de la carte
// ------------------------------------------------------------

function useCarte() {

    const { etat, search } = useEngine();

    const tuiles = Object.values(etat.composants)
        .filter(x => x.ref?.type === "system" && /^hex:\d+$/.test(x.zone || ""))
        .map(x => ({ numero: Number(x.zone.slice(4)), id: x.ref.id }))
        .sort((a, b) => a.numero - b.numero);

    const systemes = useElements([...new Set(tuiles.map(t => t.id))].sort((a, b) => a - b));

    const idsPlanetes = [...new Set(Object.values(systemes)
        .flatMap(s => (s?.elems || []).map(lien => Number(lien?.id)))
        .filter(id => id > 0))].sort((a, b) => a - b);

    const planetes = useElements(idsPlanetes);

    const nomSysteme = t => nomElement(search, { type: "system", id: t.id });

    return {
        // [{ valeur, libelle }] : planètes et stations (pas les trous de ver), ou systèmes
        planetes: tuiles.flatMap(t => (systemes[t.id]?.elems || [])
            .map(lien => Number(lien?.id))
            .filter(id => id > 0 && planetes[id] && planetes[id].type !== "spe")
            .map(id => ({ valeur: id, libelle: `${planetes[id].name} — ${nomCase(t.numero)}` })))
            .sort((a, b) => a.libelle.localeCompare(b.libelle)),
        systemes: tuiles.map(t => ({ valeur: t.numero + 1, libelle: `${nomCase(t.numero)} — ${nomSysteme(t)}` })),
        nomDe: (sorte, valeur) => {
            if (valeur < 0) return "rien";
            if (sorte === "systeme") {
                const t = tuiles.find(x => x.numero + 1 === valeur);
                return t ? `${nomCase(t.numero)} — ${nomSysteme(t)}` : nomCase(valeur - 1);
            }
            const t = tuiles.find(x => (systemes[x.id]?.elems || []).some(lien => Number(lien?.id) === valeur));
            return nomElement(search, { type: "planet", id: valeur }) + (t ? ` (${nomCase(t.numero)})` : "");
        },
    };
}

const NOMS_SORTE = { planete: "une planète", systeme: "un système" };

// ------------------------------------------------------------
// Onglet Décision : une décision par loi qui attend ma désignation
// ------------------------------------------------------------

function Designation({ loi, style }) {

    const { etat, envoyer, moi, search } = useEngine();
    const carteDuJeu = useCarte();
    const sorte = loi.lecture.designe;
    const choix = sorte === "planete" ? carteDuJeu.planetes : carteDuJeu.systemes;
    const [valeur, setValeur] = useState("");
    const nomLoi = nomElement(search, loi.carte.ref);
    const cle = cleDesignation(etat.tour, loi.ligne, moi);

    return (
        <div data-decision={"designation:" + loi.ligne} style={style}>
            <b>Loi {loi.ligne} « {nomLoi} » : désignez {NOMS_SORTE[sorte]}</b>
            <div>
                Chaque faction désigne {NOMS_SORTE[sorte]} ; les désignations s'affichent à côté de la loi dans l'onglet Vote,
                à la couleur de chaque faction.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <select data-designation-choix value={valeur} onChange={e => setValeur(e.target.value)}>
                    <option value="">— choisir —</option>
                    {choix.map(c => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
                </select>
                <button
                    type="button"
                    data-action="designer"
                    disabled={!valeur}
                    style={{ padding: "5px 12px", fontWeight: "bold" }}
                    onClick={() => envoyer(
                        [{ type: "compteur", id: cle, valeur: Number(valeur) }],
                        `Loi ${loi.ligne} « ${nomLoi} » : désigne ${carteDuJeu.nomDe(sorte, Number(valeur))}`
                    )}
                >
                    Désigner
                </button>
                <button
                    type="button"
                    data-action="designer-rien"
                    style={{ padding: "5px 12px" }}
                    onClick={() => envoyer([{ type: "compteur", id: cle, valeur: -1 }], `Loi ${loi.ligne} « ${nomLoi} » : ne désigne rien`)}
                >
                    Ne rien désigner
                </button>
            </div>
        </div>
    );
}

export function DesignationsAgenda({ style }) {

    const ctx = useEngine();
    useLoisDuTour();

    return designationsEnAttente(ctx).map(loi => <Designation key={loi.carte.id} loi={loi} style={style} />);
}

// ------------------------------------------------------------
// Onglet Vote, à côté d'une loi : cartes révélées et désignations
// ------------------------------------------------------------

// (le jaune est la seule couleur claire des joueurs)
const texteSur = fond => (String(fond || "").toLowerCase() === "#f9cc39" ? "#000" : "#fff");

export function AnnexesDeLoi({ carte, ligne }) {

    const { etat, index, envoyer, joueur, moi, partie, search, couleurDe, ouvrirFiche } = useEngine();
    const carteDuJeu = useCarte();

    useLoisDuTour();

    if (carte.cache || !carte.ref) {
        return null;
    }

    const lecture = lireAgenda(contenuEnCache(carte.ref.id));
    const revelees = index.parZone.get(zoneRevelee(carte)) || [];
    const nomLoi = nomElement(search, carte.ref);

    const designations = lecture.designe
        ? partie.joueurs.map(j => ({ j, valeur: Number(etat.compteurs[cleDesignation(etat.tour, ligne, j.userId)]) || 0 }))
        : [];

    if (!lecture.revele && !revelees.length && !lecture.designe) {
        return null;
    }

    const enPioche = lecture.revele ? (index.parZone.get(lecture.revele.pioche) || []).length : 0;

    return (
        <div data-annexes-loi={ligne} style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 560 }}>

            {/* Cartes révélées pour cette loi : un clic ouvre la fiche (prendre en main, mettre en jeu…) */}
            {revelees.length > 0 && (
                <div data-revelees={ligne} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 6 }}>
                    {revelees.map(c => (c.cache || !c.ref
                        ? <i key={c.id}>carte face cachée</i>
                        : (
                            <div
                                key={c.id}
                                title={nomElement(search, c.ref) + " — révélée pour « " + nomLoi + " » ; clic : prendre en main, mettre en jeu…"}
                                onClick={() => ouvrirFiche(c.id)}
                                style={{ cursor: "pointer" }}
                            >
                                <div style={{ pointerEvents: "none" }}>
                                    <LoadAndDisplay link={{ ...c.ref, __link: true }} />
                                </div>
                            </div>
                        )))}
                </div>
            )}

            {lecture.revele && !revelees.length && joueur && (
                <BoutonRegle
                    data-action="reveler-pour-loi"
                    nom={`Loi ${ligne} « ${nomLoi} » : révéler ${lecture.revele.n} ${lecture.revele.nom}`}
                    obstacles={[
                        !/mandat/i.test(etat.phase || "") && "ce n'est pas la phase de mandat",
                        !enPioche && `la pioche est vide (${lecture.revele.nom})`,
                    ]}
                    faire={commentaire => envoyer(
                        actionsRevelation({ etat, index }, carte),
                        commentaire || `Loi ${ligne} « ${nomLoi} » : ${lecture.revele.n} ${lecture.revele.nom} révélé${lecture.revele.n > 1 ? "s" : ""}`
                    )}
                    title="Les cartes sont piochées et posées à côté de la loi"
                >
                    Révéler {lecture.revele.n} {lecture.revele.nom}
                </BoutonRegle>
            )}

            {/* Désignations : une pastille par faction, à sa couleur */}
            {lecture.designe && (
                <div data-designations={ligne} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, fontSize: 13 }}>
                    <b>{lecture.designe === "planete" ? "Planètes désignées" : "Systèmes désignés"} :</b>
                    {designations.map(({ j, valeur }) => (
                        <span
                            key={j.userId}
                            data-designation={j.userId}
                            data-valeur={valeur}
                            title={j.nom}
                            style={{
                                padding: "1px 8px",
                                borderRadius: 10,
                                backgroundColor: couleurDe(j.userId) || "#888",
                                color: texteSur(couleurDe(j.userId)),
                                opacity: valeur ? 1 : 0.55,
                            }}
                        >
                            {j.nom} : {valeur ? carteDuJeu.nomDe(lecture.designe, valeur) : "en attente"}
                            {joueur && j.userId === moi && valeur !== 0 && (
                                <button
                                    type="button"
                                    data-action="designation-changer"
                                    title="Annule votre désignation : la décision revient dans l'onglet Décision"
                                    style={{ marginLeft: 6, fontSize: 11, padding: "0 4px" }}
                                    onClick={() => envoyer(
                                        [{ type: "compteur", id: cleDesignation(etat.tour, ligne, moi), valeur: 0 }],
                                        `Loi ${ligne} « ${nomLoi} » : désignation annulée`
                                    )}
                                >
                                    changer
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
