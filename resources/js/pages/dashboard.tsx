// resources/js/pages/dashboard.tsx
import { AdminShell as AdminPageShell } from '@/components/admin/AdminShell';
import BmiCard from '@/components/BmiCard';
import OptionalTwoFactorPrompt from '@/components/optional-two-factor-prompt';
import {
    BarListCard,
    MetricRing,
    TrendCard,
} from '@/components/product/analytics';
import { ProductPageShell } from '@/components/product/page';
import WaterCard from '@/components/WaterCard';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

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

type Measurement = { date: string; type: 'weight' | 'height'; value: number };
type ChartPoint = { xLabel: string; xValue: number; yValue: number };
type WeeklyWorkoutContext = {
    week: string;
    top_set_kg: number;
    avg_reps: number;
    total_volume_kg: number;
    set_count: number;
    workout_count: number;
};

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
    ai_request?: {
        provider?: string | null;
        model?: string | null;
        prompt_version?: string | null;
        schema_version?: string | null;
    } | null;
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
    ai_request?: {
        provider?: string | null;
        model?: string | null;
        prompt_version?: string | null;
        schema_version?: string | null;
    } | null;
    days: WorkoutPlanDayLite[];
};

type PlannerModelMeta = {
    ai_request_id: number;
    generated_at?: string | null;
    provider?: string | null;
    model?: string | null;
    prompt_version?: string | null;
    schema_version?: string | null;
} | null;

type ProgressPrediction = {
    model_name?: string | null;
    horizon_days?: number | null;
    baseline_weight_kg?: number | null;
    expected_weight_change_kg?: number | null;
    projected_body_weight_kg?: number | null;
    confidence?: string | null;
    inference_source?: string | null;
    strength_projection?: {
        upper_body_compound_pct?: number | null;
        lower_body_compound_pct?: number | null;
    } | null;
    feedback_adjustment?: {
        base_weekly_weight_change_kg?: number | null;
        adjusted_weekly_weight_change_kg?: number | null;
        last_prediction_error_kg_per_week?: number | null;
        notes?: string | null;
    } | null;
} | null;

