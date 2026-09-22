
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Display as DisplayPlateau } from "./plateau";
import { Link } from "../../lib/datatype";
import { useSearch, getFromType } from "../../lib/store";
import { getElement } from "../../lib/fetch";

export default {
    name: "Génération de plateau",
    component: GeneratePlateau,
};

// ============================================================
// GENERATEUR DE PLATEAU
// ============================================================

function GeneratePlateau() {

    const { jeu } = useParams();

    // ========================================================
    // RECHERCHE
    // ========================================================

    const search = useSearch(state => state.search);
    const updateSearch = useSearch(state => state.update);

    // ========================================================
    // ETAT
    // ========================================================

    const [joueur, setJoueur] = useState(3);

    const [plateaux, setPlateaux] = useState([]);
    const [plateauId, setPlateauId] = useState(null);

    const [factions, setFactions] = useState([]);
    const [joueurs, setJoueurs] = useState([]);

    const [loadingPlateaux, setLoadingPlateaux] =
        useState(false);

    const [plateauGenere, setPlateauGenere] =
        useState(null);


    // ========================================================
    // DRAG & DROP
    // ========================================================

    function handleDragStartSystem(index) {
        // Rien à faire ici.
        // L'index est envoyé par dataTransfer dans plateau.tsx.
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

        setPlateauGenere(current => {

            if (!current) {
                return current;
            }

            const content = {
                ...current.content,
            };

            const types = [
                ...content.type,
            ];

            const systems = [
                ...content.systems,
            ];

            const rotates = [
                ...(content.rotates || []),
            ];


            // ------------------------------------------------
            // Echange des types
            // ------------------------------------------------

            [
                types[sourceIndex],
                types[targetIndex],
            ] = [
                types[targetIndex],
                types[sourceIndex],
            ];


            // ------------------------------------------------
            // Echange des systèmes
            // ------------------------------------------------

            [
                systems[sourceIndex],
                systems[targetIndex],
            ] = [
                systems[targetIndex],
                systems[sourceIndex],
            ];


            // ------------------------------------------------
            // Echange des rotations
            // ------------------------------------------------

            [
                rotates[sourceIndex],
                rotates[targetIndex],
            ] = [
                rotates[targetIndex] ?? 0,
                rotates[sourceIndex] ?? 0,
            ];


            content.type = types;
            content.systems = systems;
            content.rotates = rotates;


            return {
                ...current,
                content,
            };
        });
    }


    function handleDragEndSystem() {
        // Rien à réinitialiser.
    }


    // ========================================================
    // CHARGEMENT DE LA RECHERCHE
    // ========================================================

    useEffect(() => {

        if (!jeu) {
            return;
        }

        updateSearch(jeu);

    }, [jeu]);


    // ========================================================
    // CHARGEMENT DES PLATEAUX
    // ========================================================

    useEffect(() => {

        async function loadPlateaux() {

            if (!search?.length) {
                return;
            }

            const liste = getFromType(
                search,
                ["plateau"]
            );

            setLoadingPlateaux(true);

            try {

                const result = [];

                for (const plateau of liste) {

                    const element =
                        await getElement(plateau.id);

                    if (
                        element?.content?.joueur === joueur
                    ) {
                        result.push(element);
                    }
                }

                setPlateaux(result);

            } finally {

                setLoadingPlateaux(false);

            }
        }

        loadPlateaux();

    }, [search, joueur]);


    // ========================================================
    // CHARGEMENT DES FACTIONS
    // ========================================================

    useEffect(() => {

        if (!search?.length) {
            return;
        }

        setFactions(
            getFromType(
                search,
                ["faction"]
            )
        );

    }, [search]);


    // ========================================================
    // INITIALISATION DES JOUEURS
    // ========================================================

    useEffect(() => {

        setJoueurs(
            Array.from(
                {
                    length: joueur,
                },
                () => null
            )
        );

        setPlateauId(null);
        setPlateauGenere(null);

    }, [joueur]);


    // ========================================================
    // CHOIX D'UNE FACTION
    // ========================================================

    function setFaction(
        index,
        factionId
    ) {

        setJoueurs(current => {

            const result = [
                ...current,
            ];

            result[index] =
                factionId === ""
                    ? null
                    : Number(factionId);

            return result;
        });
    }


    // ========================================================
    // GENERATION
    // ========================================================

    async function generer() {

        // ----------------------------------------------------
        // Vérifications
        // ----------------------------------------------------

        if (!plateauId) {
            return;
        }

        if (
            joueurs.some(
                faction => faction === null
            )
        ) {
            return;
        }


        // ----------------------------------------------------
        // Plateau sélectionné
        // ----------------------------------------------------

        const plateau =
            plateaux.find(
                element =>
                    element.id === plateauId
            );

        if (!plateau) {

            console.error(
                "Plateau introuvable"
            );

            return;
        }


        // ----------------------------------------------------
        // Liste des systèmes
        // ----------------------------------------------------

        const listeSystemes =
            getFromType(
                search,
                ["system"]
            );

        if (!listeSystemes.length) {

            console.error(
                "Aucun système disponible"
            );

            return;
        }


        // ----------------------------------------------------
        // Chargement des systèmes
        // ----------------------------------------------------

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


            // ------------------------------------------------
            // Exclusion des systèmes spéciaux
            // ------------------------------------------------

            if (
                element.content?.special === true
            ) {
                continue;
            }


            // ------------------------------------------------
            // Nombre d'exemplaires
            //
            // !3!Nom -> 3 exemplaires
            // !5!Nom -> 5 exemplaires
            // Nom     -> 1 exemplaire
            // ------------------------------------------------

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


            // ------------------------------------------------
            // Ajout des exemplaires
            // ------------------------------------------------

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


        // ----------------------------------------------------
        // Vérification
        // ----------------------------------------------------

        if (!systemes.length) {

            console.error(
                "Aucun système disponible après filtrage"
            );

            return;
        }


        // ----------------------------------------------------
        // Copie du plateau
        // ----------------------------------------------------

        const nouveauPlateau = {

            ...plateau,

            content: {

                ...plateau.content,

                type: [
                    ...plateau.content.type,
                ],

                systems: [
                    ...plateau.content.systems,
                ],

                rotates: [
                    ...(plateau.content.rotates || []),
                ],
            },
        };


        // ----------------------------------------------------
        // Systèmes disponibles
        // ----------------------------------------------------

        const systemesDisponibles =
            [
                ...systemes,
            ];


        // ====================================================
        // REMPLACEMENT DES "RAND"
        // ====================================================

        nouveauPlateau.content.type.forEach(
            (type, index) => {

                if (type !== "rand") {
                    return;
                }


                if (
                    systemesDisponibles.length === 0
                ) {

                    console.warn(
                        "Plus de systèmes disponibles"
                    );

                    return;
                }


                // --------------------------------------------
                // Tirage aléatoire
                // --------------------------------------------

                const position =
                    Math.floor(
                        Math.random() *
                        systemesDisponibles.length
                    );


                const systeme =
                    systemesDisponibles[
                        position
                    ];


                // --------------------------------------------
                // Retrait
                // --------------------------------------------

                systemesDisponibles.splice(
                    position,
                    1
                );


                // --------------------------------------------
                // Modification de la case
                // --------------------------------------------

                nouveauPlateau.content.type[
                    index
                ] = "select";

                nouveauPlateau.content.systems[
                    index
                ] = new Link(
                    "system",
                    systeme.id
                );

                nouveauPlateau.content.rotates[
                    index
                ] = 0;
            }
        );


        // ====================================================
        // PLACEMENT DES SYSTEMES NATALS
        // ====================================================

        const factionsSelectionnees= [];


        // ----------------------------------------------------
        // Récupération des factions
        // ----------------------------------------------------

        for (
            const factionId of joueurs
        ) {

            const faction =
                await getElement(
                    factionId
                );

            if (!faction) {

                console.warn(
                    "Faction introuvable :",
                    factionId
                );

                continue;
            }


            const system =
                faction.content?.system;


            if (!system?.id) {

                console.warn(
                    "La faction ne possède pas " +
                    "de système natal :",
                    factionId
                );

                continue;
            }


            factionsSelectionnees.push({
                faction,
                system,
            });
        }


        // ----------------------------------------------------
        // Recherche des cases natales
        // ----------------------------------------------------

        const casesNatales= [];


        nouveauPlateau.content.type.forEach(
            (type, index) => {

                if (type === "natal") {

                    casesNatales.push(
                        index
                    );
                }
            }
        );


        // ----------------------------------------------------
        // Vérification
        // ----------------------------------------------------

        if (
            casesNatales.length <
            factionsSelectionnees.length
        ) {

            console.error(
                "Pas assez de cases natales " +
                "pour placer toutes les factions."
            );

            return;
        }


        // ----------------------------------------------------
        // Mélange des cases natales
        // ----------------------------------------------------

        for (
            let i = casesNatales.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() *
                    (i + 1)
                );


            [
                casesNatales[i],
                casesNatales[j],
            ] = [
                casesNatales[j],
                casesNatales[i],
            ];
        }


        // ----------------------------------------------------
        // Placement des systèmes natals
        // ----------------------------------------------------

        factionsSelectionnees.forEach(
            (
                { system },
                index
            ) => {

                const caseIndex =
                    casesNatales[index];


                // ------------------------------------------
                // La case devient sélectionnée
                // ------------------------------------------

                nouveauPlateau.content.type[
                    caseIndex
                ] = "select";


                // ------------------------------------------
                // Système natal
                // ------------------------------------------

                nouveauPlateau.content.systems[
                    caseIndex
                ] = new Link(
                    "system",
                    system.id
                );


                // ------------------------------------------
                // Rotation
                // ------------------------------------------

                nouveauPlateau.content.rotates[
                    caseIndex
                ] = 0;
            }
        );


        // ====================================================
        // RESULTAT
        // ====================================================

        console.log(
            "Plateau généré :",
            nouveauPlateau
        );


        setPlateauGenere(
            nouveauPlateau
        );
    }


    // ========================================================
    // RENDU
    // ========================================================

    return (

        <div
            style={{
                padding: 20,

                display: "flex",
                flexDirection: "column",

                gap: 20,

                maxWidth: 1200,
            }}
        >

            <h1>
                Générer un plateau
            </h1>


            {/* =================================================
                NOMBRE DE JOUEURS
            ================================================= */}

            <section>

                <h2>
                    Nombre de joueurs
                </h2>


                <select
                    value={joueur}
                    onChange={e =>
                        setJoueur(
                            Number(
                                e.target.value
                            )
                        )
                    }
                >

                    <option value={3}>
                        3 joueurs
                    </option>

                    <option value={4}>
                        4 joueurs
                    </option>

                    <option value={5}>
                        5 joueurs
                    </option>

                    <option value={6}>
                        6 joueurs
                    </option>

                </select>

            </section>


            {/* =================================================
                PLATEAU
            ================================================= */}

            <section>

                <h2>
                    Plateau
                </h2>


                {loadingPlateaux ? (

                    <div>
                        Chargement des plateaux...
                    </div>

                ) : plateaux.length === 0 ? (

                    <div>
                        Aucun plateau disponible pour{" "}
                        {joueur} joueurs.
                    </div>

                ) : (

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >

                        {plateaux.map(
                            plateau => (

                                <label
                                    key={
                                        plateau.id
                                    }
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        cursor: "pointer",
                                    }}
                                >

                                    <input
                                        type="radio"
                                        name="plateau"
                                        value={
                                            plateau.id
                                        }
                                        checked={
                                            plateauId ===
                                            plateau.id
                                        }
                                        onChange={() =>
                                            setPlateauId(
                                                plateau.id
                                            )
                                        }
                                    />


                                    {
                                        plateau.content.name ||
                                        `Plateau ${plateau.id}`
                                    }

                                </label>
                            )
                        )}

                    </div>
                )}

            </section>


            {/* =================================================
                FACTIONS
            ================================================= */}

            <section>

                <h2>
                    Factions
                </h2>


                {joueurs.map(
                    (
                        factionId,
                        index
                    ) => (

                        <div
                            key={index}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 8,
                            }}
                        >

                            <label
                                style={{
                                    width: 80,
                                }}
                            >
                                Joueur{" "}
                                {index + 1}
                            </label>


                            <select
                                value={
                                    factionId ?? ""
                                }
                                onChange={e =>
                                    setFaction(
                                        index,
                                        e.target.value
                                    )
                                }
                            >

                                <option value="">
                                    -- Choisir une faction --
                                </option>


                                {factions.map(
                                    faction => (

                                        <option
                                            key={
                                                faction.id
                                            }
                                            value={
                                                faction.id
                                            }
                                        >
                                            {
                                                faction.name
                                            }
                                        </option>

                                    )
                                )}

                            </select>

                        </div>
                    )
                )}

            </section>


            {/* =================================================
                GENERATION
            ================================================= */}

            <section>

                <button
                    type="button"
                    disabled={
                        !plateauId ||
                        joueurs.some(
                            faction =>
                                faction === null
                        )
                    }
                    onClick={generer}
                >
                    Générer le plateau
                </button>

            </section>


            {/* =================================================
                PLATEAU GENERE
            ================================================= */}

            {plateauGenere && (

                <section>

                    <h2>
                        Plateau généré
                    </h2>


                    <div
                        style={{
                            overflow: "auto",
                            width: "100%",
                            padding: 20,
                            boxSizing: "border-box",
                            backgroundColor: "#f5f5f5",
                        }}
                    >

                        <DisplayPlateau
                            content={
                                plateauGenere.content
                            }
                            editable={true}
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

                </section>

            )}

        </div>
    );
}
