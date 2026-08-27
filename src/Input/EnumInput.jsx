'use client';
import { ReactNode } from "react";
import { Label } from "./inputUtils";


export function EnumInput({ index,style, onChange , name = "name", value, label, enumClass, aucun = false }){
    return (
        <span style={style}>
            {label && (<Label name={label} />)}
            <select name={name}
                id={name}
                value={index !== undefined ? value[name][index] : value[name] || ""}
                onChange={e => onChange(  name, e.target.value ,  index )}
            >
                {aucun && <option value="" key="aucun" >Aucun</option>}
                {Object.keys(enumClass).map((k) => {

                    return (<option value={k} key={k}>{enumClass[k]}</option>);
                })}
            </select>
        </span>
    );
}
