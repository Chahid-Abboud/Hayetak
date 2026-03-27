import { useState } from "react";
import { Link } from "react-router";
import {
  Dumbbell, Play, Check, ChevronRight, AlertCircle, Shield,
  Sparkles, BarChart3, Plus, RefreshCw, Info, Target, Zap,
  Calendar, Clock, Star, ChevronDown, ArrowRight, Filter,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROGRAM = {
  name: "Hayetak Strength Plan",
  week: 2,
  totalWeeks: 8,
  goal: "Build lean muscle",
  split: "Push / Pull / Legs",
  frequency: "4× per week",
};

const WEEK_SCHEDULE = [
  { day: "Mon", label: "Chest & Triceps", type: "push", status: "done", exercises: 6, duration: 55 },
  { day: "Tue", label: "Back & Biceps", type: "pull", status: "done", exercises: 6, duration: 60 },
  { day: "Wed", label: "Rest", type: "rest", status: "rest", exercises: 0, duration: 0 },
  { day: "Thu", label: "Shoulders & Arms", type: "push", status: "today", exercises: 5, duration: 50 },
  { day: "Fri", label: "Legs", type: "legs", status: "upcoming", exercises: 7, duration: 65 },
  { day: "Sat", label: "Rest", type: "rest", status: "rest", exercises: 0, duration: 0 },
  { day: "Sun", label: "Cardio (Optional)", type: "cardio", status: "upcoming", exercises: 0, duration: 30 },
];

type ExerciseStatus = "upcoming" | "injury-modified" | "skipped";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  muscleGroup: string;
  injuryFlag?: string;
  substitution?: string;
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

const TODAYS_EXERCISES: Exercise[] = [
  { id: "e1", name: "Overhead Press (Barbell)", sets: 4, reps: "8–10", rest: 120, muscleGroup: "Shoulders", equipment: "Barbell", difficulty: "intermediate" },
  { id: "e2", name: "Lateral Raises", sets: 3, reps: "12–15", rest: 60, muscleGroup: "Shoulders", equipment: "Dumbbells", difficulty: "beginner" },
  { id: "e3", name: "Front Raises", sets: 3, reps: "12", rest: 60, muscleGroup: "Shoulders", equipment: "Dumbbells", difficulty: "beginner" },
  { id: "e4", name: "Barbell Curl", sets: 3, reps: "10–12", rest: 90, muscleGroup: "Biceps", equipment: "Barbell", difficulty: "beginner" },
  { id: "e5", name: "Tricep Pushdown", sets: 3, reps: "12–15", rest: 60, muscleGroup: "Triceps", equipment: "Cable", difficulty: "beginner" },
];

const VOLUME_DATA = [
  { week: "W1", volume: 8200 },
  { week: "W2", volume: 9600 },
  { week: "W3", volume: 0 },
  { week: "W4", volume: 0 },
  { week: "W5", volume: 0 },
  { week: "W6", volume: 0 },
];

const MUSCLE_GROUPS = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgramHeader() {
  const progressPct = ((PROGRAM.week - 1) / PROGRAM.totalWeeks) * 100;
  return (
    <div className="bg-gradient-to-br from-[#1c1917] to-[#0c0a09] border border-[#292524] rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#3b82f6]/5 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 bg-[#1d4ed8]/20 border border-[#3b82f6]/20 text-[#60a5fa] rounded-full font-medium">
                Active Program
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#292524] border border-[#44403c] text-[#78716c] rounded-full">
                {PROGRAM.split}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#fafaf9]">{PROGRAM.name}</h2>
            <p className="text-sm text-[#78716c] mt-0.5">Week {PROGRAM.week} of {PROGRAM.totalWeeks} · {PROGRAM.goal}</p>
          </div>
          <Link
            to="/app/workouts/log/1"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all flex-shrink-0 shadow-lg shadow-purple-900/30"
          >
            <Play className="size-4 fill-white" />
            <span className="hidden sm:inline">Start</span>
          </Link>
        </div>

        {/* Week progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#78716c]">
            <span>Program progress</span>
            <span>Week {PROGRAM.week} / {PROGRAM.totalWeeks}</span>
          </div>
          <div className="h-2 bg-[#292524] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#7c3aed] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: "Workouts done", value: "2", sub: "this week" },
            { label: "Avg duration", value: "57 min", sub: "per session" },
            { label: "Volume gained", value: "+17%", sub: "vs last week" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-base font-bold text-[#fafaf9]">{s.value}</p>
              <p className="text-[10px] text-[#78716c]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekCalendar({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#fafaf9]">This week's schedule</p>
        <span className="text-xs text-[#78716c]">Mar 24 – 30</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_SCHEDULE.map((day, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={day.day}
              onClick={() => onSelect(i)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                day.status === "done"
                  ? "bg-[#15803d]/15 border-[#22c55e]/25"
                  : day.status === "today"
                  ? isSelected
                    ? "bg-[#4c1d95]/40 border-[#7c3aed]/60 ring-1 ring-[#8b5cf6]/30"
                    : "bg-[#4c1d95]/20 border-[#7c3aed]/30"
                  : day.status === "rest"
                  ? "bg-transparent border-[#1c1917]"
                  : isSelected
                  ? "bg-[#292524] border-[#57534e]"
                  : "bg-[#292524]/30 border-[#292524] hover:border-[#44403c]"
              }`}
            >
              <span className="text-[10px] text-[#78716c] font-medium">{day.day}</span>
              <div className={`size-7 rounded-full flex items-center justify-center ${
                day.status === "done"
                  ? "bg-[#22c55e] text-white"
                  : day.status === "today"
                  ? "bg-[#7c3aed] text-white"
                  : day.type === "rest"
                  ? "text-[#44403c]"
                  : "text-[#78716c]"
              }`}>
                {day.status === "done" ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : day.type === "rest" ? (
                  <span className="text-lg">—</span>
                ) : (
                  <Dumbbell className="size-3.5" />
                )}
              </div>
              <p className="text-[9px] text-center leading-tight text-[#78716c] hidden sm:block">
                {day.label.split(" ")[0]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseCard({ ex, index }: { ex: Exercise; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const diffColor = ex.difficulty === "beginner" ? "text-[#22c55e]" : ex.difficulty === "intermediate" ? "text-[#f59e0b]" : "text-[#ef4444]";

  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden hover:border-[#3d3833] transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className="size-7 rounded-lg bg-[#1d4ed8]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-[#60a5fa]">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#fafaf9] truncate">{ex.name}</p>
            {ex.injuryFlag && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-[#92400e]/20 border border-[#f59e0b]/20 text-[#fbbf24] rounded-full flex-shrink-0">
                <AlertCircle className="size-2.5" /> Modified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#78716c]">{ex.sets} sets × {ex.reps} reps</span>
            <span className="text-[#292524]">·</span>
            <span className="text-xs text-[#78716c]">{ex.muscleGroup}</span>
            <span className="text-[#292524]">·</span>
            <span className={`text-[10px] font-medium ${diffColor}`}>{ex.difficulty}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-[#78716c]">
            <Clock className="size-3" /> {ex.rest}s
          </div>
          <ChevronDown className={`size-4 text-[#44403c] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-[#292524]">
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
              <Dumbbell className="size-3.5" /> {ex.equipment}
            </div>
          </div>

          {/* Set preview */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {Array.from({ length: ex.sets }).map((_, i) => (
              <div key={i} className="bg-[#292524] rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-[#78716c]">Set {i + 1}</p>
                <p className="text-sm font-bold text-[#fafaf9] mt-0.5">{ex.reps}</p>
                <p className="text-[10px] text-[#44403c]">reps</p>
              </div>
            ))}
          </div>

          {/* Injury substitution */}
          {ex.injuryFlag && ex.substitution && (
            <div className="mt-3 flex items-start gap-2.5 p-3 bg-[#92400e]/10 border border-[#f59e0b]/20 rounded-xl">
              <AlertCircle className="size-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#fbbf24] mb-0.5">Injury modification active</p>
                <p className="text-xs text-[#d97706]">
                  Original: {ex.name} → Swapped to: <span className="font-medium text-[#fbbf24]">{ex.substitution}</span>
                </p>
                <p className="text-[10px] text-[#92400e] mt-1">{ex.injuryFlag}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VolumeChart() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-[#fafaf9]">Weekly volume</p>
          <p className="text-xs text-[#78716c]">Total kg lifted per week</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#22c55e]">
          <TrendingUp className="size-3.5" /> +17% this week
        </div>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={VOLUME_DATA} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="week" tick={{ fill: "#78716c", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#78716c", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "#1c1917" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-[#292524] border border-[#44403c] rounded-xl px-3 py-2">
                  <p className="text-[10px] text-[#78716c]">{label}</p>
                  <p className="text-sm font-semibold text-[#fafaf9]">{payload[0].value?.toLocaleString()} kg</p>
                </div>
              );
            }}
          />
          <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WorkoutsPage() {
  const [selectedDay, setSelectedDay] = useState(3); // Thursday = today
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [tab, setTab] = useState<"plan" | "schedule" | "history">("plan");
  const selected = WEEK_SCHEDULE[selectedDay];

  const filteredExercises = muscleFilter === "All"
    ? TODAYS_EXERCISES
    : TODAYS_EXERCISES.filter((e) => e.muscleGroup.toLowerCase().includes(muscleFilter.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#fafaf9]">Workout Planner</h1>
          <p className="text-sm text-[#78716c]">Your adaptive training program</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/workouts/log/1"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-900/20"
          >
            <Play className="size-4 fill-white" />
            Start today's workout
          </Link>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-[#1c1917] border border-[#292524] rounded-xl p-1 mb-6">
        {[
          { key: "plan", label: "Today's Plan" },
          { key: "schedule", label: "Weekly Schedule" },
          { key: "history", label: "Progress" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-[#7c3aed] text-white shadow-lg shadow-purple-900/20"
                : "text-[#78716c] hover:text-[#a8a29e]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <div className="space-y-5">
          <ProgramHeader />

          {/* Injury notice */}
          <div className="flex items-start gap-3 px-4 py-3.5 bg-[#92400e]/10 border border-[#f59e0b]/20 rounded-2xl">
            <Shield className="size-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#fbbf24]">Injury-aware program active</p>
              <p className="text-xs text-[#d97706] mt-0.5">
                Your left knee injury has been noted. Lower body exercises have been reviewed and any high-risk movements flagged for substitution. Always stop if you feel discomfort.
              </p>
            </div>
          </div>

          {/* Today's session */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#fafaf9]">Thursday's session — {selected.label}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1 text-xs text-[#78716c]">
                    <Dumbbell className="size-3" /> {selected.exercises} exercises
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#78716c]">
                    <Clock className="size-3" /> ~{selected.duration} min
                  </div>
                </div>
              </div>

              {/* Muscle group filter */}
              <div className="flex gap-1 flex-wrap justify-end">
                {["All", "Shoulders", "Arms"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setMuscleFilter(g)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                      muscleFilter === g
                        ? "bg-[#7c3aed] text-white"
                        : "bg-[#292524] border border-[#44403c] text-[#78716c] hover:border-[#57534e]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {filteredExercises.map((ex, i) => (
              <ExerciseCard key={ex.id} ex={ex} index={i} />
            ))}
          </div>

          {/* AI tip */}
          <div className="flex items-start gap-3 px-4 py-3.5 bg-[#4c1d95]/15 border border-[#7c3aed]/20 rounded-2xl">
            <Sparkles className="size-4 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#a78bfa] leading-relaxed">
              <span className="font-semibold">AI tip:</span> You've hit PRs on lateral raises the last 2 sessions. Consider going up by 1–2kg today if it feels comfortable. Rest 60s between sets for hypertrophy.
            </p>
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-4">
          <WeekCalendar selected={selectedDay} onSelect={setSelectedDay} />

          {/* Selected day detail */}
          <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-[#78716c]">{selected.day}day</p>
                <p className="text-sm font-semibold text-[#fafaf9]">{selected.label}</p>
              </div>
              {selected.status === "today" && (
                <Link
                  to="/app/workouts/log/1"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] text-white rounded-xl text-xs font-medium"
                >
                  <Play className="size-3 fill-white" /> Start
                </Link>
              )}
              {selected.status === "done" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#15803d]/20 border border-[#22c55e]/20 text-[#4ade80] rounded-xl text-xs font-medium">
                  <Check className="size-3" /> Completed
                </span>
              )}
            </div>

            {selected.type === "rest" ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">😴</div>
                <p className="text-sm text-[#fafaf9] font-medium">Rest & recovery day</p>
                <p className="text-xs text-[#78716c] mt-1">
                  Rest days are essential for muscle growth. Stay hydrated and get good sleep.
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
                    <Dumbbell className="size-3.5" /> {selected.exercises} exercises
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#78716c]">
                    <Clock className="size-3.5" /> {selected.duration} min
                  </div>
                </div>
                <p className="text-xs text-[#78716c]">
                  {selected.type === "push" && "Focuses on pushing movements: shoulders, chest, triceps"}
                  {selected.type === "pull" && "Focuses on pulling movements: back, biceps, rear delts"}
                  {selected.type === "legs" && "Lower body focused. Note: knee-safe modifications applied."}
                  {selected.type === "cardio" && "Optional low-impact cardio session."}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <VolumeChart />

          {/* PR tracker */}
          <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[#fafaf9]">Personal records</p>
              <span className="text-xs text-[#78716c]">This program</span>
            </div>
            <div className="space-y-3">
              {[
                { exercise: "Overhead Press", weight: "52.5 kg", reps: "8", date: "Mar 24", pr: true },
                { exercise: "Lateral Raises", weight: "14 kg", reps: "15", date: "Mar 22", pr: true },
                { exercise: "Barbell Curl", weight: "40 kg", reps: "10", date: "Mar 19", pr: false },
                { exercise: "Tricep Pushdown", weight: "35 kg", reps: "15", date: "Mar 19", pr: false },
              ].map((record) => (
                <div key={record.exercise} className="flex items-center gap-3">
                  <div className={`size-8 rounded-xl flex items-center justify-center flex-shrink-0 ${record.pr ? "bg-[#92400e]/20" : "bg-[#292524]"}`}>
                    {record.pr ? <Star className="size-4 text-[#f59e0b]" /> : <Dumbbell className="size-4 text-[#44403c]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#fafaf9] truncate">{record.exercise}</p>
                    <p className="text-[10px] text-[#78716c]">{record.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#fafaf9]">{record.weight}</p>
                    <p className="text-[10px] text-[#78716c]">× {record.reps}</p>
                  </div>
                  {record.pr && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#92400e]/20 text-[#f59e0b] border border-[#f59e0b]/20 rounded-full flex-shrink-0">
                      PR 🏆
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
