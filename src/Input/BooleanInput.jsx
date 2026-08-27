'use client';
import { ReactNode } from "react";
import { Label } from "./inputUtils";


export function BooleanInput({ index, onChange, name, value = false, label, style })
     {


    return (
        <span >
            {label && (<Label name={label} />)}
            <input
                type="checkbox"
                name={name}
                id={name}
                checked={index !== undefined ? value[name][index] : value[name]}
                onChange={(e) => {
                    onChange(name,  e.target.checked,index )
                }

                } />
        </span>
    );
}
