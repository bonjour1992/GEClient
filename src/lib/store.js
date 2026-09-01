import { create } from "zustand";
import { getRemp, getSearch, getTags, createTag } from "./fetch.js";


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


export const useTags = create((set, get) => ({
    tags: {},
    loaded: false,

    update: async (force = false) => {
        if (!force && get().loaded) {
            return;
        }

        const result = await getTags();

        /*
         * Transformation :
         *
         * [
         *   { type: "couleur", value: "rouge" },
         *   { type: "couleur", value: "bleu" },
         *   { type: "animal", value: "chat" }
         * ]
         *
         * devient :
         *
         * {
         *   couleur: ["rouge", "bleu"],
         *   animal: ["chat"]
         * }
         */
        const tags = {};

        for (const tag of result) {
            if (!tags[tag.type]) {
                tags[tag.type] = [];
            }

            tags[tag.type].push(tag.value);
        }

        /*
         * Tri alphabétique
         */
        for (const type of Object.keys(tags)) {
            tags[type].sort((a, b) =>
                a.localeCompare(b)
            );
        }

        set({
            tags,
            loaded: true
        });
    },

    add: async (type, value) => {
        value = value.trim();

        if (!value) {
            return;
        }

        /*
         * Si le tag existe déjà, inutile de l'envoyer
         * à la BDD.
         */
        const existing = get().tags[type] || [];

        if (existing.includes(value)) {
            return;
        }

        /*
         * Création en BDD
         */
        await createTag(type, value);

        /*
         * Mise à jour immédiate du store.
         */
        set(state => ({
            tags: {
                ...state.tags,
                [type]: [
                    ...(state.tags[type] || []),
                    value
                ].sort((a, b) =>
                    a.localeCompare(b)
                )
            }
        }));
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
