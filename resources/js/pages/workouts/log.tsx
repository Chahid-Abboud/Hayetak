import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStickyActions,
} from '@/components/product/page';
import WorkoutTabs from '@/components/workouts/WorkoutTabs';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

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
    ai_request?: {
        provider?: string | null;
        model?: string | null;
    } | null;
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

function sourceLabel(
    source?: { provider?: string | null; model?: string | null } | null,
) {
    const provider = source?.provider?.trim();
    const model = source?.model?.trim();

    if (!provider && !model) return 'Model unavailable';
    if (!provider) return model ?? 'Model unavailable';
    if (!model) return provider;

    return `${provider} - ${model}`;
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
        if (token === '') return exercises.slice(0, 32);

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

    const startSession = () => {
        const dayId =
            mode === 'follow-ai'
                ? selectedAiDayId
                : mode === 'my-plan'
                  ? selectedManualDayId
                  : null;

        router.post(
            '/workouts/log/start',
            {
                workout_date: today,
                workout_plan_day_id: mode === 'freestyle' ? null : dayId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatus('Workout session started. Log your sets below.');
                },
            },
        );
    };

    const addSet = (exerciseId: number) => {
        if (!activeLogId) {
            setStatus('Start a workout session first.');
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
            setStatus('Start a session first.');
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
                    router.reload({ only: ['recentLogs'] });
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <Head title="Workout Log" />

            <ProductPageShell width="wide" className="space-y-8">
                <WorkoutTabs active="log" />

                <ProductHero
                    eyebrow="Workout Log"
                    title={
                        mode === 'follow-ai'
                            ? 'Log directly against your AI plan'
                            : mode === 'my-plan'
                              ? 'Log against your custom draft'
                              : 'Freestyle your session'
                    }
                    description="The page opens in plan-first mode when a plan exists, but the mode switch is always visible so users can opt out without losing the structured path."
                    meta={
                        <div className="space-y-2 text-sm">
                            <div className="font-medium text-foreground">
                                {mode === 'follow-ai'
                                    ? sourceLabel(aiPlan?.ai_request)
                                    : mode === 'my-plan'
                                      ? (manualPlan?.name ?? 'Custom draft')
                                      : 'Freestyle logging'}
                            </div>
                            <div className="text-muted-foreground">
                                Today: {today}
                            </div>
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <ModeButton
                                active={mode === 'follow-ai'}
                                disabled={!aiPlan}
                                onClick={() => aiPlan && setMode('follow-ai')}
                            >
                                Follow AI Plan
                            </ModeButton>
                            <ModeButton
                                active={mode === 'my-plan'}
                                disabled={!manualPlan}
                                onClick={() => manualPlan && setMode('my-plan')}
                            >
                                My Plan
                            </ModeButton>
                            <ModeButton
                                active={mode === 'freestyle'}
                                onClick={() => setMode('freestyle')}
                            >
                                Freestyle
                            </ModeButton>
                            <button
                                type="button"
                                onClick={startSession}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                            >
                                <Play className="h-4 w-4" />
                                Start session
                            </button>
                        </div>
                    }
                />

                {status ? <ProductBanner>{status}</ProductBanner> : null}

                {mode === 'follow-ai' && !aiPlan ? (
                    <ProductEmptyState
                        title="No active AI workout plan"
                        description="Generate one from the AI Planner page and this screen will open in plan-follow mode by default."
                        action={
                            <Link
                                href="/ai/planner"
                                className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
                            >
                                Open AI Planner
                            </Link>
                        }
                    />
                ) : null}

                {mode === 'my-plan' && !manualPlan ? (
                    <ProductEmptyState
                        title="No custom draft yet"
                        description="Open Workout Planner to build your own draft, or switch back to the AI plan if you want the guided flow."
                        action={
                            <Link
                                href="/workouts/plan"
                                className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
                            >
                                Open planner
                            </Link>
                        }
                    />
                ) : null}

                {(mode === 'follow-ai' && aiPlan) ||
                (mode === 'my-plan' && manualPlan) ? (
                    <ProductSection
                        title="Choose the workout day"
                        description="The old dropdown is replaced with day cards that show the plan focus, exercise count, and the recommended day at a glance."
                    >
                        <div className="space-y-3">
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
                            ? 'Freestyle library'
                            : 'Planned exercises'
                    }
                    description={
                        mode === 'freestyle'
                            ? 'Freestyle is intentionally separate: the library is the primary surface and nothing is framed as a planned day.'
                            : 'In plan modes, the planned exercises are the primary surface so following the plan feels easier than building around it.'
                    }
                >
                    {mode === 'freestyle' ? (
                        <div className="space-y-6">
                            <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                    <Search className="h-4 w-4" />
                                    Search library
                                </div>
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search by name, muscle, or equipment"
                                    className="mt-4 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm"
                                />
                                <div className="mt-4 space-y-3">
                                    {filteredExercises.map((exercise) => {
                                        const added = freestyleIds.includes(
                                            exercise.id,
                                        );

                                        return (
                                            <div
                                                key={exercise.id}
                                                className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-foreground">
                                                            {exercise.name}
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {
                                                                exercise.primary_muscle
                                                            }
                                                            {exercise.equipment
                                                                ? ` - ${exercise.equipment}`
                                                                : ''}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={added}
                                                        onClick={() =>
                                                            setFreestyleIds(
                                                                (current) =>
                                                                    added
                                                                        ? current
                                                                        : [
                                                                              ...current,
                                                                              exercise.id,
                                                                          ],
                                                            )
                                                        }
                                                        className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background disabled:opacity-50"
                                                    >
                                                        {added
                                                            ? 'Added'
                                                            : 'Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <ExerciseLogList
                                exercises={freestyleExercises}
                                weights={weights}
                                reps={reps}
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
                    ) : (
                        <ExerciseLogList
                            exercises={currentExercises}
                            weights={weights}
                            reps={reps}
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
                    )}
                </ProductSection>

                <ProductSection
                    title="Recent workout logs"
                    description="Recent sessions stay visible so it is easy to confirm whether a workout was tied to the AI plan, your own plan, or a freestyle session."
                >
                    <div className="space-y-3">
                        {recentLogs.length ? (
                            recentLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="rounded-[22px] border border-border/70 bg-background/72 p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="font-medium text-foreground">
                                                {log.workout_date}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {log.day_name ??
                                                    'Freestyle session'}{' '}
                                                -{' '}
                                                {log.plan_source ?? 'freestyle'}
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                                            {log.sets.length} sets
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <ProductEmptyState
                                title="No workouts logged yet"
                                description="Start today's session and the log history will build here."
                            />
                        )}
                    </div>
                </ProductSection>

                <ProductStickyActions>
                    <div className="mr-auto text-sm text-muted-foreground">
                        {activeLogId
                            ? `Active session: #${activeLogId}`
                            : 'Start a session before adding sets.'}
                    </div>
                    <button
                        type="button"
                        onClick={finishWorkout}
                        disabled={saving || !activeLogId}
                        className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Finish workout'}
                    </button>
                </ProductStickyActions>
            </ProductPageShell>
        </>
    );
}

function ModeButton({
    active,
    disabled,
    onClick,
    children,
}: {
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`inline-flex h-11 items-center rounded-2xl border px-4 text-sm font-semibold transition ${
                active
                    ? 'border-primary/30 bg-primary/10 text-foreground'
                    : 'border-border/70 bg-background text-foreground hover:bg-card'
            } disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
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
                    <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                        Day {day.day_index}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                        {day.name ?? `Workout Day ${day.day_index}`}
                    </div>
                </div>
                {recommended ? (
                    <span className="haye-chip">Recommended today</span>
                ) : (
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
                {day.exercises.length} exercises ready
            </div>
        </button>
    );
}

function ExerciseLogList({
    exercises,
    weights,
    reps,
    onWeightChange,
    onRepsChange,
    onAddSet,
}: {
    exercises: Array<Exercise | PlanDayExercise>;
    weights: Record<number, string>;
    reps: Record<number, string>;
    onWeightChange: (exerciseId: number, value: string) => void;
    onRepsChange: (exerciseId: number, value: string) => void;
    onAddSet: (exerciseId: number) => void;
}) {
    if (!exercises.length) {
        return (
            <ProductEmptyState
                title="No exercises selected"
                description="Pick a planned day or add freestyle exercises to start logging."
            />
        );
    }

    return (
        <div className="space-y-4">
            {exercises.map((exercise) => (
                <div
                    key={exercise.id}
                    className="rounded-[26px] border border-border/70 bg-background/72 p-4"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="font-medium text-foreground">
                                {exercise.name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
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
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <label className="text-sm font-medium text-foreground">
                            Weight (kg)
                            <input
                                value={weights[exercise.id] ?? ''}
                                onChange={(event) =>
                                    onWeightChange(
                                        exercise.id,
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm"
                            />
                        </label>
                        <label className="text-sm font-medium text-foreground">
                            Reps
                            <input
                                value={reps[exercise.id] ?? ''}
                                onChange={(event) =>
                                    onRepsChange(
                                        exercise.id,
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => onAddSet(exercise.id)}
                            className="inline-flex h-11 items-center justify-center self-end rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                            Add set
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
