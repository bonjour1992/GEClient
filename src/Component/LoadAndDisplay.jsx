import { useEffect, useState } from "react"
import { getHandler } from "../Game/games"
import { NavLink, useParams } from "react-router"
import { getElement } from "../lib/fetch"
import { Link } from "../lib/datatype"

export function LoadAndDisplay({ link, style, displayeur, context }) {
    const jeu = useParams().jeu

    // On ne cherche le handler que si link et link.type existent
    const handler = link?.type ? getHandler(jeu, link.type) : null
    const classe = handler?.classe

    // Le hook est toujours créé
    const [elem, setElem] = useState(() => classe ? new classe() : null)

    useEffect(() => {
        if (!handler || !classe) {
            setElem(null)
            return
        }

        const f = async () => {
            if (link?.id !== undefined && link?.id !== -1) {
                setElem((await getElement(link.id)).content)
            } else {
                setElem(new classe())
            }
        }

        f()
    }, [link, handler, classe])

    // Le hook est créé avant ce return
    if (!link?.type || !handler) {
        return null
    }

    const Display = handler.display[displayeur || "default"]

    if (!Display||!elem) {
        return null
    }

    return (
        <Display
            content={elem}
            style={style}
            context={context}
        />
    )
}

export function LoadLink({ link =new Link, style, displayeur="nom", context ,explication}){

    useEffect(() => {
        if (explication) {
            explication.addLien(link)
        }
    }, [explication, link.id])
    return (
        <NavLink to={"../"+link.type+"/"+link.id}>
            <LoadAndDisplay link={link} style={style} displayeur={displayeur} context={context}/>
        </NavLink>
    )
}