<<<<<<< HEAD
import AppWordmark from '@/components/app-wordmark';
=======
import AppLogoIcon from '@/components/app-logo-icon';
>>>>>>> origin/main
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Brain,
    Dumbbell,
    MapPin,
    Menu,
    MessageSquare,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
    Utensils,
    X,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const FOCUS_RING =
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
<<<<<<< HEAD
const AUTO_PREVIEW_INTERVAL_MS = 7200;
=======
const AUTO_PREVIEW_INTERVAL_MS = 3200;
>>>>>>> origin/main

function Cta({
    href,
    children,
    variant = 'primary',
    className,
}: {
    href: string;
    children: ReactNode;
    variant?: 'primary' | 'secondary';
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                `${FOCUS_RING} inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline transition`,
                variant === 'primary'
                    ? 'bg-primary text-primary-foreground shadow-[0_20px_44px_-28px_rgba(23,38,60,0.85)] hover:-translate-y-0.5'
                    : 'border border-border/70 bg-card/80 text-foreground hover:-translate-y-0.5 hover:bg-background/90',
                className,
            )}
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
    description?: string;
}) {
    return (
        <div className="text-center">
            <p className="haye-kicker">{eyebrow}</p>
            <h2
                className="mx-auto mt-3 max-w-3xl text-3xl tracking-normal text-foreground sm:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
            >
                {title}
            </h2>
            {description ? (
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    {description}
                </p>
            ) : null}
        </div>
    );
}

type PreviewTab = {
    label: string;
    icon: typeof Brain;
    description: string;
    content: ReactNode;
};

