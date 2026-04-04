import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStickyActions,
} from '@/components/product/page';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

type PlanSource = {
    provider?: string | null;
    model?: string | null;
    prompt_version?: string | null;
    schema_version?: string | null;
};

type PlannerGeneration = {
    ok: boolean;
    ai_request_id: number;
    generation_id: string;
    version: number;
    provider?: string | null;
    model?: string | null;
    prompt_version?: string | null;
    schema_version?: string | null;
    usage?: {
        total_tokens?: number;
    } | null;
    plan?: PlannerPlan | null;
};

type PlannerPlan = {
    overview?: {
        summary?: string | null;
        key_constraints?: string[];
        assumptions?: string[];
    };
    safety?: {
        hard_rules_observed?: string[];
        food_avoidances?: string[];
        exercise_cautions?: string[];
    };
    diet?: {
        daily_targets?: Record<string, number | string | null>;
        days?: DietDay[];
        grocery_list?: Array<{ category?: string | null; name?: string | null; quantity?: string | null }>;
        meal_prep_notes?: string[];
        adherence_notes?: string[];
    };
    workout?: {
        weekly_schedule?: WorkoutScheduleDay[];
        progression_rules?: string[];
        recovery_rules?: string[];
        coach_notes?: string[];
    };
    adaptive_review?: {
        review_after_days?: number | null;
        checkpoints?: string[];
        replanning_triggers?: string[];
        next_data_to_collect?: string[];
    };
    ml_readiness?: {
        candidate_features?: string[];
        candidate_targets?: string[];
        notes?: string | null;
    };
    progress_prediction?: {
        model_name?: string | null;
        horizon_days?: number | null;
        baseline_weight_kg?: number | null;
        expected_weight_change_kg?: number | null;
        projected_body_weight_kg?: number | null;
        confidence?: string | null;
        strength_projection?: {
            upper_body_compound_pct?: number | null;
            lower_body_compound_pct?: number | null;
        };
        feedback_adjustment?: {
            base_weekly_weight_change_kg?: number | null;
            adjusted_weekly_weight_change_kg?: number | null;
            last_prediction_error_kg_per_week?: number | null;
            notes?: string | null;
        };
    };
};

type DietDay = {
    day_index: number;
    theme?: string | null;
    meals?: Array<{
        meal_code?: string | null;
        title?: string | null;
        target_kcal?: number | null;
        items?: Array<{
            name?: string | null;
            portion?: string | null;
        }>;
    }>;
};

type WorkoutScheduleDay = {
    day_index: number;
    day_label?: string | null;
    session_type?: string | null;
    focus?: string | null;
    duration_min?: number | null;
    location?: string | null;
    exercises?: Array<{
        name?: string | null;
        sets?: number | null;
        reps?: string | null;
        rest_sec?: number | null;
        equipment?: string | null;
        safer_alternative?: string | null;
    }>;
};

type LitePlan = {
    id: number;
    name: string;
    goal?: string | null;
    start_date?: string | null;
    duration_days?: number | null;
    ai_request?: PlanSource | null;
};

type ProfileConstraints = {
    dietary_goal?: string | null;
    fitness_goal?: string | null;
    diet_type?: string | null;
    allergies?: string[];
    medical_conditions?: string[];
    injury_history?: string[];
    available_equipment?: string[];
    preferred_workout_days?: string[];
    workout_days_per_week?: number | null;
    workout_location?: string | null;
};

type PageProps = {
    generation?: PlannerGeneration | null;
    nutritionPlan?: LitePlan | null;
    workoutPlan?: LitePlan | null;
    profileConstraints?: ProfileConstraints | null;
    defaults: {
        provider: string;
        model?: string | null;
        plan_horizon_days: number;
        prompt_version: string;
        schema_version: string;
    };
};

function sourceLabel(source?: { provider?: string | null; model?: string | null } | null) {
    const provider = source?.provider?.trim();
    const model = source?.model?.trim();

    if (!provider && !model) return 'Model unavailable';
    if (!provider) return model ?? 'Model unavailable';
    if (!model) return provider;

    return `${provider} - ${model}`;
}

function clampPlanHorizonDays(days: number) {
    if (days <= 14) return 14;
    if (days <= 21) return 21;
    return 28;
}

