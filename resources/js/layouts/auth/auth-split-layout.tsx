import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="relative grid min-h-svh bg-background px-4 py-6 sm:px-6 lg:max-w-none lg:grid-cols-2 lg:px-0 lg:py-0">
            <div className="relative hidden h-full flex-col overflow-hidden border-r border-border/60 p-10 text-white lg:flex">
                <div className="absolute inset-0 bg-[linear-gradient(160deg,#0f172a_0%,#162033_42%,#13263a_100%)]" />
                <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_60%)]" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
                <Link
                    href={home()}
                    className="relative z-20 inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-lg font-medium backdrop-blur"
                >
                    <AppLogoIcon className="mr-2 size-8 fill-current text-white" />
                    {name}
                </Link>

                <div className="relative z-20 mt-10 max-w-lg space-y-4">
                    <p className="text-sm font-semibold tracking-[0.24em] text-amber-100/80 uppercase">
                        Hayetak access
                    </p>
                    <h2 className="text-4xl font-semibold tracking-tight">
                        Plans, coaching, and tracking should feel connected from the first screen.
                    </h2>
                    <p className="text-base leading-7 text-white/72">
                        This auth shell now matches the refreshed product theme so account flows feel like part of the same experience.
                    </p>
                </div>

                <div className="relative z-20 mt-auto space-y-6">
                    {quote && (
                        <blockquote className="space-y-2">
                            <p className="text-lg">&ldquo;{quote.message}&rdquo;</p>
                            <footer className="text-sm text-neutral-300">
                                {quote.author}
                            </footer>
                        </blockquote>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-100 uppercase">
                                Planner
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                Health recommendations tailored to goals, restrictions, and history.
                            </p>
                        </div>
                        <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-100 uppercase">
                                Coach
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                Context-aware guidance that keeps meals, workouts, and safety aligned.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex w-full items-center lg:p-8">
                <div className="mx-auto flex w-full max-w-md flex-col justify-center space-y-6">
                    <Link
                        href={home()}
                        className="relative z-20 inline-flex items-center justify-center rounded-full border border-border/70 bg-card/72 px-4 py-2 shadow-sm backdrop-blur lg:hidden"
                    >
                        <AppLogoIcon className="mr-2 h-8 fill-current text-primary sm:h-9" />
                        <span className="font-semibold tracking-tight text-foreground">
                            {name}
                        </span>
                    </Link>

                    <div className="rounded-[30px] border border-border/70 bg-card/92 p-6 shadow-[0_35px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur sm:p-8">
                        <div className="mb-6 flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                                Secure access
                            </p>
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-sm text-balance text-muted-foreground">
                                {description}
                            </p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
