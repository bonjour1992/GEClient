
export function Image ({src,alt,style})
{
    return (<img style={style} src={"http://localhost:3000/public"+src}/>)
}