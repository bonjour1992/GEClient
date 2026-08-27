
const server="http://xorg-compagny.ddns.net:8500/"

export async function fetchAPI(url, method, body) {

    const res = await fetch(server + url,
        {
            method: method,
            headers: { "Content-Type": "application/json", Authorization: 'GRANT', },
            body: JSON.stringify(body)
        })
    return await res.json()


}

export async function getElement(id) {
    return await fetchAPI("element/" + id, 'GET')
}

export async function getList(jeu,type) {
    return await fetchAPI("element/" + jeu+"/"+type, 'GET')
}

export async function updateElement( id, content) {
    return await fetchAPI("element/" + id, 'POST', content)
}

export async function createElement(  content) {
    return await fetchAPI("element/new" , 'POST', content)
}

export async function deleteElement(  id) {
    return await fetchAPI("element/"+id , 'DELETE')
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

export const pub=server + "public"