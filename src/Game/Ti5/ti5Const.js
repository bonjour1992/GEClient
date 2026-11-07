



export const techType = { gen: "Génétique", spa: "Spatial", mil: "Militaire", soc: "Social", storm: "Tempete" ,sig:"Signal", rupt: "Rupture"}
export const techIcon = new Map([["gen", "/ti/tech/G.png"], ['spa', "/ti/tech/B.png"], ["mil", "/ti/tech/R.png"], ["soc", "/ti/tech/Y.png"]])
export const planeteIcon = new Map([["mil", "/ti/icon/mil.png"], ['civ', "/ti/icon/cult.png"], ["sauv", "/ti/icon/sauv.png"]])
export const turnNumber = 10

// Tailles de police des cartes (en px) : à modifier ici pour tout mettre à jour.
//   texte        texte principal : unité, habilité, mercenaire, promesse,
//                objectif militaire, agenda, événement, relique
//   titre        titre de ces cartes
//   texteAgent   texte principal des agents
//   titreRelique titre des reliques
export const police = {
    texte: 11,
    titre: 14,
    texteAgent: 9,
    titreRelique: 12,
}

export const borderColor = { borderColor: "#69b3c0" }
export const backgroundColor = { backgroundColor: "#172045BB" }
export const backgroundColorFull = { backgroundColor: "#172045" }
export const PlayerColor = {
    black: "#000",
    green: "#1a5021",
    pink: "#c805b4",
    orange: "#e9720a",
    blue: "#190faa",
    yellow: "#f9cc39",
    purple: "#480266",
    red: "#7e1111"
}

