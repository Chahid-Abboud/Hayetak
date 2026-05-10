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
import { ProductButton, ProductInput } from '@/components/product/product-ui';
import WorkoutTabs from '@/components/workouts/WorkoutTabs';
import type { Errors as InertiaErrors } from '@inertiajs/core';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ListChecks,
    Plus,
    Search,
    Sparkles,
    Trash2,
    WandSparkles,
} from 'lucide-react';
<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
=======
import { useEffect, useMemo, useState, type ReactNode } from 'react';
>>>>>>> origin/main

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
        name: day.name.trim() !== '' ? day.name : `Day ${index + 1}`,
    }));
}

function recommendedDraftDayIndex(
    plan?: WorkoutPlan | null,
    recommendedDayId?: number | null,
): number {
    const recommendedDay = plan?.days?.find(
        (day) => day.id === recommendedDayId,
    );

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
        plan?.days?.reduce(
            (total, day) => total + (day.exercises?.length ?? 0),
            0,
        ) ?? 0;

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

    const [libraryPage, setLibraryPage] = useState(1);
    const [templatePage, setTemplatePage] = useState(1);

    const libraryPerPage = 8;
    const templatesPerPage = 6;

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

        if (token === '') {
            return exercises;
        }

        return exercises.filter((exercise) =>
            `${exercise.name} ${exercise.primary_muscle} ${exercise.equipment ?? ''}`
                .toLowerCase()
                .includes(token),
        );
    }, [exercises, query]);

    useEffect(() => {
        setLibraryPage(1);
    }, [query]);

    const totalLibraryPages = Math.max(
        1,
        Math.ceil(filteredLibrary.length / libraryPerPage),
    );

    const paginatedLibrary = filteredLibrary.slice(
        (libraryPage - 1) * libraryPerPage,
        libraryPage * libraryPerPage,
    );

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
                    setStatus(
                        'Your workout draft has been saved successfully.',
                    );
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

<<<<<<< HEAD
    const applyDraftDays = useCallback((nextDays: DayDraft[]) => {
=======
    const applyDraftDays = (nextDays: DayDraft[]) => {
>>>>>>> origin/main
        const normalized = normalizeDayIndexes(nextDays);
        setDraftDays(normalized);
        setSelectedDay(normalized[0]?.day_index ?? 1);
        setStatus(null);
        setErrors({});
<<<<<<< HEAD
    }, []);

    const applyPlanToDraft = useCallback((plan: WorkoutPlan, label: string) => {
=======
    };

    const applyPlanToDraft = (plan: WorkoutPlan, label: string) => {
>>>>>>> origin/main
        const nextDays = toDraftDays(plan);
        setDraftName(`${plan.name} Copy`);
        applyDraftDays(nextDays);
        setMode('build-own');
        setStatus(`${label} loaded into your draft editor.`);
<<<<<<< HEAD
    }, [applyDraftDays]);
=======
    };
>>>>>>> origin/main

    const templateSources = useMemo(() => {
        const sources: Array<{
            id: string;
            title: string;
            description: string;
            badge: string;
            onClick: () => void;
        }> = [];

        if (activeAiPlan) {
            sources.push({
                id: `ai-${activeAiPlan.id}`,
                title: 'Use current AI plan',
                description:
                    'Copy the active guided structure into your personal draft editor.',
                badge: `${planSummary(activeAiPlan).days} days`,
                onClick: () => applyPlanToDraft(activeAiPlan, 'Your AI plan'),
            });
        }

        for (const plan of premadePlans ?? []) {
            sources.push({
                id: `template-${plan.id}`,
                title: plan.name,
                description:
                    plan.goal ??
                    'A public workout structure you can copy and customize.',
                badge: `${plan.days.length} days`,
                onClick: () => applyPlanToDraft(plan, 'Public template'),
            });
        }

        return sources;
<<<<<<< HEAD
    }, [activeAiPlan, applyPlanToDraft, premadePlans]);
