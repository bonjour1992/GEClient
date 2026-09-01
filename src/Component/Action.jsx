import { Eye, Pencil, Copy, Trash2 } from "lucide-react";
import { NavLink, useNavigate,useLocation } from "react-router";
import { deleteElement } from "../lib/fetch";


export function Action({ jeu, type, id }) {
    let navigate = useNavigate();
    const location = useLocation();

    const voirPath = `/GE/${jeu}/${type}/${id}`;
    const isCurrentPage = location.pathname === voirPath;

    function suppr() {
        const confirmation = window.confirm(
            "Êtes-vous sûr de vouloir supprimer cet élément ?"
        );

        if (!confirmation) {
            return;
        }

        const f = async () => {
            const res = await deleteElement(id);
            navigate("/GE/" + jeu + "/" + type);
        };

        f();
    }

    return (
        <div className="actions">
            {!isCurrentPage && (
                <NavLink
                    to={voirPath}
                    className="action-button"
                    title="Voir"
                >
                    <Eye size={18} />
                </NavLink>
            )}

            <NavLink
                to={"/GE/" + jeu + "/" + type + "/" + id + "/edit"}
                className="action-button"
                title="Éditer"
            >
                <Pencil size={18} />
            </NavLink>

            <NavLink
                to={"/GE/" + jeu + "/" + type + "/" + id + "/duplicate"}
                className="action-button"
                title="Dupliquer"
            >
                <Copy size={18} />
            </NavLink>
            <button
                className="action-button delete-button"
                title="Supprimer"
                onClick={suppr}
            >
                <Trash2 size={18} />
            </button>
        </div>
    )
}