import { useEngine, BoutonRegle, nomCase, tuileDe, pastilleCamp } from "./Interaction";
import { useElements, contenuEnCache } from "./sync";
import { MARQUEUR, campDe } from "./miseEnPlace";
import { possesseurActuel } from "./Controle";
import { noter } from "./recherche";

// ============================================================
// STOCK D'ACHAT
//
// Un élément à système d'achat (station commerciale, université,
// Bazaar…) vend contre des livraisons. Une livraison commerciale peut
// y être versée au stock d'achat de la faction qui livre — elle ne va
// alors pas au possesseur — et c'est ce stock qui se dépense pour
// acheter, à la phase que dit l'effet (la diplomatie).
//
//   - élément à achat : une planète ou une station du système dont le
//     texte vend « pour #livr(n) » ou « par #livr(n) », ou une unité
//     Bazaar (#35, prix 3) ;
//   - stock : un marqueur de faction qui porte la marque « stock »
//     (son montant), posé sur la planète ou sur l'unité — un par
//     faction et par élément ;
//   - acheter : le prix quitte mon stock ; si le texte dit que la
//     faction possédante gagne du commerce, elle le gagne ; ce qui est
//     acheté se prend à la main (mercenaire, agent, objet du bazar),
//     sauf la recherche du Centre d'espionnage industriel, notée.
// ============================================================

const BAZAAR = 35;
const PRIX_BAZAAR = 3;
const CENTRE_ESPIONNAGE = 1250;

