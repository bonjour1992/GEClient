import { Navigate, Outlet } from "react-router";
import { useUser } from "../lib/store";

export default function RequireAuth() {
    const login = useUser((state) => state.login);

    if (!login) {
        return <Navigate to="/GE/login" replace />;
    }

    return <Outlet />;
}
