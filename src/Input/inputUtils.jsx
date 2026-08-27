'use client'



export function Label({ style,name }) {

    return (<label style={style} htmlFor={name}>{name}: </label>)

}


