import React, { useEffect, useRef } from "react"
import { NavLink } from "react-router"
import parse from "html-react-parser"
import * as math from "mathjs"

import { useRemp, useSearch } from "../lib/store"
import { LoadAndDisplay } from "./LoadAndDisplay"
import { pub } from "../lib/fetch"

/*
 * ---------------------------------------------------------------------------
 * Text
 * ---------------------------------------------------------------------------
 *
 * Le contenu de text peut contenir :
 *
 *   - du HTML
 *   - |123|                  -> lien vers un élément
 *   - #machin                -> remplacement
 *   - #machin(2)             -> remplacement avec nombre
 *   - #machin(2, xxx)        -> remplacement avec multiplicateur
 *   - #img[image.png]        -> image
 *   - !quelque chose!        -> suppression
 *
 * Le HTML est parsé par html-react-parser.
 *
 * Les codes spéciaux présents dans les nœuds texte sont directement
 * transformés en composants React.
 *
 * Aucun renderToStaticMarkup().
 * Aucun dangerouslySetInnerHTML().
 */
export function Text({ style, text, rule }) {
    const remp = useRemp((s) => s.remp)
    const search = useSearch((s) => s.search)

    const size = parseInt(style?.fontSize) || 12

    /*
     * Modifications à effectuer après le render.
     */
    const pendingRemp = useRef([])
    const pendingLien = useRef([])

    /*
     * Nouvelle liste à chaque render.
     */
    pendingRemp.current = []
    pendingLien.current = []

    const formatted = format(
        text || "",
        size,
        remp,
        search,
        rule,
        (key) => {
            if (!pendingRemp.current.includes(key)) {
                pendingRemp.current.push(key)
            }
        },
        (elem) => {
            /*
             * Évite d'ajouter plusieurs fois le même lien
             * pendant un même render.
             */
            if (!pendingLien.current.some(e => e.id === elem.id)) {
                pendingLien.current.push(elem)
            }
        }
    )

    /*
     * Les modifications du store sont effectuées
     * après le render de React.
     */
    useEffect(() => {
        if (rule?.addRemp) {
            pendingRemp.current.forEach((key) => {
                rule.addRemp(key)
            })
        }

        if (rule?.addLien) {
            pendingLien.current.forEach((elem) => {
                rule.addLien(elem)
            })
        }

        pendingRemp.current = []
        pendingLien.current = []
    })

    return (
        <div style={style}>
            <span>
                {formatted}
            </span>
        </div>
    )
}


/*
 * ---------------------------------------------------------------------------
 * Explication
 * ---------------------------------------------------------------------------
 *
 * On ne fait plus de renderToStaticMarkup().
 *
 * Les éléments React sont construits directement.
 */
export function Explication({ explication, ajout, afficher }) {
    const remp = useRemp((s) => s.remp)

    let s = explication || ""

    ajout.remp.forEach((elemCode) => {
        const elem =
            remp.find(
                e => e.key === elemCode.toLowerCase()
            ) || {
                val: "erreur remplacement",
                rule: ""
            }

        /*
         * On ajoute directement du HTML.
         *
         * Il sera ensuite parsé par Text().
         */
        s +=
            `<p>` +
            `<b>${elem.val || ""}</b>` +
            `:${elem.rule || ""}` +
            `</p>`
    })

    return (
        <div>
            <p>Explication</p>

            <Text
                style={{
                    fontSize: 11,
                    paddingLeft: 2,
                    lineHeight: 1.2
                }}
                text={s}
            />

            {ajout.lien.map((e, i) => {
                return (
                    <LoadAndDisplay
                        key={i}
                        link={e}
                    />
                )
            })}
        </div>
    )
}


