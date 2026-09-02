import { LoadLink } from "../../../Component/LoadAndDisplay";
import { Link } from "../../../lib/datatype";
import { Text } from "../../../Component/Text";
import { TableInput } from "../../../Input/TableInput";
import { NumberInput } from "../../../Input/NumberInput";
import { ModalPickerInput } from "../../../Input/ModalPickerInput";
import { BooleanInput } from "../../../Input/BooleanInput";
import { EditorInput } from "../../../Input/EditorInput";
import React from "react";
import { stripTags } from "../../../Input/EditorInput";

export class JetCarac {
    competence = []
    competenceDiff = []
    competenceNum = 0
    difficulte = 0
    jetBrut = false
    numDe
    modificateurDifficulte = []
    modificateurDifficulteText = []
    modificateurDifficulteNum = 0
    modificateurJet = ""
}

function formatNombre(x) {
    if (x === 0) {
        return "";
    }

    return x > 0 ? `+${x}` : `${x}`;
}

export function FormJet({ onChange, content }) {
    function competenceLine(x) {
        return [(<ModalPickerInput onChange={onChange} name={"competence"} value={content} index={x} type={["competence"]} />),
        (<NumberInput onChange={onChange} name={"competenceDiff"} value={content} index={x} label="Bonus" />),

        ]
    }

    function modificateurDifficulteLine(x) {
        return [
            (<EditorInput onChange={onChange} name={"modificateurDifficulteText"} value={content} index={x} type="compact" />),
            (<NumberInput onChange={onChange} name={"modificateurDifficulte"} value={content} index={x} label="Bonus" />),
        ]
    }
    return (<>
        <TableInput onChange={onChange} Line={competenceLine} name="competenceNum" value={content} label="JET : Competence" composant={["competence", "competenceDiff"]} />
        <NumberInput onChange={onChange} name={"numDe"} value={content} label={"Nb Dé"} />
        <BooleanInput onChange={onChange} name={"jetBrut"} value={content} label="Jet brut?" />
        <NumberInput onChange={onChange} name={"difficulte"} value={content} min={-10} max={10} label={content.jetBrut ? "valeur" : "Bonus"} />
        <TableInput onChange={onChange} Line={modificateurDifficulteLine} name="modificateurDifficulteNum" value={content} label="Modificateur de difficulte" composant={["modificateurDifficulteText", "modificateurDifficulte"]} />
        <EditorInput onChange={onChange} name="modificateurJet" value={content} label="Autres infos Jet" />
    </>)
}

export function Jet({ content, explication }) {
    const {
        competence = [],
        competenceDiff = [],
        competenceNum = 0,
        difficulte = 0,
        jetBrut = false,
        numDe,
        modificateurDifficulte = [],
        modificateurDifficulteText = [],
        modificateurDifficulteNum = 0,
        modificateurJet = ""
    } = content || {};

    const hasModificateurDifficulte =
        modificateurDifficulteNum > 0;

    if (!competenceNum > 0 && !numDe && !hasModificateurDifficulte) {
        return stripTags(modificateurJet) ? (
            <Text text={modificateurJet} rule={explication} />
        ) : null;
    }

    function renderCompetences(competences) {
        return competences.map((comp, index) => (
            <React.Fragment key={index}>
                {index > 0 && (
                    <span >
                        /
                    </span>
                )}

                <LoadLink
                    link={comp}
                    style={{ display: "inline" }}
                />
            </React.Fragment>
        ));
    }

    function renderPremiereLigne() {
        if (numDe) {
            return (
                <span style={{ fontWeight: 800 }}>
                    {numDe}
                </span>
            );
        }

        return (
            <span style={{ display: "inline-flex" }}>
                Puissance ({renderCompetences(competence)})
            </span>
        );
    }

    function getCompetencesParDiff() {
        const groupes = new Map();

        for (let i = 0; i < competenceNum; i++) {
            const comp = competence[i];
            const diff = competenceDiff[i];


            if (!groupes.has(diff || 0)) {
                groupes.set(diff || 0, []);
            }

            groupes.get(diff || 0).push(comp);
        }

        return groupes;
    }

    const groupesCompetences = getCompetencesParDiff();

    const hasCompetenceDiff = groupesCompetences.size > 1;

    const hasTableauDifficulte = hasCompetenceDiff || hasModificateurDifficulte;

    const hasCompetenceUnique = groupesCompetences.size === 1 && [...groupesCompetences.values()][0].length > 0;


    return (
        <div      >
            {/* Première ligne */}
            {(numDe || competenceNum > 0) && (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                }}                >
                    <span aria-hidden="true"                   >
                        🎲
                    </span>

                    {renderPremiereLigne()}

                    <span style={{ fontWeight: 800 }}                    >
                        D10
                    </span>
                </div>
            )}

            {/* Seuil simple */}
            {!hasTableauDifficulte && (
                <div>
                    <span style={{ fontWeight: "bold" }}                  >
                        Seuil de réussite:
                    </span>{" "}

                    {!jetBrut ? (<span>Maîtrise

                        {(numDe && hasCompetenceUnique) ? (
                            <>
                                {" ("}
                                {renderCompetences(
                                    [...groupesCompetences.values()][0]
                                )}
                                {")"}
                            </>
                        ) : null}

                        {difficulte ? (<span> {formatNombre(difficulte)}</span>) : null}
                    </span>) : <span>{difficulte}</span>}
                </div>
            )}

            {/* Tableau des difficultés */}
            {hasTableauDifficulte && (
                <table style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: "0.90em"
                }}               >
                    <tbody>

                        {/* Difficultés des compétences */}
                        {[...groupesCompetences.entries()].map(
                            ([diff, competences]) => {
                                const seuil =
                                    Number(difficulte || 0) +
                                    Number(diff || 0);

                                return (
                                    <tr
                                        key={`diff-${diff}`}
                                    >
                                        <td style={{
                                            padding: "3px 8px 3px 0",
                                            verticalAlign: "top",
                                            whiteSpace: "nowrap"
                                        }}>
                                            <span style={{ fontWeight: "bold" }}                                           >
                                                Seuil de réussite:
                                            </span>
                                        </td>

                                        <td style={{
                                            padding: "3px 0",
                                            display: "inline-flex"
                                        }}                                       >
                                            {"Maîtrise ("}
                                            {renderCompetences(competences)}
                                            {") "}

                                            <span style={{ fontWeight: "bold" }}                                           >
                                                {formatNombre(seuil)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }
                        )}

                        {/* Modificateurs de difficulté */}
                        {Array.from(
                            { length: modificateurDifficulteNum },
                            (_, index) => {
                                const valeur = modificateurDifficulte[index];

                                if (!valeur) return null;


                                return (
                                    <tr key={`mod-${index}`}                                   >
                                        <td style={{
                                            padding: "3px 8px 3px 0",
                                            verticalAlign: "top",
                                            maxWidth: "70%"
                                        }}
                                        >
                                            <Text text={modificateurDifficulteText[index]} rule={explication} />
                                        </td>

                                        <td
                                            style={{
                                                padding: "3px 0",
                                                fontWeight: "bold"
                                            }}                                       >
                                            {formatNombre(valeur)}
                                        </td>
                                    </tr>
                                );
                            }
                        )}
                    </tbody>
                </table>
            )}

            {modificateurJet && (<Text text={modificateurJet} rule={explication} />)}
        </div>
    );
}
