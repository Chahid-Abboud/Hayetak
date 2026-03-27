import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Brain,
  Utensils,
  Dumbbell,
  MapPin,
  MessageSquare,
  Calendar,
  Shield,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Check,
  Star,
  Activity,
  Target,
  Zap,
  Lock,
  Users,
  TrendingUp,
  Heart,
  AlertCircle,
  Menu,
  X,
  Play,
  Apple,
  ChevronDown,
  BarChart3,
  Clock,
  Flame,
  Droplets,
} from "lucide-react";

// ─── NAV ─────────────────────────────────────────────────────────────────────

function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0c0a09]/95 backdrop-blur-md border-b border-[#292524] shadow-xl"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Heart className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[#fafaf9] font-semibold tracking-tight">
              Hayetak
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works", "For Professionals", "Pricing"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-[#a8a29e] hover:text-[#fafaf9] transition-colors text-sm font-medium"
                >
                  {item}
                </a>
              )
            )}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-[#a8a29e] hover:text-[#fafaf9] transition-colors text-sm font-medium px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/30"
            >
              Get started free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#a8a29e] hover:text-[#fafaf9] transition-colors"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#1c1917] border-t border-[#292524]">
          <div className="px-6 py-4 space-y-4">
            {["Features", "How it works", "For Professionals", "Pricing"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="block text-[#a8a29e] hover:text-[#fafaf9] transition-colors text-sm font-medium py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {item}
                </a>
              )
            )}
            <div className="border-t border-[#292524] pt-4 flex flex-col gap-3">
              <Link
                to="/login"
                className="text-[#a8a29e] hover:text-[#fafaf9] transition-colors text-sm font-medium py-2 text-center"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="py-2.5 bg-[#7c3aed] text-white rounded-lg text-sm font-medium text-center transition-colors"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/20 to-[#4c1d95]/10 rounded-2xl blur-2xl scale-110" />
      
      <div className="relative bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
        {/* Mock header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#292524]">
          <div className="size-2.5 rounded-full bg-[#ef4444]/80" />
          <div className="size-2.5 rounded-full bg-[#f59e0b]/80" />
          <div className="size-2.5 rounded-full bg-[#22c55e]/80" />
          <div className="flex-1 mx-3 h-5 bg-[#292524] rounded-md" />
        </div>

        <div className="p-4 space-y-3">
          {/* Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#78716c]">Good morning 👋</p>
              <p className="text-sm font-semibold text-[#fafaf9]">Sarah's Dashboard</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#292524] rounded-full">
              <Flame className="size-3 text-[#f59e0b]" />
              <span className="text-xs text-[#fafaf9] font-medium">12 day streak</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Calories", value: "1,420", total: "1,800", color: "bg-[#8b5cf6]", pct: 79 },
              { label: "Protein", value: "82g", total: "120g", color: "bg-[#3b82f6]", pct: 68 },
              { label: "Water", value: "6", total: "8 cups", color: "bg-[#22c55e]", pct: 75 },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#292524] rounded-xl p-2.5">
                <p className="text-[10px] text-[#78716c] mb-0.5">{stat.label}</p>
                <p className="text-sm font-semibold text-[#fafaf9]">{stat.value}</p>
                <p className="text-[10px] text-[#a8a29e]">/ {stat.total}</p>
                <div className="mt-1.5 h-1 bg-[#44403c] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stat.color} rounded-full`}
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Meal Timeline */}
          <div className="bg-[#292524] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#fafaf9]">Today's Meals</p>
              <span className="text-[10px] text-[#8b5cf6] font-medium">AI-planned</span>
            </div>
            {[
              { time: "8:00 AM", name: "Avocado Toast + Eggs", cal: 420, done: true },
              { time: "12:30 PM", name: "Grilled Salmon Bowl", cal: 580, done: true },
              { time: "7:00 PM", name: "Lentil Soup + Salad", cal: 380, done: false },
            ].map((meal) => (
              <div key={meal.time} className="flex items-center gap-2.5">
                <div
                  className={`size-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    meal.done ? "bg-[#22c55e]/20 border border-[#22c55e]/40" : "border border-[#44403c]"
                  }`}
                >
                  {meal.done && <Check className="size-2.5 text-[#22c55e]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#fafaf9] truncate">{meal.name}</p>
                  <p className="text-[10px] text-[#78716c]">{meal.time}</p>
                </div>
                <span className="text-[10px] text-[#a8a29e] flex-shrink-0">{meal.cal} kcal</span>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div className="bg-gradient-to-r from-[#4c1d95]/30 to-[#1c1917] border border-[#7c3aed]/30 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="size-3 text-[#8b5cf6]" />
              </div>
              <div>
                <p className="text-[10px] text-[#8b5cf6] font-medium mb-0.5">AI Insight</p>
                <p className="text-[10px] text-[#a8a29e] leading-relaxed">
                  You're 180 kcal under today. Consider a protein snack before your evening workout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0c0a09]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7c3aed]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#4c1d95]/15 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-0 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#4c1d95]/30 border border-[#7c3aed]/30 rounded-full">
              <Sparkles className="size-3.5 text-[#8b5cf6]" />
              <span className="text-xs text-[#a78bfa] font-medium">
                AI-Powered Health Operating System
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-extrabold text-[#fafaf9] leading-[1.1] tracking-tight">
                Your Health,{" "}
                <span className="bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] bg-clip-text text-transparent">
                  Intelligently
                </span>{" "}
                Managed
              </h1>
              <p className="text-lg text-[#a8a29e] leading-relaxed max-w-lg">
                Create your profile. Get a personalized AI plan. Track your meals and workouts. 
                Receive adaptive coaching that evolves with you — safely and smartly.
              </p>
            </div>

            {/* Story Steps */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Users, label: "Build Profile" },
                { icon: Brain, label: "AI Plan" },
                { icon: Activity, label: "Track Progress" },
                { icon: Sparkles, label: "Adaptive Coaching" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="size-3.5 text-[#44403c]" />}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1c1917] border border-[#292524] rounded-lg">
                    <step.icon className="size-3.5 text-[#8b5cf6]" />
                    <span className="text-xs text-[#d6d3d1] font-medium">{step.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-900/40 text-sm"
              >
                Start for free
                <ArrowRight className="size-4" />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1c1917] hover:bg-[#292524] text-[#d6d3d1] border border-[#292524] rounded-xl font-semibold transition-all text-sm">
                <Play className="size-4 text-[#8b5cf6]" />
                See how it works
              </button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { icon: Lock, text: "Encrypted & private" },
                { icon: Shield, text: "Safety-first AI" },
                { icon: Check, text: "No credit card" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5">
                  <item.icon className="size-3.5 text-[#22c55e]" />
                  <span className="text-xs text-[#78716c]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="relative">
            <DashboardMockup />
            {/* Floating badges */}
            <div className="absolute -top-4 -left-4 lg:-left-8 bg-[#1c1917] border border-[#292524] rounded-xl px-3 py-2 shadow-xl hidden sm:flex items-center gap-2">
              <div className="size-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                <TrendingUp className="size-3.5 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-[10px] text-[#78716c]">This week</p>
                <p className="text-xs font-semibold text-[#fafaf9]">−0.8kg progress</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 lg:-right-8 bg-[#1c1917] border border-[#292524] rounded-xl px-3 py-2 shadow-xl hidden sm:flex items-center gap-2">
              <div className="size-6 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
                <Brain className="size-3.5 text-[#8b5cf6]" />
              </div>
              <div>
                <p className="text-[10px] text-[#78716c]">AI Coaching</p>
                <p className="text-xs font-semibold text-[#fafaf9]">Adapted to your injuries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-16">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <ChevronDown className="size-4 text-[#44403c]" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Users,
      title: "Build Your Health Profile",
      description:
        "Share your goals, dietary preferences, allergies, medical history, and injury profile. The more we know, the safer and smarter your plan becomes.",
      highlights: ["Age, sex, weight & height", "Allergies & diet type", "Medical & injury history"],
      color: "from-[#7c3aed] to-[#8b5cf6]",
    },
    {
      number: "02",
      icon: Brain,
      title: "Generate Your AI Plan",
      description:
        "Our AI synthesizes your entire profile to generate a personalized nutrition and workout plan — safe, realistic, and built around you.",
      highlights: ["Personalized calorie targets", "Custom macro distribution", "Injury-aware workouts"],
      color: "from-[#3b82f6] to-[#6d28d9]",
    },
    {
      number: "03",
      icon: Activity,
      title: "Log Meals & Workouts",
      description:
        "Track your daily meals across breakfast, lunch, dinner, and snacks. Log sets, reps, and weights for every workout — all in one place.",
      highlights: ["Timeline meal logging", "Active workout tracking", "Progress charts"],
      color: "from-[#22c55e] to-[#3b82f6]",
    },
    {
      number: "04",
      icon: Sparkles,
      title: "Get Adaptive Coaching",
      description:
        "Your AI coach monitors your last 7 days, current restrictions, and goals to give context-aware guidance that evolves as you do.",
      highlights: ["Context-aware suggestions", "Safety-first responses", "Injury & allergy aware"],
      color: "from-[#f59e0b] to-[#22c55e]",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0c0a09] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1c1917] border border-[#292524] rounded-full">
            <span className="text-xs text-[#78716c] font-medium">How it works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#fafaf9] tracking-tight">
            Your health journey, step by step
          </h2>
          <p className="text-[#a8a29e] max-w-xl mx-auto leading-relaxed">
            From first profile to first result, Hayetak guides you through every stage with
            intelligent, personalized, and safety-conscious support.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative bg-[#1c1917] border border-[#292524] rounded-2xl p-6 hover:border-[#3d3833] transition-all group"
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-3 w-6 h-px bg-gradient-to-r from-[#292524] to-transparent z-10" />
              )}

              {/* Step number */}
              <div className="text-6xl font-extrabold text-[#292524] leading-none mb-4 select-none group-hover:text-[#3d3833] transition-colors">
                {step.number}
              </div>

              {/* Icon */}
              <div
                className={`size-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg`}
              >
                <step.icon className="size-5 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-[#fafaf9] font-semibold mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-sm text-[#a8a29e] leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Highlights */}
              <ul className="space-y-1.5">
                {step.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#22c55e] flex-shrink-0" />
                    <span className="text-xs text-[#78716c]">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "AI Nutrition Planning",
      description:
        "Personalized meal plans that respect your allergies, diet type, caloric targets, and medical conditions.",
      badge: "AI-Powered",
      badgeColor: "bg-[#4c1d95]/30 text-[#a78bfa] border-[#7c3aed]/30",
    },
    {
      icon: Dumbbell,
      title: "Smart Workout Plans",
      description:
        "Custom programs built around your goals, fitness level, available equipment, and injury history.",
      badge: "Adaptive",
      badgeColor: "bg-[#1d4ed8]/20 text-[#60a5fa] border-[#3b82f6]/30",
    },
    {
      icon: Activity,
      title: "Detailed Tracking",
      description:
        "Timeline-based meal and workout logging with visual progress, macro breakdowns, and volume tracking.",
      badge: "Real-time",
      badgeColor: "bg-[#15803d]/20 text-[#4ade80] border-[#22c55e]/30",
    },
    {
      icon: MessageSquare,
      title: "AI Coach",
      description:
        "A context-aware health coach that knows your last 7 days, restrictions, and goals. Safe suggestions, always.",
      badge: "Context-aware",
      badgeColor: "bg-[#92400e]/20 text-[#fbbf24] border-[#f59e0b]/30",
    },
    {
      icon: Users,
      title: "Professional Network",
      description:
        "Connect with verified trainers and nutritionists. Book appointments, share plans, message securely.",
      badge: "Verified",
      badgeColor: "bg-[#14532d]/20 text-[#4ade80] border-[#22c55e]/30",
    },
    {
      icon: MapPin,
      title: "Nearby Discovery",
      description:
        "Find gyms, healthy restaurants, and health professionals near you. Bookmark favorites for quick access.",
      badge: "Location",
      badgeColor: "bg-[#7f1d1d]/20 text-[#f87171] border-[#ef4444]/30",
    },
  ];

  return (
    <section id="features" className="py-24 bg-[#1c1917] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0c0a09] border border-[#292524] rounded-full">
            <span className="text-xs text-[#78716c] font-medium">Platform features</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#fafaf9] tracking-tight">
            Everything your health needs, unified
          </h2>
          <p className="text-[#a8a29e] max-w-xl mx-auto leading-relaxed">
            Hayetak combines nutrition, fitness, coaching, and community into one premium,
            AI-powered health operating system.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#0c0a09] border border-[#292524] rounded-2xl p-6 hover:border-[#3d3833] hover:-translate-y-1 transition-all group cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-10 rounded-xl bg-[#1c1917] border border-[#292524] flex items-center justify-center group-hover:border-[#3d3833] transition-colors">
                  <feature.icon className="size-5 text-[#8b5cf6]" />
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${feature.badgeColor}`}
                >
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-[#fafaf9] font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[#a8a29e] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRODUCT PREVIEWS ─────────────────────────────────────────────────────────

function MealPlannerPreview() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#292524] flex items-center justify-between">
        <div>
          <p className="text-xs text-[#78716c]">Wednesday, March 25</p>
          <p className="font-semibold text-[#fafaf9]">Today's Meal Plan</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#4c1d95]/30 border border-[#7c3aed]/30 rounded-full">
          <Sparkles className="size-3 text-[#8b5cf6]" />
          <span className="text-[10px] text-[#a78bfa] font-medium">AI-Optimized</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Calorie progress */}
        <div className="bg-[#292524] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#fafaf9]">Daily Calories</span>
            <span className="text-sm text-[#a8a29e]">1,380 / 1,800</span>
          </div>
          <div className="h-2 bg-[#44403c] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] rounded-full" style={{ width: "77%" }} />
          </div>
          <div className="flex gap-4 mt-3">
            {[
              { label: "Protein", val: "88g", color: "bg-[#3b82f6]", pct: 73 },
              { label: "Carbs", val: "142g", color: "bg-[#f59e0b]", pct: 60 },
              { label: "Fat", val: "44g", color: "bg-[#22c55e]", pct: 82 },
            ].map((m) => (
              <div key={m.label} className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-[#78716c]">{m.label}</span>
                  <span className="text-[10px] text-[#a8a29e]">{m.val}</span>
                </div>
                <div className="h-1 bg-[#44403c] rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meals */}
        {[
          { icon: "🌅", time: "Breakfast · 7:30 AM", name: "Oat Porridge with Berries", cal: 360, tag: "Low glycemic", done: true },
          { icon: "☀️", time: "Lunch · 12:00 PM", name: "Grilled Chicken Caesar (no croutons)", cal: 520, tag: "Gluten-free ✓", done: true },
          { icon: "🌙", time: "Dinner · 7:00 PM", name: "Salmon with Roasted Veg", cal: 500, tag: "High omega-3", done: false },
        ].map((meal) => (
          <div key={meal.time} className="flex items-center gap-3 py-2 border-b border-[#292524] last:border-0">
            <div className="text-xl leading-none">{meal.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#78716c]">{meal.time}</p>
              <p className="text-sm font-medium text-[#fafaf9] truncate">{meal.name}</p>
              <span className="text-[10px] text-[#22c55e]">{meal.tag}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#fafaf9]">{meal.cal}</p>
              <p className="text-[10px] text-[#78716c]">kcal</p>
            </div>
            <div className={`size-5 rounded-full flex items-center justify-center flex-shrink-0 ${meal.done ? "bg-[#22c55e]/20" : "border border-[#44403c]"}`}>
              {meal.done && <Check className="size-3 text-[#22c55e]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkoutLogPreview() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#292524] flex items-center justify-between">
        <div>
          <p className="text-xs text-[#78716c]">Day 3 / Week 2</p>
          <p className="font-semibold text-[#fafaf9]">Upper Body Strength</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1d4ed8]/20 border border-[#3b82f6]/30 rounded-full">
          <Clock className="size-3 text-[#3b82f6]" />
          <span className="text-[10px] text-[#60a5fa] font-medium">38:22</span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {/* Progress */}
        <div className="bg-[#292524] rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#a8a29e]">Progress</span>
          <span className="text-sm font-semibold text-[#fafaf9]">4 of 6 exercises</span>
        </div>
        <div className="h-2 bg-[#292524] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full" style={{ width: "67%" }} />
        </div>

        {/* Exercises */}
        {[
          { name: "Bench Press", sets: [{w:60,r:10,done:true},{w:65,r:8,done:true},{w:70,r:6,done:true}] },
          { name: "Lat Pulldown", sets: [{w:55,r:12,done:true},{w:60,r:10,done:false},{w:60,r:10,done:false}] },
          { name: "Shoulder Press", sets: [{w:40,r:10,done:false},{w:40,r:10,done:false},{w:40,r:10,done:false}] },
        ].map((ex) => (
          <div key={ex.name} className="bg-[#292524] rounded-xl p-3">
            <p className="text-sm font-medium text-[#fafaf9] mb-2">{ex.name}</p>
            <div className="flex gap-2">
              {ex.sets.map((set, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center py-2 rounded-lg text-[10px] ${
                    set.done
                      ? "bg-[#1d4ed8]/20 border border-[#3b82f6]/30 text-[#60a5fa]"
                      : "bg-[#44403c] text-[#78716c]"
                  }`}
                >
                  <div className="font-semibold">{set.w}kg</div>
                  <div>×{set.r}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Injury note */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#92400e]/10 border border-[#f59e0b]/20 rounded-xl">
          <AlertCircle className="size-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#fbbf24]">Shoulder exercise modified for your rotator cuff history</p>
        </div>
      </div>
    </div>
  );
}

function AiCoachPreview() {
  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#292524] flex items-center gap-3">
        <div className="size-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center">
          <Sparkles className="size-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#fafaf9]">Hayetak AI Coach</p>
          <div className="flex items-center gap-1">
            <div className="size-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[10px] text-[#78716c]">Context-aware · Online</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {/* Context chips */}
        <div className="flex flex-wrap gap-1.5">
          {["Dairy allergy ⚠️", "Weight loss goal", "Knee injury", "Today: 1,380 kcal"].map((c) => (
            <span key={c} className="text-[10px] px-2 py-0.5 bg-[#292524] text-[#78716c] rounded-full">
              {c}
            </span>
          ))}
        </div>

        {/* Chat messages */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="size-6 rounded-full bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="size-3 text-[#8b5cf6]" />
            </div>
            <div className="bg-[#292524] rounded-xl rounded-tl-none px-3 py-2.5 max-w-[85%]">
              <p className="text-xs text-[#d6d3d1] leading-relaxed">
                Good morning! Based on your goal to lose weight and your <span className="text-[#f59e0b]">dairy allergy</span>, I've swapped your usual Greek yogurt for a coconut-based alternative in today's breakfast. You're 420 kcal in so far — on track!
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <div className="bg-[#4c1d95]/40 border border-[#7c3aed]/20 rounded-xl rounded-tr-none px-3 py-2.5 max-w-[85%]">
              <p className="text-xs text-[#c4b5fd]">Can I eat carbs after 6pm? I heard it causes weight gain.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="size-6 rounded-full bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="size-3 text-[#8b5cf6]" />
            </div>
            <div className="bg-[#292524] rounded-xl rounded-tl-none px-3 py-2.5 max-w-[85%]">
              <p className="text-xs text-[#d6d3d1] leading-relaxed">
                That's a common myth! Total daily calories matter more than timing. Since you've done upper body today and have 420 kcal remaining, a small carb-rich snack like oat crackers would actually help with muscle recovery.
              </p>
            </div>
          </div>
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#1c1917] border border-[#292524] rounded-xl">
          <Shield className="size-3.5 text-[#78716c] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#78716c]">AI responses are not medical advice. Always consult a healthcare professional for medical decisions.</p>
        </div>
      </div>
    </div>
  );
}

function NearbyPreview() {
  const places = [
    { emoji: "🏋️", name: "FitZone Gym", type: "Gym", dist: "0.3 km", rating: 4.8, tag: "24/7 Open" },
    { emoji: "🥗", name: "Green Bowl Kitchen", type: "Restaurant", dist: "0.7 km", rating: 4.6, tag: "Calorie-labeled" },
    { emoji: "👩‍⚕️", name: "Dr. Sara Khalil", type: "Nutritionist", dist: "1.2 km", rating: 5.0, tag: "Verified" },
  ];

  return (
    <div className="bg-[#1c1917] border border-[#292524] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#292524] flex items-center justify-between">
        <div>
          <p className="text-xs text-[#78716c]">Near you · Dubai Marina</p>
          <p className="font-semibold text-[#fafaf9]">Nearby Discovery</p>
        </div>
        <div className="flex gap-1.5">
          {["All", "Gyms", "Food"].map((f, i) => (
            <button
              key={f}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                i === 0 ? "bg-[#7c3aed] text-white" : "bg-[#292524] text-[#78716c]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-3">
        {/* Mini map placeholder */}
        <div className="bg-[#292524] rounded-xl h-28 flex items-center justify-center border border-[#3d3833] overflow-hidden relative">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `radial-gradient(circle at 30% 60%, #7c3aed 1px, transparent 1px), radial-gradient(circle at 70% 40%, #3b82f6 1px, transparent 1px), radial-gradient(circle at 50% 50%, #22c55e 2px, transparent 2px)`,
            backgroundSize: "30px 30px, 40px 40px, 25px 25px",
          }} />
          <MapPin className="size-6 text-[#7c3aed]" />
          <p className="text-xs text-[#78716c] ml-2">Interactive map</p>
        </div>

        {places.map((place) => (
          <div
            key={place.name}
            className="flex items-center gap-3 p-3 bg-[#292524] rounded-xl hover:bg-[#3d3833] transition-colors cursor-pointer"
          >
            <div className="size-10 rounded-xl bg-[#44403c] flex items-center justify-center text-xl flex-shrink-0">
              {place.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-[#fafaf9] truncate">{place.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#22c55e]/10 text-[#4ade80] rounded-full border border-[#22c55e]/20 flex-shrink-0">
                  {place.tag}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#78716c]">{place.type}</span>
                <span className="text-[10px] text-[#78716c]">·</span>
                <span className="text-[10px] text-[#78716c]">{place.dist}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="size-3 text-[#f59e0b] fill-[#f59e0b]" />
              <span className="text-xs font-medium text-[#fafaf9]">{place.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPreviewSection() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { label: "Meal Planner", icon: Utensils, preview: <MealPlannerPreview /> },
    { label: "Workout Log", icon: Dumbbell, preview: <WorkoutLogPreview /> },
    { label: "AI Coach", icon: Brain, preview: <AiCoachPreview /> },
    { label: "Nearby", icon: MapPin, preview: <NearbyPreview /> },
  ];

  return (
    <section className="py-24 bg-[#0c0a09] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1c1917] border border-[#292524] rounded-full">
            <span className="text-xs text-[#78716c] font-medium">Product preview</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#fafaf9] tracking-tight">
            A product built for real life
          </h2>
          <p className="text-[#a8a29e] max-w-xl mx-auto leading-relaxed">
            Every screen is designed around clarity, safety, and actionability. See what
            awaits you inside Hayetak.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === i
                  ? "bg-[#7c3aed] text-white shadow-lg shadow-purple-900/30"
                  : "bg-[#1c1917] text-[#a8a29e] border border-[#292524] hover:border-[#3d3833]"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview Area */}
        <div className="max-w-lg mx-auto">
          {tabs[activeTab].preview}
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sara Al-Rashidi",
      role: "Lost 14kg in 5 months",
      avatar: "https://images.unsplash.com/photo-1656009178152-1e4402050560?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbGlmZXN0eWxlJTIwd29tYW4lMjB3ZWxsbmVzcyUyMGFwcHxlbnwxfHx8fDE3NzQ0Mzc4NTd8MA&ixlib=rb-4.1.0&q=80&w=400",
      quote:
        "Hayetak adapted every meal plan around my nut allergy without me having to ask twice. The AI coach knew exactly what I needed after a bad week. It felt genuinely personal.",
      stars: 5,
      highlight: "Allergy-safe plans",
    },
    {
      name: "Ahmad Hassan",
      role: "Gained 8kg of muscle",
      avatar: "https://images.unsplash.com/photo-1682616324443-ca6b19317e0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRpYyUyMG1hbiUyMGZpdG5lc3MlMjB0cmFpbmluZ3xlbnwxfHx8fDE3NzQ0Mzc4NTd8MA&ixlib=rb-4.1.0&q=80&w=400",
      quote:
        "I told it about my old knee injury and it never once gave me an exercise that would stress it. The progressive overload tracking is incredible — I've hit PRs I never thought possible.",
      stars: 5,
      highlight: "Injury-aware workouts",
    },
    {
      name: "Dr. Layla Khoury",
      role: "Certified Nutritionist",
      avatar: "https://images.unsplash.com/photo-1601341348280-550b5e87281b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBudXRyaXRpb25pc3QlMjB3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NDQwNTc2N3ww&ixlib=rb-4.1.0&q=80&w=400",
      quote:
        "The professional dashboard gives me a complete picture of each client's nutrition without chasing them for updates. My client retention improved 40% since I joined Hayetak.",
      stars: 5,
      highlight: "Professional tools",
    },
  ];

  return (
    <section className="py-24 bg-[#1c1917] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0c0a09] border border-[#292524] rounded-full">
            <Star className="size-3 text-[#f59e0b] fill-[#f59e0b]" />
            <span className="text-xs text-[#78716c] font-medium">Trusted by thousands</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#fafaf9] tracking-tight">
            Real results from real people
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-[#0c0a09] border border-[#292524] rounded-2xl p-6 flex flex-col gap-4 hover:border-[#3d3833] transition-all"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="size-3.5 text-[#f59e0b] fill-[#f59e0b]" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-[#a8a29e] leading-relaxed flex-1">
                "{t.quote}"
              </blockquote>

              {/* Highlight */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#4c1d95]/20 border border-[#7c3aed]/20 rounded-full self-start">
                <Check className="size-3 text-[#8b5cf6]" />
                <span className="text-[10px] text-[#a78bfa] font-medium">{t.highlight}</span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#292524]">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="size-9 rounded-full object-cover border border-[#292524]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#fafaf9]">{t.name}</p>
                  <p className="text-xs text-[#78716c]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 pt-10 border-t border-[#292524]">
          {[
            { value: "50K+", label: "Active Users" },
            { value: "2.1M", label: "Meals Tracked" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "4.9★", label: "App Rating" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl lg:text-3xl font-extrabold text-[#fafaf9]">{stat.value}</p>
              <p className="text-sm text-[#78716c] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TRUST SECTION ────────────────────────────────────────────────────────────

function TrustSection() {
  return (
    <section className="py-20 bg-[#0c0a09] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#1c1917] to-[#0c0a09] border border-[#292524] rounded-3xl p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="size-12 rounded-2xl bg-[#292524] flex items-center justify-center">
                <Shield className="size-6 text-[#8b5cf6]" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-[#fafaf9]">
                Safety and trust at the core
              </h2>
              <p className="text-[#a8a29e] leading-relaxed">
                Hayetak is designed with medical safety as a foundational principle — not an
                afterthought. Your allergies, medical conditions, and injury history are treated
                with the respect they deserve.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-sm text-[#8b5cf6] hover:text-[#a78bfa] font-medium transition-colors"
              >
                Start your safe health journey <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: AlertCircle, title: "Allergy-Safe", desc: "Every plan checks your allergy profile before suggesting foods.", color: "text-[#f59e0b]", bg: "bg-[#92400e]/20 border-[#f59e0b]/20" },
                { icon: Lock, title: "Data Encrypted", desc: "All health data is end-to-end encrypted and never sold.", color: "text-[#22c55e]", bg: "bg-[#15803d]/20 border-[#22c55e]/20" },
                { icon: Shield, title: "Injury-Aware", desc: "Workout AI checks your injury history for every exercise.", color: "text-[#3b82f6]", bg: "bg-[#1d4ed8]/20 border-[#3b82f6]/20" },
                { icon: Heart, title: "Medically Cautious", desc: "AI responses flag medical conditions and recommend professionals.", color: "text-[#ef4444]", bg: "bg-[#7f1d1d]/20 border-[#ef4444]/20" },
              ].map((item) => (
                <div key={item.title} className={`bg-[#1c1917] border ${item.bg} rounded-xl p-4 space-y-2`}>
                  <item.icon className={`size-5 ${item.color}`} />
                  <p className="text-sm font-semibold text-[#fafaf9]">{item.title}</p>
                  <p className="text-xs text-[#78716c] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA SECTION ──────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-24 bg-[#0c0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#4c1d95]/20 via-transparent to-[#1d4ed8]/10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#292524] to-transparent" />
      <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center space-y-8">
        <h2 className="text-3xl lg:text-5xl font-extrabold text-[#fafaf9] tracking-tight">
          Ready to take control of your health?
        </h2>
        <p className="text-lg text-[#a8a29e] leading-relaxed">
          Join 50,000+ people building healthier habits with personalized AI guidance.
          Free to start, no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-base transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-900/40"
          >
            Create your free account
            <ArrowRight className="size-5" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1c1917] text-[#d6d3d1] border border-[#292524] rounded-xl font-semibold text-base transition-all hover:bg-[#292524]"
          >
            Sign in to your account
          </Link>
        </div>
        <p className="text-xs text-[#44403c]">
          Are you a trainer or nutritionist?{" "}
          <Link to="/register" className="text-[#8b5cf6] hover:underline">
            Create a professional account →
          </Link>
        </p>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#0c0a09] border-t border-[#1c1917]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
                <Heart className="size-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[#fafaf9] font-semibold">Hayetak</span>
            </div>
            <p className="text-sm text-[#78716c] leading-relaxed">
              Your personal health operating system. AI-powered, safety-first, built for real life.
            </p>
            <p className="text-xs text-[#44403c]">© 2026 Hayetak. All rights reserved.</p>
          </div>

          {/* Links */}
          {[
            {
              title: "Product",
              links: ["Features", "How it works", "Pricing", "For Professionals", "Download App"],
            },
            {
              title: "Company",
              links: ["About", "Blog", "Careers", "Press", "Contact"],
            },
            {
              title: "Legal",
              links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "HIPAA Notice", "Accessibility"],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1c1917] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {[
              { icon: Shield, text: "GDPR Compliant" },
              { icon: Lock, text: "256-bit Encryption" },
              { icon: Heart, text: "Safety-First AI" },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-1.5">
                <badge.icon className="size-3.5 text-[#44403c]" />
                <span className="text-xs text-[#44403c]">{badge.text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#44403c]">
            Hayetak is not a medical service. Always consult qualified healthcare professionals.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="bg-[#0c0a09] min-h-screen">
      <PublicNav />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ProductPreviewSection />
      <TestimonialsSection />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  );
}
