// resources/js/components/NavHeader.tsx
import CommandPalette, {
    type CommandPaletteItem,
} from '@/components/command-palette';
import NotificationBell from '@/components/NotificationBell';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';

export default function NavHeader() {
    const [open, setOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const doLogout = () => router.post('/logout');
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const role = auth.user?.role ?? 'client';
    const pathname =
        typeof window === 'undefined'
            ? (page.url?.split('?')[0] ?? '/dashboard')
            : window.location.pathname;
    const primaryItems =
        role === 'admin'
            ? [
                  { href: '/dashboard', label: 'Overview' },
                  { href: '/coach', label: 'Coach' },
              ]
            : [
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/coach', label: 'Coach' },
                  { href: '/nearby', label: 'Nearby' },
              ];
    const navGroups: Array<{
        label: string;
        items: { href: string; label: string }[];
    }> = [
        {
            label: 'Health',
            items: [
                { href: '/track-meals', label: 'Meal Tracker' },
                { href: '/planner', label: 'Planner' },
            ],
        },
        {
            label: 'Training',
            items: [
                { href: '/workouts', label: 'Workouts' },
                { href: '/appointments', label: 'Appointments' },
            ],
        },
        {
            label: 'Connect',
            items: [{ href: '/messages', label: 'Messages' }],
        },
        {
            label: 'Account',
            items: [
                { href: '/settings/profile', label: 'Profile' },
                { href: '/settings/password', label: 'Password' },
                { href: '/settings/two-factor', label: 'Two-Factor' },
                { href: '/settings/appearance', label: 'Appearance' },
            ],
        },
    ];

    if (role === 'trainer') {
        navGroups.splice(2, 0, {
            label: 'Clients',
            items: [{ href: '/trainer/clients', label: 'My Clients' }],
        });
    }

    if (role === 'nutritionist') {
        navGroups.splice(2, 0, {
            label: 'Clients',
            items: [{ href: '/dietitian/clients', label: 'My Clients' }],
        });
    }

    if (role === 'admin') {
        navGroups.length = 0;
        navGroups.push(
            {
                label: 'Users',
                items: [
                    { href: '/admin/users', label: 'All Users' },
                    { href: '/admin/professionals', label: 'Professionals' },
                    {
                        href: '/admin/professional-verifications',
                        label: 'Verifications',
                    },
                ],
            },
            {
                label: 'Content',
                items: [
                    { href: '/admin/meals', label: 'Meals' },
                    { href: '/admin/progress', label: 'Progress' },
                    { href: '/admin/places', label: 'Places' },
                ],
            },
            {
                label: 'System',
                items: [
                    { href: '/admin/logs', label: 'Admin Logs' },
                    { href: '/admin/notifications', label: 'Alerts' },
                ],
            },
        );
    }

    const isActive = (href: string) => {
        // Mark "Workouts" active for ANY /workouts/* subpage
        if (href === '/workouts') {
            return pathname.startsWith('/workouts');
        }

        if (href === '/settings/profile') {
            return (
                pathname === '/profile' ||
                pathname.startsWith('/settings/profile')
            );
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const paletteItems: CommandPaletteItem[] = [
        ...primaryItems.map((item) => ({
            id: item.href,
            title: item.label,
            description: `Open ${item.label.toLowerCase()}.`,
            group: 'Primary',
            href: item.href,
            keywords: [item.label, 'navigation', 'go to'],
        })),
        ...navGroups.flatMap((group) =>
            group.items.map((item) => ({
                id: `${group.label}-${item.href}`,
                title: item.label,
                description: `Open ${item.label.toLowerCase()} from ${group.label.toLowerCase()}.`,
                group: group.label,
                href: item.href,
                keywords: [group.label, item.label, item.href],
            })),
        ),
        {
            id: 'quick-log-meal',
            title: 'Log a meal',
            description: 'Jump straight to the meal tracker.',
            group: 'Quick Actions',
            href: '/track-meals',
            tone: 'accent',
            keywords: ['food', 'calories', 'nutrition'],
        },
        {
            id: 'quick-start-workout',
            title: 'Start a workout',
            description: "Open today's workout logging flow.",
            group: 'Quick Actions',
            href: '/workouts/log',
            tone: 'accent',
            keywords: ['training', 'gym', 'exercise'],
        },
        {
            id: 'quick-coach',
            title: 'Ask AI Coach',
            description:
                'Open the AI coach and continue your current guidance thread.',
            group: 'Quick Actions',
            href: '/coach',
            tone: 'accent',
            keywords: ['ai', 'coach', 'chat'],
        },
        {
            id: 'quick-logout',
            title: 'Logout',
            description: 'Sign out of Hayetak.',
            group: 'Account',
            onSelect: doLogout,
            keywords: ['sign out', 'session'],
        },
    ];

    return (
        <>
            <header className="sticky top-0 z-30 border-b border-[color:var(--sidebar-border)] bg-[color-mix(in_oklab,var(--sidebar)_86%,transparent)] text-[color:var(--sidebar-foreground)] shadow-sm backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex shrink-0 items-center gap-3"
                        >
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--sidebar-foreground)]/14 ring-1 ring-white/8 backdrop-blur-sm">
                                <span className="h-5 w-5 rounded-md bg-gradient-to-tr from-[var(--secondary)] to-[var(--primary)]" />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-xl font-bold tracking-tight">
                                    Hayetak
                                </span>
                                <span className="hidden text-[11px] tracking-[0.18em] text-[color:var(--sidebar-foreground)]/55 uppercase xl:block">
                                    Health companion
                                </span>
                            </div>
                        </Link>

                        {/* Desktop nav */}
                        <div className="hidden min-w-0 flex-1 lg:flex lg:justify-center">
                            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-[color:var(--sidebar-foreground)]/10 bg-[color:var(--sidebar-foreground)]/5 px-2 py-1 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                {primaryItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={
                                            'inline-flex shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition ' +
                                            (isActive(item.href)
                                                ? 'bg-[color:var(--sidebar-foreground)]/14 text-[color:var(--sidebar-foreground)] shadow-sm'
                                                : 'text-[color:var(--sidebar-foreground)]/80 hover:bg-[color:var(--sidebar-foreground)]/8 hover:text-[color:var(--sidebar-foreground)]')
                                        }
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                                {navGroups.map((group) => (
                                    <Submenu
                                        key={group.label}
                                        label={group.label}
                                        items={group.items}
                                        isActive={isActive}
                                    />
                                ))}
                            </nav>
                        </div>

                        <div className="hidden shrink-0 items-center gap-2 lg:flex">
                            <button
                                type="button"
                                onClick={() => setPaletteOpen(true)}
                                className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--sidebar-foreground)]/12 bg-[color:var(--sidebar-foreground)]/6 px-4 text-sm font-medium text-[color:var(--sidebar-foreground)]/88 transition hover:bg-[color:var(--sidebar-foreground)]/14"
                            >
                                <Search className="h-4 w-4" />
                                <span className="whitespace-nowrap">
                                    Search
                                </span>
                                <span className="rounded-full border border-[color:var(--sidebar-foreground)]/18 px-2 py-0.5 text-[10px] tracking-[0.16em] uppercase">
                                    Ctrl K
                                </span>
                            </button>
                            <NotificationBell compact />
                            <button
                                type="button"
                                onClick={doLogout}
                                className="inline-flex h-11 items-center rounded-full border border-[color:var(--sidebar-foreground)]/12 px-4 text-sm font-medium text-[color:var(--sidebar-foreground)] transition hover:bg-[color:var(--sidebar-foreground)]/12"
                            >
                                Logout
                            </button>
                        </div>

                        <div className="ml-auto flex items-center gap-2 lg:hidden">
                            <button
                                type="button"
                                onClick={() => setPaletteOpen(true)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--sidebar-foreground)]/10 text-[color:var(--sidebar-foreground)]"
                                aria-label="Open search"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            <NotificationBell compact />
                        </div>

                        {/* Mobile menu button */}
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--sidebar-foreground)]/10 p-2 lg:hidden"
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
            </header>

            {/* Mobile sheet */}
            {open && (
                <div className="to-[color-mix(in oklab, var(--sidebar) 70%, black 30%)] border-t border-[color:var(--sidebar-border)] bg-gradient-to-b from-[var(--sidebar)] lg:hidden">
                    <nav className="mx-auto grid max-w-7xl gap-2 px-4 py-3 sm:px-6">
                        <button
                            type="button"
                            onClick={() => {
                                setPaletteOpen(true);
                                setOpen(false);
                            }}
                            className="flex items-center justify-between rounded-lg border border-[color:var(--sidebar-foreground)]/14 bg-[color:var(--sidebar-foreground)]/8 px-3 py-2 text-left text-[color:var(--sidebar-foreground)]"
                        >
                            <span className="inline-flex items-center gap-2 text-sm font-medium">
                                <Search className="h-4 w-4" />
                                Search Hayetak
                            </span>
                            <span className="text-[10px] tracking-[0.16em] text-[color:var(--sidebar-foreground)]/65 uppercase">
                                Ctrl K
                            </span>
                        </button>
                        {primaryItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={
                                    'rounded-lg px-3 py-2 transition ' +
                                    (isActive(item.href)
                                        ? 'bg-[color:var(--sidebar-foreground)]/14 text-[color:var(--sidebar-foreground)]'
                                        : 'text-[color:var(--sidebar-foreground)]/90 hover:bg-[color:var(--sidebar-foreground)]/10')
                                }
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                        {navGroups.map((group) => (
                            <div key={group.label} className="grid gap-2">
                                <div className="text-xs font-semibold tracking-wide text-[color:var(--sidebar-foreground)]/60 uppercase">
                                    {group.label}
                                </div>
                                {group.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={
                                            'rounded-lg px-3 py-2 transition ' +
                                            (isActive(item.href)
                                                ? 'bg-[color:var(--sidebar-foreground)]/14 text-[color:var(--sidebar-foreground)]'
                                                : 'text-[color:var(--sidebar-foreground)]/90 hover:bg-[color:var(--sidebar-foreground)]/10')
                                        }
                                        onClick={() => setOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        ))}
                        <NotificationBell fullWidth />
                        <button
                            type="button"
                            onClick={doLogout}
                            className="w-full rounded-lg bg-[color:var(--destructive)]/15 px-3 py-2 text-left text-[color:var(--destructive-foreground)]/95 transition hover:bg-[color:var(--destructive)]/25"
                        >
                            Logout
                        </button>
                    </nav>
                </div>
            )}
            <CommandPalette
                items={paletteItems}
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
            />
        </>
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
        <div className="group relative shrink-0">
            <button
                type="button"
                className={
                    'inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition ' +
                    (active
                        ? 'bg-[color:var(--sidebar-foreground)]/14 text-[color:var(--sidebar-foreground)] shadow-sm'
                        : 'text-[color:var(--sidebar-foreground)]/80 hover:bg-[color:var(--sidebar-foreground)]/8 hover:text-[color:var(--sidebar-foreground)]')
                }
            >
                {label}
                <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
            <div className="invisible absolute top-full left-0 z-40 mt-3 min-w-52 rounded-2xl border border-[color:var(--sidebar-border)] bg-[color-mix(in_oklab,var(--sidebar)_94%,black_6%)] p-2 opacity-0 shadow-lg transition-all duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={
                            'block rounded-xl px-3 py-2.5 text-sm transition ' +
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
