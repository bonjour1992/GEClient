import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import { getList } from "../../lib/fetch";
import { techType } from "./ti5Const";
import { planetType, stationType, ruineType } from "./planet";
import { anomaly } from "./systeme";
import { exemplaires, horsReserveCommune } from "./engine/miseEnPlace";

// ============================================================
// OUTIL « STATISTIQUES DES SYSTÈMES »   /GE/ti5/tools/stat-systemes
//
// Statistiques des tuiles système de la réserve commune (type de
// lien « commun » : celles du tirage au hasard). Chaque système
// compte autant de fois qu'il a d'exemplaires.
//
// Pour chaque ligne :
//   total       somme sur toutes les tuiles
//   moyenne     total / nombre de tuiles
//   tuiles      nombre de tuiles où la valeur n'est pas nulle
//
// Lecture des éléments d'un système (ses « elems », des éléments
// de type planet) :
//   planète       type « pla », sauf la ruine seule
//   ruine seule   type « pla » avec une ruine, sans ressource ni
//                 influence (tuiles « Ruine », « Ruines spatiales »)
//   station       type « sat »
//   trou de ver   type « spe » dont l'image est dans /wormhole/
//                 (même lecture que engine/Blocage.jsx)
// ============================================================

const nombre = v => Number(v) || 0;

const estRuineSeule = p => p.type === "pla" && p.ruine &&
    (p.res === undefined || p.res === null || p.res === "") &&
    (p.inf === undefined || p.inf === null || p.inf === "");
const estPlanete = p => p.type === "pla" && !estRuineSeule(p);
const estStation = p => p.type === "sat";
const trouDeVer = p => (p.type === "spe" && /wormhole\/(\w+)\./.exec(p.img || "")?.[1]) || null;

// Types de ruine d'un élément (il peut en porter deux)
const ruinesDe = p => [p.ruine && (p.ruineType || "normal"), p.ruine2 && (p.ruineType2 || "normal")].filter(Boolean);

const NOMS_TROU = { alpha: "alpha", beta: "bêta", gamma: "gamma", delta: "delta", omega: "oméga" };

// Clés présentes dans les tuiles, dans l'ordre de l'énumération puis les autres
function clesPresentes(tuiles, lire, enumeration) {
    const vues = new Set(tuiles.flatMap(t => lire(t)));
    return [...Object.keys(enumeration).filter(k => vues.has(k)), ...[...vues].filter(k => !(k in enumeration)).sort()];
}

// Sections du tableau : [titre, [[clé, libellé, tuile => valeur]]]
function sections(tuiles) {

    const compter = (cle, libelle, test) => [cle, libelle, t => t.elements.filter(test).length];
    const parType = (prefixe, lire, enumeration, nom = k => enumeration[k] ?? k) =>
        clesPresentes(tuiles, lire, enumeration).map(k =>
            [`${prefixe}:${k}`, nom(k), t => lire(t).filter(x => x === k).length]);

    const specialites = t => t.elements.flatMap(p => (Array.isArray(p.techSpe) ? p.techSpe : []));
    const trous = t => t.elements.map(trouDeVer).filter(Boolean);
    const ruines = t => t.elements.flatMap(ruinesDe);
    const stations = t => t.elements.filter(estStation).map(p => p.stationType || "");

    return [
        ["Ressources et influence", [
            ["res", "Ressources", t => t.elements.reduce((s, p) => s + nombre(p.res), 0)],
            ["inf", "Influence", t => t.elements.reduce((s, p) => s + nombre(p.inf), 0)],
        ]],
        ["Planètes", [
            compter("planete", "Planètes", estPlanete),
            compter("planete:mil", "dont militaires", p => estPlanete(p) && p.planetType === "mil"),
            compter("planete:civ", "dont culturelles (civiles)", p => estPlanete(p) && p.planetType === "civ"),
            compter("planete:sauv", "dont sauvages", p => estPlanete(p) && p.planetType === "sauv"),
            compter("planete:sans", "dont sans type", p => estPlanete(p) && !planetType[p.planetType]),
            compter("legendaire", "Légendaires (planètes et stations)", p => p.legendary === true),
        ]],
        ["Stations", [
            compter("station", "Stations", estStation),
            ...parType("station", stations, { ...stationType, "": "sans type" }, k => "dont " + ({ ...stationType, "": "sans type" }[k] ?? k)),
        ]],
        ["Systèmes vides", [
            ["vide", "Systèmes vides (aucun élément)", t => (t.elements.length ? 0 : 1)],
            ["vide:sans-anomalie", "dont sans anomalie", t => (t.elements.length || t.systeme.anomaly ? 0 : 1)],
        ]],
        ["Anomalies", [
            ["anomalie", "Systèmes avec une anomalie", t => (t.systeme.anomaly ? 1 : 0)],
            ...parType("anomalie", t => (t.systeme.anomaly ? [t.systeme.anomaly] : []), anomaly, k => "dont " + (anomaly[k] ?? k)),
        ]],
        ["Spécialités technologiques", [
            ["tech", "Spécialités technologiques", t => specialites(t).length],
            ...parType("tech", specialites, techType, k => "dont " + (techType[k] ?? k)),
        ]],
        ["Trous de ver", [
            ["trou", "Trous de ver", t => trous(t).length],
            ...parType("trou", trous, NOMS_TROU, k => "dont " + (NOMS_TROU[k] ?? k)),
        ]],
        ["Ruines", [
            ["ruine", "Ruines", t => ruines(t).length],
            ...parType("ruine", ruines, ruineType, k => "dont " + (ruineType[k] ?? k).toLowerCase()),
            compter("ruine:seule", "Ruines seules (sans planète)", estRuineSeule),
        ]],
    ];
}

