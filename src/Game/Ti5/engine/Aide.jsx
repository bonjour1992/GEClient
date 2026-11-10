import { useMemo } from "react";
import { LoadAndDisplay } from "../../../Component/LoadAndDisplay";
import { getFromType } from "../../../lib/store";
import { useEngine } from "./Interaction";

// ============================================================
// ONGLET AIDE
//
//   - la fiche de la phase en cours : sa consigne « jeu en ligne »
//     (champ enLigne de l'élément « phase »), puis ses règles ;
//   - le mode d'emploi du jeu en ligne, le même à toutes les
//     phases (MODE_EMPLOI ci-dessous) : à tenir à jour quand une
//     fonction de l'engine change.
// ============================================================

const sansPrefixe = nom => nom.replace(/^!([^!]*)!/, "");

// Texte plus grand que sur la fiche imprimée
const STYLE_AIDE = { fontSize: 14, width: 760 };

// Mode d'emploi : [titre, [lignes]]. Une ligne « terme : explication »
// affiche le terme en gras.
const MODE_EMPLOI = [
    ["Principes", [
        "Validation : chaque action est validée tout de suite et notée dans le journal. Il n'y a pas de coup à envoyer.",
        "Règles : le jeu en ligne ne juge pas les règles. Il déplace, pioche, lance les dés et tient les compteurs ; les joueurs appliquent les règles.",
        "Corriger : refaire le geste inverse (redéplacer, bouton − d'un compteur). Le journal garde la trace de tout.",
        "Secret : votre main, votre plateau de vote caché et votre choix de faveurs à encaisser ne sont envoyés qu'à vous.",
        "Couleurs : jaune, vous avez quelque chose à faire ; vert, c'est fait ; rouge, un problème.",
        "Message rouge en bas de l'écran : une action refusée ou une connexion perdue. Il s'efface à l'action suivante ou quand le serveur répond de nouveau.",
        "Tout ou rien : un bouton qui fait plusieurs choses (acheter, mobiliser, transaction) les fait toutes ou aucune. Si un autre joueur a agi juste avant vous sur le même pion, votre action est refusée et rien n'est appliqué.",
        "« Affichage impossible » : si un onglet ne s'affiche plus, le reste de la partie fonctionne ; changez d'onglet ou cliquez sur « Réessayer ».",
    ]],
    ["Tour, phases et ordre de jeu", [
        "En-tête : le tour, la phase, et les joueurs dans l'ordre de jeu (son tour, a passé, joue encore). Le ▾ à gauche le réduit à une ligne ; les corrections manuelles (tour − / +, ◀, « Doit jouer ») sont alors masquées.",
        "Ordre de jeu : il est figé pendant toute la phase. Un marqueur d'initiative déplacé (en passant au recrutement) ne change l'ordre qu'à la phase suivante ; le nouvel ordre est annoncé dans l'en-tête.",
        "Fin de mon tour : bouton du volet de droite, jaune quand c'est à vous : la main passe au joueur suivant. Il n'est utilisable qu'à votre tour ; pour corriger, « Doit jouer » est dans l'en-tête déplié.",
        "Attendre : dans le volet de droite, use un diplomate et passe la main (à toute phase). À la phase de déplacement, le bandeau propose aussi d'attendre avec un amiral.",
        "Passer : bouton du volet de droite ; vous êtes retiré de l'ordre du tour jusqu'à la fin de la phase.",
        "Phase suivante : prévue quand tous les joueurs ont passé. Tant que ce n'est pas le cas, le bouton est rouge gris mais reste utilisable, après confirmation (un joueur absent ne bloque pas la partie). Il est vraiment bloqué tant qu'un combat est ouvert (phases de combat) ou que les faveurs ne sont pas encaissées (phase d'événement) ; la raison est écrite dans l'en-tête.",
        "Fin d'une phase : les marqueurs d'activation de la carte et les marqueurs de faction posés dans l'espace d'un système sont retirés, même posés sur un pion ; les unités « usées » redeviennent disponibles.",
        "Nouveau tour : disponible à la dernière phase du tour seulement (et au tour 0). Le décompte n'est une phase qu'au tour 10, qui est le dernier.",
        "◀ : phase précédente ; à la première phase, retour à la dernière phase du tour précédent.",
        "Tour 0 : mise en place des factions. « Nouveau tour » lance le tour 1.",
    ]],
    ["Manipuler les pions et les cartes", [
        "Glisser : déplace un pion ou une carte vers une zone, une case de la carte ou une planète.",
        "Ctrl + glisser : déplace tout le groupe de pions identiques.",
        "Embarquer : déposer une unité transportable sur un vaisseau (ou Maj + déposer un pion sur un autre).",
        "Planète : seule une unité terrestre peut y être posée ; un vaisseau, une unité spatiale ou un satellite est refusé.",
        "Clic sur un pion : sa fiche — dégâts, usé et possession pour une unité, face d'une carte, « Envoyer vers… » (donner à un autre joueur demande une confirmation), « Retirer du jeu », poser son marqueur sur une carte.",
        "Survol d'un pion : son nom, son propriétaire et ses dégâts.",
        "Hors jeu : ce qui est retiré du jeu reste visible en bas du plateau général et peut en être ressorti.",
        "Sources ∞ : infanterie, marqueur de faction, marqueur d'activation, tokens (trous de ver, faveurs, signal, trêve : bas du plateau général) — glisser la source pour en créer un.",
        "Carte face cachée : clic pour la consulter (vous seul) ou la révéler ; Ctrl + clic pour la révéler à tous.",
        "Cacher une carte : dans sa fiche, « Face : cachée ». Seul son propriétaire la voit ; une carte sans propriétaire devient la vôtre quand vous la cachez.",
        "Défiler : glisser le fond de la carte, d'un plateau ou du déroulé.",
    ]],
    ["Volet de droite", [
        "Blocs : chaque bloc du volet se replie avec son ▾ ; le choix est gardé dans votre navigateur.",
        "Compteurs : ressources, influence et commerce, avec − et + ; Ctrl + clic ajoute ou retire 5 d'un coup.",
        "Dés : lancer des dés ; « Système au hasard » désigne un système ni spécial ni supernova.",
        "Mes agents : clic pour utiliser un agent (ou reprendre un agent usé), Ctrl + clic pour le supprimer.",
        "Ma réserve : vos figurines ; cocher « Production » pour que poser une unité (sur la carte, une planète ou un vaisseau qui l'embarque) retire son coût de vos ressources.",
        "Aussi : votre main, vos marqueurs, vos fragments de relique, vos éléments actifs, les derniers coups (trois actions par coup ; le détail est dans l'onglet Journal).",
    ]],
    ["Onglets", [
        "Espace : la carte. Clic sur un système : ses unités par emplacement, prendre possession d'une planète ou la revendiquer, réparer (1 ressource par dégât), ouvrir un combat, et les actions de la phase.",
        "Conflit : un sous-onglet par combat (spatial, canons, terrestre, bombardement). Cocher ses unités, « Engager » ou « Cibler », « Prêt au combat » ; glisser chaque dégât rouge sur l'unité touchée. Au-dessus, les déplacements en cours arrêtés sur une case à risque : chaque camp qui y a des unités militaires choisit de s'abstenir, d'aider à passer ou de bloquer.",
        "Plateau joueur : feuille de faction, réserve, faveurs, fragments, éléments actifs ; « Entretien » au ravitaillement, une fois par tour. Les boutons de joueur montrent le plateau des autres.",
        "Technologie : clic sur une technologie = une case de recherche de plus, Ctrl + clic = une de moins, Maj + clic = utilisée ce tour. On peut y poser un agent.",
        "Plateau général : le déroulé (un « + » en tête des pistes avance votre marqueur), le recrutement, les réserves, les sacs et les pioches.",
        "Vote : votre plateau de vote, les lois du tour et le décompte. Un politicien dans le carré de droite est utilisé (1 voix) ; dans la case, il est dépensé (2 voix). « Prêt à révéler » : tous les plateaux sont révélés ensemble. « Réinitialiser » : les agents des carrés vont dans vos agents usés, ceux des cases sont retirés du jeu. Un clic sur une loi du tour ouvre sa fiche (la prendre en main, la mettre en jeu). Dans le décompte, chaque vote est écrit sur la couleur de sa colonne du plateau.",
        "Transactions : proposer, valider, refuser. Une transaction est appliquée quand les deux factions l'ont validée. Elle use alors autant de diplomates de celui qui l'a proposée que le plus grand nombre d'éléments reçus par une faction ; ce coût est affiché. Catégorie « Cartes » : une faction donne à l'autre une relique, une promesse, un agenda ou un mercenaire ; ce n'est vérifié qu'à l'application : si elle ne l'a ni en main ni en jeu, la transaction est annulée et aucun diplomate n'est utilisé.",
        "Faveurs : à la phase d'événement des tours concernés, choisir en secret les faveurs à encaisser et valider. Vos faveurs ne bougent pas avant le décompte : les autres ne voient ni combien ni lesquelles vous dépensez. Les points sont comptés quand tous les joueurs ont validé.",
        "Chat : « Général » et une conversation privée par joueur. Journal : tous les coups.",
    ]],
    ["Raccourcis par phase", [
        "Ravitaillement : Plateau joueur, « Entretien » (revenus, agents usés et technologies de nouveau disponibles, une de vos faveurs si vous possédez une planète de votre système natal). Plateau général, « Mettre en place le recrutement ». Une fois par tour chacun.",
        "Recrutement : Ctrl + clic sur un agent, un mercenaire ou un plan de relique d'une case de recrutement pour l'acheter avec votre influence (le numéro de la case ; un mercenaire coûte 2 de plus, et le surcoût du tour en plus).",
        "Déplacement : Ctrl + clic sur un système pour y poser votre marqueur ; boutons « Attendre ».",
        "Diplomatie : « Transaction… », puis l'onglet Transactions.",
        "Combats : fiche d'un système, « Combat spatial », « Canons spatiaux », « Combat terrestre », « Bombardement ».",
        "Revendication : fiche d'un système, à côté de la planète. « Prendre possession » demande une de vos infanteries sur la planète ; « Revendiquer » demande une de vos unités dans le système et use un diplomate. Un bouton rouge gris signale que la condition manque ; il reste utilisable.",
        "Science : Ctrl + clic sur un emplacement vert pour explorer, à côté d'un système où vous avez une unité (les unités natives du système découvert sont posées) ; fiche d'un système pour « Rechercher » et « Fouiller la ruine », si vous y avez une unité ; fiche d'une relique de votre main pour « Construire ».",
        "Production : case « Production » de la réserve ; fiche d'un système pour « Mobiliser » (un logisticien, ou le Généticien ; − / + règlent le nombre d'infanteries, jusqu'au maximum) et « Réparer » (1 ressource par dégât, pas les unités biologiques).",
        "Proposition : « Piocher N propositions », une seule fois par tour (« Réduire » masque la fenêtre de choix) ; Ctrl + clic sur un agenda de votre main pour le proposer au tour suivant.",
        "Trêve : clic sur un système, puis « Déclarer une trêve » dans sa fiche : un marqueur de trêve (la colombe) y est posé et un diplomate retiré. Hors de la phase de trêve ou sans diplomate, le bouton est rouge gris mais reste utilisable après confirmation.",
        "Événement : révéler l'événement du tour ; onglet Faveurs.",
    ]],
];

