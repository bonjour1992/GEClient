import { useState, useEffect } from 'react'
import { Explication } from '../Component/Text'

import {
    Handler as HandlerTI5,
    Tools as ToolsTI5
} from './Ti5/ti5'

import {
    Handler as HandlerTOW
} from './Tow/tow'

import {
    Handler as HandlerFolowyn
} from './Followyn/Followyn'

import { Link } from '../lib/datatype'
import { useLocation } from 'react-router'
import { Handler } from './Escalade/Escalade'


export const games = {
    "ti5": {
        handlers: HandlerTI5,
        tools: ToolsTI5,
        name: "Twiligth imperium 5",
        pict: "/ti5.jpg"
    },

    "tow": {
        handlers: HandlerTOW,
        tools: {},
        name: "Warhammer The Old World"
    },

    "followyn": {
        handlers: HandlerFolowyn,
        tools: {},
        // Anciens noms de type encore présents dans l'historique des versions
        aliases: { "character:": "character" },
        name: "Followyn JDR",
        pict: "/Followyn/theme-cover7.png"
    },
    "escalade":{
        handlers: Handler,
        tools:{},
        name:"Escalade"
    }
}


// ============================================================
// HANDLERS
// ============================================================

export function getHandler(jeu, meta) {
    const game = games[jeu]
    return game.handlers[meta] ?? game.handlers[game.aliases?.[meta]]
}


export function getHandlerTypes(jeu) {
    return Object.keys(games[jeu].handlers);
}


// ============================================================
// TOOLS
// ============================================================

export function getTool(jeu, tool) {
    return games[jeu].tools?.[tool]
}


export function getToolTypes(jeu) {
    return Object.keys(games[jeu].tools || {});
}


// ============================================================
// DISPLAYEUR
// ============================================================

export function SelecteurDisplayeur({ jeu, type, content }) {

    let [disp, setDisp] = useState("default")

    return (
        <>
            <select
                value={disp}
                onChange={e => setDisp(e.target.value)}
            >
                {Object.keys(
                    getHandler(jeu, type).display
                ).map(key => (
                    <option
                        key={key}
                        value={key}
                    >
                        {key}
                    </option>
                ))}
            </select>

            <Displayeur
                jeu={jeu}
                displayeur={disp}
                type={type}
                content={content}
                explication={true}
            />
        </>
    )
}


export function Displayeur({
    jeu,
    type,
    explication = false,
    content,
    style,
    displayeur
}) {

    let Display =
        getHandler(jeu, type)
            .display[displayeur || "default"]

    let [ajout, setAjout] =
        useState({
            remp: [],
            lien: []
        })

    const location = useLocation();

    // Autre page ou autre affichage : la liste repart de zéro. La remise à
    // zéro se fait pendant le rendu, donc avant que les textes du nouvel
    // affichage n'y inscrivent leurs remplacements et leurs liens (dans un
    // effet, elle passait après eux : l'explication restait vide, ou gardait
    // celle de la page précédente).
    const vue = location.pathname + "|" + (displayeur || "default");
    const [vueAffichee, setVueAffichee] = useState(vue);

    if (vueAffichee !== vue) {
        setVueAffichee(vue);
        setAjout({
            remp: [],
            lien: []
        });
    }


    // Mises à jour à partir de l'état précédent : plusieurs ajouts dans
    // un même rendu s'accumulent dans l'ordre où ils sont cités (avec
    // l'état courant, seul le dernier était gardé à chaque rendu, ce qui
    // remplissait la liste à l'envers).
    let explicationBuilder = {

        addLien: function (elem) {

            elem.id &&
            setAjout(prev =>
                prev.lien.some((e) => e.id === elem.id)
                    ? prev
                    : {
                        remp: prev.remp,
                        lien: [
                            ...prev.lien,
                            new Link(
                                elem.type,
                                elem.id
                            )
                        ]
                    })
        },


        addRemp: function (elemCode) {

            elemCode &&
            setAjout(prev =>
                prev.remp.includes(elemCode)
                    ? prev
                    : {
                        lien: prev.lien,
                        remp: [
                            ...prev.remp,
                            elemCode
                        ]
                    })
        }
    }


    return (
        <>
            <Display
                content={content}
                explication={explicationBuilder}
            />

            {explication
                ? (
                    <Explication
                        explication={content?.explication}
                        ajout={ajout}
                    />
                )
                : ""
            }
        </>
    )
}


// ============================================================
// NORMALISATION
// ============================================================

export function normalizeElement(element) {

    if (!element?.content) {
        return element;
    }


    const handler = getHandler(
        element.meta?.jeu,
        element.meta?.type
    );


    if (!handler?.classe) {
        return element;
    }


    let defaults;

    try {

        defaults =
            new handler.classe();

    } catch (e) {

        console.error(
            "Impossible de créer la classe par défaut pour",
            element.meta?.jeu,
            element.meta?.type,
            e
        );

        return element;
    }


    const content = {
        ...defaults,
        ...element.content
    };


    return {
        ...element,
        content
    };
}
