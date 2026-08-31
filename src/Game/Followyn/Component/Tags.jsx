export function Tags({ content }) {
    if (!content.tags) return null
    return (
        <div style={{display:"flex"}}>
      {content.tags.map((t,i)=>(<span style={{
        fontSize:10,
        backgroundColor:"blue",
        display:"inline-block",
        borderRadius:4,
        color:"white",
        padding:1,
        marginRight:2
      }}>{t}</span>))}
      </div>
    );
}
