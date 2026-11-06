import { useState } from "react";
import { turnNumber } from "../ti5Const";
import { useEngine, nomElement, couleurJoueur, COULEUR_A_FAIRE } from "./Interaction";
import { MARQUEUR, DETTE } from "./miseEnPlace";

// ============================================================
// TRANSACTION (phase de diplomatie)
//
// Une transaction entre deux factions, préparée dans une fenêtre
// puis envoyée en un seul coup :
//
//   - promesse de base : une carte de la réserve de promesses va chez
//     un des deux joueurs, sur la case d'un tour de sa feuille de
//     faction (elle prend fin à ce tour) ou dans ses éléments actifs
//     (sans fin), avec le marqueur de l'autre faction posé dessus ;
//   - dette : un jeton « Dette N » sur la case du tour de paiement du
//     débiteur, à la couleur du créancier ;
//   - faveur : un jeton de faveur change de main.
//
// Coût : une transaction use autant de diplomates que le plus grand
// nombre d'éléments reçus par une des deux factions. Ils sont pris
// parmi les diplomates disponibles de celui qui la propose, au
// moment où elle est appliquée.
// ============================================================

const INFINI = "infini";

// Valeur maximale d'une dette (règle)
const DETTE_MAX = 6;

// Transactions proposées, en attente de validation : dans cette zone, un
// jeton d'en-tête (marques tx, f1, f2, ok1, ok2) et un jeton par ligne
// (marques tx, sorte, et le détail de la ligne).
export const ZONE_TRANSACTIONS = "general:transactions";
const TRANSACTION = "transaction";
const LIGNE_TRANSACTION = "ligne de transaction";

// Faction qui reçoit l'élément d'une ligne : celle qui garde la promesse,
// le créancier d'une dette, celle à qui la faveur est donnée
const receveur = ligne => Number(ligne.sorte === "promesse" ? ligne.chez : ligne.a);

// Coût d'une transaction en diplomates : le plus grand nombre d'éléments
// reçus par une faction (lignes : marques des jetons, ou lignes en préparation)
export function coutDiplomates(lignes) {

    const recus = new Map();

    for (const ligne of lignes) {
        recus.set(receveur(ligne), (recus.get(receveur(ligne)) || 0) + 1);
    }

    return Math.max(0, ...recus.values());
}

// Diplomates disponibles d'un joueur
const diplomatesDe = (index, search, u) => (index.parZone.get(`joueur:${u}:agents`) || [])
    .filter(c => c.ref && /diplomate/i.test(nomElement(search, c.ref)));

// Transactions en attente : [{ entete, tx, f1, f2, ok1, ok2, lignes }]
export function transactionsEnAttente(index) {

    const jetons = index.parZone.get(ZONE_TRANSACTIONS) || [];

    return jetons
        .filter(c => !c.ref && c.jeton === TRANSACTION)
        .map(entete => ({
            entete,
            tx: entete.marques.tx,
            f1: Number(entete.marques.f1),
            f2: Number(entete.marques.f2),
            ok1: !!entete.marques.ok1,
            ok2: !!entete.marques.ok2,
            lignes: jetons.filter(c => !c.ref && c.jeton === LIGNE_TRANSACTION && c.marques.tx === entete.marques.tx),
        }));
}

// ============================================================
// ONGLET TRANSACTIONS
//
// Les transactions proposées. Chaque faction concernée la valide ;
// quand les deux l'ont fait, elle est appliquée en un coup — sauf
// si elle n'est plus applicable (une carte ou une faveur a bougé
// entre-temps). Chacune des deux peut la refuser ; celui qui l'a
// proposée peut l'annuler.
// ============================================================

