import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import NavHeader from "@/components/NavHeader";

/* =============== Types =============== */
type Exercise = {
  id: number;
  name: string;
  primary_muscle: string;
  equipment?: string | null;
  demo_url?: string | null;
};
type Day = { id: number; day_index: number; title?: string | null; exercises: Exercise[] } | null;
type Plan = { id: number; name: string; days: Day[] } | null;

type WorkoutLogSet = {
  id: number;
  exercise: { id: number; name: string };
  weight_kg: number | null;
  reps: number;
  set_number: number;
};

type WorkoutLog = {
  id: number;
  workout_date: string;
  sets: WorkoutLogSet[];
  workout_plan_day_id?: number | null;
};

type Props = {
  plan: Plan;
  currentDay: Day | null;
  today: string;
  recentLogs: WorkoutLog[] | undefined;
  flash?: { activeLogId?: number };
  exercises?: Exercise[];
};

/* =============== Helpers/consts =============== */
const MUSCLES = ["chest","back","shoulders","legs","glutes","biceps","triceps","core","calves"] as const;
const PAGE_SIZE = 40;
const normalize = (s: string) => s.toLowerCase().trim();
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString(); } catch { return iso; } };

function groupSetsByExercise(sets?: WorkoutLogSet[] | null) {
  const map = new Map<string, WorkoutLogSet[]>();
  if (!sets?.length) return Array.from(map.entries());
  for (const s of sets) {
    const key = s.exercise?.name ?? "Exercise";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  for (const [, arr] of map) arr.sort((a, b) => a.set_number - b.set_number);
  return Array.from(map.entries());
}

/* =============== Component =============== */
export default function LogPage() {
  const page = usePage<Props>();
  const { plan, currentDay, today, recentLogs, flash } = page.props;

  // Activate page palette
  useEffect(() => {
    document.documentElement.setAttribute("data-page", "workouts");
    return () => document.documentElement.removeAttribute("data-page");
  }, []);

  const safeExercises: Exercise[] = Array.isArray((page.props as any).exercises) ? (page.props as any).exercises : [];
  const safeRecentLogs: WorkoutLog[] = Array.isArray(recentLogs) ? recentLogs : [];

  const propsRef = useRef<Props>(page.props);
  useEffect(() => { propsRef.current = page.props; }, [page.props]);

  const latestLog = safeRecentLogs[0];
  const activeLogIdRef = useRef<number | undefined>(flash?.activeLogId ?? latestLog?.id);

  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pickedDayId, setPickedDayId] = useState<number | "none">((currentDay?.id as number) ?? "none");

  const [weights, setWeights] = useState<Record<number, string>>({});
  const [reps, setReps] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const [startedLocally, setStartedLocally] = useState(false);
  const [saving, setSaving] = useState(false);

  const exercisesById = useMemo(() => new Map(safeExercises.map((e) => [e.id, e])), [safeExercises]);
  const [fsSelected, setFsSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "muscle">("name");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const filteredLibrary = useMemo(() => {
    const q = normalize(debounced);
    let list = safeExercises;
    if (q) list = list.filter((e) => normalize(e.name).includes(q) || normalize(e.primary_muscle).includes(q));
    if (muscleFilters.length) {
      const s = new Set(muscleFilters);
      list = list.filter((e) => s.has(e.primary_muscle));
    }
    return [...list].sort((a, b) =>
      sortBy === "muscle"
        ? normalize(a.primary_muscle).localeCompare(normalize(b.primary_muscle)) ||
          normalize(a.name).localeCompare(normalize(b.name))
        : normalize(a.name).localeCompare(normalize(b.name))
    );
  }, [safeExercises, debounced, muscleFilters, sortBy]);

  const pagedLibrary = useMemo(() => filteredLibrary.slice(0, visibleCount), [filteredLibrary, visibleCount]);

  const toggleFsAdd = (exId: number) =>
    setFsSelected((prev) => (prev.includes(exId) ? prev : [...prev, exId]));
  const removeFs = (exId: number) =>
    setFsSelected((prev) => prev.filter((id) => id !== exId));
  const isFsAdded = (exId: number) => fsSelected.includes(exId);

  const dayForForm: Day | null =
    pickedDayId !== "none"
      ? plan?.days?.find((d) => d?.id === pickedDayId) ?? null
      : currentDay ?? null;

  const setsForExercise = (exerciseId: number) =>
    (latestLog?.sets || [])
      .filter((s) => s.exercise?.id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);

  const openStartDialog = () => { setPickerOpen(true); setPickedDayId((currentDay?.id as number) ?? "none"); };
  const confirmStart = () => { setPickerOpen(false); setStartedLocally(true); setStatus(null); };

  const afterStartedEnsureId = (cb: (newLogId: number) => void) => {
    router.reload({
      only: ["recentLogs", "flash"],
      onSuccess: () => {
        const p = propsRef.current;
        const fromFlash = p.flash?.activeLogId;
        const fromRecent = Array.isArray(p.recentLogs) ? p.recentLogs[0]?.id : undefined;
        const id = fromFlash ?? fromRecent;
        if (!id) return setStatus("Could not determine new workout ID.");
        activeLogIdRef.current = id;
        cb(id);
      },
    });
  };

  const createWorkoutIfNeeded = (after?: (newLogId: number) => void) => {
    if (activeLogIdRef.current) return after?.(activeLogIdRef.current);
    router.post(
      "/workouts/log/start",
      { workout_date: today, workout_plan_day_id: pickedDayId === "none" ? null : pickedDayId },
      { onSuccess: () => afterStartedEnsureId((id) => after?.(id)) }
    );
  };

  const addSet = (exerciseId: number) => {
    setStatus(null);
    const w = weights[exerciseId];
    const r = reps[exerciseId];
    const repsNum = r ? Number(r) : NaN;
    const weightNum = w?.length ? Number(w) : null;

    if (!Number.isFinite(repsNum) || repsNum <= 0) return setStatus("Please enter reps (>0).");
    if (w && isNaN(Number(w))) return setStatus("Weight must be a number (or leave empty for bodyweight).");

    const send = (logId: number) => {
      const next = (setsForExercise(exerciseId).slice(-1)[0]?.set_number ?? 0) + 1;
      router.post(
        `/workouts/log/${logId}/add-set`,
        { exercise_id: exerciseId, set_number: next, weight_kg: weightNum, reps: repsNum },
        {
          preserveScroll: true,
          onSuccess: () => {
            setWeights((prev) => ({ ...prev, [exerciseId]: "" }));
            setReps((prev) => ({ ...prev, [exerciseId]: "" }));
            setStatus("Set added.");
            router.reload({ only: ["recentLogs"] });
          },
        }
      );
    };

    createWorkoutIfNeeded((id) => send(id));
  };

  const saveWorkout = () => {
    const id = activeLogIdRef.current;
    if (!id) return setStatus("You haven’t added any sets yet. Add at least one set before saving.");
    const hasAnySets = !!(Array.isArray(propsRef.current.recentLogs) && propsRef.current.recentLogs[0]?.sets?.length);
    if (!hasAnySets) return setStatus("Your workout has no sets yet. Add at least one set before saving.");

    setSaving(true);
    router.post(
      `/workouts/log/${id}/finish`,
      { duration_min: null, notes: null },
      {
        onSuccess: () => {
          setStatus("Workout saved — great job!");
          router.reload({ only: ["recentLogs", "plan", "currentDay"] });
        },
        onFinish: () => setSaving(false),
      }
    );
  };

  const recentNonEmpty = safeRecentLogs.filter((l) => (l.sets?.length ?? 0) > 0);

  const freestyleExercises: Exercise[] =
    pickedDayId === "none"
      ? fsSelected.map((id) => exercisesById.get(id)).filter((x): x is Exercise => !!x)
      : [];

  const showLoggingArea =
    startedLocally &&
    ((pickedDayId !== "none" && !!dayForForm?.exercises?.length) ||
      (pickedDayId === "none" && freestyleExercises.length > 0));

  return (
    <>
      <Head title="Workout Log" />
      <NavHeader />

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
        <div aria-live="polite" className="sr-only">{status ?? ""}</div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Workout Log</h1>

          {/* Start button — match site button style via tokens */}
          <button
            onClick={openStartDialog}
            className="rounded-lg px-4 py-2 font-medium"
            style={{
              color: "var(--secondary)",
            }}
          >
            Start Today’s Workout
          </button>
        </div>

        {/* Start picker */}
        {isPickerOpen && (
          <section className="rounded-2xl border p-4 bg-card shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="font-medium">Choose plan day for {fmtDate(today)}:</div>
              <label className="sr-only" htmlFor="day-picker">Workout day</label>
              <select
                id="day-picker"
                className="border rounded px-2 py-1"
                value={pickedDayId === "none" ? "" : pickedDayId}
                onChange={(e) => setPickedDayId(e.target.value ? Number(e.target.value) : "none")}
              >
                <option value="">No plan (freestyle)</option>
                {plan?.days?.filter(Boolean).map((d) => (
                  <option key={d!.id} value={d!.id}>
                    Day {d!.day_index}{d!.title ? ` · ${d!.title}` : ""}
                  </option>
                ))}
              </select>
              <div className="md:ml-auto flex items-center gap-2">
                <button onClick={() => setPickerOpen(false)} className="px-3 py-1.5 rounded border">Cancel</button>
                <button
                  onClick={confirmStart}
                  className="px-3 py-1.5 rounded font-medium"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                >
                  Start
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Today row */}
        <section className="rounded-2xl border p-6 bg-card shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today</h2>
            <div className="text-sm text-muted-foreground">{fmtDate(today)}</div>
          </div>

          {/* Freestyle library when no plan selected */}
          {startedLocally && pickedDayId === "none" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Selected list */}
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Pick exercises from the library, then add your sets below.
                </div>

                {freestyleExercises.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {freestyleExercises.map((ex) => {
                      const prevSets = setsForExercise(ex.id);
                      const last = prevSets.slice(-1)[0];
                      const weightValue = weights[ex.id] ?? (last?.weight_kg != null ? String(last.weight_kg) : "");

                      return (
                        <div key={ex.id} className="rounded-xl border bg-card p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold">{ex.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{ex.primary_muscle}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              {ex.demo_url ? (
                                <a
                                  href={ex.demo_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs hover:underline"
                                  style={{ color: "var(--accent)" }}   // teal link style
                                >
                                  demo
                                </a>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => removeFs(ex.id)}
                                className="text-xs hover:underline"
                                style={{ color: "var(--destructive)" }}
                                aria-label="Remove from today"
                              >
                                remove
                              </button>
                            </div>
                          </div>

                          {/* Inputs */}
                          <div className="mt-3 grid grid-cols-[6rem,6rem,auto] items-end gap-2">
                            <div>
                              <label htmlFor={`w-${ex.id}`} className="text-xs text-muted-foreground">Weight (kg)</label>
                              <input
                                id={`w-${ex.id}`}
                                type="number"
                                inputMode="decimal"
                                placeholder="kg"
                                className="mt-1 w-full rounded border px-3 py-1"
                                value={weightValue}
                                onChange={(e) => setWeights((p) => ({ ...p, [ex.id]: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label htmlFor={`r-${ex.id}`} className="text-xs text-muted-foreground">Reps</label>
                              <input
                                id={`r-${ex.id}`}
                                type="number"
                                inputMode="numeric"
                                placeholder="reps"
                                className="mt-1 w-full rounded border px-3 py-1"
                                value={reps[ex.id] ?? ""}
                                onChange={(e) => setReps((p) => ({ ...p, [ex.id]: e.target.value }))}
                              />
                            </div>
                            <div className="flex">
                              <button onClick={() => addSet(ex.id)} className="ml-auto rounded px-3 py-2 font-medium"
                                style={{ backgroundColor: "var(--foreground)", color: "var(--background)" }}>
                                Add Set
                              </button>
                            </div>
                          </div>

                          {/* Existing sets */}
                          {prevSets.length ? (
                            <div className="mt-3 space-y-1 text-sm">
                              {prevSets.map((s) => (
                                <div key={s.id} className="flex justify-between">
                                  <div className="text-muted-foreground">Set {s.set_number}</div>
                                  <div className="tabular-nums">{s.weight_kg ?? "BW"} kg × {s.reps}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-sm text-gray-400">No sets yet.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No exercises selected yet — add some from the library →
                  </div>
                )}

                {/* Save */}
                {freestyleExercises.length > 0 && (
                  <div className="mt-6 flex items-center justify-end">
                    <button
                      disabled={saving}
                      onClick={saveWorkout}
                      className="rounded-lg px-4 py-2 font-medium disabled:opacity-60"
                      style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                    >
                      {saving ? "Saving…" : "Save Workout"}
                    </button>
                  </div>
                )}
              </div>

              {/* Library */}
              <aside className="space-y-3">
                <div className="rounded-2xl border bg-card shadow-sm">
                  <div className="sticky top-[60px] z-10 border-b bg-card p-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">Exercise Library</h3>
                        <span className="text-xs text-muted-foreground">{filteredLibrary.length} results</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label htmlFor="search" className="sr-only">Search exercises</label>
                        <input
                          id="search"
                          type="search"
                          placeholder="Search by name or muscle…"
                          value={search}
                          onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                          className="flex-1 rounded border px-3 py-2"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {MUSCLES.map((m) => {
                          const active = muscleFilters.includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setMuscleFilters((prev) => (active ? prev.filter((x) => x !== m) : [...prev, m]));
                                setVisibleCount(PAGE_SIZE);
                              }}
                              className="rounded px-2 py-1 text-xs border"
                              style={
                                active
                                  ? { backgroundColor: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)" }
                                  : { backgroundColor: "var(--card)" }
                              }
                              aria-pressed={active}
                            >
                              {m}
                            </button>
                          );
                        })}
                        {muscleFilters.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMuscleFilters([])}
                            className="rounded border bg-card px-2 py-1 text-xs"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <label htmlFor="sort" className="text-xs text-muted-foreground">Sort</label>
                        <select
                          id="sort"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="rounded border px-2 py-1 text-sm"
                        >
                          <option value="name">Name (A→Z)</option>
                          <option value="muscle">Muscle group</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                    {pagedLibrary.length ? (
                      pagedLibrary.map((ex) => {
                        const added = isFsAdded(ex.id);
                        return (
                          <div key={ex.id} className="rounded-xl border p-3">
                            <div className="line-clamp-2 font-medium" title={ex.name}>{ex.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                              {ex.primary_muscle} · {ex.equipment ?? "—"}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => toggleFsAdd(ex.id)}
                                disabled={added}
                                className="rounded px-2 py-1 text-xs"
                                style={
                                  added
                                    ? { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
                                    : { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }
                                }
                                aria-disabled={added}
                              >
                                {added ? "Added" : "Add"}
                              </button>
                              {ex.demo_url && (
                                <a
                                  href={ex.demo_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs hover:underline"
                                  style={{ color: "var(--accent)" }}  // teal link style
                                >
                                  demo
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">No exercises match your filters.</div>
                    )}
                  </div>

                  {filteredLibrary.length - pagedLibrary.length > 0 && (
                    <div className="flex justify-center border-t p-3">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="rounded border px-4 py-2 hover:bg-muted"
                      >
                        Load more ({filteredLibrary.length - pagedLibrary.length} left)
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Planned-day logging OR empty-state */}
          {!showLoggingArea ? (
            <div className="text-foreground/80">
              {startedLocally ? (
                pickedDayId === "none"
                  ? <>Pick exercises from the library on the right to start logging your freestyle workout.</>
                  : <>This day has no exercises. Add some in the{" "}
                      <a href="/workouts/plan" className="hover:underline" style={{ color: "var(--accent)" }}>
                        Planner
                      </a>.
                    </>
              ) : (
                <>No workout chosen for today yet. Click{" "}
                  <a
                    href="#start"
                    onClick={(e) => { e.preventDefault(); openStartDialog(); }}
                    className="inline align-baseline hover:underline"
                    style={{ color: "var(--accent)", background: "transparent", padding: 0, border: 0 }}
                  >
                    Start Today’s Workout
                    </a>{" "}
                  to pick a plan day or freestyle.</>
              )}
            </div>
          ) : pickedDayId !== "none" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {dayForForm!.exercises.map((ex) => {
                  const prevSets = setsForExercise(ex.id);
                  const last = prevSets.slice(-1)[0];
                  const weightValue = weights[ex.id] ?? (last?.weight_kg != null ? String(last.weight_kg) : "");
                  return (
                    <div key={ex.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{ex.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{ex.primary_muscle}</div>
                        </div>
                        {ex.demo_url ? (
                          <a href={ex.demo_url} target="_blank" rel="noreferrer" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                            demo
                          </a>
                        ) : null}
                      </div>

                      <div className="mt-3 grid grid-cols-[6rem,6rem,auto] items-end gap-2">
                        <div>
                          <label htmlFor={`w-${ex.id}`} className="text-xs text-muted-foreground">Weight (kg)</label>
                          <input
                            id={`w-${ex.id}`}
                            type="number" inputMode="decimal" placeholder="kg"
                            className="mt-1 w-full rounded border px-3 py-1"
                            value={weightValue}
                            onChange={(e) => setWeights((p) => ({ ...p, [ex.id]: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label htmlFor={`r-${ex.id}`} className="text-xs text-muted-foreground">Reps</label>
                          <input
                            id={`r-${ex.id}`}
                            type="number" inputMode="numeric" placeholder="reps"
                            className="mt-1 w-full rounded border px-3 py-1"
                            value={reps[ex.id] ?? ""}
                            onChange={(e) => setReps((p) => ({ ...p, [ex.id]: e.target.value }))}
                          />
                        </div>
                        <div className="flex">
                          <button onClick={() => addSet(ex.id)} className="ml-auto rounded px-3 py-2 font-medium"
                            style={{ backgroundColor: "var(--foreground)", color: "var(--background)" }}>
                            Add Set
                          </button>
                        </div>
                      </div>

                      {prevSets.length ? (
                        <div className="mt-3 space-y-1 text-sm">
                          {prevSets.map((s) => (
                            <div key={s.id} className="flex justify-between">
                              <div className="text-muted-foreground">Set {s.set_number}</div>
                              <div className="tabular-nums">{s.weight_kg ?? "BW"} kg × {s.reps}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-gray-400">No sets yet.</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-end">
                <button
                  disabled={saving}
                  onClick={saveWorkout}
                  className="rounded-lg px-4 py-2 font-medium disabled:opacity-60"
                  style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {saving ? "Saving…" : "Save Workout"}
                </button>
              </div>
            </>
          ) : null}
        </section>

        {/* Plan snapshot */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Your Plan</h2>
          {plan?.days?.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {plan.days.filter(Boolean).map((d) => (
                <div key={d!.id} className="rounded-xl border p-4">
                  <div className="font-semibold">
                    Day {d!.day_index} {d!.title ? <span className="text-muted-foreground">· {d!.title}</span> : null}
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                    {d!.exercises?.length ? (
                      d!.exercises.map((ex) => (
                        <li key={ex.id}>
                          {ex.name} <span className="lowercase text-muted-foreground">({ex.primary_muscle})</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400">No exercises.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-foreground/80">
              No workout plan yet.{" "}
              <a href="/workouts/plan" className="hover:underline" style={{ color: "var(--accent)" }}>
                Create one
              </a>.
            </div>
          )}
        </section>

        {/* Recent logs */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Recent Logs</h2>
          {recentNonEmpty.length ? (
            <div className="space-y-4">
              {recentNonEmpty.map((l) => {
                const grouped = groupSetsByExercise(l.sets);
                return (
                  <div key={l.id} className="rounded-xl border p-4">
                    <div className="font-medium">{fmtDate(l.workout_date)}</div>
                    <div className="mt-2 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                      {grouped.map(([exName, sets]) => (
                        <div key={exName} className="rounded-lg border p-2">
                          <div className="truncate font-medium">{exName}</div>
                          <div className="mt-1 tabular-nums text-foreground/80">
                            {sets.map((s, idx) => (
                              <span key={s.id}>
                                {s.weight_kg ?? "BW"}×{s.reps}{idx < sets.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-foreground/80">No recent workouts yet.</div>
          )}
        </section>
      </main>
    </>
  );
}
