import React, { useEffect, useRef } from "react"
import { NavLink } from "react-router"
import parse from "html-react-parser"
import * as math from "mathjs"

import { useRemp, useSearch } from "../lib/store"
import { LoadAndDisplay } from "./LoadAndDisplay"
import { pub } from "../lib/fetch"
import { stripTags } from "../Input/EditorInput"

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
 *
 *     Un remplacement qui a une icône (champ « icone » : "hex #f2c200",
 *     "rond #d4a017") s'affiche sous la forme de cette icône, avec le
 *     nombre dedans s'il en porte un : #res(2) -> hexagone « 2 »,
 *     #res -> hexagone vide.
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
export function Text({
    style,
    text,
    rule,
    disableRuleMacro = false
}) {
    const remp = useRemp((s) => s.remp)
    const search = useSearch((s) => s.search)

    const size = parseInt(style?.fontSize) || 12

    /*
     * Modifications à effectuer après le render.
     */
    const pendingRemp = useRef([])
    const pendingLien = useRef([])

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
            if (!pendingLien.current.some(e => e.id === elem.id)) {
                pendingLien.current.push(elem)
            }
        },
        disableRuleMacro
    )

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
        <div style={{
            fontFamily: "EB Garamond, sans-serif",
            fontWeight: 500,
            ...style
        }}>
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
    const size = 12

    const remp = useRemp((s) => s.remp)

    const hasExplication = Boolean(
        stripTags(explication?.trim())
    )

    const remplacements = ajout?.remp
        ?.map((elemCode) => {
            return remp.find(
                e => e.key === elemCode.toLowerCase()
            )
        })
        .filter(Boolean) || []

    const hasRemplacements =
        remplacements.length > 0

    const hasLiens =
        ajout?.lien?.length > 0

    const hasContent =
        hasExplication ||
        hasRemplacements ||
        hasLiens

    if (!hasContent) {
        return null
    }

    return (
        <div
            style={{
                margin: "12px 0",
                padding: "12px 14px",
                backgroundColor: "#f7f7f7",
                border: "1px solid #d0d0d0",
                borderLeft: "4px solid #666",
                borderRadius: "4px",
                boxSizing: "border-box",
                color: "#222",

            }}
        >
            {(hasExplication || hasRemplacements) && (
                <>
                    <p
                        style={{
                            margin: "0 0 5px 0",
                            fontSize: size * 1.15,
                            fontWeight: "bold",
                            color: "#333",
                            borderBottom: "1px solid #ddd",
                            paddingBottom: "6px",
                        }}
                    >
                        Explication
                    </p>

                    {hasExplication && (
                        <Text
                            style={{
                                fontSize: size,
                                paddingLeft: 2,
                            }}
                            text={explication}
                        />
                    )}

                    {remplacements.map((elem) => (
                        <div
                            key={elem.key}
                            style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: 4,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: size,
                                }}
                                text={`#${toMaj(elem.key, true)}: ${elem.rule ? stripTags(elem.rule) : ""}`}
                            />

                        </div>
                    ))}
                </>
            )}

            {hasLiens && (
                <>
                    <p
                        style={{
                            margin:
                                hasExplication ||
                                    hasRemplacements
                                    ? "10px 0 5px 0"
                                    : "0 0 5px 0",
                            fontSize: size * 1.15,
                            fontWeight: "bold",
                            color: "#333",
                            borderBottom:
                                "1px solid #ddd",
                            paddingBottom: "6px",
                        }}
                    >
                        Lien
                    </p>

                    {ajout.lien.map((e, i) => (
                        <LoadAndDisplay
                            key={i}
                            link={e}
                        />
                    ))}
                </>
            )}
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
    onLien,
    disableRuleMacro = false
) {
    s = nameAff(s)

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
                onLien,
                disableRuleMacro
            )
        }
    })
}


