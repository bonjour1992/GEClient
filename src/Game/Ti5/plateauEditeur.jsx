import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router";
import FormBase from "../../Input/FormBase";
import { ModalPickerInput } from "../../Input/ModalPickerInput";
import { useSearch, getFromType } from "../../lib/store";
import { getElement } from "../../lib/fetch";
import { Link } from "../../lib/datatype";
import { horsReserveCommune } from "./engine/miseEnPlace";
import {
    nombreCases,
    distanceIndex,
    estAncienFormat,
    normaliserPlateau,
} from "./hexSpirale";
import {
    PlateauView,
    typeSystem,
    typeSystemColor,
    dimensionsPlateau,
    indiceCase,
} from "./plateauVue";

// ============================================================
// ÉDITEUR DE PLATEAU
//
// L'affichage (PlateauView) est pur. Toutes les interactions
// sont gérées ici, par délégation, sur le conteneur du plateau :
// la case visée est retrouvée grâce à son attribut data-case.
//
//   clic gauche            -> applique le type de la palette
//   clic droit             -> tourne le système (case sélection)
//   glisser un système     -> échange deux cases
//
// Le glisser utilise les pointer events (souris, tactile, stylet)
// plutôt que le drag & drop HTML5, qui imposerait l'attribut
// draggable dans l'affichage et ne marche pas au tactile.
// ============================================================

// Distance (px) à parcourir avant qu'un appui devienne un glisser
const SEUIL_GLISSER = 5;

// Le système d'une case est-il déplaçable ?
function aUnSysteme(content, index) {
    return content.type[index] === "select" && !!content.systems[index];
}

// ============================================================
// FORMULAIRE
// ============================================================

