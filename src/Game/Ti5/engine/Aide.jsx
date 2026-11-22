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
        "Finir mon tour : bouton de la troisième ligne de l'en-tête, jaune quand c'est à vous : la main passe au joueur suivant. Il n'est utilisable qu'à votre tour ; pour corriger, « Doit jouer » est dans l'en-tête déplié.",
        "Attendre : sur la troisième ligne de l'en-tête, use un diplomate et passe la main (à toute phase). À la phase de déplacement, le bandeau propose aussi d'attendre avec un amiral.",
        "Passer : bouton de la troisième ligne de l'en-tête ; vous êtes retiré de l'ordre du tour jusqu'à la fin de la phase.",
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
        "Clic sur un pion : sa fiche — dégâts, usé et possession pour une unité, face d'une carte, « Envoyer vers… » (donner à un autre joueur demande une confirmation), « Retirer du jeu », poser son marqueur sur une carte. Sous une carte, « Explication » donne la règle de chaque terme de son texte.",
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
        "Ma réserve : vos figurines ; cocher « Production » (« Construction » à la phase de construction) pour que poser une unité (sur la carte, une planète ou un vaisseau qui l'embarque) retire son coût de vos ressources.",
        "Aussi : votre main, vos marqueurs, vos fragments de relique, vos éléments actifs, les derniers coups (trois actions par coup ; le détail est dans l'onglet Journal).",
    ]],
    ["Onglets", [
        "Espace : la carte. Clic sur un système : sa fiche — unités par emplacement, actions de la phase, combats, achats. Sous la carte, « Afficher les numéros des systèmes » (décoché au départ).",
        "Conflit : les combats, et au-dessus les déplacements en cours, les conflits de contrôle, les tests de domination et les tests de blocage.",
        "Décision : toute question qu'une action pose s'ouvre ici, et l'onglet s'affiche tout seul. Le coup n'est envoyé qu'une fois la décision prise ; « Renoncer » l'abandonne.",
        "Décisions qui durent : elles restent dans l'onglet tant qu'elles ne sont pas réglées (Recomposition, désignation d'une loi). Tant qu'une décision vous attend, « Joueur suivant » et « Passer » sont rouge gris.",
        "Plateau joueur : feuille de faction, réserve, faveurs, fragments, éléments actifs, compte rendu du ravitaillement. Les boutons de joueur montrent le plateau des autres.",
        "Technologie : clic sur une technologie : une case de plus ; Ctrl + clic : une de moins ; Maj + clic : utilisée ce tour. On peut y poser un agent.",
        "Plateau général : le déroulé (un « + » en tête des pistes avance votre marqueur), le recrutement, les réserves, les sacs et les pioches.",
        "Vote : votre plateau de vote, les lois du tour et le décompte (voir « Vote »). Au-dessus du plateau, la faction qui joue la couleur de chaque colonne.",
        "Transactions : proposer, valider, refuser. Une transaction s'applique quand les deux factions l'ont validée ; son coût en diplomates est affiché.",
        "Promesses de base : leur réserve est infinie — une transaction en crée une nouvelle carte, la réserve du Plateau général garde toujours la sienne.",
        "Volet de droite : « Ma main » montre les noms des cartes (clic : la fiche) ; sur la ligne Commerce, les deux petits boutons « +1 » convertissent 1 commerce en 1 ressource ou 1 influence (Ctrl + clic : 5).",
        "Cartes dans une transaction : relique, promesse, agenda ou mercenaire. Ce n'est vérifié qu'à l'application : si la faction ne l'a pas, la transaction est annulée sans user de diplomate.",
        "Faveurs : à la phase d'événement des tours concernés, choisir en secret les faveurs à encaisser et valider. Les points sont comptés quand tous ont validé.",
        "Chat : « Général » et une conversation privée par joueur. Journal : tous les coups.",
        "Bouton rouge gris : la règle dit non, l'outil laisse faire après une confirmation (« Normalement impossible… »). C'est la seule fenêtre qui reste.",
    ]],
    ["Combats", [
        "Ouvrir : fiche d'un système — « Combat spatial », « Canons spatiaux », « Combat terrestre », « Bombardement », « Raid » si une unité à raid est dans l'espace.",
        "Engager : cocher ses unités, « Engager » une faction ou « Cibler » une unité (−2 pour toucher), puis « Prêt au combat ».",
        "Dégâts : glisser chaque dégât rouge sur l'unité touchée ; une unité qui a pris assez de dégâts est cochée « détruit » (décochable, après confirmation).",
        "Finir : « Terminer le combat » retire les unités détruites, avec leur butin, sans autre confirmation. Le combat résolu reste affiché jusqu'à la fin de la phase.",
        "Ouvrir au bon moment : « Combat spatial » et « Canons spatiaux » sont rouge gris hors de leur phase, ou quand aucune unité ne peut y tirer.",
        "Nouvelle version : un bandeau rouge le signale quand le site a été mis à jour depuis l'ouverture de la page ; rechargez-la.",
        "Mercenaires de combat : un bouton par mercenaire sous le combat.",
        "Phase : elle ne se quitte pas tant qu'un combat est ouvert.",
    ]],
    ["Contrôle et domination", [
        "Quand : une action qui demande le contrôle — prendre possession, construire, rechercher, fouiller, mobiliser, produire un vaisseau avec un dock, effet d'une carte.",
        "Sans opposant : si personne d'autre ne peut participer, ou seulement des neutres que vous dépassez, le test réussit tout de suite, même à 0 contre 0.",
        "Conflit de contrôle : sinon il s'ouvre dans l'onglet Conflit et dit pour quelle action. Chaque camp soutient, s'oppose ou s'abstient, avec tout son contrôle.",
        "Qui participe : les camps qui ont une unité militaire sur place, ou la possession de la planète (2 de contrôle, même sans unité ; une planète donnée aux Réfugiés est aux neutres).",
        "Conclure : « Contrôle acquis : faire l'action » — l'action part aussitôt. « Renoncer » : le test est raté.",
        "Test raté : l'action n'a pas lieu. Ses agents sont utilisés (jamais dépensés), rien d'autre n'est payé, la planète ou la ruine n'est pas activée.",
        "Page rechargée pendant le conflit : l'action n'attend plus ; une fois le contrôle acquis, refaites-la.",
        "Contrôle comme état : une carte qui lit « sous votre contrôle » fait un test par système concerné (Complexe de guerre, Vassalisation forcée, Chemin du vide) ; son résultat vaut pour la phase.",
        "Domination : un seul test par sujet (la carte qui le demande). La faction qui réunit seule le plus de contrôle fait l'action ; à égalité, personne. Il ne se rouvre pas.",
        "Domination d'une planète : bouton « Domination de la planète » de la fiche du système ; la possession y vaut 2.",
        "Rapport de force : dans tout conflit, use un diplomate pour +2 à votre contrôle (si vous participez).",
    ]],
    ["Blocage", [
        "Quand : une action qui demande une unité non bloquée — déplacement, canons, bombardement, raid, débarquement, production, réparation, livraison.",
        "Où : là où est l'unité qui agit — l'espace de son système, ou sa planète. Un système de défense compte aussi dans l'espace.",
        "Test : il s'ouvre dans l'onglet Conflit tant qu'il reste en face des unités militaires libres ; il est refait à chaque action. Bombardement, raid : dès le bouton « Bombardement » ; le combat s'ouvre quand le test est conclu.",
        "Les autres camps : chacun choisit, unité par unité, de bloquer ou d'aider. Les neutres bloquent d'office.",
        "Vous : vous égalisez le surplus avec vos propres unités, qui sont alors bloquées — militaires, puis transports, puis les autres. « Conclure le blocage ».",
        "Engagée pour la phase : toute unité qui a bloqué, aidé, égalisé ou agi (un vaisseau qui s'est déplacé, par exemple) ne sert plus à cette phase.",
        "Vaisseaux civils : ignorés au bombardement et au débarquement. Au déplacement, un camp qui bloque peut cocher « ne pas bloquer les vaisseaux civils ».",
        "Blocage raté : l'agent de l'action est utilisé, rien d'autre n'est payé.",
        "Effets : Redevance de protection dépensée d'office ; Frontière ouverte et fin des dettes proposées dans l'onglet Décision (déplacement).",
    ]],
    ["Livraisons et achats", [
        "Livrer : fiche d'un vaisseau à livraison — « Livraison commerciale ». Le négociant est utilisé et l'unité dépensée ou usée, selon son texte.",
        "Flotte : « Livrer avec la flotte » — 2 négociants font livrer tous vos vaisseaux à livraison du même espace.",
        "Destination : une faction qui a un comptoir dans le système (elle gagne le commerce, vos dettes envers elle baissent), ou « mon stock d'achat ».",
        "Stock d'achat : sur une station commerciale ou un Bazaar, la livraison est gardée à votre nom (un marqueur de faction porte le montant) ; rien ne va au possesseur.",
        "Acheter : fiche du système, cadre « Achats », à la diplomatie — « Acheter » dépense le prix de votre stock. Ce qui est acheté se prend à la main.",
        "Quand livrer : à la diplomatie ; au déplacement, pour un vaisseau de commerce déplacé à ce tour et non bloqué ; à la sous-phase de débarquement.",
    ]],
    ["Vote", [
        "Voter : un politicien dans la case est utilisé (1 voix) ; dans le carré de droite, il est dépensé (2 voix).",
        "Secret : pendant la phase de vote, ce que vous posez et vos ajustements restent sur votre appareil, sans rien au journal.",
        "Révéler : « Prêt à révéler » ; quand tous sont prêts, chacun envoie ses votes et révèle son plateau (la page doit être ouverte).",
        "Réinitialiser : les agents des cases vont dans vos agents usés, ceux des carrés de droite sont retirés du jeu.",
        "Lois du tour : un clic ouvre la fiche (la prendre en main, la mettre en jeu).",
        "Loi « Révélez… » : à l'arrivée en phase de mandat, les cartes sont piochées et posées à côté de la loi.",
        "Loi qui élit : une planète ou un système — chaque faction le désigne dans l'onglet Décision ; il s'affiche à côté de la loi, à sa couleur (« changer » pour y revenir).",
        "Décompte : chaque vote est écrit sur la couleur de sa colonne. Les voix dues à une carte sont notées à côté du total du joueur.",
        "Conclave secret : une colonne « Conclave » montre ses voix (jet « Vote du conclave » du bandeau « À faire »), ajustables à la main.",
    ]],
    ["Agents et mercenaires", [
        "Utiliser un agent : clic dans « Mes agents » (ou reprendre un agent usé) ; Ctrl + clic le supprime.",
        "Mercenaire « utilisable comme » : glissez son cube noir (ou sa carte) sur un type d'agent de « Mes agents ». Quand un agent de ce type sert, l'onglet Décision demande qui agit.",
        "Mercenaire lié à une action : son effet vaut quand c'est lui qui agit — choisi comme logisticien à l'ouverture d'une production (coût réduit, unité en plus : le bandeau le rappelle), ou par son propre bouton (« Gabriel Gibbs : mobiliser », « Tirer avec Vasra Ivo »).",
        "Héritier des Winnu : proposé de lui-même (politique si vous possédez Mecatol Rex, amiral sinon).",
        "Cube noir : un mercenaire utilisé envoie son cube dans les agents usés ; sans cube sur sa carte il n'est plus utilisable. Le ravitaillement rend les cubes.",
        "Station : reprendre l'agent posé dessus vous fait perdre la station.",
    ]],
    ["Phase par phase", [
        "Ravitaillement : automatique ; compte rendu en haut de l'écran. Vos planètes rapportent leurs ressources, leur influence et leur commerce (rond doré). Un test en attente le retient.",
        "Recrutement : Ctrl + clic sur un agent, un mercenaire ou un plan d'une case de recrutement.",
        "Déplacement : Ctrl + clic sur le système visé, « Déplacement assisté », « Finir le déplacement ».",
        "Diplomatie : « Transaction… » ; livraisons et achats.",
        "Canons, combats : fiche du système, puis l'onglet Conflit.",
        "Bombardement et débarquement : « Activer ce système », puis les deux sous-phases ; le bandeau dit où l'on en est.",
        "Revendication : fiche du système — « Prendre possession », « Revendiquer », « Abandonner ».",
        "Science : « Rechercher », « Fouiller la ruine », Ctrl + clic sur un emplacement vert pour explorer, onglet Technologie.",
        "Production : Ctrl + clic sur une unité à production, « Mobiliser », « Réparer ».",
        "Construction : case « Construction » de la réserve, puis glisser la structure.",
        "Mandat, vote : onglet Vote ; les désignations sont dans l'onglet Décision.",
        "Proposition : « proposition(s) » du bandeau, puis Ctrl + clic sur un agenda de votre main.",
        "Trêve : Ctrl + clic sur un système, ou « Déclarer une trêve » dans sa fiche.",
        "Événement : révéler l'événement du tour ; onglet Faveurs.",
        "Décompte (tour 10) : le cadre « Décompte des points » en tête de la partie détaille les points de chaque faction ; « Marquer mes points du décompte » déplace votre marqueur, une fois. Aperçu replié en haut du Plateau général pendant toute la partie.",
        "Détail : la consigne de la phase en cours est en haut de cet onglet, action par action.",
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
                                    {coupe > 0 && coupe < 40
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

// Règles générales (éléments « regle » : jet, contrôle, ciblage, application
// des dégâts...), les mêmes à toutes les phases : les fiches de phase y
// renvoient. Repliées ; une fiche n'est chargée qu'à son ouverture.
function ReglesGenerales() {

    const { search } = useEngine();

    const regles = getFromType(search, ["regle"])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    if (!regles.length) {
        return null;
    }

    return (
        <div data-regles-generales style={{ marginTop: 14 }}>
            <b style={{ fontSize: 15 }}>Règles générales</b>

            {regles.map(r => (
                <details key={r.id} data-regle={r.id} style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>{r.name}</summary>
                    <LoadAndDisplay link={{ type: "regle", id: r.id }} style={STYLE_AIDE} />
                </details>
            ))}
        </div>
    );
}

export function Aide() {

    const { etat, search } = useEngine();

    // (une partie commencée avant une renumérotation des phases porte un ancien nom : on la
    //  retrouve par son nom sans numéro ; les anciennes phases de bombardement et de débarquement
    //  mènent à la phase qui les a fusionnées)
    const sansNumero = nom => String(nom || "").replace(/^\s*\d+\s*\./, "").trim().toLowerCase();
    const phases = getFromType(search, ["phase"]);

    const phase = phases.find(e => e.name === etat.phase) ||
        phases.find(e => sansNumero(e.name) === sansNumero(etat.phase)) ||
        (/bombardement|d[ée]barquement/i.test(etat.phase || "") ? phases.find(e => /bombardement/i.test(e.name)) : undefined);

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

            <ReglesGenerales />

            <ModeEmploi />
        </div>
    );
}
