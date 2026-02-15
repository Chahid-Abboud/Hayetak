// resources/js/pages/welcome.tsx
import { Head, Link } from "@inertiajs/react";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function CtaLink({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: "secondary" | "accent";
}) {
  const base =
    "inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold shadow transition hover:opacity-90 active:opacity-100";
  const classes =
    variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : "bg-accent text-accent-foreground";

  return (
    <Link href={href} className={`${base} ${classes} ${FOCUS_RING}`}>
      {children}
    </Link>
  );
}

export default function Landing() {
  return (
    <>
      <Head title="Hayetak — Start" />

      {/* Skip link */}
      <a
        href="#main-content"
        className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 rounded-md bg-card px-3 py-2 text-sm font-semibold shadow ${FOCUS_RING}`}
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="min-h-screen bg-background text-foreground flex flex-col"
      >
        {/* Hero */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-6 py-20 md:py-28"
          aria-labelledby="landing-hero-title"
        >
          {/* glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              maskImage:
                "radial-gradient(60% 60% at 50% 30%, #000, transparent)",
            }}
          >
            <div className="absolute -top-16 left-1/2 h-64 w-[60rem] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-sidebar-primary" />
          </div>

          <h1
            id="landing-hero-title"
            className="text-4xl sm:text-5xl font-extrabold tracking-tight"
          >
            <span className="text-primary">Nutrition & training</span> for real
            life
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Track meals, workouts, and hydration, then let our AI model build the{" "}
            <span className="text-foreground font-semibold">optimal plan</span>{" "}
            for your goals.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <CtaLink href="/register" variant="secondary">
              Start Your Journey
            </CtaLink>
            <CtaLink href="/login" variant="accent">
              Login
            </CtaLink>
          </div>

          {/* quick anchors */}
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            aria-label="Jump to section"
          >
            <a
              href="#ai-planner"
              className={`hover:text-foreground ${FOCUS_RING} rounded-md px-1 py-0.5`}
            >
              AI Planner
            </a>
            <a
              href="#food-db"
              className={`hover:text-foreground ${FOCUS_RING} rounded-md px-1 py-0.5`}
            >
              Track Meals
            </a>
            <a
              href="#workout-log"
              className={`hover:text-foreground ${FOCUS_RING} rounded-md px-1 py-0.5`}
            >
              Workout Log
            </a>
          </nav>
        </section>

        {/* Three Feature Cards */}
        <section
          className="px-6 pb-20"
          aria-labelledby="features-title"
        >
          <div className="mx-auto max-w-6xl">
            <h2 id="features-title" className="sr-only">
              Features
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* AI Planner */}
              <article
                id="ai-planner"
                className="border rounded-xl p-6 relative overflow-hidden"
                aria-labelledby="ai-planner-title"
              >
                <span className="absolute right-4 top-4 text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                  New
                </span>

                <div className="aspect-[16/10] rounded-lg mb-4 bg-gradient-to-tr from-secondary/20 to-primary/10 flex items-center justify-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    AI Plan Preview
                  </div>
                </div>

                <h3 id="ai-planner-title" className="text-xl font-bold">
                  Generative AI Plans
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Tell us your goal, schedule, and constraints. Our AI generates
                  a{" "}
                  <span className="font-medium text-foreground">
                    personalized workout split
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    macro-aligned diet plan
                  </span>
                  , and adapts as you log.
                </p>

                <ul className="mt-4 text-sm space-y-2">
                  <li>Auto-periodized training blocks</li>
                  <li>Macro targets with food suggestions</li>
                  <li>Adjusts to progress & preferences</li>
                </ul>

                <div className="mt-6">
                  <Link
                    href="/login"
                    className={`text-primary font-semibold hover:underline ${FOCUS_RING} rounded-md`}
                  >
                    Try the AI Planner →
                  </Link>
                </div>
              </article>

              {/* Food DB / Meal Tracking */}
              <article
                id="food-db"
                className="border rounded-xl p-6 overflow-hidden"
                aria-labelledby="food-db-title"
              >
                <div className="aspect-[16/10] rounded-lg mb-4 bg-gradient-to-tr from-primary/20 to-accent/10 flex items-center justify-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Meal Log
                  </div>
                </div>

                <h3 id="food-db-title" className="text-xl font-bold">
                  Track Meals from our Database
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Search Lebanese and international dishes, log servings, and
                  see calories, macros, and fiber instantly.
                </p>

                <ul className="mt-4 text-sm space-y-2">
                  <li>Fast search & favorites</li>
                  <li>Accurate per-100g & per-serving values</li>
                  <li>Tags for diet types & allergies</li>
                </ul>

                <div className="mt-6">
                  <Link
                    href="/login"
                    className={`text-primary font-semibold hover:underline ${FOCUS_RING} rounded-md`}
                  >
                    Log a meal →
                  </Link>
                </div>
              </article>

              {/* Workout Log */}
              <article
                id="workout-log"
                className="border rounded-xl p-6 overflow-hidden"
                aria-labelledby="workout-log-title"
              >
                <div className="aspect-[16/10] rounded-lg mb-4 bg-gradient-to-tr from-accent/20 to-secondary/10 flex items-center justify-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Workout Log
                  </div>
                </div>

                <h3 id="workout-log-title" className="text-xl font-bold">
                  Simple, Powerful Workout Logs
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Track sets, reps, weight, and rest. Auto-calculations keep you
                  progressing. Export or review PRs anytime.
                </p>

                <ul className="mt-4 text-sm space-y-2">
                  <li>Supersets & custom exercises</li>
                  <li>Volume & one-rep-max estimates</li>
                  <li>History & streaks to stay consistent</li>
                </ul>

                <div className="mt-6">
                  <Link
                    href="/login"
                    className={`text-primary font-semibold hover:underline ${FOCUS_RING} rounded-md`}
                  >
                    Record a workout →
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* How it works (1-2-3) */}
        <section className="px-6 pb-24" aria-labelledby="how-title">
          <div className="mx-auto max-w-5xl text-center">
            <h2 id="how-title" className="text-2xl md:text-3xl font-extrabold">
              Hit your health goals in 3 easy steps
            </h2>
          </div>

          <div className="mx-auto max-w-5xl mt-10 space-y-12">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  Screenshot / Illustration
                </span>
              </div>
              <div>
                <div className="text-primary text-3xl font-extrabold">1</div>
                <h3 className="text-xl font-semibold mt-2">
                  Track calories, macros & water
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Log meals from our database, add custom foods, and keep
                  hydration on point.
                </p>
              </div>
            </div>

            {/* Step 2 (fixed layout classes) */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="text-primary text-3xl font-extrabold">2</div>
                <h3 className="text-xl font-semibold mt-2">
                  Follow your progress
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  See weekly trends for weight, measurements, training volume,
                  and consistency.
                </p>
              </div>
              <div className="order-1 md:order-2 aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  Charts / Trends
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-sm text-muted-foreground">AI Plan View</span>
              </div>
              <div>
                <div className="text-primary text-3xl font-extrabold">3</div>
                <h3 className="text-xl font-semibold mt-2">
                  Let AI optimize your plan
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Based on your logs, our AI tweaks your macros, exercise
                  selection, and training load to keep progress steady.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-20" aria-labelledby="final-cta-title">
          <div className="mx-auto max-w-4xl text-center border rounded-2xl p-8 md:p-10">
            <h3 id="final-cta-title" className="text-2xl font-bold">
              Ready to start?
            </h3>
            <p className="mt-2 text-muted-foreground">
              Create a free account and try the AI planner, meal tracker, and
              workout log.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <CtaLink href="/register" variant="secondary">
                Get Started
              </CtaLink>
              <CtaLink href="/login" variant="accent">
                I already have an account
              </CtaLink>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