export function Form({
    content: contenuBrut,
    onChange,
    onSubmit,
    style,
}) {

    const jeu = useParams().jeu;
    const search = useSearch(state => state.search);

    const content = useMemo(
        () => normaliserPlateau(contenuBrut),
        [contenuBrut]
    );

    const anneaux = content.anneaux;
    const nombre = nombreCases(anneaux);
    const { hauteur } = dimensionsPlateau(anneaux);

    const [typeSelectionne, setTypeSelectionne] = useState("natal");
    const [generationEnCours, setGenerationEnCours] = useState(false);

    // Glisser en cours : { source, cible } (pour l'affichage)
    const [glisser, setGlisser] = useState(null);

    // Appui en cours : { source, x, y, actif, cible }
    const appui = useRef(null);

    // ========================================================
    // CONVERSION DE L'ANCIEN FORMAT (grille 13 x 13)
    //
    // Les modifications se font par indice : l'état de
    // l'éditeur doit déjà être au format spirale.
    // ========================================================

    const ancienFormat = estAncienFormat(contenuBrut);

    useEffect(() => {

        if (!ancienFormat || !onChange) {
            return;
        }

        const converti = normaliserPlateau(contenuBrut);

        onChange("type", converti.type);
        onChange("systems", converti.systems);
        onChange("rotates", converti.rotates);
        onChange("anneaux", converti.anneaux);

    }, [ancienFormat]);

    // ========================================================
    // ACTIONS
    // ========================================================

    function definirType(index) {
        onChange("type", typeSelectionne, index);
    }

    function tourner(index) {
        const rotates = [...content.rotates];
        rotates[index] = ((rotates[index] || 0) + 1) % 6;
        onChange("rotates", rotates);
    }

    function echanger(source, cible) {

        if (source === cible) {
            return;
        }

        const permuter = (tableau, defaut) => {
            const resultat = [...tableau];
            resultat[source] = tableau[cible] ?? defaut;
            resultat[cible] = tableau[source] ?? defaut;
            return resultat;
        };

        onChange("type", permuter(content.type, "vide"));
        onChange("systems", permuter(content.systems, null));
        onChange("rotates", permuter(content.rotates, 0));
    }

    // Ajoute (delta > 0) ou retire (delta < 0) des anneaux.
    // Les cases étant en spirale, les autres gardent leur numéro.
    function changerAnneaux(delta) {

        const nouveau = Math.max(0, anneaux + delta);

        if (nouveau === anneaux) {
            return;
        }

        const n = nombreCases(nouveau);

        if (nouveau < anneaux) {

            const nonVides = content.type
                .slice(n)
                .filter((t, i) =>
                    (t && t !== "vide") || content.systems[n + i]
                ).length;

            if (
                nonVides > 0 &&
                !window.confirm(
                    `L'anneau ${anneaux} contient ${nonVides} case(s) non vide(s). ` +
                    "Les supprimer ?"
                )
            ) {
                return;
            }
        }

        const ajuster = (tableau, valeur) => {
            const resultat = tableau.slice(0, n);

            while (resultat.length < n) {
                resultat.push(valeur);
            }

            return resultat;
        };

        onChange("type", ajuster(content.type, "vide"));
        onChange("systems", ajuster(content.systems, null));
        onChange("rotates", ajuster(content.rotates, 0));
        onChange("anneaux", nouveau);
    }

    // Tire au hasard un système pour chaque case "hasard".
    // Un nom commençant par !N! donne N exemplaires du système.
    // Les systèmes spéciaux ne sont pas tirés.
    async function generer() {

        if (!jeu || !search?.length) {
            console.error("Impossible de générer : recherche vide.");
            return;
        }

        setGenerationEnCours(true);

        try {

            const disponibles = [];

            for (const systeme of getFromType(search, ["system"])) {

                const element = await getElement(systeme.id);

                if (!element || horsReserveCommune(element.content)) {
                    continue;
                }

                const match = (element.content?.name || "").match(/^!(\d+)!/);
                const exemplaires = match ? Number(match[1]) : 1;

                for (let i = 0; i < exemplaires; i++) {
                    disponibles.push(element);
                }
            }

            if (!disponibles.length) {
                console.error("Aucun système disponible.");
                return;
            }

            const types = [...content.type];
            const systems = [...content.systems];
            const rotates = [...content.rotates];

            types.forEach((type, index) => {

                if (type !== "rand") {
                    return;
                }

                if (!disponibles.length) {
                    console.warn("Plus de systèmes disponibles pour les cases hasard.");
                    return;
                }

                const position = Math.floor(Math.random() * disponibles.length);
                const [systeme] = disponibles.splice(position, 1);

                types[index] = "select";
                systems[index] = new Link("system", systeme.id);
                rotates[index] = 0;
            });

            onChange("type", types);
            onChange("systems", systems);
            onChange("rotates", rotates);

        } catch (error) {
            console.error("Erreur pendant la génération du plateau :", error);
        } finally {
            setGenerationEnCours(false);
        }
    }

    // ========================================================
    // INTERACTIONS (délégation sur le conteneur)
    // ========================================================

    function caseSousPointeur(event) {
        return indiceCase(
            document.elementFromPoint(event.clientX, event.clientY)
        );
    }

    function onPointerDown(event) {

        if (event.button !== 0) {
            return;
        }

        const source = indiceCase(event.target);

        if (source === null) {
            return;
        }

        appui.current = {
            source,
            x: event.clientX,
            y: event.clientY,
            actif: false,
            cible: null,
        };
    }

    function onPointerMove(event) {

        const a = appui.current;

        if (!a) {
            return;
        }

        if (!a.actif) {

            const deplacement = Math.hypot(
                event.clientX - a.x,
                event.clientY - a.y
            );

            if (deplacement < SEUIL_GLISSER || !aUnSysteme(content, a.source)) {
                return;
            }

            a.actif = true;
            event.currentTarget.setPointerCapture(event.pointerId);
        }

        const cible = caseSousPointeur(event);

        if (cible !== a.cible || !glisser) {
            a.cible = cible;
            setGlisser({ source: a.source, cible });
        }
    }

    function onPointerUp(event) {

        const a = appui.current;
        appui.current = null;

        if (!a) {
            return;
        }

        if (a.actif) {

            setGlisser(null);

            const cible = caseSousPointeur(event);

            if (cible !== null) {
                echanger(a.source, cible);
            }

            return;
        }

        // Simple clic (sans glisser) sur la même case
        if (indiceCase(event.target) === a.source) {
            definirType(a.source);
        }
    }

    function onPointerCancel() {
        appui.current = null;
        setGlisser(null);
    }

    function onContextMenu(event) {

        const index = indiceCase(event.target);

        if (index === null) {
            return;
        }

        event.preventDefault();

        if (aUnSysteme(content, index)) {
            tourner(index);
        }
    }

    // ========================================================
    // DÉCORATIONS DES CASES
    // ========================================================

    function styleCase(index) {

        const style = {
            cursor: aUnSysteme(content, index) ? "grab" : "pointer",
        };

        if (glisser?.source === index) {
            style.opacity = 0.4;
            style.cursor = "grabbing";
        }

        if (glisser && glisser.cible === index && glisser.source !== index) {
            // Le fond noir de la case sert de bordure
            style.backgroundColor = "#ff9800";
        }

        return style;
    }

    // Sélecteur de système sur les cases "sélection".
    // Il est isolé des interactions du plateau : ses événements
    // (y compris ceux de la fenêtre modale, rendue par portail)
    // ne remontent pas jusqu'au conteneur.
    function renduCase(index) {

        if (content.type[index] !== "select") {
            return null;
        }

        const arreter = event => event.stopPropagation();

        return (
            <div
                onPointerDown={arreter}
                onPointerUp={arreter}
                onClick={arreter}
                onContextMenu={arreter}
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 5,
                    transform: "translateX(-50%)",
                    zIndex: 30,
                    cursor: "default",
                }}
            >
                <ModalPickerInput
                    name="systems"
                    index={index}
                    value={content}
                    onChange={onChange}
                    type={["system"]}
                />
            </div>
        );
    }

    // ========================================================
    // RENDU
    // ========================================================

    return (
        <FormBase
            content={contenuBrut}
            onChange={onChange}
            onSubmit={onSubmit}
            style={style}
        >
            <div style={{ display: "flex", flexDirection: "column", overflowX: "auto" }}>

                {/* "safe center" : si le plateau est plus large que
                    l'écran, il reste aligné à gauche (défilable). */}
                <div style={{ display: "flex", justifyContent: "safe center" }}>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>

                        <Palette
                            typeSelectionne={typeSelectionne}
                            setTypeSelectionne={setTypeSelectionne}
                            anneaux={anneaux}
                            nombre={nombre}
                            changerAnneaux={changerAnneaux}
                            generer={generer}
                            generationEnCours={generationEnCours}
                        />

                        <div
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerCancel}
                            onContextMenu={onContextMenu}
                            style={{
                                userSelect: "none",
                                touchAction: glisser ? "none" : "pinch-zoom",
                            }}
                        >
                            <PlateauView
                                content={content}
                                styleCase={styleCase}
                                renduCase={renduCase}
                                systemesInertes
                            />
                        </div>

                        <StatistiquesPlateau
                            content={content}
                            hauteur={hauteur}
                        />

                    </div>
                </div>
            </div>
        </FormBase>
    );
}

