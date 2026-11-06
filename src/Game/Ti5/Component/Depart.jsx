import { TableInput } from "../../../Input/TableInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { NumberInput } from "../../../Input/NumberInput";
import { EnumInput } from "../../../Input/EnumInput";
import { useSearch } from "../../../lib/store";
import { lignesDepart } from "../engine/miseEnPlace";

// ============================================================
// ÉLÉMENTS DE DÉPART D'UNE FACTION
//
// Même modèle que les composants de Followyn : caractéristiques
// (DepartCarac), formulaire (DepartForm) et affichage (Depart).
//
// Une table : élément, nombre, destination. Elle remplace les
// consignes en texte libre que l'engine ne peut pas exécuter :
// main de départ, éléments actifs, unités ou agents en plus.
// La mise en place d'une partie la lit (engine/miseEnPlace.js).
// ============================================================

// Mêmes clés que DESTINATIONS_DEPART (engine/miseEnPlace.js).
// La première destination est celle d'une ligne où rien n'est choisi.
export const destinationDepart = {
    main: "Main",
    actif: "Éléments actifs",
    reserve: "Réserve",
    agents: "Agents",
    espace: "Espace du système natal",
    planete: "Planète de départ",
    tech: "Feuilles de technologie",
};

export class DepartCarac {
    depart = []
    departNombre = []
    departZone = []
    departNum = 0
}

export function DepartForm({ onChange, content }) {

    function ligne(x) {
        return [
            (<ModalPickerInput onChange={onChange} name="depart" value={content} index={x} />),
            (<NumberInput onChange={onChange} name="departNombre" value={content} index={x} min={1} />),
            (<EnumInput onChange={onChange} name="departZone" value={content} index={x} enumClass={destinationDepart} />),
        ];
    }

    return (
        <TableInput
            onChange={onChange}
            Line={ligne}
            name="departNum"
            value={content}
            label="Éléments de départ (élément, nombre, destination)"
            composant={["depart", "departNombre", "departZone"]}
        />
    );
}

// Affichage (verso de la faction) : une ligne par destination
export function Depart({ content, style }) {

    const search = useSearch(state => state.search);
    const lignes = lignesDepart(content);

    const nom = lien =>
        (search.find(e => e.id === lien.id)?.name || `${lien.type} #${lien.id}`)
            .replace(/^!([^!]*)!/, "");

    return (
        <div style={{ color: "white", fontSize: 12, ...style }}>
            {Object.keys(destinationDepart).map(zone => {

                const duType = lignes.filter(l => l.zone === zone);

                return duType.length > 0 && (
                    <div key={zone}>
                        <b>{destinationDepart[zone]} : </b>
                        {duType
                            .map(l => (l.nombre > 1 ? l.nombre + " × " : "") + nom(l.lien))
                            .join(", ")}
                    </div>
                );
            })}
        </div>
    );
}
