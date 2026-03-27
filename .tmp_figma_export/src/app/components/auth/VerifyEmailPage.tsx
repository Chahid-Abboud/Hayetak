import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Heart, Mail, Check, X, Loader2, Sparkles, Shield, ArrowRight, RefreshCw } from "lucide-react";

type State = "loading" | "success" | "error" | "expired";

export function VerifyEmailPage() {
  const { token } = useParams();
  const [state, setState] = useState<State>("loading");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [email] = useState("s***a@example.com");

  useEffect(() => {
    // Simulate token verification
    const timer = setTimeout(() => {
      // Simulate: invalid token shows error, valid shows success
      if (token === "expired") {
        setState("expired");
      } else if (token === "invalid") {
        setState("error");
      } else {
        setState("success");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [token]);

  const handleResend = () => {
    setResendLoading(true);
    setTimeout(() => {
      setResendLoading(false);
      setResendSent(true);
    }, 1500);
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
        {/* ── Loading State ── */}
        {state === "loading" && (
          <div className="text-center space-y-6">
            <div className="relative size-20 mx-auto">
              <div className="size-20 rounded-full border-4 border-[#1c1917]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#7c3aed] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Mail className="size-8 text-[#8b5cf6]" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#fafaf9]">Verifying your email…</h1>
              <p className="text-sm text-[#78716c]">
                Please wait while we securely validate your email address.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {["Checking token validity", "Validating email address", "Activating your account"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`size-3 rounded-full ${i === 0 ? "bg-[#7c3aed] animate-pulse" : "bg-[#292524]"}`} />
                  <p className={`text-xs ${i === 0 ? "text-[#a8a29e]" : "text-[#44403c]"}`}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Success State ── */}
        {state === "success" && (
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="relative mx-auto size-20">
              <div className="size-20 rounded-full bg-gradient-to-br from-[#7c3aed]/20 to-[#4c1d95]/10 border border-[#7c3aed]/30 flex items-center justify-center">
                <Check className="size-10 text-[#8b5cf6]" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 size-7 rounded-full bg-[#22c55e] border-2 border-[#0c0a09] flex items-center justify-center">
                <Sparkles className="size-3.5 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#fafaf9]">Email verified!</h1>
              <p className="text-sm text-[#78716c] leading-relaxed">
                Your email address has been successfully verified. Your Hayetak account is now fully activated.
              </p>
            </div>

            {/* What's next */}
            <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5 text-left space-y-3">
              <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider">
                What's waiting for you
              </p>
              {[
                { icon: "🎯", text: "Your personalized AI health plan is ready" },
                { icon: "🍽️", text: "Meal tracker & nutrition plans" },
                { icon: "💪", text: "Custom workout program" },
                { icon: "🤖", text: "AI coach ready to start" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <p className="text-xs text-[#a8a29e]">{item.text}</p>
                </div>
              ))}
            </div>

            <Link
              to="/app/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-purple-900/30"
            >
              Go to my dashboard <ArrowRight className="size-4" />
            </Link>

            <div className="flex items-center gap-2 justify-center">
              <Shield className="size-3.5 text-[#44403c]" />
              <p className="text-xs text-[#44403c]">Secured & encrypted</p>
            </div>
          </div>
        )}

        {/* ── Expired Token State ── */}
        {state === "expired" && (
          <div className="text-center space-y-6">
            <div className="size-14 rounded-2xl bg-[#92400e]/20 border border-[#f59e0b]/30 flex items-center justify-center mx-auto">
              <RefreshCw className="size-6 text-[#f59e0b]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#fafaf9]">Link expired</h1>
              <p className="text-sm text-[#78716c] leading-relaxed">
                This verification link has expired. Email verification links are valid for 24 hours.
              </p>
            </div>
            <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5 space-y-4">
              <p className="text-xs text-[#78716c]">
                We'll send a new verification link to{" "}
                <span className="text-[#d6d3d1] font-medium">{email}</span>
              </p>
              {!resendSent ? (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {resendLoading ? (
                    <><Loader2 className="size-4 animate-spin" /> Sending…</>
                  ) : (
                    <><RefreshCw className="size-4" /> Resend verification email</>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2.5 bg-[#15803d]/20 border border-[#22c55e]/30 rounded-xl">
                  <Check className="size-4 text-[#22c55e]" />
                  <p className="text-sm text-[#4ade80]">New link sent! Check your inbox.</p>
                </div>
              )}
            </div>
            <Link to="/login" className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors">
              ← Back to sign in
            </Link>
          </div>
        )}

        {/* ── Error State ── */}
        {state === "error" && (
          <div className="text-center space-y-6">
            <div className="size-14 rounded-2xl bg-[#7f1d1d]/20 border border-[#ef4444]/30 flex items-center justify-center mx-auto">
              <X className="size-6 text-[#ef4444]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#fafaf9]">Invalid link</h1>
              <p className="text-sm text-[#78716c] leading-relaxed">
                This verification link is invalid or has already been used. Please request a new one.
              </p>
            </div>
            <div className="bg-[#1c1917] border border-[#292524] rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-[#a8a29e]">Common reasons</p>
              {[
                "The link was already used to verify your email",
                "The link was copied incorrectly from your email",
                "The link is from an old verification email",
              ].map((reason) => (
                <div key={reason} className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-[#44403c] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-[#78716c]">{reason}</p>
                </div>
              ))}
            </div>
            {!resendSent ? (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all"
              >
                {resendLoading ? (
                  <><Loader2 className="size-4 animate-spin" /> Sending…</>
                ) : (
                  <>Resend verification email</>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2.5 bg-[#15803d]/20 border border-[#22c55e]/30 rounded-xl">
                <Check className="size-4 text-[#22c55e]" />
                <p className="text-sm text-[#4ade80]">New link sent!</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-4">
              <Link to="/login" className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors">← Sign in</Link>
              <span className="text-[#292524]">·</span>
              <a href="mailto:support@hayetak.com" className="text-sm text-[#78716c] hover:text-[#a8a29e] transition-colors">Contact support</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
