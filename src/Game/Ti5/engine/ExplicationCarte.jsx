import { Explication } from "../../../Component/Text";
import { useRemp } from "../../../lib/store";

// ============================================================
// EXPLICATION D'UNE CARTE (fiche d'une carte, dans une partie)
//
// Sous la carte : son champ « explication », s'il est rempli, et la
// règle de chaque remplacement que cite son texte (les « #mot » de
// ses champs : #can, #pill, #use…), comme sur la page de l'élément
// dans l'éditeur (Component/Text.jsx, Explication). Seuls les
// remplacements qui ont une règle écrite sont listés.
// ============================================================

const sansBalises = texte => String(texte || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();

export function ExplicationCarte({ contenu }) {

    const remp = useRemp(s => s.remp);

    if (!contenu) {
        return null;
    }

    // Remplacements cités, dans l'ordre du texte, sans doublon
    const cles = [];

    for (const valeur of Object.values(contenu)) {

        if (typeof valeur !== "string") {
            continue;
        }

        // (« #img[…] » est une image, pas un remplacement)
        for (const m of valeur.matchAll(/#([a-zA-Z_][a-zA-Z_]+)(?!\[)/g)) {

            const cle = m[1].toLowerCase();

            if (!cles.includes(cle) && (remp || []).some(e => e.key === cle && sansBalises(e.rule))) {
                cles.push(cle);
            }
        }
    }

    return (
        <div data-explication-carte>
            <Explication explication={contenu.explication} ajout={{ remp: cles, lien: [] }} />
        </div>
    );
}