const sansBalises = html => String(html || "").replace(/<[^>]+>/g, " ");
const PRIX = /(?:pour|par)\s+#livr\((\d+)\)/i;
const GAIN_POSSESSEUR = /(?:possédante|#poss)[^.]*?gagne\s+#com\((\d+)\)/i;

// Éléments à système d'achat d'un système :
//   [{ cle, nom, prix, zone, sur, idElement, possesseur, gain (commerce du possesseur à chaque achat) }]
export function elementsAchat({ etat, index }, numero) {

    const elems = contenuEnCache(tuileDe(index, numero)?.ref.id)?.elems || [];

    const planetes = elems
        .map((lien, k) => ({ k, id: Number(lien?.id) || 0 }))
        .filter(x => x.id > 0 && PRIX.test(sansBalises(contenuEnCache(x.id)?.habilite)))
        .map(x => {
            const texte = sansBalises(contenuEnCache(x.id).habilite);

            return {
                cle: "p" + x.id,
                nom: contenuEnCache(x.id).name,
                prix: Number(PRIX.exec(texte)[1]),
                zone: `hex:${numero}:planete:${x.k}`,
                sur: null,
                idElement: x.id,
                possesseur: possesseurActuel(etat, x.id),
                gain: Number(GAIN_POSSESSEUR.exec(texte)?.[1]) || 0,
            };
        });

    const bazaars = [...index.parZone]
        .filter(([zone]) => zone === "hex:" + numero || zone.startsWith(`hex:${numero}:`))
        .flatMap(([, contenu]) => contenu.filter(c => !c.cache && c.ref?.type === "unit" && c.ref.id === BAZAAR))
        .map(c => ({ cle: "u" + c.id, nom: "Bazaar", prix: PRIX_BAZAAR, zone: c.zone, sur: c.id, idElement: BAZAAR, possesseur: campDe(c) || null, gain: 0 }));

    return [...planetes, ...bazaars];
}

// Marqueurs de stock posés sur un élément à achat
const marqueursDe = (etat, element) => Object.values(etat.composants).filter(c =>
    !c.ref && c.jeton === MARQUEUR && Number(c.marques?.stock) > 0 &&
    (element.sur ? c.sur === element.sur : (c.zone === element.zone && !c.sur)));

export const stockDe = (etat, element, joueur) =>
    marqueursDe(etat, element).filter(c => c.proprio === joueur).reduce((total, c) => total + Number(c.marques.stock), 0);

// Stocks de toutes les factions sur un élément : [[joueur, montant]]
export const stocksDe = (etat, element) => [...marqueursDe(etat, element).reduce(
    (parJoueur, c) => parJoueur.set(c.proprio, (parJoueur.get(c.proprio) || 0) + Number(c.marques.stock)), new Map())];

// Verse n au stock d'un joueur sur cet élément (son marqueur est créé au besoin)
export function actionsVersStock(etat, element, joueur, n) {

    const marqueur = marqueursDe(etat, element).find(c => c.proprio === joueur);

    return marqueur
        ? [{ type: "marquer", c: marqueur.id, marque: "stock", valeur: Number(marqueur.marques.stock) + n }]
        : [{ type: "creer", jeton: MARQUEUR, ...(element.sur ? { sur: element.sur } : { zone: element.zone }), proprio: joueur, marques: { stock: n } }];
}

// Dépense n du stock d'un joueur (le marqueur vidé est retiré)
export function actionsDepenserStock(etat, element, joueur, n) {

    let reste = n;

    return marqueursDe(etat, element).filter(c => c.proprio === joueur).flatMap(c => {

        const pris = Math.min(reste, Number(c.marques.stock));

        reste -= pris;

        return pris <= 0 ? [] : (pris >= Number(c.marques.stock)
            ? [{ type: "supprimer", c: c.id }]
            : [{ type: "marquer", c: c.id, marque: "stock", valeur: Number(c.marques.stock) - pris }]);
    });
}

// ------------------------------------------------------------
// Fiche d'un système : les éléments à achat, leurs stocks, et « Acheter »
// ------------------------------------------------------------

export function AchatsDuSysteme({ numero }) {

    const { etat, index, envoyer, moi, joueur, nomDe, couleurDe, aviser } = useEngine();

    // (contenus des planètes du système : le texte dit le prix)
    const liens = (contenuEnCache(tuileDe(index, numero)?.ref.id)?.elems || []).map(l => Number(l?.id)).filter(id => id > 0);

    useElements(liens);

    const elements = elementsAchat({ etat, index }, numero);

    if (!elements.length) {
        return null;
    }

    const enDiplomatie = /diplomatie/i.test(etat.phase || "");

    function acheter(element, commentaire) {

        const gain = element.gain > 0 && element.possesseur && element.possesseur !== moi;
        const centre = element.idElement === CENTRE_ESPIONNAGE;

        envoyer([
            ...actionsDepenserStock(etat, element, moi, element.prix),
            gain && { type: "compteur", id: `joueur:${element.possesseur}:commerce`, delta: element.gain },
            // (Centre d'espionnage industriel : 4 de recherche, à cocher sur une technologie d'une autre faction)
            centre && noter(etat, moi, "a", CENTRE_ESPIONNAGE, 4),
        ].filter(Boolean), [
            commentaire,
            gain && `${nomDe(element.possesseur)} +${element.gain} commerce`,
        ].filter(Boolean).join(" — "));

        aviser(centre
            ? "Achat fait : 4 de recherche notés (onglet Technologie) — cochez-les sur une technologie qu'une autre faction possède et que vous n'avez pas."
            : `Achat fait sur ${element.nom} : prenez à la main ce que vous achetez.`);
    }

    return (
        <div data-achats style={{ margin: "4px 0", padding: "4px 8px", border: "1px solid #8d6e63", borderRadius: 6, backgroundColor: "#fbe9e7", color: "#000", fontSize: 13 }}>
            {elements.map(element => (
                <div key={element.cle} data-achat={element.cle} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span>
                        <b>Achats — {element.nom}</b> ({nomCase(numero)}) : {element.prix} de stock par achat.
                        {" "}Stocks d'achat :{" "}
                        {stocksDe(etat, element).length === 0 && <i>aucun</i>}
                        {stocksDe(etat, element).map(([u, n]) => (
                            <span key={u} data-stock={u} style={{ marginRight: 8 }}>{pastilleCamp(couleurDe, u)}{nomDe(u)} : <b>{n}</b></span>
                        ))}
                    </span>

                    {joueur && (
                        <BoutonRegle
                            data-action="acheter"
                            nom={`Acheter sur ${element.nom} (${nomCase(numero)}) : ${element.prix} de mon stock d'achat`}
                            obstacles={[
                                !enDiplomatie && "ce n'est pas la phase de diplomatie",
                                stockDe(etat, element, moi) < element.prix &&
                                    `votre stock d'achat ici est de ${stockDe(etat, element, moi)}, il en faut ${element.prix} (seul ce que vous avez sera dépensé)`,
                            ]}
                            faire={commentaire => acheter(element, commentaire)}
                            title={"Dépense " + element.prix + " de votre stock d'achat sur cet élément. Le stock se remplit par des livraisons commerciales faites « au stock d'achat »" +
                                (element.gain ? ` ; la faction possédante gagne ${element.gain} commerce` : "")}
                        >
                            Acheter (−{element.prix} de mon stock)
                        </BoutonRegle>
                    )}
                </div>
            ))}
        </div>
    );
}
