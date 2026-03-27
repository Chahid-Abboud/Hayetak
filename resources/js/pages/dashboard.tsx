// resources/js/pages/dashboard.tsx
import { AdminShell as AdminPageShell } from '@/components/admin/AdminShell';
import BmiCard from '@/components/BmiCard';
import OptionalTwoFactorPrompt from '@/components/optional-two-factor-prompt';
import {
    BarListCard,
    InlineRangeToolbar,
    MetricRing,
    TrendCard,
} from '@/components/product/analytics';
import { ProductPageShell } from '@/components/product/page';
import WaterCard from '@/components/WaterCard';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

// ---------- Types ----------
type AuthUser = {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email: string;
    role?: string | null;
    verified?: boolean;
    status?: string | null;
    two_factor_enabled?: boolean;
} | null;

type UserProfile = {
    age: number | string | null;
    height_cm: number | string | null;
    weight_kg: number | string | null;
} | null;

type WaterState = {
    today_ml: number;
    target_ml: number;
};

type TodayLogItem = {
    category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';
    label: string;
    quantity?: number | null;
    unit?: string | null;
};

type DayLog = {
    id: number;
    consumed_at: string; // YYYY-MM-DD
    photo_url?: string | null;
    other_notes?: string | null;
    items: TodayLogItem[];
} | null;

type MealType = TodayLogItem['category'];
type Totals = { calories: number; protein: number; carbs: number; fat: number };
type PerMealTotals = Record<
    'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink',
    Totals
>;

type ProgressPoint = { week: string; [muscle: string]: number | string };
type Motivation = { title: string; lines: string[] } | null;

// Plan types (from HomeController props)
type FoodLite = {
    id: number;
    name: string;
    category?: string | null;
    serving_size?: number | string | null;
    serving_unit?: string | null;
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
};

type NutritionPlanItemLite = {
    id: number;
    food_id: number;
    servings?: string | number | null;
    grams?: string | number | null;
    sort_order?: number | null;
    notes?: string | null;
    food?: FoodLite | null;
};

type NutritionPlanMealLite = {
    id: number;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink' | string;
    order: number;
    notes?: string | null;
    items: NutritionPlanItemLite[];
};

type NutritionPlanDayLite = {
    id: number;
    day_index: number;
    date: string; // YYYY-MM-DD
    notes?: string | null;
    meals: NutritionPlanMealLite[];
};

type NutritionPlanLite = {
    id: number;
    name: string;
    goal?: string | null;
    start_date: string; // YYYY-MM-DD
    duration_days: number;
    is_active: boolean;
    meta?: Record<string, unknown> | null;
    days: NutritionPlanDayLite[];
};

type WorkoutExerciseLite = {
    id: number;
    name: string;
    primary_muscle?: string | null;
    equipment?: string | null;
    difficulty?: string | null;
    pivot?: {
        workout_plan_day_id?: number;
        exercise_id?: number;
        order_index?: number | null;
        sets?: number | null;
        reps_min?: number | null;
        reps_max?: number | null;
        rest_seconds?: number | null;
        notes?: string | null;
    };
};

type WorkoutPlanDayLite = {
    id: number;
    workout_plan_id: number;
    day_index: number;
    name: string;
    notes?: string | null;
    exercises: WorkoutExerciseLite[];
};

type WorkoutPlanLite = {
    id: number;
    user_id: number;
    name: string;
    goal?: string | null;
    start_date: string; // YYYY-MM-DD
    duration_days: number;
    is_active: boolean;
    meta?: Record<string, unknown> | null;
    days: WorkoutPlanDayLite[];
};

type HomeProps = {
    auth: { user: AuthUser };
    isGuest?: boolean;
    userProfile: UserProfile;
    water?: WaterState;

    todayLog?: DayLog;
    latestLog?: DayLog;
    mealEntryPreviews?: TodayLogItem[] | null;

    todayMacros?: {
        date: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    } | null;
    mealTotals?: PerMealTotals | null;

    nutritionPlan?: NutritionPlanLite | null;
    workoutPlan?: WorkoutPlanLite | null;
} & Pick<SharedData, 'flash' | 'security'>;

type AdminListItem = {
    id: number;
    title?: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    action?: string;
    role?: string;
    review_status?: string;
    target_type?: string | null;
    created_at?: string;
    user?: {
        id: number;
        email?: string | null;
        first_name?: string | null;
        last_name?: string | null;
    };
    target_user?: {
        id: number;
        email?: string | null;
        first_name?: string | null;
        last_name?: string | null;
    };
};

