// resources/js/pages/auth/register.tsx
import AppLogoIcon from '@/components/app-logo-icon';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    Activity,
    Brain,
    Check,
    Dumbbell,
    Eye,
    EyeOff,
    Mail,
    Shield,
    ShieldCheck,
    Sparkles,
    Utensils,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ---------- Props & Types ---------- */
type Props = {
    dietOptions?: string[];
    allergyOptions?: string[];
    fitnessGoals?: string[];
    dietaryGoals?: string[];
};

type Gender = 'male' | 'female' | 'other' | '';
type ActivityLevel =
    | 'Sedentary'
    | 'Lightly Active'
    | 'Moderately Active'
    | 'Very Active'
    | 'Athlete';
type WorkoutLocation = 'home' | 'gym' | 'both' | '';
type DietExperience = 'yes' | 'no' | '';
type AccountType = 'client' | 'trainer' | 'nutritionist';

type RegisterFormData = {
    first_name: string;
    last_name: string;
    username: string;
    gender: Gender;
    age: string;
    height_cm: string;
    weight_kg: string;
    has_medical_history: boolean;
    medical_history: string;
    dietary_goal: string;
    fitness_goal: string;
    diet_name: string;
    allergies: string[];
    activity_level: ActivityLevel | '';
    workout_days_per_week: string;
    workout_location: WorkoutLocation;
    tried_diet_before: DietExperience;
    diet_failure_reasons: string[];
    diet_failure_other: string;
    email: string;
    password: string;
    password_confirmation: string;
    diet_other_name: string;
    diet_choice: string;
    account_type: AccountType;
    verification_full_legal_name: string;
    verification_license_number: string;
    verification_authority: string;
    verification_country_state: string;
    verification_expiry_date: string;
    verification_documents: File[];
};

type NumericField = 'age' | 'height_cm' | 'weight_kg' | 'workout_days_per_week';

/* ---------- Fallbacks (safe defaults) ---------- */
const FALLBACK_DIETS = [
    'Mediterranean',
    'Keto',
    'Paleo',
    'Vegan',
    'Vegetarian',
    'DASH',
    'Low-Carb',
    'High-Protein',
    'Intermittent Fasting',
    'Whole30',
];

const FALLBACK_ALLERGIES = [
    'Peanuts',
    'Tree Nuts',
    'Milk',
    'Eggs',
    'Wheat',
    'Soy',
    'Fish',
    'Shellfish',
    'Sesame',
    'Gluten',
    'Mustard',
    'Celery',
    'Lupin',
    'Sulphites',
    'Corn',
    'Gelatin',
    'Coconut',
    'Kiwi',
    'Banana',
    'Avocado',
    'Tomato',
    'Strawberry',
    'Chocolate',
    'Garlic',
    'Onion',
];

const FALLBACK_FITNESS = [
    'Lose Weight',
    'Maintain',
    'Build Muscle',
    'Improve Endurance',
    'Recomposition',
];

const FALLBACK_DIETARY_GOALS = [
    'Calorie Deficit',
    'Maintenance',
    'Calorie Surplus',
    'Balanced Nutrition',
];

const ACTIVITY_LEVELS: ActivityLevel[] = [
    'Sedentary',
    'Lightly Active',
    'Moderately Active',
    'Very Active',
    'Athlete',
];

/* ---------- Small helpers ---------- */
const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

function getPasswordStrength(password: string): {
    score: number;
    label: string;
    barClass: string;
    textClass: string;
} {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        {
            label: 'Too short',
            barClass: 'bg-red-500',
            textClass: 'text-red-400',
        },
        {
            label: 'Weak',
            barClass: 'bg-orange-500',
            textClass: 'text-orange-400',
        },
        {
            label: 'Fair',
            barClass: 'bg-amber-500',
            textClass: 'text-amber-400',
        },
        {
            label: 'Good',
            barClass: 'bg-emerald-500',
            textClass: 'text-emerald-400',
        },
        {
            label: 'Strong',
            barClass: 'bg-emerald-500',
            textClass: 'text-emerald-400',
        },
        {
            label: 'Very strong',
            barClass: 'bg-secondary',
            textClass: 'text-secondary',
        },
    ];

    return { score, ...levels[Math.min(score, 5)] };
}

const FOCUS_RING =
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const INPUT_CLASS = `w-full rounded-xl border border-border/70 bg-background/82 px-4 py-2.5 text-sm text-foreground shadow-[0_18px_40px_-32px_rgba(15,23,42,0.75)] transition outline-none placeholder:text-muted-foreground/70 hover:border-secondary/45 focus:border-ring focus:ring-2 focus:ring-ring/30 ${FOCUS_RING}`;
const TEXTAREA_CLASS = `min-h-[120px] ${INPUT_CLASS}`;
const SELECT_CLASS = `${INPUT_CLASS} appearance-none`;
const CHOICE_PILL_CLASS =
    'inline-flex items-center rounded-full border border-border/70 px-4 py-2.5 text-sm font-medium transition';

// Total steps in the registration wizard.
const computeTotalSteps = (tried: 'yes' | 'no' | '') =>
    tried === 'yes' ? 6 : 5;

// allow free typing; strip invalid chars. For decimals, keep at most one dot
function sanitizeNumericLoose(raw: string, allowDecimal = false) {
    let s = raw.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
    if (allowDecimal) {
        const firstDot = s.indexOf('.');
        if (firstDot !== -1) {
            const head = s.slice(0, firstDot + 1);
            const tail = s.slice(firstDot + 1).replace(/\./g, '');
            s = head + tail;
        }
    }
    return s;
}

function clampAndFormat(
    str: string,
    {
        min,
        max,
        allowDecimal = false,
    }: { min: number; max: number; allowDecimal?: boolean },
) {
    let cleaned = str.trim();
    if (allowDecimal && cleaned.startsWith('.')) cleaned = '0' + cleaned; // ".5" -> "0.5"
    if (cleaned === '' || cleaned === '.' || cleaned === '0.') return '';

    const n = Number(cleaned);
    if (Number.isNaN(n)) return '';

    const clamped = clamp(n, min, max);
    if (allowDecimal) return String(Number(clamped.toFixed(2)));
    return String(Math.round(clamped));
}