function PreviewPanel({
    title,
    eyebrow,
    children,
    accent = false,
}: {
    title: string;
    eyebrow?: string;
    children: ReactNode;
    accent?: boolean;
}) {
    return (
        <div
            className={`rounded-[26px] border p-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.42)] ${
                accent
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : 'border-border/70 bg-card/82 text-foreground'
            }`}
        >
            {eyebrow ? (
                <p
                    className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${
                        accent
                            ? 'text-primary-foreground/72'
                            : 'text-muted-foreground'
                    }`}
                >
                    {eyebrow}
                </p>
            ) : null}
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <div
                className={`mt-3 text-sm leading-6 ${
                    accent
                        ? 'text-primary-foreground/84'
                        : 'text-muted-foreground'
                }`}
            >
                {children}
            </div>
        </div>
    );
}

function PreviewMetric({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-[22px] border border-border/70 bg-card/82 px-4 py-4 shadow-[0_16px_34px_-28px_rgba(7,14,10,0.35)]">
            <p className="text-2xl font-semibold tracking-normal text-foreground">
                {value}
            </p>
            <p className="mt-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {label}
            </p>
        </div>
    );
}

function PreviewShell({
    activeLabel,
    title,
    description,
    children,
}: {
    activeLabel: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="grid h-full min-h-0 overflow-hidden rounded-[24px] border border-border/70 bg-card/88 text-foreground shadow-[0_30px_64px_-54px_rgba(0,0,0,0.35)]">
            <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
                <div className="border-b border-border/70 bg-background/74 px-4 py-3 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    {activeLabel}
                                </span>
                            </div>
                            <h3
                                className="mt-2 text-[1.25rem] tracking-normal text-foreground sm:text-[1.46rem]"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {title}
                            </h3>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 overflow-hidden px-3 py-3 text-sm sm:px-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    const { updateAppearance } = useAppearance();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activePreview, setActivePreview] = useState(4);
    const [previewInView, setPreviewInView] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const previewSectionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 18);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const syncTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const previews: PreviewTab[] = [
        {
            label: 'AI Planner',
            icon: Brain,
            description:
                'Planner output is structured, safety-aware, and easy to scan.',
            content: (
                <PreviewShell
                    activeLabel="AI Planner"
                    title="Plan around real-life limits, then keep it usable."
                    description="Nutrition, workouts, and restrictions stay in one connected flow."
                >
                    <div className="grid h-full gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <PreviewMetric
                                    value="2,180"
                                    label="Daily kcal target"
                                />
                                <PreviewMetric
                                    value="158 g"
                                    label="Protein anchor"
                                />
                                <PreviewMetric
                                    value="4 days"
                                    label="Workout split"
                                />
                            </div>

                            <PreviewPanel
                                eyebrow="Profile inputs"
                                title="Safety and setup stay attached"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Peanut allergy',
                                        'Shoulder history',
                                        'Gym + home',
                                        '4 workout days',
                                        'Recovery-aware split',
                                    ].map((chip) => (
                                        <span
                                            key={chip}
                                            className="rounded-full border border-border/70 bg-card/82 px-3 py-1 text-xs font-medium text-foreground"
                                        >
                                            {chip}
                                        </span>
                                    ))}
                                </div>
                            </PreviewPanel>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <PreviewPanel
                                    eyebrow="Nutrition side"
                                    title="Meal rhythm for the cycle"
                                >
                                    Breakfast, lunch, dinner, and snack timing
                                    stay balanced around the training days with
                                    less repetition.
                                </PreviewPanel>
                                <PreviewPanel
                                    eyebrow="Training side"
                                    title="Weekly split laid out clearly"
                                >
                                    Upper, lower, push, and pull sessions stay
                                    aligned with equipment access and shoulder
                                    tolerance.
                                </PreviewPanel>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <PreviewPanel
                                eyebrow="Coach summary"
                                title="Plan notes for this user"
                                accent
                            >
                                <div className="space-y-3">
                                    {[
                                        'Meal options stay allergy-safe and practical for busy workdays.',
                                        'Training choices lean on stable pressing alternatives when needed.',
                                        'Meal variety is increased when past plans felt repetitive.',
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="rounded-[18px] bg-white/9 px-4 py-3"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </PreviewPanel>

                            <div className="grid gap-4">
                                <PreviewPanel
                                    eyebrow="Next review"
                                    title="Progress check-ins stay simple"
                                >
                                    The plan refreshes after steady logs and
                                    weigh-ins instead of sending the user into a
                                    technical settings flow.
                                </PreviewPanel>
                                <PreviewPanel
                                    eyebrow="Day snapshot"
                                    title="Meals and workouts stay connected"
                                >
                                    Training days can carry a slightly heavier
                                    intake while rest days keep structure and
                                    recovery visible.
                                </PreviewPanel>
                            </div>
                        </div>
                    </div>
                </PreviewShell>
            ),
        },
        {
            label: 'Nearby/Map',
            icon: MapPin,
            description:
                'Nearby support shows map context, filtered places, and fast next actions.',
            content: (
                <PreviewShell
                    activeLabel="Nearby/Map"
                    title="Find support around the user without leaving the flow."
<<<<<<< HEAD
                    description="Gyms, personal trainers, and dietitians stay visible with distance, fit, and messaging context."
=======
                    description="Gyms, trainers, and nutritionists stay visible with distance, fit, and messaging context."
>>>>>>> origin/main
                >
                    <div className="grid h-full gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="relative min-h-[18rem] overflow-hidden rounded-[26px] border border-border/70 bg-background/74">
                            <div className="absolute inset-x-8 top-1/2 h-1 rotate-[-11deg] rounded-full bg-primary/40" />
                            <div className="absolute inset-y-8 left-1/2 w-1 rotate-[18deg] rounded-full bg-secondary/35" />
                            {[
                                {
                                    position: 'top-[22%] left-[24%]',
                                    label: 'Gym',
                                    icon: Dumbbell,
                                },
                                {
                                    position: 'top-[48%] left-[58%]',
                                    label: 'Dietitian',
                                    icon: Utensils,
                                },
                                {
                                    position: 'top-[67%] left-[36%]',
<<<<<<< HEAD
                                    label: 'Personal Trainer',
=======
                                    label: 'Trainer',
>>>>>>> origin/main
                                    icon: Activity,
                                },
                            ].map(({ position, label, icon: Icon }) => (
                                <div
                                    key={label}
                                    className={`absolute ${position} rounded-[18px] border border-border/70 bg-card/88 px-3 py-2 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.35)]`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[12px] bg-primary/18 text-primary">
                                            <Icon className="size-3.5" />
                                        </span>
                                        <span className="text-xs font-semibold text-foreground">
                                            {label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="absolute right-4 bottom-4 rounded-[18px] border border-border/70 bg-card/88 px-4 py-3">
                                <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Current area
                                </p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                    3 options within 4 km
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                [
                                    'Byblos Fit Hub',
                                    '2.4 km',
<<<<<<< HEAD
                                    'Gym with strength equipment and personal trainer availability.',
=======
                                    'Gym with strength equipment and trainer availability.',
>>>>>>> origin/main
                                ],
                                [
                                    'Maya Nasser',
                                    '3.1 km',
                                    'Dietitian matched to Mediterranean meal planning.',
                                ],
                                [
                                    'Cedar Performance',
                                    '3.8 km',
<<<<<<< HEAD
                                    'Personal trainer comfortable with shoulder-aware programming.',
=======
                                    'Trainer comfortable with shoulder-aware programming.',
>>>>>>> origin/main
                                ],
                            ].map(([name, distance, note]) => (
                                <PreviewPanel
                                    key={name}
                                    eyebrow={distance}
                                    title={name}
                                >
                                    {note}
                                </PreviewPanel>
                            ))}
                        </div>
                    </div>
                </PreviewShell>
            ),
        },
        {
            label: 'Track Meals',
            icon: Utensils,
            description:
                'Meal tracking combines plan-following and quick logging in one focused view.',
            content: (
                <PreviewShell
                    activeLabel="Track Meals"
                    title="Log what happened today without losing the plan."
                    description="Quick logging, planned meals, safe substitutions, and daily totals all stay close to each other."
                >
                    <div className="grid h-full gap-4 lg:grid-cols-[1.06fr_0.94fr]">
                        <div className="space-y-4">
                            <PreviewPanel eyebrow="Planned day" title="Today">
                                <div className="space-y-3">
                                    {[
                                        [
                                            'Breakfast',
                                            'Logged exact',
                                            'Greek yogurt bowl with berries',
                                        ],
                                        [
                                            'Lunch',
                                            'Logged substitute',
                                            'Chicken rice bowl with extra vegetables',
                                        ],
                                        [
                                            'Snack',
                                            'Pending',
                                            'Protein gap still open for tonight',
                                        ],
                                        [
                                            'Dinner',
                                            'Planned',
                                            'Two dairy-free options are ready',
                                        ],
                                    ].map(([meal, status, note]) => (
                                        <div
                                            key={meal}
                                            className="rounded-[20px] border border-border/70 bg-card/82 px-4 py-3"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {meal}
                                                </p>
                                                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                    {status}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                {note}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </PreviewPanel>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <PreviewPanel
                                    eyebrow="Coach note"
                                    title="Safe swaps stay close"
                                >
                                    If protein is still low, the next suggestion
                                    stays filtered around allergies and diet
                                    type.
                                </PreviewPanel>
                                <PreviewPanel
                                    eyebrow="Mode"
                                    title="Quick log or follow plan"
                                >
                                    Users can log fast or stay anchored to the
                                    generated meal structure for the day.
                                </PreviewPanel>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <PreviewPanel
                                eyebrow="Daily totals"
                                title="Today at a glance"
                            >
                                <div className="space-y-4">
                                    {[
                                        ['Calories', '1,860 / 2,180', '85%'],
                                        ['Protein', '132 g / 158 g', '84%'],
                                        ['Hydration', '7 / 9 cups', '78%'],
                                    ].map(([label, value, width]) => (
                                        <div key={label}>
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
                            </PreviewPanel>

                            <PreviewPanel
                                eyebrow="Recommended next meal"
                                title="Dinner stays on target"
                                accent
                            >
                                Lentil soup, grilled chicken, or a dairy-free
                                yogurt bowl would close the day cleanly without
                                breaking restrictions.
                            </PreviewPanel>

                            <PreviewPanel
                                eyebrow="Discovery"
                                title="Fast logging stays practical"
                            >
                                Search, planned items, and substitutions all
                                feel like one flow instead of separate tools.
                            </PreviewPanel>
                        </div>
                    </div>
                </PreviewShell>
            ),
        },
        {
            label: 'Workout Log',
            icon: Dumbbell,
            description:
                'The workout tracker mirrors the real product more closely, with modes, active session status, and safer alternatives all in one workspace.',
            content: (
                <PreviewShell
                    activeLabel="Workout Log"
                    title="Keep guided sessions and fast logging in one clear workspace."
                    description="Day selection, live set logging, and safe alternatives stay visible without crowding the session."
                >
                    <div className="grid h-full gap-4 lg:grid-cols-[0.94fr_1.06fr]">
                        <div className="space-y-4">
                            <PreviewPanel
                                eyebrow="Session modes"
                                title="Follow AI plan, custom plan, or freestyle"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Follow AI Plan',
                                        'My Plan',
                                        'Freestyle',
                                    ].map((chip, index) => (
                                        <span
                                            key={chip}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                                index === 0
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'border border-border/70 bg-card/82 text-foreground'
                                            }`}
                                        >
                                            {chip}
                                        </span>
                                    ))}
                                </div>
                            </PreviewPanel>

                            <PreviewPanel
                                eyebrow="Recommended day"
                                title="Push day"
                                accent
                            >
                                <div className="space-y-3">
                                    {[
                                        'Incline dumbbell press',
                                        'Machine chest press',
                                        'Cable lateral raise',
                                        'Triceps rope pushdown',
                                    ].map((exercise) => (
                                        <div
                                            key={exercise}
                                            className="rounded-[18px] bg-white/9 px-4 py-3"
                                        >
                                            {exercise}
                                        </div>
                                    ))}
                                </div>
                            </PreviewPanel>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <PreviewMetric
                                    value="38 min"
                                    label="Active session"
                                />
                                <PreviewMetric value="8" label="Sets logged" />
                                <PreviewMetric
                                    value="26 kg"
                                    label="Top set memory"
                                />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <PreviewPanel
                                    eyebrow="Active logging"
                                    title="Set-by-set flow"
                                >
                                    Reps, weight, and previous performance stay
                                    visible while the session is in progress.
                                </PreviewPanel>
                                <PreviewPanel
                                    eyebrow="Protection"
                                    title="Alternative ready"
                                >
                                    If shoulder discomfort shows up, the page
                                    can swap to safer pressing options without
                                    breaking the workout rhythm.
                                </PreviewPanel>
                            </div>

                            <PreviewPanel
                                eyebrow="Recent sessions"
                                title="Timeline stays easy to scan"
                            >
                                The page can show guided and freestyle sessions
                                in one timeline, so nothing feels buried after
                                the workout ends.
                            </PreviewPanel>
                        </div>
                    </div>
                </PreviewShell>
            ),
        },
        {
            label: 'AI Coach',
            icon: MessageSquare,
            description:
                'Coach responses stay grounded in profile and recent behavior.',
            content: (
                <PreviewShell
                    activeLabel="AI Coach"
                    title="Answers stay personalized without exposing internal AI noise."
                    description="Conversation stays central with today, last 7 days, and restriction context available."
                >
                    <div className="grid h-full gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                        <div className="space-y-4">
                            <div className="space-y-3 rounded-[28px] border border-border/70 bg-background/88 p-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.42)]">
                                <div className="flex justify-end">
                                    <div className="max-w-[78%] rounded-[24px] bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                                        I still need a safe dinner idea that
                                        helps me close protein tonight.
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="max-w-[84%] rounded-[24px] border border-border/70 bg-card/84 px-4 py-3 text-sm leading-6 text-foreground">
                                        You are still short on protein today. A
                                        grilled chicken wrap, lentil bowl, or
                                        dairy-free yogurt parfait would close
                                        the gap without violating your saved
                                        restrictions.
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="max-w-[84%] rounded-[24px] border border-border/70 bg-card/84 px-4 py-3 text-sm leading-6 text-foreground">
                                        If your shoulder feels irritated after
                                        training, keep dinner simple and skip
                                        anything that makes prep uncomfortable.
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <PreviewPanel
                                    eyebrow="Reply style"
                                    title="Clear next step"
                                >
                                    Replies stay direct, safe, and actionable.
                                </PreviewPanel>
                                <PreviewPanel
                                    eyebrow="Follow-up ready"
                                    title="Thread-aware coaching"
                                >
                                    The coach can keep the conversation moving
                                    without asking the user to repeat their
                                    profile.
                                </PreviewPanel>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <PreviewPanel
                                eyebrow="Today"
                                title="Current context"
                            >
                                Meals logged, hydration pace, and any active
                                workout stay available before suggestions are
                                made.
                            </PreviewPanel>
                            <PreviewPanel
                                eyebrow="Last 7 days"
                                title="Consistency snapshot"
                            >
                                Meal consistency, recovery trend, and missed
                                habits help the answer stay realistic.
                            </PreviewPanel>
                            <PreviewPanel
                                eyebrow="Profile"
                                title="Restrictions stay attached"
                                accent
                            >
                                Goals, allergies, injuries, and diet type remain
                                in the coaching context by default.
                            </PreviewPanel>
                        </div>
                    </div>
                </PreviewShell>
            ),
        },
    ];

    useEffect(() => {
        const section = previewSectionRef.current;
        if (!section || typeof IntersectionObserver === 'undefined') {
            setPreviewInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                setPreviewInView(entry.isIntersecting);
            },
            { threshold: 0.25 },
        );

        observer.observe(section);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!previewInView) {
            return;
        }

        const timer = window.setInterval(() => {
            setActivePreview((current) => (current + 1) % previews.length);
        }, AUTO_PREVIEW_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [previewInView, previews.length]);

    return (
        <>
            <Head title="Hayetak" />
            <a
                href="#main-content"
                className={`sr-only rounded-md bg-card px-3 py-2 text-sm font-semibold shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 ${FOCUS_RING}`}
            >
                Skip to main content
            </a>

            <div className="relative min-h-screen overflow-hidden bg-background [font-kerning:normal] [text-rendering:optimizeLegibility] [word-spacing:0.015em]">
                <header
                    className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                        scrolled
                            ? 'border-b border-border/70 bg-background/86 backdrop-blur-xl'
                            : 'bg-transparent'
                    }`}
                >
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                        <a
                            href="#hero"
<<<<<<< HEAD
                            className="inline-flex items-center no-underline"
                        >
                            <div>
                                <AppWordmark
                                    iconClassName="size-8"
                                    textClassName="text-[1.52rem] text-foreground"
                                />
=======
                            className="inline-flex items-center gap-3 no-underline"
                        >
                            <AppLogoIcon className="size-8" />
                            <div>
                                <p
                                    className="text-xl tracking-normal text-foreground"
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                    }}
                                >
                                    Hayetak
                                </p>
>>>>>>> origin/main
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Planner, tracker, coach
                                </p>
                            </div>
                        </a>

                        <nav className="hidden items-center gap-3 md:flex">
                            {[
                                ['#story', 'How it works'],
                                ['#preview', 'Live demo'],
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
                            <div className="inline-flex items-center rounded-full border border-border/70 bg-card/80 p-1">
                                <button
                                    type="button"
                                    onClick={() => updateAppearance('light')}
                                    aria-label="Switch to light mode"
                                    className={`${FOCUS_RING} inline-flex h-8 w-8 items-center justify-center rounded-full transition ${!isDark ? 'bg-primary/16' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Sun className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateAppearance('dark')}
                                    aria-label="Switch to dark mode"
                                    className={`${FOCUS_RING} inline-flex h-8 w-8 items-center justify-center rounded-full transition ${isDark ? 'bg-primary/16' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Moon className="size-4" />
                                </button>
                            </div>
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
                            {mobileOpen ? (
                                <X className="size-5" />
                            ) : (
                                <Menu className="size-5" />
                            )}
                        </button>
                    </div>

                    {mobileOpen ? (
                        <div className="border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur-xl md:hidden">
                            <div className="mb-3 inline-flex items-center rounded-full border border-border/70 bg-card/80 p-1">
                                <button
                                    type="button"
                                    onClick={() => updateAppearance('light')}
                                    aria-label="Switch to light mode"
                                    className={`${FOCUS_RING} inline-flex h-8 w-8 items-center justify-center rounded-full transition ${!isDark ? 'bg-primary/16' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Sun className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateAppearance('dark')}
                                    aria-label="Switch to dark mode"
                                    className={`${FOCUS_RING} inline-flex h-8 w-8 items-center justify-center rounded-full transition ${isDark ? 'bg-primary/16' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Moon className="size-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ['#story', 'How it works'],
                                    ['#preview', 'Live demo'],
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
                    <div
                        id="hero"
                        className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32 lg:px-8 lg:pb-20"
                    >
                        <div className="mx-auto w-full max-w-[80%] space-y-6 pt-4 text-center">
                            <h1
                                className="mx-auto w-full max-w-full text-[2.7rem] leading-[0.98] tracking-[-0.02em] text-foreground sm:text-[3.45rem] lg:text-[4rem]"
                                style={{
                                    fontFamily: 'var(--font-display)',
                                }}
                            >
                                Create your profile, generate a safer plan,
                                track the day, and get coaching that adapts.
                            </h1>

                            <div className="flex flex-wrap justify-center gap-3">
                                <Cta
                                    href="/register"
                                    className="px-7 py-3.5 text-base"
                                >
                                    Start your plan
                                    <ArrowRight className="size-5" />
                                </Cta>
                                <Cta
                                    href="/login"
                                    variant="secondary"
                                    className="px-7 py-3.5 text-base"
                                >
                                    Sign in
                                </Cta>
                            </div>
                        </div>
                    </div>

                    <div
                        id="story"
                        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14"
                    >
                        <SectionTitle
                            eyebrow="How it works"
                            title="A full health workflow, not a scattered fitness stack"
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
                                <div
                                    key={step}
                                    className="haye-panel rounded-[28px] p-5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                                            {step}
                                        </span>
                                        <Icon className="size-5 text-secondary" />
                                    </div>
                                    <p className="mt-5 text-lg font-semibold tracking-normal text-foreground">
                                        {title}
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        {copy}
                                    </p>
                                </div>
                            ))}
                         </div>
                    </div>

                    <div id="preview" className="relative py-6 sm:py-8">
                        <div
                            ref={previewSectionRef}
                            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
                        >
                            <div className="haye-panel overflow-hidden rounded-[30px] border border-border/70 bg-card/88 shadow-[0_34px_80px_-64px_rgba(0,0,0,0.35)] backdrop-blur">
                                <div className="flex w-full flex-col">
                                    <div className="px-4 pt-4 pb-3 sm:px-5 lg:px-6">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                            <div className="max-w-3xl">
                                                <h2
                                                    className="mt-2 text-[1.65rem] tracking-normal text-foreground sm:text-[2rem]"
                                                    style={{
                                                        fontFamily:
                                                            'var(--font-display)',
                                                    }}
                                                >
                                                    Real product views
                                                </h2>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {previews.map(
                                                    (preview, index) => (
                                                        <button
                                                            key={preview.label}
                                                            type="button"
                                                            onClick={() =>
                                                                setActivePreview(
                                                                    index,
                                                                )
                                                            }
                                                            className={`${FOCUS_RING} inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                                                                activePreview ===
                                                                index
                                                                    ? 'bg-primary text-primary-foreground shadow-[0_16px_30px_-24px_rgba(143,199,63,0.8)]'
                                                                    : 'border border-border/70 bg-card/80 text-foreground hover:bg-background/90'
                                                            }`}
                                                        >
                                                            <preview.icon className="size-4" />
                                                            {preview.label}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[32rem] overflow-hidden border-y border-border/70 bg-background/70 sm:h-[34rem] lg:h-[36rem]">
                                        <div className="h-full w-full transition-all duration-300 ease-out">
                                            {previews[activePreview]?.content}
                                        </div>
                                    </div>

                                    <div className="px-4 py-3 sm:px-5 lg:px-6">
                                        <div className="flex items-center gap-2">
                                            {previews.map((preview, index) => (
                                                <span
                                                    key={`${preview.label}-progress`}
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                                        activePreview === index
                                                            ? 'w-12 bg-primary'
                                                            : 'w-5 bg-border'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>

                    <div
                        id="trust"
                        className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8 lg:pt-12 lg:pb-14"
                    >
                        <div className="haye-panel rounded-[36px] p-6 sm:p-8 lg:p-10">
                            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                                <div>
                                    <p className="haye-kicker">
                                        Trust and safety
                                    </p>
                                    <h2
                                        className="mt-3 text-3xl tracking-normal text-foreground sm:text-4xl"
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                        }}
                                    >
                                        Safety and credibility stay visible
                                        inside the product.
                                    </h2>
                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                        Hayetak is built so allergies, diet
                                        type, injury history, and medical
                                        constraints affect planning and coaching
                                        where decisions are made, not only in
                                        hidden settings or technical messages.
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
                                            copy: "Coach suggestions can reference today's logs and the last 7 days.",
                                        },
                                        {
                                            icon: MapPin,
                                            title: 'Human support paths',
                                            copy: 'Nearby professionals, appointments, and messaging keep expert help close when needed.',
                                        },
                                    ].map(({ icon: Icon, title, copy }) => (
                                        <div
                                            key={title}
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
                    </div>
                </main>
            </div>
        </>
    );
}
