import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStickyActions,
} from '@/components/product/page';
import WorkoutTabs from '@/components/workouts/WorkoutTabs';
import type { Errors as InertiaErrors } from '@inertiajs/core';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Dumbbell, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

type Exercise = {
    id: number;
    name: string;
    primary_muscle: string;
    equipment?: string | null;
    demo_url?: string | null;
};

type DayExercise = {
    id: number;
    name: string;
    primary_muscle: string;
    equipment?: string | null;
    pivot?: {
        order_index?: number | null;
        sets?: number | null;
        reps_min?: number | null;
        reps_max?: number | null;
    };
};

type PlanDay = {
    id: number;
    day_index: number;
    name?: string | null;
    notes?: string | null;
    meta?: Record<string, unknown> | null;
    exercises: DayExercise[];
};

type WorkoutPlan = {
    id: number;
    name: string;
    goal?: string | null;
    start_date?: string | null;
    duration_days?: number | null;
    meta?: Record<string, unknown> | null;
    ai_request?: {
        provider?: string | null;
        model?: string | null;
    } | null;
    days: PlanDay[];
};

type DayDraft = {
    day_index: number;
    name: string;
    exercises: {
        exercise_id: number;
        target_sets: number;
        target_reps: number;
    }[];
};

type PageProps = {
    activeAiPlan?: WorkoutPlan | null;
    manualPlan?: WorkoutPlan | null;
    premadePlans?: WorkoutPlan[] | null;
    recommendedAiDayId?: number | null;
    recommendedManualDayId?: number | null;
    today: string;
    exercises: Exercise[];
};

function sourceLabel(source?: { provider?: string | null; model?: string | null } | null) {
    const provider = source?.provider?.trim();
    const model = source?.model?.trim();

    if (!provider && !model) return 'Model unavailable';
    if (!provider) return model ?? 'Model unavailable';
    if (!model) return provider;

    return `${provider} - ${model}`;
}

function buildInitialDraft(plan?: WorkoutPlan | null): DayDraft[] {
    if (!plan?.days?.length) {
        return Array.from({ length: 3 }, (_, index) => ({
            day_index: index + 1,
            name: '',
            exercises: [],
        }));
    }

    return plan.days
        .slice()
        .sort((left, right) => left.day_index - right.day_index)
        .map((day) => ({
            day_index: day.day_index,
            name: day.name ?? '',
            exercises: (day.exercises ?? []).map((exercise) => ({
                exercise_id: exercise.id,
                target_sets: exercise.pivot?.sets ?? 3,
                target_reps: exercise.pivot?.reps_min ?? exercise.pivot?.reps_max ?? 10,
            })),
        }));
}

function stringifyErrors(errors: InertiaErrors): Record<string, string> {
    return Object.entries(errors).reduce<Record<string, string>>((carry, [key, value]) => {
        carry[key] = String(value);
        return carry;
    }, {});
}

function templateDays(key: 'fullBody3' | 'pushPullLegs3' | 'upperLower4'): DayDraft[] {
    if (key === 'upperLower4') {
        return [
            { day_index: 1, name: 'Upper A', exercises: [] },
            { day_index: 2, name: 'Lower A', exercises: [] },
            { day_index: 3, name: 'Upper B', exercises: [] },
            { day_index: 4, name: 'Lower B', exercises: [] },
        ];
    }

    if (key === 'pushPullLegs3') {
        return [
            { day_index: 1, name: 'Push', exercises: [] },
            { day_index: 2, name: 'Pull', exercises: [] },
            { day_index: 3, name: 'Legs', exercises: [] },
        ];
    }

    return [
        { day_index: 1, name: 'Full Body 1', exercises: [] },
        { day_index: 2, name: 'Full Body 2', exercises: [] },
        { day_index: 3, name: 'Full Body 3', exercises: [] },
    ];
}

