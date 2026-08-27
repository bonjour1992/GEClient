import React, { useState } from "react";

export default function FreeTagInput({ value, name, onChange,label }) {
    let tags = value[name] || []
    const [input, setInput] = useState("");

    const addTag = (value) => {
        const tag = value.trim();

        if (!tag || tags.includes(tag)) return;

        onChange(name, [...tags, tag]);
        setInput("");
    };

    const removeTag = (tagToRemove) => {
        onChange(name, tags.filter((tag) => tag !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
        }

        // Backspace sur un champ vide = supprimer le dernier tag
        if (e.key === "Backspace" && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
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
                boxSizing: "border-box",
            }}
        >
            {label?<p>{label}:</p>:""}
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
                        fontSize: "14px",
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
                            lineHeight: 1,
                        }}
                    >
                        ×
                    </button>
                </span>
            ))}

            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addTag(input)}
                placeholder={tags.length === 0 ? "Ajouter un tag..." : ""}
                style={{
                    flex: 1,
                    minWidth: "120px",
                    border: "none",
                    outline: "none",
                    fontSize: "14px",
                    padding: "4px",
                    background: "transparent",
                }}
            />
        </div>
    );
}