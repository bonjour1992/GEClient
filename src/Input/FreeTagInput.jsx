import React, { useEffect, useRef, useState } from "react";
import { useTags } from "../lib/store";
import { createPortal } from "react-dom";

export default function FreeTagInput({
    value,
    name,
    onChange,
    label,
    index,
    tagType
}) {
    const tags = (
        index !== undefined
            ? value[name][index]
            : value[name]
    ) || [];

    const [input, setInput] = useState("");
    const [suggestionPosition, setSuggestionPosition] = useState(null);

    const inputRef = useRef(null);

    const availableTags = useTags(
        state => tagType
            ? state.tags[tagType]
            : undefined
    ) || [];

    const addTagToStore = useTags(
        state => state.add
    );

    /*
     * Charge les tags lorsque tagType est utilisé.
     */
    useEffect(() => {
        if (tagType) {
            useTags.getState().update();
        }
    }, [tagType]);

    /*
     * Tags correspondant à ce que l'utilisateur tape.
     */
    const suggestions = tagType && input.trim()
        ? availableTags.filter(tag =>
            tag.toLowerCase().includes(
                input.trim().toLowerCase()
            )
        )
        : [];

    const showSuggestions =
        tagType &&
        input.trim() &&
        suggestions.length > 0;

    /*
     * Met à jour la position du menu.
     *
     * getBoundingClientRect() donne une position relative
     * à la fenêtre, ce qui correspond exactement à un
     * élément positionné en "fixed".
     */
    const updateSuggestionPosition = () => {
        if (!inputRef.current) {
            return;
        }

        const rect = inputRef.current.getBoundingClientRect();

        setSuggestionPosition({
            top: rect.bottom,
            left: rect.left,
            width: rect.width
        });
    };

    /*
     * Met à jour la position lorsque les suggestions apparaissent.
     */
    useEffect(() => {
        if (!showSuggestions) {
            setSuggestionPosition(null);
            return;
        }

        updateSuggestionPosition();

        window.addEventListener(
            "scroll",
            updateSuggestionPosition,
            true
        );

        window.addEventListener(
            "resize",
            updateSuggestionPosition
        );

        return () => {
            window.removeEventListener(
                "scroll",
                updateSuggestionPosition,
                true
            );

            window.removeEventListener(
                "resize",
                updateSuggestionPosition
            );
        };
    }, [showSuggestions, input]);

    const addTag = async (value) => {
        const tag = value.trim();

        if (!tag || tags.includes(tag)) {
            setInput("");
            return;
        }

        /*
         * Avec tagType, le tag est ajouté en BDD.
         */
        if (tagType) {
            try {
                await addTagToStore(tagType, tag);
            } catch (error) {
                console.error(
                    "Impossible de créer le tag",
                    error
                );
                return;
            }
        }

        onChange(
            name,
            [...tags, tag],
            index
        );

        setInput("");
    };

    const removeTag = (tagToRemove) => {
        onChange(
            name,
            tags.filter(tag => tag !== tagToRemove),
            index
        );
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
            return;
        }

        if (
            e.key === "Backspace" &&
            !input &&
            tags.length > 0
        ) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const selectSuggestion = (tag) => {
        addTag(tag);
    };

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px",
                padding: "8px",
                minHeight: "42px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "#fff",
                boxSizing: "border-box"
            }}
        >
            {label && (
                <p>{label}:</p>
            )}

            {tags.map((tag) => (
                <span
                    key={tag}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#eef2ff",
                        color: "#3730a3",
                        fontSize: "14px"
                    }}
                >
                    {tag}

                    <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: "#6366f1",
                            cursor: "pointer",
                            padding: 0,
                            fontSize: "16px",
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </span>
            ))}

            <div
                style={{
                    position: "relative",
                    flex: 1,
                    minWidth: "120px"
                }}
            >
                <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) =>
                        setInput(e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        if (input.trim()) {
                            setTimeout(() => {
                                addTag(input);
                            }, 150);
                        }
                    }}
                    placeholder={
                        tags.length === 0
                            ? "Ajouter un tag..."
                            : ""
                    }
                    style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        fontSize: "14px",
                        padding: "4px",
                        background: "transparent",
                        boxSizing: "border-box"
                    }}
                />
            </div>

            {showSuggestions &&
                suggestionPosition &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            top: suggestionPosition.top,
                            left: suggestionPosition.left,
                            width: suggestionPosition.width,
                            backgroundColor: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            boxShadow:
                                "0 2px 8px rgba(0,0,0,0.15)",
                            zIndex: 999999
                        }}
                    >
                        {suggestions.map(tag => (
                            <div
                                key={tag}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectSuggestion(tag);
                                }}
                                style={{
                                    padding: "6px 8px",
                                    cursor: "pointer"
                                }}
                            >
                                {tag}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}
