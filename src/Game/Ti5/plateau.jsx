
import { useState, useEffect } from "react";
import { ElementContent } from "../../lib/datatype";
import { A4Pa } from "../../Component/Size";
import FormBase from "../../Input/FormBase";
import { ModalPickerInput } from "../../Input/ModalPickerInput";
import { LoadAndDisplay } from "../../Component/LoadAndDisplay";
import { systemSize } from "./systeme";
import { useSearch, getFromType } from "../../lib/store";
import { getElement } from "../../lib/fetch";
import { useParams } from "react-router";
import { Link } from "../../lib/datatype";
// ============================================================
// TYPES DE SYSTÈME
// ============================================================

export const typeSystem = {
    natal: "natal",
    vide: "vide",
    rand: "hasard",
    select: "selection",
};

// ============================================================
// COULEURS DES TYPES
// ============================================================

export const typeSystemColor = {
    natal: "#1a5021",
    vide: "#eeeeee",
    rand: "#7db7e8",
    select: "#631a1a",
};

// ============================================================
// DONNÉES
// ============================================================

class plateau extends ElementContent {
    type = Array(13 * 13).fill("vide");
    systems = Array(13 * 13).fill(null);
    rotates = Array(13 * 13).fill(0);
    joueur = 6;
}

// ============================================================
// AFFICHAGE COMMUN DU PLATEAU
// ============================================================
function PlateauView({
    content,
    style = {},
    context,
    explication,

    // Mode édition
    editable = false,
    onChange,

    // Drag & drop
    onDragStartSystem,
    onDropSystem,
    onDragEndSystem,
}) {
    const jeu = useParams().jeu;

    const search = useSearch(
        state => state.search
    );

    const dragAndDropEnabled =
        editable &&
        typeof onDragStartSystem === "function" &&
        typeof onDropSystem === "function";

    const taille = 13;

    // ========================================================
    // DIMENSIONS
    // ========================================================

    const rayon = 60;
    const largeurHex = rayon * 2;
    const hauteurHex = Math.sqrt(3) * rayon;
    const pasX = rayon * 1.5;
    const pasY = hauteurHex;
    const decalageY = hauteurHex / 2;

    const largeurPlateau =
        largeurHex +
        (taille - 1) * pasX;

    const hauteurPlateau =
        hauteurHex +
        (taille - 1) * pasY +
        decalageY;

    // ========================================================
    // PALETTE
    // ========================================================

    const [typeSelectionne, setTypeSelectionne] =
        useState("natal");

    const [generationEnCours, setGenerationEnCours] =
        useState(false);

    // ========================================================
    // STATISTIQUES
    // ========================================================

    const [statistiquesNatals, setStatistiquesNatals] =
        useState([]);

    const [calculStatistiquesEnCours, setCalculStatistiquesEnCours] =
        useState(false);

const [statistiquesGlobales, setStatistiquesGlobales] =
    useState({
        specialitesTechnologiques: {},
        planetesParType: {},
        planetesLegendaires: 0,
    });

    // ========================================================
    // COORDONNÉES HEXAGONALES
    // ========================================================

    function getHexCoordinates(index) {

        const colonne =
            Math.floor(index / taille);

        const ligne =
            index % taille;

        const q =
            colonne - 6;

        const r =
            (ligne -
                Math.floor(colonne / 2)) -
            (6 -
                Math.floor((6 + 1) / 2));

        const s =
            -q - r;

        return {
            q,
            r,
            s,
        };
    }

    // ========================================================
    // DISTANCE HEXAGONALE
    // ========================================================

    function distanceHex(index1, index2) {

        const a =
            getHexCoordinates(index1);

        const b =
            getHexCoordinates(index2);

        return Math.max(
            Math.abs(a.q - b.q),
            Math.abs(a.r - b.r),
            Math.abs(a.s - b.s)
        );
    }

    // ========================================================
    // NUMÉRO DE CASE
    // ========================================================

    function numeroCase(colonne, ligne) {

        const hexQ = colonne - 6;

        const hexR =
            (ligne - Math.floor(colonne / 2)) -
            (6 - Math.floor((6 + 1) / 2));

        const hexS =
            -hexQ - hexR;

        const distance =
            Math.max(
                Math.abs(hexQ),
                Math.abs(hexR),
                Math.abs(hexS)
            );

        if (distance === 0) {
            return 0;
        }

        const positionX =
            colonne * pasX;

        const positionY =
            ligne * pasY +
            (colonne % 2 === 1
                ? decalageY
                : 0);

        const centreX =
            6 * pasX;

        const centreY =
            6 * pasY;

        const angle =
            Math.atan2(
                positionY - centreY,
                positionX - centreX
            );

        let angleHoraire =
            angle + Math.PI / 2;

        if (angleHoraire < 0) {
            angleHoraire += 2 * Math.PI;
        }

        const nombreDansAnneau =
            6 * distance;

        const positionDansAnneau =
            Math.round(
                angleHoraire /
                (2 * Math.PI / nombreDansAnneau)
            ) % nombreDansAnneau;

        const premierNumero =
            1 +
            3 *
            (distance - 1) *
            distance;

        return (
            premierNumero +
            positionDansAnneau
        );
    }

    // ========================================================
    // ROTATION
    // ========================================================

    function rotateSystem(index) {

        if (!editable || !onChange) {
            return;
        }

        const rotations = [
            ...(content.rotates || []),
        ];

        const rotationActuelle =
            rotations[index] || 0;

        rotations[index] =
            (rotationActuelle + 1) % 6;

        onChange(
            "rotates",
            rotations
        );
    }

    // ========================================================
    // GÉNÉRATION DES SYSTÈMES
    //
    // Les systèmes spéciaux sont exclus de la génération.
    // Ils restent cependant inclus dans les statistiques.
    // ========================================================

    async function generer() {

        if (!onChange) {
            return;
        }

        if (!jeu) {
            console.error(
                "Impossible de générer : jeu introuvable."
            );

            return;
        }

        if (!search?.length) {
            console.error(
                "Impossible de générer : recherche vide."
            );

            return;
        }

        setGenerationEnCours(true);

        try {

            const listeSystemes =
                getFromType(
                    search,
                    ["system"]
                );

            if (!listeSystemes.length) {

                console.error(
                    "Aucun système disponible."
                );

                return;
            }

            const systemes = [];

            for (
                const systeme of listeSystemes
            ) {

                const element =
                    await getElement(
                        systeme.id
                    );

                if (!element) {
                    continue;
                }

                // Les systèmes spéciaux ne sont pas générés
                if (
                    element.content?.special === true
                ) {
                    continue;
                }

                const nom =
                    element.content?.name || "";

                const match =
                    nom.match(/^!(\d+)!/);

                const nombre =
                    match
                        ? Number(match[1])
                        : 1;

                if (nombre <= 0) {
                    continue;
                }

                for (
                    let i = 0;
                    i < nombre;
                    i++
                ) {

                    systemes.push(
                        element
                    );
                }
            }

            if (!systemes.length) {

                console.error(
                    "Aucun système disponible après filtrage."
                );

                return;
            }

            const types = [
                ...(content.type || []),
            ];

            const systems = [
                ...(content.systems || []),
            ];

            const rotates = [
                ...(content.rotates || []),
            ];

            const systemesDisponibles = [
                ...systemes,
            ];

            types.forEach(
                (type, index) => {

                    if (type !== "rand") {
                        return;
                    }

                    if (
                        systemesDisponibles.length === 0
                    ) {

                        console.warn(
                            "Plus de systèmes disponibles " +
                            "pour les cases hasard."
                        );

                        return;
                    }

                    const position =
                        Math.floor(
                            Math.random() *
                            systemesDisponibles.length
                        );

                    const systeme =
                        systemesDisponibles[
                            position
                        ];

                    systemesDisponibles.splice(
                        position,
                        1
                    );

                    types[index] =
                        "select";

                    systems[index] =
                        new Link(
                            "system",
                            systeme.id
                        );

                    rotates[index] =
                        0;
                }
            );

            onChange(
                "type",
                types
            );

            onChange(
                "systems",
                systems
            );

            onChange(
                "rotates",
                rotates
            );

        } catch (error) {

            console.error(
                "Erreur pendant la génération du plateau :",
                error
            );

        } finally {

            setGenerationEnCours(false);
        }
    }

    // ========================================================
    // CALCUL DES STATISTIQUES NATALES
    //
    // Pour chaque case "natal", on calcule :
    //
    //   influence = somme(inf / distance²)
    //   ressource = somme(res / distance²)
    //   total     = influence + ressource
    //
    // Les cases "natal" n'ont PAS de système associé.
    // Elles sont identifiées uniquement par leur position.
    //
    // Les systèmes spéciaux sont inclus.
    // ========================================================

  // ========================================================
// CALCUL DES STATISTIQUES
// ========================================================

async function calculerStatistiques() {

    if (!content) {
        setStatistiquesNatals([]);
        return;
    }

    setCalculStatistiquesEnCours(true);

    try {

        // =================================================
        // SYSTÈMES PRÉSENTS SUR LE PLATEAU
        // =================================================

        const systemesPlateau = [];

        for (
            let index = 0;
            index < taille * taille;
            index++
        ) {

            const systemLink =
                content.systems?.[index];

            // Les cases natal n'ont pas de système.
            if (
                !systemLink ||
                systemLink.id === undefined ||
                systemLink.id === -1
            ) {
                continue;
            }

            try {

                const element =
                    await getElement(
                        systemLink.id
                    );

                if (!element?.content) {
                    continue;
                }

                /*
                 * Les systèmes spéciaux sont volontairement
                 * conservés ici.
                 */
                systemesPlateau.push({
                    index,
                    system: element.content,
                });

            } catch (error) {

                console.error(
                    "Impossible de récupérer le système",
                    systemLink,
                    error
                );
            }
        }

        // =================================================
        // STATISTIQUES GLOBALES
        // =================================================

        const specialitesTechnologiquesGlobales = {};
        const planetesParType = {};
        let planetesLegendaires = 0;

        // =================================================
        // CHARGEMENT DES PLANÈTES
        //
        // On prépare les données une seule fois afin de
        // pouvoir les utiliser pour tous les natals.
        // =================================================

        for (
            const systeme of systemesPlateau
        ) {

            const elems =
                systeme.system?.elems || [];

            const planetes = [];

            for (
                const planetLink of elems
            ) {

                if (
                    !planetLink ||
                    planetLink.id === undefined ||
                    planetLink.id === -1
                ) {
                    continue;
                }

                try {

                    const planetElement =
                        await getElement(
                            planetLink.id
                        );

                    const planet =
                        planetElement?.content;

                    if (!planet) {
                        continue;
                    }

                    // -----------------------------------------
                    // DONNÉES DE LA PLANÈTE
                    // -----------------------------------------

                    const res =
                        Number(
                            planet.res
                        ) || 0;

                    const inf =
                        Number(
                            planet.inf
                        ) || 0;

                    // -----------------------------------------
                    // TYPE DE PLANÈTE
                    // -----------------------------------------

                    const typePlanete =
                        planet.planetType ||
                        planet.type ||
                        "inconnu";

                    planetesParType[typePlanete] =
                        (
                            planetesParType[typePlanete] ||
                            0
                        ) + 1;

                    // -----------------------------------------
                    // PLANÈTE LÉGENDAIRE
                    // -----------------------------------------

                    if (
                        planet.legendary === true
                    ) {
                        planetesLegendaires++;
                    }

                    // -----------------------------------------
                    // SPÉCIALITÉS TECHNOLOGIQUES
                    //
                    // Elles sont comptées globalement par type.
                    // -----------------------------------------

                    const techSpe =
                        Array.isArray(
                            planet.techSpe
                        )
                            ? planet.techSpe
                            : [];

                    for (
                        const specialite of techSpe
                    ) {

                        /*
                         * On accepte aussi bien une chaîne
                         * qu'un objet possédant un nom/type.
                         */
                        let typeSpecialite;

                        if (
                            typeof specialite ===
                            "string"
                        ) {
                            typeSpecialite =
                                specialite;
                        } else if (
                            specialite &&
                            typeof specialite ===
                            "object"
                        ) {
                            typeSpecialite =
                                specialite.type ||
                                specialite.name ||
                                specialite.id ||
                                "inconnu";
                        } else {
                            typeSpecialite =
                                String(
                                    specialite
                                );
                        }

                        specialitesTechnologiquesGlobales[
                            typeSpecialite
                        ] = (
                            specialitesTechnologiquesGlobales[
                                typeSpecialite
                            ] || 0
                        ) + 1;
                    }

                    // -----------------------------------------
                    // DONNÉES CONSERVÉES POUR LES NATALS
                    // -----------------------------------------

                    planetes.push({
                        res,
                        inf,

                        ruine:
                            planet.ruine === true,

                        techSpe,

                        legendary:
                            planet.legendary === true,
                    });

                } catch (error) {

                    console.error(
                        "Impossible de récupérer la planète",
                        planetLink,
                        error
                    );
                }
            }

            systeme.planetes =
                planetes;
        }

        // =================================================
        // CASES NATALES
        // =================================================

        const natals = [];

        for (
            let index = 0;
            index < taille * taille;
            index++
        ) {

            if (
                content.type?.[index] !==
                "natal"
            ) {
                continue;
            }

            const colonne =
                Math.floor(
                    index / taille
                );

            const ligne =
                index % taille;

            const numero =
                numeroCase(
                    colonne,
                    ligne
                );

            natals.push({
                index,
                numero,
            });
        }

        // =================================================
        // CALCUL POUR CHAQUE NATAL
        // =================================================

        const resultats = [];

        for (
            const natal of natals
        ) {

            let influence = 0;
            let ressource = 0;
            let ruines = 0;
            let specialitesTechnologiques = 0;

            // ---------------------------------------------
            // TOUS LES SYSTÈMES DU PLATEAU
            // ---------------------------------------------

            for (
                const systeme of systemesPlateau
            ) {

                if (
                    systeme.index ===
                    natal.index
                ) {
                    continue;
                }

                // -----------------------------------------
                // DISTANCE HEXAGONALE
                // -----------------------------------------

                const distance =
                    distanceHex(
                        natal.index,
                        systeme.index
                    );

                /*
                 * Nouvelle formule :
                 *
                 * X / (distance + 1)²
                 */

                const distancePonderee =
                    Math.pow(
                        distance + 1,
                        2
                    );

                // -----------------------------------------
                // PLANÈTES DU SYSTÈME
                // -----------------------------------------

                for (
                    const planet of
                    systeme.planetes || []
                ) {

                    // =====================================
                    // RESSOURCE
                    // =====================================

                    ressource +=
                        planet.res /
                        distancePonderee;

                    // =====================================
                    // INFLUENCE
                    // =====================================

                    influence +=
                        planet.inf /
                        distancePonderee;

                    // =====================================
                    // RUINE
                    //
                    // Chaque ruine vaut 1.
                    // Puis application de la distance.
                    // =====================================

                    if (
                        planet.ruine
                    ) {

                        ruines +=
                            1 /
                            distancePonderee;
                    }

                    // =====================================
                    // SPÉCIALITÉS TECHNOLOGIQUES
                    //
                    // Le comptage recommence pour chaque
                    // planète.
                    //
                    // 1 spécialité = 1
                    // 2 spécialités = 1.5
                    // 3 spécialités = 2
                    // etc.
                    // =====================================

                    const nombreSpecialites =
                        planet.techSpe?.length ||
                        0;

                    if (
                        nombreSpecialites > 0
                    ) {

                        const valeurSpecialites =
                            1 +
                            (
                                Math.max(
                                    0,
                                    nombreSpecialites - 1
                                ) * 0.5
                            );

                        specialitesTechnologiques +=
                            valeurSpecialites /
                            distancePonderee;
                    }
                }
            }

            // ---------------------------------------------
            // TOTAL
            //
            // Le total principal reste basé sur
            // Influence + Ressource.
            //
            // Les ruines et technologies sont des
            // statistiques supplémentaires.
            // ---------------------------------------------

            const total =
                influence +
                ressource;

            resultats.push({
                index:
                    natal.index,

                numero:
                    natal.numero,

                influence,

                ressource,

                ruines,

                specialitesTechnologiques,

                total,
            });
        }

        // =================================================
        // ENREGISTREMENT
        // =================================================

        setStatistiquesNatals(
            resultats
        );

        // =================================================
        // STATISTIQUES GLOBALES
        // =================================================

        setStatistiquesGlobales({
            specialitesTechnologiques:
                specialitesTechnologiquesGlobales,

            planetesParType,

            planetesLegendaires,
        });

    } catch (error) {

        console.error(
            "Erreur pendant le calcul des statistiques natales :",
            error
        );

        setStatistiquesNatals([]);

    } finally {

        setCalculStatistiquesEnCours(
            false
        );
    }
}

    // ========================================================
    // RECALCUL AUTOMATIQUE
    // ========================================================

    useEffect(() => {

        calculerStatistiques();

    }, [
        content.type,
        content.systems,
    ]);

    // ========================================================
    // DRAG & DROP
    // ========================================================

    function dropSystem(
        targetIndex,
        sourceIndex
    ) {

        if (
            sourceIndex === null ||
            sourceIndex === undefined ||
            sourceIndex === targetIndex
        ) {
            return;
        }

        if (
            typeof onDropSystem ===
            "function"
        ) {

            onDropSystem(
                targetIndex,
                sourceIndex
            );
        }
    }

    // ========================================================
    // FORME HEXAGONALE
    // ========================================================

    const clipHex =
        "polygon(" +
        "25% 0%, " +
        "75% 0%, " +
        "100% 50%, " +
        "75% 100%, " +
        "25% 100%, " +
        "0% 50%" +
        ")";

    // ========================================================
    // CONSTRUCTION DES CASES
    // ========================================================

    const cases = [];

    for (
        let colonne = 0;
        colonne < taille;
        colonne++
    ) {

        for (
            let ligne = 0;
            ligne < taille;
            ligne++
        ) {

            const hexQ =
                colonne - 6;

            const hexR =
                (ligne -
                    Math.floor(colonne / 2)) -
                (6 -
                    Math.floor((6 + 1) / 2));

            const hexS =
                -hexQ - hexR;

            const distance =
                Math.max(
                    Math.abs(hexQ),
                    Math.abs(hexR),
                    Math.abs(hexS)
                );

            if (distance > 6) {
                continue;
            }

            const index =
                colonne * taille + ligne;

            const type =
                content.type?.[index] ||
                "vide";

            const positionX =
                colonne * pasX;

            const positionY =
                ligne * pasY +
                (colonne % 2 === 1
                    ? decalageY
                    : 0);

            const couleur =
                typeSystemColor[type] ||
                typeSystemColor.vide;

            const numero =
                numeroCase(
                    colonne,
                    ligne
                );

            const system =
                content.systems?.[index];

            const rotate =
                content.rotates?.[index] || 0;

            const angle =
                rotate * 60;

            const scaleSysteme =
                largeurHex /
                systemSize.width;

            // =================================================
            // SYSTÈME
            // =================================================

            let contenuSysteme = null;

            if (
                type === "select" &&
                system
            ) {

                contenuSysteme = (

                    <div
                        draggable={
                            dragAndDropEnabled
                        }

                        onDragStart={
                            dragAndDropEnabled
                                ? event => {

                                    event.stopPropagation();

                                    event.dataTransfer.clearData();

                                    event.dataTransfer.setData(
                                        "text/plain",
                                        String(index)
                                    );

                                    event.dataTransfer.effectAllowed =
                                        "move";

                                    onDragStartSystem(
                                        index
                                    );
                                }
                                : undefined
                        }

                        onDragEnd={
                            dragAndDropEnabled
                                ? event => {

                                    event.stopPropagation();

                                    onDragEndSystem?.();
                                }
                                : undefined
                        }

                        onContextMenu={
                            editable
                                ? event => {

                                    event.preventDefault();
                                    event.stopPropagation();

                                    rotateSystem(
                                        index
                                    );
                                }
                                : undefined
                        }

                        style={{
                            position:
                                "absolute",

                            left:
                                "50%",

                            top:
                                "50%",

                            width:
                                systemSize.width,

                            height:
                                systemSize.height,

                            transform:
                                `translate(-50%, -50%) ` +
                                `rotate(${angle}deg) ` +
                                `scale(${scaleSysteme})`,

                            transformOrigin:
                                "center center",

                            zIndex:
                                2,

                            cursor:
                                dragAndDropEnabled
                                    ? "grab"
                                    : "default",

                            userSelect:
                                "none",

                            touchAction:
                                "none",
                        }}
                    >

                        <LoadAndDisplay
                            link={system}

                            style={{
                                ...systemSize,

                                pointerEvents:
                                    dragAndDropEnabled
                                        ? "none"
                                        : undefined,
                            }}
                        />

                    </div>
                );
            }

            // =================================================
            // CASE
            // =================================================

            cases.push(

                <div
                    key={
                        `case-${colonne}-${ligne}`
                    }

                    onDragOver={
                        dragAndDropEnabled
                            ? event => {

                                event.preventDefault();
                                event.stopPropagation();

                                event.dataTransfer.dropEffect =
                                    "move";
                            }
                            : undefined
                    }

                    onDrop={
                        dragAndDropEnabled
                            ? event => {

                                event.preventDefault();
                                event.stopPropagation();

                                const data =
                                    event.dataTransfer.getData(
                                        "text/plain"
                                    );

                                if (data === "") {
                                    return;
                                }

                                const sourceIndex =
                                    Number(data);

                                if (
                                    !Number.isInteger(
                                        sourceIndex
                                    )
                                ) {
                                    return;
                                }

                                dropSystem(
                                    index,
                                    sourceIndex
                                );
                            }
                            : undefined
                    }

                    onClick={
                        editable
                            ? () => {

                                if (!onChange) {
                                    return;
                                }

                                onChange(
                                    "type",
                                    typeSelectionne,
                                    index
                                );
                            }
                            : undefined
                    }

                    onContextMenu={
                        editable
                            ? event => {

                                event.preventDefault();
                                event.stopPropagation();

                                if (
                                    type === "select" &&
                                    system
                                ) {
                                    rotateSystem(
                                        index
                                    );
                                }
                            }
                            : undefined
                    }

                    style={{
                        position:
                            "absolute",

                        left:
                            positionX,

                        top:
                            positionY,

                        width:
                            largeurHex,

                        height:
                            hauteurHex,

                        backgroundColor:
                            "#000000",

                        clipPath:
                            clipHex,

                        pointerEvents:
                            "auto",

                        zIndex:
                            1,

                        cursor:
                            dragAndDropEnabled
                                ? "copy"
                                : "default",
                    }}
                >

                    <div
                        style={{
                            position:
                                "absolute",

                            left:
                                1,

                            top:
                                1,

                            width:
                                largeurHex - 2,

                            height:
                                hauteurHex - 2,

                            backgroundColor:
                                couleur,

                            clipPath:
                                clipHex,

                            overflow:
                                "hidden",

                            pointerEvents:
                                "auto",
                        }}
                    >

                        {contenuSysteme}

                        {/* =====================================
                            NUMÉRO
                        ===================================== */}

                        <div
                            style={{
                                position:
                                    "absolute",

                                left:
                                    0,

                                top:
                                    0,

                                width:
                                    "100%",

                                height:
                                    "100%",

                                display:
                                    "flex",

                                alignItems:
                                    "center",

                                justifyContent:
                                    "center",

                                color:
                                    "#FFF",

                                fontSize:
                                    14,

                                fontWeight:
                                    "bold",

                                pointerEvents:
                                    "none",

                                zIndex:
                                    10,
                            }}
                        >
                            {numero}
                        </div>

                        {/* =====================================
                            MODAL PICKER
                        ===================================== */}

                        {editable &&
                            type === "select" && (

                                <div
                                    style={{
                                        position:
                                            "absolute",

                                        left:
                                            "50%",

                                        bottom:
                                            5,

                                        transform:
                                            "translateX(-50%)",

                                        zIndex:
                                            30,

                                        pointerEvents:
                                            "auto",
                                    }}

                                    onClick={
                                        event =>
                                            event.stopPropagation()
                                    }

                                    onMouseDown={
                                        event =>
                                            event.stopPropagation()
                                    }

                                    onContextMenu={
                                        event =>
                                            event.stopPropagation()
                                    }
                                >

                                    <ModalPickerInput
                                        name="systems"
                                        index={index}
                                        value={content}
                                        onChange={
                                            onChange
                                        }
                                        type={[
                                            "system"
                                        ]}
                                    />

                                </div>
                            )}

                    </div>

                </div>
            );
        }
    }

    // ========================================================
    // RENDU
    // ========================================================

    return (

        <div
            style={{
                display:
                    "flex",

                alignItems:
                    "flex-start",

                gap:
                    20,

                ...style,
            }}
        >

            {/* =================================================
                PALETTE
            ================================================= */}

            {editable && (

                <div
                    style={{
                        display:
                            "flex",

                        flexDirection:
                            "column",

                        gap:
                            8,

                        minWidth:
                            130,

                        padding:
                            10,

                        border:
                            "1px solid #aaa",

                        borderRadius:
                            8,

                        backgroundColor:
                            "#f5f5f5",
                    }}
                >

                    <strong>
                        Palette
                    </strong>

                    {Object.entries(
                        typeSystem
                    ).map(
                        ([key, label]) => (

                            <button
                                key={key}
                                type="button"

                                onClick={() =>
                                    setTypeSelectionne(
                                        key
                                    )
                                }

                                style={{
                                    padding:
                                        "10px 12px",

                                    cursor:
                                        "pointer",

                                    backgroundColor:
                                        typeSystemColor[
                                            key
                                        ],

                                    color:
                                        key === "vide"
                                            ? "#000"
                                            : "#fff",

                                    border:
                                        typeSelectionne ===
                                        key
                                            ? "3px solid #ff9800"
                                            : "1px solid #555",

                                    borderRadius:
                                        5,

                                    fontWeight:
                                        typeSelectionne ===
                                        key
                                            ? "bold"
                                            : "normal",
                                }}
                            >
                                {label}
                            </button>
                        )
                    )}

                    {/* =========================================
                        GÉNÉRER
                    ========================================= */}

                    <button
                        type="button"
                        disabled={
                            generationEnCours
                        }

                        onClick={event => {

                            event.stopPropagation();

                            generer();
                        }}

                        style={{
                            marginTop:
                                8,

                            padding:
                                "10px 12px",

                            cursor:
                                generationEnCours
                                    ? "wait"
                                    : "pointer",

                            backgroundColor:
                                "#333",

                            color:
                                "#fff",

                            border:
                                "1px solid #111",

                            borderRadius:
                                5,

                            fontWeight:
                                "bold",

                            opacity:
                                generationEnCours
                                    ? 0.6
                                    : 1,
                        }}
                    >
                        {generationEnCours
                            ? "Génération..."
                            : "Générer"}
                    </button>

                </div>
            )}

            {/* =================================================
                PLATEAU
            ================================================= */}

            <div
                style={{
                    position:
                        "relative",

                    width:
                        largeurPlateau,

                    height:
                        hauteurPlateau,

                    flexShrink:
                        0,

                    overflow:
                        "hidden",
                }}
            >

                {cases}

            </div>

         {/* =================================================
    STATISTIQUES
================================================= */}

{editable && (

    <div
        style={{
            width: 320,
            minWidth: 320,
            maxHeight: hauteurPlateau,
            overflowY: "auto",
            padding: 12,
            border: "1px solid #aaa",
            borderRadius: 8,
            backgroundColor: "#f5f5f5",
            boxSizing: "border-box",
        }}
    >

        <h3
            style={{
                margin: "0 0 12px 0",
            }}
        >
            Statistiques
        </h3>

        {calculStatistiquesEnCours && (
            <div>
                Calcul en cours...
            </div>
        )}

        {!calculStatistiquesEnCours && (

            <>

                {/* =====================================
                    STATISTIQUES GLOBALES
                ===================================== */}

                <div
                    style={{
                        padding: 10,
                        marginBottom: 15,
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                    }}
                >

                    <div
                        style={{
                            fontWeight: "bold",
                            fontSize: 16,
                            marginBottom: 10,
                        }}
                    >
                        Statistiques globales
                    </div>

                    {/* ---------------------------------
                        SPÉCIALITÉS TECHNOLOGIQUES
                    --------------------------------- */}

                    <div
                        style={{
                            fontWeight: "bold",
                            marginBottom: 5,
                        }}
                    >
                        Spécialités technologiques
                    </div>

                    {Object.keys(
                        statistiquesGlobales
                            .specialitesTechnologiques
                    ).length === 0 && (

                        <div
                            style={{
                                color: "#666",
                                fontSize: 13,
                            }}
                        >
                            Aucune spécialité
                        </div>
                    )}

                    {Object.entries(
                        statistiquesGlobales
                            .specialitesTechnologiques
                    ).map(
                        ([type, nombre]) => (

                            <div
                                key={
                                    `tech-${type}`
                                }

                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    padding:
                                        "3px 0",
                                }}
                            >

                                <span>
                                    {type}
                                </span>

                                <strong>
                                    {nombre}
                                </strong>

                            </div>
                        )
                    )}

                    {/* ---------------------------------
                        PLANÈTES PAR TYPE
                    --------------------------------- */}

                    <div
                        style={{
                            fontWeight: "bold",
                            marginTop: 12,
                            marginBottom: 5,
                        }}
                    >
                        Planètes par type
                    </div>

                    {Object.keys(
                        statistiquesGlobales
                            .planetesParType
                    ).length === 0 && (

                        <div
                            style={{
                                color: "#666",
                                fontSize: 13,
                            }}
                        >
                            Aucune planète
                        </div>
                    )}

                    {Object.entries(
                        statistiquesGlobales
                            .planetesParType
                    ).map(
                        ([type, nombre]) => (

                            <div
                                key={
                                    `planet-${type}`
                                }

                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    padding:
                                        "3px 0",
                                }}
                            >

                                <span>
                                    {type}
                                </span>

                                <strong>
                                    {nombre}
                                </strong>

                            </div>
                        )
                    )}

                    {/* ---------------------------------
                        LÉGENDAIRES
                    --------------------------------- */}

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            marginTop: 12,
                            paddingTop: 8,
                            borderTop:
                                "1px solid #ddd",
                        }}
                    >

                        <span>
                            Planètes légendaires
                        </span>

                        <strong>
                            {
                                statistiquesGlobales
                                    .planetesLegendaires
                            }
                        </strong>

                    </div>

                </div>

                {/* =====================================
                    STATISTIQUES NATALES
                ===================================== */}

                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: 16,
                        marginBottom: 10,
                    }}
                >
                    Statistiques natales
                </div>

                {statistiquesNatals.length === 0 && (

                    <div
                        style={{
                            color: "#666",
                        }}
                    >
                        Aucun système natal.
                    </div>
                )}

                {statistiquesNatals.map(
                    natal => (

                        <div
                            key={
                                natal.index
                            }

                            style={{
                                padding: 10,
                                marginBottom: 10,
                                background: "#fff",
                                border:
                                    "1px solid #ccc",
                                borderRadius: 6,
                            }}
                        >

                            {/* =============================
                                TITRE
                            ============================= */}

                            <div
                                style={{
                                    fontWeight:
                                        "bold",
                                    fontSize: 16,
                                    marginBottom:
                                        10,
                                }}
                            >
                                Natal {natal.numero}
                            </div>

                            {/* =============================
                                INFLUENCE
                            ============================= */}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    padding:
                                        "6px 0",
                                    borderBottom:
                                        "1px solid #ddd",
                                }}
                            >

                                <span>
                                    Influence
                                </span>

                                <strong>
                                    {
                                        natal.influence.toFixed(
                                            4
                                        )
                                    }
                                </strong>

                            </div>

                            {/* =============================
                                RESSOURCE
                            ============================= */}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    padding:
                                        "6px 0",
                                    borderBottom:
                                        "1px solid #ddd",
                                }}
                            >

                                <span>
                                    Ressource
                                </span>

                                <strong>
                                    {
                                        natal.ressource.toFixed(
                                            4
                                        )
                                    }
                                </strong>

                            </div>

                            {/* =============================
                                RUINES
                            ============================= */}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    padding:
                                        "6px 0",
                                    borderBottom:
                                        "1px solid #ddd",
                                }}
                            >

                                <span>
                                    Ruines
                                </span>

                                <strong>
                                    {
                                        natal.ruines.toFixed(
                                            4
                                        )
                                    }
                                </strong>

                            </div>

                            {/* =============================
                                SPÉCIALITÉS TECHNOLOGIQUES
                            ============================= */}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    padding:
                                        "6px 0",
                                    borderBottom:
                                        "1px solid #ddd",
                                }}
                            >

                                <span>
                                    Spécialités technologiques
                                </span>

                                <strong>
                                    {
                                        natal
                                            .specialitesTechnologiques
                                            .toFixed(4)
                                    }
                                </strong>

                            </div>

                            {/* =============================
                                TOTAL
                            ============================= */}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    marginTop: 8,
                                    padding: 9,
                                    background:
                                        "#eee",
                                    borderRadius: 4,
                                    fontSize: 17,
                                    fontWeight:
                                        "bold",
                                }}
                            >

                                <span>
                                    Total
                                </span>

                                <span>
                                    {
                                        natal.total.toFixed(
                                            4
                                        )
                                    }
                                </span>

                            </div>

                        </div>
                    )
                )}

            </>
        )}

    </div>
)}

        </div>
    );
}

