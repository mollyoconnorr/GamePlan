import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoadingPage from "../pages/LoadingPage";

interface RequireAuthProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export default function RequireAuth({
                                        children,
                                        redirectTo = "/",
                                    }: RequireAuthProps) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingPage />;

    if (!user) {
        return (
            <Navigate
                to={redirectTo}
                replace
                state={{ from: location }}
            />
        );
    }

    return <>{children}</>;
}