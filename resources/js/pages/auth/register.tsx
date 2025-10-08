// resources/js/pages/auth/register.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";

/* ---------- Props & Types ---------- */
type Props = {
  dietOptions?: string[];
  allergyOptions?: string[];
  fitnessGoals?: string[];
  dietaryGoals?: string[];
};

type Gender = "male" | "female" | "other" | "";
type ActivityLevel =
  | "Sedentary"
  | "Lightly Active"
  | "Moderately Active"
  | "Very Active"
  | "Athlete";
type WorkoutLocation = "home" | "gym" | "both" | "";

/* ---------- Fallbacks (safe defaults) ---------- */
const FALLBACK_DIETS = [
  "Mediterranean",
  "Keto",
  "Paleo",
  "Vegan",
  "Vegetarian",
  "DASH",
  "Low-Carb",
  "High-Protein",
  "Intermittent Fasting",
  "Whole30",
];

const FALLBACK_ALLERGIES = [
  "Peanuts",
  "Tree Nuts",
  "Milk",
  "Eggs",
  "Wheat",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
  "Gluten",
  "Mustard",
  "Celery",
  "Lupin",
  "Sulphites",
  "Corn",
  "Gelatin",
  "Coconut",
  "Kiwi",
  "Banana",
  "Avocado",
  "Tomato",
  "Strawberry",
  "Chocolate",
  "Garlic",
  "Onion",
];

const FALLBACK_FITNESS = [
  "Lose Weight",
  "Maintain",
  "Build Muscle",
  "Improve Endurance",
  "Recomposition",
];

const FALLBACK_DIETARY_GOALS = [
  "Calorie Deficit",
  "Maintenance",
  "Calorie Surplus",
  "Balanced Nutrition",
];

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Very Active",
  "Athlete",
];

/* ---------- Small helpers ---------- */
const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

// NEW total steps (2FA step removed; 2FA will be forced server-side after register)
const computeTotalSteps = (tried: "yes" | "no" | "") =>
  tried === "yes" ? 6 : 5;

// allow free typing; strip invalid chars. For decimals, keep at most one dot
function sanitizeNumericLoose(raw: string, allowDecimal = false) {
  let s = raw.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (allowDecimal) {
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      const head = s.slice(0, firstDot + 1);
      const tail = s.slice(firstDot + 1).replace(/\./g, "");
      s = head + tail;
    }
  }
  return s;
}

function clampAndFormat(
  str: string,
  {
    min,
    max,
    allowDecimal = false,
  }: { min: number; max: number; allowDecimal?: boolean }
) {
  let cleaned = str.trim();
  if (allowDecimal && cleaned.startsWith(".")) cleaned = "0" + cleaned; // ".5" -> "0.5"
  if (cleaned === "" || cleaned === "." || cleaned === "0.") return "";

  const n = Number(cleaned);
  if (Number.isNaN(n)) return "";

  const clamped = clamp(n, min, max);
  if (allowDecimal) return String(Number(clamped.toFixed(2)));
  return String(Math.round(clamped));
}

function preventNonNumericKeys(
  e: React.KeyboardEvent<HTMLInputElement>,
  allowDecimal = false
) {
  const blocked = ["e", "E", "+", "-"];
  if (!allowDecimal) blocked.push(".");
  if (blocked.includes(e.key)) e.preventDefault();
}

