import { useSearch, useUser } from "./store"


//const server="http://xorg-compagny.ddns.net:8500/"
const server = "http://localhost:3000/"


export async function fetchAPI(url, method, body, content) {

    const token = useUser.getState().token;

    const headers = {
        "Content-Type": content || "application/json"
    };

    if (token) {
        headers.Authorization = "Bearer " + token;
    }

    const res = await fetch(
        server + url,
        {
            method: method,
            headers,
            body: content
                ? body
                : JSON.stringify(body)
        }
    );

    return await res.json();
}


/*
 * =========================
 * ELEMENTS
 * =========================
 */

// Dernière version d'un élément
export async function getElement(id) {

    return await fetchAPI(
        "elements/" + id,
        "GET"
    );
}


// Version précise d'un élément
export async function getElementVersion(id, version) {

    return await fetchAPI(
        "elements/" + id + "/versions/" + version,
        "GET"
    );
}


// Toutes les versions d'un élément
export async function getElementVersions(id) {

    return await fetchAPI(
        "elements/" + id + "/versions",
        "GET"
    );
}


// Restaurer une version
export async function restoreElement(id, version, jeu) {

    const result = await fetchAPI(
        "elements/" + id + "/versions/" + version + "/restore",
        "POST"
    );

    if (jeu) {
        await useSearch.getState().update(jeu, true);
    }

    return result;
}


// Liste des éléments d'un jeu et d'un type
export async function getList(jeu, type) {

    return await fetchAPI(
        "elements/" + jeu + "/type/" + type,
        "GET"
    );
}


// Modifier un élément
export async function updateElement(id, content, jeu) {

    const result = await fetchAPI(
        "elements/" + id,
        "POST",
        content
    );

    await useSearch.getState().update(jeu, true);

    return result;
}


// Créer un élément
export async function createElement(content, jeu) {

    const result = await fetchAPI(
        "elements",
        "POST",
        content
    );

    await useSearch.getState().update(jeu, true);

    return result;
}


// Supprimer un élément
export async function deleteElement(id, jeu) {

    const result = await fetchAPI(
        "elements/" + id,
        "DELETE"
    );

    await useSearch.getState().update(jeu, true);

    return result;
}


/*
 * =========================
 * REMPLACEMENT
 * =========================
 */

export async function updateRemp(jeu, content) {

    return await fetchAPI(
        "remp/update/" + jeu,
        "POST",
        content
    );
}


export async function getRemp(jeu) {

    return await fetchAPI(
        "remp/" + jeu,
        "GET"
    );
}


/*
 * =========================
 * STATISTIQUES
 * =========================
 */

export async function getStat(jeu) {

    return await fetchAPI(
        "elements/" + jeu + "/stats",
        "GET"
    );
}


export async function getSearch(jeu) {

    return await fetchAPI(
        "elements/search/" + jeu,
        "GET"
    );
}


/*
 * =========================
 * IMAGES
 * =========================
 */

export async function getImage() {

    return await fetchAPI(
        "image",
        "GET"
    );
}


export async function saveImage(blob, path) {

    return await fetchAPI(
        "upload-image?path=" + path,
        "POST",
        blob,
        blob.type
    );
}


/*
 * =========================
 * TAGS
 * =========================
 */

export async function getTags() {

    return await fetchAPI(
        "tag/all",
        "GET"
    );
}


export async function createTag(type, value) {

    return await fetchAPI(
        "tag/" + type + "/new",
        "POST",
        {
            val: value
        }
    );
}


/*
 * =========================
 * AUTHENTIFICATION
 * =========================
 */

export async function invite(code, login, password) {

    return await fetchAPI(
        "auth/invite/use/" + code,
        "POST",
        {
            login,
            password
        }
    );
}


export async function login(login, password) {

    return await fetchAPI(
        "auth/login",
        "POST",
        {
            login,
            password
        }
    );
}


export async function logout() {

    return await fetchAPI(
        "auth/logout",
        "POST"
    );
}


export async function getUsers() {

    return await fetchAPI(
        "auth/users",
        "GET"
    );
}


export async function createInvite() {

    return await fetchAPI(
        "auth/invite/new",
        "POST"
    );
}

export async function getDeletedElements(jeu) {

    return await fetchAPI(
        "elements/" + jeu + "/deleted",
        "GET"
    );
}


export async function restoreDeletedElement(id, jeu) {

    const result = await fetchAPI(
        "elements/" + id + "/restore",
        "POST"
    );

    if (jeu) {
        await useSearch.getState().update(jeu, true);
    }

    return result;
}



export const pub = server + "public";
