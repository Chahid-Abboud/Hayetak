// resources/js/pages/workouts/planner.tsx
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Head, usePage, router } from "@inertiajs/react";
import NavHeader from "@/components/NavHeader";
import WorkoutTabs from "@/components/workouts/WorkoutTabs";

// ===================== Types =====================
type Exercise = {
  id: number;
  name: string;
  primary_muscle: string;
  equipment?: string | null;
  demo_url?: string | null;
  // Optional: if your DB returns conditions (string[])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditions?: string[] | any;
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
const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "legs",
  "glutes",
  "biceps",
  "triceps",
  "core",
  "calves",
] as const;
const PAGE_SIZE = 40;
const normalize = (s: string) => s.toLowerCase().trim();

// ===================== Small UI Primitives =====================
const Chip = memo(function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-[11px] px-2 py-1 rounded-full border transition",
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 dark:hover:bg-neutral-700",
      ].join(" ")}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
});

// ===================== Main Page =====================
export default function PlannerPage() {
  const page = usePage<Partial<Props>>().props;
const plan: Plan = (page.plan as Plan) ?? null;
const exercises: Exercise[] = Array.isArray(page.exercises) ? page.exercises : [];

  const [daysPerWeek, setDaysPerWeek] = useState<number>(
    plan?.days_per_week ?? 3
  );
  const [days, setDays] = useState<DayDraft[]>(() => buildInitialDays(plan));

  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---------- Library state ----------
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
  const [conditionFilters, setConditionFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "muscle">("name");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeAddDay, setActiveAddDay] = useState<number>(1);

  // ---------- Derived helpers ----------
  const exercisesById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  // Gather unique conditions from data (fallback to a known set if none present)
  const allConditions = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((e) => {
      const conds = Array.isArray(e.conditions)
        ? e.conditions
        : Array.isArray((e as any)?.conditions)
        ? (e as any).conditions
        : [];
      conds?.forEach((c: string) => typeof c === "string" && set.add(c));
    });
    if (set.size === 0) {
      // fallback common labels from your seed
      ["asthma", "heart", "high_blood_pressure", "anemia", "no_legs"].forEach(
        (c) => set.add(c)
      );
    }
    return Array.from(set).sort();
  }, [exercises]);

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

  // Filter/sort library
  const filteredLibrary = useMemo(() => {
    const q = normalize(debounced);
    let list = exercises;

    if (q)
      list = list.filter(
        (e) =>
          normalize(e.name).includes(q) ||
          normalize(e.primary_muscle).includes(q)
      );

    if (muscleFilters.length) {
      const s = new Set(muscleFilters);
      list = list.filter((e) => s.has(normalize(e.primary_muscle)));
    }

    if (conditionFilters.length) {
      const cs = new Set(conditionFilters);
      list = list.filter((e) => {
        const conds = (e as any)?.conditions ?? [];
        return Array.isArray(conds) ? conds.some((c) => cs.has(c)) : false;
      });
    }

    return [...list].sort((a, b) =>
      sortBy === "muscle"
        ? normalize(a.primary_muscle).localeCompare(
            normalize(b.primary_muscle)
          ) || normalize(a.name).localeCompare(normalize(b.name))
        : normalize(a.name).localeCompare(normalize(b.name))
    );
  }, [exercises, debounced, muscleFilters, conditionFilters, sortBy]);

  const pagedLibrary = useMemo(
    () => filteredLibrary.slice(0, visibleCount),
    [filteredLibrary, visibleCount]
  );

  // ---------- Mutations ----------
  const addExercise = useCallback((dayIdx: number, exId: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_index === dayIdx
          ? {
              ...d,
              exercises: d.exercises.some((x) => x.exercise_id === exId)
                ? d.exercises
                : [
                    ...d.exercises,
                    { exercise_id: exId, target_sets: 3, target_reps: 10 },
                  ],
            }
          : d
      )
    );
  }, []);

  const updateSetRep = useCallback(
    (dayIdx: number, i: number, field: "target_sets" | "target_reps", value: number) => {
      setDays((prev) =>
        prev.map((d) =>
          d.day_index === dayIdx
            ? {
                ...d,
                exercises: d.exercises.map((x, idx) =>
                  idx === i ? { ...x, [field]: value } : x
                ),
              }
            : d
        )
      );
    },
    []
  );

  const removeExercise = useCallback((dayIdx: number, i: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_index === dayIdx
          ? {
              ...d,
              exercises: d.exercises.filter((_, idx) => idx !== i),
            }
          : d
      )
    );
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

  // ---------- Template helper ----------
  const pickExercises = useCallback(
    (muscle: string, count: number) => {
      // Respect current condition filters if any
      const hasCond = conditionFilters.length > 0;
      const cs = new Set(conditionFilters);
      const pool = exercises.filter(
        (e) =>
          normalize(e.primary_muscle) === normalize(muscle) &&
          (!hasCond ||
            (Array.isArray((e as any)?.conditions) &&
              (e as any).conditions.some((c: string) => cs.has(c))))
      );
      return pool
        .slice(0, count)
        .map((e) => ({ exercise_id: e.id, target_sets: 3, target_reps: 10 }));
    },
    [exercises, conditionFilters]
  );

  const applyTemplate = useCallback(
    (key: "ppl3" | "upperLower4" | "fullBody3" | "arnold6") => {
      let nextDaysPerWeek = 3;
      const d: DayDraft[] = [];

      if (key === "ppl3") {
        nextDaysPerWeek = 3;
        d.push(
          {
            day_index: 1,
            title: "Push",
            exercises: [
              ...pickExercises("chest", 2),
              ...pickExercises("shoulders", 2),
              ...pickExercises("triceps", 1),
            ],
          },
          {
            day_index: 2,
            title: "Pull",
            exercises: [
              ...pickExercises("back", 3),
              ...pickExercises("biceps", 1),
            ],
          },
          {
            day_index: 3,
            title: "Legs",
            exercises: [
              ...pickExercises("legs", 3),
              ...pickExercises("glutes", 1),
              ...pickExercises("calves", 1),
            ],
          }
        );
      }

      if (key === "upperLower4") {
        nextDaysPerWeek = 4;
        d.push(
          {
            day_index: 1,
            title: "Upper A",
            exercises: [
              ...pickExercises("chest", 2),
              ...pickExercises("back", 2),
              ...pickExercises("shoulders", 1),
              ...pickExercises("biceps", 1),
              ...pickExercises("triceps", 1),
            ],
          },
          {
            day_index: 2,
            title: "Lower A",
            exercises: [
              ...pickExercises("legs", 3),
              ...pickExercises("glutes", 1),
              ...pickExercises("calves", 1),
              ...pickExercises("core", 1),
            ],
          },
          {
            day_index: 3,
            title: "Upper B",
            exercises: [
              ...pickExercises("chest", 1),
              ...pickExercises("back", 2),
              ...pickExercises("shoulders", 1),
              ...pickExercises("biceps", 1),
              ...pickExercises("triceps", 1),
            ],
          },
          {
            day_index: 4,
            title: "Lower B",
            exercises: [
              ...pickExercises("legs", 3),
              ...pickExercises("glutes", 1),
              ...pickExercises("calves", 1),
              ...pickExercises("core", 1),
            ],
          }
        );
      }

      if (key === "fullBody3") {
        nextDaysPerWeek = 3;
        for (let i = 1; i <= 3; i++) {
          d.push({
            day_index: i,
            title: `Full Body ${i}`,
            exercises: [
              ...pickExercises("legs", 1),
              ...pickExercises("back", 1),
              ...pickExercises("chest", 1),
              ...pickExercises("shoulders", 1),
              ...pickExercises("core", 1),
            ],
          });
        }
      }

      if (key === "arnold6") {
        nextDaysPerWeek = 6;
        d.push(
          {
            day_index: 1,
            title: "Chest & Back",
            exercises: [
              ...pickExercises("chest", 3),
              ...pickExercises("back", 3),
            ],
          },
          {
            day_index: 2,
            title: "Shoulders & Arms",
            exercises: [
              ...pickExercises("shoulders", 2),
              ...pickExercises("biceps", 2),
              ...pickExercises("triceps", 2),
            ],
          },
          {
            day_index: 3,
            title: "Legs",
            exercises: [
              ...pickExercises("legs", 4),
              ...pickExercises("glutes", 1),
              ...pickExercises("calves", 1),
            ],
          },
          {
            day_index: 4,
            title: "Chest & Back (B)",
            exercises: [
              ...pickExercises("chest", 3),
              ...pickExercises("back", 3),
            ],
          },
          {
            day_index: 5,
            title: "Shoulders & Arms (B)",
            exercises: [
              ...pickExercises("shoulders", 2),
              ...pickExercises("biceps", 2),
              ...pickExercises("triceps", 2),
            ],
          },
          {
            day_index: 6,
            title: "Legs (B)",
            exercises: [
              ...pickExercises("legs", 4),
              ...pickExercises("glutes", 1),
              ...pickExercises("calves", 1),
            ],
          }
        );
      }

      setDaysPerWeek(nextDaysPerWeek);
      setDays(d);
      setActiveAddDay(1);
      setFlash(`Applied ${templateLabel(key)} template`);
      setTimeout(() => setFlash(null), 1200);
    },
    [pickExercises]
  );

  // ===================== Render =====================
  return (
    <>
      <Head title="Workout Planner" />
      <NavHeader />

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6 text-gray-900 dark:text-gray-100">
        <WorkoutTabs active="plan" />

        <HeaderBar
          daysPerWeek={daysPerWeek}
          setDaysPerWeek={setDaysPerWeek}
          saving={saving}
          save={save}
          flash={flash}
          flashRef={flashRef}
        />

        {Object.keys(errors).length > 0 && (
          <div
            className="rounded-lg border border-red-300 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-200 p-3 text-sm"
            role="alert"
            aria-live="assertive"
          >
            There were validation errors while saving. Check your sets/reps and
            try again.
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
          {/* Left: days */}
          <section
            aria-labelledby="days-label"
            className="space-y-3 min-w-0"
          >
            <h2
              id="days-label"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Plan days
            </h2>
            {days.slice(0, daysPerWeek).map((d) => (
              <DayCard
                key={d.day_index}
                day={d}
                exercisesById={exercisesById}
                onTitle={(title) =>
                  setDays((prev) =>
                    prev.map((x) =>
                      x.day_index === d.day_index ? { ...x, title } : x
                    )
                  )
                }
                onUpdate={(i, field, val) =>
                  updateSetRep(d.day_index, i, field, val)
                }
                onRemove={(i) => removeExercise(d.day_index, i)}
              />
            ))}
          </section>

          {/* Right: templates + library in tabs */}
          <RightPanel
            applyTemplate={applyTemplate}
            filteredLibrary={filteredLibrary}
            pagedLibrary={pagedLibrary}
            search={search}
            setSearch={(v) => {
              setSearch(v);
              setVisibleCount(PAGE_SIZE);
            }}
            muscleFilters={muscleFilters}
            setMuscleFilters={setMuscleFilters}
            conditionFilters={conditionFilters}
            setConditionFilters={setConditionFilters}
            allConditions={allConditions}
            sortBy={sortBy}
            setSortBy={setSortBy}
            daysPerWeek={daysPerWeek}
            activeAddDay={activeAddDay}
            setActiveAddDay={setActiveAddDay}
            remaining={filteredLibrary.length - pagedLibrary.length}
            onLoadMore={() => setVisibleCount((c) => c + PAGE_SIZE)}
            onAdd={(exId) => addExercise(activeAddDay, exId)}
            isAdded={(exId) => isInDay(days, activeAddDay, exId)}
          />
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
    <header
      className="
        flex flex-col gap-3 rounded-2xl border bg-white/80
        dark:bg-neutral-900/80 border-gray-200 dark:border-neutral-800
        px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between
      "
    >
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">Workout Planner</h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          Choose a split, tweak each day, and save your weekly routine.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="days-per-week"
        >
          <span className="text-gray-600 dark:text-gray-300">Days / week</span>
          <input
            id="days-per-week"
            type="number"
            min={1}
            max={7}
            value={daysPerWeek}
            onChange={(e) =>
              setDaysPerWeek(Math.min(7, Math.max(1, Number(e.target.value))))
            }
            className="
              w-20 border rounded-lg px-2 py-1 bg-white dark:bg-neutral-900
              border-gray-300 dark:border-neutral-700 text-gray-900
              dark:text-gray-100 text-center
            "
          />
        </label>

        <button
          type="button"
          onClick={save}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save plan"}
        </button>

        {flash && (
          <span
            ref={flashRef}
            tabIndex={-1}
            className="text-xs text-green-700 dark:text-green-300 ml-1 outline-none"
            role="status"
            aria-live="polite"
          >
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
  onUpdate: (
    i: number,
    field: "target_sets" | "target_reps",
    val: number
  ) => void;
  onRemove: (i: number) => void;
}) {
  const [open, setOpen] = useState(day.day_index === 1); // first day open by default

  return (
    <div className="rounded-2xl border bg-white dark:bg-neutral-900 shadow-sm border-gray-200 dark:border-neutral-700">
      {/* header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span
            className="
              inline-flex h-7 w-7 items-center justify-center rounded-full
              bg-blue-600/10 text-xs font-semibold text-blue-700 dark:text-blue-300
            "
          >
            {day.day_index}
          </span>
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold">
              {day.title || `Day ${day.day_index}`}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {day.exercises.length} exercise
              {day.exercises.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <input
            placeholder="Title (e.g., Push)"
            value={day.title}
            onChange={(e) => onTitle(e.target.value)}
            className="
              hidden md:inline-flex border rounded px-3 py-1 text-xs
              bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700
              max-w-[180px]
            "
          />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {open ? "Hide" : "Edit"}
          </span>
          <span className="text-gray-400 text-xs" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-neutral-800 px-4 py-3 space-y-2">
          {/* mobile title input */}
          <div className="md:hidden mb-2">
            <label
              className="sr-only"
              htmlFor={`title-${day.day_index}`}
            >
              Title
            </label>
            <input
              id={`title-${day.day_index}`}
              placeholder="Title (e.g., Push)"
              value={day.title}
              onChange={(e) => onTitle(e.target.value)}
              className="
                w-full border rounded px-3 py-1 bg-white dark:bg-neutral-900
                border-gray-300 dark:border-neutral-700 text-sm
              "
            />
          </div>

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
            <div className="text-xs text-gray-600 dark:text-gray-400">
              No exercises yet. Use the library on the right to add some.
            </div>
          )}
        </div>
      )}
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
    <div className="flex flex-wrap items-center gap-2 border rounded p-2 border-gray-200 dark:border-neutral-700">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium text-sm">
          {name}{" "}
          <span className="text-[11px] text-gray-600 dark:text-gray-400 capitalize">
            ({muscle})
          </span>
        </div>
        <div className="text-[11px] text-gray-600 dark:text-gray-400">
          Target: {sets}×{reps}
        </div>
      </div>

      <label className="sr-only" htmlFor={`sets-${name}`}>
        Target sets
      </label>
      <input
        id={`sets-${name}`}
        type="number"
        min={1}
        max={10}
        value={sets}
        onChange={(e) => onSets(Number(e.target.value))}
        className="w-16 border rounded px-2 py-1 bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700 text-sm"
      />
      <span className="text-xs">sets</span>

      <label className="sr-only" htmlFor={`reps-${name}`}>
        Target reps
      </label>
      <input
        id={`reps-${name}`}
        type="number"
        min={1}
        max={30}
        value={reps}
        onChange={(e) => onReps(Number(e.target.value))}
        className="w-16 border rounded px-2 py-1 bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700 text-sm"
      />
      <span className="text-xs">reps</span>

      <button
        type="button"
        onClick={onRemove}
        className="ml-2 text-xs text-red-600 dark:text-red-400 hover:underline"
      >
        remove
      </button>
    </div>
  );
});

