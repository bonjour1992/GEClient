import { Link } from "../../../lib/datatype";
import { EnumInput } from "../../../Input/EnumInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";

// ============================================================
// TYPE DE LIEN
//
// Même modèle que les composants de Followyn : une classe de
// caractéristiques à ajouter à un élément par aggregation(),
// et la partie de formulaire qui va avec.
//
//   class Classe extends aggregation(ElementContent, TypeLienCarac) { ... }
//   <TypeLienForm content={content} onChange={onChange} />
//
// Dit si un élément est commun (il va dans la réserve commune :
// pioche, réserve de promesses...) ou lié à une faction, à une
// faction neutre ou à un événement (il en est alors écarté).
//
// Ce champ n'est pas affiché : il n'y a pas de composant
// d'affichage, et l'affichage des éléments ne change pas.
// ============================================================

export const typeLien = {
    commun: "Commun (réserve commune)",
    faction: "Lié à une faction",
    neutre: "Lié à une faction neutre",
    evenement: "Lié à un événement",
    mercenaire: "Lié à un mercenaire",
    // Lié à rien, mais écarté de la réserve commune
    special: "Spécial (hors réserve commune)",
};

// Type de l'élément auquel on est lié, selon le type de lien
const typeElementLie = {
    faction: "faction",
    neutre: "neutral",
    evenement: "evenement",
    mercenaire: "mercenaire",
};

export class TypeLienCarac {
    lienType = "commun"
    lienElement = new Link("faction")
}

export function TypeLienForm({ onChange, content }) {

    const type = typeElementLie[content.lienType];

    return (
        <div>
            <EnumInput
                onChange={onChange}
                name="lienType"
                value={content}
                enumClass={typeLien}
                label="Type de lien"
            />

            {type && (
                <ModalPickerInput
                    onChange={onChange}
                    name="lienElement"
                    value={content}
                    label="Lié à"
                    type={[type]}
                />
            )}
        </div>
    );
}
