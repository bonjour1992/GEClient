import { useMemo, useRef, useState } from "react";
import { useDeplacement } from "./Deplacement";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { PlateauView } from "../plateauVue";
import { systemSize } from "../systeme";
import { nombreCases, anneauDeIndex, distanceIndex } from "../hexSpirale";
import { techType } from "../ti5Const";
import {
    useEngine, Emplacements, Pions, Zone, Defilable, agentDisponible, aMotCle, tokenTreve,
    DECALAGE_SECONDAIRE, estSecondaire, nomCase, BoutonRegle, confirmerRegle,
} from "./Interaction";
import {
    PIOCHE_TUILES,
    TUILES_PIOCHEES,
    RESERVE_TUILES,
    MARQUEUR,
    ACTIVATION,
    TREVE,
    SAC_FRAGMENTS,
    FRAGMENTS,
    typeUnite,
} from "./miseEnPlace";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useElement, useElements, chargerContenu, contenuEnCache } from "./sync";
import { cleCombat, combatsEnCours, aDesUnites } from "./Combat";
import { EnvoyerVers } from "./Envoi";
import { pub } from "../../../lib/fetch";

// ============================================================
// ONGLET ESPACE
//
// La carte réutilise l'affichage du plateau (PlateauView) :
// la case data-case="12" est la zone hex:12, et chaque planète
// d'un système est l'emplacement planete:<k> de sa case.
//
// Les tuiles système sont des composants de la zone hex:<i>
// (rotation dans marques.rotation). Elles ne sont pas affichées
// comme des pions mais par PlateauView.
// ============================================================

const estTuile = c => c.ref?.type === "system";
const pasTuile = c => !estTuile(c);

const RE_HEX = /^hex:(\d+)$/;