export default function AiPlannerPage() {
    const { generation, nutritionPlan, workoutPlan, defaults, profileConstraints } =
        usePage<PageProps>().props;

    const [planHorizonDays, setPlanHorizonDays] = useState<number>(
        clampPlanHorizonDays(defaults.plan_horizon_days ?? 7),
    );
    const [generating, setGenerating] = useState(false);
    const [status, setStatus] = useState<{
        tone: 'success' | 'danger';
        message: string;
    } | null>(null);

    const plan = generation?.plan ?? null;

    const summaryCards = useMemo(
        () => [
            {
                label: 'Planner source',
                value: sourceLabel({
                    provider: generation?.provider ?? defaults.provider,
                    model: generation?.model ?? defaults.model,
                }),
            },
            {
                label: 'Generation version',
                value: generation ? `v${generation.version}` : 'No plan yet',
            },
            {
                label: 'AI request',
                value: generation?.ai_request_id
                    ? `#${generation.ai_request_id}`
                    : 'Pending first run',
            },
            {
                label: 'Schema',
                value: generation?.schema_version ?? defaults.schema_version,
            },
        ],
        [defaults.model, defaults.provider, defaults.schema_version, generation],
    );

    const generatePlan = async () => {
        setGenerating(true);
        setStatus(null);

        try {
            await axios.post('/api/ai/plan', {
                regenerate: true,
                reason: 'planner_page_manual_generation',
                plan_horizon_days: planHorizonDays,
            });

            setStatus({
                tone: 'success',
                message: 'Plan generated successfully. Reloading the latest version now.',
            });
            router.reload({
                only: ['generation', 'nutritionPlan', 'workoutPlan'],
            });
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) &&
                typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : 'Could not generate a new plan right now.';

            setStatus({ tone: 'danger', message });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Head title="AI Planner" />

            <ProductPageShell width="wide" className="space-y-8">
                <ProductHero
                    eyebrow="AI Planner"
                    title="Your generated diet and workout system"
                    description="This page is the canonical view of the AI-generated plan: the model used, the safety boundaries it respected, the weekly meal and workout structure, and the review hooks we can build on later."
                    meta={
                        <div className="space-y-3 text-sm">
                            <div className="font-medium text-foreground">
                                {sourceLabel({
                                    provider: generation?.provider ?? defaults.provider,
                                    model: generation?.model ?? defaults.model,
                                })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="haye-chip">
                                    Prompt {generation?.prompt_version ?? defaults.prompt_version}
                                </span>
                                <span className="haye-chip">
                                    Schema {generation?.schema_version ?? defaults.schema_version}
                                </span>
                                <span className="haye-chip">{planHorizonDays}-day plan length</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Plan length is your check-in window: after this many days we review progress and decide whether to adjust.
                            </div>
                            {generation?.usage?.total_tokens ? (
                                <div className="text-xs text-muted-foreground">
                                    Total tokens used: {generation.usage.total_tokens}
                                </div>
                            ) : null}
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground">
                                <span>Plan length</span>
                                <select
                                    value={planHorizonDays}
                                    onChange={(event) =>
                                        setPlanHorizonDays(clampPlanHorizonDays(Number(event.target.value)))
                                    }
                                    className="rounded-xl border border-border/70 bg-card px-2 py-1 text-sm"
                                >
                                    {[14, 21, 28].map((days) => (
                                        <option key={days} value={days}>
                                            {days} days
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-muted-foreground">check-in window</span>
                            </label>

                            <button
                                type="button"
                                onClick={generatePlan}
                                disabled={generating}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`}
                                />
                                {generation ? 'Regenerate plan' : 'Generate plan'}
                            </button>

                            <Link
                                href="/track-meals"
                                className="inline-flex h-11 items-center rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground no-underline transition hover:bg-card"
                            >
                                Track meals
                            </Link>
                            <Link
                                href="/workouts/log"
                                className="inline-flex h-11 items-center rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground no-underline transition hover:bg-card"
                            >
                                Workout log
                            </Link>
                        </div>
                    }
                />

                {status ? (
                    <ProductBanner tone={status.tone}>{status.message}</ProductBanner>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="haye-panel rounded-[26px] p-5">
                            <div className="haye-kicker">{card.label}</div>
                            <div className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                                {card.value}
                            </div>
                        </div>
                    ))}
                </div>

                {!plan ? (
                    <ProductEmptyState
                        title="No AI plan has been generated yet"
                        description="Generate the first plan here, then the meal tracker, workout planner, workout log, and dashboard will all open in plan-first mode automatically."
                        action={
                            <button
                                type="button"
                                onClick={generatePlan}
                                disabled={generating}
                                className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                            >
                                {generating ? 'Generating...' : 'Generate my plan'}
                            </button>
                        }
                    />
                ) : (
                    <>
                        <ProductSection
                            title="Profile Constraints Used"
                            description="These are the saved profile inputs the planner should respect before generating any meals or workouts."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <SimpleListCard
                                    title="Goals and diet"
                                    items={[
                                        profileConstraints?.dietary_goal
                                            ? `Dietary goal: ${profileConstraints.dietary_goal}`
                                            : 'Dietary goal: not set',
                                        profileConstraints?.fitness_goal
                                            ? `Fitness goal: ${profileConstraints.fitness_goal}`
                                            : 'Fitness goal: not set',
                                        profileConstraints?.diet_type
                                            ? `Diet type: ${profileConstraints.diet_type}`
                                            : 'Diet type: not set',
                                    ]}
                                />
                                <SimpleListCard
                                    title="Workout preferences"
                                    items={[
                                        profileConstraints?.workout_location
                                            ? `Location: ${profileConstraints.workout_location}`
                                            : 'Location: not set',
                                        profileConstraints?.workout_days_per_week
                                            ? `Days per week: ${profileConstraints.workout_days_per_week}`
                                            : 'Days per week: not set',
                                        profileConstraints?.preferred_workout_days?.length
                                            ? `Preferred days: ${profileConstraints.preferred_workout_days.join(', ')}`
                                            : 'Preferred days: not set',
                                    ]}
                                />
                                <SimpleListCard
                                    title="Safety constraints"
                                    items={
                                        profileConstraints?.allergies?.length
                                            ? profileConstraints.allergies.map((item) => `Allergy: ${item}`)
                                            : ['No allergies saved.']
                                    }
                                />
                                <SimpleListCard
                                    title="Medical and equipment"
                                    items={[
                                        ...(profileConstraints?.medical_conditions?.length
                                            ? profileConstraints.medical_conditions.map(
                                                  (item) => `Medical condition: ${item}`,
                                              )
                                            : ['No medical conditions saved.']),
                                        ...(profileConstraints?.injury_history?.length
                                            ? profileConstraints.injury_history.map(
                                                  (item) => `Injury history: ${item}`,
                                              )
                                            : ['No injury history saved.']),
                                        ...(profileConstraints?.available_equipment?.length
                                            ? [
                                                  `Available equipment: ${profileConstraints.available_equipment.join(', ')}`,
                                              ]
                                            : ['No equipment saved.']),
                                    ]}
                                />
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Overview and safety"
                            description="These are the constraints and guardrails the planner used before it produced meals and workouts."
                        >
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-lg font-semibold text-foreground">
                                        {plan.overview?.summary ?? 'Structured weekly plan'}
                                    </div>
                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Constraints
                                            </div>
                                            <ul className="mt-2 space-y-2 text-sm text-foreground">
                                                {(plan.overview?.key_constraints ?? []).map((item) => (
                                                    <li key={item}>- {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Assumptions
                                            </div>
                                            <ul className="mt-2 space-y-2 text-sm text-foreground">
                                                {(plan.overview?.assumptions ?? []).map((item) => (
                                                    <li key={item}>- {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SafetyCard
                                        title="Hard rules observed"
                                        items={plan.safety?.hard_rules_observed ?? []}
                                    />
                                    <SafetyCard
                                        title="Food avoidances"
                                        items={plan.safety?.food_avoidances ?? []}
                                    />
                                    <SafetyCard
                                        title="Exercise cautions"
                                        items={plan.safety?.exercise_cautions ?? []}
                                    />
                                </div>
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Diet structure"
                            description="This is the structured diet output that later feeds planned meals and adherence review."
                        >
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                <div className="space-y-4">
                                    <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                        <div className="text-lg font-semibold text-foreground">
                                            Daily targets
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            {Object.entries(plan.diet?.daily_targets ?? {}).map(
                                                ([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="rounded-[20px] border border-border/70 bg-card/80 p-3"
                                                    >
                                                        <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                            {key.replaceAll('_', ' ')}
                                                        </div>
                                                        <div className="mt-2 text-lg font-semibold text-foreground">
                                                            {String(value)}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {(plan.diet?.days ?? []).slice(0, 4).map((day) => (
                                            <div
                                                key={day.day_index}
                                                className="rounded-[24px] border border-border/70 bg-background/72 p-4"
                                            >
                                                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Day {day.day_index}
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-foreground">
                                                    {day.theme ?? 'Balanced day'}
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    {(day.meals ?? []).map((meal, index) => (
                                                        <div
                                                            key={`${day.day_index}-${meal.meal_code}-${index}`}
                                                            className="rounded-[20px] border border-border/60 bg-card/80 p-3"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="font-medium text-foreground">
                                                                    {meal.title ?? meal.meal_code ?? 'Meal'}
                                                                </div>
                                                                {meal.target_kcal ? (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {meal.target_kcal} kcal
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                                                                {(meal.items ?? []).map((item, itemIndex) => (
                                                                    <li key={`${meal.title}-${item.name}-${itemIndex}`}>
                                                                        <span className="font-medium text-foreground">
                                                                            {item.name}
                                                                        </span>
                                                                        {item.portion ? ` - ${item.portion}` : ''}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SimpleListCard
                                        title="Grocery list"
                                        items={(plan.diet?.grocery_list ?? []).map(
                                            (item) =>
                                                `${item.category ? `${item.category}: ` : ''}${item.name ?? 'Item'}${item.quantity ? ` (${item.quantity})` : ''}`,
                                        )}
                                    />
                                    <SimpleListCard
                                        title="Meal prep notes"
                                        items={plan.diet?.meal_prep_notes ?? []}
                                    />
                                    <SimpleListCard
                                        title="Adherence notes"
                                        items={plan.diet?.adherence_notes ?? []}
                                    />
                                </div>
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Workout structure"
                            description="The workout side stays read-first here so the planner page feels different from the manual builder."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                {(plan.workout?.weekly_schedule ?? []).map((day) => (
                                    <div
                                        key={`${day.day_index}-${day.focus}`}
                                        className="rounded-[24px] border border-border/70 bg-background/72 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Day {day.day_index}
                                                    {day.day_label ? ` - ${day.day_label}` : ''}
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-foreground">
                                                    {day.focus ?? 'Workout day'}
                                                </div>
                                            </div>
                                            <div className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs text-muted-foreground">
                                                {day.session_type ?? 'session'}
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            {day.location ? (
                                                <span className="haye-chip">{day.location}</span>
                                            ) : null}
                                            {day.duration_min ? (
                                                <span className="haye-chip">{day.duration_min} min</span>
                                            ) : null}
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            {(day.exercises ?? []).length ? (
                                                (day.exercises ?? []).map((exercise, index) => (
                                                    <div
                                                        key={`${day.day_index}-${exercise.name}-${index}`}
                                                        className="rounded-[20px] border border-border/60 bg-card/80 p-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="font-medium text-foreground">
                                                                {exercise.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {exercise.sets ?? 0} sets
                                                                {exercise.reps ? ` - ${exercise.reps}` : ''}
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                            {exercise.equipment ? `${exercise.equipment} - ` : ''}
                                                            {exercise.rest_sec ? `${exercise.rest_sec}s rest` : 'Controlled pace'}
                                                        </div>
                                                        {exercise.safer_alternative ? (
                                                            <div className="mt-2 text-xs text-foreground/80">
                                                                Safer alternative: {exercise.safer_alternative}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="rounded-[20px] border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                                    Rest or recovery day.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                <SimpleListCard
                                    title="Progression rules"
                                    items={plan.workout?.progression_rules ?? []}
                                />
                                <SimpleListCard
                                    title="Recovery rules"
                                    items={plan.workout?.recovery_rules ?? []}
                                />
                                <SimpleListCard
                                    title="Coach notes"
                                    items={plan.workout?.coach_notes ?? []}
                                />
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Adaptive review readiness"
                            description="These fields are already structured so weekly review and replanning can plug into them later."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                        Review after
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-foreground">
                                        {plan.adaptive_review?.review_after_days ?? 7} days
                                    </div>
                                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                                        {(plan.adaptive_review?.checkpoints ?? []).map((item) => (
                                            <li key={item}>- {item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <SimpleListCard
                                        title="Replanning triggers"
                                        items={plan.adaptive_review?.replanning_triggers ?? []}
                                    />
                                    <SimpleListCard
                                        title="Next data to collect"
                                        items={plan.adaptive_review?.next_data_to_collect ?? []}
                                    />
                                </div>
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Progress Prediction"
                            description="Projected body-weight and strength trend for this check-in window, auto-adjusted from prior outcomes."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <SimpleListCard
                                    title="Weight projection"
                                    items={[
                                        `Baseline: ${plan.progress_prediction?.baseline_weight_kg ?? '-'} kg`,
                                        `Expected change: ${plan.progress_prediction?.expected_weight_change_kg ?? '-'} kg`,
                                        `Projected weight: ${plan.progress_prediction?.projected_body_weight_kg ?? '-'} kg`,
                                        `Confidence: ${plan.progress_prediction?.confidence ?? 'n/a'}`,
                                    ]}
                                />
                                <SimpleListCard
                                    title="Strength projection"
                                    items={[
                                        `Upper compounds: ${plan.progress_prediction?.strength_projection?.upper_body_compound_pct ?? '-'}%`,
                                        `Lower compounds: ${plan.progress_prediction?.strength_projection?.lower_body_compound_pct ?? '-'}%`,
                                        `Model: ${plan.progress_prediction?.model_name ?? 'n/a'}`,
                                        `Horizon: ${plan.progress_prediction?.horizon_days ?? planHorizonDays} days`,
                                    ]}
                                />
                                <SimpleListCard
                                    title="Feedback adjustment"
                                    items={[
                                        `Base weekly weight change: ${plan.progress_prediction?.feedback_adjustment?.base_weekly_weight_change_kg ?? '-'} kg`,
                                        `Adjusted weekly change: ${plan.progress_prediction?.feedback_adjustment?.adjusted_weekly_weight_change_kg ?? '-'} kg`,
                                        `Last prediction error: ${plan.progress_prediction?.feedback_adjustment?.last_prediction_error_kg_per_week ?? '-'} kg/week`,
                                        plan.progress_prediction?.feedback_adjustment?.notes ??
                                            'Prediction updates as you log real results.',
                                    ]}
                                />
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="ML experiment lane"
                            description="The LLM is the core planner. This optional lane is where lightweight regression or ranking experiments can live later."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <SimpleListCard
                                    title="Candidate features"
                                    items={plan.ml_readiness?.candidate_features ?? []}
                                />
                                <SimpleListCard
                                    title="Candidate targets"
                                    items={plan.ml_readiness?.candidate_targets ?? []}
                                />
                                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-lg font-semibold text-foreground">
                                        Why it stays optional
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-foreground">
                                        {plan.ml_readiness?.notes ??
                                            'Collected project data can later support a small regression or ranking experiment, but the LLM remains the primary planning engine.'}
                                    </p>
                                </div>
                            </div>
                        </ProductSection>
                    </>
                )}

                <ProductStickyActions>
                    <div className="mr-auto flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>Active nutrition: {sourceLabel(nutritionPlan?.ai_request)}</span>
                        <span>-</span>
                        <span>Active workout: {sourceLabel(workoutPlan?.ai_request)}</span>
                    </div>
                    <Link
                        href="/track-meals"
                        className="inline-flex h-10 items-center rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground no-underline transition hover:bg-card"
                    >
                        Follow meal plan
                    </Link>
                    <Link
                        href="/workouts/plan"
                        className="inline-flex h-10 items-center rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground no-underline transition hover:bg-card"
                    >
                        Open workout planner
                    </Link>
                    <button
                        type="button"
                        onClick={generatePlan}
                        disabled={generating}
                        className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {generating ? 'Generating...' : 'Regenerate'}
                    </button>
                </ProductStickyActions>
            </ProductPageShell>
        </>
    );
}

function SafetyCard({ title, items }: { title: string; items: string[] }) {
    return <SimpleListCard title={title} items={items} />;
}

function SimpleListCard({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
            <div className="text-lg font-semibold text-foreground">{title}</div>
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

