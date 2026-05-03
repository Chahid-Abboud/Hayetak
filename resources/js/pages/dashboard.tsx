// resources/js/pages/dashboard.tsx
import {
    AdminNotice,
    AdminOverviewCard,
    AdminScrollArea,
} from '@/components/admin/admin-ui';
import { ActivityTimeline } from '@/components/admin/admin-workflows';
import {
    AdminShell as AdminPageShell,
    AdminSection as SharedAdminSection,
    AdminStatCard as SharedAdminStatCard,
    AdminStatsGrid as SharedAdminStatsGrid,
} from '@/components/admin/AdminShell';
import BmiCard from '@/components/BmiCard';
import OptionalTwoFactorPrompt from '@/components/optional-two-factor-prompt';
import { BarListCard, TrendCard } from '@/components/product/analytics';
import { ProductPageShell } from '@/components/product/page';
import WaterCard from '@/components/WaterCard';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    BellRing,
    MapPin,
    Settings2,
    ShieldCheck,
    Sparkles,
    Users,
    UtensilsCrossed,
} from 'lucide-react';
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
type ProgressViewMode = 'weight' | 'height' | 'gym';

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

type PredictionTrendPoint = {
    plan_date: string;
    feedback_period_start_date: string;
    feedback_period_end_date: string;
    horizon_days: number;
    baseline_weight_kg: number;
    projected_before_feedback_kg: number;
    projected_after_feedback_kg: number;
    projected_weight_kg: number;
    feedback_applied: boolean;
    actual_weight_kg: number | null;
    actual_weight_date: string | null;
};

type ProgressPredictionSummary = {
    ai_request_id: number;
    generated_at: string;
    horizon_days: number;
    baseline_weight_kg: number;
    projected_body_weight_kg: number | null;
    projected_before_feedback_kg: number | null;
    projected_after_feedback_kg: number | null;
    expected_weight_change_kg: number | null;
    actual_weight_kg?: number | null;
    actual_weight_date?: string | null;
    feedback_applied: boolean;
    strength_projection?: {
        upper_body_compound_pct?: number | null;
        lower_body_compound_pct?: number | null;
    } | null;
    feedback_adjustment?: {
        base_weekly_weight_change_kg?: number | null;
        adjusted_weekly_weight_change_kg?: number | null;
        notes?: string | null;
    } | null;
} | null;

type CoachSnapshot = {
    title: string;
    last_message_excerpt?: string | null;
    last_message_at?: string | null;
} | null;

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
    coachSnapshot?: CoachSnapshot;
    progressPrediction?: ProgressPredictionSummary;
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

type AdminPlannerAuditRun = {
    id: number;
    status: 'queued' | 'running' | 'completed' | 'failed' | string;
    percent_complete: number;
    completed_runs: number;
    failed_runs: number;
    success_runs: number;
    total_runs: number;
    current_user_email?: string | null;
    current_horizon_days?: number | null;
    average_run_ms?: number | null;
    started_at?: string | null;
    finished_at?: string | null;
    last_error?: string | null;
};

