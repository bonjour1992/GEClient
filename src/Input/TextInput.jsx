'use client';
import { ReactNode } from "react";
import { Label } from "./inputUtils";
import { forwardRef } from "react";

export const TextInput = forwardRef(
    function TextInput(
        { style={}, index, onChange, name, value, label },
        ref
    ) {

        return (
            <div style={style}>
                {label && (<Label name={label} />)}
                <input
                    style={style}
                    ref={ref}
                    type="text"
                    name={name}
                    id={name}
                    value={index !== undefined ? value[name][index] : value[name] || ""}
                    onChange={e => onChange(name, e.target.value, index)} />
            </div>
        )
    })
