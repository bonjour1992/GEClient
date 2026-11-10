import { useState } from "react";
import { fetchAPI } from "../../../lib/fetch";
import { useEngine, nomElement, nomType, nomZone, nomCase, lireRegle } from "./Interaction";

// ============================================================
// JOURNAL : historique des coups
//
// Le serveur envoie les coups déjà filtrés : une action dont on
// ne voit pas le composant arrive résumée (cache: true).
// ============================================================

const COMPTEURS = {
    res: "ressources",
    inf: "influence",
    commerce: "commerce",
    passe: "passe son tour (1 = oui)",
    faveursValide: "faveurs validées (1 = oui)",
    votePret: "prêt à révéler son vote (1 = oui)",
    voteRevele: "plateau de vote révélé (1 = oui)",
    proposition: "dernière proposition d'agenda (tour)",
    entretien: "entretien fait (tour)",
    piocheProposition: "propositions piochées (tour)",
    faveurPrise: "faveur prise au ravitaillement (tour)",
};

function nomCompteur(id, nomDe) {

    const parties = id.split(":");

    if (id === "combat:case") {
        return "combat (case)";
    }

    if (id === "general:recrutement") {
        return "recrutement mis en place (tour)";
    }

    // ordre:<rang> : ordre de jeu de la phase (la valeur est le joueur)
    if (parties[0] === "ordre") {
        return `ordre de jeu, rang ${parties[1]}`;
    }

    // faveurs:<tour> : encaissements faits ce tour
    if (parties[0] === "faveurs") {
        return `encaissements de faveurs du tour ${parties[1]}`;
    }

    // vote:<tour>:<loi>:<colonne>:<joueur> et vote:<tour>:<loi>:ordre:<colonne>
    if (parties[0] === "vote") {
        return parties[3] === "ordre"
            ? `vote, loi ${parties[2]}, colonne ${parties[4]} : rang`
            : `vote, loi ${parties[2]}, colonne ${parties[3]} : ajustement de ${nomDe(Number(parties[4]))}`;
    }

    if (parties[0] === "joueur") {
        const qui = nomDe(Number(parties[1]));

        if (parties[2] === "tech") {
            return `technologie ${Number(parties[4]) + 1} de ${qui}`;
        }

        if (parties[2] === "techUse") {
            return `technologie ${Number(parties[4]) + 1} de ${qui} (utilisée)`;
        }

        return `${COMPTEURS[parties[2]] || parties.slice(2).join(":")} de ${qui}`;
    }

    return id;
}

