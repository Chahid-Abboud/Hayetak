import { Head, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import NavHeader from "@/components/NavHeader";

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type MealTotals = Record<"breakfast" | "lunch" | "dinner" | "snack" | "drink", Totals>;
type Unit = string;
type EntryItem = {
  id: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "drink";
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
  };
};
type Targets = Partial<Totals>;

type PageProps = {
  date?: string;
  dailyTotals?: Totals | null;
  mealTotals?: Partial<MealTotals> | null;
  entries?: EntryItem[] | null;
  targets?: Targets;
};

type SearchFood = {
  id: number;
  name: string;
  serving_unit: Unit;
  serving_size: number;
  calories?: number; calories_kcal?: number;
  protein?: number; protein_g?: number;
  carbs?: number; carbs_g?: number;
  fat?: number; fat_g?: number;
};

const ZERO: Totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const MEALS = ["breakfast", "lunch", "dinner", "snack", "drink"] as const;

const CARD =
  "rounded-2xl border p-4 transition-colors duration-300 bg-white text-[#1C2C64] border-[#1C2C64]/20 dark:bg-[#0B1020] dark:text-white dark:border-white/20";
const CARD_SM =
  "rounded-xl border p-3 transition-colors duration-300 bg-white text-[#1C2C64] border-[#1C2C64]/20 dark:bg-[#0B1020] dark:text-white dark:border-white/20";

