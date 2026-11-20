import { useEngine, Modale, nomElement, nomCase } from "./Interaction";
import { systemesExplores } from "./miseEnPlace";

// ============================================================
// INFOS DE LA PARTIE (bouton de l'en-tête)
//
// Une fenêtre, pas une décision : elle concerne la gestion de la
// partie, pas le jeu. Elle montre les paramètres de départ, gardés au
// lancement dans etat.depart (miseEnPlace.js) — plateau, joueurs,
// systèmes posés —, les systèmes explorés depuis, et porte le bouton
// « Supprimer la partie » de son créateur.
//
//   supprimer : fonction du créateur, ou null pour les autres
// ============================================================

const date = t => (t ? new Date(t).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "inconnue");

const styleLigne = { display: "flex", gap: 8, padding: "2px 0" };
const styleNom = { width: 170, flexShrink: 0, color: "#555" };

function Ligne({ nom, children }) {
    return (
        <div style={styleLigne}>
            <span style={styleNom}>{nom}</span>
            <span>{children}</span>
        </div>
    );
}

export function InfosPartie({ fermer, supprimer }) {

    const { partie, etat, search, nomDe } = useEngine();

    const depart = etat.depart;
    const explores = systemesExplores(etat);
    const createur = partie.joueurs.some(j => j.userId === partie.createur) ? nomDe(partie.createur) : `compte n° ${partie.createur}`;

    return (
        <Modale fermer={fermer} role="dialog" titre="Infos de la partie" style={{ width: 620, maxWidth: "94vw" }}>
            <div data-infos-partie style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 18 }}>Infos de la partie</b>
                    <button type="button" onClick={fermer} style={{ marginLeft: "auto" }}>Fermer</button>
                </div>

                <div>
                    <Ligne nom="Nom">{partie.nom} (partie n° {partie.id})</Ligne>
                    <Ligne nom="Créée par">{createur}</Ligne>
                    <Ligne nom="Créée le">{date(partie.cree)}</Ligne>
                    <Ligne nom="Lancée le">{date(depart?.date)}</Ligne>
                    <Ligne nom="En cours">tour {etat.tour}{etat.phase ? ` — ${etat.phase}` : ""}</Ligne>
                </div>

                {depart ? (
                    <div data-infos-depart>
                        <b>Paramètres de départ</b>
                        <Ligne nom="Plateau">{depart.nomPlateau || nomElement(search, { type: "plateau", id: depart.plateau })} (n° {depart.plateau})</Ligne>
                        <Ligne nom="Anneaux">{depart.anneaux}</Ligne>
                        <Ligne nom="Systèmes posés">{Object.keys(depart.systemes || {}).length}</Ligne>
                        <Ligne nom="Cases natales">
                            {(depart.natales || []).length
                                ? depart.natales.map(nomCase).join(", ")
                                : "aucune"}
                        </Ligne>
                        <Ligne nom="Tuiles dans la pioche">{depart.tuilesEnPioche}</Ligne>
                        <Ligne nom="Joueurs">
                            {(depart.joueurs || []).map(j =>
                                `${j.nom || nomDe(j.userId)} (${nomElement(search, { type: "faction", id: j.faction })})`).join(", ")}
                        </Ligne>
                        <Ligne nom="Systèmes explorés depuis">
                            {explores.length
                                ? explores
                                    .map(c => `${nomElement(search, c.ref)} (${nomCase(Number(c.zone.slice(4)))})`)
                                    .join(", ")
                                : "aucun"}
                        </Ligne>
                    </div>
                ) : (
                    <div>
                        <b>Paramètres de départ</b> : non enregistrés (partie lancée avant le 20 novembre 2026).
                    </div>
                )}

                {supprimer && (
                    <div style={{ borderTop: "1px solid #ccc", paddingTop: 8 }}>
                        <b>Gestion</b>
                        <div style={{ marginTop: 4 }}>
                            <button type="button" data-action="supprimer-partie" onClick={supprimer}>
                                Supprimer la partie
                            </button>
                            <span style={{ marginLeft: 8, color: "#555" }}>Définitif : ses coups, son chat et ses notes sont effacés.</span>
                        </div>
                    </div>
                )}
            </div>
        </Modale>
    );
}