function ModeEmploi() {
    return (
        <div style={{ maxWidth: 900 }}>
            <div style={{ margin: "14px 0 4px", fontWeight: "bold", fontSize: 16 }}>
                Mode d'emploi du jeu en ligne
            </div>

            {MODE_EMPLOI.map(([titre, lignes]) => (
                <details
                    key={titre}
                    style={{
                        marginBottom: 4,
                        padding: "4px 10px",
                        border: "1px solid #aaa",
                        borderRadius: 8,
                        backgroundColor: "#f5f5f5",
                    }}
                >
                    <summary style={{ fontWeight: "bold", cursor: "pointer" }}>{titre}</summary>

                    <ul style={{ margin: "4px 0", paddingLeft: 22 }}>
                        {lignes.map(ligne => {
                            const coupe = ligne.indexOf(" : ");

                            return (
                                <li key={ligne} style={{ marginBottom: 2 }}>
                                    {coupe > 0 && coupe < 28
                                        ? <><b>{ligne.slice(0, coupe)}</b>{ligne.slice(coupe)}</>
                                        : ligne}
                                </li>
                            );
                        })}
                    </ul>
                </details>
            ))}
        </div>
    );
}

export function Aide() {

    const { etat, search } = useEngine();

    const phase = getFromType(search, ["phase"])
        .find(e => sansPrefixe(e.name) === etat.phase);

    const idPhase = phase?.id ?? null;

    const lien = useMemo(
        () => (idPhase ? { type: "phase", id: idPhase } : null),
        [idPhase]
    );

    return (
        <div style={{ overflowX: "auto" }}>

            {!etat.phase && (
                <div>
                    Aucune phase en cours (tour 0 : mise en place). L'aide de la phase
                    s'affichera ici dès le tour 1.
                </div>
            )}

            {etat.phase && !lien && <div>Pas de fiche pour la phase « {etat.phase} ».</div>}

            {lien && (
                <>
                    <b style={{ fontSize: 16 }}>Tour {etat.tour} — {etat.phase}</b>

                    {/* Ce qu'il faut faire sur le jeu en ligne à cette phase */}
                    <div style={{ margin: "8px 0 4px", fontWeight: "bold" }}>Sur le jeu en ligne</div>
                    <LoadAndDisplay link={lien} displayeur="enLigne" style={STYLE_AIDE} />

                    <div style={{ margin: "12px 0 4px", fontWeight: "bold" }}>Règles de la phase</div>
                    <LoadAndDisplay link={lien} style={STYLE_AIDE} />
                </>
            )}

            <ModeEmploi />
        </div>
    );
}
