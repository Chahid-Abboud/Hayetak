import { useState } from "react";
import { Link } from "react-router";
import { Heart, Mail, Shield, ArrowLeft, ArrowRight, AlertCircle, Check, Sparkles } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email address is required"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address"); return; }
    setError("");
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setSubmitted(true); }, 1500);
  };

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
        {!submitted ? (
          <>
            {/* Header */}
            <div className="text-center mb-8 space-y-3">
              <div className="size-14 rounded-2xl bg-[#1c1917] border border-[#292524] flex items-center justify-center mx-auto">
                <Mail className="size-6 text-[#8b5cf6]" />
              </div>
              <h1 className="text-2xl font-bold text-[#fafaf9]">Forgot your password?</h1>
              <p className="text-sm text-[#78716c] leading-relaxed">
                No worries. Enter your email and we'll send you a secure link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-[#d6d3d1]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78716c]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#292524] border rounded-xl text-[#fafaf9] placeholder-[#44403c] text-sm transition-all outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed] ${
                      error ? "border-[#ef4444]" : "border-[#44403c] hover:border-[#57534e]"
                    }`}
                  />
                </div>
                {error && (
                  <p className="text-xs text-[#ef4444] flex items-center gap-1">
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
                  <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending link…</>
                ) : (
                  <>Send reset link <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="mt-6 flex items-start gap-2 px-3 py-3 bg-[#1c1917] border border-[#292524] rounded-xl">
              <Shield className="size-3.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#78716c] leading-relaxed">
                The reset link expires in 60 minutes and can only be used once. If you didn't request this, no action is needed.
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center space-y-6">
              <div className="relative mx-auto size-16">
                <div className="size-16 rounded-full bg-[#15803d]/20 border border-[#22c55e]/30 flex items-center justify-center">
                  <Check className="size-8 text-[#22c55e]" />
                </div>
                <div className="absolute -top-1 -right-1 size-6 rounded-full bg-[#7c3aed] flex items-center justify-center">
                  <Sparkles className="size-3.5 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#fafaf9]">Check your email</h2>
                <p className="text-sm text-[#78716c] leading-relaxed">
                  We sent a secure reset link to{" "}
                  <span className="text-[#d6d3d1] font-medium">{email}</span>
                </p>
              </div>

              <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5 text-left space-y-3">
                <p className="text-xs font-semibold text-[#a8a29e]">What to do next</p>
                {[
                  "Open the email from Hayetak in your inbox",
                  "Click the secure password reset link",
                  "Create your new password and sign back in",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="size-5 rounded-full bg-[#292524] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] text-[#78716c] font-semibold">{i + 1}</span>
                    </div>
                    <p className="text-xs text-[#78716c] leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#44403c]">
                Didn't receive it?{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
                >
                  Try again
                </button>{" "}
                or check your spam folder.
              </p>

              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
