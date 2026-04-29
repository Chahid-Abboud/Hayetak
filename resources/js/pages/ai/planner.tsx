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
    ProductModeButton,
} from '@/components/product/product-ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type PlannerGeneration = {
    ok: boolean;
    generation_id?: string | null;
    version?: number | null;
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
        meal_options?: DietMealOptions;
        days?: DietDay[];
        grocery_list?: Array<{
            category?: string | null;
            name?: string | null;
            quantity?: string | null;
        }>;
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
    progress_prediction?: {
        horizon_days?: number | null;
        baseline_weight_kg?: number | null;
        expected_weight_change_kg?: number | null;
        projected_body_weight_kg?: number | null;
        strength_projection?: {
            upper_body_compound_pct?: number | null;
            lower_body_compound_pct?: number | null;
        };
        feedback_adjustment?: {
            base_weekly_weight_change_kg?: number | null;
            adjusted_weekly_weight_change_kg?: number | null;
            notes?: string | null;
        };
    };
};

type DietMealItem = {
    name?: string | null;
    portion?: string | null;
    calories_kcal?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
};

type DietMeal = {
    meal_code?: string | null;
    title?: string | null;
    target_kcal?: number | null;
    items?: DietMealItem[];
};

type DietMealOption = {
    title?: string | null;
    target_kcal?: number | null;
    items?: DietMealItem[];
};

type DietMealOptions = Partial<
    Record<'breakfast' | 'lunch' | 'dinner' | 'snack', DietMealOption[]>
>;

type DietDay = {
    day_index: number;
    theme?: string | null;
    meals?: DietMeal[];
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

type PlannerAuditRunState = {
    id: number;
    status: 'queued' | 'running' | 'completed' | 'failed';
    gpu_load: 'low' | 'medium' | 'high';
    execution_mode: 'standard' | 'fast-fallback' | 'live';
    horizon_days: number[];
    total_users: number;
    total_runs: number;
    completed_runs: number;
    success_runs: number;
    failed_runs: number;
    percent_complete: number;
    current_user_id?: number | null;
    current_user_email?: string | null;
    current_horizon_days?: number | null;
    average_run_ms?: number | null;
    eta_seconds?: number | null;
    eta_updated_at?: string | null;
    next_eta_update_at?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
    report_paths?: {
        json?: string | null;
        md?: string | null;
    } | null;
    summary?: {
        report_base?: string | null;
        scope?: string | null;
        horizons?: number[];
        total_users?: number;
        runs_total?: number;
        runs_completed?: number;
        runs_success?: number;
        runs_failed?: number;
        success_percentage?: number;
        average_quality_percentage?: number;
    } | null;
    last_error?: string | null;
};

type AuditGpuLoad = 'low' | 'medium' | 'high';

type PageProps = {
    generation?: PlannerGeneration | null;
    nutritionPlan?: LitePlan | null;
    workoutPlan?: LitePlan | null;
    profileConstraints?: ProfileConstraints | null;
    isAdmin: boolean;
    latestAuditRun?: PlannerAuditRunState | null;
    defaults: {
        plan_horizon_days: number;
    };
};

function planStatusLabel(plan?: LitePlan | null) {
    return plan ? 'Ready' : 'Not ready';
}

function safetyProfileLabel(profile?: ProfileConstraints | null) {
    const hasSafetyInputs = Boolean(
        profile?.allergies?.length ||
            profile?.medical_conditions?.length ||
            profile?.injury_history?.length ||
            profile?.diet_type,
    );

    return hasSafetyInputs ? 'Applied' : 'Basic';
}

function clampPlanHorizonDays(days: number) {
    if (days <= 14) return 14;
    if (days <= 21) return 21;
    return 28;
}

type PlannerAuditResult = {
    calorieIssues: string[];
    servingIssues: string[];
    safetyIssues: string[];
    varietyStats: Array<{
        mealCode: string;
        uniqueMeals: number;
        totalDays: number;
    }>;
};

type DietMealOptionGroup = {
    mealCode: string;
    title: string;
    options: Array<{
        key: string;
        title: string;
        targetKcal: number;
        caloriesKcal: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
        items: DietMealItem[];
        days: number[];
    }>;
};

function mealNameNeedlesByDietType(dietType: string) {
    const normalized = dietType.toLowerCase();

    if (normalized.includes('vegan')) {
        return [
            'chicken',
            'beef',
            'pork',
            'fish',
            'tuna',
            'egg',
            'yogurt',
            'milk',
            'cheese',
            'honey',
        ];
    }
    if (normalized.includes('vegetarian')) {
        return ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'];
    }
    if (normalized.includes('pescetarian')) {
        return ['chicken', 'beef', 'pork', 'lamb', 'turkey'];
    }

    return [];
}

function assessPlannerPlan(
    plan: PlannerPlan | null,
    profile?: ProfileConstraints | null,
): PlannerAuditResult {
    if (!plan?.diet?.days?.length) {
        return {
            calorieIssues: [],
            servingIssues: [],
            safetyIssues: [],
            varietyStats: [],
        };
    }

    const calorieIssues: string[] = [];
    const servingIssues: string[] = [];
    const safetyIssues: string[] = [];
    const mealNamesByCode = new Map<string, string[]>();

    for (const day of plan.diet.days ?? []) {
        for (const meal of day.meals ?? []) {
            const mealCode = (meal.meal_code ?? 'meal').toLowerCase();
            const target = Number(meal.target_kcal ?? 0);
            const itemCalories = (meal.items ?? []).reduce((total, item) => {
                const value = Number(item?.calories_kcal ?? 0);
                return Number.isFinite(value) ? total + value : total;
            }, 0);

            if (
                target > 0 &&
                itemCalories > 0 &&
                Math.abs(itemCalories - target) > Math.max(120, target * 0.35)
            ) {
                calorieIssues.push(
                    `Day ${day.day_index} ${mealCode}: target ${Math.round(
                        target,
                    )} kcal vs items ${Math.round(itemCalories)} kcal`,
                );
            }

            const firstItemName = (meal.items?.[0]?.name ?? '').trim();
            if (firstItemName !== '') {
                mealNamesByCode.set(mealCode, [
                    ...(mealNamesByCode.get(mealCode) ?? []),
                    firstItemName.toLowerCase(),
                ]);
            }

            for (const item of meal.items ?? []) {
                const portion = (item.portion ?? '').trim().toLowerCase();
                if (portion === '') continue;

                const amountMatch = portion.match(/(\d+(?:\.\d+)?)/);
                const amount = amountMatch ? Number(amountMatch[1]) : null;
                if (!amount || !Number.isFinite(amount)) continue;

                const isServingLike = portion.includes('serving');
                const hasMassUnit =
                    portion.includes('g') || portion.includes('ml');

                if (
                    (isServingLike && amount > 4) ||
                    (!hasMassUnit && amount > 4)
                ) {
                    servingIssues.push(
                        `Day ${day.day_index} ${(item.name ?? 'item').trim()}: portion "${item.portion}" looks too high`,
                    );
                }
            }
        }
    }

    const dietText = JSON.stringify(plan.diet).toLowerCase();
    for (const allergy of profile?.allergies ?? []) {
        const needle = allergy.trim().toLowerCase();
        if (needle !== '' && dietText.includes(needle)) {
            safetyIssues.push(`Contains allergy term: ${allergy}`);
        }
    }
    for (const blocked of mealNameNeedlesByDietType(profile?.diet_type ?? '')) {
        if (dietText.includes(blocked)) {
            safetyIssues.push(`Conflicts with diet type: ${blocked}`);
        }
    }

    const varietyStats = Array.from(mealNamesByCode.entries())
        .map(([mealCode, names]) => ({
            mealCode,
            uniqueMeals: new Set(names).size,
            totalDays: names.length,
        }))
        .sort((left, right) => left.mealCode.localeCompare(right.mealCode));

    return { calorieIssues, servingIssues, safetyIssues, varietyStats };
}

function humanizeMealCode(mealCode: string) {
    return mealCode.charAt(0).toUpperCase() + mealCode.slice(1);
}

function formatEta(seconds?: number | null) {
    if (seconds === null || seconds === undefined) return 'ETA pending';
    if (seconds <= 0) return 'Finishing now';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
    }
    if (minutes > 0) {
        return `${minutes}m remaining`;
    }

    return `${seconds}s remaining`;
}