// ============================================================
// PALETTE
// ============================================================

function Palette({
    typeSelectionne,
    setTypeSelectionne,
    anneaux,
    nombre,
    changerAnneaux,
    generer,
    generationEnCours,
}) {

    const boutonAnneau = {
        width: 32,
        height: 32,
        cursor: "pointer",
        fontWeight: "bold",
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minWidth: 130,
                padding: 10,
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
            }}
        >
            <strong>Palette</strong>

            {Object.entries(typeSystem).map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => setTypeSelectionne(key)}
                    style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        backgroundColor: typeSystemColor[key],
                        color: key === "vide" ? "#000" : "#fff",
                        border: typeSelectionne === key
                            ? "3px solid #ff9800"
                            : "1px solid #555",
                        borderRadius: 5,
                        fontWeight: typeSelectionne === key ? "bold" : "normal",
                    }}
                >
                    {label}
                </button>
            ))}

            {/* TAILLE DE LA GRILLE */}

            <strong style={{ marginTop: 8 }}>Grille</strong>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                }}
            >
                <button
                    type="button"
                    title="Retirer l'anneau extérieur"
                    disabled={anneaux === 0}
                    onClick={() => changerAnneaux(-1)}
                    style={boutonAnneau}
                >
                    −
                </button>

                <span style={{ textAlign: "center", fontSize: 13 }}>
                    {anneaux} anneau{anneaux > 1 ? "x" : ""}
                    <br />
                    {nombre} cases
                </span>

                <button
                    type="button"
                    title="Ajouter un anneau autour de la grille"
                    onClick={() => changerAnneaux(1)}
                    style={boutonAnneau}
                >
                    +
                </button>
            </div>

            {/* GÉNÉRER */}

            <button
                type="button"
                disabled={generationEnCours}
                onClick={generer}
                style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    cursor: generationEnCours ? "wait" : "pointer",
                    backgroundColor: "#333",
                    color: "#fff",
                    border: "1px solid #111",
                    borderRadius: 5,
                    fontWeight: "bold",
                    opacity: generationEnCours ? 0.6 : 1,
                }}
            >
                {generationEnCours ? "Génération..." : "Générer"}
            </button>

            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                Clic : appliquer le type
                <br />
                Clic droit : tourner
                <br />
                Glisser un système : échanger
            </div>
        </div>
    );
}

