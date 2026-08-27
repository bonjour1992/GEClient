import { TextInput } from "../Input/TextInput"
import { updateRemp } from "../lib/fetch";
import { useRemp } from "../lib/store"
import { useState, useEffect } from "react";
import { useParams } from "react-router";



export default function Remp() {
    const jeu = useParams().jeu
    const remp = useRemp((state) => state.remp)
    const setter = useRemp((state) => state.setRemp)

    function onChange(i) {
        return (name, value) => {
            let res = [...remp]
            res[i][name] = value
            res[i].modified = true
            setter(res,jeu)
        }
    }

    function onChangeCSS(i, j) {
        return (name, value) => {
            let res = [...remp]
            res[i].css[j][name] = value
            res[i].modified = true
            setter(res,jeu)
        }

    }

    function addCSS(i) {
        return () => {
            let res = [...remp]
            if (typeof(res[i].css!=="Array")) res[i].css=[]
            res[i].css.push(["", ""])
            res[i].modified = true
            setter(res,jeu)
        }
    }

    async function save() {
        let modif = remp.filter(e => e.modified)
        modif.forEach((e, i) => {
            delete e.modified
        });

        setter(await updateRemp(jeu, modif),jeu)
    }

    function add() {
        let res = [...remp]
        res.push({ modified: true, val: "", key: "", plural: "", css: [] })
        setter(res,jeu)
    }

    return (<><div>Remp</div>
        <button onClick={save}>Sauvegarder</button>
        <button onClick={add}>Créer nouveau</button>
        <table style={{ borderWidth:1,borderStyle:"solid",borderCollapse:"collapse",width:"100%" }}><tbody>
            {
                remp.map((e, i) => {
                    return (<tr key={i} style={{borderWidth:1,borderStyle:"solid", backgroundColor: e.modified ? "#CCFFCC" : "#FFFFFF" }}>
                        <td ><TextInput style={{}} onChange={onChange(i)} value={e} name="key" /></td>
                        <td><TextInput style={{}} onChange={onChange(i)} value={e} name="val" /></td>
                        <td><TextInput style={{}} onChange={onChange(i)} value={e} name="plural" /></td>
                        <td><table style={{ width: "100%", fontSize: 9 }}><tbody>
                            <tr><td><button onClick={addCSS(i)}>Ajouter</button></td></tr>
                            {Object.keys(e.css || {}).map((f, j) =>
                                <tr key={f}>
                                    <td style={{ width: "40%" }}><TextInput style={{}} onChange={onChangeCSS(i, j)} value={e.css[j]} name={"0"} /></td>
                                    <td style={{ width: "60%" }}><TextInput style={{}} onChange={onChangeCSS(i, j)} value={e.css[j]} name={"1"} /></td>
                                </tr>)}
                        </tbody></table></td>
                        <td style={{ width: "100%" }}><TextInput style={{ width: "100%" }} onChange={onChange(i)} value={e} name="rule" /></td>
                    </tr>)
                })
            }
        </tbody></table>
    </>)
}