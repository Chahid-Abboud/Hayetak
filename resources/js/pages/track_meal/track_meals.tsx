import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
} from '@/components/product/page';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight,
    Heart,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';
type MealTotals = Record<MealType, Totals>;
type MacroKey = keyof Totals;
type Unit = string;

type EntryItem = {
    id: number;
    meal_type: MealType;
    servings: number;
    eaten_at: string;
    food: {
        id: number;
        name: string;
        serving_unit: Unit;
        serving_size: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        category?: string | null;
        allergens?: string[] | null;
    };
};

type Targets = Partial<Totals>;

type PageProps = {
    date?: string;
    dailyTotals?: Totals | null;
    mealTotals?: Partial<MealTotals> | null;
    entries?: EntryItem[] | null;
    targets?: Targets | null;
    remaining?: Partial<Totals> | null;
    recommendations?: SearchFood[] | null;
    dietName?: string | null;

    // ✅ add this from controller when you can:
    // return Inertia::render(..., ['userAllergies' => auth()->user()->allergies ?? []]);
    userAllergies?: string[] | null;
};

type DayResponse = {
    date: string;
    dailyTotals: Totals;
    mealTotals: MealTotals;
    entries: EntryItem[];
    targets?: Targets | null;
    remaining?: Partial<Totals> | null;
    recommendations?: SearchFood[] | null;
    userAllergies?: string[] | null;
};

type SearchFood = {
    id: number;
    name: string;
    serving_unit: Unit;
    serving_size: number;

    // nutrition fields (support both legacy and new)
    calories?: number;
    calories_kcal?: number;
    protein?: number;
    protein_g?: number;
    carbs?: number;
    carbs_g?: number;
    fat?: number;
    fat_g?: number;

    // filtering helpers (if backend returns them)
    category?: string | null;
    meal_types?: string[] | string | null;
    allergens?: string[] | string | null;
    is_favorite?: boolean;
};

const ZERO: Totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const DEFAULT_TARGETS: Totals = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
};
const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];

const CARD =
    'haye-panel rounded-[28px] p-4 text-card-foreground transition-colors duration-300';
const CARD_SM =
    'rounded-[22px] border border-border/70 bg-background/72 p-3 text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors duration-300';

function todayYMD() {
    return new Date().toISOString().slice(0, 10);
}

function safeMealTotals(raw?: Partial<MealTotals> | null): MealTotals {
    return {
        breakfast: raw?.breakfast ?? ZERO,
        lunch: raw?.lunch ?? ZERO,
        dinner: raw?.dinner ?? ZERO,
        snack: raw?.snack ?? ZERO,
        drink: raw?.drink ?? ZERO,
    };
}

function normalizeToken(s: string) {
    return s
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[._-]/g, ' ')
        .replace(/[^a-z0-9 ]/g, '');
}

function asStringArray(v: unknown): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') {
        // allow "milk, eggs" or "milk|eggs"
        return v
            .split(/[,|]/g)
            .map((x) => x.trim())
            .filter(Boolean);
    }
    return [];
}

function foodHasUserAllergen(food: SearchFood, userAllergies: string[]) {
    const ua = userAllergies.map(normalizeToken).filter(Boolean);
    if (ua.length === 0) return false;

    const foodAll = asStringArray(food.allergens)
        .map(normalizeToken)
        .filter(Boolean);
    if (foodAll.length === 0) return false; // treat missing allergens as safe

    // intersection
    const set = new Set(foodAll);
    return ua.some((a) => set.has(a));
}

function getPlanAlignment(dailyTotals: Totals, targets: Targets) {
    const proteinTarget = Math.max(1, targets.protein ?? 0);
    const fatTarget = Math.max(1, targets.fat ?? 0);
    const caloriesTarget = Math.max(1, targets.calories ?? 0);
    const proteinRatio = dailyTotals.protein / proteinTarget;
    const fatRatio = dailyTotals.fat / fatTarget;
    const calorieRatio = dailyTotals.calories / caloriesTarget;

    if (proteinRatio < 0.7) {
        return {
            label: 'Protein low',
            copy: 'Use the next meal to close the protein gap before the day drifts off target.',
        };
    }

    if (fatRatio > 1.1) {
        return {
            label: 'Fat high',
            copy: 'The next meal should stay lighter and more protein-forward to balance the day.',
        };
    }

    if (calorieRatio > 1.08) {
        return {
            label: 'Calories high',
            copy: 'Keep the next choice simple and lighter so the day stays recoverable.',
        };
    }

    return {
        label: 'On target',
        copy: 'Today is broadly on track, so you can use the next meal to keep momentum steady.',
    };
}

