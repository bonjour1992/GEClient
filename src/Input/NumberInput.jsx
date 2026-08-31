'use client';
import { ReactNode } from "react";
import { Label } from "./inputUtils";


export function NumberInput({ index, className, onChange, name = "name", value, label, min = -1000000, max = 1000000, disabled=false }){


    return (
        <span>
            {label && (<Label name={label} />)}
            <input
                type="number"
                name={name}
                id={name}
                value={index !== undefined ? value[name][index] ||0: value[name] || 0}
                disabled={disabled}
                min={min}
                max={max}
                onChange={e => onChange(name , parseInt(e.target.value) ,index)} />
        </span>
    );
}
