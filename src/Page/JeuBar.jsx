import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Outlet, useParams, useNavigate, useOutletContext, Link } from "react-router";
import { Plus, Search as IconeLoupe, Trash2, X } from "lucide-react";
import { useRemp, useSearch } from "../lib/store"
import { games } from "../Game/games";
import { nameAff } from "../Component/Text";
import { LigneElement } from "../Component/NomElement";
import { Menu } from "./HeaderBar";

let jeu

// Outils d'un jeu dans l'en-tête du site : recherche, « Ajouter », éléments
// supprimés. Ils sont rendus dans l'emplacement que leur réserve la barre
// (HeaderBar.jsx, contexte `slotEntete` de son <Outlet>).
export default function HeaderBar() {

    jeu = useParams().jeu

    const { slotEntete } = useOutletContext() || {};

    const updateRemp = useRemp((state) => state.update);
    const updateSearch = useSearch((state) => state.update);
    const search = useSearch((state) => state.search)

    updateSearch(jeu);
    updateRemp(jeu);


    return (<>
        {slotEntete && createPortal(<>
            <Search search={search} />
            <Add />
        </>, slotEntete)}
        <Outlet />
    </>)
}


// ============================================================
// RECHERCHE
//
// Recherche par nom, sans accents ni majuscules, dans tous les
// éléments du jeu. Les résultats s'affichent sous le champ, avec
// l'affichage « nom » de leur type (nom précédé de ses icônes)
// et le nom du type. Entrée ouvre le résultat surligné, les
// flèches le changent, Échap ferme.
// ============================================================

const MAX_RESULTATS = 12;

const simplifier = texte =>
    nameAff(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Search({ search }) {

    const navigate = useNavigate()

    const [texte, setTexte] = useState("")
    const [ouvert, setOuvert] = useState(false)
    const [actif, setActif] = useState(0)

    // Petit écran : la recherche est repliée en icône ; dépliée, elle recouvre la barre
    const [deplie, setDeplie] = useState(false)
    const champ = useRef(null)

    useEffect(() => {
        if (deplie) {
            champ.current?.focus()
        }
    }, [deplie])

    function replier() {
        setDeplie(false)
        setOuvert(false)
        setTexte("")
    }

    // Les résultats ne sont cherchés (et leurs contenus chargés) qu'une fois la frappe posée
    const [cherche, setCherche] = useState("")

    useEffect(() => {
        const minuterie = setTimeout(() => setCherche(simplifier(texte.trim())), 200)
        return () => clearTimeout(minuterie)
    }, [texte])

    // Ceux dont le nom commence par le texte d'abord, puis par ordre alphabétique
    const trouves = cherche.length < 2
        ? []
        : search
            .map(e => ({ e, nom: simplifier(e.name) }))
            .filter(x => x.nom.includes(cherche))
            .sort((a, b) =>
                (b.nom.startsWith(cherche) - a.nom.startsWith(cherche)) || a.nom.localeCompare(b.nom))
            .map(x => x.e)

    const affiches = trouves.slice(0, MAX_RESULTATS)

    function ouvrir(element) {

        if (!element) {
            return
        }

        setTexte("")
        setOuvert(false)
        setDeplie(false)
        navigate("/GE/" + jeu + "/" + element.type + "/" + element.id)
    }

    function touche(e) {

        if (e.key === "Enter") {
            e.preventDefault()
            ouvrir(affiches[actif] || affiches[0])
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            setActif(a => Math.min(a + 1, affiches.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActif(a => Math.max(a - 1, 0))
        } else if (e.key === "Escape") {
            replier()
        }
    }

    return (
        <div className={"ge-recherche" + (deplie ? " ge-recherche-ouverte" : "")} role="search">

            {/* (petit écran seulement : ouvre le champ sur toute la barre) */}
            <button
                type="button"
                className="ge-bouton ge-recherche-ouvrir"
                title="Rechercher un élément"
                aria-label="Rechercher un élément"
                onClick={() => setDeplie(true)}
            >
                <IconeLoupe size={18} />
            </button>

            <span className="ge-recherche-loupe" aria-hidden="true">
                <IconeLoupe size={16} />
            </span>

            <input
                ref={champ}
                aria-label="Rechercher un élément"
                value={texte}
                onChange={e => {
                    setTexte(e.target.value)
                    setOuvert(true)
                    setActif(0)
                }}
                onFocus={() => setOuvert(true)}
                // (laisse le temps au clic sur un résultat d'arriver)
                onBlur={() => setTimeout(() => setOuvert(false), 150)}
                onKeyDown={touche}
                id="search"
                type="search"
                autoComplete="off"
                placeholder="Rechercher un élément"
            />

            <button
                type="button"
                className="ge-bouton ge-recherche-fermer"
                title="Fermer la recherche"
                aria-label="Fermer la recherche"
                // (mousedown : avant que le champ ne perde le focus)
                onMouseDown={e => e.preventDefault()}
                onClick={replier}
            >
                <X size={18} />
            </button>

            {ouvert && cherche.length >= 2 && (
                <div data-resultats-recherche>
                    {affiches.length === 0 && (
                        <div style={{ padding: "6px 10px", color: "#666" }}>Aucun résultat.</div>
                    )}

                    {affiches.map((element, k) => (
                        <div
                            key={element.id}
                            // (mousedown : avant que le champ ne perde le focus)
                            onMouseDown={e => {
                                e.preventDefault()
                                ouvrir(element)
                            }}
                            onMouseEnter={() => setActif(k)}
                            style={{
                                padding: "4px 10px",
                                cursor: "pointer",
                                backgroundColor: k === actif ? "#e3f2fd" : undefined,
                            }}
                        >
                            {/* Le nom et ses icônes, ce à quoi il est lié, son type */}
                            <LigneElement jeu={jeu} element={element} />
                        </div>
                    ))}

                    {trouves.length > affiches.length && (
                        <div style={{ padding: "4px 10px", fontSize: 12, color: "#666", borderTop: "1px solid #ddd" }}>
                            {trouves.length - affiches.length} autre(s) : préciser la recherche.
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}


// « Ajouter » : menu des types d'élément du jeu, ouvert au clic. À côté, les
// éléments supprimés.
function Add() {

    const navigate = useNavigate();

    // Types du jeu, par ordre alphabétique de leur nom
    const types = Object.entries(games[jeu].handlers)
        .map(([cle, handler]) => ({ cle, nom: handler.name }))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

    return (
        <>
            <Menu
                classe="ge-bouton-principal"
                titre="Ajouter un élément"
                colonnes={types.length > 8}
                bouton={<>
                    <Plus size={17} />
                    <span className="ge-libelle">Ajouter</span>
                </>}
            >
                {types.map(type => (
                    <li key={type.cle}>
                        <Link to={"/GE/" + jeu + "/" + type.cle + "/new"} role="menuitem">
                            {type.nom}
                        </Link>
                    </li>
                ))}
            </Menu>

            <button
                type="button"
                className="ge-bouton ge-bouton-icone"
                onClick={() => navigate("/GE/" + jeu + "/deleted")}
                title="Éléments supprimés"
                aria-label="Éléments supprimés"
            >
                <Trash2 size={17} />
            </button>
        </>
    )
}
