import { useEffect, useState } from "react";
import { getElement, pub } from "../../../lib/fetch";
import { nameAff } from "../../../Component/Text";
import { techIcon } from "../ti5Const";

// ============================================================
// AFFICHAGE « NOM »
//
// Le nom d'un élément, précédé de ses icônes :
//
//   - son propre logo (faction, faction neutre, feuille de technologie),
//     ou celui de son type de technologie (technologie) ;
//   - le logo de la faction ou de la faction neutre à laquelle il est lié
//     (type de lien, Component/TypeLien.jsx) ;
//   - l'icône des mercenaires s'il est lié à un mercenaire.
//
// Même règle que les pions de l'outil de partie (LogoFaction,
// engine/Interaction.jsx). Affichage « nom » de tous les types du jeu
// (ti5.jsx) ; la recherche de l'en-tête s'en sert.
// ============================================================

export const ICONE_MERCENAIRE = "/ti/icon/merc.png";

const TYPES_LIEN_A_LOGO = ["faction", "neutre"];

const aUnLogo = logo => !!logo && logo !== "/404.jpeg";

// Contenus déjà demandés (une recherche affiche les mêmes logos à chaque frappe)
const DUREE_CACHE = 60000;
const cache = new Map();

export function contenuEnCache(id) {

    const entree = cache.get(id);

    if (entree && Date.now() - entree.date < DUREE_CACHE) {
        return entree.promesse;
    }

    const promesse = getElement(id).then(r => r?.content ?? null).catch(() => null);

    cache.set(id, { date: Date.now(), promesse });

    return promesse;
}

// Logo de l'élément auquel celui-ci est lié (faction, faction neutre), ou null
function useLogoLie(content) {

    const id = TYPES_LIEN_A_LOGO.includes(content?.lienType) && Number(content.lienElement?.id) > 0
        ? Number(content.lienElement.id)
        : null;

    const [logo, setLogo] = useState(null);

    useEffect(() => {

        let annule = false;

        setLogo(null);

        if (id) {
            contenuEnCache(id).then(lie => {
                if (!annule && aUnLogo(lie?.logo)) {
                    setLogo({ src: lie.logo, nom: lie.name });
                }
            });
        }

        return () => {
            annule = true;
        };
    }, [id]);

    return logo;
}

function Icone({ src, nom, sombre }) {
    return (
        <img
            src={encodeURI(pub + src)}
            alt=""
            title={nom}
            draggable={false}
            style={{
                height: "1.1em",
                width: "1.1em",
                objectFit: "contain",
                flex: "none",
                verticalAlign: "-0.15em",
                // (icône noire des mercenaires : lisible sur fond sombre comme sur fond clair)
                filter: sombre ? "drop-shadow(0 0 1px #fff)" : undefined,
            }}
        />
    );
}

export function Nom({ content, style }) {

    const lie = useLogoLie(content);

    if (!content) {
        return null;
    }

    // Son propre logo, sinon celui de son type de technologie
    const propre = aUnLogo(content.logo)
        ? content.logo
        : (content.techType && content.tier !== undefined ? techIcon.get(content.techType) : null);

    return (
        <span
            data-nom-element
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25em", ...style }}
        >
            {propre && <Icone src={propre} />}
            {lie && <Icone src={lie.src} nom={lie.nom} />}
            {content.lienType === "mercenaire" && <Icone src={ICONE_MERCENAIRE} nom="Mercenaire" sombre />}
            <span>{nameAff(content.name || "")}</span>
        </span>
    );
}