/*
 * ---------------------------------------------------------------------------
 * format
 * ---------------------------------------------------------------------------
 *
 * Transforme le texte HTML en éléments React.
 *
 * Exemple :
 *
 *   "Bonjour <b>Jean</b> |123| et #dragon(2)"
 *
 * devient :
 *
 *   "Bonjour "
 *   <b>Jean</b>
 *   " "
 *   <NavLink ... />
 *   " et "
 *   <span ... />
 */
export function format(
    s,
    size,
    remp,
    search,
    rule,
    onRemp,
    onLien
) {
    /*
     * Les !...! sont supprimés avant le parsing HTML.
     */
    s = nameAff(s)

    /*
     * html-react-parser s'occupe du HTML existant.
     *
     * Le traitement des codes spéciaux est effectué
     * uniquement dans les nœuds texte.
     */
    return parse(s, {
        replace: (node) => {

            if (node.type !== "text") {
                return undefined
            }

            return renderTextNode(
                node.data,
                size,
                remp,
                search,
                rule,
                onRemp,
                onLien
            )
        }
    })
}


/*
 * ---------------------------------------------------------------------------
 * renderTextNode
 * ---------------------------------------------------------------------------
 *
 * Traite un nœud texte.
 *
 * Exemple :
 *
 *   "Bonjour |123| #dragon(2)"
 *
 * devient :
 *
 *   [
 *       "Bonjour ",
 *       <NavLink ... />,
 *       " ",
 *       <span ... />
 *   ]
 */
function renderTextNode(
    text,
    size,
    remp,
    search,
    rule,
    onRemp,
    onLien
) {
    /*
     * Les différents tokens reconnus :
     *
     * #img[src]
     * |123|
     * #xxx
     * #xxx(2)
     * #xxx(2, xxx)
     *
     * #img est placé avant #xxx pour éviter que #img
     * soit interprété comme un remplacement normal.
     */
    const regex =
        /#img\[([0-9a-zA-Z\/\-_ .]+)\]|\|([0-9]+)\||#([a-zA-Z_][a-zA-Z_]+)(&amp;)?(?:\((\d+)(?:,\s*([A-Za-z0-9 \/]+))?\))?/g

    const result = []

    let lastIndex = 0
    let match
    let index = 0

    while ((match = regex.exec(text)) !== null) {
        /*
         * Texte normal avant le token.
         */
        if (match.index > lastIndex) {
            result.push(
                <React.Fragment key={`text-${index++}`}>
                    {text.slice(lastIndex, match.index)}
                </React.Fragment>
            )
        }


        /*
         * -------------------------------------------------------------------
         * #img[src]
         * -------------------------------------------------------------------
         */
        if (match[1] !== undefined) {
            const src = match[1]

            result.push(
                <img
                    key={`img-${index++}`}
                    src={pub + src}
                    style={{
                        height: size * 1.2,
                        display: "inline",
                        transform:
                            `translate(0px,${size * 0.25}px)`
                    }}
                    alt=""
                />
            )

            lastIndex = regex.lastIndex
            continue
        }


        /*
         * -------------------------------------------------------------------
         * |123|
         * -------------------------------------------------------------------
         */
        if (match[2] !== undefined) {
            const id = match[2]

            const elem =
                search.find(e => e.id == id) || {
                    name: "erreur lien",
                    type: "null",
                    id: 0,
                    jeu: "null"
                }

            /*
             * Le lien est enregistré après le render
             * via useEffect dans Text().
             */
            if (onLien) {
                onLien(elem)
            }

            /*
             * IMPORTANT :
             *
             * On utilise maintenant directement NavLink.
             *
             * Il n'y a plus de <a> généré sous forme de HTML.
             */
            result.push(
                <NavLink
                    key={`link-${index++}`}
                    to={
                        `/GE/` +
                        `${elem.jeu}/` +
                        `${elem.type}/` +
                        `${elem.id}`
                    }
                    style={{
                        fontWeight: 700,
                        color: "inherit",
                        textDecoration: "none"
                    }}
                >
                    {
                        /*
                         * On conserve le comportement original :
                         *
                         * nameAff(removeDiese(elem.name))
                         */
                        nameAff(
                            removeDiese(
                                elem.name
                            )
                        )
                    }
                </NavLink>
            )

            lastIndex = regex.lastIndex
            continue
        }


        /*
         * -------------------------------------------------------------------
         * #xxx(...)
         * -------------------------------------------------------------------
         */
        if (match[3] !== undefined) {



            const elemCode = match[3]
            const plu = match[4]
            const num = match[5]
            const mult = match[6]

            const elem =
                remp.find(
                    e =>
                        e.key ===
                        elemCode.toLowerCase()
                ) || {
                    key: elemCode.toLowerCase(),
                    val: "erreur remplacement",
                    css: []
                }


            // Enregistrement du remplacement.

            if (onRemp) {
                onRemp(elem.key)
            }

            const replacement =
                renderRemplacement(
                    elem,
                    elemCode,
                    plu,
                    num,
                    mult,
                    size,
                    remp,
                    search,
                    rule,
                    onRemp,
                    onLien,
                    index
                )

            index++


            // Le remplacement peut produire plusieurs éléments dans le cas plural === "repeat".

            if (Array.isArray(replacement)) {
                replacement.forEach(
                    element => result.push(element)
                )
            } else {
                result.push(replacement)
            }

            lastIndex = regex.lastIndex
            continue
        }
    }


    /*
     * Texte restant après le dernier token.
     */
    if (lastIndex < text.length) {
        result.push(
            <React.Fragment key={`text-${index++}`}>
                {text.slice(lastIndex)}
            </React.Fragment>
        )
    }


    /*
     * Aucun token trouvé.
     *
     * On retourne simplement le texte.
     */
    if (result.length === 0) {
        return text
    }

    return (
        <React.Fragment>
            {result}
        </React.Fragment>
    )
}


