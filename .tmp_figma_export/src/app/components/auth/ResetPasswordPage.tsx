import { useState } from "react";
import { Link, useParams } from "react-router";
import { Heart, Lock, Eye, EyeOff, Shield, Check, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

function getPasswordStrength(pw: string): { score: number; label: string; color: string; barColor: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too short", color: "text-[#ef4444]", barColor: "bg-[#ef4444]" },
    { label: "Weak", color: "text-[#f97316]", barColor: "bg-[#f97316]" },
    { label: "Fair", color: "text-[#f59e0b]", barColor: "bg-[#f59e0b]" },
    { label: "Good", color: "text-[#22c55e]", barColor: "bg-[#22c55e]" },
    { label: "Strong", color: "text-[#22c55e]", barColor: "bg-[#22c55e]" },
    { label: "Very strong", color: "text-[#8b5cf6]", barColor: "bg-[#8b5cf6]" },
  ];
  return { score, ...levels[Math.min(score, 5)] };
}

export function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const strength = getPasswordStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (!password) err.password = "Password is required";
    else if (password.length < 8) err.password = "Minimum 8 characters";
    else if (strength.score < 2) err.password = "Please choose a stronger password";
    if (password !== confirmPassword) err.confirm = "Passwords don't match";
    if (Object.keys(err).length) { setErrors(err); return; }
    setErrors({});
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setSubmitted(true); }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="flex items-center gap-2.5 mb-12">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <Heart className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[#fafaf9] font-semibold tracking-tight">Hayetak</span>
        </Link>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="relative mx-auto size-16">
            <div className="size-16 rounded-full bg-[#4c1d95]/30 border border-[#7c3aed]/40 flex items-center justify-center">
              <Check className="size-8 text-[#8b5cf6]" />
            </div>
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-[#22c55e] flex items-center justify-center">
              <Lock className="size-3.5 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#fafaf9]">Password updated!</h2>
            <p className="text-sm text-[#78716c] leading-relaxed">
              Your password has been changed successfully. All active sessions have been signed out for security.
            </p>
          </div>
          <div className="bg-[#1c1917] border border-[#292524] rounded-xl p-4 text-left">
            <div className="flex items-start gap-2">
              <Shield className="size-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#d6d3d1] mb-1">Security notice</p>
                <p className="text-xs text-[#78716c] leading-relaxed">
                  If you didn't make this change, please contact support immediately. We've logged the reset request with your IP address.
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-sm transition-all"
          >
            Sign in with new password <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-12">
        <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Heart className="size-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[#fafaf9] font-semibold tracking-tight">Hayetak</span>
      </Link>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="size-14 rounded-2xl bg-[#1c1917] border border-[#292524] flex items-center justify-center mx-auto">
            <Lock className="size-6 text-[#8b5cf6]" />
          </div>
          <h1 className="text-2xl font-bold text-[#fafaf9]">Create new password</h1>
          <p className="text-sm text-[#78716c] leading-relaxed">
            Choose a strong password. It must be at least 8 characters and hard to guess.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#d6d3d1]">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                placeholder="Create a strong password"
                className={`w-full pl-10 pr-10 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] ${errors.password ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"}`}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#a8a29e]">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[#ef4444] flex items-center gap-1"><AlertCircle className="size-3" /> {errors.password}</p>
            )}

            {/* Strength bar */}
            {password && (
              <div className="space-y-1.5 mt-2">
                <div className="flex gap-1">
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < strength.score ? strength.barColor : "bg-[#44403c]"}`} />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-medium ${strength.color}`}>{strength.label}</p>
                  <div className="flex gap-3">
                    {[
                      { label: "8+ chars", ok: password.length >= 8 },
                      { label: "Uppercase", ok: /[A-Z]/.test(password) },
                      { label: "Number", ok: /[0-9]/.test(password) },
                    ].map((req) => (
                      <div key={req.label} className={`flex items-center gap-1 text-[10px] ${req.ok ? "text-[#22c55e]" : "text-[#44403c]"}`}>
                        <Check className="size-3" /> {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#d6d3d1]">Confirm new password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirm: undefined })); }}
                placeholder="Repeat your password"
                className={`w-full pl-10 pr-10 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] ${errors.confirm ? "border-[#ef4444]" : confirmPassword && password === confirmPassword ? "border-[#22c55e]" : "border-[#44403c] hover:border-[#57534e]"}`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#a8a29e]">
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirm && (
              <p className="text-xs text-[#ef4444] flex items-center gap-1"><AlertCircle className="size-3" /> {errors.confirm}</p>
            )}
            {confirmPassword && !errors.confirm && password === confirmPassword && (
              <p className="text-xs text-[#22c55e] flex items-center gap-1"><Check className="size-3" /> Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating password…</>
            ) : (
              <>Update password <ArrowRight className="size-4" /></>
            )}
          </button>
        </form>

        {/* Security info */}
        <div className="mt-5 flex items-start gap-2 px-3 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
          <Shield className="size-3.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#78716c] leading-relaxed">
            After resetting, all other sessions will be signed out. This is a security measure to protect your account.
          </p>
        </div>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
