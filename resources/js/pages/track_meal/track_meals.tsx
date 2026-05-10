import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
} from '@/components/product/page';
import {
    ProductButton,
    ProductModeButton,
} from '@/components/product/product-ui';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { CalendarDays, Search, Shuffle, UtensilsCrossed } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cleanPlanName } from '@/lib/plan-utils';

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';
type QuantityMode = 'servings' | 'grams' | 'milliliters';
type QuantityDraft = { mode: QuantityMode; value: number };
type Targets = Partial<Totals>;

type SearchFood = {
    id: number;
    name: string;
    serving_unit: string;
    serving_size: number;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    category?: string | null;
    allergens?: string[] | null;
};

type EntryItem = {
    id: number;
    meal_type: MealType;
    servings: number;
    eaten_at: string;
    nutrition_plan_item_id?: number | null;
    plan_tracking?: {
        nutrition_plan_item_id: number;
        planned_food_id?: number | null;
        planned_food_name?: string | null;
        meal_type: MealType;
        status: 'pending' | 'logged_exact' | 'logged_substitute';
    } | null;
    food: {
        id: number;
        name: string;
        serving_unit: string;
        serving_size: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
};

type PlannedItem = {
    id: number;
    meal_type: MealType;
    servings?: number | null;
    grams?: number | null;
    default_servings: number;
    notes?: string | null;
    status: 'pending' | 'logged_exact' | 'logged_substitute';
    food: {
        id: number;
        name: string;
        category?: string | null;
        serving_unit: string;
        serving_size: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    logged_entry?: {
        id: number;
        food_id: number;
        servings: number;
        eaten_at: string;
        food: {
            id: number;
            name: string;
            serving_unit: string;
            serving_size: number;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
        };
    } | null;
};

type PlannedMeal = {
    id: number;
    meal_type: MealType;
    order: number;
    title: string;
    notes?: string | null;
    items: PlannedItem[];
};

type PlannedDay = {
    plan: {
        id: number;
        name: string;
        goal?: string | null;
    };
    day: {
        id: number;
        day_index: number;
        date: string;
        notes?: string | null;
    };
    meals: PlannedMeal[];
};

type DayResponse = {
    date: string;
    dailyTotals: Totals;
    mealTotals: Record<MealType, Totals>;
    entries: EntryItem[];
    targets?: Targets | null;
    remaining?: Partial<Totals> | null;
    recommendations?: SearchFood[] | null;
    userAllergies?: string[] | null;
    planModeAvailable?: boolean;
    plannedDay?: PlannedDay | null;
};

type PageProps = DayResponse & {
    dietName?: string | null;
};

const ZERO: Totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
const CORE_SUMMARY_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];
const OPTIONAL_SUMMARY_MEALS: MealType[] = ['snack', 'drink'];

function todayYmd() {
    return new Date().toISOString().slice(0, 10);
}

function statusLabel(status: PlannedItem['status']) {
    if (status === 'logged_exact') return 'Logged exact';
    if (status === 'logged_substitute') return 'Logged substitute';
    return 'Pending';
}

function mealLabel(mealType: MealType) {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

function isLiquidUnit(unit?: string | null) {
    return ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(
        (unit ?? '').toLowerCase().trim(),
    );
}

function isDrinkFood(
    food: { serving_unit: string },
    mealType?: MealType | null,
) {
    return mealType === 'drink' || isLiquidUnit(food.serving_unit);
}

function normalizeServingBase(
    food: { serving_size: number; serving_unit: string },
    mode: 'grams' | 'milliliters',
) {
    let size = Number(food.serving_size) || 0;
    const unit = food.serving_unit.toLowerCase().trim();

    if (mode === 'milliliters') {
        if (unit === 'l' || unit === 'liter' || unit === 'liters') {
            size *= 1000;
        }

        return size > 0 ? size : 250;
    }

    if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
        size *= 1000;
    }

    return size > 0 ? size : 100;
}

function roundQuantity(value: number, precision = 2) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}

function safeQuantity(value: number, fallback = 1) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function quantityToServings(
    food: { serving_size: number; serving_unit: string },
    draft: QuantityDraft,
) {
    const amount = safeQuantity(draft.value, draft.mode === 'servings' ? 1 : 100);

    if (draft.mode === 'servings') {
        return amount;
    }

    const base = normalizeServingBase(
        food,
        draft.mode === 'milliliters' ? 'milliliters' : 'grams',
    );

    return roundQuantity(Math.max(0.01, amount / Math.max(1, base)), 4);
}