// ============================================================
// AFFICHAGE
// ============================================================

export function Display({
    content,
    style = {},
    context,
    explication,
    editable = false,

}) {

    const pageStyle = {


        padding: 0,
        margin: 0,

        border: "none",
        outline: "none",

        backgroundColor:
            "#ffffff",

        display:
            "flex",

        alignItems:
            "center",

        justifyContent:
            "center",

        boxSizing:
            "border-box",

        overflow:
            "hidden",

        fontFamily:
            "Arial, sans-serif",

        color:
            "#000",

        flexShrink:
            0,

        ...style,
    };

    return (

        <div>

            <div
                style={pageStyle}
            >

                <PlateauView
                    content={content}

                    context={context}

                    explication={explication}

                    editable={editable}

                 
                />

            </div>

        </div>
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

function Form({
    content,
    onChange,
    onSubmit,
    style,
}) {

    // ========================================================
    // DRAG & DROP
    // ========================================================

    function handleDragStartSystem() {
        // L'index est transmis par dataTransfer.
    }

    function handleDropSystem(
        targetIndex,
        sourceIndex
    ) {

        if (
            sourceIndex === null ||
            sourceIndex === undefined ||
            sourceIndex === targetIndex
        ) {
            return;
        }

        if (!onChange) {
            return;
        }

        // ----------------------------------------------------
        // TYPES
        // ----------------------------------------------------

        const types = [
            ...(content.type || []),
        ];

        [
            types[sourceIndex],
            types[targetIndex],
        ] = [
            types[targetIndex],
            types[sourceIndex],
        ];

        // ----------------------------------------------------
        // SYSTÈMES
        // ----------------------------------------------------

        const systems = [
            ...(content.systems || []),
        ];

        [
            systems[sourceIndex],
            systems[targetIndex],
        ] = [
            systems[targetIndex],
            systems[sourceIndex],
        ];

        // ----------------------------------------------------
        // ROTATIONS
        // ----------------------------------------------------

        const rotates = [
            ...(content.rotates || []),
        ];

        [
            rotates[sourceIndex],
            rotates[targetIndex],
        ] = [
            rotates[targetIndex] ?? 0,
            rotates[sourceIndex] ?? 0,
        ];

        // ----------------------------------------------------
        // MISE À JOUR
        // ----------------------------------------------------

        onChange(
            "type",
            types
        );

        onChange(
            "systems",
            systems
        );

        onChange(
            "rotates",
            rotates
        );
    }

    function handleDragEndSystem() {
        // Rien à réinitialiser.
    }

    return (

        <FormBase
            content={content}
            onChange={onChange}
            onSubmit={onSubmit}
            style={style}
        >

            <div
                style={{
                    display:
                        "flex",

                    flexDirection:
                        "column",

                    overflowX:
                        "auto",
                }}
            >

                <div
                    style={{
                        display:
                            "flex",

                        justifyContent:
                            "center",
                    }}
                >

                    <PlateauView
                        content={
                            content
                        }

                        editable={
                            true
                        }

                        onChange={
                            onChange
                        }

                        onDragStartSystem={
                            handleDragStartSystem
                        }

                        onDropSystem={
                            handleDropSystem
                        }

                        onDragEndSystem={
                            handleDragEndSystem
                        }
                    />

                </div>

            </div>

        </FormBase>
    );
}

// ============================================================
// EXPORT
// ============================================================

export default {
    name: "Plateau",

    classe: plateau,

    form: Form,

    display: {
        default: Display,
    },

    editor: "noSplit",
};
