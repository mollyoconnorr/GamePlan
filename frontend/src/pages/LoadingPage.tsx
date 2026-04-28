import Spinner from "../components/Spinner.tsx";

/**
 * Renders the LoadingPage view.
 */
export default function LoadingPage() {
    return (
        <section className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 px-6 py-10">
            <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center">
                <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-lg md:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Please Wait</p>
                    <h1 className="mt-3 text-3xl font-bold text-slate-900">Loading your session</h1>
                    <p className="mt-3 text-slate-600">
                        We are checking your authentication status.
                    </p>

                    <div className="mt-7 flex items-center gap-3 text-slate-700">
                        <Spinner />
                        <span>Loading...</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
