import { useMemo, useState } from "react";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { PlateauView } from "../plateauVue";
import { systemSize } from "../systeme";
import { nombreCases, anneauDeIndex, distanceIndex } from "../hexSpirale";
import { techType } from "../ti5Const";
import {
    useEngine, Emplacements, Pions, Zone, Defilable, agentDisponible, aMotCle,
    STYLE_INDISPONIBLE as styleSansCondition,
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
import { cleCombat, combatsEnCours } from "./Combat";
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

        const icone = `url("${pub}/ti/unit_icon/inf.png")`;

        return (
            <span
                title={"Planète de " + nomDe(u)}
                style={{
                    display: "inline-block",
                    width: 26,
                    height: 17,
                    backgroundColor: couleurDe(u) || "#c8c8c8",
                    WebkitMaskImage: icone,
                    maskImage: icone,
                    WebkitMaskSize: "125%",
                    maskSize: "125%",
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

    // Cases où j'ai au moins une unité (dans l'espace, sur une planète ou embarquée)
    const mesCases = [...new Set(Object.values(etat.composants)
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
                return m && anneauDeIndex(Number(m[1])) > nouveau;
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

        if (!explorables.has(numero)) {
            signaler("Explorer : choisir un emplacement vide à côté d'un système où vous avez une unité.");
            return;
        }

        if (!(index.parZone.get(PIOCHE_TUILES) || []).length) {
            signaler("Explorer : la pioche de tuiles est vide.");
            return;
        }

        const logisticien = agentDisponible({ index, moi, search }, "logisticien");
        const scientifique = agentDisponible({ index, moi, search }, "scientifique");

        if (!logisticien || !scientifique) {
            signaler("Explorer demande un logisticien et un scientifique disponibles.");
            return;
        }

        const uses = `joueur:${moi}:agentsUses`;

        const zone = "hex:" + numero;

        const reponse = await envoyer([
            // Au-delà du bord : la carte gagne un anneau
            anneauDeIndex(numero) > anneaux && { type: "partie", anneaux: anneauDeIndex(numero) },
            { type: "deplacer", c: logisticien.id, vers: uses },
            { type: "deplacer", c: scientifique.id, vers: uses },
            { type: "piocher", de: PIOCHE_TUILES, vers: zone },
        ].filter(Boolean), "Exploration");

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
            jouer({ type: "creer", jeton: MARQUEUR, zone: "hex:" + numero, proprio: moi });
            return;
        }

        // Phase de science : Ctrl + clic sur un emplacement vide explore
        if (event.ctrlKey && joueur && enScience && !edition && !tuiles[numero]) {
            explorer(numero);
            return;
        }

        // Phase de trêve : Ctrl + clic sur un système y pose un marqueur de
        // trêve ; un diplomate est détruit.
        if (event.ctrlKey && joueur && /tr[eê]ve/i.test(etat.phase) && !edition && tuiles[numero]) {

            const diplomate = agentDisponible({ index, moi, search }, "diplomate");

            if (!diplomate) {
                signaler("Déclarer une trêve demande un diplomate disponible.");
                return;
            }

            jouer([
                { type: "supprimer", c: diplomate.id },
                { type: "creer", jeton: TREVE, zone: "hex:" + numero, proprio: moi },
            ]);

            return;
        }

        if (edition) {
            setCaseChoisie(numero);
        } else if (tuiles[numero]) {
            setCaseVue(numero);
        }
    }

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

        const rotation = content.rotates[Number(zone.split(":")[1])] || 0;

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

                        {caseChoisie === null && <span>Cliquer sur une case de la carte.</span>}

                        {caseChoisie !== null && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <b>Case {caseChoisie + 1} :</b>
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

            {/* CARTE */}

            <Defilable style={{ maxHeight: "80vh", backgroundColor: "#111" }}>
                <div onClick={onClick} style={{ zoom, width: "max-content", margin: "0 auto" }}>
                    <Emplacements stylePions={stylePions} extra={etendard} petit>
                        <PlateauView
                            content={content}
                            renduCase={renduCase}
                            styleCase={styleCase}
                        />
                    </Emplacements>
                </div>
            </Defilable>

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
function Mobilisation({ max, cout, mobiliser }) {

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
            <button
                type="button"
                onClick={() => mobiliser(nombre)}
                title={`Use un logisticien, dépense ${nombre * cout} ressource(s), pose ${nombre} infanterie(s) et active la planète`}
                style={{ fontWeight: "bold" }}
            >
                infanterie{nombre > 1 ? "s" : ""} ({nombre * cout} res.)
            </button>
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

    function envoyerAuCombat(lieu) {

        if (!combats.includes(lieu)) {
            envoyer([{ type: "compteur", id: cleCombat(lieu), valeur: 1 }], "Combat ouvert");
        }

        setCombatVu(lieu);
        fermer();
        allerA("combat");
    }

    // Bouton d'un combat : « voir » s'il est déjà ouvert
    const boutonCombat = (lieu, libelle, titre) => (
        <button
            key={lieu}
            type="button"
            onClick={() => envoyerAuCombat(lieu)}
            title={titre}
            style={{ fontWeight: combats.includes(lieu) ? "bold" : "normal" }}
        >
            {combats.includes(lieu) ? "Voir : " + libelle.toLowerCase() : libelle}
        </button>
    );

    const enScience = /science/i.test(etat.phase);
    const enProduction = /production/i.test(etat.phase);

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
    function utiliser(nomAgent, libelle = nomAgent) {

        const agent = agentDisponible({ index, moi, search }, nomAgent);

        if (!agent) {
            signaler(`Vous n'avez pas de ${libelle} disponible.`);
            return null;
        }

        return { type: "deplacer", c: agent.id, vers: uses };
    }

    // Phase de science, rechercher : active la planète et utilise un
    // scientifique. La recherche gagnée s'ajoute à la main (onglet Technologie).
    function rechercher(k) {

        const agent = utiliser("scientifique");

        if (agent) {
            jouer([agent, { type: "creer", jeton: ACTIVATION, zone: zonePlanete(k) }]);
        }
    }

    // Phase de science, fouiller une ruine : active la ruine, utilise un
    // scientifique et rapporte un fragment de relique — celui du type de la
    // ruine, ou tiré dans le sac pour une ruine « normale ».
    function fouiller(k, ruine, type) {

        const fragment = FRAGMENTS[type];
        const vers = `joueur:${moi}:fragments`;

        if (!fragment && !(index.parZone.get(SAC_FRAGMENTS) || []).length) {
            signaler("Le sac de fragments est vide (ou cette partie a été créée avant son ajout).");
            return;
        }

        const agent = utiliser("scientifique");

        if (agent) {
            jouer([
                agent,
                { type: "creer", jeton: ACTIVATION, zone: zonePlanete(k), marques: { ruine } },
                fragment
                    ? { type: "creer", jeton: fragment[0], zone: vers }
                    : { type: "piocher", de: SAC_FRAGMENTS, vers },
            ]);
        }
    }

    // Phase de production, mobiliser : use un logisticien, dépense les
    // ressources, pose l'infanterie sur la planète et l'active.
    function mobiliser(k, n) {

        const compteur = `joueur:${moi}:res`;
        const dispo = Number(etat.compteurs[compteur]) || 0;
        const cout = n * coutInfanterie;

        if (dispo < cout) {
            signaler(`Ressources insuffisantes : mobiliser ${n} infanterie(s) coûte ${cout}, vous avez ${dispo}.`);
            return;
        }

        // Un logisticien, ou le Généticien (Arborec) qui mobilise comme lui
        const agent = utiliser("logisticien|g[ée]n[ée]ticien", "logisticien");

        if (agent) {
            jouer([
                agent,
                cout && { type: "compteur", id: compteur, delta: -cout },
                ...Array.from({ length: n }, () => ({
                    type: "creer",
                    ref: { type: "unit", id: idInfanterie },
                    zone: zonePlanete(k),
                    proprio: moi,
                })),
                { type: "creer", jeton: ACTIVATION, zone: zonePlanete(k) },
            ]);
        }
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

    function reparer() {
        jouer([
            { type: "compteur", id: `joueur:${moi}:res`, delta: -coutReparation },
            // (si : refusé si les dégâts ont changé entre-temps)
            ...aReparer.map(c => ({ type: "marquer", c: c.id, marque: "degat", valeur: 0, si: c.marques.degat })),
        ]);
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
    function revendiquer(idPlanete) {

        const diplomate = agentDisponible({ index, moi, search }, "diplomate");

        // Sans diplomate disponible, pas de revendication
        if (!diplomate) {
            signaler("Revendiquer demande un diplomate disponible.");
            return;
        }

        prendre(idPlanete, [{ type: "deplacer", c: diplomate.id, vers: uses, de: diplomate.zone }]);
    }

    function prendre(idPlanete, avant = []) {

        const carte = cartePlanete(idPlanete);
        const zone = `joueur:${moi}:actif`;

        // (de / si : refusé si un autre joueur vient de la prendre — pas de carte en double)
        const verrou = "planete:" + idPlanete;
        const prises = Number(etat.compteurs[verrou]) || 0;

        jouer([
            ...avant,
            ...(carte
                ? [{ type: "deplacer", c: carte.id, vers: zone, de: carte.zone }]
                : [
                    { type: "compteur", id: verrou, valeur: prises + 1, si: prises },
                    { type: "creer", ref: { type: "planet", id: idPlanete }, zone, proprio: moi },
                ]),
        ]);
    }

    const aDiplomate = !!agentDisponible({ index, moi, search }, "diplomate");

    // k : position de la planète dans le système (emplacement planete:<k>)
    const liensPlanetes = (systeme?.elems || [])
        .map((lien, k) => ({ lien, k }))
        .filter(x => lienValide(x.lien));

    const planetes = useElements(liensPlanetes.map(x => x.lien.id));

    const lienSysteme = useMemo(() => ({ type: "system", id }), [id]);

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
                    <span style={{ marginLeft: 8, color: "#666" }}>case {numero + 1}</span>

                    {/* Toujours disponible : remet à zéro les dégâts de mes unités */}
                    {joueur && (
                        <button
                            type="button"
                            disabled={!aReparer.length || mesRessources < coutReparation}
                            onClick={reparer}
                            title={aReparer.length && mesRessources < coutReparation
                                ? `Il faut ${coutReparation} ressource(s), vous en avez ${mesRessources}`
                                : "Coûte 1 ressource par dégât réparé"}
                            style={{ marginLeft: 16 }}
                        >
                            Réparer toutes mes unités
                            {aReparer.length ? ` (${coutReparation} res.)` : ""}
                        </button>
                    )}

                    {joueur && (
                        <span style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
                            {boutonCombat(String(numero), "Combat spatial",
                                "Ouvre un combat entre les vaisseaux de ce système, pour toute la table")}
                            {boutonCombat(numero + "c", "Canons spatiaux",
                                "Les unités à canon spatial du système et des systèmes voisins tirent sur ses vaisseaux")}
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
                                                <button
                                                    type="button"
                                                    onClick={() => prendre(lien.id)}
                                                    style={monInfanterieSur(k) ? undefined : styleSansCondition}
                                                    title={monInfanterieSur(k)
                                                        ? "Vous avez une infanterie sur la planète : sa carte va dans vos éléments actifs"
                                                        : "Condition non remplie : il faut une de vos infanteries sur la planète (le bouton reste utilisable)"}
                                                >
                                                    Prendre possession
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => revendiquer(lien.id)}
                                                    style={mesUnitesIci && aDiplomate ? undefined : styleSansCondition}
                                                    title={mesUnitesIci && aDiplomate
                                                        ? "Vous avez une unité dans le système : use un diplomate, la carte va dans vos éléments actifs"
                                                        : (!aDiplomate
                                                            ? "Refusé : il faut un diplomate disponible" +
                                                                (mesUnitesIci ? "" : ", et une de vos unités dans le système")
                                                            : "Condition non remplie : il faut une de vos unités dans le système (le bouton reste utilisable)")}
                                                >
                                                    Revendiquer (use un diplomate)
                                                </button>
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
                                                <button
                                                    type="button"
                                                    disabled={!mesUnitesIci}
                                                    onClick={() => rechercher(k)}
                                                    title={mesUnitesIci
                                                        ? "Pose un marqueur d'activation sur la planète et use un scientifique"
                                                        : "Il faut une de vos unités dans le système"}
                                                >
                                                    Rechercher
                                                </button>
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
                                                    <button
                                                        key={ruine}
                                                        type="button"
                                                        disabled={!mesUnitesIci}
                                                        onClick={() => fouiller(k, ruine, type)}
                                                        title={mesUnitesIci
                                                            ? "Pose un marqueur d'activation sur la ruine, use un scientifique et rapporte un fragment de relique"
                                                            : "Il faut une de vos unités dans le système"}
                                                    >
                                                        Fouiller la ruine{ruines.length > 1 ? " " + ruine : ""} (
                                                        {FRAGMENTS[type] ? FRAGMENTS[type][0].toLowerCase() : "fragment tiré du sac"})
                                                    </button>
                                                )
                                        ))}

                                        {/* PHASE DE PRODUCTION */}

                                        {joueur && enProduction && aMoi && !activee && idInfanterie && prodInfanterie > 0 && (
                                            <Mobilisation
                                                max={prodInfanterie}
                                                cout={coutInfanterie}
                                                mobiliser={n => mobiliser(k, n)}
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
