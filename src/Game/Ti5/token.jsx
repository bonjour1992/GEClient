import { ElementContent } from "../../lib/datatype";
import { EnumInput } from "../../Input/EnumInput";
import { NumberInput } from "../../Input/NumberInput";
import { ImagePicker } from "../../Input/ImagePicker.jsx";
import { ColorInput } from "../../Input/ColorInput.jsx";
import FormBase from "../../Input/FormBase";
import { pub } from "../../lib/fetch";

// ============================================================
// TOKEN
//
// Jeton à imprimer et découper : une forme (rond ou triangle),
// une image au centre et une couleur de fond.
//   rond      : trous de ver...
//   triangle  : faveurs...
// La taille est en millimètres à l'impression (A4 = 794 px pour
// 210 mm, soit 3,78 px par mm).
// ============================================================

export const formesToken = {
    rond: "Rond",
    triangle: "Triangle",
};

const PX_PAR_MM = 794 / 210;

class Token extends ElementContent {
    forme = "rond"
    img = ""
    couleur = "#FFFFFF"
    // Diamètre (rond) ou côté (triangle), en mm
    taille = 20
}

function Display({ content, style = {} }) {

    const cote = (Number(content.taille) || 20) * PX_PAR_MM;
    const triangle = content.forme === "triangle";
    // Triangle équilatéral : hauteur = côté × √3 / 2
    const hauteur = triangle ? cote * Math.sqrt(3) / 2 : cote;

    return (
        <div
            data-token={content.forme}
            title={content.name}
            style={{
                width: cote,
                height: hauteur,
                backgroundColor: content.couleur || "#FFFFFF",
                boxSizing: "border-box",
                display: "flex",
                alignItems: triangle ? "flex-end" : "center",
                justifyContent: "center",
                overflow: "hidden",
                ...(triangle
                    ? { clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }
                    : { borderRadius: "50%", border: "1px solid #444" }),
                ...style,
            }}
        >
            {content.img && (
                <img
                    src={pub + content.img}
                    alt={content.name}
                    style={triangle
                        // Dans le triangle : l'image est centrée sur le centre de gravité (au 2/3 de la hauteur)
                        ? { width: cote * 0.5, height: cote * 0.5, objectFit: "contain", marginBottom: hauteur / 3 - cote * 0.25 }
                        : { width: "92%", height: "92%", objectFit: "contain" }}
                />
            )}
        </div>
    );
}

function Form({ content, onChange, onSubmit, style }) {
    return (
        <FormBase content={content} onChange={onChange} onSubmit={onSubmit} style={style}>
            <EnumInput onChange={onChange} name="forme" value={content} enumClass={formesToken} label="Forme" />
            <NumberInput onChange={onChange} name="taille" value={content} min={5} max={100} label="Taille (mm)" />
            <ColorInput onChange={onChange} name="couleur" value={content} />
            <ImagePicker onChange={onChange} name="img" value={content} />
        </FormBase>
    );
}

export default {
    name: "Token", classe: Token, form: Form, display: { default: Display },
    print: { numPage: 80, padding: 20, bgColor: "#FFFFFF", page: "A4 portrait" }
}
