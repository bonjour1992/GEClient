export class ElementContent {
  name= ""
  explication=""
  Lien=[]
}

export class Link {
  type = ""
  id = -1
  __link = true
  constructor(type = "", id= -1) {
    this.type = type
    this.id = id
  }
    fromString(s)
  {
    const words = s.split("#")
    this.type=words[0]
    this.id=parseInt(words[1])
    return this
  }
  toString() {
    return LinkToString(this)
  }
}
export function LinkToString(link){
  return link.type + "#" + link.id
}