const cellule = { border: "1px solid #bbb", padding: "3px 10px", textAlign: "left" };
const chiffre = { ...cellule, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const decimal = v => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OutilStatSystemes() {

    const jeu = useParams().jeu;

    // { systemes: [{ id, content }], planetes: Map(id → content) } ou une erreur
    const [donnees, setDonnees] = useState(null);
    const [erreur, setErreur] = useState("");

    useEffect(() => {
        let annule = false;

        Promise.all([getList(jeu, "system"), getList(jeu, "planet")])
            .then(([systemes, planetes]) => {
                if (annule) return;
                if (!Array.isArray(systemes) || !Array.isArray(planetes)) {
                    setErreur("Les systèmes ou les planètes n'ont pas pu être chargés.");
                    return;
                }
                setDonnees({ systemes, planetes: new Map(planetes.map(p => [p.id, p.content || {}])) });
            })
            .catch(() => !annule && setErreur("Les systèmes ou les planètes n'ont pas pu être chargés."));

        return () => { annule = true; };
    }, [jeu]);

    if (erreur) return <div data-stat-systemes>{erreur}</div>;
    if (!donnees) return <div data-stat-systemes>Chargement…</div>;

    // Une ligne par système de la réserve commune, avec son nombre d'exemplaires
    const tuiles = donnees.systemes
        .filter(s => !horsReserveCommune(s.content))
        .map(s => ({
            id: s.id,
            systeme: s.content || {},
            n: exemplaires(s.content),
            elements: (s.content?.elems || [])
                .filter(lien => Number(lien?.id) > 0)
                .map(lien => donnees.planetes.get(Number(lien.id)))
                .filter(Boolean),
        }))
        .sort((a, b) => String(a.systeme.name).localeCompare(String(b.systeme.name)));

    const total = tuiles.reduce((s, t) => s + t.n, 0);

    return (
        <div data-stat-systemes style={{ padding: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: "bold" }}>Statistiques des tuiles système de la réserve commune</h2>
            <p data-stat-tuiles={total}>
                {total} tuiles ({tuiles.length} systèmes différents, chacun compté autant de fois qu'il a d'exemplaires).
            </p>

            <table style={{ borderCollapse: "collapse", margin: "8px 0" }}>
                <thead>
                    <tr>
                        <th style={cellule}></th>
                        <th style={chiffre}>Total</th>
                        <th style={chiffre}>Moyenne par tuile</th>
                        <th style={chiffre}>Tuiles concernées</th>
                    </tr>
                </thead>
                <tbody>
                    {sections(tuiles).map(([titre, lignes]) => [
                        <tr key={titre}>
                            <th colSpan={4} style={{ ...cellule, background: "#e3e7f1" }}>{titre}</th>
                        </tr>,
                        ...lignes.map(([cle, libelle, valeur]) => {
                            const somme = tuiles.reduce((s, t) => s + t.n * valeur(t), 0);
                            const concernees = tuiles.reduce((s, t) => s + (valeur(t) > 0 ? t.n : 0), 0);
                            const detail = libelle.startsWith("dont ");
                            return (
                                <tr key={cle} data-stat={cle} data-total={somme} data-tuiles={concernees}>
                                    <td style={{ ...cellule, paddingLeft: detail ? 26 : 10 }}>{libelle}</td>
                                    <td style={chiffre}>{somme}</td>
                                    <td style={chiffre}>{total ? decimal(somme / total) : "—"}</td>
                                    <td style={chiffre}>
                                        {concernees}{total ? ` (${Math.round(100 * concernees / total)} %)` : ""}
                                    </td>
                                </tr>
                            );
                        }),
                    ])}
                </tbody>
            </table>

            <details data-stat-liste>
                <summary>Les {tuiles.length} systèmes comptés</summary>
                <ul>
                    {tuiles.map(t => (
                        <li key={t.id}>
                            {t.n} × <NavLink to={`/GE/${jeu}/system/${t.id}`}>{t.systeme.name || "#" + t.id}</NavLink>
                        </li>
                    ))}
                </ul>
            </details>
        </div>
    );
}
