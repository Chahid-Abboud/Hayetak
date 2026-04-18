import AppearanceTabs from '@/components/appearance-tabs';
import {
    ProductBanner,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
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
    workout_days_per_week: number | null;
    workout_location: string | null;
    preferred_workout_days: string[];
    available_equipment: string[];
    injury_history: string[];
    medical_conditions: string[];
} | null;

type Measurement = { date: string; type: 'weight' | 'height'; value: number };

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
    workout_days_per_week: null,
    workout_location: '',
    preferred_workout_days: [],
    available_equipment: [],
    injury_history: [],
    medical_conditions: [],
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

const WORKOUT_LOCATION_OPTIONS = [
    { value: 'home', label: 'Home' },
    { value: 'gym', label: 'Gym' },
    { value: 'both', label: 'Both' },
] as const;

const WORKOUT_DAY_OPTIONS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
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
    const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState<number | ''>(
        typeof prefs.workout_days_per_week === 'number'
            ? prefs.workout_days_per_week
            : '',
    );
    const [workoutLocation, setWorkoutLocation] = useState<string>(
        prefs.workout_location ?? '',
    );
    const [preferredWorkoutDays, setPreferredWorkoutDays] = useState<string[]>(
        Array.isArray(prefs.preferred_workout_days)
            ? prefs.preferred_workout_days
            : [],
    );
    const [availableEquipment, setAvailableEquipment] = useState<string[]>(
        Array.isArray(prefs.available_equipment)
            ? prefs.available_equipment
            : [],
    );
    const [injuryHistory, setInjuryHistory] = useState<string[]>(
        Array.isArray(prefs.injury_history) ? prefs.injury_history : [],
    );
    const [medicalConditions, setMedicalConditions] = useState<string[]>(
        Array.isArray(prefs.medical_conditions) ? prefs.medical_conditions : [],
    );
    const [newEquipment, setNewEquipment] = useState('');
    const [newInjury, setNewInjury] = useState('');
    const [newMedicalCondition, setNewMedicalCondition] = useState('');

    // measurements
    const [mDate, setMDate] = useState<string>(todayYmd());
    const [mType, setMType] = useState<'weight' | 'height'>('weight');
    const [mValue, setMValue] = useState<string>('');

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
                workout_days_per_week:
                    workoutDaysPerWeek === ''
                        ? null
                        : Number(workoutDaysPerWeek),
                workout_location: workoutLocation || null,
                preferred_workout_days: preferredWorkoutDays,
                available_equipment: availableEquipment,
                injury_history: injuryHistory,
                medical_conditions: medicalConditions,
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

    const addChip = (
        nextValue: string,
        list: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        clear: () => void,
    ) => {
        const v = sanitizeChip(nextValue);
        if (!v || list.includes(v)) return;
        setter((prev) => [...prev, v]);
        clear();
    };

    const removeChip = (
        value: string,
        setter: React.Dispatch<React.SetStateAction<string[]>>,
    ) => {
        setter((prev) => prev.filter((item) => item !== value));
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
        prefsWorkoutDaysPerWeek: useId(),
        prefsWorkoutLocation: useId(),
        prefsEquipmentInput: useId(),
        prefsInjuryInput: useId(),
        prefsMedicalInput: useId(),

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

            {/* Skip link for keyboard users */}
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:shadow"
            >
                Skip to profile content
            </a>

            <ProductPageShell width="wide">
                <ProductHero
                    eyebrow="Account settings"
                    title="Profile"
                    description="Review and update your info, goals, appearance, and logs. Progress charts now live on Dashboard."
                />

                <div
                    id="main"
                    className="grid grid-cols-1 gap-6 md:grid-cols-12"
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
                                    href="#appearance"
                                    className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    Appearance
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
                            <ProductBanner
                                tone={flash.error ? 'danger' : 'default'}
                            >
                                {flashMsg}
                            </ProductBanner>
                        ) : null}

                        {/* Overview */}
                        <SectionCard
                            id="overview"
                            title={`Welcome, ${displayName || 'there'}`}
                            description="Review and update your info, preferences, and logs."
                        >
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <FieldRow label="Email" value={email} />
                                <FieldRow
                                    label="Two-factor auth"
                                    value={
                                        twoFactorEnabled
                                            ? 'Enabled'
                                            : 'Not enabled'
                                    }
                                />
                                <FieldRow
                                    label="Username"
                                    value={
                                        shownUsername
                                            ? `@${shownUsername}`
                                            : '—'
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
                                <FieldRow
                                    label="Diet type"
                                    value={dietTypeLabel}
                                />
                                <FieldRow
                                    label="Workout location"
                                    value={prefs?.workout_location || '—'}
                                />
                                <FieldRow
                                    label="Workout days/week"
                                    value={prefs?.workout_days_per_week ?? '—'}
                                />
                                <FieldRow
                                    label="Fitness goals"
                                    value={
                                        prefs?.fitness_goals?.length ? (
                                            <span className="flex flex-wrap gap-1">
                                                {prefs.fitness_goals
                                                    .slice(0, 4)
                                                    .map((g, i) => (
                                                        <Badge
                                                            key={`${g}-${i}`}
                                                        >
                                                            {g}
                                                        </Badge>
                                                    ))}
                                                {prefs.fitness_goals.length >
                                                4 ? (
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
                                        value={formatMaybeNumber(
                                            userProfile.age,
                                        )}
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
                                            onChange={(e) =>
                                                setAge(e.target.value)
                                            }
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
                                            onClick={() =>
                                                setEditingProfile(false)
                                            }
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
                                                prefs.fitness_goals.map(
                                                    (fg, i) => (
                                                        <Badge
                                                            key={`${fg}-${i}`}
                                                        >
                                                            {fg}
                                                        </Badge>
                                                    ),
                                                )
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

                                    <FieldRow
                                        label="Workout days per week"
                                        value={
                                            prefs?.workout_days_per_week ?? '—'
                                        }
                                    />
                                    <FieldRow
                                        label="Workout location"
                                        value={prefs?.workout_location || '—'}
                                    />

                                    <div className="rounded-xl border border-border bg-background/40 p-4">
                                        <div className="text-xs tracking-wide text-muted-foreground uppercase">
                                            Preferred workout days
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {prefs?.preferred_workout_days
                                                ?.length ? (
                                                prefs.preferred_workout_days.map(
                                                    (day, index) => (
                                                        <Badge
                                                            key={`${day}-${index}`}
                                                        >
                                                            {day}
                                                        </Badge>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-border bg-background/40 p-4">
                                        <div className="text-xs tracking-wide text-muted-foreground uppercase">
                                            Available equipment
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {prefs?.available_equipment
                                                ?.length ? (
                                                prefs.available_equipment.map(
                                                    (item, index) => (
                                                        <Badge
                                                            key={`${item}-${index}`}
                                                        >
                                                            {item}
                                                        </Badge>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-border bg-background/40 p-4">
                                        <div className="text-xs tracking-wide text-muted-foreground uppercase">
                                            Injury history
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {prefs?.injury_history?.length ? (
                                                prefs.injury_history.map(
                                                    (item, index) => (
                                                        <Badge
                                                            key={`${item}-${index}`}
                                                        >
                                                            {item}
                                                        </Badge>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-border bg-background/40 p-4">
                                        <div className="text-xs tracking-wide text-muted-foreground uppercase">
                                            Medical conditions
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {prefs?.medical_conditions
                                                ?.length ? (
                                                prefs.medical_conditions.map(
                                                    (item, index) => (
                                                        <Badge
                                                            key={`${item}-${index}`}
                                                        >
                                                            {item}
                                                        </Badge>
                                                    ),
                                                )
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
                                                    setNewAllergy(
                                                        e.target.value,
                                                    )
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

                                    <div>
                                        <label
                                            htmlFor={
                                                ids.prefsWorkoutDaysPerWeek
                                            }
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Workout days per week
                                        </label>
                                        <input
                                            id={ids.prefsWorkoutDaysPerWeek}
                                            type="number"
                                            min={1}
                                            max={7}
                                            inputMode="numeric"
                                            className="mt-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                            value={workoutDaysPerWeek}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                setWorkoutDaysPerWeek(
                                                    next === ''
                                                        ? ''
                                                        : Math.max(
                                                              1,
                                                              Math.min(
                                                                  7,
                                                                  Number(next),
                                                              ),
                                                          ),
                                                );
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor={ids.prefsWorkoutLocation}
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Workout location
                                        </label>
                                        <select
                                            id={ids.prefsWorkoutLocation}
                                            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                            value={workoutLocation}
                                            onChange={(e) =>
                                                setWorkoutLocation(
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">—</option>
                                            {WORKOUT_LOCATION_OPTIONS.map(
                                                (option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <div className="text-sm font-medium text-foreground">
                                            Preferred workout days
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {WORKOUT_DAY_OPTIONS.map((day) => {
                                                const checked =
                                                    preferredWorkoutDays.includes(
                                                        day,
                                                    );
                                                return (
                                                    <label
                                                        key={day}
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
                                                                setPreferredWorkoutDays(
                                                                    (prev) =>
                                                                        e.target
                                                                            .checked
                                                                            ? [
                                                                                  ...prev,
                                                                                  day,
                                                                              ]
                                                                            : prev.filter(
                                                                                  (
                                                                                      value,
                                                                                  ) =>
                                                                                      value !==
                                                                                      day,
                                                                              ),
                                                                )
                                                            }
                                                        />
                                                        <span>{day}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <div className="text-sm font-medium text-foreground">
                                            Available equipment
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {availableEquipment.length ? (
                                                availableEquipment.map(
                                                    (item) => (
                                                        <span
                                                            key={item}
                                                            className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground"
                                                        >
                                                            {item}
                                                            <button
                                                                type="button"
                                                                className="ml-2 rounded px-1 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                                                                onClick={() =>
                                                                    removeChip(
                                                                        item,
                                                                        setAvailableEquipment,
                                                                    )
                                                                }
                                                                aria-label={`Remove equipment ${item}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    No equipment added.
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input
                                                id={ids.prefsEquipmentInput}
                                                className="w-full flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                                placeholder="Add equipment (e.g., Dumbbells)"
                                                value={newEquipment}
                                                onChange={(e) =>
                                                    setNewEquipment(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addChip(
                                                            newEquipment,
                                                            availableEquipment,
                                                            setAvailableEquipment,
                                                            () =>
                                                                setNewEquipment(
                                                                    '',
                                                                ),
                                                        );
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    addChip(
                                                        newEquipment,
                                                        availableEquipment,
                                                        setAvailableEquipment,
                                                        () =>
                                                            setNewEquipment(''),
                                                    )
                                                }
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <div className="text-sm font-medium text-foreground">
                                            Injury history
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {injuryHistory.length ? (
                                                injuryHistory.map((item) => (
                                                    <span
                                                        key={item}
                                                        className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground"
                                                    >
                                                        {item}
                                                        <button
                                                            type="button"
                                                            className="ml-2 rounded px-1 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                                                            onClick={() =>
                                                                removeChip(
                                                                    item,
                                                                    setInjuryHistory,
                                                                )
                                                            }
                                                            aria-label={`Remove injury ${item}`}
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    No injuries added.
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input
                                                id={ids.prefsInjuryInput}
                                                className="w-full flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                                placeholder="Add an injury (e.g., knee pain)"
                                                value={newInjury}
                                                onChange={(e) =>
                                                    setNewInjury(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addChip(
                                                            newInjury,
                                                            injuryHistory,
                                                            setInjuryHistory,
                                                            () =>
                                                                setNewInjury(
                                                                    '',
                                                                ),
                                                        );
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    addChip(
                                                        newInjury,
                                                        injuryHistory,
                                                        setInjuryHistory,
                                                        () => setNewInjury(''),
                                                    )
                                                }
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <div className="text-sm font-medium text-foreground">
                                            Medical conditions
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {medicalConditions.length ? (
                                                medicalConditions.map(
                                                    (item) => (
                                                        <span
                                                            key={item}
                                                            className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground"
                                                        >
                                                            {item}
                                                            <button
                                                                type="button"
                                                                className="ml-2 rounded px-1 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                                                                onClick={() =>
                                                                    removeChip(
                                                                        item,
                                                                        setMedicalConditions,
                                                                    )
                                                                }
                                                                aria-label={`Remove medical condition ${item}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    No medical conditions added.
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input
                                                id={ids.prefsMedicalInput}
                                                className="w-full flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                                placeholder="Add a medical condition"
                                                value={newMedicalCondition}
                                                onChange={(e) =>
                                                    setNewMedicalCondition(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addChip(
                                                            newMedicalCondition,
                                                            medicalConditions,
                                                            setMedicalConditions,
                                                            () =>
                                                                setNewMedicalCondition(
                                                                    '',
                                                                ),
                                                        );
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    addChip(
                                                        newMedicalCondition,
                                                        medicalConditions,
                                                        setMedicalConditions,
                                                        () =>
                                                            setNewMedicalCondition(
                                                                '',
                                                            ),
                                                    )
                                                }
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
                                            onClick={() =>
                                                setEditingPrefs(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </SectionCard>

                        {/* Appearance */}
                        <SectionCard
                            id="appearance"
                            title="Appearance"
                            description="Choose the look that feels most comfortable across the product."
                        >
                            <div className="grid gap-4">
                                <div className="rounded-xl border border-border bg-background/40 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">
                                                Theme preference
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Appearance settings now live
                                                inside profile so your general
                                                account setup stays together.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                router.visit(
                                                    '/settings/security',
                                                )
                                            }
                                        >
                                            Open security
                                        </Button>
                                    </div>
                                </div>

                                <AppearanceTabs />
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
                                        Log weight (kg) regularly. Height (cm)
                                        is optional.
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

                                    {(!mDate ||
                                        !mValue ||
                                        Number(mValue) <= 0) && (
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
                            Data is loaded from your database via Laravel.
                            (React escapes output by default.)
                        </footer>
                    </div>
                </div>
            </ProductPageShell>
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
