import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import LoadingPage from "../pages/LoadingPage";
import * as React from "react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading, login } = useAuth();

    useEffect(() => {
        if (!loading && !user) login();
    }, [loading, user, login]);

    if (loading) return <LoadingPage />;
    if (!user) return null; // redirect already initiated

    return <>{children}</>;
}