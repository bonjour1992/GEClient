import { useEffect, useState } from "react";

// ============================================================
// VERSION DE L'OUTIL
//
// Une page restée ouverte garde le code et les noms d'éléments de
// son chargement : après un déploiement, elle joue avec une version
// périmée (anciens noms de phase, règles d'avant). Ce bandeau compare
// le script de la page à celui que sert le site (à l'ouverture de la
// partie, puis toutes les 5 minutes) et propose de recharger quand
// ils diffèrent. Sans script déployé reconnaissable (serveur de
// développement), il ne fait rien.
// ============================================================

const RE_SCRIPT = /assets\/index-[\w-]+\.js/;
const PERIODE = 5 * 60 * 1000;

export function VersionOutil() {

    const [perimee, setPerimee] = useState(false);

    useEffect(() => {

        const actuel = RE_SCRIPT.exec([...document.querySelectorAll("script[src]")].map(s => s.src).join(" "))?.[0];

        if (!actuel) {
            return undefined;
        }

        let arrete = false;

        const verifier = async () => {
            try {
                const page = await (await fetch(window.location.pathname, { cache: "no-store" })).text();
                const servi = RE_SCRIPT.exec(page)?.[0];

                if (!arrete && servi && servi !== actuel) {
                    setPerimee(true);
                }
            } catch {
                // (hors ligne : on réessaiera)
            }
        };

        verifier();

        const minuteur = window.setInterval(verifier, PERIODE);

        return () => {
            arrete = true;
            window.clearInterval(minuteur);
        };
    }, []);

    return perimee && (
        <div
            data-version-perimee
            style={{
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6, padding: "6px 10px",
                border: "2px solid #b71c1c", borderRadius: 8, backgroundColor: "#ffebee", color: "#000", fontSize: 14,
            }}
        >
            <b>Une nouvelle version de l'outil est en ligne.</b>
            <span>Cette page utilise l'ancienne : rechargez-la pour jouer avec les règles et les noms à jour.</span>
            <button type="button" onClick={() => window.location.reload()} style={{ fontWeight: "bold" }}>Recharger la page</button>
        </div>
    );
}
