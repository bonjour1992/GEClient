import { useEffect, useRef, useState } from "react";
import { getElement } from "../lib/fetch";
import { getHandler } from "../Game/games";
import { nameAff } from "./Text";

// ============================================================
// NOM D'UN ÉLÉMENT DANS UNE LISTE
//
// Le même partout où l'on choisit un élément (recherche de
// l'en-tête, sélecteur de l'éditeur, recherche de carte d'une
// partie) : l'affichage « nom » de son type — le nom précédé de
// ses icônes — puis, à droite, ce à quoi il est lié (faction,
// événement…) et son type.
//
// `element` est une entrée de la recherche : { id, type, name, lie }.
// Le contenu n'est chargé que lorsque la ligne devient visible.
// ============================================================

// Contenus déjà demandés (les listes réaffichent les mêmes éléments)
const DUREE_CACHE = 60000;
const cache = new Map();

function contenuDe(id) {

    const entree = cache.get(id);

    if (entree && Date.now() - entree.date < DUREE_CACHE) {
        return entree.promesse;
    }

    const promesse = getElement(id).then(r => r?.content ?? null).catch(() => null);

    cache.set(id, { date: Date.now(), promesse });

    return promesse;
}

// Le nom sans l'ancien préfixe !...!
const nomSimple = element => nameAff(String(element?.name ?? "").replace(/^(![^!]*!)+/, ""));

// Le nom, précédé de ses icônes une fois le contenu chargé
export function NomElement({ jeu, element }) {

    const Nom = getHandler(jeu, element.type)?.display?.nom;

    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    const [contenu, setContenu] = useState(null);

    useEffect(() => {

        if (!Nom || visible || !ref.current) {
            return;
        }

        const observateur = new IntersectionObserver(entrees => {
            if (entrees.some(e => e.isIntersecting)) {
                setVisible(true);
            }
        });

        observateur.observe(ref.current);

        return () => observateur.disconnect();
    }, [Nom, visible]);

    useEffect(() => {

        let annule = false;

        setContenu(null);

        if (Nom && visible) {
            contenuDe(element.id).then(c => !annule && setContenu(c));
        }

        return () => {
            annule = true;
        };
    }, [element.id, Nom, visible]);

    return (
        <span ref={ref}>
            {Nom && contenu ? <Nom content={contenu} /> : nomSimple(element)}
        </span>
    );
}

// Une ligne de liste : le nom à gauche ; à droite le lien, puis le type
export function LigneElement({ jeu, element, sansType }) {

    const type = sansType ? "" : getHandler(jeu, element.type)?.name || element.type;

    return (
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
                <NomElement jeu={jeu} element={element} />
            </span>
            <span style={{ flex: "none", fontSize: 11, color: "#666", textAlign: "right" }}>
                {element.lie && <span style={{ color: "#333" }}>{element.lie}</span>}
                {element.lie && type ? " · " : ""}
                {type}
            </span>
        </span>
    );
}
