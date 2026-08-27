import { useEffect, useState } from "react"
import { Link } from "../lib/datatype"
import { getHandler } from "../Game/games"
import { useParams } from "react-router"
import { getElement } from "../lib/fetch"

export function LoadAndDisplay({ link, style, displayeur, context }) {

    let jeu = useParams().jeu
    let classe = getHandler(jeu, link.type).classe
    let [elem, setElem] = useState(new classe())
    useEffect(() => {
        let f = async () => {
            setElem((await getElement(link.id)).content)
        }
         link.id !== -1 ? f() : setElem(new classe())
    }, [link])
    let Display = getHandler(jeu, link.type).display[displayeur || "default"]

    return (
        <Display content={elem} style={style} context={context} />

    )
}