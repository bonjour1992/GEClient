import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Shield, User as IconeCompte } from "lucide-react";
import { games } from "../Game/games";
import { useSearch, useUser } from "../lib/store";
import * as fAPI from "../lib/fetch.js";

// ============================================================
// EN-TÊTE DU SITE
//
// Une seule barre fixe de 40 px, en ligne (flex) :
//
//   [ fil d'Ariane ……… ] [ recherche ] [ ……… outils du jeu, compte ]
//
// La recherche est au centre de la barre : le fil d'Ariane et le groupe de
// droite se partagent le reste à parts égales. Les outils du jeu (recherche,
// « Ajouter », éléments supprimés) sont rendus par JeuBar.jsx dans les
// emplacements `slotRecherche` et `slotOutils`, que cette barre lui passe
// par le contexte de son <Outlet> : ils n'existent que sur les pages d'un jeu.
//
// Petit écran (moins de 700 px) : la barre garde une seule ligne. Le fil
// d'Ariane ne montre que la page courante, précédée d'un bouton « retour »
// vers son parent ; les boutons perdent leur libellé ; la recherche se
// replie en icône et s'ouvre sur toute la barre.
//
// Les menus (« Ajouter », compte) s'ouvrent au clic, pas au survol : ils
// fonctionnent au doigt.
// ============================================================

export const HAUTEUR_ENTETE = 40;

export default function HeaderBar() {
    const loc = useLocation()

    // Emplacements des outils du jeu (JeuBar.jsx y rend sa recherche, au centre, et ses
    // boutons, à droite)
    const [slotRecherche, setSlotRecherche] = useState(null)
    const [slotOutils, setSlotOutils] = useState(null)

    return (
        <>
            <style>{STYLE_ENTETE}</style>
            <header className="no-print ge-entete">
                <Location location={loc} />
                <div ref={setSlotRecherche} className="ge-entete-centre" />
                <div className="ge-entete-droite">
                    <div ref={setSlotOutils} className="ge-entete-jeu" />
                    <User />
                </div>
            </header>
            <div
                className="no-print ge-bar-espace"
                style={{ height: HAUTEUR_ENTETE }}
            ></div>
            <Outlet context={{ slotRecherche, slotOutils }} />
        </>
    )
}