export default function WorkoutPlannerPage() {
    const { activeAiPlan, manualPlan, premadePlans, recommendedAiDayId, exercises } =
        usePage<PageProps>().props;

    const [mode, setMode] = useState<'follow-ai' | 'build-own'>(
        activeAiPlan ? 'follow-ai' : 'build-own',
    );
    const [draftName, setDraftName] = useState(manualPlan?.name ?? 'My Workout Draft');
    const [draftDays, setDraftDays] = useState<DayDraft[]>(buildInitialDraft(manualPlan));
    const [selectedDay, setSelectedDay] = useState<number>(draftDays[0]?.day_index ?? 1);
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const aiRecommendedDay =
        activeAiPlan?.days?.find((day) => day.id === recommendedAiDayId) ??
        activeAiPlan?.days?.[0] ??
        null;

    const filteredLibrary = useMemo(() => {
        const token = query.trim().toLowerCase();
        if (token === '') return exercises.slice(0, 60);

        return exercises.filter((exercise) => {
            const haystack = `${exercise.name} ${exercise.primary_muscle} ${exercise.equipment ?? ''}`.toLowerCase();
            return haystack.includes(token);
        });
    }, [exercises, query]);

    const activeDraftDay =
        draftDays.find((day) => day.day_index === selectedDay) ?? draftDays[0] ?? null;

    const saveDraft = () => {
        setSaving(true);
        setStatus(null);
        setErrors({});

        router.post(
            '/workouts/plan',
            {
                name: draftName,
                days: draftDays,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatus('Your custom workout draft has been saved.');
                    router.reload({
                        only: ['manualPlan', 'recommendedManualDayId'],
                    });
                },
                onError: (incomingErrors) => setErrors(stringifyErrors(incomingErrors)),
                onFinish: () => setSaving(false),
            },
        );
    };

    const updateDay = (dayIndex: number, updater: (day: DayDraft) => DayDraft) => {
        setDraftDays((current) =>
            current.map((day) => (day.day_index === dayIndex ? updater(day) : day)),
        );
    };

    const addExercise = (exerciseId: number) => {
        if (!activeDraftDay) return;

        updateDay(activeDraftDay.day_index, (day) => {
            if (day.exercises.some((exercise) => exercise.exercise_id === exerciseId)) {
                return day;
            }

            return {
                ...day,
                exercises: [
                    ...day.exercises,
                    {
                        exercise_id: exerciseId,
                        target_sets: 3,
                        target_reps: 10,
                    },
                ],
            };
        });
    };

    return (
        <>
            <Head title="Workout Planner" />

            <ProductPageShell width="wide" className="space-y-8">
                <WorkoutTabs active="plan" />

                <ProductHero
                    eyebrow="Workout Planner"
                    title={mode === 'follow-ai' ? 'Follow the generated structure' : 'Build your own draft'}
                    description={
                        mode === 'follow-ai'
                            ? "This mode is read-first and action-first: it shows the AI plan you are meant to follow, today's recommended day, and the cleanest path into the workout log."
                            : 'This mode is for manual editing. It stays separate from the AI plan so you can experiment without replacing the generated structure.'
                    }
                    meta={
                        <div className="space-y-2 text-sm">
                            {activeAiPlan ? (
                                <>
                                    <div className="font-medium text-foreground">
                                        {sourceLabel(activeAiPlan.ai_request)}
                                    </div>
                                    <div className="text-muted-foreground">
                                        Active AI plan: {activeAiPlan.name}
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground">
                                    No active AI workout plan yet.
                                </div>
                            )}
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            {activeAiPlan ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setMode((current) =>
                                            current === 'follow-ai' ? 'build-own' : 'follow-ai',
                                        )
                                    }
                                    className="inline-flex h-11 items-center rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-card"
                                >
                                    {mode === 'follow-ai'
                                        ? "Don't follow this right now"
                                        : 'Follow AI plan again'}
                                </button>
                            ) : null}
                            <Link
                                href="/workouts/log"
                                className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
                            >
                                Open workout log
                            </Link>
                            <Link
                                href="/ai/planner"
                                className="inline-flex h-11 items-center rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground no-underline transition hover:bg-card"
                            >
                                Open AI Planner
                            </Link>
                        </div>
                    }
                />

                {status ? <ProductBanner tone="success">{status}</ProductBanner> : null}
                {Object.keys(errors).length ? (
                    <ProductBanner tone="danger">
                        There were validation errors while saving your custom draft.
                    </ProductBanner>
                ) : null}

                {mode === 'follow-ai' ? (
                    activeAiPlan ? (
                        <>
                            <ProductSection
                                title="Today's recommended day"
                                description="The recommended card appears first so following the plan feels easier than rebuilding it."
                            >
                                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                                    <AiDayCard day={aiRecommendedDay} featured />
                                    <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                        <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                            Weekly structure
                                        </div>
                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            {(activeAiPlan.days ?? []).map((day) => (
                                                <AiDayCard key={day.id} day={day} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ProductSection>

                            <ProductSection
                                title="Why this plan is ready to follow"
                                description="These notes come from the generated plan metadata and keep the AI path clearly different from the manual builder."
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <MetaListCard
                                        title="Progression rules"
                                        items={
                                            Array.isArray(activeAiPlan.meta?.progression_rules)
                                                ? (activeAiPlan.meta?.progression_rules as string[])
                                                : []
                                        }
                                    />
                                    <MetaListCard
                                        title="Recovery rules"
                                        items={
                                            Array.isArray(activeAiPlan.meta?.recovery_rules)
                                                ? (activeAiPlan.meta?.recovery_rules as string[])
                                                : []
                                        }
                                    />
                                    <MetaListCard
                                        title="Coach notes"
                                        items={
                                            Array.isArray(activeAiPlan.meta?.coach_notes)
                                                ? (activeAiPlan.meta?.coach_notes as string[])
                                                : []
                                        }
                                    />
                                </div>
                            </ProductSection>
                        </>
                    ) : (
                        <ProductEmptyState
                            title="No active AI workout plan"
                            description="Generate one from the AI Planner page, then this page will open in follow-plan mode automatically."
                            action={
                                <Link
                                    href="/ai/planner"
                                    className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
                                >
                                    Generate plan
                                </Link>
                            }
                        />
                    )
                ) : (
                    <>
                        <ProductSection
                            title="Manual draft builder"
                            description="This draft stays separate from the AI plan, so you can explore your own structure without overwriting the generated one."
                        >
                            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-foreground">
                                        Draft name
                                        <input
                                            value={draftName}
                                            onChange={(event) => setDraftName(event.target.value)}
                                            className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                                        />
                                    </label>

                                    <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                        <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                            Templates
                                        </div>
                                        <div className="mt-3 grid gap-2">
                                            {[
                                                ['fullBody3', 'Full Body 3'],
                                                ['pushPullLegs3', 'Push / Pull / Legs'],
                                                ['upperLower4', 'Upper / Lower 4'],
                                            ].map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = templateDays(
                                                            key as 'fullBody3' | 'pushPullLegs3' | 'upperLower4',
                                                        );
                                                        setDraftDays(next);
                                                        setSelectedDay(next[0]?.day_index ?? 1);
                                                    }}
                                                    className="inline-flex items-center justify-between rounded-2xl border border-border/70 bg-card px-3 py-3 text-left text-sm font-medium text-foreground transition hover:bg-background"
                                                >
                                                    <span>{label}</span>
                                                    <WandSparkles className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                        <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                            Premade prototypes
                                        </div>
                                        <div className="mt-3 grid gap-2">
                                            {(premadePlans ?? []).length ? (
                                                (premadePlans ?? []).map((plan) => (
                                                    <button
                                                        key={plan.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const next = buildInitialDraft(plan);
                                                            setDraftName(`${plan.name} (Copy)`);
                                                            setDraftDays(next);
                                                            setSelectedDay(next[0]?.day_index ?? 1);
                                                            setStatus(`Loaded prototype: ${plan.name}`);
                                                        }}
                                                        className="inline-flex items-center justify-between rounded-2xl border border-border/70 bg-card px-3 py-3 text-left text-sm font-medium text-foreground transition hover:bg-background"
                                                    >
                                                        <span>{plan.name}</span>
                                                        <WandSparkles className="h-4 w-4 text-muted-foreground" />
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    No premade prototypes are available yet.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {draftDays.map((day) => (
                                            <button
                                                key={day.day_index}
                                                type="button"
                                                onClick={() => setSelectedDay(day.day_index)}
                                                className={`w-full rounded-[24px] border px-4 py-3 text-left transition ${
                                                    day.day_index === selectedDay
                                                        ? 'border-primary/30 bg-primary/10 text-foreground'
                                                        : 'border-border/70 bg-background/72 text-foreground hover:bg-card'
                                                }`}
                                            >
                                                <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                    Day {day.day_index}
                                                </div>
                                                <div className="mt-1 text-base font-semibold">
                                                    {day.name || `Workout Day ${day.day_index}`}
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {day.exercises.length} exercises
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {activeDraftDay ? (
                                        <>
                                            <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Editing day {activeDraftDay.day_index}
                                                </div>
                                                <input
                                                    value={activeDraftDay.name}
                                                    onChange={(event) =>
                                                        updateDay(activeDraftDay.day_index, (day) => ({
                                                            ...day,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="Day title"
                                                    className="mt-3 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-base font-semibold text-foreground"
                                                />
                                                <div className="mt-4 space-y-3">
                                                    {activeDraftDay.exercises.length ? (
                                                        activeDraftDay.exercises.map((exercise, index) => {
                                                            const details = exercises.find(
                                                                (candidate) =>
                                                                    candidate.id === exercise.exercise_id,
                                                            );

                                                            return (
                                                                <div
                                                                    key={`${activeDraftDay.day_index}-${exercise.exercise_id}-${index}`}
                                                                    className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                                                >
                                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                                        <div>
                                                                            <div className="font-medium text-foreground">
                                                                                {details?.name ??
                                                                                    `Exercise #${exercise.exercise_id}`}
                                                                            </div>
                                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                                {details?.primary_muscle ?? 'General'}
                                                                                {details?.equipment
                                                                                    ? ` - ${details.equipment}`
                                                                                    : ''}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                updateDay(
                                                                                    activeDraftDay.day_index,
                                                                                    (day) => ({
                                                                                        ...day,
                                                                                        exercises:
                                                                                            day.exercises.filter(
                                                                                                (_, itemIndex) =>
                                                                                                    itemIndex !==
                                                                                                    index,
                                                                                            ),
                                                                                    }),
                                                                                )
                                                                            }
                                                                            className="rounded-full border border-red-500/20 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/10"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>

                                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                                        <label className="text-sm font-medium text-foreground">
                                                                            Sets
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                max={10}
                                                                                value={exercise.target_sets}
                                                                                onChange={(event) =>
                                                                                    updateDay(
                                                                                        activeDraftDay.day_index,
                                                                                        (day) => ({
                                                                                            ...day,
                                                                                            exercises:
                                                                                                day.exercises.map(
                                                                                                    (
                                                                                                        item,
                                                                                                        itemIndex,
                                                                                                    ) =>
                                                                                                        itemIndex ===
                                                                                                        index
                                                                                                            ? {
                                                                                                                  ...item,
                                                                                                                  target_sets:
                                                                                                                      Number(
                                                                                                                          event
                                                                                                                              .target
                                                                                                                              .value,
                                                                                                                      ) ||
                                                                                                                      1,
                                                                                                              }
                                                                                                            : item,
                                                                                                ),
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                                                                            />
                                                                        </label>
                                                                        <label className="text-sm font-medium text-foreground">
                                                                            Target reps
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                max={30}
                                                                                value={exercise.target_reps}
                                                                                onChange={(event) =>
                                                                                    updateDay(
                                                                                        activeDraftDay.day_index,
                                                                                        (day) => ({
                                                                                            ...day,
                                                                                            exercises:
                                                                                                day.exercises.map(
                                                                                                    (
                                                                                                        item,
                                                                                                        itemIndex,
                                                                                                    ) =>
                                                                                                        itemIndex ===
                                                                                                        index
                                                                                                            ? {
                                                                                                                  ...item,
                                                                                                                  target_reps:
                                                                                                                      Number(
                                                                                                                          event
                                                                                                                              .target
                                                                                                                              .value,
                                                                                                                      ) ||
                                                                                                                      1,
                                                                                                              }
                                                                                                            : item,
                                                                                                ),
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <ProductEmptyState
                                                            title="No exercises yet"
                                                            description="Add from the library on the right to build this manual day."
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                                <div className="space-y-4 xl:col-span-2">
                                    <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Exercise library
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-foreground">
                                                    Add to day {activeDraftDay?.day_index ?? selectedDay}
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {filteredLibrary.length} visible
                                            </div>
                                        </div>

                                        <input
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            placeholder="Search by name, muscle, or equipment"
                                            className="mt-4 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm"
                                        />

                                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                            {filteredLibrary.slice(0, 18).map((exercise) => {
                                                const alreadyAdded =
                                                    activeDraftDay?.exercises.some(
                                                        (item) => item.exercise_id === exercise.id,
                                                    ) ?? false;

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
                                                                    {exercise.primary_muscle}
                                                                    {exercise.equipment
                                                                        ? ` - ${exercise.equipment}`
                                                                        : ''}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={alreadyAdded}
                                                                onClick={() => addExercise(exercise.id)}
                                                                className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {alreadyAdded ? 'Added' : 'Add'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ProductSection>

                        <ProductStickyActions>
                            <div className="mr-auto text-sm text-muted-foreground">
                                This draft stays separate from the active AI workout plan.
                            </div>
                            <button
                                type="button"
                                onClick={saveDraft}
                                disabled={saving}
                                className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Save custom draft'}
                            </button>
                        </ProductStickyActions>
                    </>
                )}
            </ProductPageShell>
        </>
    );
}

function AiDayCard({
    day,
    featured = false,
}: {
    day: PlanDay | null;
    featured?: boolean;
}) {
    if (!day) {
        return (
            <div className="rounded-[26px] border border-dashed border-border/70 bg-background/60 p-5 text-sm text-muted-foreground">
                No recommended day available yet.
            </div>
        );
    }

    const sessionType = typeof day.meta?.session_type === 'string' ? day.meta.session_type : null;
    const duration = typeof day.meta?.duration_min === 'number' ? day.meta.duration_min : null;

    return (
        <div
            className={`rounded-[26px] border p-5 ${
                featured
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border/70 bg-background/72'
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
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {sessionType ? <span className="haye-chip">{sessionType}</span> : null}
                {duration ? <span className="haye-chip">{duration} min</span> : null}
                <span className="haye-chip">{day.exercises.length} exercises</span>
            </div>
            <div className="mt-4 space-y-2">
                {day.exercises.slice(0, featured ? 5 : 3).map((exercise) => (
                    <div
                        key={`${day.id}-${exercise.id}`}
                        className="rounded-[18px] border border-border/60 bg-card/80 px-3 py-2 text-sm text-foreground"
                    >
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-xs text-muted-foreground">
                            {exercise.pivot?.sets ?? 0} sets
                            {exercise.pivot?.reps_min ? ` - ${exercise.pivot.reps_min}` : ''}
                            {exercise.equipment ? ` - ${exercise.equipment}` : ''}
                        </div>
                    </div>
                ))}
            </div>
            {featured ? (
                <div className="mt-4">
                    <Link
                        href="/workouts/log"
                        className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
                    >
                        Log this day
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

function MetaListCard({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Dumbbell className="h-4 w-4" />
                {title}
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
                {items.length ? (
                    items.map((item) => <li key={item}>- {item}</li>)
                ) : (
                    <li className="text-muted-foreground">Nothing recorded yet.</li>
                )}
            </ul>
        </div>
    );
}

