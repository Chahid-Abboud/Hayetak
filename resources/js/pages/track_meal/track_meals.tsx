import NavHeader from '@/components/NavHeader';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
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
    'rounded-2xl border p-4 transition-colors duration-300 bg-white text-[#1C2C64] border-[#1C2C64]/20 dark:bg-[#0B1020] dark:text-white dark:border-white/15';
const CARD_SM =
    'rounded-xl border p-3 transition-colors duration-300 bg-white text-[#1C2C64] border-[#1C2C64]/20 dark:bg-[#0B1020] dark:text-white dark:border-white/15';

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

export default function TrackMealsPage() {
    const raw = usePage<PageProps>().props;

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
        userAllergies: raw.userAllergies ?? [],
    }));

    const [dayLoading, setDayLoading] = useState(false);

    const fetchDay = async (d: string) => {
        setDayLoading(true);
        try {
            const res = await axios.get<DayResponse>('/api/meal-tracker/day', {
                params: { date: d },
            });

            setDay({
                date: res.data?.date ?? d,
                dailyTotals: res.data?.dailyTotals ?? ZERO,
                mealTotals: res.data?.mealTotals ?? safeMealTotals(null),
                entries: Array.isArray(res.data?.entries)
                    ? res.data.entries
                    : [],
                targets: res.data?.targets ?? null,
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
            }));
        } finally {
            setDayLoading(false);
        }
    };

    useEffect(() => {
        fetchDay(date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

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
            await fetchDay(date);
            setTimeout(() => setStatusMessage(null), 4000);
        } catch {
            setStatusMessage('Could not add meal. Please try again.');
            setTimeout(() => setStatusMessage(null), 4000);
        }
    };

    const removeEntry = async (id: number) => {
        if (!confirm('Remove entry?')) return;
        await axios.delete(`/meal-entries/${id}`);
        await fetchDay(date);
    };

    const dailyTotals = day.dailyTotals ?? ZERO;
    const mealTotals = day.mealTotals ?? safeMealTotals(null);
    const entries = Array.isArray(day.entries) ? day.entries : [];
    const targets = day.targets ?? DEFAULT_TARGETS;
    const hasUserTargets = !!day.targets;

    const macro = (n: number) => Math.round(n);

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

    return (
        <>
            <Head title={title} />
            <NavHeader />

            <main className="mx-auto max-w-5xl px-4 py-6">
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

                    {statusMessage && (
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
                                    className={`rounded-xl border p-3 text-left transition focus:ring-2 focus:outline-none ${
                                        selectedTab
                                            ? 'border-[#1C2C64]/40 ring-[#1C2C64]/25 dark:border-white/40 dark:ring-white/25'
                                            : 'border-[#1C2C64]/15 hover:bg-[#1C2C64]/5 dark:border-white/15 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <div className="text-sm font-medium capitalize">
                                        {mt}
                                    </div>
                                    <div className="mt-1 text-[11px] opacity-80">
                                        {macro(mealTotals[mt].calories)} kcal ·
                                        P {macro(mealTotals[mt].protein)} · C{' '}
                                        {macro(mealTotals[mt].carbs)} · F{' '}
                                        {macro(mealTotals[mt].fat)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Search + filtering */}
                <section className={`mt-6 ${CARD} p-0`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1C2C64]/10 px-3 py-2 dark:border-white/10">
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
                                    className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:text-white dark:hover:bg-white/10 dark:focus:ring-white/25"
                                >
                                    All foods
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={clearSearch}
                                className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:text-white dark:hover:bg-white/10 dark:focus:ring-white/25"
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
                            placeholder={`e.g. "manakish", "labneh"`}
                            className="w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 text-[#1C2C64] outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
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
                                    className="mt-0.5 h-4 w-4 rounded border-[#1C2C64]/30 text-[#1C2C64] focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/20 dark:text-white dark:focus:ring-white/25"
                                />
                                <span>Exclude my allergens</span>
                            </label>

                            {excludeAllergens && userAllergies.length === 0 && (
                                <div className="text-xs opacity-70">
                                    No allergens set in your profile — this
                                    filter won’t hide anything.
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-sm opacity-80">Searching…</div>
                        ) : null}

                        <ul className="divide-y divide-[#1C2C64]/10 dark:divide-white/10">
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
                                                    <span className="rounded-full border border-[#1C2C64]/20 px-2 py-0.5 text-[11px] opacity-80 dark:border-white/20">
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
                                                per {base} · {kcal} kcal · P {p}{' '}
                                                · C {c} · F {fat}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openAddDialog(f)}
                                            className="shrink-0 rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:text-white dark:hover:bg-white/10 dark:focus:ring-white/25"
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
                                            Try turning off “Exclude my
                                            allergens”, or clearing the category
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
                                className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                ← Prev
                            </button>

                            <div className="text-sm opacity-80">
                                Page {page}
                            </div>

                            <button
                                type="button"
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </section>

                {/* Entries list */}
                <section
                    aria-labelledby="entries"
                    className={`mt-6 ${CARD} p-0`}
                >
                    <div
                        className="border-b border-[#1C2C64]/10 p-3 font-medium dark:border-white/10"
                        id="entries"
                    >
                        Your entries for {date}
                    </div>

                    <div className="p-3">
                        <ul className="divide-y divide-[#1C2C64]/10 dark:divide-white/10">
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
            </main>

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

                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#1C2C64]/20 bg-white p-4 text-[#1C2C64] shadow-xl dark:border-white/15 dark:bg-[#0B1020] dark:text-white">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                                Add to{' '}
                                <span className="capitalize">{mealType}</span>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddDialog}
                                className="rounded-lg border border-[#1C2C64]/20 px-2 py-1 text-xs hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
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
                                className={`rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                                    addMode === 'portion'
                                        ? 'border-[#1C2C64]/60 bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/40 dark:bg-white/10 dark:focus:ring-white/25'
                                        : 'border-[#1C2C64]/20 hover:bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25'
                                }`}
                            >
                                Servings
                            </button>

                            <button
                                type="button"
                                onClick={() => setAddMode('grams')}
                                className={`rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                                    addMode === 'grams'
                                        ? 'border-[#1C2C64]/60 bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/40 dark:bg-white/10 dark:focus:ring-white/25'
                                        : 'border-[#1C2C64]/20 hover:bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25'
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
                                    className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
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
                                    className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                />
                            </div>
                        )}

                        <div className="mb-4 rounded-lg border border-[#1C2C64]/15 p-3 dark:border-white/10">
                            <div className="mb-1 text-xs opacity-75">
                                Preview
                            </div>
                            {(() => {
                                const pr = computedPreview();
                                return (
                                    <div className="text-sm">
                                        ~{pr.grams}
                                        {selected.serving_unit} · {pr.calories}{' '}
                                        kcal · P {pr.protein} · C {pr.carbs} · F{' '}
                                        {pr.fat}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeAddDialog}
                                className="rounded-lg border border-[#1C2C64]/20 px-3 py-2 text-sm hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmAdd}
                                className="rounded-lg bg-[#1C2C64] px-4 py-2 text-sm font-medium text-white hover:opacity-95 focus:ring-2 focus:ring-[#1C2C64]/40 focus:outline-none dark:bg-white dark:text-[#0B1020] dark:focus:ring-white/30"
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
                                className="h-2 rounded bg-[#1C2C64] dark:bg-white"
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
