import { ElementContent } from "../../lib/datatype";
import { A4Po } from "../../Component/Size";
import FormBase from "../../Input/FormBase";
import { EditorInput } from "../../Input/EditorInput";
import { Text } from "../../Component/Text";
import { TextInput } from "../../Input/TextInput";
import { TableInput } from "../../Input/TableInput";
import { NumberInput } from "../../Input/NumberInput";
import { EnumInput } from "../../Input/EnumInput";
import { BooleanInput } from "../../Input/BooleanInput";

const event = {
    none: "Aucun",
    min: "Mineur",
    maj: "Majeur",

}


class deroule extends ElementContent {
    fin = ""
    recru = []
    surCout = []
    mecatol = []
    evenement = []
    militaire = []
    faveur = []
    ministre = []
    siege = []
    siege2 = []
    tourNum = 10
}

function Display({ content, explication }) {
    // ============================================================
    // PARAMÈTRES
    // ============================================================

    const nombrePages = 3;

    // Page 1 : tours 1-3
    // Page 2 : tours 4-7
    // Page 3 : tours 8-10
    const toursParPage = [3, 4, 3];

    const paddingPage = 0;

    const couleurFond = "#ffffff";
    const couleurEntete = "#eeeeee";
    const couleurBordure = "#000000";

    // Cases du haut
    const boites = [3, 4, 5, 6, 7, 8, 9];

    // Toutes les cases ont la même hauteur ET la même largeur.
    const hauteurBoites = "30mm";
    const espaceEntreBoites = 5;

    // Une case sur les pages 1 et 2 occupe 1/3 de la largeur.
    // La case 9 doit avoir exactement la même largeur.
    const largeurBoite = 33.3333;
    const largeurLegende = 66.6667;

    // ============================================================
    // COMPTEURS
    // ============================================================

    const maxPoints = 25;


    const compteurDebutParPage = [0, 9, 18];
    const compteurFinParPage = [8, 17, 25];

    // Compteurs légèrement agrandis
    const hauteurCompteur = 30;

    const largeurCaseFinale = 2;

    // ============================================================
    // TABLEAU
    // ============================================================

    const hauteurSmallRow = 22;

    // Hauteurs en MILLIMÈTRES
    const hauteurCarte = "70mm";



    // ============================================================
    // DONNÉES
    // ============================================================

    const infa = [
        0, 3, 5, 7, 8, 9, 10, 11, 11, 12,
        12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17,
        18, 18, 19, 19, 20,
    ];

    // ============================================================
    // STYLES
    // ============================================================

    const pageStyle = {
        ...A4Po,
        padding: paddingPage,
        margin: 0,
        border: "none",
        outline: "none",
        backgroundColor: couleurFond,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        color: "#000",
        flexShrink: 0,
    };

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        margin: 0,
        padding: 0,
        gap: 0,
        backgroundColor: couleurFond,
    };

    // ============================================================
    // BOÎTES DU HAUT
    // ============================================================

    function Boxes({ first, last, width }) {
        return (
            <div
                style={{
                    width: width + "%",
                    height: hauteurBoites,
                    display: "flex",
                    alignItems: "center",
                    boxSizing: "border-box",
                    float: "left",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: "100%",
                        height: hauteurBoites,
                        gap: espaceEntreBoites,
                    }}
                >
                    {boites.map((numero) => (
                        <div
                            key={numero}
                            style={{
                                flex: 1,
                                height: hauteurBoites,
                                display:
                                    numero >= first && numero <= last
                                        ? "flex"
                                        : "none",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "3px solid #000",
                                fontSize: 60,
                                fontWeight: "bold",
                                boxSizing: "border-box",
                                minWidth: 0,
                                color: "#888",
                            }}
                        >
                            {numero}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ============================================================
    // LÉGENDE
    // ============================================================

    function Legend() {
        const cubeStyle = (black) => ({
            width: 20,
            height: 20,
            backgroundColor: black ? "#000" : "#fff",
            border: "1px solid #000",
            display: "inline-block",
            flexShrink: 0,
        });

        return (
            <div
                style={{
                    width: largeurLegende + "%",
                    height: hauteurBoites,
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 15px",
                    boxSizing: "border-box",
                    float: "left",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        fontSize: 14,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <span style={cubeStyle(true)} />
                        <span>
                            Mercenaire coûte 2 supplémentaire
                        </span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <span style={cubeStyle(false)} />
                        <span>
                            plan de relique coût normal
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // COMPTEUR
    // ============================================================

    function CounterLine({ title, start, end, max, pageIndex }) {
        const cells = [];

        for (let i = start; i <= end && i <= max; i++) {
            const isLast = i === max || i === 0;

            cells.push(
                <div
                    key={i}
                    style={{
                        flex: isLast ? largeurCaseFinale : 1,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRight: "1px solid #aaa",
                        fontSize: isLast ? 13 : 10,
                        fontWeight: isLast ? "bold" : "normal",
                        backgroundColor: isLast ? "#f0f0f0" : "#fff",
                        boxSizing: "border-box",
                        minWidth: 0,
                    }}
                >
                    {title === "Infamie"
                        ? (infa[i] === 0 ? "0" : "-" + infa[i])
                        : i + (i === max && "+")}
                </div>
            );
        }

        return (
            <div
                style={{
                    width: "100%",
                    height: hauteurCompteur,
                    display: "flex",
                    boxSizing: "border-box",
                }}
            >
                {pageIndex === 0 && (
                    <div
                        style={{
                            width: 145,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            paddingLeft: 8,
                            backgroundColor: couleurEntete,
                            borderTop: "1px solid #000",
                            borderBottom: "1px solid #000",
                            borderRight: "1px solid #000",
                            fontSize: 12,
                            fontWeight: "bold",
                            boxSizing: "border-box",
                            flexShrink: 0,
                        }}
                    >
                        {title}
                    </div>
                )}

                <div
                    style={{
                        flex: 1,
                        height: "100%",
                        display: "flex",
                        borderTop: "1px solid #000",
                        borderBottom: "1px solid #000",
                        boxSizing: "border-box",
                        minWidth: 0,
                    }}
                >
                    {cells}
                </div>
            </div>
        );
    }

    function CountersPage({ pageIndex }) {
        return (
            <div
                style={{
                    width: "100%",
                    height: hauteurCompteur * 3,
                    display: "flex",
                    flexDirection: "column",
                    boxSizing: "border-box",
                }}
            >
                <CounterLine
                    title="Points"
                    start={compteurDebutParPage[pageIndex]}
                    end={compteurFinParPage[pageIndex]}
                    max={maxPoints}
                    pageIndex={pageIndex}
                />

                <CounterLine
                    title="Infamie"
                    start={compteurDebutParPage[pageIndex]}
                    end={compteurFinParPage[pageIndex]}
                    max={maxPoints}
                    pageIndex={pageIndex}
                />

                <CounterLine
                    title="Sièges au conseil"
                    start={compteurDebutParPage[pageIndex]}
                    end={compteurFinParPage[pageIndex]}
                    max={maxPoints}
                    pageIndex={pageIndex}
                />
            </div>
        );
    }

    // ============================================================
    // HEADER
    // ============================================================

    function HeaderPage({ pageIndex }) {
        return (
            <div
                style={{
                    width: "100%",
                    flexShrink: 0,
                }}
            >
                {pageIndex === 0 && (
                    <Boxes
                        first={3}
                        last={5}
                        width={100}
                    />
                )}

                {pageIndex === 1 && (
                    <Boxes
                        first={6}
                        last={8}
                        width={100}
                    />
                )}

                {pageIndex === 2 && (
                    <>
                        {/* 
                            Case 9 = exactement la largeur
                            d'une case des pages précédentes.
                        */}
                        <Boxes
                            first={9}
                            last={9}
                            width={largeurBoite}
                        />

                        <Legend />
                    </>
                )}

                <CountersPage pageIndex={pageIndex} />
            </div>
        );
    }

    // ============================================================
    // CELLULE
    // ============================================================

    function Cell({ children, style = {} }) {
        return (
            <td
                style={{
                    border: `1px solid ${couleurBordure}`,
                    textAlign: "center",
                    verticalAlign: "middle",
                    padding: 3,
                    boxSizing: "border-box",
                    fontSize: 13,
                    fontWeight: 700,
                    ...style,
                }}
            >
                {children}
            </td>
        );
    }

    // ============================================================
    // CONTENU AGENDA
    // ============================================================

    function AgendaContent({ tour }) {
        const nombreMinisteres = content.ministre && content.ministre[tour - 1] || 0;
        const nombreSieges = content.siege && content.siege[tour - 1] || 0;
        const nombreSieges2 = content.siege2 && content.siege2[tour - 1] || 0;

        function Siege({ nombreSieges }) {
            return (
                nombreSieges > 0 && (
                    <div
                        style={{
                            fontWeight: "bold",
                            fontSize: 13,
                            marginBottom: 8,
                            borderBottom: "1px dashed #aaa",
                        }}
                    >
                        Voter pour obtenir{" "}
                        {Array.from(
                            { length: nombreSieges },
                            (_, i) => nombreSieges - i
                        ).join("/")}{" "}
                        siège
                        {nombreSieges > 1 ? "s" : ""} au conseil
                    </div>
                )
            );
        }

        return (
            <>
                <Siege nombreSieges={nombreSieges} />
                <Siege nombreSieges={nombreSieges2} />


                {nombreMinisteres > 0 && (
                    <div
                        style={{
                            fontWeight: "bold",
                            fontSize: 13,
                            marginBottom: 8,
                            borderBottom: "1px dashed #aaa",
                        }}
                    >
                        Ajouter {nombreMinisteres} poste
                        {nombreMinisteres > 1 ? "s" : ""} de ministre au
                        hasard
                    </div>
                )}

                <div
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                    }}
                />
            </>
        );
    }

    // ============================================================
    // TABLEAU
    // ============================================================

    function TablePage({ pageIndex }) {
        const debut = [0, 3, 7][pageIndex];
        const nombreTours = toursParPage[pageIndex];

        const tours = Array.from(
            { length: nombreTours },
            (_, i) => debut + i + 1
        );

        const labelColumn = pageIndex === 0;
        const dernierePage = pageIndex === 2;

        // ============================================================
        // CELLULE DE LABEL
        // ============================================================

        function LabelCell({ children, style = {} }) {
            if (!labelColumn) return null;

            return (
                <Cell
                    style={{
                        backgroundColor: couleurEntete,
                        fontWeight: "bold",
                        textAlign: "left",
                        paddingLeft: 6,
                        ...style,
                    }}
                >
                    {children}
                </Cell>
            );
        }

        // ============================================================
        // LIGNES COMMUNES DU TABLEAU
        // ============================================================

        function TourRow() {
            return (
                <tr style={{ height: hauteurSmallRow }}>
                    <LabelCell>Tour</LabelCell>

                    {tours.map((tour) => (
                        <Cell
                            key={tour}
                            style={{
                                backgroundColor: couleurEntete,
                                fontWeight: "bold",
                                fontSize: 16,
                            }}
                        >
                            {tour}
                        </Cell>
                    ))}
                </tr>
            );
        }

        function RecrutementRow() {


            return (
                <tr style={{ height: hauteurSmallRow }}>
                    <LabelCell>Recrutement</LabelCell>

                    {tours.map((tour) => (
                        <Cell key={tour}>
                            {content.recru ? (content.recru[tour - 1] || "") : ""}
                        </Cell>
                    ))}
                </tr>
            );
        }

        function SurcoutAgentRow() {
            return (
                <tr style={{ height: hauteurSmallRow }}>
                    <LabelCell>
                        Surcout pour &#x25A0;agent
                    </LabelCell>

                    {tours.map((tour) => (
                        <Cell key={tour}>
                            {content.surCout ?
                                (content.surCout[tour - 1] ?
                                    ("+" + content.surCout[tour - 1] + " Influence" + (content.surCout[tour - 1] > 1 ? "s" : ""))
                                    : "")
                                : ""}
                        </Cell>
                    ))}
                </tr>
            );
        }

        function MecatolRow() {
            return (
                <tr style={{ height: hauteurSmallRow }}>
                    <LabelCell>
                        Point pour Mecatol
                    </LabelCell>

                    {tours.map((tour) => (
                        <Cell key={tour}>
                            {content.mecatol ? (
                                content.mecatol[tour - 1] ? (content.mecatol[tour - 1] + " Point" + (content.mecatol[tour - 1] > 1 ? "s" : ""))
                                    : "")
                                : ""}
                        </Cell>
                    ))}
                </tr>
            );
        }

        function EvenementRow() {
            return (
                <tr style={{ height: hauteurCarte }}>
                    <LabelCell
                        style={{
                            verticalAlign: "top",
                        }}
                    >
                        Evenement
                    </LabelCell>

                    {tours.map((tour) => (
                        <Cell
                            key={tour}
                            style={{
                                height: hauteurCarte,
                                fontSize: 12,
                                verticalAlign: "top",
                                textAlign: "left",
                                padding: 8,
                            }}
                        >
                            {content.evenement&& content.evenement[tour - 1] && content.evenement[tour - 1] != "none" && (
                                <div
                                    style={{
                                        fontWeight: "bold",
                                        marginBottom: 8,
                                    }}
                                >
                                    Evenement {event[content.evenement[tour - 1]]}
                                </div>
                            )}
                        </Cell>
                    ))}
                </tr>
            );
        }

        function ObjectifMilitaireRow() {
            return (
                <tr style={{ height: hauteurCarte }}>
                    <LabelCell
                        style={{
                            verticalAlign: "top",
                        }}
                    >
                        Objectif militaire

                        <div style={{ fontSize: 11 }}>
                            Le prochain objectif militaire est
                            toujours visible
                        </div>
                    </LabelCell>

                    {tours.map((tour) => (
                        <Cell
                            key={tour}
                            style={{
                                height: hauteurCarte,
                                fontSize: 12,
                                verticalAlign: "top",
                                textAlign: "left",
                                padding: 8,
                            }}
                        >
                            {content.militaire && content.militaire[tour - 1] && (
                                <div
                                    style={{
                                        fontWeight: "bold",
                                        marginBottom: 8,
                                    }}
                                >
                                    Afficher un objectif militaire ici
                                </div>
                            )}
                        </Cell>
                    ))}
                </tr>
            );
        }

        function FaveurRow() {
            return (
                <tr style={{ height: hauteurSmallRow }}>
                    <LabelCell>Faveur</LabelCell>

                    {tours.map((tour) => {
                        return (
                            <Cell key={tour}>
                                {content.faveur && content.faveur[tour - 1] > 0 && (
                                    <b>
                                        Encaisser des faveurs
                                        {content.faveur[tour - 1] > 1
                                            ? ` ${content.faveur[tour - 1]} fois`
                                            : ""}
                                    </b>
                                )}
                            </Cell>
                        );
                    })}
                </tr>
            );
        }

        function AgendaRow() {
            return (
                <tr style={{ height: "auto" }}>
                    <LabelCell
                        style={{
                            verticalAlign: "top",
                            padding: 6,
                        }}
                    >
                        Agenda
                    </LabelCell>

                    {tours.map((tour) => (
                        <Cell
                            key={tour}
                            style={{
                                height: "100%",
                                minHeight: 0,
                                verticalAlign: "top",
                                textAlign: "left",
                                padding: 7,
                            }}
                        >
                            <AgendaContent tour={tour} />
                        </Cell>
                    ))}
                </tr>
            );
        }

        // ============================================================
        // TABLEAU PRINCIPAL
        // ============================================================

        function ToursTable() {
            return (
                <table
                    style={{
                        width: "100%",
                        height: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                        boxSizing: "border-box",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <colgroup>
                        {labelColumn && (
                            <col style={{ width: 145 }} />
                        )}

                        {tours.map((tour) => (
                            <col
                                key={tour}
                                style={{ width: "auto" }}
                            />
                        ))}
                    </colgroup>

                    <tbody>
                        <TourRow />
                        <RecrutementRow />
                        <SurcoutAgentRow />
                        <MecatolRow />
                        <EvenementRow />
                        <ObjectifMilitaireRow />
                        <FaveurRow />
                        <AgendaRow />
                    </tbody>
                </table>
            );
        }

        // ============================================================
        // PAGE 3 : TABLEAU + FIN DE PARTIE
        // ============================================================

        if (dernierePage) {
            return (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "row",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            width: "75%",
                            height: "100%",
                            minWidth: 0,
                        }}
                    >
                        <ToursTable />
                    </div>

                    <table
                        style={{
                            width: "25%",
                            height: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            boxSizing: "border-box",
                            flexShrink: 0,
                        }}
                    >
                        <colgroup>
                            <col style={{ width: "100%" }} />
                        </colgroup>

                        <tbody>
                            <tr style={{ height: hauteurSmallRow }}>
                                <Cell
                                    style={{
                                        backgroundColor: couleurEntete,
                                        fontWeight: "bold",
                                        fontSize: 16,
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                    }}
                                >
                                    Fin de partie
                                </Cell>
                            </tr>

                            <tr style={{ height: "auto" }}>
                                <Cell
                                    style={{
                                        height: "100%",
                                        verticalAlign: "top",
                                        textAlign: "left",
                                        padding: 8,
                                        fontWeight: "normal",
                                    }}
                                >
                                    <Text
                                        text={content.fin}
                                        explication={explication}
                                    />
                                </Cell>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        }

        // ============================================================
        // PAGES 1 ET 2
        // ============================================================

        return <ToursTable />;
    }


    // ============================================================
    // RENDU — 3 PAGES A4 PORTRAIT
    // ============================================================

    return (
        <div style={containerStyle}>
            {Array.from(
                { length: nombrePages },
                (_, pageIndex) => {
                    const estDernierePage =
                        pageIndex === nombrePages - 1;

                    return (
                        <div
                            key={pageIndex}
                            style={{
                                ...pageStyle,
                                pageBreakAfter: estDernierePage
                                    ? "auto"
                                    : "always",
                                breakAfter: estDernierePage
                                    ? "auto"
                                    : "page",
                            }}
                        >
                            <HeaderPage pageIndex={pageIndex} />

                            <div
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <TablePage pageIndex={pageIndex} />
                            </div>
                        </div>
                    );
                }
            )}
        </div>
    );
}

// ============================================================
// FORM
// ============================================================



function Form({
    content,
    onChange,
    onSubmit,
    style,
}) {

    function TourLine(x) {
        return [
            (<TextInput onChange={onChange} index={x} name="recru" value={content} label="Box" />),
            (<NumberInput onChange={onChange} index={x} name="surCout" value={content} label="Surcout" />),
            (<NumberInput onChange={onChange} index={x} name="mecatol" value={content} label="M.Rex" />),
            (<EnumInput onChange={onChange} index={x} name="evenement" value={content} label="Event" enumClass={event} />),
            (<BooleanInput onChange={onChange} index={x} name="militaire" value={content} label="militaire" />),
            (<NumberInput onChange={onChange} index={x} name="faveur" value={content} label="faveur" />),
            (<NumberInput onChange={onChange} index={x} name="ministre" value={content} label="ministre" />),

            (<NumberInput onChange={onChange} index={x} name="siege" value={content} label="Siege" />),
            (<NumberInput onChange={onChange} index={x} name="siege2" value={content} label="et" />),


        ]
    }

    return (
        <FormBase
            content={content}
            onChange={onChange}
            onSubmit={onSubmit}
            style={style}
        >
            <TableInput onChange={onChange} name="tourNum" value={content} lable="Table tour" Line={TourLine} />
            <EditorInput onChange={onChange} value={content} name="fin" label="Fin de partie" />
        </FormBase>
    );
}

export default {
    name: "Deroule",
    classe: deroule,
    form: Form,
    display: {
        default: Display,
    },
};
