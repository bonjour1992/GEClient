import { useParams } from "react-router";
import { getTool } from "../Game/games";

export default function Tool() {

    const { jeu, tool } = useParams();

    const toolData = getTool(jeu, tool);

    if (!toolData) {
        return (
            <div>
                Outil introuvable
            </div>
        );
    }

    const ToolComponent = toolData.component;

    if (!ToolComponent) {
        return (
            <div>
                Composant de l'outil introuvable
            </div>
        );
    }

    return (
        <ToolComponent />
    );
}
