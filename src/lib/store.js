
import { create } from 'zustand'
import { getElement, getRemp, getSearch, getList } from "./fetch.js";


export const useRemp = create((set) => ({
  remp: [],
  setRemp: (r, jeu) => set({ remp: r, loaded: jeu }),
  loaded: false,
}))

export const useSearch = create((set) => ({
  search: [],
  setSearch: (r, jeu) => set({ search: r, loaded: jeu }),
  loaded: false,
}))

export function getFromSearch(search,id, def = "not found") {
  let res = search.filter(e => e.id === id)
  return res.length ? res[0] : def
}

export function getFromType(search,type) {
  let res = search.filter(e => type.indexOf(e.type) !== -1)
  res.sort((a, b) => a.name > b.name ? a.name === b.name ? 0 : 1 : -1)
  return res
}