import { useSearch } from "./store"


const server="http://xorg-compagny.ddns.net:8500/"

export async function fetchAPI(url, method, body,content) {

    const res = await fetch(server + url,
        {
            method: method,
            headers: { "Content-Type":content || "application/json", Authorization: 'GRANT', },
            body: content?body:JSON.stringify(body)
        })
    return await res.json()


}

export async function getElement(id) {
    return await fetchAPI("element/" + id, 'GET')
}

export async function getList(jeu,type) {
    return await fetchAPI("element/" + jeu+"/"+type, 'GET')
}

export async function updateElement(id, content, jeu) {
    const result = await fetchAPI("element/" + id, "POST", content);

    await useSearch.getState().update(jeu, true);

    return result;
}

export async function createElement(content, jeu) {
    const result = await fetchAPI("element/new", "POST", content);

    await useSearch.getState().update(jeu, true);

    return result;
}

export async function deleteElement(id, jeu) {
    const result = await fetchAPI("element/" + id, "DELETE");

    await useSearch.getState().update(jeu, true);

    return result;
}

export async function updateRemp( jeu, content) {
    return await fetchAPI("remp/update/" + jeu, 'POST', content)
}


export async function getRemp(jeu)
{
        return await fetchAPI("remp/" + jeu, 'GET')

}

export async function getStat(jeu)
{
        return await fetchAPI("element/" + jeu+"/stat", 'GET')

}

export async function getSearch(jeu)
{
        return await fetchAPI("element/search/" + jeu, 'GET')

}

export async function getImage()
{
    return await fetchAPI("image",'GET')
}

export async function saveImage(blob,path)
{
    return await fetchAPI("upload-image?path="+path,'POST',blob,blob.type)
}

export async function getTags()
{
    return await fetchAPI("tag/all","GET")
}


export async function createTag(type,value)
{
    return await fetchAPI("tag/"+type+"/new","POST",value)
}

export const pub=server + "public"