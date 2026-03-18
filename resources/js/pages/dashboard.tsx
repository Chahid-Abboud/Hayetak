// resources/js/pages/dashboard.tsx
import { AdminShell as AdminPageShell } from '@/components/admin/AdminShell';
import BmiCard from '@/components/BmiCard';
import NavHeader from '@/components/NavHeader';
import WaterCard from '@/components/WaterCard';
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
};

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
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:opacity-100';
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
                        'color-mix(in oklab, var(--primary) 12%, white)',
                    color: 'color-mix(in oklab, var(--primary-foreground) 60%, var(--foreground))',
                    border: '1px solid var(--border)',
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
            className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm"
            aria-labelledby={headingId}
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <h2 id={headingId} className="text-xl font-semibold">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="flex gap-3">{actions}</div> : null}
            </div>

            <div className="mt-4">{children}</div>
        </section>
    );
}

export default function Home() {
    const {
        auth,
        isGuest: isGuestProp,
        userProfile,
        water,
        todayLog,
        todayMacros,
        mealTotals,
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

    // --- Optional day log grouping (kept, even if not currently displayed) ---
    const logToShow = todayLog ?? null;
    const grouped: Record<string, TodayLogItem[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
        drink: [],
    };
    if (logToShow?.items?.length) {
        for (const it of logToShow.items) grouped[it.category].push(it);
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

    const round = (n: number) => Math.round(n);

    const todayISO = new Date().toISOString().slice(0, 10);

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

    if (userRole === 'admin') {
        return (
            <>
                <Head title="Admin Dashboard" />
                <AdminDashboard />
            </>
        );
    }

    return (
        <>
            <Head title="Home" />

            {/* Skip link for keyboard users */}
            <a
                href="#main-content"
                className={`sr-only rounded-md bg-card px-3 py-2 text-sm font-semibold shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 ${FOCUS_RING}`}
            >
                Skip to main content
            </a>

            <NavHeader />

            <main
                id="main-content"
                className="mx-auto max-w-6xl space-y-10 px-6 py-8"
            >
                {/* Page heading */}
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Welcome to Hayetak,{' '}
                            <span className="capitalize">{displayName}</span>
                        </h1>
                        <p className="text-muted-foreground">
                            {isGuest
                                ? 'You are browsing as a guest.'
                                : 'Here’s your personalized dashboard.'}
                        </p>
                    </div>
                </header>

                {/* Macros */}
                <CardSection
                    title="Today’s Macros"
                    description="A quick summary of your daily intake and per-meal breakdown."
                    actions={
                        <ActionButton
                            variant="primary"
                            onClick={() => router.visit('/track-meals')}
                        >
                            Open Meal Tracker
                        </ActionButton>
                    }
                    aria-labelledby="todays-macros"
                >
                    {/* Totals as a definition list for better semantics */}
                    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Stat
                            label="Calories"
                            value={`${round(macros.calories)} kcal`}
                        />
                        <Stat
                            label="Protein"
                            value={`${round(macros.protein)} g`}
                        />
                        <Stat
                            label="Carbs"
                            value={`${round(macros.carbs)} g`}
                        />
                        <Stat label="Fat" value={`${round(macros.fat)} g`} />
                    </dl>

                    {/* Per-meal */}
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                        {(
                            [
                                'breakfast',
                                'lunch',
                                'dinner',
                                'snack',
                                'drink',
                            ] as const
                        ).map((mt) => (
                            <div key={mt} className="rounded-xl border p-3">
                                <div className="text-sm font-medium capitalize">
                                    {mt}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {round(perMeal[mt].calories)} kcal · P{' '}
                                    {round(perMeal[mt].protein)} · C{' '}
                                    {round(perMeal[mt].carbs)} · F{' '}
                                    {round(perMeal[mt].fat)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardSection>

                {/* Generated Plans */}
                <CardSection
                    title="Your Generated Plans"
                    description="Latest plans created during onboarding. If you don’t see them yet, your queue worker may still be processing."
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
                        <div className="rounded-xl border p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                    Nutrition Plan
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {nutritionPlan?.is_active
                                        ? 'Active'
                                        : nutritionPlan
                                          ? 'Inactive'
                                          : '—'}
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
                        <div className="rounded-xl border p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                    Workout Plan
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {workoutPlan?.is_active
                                        ? 'Active'
                                        : workoutPlan
                                          ? 'Inactive'
                                          : '—'}
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
                    <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
                        <h2 className="text-lg font-semibold">BMI</h2>
                        <div className="mt-4">
                            <BmiCard isGuest={isGuest} profile={profileSafe} />
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
                        <h2 className="text-lg font-semibold">Water Intake</h2>
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
                    title="Log Workouts"
                    description="Start a session, then record sets & reps. See weekly progress by muscle group."
                    actions={
                        <>
                            <ActionButton
                                variant="primary"
                                onClick={startTodayWorkout}
                            >
                                Start Today’s Workout
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
            </main>
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

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border p-4">
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-lg font-semibold">{value}</dd>
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
                    Goal: {plan.goal ?? '—'} · Start: {plan.start_date} ·
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
                                                              : '—';
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
                    Goal: {plan.goal ?? '—'} · Start: {plan.start_date} ·
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
                                                : '—';

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
                                                    {sets} sets · {repText} reps
                                                </div>
                                            </div>

                                            <div className="mt-1 text-[11px] text-muted-foreground">
                                                {ex.primary_muscle
                                                    ? `Primary: ${ex.primary_muscle}`
                                                    : ''}
                                                {ex.equipment
                                                    ? ` · Equipment: ${ex.equipment}`
                                                    : ''}
                                                {ex.difficulty
                                                    ? ` · ${ex.difficulty}`
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
                            Showing first 8 exercises… open Planner to view the
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

        fetch('/workouts/progress?weeks=8', { signal: ac.signal })
            .then((r) => r.json())
            .then((d) => setSeries(Array.isArray(d.series) ? d.series : []))
            .catch(() => {
                // ignore abort errors, treat others as empty
                setSeries([]);
            });

        return () => ac.abort();
    }, []);

    if (!series.length) {
        return (
            <p className="text-sm text-muted-foreground">
                Log a few workouts to unlock progress.
            </p>
        );
    }

    const last4 = series.slice(-4);

    return (
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
                            <th scope="row" className="py-1 pr-4 font-medium">
                                {String(row.week)}
                            </th>
                            {muscles.map((m) => (
                                <td key={m} className="py-1 pr-4 tabular-nums">
                                    {typeof row[m] === 'number'
                                        ? `${row[m]} kg`
                                        : '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
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
                Keep logging to see weekly wins ✨
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