=======
    }, [activeAiPlan, premadePlans]);
>>>>>>> origin/main

    const totalTemplatePages = Math.max(
        1,
        Math.ceil(templateSources.length / templatesPerPage),
    );

    const paginatedTemplateSources = templateSources.slice(
        (templatePage - 1) * templatesPerPage,
        templatePage * templatesPerPage,
    );

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
        setSelectedDay(nextDays[0]?.day_index ?? 1);
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
            item: exercises.find(
                (libraryExercise) =>
                    libraryExercise.id === exercise.exercise_id,
            ),
        }))
        .filter((item): item is { draft: DraftExercise; item: Exercise } =>
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
                            : 'The custom builder keeps day selection, draft editing, exercise search, and ready starters separated into clean sections.'
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
                                <Link href="/workouts/log">
                                    Open workout log
                                </Link>
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
<<<<<<< HEAD
                                <div className="grid items-start gap-4 xl:grid-cols-3">
                                    <AiFocusCard
                                        day={aiRecommendedDay}
                                        className="xl:row-span-2"
                                    />
                                    {(activeAiPlan.days ?? []).map((day) => (
                                        <AiDayCard
                                            key={day.id}
                                            day={day}
                                            highlighted={
                                                aiRecommendedDay?.id === day.id
                                            }
                                        />
                                    ))}
=======
                                <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                                    <AiFocusCard day={aiRecommendedDay} />

                                    <div className="grid content-start items-start gap-4 md:grid-cols-2">
                                        {(activeAiPlan.days ?? []).map(
                                            (day) => (
                                                <AiDayCard
                                                    key={day.id}
                                                    day={day}
                                                    highlighted={
                                                        aiRecommendedDay?.id ===
                                                        day.id
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
>>>>>>> origin/main
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
                                            activeAiPlan.meta
                                                ?.progression_rules,
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
                                        <Link href="/ai/planner">
                                            Generate plan
                                        </Link>
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
                            description="Work from top to bottom: load a ready starter, select a day, edit the day, then add exercises from the paginated library."
                        >
                            <div className="space-y-5">
                                <BuilderCard
                                    title="Draft basics and ready starting points"
                                    description="Name your draft, pick a quick split, or load a ready AI/template plan before editing days."
                                >
                                    <div className="space-y-5">
                                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                            <label className="block">
                                                <span className="text-sm font-semibold text-foreground">
                                                    Draft name
                                                </span>
                                                <input
                                                    value={draftName}
                                                    onChange={(event) =>
                                                        setDraftName(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground"
                                                />
                                            </label>

                                            <div className="grid gap-3 sm:grid-cols-3">
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
                                                                templateDays(
                                                                    key,
                                                                ),
                                                            )
                                                        }
                                                        className="flex items-center justify-between rounded-[22px] border border-border/70 bg-card/80 px-4 py-4 text-left text-base font-semibold text-foreground transition hover:bg-background"
                                                    >
                                                        <span>
                                                            {templateLabel(key)}
                                                        </span>
                                                        <WandSparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-[24px] border border-border/70 bg-card/60 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-base font-semibold text-foreground">
                                                        Ready plan starters
                                                    </div>
                                                    <div className="mt-1 text-sm text-muted-foreground">
                                                        Load your current AI
                                                        plan or a public
                                                        prototype directly into
                                                        the draft editor.
                                                    </div>
                                                </div>

                                                <PaginationControls
                                                    page={templatePage}
                                                    totalPages={
                                                        totalTemplatePages
                                                    }
                                                    onPrevious={() =>
                                                        setTemplatePage(
                                                            (current) =>
                                                                Math.max(
                                                                    1,
                                                                    current -
                                                                        1,
                                                                ),
                                                        )
                                                    }
                                                    onNext={() =>
                                                        setTemplatePage(
                                                            (current) =>
                                                                Math.min(
                                                                    totalTemplatePages,
                                                                    current +
                                                                        1,
                                                                ),
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                                {paginatedTemplateSources.length ? (
                                                    paginatedTemplateSources.map(
                                                        (source) => (
                                                            <TemplateSourceCard
                                                                key={source.id}
                                                                title={
                                                                    source.title
                                                                }
                                                                description={
                                                                    source.description
                                                                }
                                                                badge={
                                                                    source.badge
                                                                }
                                                                onClick={
                                                                    source.onClick
                                                                }
                                                            />
                                                        ),
                                                    )
                                                ) : (
                                                    <div className="rounded-[20px] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground lg:col-span-3">
                                                        No ready starters are
                                                        available yet. You can
                                                        still use the quick
                                                        split buttons above.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </BuilderCard>

                                <BuilderCard
                                    title="Day navigation"
                                    description="Pick the day you want to edit. Add or remove days without scrolling through the exercise library."
                                >
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {draftDays.map((day) => (
                                            <button
                                                key={day.day_index}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedDay(
                                                        day.day_index,
                                                    )
                                                }
                                                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                    selectedDay ===
                                                    day.day_index
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
                                                        {day.exercises.length}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                                                removeDay(
                                                    activeDraftDay.day_index,
                                                )
                                            }
                                            className="h-11 justify-center"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Remove selected day
                                        </ProductButton>
                                    </div>
                                </BuilderCard>

                                <BuilderCard
                                    title={
                                        activeDraftDay
                                            ? `Editing ${activeDraftDay.name}`
                                            : 'Select a day'
                                    }
                                    description="Edit the day title and review selected exercises before adding more from the library."
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
                                                                name: event
                                                                    .target
                                                                    .value,
                                                            }),
                                                        )
                                                    }
                                                    className="mt-2 h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground"
                                                />
                                            </label>

                                            {selectedDayExercises.length ? (
                                                <div className="grid gap-4 lg:grid-cols-2">
                                                    {selectedDayExercises.map(
                                                        ({ draft, item }) => (
                                                            <SelectedExerciseCard
                                                                key={item.id}
                                                                exercise={item}
                                                                draft={draft}
                                                                onSetsChange={(
                                                                    value,
                                                                ) =>
                                                                    updateDay(
                                                                        activeDraftDay.day_index,
                                                                        (
                                                                            day,
                                                                        ) => ({
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
                                                                onRepsChange={(
                                                                    value,
                                                                ) =>
                                                                    updateDay(
                                                                        activeDraftDay.day_index,
                                                                        (
                                                                            day,
                                                                        ) => ({
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
                                                                    removeExercise(
                                                                        item.id,
                                                                    )
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="rounded-[24px] border border-dashed border-border/70 bg-card/50 px-6 py-10 text-center">
                                                    <div className="text-lg font-semibold text-foreground">
                                                        No exercises on this day
                                                        yet
                                                    </div>
                                                    <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                                                        Use the exercise library
                                                        below to add movements
                                                        with comfortable
                                                        defaults, then tweak the
                                                        targets here.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <ProductEmptyState
                                            title="No day selected"
                                            description="Choose a day above to start editing."
                                        />
                                    )}
                                </BuilderCard>

                                <BuilderCard
                                    title="Exercise library"
                                    description="Use search and pages to keep the library compact instead of letting it take over the whole screen."
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="relative w-full max-w-xl">
                                            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <ProductInput
                                                value={query}
                                                onChange={(event) =>
                                                    setQuery(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search by name, muscle group, or equipment"
                                                className="h-12 w-full bg-card pl-11 text-base"
                                            />
                                        </div>

                                        <PaginationControls
                                            page={libraryPage}
                                            totalPages={totalLibraryPages}
                                            onPrevious={() =>
                                                setLibraryPage((current) =>
                                                    Math.max(1, current - 1),
                                                )
                                            }
                                            onNext={() =>
                                                setLibraryPage((current) =>
                                                    Math.min(
                                                        totalLibraryPages,
                                                        current + 1,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="mt-4 max-h-[520px] overflow-y-auto pr-2">
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            {paginatedLibrary.map(
                                                (exercise) => {
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
                                                                <div className="min-w-0 space-y-2">
                                                                    <div className="truncate text-base font-semibold text-foreground">
                                                                        {
                                                                            exercise.name
                                                                        }
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
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
                                                                        alreadyAdded
                                                                    }
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
                                                },
                                            )}
                                        </div>

                                        {filteredLibrary.length === 0 ? (
                                            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                                                No exercises matched your
                                                search.
                                            </div>
                                        ) : null}
                                    </div>
                                </BuilderCard>
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
                                {saving
                                    ? 'Saving draft...'
                                    : 'Save custom draft'}
                            </ProductButton>
                        </ProductStickyActions>
                    </>
                )}
            </ProductPageShell>
        </>
    );
}

function PaginationControls({
    page,
    totalPages,
    onPrevious,
    onNext,
}: {
    page: number;
    totalPages: number;
    onPrevious: () => void;
    onNext: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <ProductButton
                type="button"
                emphasis="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={onPrevious}
                className="gap-1"
            >
                <ChevronLeft className="h-4 w-4" />
                Previous
            </ProductButton>

            <span className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm font-semibold text-muted-foreground">
                {page}/{totalPages}
            </span>

            <ProductButton
                type="button"
                emphasis="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={onNext}
                className="gap-1"
            >
                Next
                <ChevronRight className="h-4 w-4" />
            </ProductButton>
        </div>
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
    children: ReactNode;
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

<<<<<<< HEAD
function AiFocusCard({
    day,
    className = '',
}: {
    day: PlanDay | null;
    className?: string;
}) {
=======
function AiFocusCard({ day }: { day: PlanDay | null }) {
>>>>>>> origin/main
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

    const hasExercises = day.exercises.length > 0;

    return (
<<<<<<< HEAD
        <div
            className={`rounded-[28px] border border-primary/25 bg-primary/10 p-6 ${className}`}
        >
=======
        <div className="rounded-[28px] border border-primary/25 bg-primary/10 p-6">
>>>>>>> origin/main
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

            {hasExercises ? (
                <div className="mt-5 grid gap-3">
                    {day.exercises.slice(0, 4).map((exercise) => (
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
            ) : (
                <div className="mt-5 rounded-[22px] border border-border/70 bg-background/75 px-4 py-5 text-sm leading-6 text-muted-foreground">
                    This is a rest/recovery day. No exercises are scheduled, so
                    use it for mobility, light walking, hydration, and recovery.
                </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
                {hasExercises ? (
                    <ProductButton asChild>
                        <Link href="/workouts/log">Log this workout</Link>
                    </ProductButton>
                ) : (
                    <ProductButton asChild>
                        <Link href="/workouts/log">Open workout log</Link>
                    </ProductButton>
                )}

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
    const hasExercises = day.exercises.length > 0;

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

            {hasExercises ? (
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

                    {day.exercises.length > 3 ? (
                        <div className="rounded-[18px] border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
                            +{day.exercises.length - 3} more exercises
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-border/70 bg-card/50 px-3 py-4 text-sm leading-6 text-muted-foreground">
                    Rest / recovery day. No exercises scheduled.
                </div>
            )}
        </div>
    );
<<<<<<< HEAD
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
            className="rounded-[22px] border border-border/70 bg-background/72 p-4 text-left transition hover:bg-card"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <div className="line-clamp-2 text-base font-semibold text-foreground">
                        {title}
                    </div>
                    <div className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {description}
                    </div>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <PlanChip label={badge} />
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    Load
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
=======
>>>>>>> origin/main
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
            className="rounded-[22px] border border-border/70 bg-background/72 p-4 text-left transition hover:bg-card"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <div className="line-clamp-2 text-base font-semibold text-foreground">
                        {title}
                    </div>
                    <div className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {description}
                    </div>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <PlanChip label={badge} />
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    Load
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