/*
 * ---------------------------------------------------------------------------
 * renderRemplacement
 * ---------------------------------------------------------------------------
 *
 * Équivalent React de l'ancien replaceDiese().
 *
 * IMPORTANT :
 *
 * elem.val peut contenir du HTML.
 *
 * Exemple :
 *
 *   elem.val =
 *       "un <b>dragon</b> dangereux"
 *
 * On passe donc elem.val dans format().
 *
 * Cela permet également à elem.val de contenir :
 *
 *   <b>...</b>
 *   #autre
 *   |123|
 *
 * même si, dans ton modèle actuel, les Remp ne se référencent
 * pas entre eux.
 */



function renderRemplacement(
    elem,
    elemCode,
    plu,
    num,
    mult,
    size,
    remp,
    search,
    rule,
    onRemp,
    onLien,
    key
) {
    let value = ""

    /*
     * -----------------------------------------------------------------------
     * Nombre devant le remplacement
     * -----------------------------------------------------------------------
     *
     * Ancien comportement :
     *
     * #foo(2)
     *
     * donne :
     *
     * 2 valeur
     *
     * sauf pour plural === "repeat"
     * et plural === "after".
     */
    if (
        num &&
        elem.plural !== "repeat" &&
        elem.plural !== "after"
    ) {
        value += num + " "
    }


    /*
     * -----------------------------------------------------------------------
     * Pluriel
     * -----------------------------------------------------------------------
     */
    const isPlural =
        (num && num > 1) ||
        plu === "&amp;"


    if (
        isPlural &&
        elem.plural !== "repeat"
    ) {

        /*
         * -------------------------------------------------------------------
         * plural === "after"
         * -------------------------------------------------------------------
         */
        if (elem.plural === "after") {
            value =
                toMaj(
                    elem.val || "",
                    isMaj(elemCode)
                ) +
                " " +
                num


            /*
             * Multiplicateur.
             *
             * #foo(2, 3)
             *
             * donne par exemple :
             *
             * valeur 2 ***
             */
            if (
                mult &&
                !Number.isNaN(
                    parseInt(mult)
                )
            ) {
                value +=
                    "*".repeat(
                        parseInt(mult)
                    )
            } else if (mult) {
                value += " " + mult
            }

        } else {

            /*
             * ----------------------------------------------------------------
             * Pluriel normal
             * ----------------------------------------------------------------
             */
            value +=
                toMaj(
                    elem.plural ||
                    (elem.val || "") + "s",
                    isMaj(elemCode)
                )
        }

    } else {

        /*
         * -------------------------------------------------------------------
         * Singulier
         * -------------------------------------------------------------------
         */
        value +=
            toMaj(
                elem.val || "",
                isMaj(elemCode)
            )
    }


    /*
     * -----------------------------------------------------------------------
     * repeat
     * -----------------------------------------------------------------------
     *
     * Ancien comportement :
     *
     *   res.repeat(num)
     *
     * Ici on génère réellement plusieurs éléments React.
     */
    if (
        elem.plural === "repeat" &&
        num > 1
    ) {
        const result = []

        for (let i = 0; i < num; i++) {
            result.push(
                <span
                    key={
                        `remp-${key}-repeat-${i}`
                    }
                    style={rebuildCSS(
                        elem.css || [],
                        size
                    )}
                >
                    {format(
                        value,
                        size,
                        remp,
                        search,
                        rule,
                        onRemp,
                        onLien
                    )}
                </span>
            )
        }

        return result
    }


    /*
     * -----------------------------------------------------------------------
     * Remplacement normal
     * -----------------------------------------------------------------------
     *
     * elem.val est envoyé dans format().
     *
     * Donc :
     *
     *   HTML -> React
     *
     * au lieu de :
     *
     *   HTML -> dangerouslySetInnerHTML
     */
    return (
        <span
            key={`remp-${key}`}
            style={rebuildCSS(
                elem.css || [],
                size
            )}
        >
            {format(
                value,
                size,
                remp,
                search,
                rule,
                onRemp,
                onLien
            )}
        </span>
    )
}


