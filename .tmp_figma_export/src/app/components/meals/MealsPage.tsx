import { useState } from "react";
import {
  Plus, ChevronLeft, ChevronRight, Check, X, Search, Star,
  Clock, AlertCircle, Shield, Utensils, Sparkles, BarChart3,
  Edit2, Trash2, Info, ArrowRight, Flame, Zap, ChevronDown,
  RefreshCw,
} from "lucide-react";

// ─── Types & Mock Data ────────────────────────────────────────────────────────

interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  allergyFlags: string[];
  dietSafe: boolean;
  favorite?: boolean;
}

interface MealEntry { food: FoodItem; qty: number; }
interface MealSection { key: string; label: string; icon: string; time: string; entries: MealEntry[]; }

const FOOD_DB: FoodItem[] = [
  { id: "f1", name: "Oat Porridge", cal: 180, protein: 6, carbs: 32, fat: 3, serving: "100g dry", allergyFlags: [], dietSafe: true, favorite: true },
  { id: "f2", name: "Blueberries", cal: 57, protein: 0.7, carbs: 14, fat: 0.3, serving: "100g", allergyFlags: [], dietSafe: true, favorite: true },
  { id: "f3", name: "Grilled Chicken Breast", cal: 165, protein: 31, carbs: 0, fat: 3.6, serving: "100g", allergyFlags: [], dietSafe: true },
  { id: "f4", name: "Romaine Lettuce", cal: 17, protein: 1.2, carbs: 3.3, fat: 0.3, serving: "100g", allergyFlags: [], dietSafe: true },
  { id: "f5", name: "Salmon Fillet", cal: 208, protein: 20, carbs: 0, fat: 13, serving: "100g", allergyFlags: [], dietSafe: true, favorite: true },
  { id: "f6", name: "Brown Rice", cal: 111, protein: 2.6, carbs: 23, fat: 0.9, serving: "100g cooked", allergyFlags: [], dietSafe: true },
  { id: "f7", name: "Roasted Vegetables", cal: 85, protein: 2, carbs: 18, fat: 1, serving: "150g", allergyFlags: [], dietSafe: true },
  { id: "f8", name: "Coconut Yogurt", brand: "CocoFit", cal: 120, protein: 3, carbs: 14, fat: 6, serving: "150g", allergyFlags: [], dietSafe: true, favorite: true },
  { id: "f9", name: "Greek Yogurt", brand: "Chobani", cal: 100, protein: 17, carbs: 6, fat: 0.7, serving: "170g", allergyFlags: ["Dairy"], dietSafe: false },
  { id: "f10", name: "Almonds", cal: 164, protein: 6, carbs: 6, fat: 14, serving: "30g", allergyFlags: [], dietSafe: true },
  { id: "f11", name: "Avocado", cal: 160, protein: 2, carbs: 9, fat: 15, serving: "100g", allergyFlags: [], dietSafe: true, favorite: true },
  { id: "f12", name: "Whole Eggs", cal: 155, protein: 13, carbs: 1.1, fat: 11, serving: "2 eggs", allergyFlags: [], dietSafe: true },
];

const INITIAL_MEALS: MealSection[] = [
  {
    key: "breakfast", label: "Breakfast", icon: "🌅", time: "7:00 – 10:00 AM",
    entries: [
      { food: FOOD_DB[0], qty: 1 },
      { food: FOOD_DB[1], qty: 1.5 },
    ],
  },
  {
    key: "lunch", label: "Lunch", icon: "☀️", time: "12:00 – 2:00 PM",
    entries: [
      { food: FOOD_DB[2], qty: 1.5 },
      { food: FOOD_DB[3], qty: 2 },
    ],
  },
  {
    key: "snack", label: "Snacks", icon: "🍎", time: "3:00 – 5:00 PM",
    entries: [
      { food: FOOD_DB[7], qty: 1 },
      { food: FOOD_DB[9], qty: 1 },
    ],
  },
  {
    key: "dinner", label: "Dinner", icon: "🌙", time: "7:00 – 9:00 PM",
    entries: [],
  },
];

