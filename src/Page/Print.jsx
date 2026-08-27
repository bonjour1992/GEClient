import { Outlet, useLoaderData, useParams, NavLink } from "react-router";
import { getHandler } from "../Game/games";
import { getFromType, useSearch } from "../lib/store";
import { useState } from "react";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { Link } from "../lib/datatype";
import { A3Pa, A3Po, A4Pa, A4Po } from "../Component/Size";
import { fullBorder } from "../Component/style";
import { backgroundColorFull } from "../Game/Ti5/ti5";

const pageOption = {
    "A4 paysage": A4Pa,
    "A4 portrait": A4Po,
    "A3 paysage": A3Pa,
    "A3 portrait": A3Po,
}


export default function Print() {
    let [disp, setDisp] = useState("default")
    const search = useSearch((state) => state.search)
    const [print, setPrint] = useState(new Map())
    const [rotate, setRotate] = useState(false)
    const [bg, setBg] = useState(false)

    const [padding, setPadding] = useState(0)
    const [numPage, setNumPage] = useState(12)
    const [page, setPage] = useState("A4 paysage")
    const type = useParams().elem
    const jeu = useParams().jeu

    function onChange(e) {
        setPrint(new Map(print.set(parseInt(e.target.name) || 0, parseInt(e.target.value))))
    }

    function numPrint() {
        let res = 0
            (Array.from(print.keys())).map((e, i) => { res += print.get(e) })
        return res
    }


    function printAll() {
        let res = new Map()
        getFromType(search, type).map((e, i) => {
            res.set(e.id, 1)
        })
        setPrint(res)
    }


    const elements = Array.from(print.keys()).flatMap((e) =>
        [...Array(print.get(e) || 0)].map((f, j) => (
            <LoadAndDisplay
                displayeur={disp}
                key={`${e}-${j}`}
                link={new Link(type, e)}
            />
        ))
    );

    const pages = [];
    for (let i = 0; i < elements.length; i += numPage) {
        pages.push(elements.slice(i, i + numPage));
    }



    return (<>
        <div className="no-print" >
            <label >Displayeur:</label>
            <select value={disp} onChange={e => setDisp(e.target.value)}>
                {Object.keys(getHandler(jeu, type).display).map(key => (
                    <option key={key} value={key}>
                        {key}
                    </option>
                ))}
            </select>
            <label >Page:</label>
            <select value={page} onChange={e => setPage(e.target.value)}>
                {Object.keys(pageOption).map(key => (
                    <option key={key} value={key}>
                        {key}
                    </option>
                ))}
            </select>
            <label for="mir">Miroir:</label>
            <input id="mir" type="checkbox" value={rotate} onChange={e => setRotate(e.target.checked)} />
            <label for="bg">Fond complet:</label>
            <input id="bg" type="checkbox" value={bg} onChange={e => setBg(e.target.checked)} />
            <label>Padding:</label>
            <input type="number" value={padding} onChange={e => setPadding(e.target.value)} />
            <label>Nombre par pages:</label>
            <input type="number" value={numPage} onChange={e => setNumPage(parseInt(e.target.value)) || 1} min={1} />

            <br />

            <button onClick={printAll}> Selectionner tous </button>
            {
                getFromType(search, type).map((e, i) => {
                    if (print.get(e.id) === undefined) setPrint(new Map(print.set(e.id, 0)))
                    return (<p key={i} >
                        <input type="number" name={e.id} onChange={onChange} min={0} value={print.get(e.id)} />
                        {e.name}
                    </p>)
                })
            }

        </div>
        {pages.map((pageElements, pageIndex) => (
            <div
                key={pageIndex}
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    ...pageOption[page],
                    transform: rotate ? "scaleX(-1)" : "",
                    padding: padding + "px",
                    ...(bg ? backgroundColorFull : {})
                }}
            >
                {pageElements}
            </div>
        ))}
    </>)
}
