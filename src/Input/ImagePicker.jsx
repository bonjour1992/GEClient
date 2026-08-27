import { getImage, pub } from "../lib/fetch";
import { ReactNode, useState, useEffect } from "react";
import { imgURL } from "../lib/styleUtils";
import { Label } from "./inputUtils";



export function ImagePicker({ index, className, onChange, name, value, label }) {
    const val = index !== undefined ? value[name][index] : value[name]
    const ModalId = "modal" + name + index
    let folder
    let [image, setImage] = useState({ name: "loading", children: [] })
    let [selected, setSelected] = useState(val || "")
    let [selectedFolder, setSelectedFolder] = useState([])

    useEffect(() => {
        let f = async () => {
            let res = await getImage()
            setImage(res)
        }
        f()
    }, [])

    function close(e) {
        document.getElementById(ModalId).style.display = "none"
        //setSelected(val)
    }

    let Loop = ({ p, chs }) => {

        let nextArray = (elem) => { let r = p.slice(); r.push(elem); return r }
        return (<div>
            {chs.map((ch, k) => {
                if (ch.type === "directory")
                    return (<div key={k} ><span onClick={() => setSelectedFolder(nextArray(k))}>{"-".repeat(p.length)}{ch.name}</span>
                        <Loop p={nextArray(k)} chs={ch.children} /></div>)
                else
                    return ("")
            })}
        </div>)
    }

    folder = image?.children
    selectedFolder.map((e) => folder = folder[e].children)

    return (<div >
        {label && (<Label name={label} />)}
        <img src={pub + (val || "/404.jpeg")} alt={val} style={{ width: 50, height: 50 }} />
        <button onClick={(e) => {
            setSelected(val)
            document.getElementById(ModalId).style.display = "block"
        }}
        >
            {selected || "Aucune image"} </button>
        <div id={ModalId} style={{
            display: "none",
            position: "fixed",
            backgroundColor: "#DDDDDD88",

            zIndex: 10,
            left: 0,
            top: 0,
            width: "100%",
            height: "100%"
        }}>
            <div style={{
                position: "relative",
                margin: "auto",
                top: 50,
                width: "60%",
                height: "85%",
                backgroundColor: "#FFF",
                borderColor: "#444",
                borderStyle: "solid",
                borderRadius: 12,
                borderWidth: 5,
            }}>
                <div style={{
                    width: "100%",
                    height: "10%",
                    borderBottomStyle: "solid",
                    borderBottomWidth: 4

                }}>
                    <button onClick={close} style={{ float: "right" }} >Fermer</button>
                    <span style={{
                        fontSize: 20,
                        fontWeight: 700
                    }}>Selection de {name} </span>
                </div>
                <div style={{
                    display: "grid",
                    width: "100%",
                    height: "90%",
                    gridTemplate: "70% 30% / 30% 35% 35%"
                }}>
                    <div style={{
                        gridColumn: 1,
                        gridRow: "1 / 3",
                        overflow: "scroll",
                        borderRightWidth: 2,
                        borderRightStyle: "solid"
                    }}>
                        <Loop p={[]} chs={image.children} />
                    </div>
                    <div style={{
                        gridColumn: "2 / 4",
                        gridRow: "1 ",
                        overflow: "scroll",
                        borderBottomWidth: 2,
                        borderBottomStyle: "solid",
                        display: "grid",
                        gridTemplateColumns: "50% 50%"
                    }}>
                        {
                            folder ? folder.filter((e) => e.type === "file").map((e, i) => (
                                <div key={i} onClick={() => { setSelected("/" + e.relativePath) }} style={{ width: "100%", height: 24, overflow: "hidden", display: "grid", gridTemplateColumns: "20px auto" }}>
                                    <img src={pub + "/" + e.relativePath} alt={e.name} width="20" height="20" style={{}} />
                                    <span style={{ textWrap: "nowrap", textOverflow: "ellipsis" }}>{e.name}</span>
                                </div>)) : ""
                        }
                    </div>
                    <div style={{
                        gridColumn: "2 ",
                        gridRow: "2",
                    }}>
                        <img src={pub + "/" + (selected || "/404.jpeg")} alt={selected || "/404.jpeg"} style={{ maxHeight: "50%", maxWidth: "60%" }} />
                        <p >  {selected} </p>
                        <button onClick={(e) => {
                            console.log(selected)
                            onChange(name, selected, index);
                            close(e)
                        }}>Valider</button>

                    </div>
                    <div style={{
                        gridColumn: "3 ",
                        gridRow: "2",
                    }}>
                        TODO upload
                    </div>
                </div>

            </div>

        </div>
    </div>)
}