function formatAverageRun(averageRunMs?: number | null) {
    if (!averageRunMs || averageRunMs <= 0) return 'Calculating pace';

    const seconds = Math.round(averageRunMs / 1000);
    if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return `${minutes}m ${remainder}s avg/run`;
    }

    return `${seconds}s avg/run`;
}

function formatTimestamp(iso?: string | null) {
    if (!iso) return 'Pending';

    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function auditExecutionModeLabel(
    mode: PlannerAuditRunState['execution_mode'] | null | undefined,
) {
    if (mode === 'fast-fallback') return 'Fast path';
    if (mode === 'live') return 'Direct generation';
    return 'Standard';
}

function buildDietMealOptionGroups(
    mealOptions?: DietMealOptions | null,
    days: DietDay[] = [],
): DietMealOptionGroup[] {
    const order = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

    if (mealOptions) {
        return order
            .map((mealCode) => ({
                mealCode,
                title: `${humanizeMealCode(mealCode)} options`,
                options: (mealOptions[mealCode] ?? [])
                    .map((option, index) => {
                        const items = (option.items ?? []).filter(
                            (item) => (item.name ?? '').trim() !== '',
                        );
                        if (items.length === 0) return null;

                        const signature =
                            items
                                .map(
                                    (item) =>
                                        `${(item.name ?? '').trim().toLowerCase()}|${(item.portion ?? '').trim().toLowerCase()}`,
                                )
                                .join('||') || `${mealCode}-${index}`;
                        const totalCalories = items.reduce(
                            (sum, item) =>
                                sum + Number(item.calories_kcal ?? 0),
                            0,
                        );
                        const titleSeed =
                            items.length === 1
                                ? items[0]?.name?.trim()
                                : (option.title ?? '').trim();
                        const title =
                            titleSeed &&
                            !/^(simple|structured|alternate)\b/i.test(titleSeed)
                                ? titleSeed
                                : items
                                      .map((item) => (item.name ?? '').trim())
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .join(' + ');

                        return {
                            key: signature,
                            title:
                                title || `${humanizeMealCode(mealCode)} option`,
                            targetKcal: Number(
                                option.target_kcal ?? totalCalories ?? 0,
                            ),
                            caloriesKcal: totalCalories,
                            proteinG: items.reduce(
                                (sum, item) =>
                                    sum + Number(item.protein_g ?? 0),
                                0,
                            ),
                            carbsG: items.reduce(
                                (sum, item) => sum + Number(item.carbs_g ?? 0),
                                0,
                            ),
                            fatG: items.reduce(
                                (sum, item) => sum + Number(item.fat_g ?? 0),
                                0,
                            ),
                            items,
                            days: [],
                        };
                    })
                    .filter(Boolean) as DietMealOptionGroup['options'],
            }))
            .filter((group) => group.options.length > 0);
    }

    const grouped = new Map<
        string,
        Map<string, DietMealOptionGroup['options'][number]>
    >();

    for (const day of days) {
        for (const meal of day.meals ?? []) {
            const mealCode = (meal.meal_code ?? 'snack').trim().toLowerCase();
            const items = (meal.items ?? []).filter(
                (item) => (item.name ?? '').trim() !== '',
            );
            if (items.length === 0) continue;

            const signature = items
                .map(
                    (item) =>
                        `${(item.name ?? '').trim().toLowerCase()}|${(item.portion ?? '').trim().toLowerCase()}`,
                )
                .join('||');
            const totalCalories = items.reduce(
                (sum, item) => sum + Number(item.calories_kcal ?? 0),
                0,
            );
            const titleSeed =
                items.length === 1
                    ? items[0]?.name?.trim()
                    : (meal.title ?? '').trim();
            const title =
                titleSeed &&
                !/^(simple|structured|alternate)\b/i.test(titleSeed)
                    ? titleSeed
                    : items
                          .map((item) => (item.name ?? '').trim())
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(' + ');

            const byMeal = grouped.get(mealCode) ?? new Map();
            const existing = byMeal.get(signature);
            if (existing) {
                existing.days = Array.from(
                    new Set([...existing.days, day.day_index]),
                ).sort((left, right) => left - right);
                continue;
            }

            byMeal.set(signature, {
                key: signature,
                title: title || `${humanizeMealCode(mealCode)} option`,
                targetKcal: Number(meal.target_kcal ?? totalCalories ?? 0),
                caloriesKcal: totalCalories,
                proteinG: items.reduce(
                    (sum, item) => sum + Number(item.protein_g ?? 0),
                    0,
                ),
                carbsG: items.reduce(
                    (sum, item) => sum + Number(item.carbs_g ?? 0),
                    0,
                ),
                fatG: items.reduce(
                    (sum, item) => sum + Number(item.fat_g ?? 0),
                    0,
                ),
                items,
                days: [day.day_index],
            });
            grouped.set(mealCode, byMeal);
        }
    }

    return order
        .map((mealCode) => ({
            mealCode,
            title: `${humanizeMealCode(mealCode)} options`,
            options: Array.from(grouped.get(mealCode)?.values() ?? []).sort(
                (left, right) => left.days[0] - right.days[0],
            ),
        }))
        .filter((group) => group.options.length > 0);
}

export default function AiPlannerPage() {
    const {
        generation,
        nutritionPlan,
        workoutPlan,
        defaults,
        profileConstraints,
        isAdmin,
        latestAuditRun,
    } = usePage<PageProps>().props;

    const [planHorizonDays, setPlanHorizonDays] = useState<number>(
        clampPlanHorizonDays(defaults.plan_horizon_days ?? 7),
    );
    const [generateDiet, setGenerateDiet] = useState(true);
    const [generateWorkout, setGenerateWorkout] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [status, setStatus] = useState<{
        tone: 'success' | 'danger';
        message: string;
    } | null>(null);
    const [auditDialogOpen, setAuditDialogOpen] = useState(false);
    const [auditGpuLoad, setAuditGpuLoad] = useState<AuditGpuLoad>('low');
    const [auditExecutionMode, setAuditExecutionMode] = useState<
        'standard' | 'fast-fallback' | 'live'
    >(latestAuditRun?.execution_mode ?? 'standard');
    const [auditSubmitting, setAuditSubmitting] = useState(false);
    const [auditLoadUpdating, setAuditLoadUpdating] = useState(false);
    const [auditStatus, setAuditStatus] = useState<{
        tone: 'success' | 'danger';
        message: string;
    } | null>(null);
    const [auditRun, setAuditRun] = useState<PlannerAuditRunState | null>(
        latestAuditRun ?? null,
    );
    const [lastPromptedAuditId, setLastPromptedAuditId] = useState<
        number | null
    >(null);

    const plan = generation?.plan ?? null;

    useEffect(() => {
        setAuditRun(latestAuditRun ?? null);
        setAuditExecutionMode(latestAuditRun?.execution_mode ?? 'standard');
    }, [latestAuditRun]);

    useEffect(() => {
        if (!auditDialogOpen) return;

        if (auditRun && ['queued', 'running'].includes(auditRun.status)) {
            setAuditGpuLoad(auditRun.gpu_load);
            setAuditExecutionMode(auditRun.execution_mode);

            return;
        }

        setAuditGpuLoad('low');
        setAuditExecutionMode(latestAuditRun?.execution_mode ?? 'standard');
    }, [auditDialogOpen, auditRun, latestAuditRun?.execution_mode]);

    const summaryCards = useMemo(
        () => [
            {
                label: 'Nutrition plan',
                value: planStatusLabel(nutritionPlan),
            },
            {
                label: 'Workout plan',
                value: planStatusLabel(workoutPlan),
            },
            {
                label: 'Current cycle',
                value: `${planHorizonDays} days`,
            },
            {
                label: 'Safety profile',
                value: safetyProfileLabel(profileConstraints),
            },
        ],
        [nutritionPlan, workoutPlan, planHorizonDays, profileConstraints],
    );

    const planAudit = useMemo(
        () => assessPlannerPlan(plan, profileConstraints),
        [plan, profileConstraints],
    );
    const mealOptionGroups = useMemo(
        () =>
            buildDietMealOptionGroups(
                plan?.diet?.meal_options,
                plan?.diet?.days ?? [],
            ),
        [plan],
    );
    const currentAuditId = auditRun?.id ?? null;
    const currentAuditStatus = auditRun?.status ?? null;
    const auditIsActive = Boolean(
        auditRun && ['queued', 'running'].includes(auditRun.status),
    );

    useEffect(() => {
        if (!auditRun || !['queued', 'running'].includes(auditRun.status))
            return;
        if (lastPromptedAuditId === auditRun.id) return;

        setAuditGpuLoad(auditRun.gpu_load);
        setAuditExecutionMode(auditRun.execution_mode);
        setAuditDialogOpen(true);
        setLastPromptedAuditId(auditRun.id);
    }, [auditRun, lastPromptedAuditId]);

    useEffect(() => {
        if (!isAdmin || currentAuditId === null) return;
        if (
            !currentAuditStatus ||
            !['queued', 'running'].includes(currentAuditStatus)
        )
            return;

        let cancelled = false;

        const refreshAudit = async () => {
            try {
                const response = await axios.get(
                    `/api/ai/planner-audits/${currentAuditId}`,
                );
                if (!cancelled && response.data?.audit) {
                    const nextAudit = response.data
                        .audit as PlannerAuditRunState;
                    setAuditRun(nextAudit);
                    if (['queued', 'running'].includes(nextAudit.status)) {
                        setAuditGpuLoad(nextAudit.gpu_load);
                    }
                }
            } catch {
                // Keep the last known status visible if polling fails briefly.
            }
        };

        void refreshAudit();
        const intervalId = window.setInterval(() => {
            void refreshAudit();
        }, 30000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [currentAuditId, currentAuditStatus, isAdmin]);

    const generatePlan = async () => {
        if (!generateDiet && !generateWorkout) {
            setStatus({
                tone: 'danger',
                message: 'Select diet, workout, or both before generating.',
            });

            return;
        }

        setGenerating(true);
        setStatus(null);

        try {
            await axios.post('/api/ai/plan', {
                regenerate: true,
                reason: 'planner_page_manual_generation',
                plan_horizon_days: planHorizonDays,
                generate_diet: generateDiet,
                generate_workout: generateWorkout,
            });

            setStatus({
                tone: 'success',
                message:
                    generateDiet && generateWorkout
                        ? 'Diet and workout generated successfully. Reloading the latest version now.'
                        : generateDiet
                          ? 'Diet generated successfully. Reloading the latest version now.'
                          : 'Workout generated successfully. Reloading the latest version now.',
            });
            router.reload({
                only: [
                    'generation',
                    'nutritionPlan',
                    'workoutPlan',
                    'latestAuditRun',
                ],
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

    const startAudit = async () => {
        if (!isAdmin) return;

        setAuditSubmitting(true);
        setAuditStatus(null);

        try {
            const response = await axios.post('/api/ai/planner-audits', {
                gpu_load: auditGpuLoad,
                execution_mode: auditExecutionMode,
                horizons: [14, 21, 28],
            });

            const nextAudit = response.data
                ?.audit as PlannerAuditRunState | null;
            setAuditRun(nextAudit);
            if (nextAudit) {
                setAuditGpuLoad(nextAudit.gpu_load);
                setAuditExecutionMode(nextAudit.execution_mode);
            }
            setAuditDialogOpen(true);
            setAuditStatus({
                tone: 'success',
                message:
                    'Planner audit queued for all non-admin users. The workload control popup will stay available while the run is active.',
            });
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) &&
                typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : 'Could not start the planner audit right now.';

            setAuditStatus({ tone: 'danger', message });
        } finally {
            setAuditSubmitting(false);
        }
    };

    const updateAuditGpuLoad = async (nextGpuLoad?: AuditGpuLoad) => {
        if (!isAdmin || currentAuditId === null || !auditIsActive) return;

        const requestedGpuLoad = nextGpuLoad ?? auditGpuLoad;
        setAuditLoadUpdating(true);
        setAuditStatus(null);

        try {
            const response = await axios.patch(
                `/api/ai/planner-audits/${currentAuditId}`,
                {
                    gpu_load: requestedGpuLoad,
                },
            );

            const nextAudit = response.data
                ?.audit as PlannerAuditRunState | null;
            setAuditRun(nextAudit);
            if (nextAudit) {
                setAuditGpuLoad(nextAudit.gpu_load);
            }
            setAuditStatus({
                tone: 'success',
                message:
                    typeof response.data?.message === 'string'
                        ? response.data.message
                        : 'Planner audit workload updated.',
            });
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) &&
                typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : 'Could not update the planner audit workload right now.';

            setAuditStatus({ tone: 'danger', message });
        } finally {
            setAuditLoadUpdating(false);
        }
    };

    return (
        <>
            <Head title="AI Planner" />

            <ProductPageShell width="wide">
                <ProductHero
                    eyebrow="AI Planner"
                    title="Your generated diet and workout system"
                    description="Review your plan, confirm safety constraints, and move directly into daily execution."
                    meta={
                        <div className="space-y-3 text-sm">
                            <div className="font-medium text-foreground">
                                {nutritionPlan?.name ??
                                    workoutPlan?.name ??
                                    'No generated plan yet'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="haye-chip">
                                    {planHorizonDays}-day cycle
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                After each cycle, review your progress and
                                regenerate if needed.
                            </div>
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground">
                                <span>Plan length</span>
                                <select
                                    value={planHorizonDays}
                                    onChange={(event) =>
                                        setPlanHorizonDays(
                                            clampPlanHorizonDays(
                                                Number(event.target.value),
                                            ),
                                        )
                                    }
                                    className="rounded-xl border border-border/70 bg-card px-2 py-1 text-sm"
                                >
                                    {[14, 21, 28].map((days) => (
                                        <option key={days} value={days}>
                                            {days} days
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-muted-foreground">
                                    check-in window
                                </span>
                            </label>

                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground">
                                <span className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Generate
                                </span>
                                <ProductModeButton
                                    active={generateDiet}
                                    onClick={() =>
                                        setGenerateDiet((current) => !current)
                                    }
                                    className="h-9 px-3 text-xs"
                                >
                                    Diet
                                </ProductModeButton>
                                <ProductModeButton
                                    active={generateWorkout}
                                    onClick={() =>
                                        setGenerateWorkout(
                                            (current) => !current,
                                        )
                                    }
                                    className="h-9 px-3 text-xs"
                                >
                                    Workout
                                </ProductModeButton>
                            </div>

                            <ProductButton
                                type="button"
                                onClick={generatePlan}
                                disabled={
                                    generating ||
                                    (!generateDiet && !generateWorkout)
                                }
                                className="gap-2"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`}
                                />
                                {generation
                                    ? generateDiet && generateWorkout
                                        ? 'Regenerate both'
                                        : generateDiet
                                          ? 'Regenerate diet'
                                          : generateWorkout
                                            ? 'Regenerate workout'
                                            : 'Choose plan type'
                                    : generateDiet && generateWorkout
                                      ? 'Generate plan'
                                      : generateDiet
                                        ? 'Generate diet'
                                        : generateWorkout
                                          ? 'Generate workout'
                                          : 'Choose plan type'}
                            </ProductButton>

                            <ProductButton asChild emphasis="secondary">
                                <Link href="/track-meals">Track meals</Link>
                            </ProductButton>
                            <ProductButton asChild emphasis="secondary">
                                <Link href="/workouts/log">Workout log</Link>
                            </ProductButton>
                        </div>
                    }
                />

                {status ? (
                    <ProductBanner
                        tone={status.tone}
                        role={status.tone === 'danger' ? 'alert' : 'status'}
                    >
                        {status.message}
                    </ProductBanner>
                ) : null}

                <ProductStatGrid>
                    {summaryCards.map((card) => (
                        <ProductStatCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                        />
                    ))}
                </ProductStatGrid>

                {isAdmin ? (
                    <ProductSection
                        title="Admin triage"
                        description="For moderation and reliability work, check planner status first, then open coach or logs only when follow-up is needed."
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            <SimpleListCard
                                title="Primary checks"
                                items={[
                                    'Verify safety and schema signals before reviewing raw payloads.',
                                    'Treat failed runs and safety blocks as highest-priority items.',
                                    'Use the audit runner for system-level quality checks.',
                                ]}
                            />
                            <SimpleListCard
                                title="Escalation path"
                                items={[
                                    'Planner issue -> inspect planner audit details.',
                                    'Conversation safety issue -> open AI Coach context.',
                                    'Traceability requirement -> open Audit Logs.',
                                ]}
                            />
                            <SimpleListCard
                                title="Workspace discipline"
                                items={[
                                    'Keep this page focused on generation quality.',
                                    'Avoid mixing broad debug payloads into routine plan review.',
                                    'Use dedicated diagnostics surfaces for deep technical traces.',
                                ]}
                            />
                        </div>
                    </ProductSection>
                ) : null}

                {plan ? (
                    <ProductSection
                        title="Plan review"
                        description="Run a quick safety and realism check before you start the cycle."
                    >
                        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                            <SimpleListCard
                                title="Calorie consistency"
                                items={
                                    planAudit.calorieIssues.length
                                        ? planAudit.calorieIssues
                                              .slice(0, 3)
                                              .concat(
                                                  planAudit.calorieIssues
                                                      .length > 3
                                                      ? [
                                                            `${planAudit.calorieIssues.length - 3} more checks need review.`,
                                                        ]
                                                      : [],
                                              )
                                        : ['No major calorie mismatch found.']
                                }
                            />
                            <SimpleListCard
                                title="Serving checks"
                                items={
                                    planAudit.servingIssues.length
                                        ? planAudit.servingIssues
                                              .slice(0, 3)
                                              .concat(
                                                  planAudit.servingIssues
                                                      .length > 3
                                                      ? [
                                                            `${planAudit.servingIssues.length - 3} more portion checks need review.`,
                                                        ]
                                                      : [],
                                              )
                                        : ['Serving amounts look realistic.']
                                }
                            />
                            <SimpleListCard
                                title="Meal variety"
                                items={
                                    planAudit.varietyStats.length
                                        ? planAudit.varietyStats.map(
                                              (entry) =>
                                                  `${entry.mealCode}: ${entry.uniqueMeals} unique options across ${entry.totalDays} days`,
                                          )
                                        : ['No meal variety data yet.']
                                }
                            />
                            <SimpleListCard
                                title="Profile safety"
                                items={
                                    planAudit.safetyIssues.length
                                        ? planAudit.safetyIssues
                                        : [
                                              'No obvious allergy or diet-type conflict was detected.',
                                          ]
                                }
                            />
                        </div>
                    </ProductSection>
                ) : null}

                {!plan ? (
                    <ProductEmptyState
                        title="No AI plan has been generated yet"
                        description="Generate your first plan to unlock meal and workout follow mode."
                        action={
                            <button
                                type="button"
                                onClick={generatePlan}
                                disabled={
                                    generating ||
                                    (!generateDiet && !generateWorkout)
                                }
                                className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                            >
                                {generating
                                    ? 'Generating...'
                                    : generateDiet && generateWorkout
                                      ? 'Generate my plan'
                                      : generateDiet
                                        ? 'Generate diet'
                                        : generateWorkout
                                          ? 'Generate workout'
                                          : 'Choose plan type'}
                            </button>
                        }
                    />
                ) : (
                    <>
                        <ProductSection
                            title="Profile Constraints Used"
                            description="Saved profile inputs that must be respected during generation."
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
                                        profileConstraints
                                            ?.preferred_workout_days?.length
                                            ? `Preferred days: ${profileConstraints.preferred_workout_days.join(', ')}`
                                            : 'Preferred days: not set',
                                    ]}
                                />
                                <SimpleListCard
                                    title="Safety constraints"
                                    items={
                                        profileConstraints?.allergies?.length
                                            ? profileConstraints.allergies.map(
                                                  (item) => `Allergy: ${item}`,
                                              )
                                            : ['No allergies saved.']
                                    }
                                />
                                <SimpleListCard
                                    title="Medical and equipment"
                                    items={[
                                        ...(profileConstraints
                                            ?.medical_conditions?.length
                                            ? profileConstraints.medical_conditions.map(
                                                  (item) =>
                                                      `Medical condition: ${item}`,
                                              )
                                            : ['No medical conditions saved.']),
                                        ...(profileConstraints?.injury_history
                                            ?.length
                                            ? profileConstraints.injury_history.map(
                                                  (item) =>
                                                      `Injury history: ${item}`,
                                              )
                                            : ['No injury history saved.']),
                                        ...(profileConstraints
                                            ?.available_equipment?.length
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
                            description="Safety rules and boundaries applied to this plan."
                        >
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-lg font-semibold text-foreground">
                                        {plan.overview?.summary ??
                                            'Structured weekly plan'}
                                    </div>
                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Constraints
                                            </div>
                                            <ul className="mt-2 space-y-2 text-sm text-foreground">
                                                {(
                                                    plan.overview
                                                        ?.key_constraints ?? []
                                                ).map((item) => (
                                                    <li key={item}>- {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Assumptions
                                            </div>
                                            <ul className="mt-2 space-y-2 text-sm text-foreground">
                                                {(
                                                    plan.overview
                                                        ?.assumptions ?? []
                                                ).map((item) => (
                                                    <li key={item}>- {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SafetyCard
                                        title="Hard rules observed"
                                        items={
                                            plan.safety?.hard_rules_observed ??
                                            []
                                        }
                                    />
                                    <SafetyCard
                                        title="Food avoidances"
                                        items={
                                            plan.safety?.food_avoidances ?? []
                                        }
                                    />
                                    <SafetyCard
                                        title="Exercise cautions"
                                        items={
                                            plan.safety?.exercise_cautions ?? []
                                        }
                                    />
                                </div>
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Diet structure"
                            description="Structured meal output used by the tracker and adherence review."
                        >
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                <div className="space-y-4">
                                    <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                        <div className="text-lg font-semibold text-foreground">
                                            Daily targets
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            {Object.entries(
                                                plan.diet?.daily_targets ?? {},
                                            ).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="rounded-[20px] border border-border/70 bg-card/80 p-3"
                                                >
                                                    <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                        {key.replaceAll(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-lg font-semibold text-foreground">
                                                        {String(value)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {mealOptionGroups.map((group) => (
                                            <div
                                                key={group.mealCode}
                                                className="rounded-[24px] border border-border/70 bg-background/72 p-4"
                                            >
                                                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    {humanizeMealCode(
                                                        group.mealCode,
                                                    )}
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-foreground">
                                                    {group.title}
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    {group.options.map(
                                                        (option) => {
                                                            const showTarget =
                                                                option.targetKcal >
                                                                    0 &&
                                                                Math.abs(
                                                                    option.targetKcal -
                                                                        option.caloriesKcal,
                                                                ) >= 15;
                                                            return (
                                                                <div
                                                                    key={
                                                                        option.key
                                                                    }
                                                                    className="rounded-[20px] border border-border/60 bg-card/80 p-3"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <div className="font-medium text-foreground">
                                                                                {
                                                                                    option.title
                                                                                }
                                                                            </div>
                                                                            {option
                                                                                .days
                                                                                .length ? (
                                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                                    Days{' '}
                                                                                    {option.days.join(
                                                                                        ', ',
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                                    Flexible
                                                                                    meal
                                                                                    choice
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-right text-xs text-muted-foreground">
                                                                            <div>
                                                                                {Math.round(
                                                                                    option.caloriesKcal,
                                                                                )}{' '}
                                                                                kcal
                                                                            </div>
                                                                            {showTarget ? (
                                                                                <div>
                                                                                    target{' '}
                                                                                    {Math.round(
                                                                                        option.targetKcal,
                                                                                    )}{' '}
                                                                                    kcal
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                                        <span className="rounded-full border border-border/60 px-2 py-1">
                                                                            P{' '}
                                                                            {Math.round(
                                                                                option.proteinG,
                                                                            )}
                                                                            g
                                                                        </span>
                                                                        <span className="rounded-full border border-border/60 px-2 py-1">
                                                                            C{' '}
                                                                            {Math.round(
                                                                                option.carbsG,
                                                                            )}
                                                                            g
                                                                        </span>
                                                                        <span className="rounded-full border border-border/60 px-2 py-1">
                                                                            F{' '}
                                                                            {Math.round(
                                                                                option.fatG,
                                                                            )}
                                                                            g
                                                                        </span>
                                                                    </div>

                                                                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                                                                        {option.items.map(
                                                                            (
                                                                                item,
                                                                                itemIndex,
                                                                            ) => {
                                                                                const itemCalories =
                                                                                    Number(
                                                                                        item.calories_kcal ??
                                                                                            0,
                                                                                    );
                                                                                const showItemCalories =
                                                                                    itemCalories >
                                                                                    0;

                                                                                return (
                                                                                    <li
                                                                                        key={`${option.key}-${item.name}-${itemIndex}`}
                                                                                    >
                                                                                        <span className="font-medium text-foreground">
                                                                                            {
                                                                                                item.name
                                                                                            }
                                                                                        </span>
                                                                                        {item.portion
                                                                                            ? ` - ${item.portion}`
                                                                                            : ''}
                                                                                        {showItemCalories
                                                                                            ? ` - ${Math.round(itemCalories)} kcal`
                                                                                            : ''}
                                                                                    </li>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SimpleListCard
                                        title="Grocery list"
                                        items={(
                                            plan.diet?.grocery_list ?? []
                                        ).map(
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
                            description="Weekly training structure aligned with your restrictions and equipment."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                {(plan.workout?.weekly_schedule ?? []).map(
                                    (day) => (
                                        <div
                                            key={`${day.day_index}-${day.focus}`}
                                            className="rounded-[24px] border border-border/70 bg-background/72 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Day {day.day_index}
                                                        {day.day_label
                                                            ? ` - ${day.day_label}`
                                                            : ''}
                                                    </div>
                                                    <div className="mt-1 text-lg font-semibold text-foreground">
                                                        {day.focus ??
                                                            'Workout day'}
                                                    </div>
                                                </div>
                                                <div className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs text-muted-foreground">
                                                    {day.session_type ??
                                                        'session'}
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                {day.location ? (
                                                    <span className="haye-chip">
                                                        {day.location}
                                                    </span>
                                                ) : null}
                                                {day.duration_min ? (
                                                    <span className="haye-chip">
                                                        {day.duration_min} min
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                {(day.exercises ?? [])
                                                    .length ? (
                                                    (day.exercises ?? []).map(
                                                        (exercise, index) => (
                                                            <div
                                                                key={`${day.day_index}-${exercise.name}-${index}`}
                                                                className="rounded-[20px] border border-border/60 bg-card/80 p-3"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="font-medium text-foreground">
                                                                        {
                                                                            exercise.name
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {exercise.sets ??
                                                                            0}{' '}
                                                                        sets
                                                                        {exercise.reps
                                                                            ? ` - ${exercise.reps}`
                                                                            : ''}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 text-xs text-muted-foreground">
                                                                    {exercise.equipment
                                                                        ? `${exercise.equipment} - `
                                                                        : ''}
                                                                    {exercise.rest_sec
                                                                        ? `${exercise.rest_sec}s rest`
                                                                        : 'Controlled pace'}
                                                                </div>
                                                                {exercise.safer_alternative ? (
                                                                    <div className="mt-2 text-xs text-foreground/80">
                                                                        Safer
                                                                        alternative:{' '}
                                                                        {
                                                                            exercise.safer_alternative
                                                                        }
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ),
                                                    )
                                                ) : (
                                                    <div className="rounded-[20px] border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                                        Rest or recovery day.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                <SimpleListCard
                                    title="Progression rules"
                                    items={
                                        plan.workout?.progression_rules ?? []
                                    }
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
                            title="Check-in and adjustments"
                            description="Use end-of-cycle checkpoints to decide whether to continue or regenerate."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                        Review after
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-foreground">
                                        {plan.adaptive_review
                                            ?.review_after_days ?? 7}{' '}
                                        days
                                    </div>
                                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                                        {(
                                            plan.adaptive_review?.checkpoints ??
                                            []
                                        ).map((item) => (
                                            <li key={item}>- {item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <SimpleListCard
                                        title="Replanning triggers"
                                        items={
                                            plan.adaptive_review
                                                ?.replanning_triggers ?? []
                                        }
                                    />
                                    <SimpleListCard
                                        title="Next data to collect"
                                        items={
                                            plan.adaptive_review
                                                ?.next_data_to_collect ?? []
                                        }
                                    />
                                </div>
                            </div>
                        </ProductSection>

                        <ProductSection
                            title="Progress Prediction"
                            description="Expected trend for this cycle using your current plan and recent outcomes."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <SimpleListCard
                                    title="Weight projection"
                                    items={[
                                        `Baseline: ${plan.progress_prediction?.baseline_weight_kg ?? '-'} kg`,
                                        `Expected change: ${plan.progress_prediction?.expected_weight_change_kg ?? '-'} kg`,
                                        `Projected weight: ${plan.progress_prediction?.projected_body_weight_kg ?? '-'} kg`,
                                        `Cycle length: ${plan.progress_prediction?.horizon_days ?? planHorizonDays} days`,
                                    ]}
                                />
                                <SimpleListCard
                                    title="Strength projection"
                                    items={[
                                        `Upper compounds: ${plan.progress_prediction?.strength_projection?.upper_body_compound_pct ?? '-'}%`,
                                        `Lower compounds: ${plan.progress_prediction?.strength_projection?.lower_body_compound_pct ?? '-'}%`,
                                        `Horizon: ${plan.progress_prediction?.horizon_days ?? planHorizonDays} days`,
                                    ]}
                                />
                                <SimpleListCard
                                    title="Feedback adjustment"
                                    items={[
                                        'Future cycles update after new weigh-ins and steady logging.',
                                        'Meal consistency and workout adherence help refine the next plan.',
                                        'The update stays readable and action-focused.',
                                        plan.progress_prediction
                                            ?.feedback_adjustment?.notes ??
                                            'Prediction updates as you log real results.',
                                    ]}
                                />
                            </div>
                        </ProductSection>
                    </>
                )}

                {isAdmin ? (
                    <ProductSection
                        title="Planner Audit"
                        description="Admin controls for background planner audits."
                    >
                        <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                            <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                Audit runner
                            </div>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                Full non-admin planner audit
                            </div>
                            <div className="mt-3 text-sm text-muted-foreground">
                                Runs 14-day, 21-day, and 28-day generations for
                                every non-admin account and writes
                                PlannerGenerated-style report files.
                            </div>

                            {auditStatus ? (
                                <div
                                    className={`mt-4 rounded-[18px] border px-3 py-2 text-sm ${
                                        auditStatus.tone === 'danger'
                                            ? 'border-rose-300/70 bg-rose-50 text-rose-900'
                                            : 'border-emerald-300/70 bg-emerald-50 text-emerald-900'
                                    }`}
                                >
                                    {auditStatus.message}
                                </div>
                            ) : null}

                            {auditRun ? (
                                <div className="mt-4 space-y-3 rounded-[20px] border border-border/60 bg-card/80 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="font-medium text-foreground">
                                                Audit #{auditRun.id}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {auditRun.status} -{' '}
                                                {auditRun.horizon_days.join(
                                                    ', ',
                                                )}{' '}
                                                day runs
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                                            {auditRun.percent_complete}% done
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-[16px] border border-border/60 bg-background/70 p-3 text-sm">
                                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                Progress
                                            </div>
                                            <div className="mt-2 font-semibold text-foreground">
                                                {auditRun.completed_runs}/
                                                {auditRun.total_runs || 0} runs
                                            </div>
                                        </div>
                                        <div className="rounded-[16px] border border-border/60 bg-background/70 p-3 text-sm">
                                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                GPU load
                                            </div>
                                            <div className="mt-2 font-semibold text-foreground">
                                                {auditRun.gpu_load}
                                            </div>
                                        </div>
                                        <div className="rounded-[16px] border border-border/60 bg-background/70 p-3 text-sm">
                                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                Execution
                                            </div>
                                            <div className="mt-2 font-semibold text-foreground">
                                                {auditExecutionModeLabel(
                                                    auditRun.execution_mode,
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-[16px] border border-border/60 bg-background/70 p-3 text-sm">
                                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                ETA
                                            </div>
                                            <div className="mt-2 font-semibold text-foreground">
                                                {formatEta(
                                                    auditRun.eta_seconds,
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-[16px] border border-border/60 bg-background/70 p-3 text-sm">
                                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                Pace
                                            </div>
                                            <div className="mt-2 font-semibold text-foreground">
                                                {formatAverageRun(
                                                    auditRun.average_run_ms,
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>
                                            Current account:{' '}
                                            {auditRun.current_user_email ??
                                                'Waiting to start'}
                                        </li>
                                        <li>
                                            Current horizon:{' '}
                                            {auditRun.current_horizon_days
                                                ? `${auditRun.current_horizon_days} days`
                                                : 'Waiting to start'}
                                        </li>
                                        <li>
                                            ETA refreshed:{' '}
                                            {formatTimestamp(
                                                auditRun.eta_updated_at,
                                            )}
                                        </li>
                                        <li>
                                            Next ETA refresh:{' '}
                                            {formatTimestamp(
                                                auditRun.next_eta_update_at,
                                            )}
                                        </li>
                                        {auditRun.report_paths?.md ? (
                                            <li>
                                                Markdown report:{' '}
                                                {auditRun.report_paths.md}
                                            </li>
                                        ) : null}
                                        {auditRun.report_paths?.json ? (
                                            <li>
                                                JSON report:{' '}
                                                {auditRun.report_paths.json}
                                            </li>
                                        ) : null}
                                        {auditRun.last_error ? (
                                            <li className="text-rose-700">
                                                Last error:{' '}
                                                {auditRun.last_error}
                                            </li>
                                        ) : null}
                                    </ul>

                                    {auditIsActive ? (
                                        <div className="flex flex-wrap gap-3">
                                            <ProductButton
                                                type="button"
                                                emphasis="secondary"
                                                onClick={() =>
                                                    setAuditDialogOpen(true)
                                                }
                                            >
                                                Adjust workload
                                            </ProductButton>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-3">
                                <ProductButton
                                    type="button"
                                    emphasis="secondary"
                                    onClick={() => setAuditDialogOpen(true)}
                                >
                                    {auditIsActive
                                        ? 'Open workload control'
                                        : 'Run full audit'}
                                </ProductButton>
                            </div>
                        </div>
                    </ProductSection>
                ) : null}

                <ProductStickyActions>
                    <div className="mr-auto flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>
                            Nutrition: {nutritionPlan?.name ?? 'Not ready'}
                        </span>
                        <span>-</span>
                        <span>Workout: {workoutPlan?.name ?? 'Not ready'}</span>
                    </div>
                    <ProductButton asChild emphasis="secondary" size="sm">
                        <Link href="/track-meals">Follow meal plan</Link>
                    </ProductButton>
                    <ProductButton asChild emphasis="secondary" size="sm">
                        <Link href="/workouts/plan">Open workout planner</Link>
                    </ProductButton>
                    <ProductButton
                        type="button"
                        onClick={generatePlan}
                        disabled={
                            generating || (!generateDiet && !generateWorkout)
                        }
                        size="sm"
                    >
                        {generating
                            ? 'Generating...'
                            : generateDiet && generateWorkout
                              ? 'Regenerate both'
                              : generateDiet
                                ? 'Generate diet'
                                : generateWorkout
                                  ? 'Generate workout'
                                  : 'Choose plan type'}
                    </ProductButton>
                    {isAdmin ? (
                        <ProductButton
                            type="button"
                            emphasis="secondary"
                            size="sm"
                            onClick={() => setAuditDialogOpen(true)}
                        >
                            {auditIsActive ? 'Control audit' : 'Run audit'}
                        </ProductButton>
                    ) : null}
                </ProductStickyActions>

                <Dialog
                    open={auditDialogOpen}
                    onOpenChange={setAuditDialogOpen}
                >
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>
                                {auditIsActive
                                    ? 'Planner Audit Workload Control'
                                    : 'Planner Audit Load Control'}
                            </DialogTitle>
                            <DialogDescription>
                                {auditIsActive
                                    ? 'This popup stays available while the audit is queued or running. Changing GPU workload updates the pacing and cooldown profile for the next run cycle without stopping the audit.'
                                    : 'This launches a background planner audit for all non-admin accounts across 14, 21, and 28 days. It starts on low GPU load by default, and you can switch it here before launch. GPU load changes pacing and cooldowns between runs, while execution mode controls whether the audit follows standard planner behavior, uses a fast path, or runs direct generation.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-3">
                            {[
                                {
                                    value: 'low' as const,
                                    label: 'Low',
                                    description:
                                        'Longest cooldowns, best when you want room for other background tasks.',
                                },
                                {
                                    value: 'medium' as const,
                                    label: 'Medium',
                                    description:
                                        'Balanced pacing with moderate cooldowns between audit runs.',
                                },
                                {
                                    value: 'high' as const,
                                    label: 'High',
                                    description:
                                        'Pushes the audit through as fast as possible with minimal cooldowns.',
                                },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 ${
                                        auditGpuLoad === option.value
                                            ? 'border-foreground/30 bg-card'
                                            : 'border-border/70 bg-background/70'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="audit-gpu-load"
                                        value={option.value}
                                        checked={auditGpuLoad === option.value}
                                        onChange={() =>
                                            setAuditGpuLoad(option.value)
                                        }
                                        className="mt-1 h-4 w-4"
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">
                                            {option.label}
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {option.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {auditIsActive ? (
                            <div className="grid gap-3">
                                <div className="rounded-[18px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                                    Current workload:{' '}
                                    <span className="font-medium text-foreground">
                                        {(auditRun?.gpu_load ?? auditGpuLoad)
                                            .charAt(0)
                                            .toUpperCase() +
                                            (
                                                auditRun?.gpu_load ??
                                                auditGpuLoad
                                            ).slice(1)}
                                    </span>
                                    . Any new selection below updates the live
                                    audit pacing on the next run cycle.
                                </div>
                                <div className="rounded-[18px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                                    Execution mode is locked to{' '}
                                    <span className="font-medium text-foreground">
                                        {auditExecutionModeLabel(
                                            auditRun?.execution_mode ??
                                                auditExecutionMode,
                                        )}
                                    </span>{' '}
                                    for the current run. Start a new audit if
                                    you want to switch between Standard, Fast
                                    path, and Direct generation.
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {[
                                    {
                                        value: 'standard' as const,
                                        label: 'Standard',
                                        description:
                                            'Honors the current planner setup and only falls back if the app is already configured to do so.',
                                    },
                                    {
                                        value: 'fast-fallback' as const,
                                        label: 'Fast path',
                                        description:
                                            'Best for large verification sweeps when you want quicker pacing for broad checks.',
                                    },
                                    {
                                        value: 'live' as const,
                                        label: 'Direct generation',
                                        description:
                                            'Runs direct generation for each request so timing reflects the direct path.',
                                    },
                                ].map((option) => (
                                    <label
                                        key={option.value}
                                        className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 ${
                                            auditExecutionMode === option.value
                                                ? 'border-foreground/30 bg-card'
                                                : 'border-border/70 bg-background/70'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="audit-execution-mode"
                                            value={option.value}
                                            checked={
                                                auditExecutionMode ===
                                                option.value
                                            }
                                            onChange={() =>
                                                setAuditExecutionMode(
                                                    option.value,
                                                )
                                            }
                                            className="mt-1 h-4 w-4"
                                        />
                                        <div>
                                            <div className="font-medium text-foreground">
                                                {option.label}
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {option.description}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="rounded-[18px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                            {auditIsActive
                                ? 'Keep this popup open while the audit is running if you want a quick way to switch between low, medium, and high pacing. ETA updates still refresh every 5 minutes in the audit card.'
                                : 'ETA updates refresh every 5 minutes while the audit is running. Report files are written with the current date-based PlannerGenerated name, and the selected execution mode is saved into the audit summary.'}
                        </div>

                        <DialogFooter>
                            <ProductButton
                                type="button"
                                emphasis="secondary"
                                onClick={() => setAuditDialogOpen(false)}
                                disabled={auditSubmitting || auditLoadUpdating}
                            >
                                {auditIsActive ? 'Close popup' : 'Cancel'}
                            </ProductButton>
                            <ProductButton
                                type="button"
                                onClick={() =>
                                    auditIsActive
                                        ? updateAuditGpuLoad()
                                        : startAudit()
                                }
                                disabled={auditSubmitting || auditLoadUpdating}
                            >
                                {auditIsActive
                                    ? auditLoadUpdating
                                        ? 'Updating workload...'
                                        : 'Apply workload change'
                                    : auditSubmitting
                                      ? 'Starting audit...'
                                      : 'Start audit'}
                            </ProductButton>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                    <li className="text-muted-foreground">
                        Nothing recorded yet.
                    </li>
                )}
            </ul>
        </div>
    );
}