// Couleurs : l'encre et le bleu lagune des cartes du jeu, sur fond clair.
const STYLE_ENTETE = `
.ge-entete {
    --ge-encre: #172045;
    --ge-lagune: #1f6f80;
    --ge-brume: #eef2f6;
    --ge-trait: #c3cedb;
    /* (largeur : celle de l'écran, même sur une page plus large que lui — une feuille A4
       sur un téléphone — où 100 % vaudrait la largeur de la page) */
    position: fixed; top: 0; left: 0; width: min(100%, 100vw); z-index: 50;
    height: ${HAUTEUR_ENTETE}px; box-sizing: border-box;
    display: flex; align-items: center; gap: 6px; padding: 0 8px;
    background: #fff; color: var(--ge-encre);
    border-bottom: 2px solid var(--ge-encre);
    font: 14px/1.2 "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
}
.ge-entete a { color: var(--ge-lagune); text-decoration: none; }
.ge-entete :focus-visible { outline: 2px solid var(--ge-lagune); outline-offset: 1px; }

/* Fil d'Ariane */
.ge-fil { flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 2px; overflow: hidden; }
.ge-fil-lien {
    /* (les pages parentes se raccourcissent bien avant la page courante) */
    flex: 0 10 auto; min-width: 2.5em; max-width: 170px;
    padding: 5px 7px; border-radius: 6px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-weight: 600;
}
.ge-fil-lien:hover { background: var(--ge-brume); }
.ge-fil-lien.ge-fil-courant { flex: 0 1 auto; max-width: none; color: var(--ge-encre) !important; font-weight: 800; }
.ge-fil-sep { flex: none; color: var(--ge-trait); display: inline-flex; }
.ge-fil-retour { display: none !important; }

/* Centre (recherche) et groupe de droite (outils du jeu, compte) : le fil d'Ariane et le
   groupe de droite prennent la même part, la recherche reste donc au milieu de la barre */
.ge-entete-centre { flex: 0 1 320px; min-width: 0; display: flex; align-items: center; }
.ge-entete-centre:empty { display: none; }
.ge-entete-droite { flex: 1 1 0; min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.ge-entete-jeu { flex: none; display: flex; align-items: center; gap: 6px; }

/* Boutons de la barre */
.ge-bouton {
    flex: none; height: 30px; box-sizing: border-box;
    display: inline-flex; align-items: center; gap: 5px; padding: 0 9px;
    border: 1px solid var(--ge-trait); border-radius: 8px;
    background: #fff; color: var(--ge-encre);
    font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.ge-bouton:hover, .ge-bouton[aria-expanded="true"] { background: var(--ge-brume); border-color: var(--ge-encre); }
.ge-bouton-principal { background: var(--ge-encre); border-color: var(--ge-encre); color: #fff; }
.ge-bouton-principal:hover, .ge-bouton-principal[aria-expanded="true"] { background: var(--ge-lagune); border-color: var(--ge-lagune); }
.ge-bouton-icone { width: 30px; padding: 0; justify-content: center; }

/* Menus déroulants */
.ge-menu { position: relative; flex: none; }
.ge-menu-liste {
    position: absolute; top: calc(100% + 7px); right: 0; z-index: 60;
    min-width: 190px; max-height: 75vh; overflow-y: auto;
    margin: 0; padding: 5px; list-style: none; box-sizing: border-box;
    background: #fff; border: 2px solid var(--ge-encre); border-radius: 10px;
    box-shadow: 0 6px 16px #17204533;
}
.ge-menu-liste.ge-menu-colonnes { display: grid; grid-template-columns: repeat(2, minmax(150px, 1fr)); gap: 0 4px; }
.ge-menu-liste a, .ge-menu-liste button.ge-menu-ligne {
    display: flex; align-items: center; gap: 7px; width: 100%; box-sizing: border-box;
    padding: 7px 9px; border: none; border-radius: 6px; background: none;
    color: var(--ge-encre); font: inherit; text-align: left; cursor: pointer; white-space: nowrap;
}
.ge-menu-liste a:hover, .ge-menu-liste button.ge-menu-ligne:hover { background: var(--ge-brume); }
.ge-menu-titre { padding: 6px 9px 7px; font-weight: 800; border-bottom: 1px solid var(--ge-trait); margin-bottom: 4px; }

/* Compte */
.ge-compte-nom { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

/* Recherche (JeuBar.jsx) */
.ge-recherche { position: relative; flex: 1 1 auto; min-width: 150px; display: flex; align-items: center; }
.ge-recherche-loupe { position: absolute; left: 9px; display: inline-flex; color: var(--ge-lagune); pointer-events: none; }
.ge-recherche input {
    width: 100%; height: 30px; box-sizing: border-box; padding: 0 10px 0 30px;
    border: 1px solid var(--ge-trait); border-radius: 15px; background: var(--ge-brume);
    color: var(--ge-encre); font: inherit;
}
.ge-recherche input:focus { background: #fff; border-color: var(--ge-encre); outline: none; }
.ge-recherche-ouvrir, .ge-recherche-fermer { display: none !important; }
.ge-recherche [data-resultats-recherche] {
    position: absolute; top: calc(100% + 7px); left: 0; z-index: 60;
    width: min(420px, 92vw); max-height: 70vh; overflow-y: auto; box-sizing: border-box;
    background: #fff; border: 2px solid var(--ge-encre); border-radius: 10px;
    box-shadow: 0 6px 16px #17204533; font-size: 14px;
}

/* Petit écran : une seule ligne, libellés repliés */
@media (max-width: 700px) {
    .ge-entete { gap: 4px; padding: 0 5px; }
    /* (plus de centrage : la page courante prend la place, les icônes se rangent à droite) */
    .ge-fil { flex: 1 1 auto; }
    .ge-entete-centre, .ge-entete-droite { flex: none; gap: 4px; }
    .ge-entete-jeu { gap: 4px; }
    .ge-fil-lien:not(.ge-fil-courant), .ge-fil-sep { display: none; }
    .ge-fil-retour { display: inline-flex !important; }
    .ge-fil-lien.ge-fil-courant { padding-left: 3px; }
    .ge-libelle { display: none; }
    .ge-bouton { padding: 0; width: 32px; height: 32px; justify-content: center; }
    .ge-menu-liste { position: fixed; top: ${HAUTEUR_ENTETE + 4}px; left: 5px; right: auto; width: calc(min(100%, 100vw) - 10px); max-height: calc(100vh - ${HAUTEUR_ENTETE + 14}px); }
    .ge-menu-liste a, .ge-menu-liste button.ge-menu-ligne { padding: 10px 9px; }

    .ge-recherche { flex: none; min-width: 0; }
    .ge-recherche input, .ge-recherche-loupe { display: none; }
    .ge-recherche-ouvrir { display: inline-flex !important; }
    /* Recherche ouverte : elle recouvre la barre */
    .ge-recherche.ge-recherche-ouverte {
        position: absolute; inset: 0; z-index: 55; padding: 0 5px; gap: 4px; background: #fff;
    }
    .ge-recherche.ge-recherche-ouverte input { display: block; flex: 1 1 auto; height: 32px; font-size: 16px; }
    .ge-recherche.ge-recherche-ouverte .ge-recherche-loupe { display: inline-flex; left: 14px; }
    .ge-recherche.ge-recherche-ouverte .ge-recherche-ouvrir { display: none !important; }
    .ge-recherche.ge-recherche-ouverte .ge-recherche-fermer { display: inline-flex !important; }
    .ge-recherche [data-resultats-recherche] { position: fixed; top: ${HAUTEUR_ENTETE}px; left: 0; width: 100vw; border-radius: 0 0 10px 10px; border-top: none; }
}
`;