export default function TrackMealsPage() {
  const raw = usePage<PageProps>().props;

  const date = raw.date ?? new Date().toISOString().slice(0, 10);
  const dailyTotals: Totals = raw.dailyTotals ?? ZERO;
  const mealTotals: MealTotals = {
    breakfast: raw.mealTotals?.breakfast ?? ZERO,
    lunch: raw.mealTotals?.lunch ?? ZERO,
    dinner: raw.mealTotals?.dinner ?? ZERO,
    snack: raw.mealTotals?.snack ?? ZERO,
    drink: raw.mealTotals?.drink ?? ZERO,
  };
  const entries: EntryItem[] = Array.isArray(raw.entries) ? raw.entries : [];
  const targets = raw.targets;

  const [category, setCategory] = useState<(typeof MEALS)[number]>("breakfast");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [openAdd, setOpenAdd] = useState(false);
  const [selected, setSelected] = useState<SearchFood | null>(null);
  const [addMode, setAddMode] = useState<"portion" | "grams">("portion");
  const [portionCount, setPortionCount] = useState<number>(1);
  const [gramsValue, setGramsValue] = useState<number | "">("");

  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/foods/search", { params: { category, q, page } });
        setResults(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [category, q, page]);

  const title = useMemo(() => "Meal Tracker", []);

  const goTo = (target: string) => {
    const sep = window.location.pathname.includes("?") ? "&" : "?";
    window.location.href = `/track-meals${sep}date=${target}`;
  };

  const openAddDialog = (food: SearchFood) => {
    setSelected(food);
    setAddMode("portion");
    setPortionCount(1);
    setGramsValue("");
    setOpenAdd(true);
  };
  const closeAddDialog = () => { setOpenAdd(false); setSelected(null); };

  const norm = (v?: number, alt?: number) => Math.max(0, Math.round((v ?? alt ?? 0) as number));
  const toBaseMacros = (f: SearchFood) => ({
    calories: norm(f.calories, f.calories_kcal),
    protein: norm(f.protein, f.protein_g),
    carbs: norm(f.carbs, f.carbs_g),
    fat: norm(f.fat, f.fat_g),
  });

  const computeServings = (): number => {
    if (!selected) return 0;
    if (addMode === "portion") return Number(portionCount) > 0 ? Number(portionCount) : 0;
    const g = Number(gramsValue);
    const base = selected.serving_size || 100;
    return g > 0 && base > 0 ? g / base : 0;
  };

  const computedPreview = () => {
    if (!selected) return { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
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
    await axios.post("/meal-entries", {
      food_id: selected.id,
      meal_type: category,
      servings,
      eaten_at: date,
    });
    closeAddDialog();
    window.location.reload();
  };

  const macro = (n: number) => Math.round(n);

  return (
    <>
      <Head title={title} />
      <NavHeader />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Header + date controls (keep neutral colors) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#1C2C64] dark:text-white">{title}</h1>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] dark:border-white/20 dark:text-white"
              onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); goTo(d.toISOString().slice(0, 10)); }}
            >
              ← Previous
            </button>
            <div className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] dark:border-white/20 dark:text-white">
              {date}
            </div>
            <button
              className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64] dark:border-white/20 dark:text-white"
              onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); goTo(d.toISOString().slice(0, 10)); }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Daily totals */}
        <section aria-labelledby="totals" className={CARD}>
          <h2 id="totals" className="sr-only">Daily totals</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Calories" value={`${macro(dailyTotals.calories)} kcal`} unit="kcal" consumed={dailyTotals.calories} target={targets?.calories} />
            <StatCard label="Protein" value={`${macro(dailyTotals.protein)} g`} unit="g" consumed={dailyTotals.protein} target={targets?.protein} />
            <StatCard label="Carbs" value={`${macro(dailyTotals.carbs)} g`} unit="g" consumed={dailyTotals.carbs} target={targets?.carbs} />
            <StatCard label="Fat" value={`${macro(dailyTotals.fat)} g`} unit="g" consumed={dailyTotals.fat} target={targets?.fat} />
          </div>

          {!targets && (
            <div className="mt-1 text-[11px] opacity-80">
              Tip: pass <code>targets</code> from your controller (e.g., based on BMI &amp; goals) to enable percentages.
            </div>
          )}
        </section>

        {/* Per-meal totals */}
        <section aria-labelledby="meals" className={`mt-6 ${CARD}`}>
          <h2 id="meals" className="sr-only">Per-meal totals</h2>
          <div role="tablist" aria-label="Meal Types" className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {MEALS.map((mt) => {
              const selectedTab = mt === category;
              return (
                <button
                  key={mt}
                  role="tab"
                  aria-selected={selectedTab}
                  aria-controls={`panel-${mt}`}
                  id={`tab-${mt}`}
                  onClick={() => setCategory(mt)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedTab
                      ? "border-white ring-1 ring-white dark:border-[#1C2C64] dark:ring-[#1C2C64]"
                      : "border-white/20 hover:bg-white/5 dark:border-[#1C2C64]/20 dark:hover:bg-[#1C2C64]/5"
                  }`}
                >
                  <div className="text-sm font-medium capitalize">{
                    mt
                  }</div>
                  <div className="mt-1 text-[11px] opacity-80">
                    {macro(mealTotals[mt].calories)} kcal · P {macro(mealTotals[mt].protein)} · C {macro(mealTotals[mt].carbs)} · F {macro(mealTotals[mt].fat)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Search */}
        <section id={`panel-${category}`} role="tabpanel" aria-labelledby={`tab-${category}`} className={`mt-6 ${CARD} p-0`}>
          <h2 className="sr-only">Food search</h2>

          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 dark:border-[#1C2C64]/10">
            <div className="text-sm font-medium">
              Add to <span className="capitalize">{category}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQ("")}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10 dark:border-[#1C2C64]/20 dark:hover:bg-[#1C2C64]/10"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <label className="block text-sm" htmlFor="search-input">
              Search {category} foods
            </label>
            <input
              id="search-input"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={`e.g. "manakish", "labneh"`}
              className="w-full rounded-lg border border-white/20 px-3 py-2 text-[#1C2C64] outline-none focus:ring-2 focus:ring-white/40 dark:border-[#1C2C64]/20 dark:text-[#1C2C64] dark:focus:ring-[#1C2C64]/30 bg-white"
            />
            {loading ? <div className="text-sm opacity-80">Searching…</div> : null}

            <ul className="divide-y divide-white/10 dark:divide-[#1C2C64]/10">
              {results.map((f) => {
                const base = `${f.serving_size}${f.serving_unit}`;
                const kcal = Math.round(f.calories_kcal ?? f.calories ?? 0);
                const p = Math.round((f.protein_g ?? f.protein ?? 0) as number);
                const c = Math.round((f.carbs_g ?? f.carbs ?? 0) as number);
                const fat = Math.round((f.fat_g ?? f.fat ?? 0) as number);
                return (
                  <li key={f.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs opacity-80">
                        per {base} · {kcal} kcal · P {p} · C {c} · F {fat}
                      </div>
                    </div>
                    <button
                      onClick={() => openAddDialog(f)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10 dark:border-[#1C2C64]/20 dark:hover:bg-[#1C2C64]/10"
                    >
                      Add
                    </button>
                  </li>
                );
              })}
              {!loading && results.length === 0 && (
                <li className="py-4 text-sm opacity-80">No results.</li>
              )}
            </ul>

            {/* Simple paging controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-white/10 dark:border-[#1C2C64]/20 dark:hover:bg-[#1C2C64]/10"
              >
                ← Prev
              </button>
              <div className="text-sm opacity-80">Page {page}</div>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10 dark:border-[#1C2C64]/20 dark:hover:bg-[#1C2C64]/10"
              >
                Next →
              </button>
            </div>
          </div>
        </section>

        {/* Entries list */}
        <section aria-labelledby="entries" className={`mt-6 ${CARD} p-0`}>
          <div className="border-b border-white/10 p-3 font-medium dark:border-[#1C2C64]/10" id="entries">
            Your entries for {date}
          </div>
          <div className="p-3">
            <ul className="divide-y divide-white/10 dark:divide-[#1C2C64]/10">
              {entries.map((e) => {
                const approxGrams = Math.round((e.servings ?? 0) * (e.food?.serving_size ?? 0));
                const portionsRaw = Number(e.servings ?? 0);
                const portions = Number.isInteger(portionsRaw) ? portionsRaw : Math.round(portionsRaw * 10) / 10;
                const f =
                  e.food ??
                  ({ calories: 0, protein: 0, carbs: 0, fat: 0, serving_unit: "g", serving_size: 0, id: 0, name: "" } as EntryItem["food"]);

                return (
                  <li key={e.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">
                        <span className="capitalize">{e.meal_type}</span> · {f.name}
                      </div>
                      <div className="text-xs opacity-80">
                        {portions} portion{portions === 1 ? "" : "s"} (~{approxGrams}{f.serving_unit}) ·{" "}
                        {`${Math.round(f.calories)} kcal · P ${Math.round(f.protein)} · C ${Math.round(f.carbs)} · F ${Math.round(f.fat)}`}
                      </div>
                    </div>
                    <form
                      method="post"
                      action={`/meal-entries/${e.id}`}
                      onSubmit={(ev) => { if (!confirm("Remove entry?")) ev.preventDefault(); }}
                    >
                      <input type="hidden" name="_method" value="delete" />
                      <input
                        type="hidden"
                        name="_token"
                        value={(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ""}
                      />
                      <button className="text-sm text-red-200 hover:underline dark:text-red-600">Remove</button>
                    </form>
                  </li>
                );
              })}
              {entries.length === 0 && (
                <li className="py-4 text-sm opacity-80">Nothing yet for today.</li>
              )}
            </ul>
          </div>
        </section>
      </main>

      {/* Add Dialog (kept white always for clarity) */}
      {openAdd && selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={closeAddDialog} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#1C2C64]/20 bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-[#1C2C64]">
                Add to <span className="capitalize">{category}</span>
              </div>
              <button
                onClick={closeAddDialog}
                className="rounded-lg border border-[#1C2C64]/20 px-2 py-1 text-xs text-[#1C2C64]"
              >
                Close
              </button>
            </div>

            <div className="mb-2">
              <div className="font-semibold text-[#1C2C64]">{selected.name}</div>
              <div className="text-xs text-[#1C2C64]/70">
                Base: {selected.serving_size}{selected.serving_unit}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAddMode("portion")}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  addMode === "portion" ? "border-[#1C2C64] ring-1 ring-[#1C2C64]" : "border-[#1C2C64]/20"
                }`}
              >
                Portions
              </button>
              <button
                type="button"
                onClick={() => setAddMode("grams")}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  addMode === "grams" ? "border-[#1C2C64] ring-1 ring-[#1C2C64]" : "border-[#1C2C64]/20"
                }`}
              >
                Grams / mL
              </button>
            </div>

            {addMode === "portion" ? (
              <div className="mb-3">
                <label className="block text-sm text-[#1C2C64]" htmlFor="portionCount">
                  Portions (1 portion = {selected.serving_size}{selected.serving_unit})
                </label>
                <input
                  id="portionCount"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={portionCount}
                  onChange={(e) => setPortionCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30"
                />
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm text-[#1C2C64]" htmlFor="gramsValue">
                  Amount in {selected.serving_unit}
                </label>
                <input
                  id="gramsValue"
                  type="number"
                  min={1}
                  step={1}
                  value={gramsValue}
                  onChange={(e) => setGramsValue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30"
                />
              </div>
            )}

            <div className="mb-3 rounded-lg border border-[#1C2C64]/15 p-3">
              <div className="mb-1 text-xs text-[#1C2C64]/70">Preview for this addition</div>
              {(() => {
                const pr = computedPreview();
                return (
                  <div className="text-sm text-[#1C2C64]">
                    ~{pr.grams}{selected.serving_unit} · {pr.calories} kcal · P {pr.protein} · C {pr.carbs} · F {pr.fat}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeAddDialog}
                className="rounded-lg border border-[#1C2C64]/20 px-3 py-1.5 text-sm text-[#1C2C64]"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="rounded-lg border border-[#1C2C64] bg-[#1C2C64] px-3 py-1.5 text-sm text-white"
              >
                Add to {category}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Stat card that also inverts with theme */
function StatCard({
  label, value, consumed, target, unit,
}: {
  label: string;
  value: string;
  consumed?: number;
  target?: number;
  unit?: "kcal" | "g";
}) {
  const hasTarget = typeof target === "number" && target > 0 && typeof consumed === "number";
  const rawPct = hasTarget ? (consumed! / Math.max(1, target!)) * 100 : 0;
  const pct = Math.max(0, Math.round(rawPct));
  const basePct = Math.min(100, pct);
  const overflowPct = Math.min(100, Math.max(0, pct - 100));

  let fillClass = "bg-accent";
  if (pct < 50) fillClass = "bg-destructive";
  else if (pct > 80) fillClass = "bg-secondary";

  return (
    <div className={CARD_SM}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>

      <div className="mt-3">
        {hasTarget && overflowPct > 0 && (
          <div className="mb-1">
            <div className="h-1.5 w-full rounded bg-muted">
              <div
                className="h-1.5 rounded bg-amber-500"
                style={{ width: `${overflowPct}%`, transition: "width 300ms ease" }}
                role="progressbar"
                aria-label={`${label} overflow`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overflowPct}
              />
            </div>
            <div className="mt-1 text-[11px] leading-none text-amber-300 dark:text-amber-700">+{overflowPct}%</div>
          </div>
        )}

        <div className="h-2 w-full rounded bg-muted">
          <div
            className={`h-2 rounded ${hasTarget ? fillClass : "bg-muted"}`}
            style={{ width: hasTarget ? `${basePct}%` : "0%", transition: "width 300ms ease" }}
            role="progressbar"
            aria-label={`${label} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hasTarget ? basePct : undefined}
          />
        </div>

        <div className="mt-1 text-[11px] opacity-80">
          {hasTarget
            ? `${Math.round(consumed!)} ${unit} / ${Math.round(target!)} ${unit} (${pct}%)`
            : `No target provided for ${label.toLowerCase()}.`}
        </div>
      </div>
    </div>
  );
}
