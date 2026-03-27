import { useState } from "react";
import { Link } from "react-router";
import {
  Heart,
  Brain,
  Dumbbell,
  Utensils,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
  Sparkles,
  Activity,
  Target,
  Calendar,
  Weight,
  Ruler,
  Flame,
  Award,
  BookOpen,
  Users,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "client" | "trainer" | "nutritionist";

interface FormState {
  role: Role | null;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  goals: string[];
  activityLevel: string;
  workoutFrequency: number;
  dietType: string;
  allergies: string[];
  foodDislikes: string;
  medicalConditions: string[];
  medications: string;
  injuries: string[];
  safetyAcknowledged: boolean;
  specialty: string;
  yearsExperience: string;
  certifications: string;
  bio: string;
  termsAccepted: boolean;
}

const INITIAL: FormState = {
  role: null,
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  sex: "",
  heightCm: "",
  weightKg: "",
  goals: [],
  activityLevel: "",
  workoutFrequency: 3,
  dietType: "",
  allergies: [],
  foodDislikes: "",
  medicalConditions: [],
  medications: "",
  injuries: [],
  safetyAcknowledged: false,
  specialty: "",
  yearsExperience: "",
  certifications: "",
  bio: "",
  termsAccepted: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too short", color: "bg-[#ef4444]" },
    { label: "Weak", color: "bg-[#f97316]" },
    { label: "Fair", color: "bg-[#f59e0b]" },
    { label: "Good", color: "bg-[#22c55e]" },
    { label: "Strong", color: "bg-[#22c55e]" },
    { label: "Very strong", color: "bg-[#8b5cf6]" },
  ];
  return { score, ...levels[Math.min(score, 5)] };
}

// ─── Shared field components ──────────────────────────────────────────────────

function Field({ label, error, children, hint }: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#d6d3d1]">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-[#78716c]">{hint}</p>}
      {error && (
        <p className="text-xs text-[#ef4444] flex items-center gap-1">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] ${
    err ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"
  }`;

function MultiSelect({ options, selected, onToggle, danger }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; danger?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active
                ? danger
                  ? "bg-[#7f1d1d]/40 border-[#ef4444]/60 text-[#fca5a5]"
                  : "bg-[#4c1d95]/40 border-[#7c3aed]/60 text-[#c4b5fd]"
                : "bg-[#292524] border-[#44403c] text-[#78716c] hover:border-[#57534e]"
            }`}
          >
            {active && danger ? "⚠️ " : active ? "✓ " : ""}{opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step: Role Selection ─────────────────────────────────────────────────────

function StepRole({ form, update }: { form: FormState; update: (k: keyof FormState, v: any) => void }) {
  const roles = [
    {
      id: "client" as Role,
      icon: Heart,
      title: "I'm here for my health",
      subtitle: "Client",
      description: "Get a personalized AI nutrition and workout plan, track your progress, and receive adaptive coaching.",
      features: ["AI meal & workout plans", "Progress tracking", "AI coaching & insights"],
      gradient: "from-[#7c3aed] to-[#4c1d95]",
      border: "border-[#7c3aed]/40",
      selected: "ring-2 ring-[#7c3aed] border-[#7c3aed]",
    },
    {
      id: "trainer" as Role,
      icon: Dumbbell,
      title: "I'm a personal trainer",
      subtitle: "Professional",
      description: "Manage clients, create custom workout programs, track their progress, and communicate securely.",
      features: ["Client management dashboard", "Workout program builder", "Appointments & messaging"],
      gradient: "from-[#3b82f6] to-[#1d4ed8]",
      border: "border-[#3b82f6]/40",
      selected: "ring-2 ring-[#3b82f6] border-[#3b82f6]",
    },
    {
      id: "nutritionist" as Role,
      icon: Utensils,
      title: "I'm a registered nutritionist",
      subtitle: "Professional",
      description: "Build personalized nutrition plans, monitor clients' dietary adherence, and manage consultations.",
      features: ["Nutrition plan builder", "Meal tracking oversight", "Client portal access"],
      gradient: "from-[#22c55e] to-[#15803d]",
      border: "border-[#22c55e]/40",
      selected: "ring-2 ring-[#22c55e] border-[#22c55e]",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">How will you use Hayetak?</h2>
        <p className="text-sm text-[#78716c] mt-1">
          Your experience and profile will be tailored to your role.
        </p>
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const isSelected = form.role === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => update("role", role.id)}
              className={`w-full text-left bg-[#1c1917] border rounded-2xl p-4 transition-all hover:border-[#57534e] ${
                isSelected ? role.selected : "border-[#292524]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`size-10 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center flex-shrink-0`}>
                  <role.icon className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-[#fafaf9]">{role.title}</p>
                    <span className="text-[10px] px-2 py-0.5 bg-[#292524] text-[#78716c] rounded-full">
                      {role.subtitle}
                    </span>
                  </div>
                  <p className="text-xs text-[#78716c] leading-relaxed mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {role.features.map((f) => (
                      <div key={f} className="flex items-center gap-1">
                        <Check className="size-3 text-[#44403c]" />
                        <span className="text-[10px] text-[#57534e]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    isSelected ? "border-[#8b5cf6] bg-[#8b5cf6]" : "border-[#44403c]"
                  }`}
                >
                  {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step: Account Info ───────────────────────────────────────────────────────

function StepAccount({ form, update, errors }: {
  form: FormState; update: (k: keyof FormState, v: any) => void; errors: Record<string, string>;
}) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const strength = getPasswordStrength(form.password);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">Create your account</h2>
        <p className="text-sm text-[#78716c] mt-1">You'll use these details to sign in.</p>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" error={errors.firstName}>
          <input
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="Sara"
            className={inputCls(errors.firstName)}
          />
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <input
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Ahmed"
            className={inputCls(errors.lastName)}
          />
        </Field>
      </div>

      {/* Email */}
      <Field label="Email address" error={errors.email}>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            className={`${inputCls(errors.email)} pl-10`}
          />
        </div>
      </Field>

      {/* Password */}
      <Field label="Password" error={errors.password}>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Create a strong password"
            className={`${inputCls(errors.password)} pl-10 pr-10`}
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#a8a29e]">
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.password && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[0,1,2,3,4].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    i < strength.score ? strength.color : "bg-[#44403c]"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${
              strength.score <= 1 ? "text-[#ef4444]" : strength.score <= 2 ? "text-[#f59e0b]" : strength.score <= 3 ? "text-[#22c55e]" : "text-[#8b5cf6]"
            }`}>
              {strength.label}
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {[
                { label: "8+ chars", ok: form.password.length >= 8 },
                { label: "Uppercase", ok: /[A-Z]/.test(form.password) },
                { label: "Number", ok: /[0-9]/.test(form.password) },
                { label: "Symbol", ok: /[^A-Za-z0-9]/.test(form.password) },
              ].map((req) => (
                <div key={req.label} className={`flex items-center gap-1 text-[10px] ${req.ok ? "text-[#22c55e]" : "text-[#44403c]"}`}>
                  <Check className={`size-3 ${req.ok ? "text-[#22c55e]" : "text-[#44403c]"}`} />
                  {req.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </Field>

      {/* Confirm */}
      <Field label="Confirm password" error={errors.confirmPassword}>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
          <input
            type={showConfirm ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            placeholder="Repeat your password"
            className={`${inputCls(errors.confirmPassword)} pl-10 pr-10`}
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#a8a29e]">
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
          <p className="text-xs text-[#22c55e] flex items-center gap-1 mt-1">
            <Check className="size-3" /> Passwords match
          </p>
        )}
      </Field>
    </div>
  );
}

// ─── Step: Client Health Basics ───────────────────────────────────────────────

function StepHealthBasics({ form, update, errors }: {
  form: FormState; update: (k: keyof FormState, v: any) => void; errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">Your health baseline</h2>
        <p className="text-sm text-[#78716c] mt-1">
          This helps us calculate accurate nutrition targets and safe recommendations.
        </p>
      </div>

      <div className="flex items-start gap-2 px-3 py-3 bg-[#4c1d95]/15 border border-[#7c3aed]/20 rounded-xl">
        <Info className="size-4 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#a78bfa] leading-relaxed">
          Your data is encrypted and only used to personalize your plan. It's never shared or sold.
        </p>
      </div>

      {/* DOB + Sex row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth" error={errors.dateOfBirth}>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
              className={`${inputCls(errors.dateOfBirth)} pl-10`}
              style={{ colorScheme: "dark" }}
            />
          </div>
        </Field>
        <Field label="Biological sex" error={errors.sex} hint="Used for metabolic calculations">
          <select
            value={form.sex}
            onChange={(e) => update("sex", e.target.value)}
            className={`${inputCls(errors.sex)} appearance-none`}
          >
            <option value="" disabled>Select sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Prefer not to say</option>
          </select>
        </Field>
      </div>

      {/* Height */}
      <Field label="Height (cm)" error={errors.heightCm}>
        <div className="relative">
          <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
          <input
            type="number"
            value={form.heightCm}
            onChange={(e) => update("heightCm", e.target.value)}
            placeholder="e.g. 170"
            min="100"
            max="250"
            className={`${inputCls(errors.heightCm)} pl-10`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#78716c]">cm</span>
        </div>
      </Field>

      {/* Weight */}
      <Field label="Current weight (kg)" error={errors.weightKg}>
        <div className="relative">
          <Weight className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
          <input
            type="number"
            value={form.weightKg}
            onChange={(e) => update("weightKg", e.target.value)}
            placeholder="e.g. 70"
            min="30"
            max="300"
            className={`${inputCls(errors.weightKg)} pl-10`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#78716c]">kg</span>
        </div>
      </Field>
    </div>
  );
}

// ─── Step: Client Goals ────────────────────────────────────────────────────────

function StepGoals({ form, update }: { form: FormState; update: (k: keyof FormState, v: any) => void }) {
  const goals = [
    "Lose weight", "Gain muscle", "Build endurance",
    "Improve nutrition", "Manage a condition", "Maintain weight",
    "Improve flexibility", "Reduce stress",
  ];
  const levels = [
    { id: "sedentary", label: "Sedentary", desc: "Little to no exercise", icon: "🛋️" },
    { id: "light", label: "Light", desc: "1–2 days/week", icon: "🚶" },
    { id: "moderate", label: "Moderate", desc: "3–4 days/week", icon: "🏃" },
    { id: "active", label: "Active", desc: "5–6 days/week", icon: "⚡" },
    { id: "very_active", label: "Very Active", desc: "Daily intense", icon: "🔥" },
  ];

  const toggleGoal = (g: string) => {
    const curr = form.goals;
    update("goals", curr.includes(g) ? curr.filter((x) => x !== g) : [...curr, g]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">Your goals & activity</h2>
        <p className="text-sm text-[#78716c] mt-1">
          Select all that apply. Your AI plan will prioritize accordingly.
        </p>
      </div>

      {/* Goals */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#d6d3d1]">Primary goals</p>
        <MultiSelect options={goals} selected={form.goals} onToggle={toggleGoal} />
        {form.goals.length === 0 && (
          <p className="text-xs text-[#44403c]">Select at least one goal</p>
        )}
      </div>

      {/* Activity level */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#d6d3d1]">Current activity level</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {levels.map((lv) => (
            <button
              key={lv.id}
              type="button"
              onClick={() => update("activityLevel", lv.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                form.activityLevel === lv.id
                  ? "bg-[#4c1d95]/30 border-[#7c3aed]/60 text-[#c4b5fd]"
                  : "bg-[#292524] border-[#44403c] text-[#78716c] hover:border-[#57534e]"
              }`}
            >
              <span className="text-xl">{lv.icon}</span>
              <span className="text-[10px] font-semibold">{lv.label}</span>
              <span className="text-[9px] opacity-70 leading-tight">{lv.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workout frequency */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#d6d3d1]">Target workout days per week</p>
          <span className="text-sm font-bold text-[#8b5cf6]">{form.workoutFrequency}×</span>
        </div>
        <input
          type="range"
          min="1"
          max="7"
          value={form.workoutFrequency}
          onChange={(e) => update("workoutFrequency", Number(e.target.value))}
          className="w-full accent-[#7c3aed]"
        />
        <div className="flex justify-between text-[10px] text-[#44403c]">
          {["1", "2", "3", "4", "5", "6", "7"].map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>
    </div>
  );
}

// ─── Step: Client Diet ────────────────────────────────────────────────────────

function StepDiet({ form, update }: { form: FormState; update: (k: keyof FormState, v: any) => void }) {
  const dietTypes = [
    "Omnivore", "Vegetarian", "Vegan", "Pescatarian",
    "Keto", "Paleo", "Mediterranean", "Gluten-free",
    "Halal", "Kosher", "Other",
  ];
  const allergyOpts = [
    "Peanuts", "Tree nuts", "Dairy", "Eggs", "Gluten",
    "Shellfish", "Fish", "Soy", "Sesame", "Mustard",
  ];

  const toggleAllergy = (a: string) => {
    const curr = form.allergies;
    update("allergies", curr.includes(a) ? curr.filter((x) => x !== a) : [...curr, a]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">Diet & restrictions</h2>
        <p className="text-sm text-[#78716c] mt-1">
          This keeps every suggestion safe and aligned with your lifestyle.
        </p>
      </div>

      {/* Diet type */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#d6d3d1]">Dietary preference</p>
        <div className="flex flex-wrap gap-2">
          {dietTypes.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => update("dietType", form.dietType === d ? "" : d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                form.dietType === d
                  ? "bg-[#4c1d95]/40 border-[#7c3aed]/60 text-[#c4b5fd]"
                  : "bg-[#292524] border-[#44403c] text-[#78716c] hover:border-[#57534e]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies — critical */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#d6d3d1]">Food allergies & intolerances</p>
          <span className="text-[10px] px-1.5 py-0.5 bg-[#7f1d1d]/30 border border-[#ef4444]/30 text-[#fca5a5] rounded-full">
            Safety critical
          </span>
        </div>
        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#7f1d1d]/10 border border-[#ef4444]/20 rounded-xl mb-2">
          <AlertCircle className="size-3.5 text-[#f87171] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#fca5a5] leading-relaxed">
            Every food and meal suggestion will be cross-checked against your selected allergies. Please be accurate.
          </p>
        </div>
        <MultiSelect options={allergyOpts} selected={form.allergies} onToggle={toggleAllergy} danger />
        {form.allergies.length === 0 && (
          <p className="text-xs text-[#44403c] flex items-center gap-1">
            <Info className="size-3" /> Select all that apply, or leave empty if none
          </p>
        )}
      </div>

      {/* Dislikes */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#d6d3d1]">Foods you dislike</p>
        <textarea
          value={form.foodDislikes}
          onChange={(e) => update("foodDislikes", e.target.value)}
          placeholder="e.g. olives, liver, Brussels sprouts..."
          rows={2}
          className="w-full px-3 py-2.5 bg-[#292524] border border-[#44403c] rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm resize-none outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] hover:border-[#57534e] transition-all"
        />
        <p className="text-xs text-[#78716c]">The AI will avoid these when generating meal plans</p>
      </div>
    </div>
  );
}

// ─── Step: Client Medical ─────────────────────────────────────────────────────

function StepMedical({ form, update }: { form: FormState; update: (k: keyof FormState, v: any) => void }) {
  const conditions = [
    "Type 1 Diabetes", "Type 2 Diabetes", "Hypertension", "Heart disease",
    "Hypothyroidism", "Hyperthyroidism", "PCOS", "Celiac disease",
    "IBS / IBD", "Kidney disease", "Osteoporosis", "None of the above",
  ];
  const injuryOpts = [
    "Lower back", "Knee (left)", "Knee (right)", "Shoulder (left)",
    "Shoulder (right)", "Hip", "Ankle", "Neck", "Wrist", "None",
  ];

  const toggleCond = (c: string) => {
    let curr = form.medicalConditions;
    if (c === "None of the above") {
      update("medicalConditions", curr.includes(c) ? [] : [c]);
      return;
    }
    curr = curr.filter((x) => x !== "None of the above");
    update("medicalConditions", curr.includes(c) ? curr.filter((x) => x !== c) : [...curr, c]);
  };

  const toggleInjury = (i: string) => {
    let curr = form.injuries;
    if (i === "None") {
      update("injuries", curr.includes(i) ? [] : [i]);
      return;
    }
    curr = curr.filter((x) => x !== "None");
    update("injuries", curr.includes(i) ? curr.filter((x) => x !== i) : [...curr, i]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">Health & safety profile</h2>
        <p className="text-sm text-[#78716c] mt-1">
          This information helps keep your AI recommendations safe and medically appropriate.
        </p>
      </div>

      {/* Medical disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-[#1c1917] border border-[#292524] rounded-xl">
        <Shield className="size-4 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[#d6d3d1] mb-0.5">Your data, your control</p>
          <p className="text-xs text-[#78716c] leading-relaxed">
            This information is encrypted and only used to make your AI coaching safer. Hayetak is not a medical service. Always consult your doctor for medical decisions.
          </p>
        </div>
      </div>

      {/* Medical conditions */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#d6d3d1]">Medical conditions</p>
        <p className="text-xs text-[#78716c]">The AI will adapt recommendations and flag anything that may be contraindicated.</p>
        <MultiSelect options={conditions} selected={form.medicalConditions} onToggle={toggleCond} />
      </div>

      {/* Medications */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#d6d3d1]">
          Current medications{" "}
          <span className="text-xs font-normal text-[#78716c]">(optional)</span>
        </label>
        <textarea
          value={form.medications}
          onChange={(e) => update("medications", e.target.value)}
          placeholder="e.g. Metformin 500mg, Lisinopril 10mg..."
          rows={2}
          className="w-full px-3 py-2.5 bg-[#292524] border border-[#44403c] rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm resize-none outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] hover:border-[#57534e] transition-all"
        />
        <p className="text-xs text-[#78716c]">Some medications affect nutrition needs. This helps the AI be more accurate.</p>
      </div>

      {/* Injuries */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#d6d3d1]">Injury history</p>
          <span className="text-[10px] px-1.5 py-0.5 bg-[#92400e]/20 border border-[#f59e0b]/20 text-[#fbbf24] rounded-full">
            Workout safety
          </span>
        </div>
        <p className="text-xs text-[#78716c]">The AI will avoid exercises that stress injured areas and suggest safe alternatives.</p>
        <MultiSelect options={injuryOpts} selected={form.injuries} onToggle={toggleInjury} />
      </div>

      {/* Safety acknowledgment */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div
          onClick={() => update("safetyAcknowledged", !form.safetyAcknowledged)}
          className={`size-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            form.safetyAcknowledged ? "bg-[#7c3aed] border-[#7c3aed]" : "border-[#44403c] bg-[#292524]"
          }`}
        >
          {form.safetyAcknowledged && <Check className="size-2.5 text-white" strokeWidth={3} />}
        </div>
        <p className="text-xs text-[#78716c] leading-relaxed">
          I understand that Hayetak provides AI-generated health guidance and is not a substitute for professional medical advice. I will consult a qualified healthcare professional for medical decisions.
        </p>
      </label>
    </div>
  );
}

// ─── Step: Professional Info ──────────────────────────────────────────────────

function StepProfessional({ form, update, errors }: {
  form: FormState; update: (k: keyof FormState, v: any) => void; errors: Record<string, string>;
}) {
  const specialties = form.role === "trainer"
    ? ["Personal Training", "Strength & Conditioning", "HIIT", "CrossFit", "Yoga & Pilates", "Sports Performance", "Weight Loss", "Bodybuilding", "Rehabilitation", "Online Coaching"]
    : ["Clinical Nutrition", "Sports Nutrition", "Weight Management", "Pediatric Nutrition", "Eating Disorders", "Gut Health", "Vegan/Plant-based", "Diabetic Nutrition", "General Wellness"];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">
          Your professional profile
        </h2>
        <p className="text-sm text-[#78716c] mt-1">
          Tell us about your expertise. This builds trust with potential clients.
        </p>
      </div>

      {/* Verification notice */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-[#4c1d95]/15 border border-[#7c3aed]/20 rounded-xl">
        <Shield className="size-4 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[#c4b5fd] mb-0.5">Professional verification</p>
          <p className="text-xs text-[#78716c] leading-relaxed">
            Your credentials will be reviewed by our team within 24–48 hours. You can access client features after verification.
          </p>
        </div>
      </div>

      {/* Specialty */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#d6d3d1]">Primary specialty</p>
        <div className="flex flex-wrap gap-2">
          {specialties.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update("specialty", form.specialty === s ? "" : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                form.specialty === s
                  ? "bg-[#4c1d95]/40 border-[#7c3aed]/60 text-[#c4b5fd]"
                  : "bg-[#292524] border-[#44403c] text-[#78716c] hover:border-[#57534e]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Experience */}
      <Field label="Years of experience" error={errors.yearsExperience}>
        <select
          value={form.yearsExperience}
          onChange={(e) => update("yearsExperience", e.target.value)}
          className={`${inputCls(errors.yearsExperience)} appearance-none`}
        >
          <option value="" disabled>Select range</option>
          {["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "10+ years"].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </Field>

      {/* Certifications */}
      <Field label="Certifications & credentials" error={errors.certifications} hint="e.g. NASM CPT, ACE, RD, BSc Nutrition...">
        <textarea
          value={form.certifications}
          onChange={(e) => update("certifications", e.target.value)}
          placeholder="List your certifications, degrees, or professional memberships..."
          rows={2}
          className="w-full px-3 py-2.5 bg-[#292524] border border-[#44403c] rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm resize-none outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] hover:border-[#57534e] transition-all"
        />
      </Field>

      {/* Bio */}
      <Field label="Professional bio" error={errors.bio} hint="This appears on your public profile">
        <textarea
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          placeholder="Tell clients about your approach, philosophy, and what makes you unique..."
          rows={3}
          className="w-full px-3 py-2.5 bg-[#292524] border border-[#44403c] rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm resize-none outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] hover:border-[#57534e] transition-all"
        />
        <p className="text-xs text-right text-[#44403c] mt-1">{form.bio.length} / 500</p>
      </Field>
    </div>
  );
}

// ─── Step: Completion ─────────────────────────────────────────────────────────

function StepComplete({ form, update, isLoading }: {
  form: FormState; update: (k: keyof FormState, v: any) => void; isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative size-20">
          <div className="size-20 rounded-full border-4 border-[#292524]" />
          <div className="absolute inset-0 size-20 rounded-full border-4 border-t-[#7c3aed] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="size-8 text-[#8b5cf6]" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-[#fafaf9]">
            {form.role === "client" ? "Generating your AI health plan…" : "Setting up your professional account…"}
          </p>
          <p className="text-sm text-[#78716c]">
            {form.role === "client"
              ? "We're analyzing your profile, goals, and restrictions to build your personalized plan."
              : "We're preparing your professional dashboard and verification queue."}
          </p>
        </div>
        <div className="w-48 space-y-2">
          {(form.role === "client"
            ? ["Analyzing health profile", "Calculating calorie targets", "Building meal plan", "Designing workout program"]
            : ["Creating professional profile", "Setting up client portal", "Configuring dashboard"]
          ).map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`size-3 rounded-full ${i < 2 ? "bg-[#22c55e]" : i === 2 ? "bg-[#7c3aed] animate-pulse" : "bg-[#292524]"}`} />
              <p className="text-xs text-[#78716c]">{step}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#fafaf9]">Almost there!</h2>
        <p className="text-sm text-[#78716c] mt-1">Review and agree to complete your registration.</p>
      </div>

      {/* Profile summary */}
      <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider">Profile summary</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Name", value: `${form.firstName} ${form.lastName}` },
            { label: "Role", value: form.role === "client" ? "Health Client" : form.role === "trainer" ? "Personal Trainer" : "Nutritionist" },
            ...(form.role === "client" ? [
              { label: "Goals", value: form.goals.slice(0, 2).join(", ") || "—" },
              { label: "Diet", value: form.dietType || "Omnivore" },
              { label: "Allergies", value: form.allergies.length ? form.allergies.join(", ") : "None" },
            ] : [
              { label: "Specialty", value: form.specialty || "—" },
              { label: "Experience", value: form.yearsExperience || "—" },
            ]),
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-[#78716c]">{item.label}</p>
              <p className="text-sm text-[#fafaf9] font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div
          onClick={() => update("termsAccepted", !form.termsAccepted)}
          className={`size-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            form.termsAccepted ? "bg-[#7c3aed] border-[#7c3aed]" : "border-[#44403c] bg-[#292524]"
          }`}
        >
          {form.termsAccepted && <Check className="size-2.5 text-white" strokeWidth={3} />}
        </div>
        <p className="text-xs text-[#78716c] leading-relaxed">
          I agree to Hayetak's{" "}
          <a href="#" className="text-[#8b5cf6] hover:underline">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="text-[#8b5cf6] hover:underline">Privacy Policy</a>
          . I understand my health data is encrypted and never shared without my consent.
        </p>
      </label>
    </div>
  );
}

// ─── Main Register Page ───────────────────────────────────────────────────────

const CLIENT_STEPS = ["Role", "Account", "Health", "Goals", "Diet", "Safety", "Complete"];
const PRO_STEPS = ["Role", "Account", "Professional", "Complete"];

export function RegisterPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isPro = form.role === "trainer" || form.role === "nutritionist";
  const steps = form.role === null ? CLIENT_STEPS : isPro ? PRO_STEPS : CLIENT_STEPS;
  const totalSteps = steps.length;

  const update = (key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validateStep = (step: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (step === 0 && !form.role) e.role = "Please select a role";
    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = "Required";
      if (!form.lastName.trim()) e.lastName = "Required";
      if (!form.email.trim()) e.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
      if (!form.password) e.password = "Required";
      else if (form.password.length < 8) e.password = "Minimum 8 characters";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    }
    if (!isPro && step === 2) {
      if (!form.dateOfBirth) e.dateOfBirth = "Required";
      if (!form.sex) e.sex = "Required";
      if (!form.heightCm) e.heightCm = "Required";
      if (!form.weightKg) e.weightKg = "Required";
    }
    if (isPro && step === 2) {
      if (!form.yearsExperience) e.yearsExperience = "Required";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(currentStep);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!form.termsAccepted) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 3000);
  };

  const lastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep) / (totalSteps - 1)) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="size-20 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center mx-auto shadow-2xl shadow-purple-900/50">
            <Check className="size-10 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#fafaf9]">You're all set!</h2>
            <p className="text-[#a8a29e] leading-relaxed">
              {isPro
                ? "Your professional account is under review. We'll email you within 24–48 hours."
                : "Your account and AI health plan are ready. Welcome to Hayetak."}
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-sm transition-all"
          >
            Go to sign in <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    if (!isPro) {
      switch (currentStep) {
        case 0: return <StepRole form={form} update={update} />;
        case 1: return <StepAccount form={form} update={update} errors={errors} />;
        case 2: return <StepHealthBasics form={form} update={update} errors={errors} />;
        case 3: return <StepGoals form={form} update={update} />;
        case 4: return <StepDiet form={form} update={update} />;
        case 5: return <StepMedical form={form} update={update} />;
        case 6: return <StepComplete form={form} update={update} isLoading={isLoading} />;
        default: return null;
      }
    } else {
      switch (currentStep) {
        case 0: return <StepRole form={form} update={update} />;
        case 1: return <StepAccount form={form} update={update} errors={errors} />;
        case 2: return <StepProfessional form={form} update={update} errors={errors} />;
        case 3: return <StepComplete form={form} update={update} isLoading={isLoading} />;
        default: return null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1c1917]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <Heart className="size-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[#fafaf9] font-semibold tracking-tight">Hayetak</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-sm text-[#78716c] hidden sm:block">Already have an account?</p>
          <Link
            to="/login"
            className="text-sm text-[#8b5cf6] hover:text-[#a78bfa] font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      {form.role !== null && (
        <div className="w-full h-0.5 bg-[#1c1917]">
          <div
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start py-8 px-6">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          {form.role !== null && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs text-[#78716c] font-medium">
                Step {currentStep + 1} of {totalSteps}
              </p>
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`transition-all rounded-full ${
                      i < currentStep
                        ? "h-1.5 w-4 bg-[#22c55e]"
                        : i === currentStep
                        ? "h-1.5 w-6 bg-[#7c3aed]"
                        : "h-1.5 w-1.5 bg-[#292524]"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#78716c]">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Step content */}
          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          {/* Navigation */}
          {!isLoading && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1c1917]">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#a8a29e] hover:text-[#fafaf9] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {!lastStep && currentStep > 0 && form.role !== null && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors"
                  >
                    Skip
                  </button>
                )}

                {lastStep ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!form.termsAccepted || isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    {isLoading ? (
                      <><Loader2 className="size-4 animate-spin" /> Creating account…</>
                    ) : (
                      <>{form.role === "client" ? "Create account & generate plan" : "Submit for review"} <ArrowRight className="size-4" /></>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    Continue
                    <ChevronRight className="size-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
