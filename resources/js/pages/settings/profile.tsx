import { ProductBanner, ProductSection } from '@/components/product/page';
import { ProductButton } from '@/components/product/product-ui';
import SettingsLayout from '@/layouts/settings/layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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
};

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
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
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

function sanitizeChip(input: string) {
    return input.trim().replace(/\s+/g, ' ');
}

function toNullableNumber(value: string, integer = false) {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    const next = Number(trimmed);
    if (!Number.isFinite(next)) return null;

    return integer ? Math.round(next) : next;
}

function latestMeasurementValue(list: Measurement[]) {
    if (!list.length) return null;

    const sorted = [...list].sort((left, right) =>
        left.date > right.date ? 1 : -1,
    );

    return sorted[sorted.length - 1]?.value ?? null;
}

function todayYmd() {
    return new Date().toISOString().slice(0, 10);
}

export default function ProfilePage() {
    const page = usePage<PageProps>().props;
    const authUser = page.auth?.user ?? null;

    let providedProfile: NonNullable<UserProfile> | null =
        page.userProfile ?? null;

    if (!providedProfile && authUser) {
        providedProfile = {
            first_name: authUser.first_name ?? null,
            last_name: authUser.last_name ?? null,
            username: authUser.username ?? null,
            gender: authUser.gender ?? null,
            age: authUser.age ?? null,
            height_cm: authUser.height_cm ?? null,
            weight_kg: authUser.weight_kg ?? null,
        };
    }

    const userProfile: NonNullable<UserProfile> =
        providedProfile ?? DEFAULT_PROFILE;
    const prefs = (page.prefs ?? DEFAULT_PREFS) as NonNullable<Prefs>;
    const email = authUser?.email ?? 'Not available';
    const weightHistory = useMemo(
        () => (Array.isArray(page.weightHistory) ? page.weightHistory : []),
        [page.weightHistory],
    );
    const heightHistory = useMemo(
        () => (Array.isArray(page.heightHistory) ? page.heightHistory : []),
        [page.heightHistory],
    );

    const displayName =
        page.displayName ||
        [userProfile.first_name ?? '', userProfile.last_name ?? '']
            .join(' ')
            .trim() ||
        authUser?.username ||
        authUser?.name ||
        'Profile';

    const [firstName, setFirstName] = useState(userProfile.first_name ?? '');
    const [lastName, setLastName] = useState(userProfile.last_name ?? '');
    const [username, setUsername] = useState(userProfile.username ?? '');
    const [gender, setGender] = useState(userProfile.gender ?? '');
    const [age, setAge] = useState(
        userProfile.age === null ? '' : String(userProfile.age),
    );
    const [heightCm] = useState(
        userProfile.height_cm === null ? '' : String(userProfile.height_cm),
    );
    const [weightKg] = useState(
        userProfile.weight_kg === null ? '' : String(userProfile.weight_kg),
    );

    const [dietType, setDietType] = useState(prefs.diet_type ?? '');
    const [dietOther, setDietOther] = useState(prefs.diet_other ?? '');
    const [dietaryGoal, setDietaryGoal] = useState(prefs.dietary_goal ?? '');
    const [fitnessGoals, setFitnessGoals] = useState<string[]>(
        Array.isArray(prefs.fitness_goals) ? prefs.fitness_goals : [],
    );
    const [allergies, setAllergies] = useState<string[]>(
        Array.isArray(prefs.allergies) ? prefs.allergies : [],
    );
    const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState(
        prefs.workout_days_per_week === null
            ? ''
            : String(prefs.workout_days_per_week),
    );
    const [workoutLocation, setWorkoutLocation] = useState(
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

    const [newAllergy, setNewAllergy] = useState('');
    const [newEquipment, setNewEquipment] = useState('');
    const [newInjury, setNewInjury] = useState('');
    const [newMedicalCondition, setNewMedicalCondition] = useState('');

    const [measurementDate, setMeasurementDate] = useState(todayYmd());
    const [measurementType, setMeasurementType] = useState<'weight' | 'height'>(
        'weight',
    );
    const [measurementValue, setMeasurementValue] = useState('');

    const latestWeight = useMemo(
        () => latestMeasurementValue(weightHistory),
        [weightHistory],
    );
    const latestHeight = useMemo(
        () => latestMeasurementValue(heightHistory),
        [heightHistory],
    );
    const dietSummary =
        dietType === 'other'
            ? dietOther || 'Other'
            : (DIET_TYPES.find((item) => item.value === dietType)?.label ??
              page.dietName ??
              'Not set');

    const flashMessage = page.flash?.error ?? page.flash?.success ?? null;
    const flashTone = page.flash?.error ? 'danger' : 'success';

    const saveProfile = () => {
        router.patch(
            '/settings/profile',
            {
                first_name: firstName || null,
                last_name: lastName || null,
                username: username || null,
                gender: gender || null,
                age: toNullableNumber(age, true),
                height_cm: toNullableNumber(heightCm, true),
                weight_kg: toNullableNumber(weightKg, false),
            },
            { preserveScroll: true },
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
                workout_days_per_week: toNullableNumber(
                    workoutDaysPerWeek,
                    true,
                ),
                workout_location: workoutLocation || null,
                preferred_workout_days: preferredWorkoutDays,
                available_equipment: availableEquipment,
                injury_history: injuryHistory,
                medical_conditions: medicalConditions,
            },
            { preserveScroll: true },
        );
    };

    const addChip = (
        value: string,
        current: string[],
        setter: (next: string[]) => void,
        clear: () => void,
    ) => {
        const normalized = sanitizeChip(value);
        if (!normalized || current.includes(normalized)) return;
        setter([...current, normalized]);
        clear();
    };

    const removeChip = (
        value: string,
        current: string[],
        setter: (next: string[]) => void,
    ) => {
        setter(current.filter((item) => item !== value));
    };

    const toggleSelection = (
        value: string,
        current: string[],
        setter: (next: string[]) => void,
    ) => {
        setter(
            current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
        );
    };

    const addMeasurement = () => {
        const numericValue = Number(measurementValue);
        if (
            !measurementDate ||
            !Number.isFinite(numericValue) ||
            numericValue <= 0
        )
            return;

        router.post(
            '/settings/profile/measurements',
            {
                date: measurementDate,
                type: measurementType,
                value: numericValue,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setMeasurementDate(todayYmd());
                    setMeasurementValue('');
                    router.reload({
                        only: ['weightHistory', 'heightHistory', 'userProfile'],
                    });
                },
            },
        );
    };

    return (
        <>
            <Head title="Profile" />

            <SettingsLayout>
                {flashMessage ? (
                    <ProductBanner tone={flashTone} role="status">
                        {flashMessage}
                    </ProductBanner>
                ) : null}

                <ProductSection
                    title="Personal details"
                    description={`${displayName} - ${email}`}
                >
                    <div className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            <TextField
                                label="First name"
                                value={firstName}
                                onChange={setFirstName}
                            />
                            <TextField
                                label="Last name"
                                value={lastName}
                                onChange={setLastName}
                            />
                            <TextField
                                label="Username"
                                value={username}
                                onChange={setUsername}
                            />
                            <SelectField
                                label="Gender"
                                value={gender}
                                onChange={setGender}
                                options={[
                                    { value: '', label: 'Select gender' },
                                    ...GENDER_OPTIONS,
                                ]}
                            />
                            <TextField
                                label="Age"
                                value={age}
                                onChange={setAge}
                                type="number"
                                inputMode="numeric"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <ProductButton onClick={saveProfile}>
                                Save personal details
                            </ProductButton>
                        </div>
                    </div>
                </ProductSection>

                <ProductSection
                    title="Nutrition and safety preferences"
                    description={`Diet: ${dietSummary}. Allergies: ${allergies.length}. Safety notes: ${
                        injuryHistory.length + medicalConditions.length
                    }.`}
                >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className="space-y-5">
                            <SurfaceCard
                                title="Diet and body goals"
                                description="These preferences shape nutrition, coaching, and planning outputs."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectField
                                        label="Diet type"
                                        value={dietType}
                                        onChange={setDietType}
                                        options={[
                                            {
                                                value: '',
                                                label: 'Select diet type',
                                            },
                                            ...DIET_TYPES,
                                        ]}
                                    />
                                    <TextField
                                        label="Dietary goal"
                                        value={dietaryGoal}
                                        onChange={setDietaryGoal}
                                        placeholder="Example: fat loss or balanced eating"
                                    />
                                    {dietType === 'other' ? (
                                        <div className="md:col-span-2">
                                            <TextField
                                                label="Custom diet label"
                                                value={dietOther}
                                                onChange={setDietOther}
                                                placeholder="Describe your diet preference"
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                <div className="space-y-3">
                                    <div className="text-sm font-semibold text-foreground">
                                        Fitness goals
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {FITNESS_GOAL_OPTIONS.map((goal) => (
                                            <TogglePill
                                                key={goal}
                                                active={fitnessGoals.includes(
                                                    goal,
                                                )}
                                                onClick={() =>
                                                    toggleSelection(
                                                        goal,
                                                        fitnessGoals,
                                                        setFitnessGoals,
                                                    )
                                                }
                                            >
                                                {goal}
                                            </TogglePill>
                                        ))}
                                    </div>
                                </div>
                            </SurfaceCard>

                            <ChipEditor
                                title="Allergies"
                                description="Add every food or ingredient that must never appear in recommendations."
                                items={allergies}
                                value={newAllergy}
                                onValueChange={setNewAllergy}
                                onAdd={() =>
                                    addChip(
                                        newAllergy,
                                        allergies,
                                        setAllergies,
                                        () => setNewAllergy(''),
                                    )
                                }
                                onRemove={(item) =>
                                    removeChip(item, allergies, setAllergies)
                                }
                                placeholder="Add an allergy"
                                emptyLabel="No allergies saved."
                            />
                        </div>

                        <div className="space-y-5">
                            <ChipEditor
                                title="Injury history"
                                description="List injuries that should influence exercise alternatives and coaching advice."
                                items={injuryHistory}
                                value={newInjury}
                                onValueChange={setNewInjury}
                                onAdd={() =>
                                    addChip(
                                        newInjury,
                                        injuryHistory,
                                        setInjuryHistory,
                                        () => setNewInjury(''),
                                    )
                                }
                                onRemove={(item) =>
                                    removeChip(
                                        item,
                                        injuryHistory,
                                        setInjuryHistory,
                                    )
                                }
                                placeholder="Add an injury"
                                emptyLabel="No injuries saved."
                            />

                            <ChipEditor
                                title="Medical conditions"
                                description="Add any condition that should be respected by workout and nutrition guidance."
                                items={medicalConditions}
                                value={newMedicalCondition}
                                onValueChange={setNewMedicalCondition}
                                onAdd={() =>
                                    addChip(
                                        newMedicalCondition,
                                        medicalConditions,
                                        setMedicalConditions,
                                        () => setNewMedicalCondition(''),
                                    )
                                }
                                onRemove={(item) =>
                                    removeChip(
                                        item,
                                        medicalConditions,
                                        setMedicalConditions,
                                    )
                                }
                                placeholder="Add a medical condition"
                                emptyLabel="No medical conditions saved."
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <ProductButton onClick={savePrefs}>
                            Save nutrition and safety preferences
                        </ProductButton>
                    </div>
                </ProductSection>

                <ProductSection
                    title="Workout setup"
                    description={`Current setup: ${
                        workoutLocation || 'location not set'
                    }, ${workoutDaysPerWeek || '0'} days per week.`}
                >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <div className="space-y-5">
                            <SurfaceCard
                                title="Training basics"
                                description="Set your usual workout rhythm and where you train."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextField
                                        label="Workout days per week"
                                        value={workoutDaysPerWeek}
                                        onChange={setWorkoutDaysPerWeek}
                                        type="number"
                                        inputMode="numeric"
                                    />
                                    <SelectField
                                        label="Workout location"
                                        value={workoutLocation}
                                        onChange={setWorkoutLocation}
                                        options={[
                                            {
                                                value: '',
                                                label: 'Select location',
                                            },
                                            ...WORKOUT_LOCATION_OPTIONS,
                                        ]}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="text-sm font-semibold text-foreground">
                                        Preferred workout days
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {WORKOUT_DAY_OPTIONS.map((day) => (
                                            <TogglePill
                                                key={day}
                                                active={preferredWorkoutDays.includes(
                                                    day,
                                                )}
                                                onClick={() =>
                                                    toggleSelection(
                                                        day,
                                                        preferredWorkoutDays,
                                                        setPreferredWorkoutDays,
                                                    )
                                                }
                                            >
                                                {day}
                                            </TogglePill>
                                        ))}
                                    </div>
                                </div>
                            </SurfaceCard>
                        </div>

                        <div className="space-y-5">
                            <ChipEditor
                                title="Available equipment"
                                description="Save what you actually have access to so workouts can stay practical."
                                items={availableEquipment}
                                value={newEquipment}
                                onValueChange={setNewEquipment}
                                onAdd={() =>
                                    addChip(
                                        newEquipment,
                                        availableEquipment,
                                        setAvailableEquipment,
                                        () => setNewEquipment(''),
                                    )
                                }
                                onRemove={(item) =>
                                    removeChip(
                                        item,
                                        availableEquipment,
                                        setAvailableEquipment,
                                    )
                                }
                                placeholder="Add equipment"
                                emptyLabel="No equipment saved."
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <ProductButton onClick={savePrefs}>
                            Save workout setup
                        </ProductButton>
                        <ProductButton asChild emphasis="secondary">
                            <Link href="/workouts/plan">
                                Open workout planner
                            </Link>
                        </ProductButton>
                    </div>
                </ProductSection>

                <ProductSection
                    title="Measurements"
                    description={`Latest weight: ${
                        latestWeight !== null
                            ? `${latestWeight} kg`
                            : 'not logged'
                    }. Latest height: ${
                        latestHeight !== null
                            ? `${latestHeight} cm`
                            : heightCm
                              ? `${heightCm} cm`
                              : 'not logged'
                    }.`}
                >
                    <div className="space-y-5">
                        <SurfaceCard
                            title="Add a measurement"
                            description="Log weight regularly and update height when needed."
                        >
                            <div className="grid gap-4 md:grid-cols-3">
                                <TextField
                                    label="Date"
                                    value={measurementDate}
                                    onChange={setMeasurementDate}
                                    type="date"
                                />
                                <SelectField
                                    label="Type"
                                    value={measurementType}
                                    onChange={(value) =>
                                        setMeasurementType(
                                            value as 'weight' | 'height',
                                        )
                                    }
                                    options={[
                                        {
                                            value: 'weight',
                                            label: 'Weight (kg)',
                                        },
                                        {
                                            value: 'height',
                                            label: 'Height (cm)',
                                        },
                                    ]}
                                />
                                <TextField
                                    label="Value"
                                    value={measurementValue}
                                    onChange={setMeasurementValue}
                                    type="number"
                                    inputMode="decimal"
                                    placeholder={
                                        measurementType === 'weight'
                                            ? 'e.g. 72'
                                            : 'e.g. 175'
                                    }
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <ProductButton onClick={addMeasurement}>
                                    Save measurement
                                </ProductButton>
                            </div>
                        </SurfaceCard>

                        <div className="space-y-4">
                            <RecentListCard
                                title="Recent weight"
                                unit="kg"
                                data={weightHistory}
                            />
                            <RecentListCard
                                title="Recent height"
                                unit="cm"
                                data={heightHistory}
                            />
                        </div>
                    </div>
                </ProductSection>
            </SettingsLayout>
        </>
    );
}

function SurfaceCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[24px] border border-border/70 bg-background/72 p-5">
            <div className="space-y-2">
                <div className="text-lg font-semibold text-foreground">
                    {title}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                    {description}
                </div>
            </div>
            <div className="mt-5 space-y-4">{children}</div>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    type = 'text',
    inputMode,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    placeholder?: string;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-foreground">
                {label}
            </span>
            <input
                type={type}
                inputMode={inputMode}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-card px-4 text-base text-foreground"
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-foreground">
                {label}
            </span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-card px-4 text-base text-foreground"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function TogglePill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                    ? 'border-primary/30 bg-primary/10 text-foreground'
                    : 'border-border/70 bg-card/80 text-foreground hover:bg-background'
            }`}
        >
            {children}
        </button>
    );
}

function ChipEditor({
    title,
    description,
    items,
    value,
    onValueChange,
    onAdd,
    onRemove,
    placeholder,
    emptyLabel,
}: {
    title: string;
    description: string;
    items: string[];
    value: string;
    onValueChange: (value: string) => void;
    onAdd: () => void;
    onRemove: (item: string) => void;
    placeholder: string;
    emptyLabel: string;
}) {
    return (
        <SurfaceCard title={title} description={description}>
            <div className="flex flex-wrap gap-3">
                {items.length ? (
                    items.map((item) => (
                        <span
                            key={item}
                            className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-semibold text-foreground"
                        >
                            {item}
                            <button
                                type="button"
                                className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:text-foreground"
                                onClick={() => onRemove(item)}
                                aria-label={`Remove ${item}`}
                            >
                                x
                            </button>
                        </span>
                    ))
                ) : (
                    <div className="text-base text-muted-foreground">
                        {emptyLabel}
                    </div>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <TextField
                    label="Add item"
                    value={value}
                    onChange={onValueChange}
                    placeholder={placeholder}
                />
                <div className="flex items-end">
                    <ProductButton
                        onClick={onAdd}
                        className="h-12 w-full sm:w-auto"
                    >
                        Add
                    </ProductButton>
                </div>
            </div>
        </SurfaceCard>
    );
}

function RecentListCard({
    title,
    unit,
    data,
}: {
    title: string;
    unit: string;
    data: Measurement[];
}) {
    const items = [...data]
        .sort((left, right) => (left.date > right.date ? 1 : -1))
        .slice(-8)
        .reverse();

    return (
        <div className="rounded-[24px] border border-border/70 bg-background/72 p-5">
            <div className="text-lg font-semibold text-foreground">{title}</div>
            {items.length ? (
                <div className="mt-4 max-h-[15rem] space-y-3 overflow-y-auto pr-2">
                    {items.map((item, index) => (
                        <div
                            key={`${item.date}-${index}`}
                            className="flex items-center justify-between rounded-[18px] border border-border/70 bg-card/80 px-4 py-3"
                        >
                            <div className="text-sm font-semibold text-muted-foreground">
                                {item.date}
                            </div>
                            <div className="text-base font-semibold text-foreground">
                                {item.value} {unit}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-4 text-base text-muted-foreground">
                    No entries yet.
                </div>
            )}
        </div>
    );
}