type PredictionTrendPoint = {
    plan_date: string;
    horizon_days: number;
    projected_weight_kg: number;
    actual_weight_kg: number | null;
    model_name?: string | null;
    inference_source?: string | null;
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
    weightHistory?: Measurement[];
    heightHistory?: Measurement[];

    nutritionPlan?: NutritionPlanLite | null;
    workoutPlan?: WorkoutPlanLite | null;
    plannerModelMeta?: PlannerModelMeta;
    progressPrediction?: ProgressPrediction;
    predictionTrend?: PredictionTrendPoint[];
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
                    <h2
                        id={headingId}
                        className="mt-2 text-2xl font-semibold tracking-tight"
                    >
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
        weightHistory,
        heightHistory,
        nutritionPlan,
        workoutPlan,
        plannerModelMeta,
        progressPrediction,
        predictionTrend,
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
            : (todayLog?.items ??
              (latestLog?.consumed_at === todayISO ? latestLog.items : []));

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
        Math.round(
            (waterState.today_ml / Math.max(1, waterState.target_ml)) * 100,
        ),
    );
    const todayWorkoutDay =
        workoutPlan?.days?.find((d) => d.day_index === 1) ??
        workoutPlan?.days?.[0];
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
                            <p className="haye-kicker">
                                Today's command center
                            </p>
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
                                        {todayNutritionDay
                                            ? 'Ready'
                                            : 'Waiting'}
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
                                        {todayWorkoutDay
                                            ? 'Planned'
                                            : 'Freestyle'}
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
                                        {waterState.today_ml} mL of{' '}
                                        {waterState.target_ml} mL
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
                                        {todayWorkoutDay.exercises.length}{' '}
                                        exercises
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
                                    {todayNutritionDay
                                        ? 'ready to follow'
                                        : 'not generated yet'}
                                </span>
                                , training is{' '}
                                <span className="font-medium text-foreground">
                                    {todayWorkoutDay
                                        ? 'ready to log'
                                        : 'waiting for your next plan'}
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
                                    {waterState.today_ml} mL logged out of{' '}
                                    {waterState.target_ml} mL.
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Keep water visible between meals and
                                    training so the rest of the day stays easier
                                    to manage.
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
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]">
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

                        <div className="grid gap-4">
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
                                    .reduce(
                                        (sum, segment) => sum + segment.value,
                                        0,
                                    )
                                    .toString()}
                                segments={macroSegments}
                            />
                            <BarListCard
                                title="Meal distribution"
                                description="Where today's calories are concentrated."
                                items={mealDistribution}
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
                                variant="primary"
                                onClick={() => router.visit('/ai/planner')}
                            >
                                AI Planner
                            </ActionButton>
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
                                          : 'No plan'}
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
                                          : 'No plan'}
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

                <CardSection
                    title="AI model lane"
                    description="Keep planner and prediction model outputs visible so your dashboard decisions are transparent."
                    actions={
                        <>
                            <ActionButton
                                variant="primary"
                                onClick={() => router.visit('/ai/planner')}
                            >
                                Open AI Planner
                            </ActionButton>
                            <ActionButton
                                variant="secondary"
                                onClick={() => router.visit('/coach')}
                            >
                                Ask AI Coach
                            </ActionButton>
                        </>
                    }
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <PlannerModelCard
                            plannerModelMeta={plannerModelMeta}
                            nutritionPlan={nutritionPlan}
                            workoutPlan={workoutPlan}
                        />
                        <PredictionModelCard
                            prediction={progressPrediction}
                            trend={predictionTrend}
                        />
                    </div>
                </CardSection>

                {/* BMI + Water */}
                <section
                    aria-label="Health stats"
                    className="grid grid-cols-1 gap-6 md:grid-cols-2"
                >
                    <div className="haye-panel rounded-[30px] p-6 text-card-foreground">
                        <p className="haye-kicker">Body metrics</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                            BMI
                        </h2>
                        <div className="mt-4">
                            <BmiCard isGuest={isGuest} profile={profileSafe} />
                        </div>
                    </div>

                    <div className="haye-panel rounded-[30px] p-6 text-card-foreground">
                        <p className="haye-kicker">Recovery</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                            Water intake
                        </h2>
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

                {/* Progress */}
                <CardSection
                    title="Progress center"
                    description="Track your body changes and training output in one place."
                    actions={
                        <>
                            <ActionButton
                                variant="primary"
                                onClick={startTodayWorkout}
                            >
                                Start Today's Workout
                            </ActionButton>
                            <ActionButton
                                variant="secondary"
                                onClick={() => router.visit('/profile')}
                            >
                                Add Measurements
                            </ActionButton>
                            <ActionButton
                                variant="soft"
                                onClick={() => router.visit('/workouts/log')}
                            >
                                Open Workout Log
                            </ActionButton>
                        </>
                    }
                    aria-labelledby="log-workouts"
                >
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <MeasurementChartCard
                            title="Weight Progress"
                            ySuffix=" kg"
                            measurements={weightHistory}
                            metric="weight"
                            emptyBody="Log at least two weight entries from Profile to unlock this trend."
                        />
                        <MeasurementChartCard
                            title="Height Progress"
                            ySuffix=" cm"
                            measurements={heightHistory}
                            metric="height"
                            emptyBody="Log at least two height entries from Profile to unlock this trend."
                        />
                    </div>
                    <div className="mt-4">
                        <WorkoutContextProgressCard weeks={12} />
                    </div>
                </CardSection>
            </ProductPageShell>
        </>
    );
}

function chartPointsFromMeasurements(
    measurements: Measurement[] | undefined,
    metric: 'weight' | 'height',
): ChartPoint[] {
    const safe = Array.isArray(measurements) ? measurements : [];
    return safe
        .filter((item) => item.type === metric && Number.isFinite(item.value))
        .slice()
        .sort((a, b) => (a.date > b.date ? 1 : -1))
        .map((item) => ({
            xLabel: item.date,
            xValue: new Date(item.date).getTime(),
            yValue: item.value,
        }));
}

