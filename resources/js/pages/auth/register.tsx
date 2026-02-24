// resources/js/pages/auth/register.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
type DietExperience = "yes" | "no" | "";

type RegisterFormData = {
  first_name: string;
  last_name: string;
  username: string;
  gender: Gender;
  age: string;
  height_cm: string;
  weight_kg: string;
  has_medical_history: boolean;
  medical_history: string;
  dietary_goal: string;
  fitness_goal: string;
  diet_name: string;
  allergies: string[];
  activity_level: ActivityLevel | "";
  workout_days_per_week: string;
  workout_location: WorkoutLocation;
  tried_diet_before: DietExperience;
  diet_failure_reasons: string[];
  diet_failure_other: string;
  email: string;
  password: string;
  password_confirmation: string;
  force_enable_2fa: boolean;
  diet_other_name: string;
  diet_choice: string;
};

type NumericField = "age" | "height_cm" | "weight_kg" | "workout_days_per_week";

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

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

/* ---------- UI helpers (small, no deps) ---------- */
function SectionCard({
  title,
  description,
  children,
  headingRef,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-medium">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm text-destructive">
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
  required,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <div
        className="rounded-md"
        aria-describedby={describedBy}
        aria-invalid={!!error}
      >
        {/* child should have id={id} */}
        {children}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? <ErrorText id={errId!}>{error}</ErrorText> : null}
    </div>
  );
}