function renderTextNode(
    text,
    size,
    remp,
    search,
    rule,
    onRemp,
    onLien,
    disableRuleMacro = false
) {
    /*
     * Tokens :
     *
     * #img[src]
     * |123|
     * #xxx
     * #xxx€
     * #xxx(2)
     * #xxx(2, xxx)
     */
const regex =
    /#img\[([0-9a-zA-Z\/\-_ .]+)\]|\|([0-9]+)\||#([a-zA-Z_][a-zA-Z_]+)(€)?(&|&amp;)?(?:\((\d+)(?:,\s*([A-Za-z0-9 \/]+))?\))?/g   
     let result=[]
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
        {text.slice(lastIndex, match.index).replaceAll("§", "")}
    </React.Fragment>
)
        }

        /*
         * ---------------------------------------------------------------
         * #img[src]
         * ---------------------------------------------------------------
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
         * ---------------------------------------------------------------
         * |123|
         * ---------------------------------------------------------------
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

            if (onLien) {
                onLien(elem)
            }

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
                    {nameAff(
                        removeDiese(elem.name)
                    )}
                </NavLink>
            )

            lastIndex = regex.lastIndex
            continue
        }

        /*
         * ---------------------------------------------------------------
         * #xxx...
         * ---------------------------------------------------------------
         */
        if (match[3] !== undefined) {
            const elemCode = match[3]

            /*
             * Nouveau suffixe :
             *
             * #xxx€
             */
            const ruleMacro = match[4] === "€"

            /*
             * Comme le € est maintenant avant le & dans la regex,
             * les groupes suivants sont décalés.
             */
            const plu = match[5]
            const num = match[6]
            const mult = match[7]

            const elem =
                remp.find(
                    e =>
                        e.key ===
                        elemCode.toLowerCase()
                ) || {
                    key: elemCode.toLowerCase(),
                    val: "erreur remplacement",
                    rule: "",
                    css: []
                }

            /*
             * -----------------------------------------------------------
             * #xxx€
             * -----------------------------------------------------------
             *
             * On transforme :
             *
             * #dragon€
             *
             * en :
             *
             * Dragon: règle du dragon
             *
             * Le Text imbriqué reçoit disableRuleMacro=true.
             */
            if (ruleMacro && !disableRuleMacro) {
                if (onRemp) {
                    onRemp(elem.key)
                }

                result.push(
                    <Text
                        key={`rule-macro-${index++}`}
                        style={{
                            fontSize: size,
                        }}
                        text={
                            `#${toMaj(elem.key, true)}: ` +
                            `${elem.rule ? stripTags(elem.rule) : ""}`
                        }
                        disableRuleMacro={true}
                        rule={rule}
                    />
                )

                lastIndex = regex.lastIndex
                continue
            }

            /*
             * -----------------------------------------------------------
             * Protection contre la récursion
             * -----------------------------------------------------------
             *
             * Si un #xxx€ apparaît alors que la macro est désactivée,
             * on affiche simplement elem.val.
             */
            if (ruleMacro && disableRuleMacro) {
                if (onRemp) {
                    onRemp(elem.key)
                }

                result.push(
                    <span
                        key={`remp-rule-disabled-${index++}`}
                        style={rebuildCSS(
                            elem.css || [],
                            size
                        )}
                    >
                        {format(
                            elem.val || "",
                            size,
                            remp,
                            search,
                            rule,
                            onRemp,
                            onLien,
                            disableRuleMacro
                        )}
                    </span>
                )

                lastIndex = regex.lastIndex
                continue
            }

            /*
             * Enregistrement du remplacement normal.
             */
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
     * Texte restant.
     */
if (lastIndex < text.length) {
    result.push(
        <React.Fragment key={`text-${index++}`}>
            {text.slice(lastIndex).replaceAll("§", "")}
        </React.Fragment>
    )
}

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
    /*
     * -----------------------------------------------------------------------
     * ICÔNE
     * -----------------------------------------------------------------------
     *
     * #res(2) avec elem.icone -> une icône portant le nombre.
     */
    const icone = lireIcone(elem.icone)

    if (icone && !mult && elem.after !== true) {
        return (
            <IconeRemp
                key={`remp-${key}-icone`}
                icone={icone}
                num={num || ""}
                nom={
                    Number(num) > 1
                        ? (elem.plural && elem.plural !== "repeat" ? elem.plural : (elem.val || "") + "s")
                        : (elem.val || "")
                }
            />
        )
    }

    /*
     * #reu& signifie explicitement pluriel.
     *
     * On normalise d'abord &amp; -> &
     */
    const explicitPlural =
        plu === "&" ||
        plu === "&amp;"

    const numberIsPlural =
        num &&
        Number(num) > 1

    let value = ""

    /*
     * -----------------------------------------------------------------------
     * AFTER
     * -----------------------------------------------------------------------
     *
     * "after" est indépendant de la logique normale de pluriel.
     *
     * - Le nombre est toujours affiché, même au singulier.
     * - num > 1 ne déclenche PAS automatiquement elem.plural.
     * - & ou &amp; déclenche explicitement le pluriel.
     * - mult est toujours ajouté lorsqu'il est présent.
     */
    if (elem.after === true) {
        const text =
            explicitPlural
                ? (
                    elem.plural ||
                    (elem.val || "") + "s"
                )
                : (
                    elem.val || ""
                )

        value =
            toMaj(
                text,
                isMaj(elemCode)
            ) +
            (num ? " " + num : "")

        if (
            mult &&
            !Number.isNaN(
                parseInt(mult)
            )
        ) {
            value += "*".repeat(
                parseInt(mult)
            )
        } else if (mult) {
            value += " " + mult
        }
    }

    /*
     * -----------------------------------------------------------------------
     * PLURIEL NORMAL
     * -----------------------------------------------------------------------
     *
     * Ici on conserve la logique existante :
     *
     * - & explicite le pluriel
     * - num > 1 déclenche automatiquement le pluriel
     * - sauf pour repeat
     */
    else if (
        (explicitPlural || numberIsPlural) &&
        elem.plural !== "repeat"
    ) {
        value =
            (num ? num + " " : "") +
            toMaj(
                elem.plural ||
                (elem.val || "") + "s",
                isMaj(elemCode)
            )
    }

    /*
     * -----------------------------------------------------------------------
     * SINGULIER NORMAL
     * -----------------------------------------------------------------------
     */
    else {
        if (
            num &&
            elem.plural !== "repeat" &&
            elem.plural !== "after"
        ) {
            value += num + " "
        }

        value +=
            toMaj(
                elem.val || "",
                isMaj(elemCode)
            )
    }

    /*
     * -----------------------------------------------------------------------
     * REPEAT
     * -----------------------------------------------------------------------
     */
    if (
        elem.plural === "repeat" &&
        num > 1
    ) {
        const result = []

        for (let i = 0; i < num; i++) {
            result.push(
                <span
                    key={`remp-${key}-repeat-${i}`}
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
     * RENDU NORMAL
     * -----------------------------------------------------------------------
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
 * Icône d'un remplacement
 * ---------------------------------------------------------------------------
 *
 * elem.icone : "<forme> <couleur>", forme = hex (hexagone) ou rond.
 *
 *   "hex #f2c200"   hexagone jaune
 *   "rond #d4a017"  rond doré
 *
 * L'icône ne décale pas le texte :
 *
 *   - sa taille est en em : elle suit la taille du texte ;
 *   - ses marges verticales sont négatives : sa boîte ne dépasse jamais la
 *     hauteur d'une ligne, l'interligne ne change pas ;
 *   - elle est plus étroite que le mot qu'elle remplace : le texte ne peut
 *     que raccourcir.
 */
function lireIcone(texte) {
    const m = /^\s*(hex|rond)\s+(#[0-9a-fA-F]{3,8})\s*$/.exec(texte || "")

    return m ? { forme: m[1], couleur: m[2] } : null
}

/*
 * Vrai si la couleur est sombre (le nombre s'écrit alors en blanc).
 */
function estSombre(couleur) {
    let hex = couleur.slice(1)

    if (hex.length < 6) {
        hex = hex.slice(0, 3).split("").map(c => c + c).join("")
    }

    const [r, v, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))

    return 0.299 * r + 0.587 * v + 0.114 * b < 140
}

function IconeRemp({ icone, num, nom }) {
    const sombre = estSombre(icone.couleur)

    return (
        <span
            title={`${num} ${nom}`.trim()}
            aria-label={`${num} ${nom}`.trim()}
            style={{
                display: "inline-block",
                width: "1.35em",
                height: "1.35em",
                margin: "-0.35em 0.04em",
                // centrée sur la hauteur des minuscules, un peu au-dessus de la ligne de base
                verticalAlign: "-0.12em",
                lineHeight: 1,
            }}
        >
            <svg
                viewBox="0 0 100 100"
                style={{ display: "block", width: "100%", height: "100%" }}
            >
                {icone.forme === "rond"
                    ? (
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill={icone.couleur}
                            stroke="#000"
                            strokeWidth="5"
                        />
                    )
                    : (
                        <polygon
                            points="50,4 91,27 91,73 50,96 9,73 9,27"
                            fill={icone.couleur}
                            stroke="#000"
                            strokeWidth="5"
                            strokeLinejoin="round"
                        />
                    )}
                <text
                    x="50"
                    y="52"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={String(num).length > 1 ? 46 : 60}
                    fontWeight="700"
                    fontFamily="Arial, sans-serif"
                    fill={sombre ? "#fff" : "#000"}
                >
                    {num}
                </text>
            </svg>
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
