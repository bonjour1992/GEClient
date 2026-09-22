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
        name: "Followyn JDR",
        pict: "/Followyn/theme-cover7.png"
    }
}


// ============================================================
// HANDLERS
// ============================================================

export function getHandler(jeu, meta) {
    return games[jeu].handlers[meta]
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

    useEffect(() => {
        setAjout({
            remp: [],
            lien: []
        })
    }, [location]);


    let explicationBuilder = {

        addLien: function (elem) {

            elem.id &&
            ajout.lien.filter(
                (e) => e.id === elem.id
            ).length === 0 &&
            setAjout({
                remp: ajout.remp,
                lien: [
                    ...ajout.lien,
                    new Link(
                        elem.type,
                        elem.id
                    )
                ]
            })
        },


        addRemp: function (elemCode) {

            elemCode &&
            ajout.remp.indexOf(elemCode) === -1 &&
            setAjout({
                lien: ajout.lien,
                remp: [
                    ...ajout.remp,
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
