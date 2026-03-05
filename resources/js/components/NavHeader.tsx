// resources/js/components/NavHeader.tsx
import NotificationBell from '@/components/NotificationBell';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function NavHeader() {
    const [open, setOpen] = useState(false);
    const doLogout = () => router.post('/logout');
    const { auth } = usePage<SharedData>().props;
    const role = auth.user?.role ?? 'client';

    const navItems = useMemo(() => {
        const nutrition = [{ href: '/track-meals', label: 'Meal Tracker' }];
        const fitness = [
            { href: '/workouts', label: 'Workouts' },
            { href: '/appointments', label: 'Appointments' },
        ];
        const nearby = [{ href: '/places', label: 'Nearby Places' }];
        const messages = [{ href: '/messages', label: 'Messages' }];
        const accounts = [
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/profile', label: 'Profile' },
        ];

        if (role === 'admin') {
            accounts.push(
                { href: '/admin/users', label: 'Admin Users' },
                { href: '/admin/logs', label: 'Admin Logs' },
                { href: '/admin/notifications', label: 'Send Alerts' },
            );
        }

        return { nutrition, fitness, nearby, messages, accounts };
    }, [role]);

    const isActive = (href: string) => {
        if (typeof window === 'undefined') return false;
        const path = window.location.pathname;

        // Mark "Workouts" active for ANY /workouts/* subpage
        if (href === '/workouts') {
            return path.startsWith('/workouts');
        }

        return path === href;
    };

    return (
        <header className="sticky top-0 z-30 border-b border-[color:var(--sidebar-border)] bg-[color-mix(in_oklab,var(--sidebar)_86%,transparent)] text-[color:var(--sidebar-foreground)] shadow-sm backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-4">
                <div className="flex h-14 items-center justify-between gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--sidebar-foreground)]/15 backdrop-blur-sm">
                            <span className="h-5 w-5 rounded-md bg-gradient-to-tr from-[var(--secondary)] to-[var(--primary)]" />
                        </span>
                        <span className="text-xl font-bold tracking-tight">
                            Hayetak
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden items-center gap-2 md:flex">
                        <Submenu
                            label="Nutrition"
                            items={navItems.nutrition}
                            isActive={isActive}
                        />
                        <Submenu
                            label="Fitness"
                            items={navItems.fitness}
                            isActive={isActive}
                        />
                        <Submenu
                            label="Nearby"
                            items={navItems.nearby}
                            isActive={isActive}
                        />
                        <Submenu
                            label="Messages"
                            items={navItems.messages}
                            isActive={isActive}
                        />
                        <Submenu
                            label="Accounts"
                            items={navItems.accounts}
                            isActive={isActive}
                        />

                        <NotificationBell />
                        <button
                            onClick={doLogout}
                            className="rounded-full bg-[color:var(--sidebar-foreground)]/12 px-3 py-1.5 text-sm font-medium text-[color:var(--sidebar-foreground)] transition hover:bg-[color:var(--sidebar-foreground)]/22"
                        >
                            Logout
                        </button>
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        className="inline-flex items-center justify-center rounded-lg bg-[color:var(--sidebar-foreground)]/10 p-2 md:hidden"
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
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile sheet */}
            {open && (
                <div className="to-[color-mix(in oklab, var(--sidebar) 70%, black 30%)] border-t border-[color:var(--sidebar-border)] bg-gradient-to-b from-[var(--sidebar)] md:hidden">
                    <nav className="mx-auto grid max-w-6xl gap-2 px-4 py-3">
                        <div className="text-xs font-semibold tracking-wide text-[color:var(--sidebar-foreground)]/60 uppercase">
                            Nutrition
                        </div>
                        {navItems.nutrition.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-lg px-3 py-2 text-[color:var(--sidebar-foreground)]/90 transition hover:bg-[color:var(--sidebar-foreground)]/10"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="text-xs font-semibold tracking-wide text-[color:var(--sidebar-foreground)]/60 uppercase">
                            Fitness
                        </div>
                        {navItems.fitness.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-lg px-3 py-2 text-[color:var(--sidebar-foreground)]/90 transition hover:bg-[color:var(--sidebar-foreground)]/10"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="text-xs font-semibold tracking-wide text-[color:var(--sidebar-foreground)]/60 uppercase">
                            Nearby
                        </div>
                        {navItems.nearby.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-lg px-3 py-2 text-[color:var(--sidebar-foreground)]/90 transition hover:bg-[color:var(--sidebar-foreground)]/10"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="text-xs font-semibold tracking-wide text-[color:var(--sidebar-foreground)]/60 uppercase">
                            Messages
                        </div>
                        {navItems.messages.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-lg px-3 py-2 text-[color:var(--sidebar-foreground)]/90 transition hover:bg-[color:var(--sidebar-foreground)]/10"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="text-xs font-semibold tracking-wide text-[color:var(--sidebar-foreground)]/60 uppercase">
                            Accounts
                        </div>
                        {navItems.accounts.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-lg px-3 py-2 text-[color:var(--sidebar-foreground)]/90 transition hover:bg-[color:var(--sidebar-foreground)]/10"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <button
                            onClick={doLogout}
                            className="w-full rounded-lg bg-[color:var(--destructive)]/15 px-3 py-2 text-left text-[color:var(--destructive-foreground)]/95 transition hover:bg-[color:var(--destructive)]/25"
                        >
                            Logout
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
}

function Submenu({
    label,
    items,
    isActive,
}: {
    label: string;
    items: { href: string; label: string }[];
    isActive: (href: string) => boolean;
}) {
    const active = items.some((item) => isActive(item.href));

    return (
        <div className="group relative">
            <button
                type="button"
                className={
                    'rounded-full px-3 py-1.5 text-sm font-medium transition ' +
                    (active
                        ? 'bg-[color:var(--sidebar-foreground)]/14 text-[color:var(--sidebar-foreground)]'
                        : 'text-[color:var(--sidebar-foreground)]/85 hover:bg-[color:var(--sidebar-foreground)]/8 hover:text-[color:var(--sidebar-foreground)]')
                }
            >
                {label}
            </button>
            <div className="invisible absolute top-full left-0 z-40 mt-2 min-w-44 rounded-xl border border-[color:var(--sidebar-border)] bg-[color-mix(in_oklab,var(--sidebar)_94%,black_6%)] p-1 opacity-0 shadow-lg transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={
                            'block rounded-lg px-3 py-2 text-sm transition ' +
                            (isActive(item.href)
                                ? 'bg-[color:var(--sidebar-foreground)]/14 text-[color:var(--sidebar-foreground)]'
                                : 'text-[color:var(--sidebar-foreground)]/90 hover:bg-[color:var(--sidebar-foreground)]/10')
                        }
                    >
                        {item.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
