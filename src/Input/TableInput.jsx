

import { useState } from "react";
import { Label } from "./inputUtils";

export function TableInput({
    Line,
    header,
    label,
    className,
    max,
    name,
    value,
    index,
    onChange,
    composant
}) {
    const val = index !== undefined
        ? value[name][index]
        : value[name];

    // Ordre visuel des lignes
    const [order, setOrder] = useState(() =>
        Array.from({ length: val }, (_, i) => i)
    );

    const [draggedRow, setDraggedRow] = useState(null);

    // Ajouter une ligne
    function addLine(event) {
        event.preventDefault();

        onChange(name, val + 1, index);

        // Nouvelle ligne à la fin
        setOrder(prev => [...prev, val]);
    }

    // Supprimer une ligne précise
    function removeLine(rowIndex, event) {
        event.preventDefault();

        onChange(name, val - 1, index, {
            action: "remove",
            rowIndex
        });

        setOrder(prev =>
            prev
                .filter(i => i !== rowIndex)
                .map(i => i > rowIndex ? i - 1 : i)
        );
    }

    // Début du drag
    function handleDragStart(rowIndex) {
        setDraggedRow(rowIndex);
    }

    function handleDrop(targetIndex, event) {
        event.preventDefault();

        if (draggedRow === null || draggedRow === targetIndex) {
            setDraggedRow(null);
            return;
        }

        // On travaille à partir de l'ordre actuel
        const newOrder = [...order];

        const draggedPosition = newOrder.indexOf(draggedRow);
        const targetPosition = newOrder.indexOf(targetIndex);

        if (draggedPosition === -1 || targetPosition === -1) {
            setDraggedRow(null);
            return;
        }

        // Calcul du nouvel ordre
        newOrder.splice(draggedPosition, 1);
        newOrder.splice(targetPosition, 0, draggedRow);

        /*
         * On réordonne tous les tableaux à partir
         * EXACTEMENT du même snapshot de value.
         */
        if (composant) {
            composant.forEach((tableau) => {
                if (!Array.isArray(value[tableau])) {
                    return;
                }

                const nouveauTableau = newOrder.map(
                    index => value[tableau][index]
                );

                onChange(tableau, nouveauTableau);
            });
        }

        setOrder(
            Array.from({ length: val }, (_, i) => i)
        );

        setDraggedRow(null);
    }
    function handleDragOver(event) {
        event.preventDefault();
    }

    return (
        <div className={className + " table-input"}>

            {label && (
                <Label name={label} />
            )}
            <button
                type="button"
                onClick={addLine}
                disabled={
                    max !== undefined &&
                    val >= max
                }
                className="add-row"
            >
                Ajouter une ligne
            </button>
            <div className="table-input-container">

                <table style={{
                    width: "100%"
                }}>

                    {header && (
                        <thead>
                            <tr>
                                <th className="drag-column"></th>
                                <th>{header}</th>
                                <th className="action-column"></th>
                            </tr>
                        </thead>
                    )}

                    <tbody>
                        {order.map((rowIndex) => (
                            <tr
                                key={rowIndex}
                                onDragOver={handleDragOver}
                                onDrop={(event) =>
                                    handleDrop(rowIndex, event)
                                }
                                className={
                                    draggedRow === rowIndex
                                        ? "dragging"
                                        : ""
                                }
                                style={{
                                    width: "100%"
                                }}
                            >

                                <td className="drag-column">
                                    <span
                                        className="drag-handle"
                                        draggable
                                        onDragStart={(event) => {
                                            event.stopPropagation();
                                            handleDragStart(rowIndex);
                                        }}
                                        title="Déplacer"
                                    >
                                        ⋮⋮
                                    </span>
                                </td>

                                {Line(rowIndex).map((l, j) => (
                                    <td key={j}>
                                        {l}
                                    </td>
                                ))}

                                <td className="action-column">
                                    <button
                                        type="button"
                                        className="remove-row"
                                        onClick={(event) =>
                                            removeLine(rowIndex, event)
                                        }
                                        title="Supprimer cette ligne"
                                        aria-label="Supprimer cette ligne"
                                    >
                                        ×
                                    </button>
                                </td>

                            </tr>
                        ))}
                    </tbody>


                </table>

            </div>

            <style jsx>{`

                .table-input {
                    display: block;
                    width: 100%;
                }

                .table-input-container {
                    width: 100%;
                    overflow-x: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }





                tbody tr:last-child td {
                    border-bottom: none;
                }

                .drag-column {
                    width: 36px;
                    padding-left: 10px;
                    padding-right: 0;
                }

                .action-column {
                    width: 44px;
                    text-align: center;
                    padding-left: 4px;
                    padding-right: 8px;
                }

                .drag-handle {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 28px;
                    color: #94a3b8;
                    cursor: grab;
                    user-select: none;
                    font-size: 18px;
                    letter-spacing: -3px;
                    border-radius: 5px;
                }

                .drag-handle:hover {
                    color: #475569;
                    background: #e2e8f0;
                }

                .drag-handle:active {
                    cursor: grabbing;
                }

                .dragging {
                    opacity: 0.45;
                    background: #eff6ff;
                }

                .remove-row {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border: none;
                    border-radius: 6px;
                    background: transparent;
                    color: #94a3b8;
                    font-size: 20px;
                    line-height: 1;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .remove-row:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .table-input-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 10px;
                }

                .add-row {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 7px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 7px;
                    background: white;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .add-row:hover:not(:disabled) {
                    border-color: #94a3b8;
                    background: #f8fafc;
                }

                .add-row:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }

            `}</style>

        </div>
    );
}