// ============================================================
// STATISTIQUES
//
// Pour chaque case "natal" (sans système, repérée par sa
// position), avec d = distance + 1 :
//
//   influence  = somme(inf / d²)
//   ressource  = somme(res / d²)
//   ruines     = somme(1 / d²) par planète en ruine
//   spécialités: 1 spécialité = 1, puis +0.5 par spécialité
//                supplémentaire sur la même planète, / d²
//   total      = influence + ressource
//
// Les systèmes spéciaux sont inclus.
// ============================================================

// Type de spécialité technologique (chaîne ou objet)
function typeSpecialite(specialite) {

    if (typeof specialite === "string") {
        return specialite;
    }

    if (specialite && typeof specialite === "object") {
        return specialite.type || specialite.name || specialite.id || "inconnu";
    }

    return String(specialite);
}

async function calculerStatistiques(content) {

    // Systèmes présents sur le plateau, avec leurs planètes
    const systemesPlateau = [];

    const specialitesTechnologiques = {};
    const planetesParType = {};
    let planetesLegendaires = 0;

    for (let index = 0; index < content.systems.length; index++) {

        const lien = content.systems[index];

        if (!lien || lien.id === undefined || lien.id === -1) {
            continue;
        }

        let systeme;

        try {
            systeme = (await getElement(lien.id))?.content;
        } catch (error) {
            console.error("Impossible de récupérer le système", lien, error);
        }

        if (!systeme) {
            continue;
        }

        const planetes = [];

        for (const lienPlanete of systeme.elems || []) {

            if (!lienPlanete || lienPlanete.id === undefined || lienPlanete.id === -1) {
                continue;
            }

            let planete;

            try {
                planete = (await getElement(lienPlanete.id))?.content;
            } catch (error) {
                console.error("Impossible de récupérer la planète", lienPlanete, error);
            }

            if (!planete) {
                continue;
            }

            const typePlanete = planete.planetType || planete.type || "inconnu";
            planetesParType[typePlanete] = (planetesParType[typePlanete] || 0) + 1;

            if (planete.legendary === true) {
                planetesLegendaires++;
            }

            const techSpe = Array.isArray(planete.techSpe) ? planete.techSpe : [];

            for (const specialite of techSpe) {
                const t = typeSpecialite(specialite);
                specialitesTechnologiques[t] = (specialitesTechnologiques[t] || 0) + 1;
            }

            planetes.push({
                res: Number(planete.res) || 0,
                inf: Number(planete.inf) || 0,
                ruine: planete.ruine === true,
                techSpe,
            });
        }

        systemesPlateau.push({ index, planetes });
    }

    // Statistiques de chaque case natale
    const natals = [];

    content.type.forEach((type, index) => {

        if (type !== "natal") {
            return;
        }

        let influence = 0;
        let ressource = 0;
        let ruines = 0;
        let specialites = 0;

        for (const systeme of systemesPlateau) {

            if (systeme.index === index) {
                continue;
            }

            const ponderation = Math.pow(distanceIndex(index, systeme.index) + 1, 2);

            for (const planete of systeme.planetes) {

                ressource += planete.res / ponderation;
                influence += planete.inf / ponderation;

                if (planete.ruine) {
                    ruines += 1 / ponderation;
                }

                const n = planete.techSpe.length;

                if (n > 0) {
                    specialites += (1 + (n - 1) * 0.5) / ponderation;
                }
            }
        }

        natals.push({
            index,
            numero: index + 1,
            influence,
            ressource,
            ruines,
            specialitesTechnologiques: specialites,
            total: influence + ressource,
        });
    });

    return {
        natals,
        globales: { specialitesTechnologiques, planetesParType, planetesLegendaires },
    };
}

