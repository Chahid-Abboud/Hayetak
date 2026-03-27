import { useState } from "react";
import { Link } from "react-router";
import {
  Sparkles, Dumbbell, Utensils, Droplets, Flame, TrendingDown,
  ArrowRight, Check, Clock, Play, ChevronRight, MapPin,
  Bell, Calendar, Shield, Plus, Star,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const WEEKLY_CALORIES = [
  { day: "Mon", calories: 1650, target: 1800 },
  { day: "Tue", calories: 1720, target: 1800 },
  { day: "Wed", calories: 1580, target: 1800 },
  { day: "Thu", calories: 1810, target: 1800 },
  { day: "Fri", calories: 1430, target: 1800 },
  { day: "Sat", calories: 1380, target: 1800 },
  { day: "Sun", calories: 0, target: 1800 },
];

const WEEKLY_WORKOUTS = [
  { day: "M", done: true, type: "Chest" },
  { day: "T", done: true, type: "Back" },
  { day: "W", done: false, type: "Rest" },
  { day: "T", done: false, type: "Shoulder", today: true },
  { day: "F", done: false, type: "Legs" },
  { day: "S", done: false, type: "Rest" },
  { day: "S", done: false, type: "Cardio" },
];

const TODAY_MEALS = [
  { id: 1, time: "08:00", meal: "Breakfast", name: "Oat Porridge + Berries", cal: 360, done: true },
  { id: 2, time: "12:30", meal: "Lunch", name: "Grilled Chicken Caesar", cal: 520, done: true },
  { id: 3, time: "16:00", meal: "Snack", name: "Coconut Yogurt + Almonds", cal: 180, done: true },
  { id: 4, time: "19:30", meal: "Dinner", name: "Salmon + Roasted Veg", cal: 500, done: false },
];

const UPCOMING = [
  { id: 1, type: "appointment", title: "Dr. Sara Khalil — Nutritionist", time: "Tomorrow, 2:00 PM", icon: Calendar },
  { id: 2, type: "workout", title: "Shoulder & Arms Day", time: "Today, 6:00 PM", icon: Dumbbell },
];

// ─── Radial Macro Ring ────────────────────────────────────────────────────────

function MacroRing({ value, max, color, size = 64 }: { value: number; max: number; color: string; size?: number }) {
  const pct = Math.min(value / max, 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#292524" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#292524] border border-[#44403c] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[#78716c] mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#fafaf9]">{payload[0].value.toLocaleString()} kcal</p>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function DayHeader() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <p className="text-sm text-[#78716c]">{dateStr}</p>
        <h1 className="text-2xl font-bold text-[#fafaf9] mt-0.5">
          {greeting}, Sara 👋
        </h1>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#92400e]/20 border border-[#f59e0b]/20 rounded-full">
          <Flame className="size-3.5 text-[#f59e0b]" />
          <span className="text-xs font-semibold text-[#fbbf24]">12 days</span>
        </div>
        <button className="relative p-2 rounded-xl bg-[#1c1917] border border-[#292524] text-[#78716c] hover:text-[#a8a29e] transition-colors">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#7c3aed]" />
        </button>
      </div>
    </div>
  );
}

function CalorieSummaryCard() {
  const consumed = 1060;
  const target = 1800;
  const remaining = target - consumed;
  const burned = 320;
  const pct = Math.min((consumed / target) * 100, 100);

  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-[#78716c] mb-0.5">Today's calories</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-[#fafaf9]">{consumed.toLocaleString()}</span>
            <span className="text-sm text-[#78716c]">/ {target.toLocaleString()} kcal</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#78716c]">Remaining</p>
          <p className="text-lg font-bold text-[#22c55e]">{remaining}</p>
          <p className="text-[10px] text-[#78716c]">kcal left</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-2.5 bg-[#292524] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-[10px] text-[#78716c]">
            🔥 {burned} burned
          </p>
          <p className="text-[10px] text-[#78716c]">{Math.round(pct)}% of goal</p>
        </div>
      </div>

      {/* Macros row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Protein", val: 88, max: 120, unit: "g", color: "#3b82f6" },
          { label: "Carbs", val: 142, max: 180, unit: "g", color: "#f59e0b" },
          { label: "Fat", val: 44, max: 60, unit: "g", color: "#22c55e" },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <MacroRing value={m.val} max={m.max} color={m.color} size={52} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#fafaf9]">{Math.round((m.val / m.max) * 100)}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-[#fafaf9]">{m.val}{m.unit}</p>
              <p className="text-[10px] text-[#78716c]">{m.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkoutCard() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-[#1d4ed8]/20 flex items-center justify-center">
            <Dumbbell className="size-3.5 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-xs text-[#78716c]">Today's workout</p>
            <p className="text-sm font-semibold text-[#fafaf9]">Shoulder & Arms</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-[#1d4ed8]/20 border border-[#3b82f6]/20 text-[#60a5fa] rounded-full">
          Day 4 / Week 2
        </span>
      </div>

      {/* Weekly dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {WEEKLY_WORKOUTS.map((w, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`size-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                w.done
                  ? "bg-[#22c55e] text-white"
                  : w.today
                  ? "bg-[#7c3aed] text-white ring-2 ring-[#8b5cf6]/40"
                  : w.type === "Rest"
                  ? "bg-[#292524] text-[#44403c]"
                  : "bg-[#1c1917] border border-[#44403c] text-[#44403c]"
              }`}
            >
              {w.done ? <Check className="size-3" strokeWidth={3} /> : w.day}
            </div>
          </div>
        ))}
      </div>

      {/* Quick exercises */}
      <div className="space-y-1.5 mb-4">
        {[
          { name: "Overhead Press", sets: "4×8", done: false },
          { name: "Lateral Raises", sets: "3×15", done: false },
          { name: "Bicep Curls", sets: "3×12", done: false },
        ].map((ex) => (
          <div key={ex.name} className="flex items-center gap-2 text-xs">
            <div className={`size-4 rounded-full border flex items-center justify-center ${ex.done ? "bg-[#22c55e] border-[#22c55e]" : "border-[#44403c]"}`}>
              {ex.done && <Check className="size-2.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-[#a8a29e] flex-1">{ex.name}</span>
            <span className="text-[#78716c]">{ex.sets}</span>
          </div>
        ))}
      </div>

      <Link
        to="/app/workouts/log/1"
        className="flex items-center justify-center gap-2 w-full py-2 bg-[#1d4ed8]/20 hover:bg-[#1d4ed8]/30 border border-[#3b82f6]/20 hover:border-[#3b82f6]/40 text-[#60a5fa] rounded-xl text-sm font-medium transition-all"
      >
        <Play className="size-3.5 fill-[#60a5fa]" />
        Start workout
      </Link>
    </div>
  );
}

function HydrationCard() {
  const [glasses, setGlasses] = useState(5);
  const target = 8;
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-[#0c4a6e]/30 flex items-center justify-center">
            <Droplets className="size-3.5 text-[#38bdf8]" />
          </div>
          <div>
            <p className="text-xs text-[#78716c]">Hydration</p>
            <p className="text-sm font-semibold text-[#fafaf9]">{glasses} / {target} cups</p>
          </div>
        </div>
        <span className="text-sm font-bold text-[#38bdf8]">{Math.round((glasses / target) * 100)}%</span>
      </div>

      {/* Cup grid */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {Array.from({ length: target }).map((_, i) => (
          <button
            key={i}
            onClick={() => setGlasses(i < glasses ? i : i + 1)}
            className={`size-8 rounded-lg border transition-all text-sm ${
              i < glasses
                ? "bg-[#0284c7]/20 border-[#38bdf8]/30 text-[#38bdf8]"
                : "bg-[#292524] border-[#44403c] text-[#44403c]"
            }`}
          >
            💧
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[#44403c]">Tap to log a glass</p>
    </div>
  );
}

function AIInsightCard() {
  return (
    <div className="bg-gradient-to-r from-[#1c1917] to-[#0c0a09] border border-[#7c3aed]/30 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c3aed]/5 rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="size-8 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#8b5cf6]">AI Coach Insight</p>
            <p className="text-[10px] text-[#78716c]">Updated 12 min ago</p>
          </div>
          <div className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-[#15803d]/20 border border-[#22c55e]/20 rounded-full">
            <Shield className="size-2.5 text-[#22c55e]" />
            <span className="text-[9px] text-[#4ade80]">Safety checked</span>
          </div>
        </div>

        <p className="text-sm text-[#d6d3d1] leading-relaxed mb-3">
          You're <span className="text-[#8b5cf6] font-semibold">740 kcal under</span> target today. Since you have your shoulder workout at 6pm, consider adding a protein-rich snack now — coconut yogurt and almonds fit your dairy allergy profile perfectly.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {["🥥 Coconut yogurt", "🥜 Almonds (30g)", "🍌 Banana"].map((s) => (
            <span key={s} className="text-xs px-2.5 py-1 bg-[#292524] border border-[#44403c] text-[#a8a29e] rounded-full">
              {s}
            </span>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Link
            to="/app/coach"
            className="flex items-center gap-1.5 text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors font-medium"
          >
            Ask the coach <ChevronRight className="size-3" />
          </Link>
          <span className="text-[#292524]">·</span>
          <Link
            to="/app/meals"
            className="flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#a8a29e] transition-colors"
          >
            Log a snack <ChevronRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function WeeklyTrendChart() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-[#fafaf9]">Weekly calories</p>
          <p className="text-xs text-[#78716c]">vs. your 1,800 kcal target</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#15803d]/20 border border-[#22c55e]/20 rounded-full">
          <TrendingDown className="size-3 text-[#22c55e]" />
          <span className="text-[10px] text-[#4ade80] font-medium">Avg 1,595 kcal</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={WEEKLY_CALORIES} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#44403c" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#44403c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#78716c", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#78716c", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 2000]} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#44403c", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="target" stroke="#44403c" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#targetGrad)" />
          <Area type="monotone" dataKey="calories" stroke="#8b5cf6" strokeWidth={2} fill="url(#calGrad)" dot={{ fill: "#8b5cf6", r: 3 }} activeDot={{ r: 5, fill: "#a78bfa" }} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-[#8b5cf6] rounded-full" />
          <span className="text-[10px] text-[#78716c]">Consumed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 border-t border-dashed border-[#44403c]" />
          <span className="text-[10px] text-[#78716c]">Target</span>
        </div>
      </div>
    </div>
  );
}

function TodaysMeals() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#fafaf9]">Today's meals</p>
        <Link to="/app/meals" className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] font-medium flex items-center gap-1">
          View all <ChevronRight className="size-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {TODAY_MEALS.map((meal) => (
          <div key={meal.id} className="flex items-center gap-3">
            <div
              className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                meal.done ? "bg-[#22c55e]/15 border border-[#22c55e]/30" : "bg-[#292524] border border-[#44403c]"
              }`}
            >
              {meal.done ? (
                <Check className="size-4 text-[#22c55e]" />
              ) : (
                <Clock className="size-3.5 text-[#44403c]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-[#fafaf9] truncate">{meal.name}</p>
              </div>
              <p className="text-[10px] text-[#78716c]">{meal.meal} · {meal.time}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-[#fafaf9]">{meal.cal}</p>
              <p className="text-[10px] text-[#78716c]">kcal</p>
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/app/meals"
        className="flex items-center justify-center gap-1.5 w-full mt-4 py-2 bg-[#292524] hover:bg-[#3d3833] rounded-xl text-xs text-[#78716c] hover:text-[#a8a29e] transition-all"
      >
        <Plus className="size-3" /> Log dinner
      </Link>
    </div>
  );
}

function UpcomingCard() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#fafaf9] mb-4">Upcoming</p>
      <div className="space-y-3">
        {UPCOMING.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-[#292524] rounded-xl">
            <div className="size-8 rounded-xl bg-[#1c1917] border border-[#44403c] flex items-center justify-center flex-shrink-0">
              <item.icon className="size-4 text-[#78716c]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#fafaf9] truncate">{item.title}</p>
              <p className="text-[10px] text-[#78716c]">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "Log meal", icon: Utensils, to: "/app/meals", color: "text-[#22c55e]", bg: "bg-[#15803d]/20 border-[#22c55e]/20 hover:border-[#22c55e]/40" },
    { label: "Start workout", icon: Dumbbell, to: "/app/workouts/log/1", color: "text-[#3b82f6]", bg: "bg-[#1d4ed8]/20 border-[#3b82f6]/20 hover:border-[#3b82f6]/40" },
    { label: "Ask coach", icon: Sparkles, to: "/app/coach", color: "text-[#8b5cf6]", bg: "bg-[#4c1d95]/20 border-[#7c3aed]/20 hover:border-[#7c3aed]/40" },
    { label: "Nearby", icon: MapPin, to: "/app/nearby", color: "text-[#f59e0b]", bg: "bg-[#92400e]/20 border-[#f59e0b]/20 hover:border-[#f59e0b]/40" },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((a) => (
        <Link
          key={a.label}
          to={a.to}
          className={`flex flex-col items-center gap-2 py-4 bg-[#1c1917] border ${a.bg} rounded-2xl transition-all hover:-translate-y-0.5 group`}
        >
          <a.icon className={`size-5 ${a.color}`} />
          <span className="text-[10px] text-[#78716c] group-hover:text-[#a8a29e] font-medium text-center leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
      <DayHeader />

      {/* Quick actions */}
      <div className="mb-6">
        <QuickActions />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left col (wider) */}
        <div className="lg:col-span-2 space-y-4">
          <CalorieSummaryCard />
          <AIInsightCard />
          <WeeklyTrendChart />
          <TodaysMeals />
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <WorkoutCard />
          <HydrationCard />
          <UpcomingCard />

          {/* Progress badge */}
          <div className="bg-gradient-to-br from-[#4c1d95]/20 to-[#1c1917] border border-[#7c3aed]/20 rounded-2xl p-5 text-center">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-900/30">
              <Star className="size-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-[#fafaf9] mb-1">Weekly goal on track</p>
            <p className="text-xs text-[#78716c] leading-relaxed">
              You've logged 5 of 7 days this week. Keep it up to earn your streak badge!
            </p>
            <div className="mt-3 h-1.5 bg-[#292524] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] rounded-full" style={{ width: "71%" }} />
            </div>
            <p className="text-[10px] text-[#78716c] mt-1.5">5 / 7 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}