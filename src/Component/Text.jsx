import { useRemp, useSearch } from "../lib/store"
import ReactDOMServer from "react-dom/server"
import * as math from "mathjs"
import { LoadAndDisplay } from "./LoadAndDisplay"
import { Link } from "../lib/datatype"
import { pub } from "../lib/fetch"
import { useEffect, useRef } from "react"
import { NavLink } from "react-router"


export function Text({ style, text, rule }) {
    const remp = useRemp((s) => s.remp)
    const search = useSearch((s) => s.search)
    const size = parseInt(style?.fontSize) || 12

    /*
     * On stocke les modifications à effectuer après le render.
     */
    const pendingRemp = useRef([])
    const pendingLien = useRef([])

    /*
     * On repart d'une liste vide à chaque render.
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
            <span
                dangerouslySetInnerHTML={{
                    __html: formatted
                }}
            />
        </div>
    )
}


export function Explication({ explication, ajout, afficher }) {
    const remp = useRemp((s) => s.remp)

    let s = explication || ""

    ajout.remp.forEach((elemCode) => {
        var elem = remp.filter(
            e => e.key === elemCode.toLowerCase()
        )[0] || {
            val: "erreur remplacement",
            rule: ""
        }

        s += ReactDOMServer.renderToStaticMarkup(
            <p>
                <b
                    dangerouslySetInnerHTML={{
                        __html: elem.val
                    }}
                ></b>
                :{elem.rule}
            </p>
        )
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


export function format(
    s,
    size,
    remp,
    search,
    rule,
    onRemp,
    onLien
) {
    return replaceDiese(
        nameAff(
            replaceLink(
                buildImg(s, size),
                search,
                onLien
            )
        ),
        size,
        remp,
        rule,
        onRemp
    )
}


function buildImg(s, size) {
    const regex = /#img\[([0-9a-zA-Z\/\-_ .]+)\]/g

    function replace(str, src) {
        return (
            ReactDOMServer.renderToStaticMarkup(
                <img
                    style={{
                        height: size * 1.2,
                        display: "inline",
                        transform:
                            "translate(0px," +
                            size * 0.25 +
                            "px)"
                    }}
                    src={pub + src}
                />
            )
        )
    }

    return s.replaceAll(regex, replace)
}


export function nameAff(s) {
    const regex = /\!([0-9a-zA-Z\/\-_ .]+)\!/g
    return s.replaceAll(regex, e => "")
}


function replaceLink(s, search, onLien) {
    const regex = /\|([0-9]+)\|/g

    function replace(str, id) {
        let elem =
            search.filter(e => e.id == id)[0] || {
                name: "erreur lien",
                type: "null",
                id: 0,
                jeu: "null"
            }

        /*
         * On ne modifie plus le state ici.
         * On transmet simplement le lien à Text.
         */
        onLien && onLien(elem)
//TODO: avoid reload
        return (
            ReactDOMServer.renderToStaticMarkup(
                <a href={"/GE/"+elem.jeu+"/"+elem.type+"/"+elem.id} style={{ fontWeight: 700 }}>
                    {nameAff(removeDiese(elem.name))}
                </a>
            )
        )
    }

    return s.replaceAll(regex, replace)
}


function rebuildCSS(css, size) {
    let res = {}

    css.forEach(e => {
        res[e[0]] =
            e[1] &&
            e[1].toString().indexOf("@") === -1
                ? e[1]
                : math.evaluate(
                    e[1].replaceAll("@", "s"),
                    { s: size }
                )
    })

    return res
}


function removeDiese(content) {
    const regex =
        /#([a-zA-Z_]+)(?:\((\d+)(?:,\s*([A-Za-z0-9 /]+))?\))?/g

    var res = content.replaceAll(
        regex,
        () => ""
    )

    return res
}


export function replaceDiese(
    content,
    size,
    remp,
    rule,
    onRemp
) {
    const regex =
        /#([a-zA-Z_][a-zA-Z_]+)(&amp;)?(?:\((\d+)(?:,\s*([A-Za-z0-9 \/]+))?\))?/g

    function replace(
        str,
        elemCode,
        plu,
        num,
        mult
    ) {
        var elem =
            remp.filter(
                e =>
                    e.key ===
                    elemCode.toLowerCase()
            )[0] || {
                val: "erreur remplacement"
            }

        /*
         * Plus de modification du store ici.
         */
        onRemp && onRemp(elem.key)

        let res =
            ReactDOMServer.renderToStaticMarkup(
                <span
                    style={rebuildCSS(
                        elem.css || [],
                        size
                    )}
                    dangerouslySetInnerHTML={{
                        __html:
                            (num &&
                                elem.plural !== "repeat" &&
                                elem.plural !== "after"
                                ? num + " "
                                : "") +

                            ((((num && num > 1) ||
                                plu === "&amp;") &&
                                elem.plural !== "repeat")
                                ?
                                (
                                    elem.plural === "after"
                                        ?
                                        toMaj(
                                            elem.val || "",
                                            isMaj(elemCode)
                                        ) +
                                        " " +
                                        num +
                                        (
                                            mult &&
                                            !Number.isNaN(
                                                parseInt(mult)
                                            )
                                                ?
                                                "*".repeat(
                                                    parseInt(mult)
                                                )
                                                :
                                                mult
                                                    ?
                                                    " " + mult
                                                    :
                                                    ""
                                        )
                                        :
                                        toMaj(
                                            elem.plural ||
                                            (elem.val || "") + "s",
                                            isMaj(elemCode)
                                        )
                                )
                                :
                                toMaj(
                                    elem.val || "",
                                    isMaj(elemCode)
                                ))
                    }}
                >
                </span>
            )

        res =
            (elem.plural === "repeat" &&
                num > 1)
                ? res.repeat(num)
                : res

        return res
    }

    var res = content.replaceAll(
        regex,
        replace
    )

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
