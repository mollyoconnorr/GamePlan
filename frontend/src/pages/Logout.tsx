import { useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/Spinner.tsx";

const BACKEND_LOGOUT_URL = "/api/logout";

/**
 * Response returned by the CSRF endpoint when the logout page prepares a safe POST.
 */
type CsrfResponse = {
    parameterName?: string;
    token?: string;
};

/**
 * Renders the Logout view.
 */
export default function Logout() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    /**
     * Processes the confirm logout interaction and updates the affected UI state.
     */
    const handleConfirmLogout = async () => {
        setIsLoggingOut(true);

        try {
            const response = await fetch("/api/csrf", {
                method: "GET",
                credentials: "include",
            });

            const csrf = response.ok ? await response.json() as CsrfResponse : {};

            // Use top-level form POST so browser follows Spring/OIDC logout redirects.
            const form = document.createElement("form");
            form.method = "POST";
            form.action = BACKEND_LOGOUT_URL;

            if (csrf.parameterName && csrf.token) {
                const csrfInput = document.createElement("input");
                csrfInput.type = "hidden";
                csrfInput.name = csrf.parameterName;
                csrfInput.value = csrf.token;
                form.appendChild(csrfInput);
            }

            document.body.appendChild(form);
            form.submit();
        } catch (error) {
            console.error("Failed to start logout:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <section className="min-h-screen bg-gradient-to-b from-white to-slate-100 px-6 py-10">
            <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center">
                <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-lg md:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Authentication</p>
                    <h1 className="mt-3 text-3xl font-bold text-slate-900">Log out?</h1>
                    <p className="mt-3 text-slate-600">
                        You are about to end your current session.
                    </p>

                    {isLoggingOut && (
                        <div className="mt-7 flex items-center gap-3 text-slate-700">
                            <Spinner />
                            <span>Signing out...</span>
                        </div>
                    )}

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleConfirmLogout}
                            disabled={isLoggingOut}
                            className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Log out
                        </button>

                        <Link
                            to="/app/home"
                            className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
