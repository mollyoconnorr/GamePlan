import { useEffect } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/Spinner.tsx";

const LOGIN_REDIRECT_DELAY_MS = 700;

export default function Login() {
    const redirectToLogin = () => {
        window.location.href = "/oauth2/authorization/okta";
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            redirectToLogin();
        }, LOGIN_REDIRECT_DELAY_MS);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <section className="min-h-screen bg-gradient-to-b from-white to-slate-100 px-6 py-10">
            <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center">
                <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-lg md:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Authentication</p>
                    <h1 className="mt-3 text-3xl font-bold text-slate-900">Redirecting to sign in</h1>
                    <p className="mt-3 text-slate-600">
                        You are being sent to the Okta login page.
                    </p>

                    <div className="mt-7 flex items-center gap-3 text-slate-700">
                        <Spinner />
                        <span>Preparing login...</span>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={redirectToLogin}
                            className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:cursor-pointer hover:opacity-90"
                        >
                            Continue now
                        </button>

                        <Link
                            to="/"
                            className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Back to home
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
