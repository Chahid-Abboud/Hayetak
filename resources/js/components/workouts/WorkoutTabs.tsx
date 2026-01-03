// resources/js/components/workouts/WorkoutTabs.tsx
import { Link } from "@inertiajs/react";

type WorkoutTabsProps = {
  active: "plan" | "log";
};

export default function WorkoutTabs({ active }: WorkoutTabsProps) {
  const base =
    "flex-1 rounded-lg px-3 py-2 text-sm font-medium text-center transition";

  return (
    <div className="mb-4 flex justify-center">
      <div
        className="
          inline-flex rounded-2xl bg-[color:var(--card)]/70
          p-1 shadow-sm backdrop-blur
        "
      >
        <Link
          href="/workouts/plan"
          className={
            base +
            (active === "plan"
              ? " bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
              : " text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/60")
          }
        >
          Plan
        </Link>

        <Link
          href="/workouts/log"
          className={
            base +
            (active === "log"
              ? " bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
              : " text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/60")
          }
        >
          Log
        </Link>
      </div>
    </div>
  );
}
