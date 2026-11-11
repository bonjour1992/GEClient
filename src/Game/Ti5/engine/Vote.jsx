import { useMemo, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useEngine, Emplacements, Defilable, nomElement, BoutonRegle, agentDisponible } from "./Interaction";
import { MARQUEUR } from "./miseEnPlace";
import { PlayerColor } from "../ti5Const";

// ============================================================
// ONGLET VOTE
//
// Chaque joueur a son plateau de vote (l'élément « vote » du jeu),
// dont chaque case (data-emplacement "vote:<ligne>:<colonne>")
// reçoit des éléments : zones joueur:<u>:vote:<ligne>:<colonne>.
//
// Le plateau est caché aux autres joueurs tant que son joueur ne
// l'a pas révélé (compteur joueur:<u>:voteRevele, voir etat.js) :
// ils n'en reçoivent rien, pas même le nombre d'éléments posés.
//
//   Prêt à révéler  (décompte) tous les plateaux sont révélés ensemble
//   Réinitialiser   les agents de la case (utilisés) vont dans les agents
//                   usés ; ceux du carré de droite (dépensés) et les autres
//                   éléments sont retirés du jeu ; le plateau est caché
// ============================================================

// Chaque case a deux emplacements : la case elle-même (pions en bas à
// gauche) et sa partie droite, le carré blanc (zone « ...:d », pions centrés).
//
//   case (à gauche) : le politicien est utilisé  -> 1 voix, il sera usé
//   carré de droite : le politicien est dépensé  -> 2 voix, il sera retiré
//
// À la réinitialisation, un agent de la case va donc dans les agents usés,
// et un agent du carré de droite est retiré du jeu.
const estPartieDroite = zone => zone.endsWith(":d");

const stylePions = zone => (estPartieDroite(zone)
    ? {
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
    }
    : {
        position: "absolute",
        left: 3,
        bottom: 3,
        maxWidth: "70%",
        justifyContent: "flex-start",
        zIndex: 5,
    });

// ============================================================
// DÉCOMPTE DES VOTES
//
// Pour chaque loi du tour (ligne du plateau de vote) et chaque
// colonne (Contre, Pour, 1 à 6), les voix de chaque joueur :
//
//   - seuls les politiciens comptent : 1 voix dans la case, 2 voix
//     dans sa partie droite ; les autres agents valent 0 ;
//   - plus un ajustement manuel (compteur vote:<tour>:<loi>:<col>:<u>),
//     possible à tout moment : voix annoncées au prévote, effets
//     que l'engine ne connaît pas.
//
// Un plateau caché ne compte pas tant qu'il n'est pas révélé.
// Chacun se dit « prêt à révéler » (joueur:<u>:votePret) ; quand
// tous le sont, tous les plateaux sont révélés dans le même coup.
//
// Les colonnes sont classées par total. Le responsable du sénat
// (dernière case d'initiative) départage les égalités : compteur
// vote:<tour>:<loi>:ordre:<col>, le plus grand passe devant.
//
// L'engine n'applique pas la loi : les joueurs s'en chargent.
// ============================================================

const COLONNES = ["Contre", "Pour", "1", "2", "3", "4", "5", "6"];

// Couleur de chaque colonne sur le plateau de vote (vote.jsx : les couleurs
// de joueur, dans l'ordre) : Contre en noir, Pour en vert, puis 1 à 6.
const COULEURS_COLONNES = Object.values(PlayerColor);

// Le nom d'un vote, écrit comme sur le plateau : sur la couleur de sa colonne
function styleVote(col) {

    const fond = COULEURS_COLONNES[col] || "#666";

    return {
        display: "inline-block",
        minWidth: 46,
        padding: "0 6px",
        borderRadius: 4,
        backgroundColor: fond,
        // (le jaune est la seule couleur claire du plateau)
        color: fond.toLowerCase() === "#f9cc39" ? "#000" : "#fff",
    };
}

const styleCellule = { border: "1px solid #bbb", padding: "1px 6px", textAlign: "center" };
const styleMini = { fontSize: 11, padding: "0 4px" };