// Right-hand panel with Templates / Library tabs
function RightPanel(props: {
  applyTemplate: (k: "ppl3" | "upperLower4" | "fullBody3" | "arnold6") => void;
  filteredLibrary: Exercise[];
  pagedLibrary: Exercise[];
  search: string;
  setSearch: (v: string) => void;
  muscleFilters: string[];
  setMuscleFilters: React.Dispatch<React.SetStateAction<string[]>>;
  conditionFilters: string[];
  setConditionFilters: React.Dispatch<React.SetStateAction<string[]>>;
  allConditions: string[];
  sortBy: "name" | "muscle";
  setSortBy: (s: "name" | "muscle") => void;
  daysPerWeek: number;
  activeAddDay: number;
  setActiveAddDay: (n: number) => void;
  remaining: number;
  onLoadMore: () => void;
  onAdd: (exId: number) => void;
  isAdded: (exId: number) => boolean;
}) {
  const {
    applyTemplate,
    filteredLibrary,
    pagedLibrary,
    search,
    setSearch,
    muscleFilters,
    setMuscleFilters,
    conditionFilters,
    setConditionFilters,
    allConditions,
    sortBy,
    setSortBy,
    daysPerWeek,
    activeAddDay,
    setActiveAddDay,
    remaining,
    onLoadMore,
    onAdd,
    isAdded,
  } = props;

  const [panelTab, setPanelTab] = useState<"templates" | "library">(
    "templates"
  );
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  return (
    <div className="rounded-2xl border bg-white dark:bg-neutral-900 shadow-sm border-gray-200 dark:border-neutral-700 min-w-0">
      <div className="border-b border-gray-200 dark:border-neutral-800 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-2xl bg-gray-100 dark:bg-neutral-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setPanelTab("templates")}
              className={
                "px-3 py-1 rounded-xl " +
                (panelTab === "templates"
                  ? "bg-white dark:bg-neutral-900 shadow text-gray-900 dark:text-gray-50"
                  : "text-gray-600 dark:text-gray-300")
              }
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setPanelTab("library")}
              className={
                "px-3 py-1 rounded-xl " +
                (panelTab === "library"
                  ? "bg-white dark:bg-neutral-900 shadow text-gray-900 dark:text-gray-50"
                  : "text-gray-600 dark:text-gray-300")
              }
            >
              Library
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
            <span>Quick-add to</span>
            {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((idx) => (
              <Chip
                key={idx}
                active={activeAddDay === idx}
                onClick={() => setActiveAddDay(idx)}
              >
                D{idx}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {panelTab === "templates" ? (
        <div className="p-3 grid grid-cols-1 gap-2 text-sm">
          <TemplateButton
            label="Push / Pull / Legs (3d)"
            onClick={() => applyTemplate("ppl3")}
          />
          <TemplateButton
            label="Upper / Lower (4d)"
            onClick={() => applyTemplate("upperLower4")}
          />
          <TemplateButton
            label="Full Body (3d)"
            onClick={() => applyTemplate("fullBody3")}
          />
          <TemplateButton
            label="Arnold Split (6d)"
            onClick={() => applyTemplate("arnold6")}
          />
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Applying a template will overwrite your current days, but you can
            still edit everything after.
          </p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* filters */}
          <div className="p-3 space-y-3 border-b border-gray-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <input
                type="search"
                placeholder="Search exercises…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded px-3 py-2 bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700 text-sm"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredLibrary.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {MUSCLES.map((m) => {
                const active = muscleFilters.includes(m);
                return (
                  <Chip
                    key={m}
                    active={active}
                    onClick={() =>
                      setMuscleFilters((prev) =>
                        active
                          ? prev.filter((x) => x !== m)
                          : [...prev, m]
                      )
                    }
                  >
                    {m}
                  </Chip>
                );
              })}
              {muscleFilters.length > 0 && (
                <Chip onClick={() => setMuscleFilters([])}>Clear</Chip>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className="text-xs text-gray-600 dark:text-gray-300 underline"
            >
              {showMoreFilters ? "Hide health filters" : "More filters"}
            </button>

            {showMoreFilters && (
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  Health conditions
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {allConditions.map((c) => {
                    const active = conditionFilters.includes(c);
                    return (
                      <Chip
                        key={c}
                        active={active}
                        onClick={() =>
                          setConditionFilters((prev) =>
                            active
                              ? prev.filter((x) => x !== c)
                              : [...prev, c]
                          )
                        }
                      >
                        {c}
                      </Chip>
                    );
                  })}
                  {conditionFilters.length > 0 && (
                    <Chip onClick={() => setConditionFilters([])}>
                      Clear
                    </Chip>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1">
                <span className="text-gray-600 dark:text-gray-300">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "name" | "muscle")
                  }
                  className="border rounded px-2 py-1 bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700"
                >
                  <option value="name">Name (A→Z)</option>
                  <option value="muscle">Muscle group</option>
                </select>
              </label>
            </div>
          </div>

          {/* grid */}
          <div className="p-3 space-y-3 max-h-[480px] overflow-y-auto">
            {pagedLibrary.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pagedLibrary.map((ex) => {
                  const added = isAdded(ex.id);
                  return (
                    <div
                      key={ex.id}
                      className="border rounded-xl p-3 border-gray-200 dark:border-neutral-700 text-sm"
                    >
                      <div className="font-medium line-clamp-2" title={ex.name}>
                        {ex.name}
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 capitalize mt-0.5">
                        {ex.primary_muscle} · {ex.equipment ?? "—"}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onAdd(ex.id)}
                          disabled={added}
                          className={
                            "text-xs px-2 py-1 rounded transition " +
                            (added
                              ? "bg-gray-200 text-gray-600 dark:bg-neutral-800 dark:text-gray-400"
                              : "bg-blue-600 text-white hover:bg-blue-700")
                          }
                          aria-disabled={added}
                          aria-label={
                            added
                              ? "Already added"
                              : "Add to selected day"
                          }
                        >
                          {added ? "Added" : "Add"}
                        </button>
                        {ex.demo_url && (
                          <a
                            href={ex.demo_url}
                            target="_blank"
                            className="text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                            rel="noreferrer"
                          >
                            demo
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No exercises match your filters.
              </div>
            )}

            {remaining > 0 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="
                    px-4 py-2 rounded border hover:bg-gray-50 bg-white
                    border-gray-300 text-gray-800
                    dark:bg-neutral-900 dark:hover:bg-neutral-800
                    dark:border-neutral-700 dark:text-gray-100 text-xs
                  "
                >
                  Load more ({remaining} left)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TemplateButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="
      w-full text-left px-3 py-2 rounded-lg border bg-white hover:bg-gray-50
      border-gray-200 text-gray-800
      dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700
      dark:text-gray-100 transition
    "
  >
    {label}
  </button>
);

// ===================== Pure helpers =====================
function buildInitialDays(plan: Plan): DayDraft[] {
  const map = new Map<number, DayDraft>();
  plan?.days?.forEach((d) =>
    map.set(d.day_index, {
      day_index: d.day_index,
      title: d.title ?? "",
      exercises: (Array.isArray(d.exercises) ? d.exercises : []).map((e) => ({
        exercise_id: e.id,
        target_sets: e.pivot?.target_sets ?? 3,
        target_reps: e.pivot?.target_reps ?? 10,
      })),
    })
  );
  const length = Math.max(3, plan?.days_per_week ?? 0);
  return Array.from({ length }, (_, i) =>
    map.get(i + 1) ?? { day_index: i + 1, title: "", exercises: [] }
  );
}

function syncDaysLength(prev: DayDraft[], daysPerWeek: number): DayDraft[] {
  const arr = [...prev];
  if (arr.length < daysPerWeek) {
    for (let i = arr.length; i < daysPerWeek; i++)
      arr.push({ day_index: i + 1, title: "", exercises: [] });
  } else if (arr.length > daysPerWeek) {
    arr.length = daysPerWeek;
  }
  return arr;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isInDay(days: DayDraft[], dayIdx: number, exId: number) {
  return (
    days
      .find((d) => d.day_index === dayIdx)
      ?.exercises.some((x) => x.exercise_id === exId) ?? false
  );
}

function templateLabel(k: "ppl3" | "upperLower4" | "fullBody3" | "arnold6") {
  switch (k) {
    case "ppl3":
      return "Push/Pull/Legs";
    case "upperLower4":
      return "Upper/Lower";
    case "fullBody3":
      return "Full Body";
    case "arnold6":
      return "Arnold Split";
  }
}
