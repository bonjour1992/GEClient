'use client';
import { ReactNode } from "react";
import { Label } from "./inputUtils";


export function RangeInput({ style, index, onChange, name, value, label,min,max }){


    return (
        <div  style={style}>
            {label && (<Label name={label} />)}
            <input
            style={style}
                type="range"
                name={name}
                id={name}
                min={min}
                max={max}
                value={index !== undefined ? value[name][index] : value[name]|| ""}
                onChange={e => onChange(name , parseInt(e.target.value) ,index)} />

        </div>
    )
}
