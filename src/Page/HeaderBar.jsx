import { NavLink, Outlet, useLocation } from "react-router";
import { games } from "../Game/games";
import { useSearch } from "../lib/store";

export default function HeaderBar() {
    const loc = useLocation()
    return (<>
        <Location location={loc} />
        <User />
        <div   className="no-print"  style={{ height: 40 }}></div>
        <Outlet />
    </>)
}

const page = {
    remp: "Remplacement",
    edit: "Edition"
}

function Location({ location }) {

    const fil = [["Acceuil", "/"]]
    const search = useSearch((state) => state.search)
    const part = location.pathname.split("/")


    if (false) false
    else part[1] && fil.push([games[part[1]].name, "/" + part[1]])

    if (part[2] === "remp") fil.push(["Remplacement", ""])
    else part[2] && fil.push([games[part[1]].handlers[part[2]].name, "/" + part[1] + "/" + part[2]])


    if (part[3] === "new") fil.push(["Nouveau", ""])
    else if (part[3] === "print") fil.push(["Impression", ""])
    else if (part[3]) {
        let r = search.filter(e => e.id == part[3])
        fil.push([r[0] ? r[0].name : "erreur", "/" + part[1] + "/" + part[2] + "/" + part[3]])
    }

    if (part[4] === "edit") fil.push(["Edit", "/" + part[1] + "/" + part[2] + "/" + part[3] + "/edit"])

    return (<div className="no-print" style={{ zIndex: 50, backgroundColor: "white", position: "fixed", top: 0, marginRight: "60%", width: "40%", height: 40, borderBottomWidth: 2, borderBottomStyle: "solid" }}>
        {fil.map((e, i) => {
            return (<div key={i} className="no-print" style={{ float: "left" }}>
                <NavLink style={{
                    float: "left",
                    borderWidth: 2,
                    borderStyle: "solid",
                    height: 12,
                    padding: "7px 2px",
                    borderColor: "blue",
                    borderBottomLeftRadius: 6,
                    borderTopLeftRadius: 6,
                    borderBottomRightRadius: i < (fil.length - 1) ? 0 : 6,
                    borderTopRightRadius: i < (fil.length - 1) ? 0 : 6,
                    fontSize: 12,
                    fontWeight: 800,
                    textDecoration: "none",
                    maxWidth: 150,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textWrap: "nowrap"
                }} to={e[1]}>{e[0]}</NavLink>
                {i < (fil.length - 1) && <div
                    style={{
                        width: 0,
                        height: 0,
                        borderTop: "15px solid transparent",
                        borderBottom: "15px solid transparent",
                        borderLeft: "10px solid blue",
                        float: "left"
                    }}
                />}
            </div>)
        })}
    </div>)
}

function User({ }) {
    return (<div className="no-print" style={{ zIndex: 50, backgroundColor: "white", position: "fixed", top: 0, width: "20%", marginLeft: "80%", height: 40, borderBottomWidth: 2, borderBottomStyle: "solid" }}>
        <p>User</p>
    </div>)
}