// Voix et classement des votes du tour (aussi lu par effets.js, pour Trading)
//   aScript : script Réseau d'ingérence — un scientifique posé sur le plateau de vote vaut 2 voix
export function decompteVotes({ etat, index, joueurs, search, aScript }) {

    const tour = etat.tour;

    // Voix posées, par "<loi>:<colonne>:<joueur>"
    const posees = {};
    let nombreLois = 0;

    for (const [zone, contenu] of index.parZone) {

        const m = /^joueur:(\d+):vote:(\d+):(\d+)(:d)?$/.exec(zone);

        if (!m) {
            continue;
        }

        const politiciens = contenu.filter(c =>
            !c.cache && c.ref?.type === "agent" && /politi/i.test(nomElement(search, c.ref))).length;

        const scientifiques = aScript?.(Number(m[1]), "reseau-d-ingerence")
            ? contenu.filter(c => !c.cache && c.ref?.type === "agent" && /scientifique/i.test(nomElement(search, c.ref))).length
            : 0;

        const cle = `${m[2]}:${m[3]}:${m[1]}`;

        posees[cle] = (posees[cle] || 0) + politiciens * (m[4] ? 2 : 1) + scientifiques * 2;
        nombreLois = Math.max(nombreLois, Number(m[2]));
    }

    const cleAjustement = (loi, col, u) => `vote:${tour}:${loi}:${col}:${u}`;
    const cleOrdre = (loi, col) => `vote:${tour}:${loi}:ordre:${col}`;

    const ajustement = (loi, col, u) => Number(etat.compteurs[cleAjustement(loi, col, u)]) || 0;
    const voix = (loi, col, u) => (posees[`${loi}:${col}:${u}`] || 0) + ajustement(loi, col, u);
    const total = (loi, col) => joueurs.reduce((s, j) => s + voix(loi, col, j.userId), 0);
    const ordre = (loi, col) => Number(etat.compteurs[cleOrdre(loi, col)]) || 0;

    // Classement des colonnes d'une loi : total, puis l'ordre donné par le responsable du sénat
    const classement = loi => COLONNES.map((_, col) => col)
        .sort((a, b) => total(loi, b) - total(loi, a) || ordre(loi, b) - ordre(loi, a) || a - b);

    return { nombreLois, cleAjustement, cleOrdre, ajustement, voix, total, ordre, classement };
}

// Trading, à la fin de la phase de vote : un négociant posé sur le plateau
// de vote d'un joueur est sa prédiction ; si cette case est la première de
// sa loi, il gagne 2 commerce (une fois par loi).
//   -> { actions, messages }
export function tradingFinDeVote({ etat, index, joueurs, search, aScript, nomDe }) {

    const votes = decompteVotes({ etat, index, joueurs, search, aScript });
    const gains = new Map();
    const messages = [];

    for (const [zone, contenu] of index.parZone) {

        const m = /^joueur:(\d+):vote:(\d+):(\d+)(:d)?$/.exec(zone);
        const u = Number(m?.[1]);

        if (!m || !aScript(u, "trading") || gains.get(u)?.has(m[2]) ||
            !contenu.some(c => !c.cache && c.ref?.type === "agent" && /n[ée]gociant/i.test(nomElement(search, c.ref)))) {
            continue;
        }

        const [loi, col] = [Number(m[2]), Number(m[3])];

        if (votes.total(loi, col) > 0 && votes.classement(loi)[0] === col) {
            gains.set(u, (gains.get(u) || new Set()).add(m[2]));
            messages.push(`Trading : ${nomDe(u)} gagne 2 commerce (loi ${loi})`);
        }
    }

    return {
        actions: [...gains].map(([u, lois]) => ({ type: "compteur", id: `joueur:${u}:commerce`, delta: 2 * lois.size })),
        messages,
    };
}

