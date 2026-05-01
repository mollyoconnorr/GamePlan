import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import type {AuthState, User} from "../types.ts";
import {apiFetch, SESSION_INVALIDATED_EVENT} from "../api/apiFetch.ts";

const AuthContext = createContext<AuthState | null>(null);

/**
 * Central auth state provider.
 * Keeps user session synced with backend and exposes login/logout redirects.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Store user object
    const [user, setUser] = useState<User | null>(null);
    const [sessionMessage, setSessionMessage] = useState<string | null>(null);

    // Keep track of if page is loading
    const [loading, setLoading] = useState(true);

    /**
     * Refreshes user object by calling backend to reauth user.
     */
    const refresh = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        try {
            // Call backend to refetch user data
            const res = await apiFetch("/api/user");

            // If not code 200 (ok), user is not auth
            if (!res.ok) {
                setUser(null);
                return;
            }
            const data = await res.json();
            setUser(data);
            setSessionMessage(null);

            // Any error usually means the user wasn't properly
        } catch (error) {
            console.error(`Error authenticating user: ${error}`);
            setUser(null);
            return;
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    // Refresh when this component is loaded.
    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        /**
         * Clears the cached user when the API reports that role-based session data is stale.
         */
        const handleSessionInvalidated = (event: Event) => {
            const detail = (event as CustomEvent<{ message?: string }>).detail;
            setUser(null);
            setSessionMessage(detail?.message ?? "Your session changed. Please sign in again.");
        };

        window.addEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
        return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    }, []);

    // Keep session fresh while an authenticated user is active in the app.
    useEffect(() => {
        if (!user) {
            return;
        }

        const interval = window.setInterval(() => {
            void refresh(true);
        }, 60_000);

        return () => window.clearInterval(interval);
    }, [refresh, user]);

    // Only recompute this object if user/loading/refresh references change.
    const value = useMemo(
        () => ({
            user,
            loading,
            sessionMessage,
            refresh,
            login: () => {window.location.href = "/oauth2/authorization/okta";},
            logout: () => {window.location.href = "/api/logout";}
        }),
        [user, loading, sessionMessage, refresh]
    );

    return (
        <AuthContext.Provider value={value}>
            {sessionMessage && (
                <div className="fixed top-4 left-1/2 z-[500] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-md">
                    {sessionMessage}
                </div>
            )}
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Helper method to access auth data (User, loading, refresh, login, logout)
 */
// eslint-disable-next-line react-refresh/only-export-components
/**
 * React hook for useAuth.
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
// eslint-disable-next-line react-refresh/only-export-components
/**
 * React hook for useAuthedUser.
 */
export function useAuthedUser(): User {
    const { user } = useAuth();
    if (!user) {
        // This should never happen if <RequireAuth> wraps the tree.
        throw new Error("useAuthedUser must be used within RequireAuth");
    }
    return user;
}
