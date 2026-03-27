import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, Plus, Shield, AlertCircle, ChevronRight,
  Utensils, Dumbbell, Clock, Check, X, RefreshCw, ThumbsUp,
  ThumbsDown, Copy, MessageSquare, Flame, Droplets, Target,
  ArrowUpRight, Info, Loader2, ChevronDown, BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "ai";
type CardType = "recipe" | "exercise" | "action" | "insight" | null;

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  card?: CardType;
  cardData?: any;
  timestamp: Date;
}

// ─── Context state ────────────────────────────────────────────────────────────

const CONTEXT = {
  calories: { consumed: 1060, target: 1800 },
  allergies: ["Dairy", "Tree nuts"],
  injuries: ["Knee (left)"],
  goals: ["Weight loss", "Build strength"],
  dietType: "Omnivore",
  lastWorkout: "Upper Body — 2 days ago",
  streak: 12,
};

const SUGGESTED_PROMPTS = [
  "What should I eat before my workout tonight?",
  "My knee hurts after yesterday's squat session",
  "Can you suggest a high-protein dairy-free breakfast?",
  "Am I eating enough to support muscle growth?",
  "What's a good substitute for Romanian deadlifts?",
  "How can I improve my sleep for better recovery?",
];

const PAST_CONVERSATIONS = [
  { id: "c1", title: "Pre-workout nutrition advice", date: "Today", preview: "Suggested coconut protein smoothie..." },
  { id: "c2", title: "Knee rehab exercises", date: "Yesterday", preview: "Wall sits and terminal knee extensions..." },
  { id: "c3", title: "Weekly meal plan review", date: "Mon, Mar 23", preview: "Your macros look solid but consider..." },
  { id: "c4", title: "Sleep & recovery strategies", date: "Sat, Mar 21", preview: "Magnesium glycinate before bed..." },
];

// ─── Structured response cards ────────────────────────────────────────────────

