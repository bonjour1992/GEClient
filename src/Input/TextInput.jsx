'use client';
import { ReactNode } from "react";
import { Label } from "./inputUtils";


export function TextInput({ style, index, onChange, name, value, label }){


    return (
        <div  style={style}>
            {label && (<Label name={label} />)}
            <input
            style={style}
                type="text"
                name={name}
                id={name}
                value={index !== undefined ? value[name][index] : value[name]|| ""}
                onChange={e => onChange(name, e.target.value, index)}/>
        </div>
    )
}
