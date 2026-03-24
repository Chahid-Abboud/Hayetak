import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(14,165,164,0.18),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.2),transparent_60%)]" />
                <div className="absolute top-24 -left-8 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
                <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-svh w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
                <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center">
                    <div className="hidden max-w-xl space-y-5 lg:block">
                        <Link
                            href={home()}
                            className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                            <span>Hayetak</span>
                        </Link>

                        <div className="space-y-3">
                            <p className="text-sm font-semibold tracking-[0.24em] text-primary uppercase">
                                Unified health coaching
                            </p>
                            <h2 className="text-4xl font-semibold tracking-tight text-foreground">
                                One account for plans, tracking, messages, and
                                optional account protection.
                            </h2>
                            <p className="max-w-lg text-base leading-7 text-muted-foreground">
                                Your sign-in, verification, and recovery flows
                                should feel as polished as the rest of Hayetak.
                            </p>
                        </div>
                    </div>

                    <div className="w-full max-w-md justify-self-center lg:justify-self-end">
                        <div className="rounded-[28px] border border-border/70 bg-card/95 p-6 shadow-xl shadow-black/5 backdrop-blur sm:p-8 dark:shadow-black/25">
                            <div className="mb-8 flex flex-col gap-5">
                                <Link
                                    href={home()}
                                    className="inline-flex items-center gap-3 font-medium"
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <AppLogoIcon className="size-6 fill-current" />
                                    </span>
                                    <span className="text-base font-semibold tracking-tight">
                                        Hayetak
                                    </span>
                                </Link>

                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        {title}
                                    </h1>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {description}
                                    </p>
                                </div>
                            </div>

                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