/* ---------- Nicely-styled checkbox control ---------- */
function CheckTile({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label
      className={[
        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition",
        checked ? "ring-2 ring-primary bg-muted" : "hover:bg-muted",
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-input accent-[#0EA5A4] focus:ring-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

/* ---------- Wizard component ---------- */
function RegisterWizard(props: Props) {
  // Use fallbacks whenever arrays are missing/empty
  const dietOptions =
    props.dietOptions && props.dietOptions.length
      ? props.dietOptions
      : FALLBACK_DIETS;
  const allergyOptions =
    props.allergyOptions && props.allergyOptions.length
      ? props.allergyOptions
      : FALLBACK_ALLERGIES;
  const fitnessGoals =
    props.fitnessGoals && props.fitnessGoals.length
      ? props.fitnessGoals
      : FALLBACK_FITNESS;
  const dietaryGoals =
    props.dietaryGoals && props.dietaryGoals.length
      ? props.dietaryGoals
      : FALLBACK_DIETARY_GOALS;

  const [step, setStep] = useState<number>(1);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const { data, setData, post, processing, errors, transform } = useForm({
    // Basic
    first_name: "",
    last_name: "",
    username: "",
    gender: "" as Gender,
    age: "" as string,
    height_cm: "" as string,
    weight_kg: "" as string,

    // Medical history
    has_medical_history: false,
    medical_history: "",

    // Goals
    dietary_goal: "",
    fitness_goal: "",
    diet_name: "",
    allergies: [] as string[],

    // Activity & Training
    activity_level: "" as ActivityLevel | "",
    workout_days_per_week: "" as string, // keep as string for loose typing; cast on submit
    workout_location: "" as WorkoutLocation,

    // Diet experience
    tried_diet_before: "" as "yes" | "no" | "",
    diet_failure_reasons: [] as string[],
    diet_failure_other: "",

    // Credentials
    email: "",
    password: "",
    password_confirmation: "",

    // FORCE 2FA after register. Backend should redirect to authenticator setup page.
    force_enable_2fa: true,
  });

  const totalSteps = useMemo(
    () => computeTotalSteps(data.tried_diet_before),
    [data.tried_diet_before]
  );

  useEffect(() => {
    if (step > totalSteps) setStep(totalSteps);
  }, [totalSteps, step]);

  const reasons = [
    "Too restrictive",
    "Hunger/low energy",
    "Social/lifestyle conflicts",
    "Too expensive",
    "Time/meal prep burden",
    "Lack of results",
    "Medical reasons",
    "Travel/routine changes",
    "Cravings",
    "Confusing guidance",
  ];

  const back = () => setStep((s) => Math.max(1, s - 1));
  const next = () => {
    if (!validateStep(step)) return;
    // Leaving step 4: if "no", jump straight to final step
    if (step === 4 && data.tried_diet_before === "no") {
      setStep(totalSteps);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const submit = () => {
    if (!validateStep(totalSteps)) return;
    // cast numeric strings just before submit
    transform((d) => ({
      ...d,
      age: d.age ? Number(d.age) : null,
      height_cm: d.height_cm ? Number(d.height_cm) : null,
      weight_kg: d.weight_kg ? Number(d.weight_kg) : null,
      workout_days_per_week:
        d.workout_days_per_week !== "" ? Number(d.workout_days_per_week) : null,
      force_enable_2fa: true, // ensure it remains true even if someone tampers with the UI
    }));
    post("/register"); // server should redirect to your 2FA QR setup page
  };

  // Numeric wrappers
  const onNumericChange =
    <K extends keyof typeof data>(key: K, allowDecimal = false) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = sanitizeNumericLoose(e.target.value, allowDecimal);
      setData(key, val as any);
    };

  const onNumericBlur =
    <K extends keyof typeof data>(
      key: K,
      opts: { min: number; max: number; allowDecimal?: boolean }
    ) =>
    () => {
      const current = String(data[key] ?? "");
      const formatted = clampAndFormat(current, opts);
      setData(key, formatted as any);
    };

  // Live warning for workout days
  const workoutDaysNum = Number(data.workout_days_per_week);
  const workoutDaysWarning =
    data.workout_days_per_week !== "" &&
    (Number.isNaN(workoutDaysNum) || workoutDaysNum < 1 || workoutDaysNum > 7)
      ? "Enter a number from 1 to 7."
      : "";

  function validateStep(s: number) {
    const ce: Record<string, string> = {};

    if (s === 1) {
      if (!data.first_name || String(data.first_name).trim().length < 2)
        ce.first_name = "Please enter at least 2 characters.";
      if (!data.last_name || String(data.last_name).trim().length < 2)
        ce.last_name = "Please enter at least 2 characters.";

      if (data.username) {
        if (!/^[A-Za-z0-9_.]+$/.test(data.username))
          ce.username = "Only letters, numbers, underscore and dot are allowed.";
        if (data.username.length > 24)
          ce.username = "Username must be ≤ 24 characters.";
      }

      const ageNum = Number(data.age);
      if (!ageNum || ageNum < 13 || ageNum > 100)
        ce.age = "Age must be between 13 and 100.";

      const hNum = Number(data.height_cm);
      if (!hNum || hNum < 80 || hNum > 250)
        ce.height_cm = "Height must be between 80 and 250 cm.";

      const wNum = Number(data.weight_kg);
      if (!wNum || wNum < 25 || wNum > 400)
        ce.weight_kg = "Weight must be between 25 and 400 kg.";

      if (!data.gender) ce.gender = "Please select a gender.";

      if (data.has_medical_history && !data.medical_history.trim()) {
        ce.medical_history = "Please describe your medical history.";
      }
    }

    if (s === 2) {
      if (!data.dietary_goal) ce.dietary_goal = "Select a dietary goal.";
      if (!data.fitness_goal) ce.fitness_goal = "Select a fitness goal.";
      if (!data.diet_name) ce.diet_name = "Select or type a diet.";
      if (data.diet_name === "Other" && data.diet_name.trim() === "Other")
        ce.diet_name = "Please type your diet name after choosing Other.";
    }

    if (s === 3) {
      if (!data.activity_level) ce.activity_level = "Select your activity level.";
      const d = Number(data.workout_days_per_week);
      if (
        data.workout_days_per_week === "" ||
        Number.isNaN(d) ||
        d < 1 ||
        d > 7
      ) {
        ce.workout_days_per_week = "Enter a number from 1 to 7.";
      }
      if (!data.workout_location) ce.workout_location = "Choose where you'll train.";
    }

    if (s === 4) {
      if (!data.tried_diet_before) ce.tried_diet_before = "Please choose Yes or No.";
    }

    if (s === 5 && data.tried_diet_before === "yes") {
      if (
        data.diet_failure_reasons.length === 0 &&
        !data.diet_failure_other.trim()
      ) {
        ce.diet_failure_reasons = "Pick at least one reason or fill in Other.";
      }
      if (data.diet_failure_other.length > 120)
        ce.diet_failure_other = "Keep the 'Other' reason under 120 characters.";
    }

    // Final step validation (6 if tried=yes, 5 if no)
    if (s === totalSteps) {
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        ce.email = "Enter a valid email address.";
      if (!data.password || data.password.length < 8)
        ce.password = "Password must be at least 8 characters.";
      if (data.password !== data.password_confirmation)
        ce.password_confirmation = "Passwords do not match.";
    }

    setClientErrors(ce);
    return Object.keys(ce).length === 0;
  }

  const showServerOrClientError = (field: string) =>
    clientErrors[field] || (errors as any)[field];

  const prog = useMemo(
    () => Array.from({ length: totalSteps }, (_, i) => i + 1),
    [totalSteps]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create your Hayetak account</h1>

      {/* Progress bar */}
      <div className="flex gap-2" aria-label={`Step ${step} of ${totalSteps}`}>
        {prog.map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic */}
      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Basic Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm">First name</label>
              <input
                className="w-full rounded-md border bg-transparent px-3 py-2"
                value={data.first_name}
                maxLength={40}
                onChange={(e) => setData("first_name", e.target.value)}
              />
              {showServerOrClientError("first_name") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("first_name")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Last name</label>
              <input
                className="w-full rounded-md border bg-transparent px-3 py-2"
                value={data.last_name}
                maxLength={40}
                onChange={(e) => setData("last_name", e.target.value)}
              />
              {showServerOrClientError("last_name") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("last_name")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Username (optional, unique)</label>
              <input
                className="w-full rounded-md border bg-transparent px-3 py-2"
                value={data.username}
                maxLength={24}
                placeholder="letters, numbers, _ or ."
                pattern="^[A-Za-z0-9_.]+$"
                onChange={(e) => setData("username", e.target.value)}
              />
              {showServerOrClientError("username") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("username")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Gender</label>
              {/* text-black requested for dropdowns */}
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-black"
                value={data.gender}
                onChange={(e) => setData("gender", e.target.value as Gender)}
              >
                <option className="text-black" value="">
                  Select
                </option>
                <option className="text-black" value="male">
                  Male
                </option>
                <option className="text-black" value="female">
                  Female
                </option>
                <option className="text-black" value="other">
                  Other
                </option>
              </select>
              {showServerOrClientError("gender") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("gender")}
                </p>
              )}
            </div>

            {/* numeric text inputs (no arrows) */}
            <div>
              <label className="block text-sm">Age</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full rounded-md border bg-transparent px-3 py-2"
                placeholder="e.g. 20"
                value={data.age}
                onKeyDown={(e) => preventNonNumericKeys(e, false)}
                onChange={onNumericChange("age", false)}
                onBlur={onNumericBlur("age", { min: 13, max: 100 })}
              />
              {showServerOrClientError("age") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("age")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Height (cm)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full rounded-md border bg-transparent px-3 py-2"
                placeholder="e.g. 180"
                value={data.height_cm}
                onKeyDown={(e) => preventNonNumericKeys(e, false)}
                onChange={onNumericChange("height_cm", false)}
                onBlur={onNumericBlur("height_cm", { min: 80, max: 250 })}
              />
              {showServerOrClientError("height_cm") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("height_cm")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Weight (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9.]*"
                className="w-full rounded-md border bg-transparent px-3 py-2"
                placeholder="e.g. 72.5"
                value={data.weight_kg}
                onKeyDown={(e) => preventNonNumericKeys(e, true)}
                onChange={onNumericChange("weight_kg", true)}
                onBlur={onNumericBlur("weight_kg", {
                  min: 25,
                  max: 400,
                  allowDecimal: true,
                })}
              />
              {showServerOrClientError("weight_kg") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("weight_kg")}
                </p>
              )}
            </div>

            {/* Medical history (styled checkbox) */}
            <div className="md:col-span-2 space-y-2">
              <CheckTile
                checked={data.has_medical_history}
                onChange={(v) => setData("has_medical_history", v)}
                label="I have a medical history relevant to diet/exercise"
              />
              {data.has_medical_history && (
                <div>
                  <textarea
                    className="min-h-[90px] w-full rounded-md border bg-transparent px-3 py-2"
                    placeholder="Briefly list conditions (e.g., diabetes, thyroid, injuries)..."
                    maxLength={500}
                    value={data.medical_history}
                    onChange={(e) => setData("medical_history", e.target.value)}
                  />
                  {showServerOrClientError("medical_history") && (
                    <p className="text-sm text-destructive">
                      {showServerOrClientError("medical_history")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button className="rounded-md bg-primary px-5 py-2 text-primary-foreground" onClick={next}>
              Next
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Goals & Dietary */}
      {step === 2 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Goals & Dietary</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm">Dietary Goal</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-black"
                value={data.dietary_goal}
                onChange={(e) => setData("dietary_goal", e.target.value)}
              >
                <option className="text-black" value="">
                  Select
                </option>
                {dietaryGoals.map((g) => (
                  <option className="text-black" key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {showServerOrClientError("dietary_goal") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("dietary_goal")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Fitness Goal</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-black"
                value={data.fitness_goal}
                onChange={(e) => setData("fitness_goal", e.target.value)}
              >
                <option className="text-black" value="">
                  Select
                </option>
                {fitnessGoals.map((g) => (
                  <option className="text-black" key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {showServerOrClientError("fitness_goal") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("fitness_goal")}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm">Diet</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {dietOptions.map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`rounded-md border px-3 py-1 ${
                      data.diet_name === d ? "bg-primary text-primary-foreground" : ""
                    }`}
                    onClick={() => setData("diet_name", d)}
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  className={`rounded-md border px-3 py-1 ${
                    data.diet_name === "Other" ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => setData("diet_name", "Other")}
                >
                  Other
                </button>
              </div>
              {data.diet_name === "Other" && (
                <input
                  placeholder="Type your diet name"
                  className="w-full rounded-md border bg-transparent px-3 py-2"
                  maxLength={40}
                  onChange={(e) => setData("diet_name", e.target.value)}
                />
              )}
              {showServerOrClientError("diet_name") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("diet_name")}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm">Allergies (multi-select)</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {allergyOptions.map((a) => {
                  const active = data.allergies.includes(a);
                  return (
                    <CheckTile
                      key={a}
                      checked={active}
                      onChange={(v) => {
                        if (v) setData("allergies", [...data.allergies, a]);
                        else setData("allergies", data.allergies.filter((x) => x !== a));
                      }}
                      label={a}
                    />
                  );
                })}
              </div>
              {showServerOrClientError("allergies") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("allergies")}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={back}>
              Back
            </button>
            <button
              className="rounded-md bg-primary px-5 py-2 text-primary-foreground"
              onClick={next}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Activity & Training */}
      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Activity & Training</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm">Activity Level</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-2 text-black"
                value={data.activity_level}
                onChange={(e) =>
                  setData("activity_level", e.target.value as ActivityLevel)
                }
              >
                <option className="text-black" value="">
                  Select
                </option>
                {ACTIVITY_LEVELS.map((lvl) => (
                  <option className="text-black" key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
              {showServerOrClientError("activity_level") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("activity_level")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Planned Workouts / Week</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${
                  workoutDaysWarning ? "border-amber-500" : ""
                }`}
                placeholder="e.g. 3"
                value={data.workout_days_per_week}
                onKeyDown={(e) => preventNonNumericKeys(e, false)}
                onChange={onNumericChange("workout_days_per_week", false)}
                onBlur={onNumericBlur("workout_days_per_week", { min: 1, max: 7 })}
                aria-invalid={!!workoutDaysWarning}
              />
              {workoutDaysWarning ? (
                <p className="mt-1 text-xs text-amber-600">{workoutDaysWarning}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  We’ll tailor your plan frequency.
                </p>
              )}
              {showServerOrClientError("workout_days_per_week") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("workout_days_per_week")}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-2">Where will you train?</label>
              <div className="flex flex-wrap gap-2">
                {(["home", "gym", "both"] as WorkoutLocation[]).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    className={`rounded-md border px-4 py-2 capitalize ${
                      data.workout_location === loc
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }`}
                    onClick={() => setData("workout_location", loc)}
                  >
                    {loc}
                  </button>
                ))}
              </div>
              {showServerOrClientError("workout_location") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("workout_location")}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={back}>
              Back
            </button>
            <button
              className="rounded-md bg-primary px-5 py-2 text-primary-foreground"
              onClick={next}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {/* Step 4: Tried diet before? */}
      {step === 4 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">
            Have you tried any dietary plans before?
          </h2>
          <div className="flex gap-3">
            {(["yes", "no"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`rounded-md border px-4 py-2 capitalize ${
                  data.tried_diet_before === opt
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
                onClick={() => setData("tried_diet_before", opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          {showServerOrClientError("tried_diet_before") && (
            <p className="text-sm text-destructive">
              {showServerOrClientError("tried_diet_before")}
            </p>
          )}

          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={back}>
              Back
            </button>
            <button
              className="rounded-md bg-primary px-5 py-2 text-primary-foreground"
              onClick={next}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {/* Step 5: Why didn’t it work? (only if tried=yes) */}
      {step === 5 && data.tried_diet_before === "yes" && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Why didn’t it work out for you?</h2>
          <p className="text-sm text-muted-foreground">Select all that apply</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {reasons.map((r) => {
              const checked = data.diet_failure_reasons.includes(r);
              return (
                <CheckTile
                  key={r}
                  checked={checked}
                  onChange={(v) => {
                    if (v)
                      setData("diet_failure_reasons", [
                        ...data.diet_failure_reasons,
                        r,
                      ]);
                    else
                      setData(
                        "diet_failure_reasons",
                        data.diet_failure_reasons.filter((x) => x !== r)
                      );
                  }}
                  label={r}
                />
              );
            })}
          </div>

          <div>
            <label className="block text-sm">Other (optional)</label>
            <input
              className="w-full rounded-md border bg-transparent px-3 py-2"
              maxLength={120}
              placeholder="Your reason"
              value={data.diet_failure_other}
              onChange={(e) => setData("diet_failure_other", e.target.value)}
            />
            {showServerOrClientError("diet_failure_reasons") && (
              <p className="text-sm text-destructive">
                {showServerOrClientError("diet_failure_reasons")}
              </p>
            )}
            {showServerOrClientError("diet_failure_other") && (
              <p className="text-sm text-destructive">
                {showServerOrClientError("diet_failure_other")}
              </p>
            )}
          </div>

          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={back}>
              Back
            </button>
            <button
              className="rounded-md bg-primary px-5 py-2 text-primary-foreground"
              onClick={next}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {/* Final Step: Credentials */}
      {step === totalSteps && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Login Details</h2>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p>
              After you create your account, you will be{" "}
              <strong>redirected to set up your Authenticator (QR code)</strong>.
              This is required to keep your account secure.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm">Email</label>
              <input
                type="email"
                className="w-full rounded-md border bg-transparent px-3 py-2"
                value={data.email}
                maxLength={120}
                inputMode="email"
                placeholder="you@example.com"
                onChange={(e) => setData("email", e.target.value.trim())}
              />
              {showServerOrClientError("email") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("email")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Password</label>
              <input
                type="password"
                className="w-full rounded-md border bg-transparent px-3 py-2"
                value={data.password}
                maxLength={72}
                onChange={(e) => setData("password", e.target.value)}
                placeholder="At least 8 characters"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use 8+ characters. Adding numbers & symbols helps.
              </p>
              {showServerOrClientError("password") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("password")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm">Confirm Password</label>
              <input
                type="password"
                className="w-full rounded-md border bg-transparent px-3 py-2"
                value={data.password_confirmation}
                maxLength={72}
                onChange={(e) =>
                  setData("password_confirmation", e.target.value)
                }
              />
              {showServerOrClientError("password_confirmation") && (
                <p className="text-sm text-destructive">
                  {showServerOrClientError("password_confirmation")}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={back}>
              Back
            </button>
            <button
              className="rounded-md bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
              disabled={processing}
              onClick={submit}
            >
              Create Account
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- Page wrapper: centers content; avoids large empty background ---------- */
export default function Register(props: Props) {
  return (
    <>
      <Head title="Create your account" />
      <main className="min-h-[100svh] bg-background grid place-items-center">
        <div className="w-full max-w-3xl px-6 py-10 md:py-16">
          <div className="rounded-xl border bg-card/40 backdrop-blur-sm shadow-sm">
            <div className="p-6 md:p-8">
              <RegisterWizard {...props} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
