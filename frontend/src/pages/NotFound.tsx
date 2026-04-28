import { Link } from "react-router-dom";

/**
 * Renders the NotFound view.
 */
export default function NotFound({
    compact = false,
}: {
    compact?: boolean;
}) {
    return (
        <section className={compact ? "px-6 py-10" : "min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 px-6 py-10"}>
            <div className={compact
                ? "mx-auto w-full max-w-2xl"
                : "mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center"}
            >
                <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-lg md:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Error</p>
                    <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
                    <p className="mt-3 text-slate-600">
                        The page you requested does not exist or may have moved.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/"
                            className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:opacity-90"
                        >
                            Go to welcome
                        </Link>
                        <Link
                            to="/app/home"
                            className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Go to calendar
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
