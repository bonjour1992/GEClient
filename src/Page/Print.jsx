import { Outlet, useLoaderData, useParams, NavLink } from "react-router";
import { getHandler } from "../Game/games";
import { getFromType, useSearch } from "../lib/store";
import { useState } from "react";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { Link } from "../lib/datatype";


export default function Print() {
    let [disp, setDisp] = useState("default")
    const search = useSearch((state) => state.search)
    const [print, setPrint] = useState(new Map())
    const type = useParams().elem
    const jeu = useParams().jeu
    function onChange(e) {
        setPrint(new Map(print.set(parseInt(e.target.name), parseInt(e.target.value))))
    }

    return (<>
        <div className="no-print" >
            <select value={disp} onChange={e => setDisp(e.target.value)}>
                {Object.keys(getHandler(jeu, type).display).map(key => (
                    <option key={key} value={key}>
                        {key}
                    </option>
                ))}
            </select>
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
        <div style={{
            display: "flex",
            flexWrap: "wrap"
        }}>
            {(Array.from(print.keys())).map((e, i) => {
                return ([...Array(print.get(e))].map((f, j) => { return (<LoadAndDisplay displayeur={disp} key={e + j} link={new Link(type, e)} />) }))
            })}
        </div>
    </>)
}
