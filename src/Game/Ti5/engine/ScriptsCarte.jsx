import { useEngine, BoutonRegle, nomElement } from "./Interaction";
import { getList } from "../../../lib/fetch";
import { scriptsActifs, concerne } from "./scripts";
import { RESERVE_TUILES, exemplaires } from "./miseEnPlace";

// ============================================================
// BOUTONS DES SCRIPTS SUR LA FICHE D'UNE CARTE
//
// Les scripts de sorte « bouton » (scripts.js) rattachés à la
// carte ajoutent chacun un bouton à sa fiche.
// ============================================================

export function ScriptsCarte({ c, fermer }) {

    const { joueur, scriptsDesactives } = useEngine();

    if (!joueur || !c?.ref || c.cache) {
        return null;
    }

    return scriptsActifs(scriptsDesactives)
        .filter(s => s.sorte === "bouton" && concerne(s, c.ref))
        .map(s => (s.bouton === "evenement"
            ? <MettreEnPlaceEvenement key={s.id} c={c} fermer={fermer} />
            : null));
}

// ------------------------------------------------------------
// MISE EN PLACE D'UN ÉVÉNEMENT
//
// Met en jeu les éléments liés à l'événement (type de lien « Lié à
// un événement », Component/TypeLien.jsx), selon leur type :
//
//   feuille de technologie   chez chaque joueur qui ne l'a pas
//   promesse                 dans la réserve de promesses
//   tuile système            dans la réserve de tuiles spéciales
//   agenda, relique, carte   sur la table (à placer selon le texte)
//
// en autant d'exemplaires que le dit l'élément. Les planètes viennent
// avec leur système, et les unités se posent à la main (réserve
// neutre, recherche de carte). Le reste du texte de l'événement
// (« à T+1… ») reste à la main : la fiche montre les cartes citées.
// Le compteur evenement:<id>:place retient que c'est fait.
// ------------------------------------------------------------

// Types dont un élément peut être lié à un événement, et où il va
const DESTINATIONS = {
    techsheet: "joueurs",
    Promesse: "general:promesses",
    system: RESERVE_TUILES,
    Agenda: "general:table",
    relique: "general:table",
    mercenaire: "general:table",
    agent: "general:table",
};

function MettreEnPlaceEvenement({ c, fermer }) {

    const { etat, index, envoyer, partie, jeu, search, aviser, signaler } = useEngine();

    const compteur = `evenement:${c.ref.id}:place`;
    const nom = nomElement(search, c.ref);

    async function faire(commentaire) {

        const actions = [];
        const poses = [];

        for (const [type, destination] of Object.entries(DESTINATIONS)) {

            const lies = ((await getList(jeu, type)) || []).filter(e =>
                e.content?.lienType === "evenement" && Number(e.content.lienElement?.id) === c.ref.id);

            for (const e of lies) {

                const ref = { type, id: e.id };

                if (destination === "joueurs") {

                    // Une feuille par joueur qui ne l'a pas encore
                    const sans = partie.joueurs.filter(j =>
                        !(index.parZone.get(`joueur:${j.userId}:tech`) || []).some(x => x.ref?.id === e.id));

                    actions.push(...sans.map(j => ({ type: "creer", ref, zone: `joueur:${j.userId}:tech`, proprio: j.userId })));
                } else {
                    actions.push({ type: "creer", ref, zone: destination, n: exemplaires(e.content) });
                }

                poses.push((e.content.name || "").replace(/^(![^!]*!)+/, ""));
            }
        }

        if (!poses.length) {
            signaler(`${nom} : aucun élément n'est lié à cet événement (type de lien « Lié à un événement »).`);
            return;
        }

        envoyer([...actions, { type: "compteur", id: compteur, valeur: 1 }], commentaire);
        aviser(`${nom} : mis en jeu — ${poses.join(", ")}. Le reste du texte se fait à la main.`);
        fermer?.();
    }

    return (
        <BoutonRegle
            data-action="evenement-mise-en-place"
            nom={`Mettre en place ${nom}`}
            obstacles={[etat.compteurs[compteur] && "cet événement est déjà mis en place"]}
            faire={faire}
            title="Met en jeu les éléments liés à cet événement : feuille de technologie chez chaque joueur, promesses dans la réserve, tuiles dans la réserve de tuiles spéciales, le reste sur la table"
        >
            Mettre en place
        </BoutonRegle>
    );
}
