import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { Activity, Brain, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
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
    const highlights = [
        {
            label: 'Profile-aware planning',
            copy: 'Meals and workouts are shaped by goals, allergies, diet type, injuries, and available equipment.',
            icon: Brain,
        },
        {
            label: 'Daily logging',
            copy: 'Track meals and workouts in a calmer flow built for quick decisions on desktop and mobile.',
            icon: Utensils,
        },
        {
            label: 'Safer coaching',
            copy: 'The coach stays grounded in your restrictions, today’s activity, and the last 7 days of context.',
            icon: ShieldCheck,
        },
    ];

    return (
        <div className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(215,109,79,0.18),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(241,141,107,0.18),transparent_60%)]" />
                <div className="absolute top-24 -left-8 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
                <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(247,242,232,0.32)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(13,20,32,0.2)_100%)]" />
            </div>

            <div className="relative mx-auto flex min-h-svh w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:items-center">
                    <div className="space-y-6 lg:pr-4">
                        <Link
                            href={home()}
                            className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/72 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary via-accent to-primary text-primary-foreground shadow-[0_16px_30px_-24px_rgba(23,38,60,0.9)]">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                            <span>Hayetak</span>
                        </Link>

                        <div className="max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-primary uppercase shadow-sm backdrop-blur">
                                <Sparkles className="size-3.5" />
                                Calm health operating system
                            </div>

                            <p className="text-sm font-semibold tracking-[0.24em] text-primary uppercase">
                                Trusted access to your plan
                            </p>
                            <h2
                                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Sign in, recover access, and keep your health
                                workflow moving.
                            </h2>
                            <p className="max-w-lg text-base leading-7 text-muted-foreground">
                                Hayetak keeps planning, meal logging, workout
                                tracking, messages, and coaching in one safer
                                system, so your account flows should feel like
                                part of the product, not an afterthought.
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            {highlights.map((item) => (
                                <div
                                    key={item.label}
                                    className="haye-panel rounded-[26px] px-4 py-4"
                                >
                                    <item.icon className="size-5 text-secondary" />
                                    <p className="mt-3 text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                                        {item.label}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {item.copy}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="haye-panel hidden rounded-[30px] p-5 lg:block">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                                        How Hayetak flows
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold tracking-tight">
                                        Profile, plan, track, adapt.
                                    </h3>
                                </div>
                                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                                    Safety-aware
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {[
                                    {
                                        title: 'Create profile',
                                        copy: 'Capture goals, allergies, medical history, and training setup once.',
                                        icon: Activity,
                                    },
                                    {
                                        title: 'Generate plan',
                                        copy: 'Turn profile inputs into a nutrition and workout routine that feels realistic.',
                                        icon: Brain,
                                    },
                                    {
                                        title: 'Log the day',
                                        copy: 'Keep meals, workouts, and progress in one timeline instead of scattered tools.',
                                        icon: Utensils,
                                    },
                                    {
                                        title: 'Get coaching',
                                        copy: 'Receive adaptive guidance that stays grounded in restrictions and recent history.',
                                        icon: ShieldCheck,
                                    },
                                ].map((step) => (
                                    <div
                                        key={step.title}
                                        className="rounded-[22px] border border-border/70 bg-background/72 p-4"
                                    >
                                        <step.icon className="size-4 text-secondary" />
                                        <p className="mt-3 text-sm font-semibold text-foreground">
                                            {step.title}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {step.copy}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-md justify-self-center lg:justify-self-end">
                        <div className="rounded-[34px] border border-border/70 bg-card/92 p-6 shadow-[0_35px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur sm:p-8 dark:shadow-black/25">
                            <div className="mb-8 flex flex-col gap-5">
                                <Link
                                    href={home()}
                                    className="inline-flex items-center gap-3 font-medium"
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary via-accent to-primary text-primary-foreground shadow-[0_18px_34px_-24px_rgba(23,38,60,0.9)]">
                                        <AppLogoIcon className="size-6 fill-current" />
                                    </span>
                                    <span className="text-base font-semibold tracking-tight">
                                        Hayetak
                                    </span>
                                </Link>

                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                                        Secure access
                                    </p>
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
