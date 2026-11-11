import { useEffect, useState } from "react"
import { getHandler } from "../Game/games"
import { NavLink, useParams } from "react-router"
import { getElement } from "../lib/fetch"
import { Link } from "../lib/datatype"

export function LoadAndDisplay({ link, style, displayeur, context }) {
    const jeu = useParams().jeu

    // On ne cherche le handler que si link et link.type existent
    const handler = link?.type ? getHandler(jeu, link.type) : null
    const classe = handler?.classe

    // Le hook est toujours créé.
    // Le contenu est gardé avec le type d'élément auquel il appartient : quand
    // le lien change de type (sélecteur qui passe d'une relique à une feuille de
    // technologie...), le contenu précédent reste là jusqu'à la fin du chargement,
    // et ne doit pas être donné à l'affichage du nouveau type.
    const [charge, setCharge] = useState(() => ({ type: link?.type, elem: classe ? new classe() : null }))

    const elem = charge.type === link?.type ? charge.elem : null

    useEffect(() => {
        let cancelled = false;

        const setElem = contenu => setCharge({ type: link?.type, elem: contenu })

        async function charger() {
            if (!handler || !classe) {
                setElem(null);
                return;
            }

            if (link?.id !== undefined && link?.id !== -1) {
                try {
                    const resultat = await getElement(link.id);

                    if (!cancelled) {
                        setElem(resultat.content);
                    }
                } catch (error) {
                    console.error("Erreur de chargement du système :", error);
                }
            } else if (!cancelled) {
                setElem(new classe());
            }
        }

        charger();

        return () => {
            cancelled = true;
        };
    }, [link?.id, link?.type, jeu]);

    // Le hook est créé avant ce return
    if (!link?.type || !handler) {
        return null
    }

    const Display = handler.display[displayeur || "default"]

    if (!Display || !elem) {
        return null
    }

    return (
        <Display
            content={elem}
            style={style}
            context={context}
        />
    )
}

export function LoadLink({ link = new Link, style, displayeur = "nom", context, explication }) {

    useEffect(() => {
        if (explication) {
            explication.addLien(link)
        }
    }, [explication, link.id])
    return (
        <NavLink to={"../" + link.type + "/" + link.id}>
            <LoadAndDisplay link={link} style={style} displayeur={displayeur} context={context} />
        </NavLink>
    )
}