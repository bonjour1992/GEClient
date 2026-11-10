import { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate, Link } from "react-router";
import { Trash2 } from "lucide-react";
import { useRemp, useSearch } from "../lib/store"
import { games } from "../Game/games";
import { nameAff } from "../Component/Text";
import { LigneElement } from "../Component/NomElement";

let jeu

export default function HeaderBar() {

    jeu = useParams().jeu

    const updateRemp = useRemp((state) => state.update);
    const updateSearch = useSearch((state) => state.update);
    const search = useSearch((state) => state.search)

    updateSearch(jeu);
    updateRemp(jeu);


    return (<>
        <Search search={search} />
        <Add />
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
            setOuvert(false)
        }
    }

    return (
        <div
            className="no-print ge-bar-search"
            style={{
                zIndex: 50,
                backgroundColor: "white",
                position: "fixed",
                top: 0,
                width: "20%",
                marginLeft: "40%",
                height: 40,
                borderBottomWidth: 2,
                borderBottomStyle: "solid"
            }}
        >

            <span style={{ fontSize: 24 }}>
                &#128269;
            </span>

            <input
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
                placeholder="rechercher"
                style={{
                    fontSize: 20,
                    width: "80%"
                }}
            />

            {ouvert && cherche.length >= 2 && (
                <div
                    data-resultats-recherche
                    style={{
                        position: "fixed",
                        top: 40,
                        left: "40%",
                        width: "min(420px, 60vw)",
                        maxHeight: "70vh",
                        overflowY: "auto",
                        backgroundColor: "white",
                        border: "2px solid #1565c0",
                        borderTop: "none",
                        borderRadius: "0 0 8px 8px",
                        boxShadow: "0 4px 10px #0004",
                        fontFamily: "Arial, sans-serif",
                        fontSize: 14,
                    }}
                >
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


function Add() {

    const navigate = useNavigate();


    function show() {

        document
            .getElementById("listAdd")
            .setAttribute(
                "style",
                "display:block;"
            )

    }


    function hide() {

        document
            .getElementById("listAdd")
            .setAttribute(
                "style",
                "display:none;"
            )

    }


    function openDeleted() {

        navigate(
            "/GE/" + jeu + "/deleted"
        );

    }


    return (
        <div
            className="no-print ge-bar-add"
            style={{
                zIndex: 50,
                backgroundColor: "white",
                position: "fixed",
                top: 0,
                width: "20%",
                marginLeft: "60%",
                height: 40,
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                display: "flex",
                alignItems: "flex-start",
                gap: 8
            }}
        >

            <div
                style={{
                    backgroundColor: "white"
                }}
                onMouseLeave={hide}
            >

                <button
                    onMouseEnter={show}
                    style={{
                        fontSize: 20
                    }}
                >
                    Ajouter
                </button>

                <ul
                    id="listAdd"
                    style={{
                        display: "none"
                    }}
                >

                    {Object.keys(
                        games[jeu].handlers
                    ).map((e, i) => {

                        return (
                            <li key={i}>

                                <Link
                                    to={
                                        "/GE/" +
                                        jeu +
                                        "/" +
                                        e +
                                        "/new"
                                    }
                                >
                                    {
                                        games[jeu]
                                            .handlers[e]
                                            .name
                                    }
                                </Link>

                            </li>
                        )

                    })}

                </ul>

            </div>


            <button
                onClick={openDeleted}
                title="Éléments supprimés"
                style={{
                    height: 34,
                    width: 38,
                    padding: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                }}
            >
                <Trash2 size={22} />
            </button>

        </div>
    )
}