/*
 * ---------------------------------------------------------------------------
 * nameAff
 * ---------------------------------------------------------------------------
 *
 * Supprime :
 *
 *   !quelque chose!
 */
export function nameAff(s) {
    const regex =
        /\!([0-9a-zA-Z\/\-_ .]+)\!/g

    return s.replaceAll(
        regex,
        ""
    )
}


/*
 * ---------------------------------------------------------------------------
 * removeDiese
 * ---------------------------------------------------------------------------
 *
 * Utilisé pour les noms de liens.
 *
 * Exemple :
 *
 *   "Le #dragon(2)"
 *
 * devient :
 *
 *   "Le "
 */
function removeDiese(content) {
    const regex =
        /#([a-zA-Z_]+)(?:\((\d+)(?:,\s*([A-Za-z0-9 /]+))?\))?/g

    return content.replaceAll(
        regex,
        () => ""
    )
}


/*
 * ---------------------------------------------------------------------------
 * rebuildCSS
 * ---------------------------------------------------------------------------
 *
 * Conserve exactement le principe du code original.
 *
 * Exemple :
 *
 *   [
 *       ["fontSize", "@"],
 *       ["marginLeft", "@ * 2"]
 *   ]
 *
 * avec size = 12 devient :
 *
 *   {
 *       fontSize: 12,
 *       marginLeft: 24
 *   }
 */
function rebuildCSS(css, size) {
    const res = {}

    css.forEach(e => {
        res[e[0]] =
            e[1] &&
                e[1].toString().indexOf("@") === -1
                ? e[1]
                : math.evaluate(
                    e[1].replaceAll(
                        "@",
                        "s"
                    ),
                    {
                        s: size
                    }
                )
    })

    return res
}


function isMaj(s) {
    return s[0] === s[0].toUpperCase()
}


function toMaj(s, maj) {
    return maj
        ? s.charAt(0).toUpperCase() + s.slice(1)
        : s
}
