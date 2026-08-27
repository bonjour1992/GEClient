import { Outlet, useLoaderData, useParams, useNavigate, Link } from "react-router";
import { useState, useEffect } from "react";
import { useRemp, useSearch } from "../lib/store"
import { getRemp, getSearch } from "../lib/fetch";
import { games } from "../Game/games";

let jeu

export default function HeaderBar() {

    jeu = useParams().jeu

    const setterRemp = useRemp((state) => state.setRemp)
    const loadedRemp = useRemp((state) => state.loaded)
    const setterSearch = useSearch((state) => state.setSearch)
    const loadedSearch = useSearch((state) => state.loaded)
    const search = useSearch((state) => state.search)

    let f = async () => setterRemp(await getRemp(jeu), jeu)
    jeu === loadedRemp || f()




    let g = async () => setterSearch(await getSearch(jeu), jeu)
    jeu === loadedSearch || g()



    return (<>
        <Search search={search} />
        <Add />
        <Outlet />
    </>)
}

function Search({ search }) {

    const navigate = useNavigate()

    function searchClick(e) {

        let r = search.filter(i => i.name + ":" + i.type + "(" + i.id + ")" === e.target.value)
        console.log(r)
        if (r.length)
            navigate("/GE/" + jeu + "/" + r[0].type + "/" + r[0].id)

    }

    function searchEnter(e) {

        if (e.key === "Enter") {
            let res
            let continu = true
            search2.content.forEach((v, k) => {
                if (continu && k.toLocaleLowerCase().indexOf(e.target.value.toLocaleLowerCase()) !== -1) {
                    res = v
                    continu = false
                }
            })

            if (res !== "") window.location.assign(res)
            e.preventDefault()
        }

    }
    return (<div  className="no-print"  style={{ zIndex: 50, backgroundColor: "white", position: "fixed", top: 0, width: "20%", marginLeft: "40%", height: 40, borderBottomWidth: 2, borderBottomStyle: "solid" }}>
        <span style={{fontSize:24}}>&#128269; </span>
        <input onChange={searchClick} onKeyDown={searchEnter} id="search" list="searchitem" type="text" placeholder="rechercher" style={{fontSize:20,width:"80%"}} />
        <datalist id="searchitem" >
            {search.map((e, i) => {
                return (<option value={e.name + ":" + e.type + "(" + e.id + ")"} key={i} />)
            })}
        </datalist>
    </div>)
}

function Add() {


    function show() {

        let list = document.getElementById("listAdd").setAttribute("style", "display:block;")

    }

    function hide() {
        let list = document.getElementById("listAdd").setAttribute("style", "display:none;")
    }

    return (<div
        onMouseLeave={hide}
         className="no-print" 
        style={{ zIndex: 50, backgroundColor: "white", position: "fixed", top: 0, width: "20%", marginLeft: "60%", height: 40, borderBottomWidth: 2, borderBottomStyle: "solid" }}>
        <div style={{ backgroundColor: "white" }}>
            <button onMouseEnter={show} style={{fontSize:20}}>Ajouter</button>
            <ul id="listAdd" style={{ display: "none" }}>
                {Object.keys(games[jeu].handlers).map((e, i) => {
                    return (<li key={i}><Link to={"/GE/" + jeu + "/" + e + "/new"} >{games[jeu].handlers[e].name}</Link></li>)
                }
                )}
            </ul>
        </div>
    </div>)
}