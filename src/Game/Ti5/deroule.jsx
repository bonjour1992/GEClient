
import { ElementContent } from "../../lib/datatype";
import React from "react";
import { A4Pa } from "../../Component/Size";
import FormBase from "../../Input/FormBase";

class deroule extends ElementContent { }

function Display() {
    // ============================================================
    // PARAMÈTRES
    // ============================================================

    const nombrePages = 2;
    const toursParPage = 5;

    const paddingPage = 0;

    const couleurFond = "#ffffff";
    const couleurEntete = "#eeeeee";
    const couleurBordure = "#000000";

    const boites = [3, 4, 5, 6, 7, 8, 9]
    const hauteurBoites = 75;
    const espaceEntreBoites = 5;
    const hauteurZoneBoites = 75;
    const hauteurLegende = hauteurZoneBoites;

    // Compteurs
    const maxPoints = 25;
    const maxInfamie = 25;
    const maxSieges = 25;

    const compteurDebutParPage = [0, 12];
    const compteurFinParPage = [11, 25];

    const hauteurCompteur = 22;
    const largeurCaseFinale = 2;

    // Tableau
    const hauteurTour = 22;
    const hauteurRecrutement = 22;
    const hauteurMecatol = 22;
    const hauteurObjectif = 241;
    const hauteurEvenement = 241;
    const hauteurFaveur = 22;

    // ============================================================
    // DONNÉES
    // ============================================================
    const evenement = ["Mineur", , , "Mineur", , "Majeur"]


    const infa = [
        0, 3, 5, 7, 8, 9, 10, 11, 11, 12,
        12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17,
        18, 18, 19, 19, 20,
    ];

    const recrutement = [
        "3,4,5,6,7,8,9",
        "3,5,7",
        "4,5,6",
        "4,5,7",
        "4,6,8",
        "5,6,7",
        "5,7,9",
        "6,7,8",
        "6,8,9",
        "7,8,9",
    ];

    const mecatol = [
        1, 1, 1, 1, 1,
        2, 2, 2, 2, 4,
    ];

    const Militaire = [
        false, false, true, false, false,
        true, false, true, false, true,
    ];

    const faveur = [
        0, 0, 0, 1, 1,
        0, 1, 0, 1, 2,
    ];

    const siege = [
        0, 0, 2, 0, 2,
        2, 3, 3, 3, 4, 4,
    ];

    const ministere = [
        2, 2, 0, 1, 0,
        0, 0, 0, 0, 0, 0,
    ];

    // ============================================================
    // STYLES
    // ============================================================

    const pageStyle = {
        ...A4Pa,
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
    // BOÎTES
    // ============================================================

    function Boxes({ first, last, width }) {
        return (
            <div
                style={{
                    width: width + "%",
                    height: hauteurZoneBoites,
                    display: "flex",
                    alignItems: "center",
                    boxSizing: "border-box",
                    float: "left"
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
                                display: (numero >= first && numero <= last) ? "flex" : "none",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "3px solid #000",
                                fontSize: 60,
                                fontWeight: "bold",
                                boxSizing: "border-box",
                                minWidth: 0,
                                color:"#888"
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
                    width: "22%",
                    height: hauteurLegende,
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 15px",
                    boxSizing: "border-box",
                    float: "left"
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={cubeStyle(true)} />
                        <span>
                            Mercenaire coûte 2 supplémentaire
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    {title === "Infamie" ? infa[i] : i + (i === max && "+")}
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
                    max={maxInfamie}
                    pageIndex={pageIndex}
                />

                <CounterLine
                    title="Sièges au conseil"
                    start={compteurDebutParPage[pageIndex]}
                    end={compteurFinParPage[pageIndex]}
                    max={maxSieges}
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
            <div style={{ width: "100%", flexShrink: 0 }}>
                {pageIndex === 0 ? <Boxes first={3} last={6} width={100} /> : <> <Boxes first={7} last={9} width={75} /> <Legend /></>}
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
        const nombreMinisteres = ministere[tour - 1] || 0;
        const nombreSieges = siege[tour - 1] || 0;


        function Siege({ nombreSieges }) {
            return nombreSieges > 0 && (
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
                    siège{nombreSieges > 1 ? "s" : ""} au conseil
                </div>
            )
        }


        return (
            <>
                <Siege nombreSieges={nombreSieges} />
                {tour === 10 ? <Siege nombreSieges={siege[10] || 0} /> : ""}
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
                        {nombreMinisteres > 1 ? "s" : ""} de ministre au hasard
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
        const debut = pageIndex * toursParPage;

        const tours = Array.from(
            { length: toursParPage },
            (_, i) => debut + i + 1
        );

        const labelColumn = pageIndex === 0;

        return (
            <table
                style={{
                    width: "100%",
                    height: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                    boxSizing: "border-box",
                    flex: 1,
                }}
            >
                <colgroup>
                    {labelColumn && <col style={{ width: 145 }} />}

                    {tours.map((tour) => (
                        <col
                            key={tour}
                            style={{
                                width:
                                    tour === 10
                                        ? "calc((100% - 40%) / 3)"
                                        : "auto",
                            }}
                        />
                    ))}
                </colgroup>

                <tbody>

                    {/* ==================================================
            TOUR
            ================================================== */}

                    <tr style={{ height: hauteurTour }}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                }}
                            >
                                Tour
                            </Cell>
                        )}

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


                    {/* ==================================================
            RECRUTEMENT
            ================================================== */}

                    <tr style={{ height: hauteurRecrutement }}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    paddingLeft: 6,
                                }}
                            >
                                Recrutement
                            </Cell>
                        )}

                        {tours.map((tour) => (
                            <Cell key={tour}>
                                {recrutement[tour - 1] || ""}
                            </Cell>
                        ))}
                    </tr>


                    {/* ==================================================
            MECATOL
            ================================================== */}

                    <tr style={{ height: hauteurMecatol }}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    paddingLeft: 6,
                                }}
                            >
                                Point pour Mecatol
                            </Cell>
                        )}

                        {tours.map((tour) => (
                            <Cell key={tour}>
                                {mecatol[tour - 1] || ""}
                            </Cell>
                        ))}
                    </tr>
                    {/* ==================================================
                    Evenement   
                    ================================================== */}

                    <tr style={{ height: hauteurEvenement}}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    paddingLeft: 6,
                                    verticalAlign: "top",
                                }}
                            >
                                Evenement
                            </Cell>
                        )}

                        {tours.map((tour) => (
                            <Cell
                                key={tour}
                                style={{
                                    fontSize: 12,
                                    verticalAlign: "top",
                                    textAlign: "left",
                                    padding: 8,
                                }}
                            >
                                {evenement[tour - 1] && (
                                    <>
                                        <div
                                            style={{
                                                fontWeight: "bold",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Evenement {evenement[tour - 1]}
                                        </div>


                                    </>
                                )}
                            </Cell>
                        ))}
                    </tr>

                    {/* ==================================================
            OBJECTIF MILITAIRE
            ================================================== */}

                    <tr style={{ height: hauteurObjectif }}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    paddingLeft: 6,
                                    verticalAlign: "top",
                                }}
                            >
                                Objectif militaire
                                <div
                                    style={{
                                        fontSize: 11,
                                    }}
                                >
                                    Le prochain objectif militaire est toujours visible
                                </div>
                            </Cell>
                        )}

                        {tours.map((tour) => (
                            <Cell
                                key={tour}
                                style={{
                                    height: hauteurObjectif,
                                    fontSize: 12,
                                    verticalAlign: "top",
                                    textAlign: "left",
                                    padding: 8,
                                }}
                            >
                                {Militaire[tour - 1] && (
                                    <>
                                        <div
                                            style={{
                                                fontWeight: "bold",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Afficher un objectif militaire ici
                                        </div>


                                    </>
                                )}
                            </Cell>
                        ))}
                    </tr>


                    {/* ==================================================
            FAVEUR
            ================================================== */}

                    <tr style={{ height: hauteurFaveur }}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    paddingLeft: 6,
                                }}
                            >
                                Faveur
                            </Cell>
                        )}

                        {tours.map((tour) => {
                            const nombre = faveur[tour - 1] || 0;

                            return (
                                <Cell key={tour}>
                                    <span><b>
                                        {nombre > 0 &&
                                            `Encaisser des faveurs${nombre > 1
                                                ? ` ${nombre} fois`
                                                : ""
                                            }`}
                                    </b></span>
                                </Cell>
                            );
                        })}
                    </tr>


                    {/* ==================================================
            AGENDA
            ================================================== */}

                    <tr style={{ height: "auto" }}>
                        {labelColumn && (
                            <Cell
                                style={{
                                    backgroundColor: couleurEntete,
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    verticalAlign: "top",
                                    padding: 6,
                                }}
                            >
                                Agenda
                            </Cell>
                        )}

                        {tours.map((tour) => (
                            <Cell
                                key={tour}
                                style={{
                                    height: "100%",
                                    verticalAlign: "top",
                                    textAlign: "left",
                                    padding: 7,
                                }}
                            >
                                <AgendaContent tour={tour} />
                            </Cell>
                        ))}
                    </tr>

                </tbody>
            </table>
        );
    }


    // ============================================================
    // RENDU — 2 DIVS DISTINCTS POUR L'IMPRESSION
    // ============================================================

    return (
        <div style={containerStyle}>

            {/* PAGE 1 — TOURS 1 À 5 */}
            <div
                style={{
                    ...pageStyle,
                    pageBreakAfter: "always",
                    breakAfter: "page",
                }}
            >
                <HeaderPage pageIndex={0} />

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <TablePage pageIndex={0} />
                </div>
            </div>

            {/* PAGE 2 — TOURS 6 À 10 */}
            <div
                style={{
                    ...pageStyle,
                    pageBreakAfter: "auto",
                    breakAfter: "auto",
                }}
            >
                <HeaderPage pageIndex={1} />

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <TablePage pageIndex={1} />
                </div>
            </div>
        </div>
    );
}

// ============================================================
// FORM
// ============================================================

function Form({ content, onChange, onSubmit, style }) {
    return (
        <FormBase
            content={content}
            onChange={onChange}
            onSubmit={onSubmit}
            style={style}
        />
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