function RecipeCard({ data }: { data: any }) {
  return (
    <div className="bg-[#0c0a09] border border-[#292524] rounded-xl p-4 mt-3 max-w-xs">
      <div className="flex items-center gap-2 mb-3">
        <Utensils className="size-3.5 text-[#22c55e]" />
        <span className="text-xs font-semibold text-[#22c55e]">Recipe suggestion</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[#15803d]/20 border border-[#22c55e]/20 text-[#4ade80] rounded-full">
          Dairy-free ✓
        </span>
      </div>
      <p className="text-sm font-semibold text-[#fafaf9] mb-1">{data.name}</p>
      <p className="text-xs text-[#78716c] mb-3">{data.description}</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[{ l: "Calories", v: data.cal }, { l: "Protein", v: data.protein }, { l: "Carbs", v: data.carbs }].map((m) => (
          <div key={m.l} className="bg-[#1c1917] rounded-lg p-2 text-center">
            <p className="text-xs font-semibold text-[#fafaf9]">{m.v}</p>
            <p className="text-[10px] text-[#78716c]">{m.l}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1 mb-3">
        {data.ingredients.map((ing: string) => (
          <div key={ing} className="flex items-center gap-1.5">
            <div className="size-1 rounded-full bg-[#44403c]" />
            <span className="text-[10px] text-[#78716c]">{ing}</span>
          </div>
        ))}
      </div>
      <button className="w-full py-1.5 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/20 text-[#4ade80] text-xs rounded-lg transition-all font-medium">
        Log this meal
      </button>
    </div>
  );
}

function ExerciseCard({ data }: { data: any }) {
  return (
    <div className="bg-[#0c0a09] border border-[#292524] rounded-xl p-4 mt-3 max-w-xs">
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell className="size-3.5 text-[#3b82f6]" />
        <span className="text-xs font-semibold text-[#3b82f6]">Exercise alternative</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[#1d4ed8]/20 border border-[#3b82f6]/20 text-[#60a5fa] rounded-full">
          Knee-safe ✓
        </span>
      </div>
      <p className="text-sm font-semibold text-[#fafaf9] mb-1">{data.name}</p>
      <p className="text-xs text-[#78716c] mb-3">{data.rationale}</p>
      <div className="space-y-1.5">
        {data.cues.map((cue: string) => (
          <div key={cue} className="flex items-start gap-2">
            <Check className="size-3 text-[#3b82f6] mt-0.5 flex-shrink-0" />
            <span className="text-[10px] text-[#a8a29e]">{cue}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 px-3 py-2 bg-[#92400e]/10 border border-[#f59e0b]/20 rounded-lg">
        <p className="text-[10px] text-[#fbbf24]">⚠️ {data.caution}</p>
      </div>
    </div>
  );
}

function InsightCard({ data }: { data: any }) {
  return (
    <div className="bg-[#0c0a09] border border-[#7c3aed]/20 rounded-xl p-4 mt-3 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <Target className="size-3.5 text-[#8b5cf6]" />
        <span className="text-xs font-semibold text-[#8b5cf6]">Progress insight</span>
      </div>
      <div className="space-y-2">
        {data.metrics.map((m: any) => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="text-xs text-[#78716c]">{m.label}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1 bg-[#292524] rounded-full overflow-hidden">
                <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-[#fafaf9]">{m.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === "ai";

  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      {isAI && (
        <div className="size-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="size-3.5 text-white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isAI ? "" : "items-end flex flex-col"}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? "bg-[#1c1917] border border-[#292524] text-[#d6d3d1] rounded-tl-none"
              : "bg-[#4c1d95]/40 border border-[#7c3aed]/20 text-[#c4b5fd] rounded-tr-none"
          }`}
        >
          {msg.text}
        </div>

        {/* Structured cards */}
        {msg.card === "recipe" && msg.cardData && <RecipeCard data={msg.cardData} />}
        {msg.card === "exercise" && msg.cardData && <ExerciseCard data={msg.cardData} />}
        {msg.card === "insight" && msg.cardData && <InsightCard data={msg.cardData} />}

        {/* AI actions */}
        {isAI && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-[10px] text-[#44403c]">
              {msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button className="text-[#44403c] hover:text-[#78716c] transition-colors">
              <Copy className="size-3" />
            </button>
            <button className="text-[#44403c] hover:text-[#22c55e] transition-colors">
              <ThumbsUp className="size-3" />
            </button>
            <button className="text-[#44403c] hover:text-[#ef4444] transition-colors">
              <ThumbsDown className="size-3" />
            </button>
          </div>
        )}
      </div>

      {!isAI && (
        <div className="size-7 rounded-full bg-gradient-to-br from-[#292524] to-[#1c1917] border border-[#44403c] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-[#a8a29e]">SA</span>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="size-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center flex-shrink-0">
        <Sparkles className="size-3.5 text-white" />
      </div>
      <div className="px-4 py-3 bg-[#1c1917] border border-[#292524] rounded-2xl rounded-tl-none">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-1.5 rounded-full bg-[#8b5cf6] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI responses mock ────────────────────────────────────────────────────────

function generateAIResponse(userMsg: string): Omit<Message, "id" | "timestamp"> {
  const lower = userMsg.toLowerCase();

  if (lower.includes("breakfast") || lower.includes("protein")) {
    return {
      role: "ai",
      text: "Great choice focusing on high-protein breakfast! Since you have a dairy allergy, I'm keeping Greek yogurt and cottage cheese out of the mix. Here's a recipe that hits 35g of protein and respects all your restrictions:",
      card: "recipe",
      cardData: {
        name: "Salmon & Egg White Scramble",
        description: "Quick, high-protein, dairy-free breakfast ready in 10 min.",
        cal: "385 kcal",
        protein: "38g",
        carbs: "22g",
        ingredients: [
          "3 egg whites + 1 whole egg",
          "80g smoked salmon (pre-packaged)",
          "1 slice sourdough toast",
          "½ avocado, sliced",
          "Handful baby spinach",
        ],
      },
    };
  }

  if (lower.includes("knee") || lower.includes("squat") || lower.includes("substitute") || lower.includes("deadlift")) {
    return {
      role: "ai",
      text: "Given your left knee history, I'm flagging any high-impact or deep-flex lower body moves. Here's a safe alternative that hits the same posterior chain without stressing the knee joint:",
      card: "exercise",
      cardData: {
        name: "Cable Pull-Through",
        rationale: "Targets glutes and hamstrings with minimal knee flexion — safe for your left knee injury.",
        cues: [
          "Keep feet shoulder-width apart, slight forward lean",
          "Drive through hips, not knees",
          "Pause at top, squeeze glutes",
          "Control the return — don't rush the eccentric",
        ],
        caution: "Stop immediately if you feel any knee discomfort. This should feel in your glutes and hamstrings only.",
      },
    };
  }

  if (lower.includes("progress") || lower.includes("eating enough") || lower.includes("calorie")) {
    return {
      role: "ai",
      text: "Based on your logs this week, here's a quick snapshot of how you're tracking against your goals:",
      card: "insight",
      cardData: {
        metrics: [
          { label: "Calorie adherence", value: "89%", pct: 89, color: "bg-[#22c55e]" },
          { label: "Protein target", value: "76%", pct: 76, color: "bg-[#3b82f6]" },
          { label: "Workout consistency", value: "71%", pct: 71, color: "bg-[#8b5cf6]" },
          { label: "Hydration", value: "63%", pct: 63, color: "bg-[#38bdf8]" },
        ],
      },
    };
  }

  return {
    role: "ai",
    text: "That's a great question. Based on your current profile — weight loss goal, left knee injury, and dairy allergy — I want to make sure any recommendation is both effective and safe for you. Could you give me a bit more context so I can tailor this precisely? For example, are you asking about today's plan specifically, or a general guideline?",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "ai",
      text: "Hey Sara! 👋 I've reviewed your logs from the past 7 days. You're doing well on consistency, but your protein intake has been a bit low mid-week. I've also noted your left knee injury — I'll keep all workout suggestions safe. What can I help you with today?",
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeConv, setActiveConv] = useState("new");
  const [showContext, setShowContext] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text = input.trim()) => {
    if (!text) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiResp = generateAIResponse(text);
      setMessages((prev) => [...prev, { ...aiResp, id: (Date.now() + 1).toString(), timestamp: new Date() }]);
      setIsTyping(false);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Conversation List (desktop) ── */}
      <div className={`
        ${showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:relative inset-y-0 left-0 z-30 w-64 bg-[#0c0a09] border-r border-[#1c1917] flex flex-col
        transition-transform duration-300 lg:transition-none
      `}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1c1917]">
          <p className="text-sm font-semibold text-[#fafaf9]">Conversations</p>
          <button className="p-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] transition-colors">
            <Plus className="size-3.5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <button
            onClick={() => setActiveConv("new")}
            className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
              activeConv === "new" ? "bg-[#4c1d95]/30 border border-[#7c3aed]/30" : "hover:bg-[#1c1917]"
            }`}
          >
            <p className="text-xs font-medium text-[#fafaf9] truncate">Current session</p>
            <p className="text-[10px] text-[#78716c] truncate mt-0.5">
              Pre-workout nutrition advice...
            </p>
          </button>

          {PAST_CONVERSATIONS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                activeConv === conv.id ? "bg-[#4c1d95]/30 border border-[#7c3aed]/30" : "hover:bg-[#1c1917]"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-medium text-[#fafaf9] truncate flex-1">{conv.title}</p>
                <span className="text-[9px] text-[#44403c] flex-shrink-0 ml-1">{conv.date}</span>
              </div>
              <p className="text-[10px] text-[#78716c] truncate">{conv.preview}</p>
            </button>
          ))}
        </div>

        {/* Safety notice */}
        <div className="p-3 border-t border-[#1c1917]">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-[#1c1917] border border-[#292524] rounded-xl">
            <Shield className="size-3 text-[#78716c] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#44403c] leading-relaxed">
              AI responses are not medical advice. Consult professionals for medical decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── Right: Chat Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-4 border-b border-[#1c1917] bg-[#0c0a09] flex-shrink-0">
          <button
            onClick={() => setShowSidebar(true)}
            className="lg:hidden p-1.5 text-[#78716c] hover:text-[#a8a29e] transition-colors"
          >
            <MessageSquare className="size-4" />
          </button>
          <div className="size-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#fafaf9]">Hayetak AI Coach</p>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#22c55e]" />
              <span className="text-[10px] text-[#78716c]">Context-aware · Reading your last 7 days</span>
            </div>
          </div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1c1917] border border-[#292524] hover:border-[#3d3833] rounded-xl text-xs text-[#78716c] hover:text-[#a8a29e] transition-all"
          >
            <Target className="size-3.5" />
            <span className="hidden sm:inline">My context</span>
            <ChevronDown className={`size-3.5 transition-transform ${showContext ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Context chips bar */}
        {showContext && (
          <div className="px-4 lg:px-6 py-3 border-b border-[#1c1917] bg-[#0c0a09]">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#7f1d1d]/20 border border-[#ef4444]/20 rounded-full">
                <AlertCircle className="size-3 text-[#f87171]" />
                <span className="text-[10px] text-[#fca5a5] font-medium">Dairy allergy</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#92400e]/20 border border-[#f59e0b]/20 rounded-full">
                <AlertCircle className="size-3 text-[#f59e0b]" />
                <span className="text-[10px] text-[#fbbf24] font-medium">Left knee injury</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#292524] border border-[#44403c] rounded-full">
                <Target className="size-3 text-[#78716c]" />
                <span className="text-[10px] text-[#78716c]">Weight loss goal</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#292524] border border-[#44403c] rounded-full">
                <Flame className="size-3 text-[#f59e0b]" />
                <span className="text-[10px] text-[#78716c]">Today: 1,060 / 1,800 kcal</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#292524] border border-[#44403c] rounded-full">
                <Dumbbell className="size-3 text-[#78716c]" />
                <span className="text-[10px] text-[#78716c]">Upper Body — 2 days ago</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 && !isTyping && (
          <div className="px-4 lg:px-6 pb-3">
            <p className="text-[10px] text-[#44403c] mb-2 font-medium uppercase tracking-wider">Suggested</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 bg-[#1c1917] border border-[#292524] hover:border-[#44403c] text-[#a8a29e] hover:text-[#d6d3d1] rounded-full transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 lg:px-6 pb-4 pt-2 border-t border-[#1c1917] flex-shrink-0">
          <div className="flex items-end gap-3 bg-[#1c1917] border border-[#292524] focus-within:border-[#7c3aed]/50 rounded-2xl px-4 py-3 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your meals, workouts, recovery..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-[#fafaf9] placeholder-[#44403c] resize-none outline-none leading-relaxed max-h-32"
              style={{ height: "auto" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="size-8 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
            >
              {isTyping ? (
                <Loader2 className="size-4 text-white animate-spin" />
              ) : (
                <Send className="size-4 text-white" />
              )}
            </button>
          </div>

          {/* Safety footer */}
          <div className="flex items-center gap-1.5 mt-2 px-1">
            <Shield className="size-3 text-[#44403c]" />
            <p className="text-[10px] text-[#44403c]">
              Not medical advice · Always consult a qualified professional for health decisions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
