import AppLogoIcon from '@/components/app-logo-icon';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Brain,
    ChevronRight,
    Dumbbell,
    MapPin,
    Menu,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    Utensils,
    X,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

const FOCUS_RING =
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function Cta({
    href,
    children,
    variant = 'primary',
}: {
    href: string;
    children: ReactNode;
    variant?: 'primary' | 'secondary';
}) {
    return (
        <Link
            href={href}
            className={`${FOCUS_RING} inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline transition ${
                variant === 'primary'
                    ? 'bg-primary text-primary-foreground shadow-[0_20px_44px_-28px_rgba(23,38,60,0.85)] hover:-translate-y-0.5'
                    : 'border border-border/70 bg-card/80 text-foreground hover:-translate-y-0.5 hover:bg-background/90'
            }`}
        >
            {children}
        </Link>
    );
}

function SectionTitle({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="text-center">
            <p className="haye-kicker">{eyebrow}</p>
            <h2
                className="mx-auto mt-3 max-w-3xl text-3xl tracking-tight text-foreground sm:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                {title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {description}
            </p>
        </div>
    );
}

function PreviewFrame({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-[30px] border border-border/70 bg-card/88 shadow-[0_30px_70px_-44px_rgba(23,38,60,0.85)]">
            <div className="border-b border-border/70 px-5 py-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    {subtitle}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                    {title}
                </p>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function Landing() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activePreview, setActivePreview] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 18);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const previews = [
        {
            label: 'Planner',
            icon: Brain,
            content: (
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-3">
                        <div className="rounded-[24px] border border-border/70 bg-background/74 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Recomposition phase
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Goal-driven calories and protein for a
                                        4-day routine.
                                    </p>
                                </div>
                                <Brain className="size-5 text-secondary" />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {[
                                    'Peanut allergy',
                                    'Shoulder history',
                                    'Gym + home',
                                    '4 workout days',
                                ].map((chip) => (
                                    <span key={chip} className="haye-chip">
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                ['2,180 kcal', 'daily target'],
                                ['158 g protein', 'macro anchor'],
                            ].map(([value, label]) => (
                                <div
                                    key={label}
                                    className="rounded-[22px] border border-border/70 bg-card/82 px-4 py-4"
                                >
                                    <p className="text-xl font-semibold text-foreground">
                                        {value}
                                    </p>
                                    <p className="mt-1 text-xs tracking-[0.18em] text-muted-foreground uppercase">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[24px] border border-border/70 bg-primary p-5 text-primary-foreground">
                        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary-foreground/72">
                            Coach summary
                        </p>
                        <div className="mt-4 space-y-3">
                            {[
                                'Meal templates respect allergy and diet inputs',
                                'Workout split adapts to available equipment',
                                'Past diet friction informs meal variety',
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="rounded-[18px] bg-white/8 px-4 py-3 text-sm leading-6"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            label: 'Meal tracker',
            icon: Utensils,
            content: (
                <div className="grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
                    <div className="space-y-3">
                        {[
                            ['Breakfast', '620 kcal', 'Protein still on pace'],
                            ['Lunch', 'On target', 'Coach suggests more fiber later'],
                            ['Snack', 'Needs protein', 'Two safe swaps ready'],
                        ].map(([meal, status, note]) => (
                            <div
                                key={meal}
                                className="rounded-[22px] border border-border/70 bg-background/74 p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-foreground">
                                        {meal}
                                    </p>
                                    <span className="haye-chip">{status}</span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {note}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-[24px] border border-border/70 bg-card/82 p-4">
                            {[
                                ['Calories', '1,860 / 2,180', '85%'],
                                ['Protein', '132 g / 158 g', '84%'],
                                ['Hydration', '7 / 9 cups', '78%'],
                            ].map(([label, value, width]) => (
                                <div key={label} className="mb-4 last:mb-0">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {value}
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-muted">
                                        <div
                                            className="h-2 rounded-full bg-secondary"
                                            style={{ width }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-[24px] border border-border/70 bg-accent/25 p-4 text-accent-foreground">
                            Dinner can stay within target with lentil soup,
                            grilled chicken, or a dairy-free yogurt bowl, all
                            filtered around your restrictions.
                        </div>
                    </div>
                </div>
            ),
        },
        {
            label: 'Workout log',
            icon: Dumbbell,
            content: (
                <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-[24px] border border-border/70 bg-primary p-5 text-primary-foreground">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold">Push day</p>
                                <p className="mt-1 text-sm text-primary-foreground/72">
                                    38 minutes active
                                </p>
                            </div>
                            <Dumbbell className="size-5" />
                        </div>
                        <div className="mt-5 space-y-3">
                            {[
                                'Incline dumbbell press',
                                'Machine chest press',
                                'Cable lateral raise',
                            ].map((exercise) => (
                                <div
                                    key={exercise}
                                    className="rounded-[18px] bg-white/8 px-4 py-3 text-sm"
                                >
                                    {exercise}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-[22px] border border-border/70 bg-background/74 p-4">
                            <p className="font-semibold text-foreground">
                                Set memory
                            </p>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Last set remembered: 26 kg x 9 reps.
                            </p>
                        </div>
                        <div className="rounded-[22px] border border-border/70 bg-card/82 p-4">
                            <p className="font-semibold text-foreground">
                                Alternative ready
                            </p>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                If the shoulder feels irritated, swap to the
                                planner’s safer pressing options.
                            </p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            label: 'AI coach',
            icon: MessageSquare,
            content: (
                <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
                    <div className="space-y-3">
                        <div className="rounded-[22px] border border-border/70 bg-background/74 p-4">
                            <p className="font-semibold text-foreground">
                                Hayetak coach
                            </p>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                You are still short on protein today. A
                                dairy-free yogurt bowl or grilled chicken wrap
                                would close the gap without violating your
                                restrictions.
                            </p>
                        </div>
                        <div className="rounded-[22px] border border-border/70 bg-card/82 p-4">
                            <p className="font-semibold text-foreground">
                                Safety layer
                            </p>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                If shoulder discomfort is more than mild today,
                                skip heavy pressing and use the injury-safe
                                substitutions already in your plan.
                            </p>
                        </div>
                    </div>
                    <div className="rounded-[24px] border border-border/70 bg-primary p-5 text-primary-foreground">
                        {[
                            ['Today', 'Meals, hydration, active workout, current gap'],
                            ['Last 7 days', 'Consistency, recovery trend, skipped meals'],
                            ['Profile', 'Goals, allergies, injuries, diet type'],
                        ].map(([label, copy]) => (
                            <div
                                key={label}
                                className="mb-3 rounded-[18px] bg-white/8 px-4 py-3 last:mb-0"
                            >
                                <p className="text-sm font-semibold">{label}</p>
                                <p className="mt-1 text-sm leading-6 text-primary-foreground/74">
                                    {copy}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Hayetak" />
            <a
                href="#main-content"
                className={`sr-only rounded-md bg-card px-3 py-2 text-sm font-semibold shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 ${FOCUS_RING}`}
            >
                Skip to main content
            </a>

            <div className="relative min-h-screen overflow-hidden bg-background">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(215,109,79,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(241,141,107,0.18),transparent_60%)]" />
                    <div className="absolute top-24 right-0 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
                    <div className="absolute left-0 top-96 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
                </div>

                <header
                    className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                        scrolled
                            ? 'border-b border-border/70 bg-background/86 backdrop-blur-xl'
                            : 'bg-transparent'
                    }`}
                >
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                        <a href="#hero" className="inline-flex items-center gap-3 no-underline">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary via-accent to-primary text-primary-foreground shadow-[0_18px_34px_-22px_rgba(23,38,60,0.9)]">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                            <div>
                                <p
                                    className="text-xl tracking-tight text-foreground"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    Hayetak
                                </p>
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Planner, tracker, coach
                                </p>
                            </div>
                        </a>
                        <nav className="hidden items-center gap-3 md:flex">
                            {[
                                ['#story', 'How it works'],
                                ['#preview', 'Product preview'],
                                ['#trust', 'Trust & safety'],
                            ].map(([href, label]) => (
                                <a
                                    key={href}
                                    href={href}
                                    className={`${FOCUS_RING} rounded-full px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition hover:bg-card/72 hover:text-foreground`}
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>
                        <div className="hidden items-center gap-3 md:flex">
                            <Cta href="/login" variant="secondary">
                                Sign in
                            </Cta>
                            <Cta href="/register">
                                Start your plan
                                <ArrowRight className="size-4" />
                            </Cta>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileOpen((open) => !open)}
                            className={`${FOCUS_RING} inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/78 text-foreground md:hidden`}
                        >
                            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                    {mobileOpen ? (
                        <div className="border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur-xl md:hidden">
                            <div className="space-y-3">
                                {[
                                    ['#story', 'How it works'],
                                    ['#preview', 'Product preview'],
                                    ['#trust', 'Trust & safety'],
                                ].map(([href, label]) => (
                                    <a
                                        key={href}
                                        href={href}
                                        onClick={() => setMobileOpen(false)}
                                        className="block rounded-2xl border border-border/70 bg-card/76 px-4 py-3 text-sm font-medium text-foreground no-underline"
                                    >
                                        {label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </header>

                <main id="main-content" className="relative z-10">
                    <section
                        id="hero"
                        className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-20"
                    >
                        <div className="grid gap-12 lg:grid-cols-[0.96fr_1.04fr] lg:items-start xl:gap-16">
                            <div className="space-y-7 pt-2 lg:pr-4">
                                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/78 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-primary uppercase shadow-sm backdrop-blur">
                                    <Sparkles className="size-3.5" />
                                    Calm, premium AI health platform
                                </div>
                                <div className="space-y-4">
                                    <h1
                                        className="max-w-2xl text-[3.15rem] leading-[0.96] tracking-[-0.03em] text-foreground sm:text-[4rem] lg:text-[4.7rem] xl:text-[5.15rem]"
                                        style={{ fontFamily: 'var(--font-display)' }}
                                    >
                                        Create your profile, generate a safer
                                        plan, track the day, and get coaching
                                        that adapts.
                                    </h1>
                                    <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                                        Hayetak brings nutrition planning,
                                        workout planning, logging, messaging,
                                        appointments, and AI guidance into one
                                        structured experience built around trust,
                                        personalization, and readability.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    {[
                                        { icon: Activity, label: 'Create profile' },
                                        { icon: Brain, label: 'Generate AI plan' },
                                        { icon: Utensils, label: 'Log meals and workouts' },
                                        { icon: Sparkles, label: 'Get adaptive coaching' },
                                    ].map((step, index) => (
                                        <div key={step.label} className="flex items-center gap-2">
                                            {index > 0 ? (
                                                <ChevronRight className="size-4 text-muted-foreground/60" />
                                            ) : null}
                                            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/76 px-3 py-2 font-medium text-foreground">
                                                <step.icon className="size-4 text-secondary" />
                                                {step.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Cta href="/register">
                                        Build my routine
                                        <ArrowRight className="size-4" />
                                    </Cta>
                                    <Cta href="/login" variant="secondary">
                                        Sign in
                                    </Cta>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Allergy-aware planning',
                                        'Injury-aware exercise alternatives',
                                        'Meals + workouts in one flow',
                                        'Profile-based AI guidance',
                                    ].map((signal) => (
                                        <span key={signal} className="haye-chip">
                                            {signal}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="relative lg:pt-2">
                                <div className="absolute -top-6 right-8 h-28 w-28 rounded-full bg-secondary/16 blur-3xl" />
                                <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-accent/20 blur-3xl" />
                                <div className="relative space-y-4">
                                    <div className="haye-panel rounded-[34px] p-5 sm:p-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="haye-kicker">Today inside Hayetak</p>
                                                <h3
                                                    className="mt-3 text-2xl tracking-tight text-foreground"
                                                    style={{ fontFamily: 'var(--font-display)' }}
                                                >
                                                    Daily command center
                                                </h3>
                                            </div>
                                            <span className="rounded-full bg-secondary/12 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
                                                Adaptive brief
                                            </span>
                                        </div>

                                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                            {[
                                                ['1,860', 'kcal logged'],
                                                ['132 g', 'protein'],
                                                ['72%', 'hydration'],
                                            ].map(([value, label]) => (
                                                <div
                                                    key={label}
                                                    className="min-h-[8.75rem] rounded-[22px] border border-border/70 bg-background/74 p-4"
                                                >
                                                    <p className="text-2xl font-semibold text-foreground">
                                                        {value}
                                                    </p>
                                                    <p className="mt-1 text-xs tracking-[0.18em] text-muted-foreground uppercase">
                                                        {label}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 rounded-[28px] border border-border/70 bg-primary p-5 text-primary-foreground">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        Daily brief
                                                    </p>
                                                    <p className="mt-2 text-sm leading-7 text-primary-foreground/80">
                                                        Protein is still low for
                                                        today. A dairy-free snack
                                                        after training would
                                                        close the gap while
                                                        keeping your
                                                        restrictions intact.
                                                    </p>
                                                </div>
                                                <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]">
                                                    Safe
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                            <div className="rounded-[24px] border border-border/70 bg-card/82 p-4">
                                                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Meal tracker
                                                </p>
                                                <div className="mt-3 space-y-2">
                                                    {[
                                                        ['Breakfast', 'Logged - on target'],
                                                        ['Lunch', 'Coach suggests more fiber'],
                                                        ['Snack', 'Protein gap still open'],
                                                    ].map(([meal, note]) => (
                                                        <div
                                                            key={meal}
                                                            className="rounded-[18px] bg-background/74 px-4 py-3"
                                                        >
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {meal}
                                                            </p>
                                                            <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                                {note}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-[24px] border border-border/70 bg-card/82 p-4">
                                                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Workout log
                                                </p>
                                                <div className="mt-3 rounded-[20px] bg-background/74 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            Push day
                                                        </p>
                                                        <Dumbbell className="size-4 text-secondary" />
                                                    </div>
                                                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                                        Last set remembered and
                                                        safer shoulder-friendly
                                                        swaps stay visible.
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {['38 min', '8 sets logged', 'Alt ready'].map((chip) => (
                                                            <span key={chip} className="haye-chip">
                                                                {chip}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="haye-panel rounded-[30px] p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="haye-kicker">Nearby care</p>
                                                    <p className="mt-2 text-lg font-semibold text-foreground">
                                                        Discovery stays in flow
                                                    </p>
                                                </div>
                                                <MapPin className="size-5 text-secondary" />
                                            </div>
                                            <div className="mt-4 space-y-3 text-sm">
                                                {[
                                                    ['FitZone Gym', '0.3 km', 'Verified equipment details'],
                                                    ['Dr. Sara Khalil', '1.2 km', 'Nutritionist accepting appointments'],
                                                ].map(([name, distance, note]) => (
                                                    <div
                                                        key={name}
                                                        className="rounded-[22px] border border-border/70 bg-background/74 p-4"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="font-semibold text-foreground">
                                                                {name}
                                                            </p>
                                                            <span className="haye-chip">
                                                                {distance}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                            {note}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-[30px] border border-border/70 bg-card/84 p-5 shadow-[0_24px_60px_-40px_rgba(23,38,60,0.45)]">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="haye-kicker">Coach context</p>
                                                    <p className="mt-2 text-lg font-semibold text-foreground">
                                                        The AI sees the full picture
                                                    </p>
                                                </div>
                                                <MessageSquare className="size-5 text-secondary" />
                                            </div>
                                            <div className="mt-4 space-y-3">
                                                {[
                                                    ['Today', 'Meals, hydration, workout status, current protein gap'],
                                                    ['Last 7 days', 'Recovery trend, consistency, skipped sessions or meals'],
                                                    ['Profile', 'Goals, allergies, medical notes, injuries, diet type'],
                                                ].map(([label, copy]) => (
                                                    <div
                                                        key={label}
                                                        className="rounded-[20px] border border-border/70 bg-background/74 px-4 py-3"
                                                    >
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {label}
                                                        </p>
                                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                            {copy}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-[28px] border border-secondary/20 bg-secondary/10 p-5 text-foreground shadow-[0_20px_50px_-38px_rgba(215,109,79,0.55)] lg:col-span-2">
                                            <div className="flex items-start gap-3">
                                                <ShieldCheck className="mt-0.5 size-5 text-secondary" />
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        Safety signals stay visible
                                                    </p>
                                                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                                        Allergies, injuries,
                                                        medical constraints, and
                                                        equipment limits shape
                                                        plans and suggestions
                                                        before advice appears.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {[
                                ['2,180 kcal', 'Planner targets built from real profile inputs'],
                                ['4-day split', 'Workout plan shaped around schedule, equipment, and injury history'],
                                ['7-day context', 'Coach replies can reference recent meals, training, and recovery patterns'],
                                ['Safety first', 'Allergies, diet type, and constraints stay visible across the flow'],
                            ].map(([value, copy]) => (
                                <div
                                    key={value}
                                    className="haye-panel h-full rounded-[28px] p-5"
                                >
                                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                                        {value}
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        {copy}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="story" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
                        <SectionTitle
                            eyebrow="How it works"
                            title="A full health workflow, not a scattered fitness stack"
                            description="Hayetak connects profile onboarding, AI planning, meal tracking, workout logging, and adaptive coaching into one structured journey."
                        />
                        <div className="mt-10 grid gap-4 lg:grid-cols-4">
                            {[
                                {
                                    step: '01',
                                    icon: Activity,
                                    title: 'Build your profile',
                                    copy: 'Capture age, sex, goals, allergies, medical history, injuries, schedule, and equipment.',
                                },
                                {
                                    step: '02',
                                    icon: Brain,
                                    title: 'Generate your AI plan',
                                    copy: 'Produce nutrition and workout plans shaped by real profile variables and safety constraints.',
                                },
                                {
                                    step: '03',
                                    icon: Utensils,
                                    title: 'Log meals and workouts',
                                    copy: 'Track breakfast to dinner, sets to recovery notes, and keep daily progress easy to understand.',
                                },
                                {
                                    step: '04',
                                    icon: Sparkles,
                                    title: 'Get adaptive coaching',
                                    copy: 'Coach replies stay aware of today, the last 7 days, and restrictions before suggesting actions.',
                                },
                            ].map(({ step, icon: Icon, title, copy }) => (
                                <div key={step} className="haye-panel rounded-[28px] p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                                            {step}
                                        </span>
                                        <Icon className="size-5 text-secondary" />
                                    </div>
                                    <p className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                                        {title}
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        {copy}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="preview" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
                        <SectionTitle
                            eyebrow="Product preview"
                            title="Core product surfaces designed for clarity, safety, and momentum"
                            description="Switch through the planner, meal tracker, workout log, and AI coach to see how Hayetak presents real product value instead of abstract AI promises."
                        />
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                            {previews.map((tab, index) => (
                                <button
                                    key={tab.label}
                                    type="button"
                                    onClick={() => setActivePreview(index)}
                                    className={`${FOCUS_RING} inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                                        activePreview === index
                                            ? 'bg-primary text-primary-foreground shadow-[0_20px_34px_-24px_rgba(23,38,60,0.8)]'
                                            : 'border border-border/70 bg-card/78 text-foreground hover:bg-background/90'
                                    }`}
                                >
                                    <tab.icon className="size-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-8">
                            <PreviewFrame
                                title={previews[activePreview]?.label ?? 'Planner'}
                                subtitle="Inside Hayetak"
                            >
                                {previews[activePreview]?.content}
                            </PreviewFrame>
                        </div>
                    </section>

                    <section id="trust" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
                        <div className="haye-panel rounded-[36px] p-6 sm:p-8 lg:p-10">
                            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                                <div>
                                    <p className="haye-kicker">Trust and safety</p>
                                    <h2
                                        className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl"
                                        style={{ fontFamily: 'var(--font-display)' }}
                                    >
                                        Safety and credibility stay visible
                                        inside the product.
                                    </h2>
                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                        Hayetak is built so allergies, diet
                                        type, injury history, and medical
                                        constraints affect planning and coaching
                                        where decisions are made, not only in
                                        hidden settings or error messages.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Cta href="/register">
                                            Start with your profile
                                            <ArrowRight className="size-4" />
                                        </Cta>
                                        <Cta href="/login" variant="secondary">
                                            Return to dashboard
                                        </Cta>
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {[
                                        {
                                            icon: ShieldCheck,
                                            title: 'Allergy-safe planning',
                                            copy: 'Food suggestions can be filtered before they ever show up in a plan or coach response.',
                                        },
                                        {
                                            icon: Dumbbell,
                                            title: 'Injury-aware alternatives',
                                            copy: 'Exercise substitutions stay connected to available equipment and injury notes.',
                                        },
                                        {
                                            icon: Brain,
                                            title: 'Context-aware coaching',
                                            copy: 'Coach suggestions can reference today’s logs and the last 7 days instead of generic advice.',
                                        },
                                        {
                                            icon: MapPin,
                                            title: 'Human support paths',
                                            copy: 'Nearby professionals, appointments, and messaging keep expert help close when needed.',
                                        },
                                    ].map(({ icon: Icon, title, copy }) => (
                                        <div
                                            key={String(title)}
                                            className="rounded-[24px] border border-border/70 bg-background/74 p-5"
                                        >
                                            <Icon className="size-5 text-secondary" />
                                            <p className="mt-4 text-base font-semibold text-foreground">
                                                {title}
                                            </p>
                                            <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                                {copy}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-4 py-10 pb-16 sm:px-6 lg:px-8 lg:pb-20">
                        <div className="haye-panel rounded-[36px] px-6 py-8 text-center sm:px-8 sm:py-10">
                            <p className="haye-kicker">Ready to begin</p>
                            <h2
                                className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Build your plan once, then let Hayetak keep the
                                whole system connected.
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                Client, trainer, and nutritionist accounts all
                                start from the same calmer product language:
                                structured, premium, responsive, and grounded in
                                real health context.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                <Cta href="/register">
                                    Create account
                                    <ArrowRight className="size-4" />
                                </Cta>
                                <Cta href="/login" variant="secondary">
                                    I already have an account
                                </Cta>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
