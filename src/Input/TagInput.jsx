'use client';

import { Label } from "./inputUtils";


export function TagInput({ index,className , onChange , name = "name", value, label , tagClass }){
const val =index !== undefined ? value[name][index] : value[name]
    return (
        <span className={className}>
            {label && (<Label name={label} />)}
            {Object.keys(tagClass).map((k) => {
                return (<span key={k}>
                    <input type="checkbox" id={k} name={k} checked={val.includes(k)} onChange={(e) => {
                        let res = val
                        if (e.target.checked) res = Object.keys(tagClass).filter((elem) => res.includes(elem) || elem === e.target.name)
                        else res = res.filter((elem) => elem != e.target.name)
                        onChange(name, res ,index)
                    }} />
                    <label htmlFor={k}>{tagClass[k]}</label>
                </span>
                );
            })}
        </span>
    );
}