type AdminSignalTone = 'default' | 'accent' | 'warning' | 'info';

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
            className="haye-panel rounded-[30px] p-5 text-card-foreground lg:p-6"
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
        coachSnapshot,
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
    const loggedItemCount = mealPreviewItems.length;
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
    const weightEntries = (weightHistory ?? [])
        .filter((item) => item.type === 'weight')
        .slice()
        .sort((left, right) => (left.date > right.date ? 1 : -1));
    const weightLogCount = weightEntries.length;
    const dominantMeal = mealDistribution.reduce(
        (best, current) => (current.value > best.value ? current : best),
        mealDistribution[0],
    );
    const recentMealPreview = mealPreviewItems.slice(0, 4);
    const latestWeightEntry =
        weightEntries.length > 0
            ? weightEntries[weightEntries.length - 1]
            : null;

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

            <ProductPageShell width="wide" className="px-1 sm:px-2 xl:px-3">
                <div className="space-y-14 sm:space-y-16 lg:space-y-18 xl:space-y-20">
                    <section className="haye-panel rounded-[40px] px-6 py-7 lg:px-8 lg:py-8">
                        <h1 className="sr-only">Hayetak dashboard</h1>
                        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                            <div className="max-w-3xl">
                                <p className="haye-kicker">Command center</p>
                                <h2
                                    className="mt-4 text-5xl tracking-tight text-foreground sm:text-6xl"
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                    }}
                                >
                                    {isGuest
                                        ? 'Preview the new Hayetak flow.'
                                        : `Welcome back, ${displayName}.`}
                                </h2>
                                <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                                    A tighter look at what needs attention now,
                                    what is already on track, and the fastest
                                    place to act next.
                                </p>
                                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    <QuickActionCard
                                        title="Log meal"
                                        description="Open the quick diary."
                                        onClick={() =>
                                            router.visit('/track-meals')
                                        }
                                    />
                                    <QuickActionCard
                                        title="Start lift"
                                        description="Jump into the live log."
                                        onClick={startTodayWorkout}
                                    />
                                    <QuickActionCard
                                        title="Ask coach"
                                        description="Pick up your latest thread."
                                        onClick={() => router.visit('/coach')}
                                    />
                                </div>
                            </div>

                            <div className="dashboard-surface rounded-[32px] p-5 shadow-[0_28px_65px_-48px_rgba(15,23,42,0.65)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="haye-kicker">
                                            Today pulse
                                        </p>
                                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                                            Clear, quick, and current
                                        </h3>
                                    </div>
                                    <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                        Live snapshot
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <MetricPill
                                        label="Meals logged"
                                        value={`${completedMealCount}/${mealOrder.length}`}
                                    />
                                    <MetricPill
                                        label="Hydration"
                                        value={`${waterProgress}%`}
                                    />
                                    <MetricPill
                                        label="Protein left"
                                        value={`${proteinRemaining} g`}
                                    />
                                    <MetricPill
                                        label="Workout mode"
                                        value={
                                            todayWorkoutDay
                                                ? `${todayWorkoutDay.exercises.length} planned`
                                                : 'Freestyle'
                                        }
                                    />
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div className="dashboard-surface-soft rounded-[24px] px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-foreground">
                                                Nutrition
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {todayNutritionDay
                                                    ? `${todayNutritionDay.meals.length} planned blocks`
                                                    : 'Plan not loaded'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="dashboard-surface-soft rounded-[24px] px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-foreground">
                                                Latest weigh-in
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {latestWeightEntry
                                                    ? `${latestWeightEntry.value.toFixed(1)} kg on ${formatShortDate(latestWeightEntry.date)}`
                                                    : 'No weight logged yet'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="dashboard-surface-soft rounded-[24px] px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-foreground">
                                                Tracking depth
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {loggedItemCount} nutrition
                                                entries and {weightLogCount}{' '}
                                                weigh-ins
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="grid gap-14 xl:grid-cols-2">
                        <CardSection
                            title="AI coach"
                            description="Your latest coaching thread and the fastest next action for today."
                            actions={
                                <ActionButton
                                    variant="primary"
                                    onClick={() => router.visit('/coach')}
                                >
                                    Open AI Coach
                                </ActionButton>
                            }
                        >
                            <div className="space-y-4">
                                {coachSnapshot ? (
                                    <div className="dashboard-surface rounded-[24px] p-4">
                                        <p className="text-sm font-semibold text-foreground">
                                            {coachSnapshot.title}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {coachSnapshot.last_message_excerpt ??
                                                'Your last coach reply is saved here and ready for follow-up.'}
                                        </p>
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            {coachSnapshot.last_message_at
                                                ? `Updated ${new Date(
                                                      coachSnapshot.last_message_at,
                                                  ).toLocaleString()}`
                                                : 'Updated recently'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-[24px] border border-dashed border-border/60 bg-background/55 p-4 text-sm text-muted-foreground">
                                        No coach thread yet. Start one question
                                        and the coach will keep your follow-ups
                                        in the same conversation.
                                    </div>
                                )}
                            </div>
                        </CardSection>

                        <CardSection
                            title="AI Planner"
                            description="Clear status for your active AI nutrition and workout plans."
                            actions={
                                <>
                                    <ActionButton
                                        variant="primary"
                                        onClick={() =>
                                            router.visit('/ai/planner')
                                        }
                                    >
                                        Open Planner
                                    </ActionButton>
                                    <ActionButton
                                        variant="secondary"
                                        onClick={() =>
                                            router.visit('/workouts/log')
                                        }
                                    >
                                        Log Workout
                                    </ActionButton>
                                </>
                            }
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="dashboard-surface rounded-[24px] p-4">
                                    <p className="haye-kicker">
                                        Nutrition plan
                                    </p>
                                    <p className="mt-2 text-xl font-semibold text-foreground">
                                        {nutritionPlan ? 'Ready' : 'Not ready'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {nutritionPlan
                                            ? `${nutritionPlan.name} is active for your meal tracking.`
                                            : 'Generate a plan to unlock guided meal follow mode.'}
                                    </p>
                                </div>
                                <div className="dashboard-surface rounded-[24px] p-4">
                                    <p className="haye-kicker">Workout plan</p>
                                    <p className="mt-2 text-xl font-semibold text-foreground">
                                        {workoutPlan ? 'Ready' : 'Not ready'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {workoutPlan
                                            ? `${workoutPlan.name} is ready for day-by-day logging.`
                                            : 'Generate a plan to get guided workout days.'}
                                    </p>
                                </div>
                            </div>
                        </CardSection>
                    </section>

                    
                    <CardSection
                        title="Today's nutrition board"
                        description="A broad daily snapshot so you can scan nutrition fast without recreating the full meal tracker."
                        actions={
                            <ActionButton
                                variant="primary"
                                onClick={() => router.visit('/track-meals')}
                            >
                                Open Meal Tracker
                            </ActionButton>
                        }
                    >
                        <div className="grid gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <NutritionQuickStatCard
                                        label="Calories"
                                        value={`${round(macros.calories)} kcal`}
                                        detail="Today's total intake"
                                    />
                                    <NutritionQuickStatCard
                                        label="Meals hit"
                                        value={`${completedMealCount}/${mealOrder.length}`}
                                        detail="Meal blocks with calories"
                                    />
                                    <NutritionQuickStatCard
                                        label="Protein left"
                                        value={`${proteinRemaining} g`}
                                        detail="Estimated remaining target"
                                    />
                                    <NutritionQuickStatCard
                                        label="Plan status"
                                        value={
                                            todayNutritionDay
                                                ? `${todayNutritionDay.meals.length} blocks ready`
                                                : 'Quick log mode'
                                        }
                                        detail={
                                            todayNutritionDay
                                                ? 'Today has a mapped plan.'
                                                : 'No active plan day loaded.'
                                        }
                                    />
                                </div>

                                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
                                    <div className="dashboard-surface rounded-[26px] p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="haye-kicker">
                                                    Quick view
                                                </div>
                                               <h3 className="mt-3 max-w-none text-2xl font-semibold leading-snug tracking-tight text-foreground">
                                                    What stands out today
                                                </h3>   
                                              </div>
                                            <span className="rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                Dashboard summary
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            <div className="dashboard-surface-soft rounded-[22px] px-4 py-3 text-sm text-foreground">
                                                {loggedItemCount === 0
                                                    ? 'Nothing is logged yet today, so this board will widen as soon as your first entry lands.'
                                                    : `You have logged ${loggedItemCount} entries across ${completedMealCount} meal block${completedMealCount === 1 ? '' : 's'}.`}
                                            </div>
                                            <div className="dashboard-surface-soft rounded-[22px] px-4 py-3 text-sm text-foreground">
                                                {dominantMeal.value > 0
                                                    ? `${dominantMeal.label} is carrying the most calories so far at ${dominantMeal.formattedValue}.`
                                                    : 'Calories are still open across the day, so the board is waiting for a stronger pattern.'}
                                            </div>
                                            <div className="dashboard-surface-soft rounded-[22px] px-4 py-3 text-sm text-foreground">
                                                {proteinRemaining > 0
                                                    ? `Protein is still the biggest gap, with about ${proteinRemaining} g remaining.`
                                                    : 'Protein target looks covered for the day.'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dashboard-surface rounded-[26px] p-5">
                                        <div className="haye-kicker">
                                            Recent items
                                        </div>
                                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                            Latest logged foods
                                        </h3>
                                        <div className="mt-4 space-y-2">
                                            {recentMealPreview.length > 0 ? (
                                                recentMealPreview.map(
                                                    (entry, index) => (
                                                        <div
                                                            key={`${entry.label}-${index}`}
                                                            className="dashboard-surface-soft rounded-[20px] px-3 py-3"
                                                        >
                                                            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                                {entry.category}
                                                            </div>
                                                            <div className="mt-1 text-sm font-medium text-foreground">
                                                                {entry.label}
                                                            </div>
                                                        </div>
                                                    ),
                                                )
                                            ) : (
                                                <div className="rounded-[20px] border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                                                    No entries yet. The detailed
                                                    meal tracker is still one
                                                    tap away when you want it.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <TrendCard
                                    title="Calorie cadence"
                                    value={`${round(macros.calories)} kcal`}
                                    helper="See how intake builds across your meals today."
                                    points={calorieCadencePoints}
                                />
                                <CalorieDistributionGraphCard
                                    title="Calorie distribution"
                                    description="Where today's calories are concentrated."
                                    items={mealDistribution}
                                />
                            </div>
                        </div>
                    </CardSection>
                    {/* BMI + Water */}
                    <section
                        aria-label="Health stats"
                        className="grid grid-cols-1 gap-14 md:grid-cols-2"
                    >
                        <div className="haye-panel rounded-[30px] p-5 text-card-foreground">
                            <p className="haye-kicker">Body metrics</p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                                BMI
                            </h2>
                            <div className="mt-4">
                                <BmiCard
                                    isGuest={isGuest}
                                    profile={profileSafe}
                                />
                            </div>
                        </div>

                        <div className="haye-panel rounded-[30px] p-5 text-card-foreground">
                            <p className="haye-kicker">Recovery</p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                                Water intake
                            </h2>
                            <div className="mt-4">
                                <WaterCard
                                    isGuest={isGuest}
                                    water={
                                        water ?? {
                                            today_ml: 0,
                                            target_ml: 2000,
                                        }
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
                        description="One graph, three views: body weight, height, and gym output."
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
                                    onClick={() =>
                                        router.visit('/workouts/log')
                                    }
                                >
                                    Open Workout Log
                                </ActionButton>
                            </>
                        }
                        aria-labelledby="log-workouts"
                    >
                        <ProgressCenterCard
                            weightHistory={weightHistory}
                            heightHistory={heightHistory}
                            weeks={12}
                        />
                    </CardSection>
                </div>
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
            xValue: isoDateToAxisValue(item.date),
            yValue: item.value,
        }));
}

function formatTrendChange(points: ChartPoint[], unit: string): string {
    if (points.length < 2) return 'N/A';
    const first = points[0];
    const last = points[points.length - 1];
    const delta = last.yValue - first.yValue;
    return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unit}`;
}

function NutritionQuickStatCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="dashboard-surface-soft rounded-[24px] p-4">
            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                {value}
            </div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {detail}
            </div>
        </div>
    );
}

function CalorieDistributionGraphCard({
    title,
    description,
    items,
}: {
    title: string;
    description: string;
    items: Array<{
        label: string;
        value: number;
        formattedValue: string;
    }>;
}) {
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const radius = 78;
    const strokeWidth = 18;
    const size = 190;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const toneForLabel = (label: string) => {
        const map: Record<string, string> = {
            Breakfast:
                'color-mix(in oklab, var(--palette-primary-400) 88%, white 12%)',
            Lunch: 'color-mix(in oklab, var(--info) 88%, white 12%)',
            Dinner: 'color-mix(in oklab, var(--warning) 90%, white 10%)',
            Snack: 'color-mix(in oklab, var(--destructive) 90%, white 10%)',
            Drink: 'color-mix(in oklab, var(--success) 88%, white 12%)',
        };

        return map[label] ?? 'var(--foreground)';
    };
    let offsetCursor = 0;
    const segments = items.map((item) => {
        const ratio = totalValue > 0 ? item.value / totalValue : 0;
        const segment = {
            ...item,
            ratio,
            color: toneForLabel(item.label),
            dashArray: `${Math.max(ratio * circumference, 0)} ${circumference}`,
            dashOffset: -offsetCursor,
        };
        offsetCursor += ratio * circumference;
        return segment;
    });

    return (
        <div className="dashboard-surface rounded-[26px] p-5">
            <div className="haye-kicker">Nutrition graph</div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
            </p>

            <div className="mt-5 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                <div className="flex flex-col items-center justify-center gap-3">
                    <svg
                        viewBox={`0 0 ${size} ${size}`}
                        role="img"
                        aria-label="Calorie distribution donut chart"
                        className="h-[190px] w-[190px]"
                    >
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke="color-mix(in oklab, var(--border) 74%, transparent)"
                            strokeWidth={strokeWidth}
                        />
                        {segments.map((segment) => (
                            <circle
                                key={segment.label}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={segment.dashArray}
                                strokeDashoffset={segment.dashOffset}
                                transform={`rotate(-90 ${center} ${center})`}
                            />
                        ))}
                    </svg>
                    <div className="text-center">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Total calories
                        </div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                            {Math.round(totalValue)} kcal
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {segments.map((segment) => (
                        <div
                            key={segment.label}
                            className="dashboard-surface-soft flex items-center justify-between gap-3 rounded-[20px] px-4 py-3"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                />
                                <span className="truncate text-sm font-medium text-foreground">
                                    {segment.label}
                                </span>
                            </div>
                            <div className="text-right text-sm text-muted-foreground tabular-nums">
                                {segment.formattedValue}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ProgressCenterCard({
    weightHistory,
    heightHistory,
    weeks,
}: {
    weightHistory?: Measurement[];
    heightHistory?: Measurement[];
    weeks: number;
}) {
    const [view, setView] = useState<ProgressViewMode>('weight');
    const [gymSeries, setGymSeries] = useState<WeeklyWorkoutContext[]>([]);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`/workouts/progress?weeks=${weeks}`, {
            signal: controller.signal,
        })
            .then((response) => response.json())
            .then((payload) =>
                setGymSeries(
                    Array.isArray(payload?.weekly_context)
                        ? payload.weekly_context
                        : [],
                ),
            )
            .catch(() => setGymSeries([]));

        return () => controller.abort();
    }, [weeks]);

    const weightPoints = useMemo(
        () => chartPointsFromMeasurements(weightHistory, 'weight'),
        [weightHistory],
    );
    const heightPoints = useMemo(
        () => chartPointsFromMeasurements(heightHistory, 'height'),
        [heightHistory],
    );
    const gymPoints = useMemo<ChartPoint[]>(
        () =>
            gymSeries.map((row, index) => ({
                xLabel: row.week,
                xValue: index,
                yValue: row.top_set_kg,
            })),
        [gymSeries],
    );

    const activeConfig = useMemo(() => {
        const latestWeight = weightPoints[weightPoints.length - 1];
        const latestHeight = heightPoints[heightPoints.length - 1];
        const latestGym = gymSeries[gymSeries.length - 1];
        const firstGym = gymSeries[0];
        const gymDelta =
            latestGym && firstGym
                ? latestGym.top_set_kg - firstGym.top_set_kg
                : null;

        const configs: Record<
            ProgressViewMode,
            {
                title: string;
                helper: string;
                points: ChartPoint[];
                seriesColor: string;
                ySuffix: string;
                xAxisLabel: string;
                yAxisLabel: string;
                emptyBody: string;
                pills: Array<{ label: string; value: string }>;
            }
        > = {
            weight: {
                title: 'Weight progress',
                helper: 'Every logged body-weight check-in stays on this graph so shifts are easy to spot.',
                points: weightPoints,
                seriesColor: 'color-mix(in oklab, var(--info) 86%, white 14%)',
                ySuffix: ' kg',
                xAxisLabel: 'Check-in date',
                yAxisLabel: 'Weight (kg)',
                emptyBody:
                    'Log at least two weight entries from Profile to unlock this trend.',
                pills: [
                    {
                        label: 'Latest',
                        value: latestWeight
                            ? `${latestWeight.yValue.toFixed(1)} kg`
                            : 'N/A',
                    },
                    {
                        label: 'Change',
                        value: formatTrendChange(weightPoints, ' kg'),
                    },
                    {
                        label: 'Entries',
                        value: String(weightPoints.length),
                    },
                    {
                        label: 'Last check-in',
                        value: latestWeight
                            ? formatShortDate(latestWeight.xLabel)
                            : 'N/A',
                    },
                ],
            },
            height: {
                title: 'Height progress',
                helper: 'Height stays available here when you want a clean history without opening profile details.',
                points: heightPoints,
                seriesColor:
                    'color-mix(in oklab, var(--warning) 84%, white 16%)',
                ySuffix: ' cm',
                xAxisLabel: 'Measurement date',
                yAxisLabel: 'Height (cm)',
                emptyBody:
                    'Log at least two height entries from Profile to unlock this trend.',
                pills: [
                    {
                        label: 'Latest',
                        value: latestHeight
                            ? `${latestHeight.yValue.toFixed(1)} cm`
                            : 'N/A',
                    },
                    {
                        label: 'Change',
                        value: formatTrendChange(heightPoints, ' cm'),
                    },
                    {
                        label: 'Entries',
                        value: String(heightPoints.length),
                    },
                    {
                        label: 'Last check-in',
                        value: latestHeight
                            ? formatShortDate(latestHeight.xLabel)
                            : 'N/A',
                    },
                ],
            },
            gym: {
                title: 'Gym progress',
                helper: 'Weekly top-set load is paired with your latest reps, volume, and workout count.',
                points: gymPoints,
                seriesColor:
                    'color-mix(in oklab, var(--success) 82%, white 18%)',
                ySuffix: ' kg',
                xAxisLabel: 'Training week',
                yAxisLabel: 'Top set load (kg)',
                emptyBody:
                    'Log at least two weeks of workouts to see your gym progress trend.',
                pills: [
                    {
                        label: 'Latest top set',
                        value: latestGym
                            ? `${latestGym.top_set_kg.toFixed(1)} kg`
                            : 'N/A',
                    },
                    {
                        label: 'Avg reps',
                        value: latestGym
                            ? `${latestGym.avg_reps.toFixed(1)}`
                            : 'N/A',
                    },
                    {
                        label: 'Volume',
                        value: latestGym
                            ? `${Math.round(latestGym.total_volume_kg)} kg`
                            : 'N/A',
                    },
                    {
                        label: 'Top-set change',
                        value:
                            gymDelta === null
                                ? 'N/A'
                                : `${gymDelta > 0 ? '+' : ''}${gymDelta.toFixed(1)} kg`,
                    },
                ],
            },
        };

        return configs[view];
    }, [gymPoints, gymSeries, heightPoints, view, weightPoints]);

    const options: Array<{ id: ProgressViewMode; label: string }> = [
        { id: 'weight', label: 'Weight' },
        { id: 'height', label: 'Height' },
        { id: 'gym', label: 'Gym' },
    ];

    return (
        <div className="dashboard-surface rounded-[28px] p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="haye-kicker">Graph switcher</div>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                        {activeConfig.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {activeConfig.helper}
                    </p>
                </div>
                <div className="inline-flex rounded-full border border-border/70 bg-card p-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setView(option.id)}
                            className={`rounded-full px-3 py-1 font-semibold transition ${view === option.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {activeConfig.pills.map((pill) => (
                    <MetricPill
                        key={`${view}-${pill.label}`}
                        label={pill.label}
                        value={pill.value}
                    />
                ))}
            </div>

            <div className="mt-5">
                {activeConfig.points.length >= 2 ? (
                    <SimpleLineChart
                        title={activeConfig.title}
                        points={activeConfig.points}
                        ySuffix={activeConfig.ySuffix}
                        xAxisLabel={activeConfig.xAxisLabel}
                        yAxisLabel={activeConfig.yAxisLabel}
                        seriesColor={activeConfig.seriesColor}
                    />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {activeConfig.emptyBody}
                    </p>
                )}
            </div>
        </div>
    );
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="dashboard-surface-soft rounded-lg px-3 py-2">
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
    xAxisLabel = 'Date',
    yAxisLabel = 'Value',
    seriesColor = 'color-mix(in oklab, var(--primary) 82%, white 18%)',
}: {
    title: string;
    points: ChartPoint[];
    ySuffix: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    seriesColor?: string;
}) {
    const width = 720;
    const height = 240;
    const padLeft = 56;
    const padRight = 20;
    const padTop = 18;
    const padBottom = 72;

    const xs = points.map((point) => point.xValue);
    const ys = points.map((point) => point.yValue);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const toX = (x: number) =>
        padLeft + ((x - minX) / spanX) * (width - padLeft - padRight);
    const toY = (y: number) =>
        height -
        padBottom -
        ((y - minY) / spanY) * (height - padTop - padBottom);

    const d = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${toX(point.xValue)} ${toY(point.yValue)}`,
        )
        .join(' ');

    const yTicks = Array.from({ length: 5 }, (_, tickIndex) => {
        const ratio = tickIndex / 4;
        const value = maxY - ratio * spanY;
        return {
            y: toY(value),
            label: `${value.toFixed(1)}${ySuffix}`,
        };
    });

    const xLabelStep = Math.max(1, Math.ceil(points.length / 6));
    const xTicks = points
        .map((point, index) => ({
            index,
            x: toX(point.xValue),
            label: compactAxisDateLabel(point.xLabel),
        }))
        .filter(
            (tick) =>
                tick.index % xLabelStep === 0 ||
                tick.index === points.length - 1,
        );

    return (
        <div>
            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label={`${title} line chart`}
                    className="h-[240px] w-full min-w-[560px]"
                >
                    {yTicks.map((tick, tickIndex) => (
                        <g key={`y-axis-tick-${tickIndex}`}>
                            <line
                                x1={padLeft}
                                y1={tick.y}
                                x2={width - padRight}
                                y2={tick.y}
                                stroke="var(--border)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                            <text
                                x={padLeft - 8}
                                y={tick.y + 4}
                                textAnchor="end"
                                fontSize="11"
                                fill="var(--muted-foreground)"
                            >
                                {tick.label}
                            </text>
                        </g>
                    ))}

                    {xTicks.map((tick) => (
                        <g key={`x-axis-tick-${tick.index}`}>
                            <line
                                x1={tick.x}
                                y1={height - padBottom}
                                x2={tick.x}
                                y2={height - padBottom + 4}
                                stroke="var(--border)"
                                strokeWidth="1"
                            />
                            <text
                                x={tick.x}
                                y={height - padBottom + 24}
                                textAnchor="end"
                                fontSize="11"
                                fill="var(--muted-foreground)"
                                transform={`rotate(-28 ${tick.x} ${height - padBottom + 24})`}
                            >
                                {tick.label}
                            </text>
                        </g>
                    ))}

                    <line
                        x1={padLeft}
                        y1={padTop}
                        x2={padLeft}
                        y2={height - padBottom}
                        stroke="var(--border)"
                        strokeWidth="1"
                    />
                    <line
                        x1={padLeft}
                        y1={height - padBottom}
                        x2={width - padRight}
                        y2={height - padBottom}
                        stroke="var(--border)"
                        strokeWidth="1"
                    />
                    <path
                        d={d}
                        fill="none"
                        stroke={seriesColor}
                        strokeWidth="2.5"
                    />
                    {points.map((point, index) => (
                        <circle
                            key={`${point.xLabel}-${index}`}
                            cx={toX(point.xValue)}
                            cy={toY(point.yValue)}
                            r={3.25}
                            fill={seriesColor}
                        />
                    ))}
                    <text
                        x={padLeft - 44}
                        y={padTop - 2}
                        fontSize="11"
                        fill="var(--muted-foreground)"
                    >
                        {yAxisLabel}
                    </text>
                    <text
                        x={width - padRight}
                        y={height - 10}
                        textAnchor="end"
                        fontSize="11"
                        fill="var(--muted-foreground)"
                    >
                        {xAxisLabel}
                    </text>
                </svg>
            </div>
        </div>
    );
}

function PredictorVsActualCard({
    trend,
    weighIns,
}: {
    trend: PredictionTrendPoint[];
    weighIns: Measurement[];
}) {
    const rows = useMemo(
        () =>
            [...trend].sort((left, right) =>
                left.feedback_period_end_date > right.feedback_period_end_date
                    ? 1
                    : -1,
            ),
        [trend],
    );
    const weightPoints = useMemo(
        () => chartPointsFromMeasurements(weighIns, 'weight'),
        [weighIns],
    );
    const rowsWithFeedback = useMemo(
        () =>
            rows.map((row) => ({
                ...row,
                dateKey: row.feedback_period_end_date,
                xValue: isoDateToAxisValue(row.feedback_period_end_date),
                feedback_unlocked:
                    weightPoints.filter(
                        (point) =>
                            point.xValue <=
                            isoDateToAxisValue(row.feedback_period_end_date),
                    ).length >= 2,
            })),
        [rows, weightPoints],
    );
    const currentMonthKey = monthKeyFromDate(new Date());
    const currentWeekKey = weekKeyFromDate(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const monthOptions = useMemo(() => {
        const keys = Array.from(
            new Set([
                ...rowsWithFeedback.map((row) => monthKeyFromIso(row.dateKey)),
                ...weightPoints.map((point) => monthKeyFromIso(point.xLabel)),
            ]),
        ).sort();

        return keys.map((key) => ({
            value: key,
            label: formatMonthKeyLabel(key),
        }));
    }, [rowsWithFeedback, weightPoints]);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');

    useEffect(() => {
        if (monthOptions.length === 0) {
            setSelectedMonthKey('all');
            return;
        }

        setSelectedMonthKey((current) => {
            if (
                current !== 'all' &&
                monthOptions.some((option) => option.value === current)
            ) {
                return current;
            }

            if (
                monthOptions.some((option) => option.value === currentMonthKey)
            ) {
                return currentMonthKey;
            }

            return monthOptions[monthOptions.length - 1]?.value ?? 'all';
        });
    }, [currentMonthKey, monthOptions]);

    const weekOptions = useMemo(() => {
        const filteredRows =
            selectedMonthKey === 'all'
                ? rowsWithFeedback
                : rowsWithFeedback.filter(
                      (row) =>
                          monthKeyFromIso(row.dateKey) === selectedMonthKey,
                  );
        const filteredWeights =
            selectedMonthKey === 'all'
                ? weightPoints
                : weightPoints.filter(
                      (point) =>
                          monthKeyFromIso(point.xLabel) === selectedMonthKey,
                  );

        const keys = Array.from(
            new Set([
                ...filteredRows.map((row) => weekKeyFromIso(row.dateKey)),
                ...filteredWeights.map((point) => weekKeyFromIso(point.xLabel)),
            ]),
        ).sort();

        return keys.map((key) => ({
            value: key,
            label: formatWeekKeyLabel(key),
        }));
    }, [rowsWithFeedback, selectedMonthKey, weightPoints]);
    const [selectedWeekKey, setSelectedWeekKey] = useState<string>('all');

    useEffect(() => {
        if (weekOptions.length === 0) {
            setSelectedWeekKey('all');
            return;
        }

        setSelectedWeekKey((current) => {
            if (
                current !== 'all' &&
                weekOptions.some((option) => option.value === current)
            ) {
                return current;
            }

            if (weekOptions.some((option) => option.value === currentWeekKey)) {
                return currentWeekKey;
            }

            return weekOptions[weekOptions.length - 1]?.value ?? 'all';
        });
    }, [currentWeekKey, weekOptions]);

    if (rowsWithFeedback.length === 0 && weightPoints.length < 2) {
        return (
            <p className="text-sm text-muted-foreground">
                Keep logging plans and weigh-ins to unlock this shared
                prediction timeline.
            </p>
        );
    }

    const visibleRows = rowsWithFeedback.filter((row) => {
        const monthMatch =
            selectedMonthKey === 'all' ||
            monthKeyFromIso(row.dateKey) === selectedMonthKey;
        const weekMatch =
            viewMode !== 'week' ||
            selectedWeekKey === 'all' ||
            weekKeyFromIso(row.dateKey) === selectedWeekKey;

        return monthMatch && weekMatch;
    });
    const visibleWeightPoints = weightPoints.filter((point) => {
        const monthMatch =
            selectedMonthKey === 'all' ||
            monthKeyFromIso(point.xLabel) === selectedMonthKey;
        const weekMatch =
            viewMode !== 'week' ||
            selectedWeekKey === 'all' ||
            weekKeyFromIso(point.xLabel) === selectedWeekKey;

        return monthMatch && weekMatch;
    });

    const width = 860;
    const height = 300;
    const padLeft = 60;
    const padRight = 20;
    const padTop = 18;
    const padBottom = 72;

    const actualSeries = visibleWeightPoints.map((point) => ({
        xValue: point.xValue,
        yValue: point.yValue,
    }));

    const chartValues = actualSeries
        .map((point) => point.yValue)
        .filter((value): value is number => typeof value === 'number');

    if (chartValues.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No prediction points or weigh-ins were logged in this selected{' '}
                {viewMode}.
            </p>
        );
    }

    const allXValues = actualSeries
        .map((point) => point.xValue)
        .filter((value) => Number.isFinite(value));
    const minX = Math.min(...allXValues);
    const maxX = Math.max(...allXValues);
    const spanX = Math.max(1, maxX - minX);

    const rawMinY = Math.min(...chartValues);
    const rawMaxY = Math.max(...chartValues);
    const minY = rawMinY - 0.35;
    const maxY = rawMaxY + 0.35;
    const spanY = Math.max(1, maxY - minY);

    const toX = (value: number) =>
        padLeft + ((value - minX) / spanX) * (width - padLeft - padRight);
    const toY = (value: number) =>
        height -
        padBottom -
        ((value - minY) / spanY) * (height - padTop - padBottom);

    const buildSegmentedPaths = (
        values: Array<{ xValue: number; yValue: number | null }>,
    ): string[] => {
        const segments: string[] = [];
        let currentSegment = '';

        values.forEach((value) => {
            if (typeof value.yValue !== 'number') {
                if (currentSegment !== '') {
                    segments.push(currentSegment.trim());
                    currentSegment = '';
                }
                return;
            }

            const command = currentSegment === '' ? 'M' : 'L';
            currentSegment += `${command} ${toX(value.xValue)} ${toY(value.yValue)} `;
        });

        if (currentSegment !== '') {
            segments.push(currentSegment.trim());
        }

        return segments;
    };

    const actualPaths = buildSegmentedPaths(actualSeries);

    const yTicks = Array.from({ length: 5 }, (_, tickIndex) => {
        const ratio = tickIndex / 4;
        const value = maxY - ratio * spanY;
        return {
            y: toY(value),
            label: `${value.toFixed(1)} kg`,
        };
    });

    const xTickValues = Array.from(new Set(allXValues))
        .sort((left, right) => left - right)
        .map((value) => ({
            x: toX(value),
            value,
            label: formatShortDate(new Date(value).toISOString().slice(0, 10)),
        }));
    const xLabelStep = Math.max(1, Math.ceil(xTickValues.length / 6));
    const xTicks = xTickValues.filter(
        (tick, index) =>
            index % xLabelStep === 0 || index === xTickValues.length - 1,
    );

    const latestPrediction =
        visibleRows[visibleRows.length - 1] ??
        rowsWithFeedback[rowsWithFeedback.length - 1];
    const latestWeightPoint =
        visibleWeightPoints[visibleWeightPoints.length - 1] ??
        weightPoints[weightPoints.length - 1];
    const latestProjectedActive = latestPrediction?.feedback_unlocked
        ? latestPrediction.projected_after_feedback_kg
        : latestPrediction?.projected_weight_kg;
    const latestBaselineWeight = latestPrediction?.baseline_weight_kg ?? null;
    const latestHorizonDays = latestPrediction?.horizon_days ?? null;
    const weeklyProjectedWeight =
        typeof latestProjectedActive === 'number' &&
        typeof latestBaselineWeight === 'number' &&
        typeof latestHorizonDays === 'number' &&
        latestHorizonDays > 0
            ? latestBaselineWeight +
              ((latestProjectedActive - latestBaselineWeight) /
                  latestHorizonDays) *
                  7
            : null;
    const actualColor =
        'color-mix(in oklab, var(--palette-primary-400) 90%, white 10%)';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-border/80 bg-card p-1 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode('month')}
                        className={`rounded-full px-3 py-1 font-semibold transition ${viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('week')}
                        className={`rounded-full px-3 py-1 font-semibold transition ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                    <span className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Month
                    </span>
                    <select
                        value={selectedMonthKey}
                        onChange={(event) =>
                            setSelectedMonthKey(event.target.value)
                        }
                        className="w-full rounded-[18px] border border-border/60 bg-card px-4 py-3 text-sm text-foreground"
                    >
                        {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                {viewMode === 'week' ? (
                    <label className="space-y-2">
                        <span className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Week
                        </span>
                        <select
                            value={selectedWeekKey}
                            onChange={(event) =>
                                setSelectedWeekKey(event.target.value)
                            }
                            className="w-full rounded-[18px] border border-border/60 bg-card px-4 py-3 text-sm text-foreground"
                        >
                            {weekOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
            </div>

            <div className="dashboard-surface rounded-[24px] p-4 md:p-5">
                <div className="overflow-x-auto">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        role="img"
                        aria-label="Prediction timeline versus all logged weigh-ins"
                        className="h-[300px] w-full min-w-[620px]"
                    >
                        {yTicks.map((tick, tickIndex) => (
                            <g key={`y-tick-${tickIndex}`}>
                                <line
                                    x1={padLeft}
                                    y1={tick.y}
                                    x2={width - padRight}
                                    y2={tick.y}
                                    stroke="var(--border)"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={padLeft - 8}
                                    y={tick.y + 4}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="var(--muted-foreground)"
                                >
                                    {tick.label}
                                </text>
                            </g>
                        ))}

                        {xTicks.map((tick, index) => (
                            <g key={`x-tick-${index}`}>
                                <line
                                    x1={tick.x}
                                    y1={height - padBottom}
                                    x2={tick.x}
                                    y2={height - padBottom + 4}
                                    stroke="var(--border)"
                                    strokeWidth="1"
                                />
                                <text
                                    x={tick.x}
                                    y={height - padBottom + 24}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="var(--muted-foreground)"
                                    transform={`rotate(-28 ${tick.x} ${height - padBottom + 24})`}
                                >
                                    {tick.label}
                                </text>
                            </g>
                        ))}

                        <line
                            x1={padLeft}
                            y1={padTop}
                            x2={padLeft}
                            y2={height - padBottom}
                            stroke="var(--border)"
                            strokeWidth="1"
                        />
                        <line
                            x1={padLeft}
                            y1={height - padBottom}
                            x2={width - padRight}
                            y2={height - padBottom}
                            stroke="var(--border)"
                            strokeWidth="1"
                        />

                        {actualPaths.map((path, index) => (
                            <path
                                key={`actual-path-${index}`}
                                d={path}
                                fill="none"
                                stroke={actualColor}
                                strokeWidth="2.4"
                            />
                        ))}

                        {actualSeries.map((point, index) => (
                            <circle
                                key={`actual-point-${index}`}
                                cx={toX(point.xValue)}
                                cy={toY(point.yValue)}
                                r={3.4}
                                fill={actualColor}
                            />
                        ))}

                        <text
                            x={padLeft - 46}
                            y={padTop - 2}
                            fontSize="11"
                            fill="var(--muted-foreground)"
                        >
                            Weight (kg)
                        </text>
                        <text
                            x={width - padRight}
                            y={height - 10}
                            textAnchor="end"
                            fontSize="11"
                            fill="var(--muted-foreground)"
                        >
                            Timeline
                        </text>
                    </svg>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <PredictionStat
                    label="Current weight"
                    value={
                        latestWeightPoint
                            ? `${latestWeightPoint.yValue.toFixed(1)} kg`
                            : 'N/A'
                    }
                />
                <PredictionStat
                    label="Next predicted weight"
                    value={
                        typeof weeklyProjectedWeight === 'number'
                            ? `${weeklyProjectedWeight.toFixed(1)} kg in 1 week`
                            : 'N/A'
                    }
                />
            </div>
        </div>
    );
}

function PredictionStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="dashboard-surface-soft rounded-[20px] p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </p>
            <p className="mt-2 text-sm leading-6 font-medium text-foreground">
                {value}
            </p>
        </div>
    );
}

function parseIsoDate(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return new Date(value);
    }

    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function isoDateToAxisValue(value: string): number {
    return parseIsoDate(value).getTime();
}

function monthKeyFromDate(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function monthKeyFromIso(value: string): string {
    return monthKeyFromDate(parseIsoDate(value));
}

function formatMonthKeyLabel(value: string): string {
    const [yearRaw, monthRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    if (!year || !month) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
    }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function startOfWeekUtc(value: Date): Date {
    const copy = new Date(value.getTime());
    const day = copy.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setUTCDate(copy.getUTCDate() + diff);
    copy.setUTCHours(12, 0, 0, 0);
    return copy;
}

function weekKeyFromDate(value: Date): string {
    const start = startOfWeekUtc(value);
    return start.toISOString().slice(0, 10);
}

function weekKeyFromIso(value: string): string {
    return weekKeyFromDate(parseIsoDate(value));
}

function formatWeekKeyLabel(value: string): string {
    const start = parseIsoDate(value);
    const end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);

    return `${start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })} - ${end.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })}`;
}

function formatShortDate(value: string | null | undefined): string {
    if (!value) {
        return 'N/A';
    }

    const parsed = parseIsoDate(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

function compactAxisDateLabel(value: string): string {
    if (/^\d{4}-W\d{2}$/.test(value)) {
        return value.replace(/^\d{4}-/, '');
    }

    const parsed = parseIsoDate(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    }

    return value.length > 14 ? `${value.slice(0, 12)}...` : value;
}

function formatAdminMoment(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        users: 0,
        professionals: 0,
        pendingVerifications: 0,
        alerts: 0,
    });
    const [recentUsers, setRecentUsers] = useState<AdminListItem[]>([]);
    const [pendingVerifications, setPendingVerifications] = useState<
        AdminListItem[]
    >([]);
    const [recentLogs, setRecentLogs] = useState<AdminListItem[]>([]);
    const [recentAlerts, setRecentAlerts] = useState<AdminListItem[]>([]);
    const [latestPlannerAudit, setLatestPlannerAudit] =
        useState<AdminPlannerAuditRun | null>(null);

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
                    plannerAuditResponse,
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
                    fetch('/api/ai/planner-audits/latest'),
                ]);

                if (
                    !usersResponse.ok ||
                    !trainerResponse.ok ||
                    !nutritionistResponse.ok ||
                    !pendingResponse.ok ||
                    !logsResponse.ok ||
                    !alertsResponse.ok ||
                    !plannerAuditResponse.ok
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
                    plannerAuditJson,
                ] = await Promise.all([
                    usersResponse.json(),
                    trainerResponse.json(),
                    nutritionistResponse.json(),
                    pendingResponse.json(),
                    logsResponse.json(),
                    alertsResponse.json(),
                    plannerAuditResponse.json(),
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
                setLatestPlannerAudit(
                    plannerAuditJson?.audit &&
                        typeof plannerAuditJson.audit === 'object'
                        ? (plannerAuditJson.audit as AdminPlannerAuditRun)
                        : null,
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

    const plannerAuditSummary = useMemo(() => {
        if (!latestPlannerAudit) {
            return {
                tone: 'info' as const,
                label: 'Not run',
                detail: 'No planner audit snapshot is loaded yet. Keep deeper AI debugging inside the planner workspace.',
                statValue: 'Not run',
                statHelper:
                    'Use AI Planner for audit runs, schema checks, and technical review.',
                metricLabel: 'No audit snapshot',
            };
        }

        if (
            latestPlannerAudit.status === 'queued' ||
            latestPlannerAudit.status === 'running'
        ) {
            const progressLabel =
                latestPlannerAudit.status === 'running'
                    ? `${Math.round(latestPlannerAudit.percent_complete)}% complete`
                    : 'Waiting to start';

            return {
                tone: 'info' as const,
                label:
                    latestPlannerAudit.status === 'running'
                        ? 'Running'
                        : 'Queued',
                detail:
                    latestPlannerAudit.status === 'running'
                        ? `Planner audit is in progress${latestPlannerAudit.current_user_email ? ` for ${latestPlannerAudit.current_user_email}` : ''}.`
                        : 'A planner audit is queued and waiting to begin.',
                statValue: progressLabel,
                statHelper:
                    'Technical review is active. Use the planner page for the full trace and workload controls.',
                metricLabel: progressLabel,
            };
        }

        if (latestPlannerAudit.status === 'failed') {
            return {
                tone: 'warning' as const,
                label: 'Failed',
                detail:
                    latestPlannerAudit.last_error?.trim() ||
                    'The latest planner audit failed. Review the planner workspace and logs before trusting the latest results.',
                statValue: 'Failed',
                statHelper:
                    'Latest audit needs technical follow-up in the planner workspace or logs.',
                metricLabel: 'Needs review',
            };
        }

        if (latestPlannerAudit.failed_runs > 0) {
            return {
                tone: 'warning' as const,
                label: 'Needs review',
                detail: `The latest completed planner audit finished with ${latestPlannerAudit.failed_runs} failed run${latestPlannerAudit.failed_runs === 1 ? '' : 's'}.`,
                statValue: `${latestPlannerAudit.failed_runs} failed`,
                statHelper:
                    'Completed audit still needs a technical review before it is treated as clean.',
                metricLabel: `${latestPlannerAudit.success_runs} success / ${latestPlannerAudit.failed_runs} failed`,
            };
        }

        return {
            tone: 'accent' as const,
            label: 'Healthy',
            detail: `Latest completed planner audit finished ${formatAdminMoment(latestPlannerAudit.finished_at ?? latestPlannerAudit.started_at)} with no failed runs.`,
            statValue: 'Healthy',
            statHelper:
                'Latest completed planner audit looks clean from the command-center view.',
            metricLabel: `${latestPlannerAudit.success_runs} successful runs`,
        };
    }, [latestPlannerAudit]);

    const primaryQueue = useMemo(() => {
        if (loading) {
            return {
                title: 'Loading queues',
                description:
                    'Pulling the current user, verification, alert, and AI status lanes.',
                meta: 'Refreshing admin snapshot',
                href: null,
                actionLabel: 'Loading',
                tone: 'info' as const,
            };
        }

        if (
            stats.pendingVerifications > 0 &&
            stats.pendingVerifications >= stats.alerts
        ) {
            return {
                title: 'Verification queue',
                description: `${stats.pendingVerifications} professional review decision${stats.pendingVerifications === 1 ? '' : 's'} waiting on approval, rejection, or follow-up.`,
                meta: 'Highest-volume review lane',
                href: '/admin/professional-verifications',
                actionLabel: 'Review queue',
                tone: 'warning' as const,
            };
        }

        if (stats.alerts > 0) {
            return {
                title: 'Unread alert follow-up',
                description: `${stats.alerts} alert${stats.alerts === 1 ? '' : 's'} still unread by recipients. Start here when interventions or account notices need confirmation.`,
                meta: 'Recipient follow-up lane',
                href: '/admin/notifications',
                actionLabel: 'Open alerts',
                tone: 'warning' as const,
            };
        }

        if (recentUsers.length > 0) {
            return {
                title: 'Recent account review',
                description:
                    'Urgent queues are calm, so this is a good window to review new or recently active accounts before issues accumulate.',
                meta: 'Low-friction triage lane',
                href: '/admin/users',
                actionLabel: 'Open users',
                tone: 'accent' as const,
            };
        }

        return {
            title: 'Queue is clear',
            description:
                'The major review queues are calm right now. This is a good moment for catalog cleanup, AI review, or operational polishing.',
            meta: 'Use the calmer window well',
            href: '/admin/logs',
            actionLabel: 'Open logs',
            tone: 'accent' as const,
        };
    }, [loading, recentUsers.length, stats.alerts, stats.pendingVerifications]);

    const queueLoadItems = useMemo(
        () => [
            {
                label: 'Pending verifications',
                value: stats.pendingVerifications,
                formattedValue: `${stats.pendingVerifications} open`,
                tone: 'accent' as const,
            },
            {
                label: 'Unread alerts',
                value: stats.alerts,
                formattedValue: `${stats.alerts} open`,
            },
            {
                label: 'Recent users',
                value: recentUsers.length,
                formattedValue: `${recentUsers.length} loaded`,
            },
        ],
        [recentUsers.length, stats.alerts, stats.pendingVerifications],
    );

    const workspaceLoadItems = useMemo(
        () => [
            {
                label: 'Users',
                value: stats.users,
                formattedValue: `${stats.users} accounts`,
            },
            {
                label: 'Professionals',
                value: stats.professionals,
                formattedValue: `${stats.professionals} profiles`,
                tone: 'accent' as const,
            },
            {
                label: 'Unread alerts',
                value: stats.alerts,
                formattedValue: `${stats.alerts} open`,
                tone: 'accent' as const,
            },
        ],
        [stats.alerts, stats.professionals, stats.users],
    );

    const investigationTimelineItems = useMemo(
        () =>
            [
                ...recentAlerts.map((alert) => ({
                    id: `alert-${alert.id}`,
                    title: alert.title ?? 'Alert',
                    description:
                        alert.target_user?.email ||
                        alert.email ||
                        'Assigned recipient',
                    meta: 'Unread alert',
                    timestamp: formatAdminMoment(alert.created_at),
                    sortValue: alert.created_at
                        ? new Date(alert.created_at).getTime()
                        : 0,
                    tone: 'warning' as const,
                    chips: [{ value: 'needs_review', label: 'Unread' }],
                })),
                ...recentLogs.map((log) => ({
                    id: `log-${log.id}`,
                    title: log.action ?? 'Action',
                    description: log.target_type
                        ? `Target: ${log.target_type}`
                        : 'No specific target',
                    meta: 'Admin audit log',
                    timestamp: formatAdminMoment(log.created_at),
                    sortValue: log.created_at
                        ? new Date(log.created_at).getTime()
                        : 0,
                    tone: 'info' as const,
                    chips: [{ value: 'info', label: 'Audit' }],
                })),
            ]
                .sort((a, b) => b.sortValue - a.sortValue)
                .slice(0, 8),
        [recentAlerts, recentLogs],
    );

    return (
        <AdminPageShell
            title="Admin Command Center"
            description="A calmer command center for account review, professional moderation, AI oversight, and audit follow-up without dumping technical noise into every surface."
            actions={
                <>
                    <ActionButton
                        variant="primary"
                        onClick={() => router.visit('/admin/users')}
                    >
                        Open Users
                    </ActionButton>
                    <ActionButton
                        variant="secondary"
                        onClick={() =>
                            router.visit('/admin/professional-verifications')
                        }
                    >
                        Review Verifications
                    </ActionButton>
                    <ActionButton
                        variant="soft"
                        onClick={() => router.visit('/admin/notifications')}
                    >
                        Open Notifications
                    </ActionButton>
                    <ActionButton
                        variant="soft"
                        onClick={() => router.visit('/ai/planner')}
                    >
                        Planner Ops
                    </ActionButton>
                </>
            }
        >
            <div className="space-y-5">
                {error ? (
                    <AdminNotice tone="danger">{error}</AdminNotice>
                ) : null}

                <SharedAdminStatsGrid className="xl:grid-cols-5">
                    <SharedAdminStatCard
                        label="Users"
                        value={loading ? '...' : String(stats.users)}
                        helper="Search, verify, and update accounts."
                    />
                    <SharedAdminStatCard
                        label="Professionals"
                        value={loading ? '...' : String(stats.professionals)}
                        helper="Trainer and dietitian profiles."
                    />
                    <SharedAdminStatCard
                        label="Pending Verifications"
                        value={
                            loading ? '...' : String(stats.pendingVerifications)
                        }
                        helper="Applications waiting for review."
                    />
                    <SharedAdminStatCard
                        label="Unread Alerts"
                        value={loading ? '...' : String(stats.alerts)}
                        helper="Notifications still unseen by recipients."
                    />
                    <SharedAdminStatCard
                        label="Planner Audit"
                        value={loading ? '...' : plannerAuditSummary.statValue}
                        helper={plannerAuditSummary.statHelper}
                    />
                </SharedAdminStatsGrid>

                <SharedAdminSection
                    title="Daily Snapshot"
                    description="A tighter first read on queues, interventions, and AI health before you move into deeper admin work."
                >
                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                        <AdminOverviewCard
                            title="Needs attention now"
                            description="Keep the next action obvious, keep safety visible, and push raw debugging detail into planner ops and logs."
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                <AdminSignalCard
                                    eyebrow="Primary queue"
                                    title={primaryQueue.title}
                                    description={primaryQueue.description}
                                    meta={primaryQueue.meta}
                                    tone={primaryQueue.tone}
                                    actionLabel={primaryQueue.actionLabel}
                                    onClick={
                                        primaryQueue.href
                                            ? () =>
                                                  router.visit(
                                                      primaryQueue.href,
                                                  )
                                            : undefined
                                    }
                                />
                                <AdminSignalCard
                                    eyebrow="Interventions"
                                    title={
                                        loading
                                            ? 'Loading alerts'
                                            : stats.alerts > 0
                                              ? `${stats.alerts} unread alert${stats.alerts === 1 ? '' : 's'}`
                                              : 'No unread alerts'
                                    }
                                    description={
                                        loading
                                            ? 'Pulling current recipient state.'
                                            : stats.alerts > 0
                                              ? 'Unread alerts should be confirmed before they become support debt.'
                                              : 'No unread intervention alerts are loaded right now.'
                                    }
                                    meta="Communication follow-up"
                                    tone={
                                        stats.alerts > 0 ? 'warning' : 'default'
                                    }
                                    actionLabel="Open alerts"
                                    onClick={() =>
                                        router.visit('/admin/notifications')
                                    }
                                />
                                <AdminSignalCard
                                    eyebrow="User review"
                                    title={
                                        loading
                                            ? 'Loading accounts'
                                            : recentUsers.length > 0
                                              ? `${recentUsers.length} recent account${recentUsers.length === 1 ? '' : 's'} loaded`
                                              : 'No recent accounts loaded'
                                    }
                                    description={
                                        loading
                                            ? 'Pulling the latest users for quick triage.'
                                            : 'Use the users workspace to review onboarding quality, restrictions, and support-sensitive accounts.'
                                    }
                                    meta="Profile triage"
                                    tone="default"
                                    actionLabel="Open users"
                                    onClick={() => router.visit('/admin/users')}
                                />
                                <AdminSignalCard
                                    eyebrow="Planner health"
                                    title={plannerAuditSummary.label}
                                    description={plannerAuditSummary.detail}
                                    meta="Technical detail stays in AI Planner"
                                    tone={plannerAuditSummary.tone}
                                    actionLabel="Open planner ops"
                                    onClick={() => router.visit('/ai/planner')}
                                />
                            </div>
                        </AdminOverviewCard>

                        <AdminOverviewCard
                            title="Operational rails"
                            description="Jump into the dedicated workspace instead of stacking every workflow into one screen."
                            className="h-full"
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                <AdminWorkspaceCard
                                    icon={Sparkles}
                                    title="AI Planner"
                                    description="Audit runs, plan health, and deeper technical review."
                                    meta="Planner operations"
                                    href="/ai/planner"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={Sparkles}
                                    title="AI Coach"
                                    description="Support and policy follow-up in coach context."
                                    meta="Assistant context"
                                    href="/coach"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={Settings2}
                                    title="Audit Logs"
                                    description="Metadata, targets, and actor drill-down."
                                    meta="Traceability"
                                    href="/admin/logs"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={ShieldCheck}
                                    title="Verifications"
                                    description="Focused approval and compliance work."
                                    meta="Safety review"
                                    href="/admin/professional-verifications"
                                    compact
                                />
                            </div>
                        </AdminOverviewCard>
                    </div>
                </SharedAdminSection>

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                    <SharedAdminSection
                        title="Priority lanes"
                        description="Keep review, support, and intervention work in clearly separated lanes."
                        className="h-full"
                    >
                        <div className="grid items-start gap-4 lg:grid-cols-3">
                            <AdminPriorityCard
                                icon={Users}
                                eyebrow="Accounts"
                                count={
                                    loading ? '...' : String(recentUsers.length)
                                }
                                title="Recent users"
                                description="Recent accounts awaiting profile checks and support follow-up."
                                actionLabel="Open users"
                                onAction={() => router.visit('/admin/users')}
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
                                emptyText="No users loaded."
                            />
                            <AdminPriorityCard
                                icon={ShieldCheck}
                                eyebrow="Approvals"
                                count={
                                    loading
                                        ? '...'
                                        : String(stats.pendingVerifications)
                                }
                                title="Verification queue"
                                description="Professional submissions that still need a decision."
                                actionLabel="Review queue"
                                onAction={() =>
                                    router.visit(
                                        '/admin/professional-verifications',
                                    )
                                }
                                items={pendingVerifications.map(
                                    (verification) => ({
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
                                    }),
                                )}
                                emptyText="No pending verification requests."
                            />
                            <AdminPriorityCard
                                icon={BellRing}
                                eyebrow="Comms"
                                count={loading ? '...' : String(stats.alerts)}
                                title="Unread alerts"
                                description="Interventions that still need recipient follow-up."
                                actionLabel="Open alerts"
                                onAction={() =>
                                    router.visit('/admin/notifications')
                                }
                                items={recentAlerts.map((alert) => ({
                                    id: alert.id,
                                    title: alert.title ?? 'Alert',
                                    subtitle:
                                        alert.target_user?.email ??
                                        alert.email ??
                                        'Assigned recipient',
                                }))}
                                emptyText="No unread admin alerts."
                            />
                        </div>
                    </SharedAdminSection>

                    <SharedAdminSection
                        title="Linked Follow-Up"
                        description="Investigation context and direct next steps, without forcing a jump into logs first."
                        className="h-full"
                    >
                        <div className="space-y-4">
                            <div className="dashboard-surface rounded-[24px] p-4">
                                <div className="space-y-1">
                                    <div className="haye-kicker">
                                        Investigation feed
                                    </div>
                                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                        Recent alerts and audit events
                                    </h3>
                                </div>
                                <AdminScrollArea
                                    className="mt-4"
                                    maxHeightClassName="max-h-[22rem]"
                                >
                                    <ActivityTimeline
                                        items={investigationTimelineItems}
                                        emptyTitle="No investigation events yet"
                                        emptyDescription="Unread alerts and admin actions will appear here once the queues are active."
                                    />
                                </AdminScrollArea>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <AdminWorkspaceCard
                                    icon={BellRing}
                                    title="Notifications"
                                    description="Confirm who still has unread notices and what they received."
                                    meta="Recipient state"
                                    href="/admin/notifications"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={Settings2}
                                    title="Audit Logs"
                                    description="Inspect metadata, targets, and the actor behind a change."
                                    meta="Audit drill-down"
                                    href="/admin/logs"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={ShieldCheck}
                                    title="Verifications"
                                    description="Continue moderation work from the queue into the decision rail."
                                    meta="Safety review"
                                    href="/admin/professional-verifications"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={Users}
                                    title="Users"
                                    description="Carry the investigation into the user workspace."
                                    meta="Profile context"
                                    href="/admin/users"
                                    compact
                                />
                            </div>
                        </div>
                    </SharedAdminSection>
                </div>

                <SharedAdminSection
                    title="Operational Health"
                    description="Use compact health views here, then move into planner ops or logs only when the signal actually needs technical depth."
                >
                    <div className="grid items-start gap-4 xl:grid-cols-3">
                        <BarListCard
                            title="Queue load"
                            description="The queues that shape the next round of admin work."
                            items={queueLoadItems}
                        />
                        <BarListCard
                            title="Workspace load"
                            description="Current workload concentration by admin surface."
                            items={workspaceLoadItems}
                        />
                        <AdminPlannerAuditCard
                            audit={latestPlannerAudit}
                            summary={plannerAuditSummary}
                        />
                    </div>
                </SharedAdminSection>

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.98fr)]">
                    <SharedAdminSection
                        title="Operations workspace"
                        description="Direct entry points for people and health-data workflows, ordered for daily admin triage."
                        className="h-full"
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <AdminWorkspaceCard
                                icon={Users}
                                title="Users"
                                description="Search, edit, and inspect account health."
                                meta="Profiles and account state"
                                href="/admin/users"
                            />
                            <AdminWorkspaceCard
                                icon={ShieldCheck}
                                title="Verifications"
                                description="Approve, reject, or request information from professionals."
                                meta="Decision queue"
                                href="/admin/professional-verifications"
                            />
                            <AdminWorkspaceCard
                                icon={ShieldCheck}
                                title="Professionals"
                                description="Review trainer and dietitian public profile quality."
                                meta="Directory quality"
                                href="/admin/professionals"
                            />
                            <AdminWorkspaceCard
                                icon={BellRing}
                                title="Notifications"
                                description="Send targeted admin messages and monitor delivery state."
                                meta="Communication workflow"
                                href="/admin/notifications"
                            />
                            <AdminWorkspaceCard
                                icon={UtensilsCrossed}
                                title="Meals"
                                description="Manage food catalog entries and meal log corrections."
                                meta="Nutrition data controls"
                                href="/admin/meals"
                            />
                            <AdminWorkspaceCard
                                icon={Activity}
                                title="Progress"
                                description="Inspect measurement records and body progress data."
                                meta="Tracking and measurement"
                                href="/admin/progress"
                            />
                            <AdminWorkspaceCard
                                icon={MapPin}
                                title="Places"
                                description="Keep local discovery data accurate and usable."
                                meta="Nearby services and curation"
                                href="/admin/places"
                            />
                            <AdminWorkspaceCard
                                icon={Sparkles}
                                title="AI Planner"
                                description="Inspect plan generation quality and safety outcomes."
                                meta="AI operations"
                                href="/ai/planner"
                            />
                        </div>
                    </SharedAdminSection>

                    <SharedAdminSection
                        title="Recent admin actions"
                        description="A compact activity summary for quick verification before deeper audit review."
                        actions={
                            <ActionButton
                                variant="soft"
                                onClick={() => router.visit('/admin/logs')}
                            >
                                View logs
                            </ActionButton>
                        }
                        className="h-full"
                    >
                        <div className="space-y-4">
                            <AdminScrollArea maxHeightClassName="max-h-[24rem]">
                                <AdminListCard
                                    emptyText="No admin actions recorded yet."
                                    items={recentLogs.map((log) => ({
                                        id: log.id,
                                        title: log.action ?? 'Action',
                                        subtitle: log.target_type
                                            ? `Target: ${log.target_type}`
                                            : 'No target',
                                    }))}
                                />
                            </AdminScrollArea>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <AdminWorkspaceCard
                                    icon={Settings2}
                                    title="Audit logs"
                                    description="Full moderation and system history."
                                    meta="Traceability and review"
                                    href="/admin/logs"
                                    compact
                                />
                                <AdminWorkspaceCard
                                    icon={Sparkles}
                                    title="Diagnostics"
                                    description="Open the dedicated debugging workspace for logs and technical investigation."
                                    meta="Debug-only surface"
                                    href="/admin/logs"
                                    compact
                                />
                            </div>
                        </div>
                    </SharedAdminSection>
                </div>
            </div>
        </AdminPageShell>
    );
}

function adminSignalToneClassName(tone: AdminSignalTone) {
    if (tone === 'accent') {
        return 'border-primary/18 bg-primary/10';
    }

    if (tone === 'warning') {
        return 'border-warning/30 bg-warning/10';
    }

    if (tone === 'info') {
        return 'border-info/24 bg-info/10';
    }

    return 'border-border/70 bg-background/72';
}

function AdminSignalCard({
    eyebrow,
    title,
    description,
    meta,
    tone = 'default',
    actionLabel,
    onClick,
}: {
    eyebrow: string;
    title: string;
    description: string;
    meta: string;
    tone?: AdminSignalTone;
    actionLabel?: string;
    onClick?: () => void;
}) {
    const content = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    {eyebrow}
                </div>
                {onClick ? (
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                ) : null}
            </div>
            <div className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                {title}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {meta}
                </div>
                {actionLabel ? (
                    <div className="text-sm font-medium text-foreground">
                        {actionLabel}
                    </div>
                ) : null}
            </div>
        </>
    );

    if (!onClick) {
        return (
            <div
                className={`rounded-[24px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${adminSignalToneClassName(
                    tone,
                )}`}
            >
                {content}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`group h-full rounded-[24px] border px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:-translate-y-0.5 hover:border-primary/22 ${adminSignalToneClassName(
                tone,
            )}`}
        >
            {content}
        </button>
    );
}

function AdminPlannerAuditCard({
    audit,
    summary,
}: {
    audit: AdminPlannerAuditRun | null;
    summary: {
        tone: AdminSignalTone;
        label: string;
        detail: string;
        metricLabel: string;
    };
}) {
    return (
        <AdminOverviewCard
            title="Planner audit status"
            description="A dedicated technical health lane for planner operations, so deeper debugging stays separate from day-to-day moderation."
            action={
                <ActionButton
                    variant="soft"
                    onClick={() => router.visit('/ai/planner')}
                    className="px-3 py-2 text-xs"
                >
                    Open AI Planner
                </ActionButton>
            }
            className="h-full"
        >
            <div className="space-y-3">
                <div
                    className={`rounded-[22px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] ${adminSignalToneClassName(
                        summary.tone,
                    )}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Current status
                            </div>
                            <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                                {summary.label}
                            </div>
                        </div>
                        <div className="rounded-full border border-current/10 bg-background/75 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-foreground uppercase">
                            {summary.metricLabel}
                        </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground/85">
                        {summary.detail}
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-3">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Progress
                        </div>
                        <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                            {audit
                                ? `${audit.completed_runs}/${audit.total_runs}`
                                : 'No run'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Completed runs loaded from the latest audit
                            snapshot.
                        </div>
                    </div>
                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-3">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Failed runs
                        </div>
                        <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                            {audit ? String(audit.failed_runs) : '0'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Use AI Planner or logs for the raw trace when this
                            rises.
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <AdminWorkspaceCard
                        icon={Sparkles}
                        title="Planner ops"
                        description="Open the planner workspace for audit runs, workload controls, and deeper technical review."
                        meta="AI operations"
                        href="/ai/planner"
                        compact
                    />
                    <AdminWorkspaceCard
                        icon={Settings2}
                        title="Logs"
                        description="Cross-check audit timing, affected targets, and admin actions without cluttering the main dashboard."
                        meta="Audit drill-down"
                        href="/admin/logs"
                        compact
                    />
                </div>
            </div>
        </AdminOverviewCard>
    );
}

function AdminListCard({
    emptyText,
    items,
}: {
    emptyText: string;
    items: Array<{ id: number; title: string; subtitle: string }>;
}) {
    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
            ) : (
                <>
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-[22px] border border-border/70 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                                <div className="min-w-0">
                                    <div className="line-clamp-1 font-medium text-foreground">
                                        {item.title}
                                    </div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {item.subtitle}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

function AdminPriorityCard({
    icon: Icon,
    eyebrow,
    count,
    title,
    description,
    actionLabel,
    onAction,
    items,
    emptyText,
}: {
    icon: typeof Users;
    eyebrow: string;
    count: string;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    items: Array<{ id: number; title: string; subtitle: string }>;
    emptyText: string;
}) {
    return (
        <div className="haye-panel h-full rounded-[30px] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        {eyebrow}
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-foreground">
                        {count}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                            {title}
                        </h3>
                        <p className="mt-2 text-sm leading-5 text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-4 max-h-56 overflow-auto pr-1 [scrollbar-width:thin]">
                <AdminListCard emptyText={emptyText} items={items} />
            </div>

            <button
                type="button"
                onClick={onAction}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
            >
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
            </button>
        </div>
    );
}

function AdminWorkspaceCard({
    icon: Icon,
    title,
    description,
    meta,
    href,
    compact = false,
}: {
    icon: typeof Users;
    title: string;
    description: string;
    meta: string;
    href: string;
    compact?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => router.visit(href)}
            className={cn(
                'group rounded-[26px] border border-border/70 bg-background/74 text-left shadow-[0_24px_50px_-40px_rgba(9,18,33,0.42)] transition hover:-translate-y-0.5 hover:border-primary/22 hover:bg-card',
                compact ? 'p-3.5' : 'p-4',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span
                    className={cn(
                        'inline-flex items-center justify-center rounded-[18px] border border-primary/14 bg-primary/10 text-primary',
                        compact ? 'h-9 w-9' : 'h-11 w-11',
                    )}
                >
                    <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
            </div>
            <div className={compact ? 'mt-4 space-y-1' : 'mt-5 space-y-2'}>
                <div className="text-base font-semibold tracking-tight text-foreground">
                    {title}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
                <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    {meta}
                </div>
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
            className="dashboard-surface rounded-[26px] p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.72)] transition hover:-translate-y-0.5 hover:border-primary/24 hover:bg-card"
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