function quantityModeOptions(
    food: { serving_unit: string },
    mealType?: MealType | null,
): QuantityMode[] {
    return isDrinkFood(food, mealType)
        ? ['servings', 'milliliters']
        : ['servings', 'grams'];
}

function quantityModeLabel(mode: QuantityMode) {
    if (mode === 'grams') return 'Grams';
    if (mode === 'milliliters') return 'Milliliters';
    return 'Servings';
}

function quantityStep(mode: QuantityMode) {
    return mode === 'servings' ? 0.25 : 1;
}

function quantityMin(mode: QuantityMode) {
    return mode === 'servings' ? 0.25 : 1;
}

function servingReferenceText(
    food: { serving_size: number; serving_unit: string },
    mealType?: MealType | null,
) {
    if (isDrinkFood(food, mealType)) {
        return `1 serving = ${roundQuantity(
            normalizeServingBase(food, 'milliliters'),
            0,
        )} ml`;
    }

    const unit = food.serving_unit?.trim();
    if (unit && !['g', 'kg'].includes(unit.toLowerCase())) {
        return `1 serving = ${food.serving_size} ${unit}`;
    }

    return `1 serving = ${roundQuantity(
        normalizeServingBase(food, 'grams'),
        0,
    )} g`;
}

function plannedItemQuantityDraft(
    item: PlannedItem,
    food: { serving_size: number; serving_unit: string } = item.food,
): QuantityDraft {
    const drink = isDrinkFood(food, item.meal_type);
    const loggedServings = item.logged_entry?.servings ?? null;

    if (drink) {
        return {
            mode: 'milliliters',
            value: roundQuantity(
                safeQuantity(
                    (loggedServings ?? item.default_servings) *
                        normalizeServingBase(food, 'milliliters'),
                    normalizeServingBase(food, 'milliliters'),
                ),
                0,
            ),
        };
    }

    if (loggedServings !== null && loggedServings > 0 && item.grams) {
        return {
            mode: 'grams',
            value: roundQuantity(
                loggedServings * normalizeServingBase(food, 'grams'),
                0,
            ),
        };
    }

    if (item.grams && item.grams > 0) {
        return {
            mode: 'grams',
            value: roundQuantity(item.grams, 0),
        };
    }

    return {
        mode: 'servings',
        value: safeQuantity(loggedServings ?? item.default_servings, 1),
    };
}

function defaultQuantityDraftForFood(
    food: SearchFood,
    mealType: MealType,
    plannedItem?: PlannedItem | null,
): QuantityDraft {
    if (plannedItem) {
        return plannedItemQuantityDraft(plannedItem, food);
    }

    if (isDrinkFood(food, mealType)) {
        return {
            mode: 'milliliters',
            value: roundQuantity(
                normalizeServingBase(food, 'milliliters'),
                0,
            ),
        };
    }

    return { mode: 'servings', value: 1 };
}

function quantityDraftPayload(draft: QuantityDraft) {
    if (draft.mode === 'grams') {
        return { grams: safeQuantity(draft.value, 100) };
    }

    if (draft.mode === 'milliliters') {
        return { milliliters: safeQuantity(draft.value, 250) };
    }

    return { servings: safeQuantity(draft.value, 1) };
}

