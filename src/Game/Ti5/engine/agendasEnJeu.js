// ============================================================
// AGENDAS EN JEU (règle pure)
//
// Une loi ou un traité vaut tant que sa carte est sur la table
// (general:table). Quand son vote élit quelque chose, son script de
// résolution (resolutionsAgendas.js) l'écrit en marque sur la carte :
//
//   Activité réprimée (#332)        agentReprime : id de l'agent de base élu
//   Orientation de l'empire (#728)  orientation : "expansion", "economique",
//                                   "diplomatique" ou "scientifique"
//   Zone démilitarisée (#579)       systeme : numéro de la case élue
//
// Les scripts qui appliquent l'effet (aScript : la carte est sur la table)
// lisent ces marques ici.
// ============================================================

export const ACTIVITE_REPRIMEE = 332;
export const ORIENTATION_DE_L_EMPIRE = 728;
export const ZONE_DEMILITARISEE = 579;
export const MONUMENT_SUPREME = 555;
export const MONUMENT_ETERNEL = 554;
export const TROU_DE_VER_BETA = 827;

export const ORIENTATIONS = ["expansion", "economique", "diplomatique", "scientifique"];

// Carte d'agenda posée sur la table, ou null
export const agendaSurLaTable = (index, id) =>
    (index.parZone.get("general:table") || []).find(c => !c.cache && c.ref?.type === "Agenda" && c.ref.id === id) || null;

// Ce que le vote d'une loi ou d'un traité de la table a élu (marque de sa carte), ou null
export const eluDeLAgenda = (index, id, marque) => {
    const valeur = agendaSurLaTable(index, id)?.marques?.[marque];

    return valeur === undefined || valeur === null || valeur === "" ? null : valeur;
};

// Agent de base dont le recrutement coûte 1 influence de plus (Activité réprimée), ou null
export const agentReprime = index => {
    const id = Number(eluDeLAgenda(index, ACTIVITE_REPRIMEE, "agentReprime"));

    return id > 0 ? id : null;
};

// Case où les engagements sont interdits (Zone démilitarisée), ou null
export const caseDemilitarisee = index => {
    const valeur = eluDeLAgenda(index, ZONE_DEMILITARISEE, "systeme");

    return valeur === null ? null : Number(valeur);
};

// Orientation de l'empire votée, ou null
export const orientationElue = index => {
    const valeur = eluDeLAgenda(index, ORIENTATION_DE_L_EMPIRE, "orientation");

    return ORIENTATIONS.includes(valeur) ? valeur : null;
};

// Texte sans accents, en minuscules (« Économique » -> « economique »)
export const sansAccents = texte => String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
