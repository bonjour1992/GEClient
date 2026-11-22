import { useEngine, BoutonRegle, nomCase, pastilleCamp, styleMini } from "./Interaction";
import { campDe } from "./miseEnPlace";
import {
    BOMBARDEMENT, NOM_SOUS_PHASE, estPhaseBombardementDebarquement, sousPhaseEnCours, aPasse, systemeDejaJoue,
    actionsActiverSysteme, actionsAvancer, actionsPasser, actionsReprendre,
} from "./regleSousPhases";

// ============================================================
// PHASE DE BOMBARDEMENT ET DE DÉBARQUEMENT (bandeau, et bouton d'activation)
//
// La règle et les compteurs sont dans regleSousPhases.js. Le bandeau
// dit quel système est activé, la sous-phase en cours et qui a passé ;
// chacun y passe la sous-phase (ou reprend son passe). Quand tous ceux
// qui ont des unités dans le système ont passé, on passe au débarquement,
// puis au choix du système suivant. « Attendre » n'a pas de bouton :
// c'est laisser la main (« Joueur suivant ») sans passer.
// ============================================================

// Joueurs qui ont des unités dans le système (espace ou planètes) : ce sont eux qui se prononcent
const joueursDuSysteme = (index, joueurs, numero) => joueurs.map(j => j.userId).filter(u =>
    [...index.parZone].some(([zone, contenu]) => (zone === "hex:" + numero || zone.startsWith(`hex:${numero}:`)) &&
        contenu.some(c => !c.cache && c.ref?.type === "unit" && campDe(c) === u)));

export function SousPhases() {

    const { etat, index, envoyer, moi, joueur, partie, nomDe, couleurDe } = useEngine();

    if (!estPhaseBombardementDebarquement(etat)) {
        return null;
    }

    const { numero, sous } = sousPhaseEnCours(etat);
    const cadre = { padding: "4px 10px", border: "2px solid #6d4c41", borderRadius: 8, backgroundColor: "#efebe9", color: "#000", fontSize: 13 };

    if (numero === null) {
        return (
            <div data-sous-phases="aucun" style={cadre}>
                <b>Bombardement et débarquement</b> — aucun système activé. À votre tour : activez un système depuis sa fiche
                (« Activer ce système »), ou passez. Dans le système activé se jouent la sous-phase de bombardement, puis celle de débarquement.
            </div>
        );
    }

    const concernes = joueursDuSysteme(index, partie.joueurs, numero);
    const jeSuisConcerne = !!joueur && concernes.includes(moi);
    const suite = sous === BOMBARDEMENT ? "la sous-phase de débarquement commence" : "le système est terminé, on choisit le suivant";

    return (
        <div data-sous-phases={numero} data-sous={sous} style={cadre}>
            <b>Système activé : {nomCase(numero)}</b> — sous-phase de <b>{NOM_SOUS_PHASE[sous]}</b>
            {sous === BOMBARDEMENT ? " (les raids s'y font aussi), puis débarquement" : ""}.{" "}
            {concernes.map(u => (
                <span key={u} data-passe={aPasse(etat, u) ? 1 : 0} style={{ marginRight: 8 }}>
                    {pastilleCamp(couleurDe, u)}{nomDe(u)} : {aPasse(etat, u) ? "a passé" : "peut agir"}
                </span>
            ))}

            {jeSuisConcerne && (aPasse(etat, moi)
                ? (
                    <button type="button" data-action="reprendre-sous-phase" style={styleMini}
                        onClick={() => envoyer(actionsReprendre(moi), `Sous-phase de ${NOM_SOUS_PHASE[sous]} (${nomCase(numero)}) : ${nomDe(moi)} reprend`)}>
                        Reprendre (je n'ai pas fini)
                    </button>
                )
                : (
                    <button type="button" data-action="passer-sous-phase" style={{ ...styleMini, fontWeight: "bold" }}
                        title={`Quand tous ont passé, ${suite}`}
                        onClick={() => envoyer(actionsPasser(etat, moi, concernes),
                            `Sous-phase de ${NOM_SOUS_PHASE[sous]} (${nomCase(numero)}) : ${nomDe(moi)} passe`)}>
                        Passer le {NOM_SOUS_PHASE[sous]}
                    </button>
                ))}

            {joueur && (
                <BoutonRegle
                    data-action="avancer-sous-phase"
                    nom={`Clore la sous-phase de ${NOM_SOUS_PHASE[sous]} (${nomCase(numero)})`}
                    obstacles={concernes.filter(u => !aPasse(etat, u)).map(u => `${nomDe(u)} n'a pas passé`)}
                    faire={commentaire => envoyer(actionsAvancer(etat), commentaire)}
                    title={`Clôt la sous-phase : ${suite}`}
                    style={{ ...styleMini, marginLeft: 6 }}
                >
                    Clore la sous-phase
                </BoutonRegle>
            )}
        </div>
    );
}

// Bouton « Activer ce système » de la fiche d'un système (phase de bombardement et de débarquement)
export function ActiverSysteme({ numero, fermer }) {

    const { etat, index, envoyer, moi, joueur, partie } = useEngine();

    if (!joueur || !estPhaseBombardementDebarquement(etat)) {
        return null;
    }

    const enCours = sousPhaseEnCours(etat);

    if (enCours.numero === numero) {
        return <b data-systeme-active style={{ color: "#4e342e" }}>Système activé : sous-phase de {NOM_SOUS_PHASE[enCours.sous]}</b>;
    }

    return (
        <BoutonRegle
            data-action="activer-systeme-bombardement"
            nom={`Activer ce système (${nomCase(numero)}) : bombardement puis débarquement`}
            obstacles={[
                enCours.numero !== null && `le système ${nomCase(enCours.numero)} est activé : il se joue en entier avant le suivant`,
                systemeDejaJoue(etat, numero) && "ce système a déjà été joué à cette phase",
                !joueursDuSysteme(index, partie.joueurs, numero).includes(moi) && "vous n'avez aucune unité dans ce système",
            ]}
            faire={commentaire => {
                envoyer(actionsActiverSysteme(etat, numero), commentaire);
                fermer?.();
            }}
            title="Ce système est activé : sous-phase de bombardement, puis de débarquement, avant le choix du système suivant"
        >
            Activer ce système (bombardement, débarquement)
        </BoutonRegle>
    );
}
