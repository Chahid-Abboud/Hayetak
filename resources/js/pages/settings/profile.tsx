import NavHeader from '@/components/NavHeader';
import { Head, router, usePage } from '@inertiajs/react';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

/* ---------- Types ---------- */
type NumericLike = number | string;

type UserProfile = {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    gender: string | null;
    age: NumericLike | null;
    height_cm: NumericLike | null;
    weight_kg: NumericLike | null;
} | null;

type Prefs = {
    dietary_goal: string | null;
    fitness_goals: string[];
    diet_type: string | null;
    diet_other: string | null;
    allergies: string[];
} | null;

type Measurement = { date: string; type: 'weight' | 'height'; value: number };
type ProgressMetric = 'weight' | 'height';

type PageProps = {
    auth?: {
        user?: {
            id: number;
            email: string;
            name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            username?: string | null;
            gender?: string | null;
            age?: NumericLike | null;
            height_cm?: NumericLike | null;
            weight_kg?: NumericLike | null;
            two_factor_enabled?: boolean;
        } | null;
    };
    flash?: { status?: string; success?: string; error?: string };

    displayName?: string;
    userProfile?: UserProfile;
    prefs?: Prefs;
    dietName?: string;
    weightHistory?: Measurement[];
    heightHistory?: Measurement[];

    // If your backend adds it later:
    // exerciseProgress?: ExerciseProgressPoint[];
};

/* ---------- Safe defaults ---------- */
const DEFAULT_PROFILE = {
    first_name: '',
    last_name: '',
    username: '',
    gender: '',
    age: null as number | null,
    height_cm: null as number | null,
    weight_kg: null as number | null,
};

const DEFAULT_PREFS: NonNullable<Prefs> = {
    dietary_goal: '',
    fitness_goals: [],
    diet_type: '',
    diet_other: '',
    allergies: [],
};

const FITNESS_GOAL_OPTIONS = [
    'Lose fat',
    'Build muscle',
    'Increase strength',
    'Improve endurance',
    'General health',
] as const;

const GENDER_OPTIONS = [
    'male',
    'female',
    'other',
    'prefer not to say',
] as const;

const DIET_TYPES = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'high_protein', label: 'High Protein' },
    { value: 'low_carb', label: 'Low Carb' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'keto', label: 'Keto' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'other', label: 'Other' },
] as const;

/* ---------- Helpers ---------- */
function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

function formatMaybeNumber(
    n: number | string | null | undefined,
    suffix?: string,
) {
    if (n === null || n === undefined || n === '') return '—';
    const num = typeof n === 'string' ? Number(n) : n;
    if (!Number.isFinite(num)) return '—';
    return suffix ? `${num}${suffix}` : String(num);
}

function latestMeasurementValue(list: Measurement[]) {
    if (!list?.length) return null;
    // Assumes date is YYYY-MM-DD
    const sorted = [...list].sort((a, b) => (a.date > b.date ? 1 : -1));
    return sorted[sorted.length - 1]?.value ?? null;
}

function sanitizeChip(input: string) {
    return input.trim().replace(/\s+/g, ' ');
}

function todayYmd() {
    return new Date().toISOString().slice(0, 10);
}

/* ---------- Small UI bits (token-friendly) ---------- */
function SectionCard({
    id,
    title,
    description,
    actions,
    children,
}: {
    id?: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section
            id={id}
            className="scroll-mt-24 rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
            aria-labelledby={id ? `${id}-title` : undefined}
        >
            <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h2
                        id={id ? `${id}-title` : undefined}
                        className="text-lg font-semibold tracking-tight"
                    >
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function Button({
    variant = 'primary',
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
}) {
    const base =
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';
    const styles: Record<string, string> = {
        primary:
            'bg-primary text-primary-foreground hover:opacity-90 border border-transparent',
        secondary:
            'bg-secondary text-secondary-foreground hover:opacity-90 border border-transparent',
        outline:
            'border border-border bg-transparent text-foreground hover:bg-muted',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
    };
    return (
        <button className={cx(base, styles[variant], className)} {...props} />
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground">
            {children}
        </span>
    );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="text-xs tracking-wide text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">
                {value}
            </div>
        </div>
    );
}

function LabeledInput({
    id,
    label,
    value,
    onChange,
    type = 'text',
    inputMode,
    placeholder,
    description,
}: {
    id: string;
    label: string;
    value: string | number | readonly string[] | undefined;
    onChange: (v: string) => void;
    type?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    placeholder?: string;
    description?: string;
}) {
    const descId = description ? `${id}-desc` : undefined;
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            {description ? (
                <p id={descId} className="mt-1 text-xs text-muted-foreground">
                    {description}
                </p>
            ) : null}
            <input
                id={id}
                type={type}
                inputMode={inputMode}
                className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-describedby={descId}
            />
        </div>
    );
}

