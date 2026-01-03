// resources/js/components/NavHeader.tsx
import { Link, router } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function NavHeader() {
  const [open, setOpen] = useState(false);
  const doLogout = () => router.post("/logout");

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Home" },
      { href: "/track-meals", label: "Meal Tracker" },
      { href: "/workouts", label: "Workouts" }, // 👈 Single entry
      { href: "/places", label: "Nearby" },
      { href: "/profile", label: "Profile" },
    ],
    []
  );

  const isActive = (href: string) => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;

    // Mark "Workouts" active for ANY /workouts/* subpage
    if (href === "/workouts") {
      return path.startsWith("/workouts");
    }

    return path === href;
  };

  return (
    <header
      className="
        sticky top-0 z-30 border-b bg-gradient-to-r shadow-md backdrop-blur
        from-[var(--sidebar)] to-[var(--sidebar-accent)]
        text-[color:var(--sidebar-foreground)]
        border-[color:var(--sidebar-border)]
      "
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span
              className="
                inline-flex h-9 w-9 items-center justify-center rounded-xl
                bg-[color:var(--sidebar-foreground)]/15 backdrop-blur-sm
              "
            >
              <span
                className="
                  h-5 w-5 rounded-md bg-gradient-to-tr
                  from-[var(--secondary)] to-[var(--primary)]
                "
              />
            </span>
            <span className="text-xl font-bold tracking-tight">Hayetak</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "text-sm font-medium transition-colors " +
                  (isActive(item.href)
                    ? "text-[color:var(--sidebar-foreground)]"
                    : "text-[color:var(--sidebar-foreground)]/85 hover:text-[color:var(--sidebar-foreground)]")
                }
              >
                {item.label}
              </Link>
            ))}

            <button
              onClick={doLogout}
              className="
                rounded-lg px-3 py-1.5 text-sm font-medium transition
                bg-[color:var(--sidebar-foreground)]/10
                text-[color:var(--sidebar-foreground)]
                hover:bg-[color:var(--sidebar-foreground)]/20
              "
            >
              Logout
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="
              inline-flex items-center justify-center rounded-lg p-2 md:hidden
              bg-[color:var(--sidebar-foreground)]/10
            "
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className="h-5 w-5 text-[color:var(--sidebar-foreground)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div
          className="
            md:hidden border-t bg-gradient-to-b
            from-[var(--sidebar)]
            to-[color-mix(in oklab, var(--sidebar) 70%, black 30%)]
            border-[color:var(--sidebar-border)]
          "
        >
          <nav className="mx-auto grid max-w-6xl gap-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="
                  rounded-lg px-3 py-2 transition
                  text-[color:var(--sidebar-foreground)]/90
                  hover:bg-[color:var(--sidebar-foreground)]/10
                "
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={doLogout}
              className="
                w-full rounded-lg px-3 py-2 text-left transition
                bg-[color:var(--destructive)]/15
                text-[color:var(--destructive-foreground)]/95
                hover:bg-[color:var(--destructive)]/25
              "
            >
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