/* Tile checkbox (keeps your styling, improves focus) */
function CheckTile({
  checked,
  onChange,
  label,
  name,
  value,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  name?: string;
  value?: string;
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
        name={name}
        value={value}
        className={`h-4 w-4 shrink-0 rounded border-input accent-[#0EA5A4] ${FOCUS_RING}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

/* Pill radio group (styled like your buttons, correct semantics) */
function RadioPills<T extends string>({
  name,
  value,
  onChange,
  options,
  legend,
  error,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  legend: string;
  error?: string;
}) {
  const errId = error ? `${name}-error` : undefined;

  return (
    <fieldset className="space-y-2" aria-describedby={errId}>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <label key={opt.value} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={opt.value}
                className="sr-only"
                checked={active}
                onChange={() => onChange(opt.value)}
              />
              <span
                className={[
                  "inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium capitalize transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                  FOCUS_RING,
                ].join(" ")}
              >
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <ErrorText id={errId!}>{error}</ErrorText> : null}
    </fieldset>
  );
}

/* Primary/secondary buttons */
function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border hover:bg-muted";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${FOCUS_RING} disabled:opacity-50`}
    >
      {children}
    </button>
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

  const { data, setData, post, processing, errors, transform } = useForm<RegisterFormData>({
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
    diet_name: "", // final diet name that will be submitted
    allergies: [] as string[],

    // Activity & Training
    activity_level: "" as ActivityLevel | "",
    workout_days_per_week: "" as string,
    workout_location: "" as WorkoutLocation,

    // Diet experience
    tried_diet_before: "" as DietExperience,
    diet_failure_reasons: [] as string[],
    diet_failure_other: "",

    // Credentials
    email: "",
    password: "",
    password_confirmation: "",

    // FORCE 2FA after register.
    force_enable_2fa: true,

    // NEW (client-only helper field): store "other diet" text separately
    diet_other_name: "",
    diet_choice: "" as string, // selected from list OR "Other"
  });

  const totalSteps = useMemo(
    () => computeTotalSteps(data.tried_diet_before),
    [data.tried_diet_before]
  );

  useEffect(() => {
    if (step > totalSteps) setStep(totalSteps);
  }, [totalSteps, step]);

  // focus management
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Focus the step heading when step changes (better for SR/keyboard)
    stepHeadingRef.current?.focus();
  }, [step]);

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
    if (step === 4 && data.tried_diet_before === "no") {
      setStep(totalSteps);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const submit = () => {
    if (!validateStep(totalSteps)) return;

    transform((d) => {
      // ensure diet_name is correct at submit time
      const finalDiet =
        d.diet_choice === "Other" ? d.diet_other_name.trim() : d.diet_choice;

      return {
        ...d,
        diet_name: finalDiet,
        // cast numeric strings just before submit
        age: d.age ? Number(d.age) : null,
        height_cm: d.height_cm ? Number(d.height_cm) : null,
        weight_kg: d.weight_kg ? Number(d.weight_kg) : null,
        workout_days_per_week:
          d.workout_days_per_week !== "" ? Number(d.workout_days_per_week) : null,
        force_enable_2fa: true,
      };
    });

    post("/register");
  };

  // Numeric wrappers
  const onNumericChange =
    (key: NumericField, allowDecimal = false) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = sanitizeNumericLoose(e.target.value, allowDecimal);
      setData(key, val);
    };

  const onNumericBlur =
    (
      key: NumericField,
      opts: { min: number; max: number; allowDecimal?: boolean }
    ) =>
    () => {
      const current = String(data[key] ?? "");
      const formatted = clampAndFormat(current, opts);
      setData(key, formatted);
    };

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

      if (!data.diet_choice) ce.diet_choice = "Select a diet.";
      if (data.diet_choice === "Other") {
        if (!data.diet_other_name.trim())
          ce.diet_other_name = "Please type your diet name.";
      }
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

  const serverErrors = errors as Record<string, string | undefined>;
  const showServerOrClientError = (field: string) =>
    clientErrors[field] || serverErrors[field];

  const prog = useMemo(
    () => Array.from({ length: totalSteps }, (_, i) => i + 1),
    [totalSteps]
  );

  // Error summary for current step (helps SR users)
  const stepErrors = useMemo(() => {
    const out: { field: string; message: string }[] = [];
    Object.entries(clientErrors).forEach(([k, v]) => out.push({ field: k, message: v }));
    // include server errors if present and no client error for that field
    Object.entries(errors ?? {}).forEach(([k, v]) => {
      if (!clientErrors[k]) out.push({ field: k, message: String(v) });
    });
    return out;
  }, [clientErrors, errors]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Create your Hayetak account</h1>
        <p className="text-sm text-muted-foreground">
          Step {step} of {totalSteps}. This takes about 2–3 minutes.
        </p>

        {/* Progress bar (decorative) */}
        <div className="flex gap-2" aria-hidden="true">
          {prog.map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </header>

      {/* Error summary for screen readers + quick scan */}
      {stepErrors.length > 0 ? (
        <div
          className="rounded-md border bg-muted/30 p-3"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-medium">Please fix the following:</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {stepErrors.slice(0, 6).map((e) => (
              <li key={e.field}>{e.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Step 1: Basic */}
      {step === 1 && (
        <SectionCard
          title="Basic Information"
          headingRef={stepHeadingRef}
          description="Tell us a bit about you. This helps the AI personalize your plans."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="first_name"
              label="First name"
              required
              error={showServerOrClientError("first_name")}
            >
              <input
                id="first_name"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                value={data.first_name}
                maxLength={40}
                autoComplete="given-name"
                onChange={(e) => setData("first_name", e.target.value)}
              />
            </Field>

            <Field
              id="last_name"
              label="Last name"
              required
              error={showServerOrClientError("last_name")}
            >
              <input
                id="last_name"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                value={data.last_name}
                maxLength={40}
                autoComplete="family-name"
                onChange={(e) => setData("last_name", e.target.value)}
              />
            </Field>

            <Field
              id="username"
              label="Username (optional, unique)"
              hint="Letters, numbers, underscore (_) and dot (.) only."
              error={showServerOrClientError("username")}
            >
              <input
                id="username"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                value={data.username}
                maxLength={24}
                placeholder="e.g. cha.hid_01"
                pattern="^[A-Za-z0-9_.]+$"
                autoComplete="username"
                onChange={(e) => setData("username", e.target.value)}
              />
            </Field>

            {/* Gender as radios for semantics */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Gender <span className="text-destructive">*</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ] as const
                ).map((opt) => {
                  const active = data.gender === opt.value;
                  return (
                    <label key={opt.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={opt.value}
                        className="sr-only"
                        checked={active}
                        onChange={() => setData("gender", opt.value)}
                      />
                      <span
                        className={[
                          "inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                          FOCUS_RING,
                        ].join(" ")}
                      >
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {showServerOrClientError("gender") ? (
                <ErrorText id="gender-error">{showServerOrClientError("gender")}</ErrorText>
              ) : null}
            </fieldset>

            <Field
              id="age"
              label="Age"
              required
              error={showServerOrClientError("age")}
            >
              <input
                id="age"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                placeholder="e.g. 20"
                value={data.age}
                onKeyDown={(e) => preventNonNumericKeys(e, false)}
                onChange={onNumericChange("age", false)}
                onBlur={onNumericBlur("age", { min: 13, max: 100 })}
              />
            </Field>

            <Field
              id="height_cm"
              label="Height (cm)"
              required
              error={showServerOrClientError("height_cm")}
            >
              <input
                id="height_cm"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                placeholder="e.g. 180"
                value={data.height_cm}
                onKeyDown={(e) => preventNonNumericKeys(e, false)}
                onChange={onNumericChange("height_cm", false)}
                onBlur={onNumericBlur("height_cm", { min: 80, max: 250 })}
              />
            </Field>

            <Field
              id="weight_kg"
              label="Weight (kg)"
              required
              error={showServerOrClientError("weight_kg")}
            >
              <input
                id="weight_kg"
                type="text"
                inputMode="decimal"
                pattern="[0-9.]*"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
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
            </Field>

            <div className="md:col-span-2 space-y-2">
              <CheckTile
                checked={data.has_medical_history}
                onChange={(v) => setData("has_medical_history", v)}
                label="I have a medical history relevant to diet/exercise"
                name="has_medical_history"
              />

              {data.has_medical_history ? (
                <Field
                  id="medical_history"
                  label="Medical history"
                  required
                  error={showServerOrClientError("medical_history")}
                  hint="Briefly list conditions (e.g., diabetes, thyroid, injuries)."
                >
                  <textarea
                    id="medical_history"
                    className={`min-h-[90px] w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                    placeholder="Type here..."
                    maxLength={500}
                    value={data.medical_history}
                    onChange={(e) => setData("medical_history", e.target.value)}
                  />
                </Field>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Step 2: Goals & Dietary */}
      {step === 2 && (
        <SectionCard title="Goals & Dietary" headingRef={stepHeadingRef}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="dietary_goal"
              label="Dietary Goal"
              required
              error={showServerOrClientError("dietary_goal")}
            >
              <select
                id="dietary_goal"
                className={`w-full rounded-md border bg-transparent px-3 py-2 text-black ${FOCUS_RING}`}
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
            </Field>

            <Field
              id="fitness_goal"
              label="Fitness Goal"
              required
              error={showServerOrClientError("fitness_goal")}
            >
              <select
                id="fitness_goal"
                className={`w-full rounded-md border bg-transparent px-3 py-2 text-black ${FOCUS_RING}`}
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
            </Field>

            {/* Diet selection (pills) + “Other” input */}
            <div className="md:col-span-2 space-y-2">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Diet <span className="text-destructive">*</span>
                </legend>

                <div className="flex flex-wrap gap-2">
                  {[...dietOptions, "Other"].map((d) => {
                    const active = data.diet_choice === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        className={[
                          "rounded-md border px-3 py-1 text-sm font-medium transition",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                          FOCUS_RING,
                        ].join(" ")}
                        onClick={() => {
                          setData("diet_choice", d);
                          if (d !== "Other") {
                            // set final diet immediately for non-other
                            setData("diet_name", d);
                            setData("diet_other_name", "");
                          } else {
                            // keep diet_name empty until user types
                            setData("diet_name", "");
                          }
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {data.diet_choice === "Other" ? (
                  <Field
                    id="diet_other_name"
                    label="Type your diet name"
                    required
                    error={showServerOrClientError("diet_other_name")}
                    hint="Example: Low FODMAP, Gluten-Free, etc."
                  >
                    <input
                      id="diet_other_name"
                      className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                      maxLength={40}
                      value={data.diet_other_name}
                      onChange={(e) => {
                        setData("diet_other_name", e.target.value);
                        setData("diet_name", e.target.value);
                      }}
                    />
                  </Field>
                ) : null}

                {showServerOrClientError("diet_choice") ? (
                  <ErrorText id="diet_choice-error">
                    {showServerOrClientError("diet_choice")}
                  </ErrorText>
                ) : null}
              </fieldset>
            </div>

            {/* Allergies */}
            <div className="md:col-span-2">
              <div className="flex items-baseline justify-between gap-2">
                <label className="block text-sm font-medium">
                  Allergies (multi-select)
                </label>
                <button
                  type="button"
                  className={`text-xs text-primary hover:underline ${FOCUS_RING} rounded-md`}
                  onClick={() => setData("allergies", [])}
                >
                  Clear
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {allergyOptions.map((a) => {
                  const active = data.allergies.includes(a);
                  return (
                    <CheckTile
                      key={a}
                      checked={active}
                      onChange={(v) => {
                        if (v) setData("allergies", [...data.allergies, a]);
                        else
                          setData(
                            "allergies",
                            data.allergies.filter((x) => x !== a)
                          );
                      }}
                      label={a}
                      name="allergies"
                      value={a}
                    />
                  );
                })}
              </div>

              {showServerOrClientError("allergies") ? (
                <p className="mt-2 text-sm text-destructive">
                  {showServerOrClientError("allergies")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Step 3: Activity & Training */}
      {step === 3 && (
        <SectionCard title="Activity & Training" headingRef={stepHeadingRef}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="activity_level"
              label="Activity Level"
              required
              error={showServerOrClientError("activity_level")}
            >
              <select
                id="activity_level"
                className={`w-full rounded-md border bg-transparent px-3 py-2 text-black ${FOCUS_RING}`}
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
            </Field>

            <Field
              id="workout_days_per_week"
              label="Planned Workouts / Week"
              required
              error={showServerOrClientError("workout_days_per_week")}
              hint={
                workoutDaysWarning
                  ? workoutDaysWarning
                  : "We’ll tailor your plan frequency."
              }
            >
              <input
                id="workout_days_per_week"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={[
                  `w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`,
                  workoutDaysWarning ? "border-amber-500" : "",
                ].join(" ")}
                placeholder="e.g. 3"
                value={data.workout_days_per_week}
                onKeyDown={(e) => preventNonNumericKeys(e, false)}
                onChange={onNumericChange("workout_days_per_week", false)}
                onBlur={onNumericBlur("workout_days_per_week", { min: 1, max: 7 })}
                aria-invalid={!!workoutDaysWarning}
              />
            </Field>

            <div className="md:col-span-2">
              <RadioPills<WorkoutLocation>
                name="workout_location"
                value={data.workout_location}
                onChange={(v) => setData("workout_location", v)}
                legend="Where will you train?"
                options={[
                  { value: "home", label: "Home" },
                  { value: "gym", label: "Gym" },
                  { value: "both", label: "Both" },
                ]}
                error={showServerOrClientError("workout_location")}
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Step 4: Tried diet before? */}
      {step === 4 && (
        <SectionCard
          title="Have you tried any dietary plans before?"
          headingRef={stepHeadingRef}
        >
          <RadioPills<"yes" | "no" | "">
            name="tried_diet_before"
            value={data.tried_diet_before}
            onChange={(v) => setData("tried_diet_before", v)}
            legend="Choose one"
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            error={showServerOrClientError("tried_diet_before")}
          />

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Step 5: Why didn’t it work? (only if tried=yes) */}
      {step === 5 && data.tried_diet_before === "yes" && (
        <SectionCard
          title="Why didn’t it work out for you?"
          description="Select all that apply."
          headingRef={stepHeadingRef}
        >
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
                  name="diet_failure_reasons"
                  value={r}
                />
              );
            })}
          </div>

          <Field
            id="diet_failure_other"
            label="Other (optional)"
            error={showServerOrClientError("diet_failure_other")}
            hint="Keep it short (max 120 characters)."
          >
            <input
              id="diet_failure_other"
              className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
              maxLength={120}
              placeholder="Your reason"
              value={data.diet_failure_other}
              onChange={(e) => setData("diet_failure_other", e.target.value)}
            />
          </Field>

          {showServerOrClientError("diet_failure_reasons") ? (
            <p className="text-sm text-destructive">
              {showServerOrClientError("diet_failure_reasons")}
            </p>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Final Step: Credentials */}
      {step === totalSteps && (
        <SectionCard title="Login Details" headingRef={stepHeadingRef}>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p>
              After you create your account, you will be{" "}
              <strong>redirected to set up your Authenticator (QR code)</strong>.
              This is required to keep your account secure.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="email"
              label="Email"
              required
              error={showServerOrClientError("email")}
            >
              <input
                id="email"
                type="email"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                value={data.email}
                maxLength={120}
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                onChange={(e) => setData("email", e.target.value.trim())}
              />
            </Field>

            <Field
              id="password"
              label="Password"
              required
              error={showServerOrClientError("password")}
              hint="Use 8+ characters. Adding numbers & symbols helps."
            >
              <input
                id="password"
                type="password"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                value={data.password}
                maxLength={72}
                autoComplete="new-password"
                onChange={(e) => setData("password", e.target.value)}
                placeholder="At least 8 characters"
              />
            </Field>

            <Field
              id="password_confirmation"
              label="Confirm Password"
              required
              error={showServerOrClientError("password_confirmation")}
            >
              <input
                id="password_confirmation"
                type="password"
                className={`w-full rounded-md border bg-transparent px-3 py-2 ${FOCUS_RING}`}
                value={data.password_confirmation}
                maxLength={72}
                autoComplete="new-password"
                onChange={(e) =>
                  setData("password_confirmation", e.target.value)
                }
              />
            </Field>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button variant="primary" onClick={submit} disabled={processing}>
              Create Account
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ---------- Page wrapper ---------- */
export default function Register(props: Props) {
  return (
    <>
      <Head title="Create your account" />

      {/* Skip link */}
      <a
        href="#register-main"
        className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 rounded-md bg-card px-3 py-2 text-sm font-semibold shadow ${FOCUS_RING}`}
      >
        Skip to form
      </a>

      <main
        id="register-main"
        className="min-h-[100svh] bg-background grid place-items-center"
      >
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