// Texte d'une action
export function decrire(action, { search, jeu, nomDe }) {

    const composants = action.composants || [];

    const noms = composants.length
        ? composants
            .map(c => {
                if (c.ref) {
                    return nomElement(search, c.ref);
                }

                return c.jeton || `1 ${nomType(jeu, c.dos)} (caché)`;
            })
            .join(", ")
        : "";

    const zone = z => nomZone(z, nomDe);

    // Action résumée (on ne voit pas le composant) : seuls le type, les zones
    // et le dos des composants sont connus. Hors déplacement et pioche, on
    // dit seulement qu'un composant caché a été modifié.
    if (action.cache && !["deplacer", "piocher", "verser"].includes(action.type)) {
        return `${noms || "composant caché"} : modifié` +
            (action.de ? ` (${zone(action.de)})` : "");
    }

    const resultats = Array.isArray(action.resultats) ? action.resultats : [];

    switch (action.type) {

        case "deplacer":
            return `${noms} : ${zone(action.de)} → ${zone(action.vers)}` +
                (action.sur ? " (embarqué)" : "");

        case "piocher":
            return `pioche dans ${zone(action.de)} → ${zone(action.vers)} : ${noms}`;

        // Une pile entière : le nombre d'éléments plutôt que la liste
        case "verser":
            return `verse ${zone(action.de)} → ${action.dessous ? "dessous de " : ""}${zone(action.vers)} : ` +
                (composants.length > 5 ? `${composants.length} éléments` : noms);

        case "consulter":
            return `consulte ${noms} (${zone(action.zone)})`;

        case "reveler":
            return `révèle ${noms} (${zone(action.zone)})`;

        case "melanger":
            return `mélange ${zone(action.zone)}`;

        // (le composant porte déjà son nouvel élément)
        case "remplacer":
            return `devient ${noms}`;

        case "reinitialiserVotes":
            return "remet à zéro le vote (plateaux vidés et cachés, ajustements effacés)";

        // Choix scellé des faveurs : seul son auteur en voit la ligne
        case "engager":
            return action.annuler ? "revient sur son choix de faveurs" : "choisit en secret ses faveurs à dépenser";

        // Encaissement des faveurs : ce que chaque joueur a dépensé et gagné
        case "encaisser":
            return "faveurs encaissées — " + resultats
                .map(r => `${nomDe(r.joueur)} : ${r.faveurs} faveur${r.faveurs > 1 ? "s" : ""}, ` +
                    `${r.points} point${r.points > 1 ? "s" : ""}`)
                .join(" ; ");

        case "des":
            // Jet d'un composant (attaques d'un vaisseau au combat)
            if (noms) {
                return `${noms} lance ${resultats.length}d${action.faces ?? 10} : ` +
                    resultats.join(", ");
            }

            return `lance ${resultats.length}d${action.faces ?? 10} : ${resultats.join(", ")}` +
                ` (total ${resultats.reduce((s, v) => s + v, 0)})`;

        case "compteur":
            // Compteurs d'un combat : combat:<case>, :etape, :pret:<joueur>
            if (String(action.id).startsWith("combat:")) {

                const morceaux = String(action.id).split(":");

                // Lieu : "41" spatial, "41c" canons, "41p0" terrestre, "41p0b" bombardement
                const m = /^(\d+)(?:p(\d+))?([bc])?$/.exec(morceaux[1]);

                const lieu = !m ? "" : `, ${nomCase(m[1])}` +
                    (m[2] !== undefined ? `, planète ${Number(m[2]) + 1}` : "") +
                    (m[3] === "b" ? " (bombardement)" : m[3] === "c" ? " (canons)" : "");

                if (morceaux[2] === "etape") {
                    return ([
                        "combat : retour aux engagements",
                        "combat : frappe en premier lancée",
                        "combat : attaques lancées",
                    ][action.valeur] || "combat : étape " + action.valeur) + lieu;
                }

                if (morceaux[2] === "pret") {
                    return nomDe(Number(morceaux[3])) +
                        (action.valeur ? " est prêt au combat" : " n'est plus prêt") + lieu;
                }

                return (action.valeur ? "combat ouvert" : "combat terminé") + lieu;
            }

            if (String(action.id).startsWith("ordre:")) {
                return `${nomCompteur(String(action.id), nomDe)} : ${nomDe(action.valeur)}`;
            }

            return `${nomCompteur(String(action.id), nomDe)} : ` +
                (action.valeur !== undefined
                    ? "= " + action.valeur
                    : (action.delta > 0 ? "+" : "") + action.delta);

        case "retourner":
            return `${noms} : face ${action.face === "cache" ? "cachée" : action.face}`;

        case "marquer": {
            // Marques du combat : dites en clair
            const combat = {
                engage: action.valeur ? "engagement modifié" : "n'engage plus",
                des: "dés effacés",
                desF: action.valeur ? "un dé changé (réussite / échec)" : "dés remis à leur résultat",
                desA: action.valeur ? "un dégât attribué" : "dégâts à répartir de nouveau",
                degat: `dégâts = ${action.valeur ?? 0}`,
            // (chaque sorte de combat a ses marques : engage, engageB, desAT...)
            }[String(action.marque).replace(/^(engage|desF|desA|des)[CTB]$/, "$1")];

            return `${noms} : ` + (combat || `${action.marque} = ${action.valeur ?? 0}`);
        }

        case "creer":
            return `ajoute ${noms}` + (action.zone ? ` dans ${zone(action.zone)}` : "");

        case "supprimer":
            return `retire ${noms} (${zone(action.de)})`;

        case "partie": {
            const morceaux = [];

            if (action.tour !== undefined) {
                morceaux.push("tour " + action.tour);
            }

            if (action.phase !== undefined) {
                morceaux.push("phase « " + action.phase + " »");
            }

            if (action.joueurActif !== undefined) {
                morceaux.push("au tour de " + nomDe(action.joueurActif));
            }

            if (action.anneaux !== undefined) {
                morceaux.push("carte de " + action.anneaux + " anneaux");
            }

            return morceaux.join(", ");
        }

        default:
            return action.type;
    }
}

