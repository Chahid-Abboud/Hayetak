import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronLeft, Check, Play, Pause, X, Clock, Dumbbell,
  AlertCircle, Shield, ChevronDown, ChevronUp, RotateCcw,
  CheckCircle, Zap, Plus, Minus, SkipForward, Trophy,
  ArrowRight, Timer, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetEntry {
  weight: number;
  reps: number;
  completed: boolean;
  rpe?: number;
}

interface ExerciseEntry {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  injuryNote?: string;
  sets: SetEntry[];
  previousBest?: { weight: number; reps: number };
  restSeconds: number;
  notes: string;
}

// ─── Mock session data ────────────────────────────────────────────────────────

const INITIAL_EXERCISES: ExerciseEntry[] = [
  {
    id: "e1",
    name: "Overhead Press (Barbell)",
    muscleGroup: "Shoulders",
    equipment: "Barbell",
    previousBest: { weight: 50, reps: 8 },
    restSeconds: 120,
    notes: "",
    sets: [
      { weight: 40, reps: 10, completed: true },
      { weight: 47.5, reps: 8, completed: true },
      { weight: 52.5, reps: 8, completed: true },
      { weight: 52.5, reps: 8, completed: false },
    ],
  },
  {
    id: "e2",
    name: "Lateral Raises",
    muscleGroup: "Shoulders",
    equipment: "Dumbbells",
    previousBest: { weight: 12, reps: 15 },
    restSeconds: 60,
    notes: "",
    sets: [
      { weight: 14, reps: 15, completed: false },
      { weight: 14, reps: 15, completed: false },
      { weight: 14, reps: 15, completed: false },
    ],
  },
  {
    id: "e3",
    name: "Barbell Curl",
    muscleGroup: "Biceps",
    equipment: "Barbell",
    previousBest: { weight: 37.5, reps: 10 },
    restSeconds: 90,
    notes: "",
    sets: [
      { weight: 40, reps: 10, completed: false },
      { weight: 40, reps: 10, completed: false },
      { weight: 40, reps: 10, completed: false },
    ],
  },
  {
    id: "e4",
    name: "Tricep Pushdown",
    muscleGroup: "Triceps",
    equipment: "Cable",
    previousBest: { weight: 32.5, reps: 15 },
    restSeconds: 60,
    injuryNote: undefined,
    notes: "",
    sets: [
      { weight: 35, reps: 15, completed: false },
      { weight: 35, reps: 15, completed: false },
      { weight: 35, reps: 15, completed: false },
    ],
  },
];

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useTimer(initial = 0, counting = true) {
  const [seconds, setSeconds] = useState(initial);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!counting) return;
    ref.current = setInterval(() => {
      setSeconds((s) => (counting === true ? s + 1 : Math.max(0, s - 1)));
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [counting]);

  return seconds;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Rest Timer Overlay ───────────────────────────────────────────────────────

function RestTimerOverlay({
  seconds,
  onDismiss,
  onSkip,
}: {
  seconds: number;
  onDismiss: () => void;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onDismiss(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const r = 52;
  const circ = 2 * Math.PI * r;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative bg-[#1c1917] border border-[#292524] rounded-3xl p-8 w-full max-w-xs text-center shadow-2xl">
        <p className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-6">Rest timer</p>

        {/* Radial timer */}
        <div className="relative size-36 mx-auto mb-6">
          <svg className="size-36" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="72" cy="72" r={r} fill="none" stroke="#292524" strokeWidth={6} />
            <circle
              cx="72" cy="72" r={r} fill="none" stroke="#7c3aed" strokeWidth={6}
              strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.9s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-extrabold text-[#fafaf9] tabular-nums">{formatTime(remaining)}</p>
            <p className="text-[10px] text-[#78716c]">remaining</p>
          </div>
        </div>

        <p className="text-sm text-[#a8a29e] mb-6">
          Rest between sets. Next: <span className="text-[#fafaf9] font-medium">Set {remaining > 0 ? "continues" : "ready"}</span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 bg-[#292524] border border-[#44403c] hover:border-[#57534e] text-[#a8a29e] rounded-xl text-sm font-medium transition-all"
          >
            Skip rest
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all"
          >
            I'm ready
          </button>
        </div>

        {/* Add 30s */}
        <button
          onClick={() => setRemaining((r) => r + 30)}
          className="mt-3 text-xs text-[#78716c] hover:text-[#a8a29e] transition-colors"
        >
          + 30 seconds more
        </button>
      </div>
    </div>
  );
}

// ─── Set Input Row ────────────────────────────────────────────────────────────

function SetRow({
  setNum,
  entry,
  previous,
  onChange,
  onComplete,
}: {
  setNum: number;
  entry: SetEntry;
  previous?: { weight: number; reps: number };
  onChange: (field: "weight" | "reps", val: number) => void;
  onComplete: () => void;
}) {
  const isPR = previous && (entry.weight > previous.weight || (entry.weight === previous.weight && entry.reps > previous.reps));

  return (
    <div
      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all ${
        entry.completed
          ? "bg-[#15803d]/10 border border-[#22c55e]/20"
          : "bg-[#292524] border border-[#292524]"
      }`}
    >
      {/* Set number */}
      <div
        className={`size-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
          entry.completed ? "bg-[#22c55e] text-white" : "bg-[#44403c] text-[#a8a29e]"
        }`}
      >
        {entry.completed ? <Check className="size-4" strokeWidth={3} /> : setNum}
      </div>

      {/* Previous */}
      <div className="w-16 flex-shrink-0 text-center">
        {previous ? (
          <>
            <p className="text-[10px] text-[#44403c] font-medium">{previous.weight}kg</p>
            <p className="text-[10px] text-[#44403c]">×{previous.reps}</p>
          </>
        ) : (
          <p className="text-[10px] text-[#44403c]">—</p>
        )}
      </div>

      {/* Weight input */}
      <div className="flex-1 flex items-center gap-1">
        <button
          onClick={() => onChange("weight", Math.max(0, entry.weight - 2.5))}
          disabled={entry.completed}
          className="size-7 rounded-lg bg-[#1c1917] flex items-center justify-center text-[#78716c] hover:text-[#a8a29e] disabled:opacity-40 transition-colors"
        >
          <Minus className="size-3.5" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-base font-bold text-[#fafaf9]">{entry.weight}</p>
          <p className="text-[9px] text-[#78716c]">kg</p>
        </div>
        <button
          onClick={() => onChange("weight", entry.weight + 2.5)}
          disabled={entry.completed}
          className="size-7 rounded-lg bg-[#1c1917] flex items-center justify-center text-[#78716c] hover:text-[#a8a29e] disabled:opacity-40 transition-colors"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Reps input */}
      <div className="flex-1 flex items-center gap-1">
        <button
          onClick={() => onChange("reps", Math.max(1, entry.reps - 1))}
          disabled={entry.completed}
          className="size-7 rounded-lg bg-[#1c1917] flex items-center justify-center text-[#78716c] hover:text-[#a8a29e] disabled:opacity-40 transition-colors"
        >
          <Minus className="size-3.5" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-base font-bold text-[#fafaf9]">{entry.reps}</p>
          <p className="text-[9px] text-[#78716c]">reps</p>
        </div>
        <button
          onClick={() => onChange("reps", entry.reps + 1)}
          disabled={entry.completed}
          className="size-7 rounded-lg bg-[#1c1917] flex items-center justify-center text-[#78716c] hover:text-[#a8a29e] disabled:opacity-40 transition-colors"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* PR badge */}
      {isPR && entry.completed && (
        <span className="text-[9px] px-1.5 py-0.5 bg-[#92400e]/20 border border-[#f59e0b]/30 text-[#f59e0b] rounded-full flex-shrink-0">
          PR!
        </span>
      )}

      {/* Complete button */}
      <button
        onClick={onComplete}
        disabled={entry.completed}
        className={`size-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          entry.completed
            ? "bg-[#22c55e] text-white cursor-default"
            : "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
        }`}
      >
        <Check className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Exercise Panel ───────────────────────────────────────────────────────────

function ExercisePanel({
  ex,
  isActive,
  onSetComplete,
  onSetChange,
  onRestStart,
}: {
  ex: ExerciseEntry;
  isActive: boolean;
  onSetComplete: (exId: string, setIdx: number) => void;
  onSetChange: (exId: string, setIdx: number, field: "weight" | "reps", val: number) => void;
  onRestStart: (seconds: number) => void;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const completedSets = ex.sets.filter((s) => s.completed).length;
  const allDone = completedSets === ex.sets.length;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        allDone
          ? "bg-[#15803d]/10 border-[#22c55e]/20"
          : isActive
          ? "bg-[#1c1917] border-[#7c3aed]/30 ring-1 ring-[#8b5cf6]/10"
          : "bg-[#1c1917] border-[#292524]"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        {/* Status icon */}
        <div
          className={`size-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            allDone ? "bg-[#22c55e] text-white" : isActive ? "bg-[#7c3aed] text-white" : "bg-[#292524] text-[#78716c]"
          }`}
        >
          {allDone ? <Check className="size-4" strokeWidth={3} /> : <Dumbbell className="size-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#fafaf9] truncate">{ex.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#78716c]">{ex.muscleGroup}</span>
            <span className="text-[#292524]">·</span>
            <span className="text-[10px] font-medium" style={{ color: allDone ? "#22c55e" : isActive ? "#8b5cf6" : "#78716c" }}>
              {completedSets} / {ex.sets.length} sets
            </span>
          </div>
        </div>

        <ChevronDown className={`size-4 text-[#44403c] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-2">
          {/* Previous / Weight / Reps labels */}
          <div className="flex items-center gap-3 px-4 mb-1">
            <div className="size-7 flex-shrink-0" />
            <div className="w-16 flex-shrink-0 text-center">
              <p className="text-[10px] text-[#44403c] font-medium uppercase tracking-wide">Prev</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-[#44403c] font-medium uppercase tracking-wide">Weight</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-[#44403c] font-medium uppercase tracking-wide">Reps</p>
            </div>
            <div className="size-8 flex-shrink-0" />
          </div>

          {ex.sets.map((set, i) => (
            <SetRow
              key={i}
              setNum={i + 1}
              entry={set}
              previous={ex.previousBest}
              onChange={(field, val) => onSetChange(ex.id, i, field, val)}
              onComplete={() => {
                onSetComplete(ex.id, i);
                if (!set.completed && i < ex.sets.length - 1) {
                  onRestStart(ex.restSeconds);
                }
              }}
            />
          ))}

          {/* Injury note */}
          {ex.injuryNote && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#92400e]/10 border border-[#f59e0b]/20 rounded-xl mt-2">
              <AlertCircle className="size-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#fbbf24]">{ex.injuryNote}</p>
            </div>
          )}

          {/* Rest time label */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-[#44403c]">
              <Timer className="size-3" />
              Rest: {ex.restSeconds}s between sets
            </div>
            {!allDone && (
              <button
                onClick={() => onRestStart(ex.restSeconds)}
                className="text-[10px] text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
              >
                Start rest timer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Finish Modal ─────────────────────────────────────────────────────────────

function FinishModal({ duration, totalSets, totalVolume, onConfirm, onCancel }: {
  duration: number; totalSets: number; totalVolume: number;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative bg-[#1c1917] border border-[#292524] rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="size-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-900/40">
          <Trophy className="size-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#fafaf9] mb-1">Finish workout?</h2>
        <p className="text-sm text-[#78716c] mb-6">Great session — here's your summary</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Duration", value: formatTime(duration) },
            { label: "Sets done", value: String(totalSets) },
            { label: "Volume", value: `${(totalVolume / 1000).toFixed(1)}t` },
          ].map((s) => (
            <div key={s.label} className="bg-[#292524] rounded-xl p-3">
              <p className="text-base font-bold text-[#fafaf9]">{s.value}</p>
              <p className="text-[10px] text-[#78716c]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-[#292524] border border-[#44403c] text-[#a8a29e] rounded-xl text-sm font-medium transition-all hover:bg-[#3d3833]">
            Keep going
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all">
            Save & finish
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WorkoutLogPage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState(INITIAL_EXERCISES);
  const [isPaused, setIsPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [finished, setFinished] = useState(false);

  // Workout timer
  useEffect(() => {
    if (isPaused || finished) return;
    const t = setInterval(() => setDurationSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isPaused, finished]);

  const totalCompletedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0
  );
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).reduce((s2, set) => s2 + set.weight * set.reps, 0), 0
  );
  const progressPct = totalSets > 0 ? (totalCompletedSets / totalSets) * 100 : 0;

  // Active exercise = first with incomplete sets
  const activeExIdx = exercises.findIndex((ex) => ex.sets.some((s) => !s.completed));

  const completeSet = (exId: string, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, completed: true } : s)) }
          : ex
      )
    );
  };

  const changeSet = (exId: string, setIdx: number, field: "weight" | "reps", val: number) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, [field]: val } : s)) }
          : ex
      )
    );
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center">
        <div className="size-20 rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/50">
          <Trophy className="size-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#fafaf9] mb-2">Workout saved!</h1>
        <p className="text-[#78716c] mb-8">Great session. Your progress has been recorded.</p>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-8">
          {[
            { label: "Duration", value: formatTime(durationSeconds) },
            { label: "Sets", value: String(totalCompletedSets) },
            { label: "Volume", value: `${Math.round(totalVolume)} kg` },
          ].map((s) => (
            <div key={s.label} className="bg-[#1c1917] border border-[#292524] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#fafaf9]">{s.value}</p>
              <p className="text-[10px] text-[#78716c]">{s.label}</p>
            </div>
          ))}
        </div>
        <Link
          to="/app/workouts"
          className="flex items-center gap-2 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold transition-all"
        >
          Back to workouts <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-0">
      {/* Sticky session header */}
      <div className="sticky top-0 z-20 bg-[#0c0a09]/95 backdrop-blur-md border-b border-[#1c1917] py-4 -mx-4 lg:-mx-6 px-4 lg:px-6 mb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/app/workouts"
            className="p-2 rounded-xl bg-[#1c1917] border border-[#292524] text-[#78716c] hover:text-[#a8a29e] transition-colors"
          >
            <ChevronLeft className="size-4" />
          </Link>

          <div className="flex-1">
            <p className="text-xs text-[#78716c]">Active session</p>
            <p className="text-sm font-semibold text-[#fafaf9]">Shoulder & Arms Day</p>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1917] border border-[#292524] rounded-xl">
              <div className={`size-1.5 rounded-full ${isPaused ? "bg-[#f59e0b]" : "bg-[#22c55e] animate-pulse"}`} />
              <span className="text-sm font-bold text-[#fafaf9] tabular-nums font-mono">{formatTime(durationSeconds)}</span>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-xl bg-[#1c1917] border border-[#292524] text-[#78716c] hover:text-[#a8a29e] transition-colors"
            >
              {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          </div>

          <button
            onClick={() => setShowFinish(true)}
            className="px-3 py-2 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/20 text-[#4ade80] rounded-xl text-xs font-semibold transition-all"
          >
            Finish
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-[#78716c]">
            <span>{totalCompletedSets} / {totalSets} sets completed</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-[#1c1917] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7c3aed] to-[#22c55e] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Volume", value: `${Math.round(totalVolume)} kg`, color: "text-[#fafaf9]" },
          { label: "Sets left", value: String(totalSets - totalCompletedSets), color: "text-[#f59e0b]" },
          { label: "Exercises", value: `${exercises.filter((e) => e.sets.every((s) => s.completed)).length} / ${exercises.length}`, color: "text-[#22c55e]" },
        ].map((s) => (
          <div key={s.label} className="bg-[#1c1917] border border-[#292524] rounded-xl px-3 py-3 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#78716c]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-3 mb-8">
        {exercises.map((ex, i) => (
          <ExercisePanel
            key={ex.id}
            ex={ex}
            isActive={i === activeExIdx}
            onSetComplete={completeSet}
            onSetChange={changeSet}
            onRestStart={(secs) => setRestTimer(secs)}
          />
        ))}
      </div>

      {/* Safety reminder */}
      <div className="flex items-start gap-2.5 px-4 py-3.5 bg-[#1c1917] border border-[#292524] rounded-2xl mb-6">
        <Shield className="size-4 text-[#78716c] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#78716c] leading-relaxed">
          Left knee injury noted. Stop immediately if you feel any knee discomfort. No lower body exercises in today's session.
        </p>
      </div>

      {/* Rest timer overlay */}
      {restTimer !== null && (
        <RestTimerOverlay
          seconds={restTimer}
          onDismiss={() => setRestTimer(null)}
          onSkip={() => setRestTimer(null)}
        />
      )}

      {/* Finish modal */}
      {showFinish && (
        <FinishModal
          duration={durationSeconds}
          totalSets={totalCompletedSets}
          totalVolume={totalVolume}
          onConfirm={() => { setShowFinish(false); setFinished(true); }}
          onCancel={() => setShowFinish(false)}
        />
      )}
    </div>
  );
}
