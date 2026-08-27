import { ReactNode } from "react";
import { SketchPicker } from 'react-color';
import { Label } from "./inputUtils";


export function ColorInput({ index, className, onChange, name = "name", value, label  }){


    return (
        <div className={className}>
            {label && (<Label name={label} />)}
            <SketchPicker 
            color={index !== undefined ? value[name][index] : value[name]} 
            onChange={(c, e) => onChange( name, c.hex ,index)} />
        </div>)
}
