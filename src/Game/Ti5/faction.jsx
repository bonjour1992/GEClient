import { useMemo } from "react";
import { ElementContent, Link, aggregation } from "../../lib/datatype.js";
import { DepartCarac, DepartForm, Depart } from "./Component/Depart.jsx";
import { turnNumber, borderColor } from "./ti5Const.js";
import { pub } from "../../lib/fetch";
import { ModalPickerInput } from "../../Input/ModalPickerInput";
import { ImagePicker } from "../../Input/ImagePicker.jsx";
import { ColorInput } from "../../Input/ColorInput.jsx";
import { TableInput } from "../../Input/TableInput";
import { EditorInput } from "../../Input/EditorInput.jsx";
import { Text } from "../../Component/Text.jsx";
import { Image } from "../../Component/Image.jsx";
import { imgURL } from "../../lib/styleUtils.js";
import { LoadAndDisplay } from "../../Component/LoadAndDisplay.jsx";
import FormBase from "../../Input/FormBase"
import { NumberInput } from "../../Input/NumberInput.jsx";
import { TextInput } from "../../Input/TextInput.jsx";
import { bottomBorder } from "../../Component/style.jsx";
import { A4Pa } from "../../Component/Size.jsx";

// Couleur secondaire d'une faction qui n'en a pas choisi : celle des bordures du jeu
const COULEUR_SECONDAIRE = borderColor.borderColor

// Couleurs transmises aux unités et habilités de la feuille (prop context)
const couleursDe = content => ({
    couleur: content.color,
    couleur2: content.color2 || COULEUR_SECONDAIRE,
})

class Faction extends aggregation(ElementContent, DepartCarac) {
    logo = "/404.jpeg"
    // Couleur principale : nom de la faction, nom et statistiques de ses
    // unités, nom de ses habilités
    color = "#FFFFFF"
    // Couleur secondaire : bordures (unités, habilités, compteur de tours),
    // lignes de séparation du verso. Vide : les couleurs habituelles du jeu.
    color2 = ""
    // Illustration de la faction (verso)
    picture = ""
    units = new Array(12).fill(new Link("unit"))
    agents = new Array(7).fill(new Link("agent"))
    rules = new Array(5).fill(new Link("habilite"))
    agentNum = 0
    ruleNum = 0
    agentSetup = new Array(7).fill(0)
    unitNum = new Array(12).fill(0)
    setup = ""
    lore = ""
    system = new Link("system")
    // Planète natale (verso, en haut à droite)
    planete = ""
    population = ""
    gouvernement = ""
    environnement = ""
    descriptionPlanete = ""
    // Forces de la faction, de 0 à FORCE_MAX, dans l'ordre de FORCES (verso, en bas à gauche)
    forces = new Array(9).fill(0)
}

// Axes du graphique des forces (verso) ; mêmes positions que le tableau « forces »
export const FORCES = ["Espace", "Infanterie", "Technologie", "Commerce", "Économie", "Politique", "Défense", "Mobilité", "Exploration"]
const FORCE_MAX = 4

const lignesPlanete = content => [
    ["Population", content.population],
    ["Gouvernement", content.gouvernement],
    ["Environnement", content.environnement],
].filter(([, v]) => v)

// (la description est un texte de l'éditeur : « <p></p> » est vide)
const aDescription = content => String(content.descriptionPlanete || "").replace(/<[^>]*>/g, "").trim() !== ""

const aInfosPlanete = content => Boolean(content.planete || aDescription(content) || lignesPlanete(content).length > 0)

// Infos de la planète natale (verso, en haut à droite) ; rien si elles sont vides
function InfosPlanete({ content }) {

    if (!aInfosPlanete(content)) {
        return null
    }

    return (
        <div data-planete-faction style={{
            width: 210,
            flexShrink: 0,
            alignSelf: "flex-start",
            boxSizing: "border-box",
            maxHeight: "100%",
            overflow: "hidden",
            backgroundColor: "#000000AA",
            border: "1px solid " + (content.color2 || "#999999"),
            borderRadius: 8,
            padding: "4px 6px",
            color: "white",
            fontSize: 10,
            lineHeight: 1.25,
            zIndex: 1,
        }}>
            {content.planete && <div style={{ fontWeight: 700, fontSize: 12 }}>{content.planete}</div>}
            {lignesPlanete(content).map(([nom, v]) => <div key={nom}><b>{nom} :</b> {v}</div>)}
            {/* (texte de l'éditeur : gras, italique, balises du jeu — issue #5) */}
            {aDescription(content) && (
                <Text text={content.descriptionPlanete} style={{ fontStyle: "italic", marginTop: 3, color: "white", fontSize: 10 }} />
            )}
        </div>
    )
}