export function Espace() {

    const { etat, index, jouer, envoyer, joueur, moi, partie, couleurDe, nomDe, search, signaler } = useEngine();

    const [zoom, setZoom] = useState(1);
    const [edition, setEdition] = useState(false);
    const [caseChoisie, setCaseChoisie] = useState(null);

    // Case dont la fiche du système est ouverte
    const [caseVue, setCaseVue] = useState(null);

    const enScience = /science/i.test(etat.phase);

    const anneaux = etat.anneaux;

    // Tuiles système par case : { 12: composant }
    const tuiles = {};

    for (const [zone, liste] of index.parZone) {
        const m = RE_HEX.exec(zone);
        const tuile = m && liste.find(estTuile);

        if (tuile) {
            tuiles[m[1]] = tuile;
        }
    }

    // Cases où un combat est en cours (de toute sorte, planètes comprises) :
    // "moi" si j'ai des unités dans l'un d'eux, "autre" sinon
    const enCombat = {};

    for (const lieu of combatsEnCours(etat)) {
        const numero = parseInt(lieu, 10);

        if (aDesUnites(index, lieu, moi)) {
            enCombat[numero] = "moi";
        } else {
            enCombat[numero] ??= "autre";
        }
    }

    // --------------------------------------------------------
    // POSSESSION DES PLANÈTES
    //
    // Une planète appartient au joueur qui a sa carte dans ses
    // éléments actifs. Elle porte alors un étendard à sa couleur.
    // --------------------------------------------------------

    // Contenu des systèmes posés : dit quelle planète est à quelle position
    const systemes = useElements(Object.values(tuiles).map(t => t.ref.id));

    const proprietaires = {};

    for (const j of partie.joueurs) {
        for (const c of index.parZone.get(`joueur:${j.userId}:actif`) || []) {
            if (c.ref?.type === "planet") {
                proprietaires[c.ref.id] = j.userId;
            }
        }
    }

    function etendard(zone) {

        const [, i, , k] = zone.split(":");
        const idSysteme = tuiles[i]?.ref?.id;
        const idPlanete = systemes[idSysteme]?.elems?.[Number(k)]?.id;
        const u = proprietaires[idPlanete];

        if (!u) {
            return null;
        }

        // (miniature recadrée de l'infanterie : public/ti/unit_mini)
        const icone = `url("${pub}/ti/unit_mini/inf.png")`;

        return (
            <span
                title={"Planète de " + nomDe(u)}
                style={{
                    display: "inline-block",
                    width: 12,
                    height: 13,
                    backgroundColor: couleurDe(u) || "#c8c8c8",
                    WebkitMaskImage: icone,
                    maskImage: icone,
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    filter: "drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff)",
                }}
            />
        );
    }

    // Le contenu donné à PlateauView ne change que si les tuiles changent
    const signature = Object.entries(tuiles)
        .map(([i, t]) => `${i}:${t.ref.id}:${t.marques?.rotation || 0}`)
        .join(";");

    // Phase de science : on peut explorer un emplacement vide voisin d'un
    // système, y compris au-delà du bord de la carte. Un anneau de plus est
    // alors affiché ; seuls ses emplacements explorables sont visibles.
    const exploration = enScience && joueur && !edition;

    const anneauxAffiches = exploration &&
        Object.keys(tuiles).some(i => anneauDeIndex(Number(i)) === anneaux)
        ? anneaux + 1
        : anneaux;

    const content = useMemo(() => {

        const n = nombreCases(anneauxAffiches);
        const type = Array(n).fill("vide");
        const systems = Array(n).fill(null);
        const rotates = Array(n).fill(0);

        for (const morceau of signature ? signature.split(";") : []) {
            const [i, id, rotation] = morceau.split(":").map(Number);

            if (i < n) {
                type[i] = "select";
                systems[i] = { type: "system", id, __link: true };
                rotates[i] = rotation;
            }
        }

        return { anneaux: anneauxAffiches, type, systems, rotates };

    }, [anneauxAffiches, signature]);

    // --------------------------------------------------------
    // SYSTÈMES SECONDAIRES
    //
    // Second groupe de cases, sous la carte : zones hex:<1000 + j>
    // (Interaction.jsx). Sa taille est le compteur
    // espace:secondaire:anneaux (1 par défaut : 7 cases). Hors du mode
    // « Modifier la carte », seules les cases qui ont un système sont
    // visibles : chaque îlot de cases voisines est un groupe.
    // --------------------------------------------------------

    const ANNEAUX_SECONDAIRES = "espace:secondaire:anneaux";
    const anneaux2 = Math.max(0, Math.min(6, Number(etat.compteurs[ANNEAUX_SECONDAIRES] ?? 1)));

    const aDesSecondaires = Object.keys(tuiles).some(estSecondaire);

    const content2 = useMemo(() => {

        const n = nombreCases(anneaux2);
        const type = Array(n).fill("vide");
        const systems = Array(n).fill(null);
        const rotates = Array(n).fill(0);

        for (const morceau of signature ? signature.split(";") : []) {
            const [i, id, rotation] = morceau.split(":").map(Number);
            const j = i - DECALAGE_SECONDAIRE;

            if (j >= 0 && j < n) {
                type[j] = "select";
                systems[j] = { type: "system", id, __link: true };
                rotates[j] = rotation;
            }
        }

        return { anneaux: anneaux2, type, systems, rotates };

    }, [anneaux2, signature]);

    function changerAnneaux2(delta) {

        const nouveau = Math.max(0, Math.min(6, anneaux2 + delta));

        // (une case occupée ne disparaît pas de l'écran sans prévenir)
        const occupe = delta < 0 && [...index.parZone.keys()].some(zone => {
            const m = /^hex:(\d+)/.exec(zone);
            return m && estSecondaire(m[1]) && Number(m[1]) - DECALAGE_SECONDAIRE >= nombreCases(nouveau);
        });

        if (occupe) {
            signaler(`L'anneau ${anneaux2} des systèmes secondaires n'est pas vide : retirez d'abord ce qui s'y trouve.`);
            return;
        }

        jouer({ type: "compteur", id: ANNEAUX_SECONDAIRES, valeur: nouveau });
    }

    // Cases où j'ai au moins une unité (dans l'espace, sur une planète ou embarquée)
    const mesCases =[...new Set(Object.values(etat.composants)
        .filter(c => c.ref?.type === "unit" && c.proprio === moi)
        .map(c => /^hex:(\d+)/.exec(c.zone || "")?.[1])
        .filter(Boolean))]
        .sort()
        .join(",");

    // Emplacements vides voisins d'un système où j'ai une unité (indices des cases)
    const explorables = useMemo(() => {

        const resultat = new Set();

        if (!exploration) {
            return resultat;
        }

        const occupees = (signature ? signature.split(";") : []).map(m => Number(m.split(":")[0]));
        const departs = (mesCases ? mesCases.split(",") : []).map(Number).filter(t => occupees.includes(t));

        for (let i = 0; i < nombreCases(anneauxAffiches); i++) {
            if (!occupees.includes(i) && departs.some(t => distanceIndex(i, t) === 1)) {
                resultat.add(i);
            }
        }

        return resultat;

    }, [exploration, anneauxAffiches, signature, mesCases]);

    // --------------------------------------------------------
    // MODIFICATION DE LA CARTE
    // --------------------------------------------------------

    const tuileChoisie = caseChoisie !== null ? tuiles[caseChoisie] : null;

    // Lus ici, et non dans les fonctions : aucune tuile n'est peut-être choisie
    const idTuile = tuileChoisie?.id ?? null;
    const rotationTuile = tuileChoisie?.marques?.rotation || 0;
    const lienTuile = tuileChoisie?.ref ?? null;

    function poserSysteme(lien) {

        const idSysteme = lien?.id;

        if (caseChoisie === null || !(idSysteme > 0)) {
            return;
        }

        jouer([
            idTuile && { type: "supprimer", c: idTuile },
            { type: "creer", ref: { type: "system", id: idSysteme }, zone: "hex:" + caseChoisie },
        ]);
    }

    function tourner() {
        jouer({
            type: "marquer",
            c: idTuile,
            marque: "rotation",
            valeur: (rotationTuile + 1) % 6,
        });
    }

    function changerAnneaux(delta) {

        const nouveau = Math.max(0, anneaux + delta);

        if (delta < 0) {
            const occupe = [...index.parZone.keys()].some(zone => {
                const m = /^hex:(\d+)/.exec(zone);
                // (les systèmes secondaires ne sont pas sur la carte)
                return m && !estSecondaire(m[1]) && anneauDeIndex(Number(m[1])) > nouveau;
            });

            if (occupe) {
                signaler(`L'anneau ${anneaux} n'est pas vide : retirez d'abord ce qui s'y trouve.`);
                return;
            }
        }

        jouer({ type: "partie", anneaux: nouveau });
    }

    // Phase de science, explorer : la première tuile de la pioche est posée
    // sur un emplacement vide voisin d'un système ; un logisticien et un
    // scientifique sont utilisés. Les unités natives du système découvert
    // (neutres, indiquées sur le système et sur ses planètes) sont posées.
    async function explorer(numero) {

        // (rien à poser d'une pioche vide : là, l'action est impossible)
        if (!(index.parZone.get(PIOCHE_TUILES) || []).length) {
            signaler("Explorer : la pioche de tuiles est vide.");
            return;
        }

        const logisticien = agentDisponible({ index, moi, search }, "logisticien");
        const scientifique = agentDisponible({ index, moi, search }, "scientifique");

        // Effet du jeu déclenché par un Ctrl + clic : hors conditions, une
        // confirmation dit pourquoi (un agent absent n'est pas usé)
        const commentaire = confirmerRegle(`Explorer (${nomCase(numero)})`, [
            !explorables.has(numero) && "il faut un emplacement vide à côté d'un système où vous avez une unité",
            !logisticien && "vous n'avez pas de logisticien disponible (aucun ne sera usé)",
            !scientifique && "vous n'avez pas de scientifique disponible (aucun ne sera usé)",
        ]);

        if (!commentaire) {
            return;
        }

        const uses = `joueur:${moi}:agentsUses`;

        const zone = "hex:" + numero;

        const reponse = await envoyer([
            // Au-delà du bord : la carte gagne un anneau
            anneauDeIndex(numero) > anneaux && { type: "partie", anneaux: anneauDeIndex(numero) },
            logisticien && { type: "deplacer", c: logisticien.id, vers: uses },
            scientifique && { type: "deplacer", c: scientifique.id, vers: uses },
            { type: "piocher", de: PIOCHE_TUILES, vers: zone },
        ].filter(Boolean), commentaire);

        // La tuile piochée n'est connue qu'à la réponse du serveur
        const tuile = Object.values(reponse?.etat?.composants || {})
            .find(c => c.zone === zone && c.ref?.type === "system");

        if (!tuile) {
            return;
        }

        const natives = [];

        // Unités natives d'un système ou d'une planète (nativeUnit × unitNum)
        const ajouterNatives = (contenu, ou) => {
            if (lienValide(contenu?.nativeUnit) && (contenu.nativeUnit.type || "unit") === "unit") {
                for (let k = 0; k < (Number(contenu.unitNum) || 1); k++) {
                    natives.push({ type: "creer", ref: { type: "unit", id: contenu.nativeUnit.id }, zone: ou });
                }
            }
        };

        const systeme = await chargerContenu(tuile.ref.id);

        ajouterNatives(systeme, zone);

        for (const [k, lien] of (systeme?.elems || []).entries()) {
            if (lienValide(lien)) {
                ajouterNatives(await chargerContenu(lien.id), `${zone}:planete:${k}`);
            }
        }

        if (natives.length) {
            envoyer(natives, "Unités natives du système exploré");
        }
    }

    // Clic sur une case (hors pion) : en mode « modifier la carte », la
    // choisit ; sinon ouvre la fiche du système, où ses unités natives et
    // ses règles sont lisibles en grand.
    function onClick(event) {

        if (event.target.closest("[data-composant]")) {
            return;
        }

        const caseElement = event.target.closest("[data-case]");

        if (!caseElement) {
            return;
        }

        const numero = Number(caseElement.dataset.case);

        // Phase de déplacement : Ctrl + clic pose son marqueur de faction
        // sur le système (système activé).
        if (event.ctrlKey && joueur && /d[ée]placement/i.test(etat.phase)) {

            const dejaActive = (index.parZone.get("hex:" + numero) || [])
                .some(c => !c.ref && c.jeton === MARQUEUR && c.proprio === moi);

            const commentaire = confirmerRegle(`Activer le système (${nomCase(numero)})`, [
                dejaActive && "vous avez déjà activé ce système",
                !tuiles[numero] && "il n'y a pas de système sur cette case",
            ]);

            if (commentaire) {
                envoyer([{ type: "creer", jeton: MARQUEUR, zone: "hex:" + numero, proprio: moi }], commentaire);

                // Le système activé devient la destination du déplacement assisté
                deplacement.activer(numero);
            }

            return;
        }

        // Phase de science : Ctrl + clic sur un emplacement vide explore
        if (event.ctrlKey && joueur && enScience && !edition && !tuiles[numero]) {
            explorer(numero);
            return;
        }

        // (Déclarer une trêve : bouton de la fiche du système)

        if (edition) {
            setCaseChoisie(numero);
        } else if (tuiles[numero]) {
            setCaseVue(numero);
        }
    }

    // --------------------------------------------------------
    // DÉPLACEMENT ASSISTÉ (Deplacement.jsx)
    //
    // Pendant qu'il attend un clic sur la carte (choix du départ, tracé
    // du trajet), les clics et le glisser sur les cases lui reviennent :
    // ils sont pris à la descente (capture), avant le glisser des pions
    // (Plan) et le défilement de la carte (Defilable). Un Ctrl + clic
    // garde son sens (activer un système).
    // --------------------------------------------------------

    const deplacement = useDeplacement({ tuiles, systemes });

    // Case où le bouton de la souris a été enfoncé (début d'un tracé glissé)
    const debutTrace = useRef(null);

    const caseSous = event => {
        const noeud = event.target.closest?.("[data-case]");
        return noeud ? Number(noeud.dataset.case) : null;
    };

    const poigneesDeplacement = deplacement.mode ? {
        "data-sans-defilement": "",
        onPointerDownCapture: event => {
            if (!event.ctrlKey) {
                event.stopPropagation();
                debutTrace.current = caseSous(event);
            }
        },
        onPointerMoveCapture: event => {

            const numero = caseSous(event);

            if (event.buttons !== 1 || numero === null || debutTrace.current === null || numero === debutTrace.current) {
                return;
            }

            // On sort de la case de départ du geste : elle entre dans le trajet, puis les suivantes
            if (debutTrace.current !== -1) {
                deplacement.survolCase(debutTrace.current);
                debutTrace.current = -1;
            }

            deplacement.survolCase(numero);
        },
        onPointerUpCapture: () => {
            // (-1 : un tracé glissé vient de finir, le clic qui suit ne compte pas)
            debutTrace.current = debutTrace.current === -1 ? -2 : null;
        },
        onClickCapture: event => {

            const numero = caseSous(event);

            if (event.ctrlKey) {
                return;
            }

            event.stopPropagation();

            if (debutTrace.current !== -2 && numero !== null) {
                deplacement.clicCase(numero);
            }

            debutTrace.current = null;
        },
        style: { cursor: "crosshair" },
    } : {};

    // --------------------------------------------------------
    // PIONS
    // --------------------------------------------------------

    // Unités dans l'espace de la case
    function renduCase(i) {
        return (
            <>
                {/* Phase de science : emplacement qu'on peut explorer */}
                {explorables.has(i) && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center",
                            paddingBottom: 16,
                            backgroundColor: "#00c85366",
                            color: "#003d1a",
                            fontSize: 10,
                            fontWeight: "bold",
                            textAlign: "center",
                            pointerEvents: "none",
                            zIndex: 15,
                        }}
                    >
                        Ctrl + clic :<br />explorer
                    </div>
                )}

                {/* Déplacement assisté : départ, rang dans le trajet, arrivée */}
                {deplacement.decor(i)}

                {/* Combat en cours dans ce système : contour rouge s'il me
                    concerne (j'y ai des unités), jaune sinon */}
                {enCombat[i] && (
                    <svg
                        data-combat={enCombat[i]}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: 16,
                        }}
                    >
                        <title>
                            {enCombat[i] === "moi" ? "Combat en cours : vous y avez des unités" : "Combat en cours"}
                        </title>
                        {/* (le trait est à cheval sur le bord de la case : sa moitié extérieure est rognée) */}
                        <polygon
                            points="25,0 75,0 100,50 75,100 25,100 0,50"
                            fill="none"
                            stroke={enCombat[i] === "moi" ? "#ff1744" : "#ffd600"}
                            strokeWidth={9}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                )}

                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 3,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        padding: "0 14px",
                        zIndex: 20,
                        pointerEvents: "none",
                    }}
                >
                    <Pions zone={"hex:" + i} filtre={pasTuile} petit />
                </div>
            </>
        );
    }

    function styleCase(i) {

        if (edition && caseChoisie === i) {
            return { backgroundColor: "#ff9800" };
        }

        // Systèmes secondaires : une case sans système n'est visible qu'en
        // modifiant la carte
        if (estSecondaire(i)) {
            return tuiles[i] || edition ? undefined : { visibility: "hidden" };
        }

        // Anneau ajouté pour l'exploration : seuls les emplacements
        // explorables y sont affichés
        if (anneauDeIndex(i) > anneaux && !explorables.has(i)) {
            return { visibility: "hidden" };
        }

        return undefined;
    }

    // Unités sur une planète : centrées sur la planète, remises droites
    // et à taille lisible (la tuile est réduite et peut être tournée).
    function stylePions(zone, noeud) {

        const numero = Number(zone.split(":")[1]);

        const rotation = (estSecondaire(numero)
            ? content2.rotates[numero - DECALAGE_SECONDAIRE]
            : content.rotates[numero]) || 0;

        // Échelle de la planète dans la tuile (style de systeme.jsx), et
        // de la tuile dans la case : on les annule pour garder des pions
        // de la même taille que ceux de l'espace.
        const planete = Number(/scale\(([\d.]+)\)/.exec(noeud.style.transform)?.[1]) || 1;
        const tuile = 120 / systemSize.width;

        return {
            position: "absolute",
            left: "50%",
            top: "62%",
            width: "max-content",
            maxWidth: 60,
            transform:
                `translate(-50%, -50%) rotate(${-rotation * 60}deg) ` +
                `scale(${1 / (planete * tuile)})`,
            zIndex: 20,
        };
    }

    return (
        <div>

            {/* BARRE D'OUTILS */}

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>

                <label>
                    Zoom{" "}
                    <input
                        type="range"
                        min={0.4}
                        max={2}
                        step={0.1}
                        value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                    />
                </label>

                {joueur && (
                    <label>
                        <input
                            type="checkbox"
                            checked={edition}
                            onChange={e => {
                                setEdition(e.target.checked);
                                setCaseChoisie(null);
                            }}
                        />{" "}
                        Modifier la carte
                    </label>
                )}

                {edition && (
                    <>
                        <span>
                            <button type="button" onClick={() => changerAnneaux(-1)} disabled={anneaux === 0}>−</button>
                            {" "}{anneaux} anneaux{" "}
                            <button type="button" onClick={() => changerAnneaux(1)}>+</button>
                        </span>

                        <span title="Taille du groupe des systèmes secondaires, sous la carte">
                            <button type="button" onClick={() => changerAnneaux2(-1)} disabled={anneaux2 === 0}>−</button>
                            {" "}{anneaux2} anneaux secondaires{" "}
                            <button type="button" onClick={() => changerAnneaux2(1)} disabled={anneaux2 === 6}>+</button>
                        </span>

                        {caseChoisie === null && <span>Cliquer sur une case de la carte.</span>}

                        {caseChoisie !== null && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <b style={{ textTransform: "capitalize" }}>{nomCase(caseChoisie)} :</b>
                                système
                                <ModalPickerInput
                                    name="systeme"
                                    value={{ systeme: lienTuile }}
                                    onChange={(nom, lien) => poserSysteme(lien)}
                                    type={["system"]}
                                />
                                {idTuile && (
                                    <>
                                        <button type="button" onClick={tourner}>Tourner</button>
                                        <button
                                            type="button"
                                            onClick={() => jouer({ type: "supprimer", c: idTuile })}
                                        >
                                            Retirer
                                        </button>
                                    </>
                                )}
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* DÉPLACEMENT ASSISTÉ (phase de déplacement) */}

            {deplacement.panneau}

            {/* CARTE */}

            <Defilable style={{ maxHeight: "80vh", backgroundColor: "#111" }}>
                <div
                    onClick={onClick}
                    {...poigneesDeplacement}
                    style={{ zoom, width: "max-content", margin: "0 auto", ...poigneesDeplacement.style }}
                >
                    <Emplacements stylePions={stylePions} extra={etendard} petit>
                        <PlateauView
                            content={content}
                            renduCase={renduCase}
                            styleCase={styleCase}
                        />
                    </Emplacements>
                </div>
            </Defilable>

            {/* SYSTÈMES SECONDAIRES : à part du plan central, on y accède par
                des trous de ver. Le cadre n'apparaît que s'il y en a, ou en
                modifiant la carte (pour en poser). */}

            {(aDesSecondaires || edition) && (
                <div
                    data-systemes-secondaires
                    style={{ marginTop: 8, border: "2px solid #7e57c2", borderRadius: 8, backgroundColor: "#111" }}
                >
                    <div style={{ padding: "2px 8px", color: "#d1c4e9", fontSize: 13 }}>
                        <b>Systèmes secondaires</b> — hors du plan central, reliés par des trous de ver
                        {edition && " (cliquer une case pour y poser un système)"}
                    </div>

                    <Defilable style={{ maxHeight: "60vh" }}>
                        <div
                            onClick={onClick}
                            {...poigneesDeplacement}
                            style={{ zoom, width: "max-content", margin: "0 auto", ...poigneesDeplacement.style }}
                        >
                            <Emplacements stylePions={stylePions} extra={etendard} petit>
                                <PlateauView
                                    content={content2}
                                    decalage={DECALAGE_SECONDAIRE}
                                    renduCase={renduCase}
                                    styleCase={styleCase}
                                />
                            </Emplacements>
                        </div>
                    </Defilable>
                </div>
            )}

            {/* TUILES : pioche des tuiles non spéciales qui ne sont pas sur la
                carte, tuiles piochées, réserve des tuiles spéciales. Une tuile
                se glisse sur une case de la carte. */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 8,
                    marginTop: 8,
                }}
            >
                <Zone zone={PIOCHE_TUILES} titre="Pioche de tuiles espace">
                    {joueur && (
                        <button
                            type="button"
                            disabled={!(index.parZone.get(PIOCHE_TUILES) || []).length}
                            onClick={() => jouer({ type: "piocher", de: PIOCHE_TUILES, vers: TUILES_PIOCHEES })}
                        >
                            Piocher une tuile
                        </button>
                    )}
                </Zone>

                <Zone zone={TUILES_PIOCHEES} titre="Tuiles piochées (à glisser sur la carte)" />
                <Zone zone={RESERVE_TUILES} titre="Réserve de tuiles spéciales" />
            </div>

            {caseVue !== null && tuiles[caseVue] && (
                <FicheSysteme
                    numero={caseVue}
                    id={tuiles[caseVue].ref.id}
                    fermer={() => setCaseVue(null)}
                />
            )}
        </div>
    );
}

