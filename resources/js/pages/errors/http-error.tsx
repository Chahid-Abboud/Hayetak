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

            <main className="min-h-screen bg-background px-6 py-16 text-foreground">
                <div className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-[0_24px_64px_-42px_rgba(15,23,42,0.4)] sm:p-10">
                    <p className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                        Error {status}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h1>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                        {message}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/dashboard"
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground no-underline transition hover:opacity-90"
                        >
                            Back to dashboard
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                            Refresh page
                        </button>
                    </div>

                    {showDetails ? (
                        <div className="mt-8 rounded-2xl border border-border bg-muted/50 p-4">
                            <h2 className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
                                Additional details
                            </h2>
                            <dl className="mt-3 space-y-2 text-sm text-foreground">
                                <div>
                                    <dt className="font-semibold">Reference</dt>
                                    <dd>{details?.code ?? 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold">
                                        Suggested action
                                    </dt>
                                    <dd>{details?.hint ?? 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold">Page</dt>
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
