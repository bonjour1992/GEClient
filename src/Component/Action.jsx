import {
    Eye,
    Pencil,
    Copy,
    Trash2,
    History,
    RotateCcw
} from "lucide-react";

import {
    NavLink,
    useNavigate,
    useLocation
} from "react-router";

import {
    deleteElement,
    restoreElement
} from "../lib/fetch";


export function Action({
    jeu,
    type,
    id,
    version
}) {

    const navigate = useNavigate();
    const location = useLocation();

    const isVersion =
        !!version;

    const voirPath =
        `/GE/${jeu}/${type}/${id}`;

    const versionsPath =
        `/GE/${jeu}/${type}/${id}/versions`;

    const isCurrentPage =
        location.pathname === voirPath;


    async function suppr() {

        const confirmation = window.confirm(
            "Êtes-vous sûr de vouloir supprimer cet élément ?"
        );

        if (!confirmation) {
            return;
        }

        try {

            await deleteElement(
                id,
                jeu
            );

            navigate(
                `/GE/${jeu}/${type}`
            );

        } catch (e) {

            console.error(e);

            alert(
                "Impossible de supprimer l'élément."
            );
        }
    }


    async function restore() {

        const confirmation = window.confirm(
            "Êtes-vous sûr de vouloir restaurer cette version ?"
        );

        if (!confirmation) {
            return;
        }

        try {

            await restoreElement(
                id,
                version,
                jeu
            );

            navigate(
                voirPath
            );

        } catch (e) {

            console.error(e);

            alert(
                "Impossible de restaurer cette version."
            );
        }
    }


    return (
        <div className="actions">

            {/* Voir l'élément actuel */}
            {!isCurrentPage && (

                <NavLink
                    to={voirPath}
                    className="action-button"
                    title="Voir la version actuelle"
                >
                    <Eye size={18} />
                </NavLink>

            )}


            {/* Actions uniquement disponibles
                sur la version actuelle */}
            {!isVersion && (

                <>

                    <NavLink
                        to={
                            `/GE/${jeu}/${type}/${id}/edit`
                        }
                        className="action-button"
                        title="Éditer"
                    >
                        <Pencil size={18} />
                    </NavLink>


                    <NavLink
                        to={
                            `/GE/${jeu}/${type}/${id}/duplicate`
                        }
                        className="action-button"
                        title="Dupliquer"
                    >
                        <Copy size={18} />
                    </NavLink>

                </>

            )}


            {/* Historique disponible
                depuis les deux contextes */}
            <NavLink
                to={versionsPath}
                className="action-button"
                title="Voir les versions"
            >
                <History size={18} />
            </NavLink>


            {/* Restaurer uniquement
                lorsqu'on regarde une ancienne version */}
            {isVersion && (

                <button
                    className="action-button"
                    title="Restaurer cette version"
                    onClick={restore}
                >
                    <RotateCcw size={18} />
                </button>

            )}


            {/* Suppression uniquement
                sur la version actuelle */}
            {!isVersion && (

                <button
                    className="action-button delete-button"
                    title="Supprimer"
                    onClick={suppr}
                >
                    <Trash2 size={18} />
                </button>

            )}

        </div>
    );
}
