import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Heart,
  Shield,
  Smartphone,
  ArrowRight,
  AlertCircle,
  Check,
  RefreshCw,
  Lock,
  KeyRound,
  ChevronRight,
  Loader2,
} from "lucide-react";

export function TwoFactorPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];

    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").split("").slice(0, 6);
      digits.forEach((d, i) => { if (index + i < 6) newCode[index + i] = d; });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);
    setError("");
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newCode.every((d) => d !== "") && value) {
      setTimeout(() => handleVerify(newCode.join("")), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (codeStr: string) => {
    if (codeStr.length < 6) { setError("Enter all 6 digits"); return; }
    setIsLoading(true);
    setError("");
    setTimeout(() => {
      setIsLoading(false);
      if (codeStr === "123456") {
        setSuccess(true);
      } else {
        setError("Incorrect code. Please try again.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    }, 1200);
  };

  const handleResend = () => {
    setResendLoading(true);
    setTimeout(() => {
      setResendLoading(false);
      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
    }, 1000);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) { setError("Enter your recovery code"); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (recoveryCode.toUpperCase() === "ABCD-EFGH") {
        setSuccess(true);
      } else {
        setError("Invalid recovery code. Please check and try again.");
      }
    }, 1200);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="flex items-center gap-2.5 mb-12">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <Heart className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[#fafaf9] font-semibold">Hayetak</span>
        </Link>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="relative size-16 mx-auto">
            <div className="size-16 rounded-full bg-gradient-to-br from-[#7c3aed]/30 to-[#4c1d95]/10 border border-[#7c3aed]/40 flex items-center justify-center">
              <Check className="size-8 text-[#8b5cf6]" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-[#22c55e] border-2 border-[#0c0a09] flex items-center justify-center">
              <Shield className="size-3 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#fafaf9]">Identity verified</h2>
            <p className="text-sm text-[#78716c] mt-1">Two-factor authentication passed. Signing you in securely.</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 text-[#8b5cf6] animate-spin" />
            <p className="text-sm text-[#78716c]">Redirecting to your dashboard…</p>
          </div>
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
        {!showRecovery ? (
          <>
            {/* Header */}
            <div className="text-center mb-8 space-y-3">
              <div className="relative size-14 mx-auto">
                <div className="size-14 rounded-2xl bg-[#1c1917] border border-[#292524] flex items-center justify-center">
                  <Smartphone className="size-6 text-[#8b5cf6]" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-[#7c3aed] border-2 border-[#0c0a09] flex items-center justify-center">
                  <Lock className="size-3 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[#fafaf9]">Two-factor challenge</h1>
              <p className="text-sm text-[#78716c] leading-relaxed">
                We sent a 6-digit code to your authenticator app. Enter it below to continue.
              </p>
            </div>

            {/* Security context */}
            <div className="mb-6 px-4 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-[#22c55e]" />
                  <span className="text-xs font-medium text-[#a8a29e]">Signing in as</span>
                </div>
                <span className="text-xs text-[#d6d3d1] font-medium">s***a@example.com</span>
              </div>
            </div>

            {/* 6-digit input */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-[#d6d3d1] text-center">
                Verification code
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isLoading}
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-[#292524] text-[#fafaf9] outline-none transition-all focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] disabled:opacity-50 ${
                      error
                        ? "border-[#ef4444]"
                        : digit
                        ? "border-[#7c3aed]/60 bg-[#4c1d95]/20"
                        : "border-[#44403c]"
                    }`}
                  />
                ))}
              </div>

              {/* Add separator dot after 3rd digit visual cue */}
              <p className="text-center text-xs text-[#44403c]">
                {code.filter(Boolean).length} / 6 digits entered
              </p>

              {error && (
                <div className="flex items-center justify-center gap-1.5">
                  <AlertCircle className="size-3.5 text-[#ef4444]" />
                  <p className="text-sm text-[#ef4444]">{error}</p>
                </div>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="button"
              onClick={() => handleVerify(code.join(""))}
              disabled={isLoading || code.some((d) => !d)}
              className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-4"
            >
              {isLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Verifying…</>
              ) : (
                <>Verify identity <ArrowRight className="size-4" /></>
              )}
            </button>

            {/* Resend */}
            <div className="text-center space-y-3">
              <div>
                {resendCooldown > 0 ? (
                  <p className="text-sm text-[#78716c]">
                    Resend available in <span className="text-[#a8a29e] font-medium">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="flex items-center gap-1.5 text-sm text-[#8b5cf6] hover:text-[#a78bfa] transition-colors mx-auto disabled:opacity-60"
                  >
                    {resendLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    Resend code to my app
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#1c1917]" />
                <span className="text-xs text-[#44403c]">or</span>
                <div className="flex-1 h-px bg-[#1c1917]" />
              </div>

              <button
                onClick={() => setShowRecovery(true)}
                className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors mx-auto"
              >
                <KeyRound className="size-3.5" />
                Use a recovery code
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Security notice */}
            <div className="mt-6 flex items-start gap-2 px-3 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
              <Shield className="size-3.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#78716c] leading-relaxed">
                This extra step protects your account even if your password is compromised. The code expires in 30 seconds.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Recovery Code Flow */}
            <div className="text-center mb-8 space-y-3">
              <div className="size-14 rounded-2xl bg-[#1c1917] border border-[#292524] flex items-center justify-center mx-auto">
                <KeyRound className="size-6 text-[#f59e0b]" />
              </div>
              <h1 className="text-2xl font-bold text-[#fafaf9]">Recovery code</h1>
              <p className="text-sm text-[#78716c] leading-relaxed">
                Enter one of your saved recovery codes to access your account without your authenticator.
              </p>
            </div>

            {/* Warning */}
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3.5 bg-[#92400e]/15 border border-[#f59e0b]/20 rounded-xl">
              <AlertCircle className="size-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#fbbf24] mb-0.5">One-time use</p>
                <p className="text-xs text-[#d97706] leading-relaxed">
                  Each recovery code can only be used once. After sign-in, you should reconfigure your authenticator app.
                </p>
              </div>
            </div>

            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#d6d3d1]">Recovery code</label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => { setRecoveryCode(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="XXXX-XXXX"
                  className={`w-full px-4 py-3 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-base font-mono text-center tracking-widest outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] transition-all ${
                    error ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"
                  }`}
                />
                {error && (
                  <p className="text-xs text-[#ef4444] flex items-center justify-center gap-1">
                    <AlertCircle className="size-3" /> {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="size-4 animate-spin" /> Verifying…</>
                ) : (
                  <>Use recovery code <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => { setShowRecovery(false); setError(""); setRecoveryCode(""); }}
                className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors mx-auto"
              >
                ← Back to verification code
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 px-3 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
              <Shield className="size-3.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#78716c] leading-relaxed">
                Recovery codes are generated when you enable 2FA. Check your secure notes or password manager for saved codes.
              </p>
            </div>
          </>
        )}

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-[#44403c] hover:text-[#78716c] transition-colors">
            ← Not you? Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
