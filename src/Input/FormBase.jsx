import { TextInput } from "./TextInput"
import { EditorInput } from "./EditorInput"

export default function FormBase({ content, onChange, onSubmit, style, children }) {


  return (<div style={style}>

    <TextInput onChange={onChange} name="name" value={content} label="Nom"/>
    {children}
                    <br />
                    <EditorInput onChange={onChange} label="Explications" name="explication" value={content} />
    <br />
    <button onClick={onSubmit}>Submit</button>
  </div>)


}