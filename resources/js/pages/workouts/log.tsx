import {
    ProductBanner,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
import WorkoutTabs from '@/components/workouts/WorkoutTabs';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

/* =============== Types =============== */
type Exercise = {
    id: number;
    name: string;
    primary_muscle: string;
    equipment?: string | null;
    demo_url?: string | null;
};
type Day = {
    id: number;
    day_index: number;
    title?: string | null;
    exercises: Exercise[];
} | null;
type Plan = { id: number; name: string; days: Day[] } | null;

type WorkoutLogSet = {
    id: number;
    exercise: { id: number; name: string };
    weight_kg: number | null;
    reps: number;
    set_number: number;
};

type WorkoutLog = {
    id: number;
    workout_date: string;
    sets: WorkoutLogSet[];
    workout_plan_day_id?: number | null;
};

type Props = {
    plan: Plan;
    currentDay: Day | null;
    today: string;
    recentLogs: WorkoutLog[] | undefined;
    flash?: { activeLogId?: number };
    exercises?: Exercise[];
};

/* =============== Helpers/consts =============== */
const MUSCLES = [
    'chest',
    'back',
    'shoulders',
    'legs',
    'glutes',
    'biceps',
    'triceps',
    'core',
    'calves',
] as const;
const PAGE_SIZE = 40;
const normalize = (s: string) => s.toLowerCase().trim();
const fmtDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString();
    } catch {
        return iso;
    }
};