function LigneStat({ libelle, valeur, bordure = true }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                padding: bordure ? "6px 0" : "3px 0",
                borderBottom: bordure ? "1px solid #ddd" : undefined,
            }}
        >
            <span>{libelle}</span>
            <strong>{valeur}</strong>
        </div>
    );
}

function ListeComptage({ titre, valeurs, vide }) {

    const entrees = Object.entries(valeurs);

    return (
        <>
            <div style={{ fontWeight: "bold", marginTop: 12, marginBottom: 5 }}>
                {titre}
            </div>

            {entrees.length === 0 && (
                <div style={{ color: "#666", fontSize: 13 }}>{vide}</div>
            )}

            {entrees.map(([type, nombre]) => (
                <LigneStat key={type} libelle={type} valeur={nombre} bordure={false} />
            ))}
        </>
    );
}

function StatistiquesPlateau({ content, hauteur }) {

    const [resultat, setResultat] = useState(null);
    const [enCours, setEnCours] = useState(false);

    useEffect(() => {

        let annule = false;

        setEnCours(true);

        calculerStatistiques(content)
            .then(r => {
                if (!annule) {
                    setResultat(r);
                }
            })
            .catch(error => {
                console.error("Erreur pendant le calcul des statistiques :", error);

                if (!annule) {
                    setResultat(null);
                }
            })
            .finally(() => {
                if (!annule) {
                    setEnCours(false);
                }
            });

        // Un recalcul plus récent remplace celui-ci
        return () => {
            annule = true;
        };

    }, [content.type, content.systems]);

    const globales = resultat?.globales;
    const natals = resultat?.natals || [];

    return (
        <div
            style={{
                width: 320,
                minWidth: 320,
                maxHeight: hauteur,
                overflowY: "auto",
                padding: 12,
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
                boxSizing: "border-box",
            }}
        >
            <h3 style={{ margin: "0 0 12px 0" }}>Statistiques</h3>

            {enCours && <div>Calcul en cours...</div>}

            {!enCours && globales && (
                <>
                    {/* STATISTIQUES GLOBALES */}

                    <div
                        style={{
                            padding: 10,
                            marginBottom: 15,
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: 6,
                        }}
                    >
                        <div style={{ fontWeight: "bold", fontSize: 16 }}>
                            Statistiques globales
                        </div>

                        <ListeComptage
                            titre="Spécialités technologiques"
                            valeurs={globales.specialitesTechnologiques}
                            vide="Aucune spécialité"
                        />

                        <ListeComptage
                            titre="Planètes par type"
                            valeurs={globales.planetesParType}
                            vide="Aucune planète"
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 12,
                                paddingTop: 8,
                                borderTop: "1px solid #ddd",
                            }}
                        >
                            <span>Planètes légendaires</span>
                            <strong>{globales.planetesLegendaires}</strong>
                        </div>
                    </div>

                    {/* STATISTIQUES NATALES */}

                    <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
                        Statistiques natales
                    </div>

                    {natals.length === 0 && (
                        <div style={{ color: "#666" }}>Aucun système natal.</div>
                    )}

                    {natals.map(natal => (
                        <div
                            key={natal.index}
                            style={{
                                padding: 10,
                                marginBottom: 10,
                                background: "#fff",
                                border: "1px solid #ccc",
                                borderRadius: 6,
                            }}
                        >
                            <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
                                Natal {natal.numero}
                            </div>

                            <LigneStat libelle="Influence" valeur={natal.influence.toFixed(4)} />
                            <LigneStat libelle="Ressource" valeur={natal.ressource.toFixed(4)} />
                            <LigneStat libelle="Ruines" valeur={natal.ruines.toFixed(4)} />
                            <LigneStat
                                libelle="Spécialités technologiques"
                                valeur={natal.specialitesTechnologiques.toFixed(4)}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginTop: 8,
                                    padding: 9,
                                    background: "#eee",
                                    borderRadius: 4,
                                    fontSize: 17,
                                    fontWeight: "bold",
                                }}
                            >
                                <span>Total</span>
                                <span>{natal.total.toFixed(4)}</span>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
