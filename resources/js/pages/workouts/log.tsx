import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStatCard,
    ProductStatGrid,
    ProductStickyActions,
} from '@/components/product/page';
import {
    ProductButton,
    ProductInput,
    ProductModeButton,
} from '@/components/product/product-ui';
import WorkoutTabs from '@/components/workouts/WorkoutTabs';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Exercise = {
    id: number;
    name: string;
    primary_muscle: string;
    equipment?: string | null;
    demo_url?: string | null;
};

type PlanDayExercise = {
    id: number;
    name: string;
    primary_muscle: string;
    equipment?: string | null;
    pivot?: {
        sets?: number | null;
        reps_min?: number | null;
        reps_max?: number | null;
        order_index?: number | null;
    };
};

type PlanDay = {
    id: number;
    day_index: number;
    name?: string | null;
    exercises: PlanDayExercise[];
};

type WorkoutPlan = {
    id: number;
    name: string;
    days: PlanDay[];
};

type WorkoutLogSet = {
    id: number;
    exercise: { id: number; name: string } | null;
    weight_kg: number | null;
    reps: number;
    set_number: number;
};

type WorkoutLog = {
    id: number;
    workout_date: string;
    workout_plan_id?: number | null;
    workout_plan_day_id?: number | null;
    plan_source?: 'ai' | 'manual' | 'freestyle';
    day_name?: string | null;
    sets: WorkoutLogSet[];
};

type PageProps = {
    aiPlan?: WorkoutPlan | null;
    manualPlan?: WorkoutPlan | null;
    recommendedAiDayId?: number | null;
    recommendedManualDayId?: number | null;
    today: string;
    recentLogs: WorkoutLog[];
    flash?: { activeLogId?: number };
    exercises: Exercise[];
};

function sessionSourceLabel(source?: WorkoutLog['plan_source']) {
    if (source === 'ai') return 'Guided plan';
    if (source === 'manual') return 'My plan';
    return 'Freestyle';
}

function groupSetsByExercise(log: WorkoutLog | null) {
    const groups = new Map<number, WorkoutLogSet[]>();

    for (const set of log?.sets ?? []) {
        const exerciseId = set.exercise?.id;
        if (!exerciseId) continue;

        const bucket = groups.get(exerciseId) ?? [];
        bucket.push(set);
        groups.set(exerciseId, bucket);
    }

    return groups;
}