export function Transactions({ nouvelle }) {

    const { etat, index, moi, joueur, search, nomDe, couleurDe, envoyer, signaler } = useEngine();

    const transactions = transactionsEnAttente(index);

    // Texte d'une ligne, et ce qui l'empêche d'être appliquée (ou null)
    function lire(ligne) {

        const m = ligne.marques;

        if (m.sorte === "promesse") {
            const carte = etat.composants[m.carte];

            return {
                texte: `Promesse « ${carte?.ref ? nomElement(search, carte.ref) : "?"} » chez ${nomDe(Number(m.chez))}` +
                    (m.duree === INFINI ? ", sans fin" : `, jusqu'au tour ${m.duree}`) +
                    `, marqueur de ${nomDe(Number(m.autre))}`,
                obstacle: carte?.zone === "general:promesses" ? null : "la promesse n'est plus dans la réserve",
            };
        }

        if (m.sorte === "dette") {
            return {
                texte: `${nomDe(Number(m.doit))} doit ${m.n} à ${nomDe(Number(m.a))}, à payer au tour ${m.tour}`,
                obstacle: null,
            };
        }

        const jeton = etat.composants[m.jeton];

        return {
            texte: `${nomDe(Number(m.de))} donne une faveur${jeton ? " de " + nomDe(jeton.proprio) : ""} à ${nomDe(Number(m.a))}`,
            obstacle: jeton?.zone === `joueur:${m.de}:faveurs` ? null : `${nomDe(Number(m.de))} n'a plus cette faveur`,
        };
    }

    // Coût d'une transaction : { n, payeur, dispo, obstacle }. Les diplomates
    // sont ceux de la faction qui l'a proposée.
    function cout(t) {

        const n = coutDiplomates(t.lignes.map(l => l.marques));
        const payeur = t.entete.proprio;
        const dispo = diplomatesDe(index, search, payeur);

        return {
            n,
            payeur,
            dispo,
            obstacle: dispo.length < n
                ? `${nomDe(payeur)} n'a que ${dispo.length} diplomate(s) disponible(s) sur ${n}`
                : null,
        };
    }

    // Actions qui appliquent la transaction
    function application(t) {

        const { n, payeur, dispo } = cout(t);

        // Les diplomates de celui qui propose sont utilisés
        const actions = dispo.slice(0, n).map(c => ({
            type: "deplacer",
            c: c.id,
            vers: `joueur:${payeur}:agentsUses`,
            de: c.zone,
        }));

        for (const ligne of t.lignes) {

            const m = ligne.marques;

            if (m.sorte === "promesse") {
                actions.push({
                    type: "deplacer",
                    c: m.carte,
                    vers: m.duree === INFINI ? `joueur:${m.chez}:actif` : `joueur:${m.chez}:tour:${m.duree}`,
                    de: "general:promesses",
                });
                actions.push({ type: "creer", jeton: MARQUEUR, sur: m.carte, proprio: Number(m.autre) });
            }

            // Dette : un jeton avec son montant, et le marqueur du créancier dessus
            if (m.sorte === "dette") {

                // Identifiant provisoire, tiré de celui de la ligne (unique dans le coup)
                const idDette = "t99" + ligne.id.replace(/\D/g, "");

                actions.push({
                    type: "creer",
                    idLocal: idDette,
                    jeton: DETTE,
                    zone: `joueur:${m.doit}:tour:${m.tour}`,
                    marques: { montant: Number(m.n) },
                });
                actions.push({ type: "creer", jeton: MARQUEUR, sur: idDette, proprio: Number(m.a) });
            }

            if (m.sorte === "faveur") {
                actions.push({ type: "deplacer", c: m.jeton, vers: `joueur:${m.a}:faveurs`, de: `joueur:${m.de}:faveurs` });
            }
        }

        return actions;
    }

    const retrait = t => [t.entete, ...t.lignes].map(c => ({ type: "supprimer", c: c.id }));

    function accepter(t) {

        const moiEn1 = t.f1 === moi;
        const autreOk = moiEn1 ? t.ok2 : t.ok1;

        // L'autre faction n'a pas encore validé : je note mon accord
        if (!autreOk) {
            envoyer([{ type: "marquer", c: t.entete.id, marque: moiEn1 ? "ok1" : "ok2", valeur: 1 }], "");
            return;
        }

        const obstacles = [...t.lignes.map(l => lire(l).obstacle), cout(t).obstacle].filter(Boolean);

        if (obstacles.length) {
            signaler("Cette transaction n'est pas applicable : " + obstacles.join(" ; ") + ".");
            return;
        }

        // Tout le monde a validé : elle est appliquée
        envoyer([...application(t), ...retrait(t)], `Transaction ${nomDe(t.f1)} ↔ ${nomDe(t.f2)}`);
    }

    return (
        <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 8 }}>

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <b style={{ fontSize: 16 }}>Transactions en cours</b>

                {joueur && (
                    <button type="button" onClick={nouvelle} style={{ fontWeight: "bold" }}>
                        Nouvelle transaction…
                    </button>
                )}

                <span style={{ fontSize: 13, color: "#444" }}>
                    Une transaction est appliquée dès que les deux factions concernées l'ont validée.
                </span>
            </div>

            {transactions.length === 0 && <i style={{ color: "#666" }}>Aucune transaction en attente.</i>}

            {transactions.map(t => {

                const concerne = t.f1 === moi || t.f2 === moi;
                const monAccord = t.f1 === moi ? t.ok1 : (t.f2 === moi ? t.ok2 : false);
                const lues = t.lignes.map(lire);
                const prix = cout(t);
                const obstacles = [...lues.map(l => l.obstacle), prix.obstacle].filter(Boolean);

                return (
                    <div
                        key={t.tx}
                        style={{
                            padding: 8,
                            border: "2px solid " + (concerne && !monAccord ? "#ff9800" : "#aaa"),
                            borderRadius: 8,
                            backgroundColor: concerne && !monAccord ? "#fff3cd" : "#fafafa",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <b>{nomDe(t.f1)} ↔ {nomDe(t.f2)}</b>
                            <span style={{ color: "#666", fontSize: 12 }}>proposée par {nomDe(t.entete.proprio)}</span>

                            {[[t.f1, t.ok1], [t.f2, t.ok2]].map(([u, ok]) => (
                                <span
                                    key={u}
                                    style={{
                                        padding: "0 8px",
                                        borderRadius: 10,
                                        border: "2px solid " + (couleurDe(u) || "#888"),
                                        backgroundColor: ok ? "#c8e6c9" : "#fff",
                                        fontSize: 12,
                                    }}
                                >
                                    {nomDe(u)} : {ok ? "✔ a validé" : "en attente"}
                                </span>
                            ))}
                        </div>

                        <ul style={{ margin: "4px 0", paddingLeft: 22 }}>
                            {lues.map((l, k) => (
                                <li key={k}>
                                    {l.texte}
                                    {l.obstacle && <b style={{ color: "#c00" }}> — {l.obstacle}</b>}
                                </li>
                            ))}
                        </ul>

                        <div style={{ fontSize: 13 }}>
                            <b>Coût : {prix.n} diplomate{prix.n > 1 ? "s" : ""}</b>, utilisé{prix.n > 1 ? "s" : ""} par{" "}
                            {nomDe(prix.payeur)} quand la transaction s'applique
                            {" "}({prix.dispo.length} disponible{prix.dispo.length > 1 ? "s" : ""}).
                            {prix.obstacle && <b style={{ color: "#c00" }}> — {prix.obstacle}</b>}
                        </div>

                        {obstacles.length > 0 && (
                            <div style={{ color: "#c00", fontSize: 13 }}>
                                Cette transaction n'est pas applicable en l'état : elle ne peut qu'être refusée
                                ou annulée, tant que l'obstacle demeure.
                            </div>
                        )}

                        {joueur && (
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                {concerne && !monAccord && (
                                    <button
                                        type="button"
                                        disabled={obstacles.length > 0}
                                        onClick={() => accepter(t)}
                                        style={{ fontWeight: "bold", padding: "4px 12px", backgroundColor: COULEUR_A_FAIRE }}
                                    >
                                        Valider
                                    </button>
                                )}

                                {(concerne || t.entete.proprio === moi) && (
                                    <button
                                        type="button"
                                        onClick={() => envoyer(retrait(t), t.entete.proprio === moi
                                            ? "Transaction annulée"
                                            : "Transaction refusée")}
                                    >
                                        {t.entete.proprio === moi ? "Annuler" : "Refuser"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            <div style={{ fontSize: 12, color: "#666" }}>
                Une promesse ou une faveur qui a changé de place depuis la proposition rend la
                transaction inapplicable, de même qu'un diplomate qui manque à celui qui l'a proposée.
            </div>
        </div>
    );
}

const styleLigne = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
};

export function Transaction({ fermer }) {

    const { etat, index, partie, moi, search, nomDe, envoyer } = useEngine();

    const joueurs = partie.joueurs;
    // (chaque ligne garde le joueur qui donne : faveur.de)

    // Par défaut, on est la faction 1
    const [f1, setF1] = useState(moi);
    const [f2, setF2] = useState(joueurs.find(j => j.userId !== moi)?.userId ?? moi);

    // Tours à venir (cases du haut de la feuille de faction)
    const tours = Array.from({ length: turnNumber - 1 }, (_, i) => i + 2)
        .filter(t => t > etat.tour);

    // Éléments de la transaction : { sorte, texte, ... }
    const [lignes, setLignes] = useState([]);

    // --------------------------------------------------------
    // PROMESSES DE BASE (réserve du plateau général)
    // --------------------------------------------------------

    const reserve = index.parZone.get("general:promesses") || [];
    const prises = lignes.filter(l => l.sorte === "promesse").map(l => l.carte);
    const libres = reserve.filter(c => c.ref && !prises.includes(c.id));

    // Une option par promesse différente
    const sortes = [...new Map(libres.map(c => [c.ref.id, c])).values()];

    const [promesse, setPromesse] = useState("");
    const [detenteur, setDetenteur] = useState(1);
    const [duree, setDuree] = useState(INFINI);

    function ajouterPromesse() {

        const carte = libres.find(c => c.ref.id === Number(promesse));

        if (!carte) {
            return;
        }

        const chez = detenteur === 1 ? f1 : f2;
        const autre = detenteur === 1 ? f2 : f1;

        setLignes(l => [...l, {
            sorte: "promesse",
            carte: carte.id,
            chez,
            autre,
            duree,
            texte: `Promesse « ${nomElement(search, carte.ref)} » chez ${nomDe(chez)}` +
                (duree === INFINI ? ", sans fin" : `, jusqu'au tour ${duree}`) +
                `, marqueur de ${nomDe(autre)}`,
        }]);
    }

    // --------------------------------------------------------
    // DETTES
    // --------------------------------------------------------

    const [debiteur, setDebiteur] = useState(1);
    const [quantite, setQuantite] = useState(1);
    const [paiement, setPaiement] = useState(tours[0] ?? etat.tour + 1);

    function ajouterDette() {

        const doit = debiteur === 1 ? f1 : f2;
        const a = debiteur === 1 ? f2 : f1;
        // Une dette vaut de 1 à 6
        const n = Math.min(DETTE_MAX, Math.max(1, Math.floor(Number(quantite)) || 1));

        setLignes(l => [...l, {
            sorte: "dette",
            doit,
            a,
            n,
            tour: Number(paiement),
            texte: `${nomDe(doit)} doit ${n} à ${nomDe(a)}, à payer au tour ${paiement}`,
        }]);
    }

    // --------------------------------------------------------
    // FAVEURS
    // --------------------------------------------------------

    const donnees = lignes.filter(l => l.sorte === "faveur").map(l => l.jeton);

    const faveursDe = u => (index.parZone.get(`joueur:${u}:faveurs`) || [])
        .filter(c => !c.cache && !donnees.includes(c.id));

    function donnerFaveur(jeton, de, a) {
        setLignes(l => [...l, {
            sorte: "faveur",
            jeton: jeton.id,
            de,
            a,
            texte: `${nomDe(de)} donne une faveur de ${nomDe(jeton.proprio)} à ${nomDe(a)}`,
        }]);
    }

    // --------------------------------------------------------
    // ENVOI
    // --------------------------------------------------------

    // La transaction n'est pas exécutée tout de suite : elle est proposée,
    // et chaque faction concernée doit la valider (onglet Transactions).
    // Elle est gardée dans l'état de la partie : un jeton d'en-tête et un
    // jeton par ligne, dans la zone general:transactions.
    function valider() {

        // Identifiant de la transaction : le joueur qui propose, et un numéro
        // qu'aucune de ses transactions en attente ne porte
        const numeros = transactionsEnAttente(index)
            .map(t => String(t.tx).split("-"))
            .filter(([u]) => Number(u) === moi)
            .map(([, n]) => Number(n) || 0);

        const tx = `${moi}-${Math.max(0, ...numeros) + 1}`;

        envoyer([
            {
                type: "creer",
                jeton: TRANSACTION,
                zone: ZONE_TRANSACTIONS,
                proprio: moi,
                // ok1, ok2 : la faction a validé (celui qui propose valide d'office)
                marques: { tx, f1, f2, ok1: f1 === moi ? 1 : 0, ok2: f2 === moi ? 1 : 0 },
            },
            // (le texte d'une ligne n'est pas gardé : il est recomposé à l'affichage)
            ...lignes.map(({ texte: _texte, ...ligne }) => ({
                type: "creer",
                jeton: LIGNE_TRANSACTION,
                zone: ZONE_TRANSACTIONS,
                marques: { tx, ...ligne },
            })),
        ], `Transaction proposée : ${nomDe(f1)} ↔ ${nomDe(f2)}`);

        fermer();
    }

    // Changer de faction vide la transaction en cours
    function choisir(setter, valeur) {
        setter(Number(valeur));
        setLignes([]);
    }

    const selecteur = (valeur, setter) => (
        <select
            value={valeur}
            onChange={e => choisir(setter, e.target.value)}
            style={{
                fontWeight: "bold",
                border: "3px solid " + couleurJoueur(joueurs.find(j => j.userId === valeur)),
            }}
        >
            {joueurs.map(j => (
                <option key={j.userId} value={j.userId}>{j.nom}</option>
            ))}
        </select>
    );

    const cote = (valeur, setter) => (
        <select value={valeur} onChange={e => setter(Number(e.target.value))}>
            <option value={1}>{nomDe(f1)}</option>
            <option value={2}>{nomDe(f2)}</option>
        </select>
    );

    const memes = f1 === f2;

    // Coût en diplomates, payé par celui qui propose (moi)
    const prix = coutDiplomates(lignes);
    const mesDiplomates = diplomatesDe(index, search, moi).length;

    return (
        <div
            // Un clic à côté ne ferme pas une transaction déjà composée
            onClick={() => { if (!lignes.length) { fermer(); } }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                backgroundColor: "#0008",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 50,
            }}
        >
            <div
                onClick={event => event.stopPropagation()}
                style={{
                    width: 640,
                    maxWidth: "94vw",
                    maxHeight: "85vh",
                    overflow: "auto",
                    padding: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "4px solid #444",
                    borderRadius: 12,
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={styleLigne}>
                    <b style={{ fontSize: 18 }}>Transaction</b>
                    {selecteur(f1, setF1)}
                    <span>↔</span>
                    {selecteur(f2, setF2)}
                    <button type="button" onClick={fermer} style={{ marginLeft: "auto" }}>Fermer</button>
                </div>

                {memes && <div style={{ color: "#a00" }}>Choisir deux factions différentes.</div>}

                {!memes && (
                    <>
                        {/* PROMESSE */}

                        <b>Promesse de base</b>
                        <div style={styleLigne}>
                            <select value={promesse} onChange={e => setPromesse(e.target.value)}>
                                <option value="">Promesse…</option>
                                {sortes.map(c => (
                                    <option key={c.ref.id} value={c.ref.id}>
                                        {nomElement(search, c.ref)}
                                    </option>
                                ))}
                            </select>
                            chez {cote(detenteur, setDetenteur)}
                            <select value={duree} onChange={e => setDuree(e.target.value)}>
                                <option value={INFINI}>sans fin (éléments actifs)</option>
                                {tours.map(t => (
                                    <option key={t} value={t}>jusqu'au tour {t}</option>
                                ))}
                            </select>
                            <button type="button" disabled={!promesse} onClick={ajouterPromesse}>Ajouter</button>
                        </div>

                        {/* DETTE */}

                        <b>Dette</b>
                        <div style={styleLigne}>
                            {cote(debiteur, setDebiteur)} doit
                            <input
                                type="number"
                                min={1}
                                max={DETTE_MAX}
                                value={quantite}
                                onChange={e => setQuantite(e.target.value)}
                                style={{ width: 55 }}
                            />
                            à payer au tour
                            <select value={paiement} onChange={e => setPaiement(e.target.value)}>
                                {tours.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <button type="button" disabled={!tours.length} onClick={ajouterDette}>Ajouter</button>
                        </div>

                        {/* FAVEURS */}

                        <b>Faveurs</b>
                        {[[f1, f2], [f2, f1]].map(([de, a]) => (
                            <div key={de} style={styleLigne}>
                                <span>{nomDe(de)} donne à {nomDe(a)} :</span>
                                {faveursDe(de).length === 0 && <i style={{ color: "#666" }}>aucune faveur</i>}
                                {faveursDe(de).map(jeton => (
                                    <button key={jeton.id} type="button" onClick={() => donnerFaveur(jeton, de, a)}>
                                        faveur de {nomDe(jeton.proprio)}
                                    </button>
                                ))}
                            </div>
                        ))}

                        {/* RÉCAPITULATIF */}

                        <div
                            style={{
                                marginTop: 8,
                                padding: 6,
                                backgroundColor: lignes.length ? "#fff3cd" : "#f5f5f5",
                                border: "1px solid " + (lignes.length ? "#ff9800" : "#aaa"),
                                borderRadius: 8,
                            }}
                        >
                            <b>Contenu de la transaction</b>

                            {lignes.length === 0 && <div style={{ color: "#666" }}>Rien pour l'instant.</div>}

                            {lignes.map((l, i) => (
                                <div key={i} style={{ ...styleLigne, marginBottom: 2 }}>
                                    <span style={{ flex: 1 }}>{l.texte}</span>
                                    <button
                                        type="button"
                                        title="Retirer de la transaction"
                                        onClick={() => setLignes(liste => liste.filter((x, k) => k !== i))}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            {lignes.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <b>Coût : {prix} diplomate{prix > 1 ? "s" : ""}</b> (le plus grand nombre
                                    d'éléments reçus par une faction), utilisé{prix > 1 ? "s" : ""} par vous quand
                                    elle s'applique. Vous en avez {mesDiplomates} disponible{mesDiplomates > 1 ? "s" : ""}.
                                    {mesDiplomates < prix && (
                                        <b style={{ color: "#c00" }}> Il vous en manque {prix - mesDiplomates}.</b>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={!lignes.length || mesDiplomates < prix}
                                onClick={valider}
                                style={{ marginTop: 6, fontWeight: "bold", padding: "6px 12px" }}
                            >
                                Proposer la transaction
                            </button>
                            <span style={{ marginLeft: 8, fontSize: 12, color: "#555" }}>
                                Elle sera appliquée quand les deux factions l'auront validée.
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