// max : nombre d'actions détaillées (volet « Derniers coups ») ; le reste
// est compté, le détail complet est dans l'onglet Journal.
function Coup({ coup, max }) {

    const ctx = useEngine();

    const heure = new Date(coup.date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    // Effet du jeu (bouton vert, ou rouge gris : Interaction.jsx, BoutonRegle) :
    // la ligne est verte s'il était faisable, rouge s'il a été fait hors conditions
    const regle = lireRegle(coup.commentaire);

    return (
        <div
            data-regle={regle?.hors ? "hors" : (regle ? "ok" : undefined)}
            style={{
                padding: "5px 0 5px 6px",
                borderBottom: "1px solid #ddd",
                borderLeft: "4px solid " + (regle ? (regle.hors ? "#c62828" : "#2e7d32") : "transparent"),
                backgroundColor: regle ? (regle.hors ? "#fdecea" : "#edf7ee") : undefined,
            }}
        >
            <div>
                {/* Le nom reste noir (lisible quelle que soit la couleur du
                    joueur) ; la couleur est portée par la pastille */}
                <span
                    style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        marginRight: 5,
                        borderRadius: "50%",
                        border: "1px solid #555",
                        backgroundColor: ctx.couleurDe(coup.auteur),
                    }}
                />
                <b>{coup.n}. {ctx.nomDe(coup.auteur)}</b>
                <span style={{ color: "#777", marginLeft: 8 }}>{heure}</span>
                {coup.commentaire && (
                    <i
                        style={{
                            marginLeft: 8,
                            color: regle ? (regle.hors ? "#b71c1c" : "#1b5e20") : undefined,
                            fontWeight: regle ? "bold" : undefined,
                        }}
                    >
                        « {coup.commentaire} »
                    </i>
                )}
            </div>

            {(max ? coup.actions.slice(0, max) : coup.actions).map((action, i) => (
                <div key={i} style={{ marginLeft: 16, fontSize: 13 }}>
                    {decrire(action, ctx)}
                </div>
            ))}

            {max > 0 && coup.actions.length > max && (
                <div style={{ marginLeft: 16, fontSize: 13, color: "#666" }}>
                    … et {coup.actions.length - max} autre(s) action(s) (onglet Journal)
                </div>
            )}
        </div>
    );
}

export function Journal({ limite }) {

    const { coups, partie } = useEngine();

    // Coups plus anciens, chargés à la demande
    const [anciens, setAnciens] = useState([]);
    const [fin, setFin] = useState(false);

    const tous = [...coups, ...anciens.filter(a => !coups.some(c => c.n === a.n))];
    const affiches = limite ? tous.slice(0, limite) : tous;
    const plusAncien = tous.length ? tous[tous.length - 1].n : 0;

    async function chargerAnciens() {

        const suite = await fetchAPI(`partie/${partie.id}/coups?avant=${plusAncien}`, "GET");

        if (!Array.isArray(suite) || !suite.length) {
            setFin(true);
            return;
        }

        setAnciens(precedent => [...precedent, ...suite]);
    }

    return (
        <div style={{ color: "#000" }}>

            {affiches.length === 0 && <div style={{ color: "#666" }}>Aucun coup pour l'instant.</div>}

            {affiches.map(coup => (
                <Coup key={coup.n} coup={coup} max={limite ? 3 : 0} />
            ))}

            {!limite && plusAncien > 1 && !fin && (
                <button type="button" onClick={chargerAnciens} style={{ marginTop: 8 }}>
                    Coups plus anciens
                </button>
            )}
        </div>
    );
}