export default function WorkoutLogPage() {
    const {
        aiPlan,
        manualPlan,
        recommendedAiDayId,
        recommendedManualDayId,
        today,
        recentLogs,
        flash,
        exercises,
    } = usePage<PageProps>().props;

    const [mode, setMode] = useState<'follow-ai' | 'my-plan' | 'freestyle'>(
        aiPlan ? 'follow-ai' : manualPlan ? 'my-plan' : 'freestyle',
    );
    const [selectedAiDayId, setSelectedAiDayId] = useState<number | null>(
        recommendedAiDayId ?? aiPlan?.days?.[0]?.id ?? null,
    );
    const [selectedManualDayId, setSelectedManualDayId] = useState<
        number | null
    >(recommendedManualDayId ?? manualPlan?.days?.[0]?.id ?? null);
    const [activeLogId, setActiveLogId] = useState<number | null>(
        flash?.activeLogId ?? null,
    );
    const [status, setStatus] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [weights, setWeights] = useState<Record<number, string>>({});
    const [reps, setReps] = useState<Record<number, string>>({});
    const [search, setSearch] = useState('');
    const [freestyleIds, setFreestyleIds] = useState<number[]>([]);

    useEffect(() => {
        if (flash?.activeLogId) {
            setActiveLogId(flash.activeLogId);
        }
    }, [flash?.activeLogId]);

    const activePlanDay =
        mode === 'follow-ai'
            ? (aiPlan?.days?.find((day) => day.id === selectedAiDayId) ?? null)
            : mode === 'my-plan'
              ? (manualPlan?.days?.find(
                    (day) => day.id === selectedManualDayId,
                ) ?? null)
              : null;

    const activeLog =
        recentLogs.find((log) => log.id === activeLogId) ??
        (activeLogId === null ? null : null);

    const filteredExercises = useMemo(() => {
        const token = search.trim().toLowerCase();
        if (token === '') return exercises.slice(0, 24);

        return exercises.filter((exercise) =>
            `${exercise.name} ${exercise.primary_muscle} ${exercise.equipment ?? ''}`
                .toLowerCase()
                .includes(token),
        );
    }, [exercises, search]);

    const freestyleExercises = freestyleIds
        .map((id) => exercises.find((exercise) => exercise.id === id))
        .filter((exercise): exercise is Exercise => Boolean(exercise));

    const currentExercises =
        mode === 'freestyle'
            ? freestyleExercises
            : (activePlanDay?.exercises ?? []);

    const activeSetGroups = useMemo(
        () => groupSetsByExercise(activeLog),
        [activeLog],
    );

    const totalRecentSets = recentLogs.reduce(
        (total, log) => total + log.sets.length,
        0,
    );

    const startSession = () => {
        if (activeLogId) {
            setStatus(
                'A workout session is already active. Finish it before starting another one.',
            );
            return;
        }

        const dayId =
            mode === 'follow-ai'
                ? selectedAiDayId
                : mode === 'my-plan'
                  ? selectedManualDayId
                  : null;

        if (mode !== 'freestyle' && !dayId) {
            setStatus('Choose a workout day before starting the session.');
            return;
        }

        router.post(
            '/workouts/log/start',
            {
                workout_date: today,
                workout_plan_day_id: mode === 'freestyle' ? null : dayId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatus('Workout session started. You can log sets now.');
                },
            },
        );
    };

    const addSet = (exerciseId: number) => {
        if (!activeLogId) {
            setStatus(
                'Start a session first so the set has somewhere to save.',
            );
            return;
        }

        const repsValue = Number(reps[exerciseId]);
        const weightText = weights[exerciseId];
        const weightValue = weightText?.length ? Number(weightText) : null;

        if (!Number.isFinite(repsValue) || repsValue <= 0) {
            setStatus('Enter reps greater than zero before saving the set.');
            return;
        }

        const existingSets =
            activeLog?.sets
                ?.filter((set) => set.exercise?.id === exerciseId)
                .sort((left, right) => left.set_number - right.set_number) ??
            [];

        router.post(
            `/workouts/log/${activeLogId}/add-set`,
            {
                exercise_id: exerciseId,
                set_number: (existingSets.at(-1)?.set_number ?? 0) + 1,
                weight_kg: weightValue,
                reps: repsValue,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setWeights((current) => ({ ...current, [exerciseId]: '' }));
                    setReps((current) => ({ ...current, [exerciseId]: '' }));
                    setStatus('Set saved.');
                    router.reload({ only: ['recentLogs'] });
                },
            },
        );
    };

    const finishWorkout = () => {
        if (!activeLogId) {
            setStatus('Start a session before trying to finish it.');
            return;
        }

        setSaving(true);
        router.post(
            `/workouts/log/${activeLogId}/finish`,
            { duration_min: null, notes: null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatus('Workout saved successfully.');
                    setActiveLogId(null);
                    router.reload({ only: ['recentLogs'] });
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <Head title="Workout Log" />

            <ProductPageShell width="wide">
                <WorkoutTabs active="log" />

                <ProductHero
                    eyebrow={
                        <span className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                            Workout Log
                        </span>
                    }
                    title={
                        mode === 'follow-ai'
                            ? 'Log every set against your guided plan'
                            : mode === 'my-plan'
                              ? 'Track your custom draft without clutter'
                              : 'Build a freestyle session with room to focus'
                    }
                    description="The page keeps your session setup, live exercise inputs, and recent history readable on both desktop and mobile with larger controls and tighter information grouping."
                    meta={
                        <div className="space-y-4 text-sm">
                            <div className="rounded-[22px] border border-border/70 bg-card/80 p-4">
                                <div className="text-sm font-semibold text-foreground">
                                    Session source
                                </div>
                                <div className="mt-2 text-base text-muted-foreground">
                                    {mode === 'follow-ai'
                                        ? (aiPlan?.name ?? 'AI workout plan')
                                        : mode === 'my-plan'
                                          ? (manualPlan?.name ??
                                            'My workout draft')
                                          : 'Freestyle logging'}
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <SummaryPill label="Today" value={today} />
                                <SummaryPill
                                    label="Session status"
                                    value={
                                        activeLogId
                                            ? `Active #${activeLogId}`
                                            : 'Not started'
                                    }
                                />
                            </div>
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <ProductModeButton
                                active={mode === 'follow-ai'}
                                disabled={!aiPlan}
                                onClick={() => aiPlan && setMode('follow-ai')}
                            >
                                Follow AI plan
                            </ProductModeButton>
                            <ProductModeButton
                                active={mode === 'my-plan'}
                                disabled={!manualPlan}
                                onClick={() => manualPlan && setMode('my-plan')}
                            >
                                My draft
                            </ProductModeButton>
                            <ProductModeButton
                                active={mode === 'freestyle'}
                                onClick={() => setMode('freestyle')}
                            >
                                Freestyle
                            </ProductModeButton>
                            <ProductButton
                                type="button"
                                onClick={startSession}
                                disabled={Boolean(activeLogId)}
                                className="gap-2"
                            >
                                <Play className="h-4 w-4" />
                                {activeLogId
                                    ? 'Session in progress'
                                    : 'Start session'}
                            </ProductButton>
                        </div>
                    }
                />

                {status ? (
                    <ProductBanner role="status">{status}</ProductBanner>
                ) : null}

                <ProductStatGrid>
                    <ProductStatCard
                        label="Recent sessions"
                        value={recentLogs.length}
                        helper="Your last logged workouts stay visible here for quick review."
                    />
                    <ProductStatCard
                        label="Recent sets"
                        value={totalRecentSets}
                        helper="Every saved set contributes to your growing workout history."
                    />
                    <ProductStatCard
                        label="Current mode"
                        value={
                            mode === 'follow-ai'
                                ? 'AI'
                                : mode === 'my-plan'
                                  ? 'Draft'
                                  : 'Free'
                        }
                        helper="Switch between guided, custom, and freestyle logging without losing context."
                    />
                    <ProductStatCard
                        label="Exercises ready"
                        value={currentExercises.length}
                        helper="Choose a day or add freestyle movements, then begin logging."
                    />
                </ProductStatGrid>

                {mode === 'follow-ai' && !aiPlan ? (
                    <ProductEmptyState
                        title="No active AI workout plan"
                        description="Generate one from the AI planner to unlock guided logging, or switch to freestyle to track a session right away."
                        action={
                            <div className="flex flex-wrap justify-center gap-3">
                                <ProductButton asChild>
                                    <Link href="/ai/planner">
                                        Open AI planner
                                    </Link>
                                </ProductButton>
                                <ProductButton
                                    emphasis="secondary"
                                    onClick={() => setMode('freestyle')}
                                >
                                    Switch to freestyle
                                </ProductButton>
                            </div>
                        }
                    />
                ) : null}

                {mode === 'my-plan' && !manualPlan ? (
                    <ProductEmptyState
                        title="No custom draft yet"
                        description="Build your own workout draft in the planner first, or switch to freestyle for a quick session."
                        action={
                            <div className="flex flex-wrap justify-center gap-3">
                                <ProductButton asChild>
                                    <Link href="/workouts/plan">
                                        Open planner
                                    </Link>
                                </ProductButton>
                                <ProductButton
                                    emphasis="secondary"
                                    onClick={() => setMode('freestyle')}
                                >
                                    Use freestyle
                                </ProductButton>
                            </div>
                        }
                    />
                ) : null}

                {(mode === 'follow-ai' && aiPlan) ||
                (mode === 'my-plan' && manualPlan) ? (
                    <ProductSection
                        title="Choose your workout day"
                        description="Pick the day you are training so the logging panel below stays focused on the right exercises."
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            {(mode === 'follow-ai'
                                ? (aiPlan?.days ?? [])
                                : (manualPlan?.days ?? [])
                            ).map((day) => (
                                <DayPickerCard
                                    key={day.id}
                                    day={day}
                                    selected={
                                        mode === 'follow-ai'
                                            ? day.id === selectedAiDayId
                                            : day.id === selectedManualDayId
                                    }
                                    recommended={
                                        mode === 'follow-ai'
                                            ? day.id === recommendedAiDayId
                                            : day.id === recommendedManualDayId
                                    }
                                    onClick={() =>
                                        mode === 'follow-ai'
                                            ? setSelectedAiDayId(day.id)
                                            : setSelectedManualDayId(day.id)
                                    }
                                />
                            ))}
                        </div>
                    </ProductSection>
                ) : null}

                <ProductSection
                    title={
                        mode === 'freestyle'
                            ? 'Freestyle builder and set logger'
                            : 'Selected exercises and live set logging'
                    }
                    description={
                        mode === 'freestyle'
                            ? 'Build the session on one side and log sets on the other so the page stays easy to scan.'
                            : 'The logging cards stay roomy, with clear weight and rep fields plus visible saved sets.'
                    }
                >
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_360px]">
                        <div className="space-y-5">
                            <ExerciseLogList
                                exercises={currentExercises}
                                weights={weights}
                                reps={reps}
                                loggedSetsByExercise={activeSetGroups}
                                onWeightChange={(exerciseId, value) =>
                                    setWeights((current) => ({
                                        ...current,
                                        [exerciseId]: value,
                                    }))
                                }
                                onRepsChange={(exerciseId, value) =>
                                    setReps((current) => ({
                                        ...current,
                                        [exerciseId]: value,
                                    }))
                                }
                                onAddSet={(exerciseId) => addSet(exerciseId)}
                            />
                        </div>

                        <div className="space-y-4">
                            <SidePanelCard
                                title="Live session"
                                description="Your current session summary stays visible while you log."
                            >
                                <div className="grid gap-3">
                                    <SessionMetric
                                        label="Active session"
                                        value={
                                            activeLogId
                                                ? `#${activeLogId}`
                                                : 'Not started'
                                        }
                                    />
                                    <SessionMetric
                                        label="Saved sets"
                                        value={String(
                                            activeLog?.sets.length ?? 0,
                                        )}
                                    />
                                    <SessionMetric
                                        label="Current focus"
                                        value={
                                            activePlanDay?.name ??
                                            (mode === 'freestyle'
                                                ? 'Freestyle session'
                                                : 'Select a day')
                                        }
                                    />
                                </div>
                            </SidePanelCard>

                            {mode === 'freestyle' ? (
                                <SidePanelCard
                                    title="Exercise library"
                                    description="Search and add freestyle exercises without leaving the page."
                                >
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <ProductInput
                                                value={search}
                                                onChange={(event) =>
                                                    setSearch(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search by name, muscle, or equipment"
                                                className="h-12 w-full pl-11 text-base"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            {filteredExercises.map(
                                                (exercise) => {
                                                    const added =
                                                        freestyleIds.includes(
                                                            exercise.id,
                                                        );

                                                    return (
                                                        <div
                                                            key={exercise.id}
                                                            className="rounded-[20px] border border-border/70 bg-card/80 p-4"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <div className="text-base font-semibold text-foreground">
                                                                        {
                                                                            exercise.name
                                                                        }
                                                                    </div>
                                                                    <div className="mt-1 text-sm text-muted-foreground">
                                                                        {
                                                                            exercise.primary_muscle
                                                                        }
                                                                        {exercise.equipment
                                                                            ? ` - ${exercise.equipment}`
                                                                            : ''}
                                                                    </div>
                                                                </div>
                                                                <ProductButton
                                                                    emphasis="secondary"
                                                                    disabled={
                                                                        added
                                                                    }
                                                                    onClick={() =>
                                                                        setFreestyleIds(
                                                                            (
                                                                                current,
                                                                            ) =>
                                                                                added
                                                                                    ? current
                                                                                    : [
                                                                                          ...current,
                                                                                          exercise.id,
                                                                                      ],
                                                                        )
                                                                    }
                                                                >
                                                                    {added
                                                                        ? 'Added'
                                                                        : 'Add'}
                                                                </ProductButton>
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                </SidePanelCard>
                            ) : (
                                <SidePanelCard
                                    title="Quick links"
                                    description="Jump between the planner, the AI flow, and your logging screen without breaking rhythm."
                                >
                                    <div className="grid gap-3">
                                        <ProductButton
                                            asChild
                                            emphasis="secondary"
                                        >
                                            <Link href="/workouts/plan">
                                                Open workout planner
                                            </Link>
                                        </ProductButton>
                                        <ProductButton
                                            asChild
                                            emphasis="secondary"
                                        >
                                            <Link href="/ai/planner">
                                                Open AI planner
                                            </Link>
                                        </ProductButton>
                                    </div>
                                </SidePanelCard>
                            )}
                        </div>
                    </div>
                </ProductSection>

                <ProductSection
                    title="Recent workout history"
                    description="Each card shows when you trained, what mode you used, and how many sets you logged."
                >
                    <div className="grid gap-4 lg:grid-cols-2">
                        {recentLogs.length ? (
                            recentLogs.map((log) => (
                                <RecentLogCard key={log.id} log={log} />
                            ))
                        ) : (
                            <ProductEmptyState
                                title="No workouts logged yet"
                                description="Start your first session and your history will fill in here."
                                className="lg:col-span-2"
                            />
                        )}
                    </div>
                </ProductSection>

                <ProductStickyActions>
                    <div className="mr-auto text-base text-muted-foreground">
                        {activeLogId
                            ? `Active session #${activeLogId} is ready for new sets.`
                            : 'Start a session before adding any sets.'}
                    </div>
                    <ProductButton
                        onClick={finishWorkout}
                        disabled={saving || !activeLogId}
                    >
                        {saving ? 'Saving workout...' : 'Finish workout'}
                    </ProductButton>
                </ProductStickyActions>
            </ProductPageShell>
        </>
    );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[20px] border border-border/70 bg-background/78 p-4">
            <div className="text-sm font-semibold text-muted-foreground">
                {label}
            </div>
            <div className="mt-2 text-base font-semibold text-foreground">
                {value}
            </div>
        </div>
    );
}

function SidePanelCard({
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
            <div className="mt-5">{children}</div>
        </div>
    );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[18px] border border-border/70 bg-card/80 px-4 py-3">
            <div className="text-sm font-semibold text-muted-foreground">
                {label}
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
                {value}
            </div>
        </div>
    );
}

function DayPickerCard({
    day,
    selected,
    recommended,
    onClick,
}: {
    day: PlanDay;
    selected: boolean;
    recommended: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                selected
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border/70 bg-background/72 hover:bg-card'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-muted-foreground">
                        Day {day.day_index}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                        {day.name ?? `Workout Day ${day.day_index}`}
                    </div>
                </div>
                {recommended ? (
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground">
                        Recommended
                    </span>
                ) : (
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
                {day.exercises.length} exercises ready to log
            </div>
        </button>
    );
}

function ExerciseLogList({
    exercises,
    weights,
    reps,
    loggedSetsByExercise,
    onWeightChange,
    onRepsChange,
    onAddSet,
}: {
    exercises: Array<Exercise | PlanDayExercise>;
    weights: Record<number, string>;
    reps: Record<number, string>;
    loggedSetsByExercise: Map<number, WorkoutLogSet[]>;
    onWeightChange: (exerciseId: number, value: string) => void;
    onRepsChange: (exerciseId: number, value: string) => void;
    onAddSet: (exerciseId: number) => void;
}) {
    if (!exercises.length) {
        return (
            <ProductEmptyState
                title="No exercises ready yet"
                description="Choose a planned day or add freestyle exercises to begin logging."
            />
        );
    }

    return (
        <div className="space-y-4">
            {exercises.map((exercise) => {
                const savedSets = loggedSetsByExercise.get(exercise.id) ?? [];

                return (
                    <div
                        key={exercise.id}
                        className="rounded-[26px] border border-border/70 bg-background/72 p-5"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold text-foreground">
                                    {exercise.name}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {'primary_muscle' in exercise
                                        ? exercise.primary_muscle
                                        : ''}
                                    {exercise.equipment
                                        ? ` - ${exercise.equipment}`
                                        : ''}
                                    {'pivot' in exercise && exercise.pivot?.sets
                                        ? ` - ${exercise.pivot.sets} planned sets`
                                        : ''}
                                </div>
                            </div>
                            {savedSets.length ? (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm font-semibold text-foreground">
                                    {savedSets.length} saved sets
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                            <label className="block">
                                <span className="text-sm font-semibold text-foreground">
                                    Weight (kg)
                                </span>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    inputMode="decimal"
                                    value={weights[exercise.id] ?? ''}
                                    onChange={(event) =>
                                        onWeightChange(
                                            exercise.id,
                                            event.target.value,
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            onAddSet(exercise.id);
                                        }
                                    }}
                                    placeholder="Optional"
                                    className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-card px-4 text-base text-foreground"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-semibold text-foreground">
                                    Reps
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    step={1}
                                    inputMode="numeric"
                                    value={reps[exercise.id] ?? ''}
                                    onChange={(event) =>
                                        onRepsChange(
                                            exercise.id,
                                            event.target.value,
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            onAddSet(exercise.id);
                                        }
                                    }}
                                    placeholder={
                                        'pivot' in exercise &&
                                        typeof exercise.pivot?.reps_min ===
                                            'number' &&
                                        typeof exercise.pivot?.reps_max ===
                                            'number'
                                            ? `${exercise.pivot.reps_min}-${exercise.pivot.reps_max}`
                                            : 'e.g. 10'
                                    }
                                    className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-card px-4 text-base text-foreground"
                                />
                            </label>
                            <ProductButton
                                type="button"
                                onClick={() => onAddSet(exercise.id)}
                                className="h-12 self-end"
                            >
                                Add set
                            </ProductButton>
                        </div>

                        {savedSets.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {savedSets.map((set) => (
                                    <div
                                        key={set.id}
                                        className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm text-foreground"
                                    >
                                        Set {set.set_number}: {set.reps} reps
                                        {set.weight_kg !== null
                                            ? ` @ ${set.weight_kg} kg`
                                            : ''}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

function RecentLogCard({ log }: { log: WorkoutLog }) {
    return (
        <div className="rounded-[24px] border border-border/70 bg-background/72 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {log.workout_date}
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                        {log.day_name ?? 'Freestyle session'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {sessionSourceLabel(log.plan_source)}
                    </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm font-semibold text-foreground">
                    {log.sets.length} sets
                </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {log.sets.slice(0, 5).map((set) => (
                    <div
                        key={set.id}
                        className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm text-foreground"
                    >
                        {set.exercise?.name ?? 'Exercise'} x {set.reps}
                        {set.weight_kg !== null ? ` @ ${set.weight_kg} kg` : ''}
                    </div>
                ))}
            </div>
        </div>
    );
}
