'use client';
import { JSX, ReactNode, useState } from "react";
import { Label } from "./inputUtils";



export function TableInput({ Line, header, label, className, max, name, value, index, onChange }){

    const val = index !== undefined ? value[name][index] : value[name]

    function addLine(event) {
        onChange(name, val + 1, index)
        event.preventDefault()
    }
    function remLine(event) {
        onChange(name, val - 1, index)
        event.preventDefault()
    }
    var rows= []
    for (let i = 0; i < val; i++) {
        rows[i] = (<tr key={i}>
            {Line(i).map((l, j) => (<td key={j}>{l}</td>))}
        </tr>)
    }
    return (
        <span className={className}>
            {label && (<Label name={label} />)}
            <table>
                {header && <thead><tr><td>test</td></tr></thead>}
                <tbody>
                    {rows}
                </tbody>
            </table>
            <button onClick={remLine} className={ " " + ((val === 0) ? " hidden" : "")}>- Supprimer</button>
            <button onClick={addLine} className={" " + ((max && max === val) ? " hidden" : "")}>+ Ajouter</button>
        </span>
    );
}