// ============================================================
// MENU DÉROULANT
//
// Un bouton et sa liste, ouverte au clic. Fermée par un clic ailleurs,
// par Échap, ou par le choix d'une ligne.
//   bouton   : contenu du bouton
//   classe   : classes du bouton, en plus de « ge-bouton »
//   titre    : info-bulle et nom accessible du bouton
//   colonnes : la liste s'affiche sur deux colonnes
// ============================================================

export function Menu({ bouton, classe = "", titre, colonnes = false, children }) {

    const [ouvert, setOuvert] = useState(false)
    const racine = useRef(null)

    useEffect(() => {

        if (!ouvert) {
            return undefined
        }

        const dehors = e => !racine.current?.contains(e.target) && setOuvert(false)
        const echap = e => e.key === "Escape" && setOuvert(false)

        document.addEventListener("pointerdown", dehors)
        document.addEventListener("keydown", echap)

        return () => {
            document.removeEventListener("pointerdown", dehors)
            document.removeEventListener("keydown", echap)
        }
    }, [ouvert])

    return (
        <div className="ge-menu" ref={racine}>
            <button
                type="button"
                className={"ge-bouton " + classe}
                title={titre}
                aria-label={titre}
                aria-haspopup="menu"
                aria-expanded={ouvert}
                onClick={() => setOuvert(o => !o)}
            >
                {bouton}
            </button>

            {ouvert && (
                // (un clic sur une ligne ferme le menu)
                <ul
                    className={"ge-menu-liste" + (colonnes ? " ge-menu-colonnes" : "")}
                    role="menu"
                    onClick={e => e.target.closest("a, button") && setOuvert(false)}
                >
                    {children}
                </ul>
            )}
        </div>
    )
}