function LabeledSelect({
    id,
    label,
    value,
    onChange,
    children,
    description,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    children: React.ReactNode;
    description?: string;
}) {
    const descId = description ? `${id}-desc` : undefined;
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            {description ? (
                <p id={descId} className="mt-1 text-xs text-muted-foreground">
                    {description}
                </p>
            ) : null}
            <select
                id={id}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-describedby={descId}
            >
                {children}
            </select>
        </div>
    );
}

function LabeledDate({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            <input
                id={id}
                type="date"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function EmptyState({
    title,
    body,
    action,
}: {
    title: string;
    body: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}

/* ---------- Lightweight SVG Line Chart (no deps) ---------- */
type ChartPoint = { xLabel: string; xValue: number; yValue: number };

function LineChart({
    title,
    points,
    ySuffix,
}: {
    title: string;
    points: ChartPoint[];
    ySuffix?: string;
}) {
    // Basic guardrails
    if (!points?.length) {
        return (
            <EmptyState
                title={`${title}: No data yet`}
                body="Add a few entries below to see your progress over time."
            />
        );
    }

    const width = 720;
    const height = 220;
    const padX = 28;
    const padY = 18;

    const xs = points.map((p) => p.xValue);
    const ys = points.map((p) => p.yValue);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Avoid flatline divide-by-zero
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const toX = (x: number) => padX + ((x - minX) / spanX) * (width - padX * 2);
    const toY = (y: number) =>
        height - padY - ((y - minY) / spanY) * (height - padY * 2);

    const d = points
        .map(
            (p, idx) =>
                `${idx === 0 ? 'M' : 'L'} ${toX(p.xValue)} ${toY(p.yValue)}`,
        )
        .join(' ');

    const last = points[points.length - 1];
    const first = points[0];

    return (
        <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">
                    {title}
                </div>
                <div className="text-xs text-muted-foreground">
                    {first?.xLabel} → {last?.xLabel} ·{' '}
                    <span className="text-foreground tabular-nums">
                        {first?.yValue}
                        {ySuffix ?? ''} → {last?.yValue}
                        {ySuffix ?? ''}
                    </span>
                </div>
            </div>

            <div className="mt-3 overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label={`${title} line chart`}
                    className="h-[220px] w-full min-w-[520px]"
                >
                    {/* grid lines (minimal) */}
                    <line
                        x1={padX}
                        y1={padY}
                        x2={padX}
                        y2={height - padY}
                        stroke="var(--border)"
                        strokeWidth="1"
                    />
                    <line
                        x1={padX}
                        y1={height - padY}
                        x2={width - padX}
                        y2={height - padY}
                        stroke="var(--border)"
                        strokeWidth="1"
                    />

                    {/* path */}
                    <path
                        d={d}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                    />

                    {/* points */}
                    {points.map((p, i) => (
                        <circle
                            key={`${p.xLabel}-${i}`}
                            cx={toX(p.xValue)}
                            cy={toY(p.yValue)}
                            r={3.25}
                            fill="var(--primary)"
                        />
                    ))}
                </svg>
            </div>

            {/* Screen-reader friendly summary table */}
            <details className="mt-2">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    View data table
                </summary>
                <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-muted-foreground">
                                <th className="py-2 pr-4">Date</th>
                                <th className="py-2 pr-4">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {points.map((p, i) => (
                                <tr
                                    key={`${p.xLabel}-${i}`}
                                    className="border-t border-border"
                                >
                                    <td className="py-2 pr-4">{p.xLabel}</td>
                                    <td className="py-2 pr-4 tabular-nums">
                                        {p.yValue}
                                        {ySuffix ?? ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}

function MeasurementProgress({
    weightPoints,
    heightPoints,
}: {
    weightPoints: ChartPoint[];
    heightPoints: ChartPoint[];
}) {
    const [metric, setMetric] = useState<ProgressMetric>('weight');

    const active =
        metric === 'weight'
            ? { label: 'Weight', unit: ' kg', points: weightPoints }
            : { label: 'Height', unit: ' cm', points: heightPoints };

    const first = active.points[0];
    const last = active.points[active.points.length - 1];
    const delta = first && last ? last.yValue - first.yValue : null;
    const deltaText =
        delta === null
            ? '—'
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${active.unit}`;

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3">
                <div>
                    <div className="text-sm font-semibold text-foreground">
                        Measurement trend
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Weight is selected by default. Switch anytime to
                        visualize height history.
                    </div>
                </div>
                <div className="inline-flex rounded-lg border border-border bg-background p-1">
                    <button
                        type="button"
                        onClick={() => setMetric('weight')}
                        className={cx(
                            'rounded-md px-3 py-1.5 text-sm transition',
                            metric === 'weight'
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted',
                        )}
                        aria-pressed={metric === 'weight'}
                    >
                        Weight
                    </button>
                    <button
                        type="button"
                        onClick={() => setMetric('height')}
                        className={cx(
                            'rounded-md px-3 py-1.5 text-sm transition',
                            metric === 'height'
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted',
                        )}
                        aria-pressed={metric === 'height'}
                    >
                        Height
                    </button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <FieldRow
                    label={`Latest ${active.label}`}
                    value={last ? `${last.yValue}${active.unit}` : '—'}
                />
                <FieldRow
                    label={`Change (${active.label})`}
                    value={deltaText}
                />
                <FieldRow
                    label="Logged entries"
                    value={String(active.points.length)}
                />
            </div>

            {active.points.length >= 2 ? (
                <LineChart
                    title={`${active.label} over time`}
                    points={active.points}
                    ySuffix={active.unit}
                />
            ) : (
                <EmptyState
                    title={`${active.label} chart: not enough data`}
                    body={`Add at least 2 ${active.label.toLowerCase()} entries to visualize a trend.`}
                />
            )}
        </div>
    );
}

/* ---------- Page ---------- */
export default function ProfilePage() {
    const page = usePage<PageProps>().props;

    // 1) Pull from route-provided props if present…
    let providedProfile: NonNullable<UserProfile> | null =
        page.userProfile ?? null;

    // 2) …otherwise fall back to globally shared auth.user
    if (!providedProfile && page.auth?.user) {
        const u = page.auth.user;
        providedProfile = {
            first_name: u.first_name ?? null,
            last_name: u.last_name ?? null,
            username: u.username ?? null,
            gender: u.gender ?? null,
            age: u.age ?? null,
            height_cm: u.height_cm ?? null,
            weight_kg: u.weight_kg ?? null,
        };
    }

    const authUser = page.auth?.user ?? null;
    const email = authUser?.email ?? '—';
    const twoFactorEnabled = !!authUser?.two_factor_enabled;

    const userProfile: NonNullable<UserProfile> =
        providedProfile ?? DEFAULT_PROFILE;

    // ✅ fallback username so it shows even if userProfile prop is missing
    const shownUsername = userProfile.username || authUser?.username || '';

    const prefs = (page.prefs ?? DEFAULT_PREFS) as NonNullable<Prefs>;
    const dietName = page.dietName ?? '';

    const weightHistory = useMemo<Measurement[]>(
        () => (Array.isArray(page.weightHistory) ? page.weightHistory : []),
        [page.weightHistory],
    );
    const heightHistory = useMemo<Measurement[]>(
        () => (Array.isArray(page.heightHistory) ? page.heightHistory : []),
        [page.heightHistory],
    );

    const displayName =
        page.displayName ??
        (providedProfile
            ? `${providedProfile.first_name ?? ''} ${providedProfile.last_name ?? ''}`.trim() ||
              authUser?.username ||
              authUser?.name ||
              'there'
            : authUser?.username || authUser?.name || 'there');

    // Local edit state
    const [editingProfile, setEditingProfile] = useState(false);
    const [editingPrefs, setEditingPrefs] = useState(false);

    // Focus management when toggling edit modes
    const profileFirstFieldRef = useRef<HTMLInputElement | null>(null);
    const prefsFirstFieldRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (editingProfile) profileFirstFieldRef.current?.focus();
    }, [editingProfile]);
    useEffect(() => {
        if (editingPrefs) prefsFirstFieldRef.current?.focus();
    }, [editingPrefs]);

    // Bound inputs
    const [firstName, setFirstName] = useState(userProfile.first_name ?? '');
    const [lastName, setLastName] = useState(userProfile.last_name ?? '');
    const [username, setUsername] = useState(userProfile.username ?? '');
    const [gender, setGender] = useState<string>(userProfile.gender ?? '');
    const [age, setAge] = useState<number | string>(userProfile.age ?? '');

    const [dietType, setDietType] = useState<string>(prefs.diet_type ?? '');
    const [dietOther, setDietOther] = useState<string>(prefs.diet_other ?? '');
    const [dietaryGoal, setDietaryGoal] = useState<string>(
        prefs.dietary_goal ?? '',
    );
    const [fitnessGoals, setFitnessGoals] = useState<string[]>(
        Array.isArray(prefs.fitness_goals) ? prefs.fitness_goals : [],
    );
    const [allergies, setAllergies] = useState<string[]>(
        Array.isArray(prefs.allergies) ? prefs.allergies : [],
    );
    const [newAllergy, setNewAllergy] = useState('');

    // measurements
    const [mDate, setMDate] = useState<string>(todayYmd());
    const [mType, setMType] = useState<'weight' | 'height'>('weight');
    const [mValue, setMValue] = useState<string>('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
    const [passwordErrors, setPasswordErrors] = useState<
        Record<string, string>
    >({});

    // Derived labels
    const dietTypeLabel = useMemo(() => {
        const fromType =
            DIET_TYPES.find((d) => d.value === (prefs?.diet_type ?? ''))
                ?.label ?? null;
        // If type is "other", show the custom label if present.
        if (prefs?.diet_type === 'other' && prefs?.diet_other)
            return prefs.diet_other;
        return fromType ?? dietName ?? '—';
    }, [prefs?.diet_type, prefs?.diet_other, dietName]);

    // Latest stats
    const latestWeight = useMemo(
        () => latestMeasurementValue(weightHistory),
        [weightHistory],
    );
    const latestHeight = useMemo(
        () => latestMeasurementValue(heightHistory),
        [heightHistory],
    );

    // Charts: map to normalized x
    const weightPoints: ChartPoint[] = useMemo(() => {
        const normalized = [...weightHistory]
            .filter((m) => m.type === 'weight' && Number.isFinite(m.value))
            .sort((a, b) => (a.date > b.date ? 1 : -1));
        return normalized.map((m) => ({
            xLabel: m.date,
            xValue: new Date(m.date).getTime(),
            yValue: m.value,
        }));
    }, [weightHistory]);

    const heightPoints: ChartPoint[] = useMemo(() => {
        const normalized = [...heightHistory]
            .filter((m) => m.type === 'height' && Number.isFinite(m.value))
            .sort((a, b) => (a.date > b.date ? 1 : -1));
        return normalized.map((m) => ({
            xLabel: m.date,
            xValue: new Date(m.date).getTime(),
            yValue: m.value,
        }));
    }, [heightHistory]);

    /* ---------- Actions (keep routes intact) ---------- */
    const saveProfile = () => {
        const ageNum =
            typeof age === 'string' && age !== '' ? Number(age) : age;
        router.patch(
            '/settings/profile',
            {
                first_name: firstName || null,
                last_name: lastName || null,
                username: username || null,
                gender: gender || null,
                age: ageNum === '' ? null : Number(ageNum),
            },
            { preserveScroll: true, onSuccess: () => setEditingProfile(false) },
        );
    };

    const savePrefs = () => {
        router.post(
            '/settings/profile/prefs',
            {
                diet_type: dietType || null,
                diet_other: dietType === 'other' ? dietOther || null : null,
                dietary_goal: dietaryGoal || null,
                fitness_goals: fitnessGoals,
                allergies,
            },
            { preserveScroll: true, onSuccess: () => setEditingPrefs(false) },
        );
    };

    const addAllergy = () => {
        const a = sanitizeChip(newAllergy);
        if (!a || allergies.includes(a)) return;
        setAllergies((prev) => [...prev, a]);
        setNewAllergy('');
    };

    const removeAllergy = (a: string) => {
        setAllergies((prev) => prev.filter((x) => x !== a));
    };

    const addMeasurement = () => {
        const valueNum = Number(mValue);
        if (!mDate || !valueNum || valueNum <= 0) return;

        router.post(
            '/settings/profile/measurements',
            { date: mDate, type: mType, value: valueNum },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setMDate(todayYmd());
                    setMValue('');
                    router.reload({
                        only: ['weightHistory', 'heightHistory', 'userProfile'],
                    });
                },
            },
        );
    };

    const savePassword = () => {
        setPasswordStatus(null);
        setPasswordErrors({});

        router.put(
            '/settings/password',
            {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordStatus('Password updated successfully.');
                },
                onError: (errors: Record<string, string>) => {
                    setPasswordErrors(errors);
                },
            },
        );
    };

    // IDs (avoid collisions + improve label associations)
    const ids = {
        profileFirst: useId(),
        profileLast: useId(),
        profileUser: useId(),
        profileGender: useId(),
        profileAge: useId(),

        prefsDietGoal: useId(),
        prefsDietType: useId(),
        prefsDietOther: useId(),

        mDate: useId(),
        mType: useId(),
        mValue: useId(),
        allergyInput: useId(),
    };

    const flash = page.flash ?? {};
    const flashMsg = flash.success || flash.error || flash.status || '';

    return (
        <>
            <Head title="Profile — Hayetak" />
            <NavHeader />

            {/* Skip link for keyboard users */}
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:shadow"
            >
                Skip to profile content
            </a>

            <main
                id="main"
                className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-12"
            >
                {/* Sidebar */}
                <aside className="md:col-span-3">
                    <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground md:sticky md:top-20">
                        <div className="mb-3 text-xs tracking-wide text-muted-foreground uppercase">
                            Profile sections
                        </div>
                        <nav
                            aria-label="Profile page navigation"
                            className="space-y-1"
                        >
                            <a
                                href="#overview"
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Overview
                            </a>
                            <a
                                href="#details"
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Profile details
                            </a>
                            <a
                                href="#preferences"
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Preferences
                            </a>
                            <a
                                href="#security"
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Security
                            </a>
                            <a
                                href="#progress"
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Progress
                            </a>
                            <a
                                href="#logs"
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Logs & history
                            </a>
                        </nav>
                    </div>
                </aside>

                {/* Content */}
                <div className="space-y-6 md:col-span-9">
                    {/* Flash message */}
                    {flashMsg ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className={cx(
                                'rounded-xl border border-border p-4 text-sm',
                                flash.error
                                    ? 'bg-destructive/10 text-foreground'
                                    : 'bg-muted/30 text-foreground',
                            )}
                        >
                            {flashMsg}
                        </div>
                    ) : null}

                    {/* Overview */}
                    <SectionCard
                        id="overview"
                        title={`Welcome, ${displayName || 'there'}`}
                        description="Review and update your info, preferences, and progress."
                    >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <FieldRow label="Email" value={email} />
                            <FieldRow
                                label="Two-factor auth"
                                value={
                                    twoFactorEnabled ? 'Enabled' : 'Not enabled'
                                }
                            />
                            <FieldRow
                                label="Username"
                                value={
                                    shownUsername ? `@${shownUsername}` : '—'
                                }
                            />
                            <FieldRow
                                label="Age"
                                value={formatMaybeNumber(userProfile.age)}
                            />
                            <FieldRow
                                label="Current weight"
                                value={
                                    latestWeight != null
                                        ? `${latestWeight} kg`
                                        : formatMaybeNumber(
                                              userProfile.weight_kg,
                                              ' kg',
                                          )
                                }
                            />
                            <FieldRow
                                label="Current height"
                                value={
                                    latestHeight != null
                                        ? `${latestHeight} cm`
                                        : formatMaybeNumber(
                                              userProfile.height_cm,
                                              ' cm',
                                          )
                                }
                            />
                            <FieldRow
                                label="Dietary goal"
                                value={prefs?.dietary_goal || '—'}
                            />
                            <FieldRow label="Diet type" value={dietTypeLabel} />
                            <FieldRow
                                label="Fitness goals"
                                value={
                                    prefs?.fitness_goals?.length ? (
                                        <span className="flex flex-wrap gap-1">
                                            {prefs.fitness_goals
                                                .slice(0, 4)
                                                .map((g, i) => (
                                                    <Badge key={`${g}-${i}`}>
                                                        {g}
                                                    </Badge>
                                                ))}
                                            {prefs.fitness_goals.length > 4 ? (
                                                <Badge>
                                                    +
                                                    {prefs.fitness_goals
                                                        .length - 4}{' '}
                                                    more
                                                </Badge>
                                            ) : null}
                                        </span>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                        </div>
                    </SectionCard>

                    {/* Profile details */}
                    <SectionCard
                        id="details"
                        title="Profile details"
                        description="Keep your identity details accurate. Height/weight logs are managed in the Logs section."
                        actions={
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingProfile((v) => !v)}
                            >
                                {editingProfile ? 'Cancel' : 'Edit'}
                            </Button>
                        }
                    >
                        {!editingProfile ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FieldRow
                                    label="Name"
                                    value={
                                        `${userProfile.first_name ?? ''} ${userProfile.last_name ?? ''}`.trim() ||
                                        '—'
                                    }
                                />
                                <FieldRow
                                    label="Username"
                                    value={shownUsername || '—'}
                                />
                                <FieldRow
                                    label="Gender"
                                    value={userProfile.gender || '—'}
                                />
                                <FieldRow
                                    label="Age"
                                    value={formatMaybeNumber(userProfile.age)}
                                />
                                <FieldRow
                                    label="Height (profile)"
                                    value={formatMaybeNumber(
                                        userProfile.height_cm,
                                        ' cm',
                                    )}
                                />
                                <FieldRow
                                    label="Weight (profile)"
                                    value={formatMaybeNumber(
                                        userProfile.weight_kg,
                                        ' kg',
                                    )}
                                />
                            </div>
                        ) : (
                            <form
                                className="grid gap-4 sm:grid-cols-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    saveProfile();
                                }}
                            >
                                <div>
                                    <label
                                        htmlFor={ids.profileFirst}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        First name
                                    </label>
                                    <input
                                        ref={profileFirstFieldRef}
                                        id={ids.profileFirst}
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={firstName}
                                        onChange={(e) =>
                                            setFirstName(e.target.value)
                                        }
                                        autoComplete="given-name"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={ids.profileLast}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Last name
                                    </label>
                                    <input
                                        id={ids.profileLast}
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={lastName}
                                        onChange={(e) =>
                                            setLastName(e.target.value)
                                        }
                                        autoComplete="family-name"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={ids.profileUser}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Username
                                    </label>
                                    <input
                                        id={ids.profileUser}
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        autoComplete="username"
                                    />
                                </div>

                                <LabeledSelect
                                    id={ids.profileGender}
                                    label="Gender"
                                    value={gender}
                                    onChange={setGender}
                                >
                                    <option value="">—</option>
                                    {GENDER_OPTIONS.map((g) => (
                                        <option key={g} value={g}>
                                            {g}
                                        </option>
                                    ))}
                                </LabeledSelect>

                                <div>
                                    <label
                                        htmlFor={ids.profileAge}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Age
                                    </label>
                                    <input
                                        id={ids.profileAge}
                                        type="number"
                                        min={0}
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        inputMode="numeric"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                                    <Button type="submit" variant="primary">
                                        Save profile
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingProfile(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </SectionCard>

                    {/* Preferences */}
                    <SectionCard
                        id="preferences"
                        title="Preferences"
                        description="These help personalize your plans (diet types, goals, allergies)."
                        actions={
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingPrefs((v) => !v)}
                            >
                                {editingPrefs ? 'Cancel' : 'Edit'}
                            </Button>
                        }
                    >
                        {!editingPrefs ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FieldRow
                                    label="Dietary goal"
                                    value={prefs?.dietary_goal || '—'}
                                />
                                <FieldRow
                                    label="Diet type"
                                    value={dietTypeLabel}
                                />

                                <div className="rounded-xl border border-border bg-background/40 p-4">
                                    <div className="text-xs tracking-wide text-muted-foreground uppercase">
                                        Fitness goals
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {prefs?.fitness_goals?.length ? (
                                            prefs.fitness_goals.map((fg, i) => (
                                                <Badge key={`${fg}-${i}`}>
                                                    {fg}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-background/40 p-4">
                                    <div className="text-xs tracking-wide text-muted-foreground uppercase">
                                        Allergies
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {prefs?.allergies?.length ? (
                                            prefs.allergies.map((al, i) => (
                                                <Badge key={`${al}-${i}`}>
                                                    {al}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form
                                className="grid gap-4 sm:grid-cols-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    savePrefs();
                                }}
                            >
                                <div className="sm:col-span-2">
                                    <LabeledInput
                                        id={ids.prefsDietGoal}
                                        label="Dietary goal"
                                        value={dietaryGoal}
                                        onChange={setDietaryGoal}
                                        placeholder="e.g., fat loss, maintenance, performance"
                                        description="Short phrase is enough. This helps guide plan targets."
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={ids.prefsDietType}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Diet type
                                    </label>
                                    <select
                                        id={ids.prefsDietType}
                                        className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={dietType}
                                        onChange={(e) =>
                                            setDietType(e.target.value)
                                        }
                                    >
                                        <option value="">—</option>
                                        {DIET_TYPES.map((d) => (
                                            <option
                                                key={d.value}
                                                value={d.value}
                                            >
                                                {d.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {dietType === 'other' ? (
                                    <div>
                                        <label
                                            htmlFor={ids.prefsDietOther}
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Diet type (other)
                                        </label>
                                        <input
                                            ref={prefsFirstFieldRef}
                                            id={ids.prefsDietOther}
                                            className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                            value={dietOther}
                                            onChange={(e) =>
                                                setDietOther(e.target.value)
                                            }
                                            placeholder="Type your diet name"
                                        />
                                    </div>
                                ) : (
                                    <div className="sr-only">
                                        <input ref={prefsFirstFieldRef} />
                                    </div>
                                )}

                                <div className="sm:col-span-2">
                                    <div className="text-sm font-medium text-foreground">
                                        Fitness goals
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {FITNESS_GOAL_OPTIONS.map((g) => {
                                            const checked =
                                                fitnessGoals.includes(g);
                                            return (
                                                <label
                                                    key={g}
                                                    className={cx(
                                                        'flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring hover:bg-muted',
                                                        checked &&
                                                            'bg-muted/40',
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) =>
                                                            setFitnessGoals(
                                                                (prev) =>
                                                                    e.target
                                                                        .checked
                                                                        ? [
                                                                              ...prev,
                                                                              g,
                                                                          ]
                                                                        : prev.filter(
                                                                              (
                                                                                  x,
                                                                              ) =>
                                                                                  x !==
                                                                                  g,
                                                                          ),
                                                            )
                                                        }
                                                    />
                                                    <span>{g}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <div className="text-sm font-medium text-foreground">
                                        Allergies
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {allergies.length ? (
                                            allergies.map((a) => (
                                                <span
                                                    key={a}
                                                    className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground"
                                                >
                                                    {a}
                                                    <button
                                                        type="button"
                                                        className="ml-2 rounded px-1 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                                                        onClick={() =>
                                                            removeAllergy(a)
                                                        }
                                                        aria-label={`Remove allergy ${a}`}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                No allergies added.
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <label
                                            className="sr-only"
                                            htmlFor={ids.allergyInput}
                                        >
                                            Add an allergy
                                        </label>
                                        <input
                                            id={ids.allergyInput}
                                            className="w-full flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                            placeholder="Add an allergy (e.g., peanuts)"
                                            value={newAllergy}
                                            onChange={(e) =>
                                                setNewAllergy(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addAllergy();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addAllergy}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                                    <Button type="submit" variant="primary">
                                        Save preferences
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingPrefs(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </SectionCard>

                    {/* Security */}
                    <SectionCard
                        id="security"
                        title="Security"
                        description="Change your account password without leaving this page."
                    >
                        <div className="grid gap-4">
                            <div className="rounded-xl border border-border bg-background/40 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">
                                            Two-factor authentication
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Keep 2FA optional and manage it from
                                            here whenever you want extra account
                                            protection.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge>
                                            {twoFactorEnabled
                                                ? '2FA enabled'
                                                : '2FA optional'}
                                        </Badge>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                router.visit(
                                                    '/settings/two-factor',
                                                )
                                            }
                                        >
                                            Manage 2FA
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <form
                                className="grid gap-4 sm:grid-cols-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    savePassword();
                                }}
                            >
                                <div className="sm:col-span-2">
                                    <label
                                        className="text-sm font-medium text-foreground"
                                        htmlFor="current-password"
                                    >
                                        Current password
                                    </label>
                                    <input
                                        id="current-password"
                                        type="password"
                                        autoComplete="current-password"
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(e.target.value)
                                        }
                                    />
                                    {passwordErrors.current_password ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {passwordErrors.current_password}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label
                                        className="text-sm font-medium text-foreground"
                                        htmlFor="new-password"
                                    >
                                        New password
                                    </label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        autoComplete="new-password"
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(e.target.value)
                                        }
                                    />
                                    {passwordErrors.password ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {passwordErrors.password}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label
                                        className="text-sm font-medium text-foreground"
                                        htmlFor="confirm-password"
                                    >
                                        Confirm new password
                                    </label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        autoComplete="new-password"
                                        className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                    />
                                    {passwordErrors.password_confirmation ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {passwordErrors.password_confirmation}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-3 sm:col-span-2">
                                    <Button type="submit" variant="primary">
                                        Update password
                                    </Button>
                                    {passwordStatus ? (
                                        <span className="text-sm text-emerald-600">
                                            {passwordStatus}
                                        </span>
                                    ) : null}
                                </div>
                            </form>
                        </div>
                    </SectionCard>

                    {/* Progress (Charts) */}
                    <SectionCard
                        id="progress"
                        title="Progress"
                        description="Visualize your trends from logged measurements and workout data."
                    >
                        <div className="grid gap-4">
                            <MeasurementProgress
                                weightPoints={weightPoints}
                                heightPoints={heightPoints}
                            />

                            <div className="rounded-xl border border-border bg-background/40 p-4">
                                <div className="text-sm font-semibold text-foreground">
                                    Exercise progress (max weight & reps)
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    This section will show progress per exercise
                                    (e.g., Bench Press) as line charts once the
                                    backend provides normalized exercise
                                    progress data.
                                </p>
                                <div className="mt-3 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                        Status:
                                    </span>{' '}
                                    waiting for backend data.
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Logs & history */}
                    <SectionCard
                        id="logs"
                        title="Logs & history"
                        description="Add measurements, then review recent entries. Charts update automatically."
                    >
                        <div className="grid gap-4">
                            <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <div className="text-sm font-semibold text-foreground">
                                    Add a measurement
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Log weight (kg) regularly. Height (cm) is
                                    optional.
                                </p>

                                <form
                                    className="mt-4 grid gap-3 sm:grid-cols-[12rem,12rem,1fr,auto]"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        addMeasurement();
                                    }}
                                >
                                    <LabeledDate
                                        id={ids.mDate}
                                        label="Date"
                                        value={mDate}
                                        onChange={setMDate}
                                    />

                                    <div>
                                        <label
                                            htmlFor={ids.mType}
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Type
                                        </label>
                                        <select
                                            id={ids.mType}
                                            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                            value={mType}
                                            onChange={(e) =>
                                                setMType(
                                                    e.target.value as
                                                        | 'weight'
                                                        | 'height',
                                                )
                                            }
                                        >
                                            <option value="weight">
                                                Weight (kg)
                                            </option>
                                            <option value="height">
                                                Height (cm)
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor={ids.mValue}
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Value
                                        </label>
                                        <input
                                            id={ids.mValue}
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            step="0.1"
                                            className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                            placeholder={
                                                mType === 'weight'
                                                    ? 'e.g., 72'
                                                    : 'e.g., 175'
                                            }
                                            value={mValue}
                                            onChange={(e) =>
                                                setMValue(e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="flex items-end">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-full"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </form>

                                {(!mDate || !mValue || Number(mValue) <= 0) && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Tip: choose a date and enter a value
                                        greater than 0.
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <RecentListCard
                                    title="Recent Weight (kg)"
                                    data={weightHistory}
                                />
                                <RecentListCard
                                    title="Recent Height (cm)"
                                    data={heightHistory}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    <footer className="px-1 py-2 text-xs text-muted-foreground">
                        Data is loaded from your database via Laravel. (React
                        escapes output by default.)
                    </footer>
                </div>
            </main>
        </>
    );
}

function RecentListCard({
    title,
    data,
}: {
    title: string;
    data: Measurement[];
}) {
    const items = useMemo(() => {
        const safe = Array.isArray(data) ? data : [];
        return safe.slice().sort((a, b) => (a.date > b.date ? 1 : -1));
    }, [data]);

    return (
        <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <div className="text-sm font-semibold">{title}</div>
            {items.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                    {items
                        .slice(-8)
                        .reverse()
                        .map((m, i) => (
                            <li
                                key={`${m.date}-${i}`}
                                className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2"
                            >
                                <span className="text-muted-foreground">
                                    {m.date}
                                </span>
                                <span className="font-medium text-foreground tabular-nums">
                                    {m.value}
                                </span>
                            </li>
                        ))}
                </ul>
            ) : (
                <div className="mt-3 text-sm text-muted-foreground">
                    No entries yet.
                </div>
            )}
        </div>
    );
}
