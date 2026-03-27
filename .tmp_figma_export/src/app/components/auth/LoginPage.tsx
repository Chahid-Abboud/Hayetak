import { useState } from "react";
import { Link } from "react-router";
import {
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  AlertCircle,
  Brain,
  Activity,
  Dumbbell,
} from "lucide-react";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  label,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#d6d3d1]">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Lock className="size-4 text-[#78716c]" />
        </div>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] ${
            error ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#a8a29e] transition-colors"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-[#ef4444] flex items-center gap-1">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}
    </div>
  );
}

const BRAND_FEATURES = [
  {
    icon: Brain,
    title: "AI-personalized plans",
    desc: "Nutrition and workout plans built from your unique profile.",
  },
  {
    icon: Activity,
    title: "Context-aware coaching",
    desc: "Your AI coach knows today's meals, last 7 days, and your goals.",
  },
  {
    icon: Shield,
    title: "Allergy & injury safe",
    desc: "Every recommendation checks your restrictions and history.",
  },
  {
    icon: Dumbbell,
    title: "Track everything",
    desc: "Meals, workouts, water, sleep — one intelligent home for it all.",
  },
];

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setErrors({ general: "Invalid email or password. Please try again." });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] flex">
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1917] via-[#0c0a09] to-[#1c1917]" />
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-[#4c1d95]/20 to-transparent" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#4c1d95]/10 blur-3xl" />

        {/* Content */}
        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-12">
            <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Heart className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[#fafaf9] font-semibold tracking-tight">Hayetak</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 mb-10">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-[#fafaf9] leading-tight tracking-tight">
              Welcome back to{" "}
              <span className="bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] bg-clip-text text-transparent">
                your health OS
              </span>
            </h1>
            <p className="text-[#a8a29e] leading-relaxed">
              Pick up right where you left off. Your AI plans, logs, and coaching history are waiting for you.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {BRAND_FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="size-8 rounded-xl bg-[#1c1917] border border-[#292524] flex items-center justify-center flex-shrink-0">
                  <f.icon className="size-4 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#fafaf9]">{f.title}</p>
                  <p className="text-xs text-[#78716c] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust */}
        <div className="relative border-t border-[#292524] pt-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Lock, text: "256-bit encrypted" },
              { icon: Shield, text: "GDPR compliant" },
              { icon: Check, text: "No ads, ever" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5">
                <item.icon className="size-3.5 text-[#44403c]" />
                <span className="text-xs text-[#44403c]">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#44403c]">
            Hayetak is not a medical service. Consult a qualified professional for medical decisions.
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:py-0">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10 self-start">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <Heart className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[#fafaf9] font-semibold">Hayetak</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#fafaf9] mb-1.5">Sign in</h2>
            <p className="text-sm text-[#78716c]">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#8b5cf6] hover:text-[#a78bfa] font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          {/* Error Banner */}
          {errors.general && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-[#7f1d1d]/20 border border-[#ef4444]/30 rounded-xl">
              <AlertCircle className="size-4 text-[#ef4444] flex-shrink-0" />
              <p className="text-sm text-[#fca5a5]">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-[#d6d3d1]">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Mail className="size-4 text-[#78716c]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] ${
                    errors.email ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-[#ef4444] flex items-center gap-1">
                  <AlertCircle className="size-3" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              error={errors.password}
            />

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`size-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    rememberMe ? "bg-[#7c3aed] border-[#7c3aed]" : "border-[#44403c] bg-[#292524]"
                  }`}
                >
                  {rememberMe && <Check className="size-2.5 text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm text-[#a8a29e] group-hover:text-[#d6d3d1] transition-colors select-none">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-[#8b5cf6] hover:text-[#a78bfa] font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#292524]" />
            <span className="text-xs text-[#44403c]">or continue with</span>
            <div className="flex-1 h-px bg-[#292524]" />
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Google",
                icon: (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ),
              },
              {
                label: "Apple",
                icon: <Heart className="size-4 text-[#fafaf9]" />,
              },
            ].map((social) => (
              <button
                key={social.label}
                className="flex items-center justify-center gap-2 py-2.5 bg-[#1c1917] hover:bg-[#292524] border border-[#292524] hover:border-[#3d3833] rounded-xl text-sm text-[#d6d3d1] font-medium transition-all"
              >
                {social.icon}
                {social.label}
              </button>
            ))}
          </div>

          {/* Security note */}
          <div className="mt-6 flex items-start gap-2 px-3 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
            <Shield className="size-3.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#78716c] leading-relaxed">
              Secured with 256-bit TLS encryption. We never share your health data with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
