import { useSearchParams } from "react-router";
import { useSearch, getFromSearch, nomDeListe } from "../lib/store";

// ============================================================
// FILTRES DE LA PAGE LISTE
//
// Un fichier d'élément (Game/Ti5/faction.jsx...) donne dans son
// export la liste de ses paramètres de filtre :
//
//   export default { name, classe, form, display,
//       filter: [
//           { name: "type", label: "Type", enumClass: typeLoi },
//           { name: "lienElement", label: "Lié à" },
//       ] }
//
//   name       champ du contenu de l'élément
//   label      libellé affiché devant la liste déroulante
//   enumClass  { valeur: libellé } (facultatif : même objet que celui
//              donné à EnumInput ou TagInput dans le formulaire)
//   value      content => valeur (facultatif : pour un champ qui ne
//              compte que dans certains cas)
//
// Rien d'autre à déclarer : les valeurs proposées sont celles des
// éléments de la liste, et leur nature est lue sur la valeur.
//   texte, nombre   la valeur (libellé pris dans enumClass)
//   booléen         Oui / Non
//   lien            le nom de l'élément lié
//   tableau         l'élément passe s'il contient la valeur choisie
//   vide            « Aucun »
//
// Les filtres choisis sont gardés dans l'adresse de la page
// (?type=loi&lienType=faction) : ils survivent au retour arrière.
// ============================================================

const VIDE = "";
// Valeur de l'option « Tous » (jamais une valeur de champ)
const TOUS = "__tous__";

const estLien = v => v && typeof v === "object" && (v.__link || ("type" in v && "id" in v));

// Clés de filtre d'une valeur (plusieurs pour un tableau)
function cles(v) {
    if (Array.isArray(v)) {
        const liste = [...new Set(v.flatMap(cles))].filter(k => k !== VIDE);
        return liste.length ? liste : [VIDE];
    }
    if (v === undefined || v === null || v === "") return [VIDE];
    if (estLien(v)) return [v.id === undefined || v.id === null || v.id === -1 ? VIDE : String(v.id)];
    return [String(v)];
}

// Valeurs par défaut de la classe : un élément ancien, à qui il manque
// un champ, est rangé avec la valeur par défaut de ce champ.
function defautsDe(handler) {
    try {
        return handler?.classe ? new handler.classe() : {};
    } catch {
        return {};
    }
}

const valeurDe = (param, content, defauts) =>
    param.value ? param.value(content || {}) : (content?.[param.name] ?? defauts[param.name]);

// Les éléments de la liste qui passent tous les filtres choisis
// (sauf celui de nom « sauf » : sert à compter les valeurs d'un filtre).
export function filtrer(elements, handler, params, sauf) {
    const defauts = defautsDe(handler);
    const actifs = (handler?.filter || [])
        .filter(p => p.name !== sauf && params.has(p.name));

    if (!actifs.length) return elements;

    return elements.filter(e => actifs.every(p =>
        cles(valeurDe(p, e.content, defauts)).includes(params.get(p.name))));
}

export function Filtres({ handler, elements }) {
    const [params, setParams] = useSearchParams();
    const search = useSearch(state => state.search);
    const defauts = defautsDe(handler);
    const filtres = handler?.filter || [];

    if (!filtres.length) return null;

    const choisir = (name, valeur) => {
        const suite = new URLSearchParams(params);
        if (valeur === null) suite.delete(name); else suite.set(name, valeur);
        setParams(suite, { replace: true });
    };

    const lignes = filtres.map(param => {
        // Valeurs présentes dans toute la liste, comptées parmi les
        // éléments qui passent les autres filtres
        const options = new Map();
        const liens = new Set();
        for (const e of elements) {
            const v = valeurDe(param, e.content, defauts);
            for (const x of Array.isArray(v) ? v : [v]) if (estLien(x)) liens.add(cles(x)[0]);
            for (const k of cles(v)) if (!options.has(k)) options.set(k, 0);
        }
        for (const e of filtrer(elements, handler, params, param.name)) {
            for (const k of cles(valeurDe(param, e.content, defauts))) options.set(k, options.get(k) + 1);
        }

        const libelle = k => {
            if (k === VIDE) return "Aucun";
            if (param.enumClass?.[k] !== undefined) return param.enumClass[k];
            if (liens.has(k)) {
                const trouve = getFromSearch(search, Number(k), null);
                return trouve ? nomDeListe(trouve) : "#" + k;
            }
            if (k === "true") return "Oui";
            if (k === "false") return "Non";
            return k;
        };

        // Ordre : celui de enumClass, puis les nombres, puis l'alphabet ; « Aucun » à la fin
        const ordre = Object.keys(param.enumClass || {});
        const rang = k => (k === VIDE ? 2 : ordre.includes(k) ? 0 : 1);
        const triees = [...options.keys()].sort((a, b) =>
            rang(a) - rang(b)
            || (rang(a) === 0 ? ordre.indexOf(a) - ordre.indexOf(b) : 0)
            || (!liens.has(a) && !liens.has(b) && !isNaN(a) && !isNaN(b) ? Number(a) - Number(b) : 0)
            || libelle(a).localeCompare(libelle(b)));

        return { param, options, triees, libelle };
    })
        // Une seule valeur dans toute la liste : rien à filtrer
        .filter(l => l.triees.length > 1 || params.has(l.param.name));

    if (!lignes.length) return null;

    const actifs = filtres.filter(p => params.has(p.name));

    return (
        <div data-filtres style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", alignItems: "center", margin: "6px 0" }}>
            {lignes.map(({ param, options, triees, libelle }) => (
                <label key={param.name} data-filtre={param.name} style={{ whiteSpace: "nowrap" }}>
                    {param.label || param.name}{" "}
                    <select
                        value={params.has(param.name) ? params.get(param.name) : TOUS}
                        onChange={e => choisir(param.name, e.target.value === TOUS ? null : e.target.value)}
                        style={params.has(param.name) ? { fontWeight: "bold" } : undefined}
                    >
                        <option value={TOUS}>Tous</option>
                        {/* (une valeur que les autres filtres ont vidée n'est pas proposée) */}
                        {triees.filter(k => options.get(k) > 0 || params.get(param.name) === k).map(k => (
                            <option key={k} value={k}>{libelle(k)} ({options.get(k)})</option>
                        ))}
                        {params.has(param.name) && !options.has(params.get(param.name)) && (
                            <option value={params.get(param.name)}>{libelle(params.get(param.name))} (0)</option>
                        )}
                    </select>
                </label>
            ))}
            <span data-filtres-compte>
                {filtrer(elements, handler, params).length} / {elements.length}
            </span>
            {actifs.length > 0 && (
                <button
                    type="button"
                    data-action="filtres-effacer"
                    onClick={() => {
                        const suite = new URLSearchParams(params);
                        for (const p of filtres) suite.delete(p.name);
                        setParams(suite, { replace: true });
                    }}
                >
                    Effacer les filtres
                </button>
            )}
        </div>
    );
}