function preventNonNumericKeys(
    e: React.KeyboardEvent<HTMLInputElement>,
    allowDecimal = false,
) {
    const blocked = ['e', 'E', '+', '-'];
    if (!allowDecimal) blocked.push('.');
    if (blocked.includes(e.key)) e.preventDefault();
}

/* ---------- UI helpers (small, no deps) ---------- */
function SectionCard({
    title,
    description,
    children,
    headingRef,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
    return (
        <section className="rounded-[28px] border border-border/70 bg-card/88 p-5 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
            <div className="space-y-2 border-b border-border/70 pb-4">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-secondary uppercase">
                    Guided setup
                </p>
                <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-xl font-semibold tracking-tight text-foreground"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    {title}
                </h2>
                {description ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
            <div className="space-y-4 pt-5">{children}</div>
        </section>
    );
}

function ErrorText({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
    return (
        <p id={id} className="mt-1 text-sm font-medium text-red-400">
            {children}
        </p>
    );
}

function Field({
    id,
    label,
    hint,
    error,
    children,
    required,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

    return (
        <div className="space-y-2">
            <label
                htmlFor={id}
                className="block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
            >
                {label}{' '}
                {required ? <span className="text-red-400">*</span> : null}
            </label>
            <div
                className="rounded-[20px]"
                aria-describedby={describedBy}
                aria-invalid={!!error}
            >
                {/* child should have id={id} */}
                {children}
            </div>
            {hint ? (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
            {error ? <ErrorText id={errId!}>{error}</ErrorText> : null}
        </div>
    );
}

/* Tile checkbox (keeps your styling, improves focus) */
function CheckTile({
    checked,
    onChange,
    label,
    name,
    value,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: React.ReactNode;
    name?: string;
    value?: string;
}) {
    return (
        <label
            className={[
                'flex cursor-pointer items-center gap-3 rounded-[20px] border border-border/70 bg-background/78 px-4 py-3.5 transition',
                checked
                    ? 'border-secondary/60 bg-secondary/10 ring-2 ring-secondary/20'
                    : 'hover:border-secondary/35 hover:bg-background/92',
            ].join(' ')}
        >
            <input
                type="checkbox"
                name={name}
                value={value}
                className={`h-4 w-4 shrink-0 rounded border-border bg-background text-secondary ${FOCUS_RING}`}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm text-foreground">{label}</span>
        </label>
    );
}

/* Pill radio group (styled like your buttons, correct semantics) */
function RadioPills<T extends string>({
    name,
    value,
    onChange,
    options,
    legend,
    error,
}: {
    name: string;
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    legend: string;
    error?: string;
}) {
    const errId = error ? `${name}-error` : undefined;

    return (
        <fieldset className="space-y-3" aria-describedby={errId}>
            <legend className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {legend}
            </legend>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => {
                    const active = value === opt.value;
                    return (
                        <label key={opt.value} className="cursor-pointer">
                            <input
                                type="radio"
                                name={name}
                                value={opt.value}
                                className="sr-only"
                                checked={active}
                                onChange={() => onChange(opt.value)}
                            />
                            <span
                                className={[
                                    CHOICE_PILL_CLASS,
                                    active
                                        ? 'border-secondary/60 bg-secondary/12 text-foreground'
                                        : 'bg-background/78 text-muted-foreground hover:border-secondary/35 hover:bg-background/92',
                                    FOCUS_RING,
                                ].join(' ')}
                            >
                                {opt.label}
                            </span>
                        </label>
                    );
                })}
            </div>
            {error ? <ErrorText id={errId!}>{error}</ErrorText> : null}
        </fieldset>
    );
}

/* Primary/secondary buttons */
function Button({
    children,
    onClick,
    variant = 'primary',
    type = 'button',
    disabled,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
    type?: 'button' | 'submit';
    disabled?: boolean;
}) {
    const base =
        'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition';
    const styles =
        variant === 'primary'
            ? 'bg-primary text-primary-foreground shadow-[0_20px_42px_-24px_rgba(23,38,60,0.55)] hover:bg-primary/92'
            : 'border border-border/70 bg-card/82 text-foreground hover:bg-background/85 hover:border-secondary/35';
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${styles} ${FOCUS_RING} disabled:opacity-50`}
        >
            {children}
        </button>
    );
}

/* ---------- Wizard component ---------- */
function RegisterWizard(props: Props) {
    // Use fallbacks whenever arrays are missing/empty
    const dietOptions =
        props.dietOptions && props.dietOptions.length
            ? props.dietOptions
            : FALLBACK_DIETS;
    const allergyOptions =
        props.allergyOptions && props.allergyOptions.length
            ? props.allergyOptions
            : FALLBACK_ALLERGIES;
    const fitnessGoals =
        props.fitnessGoals && props.fitnessGoals.length
            ? props.fitnessGoals
            : FALLBACK_FITNESS;
    const dietaryGoals =
        props.dietaryGoals && props.dietaryGoals.length
            ? props.dietaryGoals
            : FALLBACK_DIETARY_GOALS;

    const [step, setStep] = useState<number>(1);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>(
        {},
    );
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        useState(false);

    const { data, setData, post, processing, errors, transform } =
        useForm<RegisterFormData>({
            // Basic
            first_name: '',
            last_name: '',
            username: '',
            gender: '' as Gender,
            age: '' as string,
            height_cm: '' as string,
            weight_kg: '' as string,

            // Medical history
            has_medical_history: false,
            medical_history: '',

            // Goals
            dietary_goal: '',
            fitness_goal: '',
            diet_name: '', // final diet name that will be submitted
            allergies: [] as string[],

            // Activity & Training
            activity_level: '' as ActivityLevel | '',
            workout_days_per_week: '' as string,
            workout_location: '' as WorkoutLocation,

            // Diet experience
            tried_diet_before: '' as DietExperience,
            diet_failure_reasons: [] as string[],
            diet_failure_other: '',

            // Credentials
            email: '',
            password: '',
            password_confirmation: '',

            // NEW (client-only helper field): store "other diet" text separately
            diet_other_name: '',
            diet_choice: '' as string, // selected from list OR "Other"

            // Account type + professional verification
            account_type: 'client' as AccountType,
            verification_full_legal_name: '',
            verification_license_number: '',
            verification_authority: '',
            verification_country_state: '',
            verification_expiry_date: '',
            verification_documents: [] as File[],
        });

    const totalSteps = useMemo(
        () => computeTotalSteps(data.tried_diet_before),
        [data.tried_diet_before],
    );

    useEffect(() => {
        if (step > totalSteps) setStep(totalSteps);
    }, [totalSteps, step]);

    // focus management
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        // Focus the step heading when step changes (better for SR/keyboard)
        stepHeadingRef.current?.focus();
    }, [step]);

    const reasons = [
        'Too restrictive',
        'Hunger/low energy',
        'Social/lifestyle conflicts',
        'Too expensive',
        'Time/meal prep burden',
        'Lack of results',
        'Medical reasons',
        'Travel/routine changes',
        'Cravings',
        'Confusing guidance',
    ];

    const back = () => setStep((s) => Math.max(1, s - 1));

    const next = () => {
        if (!validateStep(step)) return;
        if (step === 4 && data.tried_diet_before === 'no') {
            setStep(totalSteps);
        } else {
            setStep((s) => Math.min(s + 1, totalSteps));
        }
    };

    const submit = () => {
        if (!validateStep(totalSteps)) return;

        transform((d) => {
            // ensure diet_name is correct at submit time
            const finalDiet =
                d.diet_choice === 'Other'
                    ? d.diet_other_name.trim()
                    : d.diet_choice;

            return {
                ...d,
                diet_name: finalDiet,
                // cast numeric strings just before submit
                age: d.age ? Number(d.age) : null,
                height_cm: d.height_cm ? Number(d.height_cm) : null,
                weight_kg: d.weight_kg ? Number(d.weight_kg) : null,
                workout_days_per_week:
                    d.workout_days_per_week !== ''
                        ? Number(d.workout_days_per_week)
                        : null,
            };
        });

        post('/register', { forceFormData: true });
    };

    // Numeric wrappers
    const onNumericChange =
        (key: NumericField, allowDecimal = false) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = sanitizeNumericLoose(e.target.value, allowDecimal);
            setData(key, val);
        };

    const onNumericBlur =
        (
            key: NumericField,
            opts: { min: number; max: number; allowDecimal?: boolean },
        ) =>
        () => {
            const current = String(data[key] ?? '');
            const formatted = clampAndFormat(current, opts);
            setData(key, formatted);
        };

    const workoutDaysNum = Number(data.workout_days_per_week);
    const workoutDaysWarning =
        data.workout_days_per_week !== '' &&
        (Number.isNaN(workoutDaysNum) ||
            workoutDaysNum < 1 ||
            workoutDaysNum > 7)
            ? 'Enter a number from 1 to 7.'
            : '';
    const passwordStrength = getPasswordStrength(data.password);

    function validateStep(s: number) {
        const ce: Record<string, string> = {};

        if (s === 1) {
            if (!data.account_type)
                ce.account_type = 'Please select an account type.';

            if (!data.first_name || String(data.first_name).trim().length < 2)
                ce.first_name = 'Please enter at least 2 characters.';
            if (!data.last_name || String(data.last_name).trim().length < 2)
                ce.last_name = 'Please enter at least 2 characters.';

            if (data.username) {
                if (!/^[A-Za-z0-9_.]+$/.test(data.username))
                    ce.username =
                        'Only letters, numbers, underscore and dot are allowed.';
                if (data.username.length > 24)
                    ce.username = 'Username must be 24 characters or fewer.';
            }

            const ageNum = Number(data.age);
            if (!ageNum || ageNum < 13 || ageNum > 100)
                ce.age = 'Age must be between 13 and 100.';

            const hNum = Number(data.height_cm);
            if (!hNum || hNum < 80 || hNum > 250)
                ce.height_cm = 'Height must be between 80 and 250 cm.';

            const wNum = Number(data.weight_kg);
            if (!wNum || wNum < 25 || wNum > 400)
                ce.weight_kg = 'Weight must be between 25 and 400 kg.';

            if (!data.gender) ce.gender = 'Please select a gender.';

            if (data.has_medical_history && !data.medical_history.trim()) {
                ce.medical_history = 'Please describe your medical history.';
            }
        }

        if (s === 2) {
            if (!data.dietary_goal) ce.dietary_goal = 'Select a dietary goal.';
            if (!data.fitness_goal) ce.fitness_goal = 'Select a fitness goal.';

            if (!data.diet_choice) ce.diet_choice = 'Select a diet.';
            if (data.diet_choice === 'Other') {
                if (!data.diet_other_name.trim())
                    ce.diet_other_name = 'Please type your diet name.';
            }
        }

        if (s === 3) {
            if (!data.activity_level)
                ce.activity_level = 'Select your activity level.';
            const d = Number(data.workout_days_per_week);
            if (
                data.workout_days_per_week === '' ||
                Number.isNaN(d) ||
                d < 1 ||
                d > 7
            ) {
                ce.workout_days_per_week = 'Enter a number from 1 to 7.';
            }
            if (!data.workout_location)
                ce.workout_location = "Choose where you'll train.";
        }

        if (s === 4) {
            if (!data.tried_diet_before)
                ce.tried_diet_before = 'Please choose Yes or No.';
        }

        if (s === 5 && data.tried_diet_before === 'yes') {
            if (
                data.diet_failure_reasons.length === 0 &&
                !data.diet_failure_other.trim()
            ) {
                ce.diet_failure_reasons =
                    'Pick at least one reason or fill in Other.';
            }
            if (data.diet_failure_other.length > 120)
                ce.diet_failure_other =
                    "Keep the 'Other' reason under 120 characters.";
        }

        if (s === totalSteps) {
            if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
                ce.email = 'Enter a valid email address.';
            if (!data.password || data.password.length < 8)
                ce.password = 'Password must be at least 8 characters.';
            if (data.password !== data.password_confirmation)
                ce.password_confirmation = 'Passwords do not match.';

            if (
                data.account_type === 'trainer' ||
                data.account_type === 'nutritionist'
            ) {
                if (!data.verification_full_legal_name.trim()) {
                    ce.verification_full_legal_name =
                        'Full legal name is required.';
                }
                if (!data.verification_license_number.trim()) {
                    ce.verification_license_number =
                        'License/certification number is required.';
                }
                if (!data.verification_authority.trim()) {
                    ce.verification_authority =
                        'Issuing authority is required.';
                }
                if (!data.verification_country_state.trim()) {
                    ce.verification_country_state =
                        'Country/state is required.';
                }
                if (!data.verification_expiry_date) {
                    ce.verification_expiry_date = 'Expiry date is required.';
                }
                if (!data.verification_documents.length) {
                    ce.verification_documents =
                        'Upload at least one verification document.';
                }
            }
        }

        setClientErrors(ce);
        return Object.keys(ce).length === 0;
    }

    const serverErrors = errors as Record<string, string | undefined>;
    const showServerOrClientError = (field: string) =>
        clientErrors[field] || serverErrors[field];

    const prog = useMemo(
        () => Array.from({ length: totalSteps }, (_, i) => i + 1),
        [totalSteps],
    );

    // Error summary for current step (helps SR users)
    const stepErrors = useMemo(() => {
        const out: { field: string; message: string }[] = [];
        Object.entries(clientErrors).forEach(([k, v]) =>
            out.push({ field: k, message: v }),
        );
        // include server errors if present and no client error for that field
        Object.entries(errors ?? {}).forEach(([k, v]) => {
            if (!clientErrors[k]) out.push({ field: k, message: String(v) });
        });
        return out;
    }, [clientErrors, errors]);

    return (
        <div className="space-y-6">
            <header className="space-y-4 rounded-[28px] border border-border/70 bg-card/88 px-5 py-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-secondary uppercase">
                            Hayetak onboarding
                        </p>
                        <h1
                            className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Create your Hayetak account
                        </h1>
                    </div>
                    <div className="rounded-full border border-border/70 bg-background/82 px-4 py-2 text-sm text-muted-foreground">
                        Step {step} of {totalSteps}
                    </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                    This takes about 2-3 minutes. We use these answers to tailor
                    your coach, plans, and safety guardrails.
                </p>
                <div
                    className="flex items-center justify-between gap-3"
                    aria-hidden="true"
                >
                    <div className="flex flex-1 gap-1.5">
                        {prog.map((i) => (
                            <div
                                key={i}
                                className={`rounded-full transition-all ${
                                    i < step
                                        ? 'h-1.5 w-4 bg-accent'
                                        : i === step
                                          ? 'h-1.5 w-6 bg-secondary'
                                          : 'h-1.5 w-1.5 bg-border'
                                }`}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                        {Math.round(
                            ((step - 1) / Math.max(totalSteps - 1, 1)) * 100,
                        )}
                        %
                    </span>
                </div>
            </header>

            {/* Error summary for screen readers + quick scan */}
            {stepErrors.length > 0 ? (
                <div
                    className="rounded-[24px] border border-red-500/30 bg-red-900/20 p-4"
                    role="alert"
                    aria-live="polite"
                >
                    <p className="text-sm font-semibold text-foreground">
                        Please fix the following:
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                        {stepErrors.slice(0, 6).map((e) => (
                            <li key={e.field}>{e.message}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Step 1: Basic */}
            {step === 1 && (
                <SectionCard
                    title="Basic Information"
                    headingRef={stepHeadingRef}
                    description="Tell us a bit about you. This helps the AI personalize your plans."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <fieldset className="space-y-3">
                                <legend className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Account type
                                </legend>
                                <div className="space-y-3">
                                    {[
                                        {
                                            value: 'client' as AccountType,
                                            icon: Sparkles,
                                            title: "I'm here for my health",
                                            subtitle: 'Client',
                                            description:
                                                'Get a personalized AI nutrition and workout plan, track your progress, and receive adaptive coaching.',
                                            toneClass:
                                                'bg-secondary text-secondary-foreground',
                                        },
                                        {
                                            value: 'trainer' as AccountType,
                                            icon: Dumbbell,
                                            title: "I'm a personal trainer",
                                            subtitle: 'Professional',
                                            description:
                                                'Manage clients, create custom workout programs, and communicate securely.',
                                            toneClass:
                                                'bg-primary text-primary-foreground',
                                        },
                                        {
                                            value: 'nutritionist' as AccountType,
                                            icon: Utensils,
                                            title: "I'm a registered nutritionist",
                                            subtitle: 'Professional',
                                            description:
                                                'Build personalized nutrition plans and monitor clients with more context.',
                                            toneClass:
                                                'bg-primary/80 text-primary-foreground',
                                        },
                                    ].map((option) => {
                                        const active =
                                            data.account_type === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() =>
                                                    setData(
                                                        'account_type',
                                                        option.value,
                                                    )
                                                }
                                                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                                                    active
                                                        ? 'border-secondary/60 bg-secondary/8 ring-2 ring-secondary/20'
                                                        : 'border-border/70 bg-background/82 hover:border-secondary/35'
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div
                                                        className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${option.toneClass}`}
                                                    >
                                                        <option.icon className="size-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-1 flex items-center gap-2">
                                                            <p className="font-semibold text-foreground">
                                                                {option.title}
                                                            </p>
                                                            <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                                                                {
                                                                    option.subtitle
                                                                }
                                                            </span>
                                                        </div>
                                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                                            {option.description}
                                                        </p>
                                                    </div>
                                                    <div
                                                        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                                                            active
                                                                ? 'border-secondary bg-secondary'
                                                                : 'border-border'
                                                        }`}
                                                    >
                                                        {active ? (
                                                            <Check className="size-3 text-white" />
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {showServerOrClientError('account_type') ? (
                                    <ErrorText id="account_type-error">
                                        {showServerOrClientError(
                                            'account_type',
                                        )}
                                    </ErrorText>
                                ) : null}
                            </fieldset>
                        </div>

                        <Field
                            id="first_name"
                            label="First name"
                            required
                            error={showServerOrClientError('first_name')}
                        >
                            <input
                                id="first_name"
                                className={INPUT_CLASS}
                                value={data.first_name}
                                maxLength={40}
                                autoComplete="given-name"
                                onChange={(e) =>
                                    setData('first_name', e.target.value)
                                }
                            />
                        </Field>

                        <Field
                            id="last_name"
                            label="Last name"
                            required
                            error={showServerOrClientError('last_name')}
                        >
                            <input
                                id="last_name"
                                className={INPUT_CLASS}
                                value={data.last_name}
                                maxLength={40}
                                autoComplete="family-name"
                                onChange={(e) =>
                                    setData('last_name', e.target.value)
                                }
                            />
                        </Field>

                        <Field
                            id="username"
                            label="Username (optional, unique)"
                            hint="Letters, numbers, underscore (_) and dot (.) only."
                            error={showServerOrClientError('username')}
                        >
                            <input
                                id="username"
                                className={INPUT_CLASS}
                                value={data.username}
                                maxLength={24}
                                placeholder="e.g. cha.hid_01"
                                pattern="^[A-Za-z0-9_.]+$"
                                autoComplete="username"
                                onChange={(e) =>
                                    setData('username', e.target.value)
                                }
                            />
                        </Field>

                        {/* Gender as radios for semantics */}
                        <fieldset className="space-y-3">
                            <legend className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                Gender <span className="text-red-400">*</span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {(
                                    [
                                        { value: 'male', label: 'Male' },
                                        { value: 'female', label: 'Female' },
                                        { value: 'other', label: 'Other' },
                                    ] as const
                                ).map((opt) => {
                                    const active = data.gender === opt.value;
                                    return (
                                        <label
                                            key={opt.value}
                                            className="cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name="gender"
                                                value={opt.value}
                                                className="sr-only"
                                                checked={active}
                                                onChange={() =>
                                                    setData('gender', opt.value)
                                                }
                                            />
                                            <span
                                                className={[
                                                    CHOICE_PILL_CLASS,
                                                    active
                                                        ? 'border-secondary/60 bg-secondary/12 text-foreground'
                                                        : 'bg-background/78 text-muted-foreground hover:border-secondary/35 hover:bg-background/92',
                                                    FOCUS_RING,
                                                ].join(' ')}
                                            >
                                                {opt.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            {showServerOrClientError('gender') ? (
                                <ErrorText id="gender-error">
                                    {showServerOrClientError('gender')}
                                </ErrorText>
                            ) : null}
                        </fieldset>

                        <Field
                            id="age"
                            label="Age"
                            required
                            error={showServerOrClientError('age')}
                        >
                            <input
                                id="age"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={INPUT_CLASS}
                                placeholder="e.g. 20"
                                value={data.age}
                                onKeyDown={(e) =>
                                    preventNonNumericKeys(e, false)
                                }
                                onChange={onNumericChange('age', false)}
                                onBlur={onNumericBlur('age', {
                                    min: 13,
                                    max: 100,
                                })}
                            />
                        </Field>

                        <Field
                            id="height_cm"
                            label="Height (cm)"
                            required
                            error={showServerOrClientError('height_cm')}
                        >
                            <input
                                id="height_cm"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={INPUT_CLASS}
                                placeholder="e.g. 180"
                                value={data.height_cm}
                                onKeyDown={(e) =>
                                    preventNonNumericKeys(e, false)
                                }
                                onChange={onNumericChange('height_cm', false)}
                                onBlur={onNumericBlur('height_cm', {
                                    min: 80,
                                    max: 250,
                                })}
                            />
                        </Field>

                        <Field
                            id="weight_kg"
                            label="Weight (kg)"
                            required
                            error={showServerOrClientError('weight_kg')}
                        >
                            <input
                                id="weight_kg"
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9.]*"
                                className={INPUT_CLASS}
                                placeholder="e.g. 72.5"
                                value={data.weight_kg}
                                onKeyDown={(e) =>
                                    preventNonNumericKeys(e, true)
                                }
                                onChange={onNumericChange('weight_kg', true)}
                                onBlur={onNumericBlur('weight_kg', {
                                    min: 25,
                                    max: 400,
                                    allowDecimal: true,
                                })}
                            />
                        </Field>

                        <div className="space-y-2 md:col-span-2">
                            <CheckTile
                                checked={data.has_medical_history}
                                onChange={(v) =>
                                    setData('has_medical_history', v)
                                }
                                label="I have a medical history relevant to diet/exercise"
                                name="has_medical_history"
                            />

                            {data.has_medical_history ? (
                                <Field
                                    id="medical_history"
                                    label="Medical history"
                                    required
                                    error={showServerOrClientError(
                                        'medical_history',
                                    )}
                                    hint="Briefly list conditions (e.g., diabetes, thyroid, injuries)."
                                >
                                    <textarea
                                        id="medical_history"
                                        className={TEXTAREA_CLASS}
                                        placeholder="Type here..."
                                        maxLength={500}
                                        value={data.medical_history}
                                        onChange={(e) =>
                                            setData(
                                                'medical_history',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={next}>Next</Button>
                    </div>
                </SectionCard>
            )}

            {/* Step 2: Goals & Dietary */}
            {step === 2 && (
                <SectionCard
                    title="Goals & Dietary"
                    headingRef={stepHeadingRef}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            id="dietary_goal"
                            label="Dietary Goal"
                            required
                            error={showServerOrClientError('dietary_goal')}
                        >
                            <select
                                id="dietary_goal"
                                className={SELECT_CLASS}
                                value={data.dietary_goal}
                                onChange={(e) =>
                                    setData('dietary_goal', e.target.value)
                                }
                            >
                                <option value="">Select</option>
                                {dietaryGoals.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field
                            id="fitness_goal"
                            label="Fitness Goal"
                            required
                            error={showServerOrClientError('fitness_goal')}
                        >
                            <select
                                id="fitness_goal"
                                className={SELECT_CLASS}
                                value={data.fitness_goal}
                                onChange={(e) =>
                                    setData('fitness_goal', e.target.value)
                                }
                            >
                                <option value="">Select</option>
                                {fitnessGoals.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {/* Diet selection (pills) + custom diet input */}
                        <div className="space-y-2 md:col-span-2">
                            <fieldset className="space-y-3">
                                <legend className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Diet <span className="text-red-400">*</span>
                                </legend>

                                <div className="flex flex-wrap gap-2">
                                    {[...dietOptions, 'Other'].map((d) => {
                                        const active = data.diet_choice === d;
                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                className={[
                                                    CHOICE_PILL_CLASS,
                                                    active
                                                        ? 'border-secondary/60 bg-secondary/12 text-foreground'
                                                        : 'bg-background/78 text-muted-foreground hover:border-secondary/35 hover:bg-background/92',
                                                    FOCUS_RING,
                                                ].join(' ')}
                                                onClick={() => {
                                                    setData('diet_choice', d);
                                                    if (d !== 'Other') {
                                                        // set final diet immediately for non-other
                                                        setData('diet_name', d);
                                                        setData(
                                                            'diet_other_name',
                                                            '',
                                                        );
                                                    } else {
                                                        // keep diet_name empty until user types
                                                        setData(
                                                            'diet_name',
                                                            '',
                                                        );
                                                    }
                                                }}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>

                                {data.diet_choice === 'Other' ? (
                                    <Field
                                        id="diet_other_name"
                                        label="Type your diet name"
                                        required
                                        error={showServerOrClientError(
                                            'diet_other_name',
                                        )}
                                        hint="Example: Low FODMAP, Gluten-Free, etc."
                                    >
                                        <input
                                            id="diet_other_name"
                                            className={INPUT_CLASS}
                                            maxLength={40}
                                            value={data.diet_other_name}
                                            onChange={(e) => {
                                                setData(
                                                    'diet_other_name',
                                                    e.target.value,
                                                );
                                                setData(
                                                    'diet_name',
                                                    e.target.value,
                                                );
                                            }}
                                        />
                                    </Field>
                                ) : null}

                                {showServerOrClientError('diet_choice') ? (
                                    <ErrorText id="diet_choice-error">
                                        {showServerOrClientError('diet_choice')}
                                    </ErrorText>
                                ) : null}
                            </fieldset>
                        </div>

                        {/* Allergies */}
                        <div className="md:col-span-2">
                            <div className="flex items-baseline justify-between gap-2">
                                <label className="block text-sm font-medium">
                                    Allergies (multi-select)
                                </label>
                                <button
                                    type="button"
                                    className={`rounded-md text-xs text-primary hover:text-secondary hover:underline ${FOCUS_RING}`}
                                    onClick={() => setData('allergies', [])}
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                {allergyOptions.map((a) => {
                                    const active = data.allergies.includes(a);
                                    return (
                                        <CheckTile
                                            key={a}
                                            checked={active}
                                            onChange={(v) => {
                                                if (v)
                                                    setData('allergies', [
                                                        ...data.allergies,
                                                        a,
                                                    ]);
                                                else
                                                    setData(
                                                        'allergies',
                                                        data.allergies.filter(
                                                            (x) => x !== a,
                                                        ),
                                                    );
                                            }}
                                            label={a}
                                            name="allergies"
                                            value={a}
                                        />
                                    );
                                })}
                            </div>

                            {showServerOrClientError('allergies') ? (
                                <p className="mt-2 text-sm text-red-400">
                                    {showServerOrClientError('allergies')}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button variant="secondary" onClick={back}>
                            Back
                        </Button>
                        <Button onClick={next}>Next</Button>
                    </div>
                </SectionCard>
            )}

            {/* Step 3: Activity & Training */}
            {step === 3 && (
                <SectionCard
                    title="Activity & Training"
                    headingRef={stepHeadingRef}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            id="activity_level"
                            label="Activity Level"
                            required
                            error={showServerOrClientError('activity_level')}
                        >
                            <select
                                id="activity_level"
                                className={SELECT_CLASS}
                                value={data.activity_level}
                                onChange={(e) =>
                                    setData(
                                        'activity_level',
                                        e.target.value as ActivityLevel,
                                    )
                                }
                            >
                                <option value="">Select</option>
                                {ACTIVITY_LEVELS.map((lvl) => (
                                    <option key={lvl} value={lvl}>
                                        {lvl}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field
                            id="workout_days_per_week"
                            label="Planned Workouts / Week"
                            required
                            error={showServerOrClientError(
                                'workout_days_per_week',
                            )}
                            hint={
                                workoutDaysWarning
                                    ? workoutDaysWarning
                                    : 'We will tailor your plan frequency.'
                            }
                        >
                            <input
                                id="workout_days_per_week"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={[
                                    INPUT_CLASS,
                                    workoutDaysWarning
                                        ? 'border-amber-500'
                                        : '',
                                ].join(' ')}
                                placeholder="e.g. 3"
                                value={data.workout_days_per_week}
                                onKeyDown={(e) =>
                                    preventNonNumericKeys(e, false)
                                }
                                onChange={onNumericChange(
                                    'workout_days_per_week',
                                    false,
                                )}
                                onBlur={onNumericBlur('workout_days_per_week', {
                                    min: 1,
                                    max: 7,
                                })}
                                aria-invalid={!!workoutDaysWarning}
                            />
                        </Field>

                        <div className="md:col-span-2">
                            <RadioPills<WorkoutLocation>
                                name="workout_location"
                                value={data.workout_location}
                                onChange={(v) => setData('workout_location', v)}
                                legend="Where will you train?"
                                options={[
                                    { value: 'home', label: 'Home' },
                                    { value: 'gym', label: 'Gym' },
                                    { value: 'both', label: 'Both' },
                                ]}
                                error={showServerOrClientError(
                                    'workout_location',
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button variant="secondary" onClick={back}>
                            Back
                        </Button>
                        <Button onClick={next}>Next</Button>
                    </div>
                </SectionCard>
            )}

            {/* Step 4: Tried diet before? */}
            {step === 4 && (
                <SectionCard
                    title="Have you tried any dietary plans before?"
                    headingRef={stepHeadingRef}
                >
                    <RadioPills<'yes' | 'no' | ''>
                        name="tried_diet_before"
                        value={data.tried_diet_before}
                        onChange={(v) => setData('tried_diet_before', v)}
                        legend="Choose one"
                        options={[
                            { value: 'yes', label: 'Yes' },
                            { value: 'no', label: 'No' },
                        ]}
                        error={showServerOrClientError('tried_diet_before')}
                    />

                    <div className="flex justify-between pt-2">
                        <Button variant="secondary" onClick={back}>
                            Back
                        </Button>
                        <Button onClick={next}>Next</Button>
                    </div>
                </SectionCard>
            )}

            {/* Step 5: Plan friction (only if tried=yes) */}
            {step === 5 && data.tried_diet_before === 'yes' && (
                <SectionCard
                    title="Why did that plan not work out for you?"
                    description="Select all that apply."
                    headingRef={stepHeadingRef}
                >
                    <div className="grid gap-2 sm:grid-cols-2">
                        {reasons.map((r) => {
                            const checked =
                                data.diet_failure_reasons.includes(r);
                            return (
                                <CheckTile
                                    key={r}
                                    checked={checked}
                                    onChange={(v) => {
                                        if (v)
                                            setData('diet_failure_reasons', [
                                                ...data.diet_failure_reasons,
                                                r,
                                            ]);
                                        else
                                            setData(
                                                'diet_failure_reasons',
                                                data.diet_failure_reasons.filter(
                                                    (x) => x !== r,
                                                ),
                                            );
                                    }}
                                    label={r}
                                    name="diet_failure_reasons"
                                    value={r}
                                />
                            );
                        })}
                    </div>

                    <Field
                        id="diet_failure_other"
                        label="Other (optional)"
                        error={showServerOrClientError('diet_failure_other')}
                        hint="Keep it short (max 120 characters)."
                    >
                        <input
                            id="diet_failure_other"
                            className={INPUT_CLASS}
                            maxLength={120}
                            placeholder="Your reason"
                            value={data.diet_failure_other}
                            onChange={(e) =>
                                setData('diet_failure_other', e.target.value)
                            }
                        />
                    </Field>

                    {showServerOrClientError('diet_failure_reasons') ? (
                        <p className="text-sm text-red-400">
                            {showServerOrClientError('diet_failure_reasons')}
                        </p>
                    ) : null}

                    <div className="flex justify-between pt-2">
                        <Button variant="secondary" onClick={back}>
                            Back
                        </Button>
                        <Button onClick={next}>Next</Button>
                    </div>
                </SectionCard>
            )}

            {/* Final Step: Credentials */}
            {step === totalSteps && (
                <SectionCard title="Login Details" headingRef={stepHeadingRef}>
                    <div className="rounded-[24px] border border-border/70 bg-background/76 p-4 text-sm leading-6 text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <Shield className="mt-0.5 size-4 flex-none text-secondary" />
                            <p>
                                After registration, you&apos;ll land on email
                                verification. Two-factor protection can be
                                enabled later from settings.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            id="email"
                            label="Email"
                            required
                            error={showServerOrClientError('email')}
                        >
                            <div className="relative">
                                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    className={`${INPUT_CLASS} pl-10`}
                                    value={data.email}
                                    maxLength={120}
                                    inputMode="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    onChange={(e) =>
                                        setData('email', e.target.value.trim())
                                    }
                                />
                            </div>
                        </Field>

                        <Field
                            id="password"
                            label="Password"
                            required
                            error={showServerOrClientError('password')}
                            hint="Use 8+ characters. Adding numbers & symbols helps."
                        >
                            <div className="relative">
                                <Shield className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={`${INPUT_CLASS} pr-10 pl-10`}
                                    value={data.password}
                                    maxLength={72}
                                    autoComplete="new-password"
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    placeholder="Create a strong password"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((value) => !value)
                                    }
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                            {data.password ? (
                                <div className="mt-3 space-y-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3, 4].map((index) => (
                                            <div
                                                key={index}
                                                className={`h-1 flex-1 rounded-full ${
                                                    index <
                                                    passwordStrength.score
                                                        ? passwordStrength.barClass
                                                        : 'bg-border'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p
                                        className={`text-xs font-medium ${passwordStrength.textClass}`}
                                    >
                                        {passwordStrength.label}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            {
                                                label: '8+ chars',
                                                ok: data.password.length >= 8,
                                            },
                                            {
                                                label: 'Uppercase',
                                                ok: /[A-Z]/.test(data.password),
                                            },
                                            {
                                                label: 'Number',
                                                ok: /[0-9]/.test(data.password),
                                            },
                                            {
                                                label: 'Symbol',
                                                ok: /[^A-Za-z0-9]/.test(
                                                    data.password,
                                                ),
                                            },
                                        ].map((requirement) => (
                                            <div
                                                key={requirement.label}
                                                className={`flex items-center gap-1 text-[10px] ${
                                                    requirement.ok
                                                        ? 'text-emerald-400'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                <Check className="size-3" />
                                                {requirement.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </Field>

                        <Field
                            id="password_confirmation"
                            label="Confirm Password"
                            required
                            error={showServerOrClientError(
                                'password_confirmation',
                            )}
                        >
                            <div className="relative">
                                <Shield className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="password_confirmation"
                                    type={
                                        showPasswordConfirmation
                                            ? 'text'
                                            : 'password'
                                    }
                                    className={`${INPUT_CLASS} pr-10 pl-10`}
                                    value={data.password_confirmation}
                                    maxLength={72}
                                    autoComplete="new-password"
                                    onChange={(e) =>
                                        setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Repeat your password"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPasswordConfirmation(
                                            (value) => !value,
                                        )
                                    }
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showPasswordConfirmation ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                            {data.password_confirmation &&
                            !showServerOrClientError('password_confirmation') &&
                            data.password === data.password_confirmation ? (
                                <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                                    <Check className="size-3" />
                                    Passwords match
                                </p>
                            ) : null}
                        </Field>

                        {(data.account_type === 'trainer' ||
                            data.account_type === 'nutritionist') && (
                            <>
                                <div className="rounded-[24px] border border-secondary/20 bg-secondary/10 p-4 text-sm leading-6 text-muted-foreground md:col-span-2">
                                    Professional accounts require license
                                    verification before activation.
                                </div>

                                <Field
                                    id="verification_full_legal_name"
                                    label="Full legal name"
                                    required
                                    error={showServerOrClientError(
                                        'verification_full_legal_name',
                                    )}
                                >
                                    <input
                                        id="verification_full_legal_name"
                                        className={INPUT_CLASS}
                                        value={
                                            data.verification_full_legal_name
                                        }
                                        onChange={(e) =>
                                            setData(
                                                'verification_full_legal_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <Field
                                    id="verification_license_number"
                                    label="License / certification number"
                                    required
                                    error={showServerOrClientError(
                                        'verification_license_number',
                                    )}
                                >
                                    <input
                                        id="verification_license_number"
                                        className={INPUT_CLASS}
                                        value={data.verification_license_number}
                                        onChange={(e) =>
                                            setData(
                                                'verification_license_number',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <Field
                                    id="verification_authority"
                                    label="Issuing authority"
                                    required
                                    error={showServerOrClientError(
                                        'verification_authority',
                                    )}
                                >
                                    <input
                                        id="verification_authority"
                                        className={INPUT_CLASS}
                                        value={data.verification_authority}
                                        onChange={(e) =>
                                            setData(
                                                'verification_authority',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <Field
                                    id="verification_country_state"
                                    label="Country / state"
                                    required
                                    error={showServerOrClientError(
                                        'verification_country_state',
                                    )}
                                >
                                    <input
                                        id="verification_country_state"
                                        className={INPUT_CLASS}
                                        value={data.verification_country_state}
                                        onChange={(e) =>
                                            setData(
                                                'verification_country_state',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <Field
                                    id="verification_expiry_date"
                                    label="License expiry date"
                                    required
                                    error={showServerOrClientError(
                                        'verification_expiry_date',
                                    )}
                                >
                                    <input
                                        id="verification_expiry_date"
                                        type="date"
                                        className={INPUT_CLASS}
                                        value={data.verification_expiry_date}
                                        onChange={(e) =>
                                            setData(
                                                'verification_expiry_date',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <Field
                                    id="verification_documents"
                                    label="Verification documents (PDF/image)"
                                    required
                                    error={showServerOrClientError(
                                        'verification_documents',
                                    )}
                                >
                                    <input
                                        id="verification_documents"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        multiple
                                        className={INPUT_CLASS}
                                        onChange={(e) =>
                                            setData(
                                                'verification_documents',
                                                Array.from(
                                                    e.target.files ?? [],
                                                ),
                                            )
                                        }
                                    />
                                </Field>
                            </>
                        )}
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button variant="secondary" onClick={back}>
                            Back
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            Create Account
                        </Button>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}

/* ---------- Page wrapper ---------- */
export default function Register(props: Props) {
    return (
        <>
            <Head title="Create your account" />

            {/* Skip link */}
            <a
                href="#register-main"
                className={`sr-only rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 ${FOCUS_RING}`}
            >
                Skip to form
            </a>

            <main
                id="register-main"
                className="min-h-screen bg-background text-foreground"
            >
                <header className="border-b border-border/70 bg-background/80 px-6 py-4 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 no-underline"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 shadow-[0_14px_32px_-20px_rgba(23,38,60,0.55)]">
                                <AppLogoIcon className="size-3.5" />
                            </div>
                            <span className="font-semibold tracking-tight text-foreground">
                                Hayetak
                            </span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <p className="hidden text-sm text-muted-foreground sm:block">
                                Already have an account?
                            </p>
                            <Link
                                href="/login"
                                className="text-sm font-medium text-primary no-underline transition-colors hover:text-secondary"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-8">
                    <div className="mb-6 space-y-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/82 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-secondary uppercase">
                            <Sparkles className="size-3.5" />
                            Guided onboarding
                        </div>
                        <h1
                            className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Create an account that already understands your
                            goals, restrictions, and role.
                        </h1>
                        <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground">
                            Hayetak uses this setup to generate safer AI
                            planning, better coaching context, and cleaner daily
                            workflows for clients, trainers, and nutritionists.
                        </p>
                    </div>

                    <div className="mb-6 grid gap-3 sm:grid-cols-3">
                        {[
                            {
                                icon: Activity,
                                title: 'Profile first',
                                copy: 'Capture goals, allergies, injuries, and schedule once.',
                            },
                            {
                                icon: Brain,
                                title: 'Smarter plan',
                                copy: 'Use real inputs to shape nutrition and workout guidance.',
                            },
                            {
                                icon: ShieldCheck,
                                title: 'Safety visible',
                                copy: 'Keep restrictions and medical context in the loop from day one.',
                            },
                        ].map(({ icon: Icon, title, copy }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-border/70 bg-card/84 p-4 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]"
                            >
                                <Icon className="size-4 text-secondary" />
                                <p className="mt-3 text-sm font-semibold text-foreground">
                                    {title}
                                </p>
                                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                    {copy}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="w-full rounded-[28px] border border-border/70 bg-card/76 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
                        <div className="border-b border-border/70 px-6 py-5">
                            <p className="text-sm font-medium text-muted-foreground">
                                Personalized onboarding wizard
                            </p>
                        </div>
                        <div className="p-6 sm:p-8">
                            <RegisterWizard {...props} />
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