function Decompte({ lois }) {

    const { etat, index, envoyer, joueur, moi, partie, search, nomDe, couleurDe, aScript } = useEngine();

    // Toutes les colonnes, ou seulement celles qui ont des voix
    const [toutes, setToutes] = useState(false);

    const joueurs = partie.joueurs;

    const votes = decompteVotes({ etat, index, joueurs, search, aScript });
    const { cleAjustement, cleOrdre, ajustement, voix, total, ordre } = votes;
    const nombreLois = Math.max(lois.length, votes.nombreLois);

    // Responsable du sénat : le joueur de la dernière case d'initiative
    const senat = (index.parZone.get("general:initiative:" + joueurs.length) || [])
        .find(m => m.jeton === MARQUEUR && m.proprio)?.proprio ?? null;

    // --------------------------------------------------------
    // RÉVÉLATION : tous les plateaux en même temps
    // --------------------------------------------------------

    const estRevele = u => !!etat.compteurs[`joueur:${u}:voteRevele`];
    const estPret = u => !!etat.compteurs[`joueur:${u}:votePret`];

    const caches = joueurs.filter(j => !estRevele(j.userId));
    const tousPrets = caches.length > 0 && caches.every(j => estPret(j.userId));
    const jeVote = joueur && joueurs.some(j => j.userId === moi);

    const revelation = () => joueurs.flatMap(j => [
        !estRevele(j.userId) && { type: "compteur", id: `joueur:${j.userId}:voteRevele`, valeur: 1 },
        estPret(j.userId) && { type: "compteur", id: `joueur:${j.userId}:votePret`, valeur: 0 },
    ]).filter(Boolean);

    function basculerPret() {

        const compteur = `joueur:${moi}:votePret`;

        if (estPret(moi)) {
            envoyer([{ type: "compteur", id: compteur, valeur: 0 }], "");
            return;
        }

        // Je suis le dernier attendu : tout est révélé avec mon « prêt »
        if (caches.every(j => j.userId === moi || estPret(j.userId))) {
            envoyer(revelation(), "Vote : plateaux révélés");
        } else {
            envoyer([{ type: "compteur", id: compteur, valeur: 1 }], "");
        }
    }

    const numerosLois = Array.from({ length: nombreLois }, (_, k) => k + 1);

    return (
        <div
            style={{
                padding: "4px 10px",
                border: "1px solid #aaa",
                borderRadius: 8,
                backgroundColor: "#f5f5f5",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>

                <b>Décompte des votes</b>

                <span style={{ fontSize: 12, color: "#444" }}>
                    Un politicien vaut 1 voix dans la case (utilisé), 2 dans sa partie droite (dépensé) ; les autres agents 0
                    (un scientifique : 2 voix avec « Réseau d'ingérence »).
                </span>

                {/* Qui a révélé son plateau, qui est prêt */}
                {joueurs.map(j => (
                    <span
                        key={j.userId}
                        style={{
                            padding: "0 8px",
                            borderRadius: 10,
                            border: "2px solid " + (couleurDe(j.userId) || "#888"),
                            backgroundColor: "#fff",
                            fontSize: 12,
                        }}
                    >
                        {j.nom} : {estRevele(j.userId) ? "révélé" : (estPret(j.userId) ? "✔ prêt" : "caché")}
                    </span>
                ))}

                {jeVote && !estRevele(moi) && (
                    <button
                        type="button"
                        onClick={basculerPret}
                        title="Quand tous les joueurs sont prêts, tous les plateaux sont révélés en même temps"
                        style={{
                            fontWeight: "bold",
                            padding: "3px 10px",
                            backgroundColor: estPret(moi) ? "#2e7d32" : "#ffe082",
                            color: estPret(moi) ? "#fff" : "#000",
                        }}
                    >
                        {estPret(moi) ? "Prêt ✔" : "Prêt à révéler"}
                    </button>
                )}

                {/* Tous prêts mais rien n'est parti (deux « prêt » en même temps) */}
                {joueur && tousPrets && (
                    <button
                        type="button"
                        style={{ fontWeight: "bold" }}
                        onClick={() => envoyer(revelation(), "Vote : plateaux révélés")}
                    >
                        Révéler tous les plateaux
                    </button>
                )}

                <label style={{ fontSize: 12 }}>
                    <input type="checkbox" checked={toutes} onChange={e => setToutes(e.target.checked)} />{" "}
                    toutes les colonnes (pour ajuster)
                </label>

                {/* Remise à zéro du vote, pour tous (aussi faite à chaque nouveau tour) */}
                {joueur && (
                    <button
                        type="button"
                        data-action="reinitialiser-votes"
                        title="Tous les plateaux de vote sont vidés et cachés (agents des cases : agents usés ; ceux des carrés de droite et le reste : retirés du jeu), les ajustements manuels effacés. Fait aussi à chaque nouveau tour."
                        style={{ marginLeft: "auto" }}
                        onClick={() => window.confirm(
                            "Réinitialiser le décompte des votes pour tous les joueurs ?\n" +
                            "Tous les plateaux de vote sont vidés et cachés : les agents des cases " +
                            "(utilisés) vont dans les agents usés, ceux des carrés de droite (dépensés) sont retirés du jeu. " +
                            "Les ajustements manuels sont effacés."
                        ) && envoyer([{ type: "reinitialiserVotes" }], "Vote : décompte réinitialisé")}
                    >
                        Réinitialiser le décompte
                    </button>
                )}
            </div>

            {caches.length > 0 && (
                <div style={{ fontSize: 12, color: "#a15c00" }}>
                    Les voix des plateaux encore cachés ne sont pas comptées.
                </div>
            )}

            {nombreLois === 0 && <i style={{ color: "#666" }}>Aucune loi à voter ce tour.</i>}

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12, marginTop: 4 }}>
                {numerosLois.map(loi => {

                    const carte = lois[loi - 1];

                    const classement = votes.classement(loi);

                    const affichees = classement.filter(col =>
                        toutes || total(loi, col) !== 0 || joueurs.some(j => ajustement(loi, col, j.userId) !== 0));

                    const egalite = col => total(loi, col) > 0 &&
                        classement.some(autre => autre !== col && total(loi, autre) === total(loi, col));

                    return (
                        <table key={loi} style={{ borderCollapse: "collapse", backgroundColor: "#fff", fontSize: 13 }}>
                            <caption style={{ textAlign: "left", fontWeight: "bold", padding: "2px 0" }}>
                                {loi}. {carte && !carte.cache && carte.ref ? nomElement(search, carte.ref) : "loi " + loi}
                            </caption>
                            <thead>
                                <tr>
                                    <th style={styleCellule}>rang</th>
                                    <th style={styleCellule}>vote</th>
                                    {joueurs.map(j => (
                                        <th
                                            key={j.userId}
                                            style={{ ...styleCellule, borderBottom: "3px solid " + (couleurDe(j.userId) || "#888") }}
                                        >
                                            {j.nom}
                                        </th>
                                    ))}
                                    <th style={styleCellule}>total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {affichees.length === 0 && (
                                    <tr>
                                        <td colSpan={joueurs.length + 3} style={{ ...styleCellule, color: "#666" }}>
                                            aucune voix
                                        </td>
                                    </tr>
                                )}

                                {affichees.map(col => (
                                    <tr key={col} style={{ backgroundColor: classement[0] === col && total(loi, col) > 0 ? "#e8f5e9" : undefined }}>
                                        <td style={styleCellule}>
                                            {total(loi, col) > 0 ? classement.indexOf(col) + 1 : "—"}
                                            {egalite(col) && <span title="Égalité" style={{ color: "#c00" }}> =</span>}

                                            {/* Le responsable du sénat départage : ce vote passe devant */}
                                            {joueur && moi === senat && egalite(col) && (
                                                <button
                                                    type="button"
                                                    title="Responsable du sénat : faire passer ce vote devant ses ex æquo"
                                                    style={{ ...styleMini, marginLeft: 4 }}
                                                    onClick={() => envoyer([{ type: "compteur", id: cleOrdre(loi, col), delta: 1 }], "")}
                                                >
                                                    ↑
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ ...styleCellule, fontWeight: "bold" }}>
                                            <span style={styleVote(col)}>{COLONNES[col]}</span>
                                        </td>

                                        {joueurs.map(j => {
                                            const corrige = ajustement(loi, col, j.userId);

                                            return (
                                                <td key={j.userId} style={styleCellule}>
                                                    {joueur && (
                                                        <button
                                                            type="button"
                                                            title="Ajustement manuel : une voix de moins"
                                                            style={styleMini}
                                                            onClick={() => envoyer([{ type: "compteur", id: cleAjustement(loi, col, j.userId), delta: -1 }], "")}
                                                        >
                                                            −
                                                        </button>
                                                    )}
                                                    <b style={{ display: "inline-block", minWidth: 22 }}>{voix(loi, col, j.userId)}</b>
                                                    {joueur && (
                                                        <button
                                                            type="button"
                                                            title="Ajustement manuel : une voix de plus"
                                                            style={styleMini}
                                                            onClick={() => envoyer([{ type: "compteur", id: cleAjustement(loi, col, j.userId), delta: 1 }], "")}
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                    {corrige !== 0 && (
                                                        <span title="dont ajustement manuel" style={{ fontSize: 11, color: "#a15c00" }}>
                                                            {" "}({corrige > 0 ? "+" : ""}{corrige})
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td style={{ ...styleCellule, fontWeight: "bold" }}>{total(loi, col)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                })}
            </div>

            <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
                Égalités : départagées par le responsable du sénat
                {senat ? ` (${nomDe(senat)})` : " (personne sur la dernière case d'initiative)"}.
                L'application de la loi se fait à la main.
            </div>
        </div>
    );
}

export function Vote({ vu }) {

    const { etat, index, jouer, envoyer, joueur, moi, search, ouvrirFiche, aScript } = useEngine();

    // Script Argumentation véhémente : loi et colonne visées
    const [argument, setArgument] = useState({ loi: 1, col: 1 });

    const u = vu.userId;
    const base = "joueur:" + u;
    const idVote = etat.references?.vote;

    const lien = useMemo(() => ({ type: "vote", id: idVote }), [idVote]);

    const drapeau = base + ":voteRevele";
    const revele = !!etat.compteurs[drapeau];

    // Tout ce qui est posé sur le plateau
    const poses = [...index.parZone.entries()]
        .filter(([zone]) => zone.startsWith(base + ":vote:"))
        .flatMap(([, liste]) => liste);

    function reinitialiser() {

        // Retire du jeu les agents des carrés de droite (dépensés) et tout ce qui n'est pas un agent
        if (poses.length && !window.confirm(
            "Réinitialiser votre plateau de vote ? Les agents des cases (1 voix, utilisés) vont " +
            "dans vos agents usés ; ceux des carrés de droite (2 voix, dépensés) sont retirés du jeu."
        )) {
            return;
        }

        jouer([
            ...poses.filter(c => !c.cache).map(c => (
                c.ref?.type === "agent" && !estPartieDroite(c.zone)
                    ? { type: "deplacer", c: c.id, vers: base + ":agentsUses" }
                    : { type: "supprimer", c: c.id }
            )),
            { type: "compteur", id: drapeau, valeur: 0 },
            // Plus « prêt à révéler » non plus
            etat.compteurs[base + ":votePret"] && { type: "compteur", id: base + ":votePret", valeur: 0 },
        ]);
    }

    if (!idVote) {
        return <div>Cette partie n'a pas de plateau de vote (lancée avant son ajout).</div>;
    }

    // Lois du tour : les agendas de la case Agenda du tour dans le déroulé.
    // Leur numéro est celui de la ligne du plateau de vote.
    const lois = index.parZone.get("general:agenda:" + etat.tour) || [];

    // Script Argumentation véhémente (prévote) : un politicien est utilisé — il
    // ne reste pas sur le plateau —, 1 influence est payée, et 2 voix s'ajoutent
    // tout de suite au décompte (ajustement du vote, visible de tous)
    const politicien = agentDisponible({ index, moi, search }, "politi");
    const monInfluence = Number(etat.compteurs[`joueur:${moi}:inf`]) || 0;

    const argumentation = joueur && u === moi && aScript(moi, "argumentation-vehemente") && (
        <div
            data-script="argumentation-vehemente"
            style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, padding: "4px 10px", border: "1px solid #aaa", borderRadius: 8, backgroundColor: "#f5f5f5" }}
        >
            <b>Argumentation véhémente</b> : 2 voix sur la loi
            <select value={argument.loi} onChange={e => setArgument({ ...argument, loi: Number(e.target.value) })}>
                {Array.from({ length: Math.max(lois.length, 1) }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}
            </select>
            pour
            <select value={argument.col} onChange={e => setArgument({ ...argument, col: Number(e.target.value) })}>
                {COLONNES.map((nom, col) => <option key={col} value={col}>{nom}</option>)}
            </select>
            <BoutonRegle
                data-action="argumentation-vehemente"
                nom={`Argumentation véhémente : 2 voix « ${COLONNES[argument.col]} » sur la loi ${argument.loi}`}
                obstacles={[
                    !/pr[ée]vote/i.test(etat.phase) && "ce n'est pas la phase de prévote",
                    !politicien && "vous n'avez pas de politicien disponible (aucun ne sera usé)",
                    monInfluence < 1 && "il vous faut 1 influence",
                ]}
                faire={commentaire => envoyer([
                    politicien && { type: "deplacer", c: politicien.id, vers: `joueur:${moi}:agentsUses` },
                    { type: "compteur", id: `joueur:${moi}:inf`, delta: -1 },
                    { type: "compteur", id: `vote:${etat.tour}:${argument.loi}:${argument.col}:${moi}`, delta: 2 },
                ], commentaire)}
                title="Use un politicien et 1 influence : 2 voix ajoutées tout de suite au décompte"
            >
                Générer 2 voix (use un politicien, 1 influence)
            </BoutonRegle>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {argumentation}

            <div
                style={{
                    padding: "4px 10px",
                    border: "1px solid #aaa",
                    borderRadius: 8,
                    backgroundColor: "#f5f5f5",
                }}
            >
                <b>Lois du tour {etat.tour}</b>

                {lois.length === 0 && <span style={{ color: "#666" }}> : aucune dans la case Agenda du tour.</span>}

                {/* Les cartes en entier, avec leur numéro (ligne du plateau de vote) */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 10, marginTop: 4 }}>
                    {lois.map((c, k) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                            <b
                                style={{
                                    minWidth: 26,
                                    padding: "2px 0",
                                    borderRadius: 6,
                                    backgroundColor: "#000",
                                    color: "#fff",
                                    fontSize: 18,
                                    textAlign: "center",
                                }}
                            >
                                {k + 1}
                            </b>

                            {c.cache || !c.ref
                                ? <i>carte face cachée</i>
                                : (
                                    // Un clic ouvre la fiche de la carte : « Envoyer vers… »
                                    // (ma main, mes éléments actifs, les lois, la défausse)
                                    <div
                                        title={nomElement(search, c.ref) + " — clic : prendre en main, mettre en jeu…"}
                                        onClick={() => ouvrirFiche(c.id)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <div style={{ pointerEvents: "none" }}>
                                            <LoadAndDisplay link={{ ...c.ref, __link: true }} />
                                        </div>
                                    </div>
                                )}
                        </div>
                    ))}
                </div>
            </div>

            <Decompte lois={lois} />

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>

                {/* État normal, donc sans couleur d'alerte. La révélation se
                    fait pour tous ensemble (« Prêt à révéler », dans le décompte). */}
                <b style={{ color: revele ? "#1a5021" : "#555" }}>
                    {revele
                        ? "Plateau révélé : tout le monde le voit."
                        : "Plateau caché : les autres joueurs n'en voient rien."}
                </b>

                <span style={{ fontSize: 13, color: "#444" }}>
                    Case : politicien utilisé, 1 voix. Carré de droite : politicien dépensé, 2 voix.
                </span>

                {joueur && u === moi && (
                    <button
                        type="button"
                        onClick={reinitialiser}
                        title="Agents des cases : dans vos agents usés. Agents des carrés de droite et autres éléments : retirés du jeu. Le plateau est caché."
                    >
                        Réinitialiser
                    </button>
                )}
            </div>

            <Defilable>
                <Emplacements prefixe={base} stylePions={stylePions} style={{ width: "max-content" }}>
                    <LoadAndDisplay link={lien} />
                </Emplacements>
            </Defilable>
        </div>
    );
}
