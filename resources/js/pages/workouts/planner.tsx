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
} from '@/components/product/product-ui';
import WorkoutTabs from '@/components/workouts/WorkoutTabs';
import type { Errors as InertiaErrors } from '@inertiajs/core';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronRight,
    ListChecks,
    Plus,
    Sparkles,
    Trash2,
    WandSparkles,
} from 'lucide-react';
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
    days: PlanDay[];
};

type DraftExercise = {
    exercise_id: number;
    target_sets: number;
    target_reps: number;
};

type DayDraft = {
    day_index: number;
    name: string;
    exercises: DraftExercise[];
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

type TemplateKey = 'fullBody3' | 'pushPullLegs3' | 'upperLower4';

function toDraftDays(plan?: WorkoutPlan | null): DayDraft[] {
    if (!plan?.days?.length) {
        return Array.from({ length: 3 }, (_, index) => ({
            day_index: index + 1,
            name: `Day ${index + 1}`,
            exercises: [],
        }));
    }

    return plan.days
        .slice()
        .sort((left, right) => left.day_index - right.day_index)
        .map((day) => ({
            day_index: day.day_index,
            name: day.name ?? `Day ${day.day_index}`,
            exercises: (day.exercises ?? []).map((exercise) => ({
                exercise_id: exercise.id,
                target_sets: exercise.pivot?.sets ?? 3,
                target_reps:
                    exercise.pivot?.reps_min ?? exercise.pivot?.reps_max ?? 10,
            })),
        }));
}

function normalizeDayIndexes(days: DayDraft[]): DayDraft[] {
    return days.map((day, index) => ({
        ...day,
        day_index: index + 1,
        name:
            day.name.trim() !== ''
                ? day.name
                : `Day ${index + 1}`,
    }));
}

function recommendedDraftDayIndex(
    plan?: WorkoutPlan | null,
    recommendedDayId?: number | null,
): number {
    const recommendedDay = plan?.days?.find((day) => day.id === recommendedDayId);
    return recommendedDay?.day_index ?? plan?.days?.[0]?.day_index ?? 1;
}

function stringifyErrors(errors: InertiaErrors): Record<string, string> {
    return Object.entries(errors).reduce<Record<string, string>>(
        (carry, [key, value]) => {
            carry[key] = String(value);
            return carry;
        },
        {},
    );
}

function templateDays(key: TemplateKey): DayDraft[] {
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

function arrayStrings(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value.filter(
        (item): item is string =>
            typeof item === 'string' && item.trim().length > 0,
    );
}

function planSummary(plan?: WorkoutPlan | null) {
    const days = plan?.days?.length ?? 0;
    const exercises =
        plan?.days?.reduce((total, day) => total + (day.exercises?.length ?? 0), 0) ??
        0;

    return { days, exercises };
}

function templateLabel(key: TemplateKey) {
    if (key === 'fullBody3') return 'Full Body 3';
    if (key === 'pushPullLegs3') return 'Push / Pull / Legs';
    return 'Upper / Lower 4';
}

export default function WorkoutPlannerPage() {
    const {
        activeAiPlan,
        manualPlan,
        premadePlans,
        recommendedAiDayId,
        recommendedManualDayId,
        exercises,
        today,
    } = usePage<PageProps>().props;

    const [mode, setMode] = useState<'follow-ai' | 'build-own'>(
        activeAiPlan ? 'follow-ai' : 'build-own',
    );
    const [draftName, setDraftName] = useState(
        manualPlan?.name ?? 'My Workout Draft',
    );
    const [draftDays, setDraftDays] = useState<DayDraft[]>(
        toDraftDays(manualPlan),
    );
    const [selectedDay, setSelectedDay] = useState<number>(
        recommendedDraftDayIndex(manualPlan, recommendedManualDayId),
    );
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const activeDraftDay =
        draftDays.find((day) => day.day_index === selectedDay) ??
        draftDays[0] ??
        null;

    const aiRecommendedDay =
        activeAiPlan?.days?.find((day) => day.id === recommendedAiDayId) ??
        activeAiPlan?.days?.[0] ??
        null;

    const filteredLibrary = useMemo(() => {
        const token = query.trim().toLowerCase();
        if (token === '') return exercises.slice(0, 24);

        return exercises.filter((exercise) =>
            `${exercise.name} ${exercise.primary_muscle} ${exercise.equipment ?? ''}`
                .toLowerCase()
                .includes(token),
        );
    }, [exercises, query]);

    const visibleErrors = useMemo(
        () => Array.from(new Set(Object.values(errors))).slice(0, 4),
        [errors],
    );

    const aiSummary = planSummary(activeAiPlan);
    const draftExerciseCount = draftDays.reduce(
        (total, day) => total + day.exercises.length,
        0,
    );

    const heroMeta = (
        <div className="space-y-4 text-sm text-foreground">
            <div className="rounded-[22px] border border-border/70 bg-card/80 p-4">
                <div className="text-sm font-semibold">Today</div>
                <div className="mt-2 text-base text-muted-foreground">
                    {today}
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <OverviewPill
                    label="Active AI plan"
                    value={activeAiPlan?.name ?? 'Not available'}
                />
                <OverviewPill
                    label="Manual draft"
                    value={manualPlan?.name ?? 'Not saved yet'}
                />
            </div>
        </div>
    );

    const saveDraft = () => {
        setSaving(true);
        setStatus(null);
        setErrors({});

        router.post(
            '/workouts/plan',
            {
                name: draftName.trim() || 'My Workout Draft',
                days: draftDays,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatus('Your workout draft has been saved successfully.');
                    router.reload({
                        only: ['manualPlan', 'recommendedManualDayId'],
                    });
                },
                onError: (incomingErrors) =>
                    setErrors(stringifyErrors(incomingErrors)),
                onFinish: () => setSaving(false),
            },
        );
    };

    const applyDraftDays = (nextDays: DayDraft[]) => {
        const normalized = normalizeDayIndexes(nextDays);
        setDraftDays(normalized);
        setSelectedDay(normalized[0]?.day_index ?? 1);
        setStatus(null);
        setErrors({});
    };

    const applyPlanToDraft = (plan: WorkoutPlan, label: string) => {
        const nextDays = toDraftDays(plan);
        setDraftName(`${plan.name} Copy`);
        applyDraftDays(nextDays);
        setMode('build-own');
        setStatus(`${label} loaded into your draft editor.`);
    };

    const updateDay = (
        dayIndex: number,
        updater: (day: DayDraft) => DayDraft,
    ) => {
        setDraftDays((current) =>
            current.map((day) =>
                day.day_index === dayIndex ? updater(day) : day,
            ),
        );
    };

    const addDay = () => {
        if (draftDays.length >= 7) {
            setStatus('You can save up to 7 training days in one draft.');
            return;
        }

        const nextDay: DayDraft = {
            day_index: draftDays.length + 1,
            name: `Day ${draftDays.length + 1}`,
            exercises: [],
        };

        const nextDays = [...draftDays, nextDay];
        setDraftDays(nextDays);
        setSelectedDay(nextDay.day_index);
    };

    const removeDay = (dayIndex: number) => {
        if (draftDays.length === 1) {
            setStatus('Keep at least one day in the draft.');
            return;
        }

        const nextDays = normalizeDayIndexes(
            draftDays.filter((day) => day.day_index !== dayIndex),
        );
        setDraftDays(nextDays);
        setSelectedDay(
            nextDays.find((day) => day.day_index === dayIndex)?.day_index ??
                nextDays[0]?.day_index ??
                1,
        );
    };

    const addExercise = (exerciseId: number) => {
        if (!activeDraftDay) return;

        updateDay(activeDraftDay.day_index, (day) => {
            if (
                day.exercises.some(
                    (exercise) => exercise.exercise_id === exerciseId,
                )
            ) {
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

    const removeExercise = (exerciseId: number) => {
        if (!activeDraftDay) return;

        updateDay(activeDraftDay.day_index, (day) => ({
            ...day,
            exercises: day.exercises.filter(
                (exercise) => exercise.exercise_id !== exerciseId,
            ),
        }));
    };

    const selectedDayExercises = (activeDraftDay?.exercises ?? [])
        .map((exercise) => ({
            draft: exercise,
            item: exercises.find((libraryExercise) => libraryExercise.id === exercise.exercise_id),
        }))
        .filter(
            (item): item is { draft: DraftExercise; item: Exercise } =>
                Boolean(item.item),
        );

    return (
        <>
            <Head title="Workout Planner" />

            <ProductPageShell width="wide">
                <WorkoutTabs active="plan" />

                <ProductHero
                    eyebrow={
                        <span className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                            Workout Planner
                        </span>
                    }
                    title={
                        mode === 'follow-ai'
                            ? 'Train with a clear weekly structure'
                            : 'Build a cleaner workout draft in minutes'
                    }
                    description={
                        mode === 'follow-ai'
                            ? 'Your AI plan is organized into readable day cards, practical guidance, and quick actions so nothing feels cramped when you are ready to train.'
                            : 'The custom builder keeps the draft editor, day navigation, and exercise library in one balanced layout with comfortable spacing and larger text.'
                    }
                    meta={heroMeta}
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            {activeAiPlan ? (
                                <ProductButton
                                    emphasis="secondary"
                                    onClick={() =>
                                        setMode((current) =>
                                            current === 'follow-ai'
                                                ? 'build-own'
                                                : 'follow-ai',
                                        )
                                    }
                                >
                                    {mode === 'follow-ai'
                                        ? 'Open manual builder'
                                        : 'Back to AI plan'}
                                </ProductButton>
                            ) : null}
                            <ProductButton asChild>
                                <Link href="/workouts/log">Open workout log</Link>
                            </ProductButton>
                            <ProductButton asChild emphasis="secondary">
                                <Link href="/ai/planner">Open AI planner</Link>
                            </ProductButton>
                        </div>
                    }
                />

                {status ? (
                    <ProductBanner tone="success" role="status">
                        {status}
                    </ProductBanner>
                ) : null}

                {visibleErrors.length ? (
                    <ProductBanner tone="danger" role="alert">
                        <div className="space-y-1">
                            <div className="font-semibold">
                                Please fix these draft issues before saving:
                            </div>
                            {visibleErrors.map((message) => (
                                <div key={message}>{message}</div>
                            ))}
                        </div>
                    </ProductBanner>
                ) : null}

                <ProductStatGrid>
                    <ProductStatCard
                        label="AI days"
                        value={aiSummary.days}
                        helper={
                            activeAiPlan
                                ? `${aiSummary.exercises} planned exercises are ready to follow.`
                                : 'Generate an AI plan to unlock guided follow mode.'
                        }
                    />
                    <ProductStatCard
                        label="Manual draft days"
                        value={draftDays.length}
                        helper="Add or remove days without affecting your active AI plan."
                    />
                    <ProductStatCard
                        label="Draft exercises"
                        value={draftExerciseCount}
                        helper="Each day stays editable with readable set and rep targets."
                    />
                    <ProductStatCard
                        label="Public templates"
                        value={premadePlans?.length ?? 0}
                        helper="Load a public template or your current plan as a starting point."
                    />
                </ProductStatGrid>

                {mode === 'follow-ai' ? (
                    activeAiPlan ? (
                        <>
                            <ProductSection
                                title="Today and the rest of the week"
                                description="Start with the recommended day, then scan the full structure without hunting through dense blocks."
                            >
                                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                    <AiFocusCard day={aiRecommendedDay} />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {(activeAiPlan.days ?? []).map((day) => (
                                            <AiDayCard
                                                key={day.id}
                                                day={day}
                                                highlighted={
                                                    aiRecommendedDay?.id === day.id
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            </ProductSection>

                            <ProductSection
                                title="Plan guidance"
                                description="Recovery and progression cues stay separated into simple cards so the plan is easier to follow at a glance."
                            >
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <MetaListCard
                                        title="Progression rules"
                                        items={arrayStrings(
                                            activeAiPlan.meta?.progression_rules,
                                        )}
                                    />
                                    <MetaListCard
                                        title="Recovery rules"
                                        items={arrayStrings(
                                            activeAiPlan.meta?.recovery_rules,
                                        )}
                                    />
                                    <MetaListCard
                                        title="Coach notes"
                                        items={arrayStrings(
                                            activeAiPlan.meta?.coach_notes,
                                        )}
                                    />
                                </div>
                            </ProductSection>
                        </>
                    ) : (
                        <ProductEmptyState
                            title="No active AI workout plan yet"
                            description="Generate a workout plan from the AI planner, or switch to the manual builder and create your own draft now."
                            action={
                                <div className="flex flex-wrap justify-center gap-3">
                                    <ProductButton asChild>
                                        <Link href="/ai/planner">Generate plan</Link>
                                    </ProductButton>
                                    <ProductButton
                                        emphasis="secondary"
                                        onClick={() => setMode('build-own')}
                                    >
                                        Open manual builder
                                    </ProductButton>
                                </div>
                            }
                        />
                    )
                ) : (
                    <>
                        <ProductSection
                            title="Manual draft builder"
                            description="The draft editor keeps day planning on the left and exercise building on the right, so the page stays roomy instead of feeling crowded."
                        >
                            <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
                                <div className="space-y-4">
                                    <BuilderCard
                                        title="Draft basics"
                                        description="Name the draft and pick where you want to start."
                                    >
                                        <label className="block">
                                            <span className="text-sm font-semibold text-foreground">
                                                Draft name
                                            </span>
                                            <input
                                                value={draftName}
                                                onChange={(event) =>
                                                    setDraftName(event.target.value)
                                                }
                                                className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground"
                                            />
                                        </label>
                                        <div className="grid gap-3">
                                            {(
                                                [
                                                    'fullBody3',
                                                    'pushPullLegs3',
                                                    'upperLower4',
                                                ] as TemplateKey[]
                                            ).map((key) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() =>
                                                        applyDraftDays(
                                                            templateDays(key),
                                                        )
                                                    }
                                                    className="flex items-center justify-between rounded-[22px] border border-border/70 bg-card/80 px-4 py-4 text-left text-base font-semibold text-foreground transition hover:bg-background"
                                                >
                                                    <span>{templateLabel(key)}</span>
                                                    <WandSparkles className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </div>
                                    </BuilderCard>

                                    <BuilderCard
                                        title="Day navigation"
                                        description="Select a day to edit, add another one, or remove a day you no longer need."
                                    >
                                        <div className="space-y-3">
                                            {draftDays.map((day) => (
                                                <button
                                                    key={day.day_index}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedDay(day.day_index)
                                                    }
                                                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                                                        selectedDay === day.day_index
                                                            ? 'border-primary/30 bg-primary/10'
                                                            : 'border-border/70 bg-card/80 hover:bg-background'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-muted-foreground">
                                                                Day {day.day_index}
                                                            </div>
                                                            <div className="mt-1 text-base font-semibold text-foreground">
                                                                {day.name}
                                                            </div>
                                                        </div>
                                                        <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-sm text-muted-foreground">
                                                            {day.exercises.length} exercises
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <ProductButton
                                                emphasis="secondary"
                                                onClick={addDay}
                                                className="h-11 justify-center"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add day
                                            </ProductButton>
                                            <ProductButton
                                                emphasis="secondary"
                                                onClick={() =>
                                                    activeDraftDay &&
                                                    removeDay(activeDraftDay.day_index)
                                                }
                                                className="h-11 justify-center"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove day
                                            </ProductButton>
                                        </div>
                                    </BuilderCard>
                                </div>

                                <div className="space-y-5">
                                    <BuilderCard
                                        title={
                                            activeDraftDay
                                                ? `Editing ${activeDraftDay.name}`
                                                : 'Select a day'
                                        }
                                        description="Adjust the day name, review what is already included, and fine-tune sets and reps without losing sight of the exercise library."
                                    >
                                        {activeDraftDay ? (
                                            <div className="space-y-5">
                                                <label className="block">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        Day title
                                                    </span>
                                                    <input
                                                        value={activeDraftDay.name}
                                                        onChange={(event) =>
                                                            updateDay(
                                                                activeDraftDay.day_index,
                                                                (day) => ({
                                                                    ...day,
                                                                    name: event.target.value,
                                                                }),
                                                            )
                                                        }
                                                        className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground"
                                                    />
                                                </label>

                                                {selectedDayExercises.length ? (
                                                    <div className="grid gap-4">
                                                        {selectedDayExercises.map(
                                                            ({ draft, item }) => (
                                                                <SelectedExerciseCard
                                                                    key={item.id}
                                                                    exercise={item}
                                                                    draft={draft}
                                                                    onSetsChange={(value) =>
                                                                        updateDay(
                                                                            activeDraftDay.day_index,
                                                                            (day) => ({
                                                                                ...day,
                                                                                exercises:
                                                                                    day.exercises.map(
                                                                                        (
                                                                                            entry,
                                                                                        ) =>
                                                                                            entry.exercise_id ===
                                                                                            item.id
                                                                                                ? {
                                                                                                      ...entry,
                                                                                                      target_sets:
                                                                                                          value,
                                                                                                  }
                                                                                                : entry,
                                                                                    ),
                                                                            }),
                                                                        )
                                                                    }
                                                                    onRepsChange={(value) =>
                                                                        updateDay(
                                                                            activeDraftDay.day_index,
                                                                            (day) => ({
                                                                                ...day,
                                                                                exercises:
                                                                                    day.exercises.map(
                                                                                        (
                                                                                            entry,
                                                                                        ) =>
                                                                                            entry.exercise_id ===
                                                                                            item.id
                                                                                                ? {
                                                                                                      ...entry,
                                                                                                      target_reps:
                                                                                                          value,
                                                                                                  }
                                                                                                : entry,
                                                                                    ),
                                                                            }),
                                                                        )
                                                                    }
                                                                    onRemove={() =>
                                                                        removeExercise(item.id)
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <ProductEmptyState
                                                        title="No exercises on this day yet"
                                                        description="Use the exercise library below to add movements with comfortable defaults, then tweak the targets here."
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <ProductEmptyState
                                                title="No day selected"
                                                description="Choose a day from the left to start editing."
                                            />
                                        )}
                                    </BuilderCard>

                                    <BuilderCard
                                        title="Exercise library"
                                        description="Search the library by movement, muscle group, or equipment and add what you need without overwhelming the page."
                                    >
                                        <ProductInput
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Search by name, muscle group, or equipment"
                                            className="h-12 w-full bg-card text-base"
                                        />
                                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                            {filteredLibrary.map((exercise) => {
                                                const alreadyAdded =
                                                    activeDraftDay?.exercises.some(
                                                        (item) =>
                                                            item.exercise_id ===
                                                            exercise.id,
                                                    ) ?? false;

                                                return (
                                                    <div
                                                        key={exercise.id}
                                                        className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-2">
                                                                <div className="text-base font-semibold text-foreground">
                                                                    {exercise.name}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {exercise.primary_muscle}
                                                                    {exercise.equipment
                                                                        ? ` - ${exercise.equipment}`
                                                                        : ''}
                                                                </div>
                                                            </div>
                                                            <ProductButton
                                                                emphasis="secondary"
                                                                disabled={alreadyAdded}
                                                                onClick={() =>
                                                                    addExercise(
                                                                        exercise.id,
                                                                    )
                                                                }
                                                            >
                                                                {alreadyAdded
                                                                    ? 'Added'
                                                                    : 'Add'}
                                                            </ProductButton>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </BuilderCard>
                                </div>
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Useful starting points"
                            description="Bring in a public template or your current AI plan when you want a faster draft setup."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                {activeAiPlan ? (
                                    <TemplateSourceCard
                                        title="Use current AI plan"
                                        description="Copy the active guided structure into your personal draft editor."
                                        badge={`${aiSummary.days} days`}
                                        onClick={() =>
                                            applyPlanToDraft(
                                                activeAiPlan,
                                                'Your AI plan',
                                            )
                                        }
                                    />
                                ) : null}

                                {(premadePlans ?? []).map((plan) => (
                                    <TemplateSourceCard
                                        key={plan.id}
                                        title={plan.name}
                                        description={
                                            plan.goal ??
                                            'A public workout structure you can copy and customize.'
                                        }
                                        badge={`${plan.days.length} days`}
                                        onClick={() =>
                                            applyPlanToDraft(
                                                plan,
                                                'Public template',
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        </ProductSection>

                        <ProductStickyActions>
                            <div className="mr-auto text-base text-muted-foreground">
                                This draft stays separate from the active AI
                                workout plan.
                            </div>
                            <ProductButton
                                onClick={saveDraft}
                                disabled={saving}
                            >
                                {saving ? 'Saving draft...' : 'Save custom draft'}
                            </ProductButton>
                        </ProductStickyActions>
                    </>
                )}

                {mode === 'follow-ai' && (premadePlans?.length ?? 0) > 0 ? (
                    <ProductSection
                        title="Backup templates"
                        description="If you want to branch off from your current plan, these public templates are ready to copy into the manual builder."
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            {(premadePlans ?? []).map((plan) => (
                                <TemplateSourceCard
                                    key={plan.id}
                                    title={plan.name}
                                    description={
                                        plan.goal ??
                                        'A public workout structure ready to reuse.'
                                    }
                                    badge={`${plan.days.length} days`}
                                    onClick={() =>
                                        applyPlanToDraft(
                                            plan,
                                            'Public template',
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </ProductSection>
                ) : null}
            </ProductPageShell>
        </>
    );
}

function OverviewPill({ label, value }: { label: string; value: string }) {
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

function BuilderCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[26px] border border-border/70 bg-background/72 p-5">
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

function AiFocusCard({ day }: { day: PlanDay | null }) {
    if (!day) {
        return (
            <ProductEmptyState
                title="No recommended day available"
                description="Generate or activate a workout plan to see today's guided focus."
            />
        );
    }

    const sessionType =
        typeof day.meta?.session_type === 'string'
            ? day.meta.session_type
            : null;
    const duration =
        typeof day.meta?.duration_min === 'number'
            ? day.meta.duration_min
            : null;

    return (
        <div className="rounded-[28px] border border-primary/25 bg-primary/10 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-muted-foreground">
                        Recommended today
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-foreground">
                        {day.name ?? `Workout Day ${day.day_index}`}
                    </div>
                </div>
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
                <PlanChip label={`Day ${day.day_index}`} />
                <PlanChip label={`${day.exercises.length} exercises`} />
                {sessionType ? <PlanChip label={sessionType} /> : null}
                {duration ? <PlanChip label={`${duration} min`} /> : null}
            </div>

            <div className="mt-5 space-y-3">
                {day.exercises.slice(0, 5).map((exercise) => (
                    <div
                        key={`${day.id}-${exercise.id}`}
                        className="rounded-[20px] border border-border/70 bg-background/80 px-4 py-3"
                    >
                        <div className="text-base font-semibold text-foreground">
                            {exercise.name}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {exercise.pivot?.sets ?? 0} sets
                            {exercise.pivot?.reps_min
                                ? ` - ${exercise.pivot.reps_min} reps`
                                : ''}
                            {exercise.equipment
                                ? ` - ${exercise.equipment}`
                                : ''}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                <ProductButton asChild>
                    <Link href="/workouts/log">Log this workout</Link>
                </ProductButton>
                <ProductButton asChild emphasis="secondary">
                    <Link href="/ai/planner">Adjust AI plan</Link>
                </ProductButton>
            </div>
        </div>
    );
}

function AiDayCard({
    day,
    highlighted,
}: {
    day: PlanDay;
    highlighted?: boolean;
}) {
    return (
        <div
            className={`rounded-[24px] border p-5 ${
                highlighted
                    ? 'border-primary/25 bg-primary/10'
                    : 'border-border/70 bg-background/72'
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
                {highlighted ? (
                    <PlanChip label="Today" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
            <div className="mt-4 space-y-2">
                {day.exercises.slice(0, 3).map((exercise) => (
                    <div
                        key={`${day.id}-${exercise.id}`}
                        className="rounded-[18px] border border-border/70 bg-card/80 px-3 py-3"
                    >
                        <div className="text-base font-semibold text-foreground">
                            {exercise.name}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {exercise.primary_muscle}
                            {exercise.equipment
                                ? ` - ${exercise.equipment}`
                                : ''}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetaListCard({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-[24px] border border-border/70 bg-background/72 p-5">
            <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                <ListChecks className="h-5 w-5" />
                {title}
            </div>
            <div className="mt-4 space-y-3">
                {items.length ? (
                    items.map((item) => (
                        <div
                            key={item}
                            className="rounded-[18px] border border-border/70 bg-card/80 px-4 py-3 text-sm leading-6 text-foreground"
                        >
                            {item}
                        </div>
                    ))
                ) : (
                    <div className="rounded-[18px] border border-dashed border-border/70 bg-background/65 px-4 py-4 text-sm text-muted-foreground">
                        Nothing has been recorded here yet.
                    </div>
                )}
            </div>
        </div>
    );
}

function SelectedExerciseCard({
    exercise,
    draft,
    onSetsChange,
    onRepsChange,
    onRemove,
}: {
    exercise: Exercise;
    draft: DraftExercise;
    onSetsChange: (value: number) => void;
    onRepsChange: (value: number) => void;
    onRemove: () => void;
}) {
    return (
        <div className="rounded-[24px] border border-border/70 bg-card/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-foreground">
                        {exercise.name}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                        {exercise.primary_muscle}
                        {exercise.equipment ? ` - ${exercise.equipment}` : ''}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="inline-flex items-center rounded-full border border-border/70 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-background"
                >
                    Remove
                </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-semibold text-foreground">
                        Target sets
                    </span>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={draft.target_sets}
                        onChange={(event) =>
                            onSetsChange(Number(event.target.value) || 1)
                        }
                        className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground"
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-foreground">
                        Target reps
                    </span>
                    <input
                        type="number"
                        min={1}
                        max={30}
                        value={draft.target_reps}
                        onChange={(event) =>
                            onRepsChange(Number(event.target.value) || 1)
                        }
                        className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground"
                    />
                </label>
            </div>
        </div>
    );
}

function TemplateSourceCard({
    title,
    description,
    badge,
    onClick,
}: {
    title: string;
    description: string;
    badge: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-[24px] border border-border/70 bg-background/72 p-5 text-left transition hover:bg-card"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                    <div className="text-lg font-semibold text-foreground">
                        {title}
                    </div>
                    <div className="text-sm leading-6 text-muted-foreground">
                        {description}
                    </div>
                </div>
                <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-center justify-between">
                <PlanChip label={badge} />
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    Load into draft
                    <ChevronRight className="h-4 w-4" />
                </div>
            </div>
        </button>
    );
}

function PlanChip({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground">
            {label}
        </span>
    );
}
