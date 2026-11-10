import { NumberInput } from "../../../Input/NumberInput";

// ============================================================
// EXEMPLAIRES
//
// Nombre d'exemplaires d'un élément : tuiles système et cartes
// en plusieurs exemplaires (« vide » : 30 tuiles). Remplace
// l'ancien préfixe !N! du nom, qui reste compris tant qu'un
// élément le porte (nombreExemplaires, engine/miseEnPlace.js).
//
// Même modèle que TypeLien.jsx : une classe de caractéristiques
// ajoutée par aggregation(), et la partie de formulaire.
//
// Il sert à la mise en place d'une partie (pioches, tuiles), au
// tirage d'un plateau et à « Sélectionner tous » de l'impression.
// ============================================================

export class ExemplairesCarac {
    exemplaires = 1
}

export function ExemplairesForm({ onChange, content }) {
    return (
        <NumberInput
            onChange={onChange}
            name="exemplaires"
            value={content}
            min={1}
            max={99}
            label="Exemplaires"
        />
    );
}
