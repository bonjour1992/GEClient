'use client';
import { Label } from "./inputUtils";


export function NumberInput({ index, onChange, name = "name", value, label, min = -1000000, max = 1000000, disabled=false ,step=1}){


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
                step={step}
                onChange={e => onChange(name ,step===1? parseInt(e.target.value):parseFloat(e.target.value) ,index)} />
        </span>
    );
}
