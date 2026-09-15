import { useLoaderData } from "react-router";
import Editor from "./Editor";

export default function Edit() {
    const elem = useLoaderData().element
   


   return (
    <Editor elem={elem} creer={true} />
   )
}
   
   
 