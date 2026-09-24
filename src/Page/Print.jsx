
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getHandler } from "../Game/games";
import { getFromType, useSearch } from "../lib/store";
import { LoadAndDisplay } from "../Component/LoadAndDisplay";
import { Link } from "../lib/datatype";
import { A3Pa, A3Po, A4Pa, A4Po } from "../Component/Size";

const pageOption = {
    "A4 paysage": A4Pa,
    "A4 portrait": A4Po,
    "A3 paysage": A3Pa,
    "A3 portrait": A3Po,
};

export default function Print() {
    const { elem: type, jeu } = useParams();

    const search = useSearch((state) => state.search);

    const handler = getHandler(jeu, type);
    const configPrint = handler?.print ?? {};

    const [disp, setDisp] = useState("default");
    const [print, setPrint] = useState(() => new Map());

    const [rotate, setRotate] = useState(false);
    const [bg, setBg] = useState(false);

    const [bgColor, setBgColor] = useState(
        configPrint.bgColor ?? "#000000"
    );

    const [padding, setPadding] = useState(
        configPrint.padding ?? 0
    );

    const [numPage, setNumPage] = useState(
        configPrint.numPage ?? 12
    );

    const [page, setPage] = useState(
        configPrint.page ?? "A4 paysage"
    );

    // Recharge la configuration lorsqu'on change de jeu ou de type.
    useEffect(() => {
        const config = getHandler(jeu, type)?.print ?? {};

        setBgColor(config.bgColor ?? "#000000");
        setNumPage(config.numPage ?? 12);
        setPadding(config.padding ?? 0);
        setPage(config.page ?? "A4 paysage");

        // Réinitialise les quantités sélectionnées pour le nouvel élément.
        setPrint(new Map());
        setDisp("default");
        setRotate(false);
        setBg(false);
    }, [jeu, type]);

    function onChange(e) {
        const id = parseInt(e.target.name, 10);
        const value = Math.max(0, parseInt(e.target.value, 10) || 0);

        setPrint((previous) => {
            const next = new Map(previous);
            next.set(id, value);
            return next;
        });
    }

function printAll() {
    const res = new Map();

    getFromType(search, type).forEach((e) => {
        const match = e.name.match(/^!(\d+)!/);
        const quantity = match ? parseInt(match[1], 10) : 1;

        res.set(e.id, quantity);
    });

    setPrint(res);
}

    const elements = Array.from(print.entries()).flatMap(([id, count]) =>
        Array.from({ length: count || 0 }, (_, j) => (
            <LoadAndDisplay
                displayeur={disp}
                key={`${id}-${j}`}
                link={new Link(type, id)}
            />
        ))
    );

    const pages = [];

    for (let i = 0; i < elements.length; i += Math.max(1, numPage || 1)) {
        pages.push(elements.slice(i, i + Math.max(1, numPage || 1)));
    }

    return (
        <>
            <div className="no-print">
                <label htmlFor="displayeur">Displayeur :</label>

                <select
                    id="displayeur"
                    value={disp}
                    onChange={(e) => setDisp(e.target.value)}
                >
                    {Object.keys(handler?.display ?? {}).map((key) => (
                        <option key={key} value={key}>
                            {key}
                        </option>
                    ))}
                </select>

                <label htmlFor="page">Page :</label>

                <select
                    id="page"
                    value={page}
                    onChange={(e) => setPage(e.target.value)}
                >
                    {Object.keys(pageOption).map((key) => (
                        <option key={key} value={key}>
                            {key}
                        </option>
                    ))}
                </select>

                <label htmlFor="mir">Miroir :</label>
                <input
                    id="mir"
                    type="checkbox"
                    checked={rotate}
                    onChange={(e) => setRotate(e.target.checked)}
                />

                <label htmlFor="bg">Fond complet :</label>
                <input
                    id="bg"
                    type="checkbox"
                    checked={bg}
                    onChange={(e) => setBg(e.target.checked)}
                />

                <label htmlFor="bgColor">Couleur du fond :</label>
                <input
                    id="bgColor"
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="#000000"
                />

                <label htmlFor="padding">Padding :</label>
                <input
                    id="padding"
                    type="number"
                    value={padding}
                    onChange={(e) => setPadding(Number(e.target.value))}
                />

                <label htmlFor="numPage">Nombre par page :</label>
                <input
                    id="numPage"
                    type="number"
                    min={1}
                    value={numPage}
                    onChange={(e) =>
                        setNumPage(
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                    }
                />

                <br />

                <button onClick={printAll}>
                    Sélectionner tous
                </button>

                {getFromType(search, type).map((e) => (
                    <p key={e.id}>
                        <input
                            type="number"
                            name={String(e.id)}
                            min={0}
                            value={print.get(e.id) ?? 0}
                            onChange={onChange}
                        />

                        {e.name}
                    </p>
                ))}
            </div>

            {pages.map((pageElements, pageIndex) => (
                <div
                    key={pageIndex}
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        ...pageOption[page],
                        transform: rotate ? "scaleX(-1)" : "",
                        padding: `${padding}px`,
                        ...(bg ? { backgroundColor: bgColor } : {}),
                    }}
                >
                    {pageElements}
                </div>
            ))}
        </>
    );
}