import {createContext, useContext, useEffect, useMemo, useState} from "react";
import type {AuthState, User} from "../types.ts";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Store user object
    const [user, setUser] = useState<User | null>(null);

    // Keep track of if page is loading
    const [loading, setLoading] = useState(true);

    /**
     * Refreshes user object by calling backend to reauth user.
     */
    const refresh = async () => {
        setLoading(true);
        try {
            // Call backend to refetch user data
            const res = await fetch("/api/user");

            // If not code 200 (ok), user is not auth
            if (!res.ok) {
                setUser(null);
                return;
            }
            const data = await res.json();
            setUser(data);

            // Any error usually means the user wasn't properly
        } catch (error) {
            console.error(`Error authenticating user: ${error}`);
            setUser(null);
            return;
        } finally {
            setLoading(false);
        }
    };

    // Refresh when this component is loaded.
    useEffect(() => {
        refresh();
    }, []);

    // Only recompute this object if user or loading state changes.
    const value = useMemo(
        () => ({
            user,
            loading,
            refresh,
            login: () => {window.location.href = "/oauth2/authorization/okta";},
            logout: () => {window.location.href = "/logout";}
        }),
        [user, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Helper method to access auth data (User, loading, refresh, login, logout)
 */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within the AuthProvider");
    return ctx;
}

/**
 * Use only inside parts of the app that are behind <RequireAuth>.
 * Returns a non-null User for correct TS typing.
 */
export function useAuthedUser(): User {
    const { user } = useAuth();
    if (!user) {
        // This should never happen if <RequireAuth> wraps the tree.
        throw new Error("useAuthedUser must be used within RequireAuth");
    }
    return user;
}