function Location({ location }) {

    const fil = [["Accueil", "/GE/"]];
    const search = useSearch((state) => state.search);
    const part = location.pathname.split("/");

    /*
     * Pages générales
     */
    if (part[2] === "library") {

        fil.push([
            "Librairie d'image",
            "/GE/library"
        ]);

        return (
            <LocationBar fil={fil} />
        );
    }

    if (part[2] === "admin") {

        fil.push([
            "Administration",
            "/GE/admin"
        ]);

        return (
            <LocationBar fil={fil} />
        );
    }


    /*
     * Pages d'un jeu
     */
    if (part[2]) {

        const jeu = games[part[2]];

        if (!jeu) {
            return (
                <LocationBar fil={fil} />
            );
        }

        fil.push([
            jeu.name,
            "/GE/" + part[2]
        ]);


        /*
         * Type / handler
         */
        if (part[3] === "remp") {

            fil.push([
                "Remplacement",
                ""
            ]);

        }
        else if (part[3] === "tools") {

            // Outil du jeu (/GE/<jeu>/tools/<outil>) : son nom, et non un élément
            const outil = jeu.tools?.[part[4]];

            fil.push([
                outil ? outil.name : (part[4] || "Outils"),
                "/GE/" + part[2] + "/tools/" + (part[4] || "")
            ]);

            return (
                <LocationBar fil={fil} />
            );
        }
        else if (part[3]) {

            const handler =
                jeu.handlers[part[3]];

            if (handler) {

                fil.push([
                    handler.name,
                    "/GE/" +
                    part[2] +
                    "/" +
                    part[3]
                ]);
            }
        }


        /*
         * Element
         */
        if (part[4] === "new") {

            fil.push([
                "Nouveau",
                ""
            ]);

        }
        else if (part[4] === "print") {

            fil.push([
                "Impression",
                ""
            ]);

        }
        else if (part[4]) {

            const r = search.find(
                e => e.id == part[4]
            );

            fil.push([
                r ? String(r.name || "") : "erreur",
                "/GE/" +
                part[2] +
                "/" +
                part[3] +
                "/" +
                part[4]
            ]);
        }


        /*
         * Edition
         */
        if (part[5] === "edit") {

            fil.push([
                "Édition",
                "/GE/" +
                part[2] +
                "/" +
                part[3] +
                "/" +
                part[4] +
                "/edit"
            ]);
        }
    }


    return (
        <LocationBar fil={fil} />
    );
}

// Fil d'Ariane : les pages parentes en liens, la page courante en gras.
// Petit écran : seule la page courante reste, avec un bouton « retour »
// vers son parent.
function LocationBar({ fil }) {

    // Parent de la page courante : le dernier maillon précédent qui a une adresse
    const parent = fil.slice(0, -1).findLast(([, adresse]) => adresse);

    return (
        <nav className="ge-fil" aria-label="Fil d'Ariane">

            {parent && (
                <NavLink
                    className="ge-bouton ge-bouton-icone ge-fil-retour"
                    to={parent[1]}
                    end
                    title={"Retour : " + parent[0]}
                    aria-label={"Retour : " + parent[0]}
                >
                    <ChevronLeft size={20} />
                </NavLink>
            )}

            {fil.map(([nom, adresse], i) => {

                const courant = i === fil.length - 1;

                return (
                    <span key={i} style={{ display: "contents" }}>

                        {i > 0 && (
                            <span className="ge-fil-sep" aria-hidden="true">
                                <ChevronRight size={15} />
                            </span>
                        )}

                        <NavLink
                            className={"ge-fil-lien" + (courant ? " ge-fil-courant" : "")}
                            to={adresse}
                            end
                            title={nom}
                            aria-current={courant ? "page" : undefined}
                        >
                            {nom}
                        </NavLink>

                    </span>
                );
            })}
        </nav>
    );
}


function User() {

    const login = useUser((state) => state.login);
    const logoutStore = useUser((state) => state.logout);
    const admin = useUser((state) => state.admin);
    const setAdmin = useUser((state) => state.setAdmin);

    // Rafraîchit le statut admin
    useEffect(() => {
        fAPI.getMe()
            .then(me => {
                if (me) {
                    setAdmin(me.data?.admin === true);
                }
            })
            .catch(e => console.error(e));
    }, [setAdmin]);

    async function handleLogout() {

        try {
            await fAPI.logout();
        } catch (e) {
            console.error(e);
        }

        logoutStore();
    }

    // (page de connexion : personne n'est connecté, pas de menu)
    if (!login) {
        return null;
    }

    return (
        <Menu
            classe="ge-compte"
            titre={"Compte : " + login}
            bouton={<>
                <IconeCompte size={17} />
                <span className="ge-libelle ge-compte-nom">{login}</span>
                <ChevronDown size={14} className="ge-libelle" />
            </>}
        >
            <li className="ge-menu-titre">{login}</li>

            {admin && (
                <li>
                    <NavLink to="/GE/admin" role="menuitem">
                        <Shield size={16} /> Administration
                    </NavLink>
                </li>
            )}

            <li>
                <button type="button" className="ge-menu-ligne" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} /> Déconnexion
                </button>
            </li>
        </Menu>
    );
}