// Graphique en étoile des forces (verso, en bas à gauche) ; rien si toutes valent 0
function GraphiqueForces({ content }) {

    const valeurs = FORCES.map((_, k) => Math.min(FORCE_MAX, Math.max(0, Number(content.forces?.[k]) || 0)))

    if (!valeurs.some(v => v > 0)) {
        return null
    }

    const largeur = 320, hauteur = 215, cx = 160, cy = 110, rayon = 74
    const angle = k => -Math.PI / 2 + k * 2 * Math.PI / FORCES.length
    const point = (k, v) => [cx + Math.cos(angle(k)) * rayon * v / FORCE_MAX, cy + Math.sin(angle(k)) * rayon * v / FORCE_MAX]
    const polygone = vs => vs.map((v, k) => point(k, v).join(",")).join(" ")
    const couleur = content.color || "#FFFFFF"

    return (
        <svg data-forces-faction width={largeur} height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} style={{ display: "block", margin: "0 auto" }}>
            {Array.from({ length: FORCE_MAX }, (_, i) => (
                <polygon key={i} points={polygone(FORCES.map(() => i + 1))} fill="none" stroke="#FFFFFF" strokeOpacity={i === FORCE_MAX - 1 ? 0.6 : 0.25} />
            ))}
            {FORCES.map((_, k) => {
                const [x, y] = point(k, FORCE_MAX)
                return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="#FFFFFF" strokeOpacity={0.25} />
            })}
            <polygon points={polygone(valeurs)} fill={couleur} fillOpacity={0.4} stroke={couleur} strokeWidth={2} />
            {valeurs.map((v, k) => {
                const [x, y] = point(k, v)
                return <circle key={k} cx={x} cy={y} r={2.5} fill={couleur} />
            })}
            {FORCES.map((nom, k) => {
                const [x, y] = point(k, FORCE_MAX + 0.55)
                const cos = Math.cos(angle(k))
                return (
                    <text key={nom} x={x} y={y} fill="white" fontSize={11} dominantBaseline="middle"
                        textAnchor={Math.abs(cos) < 0.2 ? "middle" : (cos > 0 ? "start" : "end")}>
                        {nom} <tspan fontWeight={700}>{valeurs[k]}</tspan>
                    </text>
                )
            })}
        </svg>
    )
}

function Display({ content, style, context, explication }) {
    let turn = Array.from(Array(turnNumber - 1)).map((e, i) => i + 2)

    // (même référence d'un rendu à l'autre : les unités ne se rechargent pas)
    const couleurs = useMemo(() => couleursDe(content), [content.color, content.color2])

    return (<div
        style={{
            backgroundImage: imgURL("/ti/bg%20star.jpg"),
            ...A4Pa
        }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(" + turn.length + ", 1fr)" }}>
            {turn.map((e) => {
                return (<div key={e} data-emplacement={"tour:" + e} style={{
                    borderTop: 0,
                    borderLeft: 6,
                    borderRight: 6,
                    borderBottom: 12,
                    height: 60,
                    borderStyle: "solid",
                    // (gris tant que la faction n'a pas choisi de couleur secondaire)
                    borderColor: content.color2 || "#999999",
                    textAlign: "center"
                }}
                >
                    <span style={{ fontSize: 50, color: "#999999" }}>    {e}</span></div>)
            })}
        </div>
        <FactionName content={content} style={{ marginLeft: 20, fontSize: 50, fontWeight: 1000 }} />
        <div style={{
            height: 630,
            width: 160,
            gap: 5,
            padding: 5,
            paddingLeft: 15,
            display: "flex",
            flexDirection: "column",
            float: "left"
        }}>
            {/* data-emplacement / data-filtre : case de l'agent, où l'engine
                affiche les agents disponibles de ce type. L'apparence ne change pas. */}
            {Array.from((new Faction).agents.keys()).map((i) => {
                return content.agents &&
                    <div key={i}
                        data-emplacement="agents"
                        data-filtre={content.agents[i].id}
                        style={{
                            flexGrow: 1,
                            display: content.agents[i].id === -1 ? "none" : "flex",
                            flexDirection: "column",
                            position: "relative"
                        }}>
                        <LoadAndDisplay link={content.agents[i]} style={{ flexGrow: 1 }} />
                    </div>
            })}
        </div>
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            height: 630,
            width: 700,
            float: "left",
            paddingTop: 5
        }}
        >
            {/* data-emplacement : l'engine y affiche les éléments posés sur
                l'unité (agents, ressources, cartes). L'apparence ne change pas. */}
            {Array.from((new Faction).units.keys()).map((i) => {
                return content.units &&
                    <div key={i} data-emplacement={content.units[i].id === -1 ? undefined : "unite:" + i} style={{ position: "relative", display: "flex" }}>
                        <LoadAndDisplay link={content.units[i]} context={couleurs} style={{ width: 230, visibility: content.units[i].id === -1 ? "hidden" : "visible" }} />
                    </div>
            })}
        </div>
        <div style={{
            height: 630,
            width: 220,
            gap: 5,
            padding: 5,
            paddingRigth: 15,
            display: "flex",
            flexDirection: "column",
            float: "left"
        }}>
            {Array.from((new Faction).rules.keys()).map((i) => {
                return content.rules &&
                    <div key={i} data-emplacement={content.rules[i].id === -1 ? undefined : "habilite:" + i} style={{ position: "relative", display: content.rules[i].id === -1 ? "none" : "block" }}>
                        <LoadAndDisplay link={content.rules[i]} context={couleurs} style={{ width: 220, display: "block" }} />
                    </div>
            })}
        </div>
    </div>)
}

