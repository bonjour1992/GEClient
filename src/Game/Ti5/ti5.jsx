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
import tokenHandler from "./token"
import reglageHandler from "./reglage"
import OutilParties from "./engine/Parties"
import OutilScripts from "./engine/OutilScripts"
import { Nom } from "./Component/Nom"


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
    "plateau":plateauHandler,
    "token": tokenHandler,
    "reglage": reglageHandler
}

// Tous les types ont l'affichage « nom » (nom précédé de ses icônes :
// Component/Nom.jsx), sauf ceux qui ont déjà le leur (faction, agent)
for (const handler of Object.values(Handler)) {
    handler.display = { ...handler.display, nom: handler.display.nom || Nom }
}

export const Tools = {
    "partie": { name: "Parties", component: OutilParties },
    "scripts": { name: "Scripts de règles", component: OutilScripts }
}