const FOCUS_RING =
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function ActionButton({
    onClick,
    children,
    variant = 'primary',
    className = '',
    type = 'button',
}: {
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'soft';
    className?: string;
    type?: 'button' | 'submit';
}) {
    const base =
        'inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0';
    const styles: React.CSSProperties =
        variant === 'primary'
            ? {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
              }
            : variant === 'secondary'
              ? {
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--secondary-foreground)',
                }
              : {
                    background:
                        'color-mix(in oklab, var(--background) 78%, white)',
                    color: 'var(--foreground)',
                    border: '1px solid color-mix(in oklab, var(--border) 82%, transparent)',
                };

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${base} ${FOCUS_RING} ${className}`}
            style={styles}
        >
            {children}
        </button>
    );
}

function CardSection({
    title,
    description,
    actions,
    children,
    'aria-labelledby': ariaLabelledby,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    'aria-labelledby'?: string;
}) {
    const headingId =
        ariaLabelledby ?? title.toLowerCase().replace(/\s+/g, '-');
    return (
        <section
            className="haye-panel rounded-[30px] p-6 text-card-foreground"
            aria-labelledby={headingId}
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <p className="haye-kicker">Section</p>
                    <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-tight">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap gap-3">{actions}</div>
                ) : null}
            </div>

            <div className="mt-5">{children}</div>
        </section>
    );
}

export default function Home() {
    const {
        auth,
        flash,
        security,
        isGuest: isGuestProp,
        userProfile,
        water,
        todayLog,
        latestLog,
        todayMacros,
        mealTotals,
        mealEntryPreviews,
        nutritionPlan,
        workoutPlan,
    } = usePage<HomeProps>().props;

    const isGuest =
        typeof isGuestProp === 'boolean' ? isGuestProp : !auth?.user;

    const displayName =
        auth?.user?.first_name ||
        auth?.user?.username ||
        auth?.user?.name ||
        (isGuest ? 'guest' : 'there');
    const userRole = auth?.user?.role ?? 'client';
    const [showOptionalTwoFactorPrompt, setShowOptionalTwoFactorPrompt] =
        useState(
            Boolean(
                flash?.showOptionalTwoFactorPrompt &&
                    !auth?.user?.two_factor_enabled,
            ),
        );

    useEffect(() => {
        if (
            flash?.showOptionalTwoFactorPrompt &&
            !auth?.user?.two_factor_enabled
        ) {
            setShowOptionalTwoFactorPrompt(true);
        }
    }, [auth?.user?.two_factor_enabled, flash?.showOptionalTwoFactorPrompt]);

    // --- BMI input coercion from DB/user profile ---
    const profileSafe = useMemo(() => {
        const hRaw = userProfile?.height_cm;
        const wRaw = userProfile?.weight_kg;

        const heightNum =
            typeof hRaw === 'string'
                ? Number(hRaw)
                : typeof hRaw === 'number'
                  ? hRaw
                  : undefined;

        const weightNum =
            typeof wRaw === 'string'
                ? Number(wRaw)
                : typeof wRaw === 'number'
                  ? wRaw
                  : undefined;

        if (
            typeof heightNum === 'number' &&
            isFinite(heightNum) &&
            heightNum > 0 &&
            typeof weightNum === 'number' &&
            isFinite(weightNum) &&
            weightNum > 0
        ) {
            return { height_cm: heightNum, weight_kg: weightNum };
        }
        return undefined;
    }, [userProfile?.height_cm, userProfile?.weight_kg]);

    const todayISO = new Date().toISOString().slice(0, 10);

    // --- Meal previews for the nutrition board ---
    const mealPreviewItems =
        Array.isArray(mealEntryPreviews) && mealEntryPreviews.length > 0
            ? mealEntryPreviews
            : todayLog?.items ??
              (latestLog?.consumed_at === todayISO ? latestLog.items : []);

    const grouped: Record<MealType, TodayLogItem[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
        drink: [],
    };
    if (mealPreviewItems.length > 0) {
        for (const it of mealPreviewItems) {
            if (it.category in grouped) {
                grouped[it.category as MealType].push(it);
            }
        }
    }

    // --- Macro summaries from backend (fallback to zeros) ---
    const macros = todayMacros ?? {
        date: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
    };

    const perMeal: PerMealTotals = mealTotals ?? {
        breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        lunch: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        dinner: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        snack: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        drink: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
    const mealOrder = [
        'breakfast',
        'lunch',
        'dinner',
        'snack',
        'drink',
    ] as const;
    const mealDistribution = mealOrder.map((mealType) => ({
        label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
        value: Math.round(perMeal[mealType].calories),
        formattedValue: `${Math.round(perMeal[mealType].calories)} kcal`,
        tone:
            mealType === 'dinner' || mealType === 'lunch'
                ? ('accent' as const)
                : ('default' as const),
    }));
    const calorieCadencePoints = mealOrder.reduce<number[]>(
        (points, mealType) => {
            const last = points[points.length - 1] ?? 0;
            points.push(last + Math.round(perMeal[mealType].calories));
            return points;
        },
        [],
    );
    const macroSegments = [
        {
            label: 'Protein',
            value: Math.round(macros.protein),
            color: 'var(--primary)',
        },
        {
            label: 'Carbs',
            value: Math.round(macros.carbs),
            color: 'var(--secondary)',
        },
        { label: 'Fat', value: Math.round(macros.fat), color: 'var(--accent)' },
    ];

    const round = (n: number) => Math.round(n);

    const startTodayWorkout = () => {
        router.post(
            '/workouts/log/start',
            { workout_date: todayISO, workout_plan_day_id: null },
            {
                preserveScroll: true,
                onSuccess: () => router.visit('/workouts/log'),
            },
        );
    };

    const proteinTarget = profileSafe
        ? Math.max(110, Math.round(profileSafe.weight_kg * 1.8))
        : 150;
    const proteinRemaining = Math.max(0, proteinTarget - round(macros.protein));
    const completedMealCount = mealOrder.filter(
        (mealType) => perMeal[mealType].calories > 0,
    ).length;
    const loggedItemCount = mealOrder.reduce(
        (sum, mealType) => sum + grouped[mealType].length,
        0,
    );
    const waterState = water ?? { today_ml: 0, target_ml: 2000 };
    const waterProgress = Math.min(
        100,
        Math.round((waterState.today_ml / Math.max(1, waterState.target_ml)) * 100),
    );
    const todayWorkoutDay =
        workoutPlan?.days?.find((d) => d.day_index === 1) ?? workoutPlan?.days?.[0];
    const todayNutritionDay =
        nutritionPlan?.days?.find((d) => d.date === todayISO) ??
        nutritionPlan?.days?.find((d) => d.day_index === 1) ??
        nutritionPlan?.days?.[0];
    const dailyBriefLines = [
        loggedItemCount === 0
            ? 'Start with your first meal log so the coach has real context for today.'
            : `You have logged ${loggedItemCount} item${loggedItemCount === 1 ? '' : 's'} across ${completedMealCount} meal block${completedMealCount === 1 ? '' : 's'}.`,
        proteinRemaining > 0
            ? `You are about ${proteinRemaining} g short of your protein target for the day.`
            : 'Protein is in a good place for today.',
        waterProgress < 75
            ? 'Hydration is still behind target, so keep water visible between meals and training.'
            : 'Hydration is on track so far.',
    ];

    if (userRole === 'admin') {
        return (
            <>
                <Head title="Admin Dashboard" />
                <OptionalTwoFactorPrompt
                    open={showOptionalTwoFactorPrompt}
                    onDismiss={() => setShowOptionalTwoFactorPrompt(false)}
                    requiresConfirmation={
                        security?.requiresTwoFactorConfirmation ?? false
                    }
                />
                <AdminDashboard />
            </>
        );
    }

    return (
        <>
            <Head title="Home" />
            <OptionalTwoFactorPrompt
                open={showOptionalTwoFactorPrompt}
                onDismiss={() => setShowOptionalTwoFactorPrompt(false)}
                requiresConfirmation={
                    security?.requiresTwoFactorConfirmation ?? false
                }
            />

            <ProductPageShell width="wide" className="space-y-8">
                <header className="sr-only">
                    <h1>Hayetak dashboard</h1>
                </header>

                <section className="haye-panel rounded-[40px] px-6 py-7 lg:px-8 lg:py-8">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                        <div className="max-w-3xl">
                            <p className="haye-kicker">Today's command center</p>
                            <h2
                                className="mt-4 text-5xl tracking-tight text-foreground sm:text-6xl"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {isGuest
                                    ? 'Preview the new Hayetak flow.'
                                    : `Welcome back, ${displayName}.`}
                            </h2>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                                The dashboard now leads with the decisions you
                                need to make today: what to eat next, whether
                                training is ready, how hydration is moving, and
                                what the coach would say before the day gets
                                noisy.
                            </p>
                            <div className="mt-6 space-y-3">
                                {dailyBriefLines.map((line) => (
                                    <div
                                        key={line}
                                        className="rounded-[24px] border border-border/70 bg-background/76 px-4 py-3 text-sm leading-6 text-foreground"
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-[30px] border border-border/70 bg-primary p-5 text-primary-foreground shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold">
                                            Ready right now
                                        </p>
                                        <p className="mt-2 text-sm leading-7 text-primary-foreground/80">
                                            {proteinRemaining > 0
                                                ? `Close the day with about ${proteinRemaining} g of protein and keep hydration visible before training.`
                                                : 'Protein is in a good spot. Use the remaining energy on hydration, recovery, or your planned workout.'}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
                                        AI brief
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <QuickActionCard
                                    title="Log meal"
                                    description="Open today's diary."
                                    onClick={() => router.visit('/track-meals')}
                                />
                                <QuickActionCard
                                    title="Start lift"
                                    description="Jump into the live log."
                                    onClick={startTodayWorkout}
                                />
                                <QuickActionCard
                                    title="Ask coach"
                                    description="Continue in context."
                                    onClick={() => router.visit('/coach')}
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-[24px] border border-border/70 bg-background/76 p-4">
                                    <div className="haye-kicker">Nutrition</div>
                                    <div className="mt-3 text-2xl font-semibold text-foreground">
                                        {todayNutritionDay ? 'Ready' : 'Waiting'}
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {todayNutritionDay
                                            ? "Today's meals are mapped and ready to follow."
                                            : 'Generate or refresh your nutrition plan.'}
                                    </p>
                                </div>
                                <div className="rounded-[24px] border border-border/70 bg-background/76 p-4">
                                    <div className="haye-kicker">Training</div>
                                    <div className="mt-3 text-2xl font-semibold text-foreground">
                                        {todayWorkoutDay ? 'Planned' : 'Freestyle'}
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {todayWorkoutDay
                                            ? `${todayWorkoutDay.exercises.length} exercises queued.`
                                            : 'No active plan day is loaded yet.'}
                                    </p>
                                </div>
                                <div className="rounded-[24px] border border-border/70 bg-background/76 p-4">
                                    <div className="haye-kicker">Hydration</div>
                                    <div className="mt-3 text-2xl font-semibold text-foreground">
                                        {waterProgress}%
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {waterState.today_ml} mL of {waterState.target_ml} mL
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="grid gap-6 xl:grid-cols-2">
                    <CardSection
                        title="Workout runway"
                        description="Keep the next training block visible so starting feels easier."
                        actions={
                            <ActionButton
                                variant="secondary"
                                onClick={startTodayWorkout}
                            >
                                Start Workout
                            </ActionButton>
                        }
                    >
                        {todayWorkoutDay ? (
                            <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">
                                            {todayWorkoutDay.name}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            Day {todayWorkoutDay.day_index}
                                        </div>
                                    </div>
                                    <span className="haye-chip">
                                        {todayWorkoutDay.exercises.length} exercises
                                    </span>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {todayWorkoutDay.exercises
                                        .slice(0, 4)
                                        .map((exercise) => (
                                            <div
                                                key={exercise.id}
                                                className="rounded-[20px] border border-border/60 bg-card px-3 py-2 text-sm shadow-sm"
                                            >
                                                {exercise.name}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No active workout plan found yet. You can still
                                start a freestyle workout today.
                            </p>
                        )}
                    </CardSection>

                    <CardSection
                        title="Coach next step"
                        description="One clear recommendation beats a long stack of duplicate summaries."
                    >
                        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                            <p>
                                Nutrition is{' '}
                                <span className="font-medium text-foreground">
                                    {todayNutritionDay ? 'ready to follow' : 'not generated yet'}
                                </span>
                                , training is{' '}
                                <span className="font-medium text-foreground">
                                    {todayWorkoutDay ? 'ready to log' : 'waiting for your next plan'}
                                </span>
                                , and hydration is{' '}
                                <span className="font-medium text-foreground">
                                    {waterProgress}% of target
                                </span>
                                .
                            </p>
                            <div className="rounded-[24px] border border-secondary/20 bg-secondary/10 p-4 text-foreground">
                                {proteinRemaining > 0
                                    ? 'Best next move: choose a protein-forward meal before the day gets away from you.'
                                    : 'Best next move: keep momentum high with hydration or your planned workout.'}
                            </div>
                            <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                <p className="haye-kicker">Recovery pulse</p>
                                <p className="mt-3 text-base font-medium text-foreground">
                                    {waterState.today_ml} mL logged out of {waterState.target_ml} mL.
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Keep water visible between meals and training so the rest of the day stays easier to manage.
                                </p>
                            </div>
                        </div>
                    </CardSection>
                </section>
                <CardSection
                    title="Today's nutrition board"
                    description="Meals, macros, and pacing stay together so today reads like one system instead of scattered widgets."
                    actions={
                        <ActionButton
                            variant="primary"
                            onClick={() => router.visit('/track-meals')}
                        >
                            Open Meal Tracker
                        </ActionButton>
                    }
                >
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(380px,0.78fr)]">
                        <div className="grid gap-4 md:grid-cols-2">
                            {mealOrder.map((mealType) => (
                                <MealMomentCard
                                    key={mealType}
                                    title={mealType}
                                    calories={perMeal[mealType].calories}
                                    macros={perMeal[mealType]}
                                    entries={grouped[mealType]}
                                />
                            ))}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <TrendCard
                                title="Calorie cadence"
                                value={`${round(macros.calories)} kcal`}
                                helper="See how intake builds across your meals today."
                                points={calorieCadencePoints}
                            />
                            <MetricRing
                                title="Macro balance"
                                description="Protein, carbs, and fat for the current day."
                                totalLabel="Total grams"
                                totalValue={macroSegments
                                    .reduce((sum, segment) => sum + segment.value, 0)
                                    .toString()}
                                segments={macroSegments}
                                className="xl:col-span-2"
                            />
                            <BarListCard
                                title="Meal distribution"
                                description="Where today's calories are concentrated."
                                items={mealDistribution}
                                className="xl:col-span-2"
                            />
                        </div>
                    </div>
                </CardSection>
                {/* Generated Plans */}
                <CardSection
                    title="Active plans"
                    description="Generated plans should feel like part of the command center, not buried references."
                    actions={
                        <>
                            <ActionButton
                                variant="secondary"
                                onClick={() => router.visit('/track-meals')}
                            >
                                Meal Tracker
                            </ActionButton>
                            <ActionButton
                                variant="soft"
                                onClick={() => router.visit('/workouts/plan')}
                            >
                                Workout Planner
                            </ActionButton>
                        </>
                    }
                    aria-labelledby="generated-plans"
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Nutrition Plan */}
                        <div className="rounded-[26px] border border-border/70 bg-background/74 p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                    Nutrition Plan
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {nutritionPlan?.is_active
                                        ? 'Active'
                                        : nutritionPlan
                                          ? 'Inactive'
                                          : 'Ã¢â‚¬â€'}
                                </span>
                            </div>

                            {isGuest ? (
                                <p className="text-sm text-muted-foreground">
                                    Sign in to see your generated nutrition
                                    plan.
                                </p>
                            ) : !nutritionPlan ? (
                                <div className="text-sm text-muted-foreground">
                                    <p>No active nutrition plan found yet.</p>
                                    <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
                                        <p className="font-medium text-foreground">
                                            Queue note
                                        </p>
                                        <p className="mt-1">
                                            If you use{' '}
                                            <code>
                                                QUEUE_CONNECTION=database
                                            </code>
                                            , run a worker:
                                        </p>
                                        <p className="mt-1">
                                            <code>php artisan queue:work</code>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <NutritionPlanPreview plan={nutritionPlan} />
                            )}
                        </div>

                        {/* Workout Plan */}
                        <div className="rounded-[26px] border border-border/70 bg-background/74 p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                    Workout Plan
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {workoutPlan?.is_active
                                        ? 'Active'
                                        : workoutPlan
                                          ? 'Inactive'
                                          : 'Ã¢â‚¬â€'}
                                </span>
                            </div>

                            {isGuest ? (
                                <p className="text-sm text-muted-foreground">
                                    Sign in to see your generated workout plan.
                                </p>
                            ) : !workoutPlan ? (
                                <div className="text-sm text-muted-foreground">
                                    <p>No active workout plan found yet.</p>
                                    <p className="mt-2 text-xs">
                                        If queue is database, a worker must be
                                        running.
                                    </p>
                                </div>
                            ) : (
                                <WorkoutPlanPreview plan={workoutPlan} />
                            )}
                        </div>
                    </div>
                </CardSection>

                {/* BMI + Water */}
                <section
                    aria-label="Health stats"
                    className="grid grid-cols-1 gap-6 md:grid-cols-2"
                >
                    <div className="haye-panel rounded-[30px] p-6 text-card-foreground">
                        <p className="haye-kicker">Body metrics</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">BMI</h2>
                        <div className="mt-4">
                            <BmiCard isGuest={isGuest} profile={profileSafe} />
                        </div>
                    </div>

                    <div className="haye-panel rounded-[30px] p-6 text-card-foreground">
                        <p className="haye-kicker">Recovery</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Water intake</h2>
                        <div className="mt-4">
                            <WaterCard
                                isGuest={isGuest}
                                water={
                                    water ?? { today_ml: 0, target_ml: 2000 }
                                }
                                onQuickAdd={(ml: number) =>
                                    router.post(
                                        '/water',
                                        { ml },
                                        { preserveScroll: true },
                                    )
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* Workouts */}
                <CardSection
                    title="Training momentum"
                    description="Progress should feel encouraging, readable, and close to the workout flow."
                    actions={
                        <>
                            <ActionButton
                                variant="primary"
                                onClick={startTodayWorkout}
                            >
                                Start TodayÃ¢â‚¬â„¢s Workout
                            </ActionButton>
                            <ActionButton
                                variant="secondary"
                                onClick={() => router.visit('/workouts/log')}
                            >
                                Open Workout Log
                            </ActionButton>
                            <ActionButton
                                variant="soft"
                                onClick={() => router.visit('/workouts/plan')}
                            >
                                Planner
                            </ActionButton>
                        </>
                    }
                    aria-labelledby="log-workouts"
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border p-4 lg:col-span-2">
                            <h3 className="mb-2 text-sm font-semibold text-foreground">
                                Weekly Progress (avg top-set weight)
                            </h3>
                            <ProgressMini />
                        </div>

                        <div className="rounded-xl border p-4">
                            <h3 className="mb-2 text-sm font-semibold text-foreground">
                                Motivation
                            </h3>
                            <MotivationBox />
                        </div>
                    </div>
                </CardSection>
            </ProductPageShell>
        </>
    );
}

function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        users: 0,
        professionals: 0,
        pendingVerifications: 0,
        logs: 0,
        alerts: 0,
    });
    const [recentUsers, setRecentUsers] = useState<AdminListItem[]>([]);
    const [pendingVerifications, setPendingVerifications] = useState<
        AdminListItem[]
    >([]);
    const [recentLogs, setRecentLogs] = useState<AdminListItem[]>([]);
    const [recentAlerts, setRecentAlerts] = useState<AdminListItem[]>([]);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            setLoading(true);
            setError(null);

            try {
                const [
                    usersResponse,
                    trainerResponse,
                    nutritionistResponse,
                    pendingResponse,
                    logsResponse,
                    alertsResponse,
                ] = await Promise.all([
                    fetch('/api/admin/users?per_page=5'),
                    fetch('/api/admin/professionals?role=trainer&per_page=1'),
                    fetch(
                        '/api/admin/professionals?role=nutritionist&per_page=1',
                    ),
                    fetch(
                        '/api/admin/professional-verifications?status=pending&per_page=5',
                    ),
                    fetch('/api/admin/action-logs?per_page=5'),
                    fetch('/api/admin/notifications?per_page=5&status=unread'),
                ]);

                if (
                    !usersResponse.ok ||
                    !trainerResponse.ok ||
                    !nutritionistResponse.ok ||
                    !pendingResponse.ok ||
                    !logsResponse.ok ||
                    !alertsResponse.ok
                ) {
                    throw new Error('Could not load the admin overview.');
                }

                const [
                    usersJson,
                    trainerJson,
                    nutritionistJson,
                    pendingJson,
                    logsJson,
                    alertsJson,
                ] = await Promise.all([
                    usersResponse.json(),
                    trainerResponse.json(),
                    nutritionistResponse.json(),
                    pendingResponse.json(),
                    logsResponse.json(),
                    alertsResponse.json(),
                ]);

                if (cancelled) {
                    return;
                }

                setStats({
                    users: Number(usersJson?.total ?? 0),
                    professionals:
                        Number(trainerJson?.total ?? 0) +
                        Number(nutritionistJson?.total ?? 0),
                    pendingVerifications: Number(pendingJson?.total ?? 0),
                    logs: Number(logsJson?.total ?? 0),
                    alerts: Number(alertsJson?.total ?? 0),
                });
                setRecentUsers(
                    Array.isArray(usersJson?.data) ? usersJson.data : [],
                );
                setPendingVerifications(
                    Array.isArray(pendingJson?.data) ? pendingJson.data : [],
                );
                setRecentLogs(
                    Array.isArray(logsJson?.data) ? logsJson.data : [],
                );
                setRecentAlerts(
                    Array.isArray(alertsJson?.data) ? alertsJson.data : [],
                );
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Could not load the admin overview.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <AdminPageShell
            title="Admin Dashboard"
            description="Quick access to user management, verifications, alerts, and the most recent admin activity across Hayetak."
            actions={
                <>
                    <ActionButton
                        variant="primary"
                        onClick={() => router.visit('/admin/users')}
                    >
                        Manage Users
                    </ActionButton>
                    <ActionButton
                        variant="secondary"
                        onClick={() => router.visit('/admin/notifications')}
                    >
                        Open Alerts
                    </ActionButton>
                    <ActionButton
                        variant="soft"
                        onClick={() =>
                            router.visit('/admin/professional-verifications')
                        }
                    >
                        Review Verifications
                    </ActionButton>
                    <ActionButton
                        variant="soft"
                        onClick={() => router.visit('/coach')}
                    >
                        Open AI Coach
                    </ActionButton>
                </>
            }
        >
            <div className="space-y-8">
                {error ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
                        {error}
                    </div>
                ) : null}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <AdminStatCard
                        label="Users"
                        value={loading ? '...' : String(stats.users)}
                        href="/admin/users"
                    />
                    <AdminStatCard
                        label="Professionals"
                        value={loading ? '...' : String(stats.professionals)}
                        href="/admin/professionals"
                    />
                    <AdminStatCard
                        label="Pending Verifications"
                        value={
                            loading ? '...' : String(stats.pendingVerifications)
                        }
                        href="/admin/professional-verifications"
                    />
                    <AdminStatCard
                        label="Unread Alerts"
                        value={loading ? '...' : String(stats.alerts)}
                        href="/admin/notifications"
                    />
                    <AdminStatCard
                        label="Admin Logs"
                        value={loading ? '...' : String(stats.logs)}
                        href="/admin/logs"
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <AdminListCard
                        title="Recent Users"
                        href="/admin/users"
                        emptyText="No users loaded."
                        items={recentUsers.map((user) => ({
                            id: user.id,
                            title:
                                [user.first_name, user.last_name]
                                    .filter(Boolean)
                                    .join(' ') ||
                                user.email ||
                                'User',
                            subtitle: `${user.role ?? 'user'} - ${user.email ?? ''}`,
                        }))}
                    />
                    <AdminListCard
                        title="Unread Alerts"
                        href="/admin/notifications"
                        emptyText="No unread admin alerts."
                        items={recentAlerts.map((alert) => ({
                            id: alert.id,
                            title: alert.title ?? 'Alert',
                            subtitle:
                                alert.target_user?.email ??
                                alert.email ??
                                'Assigned recipient',
                        }))}
                    />
                    <AdminListCard
                        title="Pending Verifications"
                        href="/admin/professional-verifications"
                        emptyText="No pending verification requests."
                        items={pendingVerifications.map((verification) => ({
                            id: verification.id,
                            title:
                                [
                                    verification.user?.first_name,
                                    verification.user?.last_name,
                                ]
                                    .filter(Boolean)
                                    .join(' ') ||
                                verification.user?.email ||
                                'Professional',
                            subtitle: `${verification.role ?? 'professional'} - ${verification.review_status ?? 'pending'}`,
                        }))}
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                    <AdminListCard
                        title="Recent Admin Actions"
                        href="/admin/logs"
                        emptyText="No admin actions recorded yet."
                        items={recentLogs.map((log) => ({
                            id: log.id,
                            title: log.action ?? 'Action',
                            subtitle: log.target_type
                                ? `Target: ${log.target_type}`
                                : 'No target',
                        }))}
                    />
                    <section className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold">
                                Quick Links
                            </h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <QuickLinkCard
                                title="Users"
                                description="Search, edit, and inspect any account."
                                href="/admin/users"
                            />
                            <QuickLinkCard
                                title="Alerts"
                                description="Send targeted notifications and verify delivery state."
                                href="/admin/notifications"
                            />
                            <QuickLinkCard
                                title="Meals"
                                description="Review food catalog and recent tracked entries."
                                href="/admin/meals"
                            />
                            <QuickLinkCard
                                title="Places"
                                description="Manage local places and discovery content."
                                href="/admin/places"
                            />
                        </div>
                    </section>
                </section>
            </div>
        </AdminPageShell>
    );
}

function AdminStatCard({
    label,
    value,
    href,
}: {
    label: string;
    value: string;
    href: string;
}) {
    return (
        <button
            type="button"
            onClick={() => router.visit(href)}
            className="rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-[color:var(--primary)]/40 hover:bg-muted/30"
        >
            <div className="text-sm font-medium text-muted-foreground">
                {label}
            </div>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
        </button>
    );
}

function AdminListCard({
    title,
    href,
    emptyText,
    items,
}: {
    title: string;
    href: string;
    emptyText: string;
    items: Array<{ id: number; title: string; subtitle: string }>;
}) {
    return (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                    type="button"
                    onClick={() => router.visit(href)}
                    className="text-sm font-medium text-primary"
                >
                    View all
                </button>
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="rounded-xl border p-3">
                            <div className="font-medium">{item.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {item.subtitle}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function QuickLinkCard({
    title,
    description,
    href,
}: {
    title: string;
    description: string;
    href: string;
}) {
    return (
        <button
            type="button"
            onClick={() => router.visit(href)}
            className="rounded-2xl border p-4 text-left transition hover:border-[color:var(--primary)]/40 hover:bg-muted/30"
        >
            <div className="font-medium">{title}</div>
            <div className="mt-1 text-sm text-muted-foreground">
                {description}
            </div>
        </button>
    );
}

function QuickActionCard({
    title,
    description,
    onClick,
}: {
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-[26px] border border-border/70 bg-background/78 p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.72)] transition hover:-translate-y-0.5 hover:border-secondary/35 hover:bg-card"
        >
            <div className="haye-kicker">Quick action</div>
            <div className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                {title}
            </div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
            </div>
        </button>
    );
}

function MealMomentCard({
    title,
    calories,
    macros,
    entries,
}: {
    title: string;
    calories: number;
    macros: Totals;
    entries: TodayLogItem[];
}) {
    return (
        <div className="rounded-[26px] border border-border/70 bg-background/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="haye-kicker">Meal block</div>
                    <div className="mt-2 text-base font-semibold capitalize text-foreground">
                        {title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {Math.round(calories)} kcal
                    </div>
                </div>
                <div className="inline-flex max-w-full rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    P {Math.round(macros.protein)} / C {Math.round(macros.carbs)} / F{' '}
                    {Math.round(macros.fat)}
                </div>
            </div>
            <div className="mt-4 space-y-2">
                {entries.length > 0 ? (
                    entries.slice(0, 3).map((entry, index) => (
                        <div
                            key={`${title}-${entry.label}-${index}`}
                            className="rounded-[20px] border border-border/60 bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                        >
                            <span className="line-clamp-1">
                                {entry.label}
                                {typeof entry.quantity === 'number' &&
                                entry.quantity > 0
                                    ? ` · ${Number.isInteger(entry.quantity) ? entry.quantity : entry.quantity.toFixed(1)}${entry.unit ? ` ${entry.unit}` : ''}`
                                    : ''}
                            </span>
                        </div>
                    ))
                ) : calories > 0 ||
                  macros.protein > 0 ||
                  macros.carbs > 0 ||
                  macros.fat > 0 ? (
                    <div className="rounded-[20px] border border-border/60 bg-card px-3 py-3 text-sm text-muted-foreground shadow-sm">
                        Logged in today&apos;s totals. Open Meal Tracker for
                        full item detail.
                    </div>
                ) : (
                    <div className="rounded-[20px] border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                        Nothing logged yet.
                    </div>
                )}
            </div>
        </div>
    );
}


function NutritionPlanPreview({ plan }: { plan: NutritionPlanLite }) {
    const todayISO = new Date().toISOString().slice(0, 10);

    const day =
        plan.days?.find((d) => d.date === todayISO) ??
        plan.days?.find((d) => d.day_index === 1) ??
        plan.days?.[0];

    return (
        <div className="text-sm">
            <div className="mb-2">
                <div className="font-semibold">{plan.name}</div>
                <div className="text-xs text-muted-foreground">
                    Goal: {plan.goal ?? 'Ã¢â‚¬â€'} Ã‚Â· Start: {plan.start_date} Ã‚Â·
                    Duration: {plan.duration_days} day(s)
                </div>
            </div>

            {!day ? (
                <p className="text-sm text-muted-foreground">
                    No days found in this plan.
                </p>
            ) : (
                <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="font-medium">
                            Day {day.day_index}{' '}
                            <span className="text-xs text-muted-foreground">
                                ({day.date})
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {(day.meals ?? [])
                            .slice()
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                            .map((meal) => (
                                <div
                                    key={meal.id}
                                    className="rounded-md border p-2"
                                >
                                    <div className="text-xs font-semibold capitalize">
                                        {meal.meal_type}
                                    </div>

                                    {(meal.items ?? []).length ? (
                                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                                            {(meal.items ?? [])
                                                .slice()
                                                .sort(
                                                    (a, b) =>
                                                        (a.sort_order ?? 0) -
                                                        (b.sort_order ?? 0),
                                                )
                                                .map((it) => {
                                                    const qty =
                                                        it.grams != null
                                                            ? `${it.grams} g`
                                                            : it.servings !=
                                                                null
                                                              ? `${it.servings} serving(s)`
                                                              : 'Ã¢â‚¬â€';
                                                    return (
                                                        <li
                                                            key={it.id}
                                                            className="flex items-center justify-between gap-2"
                                                        >
                                                            <span className="truncate">
                                                                {it.food
                                                                    ?.name ??
                                                                    `Food #${it.food_id}`}
                                                            </span>
                                                            <span className="tabular-nums">
                                                                {qty}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                        </ul>
                                    ) : (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            No items for this meal.
                                        </p>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function WorkoutPlanPreview({ plan }: { plan: WorkoutPlanLite }) {
    const day1 = plan.days?.find((d) => d.day_index === 1) ?? plan.days?.[0];

    return (
        <div className="text-sm">
            <div className="mb-2">
                <div className="font-semibold">{plan.name}</div>
                <div className="text-xs text-muted-foreground">
                    Goal: {plan.goal ?? 'Ã¢â‚¬â€'} Ã‚Â· Start: {plan.start_date} Ã‚Â·
                    Duration: {plan.duration_days} day(s)
                </div>
            </div>

            {!day1 ? (
                <p className="text-sm text-muted-foreground">
                    No days found in this plan.
                </p>
            ) : (
                <div className="rounded-lg border p-3">
                    <div className="mb-2 font-medium">
                        Day {day1.day_index}: {day1.name}
                    </div>

                    {(day1.exercises ?? []).length ? (
                        <ul className="space-y-2">
                            {day1.exercises
                                .slice()
                                .sort(
                                    (a, b) =>
                                        (a.pivot?.order_index ?? 0) -
                                        (b.pivot?.order_index ?? 0),
                                )
                                .slice(0, 8)
                                .map((ex) => {
                                    const sets = ex.pivot?.sets ?? 0;
                                    const rmin = ex.pivot?.reps_min;
                                    const rmax = ex.pivot?.reps_max;
                                    const repText =
                                        rmin != null && rmax != null
                                            ? `${rmin}-${rmax}`
                                            : rmin != null
                                              ? `${rmin}`
                                              : rmax != null
                                                ? `${rmax}`
                                                : 'Ã¢â‚¬â€';

                                    return (
                                        <li
                                            key={ex.id}
                                            className="rounded-md border p-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="truncate text-xs font-semibold">
                                                    {ex.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground tabular-nums">
                                                    {sets} sets Ã‚Â· {repText} reps
                                                </div>
                                            </div>

                                            <div className="mt-1 text-[11px] text-muted-foreground">
                                                {ex.primary_muscle
                                                    ? `Primary: ${ex.primary_muscle}`
                                                    : ''}
                                                {ex.equipment
                                                    ? ` Ã‚Â· Equipment: ${ex.equipment}`
                                                    : ''}
                                                {ex.difficulty
                                                    ? ` Ã‚Â· ${ex.difficulty}`
                                                    : ''}
                                            </div>
                                        </li>
                                    );
                                })}
                        </ul>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            No exercises found for Day 1.
                        </p>
                    )}

                    {(day1.exercises ?? []).length > 8 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                            Showing first 8 exercisesÃ¢â‚¬Â¦ open Planner to view the
                            full day.
                        </p>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function ProgressMini() {
    const [series, setSeries] = useState<ProgressPoint[]>([]);
    const [weeks, setWeeks] = useState(8);
    const abortRef = useRef<AbortController | null>(null);

    const muscles = useMemo(
        () => [
            'chest',
            'back',
            'shoulders',
            'legs',
            'biceps',
            'triceps',
            'core',
        ],
        [],
    );

    useEffect(() => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        fetch(`/workouts/progress?weeks=${weeks}`, { signal: ac.signal })
            .then((r) => r.json())
            .then((d) => setSeries(Array.isArray(d.series) ? d.series : []))
            .catch(() => {
                // ignore abort errors, treat others as empty
                setSeries([]);
            });

        return () => ac.abort();
    }, [weeks]);

    if (!series.length) {
        return (
            <div className="space-y-4">
                <InlineRangeToolbar value={weeks} onChange={setWeeks} />
                <p className="text-sm text-muted-foreground">
                    Log a few workouts to unlock progress.
                </p>
            </div>
        );
    }

    const last4 = series.slice(-4);

    return (
        <div className="space-y-4">
            <InlineRangeToolbar value={weeks} onChange={setWeeks} />
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <caption className="sr-only">
                        Weekly progress table showing average top-set weight by
                        muscle group.
                    </caption>
                    <thead>
                        <tr className="text-left text-muted-foreground">
                            <th scope="col" className="py-1 pr-4">
                                Week
                            </th>
                            {muscles.map((m) => (
                                <th
                                    key={m}
                                    scope="col"
                                    className="py-1 pr-4 capitalize"
                                >
                                    {m}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {last4.map((row, i) => (
                            <tr key={i} className="border-t">
                                <th
                                    scope="row"
                                    className="py-1 pr-4 font-medium"
                                >
                                    {String(row.week)}
                                </th>
                                {muscles.map((m) => (
                                    <td
                                        key={m}
                                        className="py-1 pr-4 tabular-nums"
                                    >
                                        {typeof row[m] === 'number'
                                            ? `${row[m]} kg`
                                            : 'Ã¢â‚¬â€'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Minimal client-side sanitizer:
 * - removes <script> tags
 * - strips "on*" event handler attributes
 * - keeps basic inline tags if present (e.g., <strong>, <em>, <br>)
 *
 * NOTE: Real sanitization is best done server-side or with a vetted lib.
 */
function sanitizeMotivationHtml(input: string): string {
    if (typeof window === 'undefined') return input;

    try {
        const doc = new DOMParser().parseFromString(input, 'text/html');
        // remove scripts
        doc.querySelectorAll('script').forEach((n) => n.remove());
        // strip on* attributes
        doc.querySelectorAll('*').forEach((el) => {
            [...el.attributes].forEach((attr) => {
                if (attr.name.toLowerCase().startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        return doc.body.innerHTML;
    } catch {
        return input;
    }
}

function MotivationBox() {
    const [motivation, setMotivation] = useState<Motivation>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        fetch('/workouts/progress?weeks=8', { signal: ac.signal })
            .then((r) => r.json())
            .then((d) => setMotivation(d.motivation ?? null))
            .catch(() => setMotivation(null));

        return () => ac.abort();
    }, []);

    if (!motivation) {
        return (
            <p className="text-sm text-muted-foreground">
                Keep logging to see weekly wins Ã¢Å“Â¨
            </p>
        );
    }

    return (
        <div className="text-sm" aria-live="polite">
            <div className="mb-1 font-semibold">{motivation.title}</div>
            <ul className="list-disc space-y-1 pl-5">
                {motivation.lines.map((l: string, i: number) => (
                    <li
                        key={i}
                        dangerouslySetInnerHTML={{
                            __html: sanitizeMotivationHtml(l),
                        }}
                    />
                ))}
            </ul>
        </div>
    );
}
