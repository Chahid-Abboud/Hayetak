import React from "react";
import { Link } from "@inertiajs/react";

type Profile = { height_cm: number; weight_kg: number };
type Props = {
  isGuest: boolean;
  profile?: Profile;
  loading?: boolean;
};

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

type BmiCatKey = "under" | "normal" | "over" | "obese";

function category(bmi: number): { key: BmiCatKey; label: string; hint: string } {
  // Keep keys stable for styling; enhance label a bit.
  if (bmi < 18.5)
    return { key: "under", label: "Underweight", hint: "Aim to gain safely." };
  if (bmi < 25)
    return { key: "normal", label: "Normal range", hint: "Great—keep it up!" };
  if (bmi < 30)
    return { key: "over", label: "Overweight", hint: "Small changes help." };

  // Obesity subclasses for clearer communication
  let cls = "Class I";
  if (bmi >= 35 && bmi < 40) cls = "Class II";
  if (bmi >= 40) cls = "Class III";
  return { key: "obese", label: `Obesity (${cls})`, hint: "Consider a tailored plan." };
}

const CAT_FILL_CLASS: Record<BmiCatKey, string> = {
  under:  "bg-accent",
  normal: "bg-secondary",
  over:   "bg-amber-500",
  obese:  "bg-destructive",
};
const CAT_TEXT_CLASS: Record<BmiCatKey, string> = {
  under:  "text-accent",
  normal: "text-secondary",
  over:   "text-amber-600",
  obese:  "text-destructive",
};

// Visible, actionable guidance per category
function ctaFor(key: BmiCatKey, bmi: number) {
  switch (key) {
    case "obese":
    case "over":
      return {
        toneClass: "bg-destructive/10 border-destructive/30 text-destructive",
        emoji: "🔥",
        title: "Let’s start with calories",
        body:
          "Tracking meals is the fastest way to create a consistent calorie deficit. We’ll keep it simple and steady.",
        href: "/meal-tracker",
        btn: "Start tracking meals",
      };
    case "under":
      return {
        toneClass: "bg-accent/10 border-accent/30 text-accent",
        emoji: "🌱",
        title: "Build a healthy gain plan",
        body:
          "Increase calories with nutrient-dense meals and gentle strength work to gain safely.",
        href: "/meals",
        btn: "Plan higher-calorie meals",
      };
    default: // normal
      return {
        toneClass: "bg-secondary/10 border-secondary/30 text-secondary",
        emoji: "✅",
        title: "Maintain & get a bit stronger",
        body:
          "You’re in the healthy range. A simple workout routine and good hydration will help you maintain.",
        href: "/workout",
        btn: "Plan my workouts",
        // If you prefer hydration as the primary CTA, switch href to "/water" and adjust text.
      };
  }
}

function Progress({ bmi, categoryKey }: { bmi: number; categoryKey: BmiCatKey }) {
  const min = 15, max = 40;
  const clamped = Math.max(min, Math.min(max, bmi));
  const pct = ((clamped - min) / (max - min)) * 100;
  const pctAt = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="mt-3" aria-label="BMI progress">
      <div className="relative h-2 w-full rounded bg-muted overflow-hidden">
        <div
          className={`h-full ${CAT_FILL_CLASS[categoryKey]}`}
          style={{ width: `${pct}%`, transition: "width 300ms ease" }}
          role="progressbar"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Number(clamped.toFixed(1))}
          aria-label="BMI position"
        />
        {[18.5, 25, 30].map((v) => (
          <span
            key={v}
            className="absolute top-0 h-full w-px bg-border"
            style={{ left: `${pctAt(v)}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="text-xs text-muted-foreground mt-1 flex justify-between tabular-nums">
        <span>15</span><span>20</span><span>25</span><span>30</span><span>35</span><span>40</span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-baseline gap-3">
        <div className="h-8 w-16 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="mt-3 h-2 w-full rounded bg-muted" />
      <div className="mt-2 h-3 w-48 rounded bg-muted" />
    </div>
  );
}

export default function BmiCard({ isGuest, profile, loading }: Props) {
  if (loading) return <Skeleton />;

  if (!profile || !profile.height_cm || !profile.weight_kg) {
    return (
      <div className="text-muted-foreground">
        {isGuest ? (
          <>Sign in to calculate your BMI.</>
        ) : (
          <>
            Add your height &amp; weight to see your BMI.{" "}
            <Link href="/profile" className="text-accent hover:underline">
              Update profile
            </Link>
          </>
        )}
      </div>
    );
  }

  const height_m = profile.height_cm / 100;
  if (!isFinite(height_m) || height_m <= 0)
    return <div className="text-muted-foreground">Height looks invalid.</div>;

  const bmi = round1(profile.weight_kg / (height_m * height_m));
  if (!isFinite(bmi) || bmi <= 0)
    return <div className="text-muted-foreground">Weight looks invalid.</div>;

  const { key, label, hint } = category(bmi);
  const cta = ctaFor(key, bmi);

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-bold">{bmi}</div>
        <div className={`text-sm ${CAT_TEXT_CLASS[key]}`}>{label}</div>
      </div>

      <Progress bmi={bmi} categoryKey={key} />

      {/* Prominent, category-tinted banner */}
      <div
        className={`mt-3 border rounded-lg p-3 ${cta.toneClass}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="text-lg leading-none">{cta.emoji}</div>
          <div className="flex-1">
            <div className="font-medium">{cta.title}</div>
            <div className="text-sm opacity-90">{hint} {cta.body}</div>
            <div className="mt-2">
              <Link
                href={cta.href}
                className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium
                           bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                {cta.btn}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
