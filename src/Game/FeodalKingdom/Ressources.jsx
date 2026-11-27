import React from "react";

/**
 * Icônes SVG des ressources de Feodal Kingdom.
 * Utilisation : <RessourceIcon type="bois" size={24} />
 */

const ICONS = {
    bois: (
        <>
            <path d="M5 8.5 16 3l3 2-11 5.5z" />
            <path d="M8 10.5v8l11-5.5v-8" />
            <path d="M8 18.5 5 17v-8.5" />
            <path d="m11 9 3 1.5M11 14l3 1.5" />
        </>
    ),
    pierre: (
        <>
            <path d="m3 17 4-9 7-4 7 6-2 9-10 2z" />
            <path d="m7 8 4 5 10-3M11 13l-2 8M14 4l-3 9" />
        </>
    ),
    metal: (
        <>
            <path d="m4 8 12-4 5 3-12 4z" />
            <path d="M9 11v9l12-4V7" />
            <path d="m4 8 5 3v9l-5-3z" />
            <path d="m9 15 12-4" />
        </>
    ),
    or: (
        <>
            <ellipse cx="9" cy="8" rx="5.5" ry="2.5" />
            <path d="M3.5 8v4c0 1.4 2.5 2.5 5.5 2.5 1.3 0 2.5-.2 3.5-.6" />
            <path d="M14.5 8v2" />
            <ellipse cx="15" cy="15.5" rx="5.5" ry="2.5" />
            <path d="M9.5 15.5v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
        </>
    ),
    arme: (
        <>
            <path d="m5 19 10-10" />
            <path d="m12 4 3-1 6 6-1 3-3-1-4-4z" />
            <path d="m4 17 4 4M3 21l2-2" />
            <path d="m10 10 4 4M12 8l4 4" />
        </>
    ),
};

export function RessourceIcon({ type, size = 24, className, style = {} }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
            aria-label={type}
            role="img"
        >
            {ICONS[type] || <circle cx="12" cy="12" r="9" />}
        </svg>
    );
}

export function BoisSvg(props) { return <RessourceIcon type="bois" {...props} />; }
export function PierreSvg(props) { return <RessourceIcon type="pierre" {...props} />; }
export function MetalSvg(props) { return <RessourceIcon type="metal" {...props} />; }
export function OrSvg(props) { return <RessourceIcon type="or" {...props} />; }
export function ArmeSvg(props) { return <RessourceIcon type="arme" {...props} />; }

export const TYPES_RESSOURCE = [
    { value: "bois", label: "Bois" },
    { value: "pierre", label: "Pierre" },
    { value: "metal", label: "Métal" },
    { value: "or", label: "Or" },
    { value: "arme", label: "Arme" },
];

/**
 * Champ de production d'une face.
 *
 * Props :
 * - value : objet contenant le tableau `name`, ou tableau direct si name absent
 * - name : nom du champ dans value (défaut : "production")
 * - index : index de face si la production est stockée dans un tableau de faces
 * - onChange : convention projet (name, value, index)
 */
export function RessourceInput({
    value,
    name = "production",
    index,
    onChange,
    label = "Production",
}) {
    const rows = (
        index !== undefined
            ? value?.[name]?.[index]
            : value?.[name]
    ) || [];

    const update = (next) => onChange(name, next, index);

    const updateRow = (rowIndex, patch) => {
        update(rows.map((row, i) => i === rowIndex ? { ...row, ...patch } : row));
    };

    const addRow = () => {
        update([...rows, { ressource: "bois", quantite: 1 }]);
    };

    const removeRow = (rowIndex) => {
        update(rows.filter((_, i) => i !== rowIndex));
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
            {label && <strong style={{ fontSize: 14 }}>{label}</strong>}

            {rows.map((row, rowIndex) => (
                <div
                    key={`${rowIndex}-${row.ressource}`}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 7px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                    }}
                >
                    <RessourceIcon type={row.ressource} size={23} />
                    <select
                        value={row.ressource}
                        onChange={(e) => updateRow(rowIndex, { ressource: e.target.value })}
                        style={{ flex: 1, minWidth: 0, padding: 5 }}
                    >
                        {TYPES_RESSOURCE.map((resource) => (
                            <option key={resource.value} value={resource.value}>
                                {resource.label}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.quantite ?? 1}
                        onChange={(e) => updateRow(rowIndex, {
                            quantite: e.target.value === "" ? "" : Number(e.target.value),
                        })}
                        aria-label={`Quantité ${row.ressource}`}
                        style={{ width: 65, padding: 5 }}
                    />
                    <button type="button" onClick={() => removeRow(rowIndex)} aria-label="Supprimer">
                        ×
                    </button>
                </div>
            ))}

            <button type="button" onClick={addRow} style={{ alignSelf: "flex-start" }}>
                + Ajouter une ressource
            </button>
        </div>
    );
}

export default RessourceInput;