function formatTrendChange(points: ChartPoint[], unit: string): string {
    if (points.length < 2) return '—';
    const first = points[0];
    const last = points[points.length - 1];
    const delta = last.yValue - first.yValue;
    return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unit}`;
}

function MeasurementChartCard({
    title,
    measurements,
    metric,
    ySuffix,
    emptyBody,
}: {
    title: string;
    measurements?: Measurement[];
    metric: 'weight' | 'height';
    ySuffix: string;
    emptyBody: string;
}) {
    const points = useMemo(
        () => chartPointsFromMeasurements(measurements, metric),
        [measurements, metric],
    );
    const first = points[0];
    const last = points[points.length - 1];

    return (
        <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">
                {title}
            </h3>

            <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <MetricPill
                    label="Latest"
                    value={last ? `${last.yValue}${ySuffix}` : '—'}
                />
                <MetricPill
                    label="Change"
                    value={formatTrendChange(points, ySuffix)}
                />
                <MetricPill label="Entries" value={String(points.length)} />
            </div>

            {points.length >= 2 ? (
                <SimpleLineChart
                    title={title}
                    points={points}
                    ySuffix={ySuffix}
                />
            ) : (
                <p className="text-sm text-muted-foreground">{emptyBody}</p>
            )}
            {first && last ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    {first.xLabel} to {last.xLabel}
                </p>
            ) : null}
        </div>
    );
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                {value}
            </div>
        </div>
    );
}

function SimpleLineChart({
    title,
    points,
    ySuffix,
}: {
    title: string;
    points: ChartPoint[];
    ySuffix: string;
}) {
    const width = 720;
    const height = 220;
    const padX = 28;
    const padY = 18;

    const xs = points.map((point) => point.xValue);
    const ys = points.map((point) => point.yValue);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const toX = (x: number) => padX + ((x - minX) / spanX) * (width - padX * 2);
    const toY = (y: number) =>
        height - padY - ((y - minY) / spanY) * (height - padY * 2);

    const d = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${toX(point.xValue)} ${toY(point.yValue)}`,
        )
        .join(' ');

    return (
        <div>
            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label={`${title} line chart`}
                    className="h-[220px] w-full min-w-[520px]"
                >
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
                    <path
                        d={d}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                    />
                    {points.map((point, index) => (
                        <circle
                            key={`${point.xLabel}-${index}`}
                            cx={toX(point.xValue)}
                            cy={toY(point.yValue)}
                            r={3.25}
                            fill="var(--primary)"
                        />
                    ))}
                </svg>
            </div>

            <details className="mt-1">
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
                            {points.map((point, index) => (
                                <tr
                                    key={`${point.xLabel}-row-${index}`}
                                    className="border-t border-border"
                                >
                                    <td className="py-2 pr-4">
                                        {point.xLabel}
                                    </td>
                                    <td className="py-2 pr-4 tabular-nums">
                                        {point.yValue}
                                        {ySuffix}
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

function WorkoutContextProgressCard({ weeks }: { weeks: number }) {
    const [series, setSeries] = useState<WeeklyWorkoutContext[]>([]);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`/workouts/progress?weeks=${weeks}`, {
            signal: controller.signal,
        })
            .then((response) => response.json())
            .then((payload) =>
                setSeries(
                    Array.isArray(payload?.weekly_context)
                        ? payload.weekly_context
                        : [],
                ),
            )
            .catch(() => setSeries([]));

        return () => controller.abort();
    }, [weeks]);

    const points = useMemo<ChartPoint[]>(() => {
        return series.map((row, index) => ({
            xLabel: row.week,
            xValue: index,
            yValue: row.top_set_kg,
        }));
    }, [series]);

    const latest = series[series.length - 1];
    const first = series[0];
    const change = latest && first ? latest.top_set_kg - first.top_set_kg : 0;

    return (
        <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">
                Gym Progress (Weekly)
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
                Trend uses your top set load per week and keeps workout context
                (volume, reps, sets, and sessions) visible for better decisions.
            </p>

            <div className="mb-3 grid gap-2 sm:grid-cols-5">
                <MetricPill
                    label="Latest Top Set"
                    value={latest ? `${latest.top_set_kg} kg` : '—'}
                />
                <MetricPill
                    label="Avg Reps"
                    value={latest ? `${latest.avg_reps}` : '—'}
                />
                <MetricPill
                    label="Volume"
                    value={
                        latest
                            ? `${Math.round(latest.total_volume_kg)} kg`
                            : '—'
                    }
                />
                <MetricPill
                    label="Workout Days"
                    value={latest ? String(latest.workout_count) : '—'}
                />
                <MetricPill
                    label="Top Set Change"
                    value={
                        latest && first
                            ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`
                            : '—'
                    }
                />
            </div>

            {points.length >= 2 ? (
                <SimpleLineChart
                    title="Weekly Top Set"
                    points={points}
                    ySuffix=" kg"
                />
            ) : (
                <p className="text-sm text-muted-foreground">
                    Log at least two weeks of workouts to see your gym progress
                    trend.
                </p>
            )}

            {series.length > 0 ? (
                <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        View workout context table
                    </summary>
                    <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted-foreground">
                                    <th className="py-2 pr-4">Week</th>
                                    <th className="py-2 pr-4">Top Set (kg)</th>
                                    <th className="py-2 pr-4">Avg Reps</th>
                                    <th className="py-2 pr-4">Volume (kg)</th>
                                    <th className="py-2 pr-4">Sets</th>
                                    <th className="py-2 pr-4">Workouts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {series.map((row) => (
                                    <tr
                                        key={row.week}
                                        className="border-t border-border"
                                    >
                                        <td className="py-2 pr-4">
                                            {row.week}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums">
                                            {row.top_set_kg}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums">
                                            {row.avg_reps}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums">
                                            {Math.round(row.total_volume_kg)}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums">
                                            {row.set_count}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums">
                                            {row.workout_count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            ) : null}
        </div>
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
                    <div className="mt-2 text-base font-semibold text-foreground capitalize">
                        {title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {Math.round(calories)} kcal
                    </div>
                </div>
                <div className="inline-flex max-w-full rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    P {Math.round(macros.protein)} / C{' '}
                    {Math.round(macros.carbs)} / F {Math.round(macros.fat)}
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
                                    ? ` - ${Number.isInteger(entry.quantity) ? entry.quantity : entry.quantity.toFixed(1)}${entry.unit ? ` ${entry.unit}` : ''}`
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

function sourceBadge(
    source?: {
        provider?: string | null;
        model?: string | null;
    } | null,
) {
    const provider = source?.provider?.trim();
    const model = source?.model?.trim();

    if (!provider && !model) return 'Model unavailable';
    if (!provider) return model ?? 'Model unavailable';
    if (!model) return provider;

    return `${provider} / ${model}`;
}

function sourceBadgeDetailed(
    source?: {
        provider?: string | null;
        model?: string | null;
        prompt_version?: string | null;
        schema_version?: string | null;
    } | null,
) {
    const base = sourceBadge(source);
    const prompt = source?.prompt_version?.trim();
    const schema = source?.schema_version?.trim();
    const suffixParts = [
        prompt ? `prompt ${prompt}` : null,
        schema ? `schema ${schema}` : null,
    ].filter(Boolean) as string[];

    if (suffixParts.length === 0) return base;

    return `${base} (${suffixParts.join(' / ')})`;
}

function formatSignedKg(value?: number | null) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)} kg`;
}

function formatKg(value?: number | null) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
    return `${value.toFixed(2)} kg`;
}

function formatPct(value?: number | null) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
    return `${value.toFixed(1)}%`;
}

function inferenceSourceTone(source?: string | null) {
    const normalized = (source ?? '').trim().toLowerCase();
    if (normalized === 'ml_blend') {
        return 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    }
    if (normalized === 'heuristic') {
        return 'border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }

    return 'border-border/70 bg-background/70 text-muted-foreground';
}

function PlannerModelCard({
    plannerModelMeta,
    nutritionPlan,
    workoutPlan,
}: {
    plannerModelMeta?: PlannerModelMeta;
    nutritionPlan?: NutritionPlanLite | null;
    workoutPlan?: WorkoutPlanLite | null;
}) {
    const fallbackSource =
        nutritionPlan?.ai_request ?? workoutPlan?.ai_request ?? null;
    const source = plannerModelMeta ?? fallbackSource;

    return (
        <div className="rounded-[26px] border border-border/70 bg-background/74 p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">
                        Planner model
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        The model lane that generated your latest dashboard
                        plans.
                    </p>
                </div>
                <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Planner
                </span>
            </div>

            {!source ? (
                <p className="text-sm text-muted-foreground">
                    No planner model metadata yet. Generate a plan from AI
                    Planner to populate this card.
                </p>
            ) : (
                <div className="space-y-2 text-sm">
                    <div className="rounded-[18px] border border-border/70 bg-card px-3 py-2">
                        <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                            Source
                        </div>
                        <div className="mt-1 font-medium text-foreground">
                            {sourceBadgeDetailed(source)}
                        </div>
                    </div>

                    {plannerModelMeta?.ai_request_id ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                                <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                    AI request
                                </div>
                                <div className="mt-1 font-medium text-foreground">
                                    #{plannerModelMeta.ai_request_id}
                                </div>
                            </div>
                            <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                                <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                    Generated
                                </div>
                                <div className="mt-1 font-medium text-foreground">
                                    {plannerModelMeta.generated_at ?? 'n/a'}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function PredictionModelCard({
    prediction,
    trend,
}: {
    prediction?: ProgressPrediction;
    trend?: PredictionTrendPoint[];
}) {
    const inferenceSource = prediction?.inference_source ?? null;
    const trendRows = (Array.isArray(trend) ? trend : []).filter(
        (row) =>
            typeof row.projected_weight_kg === 'number' &&
            Number.isFinite(row.projected_weight_kg),
    );

    return (
        <div className="rounded-[26px] border border-border/70 bg-background/74 p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">
                        Prediction model
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Latest weight + strength projection from the planner
                        generation.
                    </p>
                </div>
                <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase ${inferenceSourceTone(
                        inferenceSource,
                    )}`}
                >
                    {inferenceSource
                        ? inferenceSource.replace('_', ' ')
                        : 'n/a'}
                </span>
            </div>

            {!prediction ? (
                <p className="text-sm text-muted-foreground">
                    No prediction payload yet. Generate a plan first, then this
                    card will show model output.
                </p>
            ) : (
                <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                            <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                Model
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                                {prediction.model_name ?? 'n/a'}
                            </div>
                        </div>
                        <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                            <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                Confidence
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                                {prediction.confidence ?? 'n/a'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                            <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                Baseline
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                                {formatKg(prediction.baseline_weight_kg)}
                            </div>
                        </div>
                        <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                            <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                Expected change
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                                {formatSignedKg(
                                    prediction.expected_weight_change_kg,
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                            <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                Projected weight
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                                {formatKg(prediction.projected_body_weight_kg)}
                            </div>
                        </div>
                        <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                            <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                                Horizon
                            </div>
                            <div className="mt-1 font-medium text-foreground">
                                {typeof prediction.horizon_days === 'number'
                                    ? `${prediction.horizon_days} days`
                                    : 'n/a'}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                        <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                            Strength projection
                        </div>
                        <div className="mt-1 text-foreground">
                            Upper{' '}
                            {formatPct(
                                prediction.strength_projection
                                    ?.upper_body_compound_pct,
                            )}{' '}
                            / Lower{' '}
                            {formatPct(
                                prediction.strength_projection
                                    ?.lower_body_compound_pct,
                            )}
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                        <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                            Feedback loop
                        </div>
                        <div className="mt-1 text-foreground">
                            Base{' '}
                            {formatSignedKg(
                                prediction.feedback_adjustment
                                    ?.base_weekly_weight_change_kg,
                            )}{' '}
                            / Adjusted{' '}
                            {formatSignedKg(
                                prediction.feedback_adjustment
                                    ?.adjusted_weekly_weight_change_kg,
                            )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Last error:{' '}
                            {formatSignedKg(
                                prediction.feedback_adjustment
                                    ?.last_prediction_error_kg_per_week,
                            )}{' '}
                            per week
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border/70 bg-card px-3 py-2">
                        <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                            Predicted vs actual trend
                        </div>
                        <div className="mt-2">
                            {trendRows.length >= 2 ? (
                                <>
                                    <p className="mb-2 text-[11px] text-muted-foreground">
                                        Hover any point to view exact date and
                                        predicted vs actual values.
                                    </p>
                                    <PredictionTrendSparkline
                                        points={trendRows.slice(-10)}
                                    />
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Generate more plans and add check-ins to
                                    unlock this sparkline.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PredictionTrendSparkline({
    points,
}: {
    points: PredictionTrendPoint[];
}) {
    const width = 700;
    const height = 170;
    const padX = 16;
    const padY = 18;

    const allYValues = [
        ...points.map((row) => row.projected_weight_kg),
        ...points
            .map((row) => row.actual_weight_kg)
            .filter((value): value is number => typeof value === 'number'),
    ];

    if (allYValues.length < 2) {
        return (
            <p className="text-xs text-muted-foreground">
                Not enough points for trend rendering.
            </p>
        );
    }

    const minY = Math.min(...allYValues);
    const maxY = Math.max(...allYValues);
    const spanY = Math.max(1, maxY - minY);
    const spanX = Math.max(1, points.length - 1);
    const toX = (index: number) => padX + (index / spanX) * (width - padX * 2);
    const toY = (value: number) =>
        height - padY - ((value - minY) / spanY) * (height - padY * 2);

    const projectedPath = points
        .map(
            (row, index) =>
                `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(row.projected_weight_kg)}`,
        )
        .join(' ');

    const actualSeries = points
        .map((row, index) =>
            typeof row.actual_weight_kg === 'number'
                ? {
                      index,
                      value: row.actual_weight_kg,
                      planDate: row.plan_date,
                      horizonDays: row.horizon_days,
                      projectedWeight: row.projected_weight_kg,
                  }
                : null,
        )
        .filter(
            (
                row,
            ): row is {
                index: number;
                value: number;
                planDate: string;
                horizonDays: number;
                projectedWeight: number;
            } => row !== null,
        );

    const actualPath =
        actualSeries.length > 0
            ? actualSeries
                  .map(
                      (row, idx) =>
                          `${idx === 0 ? 'M' : 'L'} ${toX(row.index)} ${toY(row.value)}`,
                  )
                  .join(' ')
            : '';

    const latest = points[points.length - 1];
    const latestActual =
        [...points]
            .reverse()
            .find((row) => typeof row.actual_weight_kg === 'number')
            ?.actual_weight_kg ?? null;

    return (
        <div>
            <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                    Predicted
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[var(--secondary)]" />
                    Actual
                </span>
                <span>
                    Latest: {formatKg(latest.projected_weight_kg)} predicted /{' '}
                    {typeof latestActual === 'number'
                        ? formatKg(latestActual)
                        : 'n/a'}{' '}
                    actual
                </span>
            </div>

            <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Predicted versus actual weight trend"
                className="h-[150px] w-full"
            >
                <line
                    x1={padX}
                    y1={height - padY}
                    x2={width - padX}
                    y2={height - padY}
                    stroke="var(--border)"
                    strokeWidth="1"
                />
                <path
                    d={projectedPath}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                />
                {actualPath ? (
                    <path
                        d={actualPath}
                        fill="none"
                        stroke="var(--secondary)"
                        strokeWidth="2.5"
                        strokeDasharray="5 4"
                    />
                ) : null}

                {points.map((row, index) => (
                    <circle
                        key={`pred-${row.plan_date}-${index}`}
                        cx={toX(index)}
                        cy={toY(row.projected_weight_kg)}
                        r={2.6}
                        fill="var(--primary)"
                    >
                        <title>
                            {`Plan date: ${row.plan_date}
Horizon: ${row.horizon_days} days
Predicted: ${formatKg(row.projected_weight_kg)}
Actual: ${typeof row.actual_weight_kg === 'number' ? formatKg(row.actual_weight_kg) : 'n/a'}`}
                        </title>
                    </circle>
                ))}
                {actualSeries.map((row) => (
                    <circle
                        key={`actual-${row.index}`}
                        cx={toX(row.index)}
                        cy={toY(row.value)}
                        r={2.8}
                        fill="var(--secondary)"
                    >
                        <title>
                            {`Plan date: ${row.planDate}
Horizon: ${row.horizonDays} days
Actual: ${formatKg(row.value)}
Predicted: ${formatKg(row.projectedWeight)}`}
                        </title>
                    </circle>
                ))}
            </svg>
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
                <div className="mt-1 text-[11px] text-muted-foreground">
                    Source: {sourceBadge(plan.ai_request)}
                </div>
                <div className="text-xs text-muted-foreground">
                    Goal: {plan.goal ?? 'Not set'} - Start: {plan.start_date} -
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
                                                              : 'Not set';
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
                <div className="mt-1 text-[11px] text-muted-foreground">
                    Source: {sourceBadge(plan.ai_request)}
                </div>
                <div className="text-xs text-muted-foreground">
                    Goal: {plan.goal ?? 'Not set'} - Start: {plan.start_date} -
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
                                                : 'Not set';

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
                                                    {sets} sets - {repText} reps
                                                </div>
                                            </div>

                                            <div className="mt-1 text-[11px] text-muted-foreground">
                                                {ex.primary_muscle
                                                    ? `Primary: ${ex.primary_muscle}`
                                                    : ''}
                                                {ex.equipment
                                                    ? ` - Equipment: ${ex.equipment}`
                                                    : ''}
                                                {ex.difficulty
                                                    ? ` - ${ex.difficulty}`
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
                            Showing first 8 exercises... open Planner to view
                            the full day.
                        </p>
                    ) : null}
                </div>
            )}
        </div>
    );
}
