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

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';
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
const SUMMARY_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

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
    const [selectedPlannedItem, setSelectedPlannedItem] =
        useState<PlannedItem | null>(null);
    const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
    const [plannedLogItem, setPlannedLogItem] = useState<PlannedItem | null>(
        null,
    );
    const [plannedLogModalOpen, setPlannedLogModalOpen] = useState(false);
    const [plannedLogServings, setPlannedLogServings] = useState(1);
    const [plannedServingInput, setPlannedServingInput] = useState<
        Record<number, string>
    >({});
    const [openAdd, setOpenAdd] = useState(false);
    const [selectedFood, setSelectedFood] = useState<SearchFood | null>(null);
    const [portionCount, setPortionCount] = useState(1);
    const debounceRef = useRef<number | null>(null);

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

    useEffect(() => {
        const plannedItems =
            day.plannedDay?.meals.flatMap((meal) => meal.items) ?? [];

        if (!plannedItems.length) {
            setPlannedServingInput({});
            return;
        }

        setPlannedServingInput((current) => {
            const next = { ...current };
            const keep = new Set<number>();

            for (const item of plannedItems) {
                keep.add(item.id);
                if (next[item.id] !== undefined) {
                    continue;
                }
                next[item.id] = String(
                    item.logged_entry?.servings ?? item.default_servings,
                );
            }

            for (const key of Object.keys(next)) {
                const itemId = Number(key);
                if (!keep.has(itemId)) {
                    delete next[itemId];
                }
            }

            return next;
        });
    }, [day.plannedDay]);

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
            setResults([]);
            return;
        }

        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
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
                setResults(
                    Array.isArray(response.data?.data)
                        ? response.data.data
                        : [],
                );
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [mode, selectedPlannedItem, substituteModalOpen, query, page, mealType]);

    const plannedServingValue = (item: PlannedItem) => {
        const raw = plannedServingInput[item.id];
        const parsed = Number(raw);

        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }

        return item.logged_entry?.servings ?? item.default_servings;
    };

    const updatePlannedServingInput = (itemId: number, value: string) => {
        setPlannedServingInput((current) => ({ ...current, [itemId]: value }));
    };

    const applyPlannedServing = (item: PlannedItem, multiplier: number) => {
        const next = Math.max(
            0.25,
            Math.round(item.default_servings * multiplier * 100) / 100,
        );
        updatePlannedServingInput(item.id, String(next));
    };

    const openAddDialog = (food: SearchFood) => {
        setSelectedFood(food);
        if (mode === 'follow-plan' && selectedPlannedItem) {
            setPortionCount(plannedServingValue(selectedPlannedItem));
        } else {
            setPortionCount(1);
        }
        setOpenAdd(true);
    };

    const closeAddDialog = () => {
        setSelectedFood(null);
        setPortionCount(1);
        setOpenAdd(false);
        if (mode === 'follow-plan') {
            setSelectedPlannedItem(null);
        }
    };

    const openPlannedLogModal = (item: PlannedItem) => {
        const servingAmount = plannedServingValue(item);
        setPlannedLogItem(item);
        setPlannedLogServings(servingAmount > 0 ? servingAmount : 1);
        setPlannedLogModalOpen(true);
    };

    const closePlannedLogModal = () => {
        setPlannedLogModalOpen(false);
        setPlannedLogItem(null);
    };

    const confirmAdd = async () => {
        if (!selectedFood) return;
        if (!Number.isFinite(portionCount) || portionCount <= 0) {
            setStatus({
                tone: 'danger',
                message: 'Enter a serving amount greater than zero.',
            });
            return;
        }

        try {
            if (mode === 'follow-plan' && selectedPlannedItem) {
                await axios.post(
                    `/api/meal-tracker/planned-items/${selectedPlannedItem.id}/log`,
                    {
                        food_id: selectedFood.id,
                        servings: portionCount,
                        eaten_at: date,
                    },
                );
            } else {
                await axios.post('/meal-entries', {
                    food_id: selectedFood.id,
                    meal_type: mealType,
                    servings: portionCount,
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
            setStatus({ tone: 'danger', message });
        }
    };

    const confirmPlannedMealLog = async () => {
        if (!plannedLogItem) return;
        const servings = plannedLogServings;

        if (!Number.isFinite(servings) || servings <= 0) {
            setStatus({
                tone: 'danger',
                message: 'Enter a serving amount greater than zero.',
            });
            return;
        }

        try {
            await axios.post(
                `/api/meal-tracker/planned-items/${plannedLogItem.id}/log`,
                {
                    food_id: plannedLogItem.food.id,
                    servings,
                    eaten_at: date,
                },
            );
            updatePlannedServingInput(plannedLogItem.id, String(servings));
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
        setMode('follow-plan');
        setSelectedPlannedItem(item);
        setPortionCount(plannedServingValue(item));
        setQuery('');
        setPage(1);
        setResults([]);
        setSubstituteModalOpen(true);
    };

    const closeSubstituteModal = () => {
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
        ? {
              calories: Math.round(
                  plannedLogItem.food.calories * plannedLogServings,
              ),
              protein: Math.round(
                  plannedLogItem.food.protein * plannedLogServings,
              ),
              carbs: Math.round(plannedLogItem.food.carbs * plannedLogServings),
              fat: Math.round(plannedLogItem.food.fat * plannedLogServings),
          }
        : null;

    const entries = day.entries ?? [];
    const plannedMeals = day.plannedDay?.meals ?? [];

    return (
        <>
            <Head title="Meal Tracker" />

            <ProductPageShell width="wide">
                <ProductHero
                    eyebrow="Meal Tracker"
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
                                    ? day.plannedDay.plan.name
                                    : props.dietName || 'Meal tracking'}
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
                            description="Adjust servings, log the planned item, or swap with a safe substitute."
                        >
                            <div className="space-y-6">
                                <MacroCard
                                    title="Daily totals"
                                    totals={day.dailyTotals}
                                    targets={day.targets ?? null}
                                    remaining={day.remaining ?? null}
                                    mealTotals={day.mealTotals}
                                />
                                <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
                                    <div className="text-lg font-semibold text-foreground">
                                        Today's plan details
                                    </div>
                                    <div className="mt-3 text-sm text-muted-foreground">
                                        {day.plannedDay.plan.name} - Day{' '}
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
                                                                {item.grams
                                                                    ? `${item.grams} g`
                                                                    : `${plannedServingValue(item)} servings`}
                                                                {' - '}
                                                                {Math.round(
                                                                    item.food
                                                                        .calories *
                                                                        plannedServingValue(
                                                                            item,
                                                                        ),
                                                                )}{' '}
                                                                kcal total
                                                                {' · '}
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
                                                            {item.logged_entry
                                                                .servings
                                                                ? ` - ${item.logged_entry.servings} servings`
                                                                : ''}
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-4 space-y-3 rounded-[20px] border border-border/60 bg-background/80 p-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="text-sm font-medium text-foreground">
                                                                Serving amount
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updatePlannedServingInput(
                                                                        item.id,
                                                                        String(
                                                                            item.default_servings,
                                                                        ),
                                                                    )
                                                                }
                                                                className="rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                                                            >
                                                                Use plan amount
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {[0.5, 1, 1.5].map(
                                                                (
                                                                    multiplier,
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            multiplier
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            applyPlannedServing(
                                                                                item,
                                                                                multiplier,
                                                                            )
                                                                        }
                                                                        className="rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-background"
                                                                    >
                                                                        {
                                                                            multiplier
                                                                        }
                                                                        x
                                                                    </button>
                                                                ),
                                                            )}
                                                            <input
                                                                type="number"
                                                                min={0.25}
                                                                step={0.25}
                                                                value={
                                                                    plannedServingInput[
                                                                        item.id
                                                                    ] ??
                                                                    String(
                                                                        item.default_servings,
                                                                    )
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updatePlannedServingInput(
                                                                        item.id,
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9 w-28 rounded-xl border border-border/70 bg-background px-2 py-1 text-sm"
                                                            />
                                                            <span className="text-xs text-muted-foreground">
                                                                servings
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Planned amount:{' '}
                                                            {
                                                                item.default_servings
                                                            }{' '}
                                                            servings
                                                        </div>
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
                                            {type}
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
                                                    {entry.meal_type} -{' '}
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
                            1 serving = {plannedLogItem.food.serving_size}
                            {plannedLogItem.food.serving_unit}
                        </div>

                        <label className="mt-4 block text-sm font-medium text-foreground">
                            Servings
                            <input
                                type="number"
                                min={0.25}
                                step={0.25}
                                value={plannedLogServings}
                                onChange={(event) =>
                                    setPlannedLogServings(
                                        Number(event.target.value) || 1,
                                    )
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
                            Planned servings carry over automatically so logging
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
                            1 serving = {selectedFood.serving_size}
                            {selectedFood.serving_unit}
                        </div>
                        {mode === 'follow-plan' && selectedPlannedItem ? (
                            <div className="mt-3 rounded-[22px] border border-border/70 bg-card/80 p-3 text-xs text-muted-foreground">
                                Replacing: {selectedPlannedItem.food.name} (
                                {plannedServingValue(selectedPlannedItem)}{' '}
                                servings)
                            </div>
                        ) : null}

                        <label className="mt-4 block text-sm font-medium text-foreground">
                            Servings
                            <input
                                type="number"
                                min={0.25}
                                step={0.25}
                                value={portionCount}
                                onChange={(event) =>
                                    setPortionCount(
                                        Number(event.target.value) || 1,
                                    )
                                }
                                className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                            />
                        </label>

                        <div className="mt-4 rounded-[22px] border border-border/70 bg-card/80 p-4 text-sm text-foreground">
                            Approximate totals:{' '}
                            {Math.round(
                                (selectedFood.calories ?? 0) * portionCount,
                            )}{' '}
                            kcal
                            {' - '}P{' '}
                            {Math.round(
                                (selectedFood.protein_g ?? 0) * portionCount,
                            )}
                            {' - '}C{' '}
                            {Math.round(
                                (selectedFood.carbs_g ?? 0) * portionCount,
                            )}
                            {' - '}F{' '}
                            {Math.round(
                                (selectedFood.fat_g ?? 0) * portionCount,
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
}: {
    title: string;
    totals: Totals;
    targets: Targets | null;
    remaining?: Partial<Totals> | null;
    mealTotals: Record<MealType, Totals>;
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

    return (
        <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold text-foreground">
                        {title}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                        Progress stays visible for the whole day, then rolls
                        into a meal-by-meal summary right underneath.
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
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {SUMMARY_MEALS.map((mealType) => {
                        const totalsForMeal = mealTotals[mealType] ?? ZERO;
                        const calorieShare =
                            typeof targets?.calories === 'number' &&
                            targets.calories > 0
                                ? Math.min(
                                      100,
                                      (totalsForMeal.calories /
                                          targets.calories) *
                                          100,
                                  )
                                : 0;

                        return (
                            <div
                                key={mealType}
                                className="rounded-[22px] border border-border/70 bg-card/80 p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-foreground">
                                        {mealLabel(mealType)}
                                    </div>
                                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                        {Math.round(totalsForMeal.calories)}{' '}
                                        kcal
                                    </span>
                                </div>

                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                                    <div
                                        className="h-full rounded-full bg-primary"
                                        style={{ width: `${calorieShare}%` }}
                                    />
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                                    <div className="rounded-[18px] border border-border/70 bg-background px-3 py-2">
                                        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                            Protein
                                        </div>
                                        <div className="mt-1 font-medium text-foreground">
                                            {Math.round(totalsForMeal.protein)}{' '}
                                            g
                                        </div>
                                    </div>
                                    <div className="rounded-[18px] border border-border/70 bg-background px-3 py-2">
                                        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                            Carbs
                                        </div>
                                        <div className="mt-1 font-medium text-foreground">
                                            {Math.round(totalsForMeal.carbs)} g
                                        </div>
                                    </div>
                                    <div className="rounded-[18px] border border-border/70 bg-background px-3 py-2">
                                        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                            Fat
                                        </div>
                                        <div className="mt-1 font-medium text-foreground">
                                            {Math.round(totalsForMeal.fat)} g
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
