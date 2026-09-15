import AttributHandler from "./Attribut"
import ActionHandler from "./Action"
import PassifHandler from "./Passif"
import HabiliteHandler from "./Habilite"
import RuleHandler from "./Rule"
import TraitHandler from "./Trait"
import DomaineHandler from "./Domaine"
import ObjetHandler from "./Objet"
import LoreHandler from "./Lore"
import ConditionHandler from "./Condition"
import CompetenceHandler from "./Competence"


export const Handler = {
"attribut":AttributHandler,
"competence":CompetenceHandler,
"action":ActionHandler,
"passif":PassifHandler,
"habilite":HabiliteHandler,
"rule":RuleHandler,
"trait":TraitHandler,
"domaine":DomaineHandler,
"objet":ObjetHandler,
"lore":LoreHandler,
"condition":ConditionHandler
}

