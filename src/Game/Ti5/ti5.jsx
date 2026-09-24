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
import derouleHandler from "./deroule"
import voteHandler from "./vote"
import plateauHandler from "./plateau"


export const Handler = {
    "unit": unitHandler,
    "agent": agentHandler,
    "habilite": habiliteHandler,
    "faction": factionHandler,
    "tech": techHandler,
    "Promesse": promesseHandler,
    "militaire": militaireHandler,
    "Agenda": agendaHandler,
    "planet": planetHandler,
    "system": systemeHandler,
    "mercenaire": mercenaireHandler,
    "relique": reliqueHandler,
    "evenement": evenementHandler,
    "phase": phaseHandler,
    "techsheet": techSheetHandler,
    "neutral": neutralFactionHandler,
    "deroule": derouleHandler,
    "vote": voteHandler,
    "plateau":plateauHandler
}

export const Tools = {
}


