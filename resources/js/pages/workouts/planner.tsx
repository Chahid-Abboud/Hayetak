import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import NavHeader from "@/components/NavHeader";

// ===================== Types =====================
type Exercise = {
  id: number;
  name: string;
  primary_muscle: string;
  equipment?: string | null;
  demo_url?: string | null;
};

type DayDraft = {
  day_index: number;
  title: string;
  exercises: { exercise_id: number; target_sets: number; target_reps: number }[];
};

type PlanDay = {
  day_index: number;
  title?: string | null;
  exercises: {
    id: number;
    name: string;
    primary_muscle: string;
    pivot: { target_sets: number; target_reps: number };
  }[];
};

type Plan = {
  id: number;
  name: string;
  days_per_week: number;
  days: PlanDay[];
} | null;

type Props = { plan: Plan; exercises: Exercise[] };

// ===================== Constants =====================
const MUSCLES = ["chest", "back", "shoulders", "legs", "glutes", "biceps", "triceps", "core", "calves"] as const;
const PAGE_SIZE = 40;
const normalize = (s: string) => s.toLowerCase().trim();

// ===================== Small UI Primitives =====================
const Chip = memo(function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-full border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
});

// ===================== Main Page =====================
export default function PlannerPage() {
  const { plan, exercises } = usePage<Props>().props;

  const [daysPerWeek, setDaysPerWeek] = useState<number>(plan?.days_per_week ?? 3);
  const [days, setDays] = useState<DayDraft[]>(() => buildInitialDays(plan));

  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---------- Library state ----------
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "muscle">("name");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeAddDay, setActiveAddDay] = useState<number>(1);

  // ---------- Derived helpers ----------
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const totalDaysArray = useMemo(() => Array.from({ length: daysPerWeek }, (_, i) => i + 1), [daysPerWeek]);

  // Keep days length synced with daysPerWeek
  useEffect(() => {
    setDays((prev) => syncDaysLength(prev, daysPerWeek));
    if (activeAddDay > daysPerWeek) setActiveAddDay(daysPerWeek);
  }, [daysPerWeek]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Filter/sort library once
  const filteredLibrary = useMemo(() => {
    const q = normalize(debounced);
    let list = exercises;
    if (q) list = list.filter((e) => normalize(e.name).includes(q) || normalize(e.primary_muscle).includes(q));
    if (muscleFilters.length) {
      const s = new Set(muscleFilters);
      list = list.filter((e) => s.has(e.primary_muscle));
    }
    return [...list].sort((a, b) =>
      sortBy === "muscle"
        ? normalize(a.primary_muscle).localeCompare(normalize(b.primary_muscle)) || normalize(a.name).localeCompare(normalize(b.name))
        : normalize(a.name).localeCompare(normalize(b.name))
    );
  }, [exercises, debounced, muscleFilters, sortBy]);

  const pagedLibrary = useMemo(() => filteredLibrary.slice(0, visibleCount), [filteredLibrary, visibleCount]);

  // ---------- Mutations ----------
  const addExercise = useCallback((dayIdx: number, exId: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_index === dayIdx
          ? {
              ...d,
              exercises: d.exercises.some((x) => x.exercise_id === exId)
                ? d.exercises
                : [...d.exercises, { exercise_id: exId, target_sets: 3, target_reps: 10 }],
            }
          : d
      )
    );
  }, []);

  const updateSetRep = useCallback((dayIdx: number, i: number, field: "target_sets" | "target_reps", value: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_index === dayIdx
          ? { ...d, exercises: d.exercises.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)) }
          : d
      )
    );
  }, []);

  const removeExercise = useCallback((dayIdx: number, i: number) => {
    setDays((prev) => prev.map((d) => (d.day_index === dayIdx ? { ...d, exercises: d.exercises.filter((_, idx) => idx !== i) } : d)));
  }, []);

  const save = useCallback(() => {
    setSaving(true);
    setFlash(null);
    setErrors({});

    router.post(
      "/workouts/plan",
      { name: plan?.name ?? "My Plan", days_per_week: daysPerWeek, days },
      {
        preserveScroll: true,
        onSuccess: () => {
          router.reload({ only: ["plan"] });
          setFlash("Plan saved!");
        },
        onError: (e) => setErrors(e as any),
        onFinish: () => setSaving(false),
      }
    );
  }, [days, daysPerWeek, plan?.name]);

  // ---------- A11y flash focus ----------
  const flashRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (flash && flashRef.current) flashRef.current.focus();
  }, [flash]);

  // ---------- Helpers ----------
  const isInDay = useCallback(
    (dayIdx: number, exId: number) => days.find((d) => d.day_index === dayIdx)?.exercises.some((x) => x.exercise_id === exId) ?? false,
    [days]
  );

  // ===================== Render =====================
  return (
    <>
      <Head title="Workout Planner" />
      <NavHeader />

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        <HeaderBar
          daysPerWeek={daysPerWeek}
          setDaysPerWeek={setDaysPerWeek}
          saving={saving}
          save={save}
          flash={flash}
          flashRef={flashRef}
        />

        {Object.keys(errors).length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" aria-live="assertive">
            There were validation errors while saving. Check your sets/reps and try again.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <section aria-labelledby="days-label" className="space-y-4">
            <h2 id="days-label" className="sr-only">Plan days</h2>
            {days.slice(0, daysPerWeek).map((d) => (
              <DayCard
                key={d.day_index}
                day={d}
                exercisesById={exercisesById}
                onTitle={(title) => setDays((prev) => prev.map((x) => (x.day_index === d.day_index ? { ...x, title } : x)))}
                onUpdate={(i, field, val) => updateSetRep(d.day_index, i, field, val)}
                onRemove={(i) => removeExercise(d.day_index, i)}
              />
            ))}
          </section>

          <aside className="space-y-3">
            <LibraryPanel
              totalResults={filteredLibrary.length}
              search={search}
              setSearch={(v) => {
                setSearch(v);
                setVisibleCount(PAGE_SIZE);
              }}
              muscleFilters={muscleFilters}
              toggleMuscle={(m) => {
                setMuscleFilters((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
                setVisibleCount(PAGE_SIZE);
              }}
              clearMuscles={() => setMuscleFilters([])}
              sortBy={sortBy}
              setSortBy={setSortBy}
              daysPerWeek={daysPerWeek}
              activeAddDay={activeAddDay}
              setActiveAddDay={setActiveAddDay}
            />

            <LibraryGrid
              items={pagedLibrary}
              remaining={filteredLibrary.length - pagedLibrary.length}
              onLoadMore={() => setVisibleCount((c) => c + PAGE_SIZE)}
              onAdd={(exId) => addExercise(activeAddDay, exId)}
              isAdded={(exId) => isInDay(activeAddDay, exId)}
            />
          </aside>
        </div>
      </main>
    </>
  );
}

// ===================== Subcomponents =====================
function HeaderBar({
  daysPerWeek,
  setDaysPerWeek,
  saving,
  save,
  flash,
  flashRef,
}: {
  daysPerWeek: number;
  setDaysPerWeek: (n: number) => void;
  saving: boolean;
  save: () => void;
  flash: string | null;
  flashRef: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Workout Planner</h1>
        <p className="text-sm text-gray-500">Build or edit your weekly plan and quickly add exercises from the library.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm" htmlFor="days-per-week">Days / week</label>
        <input
          id="days-per-week"
          type="number"
          min={1}
          max={7}
          value={daysPerWeek}
          onChange={(e) => setDaysPerWeek(Math.min(7, Math.max(1, Number(e.target.value))))}
          className="w-20 border rounded px-2 py-1"
        />

        <button
          type="button"
          onClick={save}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Plan"}
        </button>

        {flash && (
          <span ref={flashRef} tabIndex={-1} className="text-sm text-green-700 ml-1 outline-none" role="status" aria-live="polite">
            {flash}
          </span>
        )}
      </div>
    </header>
  );
}

const DayCard = memo(function DayCard({
  day,
  exercisesById,
  onTitle,
  onUpdate,
  onRemove,
}: {
  day: DayDraft;
  exercisesById: Map<number, Exercise>;
  onTitle: (title: string) => void;
  onUpdate: (i: number, field: "target_sets" | "target_reps", val: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="font-semibold">Day {day.day_index}</div>
        <label className="sr-only" htmlFor={`title-${day.day_index}`}>Title</label>
        <input
          id={`title-${day.day_index}`}
          placeholder="Title (e.g., Push)"
          value={day.title}
          onChange={(e) => onTitle(e.target.value)}
          className="border rounded px-3 py-1 flex-1 min-w-[180px]"
        />
        <div className="ml-auto text-xs text-gray-500">{day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"}</div>
      </div>

      <div className="space-y-2">
        {day.exercises.length ? (
          day.exercises.map((ex, i) => {
            const ref = exercisesById.get(ex.exercise_id);
            if (!ref) return null;
            return (
              <ExerciseRow
                key={`${ex.exercise_id}-${i}`}
                name={ref.name}
                muscle={ref.primary_muscle}
                sets={ex.target_sets}
                reps={ex.target_reps}
                onSets={(v) => onUpdate(i, "target_sets", clamp(v, 1, 10))}
                onReps={(v) => onUpdate(i, "target_reps", clamp(v, 1, 30))}
                onRemove={() => onRemove(i)}
              />
            );
          })
        ) : (
          <div className="text-sm text-gray-500">No exercises yet. Add from the library →</div>
        )}
      </div>
    </div>
  );
});

const ExerciseRow = memo(function ExerciseRow({
  name,
  muscle,
  sets,
  reps,
  onSets,
  onReps,
  onRemove,
}: {
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  onSets: (v: number) => void;
  onReps: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border rounded p-2">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium">
          {name} <span className="text-xs text-gray-500 capitalize">({muscle})</span>
        </div>
        <div className="text-xs text-gray-500">Target: {sets}×{reps}</div>
      </div>

      <label className="sr-only" htmlFor={`sets-${name}`}>Target sets</label>
      <input
        id={`sets-${name}`}
        type="number"
        min={1}
        max={10}
        value={sets}
        onChange={(e) => onSets(Number(e.target.value))}
        className="w-16 border rounded px-2 py-1"
      />
      <span className="text-sm">sets</span>

      <label className="sr-only" htmlFor={`reps-${name}`}>Target reps</label>
      <input
        id={`reps-${name}`}
        type="number"
        min={1}
        max={30}
        value={reps}
        onChange={(e) => onReps(Number(e.target.value))}
        className="w-16 border rounded px-2 py-1"
      />
      <span className="text-sm">reps</span>

      <button type="button" onClick={onRemove} className="ml-2 text-sm text-red-600 hover:underline">remove</button>
    </div>
  );
});

function LibraryPanel({
  totalResults,
  search,
  setSearch,
  muscleFilters,
  toggleMuscle,
  clearMuscles,
  sortBy,
  setSortBy,
  daysPerWeek,
  activeAddDay,
  setActiveAddDay,
}: {
  totalResults: number;
  search: string;
  setSearch: (v: string) => void;
  muscleFilters: string[];
  toggleMuscle: (m: string) => void;
  clearMuscles: () => void;
  sortBy: "name" | "muscle";
  setSortBy: (s: "name" | "muscle") => void;
  daysPerWeek: number;
  activeAddDay: number;
  setActiveAddDay: (n: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-3 border-b sticky top-[60px] bg-white z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Exercise Library</h2>
            <span className="text-xs text-gray-500">{totalResults} results</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="search" className="sr-only">Search exercises</label>
            <input
              id="search"
              type="search"
              placeholder="Search by name or muscle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {MUSCLES.map((m) => (
              <Chip key={m} active={muscleFilters.includes(m)} onClick={() => toggleMuscle(m)}>
                {m}
              </Chip>
            ))}
            {muscleFilters.length > 0 && (
              <Chip onClick={clearMuscles}>Clear</Chip>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="sort" className="text-xs text-gray-600">Sort</label>
            <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
              <option value="name">Name (A→Z)</option>
              <option value="muscle">Muscle group</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-600">Quick‑add to</span>
              <div className="flex gap-1">
                {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((idx) => (
                  <Chip key={idx} active={activeAddDay === idx} onClick={() => setActiveAddDay(idx)}>
                    D{idx}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LibraryGrid = memo(function LibraryGrid({
  items,
  remaining,
  onLoadMore,
  onAdd,
  isAdded,
}: {
  items: Exercise[];
  remaining: number;
  onLoadMore: () => void;
  onAdd: (exId: number) => void;
  isAdded: (exId: number) => boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.length ? (
          items.map((ex) => {
            const added = isAdded(ex.id);
            return (
              <div key={ex.id} className="border rounded-xl p-3">
                <div className="font-medium line-clamp-2" title={ex.name}>{ex.name}</div>
                <div className="text-xs text-gray-500 capitalize mt-0.5">{ex.primary_muscle} · {ex.equipment ?? "—"}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAdd(ex.id)}
                      disabled={added}
                      className={`text-xs px-2 py-1 rounded ${added ? "bg-gray-200 text-gray-500" : "bg-blue-600 text-white"}`}
                      aria-disabled={added}
                      aria-label={added ? "Already added" : "Add to selected day"}
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  </div>
                  {ex.demo_url && (
                    <a href={ex.demo_url} target="_blank" className="text-xs text-blue-600 hover:underline" rel="noreferrer">demo</a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-gray-500">No exercises match your filters.</div>
        )}
      </div>

      {remaining > 0 && (
        <div className="p-3 border-t flex justify-center">
          <button type="button" onClick={onLoadMore} className="px-4 py-2 rounded border hover:bg-gray-50">
            Load more ({remaining} left)
          </button>
        </div>
      )}
    </div>
  );
});

// ===================== Pure helpers =====================
function buildInitialDays(plan: Plan): DayDraft[] {
  const map = new Map<number, DayDraft>();
  plan?.days?.forEach((d) =>
    map.set(d.day_index, {
      day_index: d.day_index,
      title: d.title ?? "",
      exercises: d.exercises.map((e) => ({ exercise_id: e.id, target_sets: e.pivot?.target_sets ?? 3, target_reps: e.pivot?.target_reps ?? 10 })),
    })
  );
  const length = Math.max(3, plan?.days_per_week ?? 0);
  return Array.from({ length }, (_, i) => map.get(i + 1) ?? { day_index: i + 1, title: "", exercises: [] });
}

function syncDaysLength(prev: DayDraft[], daysPerWeek: number): DayDraft[] {
  const arr = [...prev];
  if (arr.length < daysPerWeek) {
    for (let i = arr.length; i < daysPerWeek; i++) arr.push({ day_index: i + 1, title: "", exercises: [] });
  } else if (arr.length > daysPerWeek) {
    arr.length = daysPerWeek;
  }
  return arr;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