// ============================================================
// FICHE D'UN SYSTÈME
//
// Sur la carte, le texte des unités natives et des règles d'un
// système est trop petit pour être lu. La fiche montre le système
// en grand, puis chacun de ses éléments à sa taille normale.
// ============================================================

const lienValide = lien => lien && lien.id > 0;

// Nombre d'infanteries à mobiliser sur une planète, puis le bouton
// obstacles(n) : raisons pour lesquelles mobiliser n infanteries ne devrait pas se faire
function Mobilisation({ max, cout, mobiliser, obstacles }) {

    const [n, setN] = useState(max);

    const nombre = Math.max(1, Math.min(max, Math.floor(Number(n)) || 1));

    // On peut mobiliser moins que le maximum : − / + règlent le nombre
    return (
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            Mobiliser
            <button
                type="button"
                disabled={nombre <= 1}
                title="Une infanterie de moins"
                onClick={() => setN(nombre - 1)}
            >
                −
            </button>
            <b style={{ minWidth: 34, textAlign: "center" }}>{nombre} / {max}</b>
            <button
                type="button"
                disabled={nombre >= max}
                title="Une infanterie de plus"
                onClick={() => setN(nombre + 1)}
            >
                +
            </button>
            <BoutonRegle
                nom={`Mobiliser ${nombre} infanterie${nombre > 1 ? "s" : ""}`}
                obstacles={obstacles(nombre)}
                faire={commentaire => mobiliser(nombre, commentaire)}
                title={`Use un logisticien, dépense ${nombre * cout} ressource(s), pose ${nombre} infanterie(s) et active la planète`}
            >
                infanterie{nombre > 1 ? "s" : ""} ({nombre * cout} res.)
            </BoutonRegle>
        </span>
    );
}

