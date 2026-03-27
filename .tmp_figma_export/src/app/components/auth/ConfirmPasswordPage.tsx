import { useState } from "react";
import { Link } from "react-router";
import { Heart, Lock, Eye, EyeOff, Shield, Check, ArrowRight, AlertCircle, X } from "lucide-react";

export function ConfirmPasswordPage() {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("Password is required"); return; }
    setError("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (password === "wrongpassword") {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(newAttempts >= 3
          ? "Too many failed attempts. Please reset your password."
          : `Incorrect password. ${3 - newAttempts} attempts remaining.`
        );
      } else {
        setConfirmed(true);
      }
    }, 1200);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="flex items-center gap-2.5 mb-12">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <Heart className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[#fafaf9] font-semibold">Hayetak</span>
        </Link>
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="size-14 rounded-2xl bg-[#15803d]/20 border border-[#22c55e]/30 flex items-center justify-center mx-auto">
            <Check className="size-7 text-[#22c55e]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#fafaf9]">Identity confirmed</h2>
            <p className="text-sm text-[#78716c] mt-1">You may now proceed with the sensitive operation.</p>
          </div>
          <Link
            to="/app/settings"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-sm transition-all"
          >
            Continue <ArrowRight className="size-4" />
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
            <Shield className="size-6 text-[#8b5cf6]" />
          </div>
          <h1 className="text-2xl font-bold text-[#fafaf9]">Confirm your identity</h1>
          <p className="text-sm text-[#78716c] leading-relaxed">
            For your security, please enter your current password to continue with this sensitive action.
          </p>
        </div>

        {/* Context banner */}
        <div className="mb-5 px-4 py-3.5 bg-[#4c1d95]/15 border border-[#7c3aed]/20 rounded-xl">
          <div className="flex items-start gap-2.5">
            <Lock className="size-4 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#c4b5fd] mb-0.5">Sensitive action detected</p>
              <p className="text-xs text-[#78716c] leading-relaxed">
                You're attempting to modify sensitive account settings. This extra step protects your account from unauthorized changes.
              </p>
            </div>
          </div>
        </div>

        {/* Too many attempts */}
        {attempts >= 3 && (
          <div className="mb-5 px-4 py-3.5 bg-[#7f1d1d]/20 border border-[#ef4444]/30 rounded-xl">
            <div className="flex items-start gap-2.5">
              <X className="size-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#fca5a5] mb-1">Account temporarily locked</p>
                <p className="text-xs text-[#f87171] leading-relaxed">
                  Too many failed attempts. Please reset your password to regain access.
                </p>
                <Link to="/forgot-password" className="text-xs text-[#8b5cf6] hover:underline mt-1 block">
                  Reset password →
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#d6d3d1]">Current password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your current password"
                disabled={attempts >= 3}
                className={`w-full pl-10 pr-10 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed ${
                  error ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"
                }`}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#a8a29e]">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-[#ef4444] flex items-center gap-1">
                <AlertCircle className="size-3" /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading || attempts >= 3}
            className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
            ) : (
              <>Confirm identity <ArrowRight className="size-4" /></>
            )}
          </button>
        </form>

        {/* Cancel */}
        <div className="mt-6 text-center">
          <Link to="/app/settings" className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors">
            ← Cancel and go back
          </Link>
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-start gap-2 px-3 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
          <Shield className="size-3.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#78716c] leading-relaxed">
            Your password is verified locally and never sent in plain text. This session check expires in 15 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
