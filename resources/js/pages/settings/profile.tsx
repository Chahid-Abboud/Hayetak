import React, { useMemo, useState } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import NavHeader from "@/components/NavHeader";

/* ---------- Types ---------- */
type UserProfile = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
} | null;

type Prefs = {
  dietary_goal: string | null;
  fitness_goals: string[];
  diet_type: string | null;
  diet_other: string | null;
  allergies: string[];
} | null;

type Measurement = { date: string; type: "weight" | "height"; value: number };

type PageProps = {
  // From middleware
  auth?: {
    user?: {
      id: number;
      email: string;
      name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      username?: string | null;
      gender?: string | null;
      age?: number | null;
      height_cm?: number | null;
      weight_kg?: number | null;
      two_factor_enabled?: boolean;
    } | null;
  };
  flash?: { status?: string; success?: string; error?: string };

  // From controller/route (optional)
  displayName?: string;
  userProfile?: UserProfile;
  prefs?: Prefs;
  dietName?: string;
  weightHistory?: Measurement[];
  heightHistory?: Measurement[];
};

/* ---------- Safe defaults ---------- */
const DEFAULT_PROFILE = {
  first_name: "",
  last_name: "",
  username: "",
  gender: "",
  age: null,
  height_cm: null,
  weight_kg: null,
};

const DEFAULT_PREFS: NonNullable<Prefs> = {
  dietary_goal: "",
  fitness_goals: [],
  diet_type: "",
  diet_other: "",
  allergies: [],
};

const FITNESS_GOAL_OPTIONS = [
  "Lose fat",
  "Build muscle",
  "Increase strength",
  "Improve endurance",
  "General health",
] as const;

const GENDER_OPTIONS = ["male", "female", "other", "prefer not to say"] as const;

const DIET_TYPES = [
  { value: "balanced", label: "Balanced" },
  { value: "high_protein", label: "High Protein" },
  { value: "low_carb", label: "Low Carb" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "keto", label: "Keto" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "other", label: "Other" },
] as const;

/* ---------- Small UI bits ---------- */
const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
    {children}
  </span>
);

const SideLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} className="block rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100">
    {children}
  </a>
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-700">{label}</div>
      <div className="text-gray-900">{children}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-700">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400"
        placeholder={placeholder}
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function LabeledDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-700">{label}</label>
      <input
        type="date"
        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ListCard({ title, data }: { title: string; data: Measurement[] }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-gray-900">
      <div className="font-medium">{title}</div>
      {data?.length ? (
        <ul className="mt-2 space-y-1 text-sm text-gray-800">
          {data
            .slice(-6)
            .reverse()
            .map((m, i) => (
              <li key={i} className="flex justify-between">
                <span>{m.date}</span>
                <span className="tabular-nums">{m.value}</span>
              </li>
            ))}
        </ul>
      ) : (
        <div className="mt-2 text-sm text-gray-700">No entries yet.</div>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
export default function ProfilePage() {
  const page = usePage<PageProps>().props;

  // 1) Pull from route-provided props if present…
  let providedProfile = page.userProfile ?? null;

  // 2) …otherwise fall back to globally shared auth.user
  if (!providedProfile && page.auth?.user) {
    const u = page.auth.user;
    providedProfile = {
      first_name: u.first_name ?? null,
      last_name:  u.last_name ?? null,
      username:   u.username ?? null,
      gender:     u.gender ?? null,
      age:        (typeof u.age === "number" ? u.age : u.age ?? null) as number | null,
      height_cm:  (typeof u.height_cm === "number" ? u.height_cm : u.height_cm ?? null) as number | null,
      weight_kg:  (typeof u.weight_kg === "number" ? u.weight_kg : u.weight_kg ?? null) as number | null,
    };
  }

  // Normalize props (prevents “cannot read property of undefined”)
  const displayName =
    page.displayName ??
    (providedProfile
      ? `${providedProfile.first_name ?? ""} ${providedProfile.last_name ?? ""}`.trim() ||
        page.auth?.user?.username ||
        page.auth?.user?.name ||
        "there"
      : page.auth?.user?.username || page.auth?.user?.name || "there");

  const userProfile = providedProfile ?? DEFAULT_PROFILE;
  const prefs = page.prefs ?? DEFAULT_PREFS;
  const dietName = page.dietName ?? "";
  const weightHistory = Array.isArray(page.weightHistory) ? page.weightHistory : [];
  const heightHistory = Array.isArray(page.heightHistory) ? page.heightHistory : [];

  // Local edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);

  // Bound inputs
  const [firstName, setFirstName] = useState(userProfile.first_name ?? "");
  const [lastName, setLastName] = useState(userProfile.last_name ?? "");
  const [username, setUsername] = useState(userProfile.username ?? "");
  const [gender, setGender] = useState<string>(userProfile.gender ?? "");
  const [age, setAge] = useState<number | string>(userProfile.age ?? "");

  const [dietType, setDietType] = useState<string>(prefs.diet_type ?? "");
  const [dietOther, setDietOther] = useState<string>(prefs.diet_other ?? "");
  const [dietaryGoal, setDietaryGoal] = useState<string>(prefs.dietary_goal ?? "");
  const [fitnessGoals, setFitnessGoals] = useState<string[]>(
    Array.isArray(prefs.fitness_goals) ? prefs.fitness_goals : []
  );
  const [allergies, setAllergies] = useState<string[]>(
    Array.isArray(prefs.allergies) ? prefs.allergies : []
  );
  const [newAllergy, setNewAllergy] = useState("");

  // measurements
  const [mDate, setMDate] = useState<string>("");
  const [mType, setMType] = useState<"weight" | "height">("weight");
  const [mValue, setMValue] = useState<string>("");

  const dietTypeLabel = useMemo(() => {
    const labelFromType =
      DIET_TYPES.find((d) => d.value === (prefs?.diet_type ?? ""))?.label ?? null;
    return labelFromType ?? dietName ?? "—";
  }, [prefs, dietName]);

  /* ---------- Actions ---------- */
  const saveProfile = () => {
    const ageNum = typeof age === "string" && age !== "" ? Number(age) : age;
    router.patch(
      "/settings/profile",
      {
        first_name: firstName || null,
        last_name: lastName || null,
        username: username || null,
        gender: gender || null,
        age: ageNum === "" ? null : Number(ageNum),
      },
      { preserveScroll: true, onSuccess: () => setEditingProfile(false) }
    );
  };

  const savePrefs = () => {
    router.post(
      "/settings/profile/prefs",
      {
        diet_type: dietType || null,
        diet_other: dietType === "other" ? (dietOther || null) : null,
        dietary_goal: dietaryGoal || null,
        fitness_goals: fitnessGoals,
        allergies,
      },
      { preserveScroll: true, onSuccess: () => setEditingPrefs(false) }
    );
  };

  const addAllergy = () => {
    const a = newAllergy.trim();
    if (!a || allergies.includes(a)) return;
    setAllergies((prev) => [...prev, a]);
    setNewAllergy("");
  };

  const removeAllergy = (a: string) => {
    setAllergies((prev) => prev.filter((x) => x !== a));
  };

  const addMeasurement = () => {
    const valueNum = Number(mValue);
    if (!mDate || !valueNum || valueNum <= 0) return;
    router.post(
      "/settings/profile/measurements",
      { date: mDate, type: mType, value: valueNum },
      {
        preserveScroll: true,
        onSuccess: () => {
          setMDate("");
          setMValue("");
          router.reload({ only: ["weightHistory", "heightHistory", "userProfile"] });
        },
      }
    );
  };

  return (
    <>
      <Head title="Profile — Hayetak" />
      <NavHeader />

      {/* 12-column grid so the sidebar is 100% reliable */}
      <main className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ----- Sidebar (3/12 columns) ----- */}
        <aside className="md:col-span-3 rounded-2xl border bg-white p-3 h-max sticky top-20 text-gray-900">
          <div className="mb-2 px-2 text-xs uppercase tracking-wide text-gray-500">
            Profile
          </div>
          <nav className="space-y-1">
            <SideLink href="#info">User Info</SideLink>
            <SideLink href="#prefs">Preferences</SideLink>
            <SideLink href="#graphs">Graphs</SideLink>
            <SideLink href="#logs">Height / Weight Log</SideLink>
          </nav>
        </aside>

        {/* ----- Content (9/12 columns) ----- */}
        <div className="md:col-span-9 space-y-6">
          {/* Welcome / actions */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm text-gray-900">
            <h2 className="text-xl font-semibold">
              Welcome {displayName || "there"}, this is your profile
            </h2>
            <p className="text-sm text-gray-700">
              Review and update your info, preferences, and measurements.
            </p>
          </section>

          {/* Profile snapshot + edit */}
          <section id="info" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm text-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your profile snapshot</h3>
              <button
                type="button"
                onClick={() => setEditingProfile((v) => !v)}
                className="text-sm"
                style={{ color: "var(--primary)" }}
              >
                {editingProfile ? "Cancel" : "Edit"}
              </button>
            </div>

            {!editingProfile ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  {(userProfile.first_name ?? "")} {(userProfile.last_name ?? "")}
                </Field>
                <Field label="Username">{userProfile.username || "—"}</Field>
                <Field label="Gender">{userProfile.gender || "—"}</Field>
                <Field label="Age">
                  {typeof userProfile.age === "number" ? userProfile.age : "—"}
                </Field>
                <Field label="Height">
                  {typeof userProfile.height_cm === "number" ? `${userProfile.height_cm} cm` : "—"}
                </Field>
                <Field label="Weight">
                  {typeof userProfile.weight_kg === "number" ? `${userProfile.weight_kg} kg` : "—"}
                </Field>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <LabeledInput label="First name" value={firstName} onChange={setFirstName} />
                <LabeledInput label="Last name" value={lastName} onChange={setLastName} />
                <LabeledInput label="Username" value={username} onChange={setUsername} />
                <div>
                  <label className="text-xs text-gray-700" htmlFor="gender">
                    Gender
                  </label>
                  <select
                    id="gender"
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-700" htmlFor="age">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    min={0}
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={saveProfile}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    Save profile
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Goals & prefs */}
          <section id="prefs" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm text-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your goals and preferences</h3>
              <button
                type="button"
                onClick={() => setEditingPrefs((v) => !v)}
                className="text-sm"
                style={{ color: "var(--primary)" }}
              >
                {editingPrefs ? "Cancel" : "Edit"}
              </button>
            </div>

            {!editingPrefs ? (
              prefs ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Dietary goal">{prefs.dietary_goal || "—"}</Field>
                  <Field label="Diet type">{useMemo(() => {
                    const labelFromType =
                      DIET_TYPES.find((d) => d.value === (prefs?.diet_type ?? ""))?.label ?? null;
                    return labelFromType ?? (page.dietName ?? "") ?? "—";
                  // eslint-disable-next-line react-hooks/exhaustive-deps
                  }, [prefs, page.dietName])}</Field>
                  <div>
                    <div className="text-xs text-gray-700">Fitness goals</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {prefs.fitness_goals?.length
                        ? prefs.fitness_goals.map((fg, i) => <Badge key={i}>{fg}</Badge>)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-700">Allergies</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {prefs.allergies?.length
                        ? prefs.allergies.map((al, i) => <Badge key={i}>{al}</Badge>)
                        : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-700">No preferences saved yet.</p>
              )
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <LabeledInput label="Dietary goal" value={dietaryGoal} onChange={setDietaryGoal} />
                <div>
                  <label className="text-xs text-gray-700" htmlFor="dietType">
                    Diet type
                  </label>
                  <select
                    id="dietType"
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value)}
                  >
                    <option value="">—</option>
                    {DIET_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {dietType === "other" && (
                  <LabeledInput
                    className="sm:col-span-2"
                    label="Diet type (other)"
                    value={dietOther}
                    onChange={setDietOther}
                  />
                )}

                <div className="sm:col-span-2">
                  <div className="text-xs text-gray-700">Fitness goals</div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FITNESS_GOAL_OPTIONS.map((g) => {
                      const checked = fitnessGoals.includes(g);
                      return (
                        <label
                          key={g}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            checked ? "bg-gray-100" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setFitnessGoals((prev) =>
                                e.target.checked ? [...prev, g] : prev.filter((x) => x !== g)
                              )
                            }
                          />
                          <span className="text-gray-800">{g}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-xs text-gray-700">Allergies</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {allergies.length ? (
                      allergies.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700"
                        >
                          {a}
                          <button
                            type="button"
                            className="ml-2 text-red-600 hover:underline"
                            onClick={() => removeAllergy(a)}
                            aria-label={`Remove ${a}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-700">—</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                      placeholder="Add an allergy (e.g., peanuts)"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAllergy();
                        }
                      }}
                    />
                    <button type="button" onClick={addAllergy} className="rounded border px-3 py-2 text-sm">
                      Add
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={savePrefs}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    Save preferences
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Graphs placeholder */}
          <section id="graphs" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm text-gray-900">
            <h3 className="text-lg font-semibold">Graphs</h3>
            <p className="text-sm text-gray-700">Weight & height trend charts coming soon.</p>
          </section>

          {/* Measurements (height / weight by date) */}
          <section id="logs" className="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm text-gray-900">
            <h3 className="text-lg font-semibold">Measurements</h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-[10rem,10rem,1fr,auto]">
              <LabeledDate label="Date" value={mDate} onChange={setMDate} />
              <div>
                <label className="text-xs text-gray-700" htmlFor="mtype">Type</label>
                <select
                  id="mtype"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                  value={mType}
                  onChange={(e) => setMType(e.target.value as "weight" | "height")}
                >
                  <option value="weight">Weight (kg)</option>
                  <option value="height">Height (cm)</option>
                </select>
              </div>
              <LabeledInput
                label="Value"
                type="number"
                inputMode="decimal"
                placeholder={mType === "weight" ? "e.g., 72" : "e.g., 175"}
                value={mValue}
                onChange={setMValue}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addMeasurement}
                  className="w-full rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ListCard title="Recent Weight (kg)" data={weightHistory} />
              <ListCard title="Recent Height (cm)" data={heightHistory} />
            </div>
          </section>

          <footer className="px-1 py-2 text-xs text-gray-600">
            Data is read from your database via Laravel. React escapes output by default.
          </footer>
        </div>
      </main>
    </>
  );
}
