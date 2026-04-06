import { Head, Link } from '@inertiajs/react';

type ErrorDetails = {
    code?: string;
    hint?: string;
    path?: string;
    method?: string;
};

export default function HttpErrorPage({
    status = 500,
    title = 'Something went wrong',
    message = 'An unexpected error occurred.',
    details,
    showDetails = false,
}: {
    status?: number;
    title?: string;
    message?: string;
    details?: ErrorDetails;
    showDetails?: boolean;
}) {
    return (
        <>
            <Head title={`${status} - ${title}`} />

            <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f9fc_0%,_#eef2f7_52%,_#e8edf4_100%)] px-6 py-16 text-slate-900">
                <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_64px_-42px_rgba(15,23,42,0.4)] sm:p-10">
                    <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
                        Error {status}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                        {title}
                    </h1>
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                        {message}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/dashboard"
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-slate-800"
                        >
                            Back to dashboard
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                            Refresh page
                        </button>
                    </div>

                    {showDetails ? (
                        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                            <h2 className="text-xs font-semibold tracking-[0.14em] text-amber-900 uppercase">
                                Troubleshooting Details
                            </h2>
                            <dl className="mt-3 space-y-2 text-sm text-amber-950">
                                <div>
                                    <dt className="font-semibold">Code</dt>
                                    <dd>{details?.code ?? 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold">Hint</dt>
                                    <dd>{details?.hint ?? 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold">Request</dt>
                                    <dd>
                                        {details?.method ?? 'GET'}{' '}
                                        {details?.path ?? '/'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    ) : null}
                </div>
            </main>
        </>
    );
}