export default function TrackMealsPage() {
    const raw = usePage<PageProps>().props;

    useEffect(() => {
        document.documentElement.setAttribute('data-page', 'nutrition');
        return () => document.documentElement.removeAttribute('data-page');
    }, []);

    // ✅ ensure axios has CSRF for POST/DELETE (if you don't set it globally)
    useEffect(() => {
        const token = (
            document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
        )?.content;
        if (token) axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    }, []);

    const title = useMemo(() => 'Meal Tracker', []);
    const initialDate = raw.date ?? todayYMD();

    const [date, setDate] = useState(initialDate);

    // ✅ meal type you are adding to (always required)
    const [mealType, setMealType] = useState<MealType>('breakfast');

    // ✅ food list filter (can be cleared to "All foods" without changing mealType)
    const [filterMealType, setFilterMealType] = useState<MealType | null>(
        'breakfast',
    );

    const [day, setDay] = useState<DayResponse>(() => ({
        date: initialDate,
        dailyTotals: raw.dailyTotals ?? ZERO,
        mealTotals: safeMealTotals(raw.mealTotals),
        entries: Array.isArray(raw.entries) ? raw.entries : [],
        targets: raw.targets ?? null,
        remaining: raw.remaining ?? null,
        recommendations: Array.isArray(raw.recommendations)
            ? raw.recommendations
            : [],
        userAllergies: raw.userAllergies ?? [],
    }));

    const [dayLoading, setDayLoading] = useState(false);
    const [favoriteFoods, setFavoriteFoods] = useState<SearchFood[]>([]);

    const fetchDay = async (d: string, selectedMealType: MealType) => {
        setDayLoading(true);
        try {
            const res = await axios.get<DayResponse>('/api/meal-tracker/day', {
                params: { date: d, meal_type: selectedMealType },
            });

            setDay({
                date: res.data?.date ?? d,
                dailyTotals: res.data?.dailyTotals ?? ZERO,
                mealTotals: res.data?.mealTotals ?? safeMealTotals(null),
                entries: Array.isArray(res.data?.entries)
                    ? res.data.entries
                    : [],
                targets: res.data?.targets ?? null,
                remaining: res.data?.remaining ?? null,
                recommendations: Array.isArray(res.data?.recommendations)
                    ? res.data.recommendations
                    : [],
                userAllergies:
                    res.data?.userAllergies ?? raw.userAllergies ?? [],
            });
        } catch {
            setDay((prev) => ({
                ...prev,
                date: d,
                dailyTotals: ZERO,
                mealTotals: safeMealTotals(null),
                entries: [],
                remaining: null,
                recommendations: [],
            }));
        } finally {
            setDayLoading(false);
        }
    };

    useEffect(() => {
        void fetchDay(date, mealType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, mealType]);

    // ---------------- Filters (stable & combined) ----------------
    const [q, setQ] = useState('');
    const [excludeAllergens, setExcludeAllergens] = useState(false);

    // paging for server results
    const [page, setPage] = useState(1);

    // server results (unfiltered client-side)
    const [results, setResults] = useState<SearchFood[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Reset paging only when search/filter changes (not when date changes)
    useEffect(() => {
        setPage(1);
    }, [q, filterMealType, excludeAllergens]);

    const debounceRef = useRef<number | null>(null);
    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);

        debounceRef.current = window.setTimeout(async () => {
            setLoading(true);
            try {
                // ✅ Keep backend compatibility by sending multiple possible keys
                // (some controllers filter by category, others by meal_type or meal_types)
                const params: Record<string, unknown> = {
                    q,
                    page,
                };
                if (filterMealType) {
                    params.category = filterMealType;
                    params.meal_type = filterMealType;
                    params.mealType = filterMealType;
                    params.meal_types = filterMealType;
                }

                const res = await axios.get('/api/foods/search', { params });
                setResults(Array.isArray(res.data?.data) ? res.data.data : []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [q, page, filterMealType]);

    useEffect(() => {
        let active = true;

        void axios
            .get<SearchFood[]>('/api/foods/favorites')
            .then((response) => {
                if (!active) return;
                setFavoriteFoods(
                    Array.isArray(response.data) ? response.data : [],
                );
            })
            .catch(() => {
                if (!active) return;
                setFavoriteFoods([]);
            });

        return () => {
            active = false;
        };
    }, []);

    const userAllergies = useMemo(
        () =>
            Array.isArray(day.userAllergies)
                ? day.userAllergies
                : Array.isArray(raw.userAllergies)
                  ? raw.userAllergies
                  : [],
        [day.userAllergies, raw.userAllergies],
    );

    const visibleResults = useMemo(() => {
        let list = results;

        // ✅ apply category filter client-side too (fixes regression + avoids “empty” when backend param mismatch)
        // Backend filters by meal_types; trust it (no client-side meal filter)

        // apply allergen exclusion client-side (prevents “removes everything” bug)
        if (excludeAllergens && userAllergies.length > 0) {
            list = list.filter((f) => !foodHasUserAllergen(f, userAllergies));
        }

        return list;
    }, [results, excludeAllergens, userAllergies]);

    // ---------------- Add modal ----------------
    const [openAdd, setOpenAdd] = useState(false);
    const [selected, setSelected] = useState<SearchFood | null>(null);
    const [addMode, setAddMode] = useState<'portion' | 'grams'>('portion');
    const [portionCount, setPortionCount] = useState<number>(1);
    const [gramsValue, setGramsValue] = useState<number | ''>('');

    const openAddDialog = (food: SearchFood) => {
        setSelected(food);
        setAddMode('portion');
        setPortionCount(1);
        setGramsValue('');
        setOpenAdd(true);
    };
    const closeAddDialog = () => {
        setOpenAdd(false);
        setSelected(null);
    };

    const norm = (v?: number, alt?: number) =>
        Math.max(0, Number(v ?? alt ?? 0));
    const toBaseMacros = (f: SearchFood) => ({
        calories: norm(f.calories, f.calories_kcal),
        protein: norm(f.protein, f.protein_g),
        carbs: norm(f.carbs, f.carbs_g),
        fat: norm(f.fat, f.fat_g),
    });

    const computeServings = (): number => {
        if (!selected) return 0;
        if (addMode === 'portion') return portionCount > 0 ? portionCount : 0;
        const g = Number(gramsValue);
        const base = selected.serving_size || 100;
        return g > 0 && base > 0 ? g / base : 0;
    };

    const computedPreview = () => {
        if (!selected)
            return { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
        const servings = computeServings();
        const base = toBaseMacros(selected);
        const grams = servings * (selected.serving_size || 0);
        return {
            calories: Math.round(base.calories * servings),
            protein: Math.round(base.protein * servings),
            carbs: Math.round(base.carbs * servings),
            fat: Math.round(base.fat * servings),
            grams: Math.round(grams),
        };
    };

    const confirmAdd = async () => {
        if (!selected) return;
        const servings = computeServings();
        if (!(servings > 0)) return;

        try {
            await axios.post('/meal-entries', {
                food_id: selected.id,
                meal_type: mealType,
                servings,
                eaten_at: date,
            });
            closeAddDialog();
            setStatusMessage('Meal added to your daily tracking successfully.');
            await fetchDay(date, mealType);
            setTimeout(() => setStatusMessage(null), 4000);
        } catch {
            setStatusMessage('Could not add meal. Please try again.');
            setTimeout(() => setStatusMessage(null), 4000);
        }
    };

    const removeEntry = async (id: number) => {
        if (!confirm('Remove entry?')) return;
        await axios.delete(`/meal-entries/${id}`);
        await fetchDay(date, mealType);
    };

    const dailyTotals = day.dailyTotals ?? ZERO;
    const mealTotals = day.mealTotals ?? safeMealTotals(null);
    const entries = Array.isArray(day.entries) ? day.entries : [];
    const targets = day.targets ?? DEFAULT_TARGETS;
    const remaining = day.remaining ?? null;
    const hasUserTargets = !!day.targets;
    const recentFoods = Array.from(
        new Map(entries.map((entry) => [entry.food.id, entry.food])).values(),
    ).slice(0, 5);
    const recommendations = Array.isArray(day.recommendations)
        ? day.recommendations
        : Array.isArray(raw.recommendations)
          ? raw.recommendations
          : [];
    const mealTimeline = MEALS.map((meal) => ({
        meal,
        totals: mealTotals[meal],
        entries: entries.filter((entry) => entry.meal_type === meal),
    }));

    const macro = (n: number) => Math.round(n);
    const mealTypeLabel =
        mealType.charAt(0).toUpperCase() + mealType.slice(1);
    const alignment = getPlanAlignment(dailyTotals, targets);
    const selectedMealTotals = mealTotals[mealType];
    const safeRecommendations = recommendations.filter(
        (food) => !foodHasUserAllergen(food, userAllergies),
    );
    const visibleFavorites = favoriteFoods
        .filter((food) => !foodHasUserAllergen(food, userAllergies))
        .slice(0, 6);
    const calorieProgress = Math.min(
        100,
        Math.round((dailyTotals.calories / Math.max(1, targets.calories ?? 1)) * 100),
    );
    const proteinProgress = Math.min(
        100,
        Math.round((dailyTotals.protein / Math.max(1, targets.protein ?? 1)) * 100),
    );
    const coachPrompt =
        alignment.label === 'Protein low'
            ? `I'm still low on protein for ${mealType}. Suggest a quick option that fits my saved restrictions.`
            : alignment.label === 'Fat high'
              ? `My fat intake is already high today. What lighter ${mealType} option keeps me on plan?`
              : `Give me one safe ${mealType} idea based on what I already logged today.`;
    const dietName = raw.dietName?.trim() ?? '';

    const onPickMealType = (mt: MealType) => {
        // ✅ selecting meal type should instantly filter the list AND set add target
        setMealType(mt);
        setFilterMealType(mt);
    };

    const clearFoodCategoryFilter = () => {
        setFilterMealType(null);
    };

    const clearSearch = () => {
        setQ('');
    };
    const renderLegacyHeader = date === '__legacy__';
    const renderLegacyStatus = statusMessage === '__legacy__';

    return (
        <>
            <Head title={title} />
            <ProductPageShell width="wide">
                <ProductHero
                    eyebrow="Nutrition"
                    title={title}
                    description="Log meals quickly, keep restriction-aware guidance visible, and use planner alignment to see what matters next instead of scanning a wall of numbers."
                    meta={
                        <div className="space-y-2 text-sm">
                            <div>
                                {entries.length}{' '}
                                {entries.length === 1 ? 'entry' : 'entries'} logged
                                for {date}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="haye-chip">Meal focus: {mealTypeLabel}</span>
                                <span className="haye-chip">{alignment.label}</span>
                            </div>
                        </div>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="sr-only" htmlFor="meal-date">
                                Pick a date
                            </label>
                            <input
                                id="meal-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
                            />

                            <button
                                type="button"
                                onClick={() => setDate(todayYMD())}
                                className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Today
                            </button>
                        </div>
                    }
                />

                {dayLoading ? (
                    <ProductBanner>
                        Refreshing your daily totals and entries.
                    </ProductBanner>
                ) : null}

                {statusMessage ? (
                    <ProductBanner role="status" aria-live="polite">
                        {statusMessage}
                    </ProductBanner>
                ) : null}

                <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className={CARD}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="haye-chip">
                                Logging to {mealTypeLabel}
                            </span>
                            <span className="haye-chip">
                                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} today
                            </span>
                            <span className="haye-chip">
                                {macro(mealTotals[mealType].calories)} kcal in this meal
                            </span>
                            {dietName ? (
                                <span className="haye-chip">Diet: {dietName}</span>
                            ) : null}
                            {userAllergies.slice(0, 3).map((allergy) => (
                                <span
                                    key={allergy}
                                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                                >
                                    <ShieldCheck className="size-3.5" />
                                    Avoid {allergy}
                                </span>
                            ))}
                            {userAllergies.length === 0 ? (
                                <span className="haye-chip">
                                    No allergy filters saved
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">
                            {alignment.copy} The diary keeps today&apos;s
                            progress, safety context, and the fastest safe next
                            action within the same view.
                        </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                                <p className="haye-kicker">Calories left</p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                                    {macro(remaining?.calories ?? Math.max(0, (targets.calories ?? 0) - dailyTotals.calories))}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {calorieProgress}% of today&apos;s target is already logged.
                                </p>
                            </div>
                            <div className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                                <p className="haye-kicker">Protein gap</p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                                    {macro(remaining?.protein ?? Math.max(0, (targets.protein ?? 0) - dailyTotals.protein))} g
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {proteinProgress}% of the protein target is covered.
                                </p>
                            </div>
                            <div className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                                <p className="haye-kicker">Plan alignment</p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                                    {alignment.label}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {mealTypeLabel} is the active decision point right now.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={CARD}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="haye-kicker">Shortcuts</p>
                                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                                    Recent and favorite foods
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Reuse familiar foods instead of searching
                                    from scratch every time.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {recentFoods.map((food) => (
                                <button
                                    key={food.id}
                                    type="button"
                                    onClick={() =>
                                        openAddDialog({
                                            id: food.id,
                                            name: food.name,
                                            serving_unit: food.serving_unit,
                                            serving_size: food.serving_size,
                                            calories: food.calories,
                                            protein: food.protein,
                                            carbs: food.carbs,
                                            fat: food.fat,
                                            category: food.category ?? null,
                                            allergens: food.allergens ?? null,
                                        })
                                    }
                                    className="rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground transition hover:border-secondary/30 hover:bg-card"
                                >
                                    {food.name}
                                </button>
                            ))}
                            {recentFoods.length === 0 ? (
                                <span className="text-sm text-muted-foreground">
                                    Your recent foods will appear here after you log a few meals.
                                </span>
                            ) : null}
                        </div>
                        {visibleFavorites.length > 0 ? (
                            <div className="mt-4 border-t border-border/70 pt-4">
                                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Favorites
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {visibleFavorites.map((food) => (
                                        <button
                                            key={`favorite-${food.id}`}
                                            type="button"
                                            onClick={() => openAddDialog(food)}
                                            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-sm text-foreground transition hover:border-secondary/30 hover:bg-background"
                                        >
                                            <Heart className="size-3.5 text-secondary" />
                                            {food.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </section>
                {renderLegacyHeader ? (
                    <>
                        {/* Header + SINGLE calendar entry point */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h1 className="text-2xl font-semibold text-[#1C2C64] dark:text-white">
                                {title}
                            </h1>

                            <div className="flex items-center gap-2">
                                {/* ✅ Primary: date picker */}
                                <label className="sr-only" htmlFor="meal-date">
                                    Pick a date
                                </label>
                                <input
                                    id="meal-date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-1.5 text-sm text-[#1C2C64] outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                />

                                {/* Secondary: Today (only one extra) */}
                                <button
                                    type="button"
                                    onClick={() => setDate(todayYMD())}
                                    className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:text-white dark:hover:bg-white/10 dark:focus:ring-white/25"
                                >
                                    Today
                                </button>

                                {dayLoading ? (
                                    <span className="text-xs opacity-70">
                                        Updating…
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </>
                ) : null}

                {/* Daily totals */}
                <section aria-labelledby="totals" className={CARD}>
                    <h2 id="totals" className="sr-only">
                        Daily totals
                    </h2>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard
                            label="Calories"
                            macroKey="calories"
                            value={`${macro(dailyTotals.calories)} kcal`}
                            unit="kcal"
                            consumed={dailyTotals.calories}
                            target={targets?.calories}
                        />
                        <StatCard
                            label="Protein"
                            macroKey="protein"
                            value={`${macro(dailyTotals.protein)} g`}
                            unit="g"
                            consumed={dailyTotals.protein}
                            target={targets?.protein}
                        />
                        <StatCard
                            label="Carbs"
                            macroKey="carbs"
                            value={`${macro(dailyTotals.carbs)} g`}
                            unit="g"
                            consumed={dailyTotals.carbs}
                            target={targets?.carbs}
                        />
                        <StatCard
                            label="Fat"
                            macroKey="fat"
                            value={`${macro(dailyTotals.fat)} g`}
                            unit="g"
                            consumed={dailyTotals.fat}
                            target={targets?.fat}
                        />
                    </div>

                    {!hasUserTargets && (
                        <div className="mt-2 text-[11px] opacity-80">
                            Using default goals. Set your own in profile for
                            personalized tracking.
                        </div>
                    )}

                    {renderLegacyStatus && statusMessage && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="mt-3 rounded-lg border px-4 py-2 text-sm"
                            style={{
                                backgroundColor: 'var(--muted)',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            {statusMessage}
                        </div>
                    )}
                </section>

                {/* Meal type tabs (also sets filter) */}
                <section aria-labelledby="meals" className={`mt-6 ${CARD}`}>
                    <h2 id="meals" className="sr-only">
                        Meal Types
                    </h2>

                    <div
                        role="tablist"
                        aria-label="Meal Types"
                        className="grid grid-cols-1 gap-3 md:grid-cols-5"
                    >
                        {MEALS.map((mt) => {
                            const selectedTab = mt === mealType;
                            return (
                                <button
                                    key={mt}
                                    role="tab"
                                    aria-selected={selectedTab}
                                    onClick={() => onPickMealType(mt)}
                                    className={`rounded-[24px] border p-3 text-left transition focus:ring-2 focus:outline-none ${
                                        selectedTab
                                            ? 'border-secondary/35 bg-secondary/10 ring-ring'
                                            : 'border-border/70 bg-background/70 hover:bg-card'
                                    }`}
                                >
                                    <div className="text-sm font-medium capitalize text-foreground">
                                        {mt}
                                    </div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {macro(mealTotals[mt].calories)} kcal / P {macro(mealTotals[mt].protein)} / C{' '}
                                        {macro(mealTotals[mt].carbs)} / F{' '}
                                        {macro(mealTotals[mt].fat)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Search + filtering */}
                <section className={`mt-6 ${CARD} p-0`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-3">
                        <div className="text-sm font-medium">
                            Add to{' '}
                            <span className="capitalize">{mealType}</span>{' '}
                            {filterMealType ? (
                                <span className="ml-2 text-xs opacity-70">
                                    (Filtering foods: {filterMealType})
                                </span>
                            ) : (
                                <span className="ml-2 text-xs opacity-70">
                                    (All foods)
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {filterMealType && (
                                <button
                                    type="button"
                                    onClick={clearFoodCategoryFilter}
                                    className="rounded-full border border-border/70 px-3 py-1.5 text-sm text-foreground transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                                >
                                    All foods
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={clearSearch}
                                className="rounded-full border border-border/70 px-3 py-1.5 text-sm text-foreground transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Clear search
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 p-3">
                        <label className="block text-sm" htmlFor="search-input">
                            Search foods
                        </label>

                        <input
                            id="search-input"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder='e.g. "manakish", "labneh"'
                            className="haye-input"
                        />

                        {/* Exclude allergens */}
                        <div className="flex flex-col gap-1">
                            <label className="flex items-start gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={excludeAllergens}
                                    onChange={(e) =>
                                        setExcludeAllergens(e.target.checked)
                                    }
                                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                                />
                                <span>Exclude my allergens</span>
                            </label>

                            {excludeAllergens && userAllergies.length === 0 && (
                                <div className="text-xs opacity-70">
                                    No allergens are saved in your profile, so
                                    this filter will not hide anything.
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-sm opacity-80">Searching...</div>
                        ) : null}

                        <ul className="divide-y divide-border/70">
                            {visibleResults.map((f) => {
                                const base = `${f.serving_size}${f.serving_unit}`;
                                const kcal = Math.round(
                                    f.calories_kcal ?? f.calories ?? 0,
                                );
                                const p = Math.round(
                                    (f.protein_g ?? f.protein ?? 0) as number,
                                );
                                const c = Math.round(
                                    (f.carbs_g ?? f.carbs ?? 0) as number,
                                );
                                const fat = Math.round(
                                    (f.fat_g ?? f.fat ?? 0) as number,
                                );

                                const wouldBeExcluded =
                                    excludeAllergens &&
                                    userAllergies.length > 0 &&
                                    foodHasUserAllergen(f, userAllergies);

                                return (
                                    <li
                                        key={f.id}
                                        className="flex items-center justify-between gap-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="truncate font-medium">
                                                    {f.name}
                                                </div>
                                                {f.category ? (
                                                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                        {f.category}
                                                    </span>
                                                ) : null}
                                                {wouldBeExcluded ? (
                                                    <span className="rounded-full border border-red-500/30 px-2 py-0.5 text-[11px] text-red-500">
                                                        Contains allergen
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="text-xs opacity-80">
                                                per {base} · {kcal} kcal · P {p} · C {c} · F {fat}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openAddDialog(f)}
                                            className="shrink-0 rounded-full border border-border/70 px-3 py-1.5 text-sm text-foreground transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                                        >
                                            Add
                                        </button>
                                    </li>
                                );
                            })}

                            {!loading && visibleResults.length === 0 && (
                                <li className="py-4 text-sm opacity-80">
                                    No results.
                                    {excludeAllergens &&
                                    userAllergies.length > 0 ? (
                                        <span className="mt-1 block text-xs opacity-70">
                                            Try turning off "Exclude my
                                            allergens", or clearing the category
                                            filter.
                                        </span>
                                    ) : null}
                                </li>
                            )}
                        </ul>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                className="rounded-full border border-border/70 px-3 py-1.5 text-sm transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-40"
                            >
                                Previous
                            </button>

                            <div className="text-sm opacity-80">
                                Page {page}
                            </div>

                            <button
                                type="button"
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-full border border-border/70 px-3 py-1.5 text-sm transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <ProductSection
                        title="Safe swaps"
                        description="Suggestions stay filtered around your saved allergies and today&apos;s remaining macros."
                        contentClassName="space-y-3"
                    >
                        {safeRecommendations.length > 0 ? (
                            safeRecommendations.slice(0, 4).map((food) => (
                                <button
                                    key={`swap-${food.id}`}
                                    type="button"
                                    onClick={() => openAddDialog(food)}
                                    className="flex w-full items-start justify-between gap-4 rounded-[22px] border border-border/70 bg-background/72 p-4 text-left transition hover:border-secondary/35 hover:bg-card"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="size-4 text-secondary" />
                                            <p className="text-sm font-semibold text-foreground">
                                                {food.name}
                                            </p>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {Math.round(food.calories ?? 0)} kcal, P{' '}
                                            {Math.round(food.protein_g ?? food.protein ?? 0)}, C{' '}
                                            {Math.round(food.carbs_g ?? food.carbs ?? 0)}, F{' '}
                                            {Math.round(food.fat_g ?? food.fat ?? 0)}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                                        Add
                                        <ArrowRight className="size-3.5" />
                                    </span>
                                </button>
                            ))
                        ) : (
                            <ProductEmptyState
                                title="No safe swap suggestions yet"
                                description="Recommendations appear here when the planner context and remaining macros are available."
                            />
                        )}
                    </ProductSection>

                    <ProductSection
                        title="Coach prompt"
                        description="The next useful follow-up is prepared for you so the coach stays attached to the logging flow."
                        contentClassName="space-y-4"
                    >
                        <div className="rounded-[24px] border border-accent/25 bg-accent/10 p-4 text-sm leading-7 text-foreground">
                            {coachPrompt}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                                <p className="haye-kicker">Selected meal</p>
                                <p className="mt-3 text-base font-semibold text-foreground">
                                    {mealTypeLabel}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {macro(selectedMealTotals.calories)} kcal are already
                                    logged in this block.
                                </p>
                            </div>
                            <div className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                                <p className="haye-kicker">Today&apos;s note</p>
                                <p className="mt-3 text-base font-semibold text-foreground">
                                    {alignment.label}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {alignment.copy}
                                </p>
                            </div>
                        </div>
                    </ProductSection>
                </section>

                <section className={`mt-6 ${CARD} p-0`}>
                    <div className="border-b border-border/70 p-3 font-medium">
                        Meal timeline
                    </div>
                    <div className="grid gap-4 p-3 md:grid-cols-2 xl:grid-cols-3">
                        {mealTimeline.map(({ meal, totals, entries: mealEntries }) => (
                            <div
                                key={meal}
                                className="rounded-[22px] border border-border/70 bg-background/70 p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold capitalize text-foreground">
                                            {meal}
                                        </h3>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {macro(totals.calories)} kcal · P{' '}
                                            {macro(totals.protein)} · C{' '}
                                            {macro(totals.carbs)} · F{' '}
                                            {macro(totals.fat)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onPickMealType(meal)}
                                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {mealEntries.length > 0 ? (
                                        mealEntries.map((entry) => {
                                            const approxGrams = Math.round(
                                                (Number(entry.servings ?? 0) || 0) *
                                                    (entry.food?.serving_size ?? 0),
                                            );
                                            const portionsRaw = Number(entry.servings ?? 0);
                                            const portions = Number.isInteger(
                                                portionsRaw,
                                            )
                                                ? portionsRaw
                                                : Math.round(portionsRaw * 10) / 10;

                                            return (
                                                <div
                                                    key={entry.id}
                                                    className="rounded-2xl bg-card px-3 py-3 shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate font-medium text-foreground">
                                                                {entry.food.name}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {portions} portion
                                                                {portions === 1 ? '' : 's'} (~
                                                                {approxGrams}
                                                                {entry.food.serving_unit})
                                                            </div>
                                                            <div className="mt-2 text-xs text-muted-foreground">
                                                                {Math.round(
                                                                    entry.food.calories,
                                                                )}{' '}
                                                                kcal · P{' '}
                                                                {Math.round(
                                                                    entry.food.protein,
                                                                )}{' '}
                                                                · C{' '}
                                                                {Math.round(
                                                                    entry.food.carbs,
                                                                )}{' '}
                                                                · F{' '}
                                                                {Math.round(
                                                                    entry.food.fat,
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeEntry(entry.id)
                                                            }
                                                            className="shrink-0 rounded-full border border-red-500/20 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/10 focus:ring-2 focus:ring-red-500/30 focus:outline-none"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                                            Nothing logged yet for this meal.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Entries list */}
                <section
                    aria-labelledby="entries"
                    className={`mt-6 ${CARD} p-0`}
                >
                    <div
                        className="border-b border-border/70 p-3 font-medium"
                        id="entries"
                    >
                        Your entries for {date}
                    </div>

                    <div className="p-3">
                        <ul className="divide-y divide-border/70">
                            {entries.map((e) => {
                                const approxGrams = Math.round(
                                    (Number(e.servings ?? 0) || 0) *
                                        (e.food?.serving_size ?? 0),
                                );
                                const portionsRaw = Number(e.servings ?? 0);
                                const portions = Number.isInteger(portionsRaw)
                                    ? portionsRaw
                                    : Math.round(portionsRaw * 10) / 10;

                                const f = e.food;

                                return (
                                    <li
                                        key={e.id}
                                        className="flex items-center justify-between gap-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">
                                                <span className="capitalize">
                                                    {e.meal_type}
                                                </span>{' '}
                                                · {f.name}
                                            </div>
                                            <div className="text-xs opacity-80">
                                                {portions} portion
                                                {portions === 1 ? '' : 's'} (~
                                                {approxGrams}
                                                {f.serving_unit}) ·{' '}
                                                {`${Math.round(f.calories)} kcal · P ${Math.round(f.protein)} · C ${Math.round(f.carbs)} · F ${Math.round(f.fat)}`}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeEntry(e.id)}
                                            className="shrink-0 rounded text-sm text-red-600 hover:underline focus:ring-2 focus:ring-red-500/30 focus:outline-none"
                                        >
                                            Remove
                                        </button>
                                    </li>
                                );
                            })}

                            {entries.length === 0 && (
                                <li className="py-4 text-sm opacity-80">
                                    Nothing yet for this day.
                                </li>
                            )}
                        </ul>
                    </div>
                </section>
            </ProductPageShell>

            {/* Add Dialog (fixed theming + mobile inputs) */}
            {openAdd && selected && (
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
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                                Add to{' '}
                                <span className="capitalize">{mealType}</span>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddDialog}
                                className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-3">
                            <div className="font-semibold">{selected.name}</div>
                            <div className="text-xs opacity-75">
                                Base: {selected.serving_size}
                                {selected.serving_unit}
                            </div>
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setAddMode('portion')}
                                className={`rounded-full border px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                                    addMode === 'portion'
                                        ? 'border-secondary/35 bg-secondary/10 focus:ring-ring'
                                        : 'border-border/70 hover:bg-background focus:ring-ring'
                                }`}
                            >
                                Servings
                            </button>

                            <button
                                type="button"
                                onClick={() => setAddMode('grams')}
                                className={`rounded-full border px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                                    addMode === 'grams'
                                        ? 'border-secondary/35 bg-secondary/10 focus:ring-ring'
                                        : 'border-border/70 hover:bg-background focus:ring-ring'
                                }`}
                            >
                                Grams / mL
                            </button>
                        </div>

                        {addMode === 'portion' ? (
                            <div className="mb-3">
                                <label
                                    className="block text-sm"
                                    htmlFor="portionCount"
                                >
                                    Servings (1 serving ={' '}
                                    {selected.serving_size}
                                    {selected.serving_unit})
                                </label>
                                <input
                                    id="portionCount"
                                    type="number"
                                    inputMode="decimal"
                                    min={0.25}
                                    step={0.25}
                                    value={portionCount}
                                    onChange={(e) =>
                                        setPortionCount(Number(e.target.value))
                                    }
                                    className="haye-input mt-1"
                                />
                            </div>
                        ) : (
                            <div className="mb-3">
                                <label
                                    className="block text-sm"
                                    htmlFor="gramsValue"
                                >
                                    Amount in {selected.serving_unit}
                                </label>
                                <input
                                    id="gramsValue"
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    step={1}
                                    value={gramsValue}
                                    onChange={(e) =>
                                        setGramsValue(
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                    className="haye-input mt-1"
                                />
                            </div>
                        )}

                        <div className="mb-4 rounded-[24px] border border-border/70 bg-background/72 p-4">
                            <div className="mb-1 text-xs opacity-75">
                                Preview
                            </div>
                            {(() => {
                                const pr = computedPreview();
                                return (
                                    <div className="text-sm">
                                        ~{pr.grams}
                                        {selected.serving_unit} / {pr.calories}{' '}
                                        kcal / P {pr.protein} / C {pr.carbs} / F{' '}
                                        {pr.fat}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeAddDialog}
                                className="rounded-full border border-border/70 px-4 py-2 text-sm transition hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmAdd}
                                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-95 focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Add to {mealType}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/** Stat card with percent of target */
function StatCard({
    label,
    macroKey,
    value,
    consumed,
    target,
    unit,
}: {
    label: string;
    macroKey: MacroKey;
    value: string;
    consumed?: number;
    target?: number;
    unit?: 'kcal' | 'g';
}) {
    const hasTarget =
        typeof target === 'number' &&
        target > 0 &&
        typeof consumed === 'number';
    const pct = hasTarget
        ? Math.max(0, Math.round((consumed! / Math.max(1, target!)) * 100))
        : null;
    const basePct = pct === null ? 0 : Math.min(100, pct);
    const overflowPct =
        pct === null ? 0 : Math.min(100, Math.max(0, pct - 100));
    const feedback = hasTarget
        ? macroFeedback(macroKey, consumed!, target!)
        : null;

    return (
        <div className={CARD_SM}>
            <div className="text-xs tracking-wide uppercase opacity-80">
                {label}
            </div>
            <div className="text-lg font-semibold">{value}</div>

            <div className="mt-3">
                {hasTarget ? (
                    <>
                        {overflowPct > 0 && (
                            <div className="mb-1">
                                <div className="h-1.5 w-full rounded bg-black/10 dark:bg-white/10">
                                    <div
                                        className="h-1.5 rounded bg-amber-500"
                                        style={{
                                            width: `${overflowPct}%`,
                                            transition: 'width 250ms ease',
                                        }}
                                    />
                                </div>
                                <div className="mt-1 text-[11px] leading-none text-amber-600 dark:text-amber-300">
                                    +{overflowPct}%
                                </div>
                            </div>
                        )}

                        <div className="h-2 w-full rounded bg-black/10 dark:bg-white/10">
                            <div
                                className="h-2 rounded bg-primary"
                                style={{
                                    width: `${basePct}%`,
                                    transition: 'width 250ms ease',
                                }}
                                role="progressbar"
                                aria-label={`${label} progress`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={basePct}
                            />
                        </div>

                        <div className="mt-1 text-[11px] opacity-80">
                            {Math.round(consumed!)} {unit} /{' '}
                            {Math.round(target!)} {unit} ({pct}%)
                        </div>
                        {feedback ? (
                            <div
                                className={`mt-1 text-[11px] ${
                                    feedback.tone === 'good'
                                        ? 'text-emerald-600 dark:text-emerald-300'
                                        : feedback.tone === 'warn'
                                          ? 'text-amber-600 dark:text-amber-300'
                                          : 'text-red-600 dark:text-red-300'
                                }`}
                            >
                                {feedback.message}
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="text-[11px] opacity-80">
                        No target set for {label.toLowerCase()}.
                    </div>
                )}
            </div>
        </div>
    );
}

function macroFeedback(
    macro: MacroKey,
    consumed: number,
    target: number,
): { message: string; tone: 'good' | 'warn' | 'risk' } {
    const ratio = target > 0 ? consumed / target : 0;

    if (ratio < 0.5) {
        return { message: 'Way behind your target for now.', tone: 'warn' };
    }
    if (ratio < 0.85) {
        return {
            message: 'Behind target. Try to close the gap in your next meals.',
            tone: 'warn',
        };
    }
    if (ratio < 1.0) {
        return { message: 'Close to target. You are on track.', tone: 'good' };
    }
    if (ratio <= 1.1) {
        return { message: 'Target reached.', tone: 'good' };
    }

    if (macro === 'protein') {
        if (ratio <= 1.3) {
            return {
                message:
                    'A bit over protein target. Usually manageable if calories stay controlled.',
                tone: 'warn',
            };
        }
        return {
            message:
                'Protein is well above target. Not usually as risky as fat, but still more than needed.',
            tone: 'warn',
        };
    }

    if (macro === 'fat') {
        if (ratio <= 1.2) {
            return {
                message:
                    'Slightly over fat target. Consider leaner choices for remaining meals.',
                tone: 'warn',
            };
        }
        return {
            message:
                'Fat intake is high above target. This can quickly push total calories up.',
            tone: 'risk',
        };
    }

    if (macro === 'calories') {
        if (ratio <= 1.2) {
            return { message: 'Slight calorie surplus.', tone: 'warn' };
        }
        return {
            message: 'Calorie intake is well above target today.',
            tone: 'risk',
        };
    }

    // carbs
    if (ratio <= 1.2) {
        return { message: 'Slightly over carb target.', tone: 'warn' };
    }
    return { message: 'Carb intake is well above target.', tone: 'risk' };
}