export default function TrackMealsPage() {
    const props = usePage<PageProps>().props;
    const initialDate = props.date ?? todayYmd();
    const [date, setDate] = useState(initialDate);
    const [day, setDay] = useState<DayResponse>({
        date: initialDate,
        dailyTotals: props.dailyTotals ?? ZERO,
        mealTotals: props.mealTotals ?? {
            breakfast: ZERO,
            lunch: ZERO,
            dinner: ZERO,
            snack: ZERO,
            drink: ZERO,
        },
        entries: props.entries ?? [],
        targets: props.targets ?? null,
        remaining: props.remaining ?? null,
        recommendations: props.recommendations ?? [],
        userAllergies: props.userAllergies ?? [],
        planModeAvailable: props.planModeAvailable ?? false,
        plannedDay: props.plannedDay ?? null,
    });
    const [mode, setMode] = useState<'follow-plan' | 'quick-log'>(
        props.planModeAvailable ? 'follow-plan' : 'quick-log',
    );
    const [mealType, setMealType] = useState<MealType>('breakfast');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<SearchFood[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{
        tone: 'default' | 'danger' | 'success';
        message: string;
    } | null>(null);
    const [dialogStatus, setDialogStatus] = useState<{
        tone: 'default' | 'danger' | 'success';
        message: string;
    } | null>(null);
    const [selectedPlannedItem, setSelectedPlannedItem] =
        useState<PlannedItem | null>(null);
    const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
    const [plannedLogItem, setPlannedLogItem] = useState<PlannedItem | null>(
        null,
    );
    const [plannedLogModalOpen, setPlannedLogModalOpen] = useState(false);
    const [plannedLogDraft, setPlannedLogDraft] = useState<QuantityDraft>({
        mode: 'servings',
        value: 1,
    });
    const [openAdd, setOpenAdd] = useState(false);
    const [selectedFood, setSelectedFood] = useState<SearchFood | null>(null);
    const [logDraft, setLogDraft] = useState<QuantityDraft>({
        mode: 'servings',
        value: 1,
    });
    const debounceRef = useRef<number | null>(null);
    const searchRequestKeyRef = useRef(0);

    useEffect(() => {
        const token = (
            document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
        )?.content;
        if (token) axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    }, []);

    useEffect(() => {
        if (!day.planModeAvailable && mode === 'follow-plan') {
            setMode('quick-log');
            setSelectedPlannedItem(null);
            setSubstituteModalOpen(false);
            setPlannedLogItem(null);
            setPlannedLogModalOpen(false);
        }
    }, [day.planModeAvailable, mode]);

    useEffect(() => {
        setSelectedPlannedItem(null);
        setSubstituteModalOpen(false);
        setPlannedLogItem(null);
        setPlannedLogModalOpen(false);
    }, [date]);

    const fetchDay = async (nextDate: string) => {
        const response = await axios.get<DayResponse>('/api/meal-tracker/day', {
            params: { date: nextDate, meal_type: mealType },
        });
        setDay(response.data);
    };

    useEffect(() => {
        void fetchDay(date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, mealType]);

    useEffect(() => {
        if (
            mode === 'follow-plan' &&
            (!selectedPlannedItem || !substituteModalOpen)
        ) {
            searchRequestKeyRef.current += 1;
            setResults([]);
            setLoading(false);
            return;
        }

        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
            const requestKey = ++searchRequestKeyRef.current;
            setLoading(true);
            try {
                const response = await axios.get('/api/foods/search', {
                    params:
                        mode === 'follow-plan' && selectedPlannedItem
                            ? {
                                  q: query,
                                  page,
                                  context: 'plan_substitution',
                                  nutrition_plan_item_id:
                                      selectedPlannedItem.id,
                              }
                            : {
                                  q: query,
                                  page,
                                  meal_type: mealType,
                              },
                });
                if (requestKey !== searchRequestKeyRef.current) {
                    return;
                }
                setResults(
                    Array.isArray(response.data?.data)
                        ? response.data.data
                        : [],
                );
            } catch {
                if (requestKey !== searchRequestKeyRef.current) {
                    return;
                }
                setResults([]);
            } finally {
                if (requestKey === searchRequestKeyRef.current) {
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [mode, selectedPlannedItem, substituteModalOpen, query, page, mealType]);

    const openAddDialog = (food: SearchFood) => {
        setDialogStatus(null);
        setStatus(null);
        setSelectedFood(food);
        setLogDraft(
            defaultQuantityDraftForFood(
                food,
                selectedPlannedItem?.meal_type ?? mealType,
                selectedPlannedItem,
            ),
        );
        setOpenAdd(true);
    };

    const closeAddDialog = () => {
        setDialogStatus(null);
        setSelectedFood(null);
        setLogDraft({ mode: 'servings', value: 1 });
        setOpenAdd(false);
        if (mode === 'follow-plan') {
            setSelectedPlannedItem(null);
        }
    };

    const openPlannedLogModal = (item: PlannedItem) => {
        setPlannedLogItem(item);
        setPlannedLogDraft(plannedItemQuantityDraft(item));
        setPlannedLogModalOpen(true);
    };

    const closePlannedLogModal = () => {
        setPlannedLogModalOpen(false);
        setPlannedLogItem(null);
        setPlannedLogDraft({ mode: 'servings', value: 1 });
    };

    const confirmAdd = async () => {
        if (!selectedFood) return;
        if (!Number.isFinite(logDraft.value) || logDraft.value <= 0) {
            setDialogStatus({
                tone: 'danger',
                message: 'Enter a quantity greater than zero.',
            });
            return;
        }

        try {
            if (mode === 'follow-plan' && selectedPlannedItem) {
                await axios.post(
                    `/api/meal-tracker/planned-items/${selectedPlannedItem.id}/log`,
                    {
                        food_id: selectedFood.id,
                        ...quantityDraftPayload(logDraft),
                        eaten_at: date,
                    },
                );
            } else {
                await axios.post('/meal-entries', {
                    food_id: selectedFood.id,
                    meal_type: mealType,
                    ...quantityDraftPayload(logDraft),
                    eaten_at: date,
                });
            }

            closeAddDialog();
            setStatus({
                tone: 'success',
                message:
                    mode === 'follow-plan' && selectedPlannedItem
                        ? 'Substitute logged successfully.'
                        : 'Meal added successfully.',
            });
            setSelectedPlannedItem(null);
            setSubstituteModalOpen(false);
            await fetchDay(date);
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) &&
                typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : 'Could not save this meal right now.';
            setDialogStatus({ tone: 'danger', message });
        }
    };

    const confirmPlannedMealLog = async () => {
        if (!plannedLogItem) return;
        if (
            !Number.isFinite(plannedLogDraft.value) ||
            plannedLogDraft.value <= 0
        ) {
            setStatus({
                tone: 'danger',
                message: 'Enter a quantity greater than zero.',
            });
            return;
        }

        try {
            await axios.post(
                `/api/meal-tracker/planned-items/${plannedLogItem.id}/log`,
                {
                    food_id: plannedLogItem.food.id,
                    ...quantityDraftPayload(plannedLogDraft),
                    eaten_at: date,
                },
            );
            closePlannedLogModal();
            setStatus({
                tone: 'success',
                message: plannedLogItem.logged_entry
                    ? 'Planned meal updated.'
                    : 'Planned meal logged.',
            });
            await fetchDay(date);
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) &&
                typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : 'Could not log this planned meal.';
            setStatus({ tone: 'danger', message });
        }
    };

    const openSubstituteModal = (item: PlannedItem) => {
        setDialogStatus(null);
        setStatus(null);
        setMode('follow-plan');
        setSelectedPlannedItem(item);
        setQuery('');
        setPage(1);
        setResults([]);
        setSubstituteModalOpen(true);
    };

    const closeSubstituteModal = () => {
        setDialogStatus(null);
        setSubstituteModalOpen(false);
        setSelectedPlannedItem(null);
        setQuery('');
        setPage(1);
        setResults([]);
    };

    const removeEntry = async (entryId: number) => {
        try {
            await axios.delete(`/meal-entries/${entryId}`);
            setStatus({ tone: 'success', message: 'Entry removed.' });
            await fetchDay(date);
        } catch {
            setStatus({
                tone: 'danger',
                message: 'Could not remove this entry.',
            });
        }
    };

    const plannedMealPreviewTotals = plannedLogItem
        ? (() => {
              const servings = quantityToServings(
                  plannedLogItem.food,
                  plannedLogDraft,
              );

              return {
                  calories: Math.round(plannedLogItem.food.calories * servings),
                  protein: Math.round(plannedLogItem.food.protein * servings),
                  carbs: Math.round(plannedLogItem.food.carbs * servings),
                  fat: Math.round(plannedLogItem.food.fat * servings),
              };
          })()
        : null;

    const entries = day.entries ?? [];
    const plannedMeals = day.plannedDay?.meals ?? [];

    return (
        <>
            <Head title="Meal Tracker" />

            <ProductPageShell width="wide">
                <ProductHero
                    title={
                        mode === 'follow-plan'
                            ? "Follow today's plan"
                            : 'Quick log your meals'
                    }
                    description="The tracker opens in plan-follow mode when a nutrition plan exists, with quick log always available."
                    meta={
                        <div className="space-y-2 text-sm">
                            <div className="font-medium text-foreground">
                                {day.plannedDay
                                    ? (cleanPlanName(day.plannedDay.plan.name) || day.plannedDay.plan.name)
                                    : (cleanPlanName(props.dietName) || props.dietName || 'Meal tracking')}
                            </div>
                            <div className="text-muted-foreground">
                                Date: {date}
                            </div>
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="date"
                                value={date}
                                onChange={(event) =>
                                    setDate(event.target.value)
                                }
                                className="h-11 rounded-2xl border border-border/70 bg-background px-3 text-sm text-foreground"
                            />
                            <ProductModeButton
                                active={mode === 'follow-plan'}
                                disabled={!day.planModeAvailable}
                                onClick={() =>
                                    day.planModeAvailable &&
                                    setMode('follow-plan')
                                }
                            >
                                Follow Plan
                            </ProductModeButton>
                            <ProductModeButton
                                active={mode === 'quick-log'}
                                onClick={() => {
                                    setMode('quick-log');
                                    closeSubstituteModal();
                                }}
                            >
                                Quick Log
                            </ProductModeButton>
                            <ProductButton asChild emphasis="secondary">
                                <Link href="/ai/planner">AI Planner</Link>
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

                {mode === 'follow-plan' ? (
                    day.plannedDay ? (
                        <ProductSection
                            title="Today's planned meals"
                            description="Open any planned item, choose the quantity you need, and log it or swap with a safe substitute."
                        >
                            <div className="space-y-6">
                                <MacroCard
                                    title="Daily totals"
                                    totals={day.dailyTotals}
                                    targets={day.targets ?? null}
                                    remaining={day.remaining ?? null}
                                    mealTotals={day.mealTotals}
                                    entries={entries}
                                />
                                <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-lg font-semibold text-foreground">
                                        Today's plan details
                                    </div>
                                    <div className="mt-3 text-sm text-muted-foreground">
                                        {(cleanPlanName(day.plannedDay.plan.name) || day.plannedDay.plan.name)} - Day{' '}
                                        {day.plannedDay.day.day_index}
                                    </div>
                                    <div className="mt-3 text-sm text-foreground">
                                        {day.plannedDay.day.notes ??
                                            'No extra notes for this day.'}
                                    </div>
                                </div>

                                {plannedMeals.map((meal) => (
                                    <div
                                        key={meal.id}
                                        className="rounded-[26px] border border-border/70 bg-background/72 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    {meal.meal_type}
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-foreground">
                                                    {meal.title}
                                                </div>
                                            </div>
                                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            {meal.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <div className="font-medium text-foreground">
                                                                {item.food.name}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {Math.round(
                                                                    item.food
                                                                        .calories,
                                                                )}{' '}
                                                                kcal per serving
                                                            </div>
                                                        </div>
                                                        <span className="haye-chip">
                                                            {statusLabel(
                                                                item.status,
                                                            )}
                                                        </span>
                                                    </div>

                                                    {item.logged_entry ? (
                                                        <div className="mt-3 rounded-[18px] border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                                                            Logged as{' '}
                                                            {
                                                                item
                                                                    .logged_entry
                                                                    .food.name
                                                            }
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-4 rounded-[20px] border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                                                        Pick the quantity inside
                                                        the log dialog so macros
                                                        and units stay focused
                                                        on the action you are
                                                        taking.
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openPlannedLogModal(
                                                                    item,
                                                                )
                                                            }
                                                            className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                                                        >
                                                            {item.logged_entry
                                                                ? 'Update logged meal'
                                                                : 'Log planned meal'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openSubstituteModal(
                                                                    item,
                                                                )
                                                            }
                                                            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-card"
                                                        >
                                                            <Shuffle className="h-4 w-4" />
                                                            Choose substitute
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ProductSection>
                    ) : (
                        <ProductEmptyState
                            title="No planned meals for this date"
                            description="Switch to Quick Log for a flexible day, or generate a plan from the AI Planner page."
                            action={
                                <Link
                                    href="/ai/planner"
                                    className="inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
                                >
                                    Open AI Planner
                                </Link>
                            }
                        />
                    )
                ) : null}

                {mode === 'quick-log' ? (
                    <ProductSection
                        title="Quick log search"
                        description="Search foods and log meals for flexible days."
                    >
                        <div className="space-y-6">
                            <MacroCard
                                title="Daily totals"
                                totals={day.dailyTotals}
                                targets={day.targets ?? null}
                                remaining={day.remaining ?? null}
                                mealTotals={day.mealTotals}
                                entries={entries}
                            />

                            <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                    <Search className="h-4 w-4" />
                                    Search foods
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {MEALS.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setMealType(type)}
                                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                                mealType === type
                                                    ? 'border-primary/30 bg-primary/10 text-foreground'
                                                    : 'border-border/70 bg-card text-foreground hover:bg-background'
                                            }`}
                                        >
                                            {mealLabel(type)}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Search by name"
                                    className="mt-4 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm"
                                />

                                <div className="mt-4 space-y-3">
                                    {loading ? (
                                        <div className="text-sm text-muted-foreground">
                                            Searching...
                                        </div>
                                    ) : results.length === 0 ? (
                                        <div className="rounded-[18px] border border-dashed border-border/70 bg-card/60 px-4 py-5 text-sm text-muted-foreground">
                                            {query.trim()
                                                ? `No ${mealLabel(mealType).toLowerCase()} matches found. Try a simpler food name.`
                                                : `Search to log a ${mealLabel(mealType).toLowerCase()}.`}
                                        </div>
                                    ) : (
                                        results.map((food) => (
                                            <div
                                                key={food.id}
                                                className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-foreground">
                                                            {food.name}
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {food.category ??
                                                                'Food'}
                                                            {' - '}
                                                            {Math.round(
                                                                food.calories ??
                                                                    0,
                                                            )}{' '}
                                                            kcal
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openAddDialog(food)
                                                        }
                                                        className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </ProductSection>
                ) : null}

                <ProductSection
                    title="Today's entries"
                    description="Daily timeline of logged meals, including exact and substitute plan matches."
                >
                    <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <UtensilsCrossed className="h-4 w-4" />
                            Logged meals
                        </div>
                        <div className="mt-4 space-y-3">
                            {entries.length ? (
                                entries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {entry.food.name}
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {mealLabel(
                                                        entry.meal_type,
                                                    )}{' '}
                                                    -{' '}
                                                    {entry.servings} servings
                                                </div>
                                                {entry.plan_tracking ? (
                                                    <div className="mt-2 text-xs text-foreground/80">
                                                        Linked to planned item:{' '}
                                                        {
                                                            entry.plan_tracking
                                                                .planned_food_name
                                                        }
                                                        {' - '}
                                                        {statusLabel(
                                                            entry.plan_tracking
                                                                .status,
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void removeEntry(entry.id)
                                                }
                                                className="rounded-full border border-red-500/20 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/10"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <ProductEmptyState
                                    title="Nothing logged yet"
                                    description="Your timeline appears after the first log entry."
                                />
                            )}
                        </div>
                    </div>
                </ProductSection>
            </ProductPageShell>
            {plannedLogModalOpen && plannedLogItem ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={closePlannedLogModal}
                    />
                    <div className="haye-panel relative z-10 w-full max-w-md rounded-[30px] p-5 text-foreground">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    Log planned meal
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {plannedLogItem.food.name}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closePlannedLogModal}
                                className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-4 rounded-[22px] border border-border/70 bg-background/72 p-4 text-sm text-muted-foreground">
                            {servingReferenceText(
                                plannedLogItem.food,
                                plannedLogItem.meal_type,
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {quantityModeOptions(
                                plannedLogItem.food,
                                plannedLogItem.meal_type,
                            ).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() =>
                                        setPlannedLogDraft((current) => ({
                                            ...current,
                                            mode: option,
                                        }))
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                        plannedLogDraft.mode === option
                                            ? 'border-primary/30 bg-primary/10 text-foreground'
                                            : 'border-border/70 bg-background text-muted-foreground'
                                    }`}
                                >
                                    {quantityModeLabel(option)}
                                </button>
                            ))}
                        </div>

                        <label className="mt-4 block text-sm font-medium text-foreground">
                            {quantityModeLabel(plannedLogDraft.mode)}
                            <input
                                type="number"
                                min={quantityMin(plannedLogDraft.mode)}
                                step={quantityStep(plannedLogDraft.mode)}
                                value={plannedLogDraft.value}
                                onChange={(event) =>
                                    setPlannedLogDraft((current) => ({
                                        ...current,
                                        value:
                                            Number(event.target.value) ||
                                            quantityMin(current.mode),
                                    }))
                                }
                                className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                            />
                        </label>

                        {plannedMealPreviewTotals ? (
                            <div className="mt-4 rounded-[22px] border border-border/70 bg-card/80 p-4 text-sm text-foreground">
                                Approximate totals:{' '}
                                {plannedMealPreviewTotals.calories} kcal
                                {' - '}P {plannedMealPreviewTotals.protein}
                                {' - '}C {plannedMealPreviewTotals.carbs}
                                {' - '}F {plannedMealPreviewTotals.fat}
                            </div>
                        ) : null}

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closePlannedLogModal}
                                className="rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmPlannedMealLog()}
                                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                            >
                                {plannedLogItem.logged_entry
                                    ? 'Update logged meal'
                                    : 'Log planned meal'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {substituteModalOpen && selectedPlannedItem ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={closeSubstituteModal}
                    />
                    <div className="haye-panel relative z-10 w-full max-w-2xl rounded-[30px] p-5 text-foreground">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    Choose substitute
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    Replace {selectedPlannedItem.food.name}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeSubstituteModal}
                                className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-3 rounded-[22px] border border-border/70 bg-background/72 p-3 text-xs text-muted-foreground">
                            Planned quantities carry over automatically so logging
                            stays fast.
                        </div>

                        <input
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search substitute foods"
                            className="mt-4 w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm"
                        />

                        <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                            {loading ? (
                                <div className="text-sm text-muted-foreground">
                                    Searching...
                                </div>
                            ) : results.length ? (
                                results.map((food) => (
                                    <div
                                        key={food.id}
                                        className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {food.name}
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {food.category ?? 'Food'}
                                                    {' - '}
                                                    {Math.round(
                                                        food.calories ?? 0,
                                                    )}{' '}
                                                    kcal
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSubstituteModalOpen(
                                                        false,
                                                    );
                                                    openAddDialog(food);
                                                }}
                                                className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                                            >
                                                Use substitute
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <ProductEmptyState
                                    title="No matches yet"
                                    description="Try a different ingredient name or category."
                                />
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
            {openAdd && selectedFood ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={closeAddDialog}
                    />
                    <div className="haye-panel relative z-10 w-full max-w-md rounded-[30px] p-5 text-foreground">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    {mode === 'follow-plan'
                                        ? 'Substitute planned meal'
                                        : `Add to ${mealType}`}
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {selectedFood.name}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeAddDialog}
                                className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-4 rounded-[22px] border border-border/70 bg-background/72 p-4 text-sm text-muted-foreground">
                            {servingReferenceText(
                                selectedFood,
                                selectedPlannedItem?.meal_type ?? mealType,
                            )}
                        </div>
                        {mode === 'follow-plan' && selectedPlannedItem ? (
                            <div className="mt-3 rounded-[22px] border border-border/70 bg-card/80 p-3 text-xs text-muted-foreground">
                                Replacing: {selectedPlannedItem.food.name}
                            </div>
                        ) : null}
                        {dialogStatus ? (
                            <ProductBanner
                                tone={dialogStatus.tone}
                                role={
                                    dialogStatus.tone === 'danger'
                                        ? 'alert'
                                        : 'status'
                                }
                                className="mt-3"
                            >
                                {dialogStatus.message}
                            </ProductBanner>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                            {quantityModeOptions(
                                selectedFood,
                                selectedPlannedItem?.meal_type ?? mealType,
                            ).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() =>
                                            setLogDraft((current) => ({
                                                ...current,
                                                mode: option,
                                            }))
                                        }
                                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                            logDraft.mode === option
                                                ? 'border-primary/30 bg-primary/10 text-foreground'
                                                : 'border-border/70 bg-background text-muted-foreground'
                                        }`}
                                    >
                                        {quantityModeLabel(option)}
                                    </button>
                                ),
                            )}
                        </div>

                        <label className="mt-4 block text-sm font-medium text-foreground">
                            {quantityModeLabel(logDraft.mode)}
                            <input
                                type="number"
                                min={quantityMin(logDraft.mode)}
                                step={quantityStep(logDraft.mode)}
                                value={logDraft.value}
                                onChange={(event) =>
                                    setLogDraft((current) => ({
                                        ...current,
                                        value:
                                            Number(event.target.value) ||
                                            quantityMin(current.mode),
                                    }))
                                }
                                className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                            />
                        </label>

                        <div className="mt-4 rounded-[22px] border border-border/70 bg-card/80 p-4 text-sm text-foreground">
                            Approximate totals:{' '}
                            {Math.round(
                                (selectedFood.calories ?? 0) *
                                    quantityToServings(selectedFood, logDraft),
                            )}{' '}
                            kcal
                            {' - '}P{' '}
                            {Math.round(
                                (selectedFood.protein_g ?? 0) *
                                    quantityToServings(selectedFood, logDraft),
                            )}
                            {' - '}C{' '}
                            {Math.round(
                                (selectedFood.carbs_g ?? 0) *
                                    quantityToServings(selectedFood, logDraft),
                            )}
                            {' - '}F{' '}
                            {Math.round(
                                (selectedFood.fat_g ?? 0) *
                                    quantityToServings(selectedFood, logDraft),
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeAddDialog}
                                className="rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmAdd()}
                                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                            >
                                {mode === 'follow-plan'
                                    ? 'Log substitute'
                                    : `Add to ${mealType}`}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

function MacroCard({
    title,
    totals,
    targets,
    remaining,
    mealTotals,
    entries,
}: {
    title: string;
    totals: Totals;
    targets: Targets | null;
    remaining?: Partial<Totals> | null;
    mealTotals: Record<MealType, Totals>;
    entries: EntryItem[];
}) {
    const macroCards = [
        {
            key: 'calories' as const,
            label: 'Calories',
            value: totals.calories,
            target: targets?.calories ?? null,
            remaining: remaining?.calories ?? null,
            unit: 'kcal',
            fillClass: 'bg-primary',
        },
        {
            key: 'protein' as const,
            label: 'Protein',
            value: totals.protein,
            target: targets?.protein ?? null,
            remaining: remaining?.protein ?? null,
            unit: 'g',
            fillClass: 'bg-primary/90',
        },
        {
            key: 'carbs' as const,
            label: 'Carbs',
            value: totals.carbs,
            target: targets?.carbs ?? null,
            remaining: remaining?.carbs ?? null,
            unit: 'g',
            fillClass: 'bg-primary/80',
        },
        {
            key: 'fat' as const,
            label: 'Fat',
            value: totals.fat,
            target: targets?.fat ?? null,
            remaining: remaining?.fat ?? null,
            unit: 'g',
            fillClass: 'bg-primary/70',
        },
    ];
    const loggedOptionalMeals = OPTIONAL_SUMMARY_MEALS.filter((mealType) => {
        const totalsForMeal = mealTotals[mealType] ?? ZERO;
        const hasLoggedEntry = entries.some(
            (entry) => entry.meal_type === mealType,
        );
        const hasTotals =
            totalsForMeal.calories > 0 ||
            totalsForMeal.protein > 0 ||
            totalsForMeal.carbs > 0 ||
            totalsForMeal.fat > 0;

        return hasLoggedEntry || hasTotals;
    });
    const singleOptionalMeal = loggedOptionalMeals.length === 1;
    const summaryMeals: MealType[] = singleOptionalMeal
        ? [...CORE_SUMMARY_MEALS, loggedOptionalMeals[0] as MealType]
        : CORE_SUMMARY_MEALS;

    return (
        <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold text-foreground">
                        {title}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                        Daily totals stay visible for the whole day, with meal
                        totals grouped underneath.
                    </div>
                </div>
                {typeof targets?.calories === 'number' ? (
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                        {Math.round(
                            Math.min(
                                100,
                                (totals.calories /
                                    Math.max(1, targets.calories)) *
                                    100,
                            ),
                        )}
                        % of calorie target
                    </div>
                ) : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {macroCards.map((macro) => {
                    const progress =
                        typeof macro.target === 'number' && macro.target > 0
                            ? (macro.value / macro.target) * 100
                            : null;
                    const baseProgress =
                        progress === null
                            ? 0
                            : Math.max(0, Math.min(100, progress));
                    const overflowProgress =
                        progress === null
                            ? 0
                            : Math.max(0, Math.min(100, progress - 100));

                    return (
                        <div
                            key={macro.key}
                            className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                        {macro.label}
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-foreground">
                                        {Math.round(macro.value)} {macro.unit}
                                    </div>
                                </div>
                                <div className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                    {typeof macro.target === 'number'
                                        ? `${Math.round(baseProgress)}%`
                                        : 'Live'}
                                </div>
                            </div>

                            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-background">
                                <div
                                    className={`h-full rounded-full ${macro.fillClass} transition-all`}
                                    style={{ width: `${baseProgress}%` }}
                                />
                            </div>
                            {overflowProgress > 0 ? (
                                <div className="mt-2 text-xs text-primary">
                                    +{Math.round(overflowProgress)}% over target
                                </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {typeof macro.target === 'number' ? (
                                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
                                        Target {Math.round(macro.target)}{' '}
                                        {macro.unit}
                                    </span>
                                ) : null}
                                {typeof macro.remaining === 'number' ? (
                                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
                                        {Math.max(
                                            0,
                                            Math.round(macro.remaining),
                                        )}{' '}
                                        {macro.unit} left
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    Meal summary
                </div>
                <div
                    className={`mt-3 grid gap-3 ${
                        singleOptionalMeal ? 'md:grid-cols-2' : 'lg:grid-cols-3'
                    }`}
                >
                    {summaryMeals.map((mealType) => (
                        <MealSummaryCard
                            key={mealType}
                            mealType={mealType}
                            totals={mealTotals[mealType] ?? ZERO}
                        />
                    ))}
                </div>
                {loggedOptionalMeals.length > 1 ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {loggedOptionalMeals.map((mealType) => (
                            <MealSummaryCard
                                key={mealType}
                                mealType={mealType}
                                totals={mealTotals[mealType] ?? ZERO}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function MealSummaryCard({
    mealType,
    totals,
}: {
    mealType: MealType;
    totals: Totals;
}) {
    return (
        <div className="rounded-[22px] border border-border/70 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">
                    {mealLabel(mealType)}
                </div>
                <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                    {Math.round(totals.calories)} kcal
                </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <MacroPill label="Protein" value={totals.protein} />
                <MacroPill label="Carbs" value={totals.carbs} />
                <MacroPill label="Fat" value={totals.fat} />
            </div>
        </div>
    );
}

function MacroPill({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[18px] border border-border/70 bg-background px-3 py-2">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 font-medium text-foreground">
                {Math.round(value)} g
            </div>
        </div>
    );
}
