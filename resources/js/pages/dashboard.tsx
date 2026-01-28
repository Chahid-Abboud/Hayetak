// resources/js/pages/dashboard.tsx
import { Head, usePage, router } from "@inertiajs/react";
import { useEffect, useState } from "react";
import BmiCard from "@/components/BmiCard";
import WaterCard from "@/components/WaterCard";
import NavHeader from "@/components/NavHeader";

// ---------- Types ----------
type AuthUser = {
  id: number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email: string;
} | null;

type UserProfile =
  | {
      age: number | string | null;
      height_cm: number | string | null;
      weight_kg: number | string | null;
    }
  | null;

type WaterState = {
  today_ml: number;
  target_ml: number;
};

type TodayLogItem = {
  category: "breakfast" | "lunch" | "dinner" | "snack" | "drink";
  label: string;
  quantity?: number | null;
  unit?: string | null;
};

type DayLog = {
  id: number;
  consumed_at: string; // YYYY-MM-DD
  photo_url?: string | null;
  other_notes?: string | null;
  items: TodayLogItem[];
} | null;

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type PerMealTotals = Record<
  "breakfast" | "lunch" | "dinner" | "snack" | "drink",
  Totals
>;

type ProgressPoint = { week: string; [muscle: string]: number | string };
type Motivation = { title: string; lines: string[] } | null;

// ✅ NEW: Plan types (from HomeController props)
type FoodLite = {
  id: number;
  name: string;
  category?: string | null;
  serving_size?: number | string | null;
  serving_unit?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
};

type NutritionPlanItemLite = {
  id: number;
  food_id: number;
  servings?: string | number | null;
  grams?: string | number | null;
  sort_order?: number | null;
  notes?: string | null;
  food?: FoodLite | null;
};

type NutritionPlanMealLite = {
  id: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "drink" | string;
  order: number;
  notes?: string | null;
  items: NutritionPlanItemLite[];
};

type NutritionPlanDayLite = {
  id: number;
  day_index: number;
  date: string; // YYYY-MM-DD
  notes?: string | null;
  meals: NutritionPlanMealLite[];
};

type NutritionPlanLite = {
  id: number;
  name: string;
  goal?: string | null;
  start_date: string; // YYYY-MM-DD
  duration_days: number;
  is_active: boolean;
  meta?: any;
  days: NutritionPlanDayLite[];
};

type WorkoutExerciseLite = {
  id: number;
  name: string;
  primary_muscle?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  pivot?: {
    workout_plan_day_id?: number;
    exercise_id?: number;
    order_index?: number | null;
    sets?: number | null;
    reps_min?: number | null;
    reps_max?: number | null;
    rest_seconds?: number | null;
    notes?: string | null;
  };
};

type WorkoutPlanDayLite = {
  id: number;
  workout_plan_id: number;
  day_index: number;
  name: string;
  notes?: string | null;
  exercises: WorkoutExerciseLite[];
};

type WorkoutPlanLite = {
  id: number;
  user_id: number;
  name: string;
  goal?: string | null;
  start_date: string; // YYYY-MM-DD
  duration_days: number;
  is_active: boolean;
  meta?: any;
  days: WorkoutPlanDayLite[];
};

