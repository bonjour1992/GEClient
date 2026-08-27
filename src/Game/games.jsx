import { useState } from 'react'
import { Explication } from '../Component/Text'
import { Handler as HandlerTI5 } from './Ti5/ti5'
import { Handler as HandlerTOW } from './Tow/tow'
import { Link } from '../lib/datatype'
import { Handler as HandlerFolowyn } from './Followyn/Followyn'

export const games = {
    "ti5": { handlers: HandlerTI5, name: "Twiligth imperium 5" },
    "tow": { handlers: HandlerTOW, name: "Warhammer The Old World" },
    "followyn":{handlers:HandlerFolowyn,name:"Followyn JDR"}
}

export function getHandler(jeu, meta) {

    return games[jeu].handlers[meta]
}


export function SelecteurDisplayeur({ jeu, type,content }) {
        let [disp, setDisp] = useState("default")
    return (
        <>
        <select value={disp} onChange={e => setDisp(e.target.value)}>
            {Object.keys(getHandler(jeu, type).display).map(key => (
                <option key={key} value={key}>
                    {key}
                </option>
            ))}
        </select>
        <Displayeur jeu={jeu} displayeur={disp} type={type} content={content} explication={true} />
        </>
        )
}

export function Displayeur({ jeu, type, explication = false, content, style, displayeur }) {
    let Display = getHandler(jeu, type).display[displayeur || "default"]
    let [ajout, setAjout] = useState({ remp: [], lien: [] })

    let explicationBuilder = {
        addLien: function (elem) {
            elem.id && ajout.lien.filter((e) => e.id === elem.id).length === 0 && setAjout({ remp: ajout.remp, lien: [...ajout.lien, new Link(elem.type, elem.id)] })

        },
        addRemp: function (elemCode) {
            elemCode && ajout.remp.indexOf(elemCode) === -1 && setAjout({ lien: ajout.lien, remp: [...ajout.remp, elemCode] })

        }
    }

    return (
        <>
            <Display content={content} explication={explicationBuilder} />
            {explication ? <Explication explication={content?.explication} ajout={ajout} /> : ""}
        </>
    )
}