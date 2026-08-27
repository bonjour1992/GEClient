import unitHandler from "./unit"
import agentHandler from "./agent"
import habiliteHandler from "./habilite"
import factionHandler from "./faction"
import techHandler from "./tech"
import promesseHandler from "./promesse"
import militaireHandler from "./militaire"
import agendaHandler from "./agenda"
import planetHandler from "./planet"
import systemeHandler from "./systeme"
import mercenaireHandler from "./mercenaire"
import reliqueHandler from "./relique"
import evenementHandler from "./evenement"
import phaseHandler from "./phase"
import techSheetHandler from "./techSheet"
import neutralFactionHandler from "./neutralFaction"
export const turnNumber = 10

export const borderColor = { borderColor: "#343434" }
export const backgroundColor = { backgroundColor: "#172045BB" }

export const Handler = {
    "unit": unitHandler,
    "agent": agentHandler,
    "habilite": habiliteHandler,
    "faction": factionHandler,
    "tech": techHandler,
    "Promesse": promesseHandler,
    "militaire":militaireHandler,
    "Agenda":agendaHandler,
    "planet":planetHandler,
    "system":systemeHandler,
    "mercenaire":mercenaireHandler,
    "relique":reliqueHandler,
    "evenement":evenementHandler,
    "phase":phaseHandler,
    "techsheet":techSheetHandler,
    "neutral":neutralFactionHandler
}

export const techType = { gen: "Génétique", spa: "Spatial", mil: "Militaire", soc: "Social", storm: "Tempete" }
export const techIcon = new Map([["gen", "/ti/tech/G.png"], ['spa', "/ti/tech/B.png"], ["mil", "/ti/tech/R.png"], ["soc", "/ti/tech/Y.png"]])
export const planeteIcon = new Map([["mil", "/ti/icon/mil.png"], ['civ', "/ti/icon/cult.png"], ["sauv", "/ti/icon/sauv.png"]])