const TARGETS = { cal: 1800, protein: 120, carbs: 180, fat: 60 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalMacros(meals: MealSection[]) {
  let cal = 0, protein = 0, carbs = 0, fat = 0;
  meals.forEach((m) => m.entries.forEach((e) => {
    cal += e.food.cal * e.qty;
    protein += e.food.protein * e.qty;
    carbs += e.food.carbs * e.qty;
    fat += e.food.fat * e.qty;
  }));
  return { cal: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

// ─── Log Meal Modal ───────────────────────────────────────────────────────────

function LogMealModal({
  onClose,
  onAdd,
  targetMeal,
}: {
  onClose: () => void;
  onAdd: (mealKey: string, food: FoodItem, qty: number) => void;
  targetMeal: string;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"search" | "favorites" | "recent">("search");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);

  const filtered = FOOD_DB.filter((f) => {
    if (tab === "favorites") return f.favorite;
    if (tab === "recent") return true;
    return f.name.toLowerCase().includes(query.toLowerCase());
  });

  if (selected) {
    const totalCal = Math.round(selected.cal * qty);
    const hasDairyWarning = selected.allergyFlags.includes("Dairy");
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-[#1c1917] border border-[#292524] rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#a8a29e]">
              <ChevronLeft className="size-3.5" /> Back
            </button>
            <button onClick={onClose} className="p-1.5 text-[#78716c] hover:text-[#a8a29e]">
              <X className="size-4" />
            </button>
          </div>

          {hasDairyWarning && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#7f1d1d]/20 border border-[#ef4444]/30 rounded-xl mb-4">
              <AlertCircle className="size-4 text-[#f87171] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#fca5a5]">Dairy allergy detected</p>
                <p className="text-[10px] text-[#f87171]">This food contains dairy. Based on your profile, we don't recommend logging this item.</p>
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold text-[#fafaf9] mb-0.5">{selected.name}</h3>
          {selected.brand && <p className="text-xs text-[#78716c] mb-4">{selected.brand}</p>}

          <p className="text-xs text-[#78716c] mb-2">Per {selected.serving}</p>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { l: "Calories", v: `${Math.round(selected.cal * qty)}`, color: "text-[#fafaf9]" },
              { l: "Protein", v: `${Math.round(selected.protein * qty)}g`, color: "text-[#3b82f6]" },
              { l: "Carbs", v: `${Math.round(selected.carbs * qty)}g`, color: "text-[#f59e0b]" },
              { l: "Fat", v: `${Math.round(selected.fat * qty)}g`, color: "text-[#22c55e]" },
            ].map((m) => (
              <div key={m.l} className="bg-[#292524] rounded-xl p-3 text-center">
                <p className={`text-sm font-bold ${m.color}`}>{m.v}</p>
                <p className="text-[10px] text-[#78716c]">{m.l}</p>
              </div>
            ))}
          </div>

          {/* Quantity */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[#d6d3d1] mb-2">Servings</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(0.5, qty - 0.5))}
                className="size-9 rounded-xl bg-[#292524] border border-[#44403c] text-[#a8a29e] hover:bg-[#3d3833] transition-all text-lg font-bold"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <p className="text-xl font-bold text-[#fafaf9]">{qty}</p>
                <p className="text-[10px] text-[#78716c]">× {selected.serving}</p>
              </div>
              <button
                onClick={() => setQty(qty + 0.5)}
                className="size-9 rounded-xl bg-[#292524] border border-[#44403c] text-[#a8a29e] hover:bg-[#3d3833] transition-all text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          {selected.dietSafe ? (
            <div className="flex items-center gap-1.5 mb-4 px-2">
              <Shield className="size-3.5 text-[#22c55e]" />
              <p className="text-xs text-[#4ade80]">Fits your diet profile · No known allergens</p>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-[#292524] border border-[#44403c] text-[#a8a29e] rounded-xl text-sm font-medium transition-all hover:bg-[#3d3833]">
              Cancel
            </button>
            <button
              onClick={() => { onAdd(targetMeal, selected, qty); onClose(); }}
              disabled={hasDairyWarning}
              className="flex-1 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
            >
              Add to {INITIAL_MEALS.find((m) => m.key === targetMeal)?.label}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1c1917] border border-[#292524] rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-[#292524]">
          <div>
            <p className="text-xs text-[#78716c]">Adding to</p>
            <p className="text-sm font-semibold text-[#fafaf9]">
              {INITIAL_MEALS.find((m) => m.key === targetMeal)?.label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#78716c] hover:text-[#a8a29e] transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#292524]">
          {[
            { key: "search", label: "Search" },
            { key: "favorites", label: "Favorites" },
            { key: "recent", label: "Recents" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                tab === t.key
                  ? "text-[#8b5cf6] border-b-2 border-[#7c3aed]"
                  : "text-[#78716c] hover:text-[#a8a29e]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab === "search" && (
          <div className="px-4 py-3 border-b border-[#292524]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods, brands, meals..."
                className="w-full pl-10 pr-4 py-2 bg-[#292524] border border-[#44403c] rounded-xl text-sm text-[#fafaf9] placeholder-[#44403c] outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </div>
        )}

        {/* AI Suggestion banner */}
        {tab === "search" && !query && (
          <div className="mx-4 mt-3 px-3 py-2.5 bg-[#4c1d95]/15 border border-[#7c3aed]/20 rounded-xl flex items-center gap-2">
            <Sparkles className="size-3.5 text-[#8b5cf6] flex-shrink-0" />
            <p className="text-xs text-[#a78bfa]">AI suggests: Salmon Fillet fits your dinner calorie budget and protein goal perfectly.</p>
          </div>
        )}

        {/* Food list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {filtered.map((food) => {
            const hasDairy = food.allergyFlags.includes("Dairy");
            return (
              <button
                key={food.id}
                onClick={() => setSelected(food)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                  hasDairy
                    ? "bg-[#7f1d1d]/10 border-[#ef4444]/20 hover:border-[#ef4444]/40"
                    : "bg-[#292524] border-[#44403c] hover:border-[#57534e]"
                }`}
              >
                <div className="size-9 rounded-xl bg-[#1c1917] flex items-center justify-center flex-shrink-0 text-lg">
                  {food.allergyFlags.length > 0 ? "⚠️" : food.favorite ? "⭐" : "🍽️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-[#fafaf9] truncate">{food.name}</p>
                    {hasDairy && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#7f1d1d]/30 text-[#f87171] border border-[#ef4444]/30 rounded-full flex-shrink-0">
                        Contains dairy
                      </span>
                    )}
                    {food.dietSafe && !hasDairy && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#15803d]/20 text-[#4ade80] border border-[#22c55e]/20 rounded-full flex-shrink-0">
                        Safe ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#78716c]">{food.serving} {food.brand ? `· ${food.brand}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[#fafaf9]">{food.cal}</p>
                  <p className="text-[10px] text-[#78716c]">kcal</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Meal Section ─────────────────────────────────────────────────────────────

function MealSectionCard({
  section,
  onAddClick,
  onRemove,
}: {
  section: MealSection;
  onAddClick: (key: string) => void;
  onRemove: (mealKey: string, foodId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const sectionCal = section.entries.reduce((s, e) => s + e.food.cal * e.qty, 0);

  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#292524]/30 transition-colors"
      >
        <span className="text-xl">{section.icon}</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[#fafaf9]">{section.label}</p>
          <p className="text-[10px] text-[#78716c]">{section.time}</p>
        </div>
        <div className="text-right mr-2">
          {sectionCal > 0 ? (
            <>
              <p className="text-sm font-bold text-[#fafaf9]">{Math.round(sectionCal)}</p>
              <p className="text-[10px] text-[#78716c]">kcal</p>
            </>
          ) : (
            <p className="text-xs text-[#44403c]">Not logged</p>
          )}
        </div>
        <ChevronDown className={`size-4 text-[#44403c] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {/* Entries */}
          {section.entries.map((entry) => (
            <div key={entry.food.id} className="flex items-center gap-3 py-2 border-t border-[#292524]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-[#fafaf9] truncate">{entry.food.name}</p>
                  {entry.food.dietSafe && (
                    <div className="size-3.5 rounded-full bg-[#15803d]/30 flex items-center justify-center flex-shrink-0">
                      <Check className="size-2.5 text-[#22c55e]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-[10px] text-[#78716c]">{entry.qty}× {entry.food.serving}</p>
                  <div className="flex gap-2">
                    {[
                      { l: "P", v: Math.round(entry.food.protein * entry.qty), c: "#3b82f6" },
                      { l: "C", v: Math.round(entry.food.carbs * entry.qty), c: "#f59e0b" },
                      { l: "F", v: Math.round(entry.food.fat * entry.qty), c: "#22c55e" },
                    ].map((m) => (
                      <span key={m.l} className="text-[10px]" style={{ color: m.c }}>
                        {m.l} {m.v}g
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-sm font-semibold text-[#fafaf9]">{Math.round(entry.food.cal * entry.qty)}</p>
                <p className="text-[10px] text-[#78716c] w-6">kcal</p>
                <button
                  onClick={() => onRemove(section.key, entry.food.id)}
                  className="p-1 text-[#44403c] hover:text-[#ef4444] transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {section.entries.length === 0 && (
            <div className="py-6 text-center border-t border-[#292524]">
              <p className="text-sm text-[#44403c] mb-1">Nothing logged yet</p>
              <p className="text-xs text-[#292524]">Add foods below to track this meal</p>
            </div>
          )}

          {/* Add button */}
          <button
            onClick={() => onAddClick(section.key)}
            className="flex items-center gap-2 w-full py-2.5 mt-1 bg-[#292524] hover:bg-[#3d3833] border border-dashed border-[#44403c] hover:border-[#57534e] rounded-xl text-xs text-[#78716c] hover:text-[#a8a29e] transition-all justify-center"
          >
            <Plus className="size-3.5" /> Add food to {section.label}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function DailySummary({ meals }: { meals: MealSection[] }) {
  const totals = totalMacros(meals);
  const pct = (v: number, max: number) => Math.min((v / max) * 100, 100);

  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5">
      {/* Main calorie display */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-[#78716c] mb-1">Logged today</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#fafaf9]">{totals.cal.toLocaleString()}</span>
            <span className="text-sm text-[#78716c]">/ {TARGETS.cal.toLocaleString()} kcal</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#78716c]">Remaining</p>
          <p className="text-xl font-bold" style={{ color: totals.cal < TARGETS.cal ? "#22c55e" : "#ef4444" }}>
            {Math.abs(TARGETS.cal - totals.cal).toLocaleString()}
          </p>
          <p className="text-[10px] text-[#78716c]">kcal {totals.cal > TARGETS.cal ? "over" : "left"}</p>
        </div>
      </div>

      {/* Calorie bar */}
      <div className="h-2.5 bg-[#292524] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] rounded-full transition-all"
          style={{ width: `${pct(totals.cal, TARGETS.cal)}%` }}
        />
      </div>

      {/* Macro bars */}
      <div className="space-y-2.5">
        {[
          { label: "Protein", val: totals.protein, max: TARGETS.protein, unit: "g", color: "#3b82f6", bg: "bg-[#3b82f6]" },
          { label: "Carbs", val: totals.carbs, max: TARGETS.carbs, unit: "g", color: "#f59e0b", bg: "bg-[#f59e0b]" },
          { label: "Fat", val: totals.fat, max: TARGETS.fat, unit: "g", color: "#22c55e", bg: "bg-[#22c55e]" },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <p className="text-xs text-[#78716c] w-12 flex-shrink-0">{m.label}</p>
            <div className="flex-1 h-1.5 bg-[#292524] rounded-full overflow-hidden">
              <div
                className={`h-full ${m.bg} rounded-full transition-all`}
                style={{ width: `${pct(m.val, m.max)}%` }}
              />
            </div>
            <p className="text-xs font-medium text-[#fafaf9] w-16 text-right">
              {m.val}{m.unit}
              <span className="text-[#44403c] font-normal"> / {m.max}{m.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Diet safety banner */}
      <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#15803d]/10 border border-[#22c55e]/20 rounded-xl">
        <Shield className="size-3.5 text-[#22c55e]" />
        <p className="text-xs text-[#4ade80]">All logged foods are dairy-free and within your diet preferences</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MealsPage() {
  const [meals, setMeals] = useState(INITIAL_MEALS);
  const [dateOffset, setDateOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState("breakfast");
  const [activeTab, setActiveTab] = useState<"log" | "plan">("log");

  const dateLabel = dateOffset === 0 ? "Today" : dateOffset === -1 ? "Yesterday" : `${Math.abs(dateOffset)} days ago`;
  const date = new Date();
  date.setDate(date.getDate() + dateOffset);
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const openModal = (key: string) => { setTargetMeal(key); setModalOpen(true); };

  const addFood = (mealKey: string, food: FoodItem, qty: number) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.key === mealKey
          ? { ...m, entries: [...m.entries, { food, qty }] }
          : m
      )
    );
  };

  const removeFood = (mealKey: string, foodId: string) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.key === mealKey
          ? { ...m, entries: m.entries.filter((e) => e.food.id !== foodId) }
          : m
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#fafaf9]">Meal Tracker</h1>
          <p className="text-sm text-[#78716c]">Track nutrition, log meals, stay on plan</p>
        </div>
        <button
          onClick={() => openModal("breakfast")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-semibold transition-all"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Log meal</span>
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-5 bg-[#1c1917] border border-[#292524] rounded-2xl px-4 py-3">
        <button
          onClick={() => setDateOffset(dateOffset - 1)}
          className="p-1.5 text-[#78716c] hover:text-[#a8a29e] transition-colors rounded-lg hover:bg-[#292524]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#fafaf9]">{dateLabel}</p>
          <p className="text-xs text-[#78716c]">{dateStr}</p>
        </div>
        <button
          onClick={() => setDateOffset(Math.min(0, dateOffset + 1))}
          disabled={dateOffset === 0}
          className="p-1.5 text-[#78716c] hover:text-[#a8a29e] disabled:opacity-30 transition-colors rounded-lg hover:bg-[#292524]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#1c1917] border border-[#292524] rounded-xl p-1 mb-5">
        {[
          { key: "log", label: "Daily Log" },
          { key: "plan", label: "AI Meal Plan" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-[#7c3aed] text-white shadow-lg shadow-purple-900/20"
                : "text-[#78716c] hover:text-[#a8a29e]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "log" ? (
        <div className="space-y-4">
          <DailySummary meals={meals} />
          {meals.map((section) => (
            <MealSectionCard
              key={section.key}
              section={section}
              onAddClick={openModal}
              onRemove={removeFood}
            />
          ))}
        </div>
      ) : (
        /* AI Plan tab */
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#1c1917] to-[#0c0a09] border border-[#7c3aed]/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-[#8b5cf6]" />
              <p className="text-sm font-semibold text-[#fafaf9]">Today's AI-generated meal plan</p>
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-[#15803d]/20 border border-[#22c55e]/20 text-[#4ade80] rounded-full">
                Dairy-free ✓
              </span>
            </div>
            <p className="text-xs text-[#78716c] leading-relaxed mb-4">
              Based on your 1,800 kcal target, weight loss goal, and dairy allergy. All meals are safe for your profile.
            </p>
            {[
              { meal: "Breakfast", name: "Oat Porridge with Berries", cal: 360, tag: "🌅 Low GI" },
              { meal: "Lunch", name: "Grilled Chicken Caesar (no croutons)", cal: 520, tag: "☀️ High protein" },
              { meal: "Snack", name: "Coconut Yogurt + Almonds", cal: 210, tag: "🍎 Pre-workout" },
              { meal: "Dinner", name: "Salmon + Roasted Vegetables", cal: 500, tag: "🌙 Omega-3 rich" },
            ].map((meal) => (
              <div key={meal.meal} className="flex items-center gap-3 py-3 border-t border-[#292524]">
                <div className="text-sm text-[#78716c] w-16 flex-shrink-0">{meal.meal}</div>
                <div className="flex-1">
                  <p className="text-sm text-[#fafaf9]">{meal.name}</p>
                  <p className="text-[10px] text-[#78716c]">{meal.tag}</p>
                </div>
                <p className="text-sm font-semibold text-[#fafaf9] flex-shrink-0">{meal.cal} kcal</p>
              </div>
            ))}
            <button className="flex items-center gap-2 mt-4 text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">
              <RefreshCw className="size-3.5" /> Regenerate plan
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <LogMealModal
          onClose={() => setModalOpen(false)}
          onAdd={addFood}
          targetMeal={targetMeal}
        />
      )}
    </div>
  );
}