type HomeProps = {
  auth: { user: AuthUser };
  isGuest?: boolean;
  userProfile: UserProfile;
  water?: WaterState;

  // Optional logs
  todayLog?: DayLog;
  latestLog?: DayLog;

  // Summaries
  todayMacros?: {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  mealTotals?: PerMealTotals | null;

  // ✅ NEW: generated plans
  nutritionPlan?: NutritionPlanLite | null;
  workoutPlan?: WorkoutPlanLite | null;
};

export default function Home() {
  const {
    auth,
    isGuest: isGuestProp,
    userProfile,
    water,
    todayLog,
    todayMacros,
    mealTotals,

    // ✅ NEW
    nutritionPlan,
    workoutPlan,
  } = usePage<HomeProps>().props;

  const isGuest = typeof isGuestProp === "boolean" ? isGuestProp : !auth?.user;

  const displayName =
    auth?.user?.first_name ||
    auth?.user?.username ||
    auth?.user?.name ||
    (isGuest ? "guest" : "there");

  // --- BMI input coercion from DB/user profile ---
  const hRaw = userProfile?.height_cm;
  const wRaw = userProfile?.weight_kg;
  const heightNum =
    typeof hRaw === "string"
      ? Number(hRaw)
      : typeof hRaw === "number"
      ? hRaw
      : undefined;
  const weightNum =
    typeof wRaw === "string"
      ? Number(wRaw)
      : typeof wRaw === "number"
      ? wRaw
      : undefined;
  const profileSafe =
    typeof heightNum === "number" &&
    isFinite(heightNum) &&
    heightNum > 0 &&
    typeof weightNum === "number" &&
    isFinite(weightNum) &&
    weightNum > 0
      ? { height_cm: heightNum, weight_kg: weightNum }
      : undefined;

  // --- Optional day log grouping (if sent from controller) ---
  const logToShow = todayLog ?? null;
  const grouped: Record<string, TodayLogItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    drink: [],
  };
  if (logToShow?.items?.length) {
    for (const it of logToShow.items) grouped[it.category].push(it);
  }

  // --- Macro summaries from backend (fallback to zeros) ---
  const macros = todayMacros ?? {
    date: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  const perMeal: PerMealTotals =
    mealTotals ?? {
      breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      snack: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      drink: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };

  const round = (n: number) => Math.round(n);

  // --- Workout actions ---
  const todayISO = new Date().toISOString().slice(0, 10);

  const startTodayWorkout = () => {
    router.post(
      "/workouts/log/start",
      { workout_date: todayISO, workout_plan_day_id: null },
      { preserveScroll: true, onSuccess: () => router.visit("/workouts/log") }
    );
  };

  return (
    <>
      <Head title="Home" />
      <NavHeader />

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-10">
        {/* Page heading */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to Hayetak, {displayName}
            </h1>
            <p className="text-muted-foreground">
              {isGuest
                ? "You are browsing as a guest."
                : "Here’s your personalized dashboard."}
            </p>
          </div>
          {/* (Removed) Explore Nearby button */}
        </section>

        {/* Macros card */}
        <section className="rounded-2xl border bg-card text-card-foreground p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Today’s Macros</h2>

              {/* Turned into a real button */}
              <button
                type="button"
                onClick={() => router.visit("/track-meals")}
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Open Meal Tracker
              </button>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Calories" value={`${round(macros.calories)} kcal`} />
              <Stat label="Protein" value={`${round(macros.protein)} g`} />
              <Stat label="Carbs" value={`${round(macros.carbs)} g`} />
              <Stat label="Fat" value={`${round(macros.fat)} g`} />
            </div>

            {/* Per-meal */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {(
                ["breakfast", "lunch", "dinner", "snack", "drink"] as const
              ).map((mt) => (
                <div key={mt} className="rounded-xl border p-3">
                  <div className="text-sm font-medium capitalize">{mt}</div>
                  <div className="text-xs text-muted-foreground">
                    {round(perMeal[mt].calories)} kcal · P{" "}
                    {round(perMeal[mt].protein)} · C{" "}
                    {round(perMeal[mt].carbs)} · F {round(perMeal[mt].fat)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ✅ NEW: Generated Plans section (added, without removing your existing UI) */}
        <section className="rounded-2xl border bg-card text-card-foreground p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your Generated Plans</h2>
              <p className="text-muted-foreground">
                These are the latest active plans created for you during onboarding.
                If you just finished setup and don’t see them yet, your queue worker may still be processing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.visit("/track-meals")}
                className="rounded-lg px-4 py-2 font-medium"
                style={{
                  backgroundColor: "var(--secondary)",
                  color: "var(--secondary-foreground)",
                }}
              >
                Meal Tracker
              </button>

              <button
                onClick={() => router.visit("/workouts/plan")}
                className="rounded-lg px-4 py-2 font-medium"
                style={{
                  background: "color-mix(in oklab, var(--primary) 12%, white)",
                  color:
                    "color-mix(in oklab, var(--primary-foreground) 60%, var(--foreground))",
                  border: "1px solid var(--border)",
                }}
              >
                Workout Planner
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Nutrition Plan */}
            <div className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Nutrition Plan</h3>
                <span className="text-xs text-muted-foreground">
                  {nutritionPlan?.is_active ? "Active" : nutritionPlan ? "Inactive" : "—"}
                </span>
              </div>

              {isGuest ? (
                <div className="text-sm text-muted-foreground">
                  Sign in to see your generated nutrition plan.
                </div>
              ) : !nutritionPlan ? (
                <div className="text-sm text-muted-foreground">
                  No active nutrition plan found yet.
                  <div className="mt-2 text-xs">
                    If you use <code>QUEUE_CONNECTION=database</code>, make sure you run:
                    <div className="mt-1">
                      <code>php artisan queue:work</code>
                    </div>
                    Or just run <code>composer run dev</code>.
                  </div>
                </div>
              ) : (
                <NutritionPlanPreview plan={nutritionPlan} />
              )}
            </div>

            {/* Workout Plan */}
            <div className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Workout Plan</h3>
                <span className="text-xs text-muted-foreground">
                  {workoutPlan?.is_active ? "Active" : workoutPlan ? "Inactive" : "—"}
                </span>
              </div>

              {isGuest ? (
                <div className="text-sm text-muted-foreground">
                  Sign in to see your generated workout plan.
                </div>
              ) : !workoutPlan ? (
                <div className="text-sm text-muted-foreground">
                  No active workout plan found yet.
                  <div className="mt-2 text-xs">
                    Same note: if queue is database, a worker must be running.
                  </div>
                </div>
              ) : (
                <WorkoutPlanPreview plan={workoutPlan} />
              )}
            </div>
          </div>
        </section>

        {/* BMI + Water */}
        <section>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* BMI */}
            <div className="rounded-2xl border bg-card text-card-foreground p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">BMI</h2>
              </div>
              <BmiCard isGuest={isGuest} profile={profileSafe} />
            </div>

            {/* Water */}
            <div className="rounded-2xl border bg-card text-card-foreground p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Water Intake</h2>
              </div>
              <WaterCard
                isGuest={isGuest}
                // Use DB-provided water state; default to 2L target
                water={water ?? { today_ml: 0, target_ml: 2000 }}
                onQuickAdd={(ml: number) =>
                  router.post("/water", { ml }, { preserveScroll: true })
                }
              />
            </div>
          </div>
        </section>

        {/* Workouts */}
        <section className="rounded-2xl border bg-card text-card-foreground p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Log Workouts</h2>
              <p className="text-muted-foreground">
                Start a session, then record sets & reps. See weekly progress by
                muscle group.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Primary */}
              <button
                onClick={startTodayWorkout}
                className="rounded-lg px-4 py-2 font-medium"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Start Today’s Workout
              </button>

              {/* Secondary color (emerald) to distinguish from primary) */}
              <button
                onClick={() => router.visit("/workouts/log")}
                className="rounded-lg px-4 py-2 font-medium"
                style={{
                  backgroundColor: "var(--secondary)",
                  color: "var(--secondary-foreground)",
                }}
              >
                Open Workout Log
              </button>

              {/* Soft pill / outline-ish */}
              <button
                onClick={() => router.visit("/workouts/plan")}
                className="rounded-lg px-4 py-2 font-medium"
                style={{
                  background: "color-mix(in oklab, var(--primary) 12%, white)",
                  color:
                    "color-mix(in oklab, var(--primary-foreground) 60%, var(--foreground))",
                  border: "1px solid var(--border)",
                }}
              >
                Planner
              </button>
            </div>
          </div>

          {/* Mini progress + motivation */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border p-4 lg:col-span-2">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Weekly Progress (avg top-set weight)
              </h3>
              <ProgressMini />
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Motivation
              </h3>
              <MotivationBox />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

// ✅ NEW: previews (added at bottom so we don’t remove anything from your old page)
function NutritionPlanPreview({ plan }: { plan: NutritionPlanLite }) {
  const todayISO = new Date().toISOString().slice(0, 10);

  const day =
    plan.days?.find((d) => d.date === todayISO) ??
    plan.days?.find((d) => d.day_index === 1) ??
    plan.days?.[0];

  return (
    <div className="text-sm">
      <div className="mb-2">
        <div className="font-semibold">{plan.name}</div>
        <div className="text-xs text-muted-foreground">
          Goal: {plan.goal ?? "—"} · Start: {plan.start_date} · Duration:{" "}
          {plan.duration_days} day(s)
        </div>
      </div>

      {!day ? (
        <div className="text-sm text-muted-foreground">No days found in this plan.</div>
      ) : (
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">
              Day {day.day_index}{" "}
              <span className="text-xs text-muted-foreground">({day.date})</span>
            </div>
          </div>

          <div className="space-y-3">
            {(day.meals ?? [])
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((meal) => (
                <div key={meal.id} className="rounded-md border p-2">
                  <div className="text-xs font-semibold capitalize">
                    {meal.meal_type}
                  </div>

                  {(meal.items ?? []).length ? (
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {(meal.items ?? [])
                        .slice()
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((it) => {
                          const qty =
                            it.grams != null
                              ? `${it.grams} g`
                              : it.servings != null
                              ? `${it.servings} serving(s)`
                              : "—";
                          return (
                            <li key={it.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {it.food?.name ?? `Food #${it.food_id}`}
                              </span>
                              <span className="tabular-nums">{qty}</span>
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">
                      No items for this meal.
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutPlanPreview({ plan }: { plan: WorkoutPlanLite }) {
  const day1 =
    plan.days?.find((d) => d.day_index === 1) ??
    plan.days?.[0];

  return (
    <div className="text-sm">
      <div className="mb-2">
        <div className="font-semibold">{plan.name}</div>
        <div className="text-xs text-muted-foreground">
          Goal: {plan.goal ?? "—"} · Start: {plan.start_date} · Duration:{" "}
          {plan.duration_days} day(s)
        </div>
      </div>

      {!day1 ? (
        <div className="text-sm text-muted-foreground">No days found in this plan.</div>
      ) : (
        <div className="rounded-lg border p-3">
          <div className="mb-2 font-medium">
            Day {day1.day_index}: {day1.name}
          </div>

          {(day1.exercises ?? []).length ? (
            <ul className="space-y-2">
              {day1.exercises
                .slice()
                .sort((a, b) => (a.pivot?.order_index ?? 0) - (b.pivot?.order_index ?? 0))
                .slice(0, 8)
                .map((ex) => {
                  const sets = ex.pivot?.sets ?? 0;
                  const rmin = ex.pivot?.reps_min;
                  const rmax = ex.pivot?.reps_max;
                  const repText =
                    rmin != null && rmax != null
                      ? `${rmin}-${rmax}`
                      : rmin != null
                      ? `${rmin}`
                      : rmax != null
                      ? `${rmax}`
                      : "—";

                  return (
                    <li key={ex.id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-xs font-semibold">
                          {ex.name}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {sets} sets · {repText} reps
                        </div>
                      </div>

                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {ex.primary_muscle ? `Primary: ${ex.primary_muscle}` : ""}
                        {ex.equipment ? ` · Equipment: ${ex.equipment}` : ""}
                        {ex.difficulty ? ` · ${ex.difficulty}` : ""}
                      </div>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <div className="text-xs text-muted-foreground">
              No exercises found for Day 1.
            </div>
          )}

          {(day1.exercises ?? []).length > 8 ? (
            <div className="mt-2 text-xs text-muted-foreground">
              Showing first 8 exercises… open Planner to view full day.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProgressMini() {
  const [series, setSeries] = useState<ProgressPoint[]>([]);
  useEffect(() => {
    fetch("/workouts/progress?weeks=8")
      .then((r) => r.json())
      .then((d) => setSeries(Array.isArray(d.series) ? d.series : []))
      .catch(() => setSeries([]));
  }, []);

  if (!series.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Log a few workouts to unlock progress.
      </div>
    );
  }

  const last4 = series.slice(-4);
  const muscles = [
    "chest",
    "back",
    "shoulders",
    "legs",
    "biceps",
    "triceps",
    "core",
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-4">Week</th>
            {muscles.map((m) => (
              <th key={m} className="py-1 pr-4 capitalize">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {last4.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="py-1 pr-4 font-medium">{String(row.week)}</td>
              {muscles.map((m) => (
                <td key={m} className="py-1 pr-4 tabular-nums">
                  {typeof row[m] === "number" ? `${row[m]} kg` : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MotivationBox() {
  const [motivation, setMotivation] = useState<Motivation>(null);

  useEffect(() => {
    fetch("/workouts/progress?weeks=8")
      .then((r) => r.json())
      .then((d) => setMotivation(d.motivation ?? null))
      .catch(() => setMotivation(null));
  }, []);

  if (!motivation) {
    return (
      <div className="text-sm text-muted-foreground">
        Keep logging to see weekly wins ✨
      </div>
    );
  }

  return (
    <div className="text-sm">
      <div className="mb-1 font-semibold">{motivation.title}</div>
      <ul className="list-disc space-y-1 pl-5">
        {motivation.lines.map((l: string, i: number) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
        ))}
      </ul>
    </div>
  );
}