export function FactionName({ content, style }) {
    return (
        <Text text={"#img[" + content.logo + "]" + content.name} style={{ ...style, color: content.color }} />
    )
}

export function FactionLogo({ content, style }) {
    return (

        <Text text={"#img[" + content.logo + "]"} style={{ ...style, color: content.color }} />
    )
}

export function Verso({ content, style, explication }) {

    function Separateur() {
        return (<div style={{ width: "102%", height: 0, ...bottomBorder(2), borderColor: content.color2 || "white", margin: "5px -3px" }}></div>)
    }

    return (<div
        style={{
            backgroundImage: imgURL("/ti/bg%20star.jpg"),
            ...A4Pa,
            display: "grid",
            gridTemplate: "30% 69% / 30% 35% 35%"
        }}>
        <div style={{
            gridColumn: 1,
            gridRow: "1 / 3",
            margin: 5,
            backgroundColor: "#BBBBBB66",
            borderRadius: 12,
            padding: 4,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
        }}>
            {Array.from((new Faction).agents.keys()).map((i) => {
                return content.agents && content.agents[i].id !== -1 && content.agentSetup[i] != 0 && <div key={i} >
                    <LoadAndDisplay link={content.agents[i]} displayeur="nom" style={{ display: "inline" }} />
                    <span style={{ color: "white" }}>: {content.agentSetup[i]}</span>
                    <br />
                </div>
            })}
            <Separateur />
            {Array.from((new Faction).units.keys()).map((i) => {
                return content.units && content.units[i].id !== -1 && content.unitNum[i] != 0 && <div key={i} >
                    <LoadAndDisplay link={content.units[i]} displayeur="nom" style={{ display: "inline", color: "white" }} />
                    <span style={{ color: "white" }}>: {content.unitNum[i]}</span>
                    <br />
                </div>
            })}
            <Separateur />
            <Text text={content.setup} style={{ color: "white", fontSize: 12 }} rule={explication} />
            <Depart content={content} />
            {/* Forces de la faction, en bas de la colonne */}
            <div style={{ marginTop: "auto" }}>
                <GraphiqueForces content={content} />
            </div>
        </div>
        {aInfosPlanete(content) ? (
            // Avec les infos de planète : une rangée illustration | système | infos,
            // chacun à sa place (rien ne se superpose)
            <div data-haut-verso style={{
                gridColumn: "2 / 4",
                gridRow: 1,
                display: "flex",
                gap: 6,
                padding: 5,
                minHeight: 0,
                minWidth: 0,
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {content.picture && (
                        <img
                            data-faction-picture
                            src={encodeURI(pub + content.picture)}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                        />
                    )}
                </div>
                <div style={{ width: 240, flexShrink: 0, overflow: "visible" }}>
                    <LoadAndDisplay link={content.system || new Link("system")} style={{ transform: "scale(0.7)", transformOrigin: "top left" }} />
                </div>
                <InfosPlanete content={content} />
            </div>
        ) : (<>
            <div style={{
                gridColumn: 2,
                gridRow: 1,
                padding: 5,
                minHeight: 0,
            }}>
                {/* Illustration de la faction, à gauche de son système de départ */}
                {content.picture && (
                    <img
                        data-faction-picture
                        src={encodeURI(pub + content.picture)}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                    />
                )}
            </div>
            <div style={{
                gridColumn: 3,
                gridRow: 1,
            }}>
                <LoadAndDisplay link={content.system || new Link("system")} style={{ transform: "scale(0.7) ", marginTop: -30 }} />
            </div>
        </>)}
        <div style={{
            gridColumn: "2 / 4",
            gridRow: 2,
            margin: 5,
            backgroundColor: "#BBBBBB66",
            borderRadius: 12,
            padding: 4,
        }}>
            <Text text={content.lore} style={{ color: "white", fontSize: 9 }} rule={explication} />
        </div>
    </div>)
}



function Form({ content, onChange, onSubmit, style }) {

    if (!content.rules) {
        content.rules = new Array(5).fill(new Link("habilite"))
        content.ruleNum = 0
    }

    if (!content.agentSetup) {
        content.agentSetup = new Array(7).fill(0)

    }
    if (!content.unitNum) {
        content.unitNum = new Array(12).fill(0)
    }
    if (!content.forces) {
        content.forces = new Array(FORCES.length).fill(0)
    }


    function agentLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"agents"} value={content} index={x} type={["agent"]} />),
        (<NumberInput onChange={onChange} name={"agentSetup"} value={content} index={x} min={0} />)]
    }

    function ruleLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"rules"} value={content} index={x} type={["habilite"]} />)]
    }

    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>

            <ImagePicker onChange={onChange} name={"logo"} value={content} label="Logo" />
            <ImagePicker onChange={onChange} name={"picture"} value={content} label="Illustration (verso)" />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <ColorInput onChange={onChange} name={"color"} value={content} label="Couleur principale (noms, statistiques)" />
                <ColorInput onChange={onChange} name={"color2"} value={content} label="Couleur secondaire (bordures, séparations)" />
            </div>

            <h2>Agents</h2>
            <TableInput onChange={onChange} Line={agentLine} max={7} name="agentNum" value={content} />
            <h2>Unités</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {Array.from((new Faction).units.keys()).map((i) => {
                    return (<div key={i} className="p-2" >
                        <ModalPickerInput onChange={onChange} name={"units"} value={content} index={i} type={["unit"]} />
                        <NumberInput onChange={onChange} name={"unitNum"} value={content} index={i} min={0} />
                    </div>)
                })}

            </div>
            <h2>Rule</h2>
            <TableInput onChange={onChange} Line={ruleLine} max={5} name="ruleNum" value={content} />
            <h2>Mise en place</h2>
            <EditorInput onChange={onChange} value={content} name="setup" label="Mise en place" />
            <DepartForm content={content} onChange={onChange} />
            <ModalPickerInput onChange={onChange} value={content} name="system" label="Systeme de depart" type={["system"]} />
            <EditorInput onChange={onChange} value={content} name="lore" label="Lore" />
            <h2>Planète natale (verso, en haut à droite)</h2>
            <TextInput onChange={onChange} value={content} name="planete" label="Planète(s)" />
            <TextInput onChange={onChange} value={content} name="population" label="Population" />
            <TextInput onChange={onChange} value={content} name="gouvernement" label="Gouvernement" />
            <TextInput onChange={onChange} value={content} name="environnement" label="Environnement" />
            <EditorInput onChange={onChange} value={content} name="descriptionPlanete" label="Description" />
            <h2>Forces (verso, en bas à gauche : 0 à {FORCE_MAX})</h2>
            <div data-forces-formulaire style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {FORCES.map((nom, k) => (
                    <div key={nom}>
                        <NumberInput onChange={onChange} value={content} name="forces" index={k} min={0} max={FORCE_MAX} label={nom} />
                    </div>
                ))}
            </div>
        </FormBase>
    )
}

//

export default { name: "Faction", classe: Faction, form: Form, display: { default: Display, verso: Verso, nom: FactionName, logo: FactionLogo }, print: "grid-cols-1" }