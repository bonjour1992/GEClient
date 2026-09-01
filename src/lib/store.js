import { create } from "zustand";
import { getRemp, getSearch } from "./fetch.js";

export const useRemp = create((set, get) => ({
    remp: [],
    loaded: false,

    update: async (jeu, force = false) => {
        if (!force && get().loaded === jeu) {
            return;
        }

        const remp = await getRemp(jeu);

        set({
            remp,
            loaded: jeu
        });
    }
}));


export const useSearch = create((set, get) => ({
    search: [],
    loaded: false,

    update: async (jeu, force = false) => {
        if (!force && get().loaded === jeu) {
            return;
        }

        const search = await getSearch(jeu);

        set({
            search,
            loaded: jeu
        });
    }
}));


// Recherche un élément par son id
export function getFromSearch(search, id, def = "not found") {
    return search.find(e => e.id === id) ?? def;
}


// Récupère les éléments correspondant aux types
export function getFromType(search, type) {
    return search
        .filter(e => type.includes(e.type))
        .sort((a, b) => a.name.localeCompare(b.name));
}