/* =============== Component =============== */
export default function LogPage() {
    const page = usePage<Props>();
    const { plan, currentDay, today, recentLogs, flash } = page.props;

    // Activate page palette
    useEffect(() => {
        document.documentElement.setAttribute('data-page', 'workouts');
        return () => document.documentElement.removeAttribute('data-page');
    }, []);

    const safeExercises = useMemo<Exercise[]>(
        () => (Array.isArray(page.props.exercises) ? page.props.exercises : []),
        [page.props.exercises],
    );
    const safeRecentLogs = useMemo<WorkoutLog[]>(
        () => (Array.isArray(recentLogs) ? recentLogs : []),
        [recentLogs],
    );

    const propsRef = useRef<Props>(page.props);
    useEffect(() => {
        propsRef.current = page.props;
    }, [page.props]);

    const latestLog = safeRecentLogs[0];
    const activeLogIdRef = useRef<number | undefined>(
        flash?.activeLogId ?? latestLog?.id,
    );

    const [isPickerOpen, setPickerOpen] = useState(false);
    const [pickedDayId, setPickedDayId] = useState<number | 'none'>(
        (currentDay?.id as number) ?? 'none',
    );

    const [weights, setWeights] = useState<Record<number, string>>({});
    const [reps, setReps] = useState<Record<number, string>>({});
    const [status, setStatus] = useState<string | null>(null);

    const [startedLocally, setStartedLocally] = useState(false);
    const [saving, setSaving] = useState(false);

    const exercisesById = useMemo(
        () => new Map(safeExercises.map((e) => [e.id, e])),
        [safeExercises],
    );
    const [fsSelected, setFsSelected] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'muscle'>('name');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 200);
        return () => clearTimeout(t);
    }, [search]);

    const filteredLibrary = useMemo(() => {
        const q = normalize(debounced);
        let list = safeExercises;
        if (q)
            list = list.filter(
                (e) =>
                    normalize(e.name).includes(q) ||
                    normalize(e.primary_muscle).includes(q),
            );
        if (muscleFilters.length) {
            const s = new Set(muscleFilters);
            list = list.filter((e) => s.has(e.primary_muscle));
        }
        return [...list].sort((a, b) =>
            sortBy === 'muscle'
                ? normalize(a.primary_muscle).localeCompare(
                      normalize(b.primary_muscle),
                  ) || normalize(a.name).localeCompare(normalize(b.name))
                : normalize(a.name).localeCompare(normalize(b.name)),
        );
    }, [safeExercises, debounced, muscleFilters, sortBy]);

    const pagedLibrary = useMemo(
        () => filteredLibrary.slice(0, visibleCount),
        [filteredLibrary, visibleCount],
    );

    const toggleFsAdd = (exId: number) =>
        setFsSelected((prev) => (prev.includes(exId) ? prev : [...prev, exId]));
    const removeFs = (exId: number) =>
        setFsSelected((prev) => prev.filter((id) => id !== exId));
    const isFsAdded = (exId: number) => fsSelected.includes(exId);

    const dayForForm: Day | null =
        pickedDayId !== 'none'
            ? (plan?.days?.find((d) => d?.id === pickedDayId) ?? null)
            : (currentDay ?? null);

    const setsForExercise = (exerciseId: number) =>
        (latestLog?.sets || [])
            .filter((s) => s.exercise?.id === exerciseId)
            .sort((a, b) => a.set_number - b.set_number);

    const openStartDialog = () => {
        setPickerOpen(true);
        setPickedDayId((currentDay?.id as number) ?? 'none');
    };
    const confirmStart = () => {
        setPickerOpen(false);
        setStartedLocally(true);
        setStatus(null);
    };

    const afterStartedEnsureId = (cb: (newLogId: number) => void) => {
        router.reload({
            only: ['recentLogs', 'flash'],
            onSuccess: () => {
                const p = propsRef.current;
                const fromFlash = p.flash?.activeLogId;
                const fromRecent = Array.isArray(p.recentLogs)
                    ? p.recentLogs[0]?.id
                    : undefined;
                const id = fromFlash ?? fromRecent;
                if (!id)
                    return setStatus('Could not determine new workout ID.');
                activeLogIdRef.current = id;
                cb(id);
            },
        });
    };

    const createWorkoutIfNeeded = (after?: (newLogId: number) => void) => {
        if (activeLogIdRef.current) return after?.(activeLogIdRef.current);
        router.post(
            '/workouts/log/start',
            {
                workout_date: today,
                workout_plan_day_id:
                    pickedDayId === 'none' ? null : pickedDayId,
            },
            { onSuccess: () => afterStartedEnsureId((id) => after?.(id)) },
        );
    };

    const addSet = (exerciseId: number) => {
        setStatus(null);
        const w = weights[exerciseId];
        const r = reps[exerciseId];
        const repsNum = r ? Number(r) : NaN;
        const weightNum = w?.length ? Number(w) : null;

        if (!Number.isFinite(repsNum) || repsNum <= 0)
            return setStatus('Please enter reps (>0).');
        if (w && isNaN(Number(w)))
            return setStatus(
                'Weight must be a number (or leave empty for bodyweight).',
            );

        const send = (logId: number) => {
            const next =
                (setsForExercise(exerciseId).slice(-1)[0]?.set_number ?? 0) + 1;
            router.post(
                `/workouts/log/${logId}/add-set`,
                {
                    exercise_id: exerciseId,
                    set_number: next,
                    weight_kg: weightNum,
                    reps: repsNum,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setWeights((prev) => ({ ...prev, [exerciseId]: '' }));
                        setReps((prev) => ({ ...prev, [exerciseId]: '' }));
                        setStatus('Set saved.');
                        router.reload({ only: ['recentLogs'] });
                    },
                    onError: () => {
                        setStatus('Could not save set. Please try again.');
                    },
                },
            );
        };

        createWorkoutIfNeeded((id) => send(id));
    };

    const saveWorkout = () => {
        const id = activeLogIdRef.current;
        if (!id)
            return setStatus(
                'You haven’t added any sets yet. Add at least one set before saving.',
            );
        const hasAnySets = !!(
            Array.isArray(propsRef.current.recentLogs) &&
            propsRef.current.recentLogs[0]?.sets?.length
        );
        if (!hasAnySets)
            return setStatus(
                'Your workout has no sets yet. Add at least one set before saving.',
            );

        setSaving(true);
        router.post(
            `/workouts/log/${id}/finish`,
            { duration_min: null, notes: null },
            {
                onSuccess: () => {
                    setStatus('Workout saved — great job!');
                    router.reload({
                        only: ['recentLogs', 'plan', 'currentDay'],
                    });
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const freestyleExercises: Exercise[] =
        pickedDayId === 'none'
            ? fsSelected
                  .map((id) => exercisesById.get(id))
                  .filter((x): x is Exercise => !!x)
            : [];
    const loggedSetCount = Array.isArray(latestLog?.sets) ? latestLog.sets.length : 0;
    const activeExerciseCount =
        pickedDayId === 'none'
            ? freestyleExercises.length
            : (dayForForm?.exercises?.length ?? 0);
    const activeModeLabel =
        pickedDayId === 'none'
            ? 'Freestyle'
            : dayForForm
              ? `Day ${dayForForm.day_index}`
              : 'Planned';

    const showLoggingArea =
        startedLocally &&
        ((pickedDayId !== 'none' && !!dayForForm?.exercises?.length) ||
            (pickedDayId === 'none' && freestyleExercises.length > 0));
    const renderLegacyHeader = status === '__legacy__';

    return (
        <>
            <Head title="Workout Log" />
            <ProductPageShell width="wide" className="space-y-8">
                <WorkoutTabs active="log" />

                <ProductHero
                    eyebrow="Workouts"
                    title="Workout Log"
                    description="Start today's session, log sets from your plan or freestyle, and review recent training without leaving the same shared flow."
                    meta={
                        <span>
                            Today:{' '}
                            <span className="font-medium">
                                {fmtDate(today)}
                            </span>
                        </span>
                    }
                    actions={
                        <button
                            onClick={openStartDialog}
                            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                        >
                            Start Today's Workout
                        </button>
                    }
                />

                {status ? (
                    <ProductBanner role="status" aria-live="polite">
                        {status}
                    </ProductBanner>
                ) : null}

                {renderLegacyHeader ? (
                    <>
                        {status && (
                            <div
                                role="status"
                                aria-live="polite"
                                className="rounded-lg border px-4 py-2 text-sm"
                                style={{
                                    backgroundColor: 'var(--muted)',
                                    color: 'var(--muted-foreground)',
                                }}
                            >
                                {status}
                            </div>
                        )}

                        {/* Header card */}
                        <section className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                    Workout Log
                                </h1>
                                <p className="text-xs text-muted-foreground md:text-sm">
                                    Start today’s session, log sets from your
                                    plan or freestyle, and review your recent
                                    workouts.
                                </p>
                            </div>

                            <div className="flex flex-col items-start gap-2 sm:items-end">
                                <div className="text-xs text-muted-foreground">
                                    Today:{' '}
                                    <span className="font-medium">
                                        {fmtDate(today)}
                                    </span>
                                </div>
                                <button
                                    onClick={openStartDialog}
                                    className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                                    style={{
                                        backgroundColor: 'var(--secondary)',
                                        color: 'var(--secondary-foreground)',
                                    }}
                                >
                                    Start Today’s Workout
                                </button>
                            </div>
                        </section>
                    </>
                ) : null}

                {/* Start picker */}
                {isPickerOpen && (
                    <section className="haye-panel rounded-[28px] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="font-medium">
                                Choose plan day for {fmtDate(today)}:
                            </div>
                            <label className="sr-only" htmlFor="day-picker">
                                Workout day
                            </label>
                            <select
                                id="day-picker"
                                className="rounded border bg-background px-2 py-1"
                                value={
                                    pickedDayId === 'none' ? '' : pickedDayId
                                }
                                onChange={(e) =>
                                    setPickedDayId(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : 'none',
                                    )
                                }
                            >
                                <option value="">No plan (freestyle)</option>
                                {plan?.days?.filter(Boolean).map((d) => (
                                    <option key={d!.id} value={d!.id}>
                                        Day {d!.day_index}
                                        {d!.title ? ` · ${d!.title}` : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2 md:ml-auto">
                                <button
                                    onClick={() => setPickerOpen(false)}
                                    className="rounded border px-3 py-1.5 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmStart}
                                    className="rounded px-3 py-1.5 text-sm font-medium"
                                    style={{
                                        backgroundColor: 'var(--secondary)',
                                        color: 'var(--secondary-foreground)',
                                    }}
                                >
                                    Start
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="haye-panel rounded-[28px] p-4">
                        <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            Session state
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-foreground">
                            {startedLocally ? 'Live' : 'Not started'}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Start a plan day or choose freestyle to begin logging.
                        </div>
                    </div>
                    <div className="haye-panel rounded-[28px] p-4">
                        <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            Mode
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-foreground">
                            {activeModeLabel}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            {pickedDayId === 'none'
                                ? 'Use the library to build today from scratch.'
                                : 'Log directly against the plan day shown here.'}
                        </div>
                    </div>
                    <div className="haye-panel rounded-[28px] p-4">
                        <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            Exercises ready
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-foreground">
                            {activeExerciseCount}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Visible exercises in the current session.
                        </div>
                    </div>
                    <div className="haye-panel rounded-[28px] p-4">
                        <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            Sets logged
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-foreground">
                            {loggedSetCount}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Every saved set updates the session history below.
                        </div>
                    </div>
                    <div className="rounded-[24px] border border-primary/20 bg-primary/10 p-4 shadow-sm">
                        <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            Finish
                        </div>
                        <div className="mt-3 text-sm leading-6 text-foreground">
                            Save once you have at least one set logged.
                        </div>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={saveWorkout}
                            className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save workout'}
                        </button>
                    </div>
                </section>

                {/* Today row */}
                <section className="haye-panel rounded-[32px] space-y-4 p-6">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">Today</h2>
                        <div className="text-sm text-muted-foreground">
                            {fmtDate(today)}
                        </div>
                    </div>

                    {/* Content area: main logging + optional freestyle library */}
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        {/* Logging area / messages */}
                        <div className="space-y-4">
                            {/* Freestyle selected exercises */}
                            {startedLocally && pickedDayId === 'none' && (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        Pick exercises from the library, then
                                        add your sets below.
                                    </p>

                                    {freestyleExercises.length ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {freestyleExercises.map((ex) => {
                                                const prevSets =
                                                    setsForExercise(ex.id);
                                                const last =
                                                    prevSets.slice(-1)[0];
                                                const weightValue =
                                                    weights[ex.id] ??
                                                    (last?.weight_kg != null
                                                        ? String(last.weight_kg)
                                                        : '');

                                                return (
                                                    <div
                                                        key={ex.id}
                                                        className="haye-panel rounded-[28px] p-4"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="font-semibold">
                                                                    {ex.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground capitalize">
                                                                    {
                                                                        ex.primary_muscle
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {ex.demo_url ? (
                                                                    <a
                                                                        href={
                                                                            ex.demo_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs hover:underline"
                                                                        style={{
                                                                            color: 'var(--accent)',
                                                                        }}
                                                                    >
                                                                        demo
                                                                    </a>
                                                                ) : null}
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeFs(
                                                                            ex.id,
                                                                        )
                                                                    }
                                                                    className="text-xs hover:underline"
                                                                    style={{
                                                                        color: 'var(--destructive)',
                                                                    }}
                                                                    aria-label="Remove from today"
                                                                >
                                                                    remove
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                                                {ex.equipment ?? 'Bodyweight'}
                                                            </span>
                                                            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground capitalize">
                                                                {ex.primary_muscle}
                                                            </span>
                                                            {last ? (
                                                                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                                                                    Last set: {last.weight_kg ?? 'BW'} kg x {last.reps}
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                                                    First set for today
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Inputs */}
                                                        <div className="mt-3 grid grid-cols-[6rem,6rem,auto] items-end gap-2">
                                                            <div>
                                                                <label
                                                                    htmlFor={`w-${ex.id}`}
                                                                    className="text-xs text-muted-foreground"
                                                                >
                                                                    Weight (kg)
                                                                </label>
                                                                <input
                                                                    id={`w-${ex.id}`}
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    placeholder="kg"
                                                                    className="mt-1 w-full rounded border bg-background px-3 py-1"
                                                                    value={
                                                                        weightValue
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setWeights(
                                                                            (
                                                                                p,
                                                                            ) => ({
                                                                                ...p,
                                                                                [ex.id]:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            }),
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label
                                                                    htmlFor={`r-${ex.id}`}
                                                                    className="text-xs text-muted-foreground"
                                                                >
                                                                    Reps
                                                                </label>
                                                                <input
                                                                    id={`r-${ex.id}`}
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    placeholder="reps"
                                                                    className="mt-1 w-full rounded border bg-background px-3 py-1"
                                                                    value={
                                                                        reps[
                                                                            ex
                                                                                .id
                                                                        ] ?? ''
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setReps(
                                                                            (
                                                                                p,
                                                                            ) => ({
                                                                                ...p,
                                                                                [ex.id]:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            }),
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="flex">
                                                                <button
                                                                    onClick={() =>
                                                                        addSet(
                                                                            ex.id,
                                                                        )
                                                                    }
                                                                    className="ml-auto rounded px-3 py-2 text-sm font-medium"
                                                                    style={{
                                                                        backgroundColor:
                                                                            'var(--primary)',
                                                                        color: 'var(--primary-foreground)',
                                                                    }}
                                                                >
                                                                    Add Set
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Existing sets */}
                                                        {prevSets.length ? (
                                                            <div className="mt-3 space-y-1 text-sm">
                                                                {prevSets.map(
                                                                    (s) => (
                                                                        <div
                                                                            key={
                                                                                s.id
                                                                            }
                                                                            className="flex justify-between"
                                                                        >
                                                                            <div className="text-muted-foreground">
                                                                                Set{' '}
                                                                                {
                                                                                    s.set_number
                                                                                }
                                                                            </div>
                                                                            <div className="tabular-nums">
                                                                                {s.weight_kg ??
                                                                                    'BW'}{' '}
                                                                                kg
                                                                                ×{' '}
                                                                                {
                                                                                    s.reps
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3 text-sm text-muted-foreground/70">
                                                                No sets yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            No exercises selected yet — add some
                                            from the library →
                                        </div>
                                    )}

                                    {/* Save Button */}
                                    {freestyleExercises.length > 0 && (
                                        <div className="mt-4 flex items-center justify-end">
                                            <button
                                                disabled={saving}
                                                onClick={saveWorkout}
                                                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                                                style={{
                                                    backgroundColor:
                                                        'var(--primary)',
                                                    color: 'var(--primary-foreground)',
                                                }}
                                            >
                                                {saving
                                                    ? 'Saving…'
                                                    : 'Save Workout'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Planned-day logging OR empty-state */}
                            {!showLoggingArea ? (
                                <div className="text-sm text-foreground/80">
                                    {startedLocally ? (
                                        pickedDayId === 'none' ? (
                                            <>
                                                Pick exercises from the library
                                                on the right.
                                            </>
                                        ) : (
                                            <>
                                                This day has no exercises. Add
                                                some in the{' '}
                                                <a
                                                    href="/workouts/plan"
                                                    className="hover:underline"
                                                    style={{
                                                        color: 'var(--accent)',
                                                    }}
                                                >
                                                    Planner
                                                </a>
                                                .
                                            </>
                                        )
                                    ) : (
                                        <>
                                            No workout chosen for today yet.
                                            Click{' '}
                                            <button
                                                type="button"
                                                onClick={openStartDialog}
                                                className="inline align-baseline underline"
                                                style={{
                                                    color: 'var(--accent)',
                                                    background: 'transparent',
                                                    padding: 0,
                                                    border: 0,
                                                }}
                                            >
                                                Start Today’s Workout
                                            </button>{' '}
                                            to pick a plan day or freestyle.
                                        </>
                                    )}
                                </div>
                            ) : pickedDayId !== 'none' ? (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {dayForForm!.exercises.map((ex) => {
                                            const prevSets = setsForExercise(
                                                ex.id,
                                            );
                                            const last = prevSets.slice(-1)[0];
                                            const weightValue =
                                                weights[ex.id] ??
                                                (last?.weight_kg != null
                                                    ? String(last.weight_kg)
                                                    : '');
                                            return (
                                                <div
                                                    key={ex.id}
                                                    className="haye-panel rounded-[28px] p-4"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="font-semibold">
                                                                {ex.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground capitalize">
                                                                {
                                                                    ex.primary_muscle
                                                                }
                                                            </div>
                                                        </div>
                                                        {ex.demo_url ? (
                                                            <a
                                                                href={
                                                                    ex.demo_url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs hover:underline"
                                                                style={{
                                                                    color: 'var(--accent)',
                                                                }}
                                                            >
                                                                demo
                                                            </a>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                                            {ex.equipment ?? 'Bodyweight'}
                                                        </span>
                                                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground capitalize">
                                                            {ex.primary_muscle}
                                                        </span>
                                                        {last ? (
                                                            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                                                                Last set: {last.weight_kg ?? 'BW'} kg x {last.reps}
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                                                First set for today
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-[6rem,6rem,auto] items-end gap-2">
                                                        <div>
                                                            <label
                                                                htmlFor={`w-${ex.id}`}
                                                                className="text-xs text-muted-foreground"
                                                            >
                                                                Weight (kg)
                                                            </label>
                                                            <input
                                                                id={`w-${ex.id}`}
                                                                type="number"
                                                                inputMode="decimal"
                                                                placeholder="kg"
                                                                className="mt-1 w-full rounded border bg-background px-3 py-1"
                                                                value={
                                                                    weightValue
                                                                }
                                                                onChange={(e) =>
                                                                    setWeights(
                                                                        (
                                                                            p,
                                                                        ) => ({
                                                                            ...p,
                                                                            [ex.id]:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                htmlFor={`r-${ex.id}`}
                                                                className="text-xs text-muted-foreground"
                                                            >
                                                                Reps
                                                            </label>
                                                            <input
                                                                id={`r-${ex.id}`}
                                                                type="number"
                                                                inputMode="numeric"
                                                                placeholder="reps"
                                                                className="mt-1 w-full rounded border bg-background px-3 py-1"
                                                                value={
                                                                    reps[
                                                                        ex.id
                                                                    ] ?? ''
                                                                }
                                                                onChange={(e) =>
                                                                    setReps(
                                                                        (
                                                                            p,
                                                                        ) => ({
                                                                            ...p,
                                                                            [ex.id]:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="flex">
                                                            <button
                                                                onClick={() =>
                                                                    addSet(
                                                                        ex.id,
                                                                    )
                                                                }
                                                                className="ml-auto rounded px-3 py-2 text-sm font-medium"
                                                                style={{
                                                                    backgroundColor:
                                                                        'var(--foreground)',
                                                                    color: 'var(--background)',
                                                                }}
                                                            >
                                                                Add Set
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {prevSets.length ? (
                                                        <div className="mt-3 space-y-1 text-sm">
                                                            {prevSets.map(
                                                                (s) => (
                                                                    <div
                                                                        key={
                                                                            s.id
                                                                        }
                                                                        className="flex justify-between"
                                                                    >
                                                                        <div className="text-muted-foreground">
                                                                            Set{' '}
                                                                            {
                                                                                s.set_number
                                                                            }
                                                                        </div>
                                                                        <div className="tabular-nums">
                                                                            {s.weight_kg ??
                                                                                'BW'}{' '}
                                                                            kg ×{' '}
                                                                            {
                                                                                s.reps
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 text-sm text-muted-foreground/70">
                                                            No sets yet.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 flex items-center justify-end">
                                        <button
                                            disabled={saving}
                                            onClick={saveWorkout}
                                            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                                            style={{
                                                backgroundColor:
                                                    'var(--primary)',
                                                color: 'var(--primary-foreground)',
                                            }}
                                        >
                                            {saving
                                                ? 'Saving…'
                                                : 'Save Workout'}
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Right side: freestyle library (when applicable) + tiny hint when using plan */}
                        <aside className="space-y-3">
                            {startedLocally && pickedDayId !== 'none' && (
                                <div className="rounded-[22px] border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
                                    Logging from{' '}
                                    <span className="font-medium">
                                        Day {dayForForm?.day_index}
                                        {dayForForm?.title
                                            ? ` · ${dayForForm.title}`
                                            : ''}
                                    </span>
                                    . You can still switch to freestyle by
                                    starting a new workout and choosing “No
                                    plan”.
                                </div>
                            )}

                            {/* Library shown only for freestyle mode */}
                            {startedLocally && pickedDayId === 'none' && (
                                <div className="haye-panel rounded-[28px]">
                                    <div className="sticky top-[60px] z-10 border-b bg-card p-3">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-semibold">
                                                    Exercise Library
                                                </h3>
                                                <span className="text-xs text-muted-foreground">
                                                    {filteredLibrary.length}{' '}
                                                    results
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label
                                                    htmlFor="search"
                                                    className="sr-only"
                                                >
                                                    Search exercises
                                                </label>
                                                <input
                                                    id="search"
                                                    type="search"
                                                    placeholder="Search by name or muscle…"
                                                    value={search}
                                                    onChange={(e) => {
                                                        setSearch(
                                                            e.target.value,
                                                        );
                                                        setVisibleCount(
                                                            PAGE_SIZE,
                                                        );
                                                    }}
                                                    className="flex-1 rounded border bg-background px-3 py-2"
                                                />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {MUSCLES.map((m) => {
                                                    const active =
                                                        muscleFilters.includes(
                                                            m,
                                                        );
                                                    return (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onClick={() => {
                                                                setMuscleFilters(
                                                                    (prev) =>
                                                                        active
                                                                            ? prev.filter(
                                                                                  (
                                                                                      x,
                                                                                  ) =>
                                                                                      x !==
                                                                                      m,
                                                                              )
                                                                            : [
                                                                                  ...prev,
                                                                                  m,
                                                                              ],
                                                                );
                                                                setVisibleCount(
                                                                    PAGE_SIZE,
                                                                );
                                                            }}
                                                            className="rounded border px-2 py-1 text-xs"
                                                            style={
                                                                active
                                                                    ? {
                                                                          backgroundColor:
                                                                              'var(--primary)',
                                                                          color: 'var(--primary-foreground)',
                                                                          borderColor:
                                                                              'var(--primary)',
                                                                      }
                                                                    : {
                                                                          backgroundColor:
                                                                              'var(--card)',
                                                                      }
                                                            }
                                                            aria-pressed={
                                                                active
                                                            }
                                                        >
                                                            {m}
                                                        </button>
                                                    );
                                                })}
                                                {muscleFilters.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setMuscleFilters([])
                                                        }
                                                        className="rounded border bg-card px-2 py-1 text-xs"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <label
                                                    htmlFor="sort"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Sort
                                                </label>
                                                <select
                                                    id="sort"
                                                    value={sortBy}
                                                    onChange={(e) =>
                                                        setSortBy(
                                                            e.target.value as
                                                                | 'name'
                                                                | 'muscle',
                                                        )
                                                    }
                                                    className="rounded border bg-background px-2 py-1 text-sm"
                                                >
                                                    <option value="name">
                                                        Name (A→Z)
                                                    </option>
                                                    <option value="muscle">
                                                        Muscle group
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grid */}
                                    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                                        {pagedLibrary.length ? (
                                            pagedLibrary.map((ex) => {
                                                const added = isFsAdded(ex.id);
                                                return (
                                                    <div
                                                        key={ex.id}
                                                        className="rounded-xl border bg-background/80 p-3"
                                                    >
                                                        <div
                                                            className="line-clamp-2 font-medium"
                                                            title={ex.name}
                                                        >
                                                            {ex.name}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                                                            {ex.primary_muscle}{' '}
                                                            ·{' '}
                                                            {ex.equipment ??
                                                                '—'}
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleFsAdd(
                                                                        ex.id,
                                                                    )
                                                                }
                                                                disabled={added}
                                                                className="rounded px-2 py-1 text-xs"
                                                                style={
                                                                    added
                                                                        ? {
                                                                              backgroundColor:
                                                                                  'var(--muted)',
                                                                              color: 'var(--muted-foreground)',
                                                                          }
                                                                        : {
                                                                              backgroundColor:
                                                                                  'var(--primary)',
                                                                              color: 'var(--primary-foreground)',
                                                                          }
                                                                }
                                                                aria-disabled={
                                                                    added
                                                                }
                                                            >
                                                                {added
                                                                    ? 'Added'
                                                                    : 'Add'}
                                                            </button>
                                                            {ex.demo_url && (
                                                                <a
                                                                    href={
                                                                        ex.demo_url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-xs hover:underline"
                                                                    style={{
                                                                        color: 'var(--accent)',
                                                                    }}
                                                                >
                                                                    demo
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                No exercises match your filters.
                                            </div>
                                        )}
                                    </div>

                                    {filteredLibrary.length -
                                        pagedLibrary.length >
                                        0 && (
                                        <div className="flex justify-center border-t p-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setVisibleCount(
                                                        (c) => c + PAGE_SIZE,
                                                    )
                                                }
                                                className="rounded border px-4 py-2 text-xs hover:bg-muted"
                                            >
                                                Load more (
                                                {filteredLibrary.length -
                                                    pagedLibrary.length}{' '}
                                                left)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!startedLocally && (
                                <div className="rounded-[22px] border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
                                    You’ll see the freestyle exercise library
                                    here after you start a workout with “No
                                    plan”.
                                </div>
                            )}
                        </aside>
                    </div>
                </section>
            </ProductPageShell>
        </>
    );
}

