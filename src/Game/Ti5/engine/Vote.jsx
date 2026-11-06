import { useMemo, useState } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { useEngine, Emplacements, Defilable, nomElement } from "./Interaction";
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
//   Réinitialiser   les agents du carré de droite (utilisés) vont dans les
//                   agents usés ; ceux de la case (dépensés) et les autres
//                   éléments sont retirés du jeu ; le plateau est caché
// ============================================================

// Chaque case a deux emplacements : la case elle-même (pions en bas à
// gauche) et sa partie droite, le carré blanc (zone « ...:d », pions centrés).
//
//   carré de droite : le politicien est utilisé  -> 1 voix, il sera usé
//   case (à gauche) : le politicien est dépensé  -> 2 voix, il sera retiré
//
// À la réinitialisation, un agent du carré va donc dans les agents usés,
// et un agent du reste de la case est retiré du jeu.
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
//   - seuls les politiciens comptent : 2 voix dans la case, 1 voix
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

function Decompte({ lois }) {

    const { etat, index, envoyer, joueur, moi, partie, search, nomDe, couleurDe } = useEngine();

    // Toutes les colonnes, ou seulement celles qui ont des voix
    const [toutes, setToutes] = useState(false);

    const tour = etat.tour;
    const joueurs = partie.joueurs;

    // Voix posées, par "<loi>:<colonne>:<joueur>"
    const posees = {};
    let nombreLois = lois.length;

    for (const [zone, contenu] of index.parZone) {

        const m = /^joueur:(\d+):vote:(\d+):(\d+)(:d)?$/.exec(zone);

        if (!m) {
            continue;
        }

        const politiciens = contenu.filter(c =>
            !c.cache && c.ref?.type === "agent" && /politi/i.test(nomElement(search, c.ref))).length;

        const cle = `${m[2]}:${m[3]}:${m[1]}`;

        posees[cle] = (posees[cle] || 0) + politiciens * (m[4] ? 1 : 2);
        nombreLois = Math.max(nombreLois, Number(m[2]));
    }

    const cleAjustement = (loi, col, u) => `vote:${tour}:${loi}:${col}:${u}`;
    const cleOrdre = (loi, col) => `vote:${tour}:${loi}:ordre:${col}`;

    const ajustement = (loi, col, u) => Number(etat.compteurs[cleAjustement(loi, col, u)]) || 0;
    const voix = (loi, col, u) => (posees[`${loi}:${col}:${u}`] || 0) + ajustement(loi, col, u);
    const total = (loi, col) => joueurs.reduce((s, j) => s + voix(loi, col, j.userId), 0);
    const ordre = (loi, col) => Number(etat.compteurs[cleOrdre(loi, col)]) || 0;

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
                    Un politicien vaut 2 voix dans la case, 1 dans sa partie droite ; les autres agents 0.
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

                    // Classement : total, puis l'ordre donné par le responsable du sénat
                    const classement = COLONNES.map((_, col) => col)
                        .sort((a, b) => total(loi, b) - total(loi, a) || ordre(loi, b) - ordre(loi, a) || a - b);

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

    const { etat, index, jouer, joueur, moi, search, ouvrirFiche } = useEngine();

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

        // Retire du jeu les agents des cases (dépensés) et tout ce qui n'est pas un agent
        if (poses.length && !window.confirm(
            "Réinitialiser votre plateau de vote ? Les agents des carrés de droite (1 voix, utilisés) vont " +
            "dans vos agents usés ; ceux des cases (2 voix, dépensés) sont retirés du jeu."
        )) {
            return;
        }

        jouer([
            ...poses.filter(c => !c.cache).map(c => (
                c.ref?.type === "agent" && estPartieDroite(c.zone)
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

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
                    Carré de droite : politicien utilisé, 1 voix. Case : politicien dépensé, 2 voix.
                </span>

                {joueur && u === moi && (
                    <button
                        type="button"
                        onClick={reinitialiser}
                        title="Agents des carrés : dans vos agents usés. Agents des cases et autres éléments : retirés du jeu. Le plateau est caché."
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