function FicheSysteme({ numero, id, fermer }) {

    const {
        etat, index, jouer, envoyer, joueur, moi, nomDe, search, signaler, factionDe, allerA, setCombatVu,
    } = useEngine();

    const systeme = useElement(id);

    // Combats : ce lieu s'ajoute aux combats de l'onglet Combat, pour toute
    // la table. Envoyé tout de suite, comme toute action.
    //   "<i>" combat spatial, "<i>c" canons spatiaux,
    //   "<i>p<k>" combat terrestre, "<i>p<k>b" bombardement
    const combats = combatsEnCours(etat);

    function envoyerAuCombat(lieu, commentaire = "") {

        if (!combats.includes(lieu)) {
            envoyer([{ type: "compteur", id: cleCombat(lieu), valeur: 1 }], commentaire || "Combat ouvert");
        }

        setCombatVu(lieu);
        fermer();
        allerA("combat");
    }

    const enCombatPhase = /combat|canon|bombard/i.test(etat.phase);

    // Bouton d'un combat : « voir » (bouton simple) s'il est déjà ouvert ;
    // sinon l'ouvrir est un effet du jeu, attendu aux phases de combat
    const boutonCombat = (lieu, libelle, titre) => (combats.includes(lieu)
        ? (
            <button
                key={lieu}
                type="button"
                onClick={() => envoyerAuCombat(lieu)}
                title={titre}
                style={{ fontWeight: "bold" }}
            >
                Voir : {libelle.toLowerCase()}
            </button>
        )
        : (
            <BoutonRegle
                key={lieu}
                nom={`${libelle} (${nomCase(numero)})`}
                obstacles={[!enCombatPhase && "ce n'est pas une phase de combat"]}
                faire={commentaire => envoyerAuCombat(lieu, commentaire)}
                title={titre}
            >
                {libelle}
            </BoutonRegle>
        ));

    const enScience = /science/i.test(etat.phase);
    const enProduction = /production/i.test(etat.phase);

    // Scientifique et logisticien disponibles (le Généticien d'Arborec mobilise comme un logisticien)
    const aScientifique = !!agentDisponible({ index, moi, search }, "scientifique");
    const aLogisticien = !!agentDisponible({ index, moi, search }, "logisticien|g[ée]n[ée]ticien");

    const zoneEspace = "hex:" + numero;
    const zonePlanete = k => `${zoneEspace}:planete:${k}`;
    const uses = `joueur:${moi}:agentsUses`;

    // Ai-je une unité dans le système (espace, planètes, embarquée) ?
    // Rechercher, fouiller et revendiquer le demandent.
    const mesUnitesIci = Object.values(etat.composants).some(c =>
        c.ref?.type === "unit" && c.proprio === moi &&
        (c.zone === zoneEspace || c.zone?.startsWith(zoneEspace + ":")));

    // Ai-je une infanterie sur la planète k ? Prendre possession le demande.
    const monInfanterieSur = k => (index.parZone.get(zonePlanete(k)) || []).some(c =>
        c.ref?.type === "unit" && c.proprio === moi && typeUnite(contenuEnCache(c.ref.id)) === "inf");

    // Marqueurs d'activation d'une planète : sur la planète elle-même, ou
    // sur une de ses ruines (marques.ruine = 1 ou 2)
    const activations = k => (index.parZone.get(zonePlanete(k)) || [])
        .filter(c => !c.ref && c.jeton === ACTIVATION);

    const planeteActivee = k => activations(k).some(c => !c.marques?.ruine);
    const ruineActivee = (k, ruine) => activations(k).some(c => c.marques?.ruine === ruine);

    // Mon infanterie (unité de ma faction), pour la mobilisation
    const maFaction = useElement(factionDe(moi) ?? -1);
    const liensUnites = (maFaction?.units || []).filter(lien => lien?.id > 0);
    const unites = useElements(liensUnites.map(lien => lien.id));
    const lienInfanterie = liensUnites.find(lien => typeUnite(unites[lien.id]) === "inf");
    const infanterie = lienInfanterie ? unites[lienInfanterie.id] : null;
    const idInfanterie = lienInfanterie?.id ?? null;
    const prodInfanterie = Number(infanterie?.prod) || 0;
    const coutInfanterie = Number(infanterie?.cout) || 0;

    // Utilise un agent : retourne l'action, ou null (avec un message) s'il
    // n'y en a pas de disponible
    // (nomAgent est une expression régulière ; libelle est le nom à afficher)
    // Utilise un agent : retourne l'action, ou null s'il n'y en a pas de
    // disponible (le bouton l'a alors dit avant de confirmer : rien n'est usé)
    function utiliser(nomAgent) {

        const agent = agentDisponible({ index, moi, search }, nomAgent);

        return agent ? { type: "deplacer", c: agent.id, vers: uses } : null;
    }

    // Phase de science, rechercher : active la planète et utilise un
    // scientifique. La recherche gagnée s'ajoute à la main (onglet Technologie).
    function rechercher(k, commentaire) {
        envoyer([utiliser("scientifique"), { type: "creer", jeton: ACTIVATION, zone: zonePlanete(k) }], commentaire);
    }

    // Phase de science, fouiller une ruine : active la ruine, utilise un
    // scientifique et rapporte un fragment de relique — celui du type de la
    // ruine, ou tiré dans le sac pour une ruine « normale ».
    function fouiller(k, ruine, type, commentaire) {

        const fragment = FRAGMENTS[type];
        const vers = `joueur:${moi}:fragments`;

        // (rien à tirer d'un sac vide : là, l'action est impossible)
        if (!fragment && !(index.parZone.get(SAC_FRAGMENTS) || []).length) {
            signaler("Le sac de fragments est vide (ou cette partie a été créée avant son ajout).");
            return;
        }

        envoyer([
            utiliser("scientifique"),
            { type: "creer", jeton: ACTIVATION, zone: zonePlanete(k), marques: { ruine } },
            fragment
                ? { type: "creer", jeton: fragment[0], zone: vers }
                : { type: "piocher", de: SAC_FRAGMENTS, vers },
        ], commentaire);
    }

    // Phase de production, mobiliser : use un logisticien, dépense les
    // ressources, pose l'infanterie sur la planète et l'active.
    const mesRes = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;

    const obstaclesMobilisation = n => [
        mesRes < n * coutInfanterie &&
            `ressources insuffisantes : ${n} infanterie(s) coûtent ${n * coutInfanterie}, vous avez ${mesRes}`,
        !aLogisticien && "vous n'avez pas de logisticien disponible (aucun ne sera usé)",
    ];

    function mobiliser(k, n, commentaire) {

        const cout = n * coutInfanterie;

        envoyer([
            // Un logisticien, ou le Généticien (Arborec) qui mobilise comme lui
            utiliser("logisticien|g[ée]n[ée]ticien"),
            cout && { type: "compteur", id: `joueur:${moi}:res`, delta: -cout },
            ...Array.from({ length: n }, () => ({
                type: "creer",
                ref: { type: "unit", id: idInfanterie },
                zone: zonePlanete(k),
                proprio: moi,
            })),
            { type: "creer", jeton: ACTIVATION, zone: zonePlanete(k) },
        ], commentaire);
    }

    // Mes unités endommagées dans le système (espace, planètes, embarquées).
    // Les unités biologiques (mot-clé « bio ») ne se réparent pas.
    const aReparer = Object.values(etat.composants).filter(c =>
        c.ref?.type === "unit" &&
        c.proprio === moi &&
        !aMotCle(c, "bio") &&
        Number(c.marques?.degat) > 0 &&
        (c.zone === zoneEspace || c.zone?.startsWith(zoneEspace + ":"))
    );

    // Réparer coûte 1 ressource par dégât ; indisponible sans les ressources
    const coutReparation = aReparer.reduce((total, c) => total + Number(c.marques.degat), 0);
    const mesRessources = Number(etat.compteurs[`joueur:${moi}:res`]) || 0;

    function reparer(commentaire) {
        envoyer([
            { type: "compteur", id: `joueur:${moi}:res`, delta: -coutReparation },
            // (si : refusé si les dégâts ont changé entre-temps)
            ...aReparer.map(c => ({ type: "marquer", c: c.id, marque: "degat", valeur: 0, si: c.marques.degat })),
        ], commentaire);
    }

    // Carte d'une planète déjà en jeu (chez un joueur), ou undefined
    const cartePlanete = idPlanete => Object.values(etat.composants)
        .find(c => !c.cache && c.ref?.type === "planet" && c.ref.id === idPlanete && c.zone !== "horsJeu");

    // La carte de la planète va dans mes éléments actifs (elle est créée si
    // personne ne l'avait encore). Deux façons d'y arriver :
    //
    //   Prendre possession  demande une de mes infanteries sur la planète ;
    //   Revendiquer         demande une de mes unités dans le système, et
    //                       use un diplomate (refusé s'il n'y en a pas).
    //
    // Les deux boutons restent utilisables si la condition d'unité manque
    // (ils sont alors rouge gris) : l'engine prévient, les joueurs décident.
    function revendiquer(idPlanete, commentaire) {

        const diplomate = agentDisponible({ index, moi, search }, "diplomate");

        // (sans diplomate disponible, le bouton l'a dit : aucun n'est usé)
        prendre(idPlanete, commentaire,
            diplomate ? [{ type: "deplacer", c: diplomate.id, vers: uses, de: diplomate.zone }] : []);
    }

    function prendre(idPlanete, commentaire, avant = []) {

        const carte = cartePlanete(idPlanete);
        const zone = `joueur:${moi}:actif`;

        // (de / si : refusé si un autre joueur vient de la prendre — pas de carte en double)
        const verrou = "planete:" + idPlanete;
        const prises = Number(etat.compteurs[verrou]) || 0;

        envoyer([
            ...avant,
            ...(carte
                ? [{ type: "deplacer", c: carte.id, vers: zone, de: carte.zone }]
                : [
                    { type: "compteur", id: verrou, valeur: prises + 1, si: prises },
                    { type: "creer", ref: { type: "planet", id: idPlanete }, zone, proprio: moi },
                ]),
        ], commentaire);
    }

    const aDiplomate = !!agentDisponible({ index, moi, search }, "diplomate");

    // --------------------------------------------------------
    // DÉCLARER UNE TRÊVE
    //
    // Pose mon marqueur de trêve dans le système et détruit un de mes
    // diplomates. Hors de la phase de trêve ou sans diplomate, le bouton
    // est rouge gris : il reste utilisable après confirmation (sans
    // diplomate, aucun n'est détruit).
    // --------------------------------------------------------

    const enTreve = /tr[eê]ve/i.test(etat.phase);

    const obstaclesTreve = [
        !enTreve && "ce n'est pas la phase de trêve",
        !aDiplomate && "vous n'avez pas de diplomate disponible (aucun ne sera détruit)",
    ].filter(Boolean);

    function declarerTreve(commentaire) {

        const diplomate = agentDisponible({ index, moi, search }, "diplomate");

        envoyer([
            diplomate && { type: "supprimer", c: diplomate.id },
            // Le token « Trêve » des données du jeu ; à défaut, l'ancien jeton
            tokenTreve(search)
                ? { type: "creer", ref: { type: "token", id: tokenTreve(search).id }, zone: zoneEspace, proprio: moi }
                : { type: "creer", jeton: TREVE, zone: zoneEspace, proprio: moi },
        ], commentaire);

        fermer();
    }

    // Rechercher et fouiller demandent une unité dans le système et un scientifique
    const obstaclesScience = [
        !mesUnitesIci && "il faut une de vos unités dans le système",
        !aScientifique && "vous n'avez pas de scientifique disponible (aucun ne sera usé)",
    ];

    const nomPlanete = planete => (planete?.name || "la planète").replace(/^!([^!]*)!/, "") || "la planète";

    // k : position de la planète dans le système (emplacement planete:<k>)
    const liensPlanetes =(systeme?.elems || [])
        .map((lien, k) => ({ lien, k }))
        .filter(x => lienValide(x.lien));

    const planetes = useElements(liensPlanetes.map(x => x.lien.id));

    const lienSysteme = useMemo(() => ({ type: "system", id }), [id]);

    // Composant de la tuile posée sur cette case
    const tuileDuSysteme = (index.parZone.get("hex:" + numero) || []).find(estTuile) || null;

    return (
        <div
            onClick={fermer}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#000a",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                onClick={event => event.stopPropagation()}
                style={{
                    maxWidth: "94vw",
                    maxHeight: "86vh",
                    overflow: "auto",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <b style={{ fontSize: 18 }}>
                        {(systeme?.name || "Système").replace(/^!([^!]*)!/, "")}
                    </b>
                    <span style={{ marginLeft: 8, color: "#666" }}>{nomCase(numero)}</span>

                    {/* Remet à zéro les dégâts de mes unités (rien à réparer : pas de bouton) */}
                    {joueur && aReparer.length > 0 && (
                        <BoutonRegle
                            nom={`Réparer mes unités (${nomCase(numero)})`}
                            obstacles={[
                                mesRessources < coutReparation &&
                                    `ressources insuffisantes : il en faut ${coutReparation}, vous en avez ${mesRessources}`,
                            ]}
                            faire={reparer}
                            title="Coûte 1 ressource par dégât réparé"
                            style={{ marginLeft: 16 }}
                        >
                            Réparer toutes mes unités ({coutReparation} res.)
                        </BoutonRegle>
                    )}

                    {joueur && (
                        <span style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
                            {boutonCombat(String(numero), "Combat spatial",
                                "Ouvre un combat entre les vaisseaux de ce système, pour toute la table")}
                            {boutonCombat(numero + "c", "Canons spatiaux",
                                "Les unités à canon spatial du système et des systèmes voisins tirent sur ses vaisseaux")}

                            <BoutonRegle
                                data-action="declarer-treve"
                                nom={`Déclarer une trêve (${nomCase(numero)})`}
                                obstacles={obstaclesTreve}
                                faire={declarerTreve}
                                title="Pose votre marqueur de trêve dans ce système et détruit un de vos diplomates"
                            >
                                Déclarer une trêve
                            </BoutonRegle>
                        </span>
                    )}

                    {/* La tuile elle-même : zone libre, réserve de tuiles... */}
                    {joueur && tuileDuSysteme && (
                        <span style={{ marginLeft: 8 }}>
                            <EnvoyerVers c={tuileDuSysteme} apres={fermer} libelle="Envoyer la tuile vers…" />
                        </span>
                    )}

                    <button type="button" onClick={fermer} style={{ marginLeft: "auto" }}>Fermer</button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>

                    <div style={{ zoom: 1.6 }}>
                        <LoadAndDisplay link={lienSysteme} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                        {/* Unités présentes dans l'espace du système (on peut les
                            glisser d'un emplacement à l'autre) */}
                        <Zone
                            zone={zoneEspace}
                            titre="Dans l'espace du système"
                            filtre={pasTuile}
                            style={{ minWidth: 260 }}
                        />

                        {lienValide(systeme?.nativeUnit) && (
                            <div>
                                <b>
                                    Dans l'espace
                                    {systeme.nativeUnit.type === "unit" && ` : ${systeme.unitNum || 1} ×`}
                                </b>
                                <LoadAndDisplay link={systeme.nativeUnit} />
                            </div>
                        )}

                        {liensPlanetes.map(({ lien, k }) => {
                            const planete = planetes[lien.id];
                            const carte = cartePlanete(lien.id);
                            const proprietaire = /^joueur:(\d+):actif$/.exec(carte?.zone || "")?.[1];
                            const aMoi = Number(proprietaire) === moi;
                            const activee = planeteActivee(k);

                            // Ruines de la planète : [numéro, type]
                            const ruines = [
                                planete?.ruine && [1, planete.ruineType],
                                planete?.ruine2 && [2, planete.ruineType2],
                            ].filter(Boolean);

                            const specialites = (planete?.techSpe || [])
                                .map(t => techType[t] || t)
                                .join(", ");

                            return (
                                <div
                                    key={lien.id}
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                        paddingTop: 8,
                                        borderTop: "1px solid #ccc",
                                    }}
                                >
                                    <LoadAndDisplay link={lien} />

                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, maxWidth: 300 }}>
                                        {proprietaire
                                            ? <b>Possédée par {nomDe(Number(proprietaire))}</b>
                                            : <i>Sans propriétaire</i>}

                                        {activee && <b style={{ color: "#555" }}>■ Planète activée</b>}

                                        {/* Toujours utilisables ; rouge gris si la condition manque */}
                                        {joueur && !aMoi && (
                                            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                                                <BoutonRegle
                                                    nom={`Prendre possession de ${nomPlanete(planete)}`}
                                                    obstacles={[!monInfanterieSur(k) && "il faut une de vos infanteries sur la planète"]}
                                                    faire={commentaire => prendre(lien.id, commentaire)}
                                                    title="Vous avez une infanterie sur la planète : sa carte va dans vos éléments actifs"
                                                >
                                                    Prendre possession
                                                </BoutonRegle>
                                                <BoutonRegle
                                                    nom={`Revendiquer ${nomPlanete(planete)}`}
                                                    obstacles={[
                                                        !mesUnitesIci && "il faut une de vos unités dans le système",
                                                        !aDiplomate && "vous n'avez pas de diplomate disponible (aucun ne sera usé)",
                                                    ]}
                                                    faire={commentaire => revendiquer(lien.id, commentaire)}
                                                    title="Vous avez une unité dans le système : use un diplomate, la carte va dans vos éléments actifs"
                                                >
                                                    Revendiquer (use un diplomate)
                                                </BoutonRegle>
                                            </span>
                                        )}

                                        {/* COMBATS SUR LA PLANÈTE */}

                                        {joueur && (
                                            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                                                {boutonCombat(`${numero}p${k}`, "Combat terrestre",
                                                    "Ouvre un combat entre les unités de cette planète")}
                                                {boutonCombat(`${numero}p${k}b`, "Bombardement",
                                                    "Les unités à bombardement de l'espace du système tirent sur cette planète")}
                                            </span>
                                        )}

                                        {/* PHASE DE SCIENCE */}

                                        {joueur && enScience && !activee && (
                                            <>
                                                <BoutonRegle
                                                    nom={`Rechercher sur ${nomPlanete(planete)}`}
                                                    obstacles={obstaclesScience}
                                                    faire={commentaire => rechercher(k, commentaire)}
                                                    title="Pose un marqueur d'activation sur la planète et use un scientifique"
                                                >
                                                    Rechercher
                                                </BoutonRegle>
                                                <span style={{ fontSize: 12, color: "#444" }}>
                                                    Gagnez 2 de technologie au choix
                                                    {specialites ? `, doublé en ${specialites}` : ""} : à
                                                    ajouter dans l'onglet Technologie.
                                                </span>
                                            </>
                                        )}

                                        {joueur && enScience && ruines.map(([ruine, type]) => (
                                            ruineActivee(k, ruine)
                                                ? <b key={ruine} style={{ color: "#555" }}>■ Ruine {ruines.length > 1 ? ruine + " " : ""}fouillée</b>
                                                : (
                                                    <BoutonRegle
                                                        key={ruine}
                                                        nom={`Fouiller une ruine de ${nomPlanete(planete)}`}
                                                        obstacles={obstaclesScience}
                                                        faire={commentaire => fouiller(k, ruine, type, commentaire)}
                                                        title="Pose un marqueur d'activation sur la ruine, use un scientifique et rapporte un fragment de relique"
                                                    >
                                                        Fouiller la ruine{ruines.length > 1 ? " " + ruine : ""} (
                                                        {FRAGMENTS[type] ? FRAGMENTS[type][0].toLowerCase() : "fragment tiré du sac"})
                                                    </BoutonRegle>
                                                )
                                        ))}

                                        {/* PHASE DE PRODUCTION */}

                                        {joueur && enProduction && aMoi && !activee && idInfanterie && prodInfanterie > 0 && (
                                            <Mobilisation
                                                max={prodInfanterie}
                                                cout={coutInfanterie}
                                                mobiliser={(n, commentaire) => mobiliser(k, n, commentaire)}
                                                obstacles={obstaclesMobilisation}
                                            />
                                        )}
                                    </div>

                                    {/* Ce qui est sur la planète */}
                                    <Zone
                                        zone={zonePlanete(k)}
                                        titre={"Sur " + (planete?.name || "la planète").replace(/^!([^!]*)!/, "")}
                                        style={{ minWidth: 200, alignSelf: "flex-start" }}
                                    />

                                    {lienValide(planete?.nativeUnit) && (
                                        <div>
                                            <b>
                                                Sur la planète
                                                {(planete.nativeUnit.type || "unit") === "unit" && ` : ${planete.unitNum || 1} ×`}
                                            </b>
                                            <LoadAndDisplay link={planete.nativeUnit} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
