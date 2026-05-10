import AppWordmark from '@/components/app-wordmark';
import CommandPalette, {
    type CommandPaletteItem,
} from '@/components/command-palette';
import NotificationBell from '@/components/NotificationBell';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type NavLinkItem = { href: string; label: string };

export default function NavHeader() {
    const [open, setOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const role = auth.user?.role ?? 'client';
    const pathname =
        typeof window === 'undefined'
            ? (page.url?.split('?')[0] ?? '/dashboard')
            : window.location.pathname;
    const userName =
        auth.user?.first_name ?? auth.user?.name ?? auth.user?.email ?? 'User';
    const accountHref = '/settings/profile';
    const homeHref = role === 'admin' ? '/admin' : '/dashboard';
    const initials = userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    const primaryItems: NavLinkItem[] =
        role === 'admin'
            ? [
                  { href: '/admin', label: 'Overview' },
                  { href: '/admin/users', label: 'Users' },
                  { href: '/admin/verifications', label: 'Verifications' },
                  { href: '/admin/professionals', label: 'Professionals' },
                  { href: '/admin/notifications', label: 'Notifications' },
                  { href: '/admin/message-moderations', label: 'Moderation' },
              ]
            : [
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/coach', label: 'Coach' },
                  { href: '/nearby', label: 'Nearby' },
              ];

    const navGroups = useMemo<
        Array<{ label: string; items: NavLinkItem[] }>
    >(() => {
        const groups: Array<{ label: string; items: NavLinkItem[] }> = [
            {
                label: 'General',
                items: [
                    { href: '/ai/planner', label: 'AI Planner' },
                    { href: '/track-meals', label: 'Meal Tracker' },
                    { href: '/workouts/plan', label: 'Workout Planner' },
                    { href: '/workouts/log', label: 'Workout Log' },
                    { href: '/appointments', label: 'Appointments' },
                    { href: '/messages', label: 'Messages' },
                ],
            },
            {
                label: 'Account',
                items: [
                    { href: '/settings/profile', label: 'Profile' },
                    { href: '/settings/security', label: 'Security' },
                ],
            },
        ];

        if (role === 'trainer') {
            groups.splice(2, 0, {
                label: 'Clients',
                items: [{ href: '/trainer/clients', label: 'My Clients' }],
            });
        }

        if (role === 'nutritionist') {
            groups.splice(2, 0, {
                label: 'Clients',
                items: [{ href: '/dietitian/clients', label: 'My Clients' }],
            });
        }

        if (role === 'admin') {
            return [
                {
                    label: 'Command',
                    items: [{ href: '/admin', label: 'Overview' }],
                },
                {
                    label: 'Accounts',
                    items: [
                        { href: '/admin/users', label: 'Users' },
                        {
                            href: '/admin/verifications',
                            label: 'Verifications',
                        },
                        {
                            href: '/admin/professionals',
                            label: 'Professionals',
                        },
                    ],
                },
                {
                    label: 'Content',
                    items: [
                        { href: '/admin/meals', label: 'Meals' },
                        { href: '/admin/meal-logs', label: 'Meal Logs' },
                        { href: '/admin/exercises', label: 'Exercises' },
                        { href: '/admin/places', label: 'Places' },
                        { href: '/admin/progress', label: 'Progress' },
                    ],
                },
                {
                    label: 'System',
                    items: [
                        {
                            href: '/admin/notifications',
                            label: 'Notifications',
                        },
                        {
                            href: '/admin/message-moderations',
                            label: 'Moderation',
                        },
                        { href: '/admin/logs', label: 'Audit Logs' },
                    ],
                },
            ];
        }

        return groups;
    }, [role]);
    const secondaryItems = useMemo(
        () =>
            navGroups.flatMap((group) =>
                group.items.map((item) => ({
                    ...item,
                    group: group.label,
                })),
            ),
        [navGroups],
    );

    const isActive = (href: string) => {
        if (role === 'admin') {
            if (href === '/admin') {
                return pathname === '/admin';
            }

            if (href === '/admin/users') {
                return (
                    pathname.startsWith('/admin/users') ||
                    pathname.startsWith('/admin/users/')
                );
            }

            if (href === '/admin/verifications') {
                return (
                    pathname.startsWith('/admin/verifications') ||
                    pathname.startsWith('/admin/professional-verifications')
                );
            }

            if (href === '/admin/professionals') {
                return (
                    pathname.startsWith('/admin/professionals') ||
                    pathname.startsWith('/admin/professionals/')
                );
            }

            if (href === '/admin/notifications') {
                return pathname.startsWith('/admin/notifications');
            }

            if (href === '/admin/logs') {
                return pathname.startsWith('/admin/logs');
            }

            if (href === '/admin/message-moderations') {
                return pathname.startsWith('/admin/message-moderations');
            }
        }

        if (
            href === '/workouts' ||
            href === '/workouts/log' ||
            href === '/workouts/plan'
        ) {
            return pathname.startsWith('/workouts');
        }

        if (href === accountHref) {
            return (
                pathname === '/profile' ||
                pathname.startsWith('/settings/profile')
            );
        }

        if (href === '/settings/security') {
            return (
                pathname === href ||
                pathname.startsWith(`${href}/`) ||
                pathname === '/settings/password' ||
                pathname === '/settings/two-factor'
            );
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const handleOpenPalette = () => {
        setOpen(false);
        setPaletteOpen(true);
    };

    const doLogout = () => {
        setOpen(false);
        router.post('/logout');
    };

    useEffect(() => {
        setOpen(false);
    }, [page.url]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

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
            <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="overflow-hidden rounded-[30px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] shadow-[0_28px_70px_-52px_rgba(9,15,28,0.92)] backdrop-blur-xl">
                        <div className="px-4 py-3 sm:px-5 lg:px-6">
                            <div className="flex items-center gap-3">
                                <Link
                                    href={homeHref}
                                    className="flex min-w-0 items-center rounded-full border border-white/10 bg-white/6 px-3 py-2 no-underline transition hover:bg-white/10"
                                >
                                    <span className="min-w-0">
                                        <AppWordmark
                                            className="max-w-full"
                                            iconClassName="size-[2.2rem]"
                                            textClassName="block truncate text-[1.52rem] text-white"
                                        />
                                        <span className="mt-1 block text-[10px] font-semibold tracking-[0.24em] text-[color:var(--sidebar-foreground)]/60 uppercase">
                                            Daily health system
                                        </span>
                                    </span>
                                </Link>

                                <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex xl:gap-2">
                                    {primaryItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={
                                                'rounded-full px-4 py-2 text-sm font-medium no-underline transition ' +
                                                (isActive(item.href)
                                                    ? 'bg-white/16 text-white shadow-sm'
                                                    : 'text-[color:var(--sidebar-foreground)]/78 hover:bg-white/8 hover:text-white')
                                            }
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </nav>

                                <div className="ml-auto hidden items-center gap-2 lg:flex">
                                    <button
                                        type="button"
                                        onClick={handleOpenPalette}
                                        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 text-sm font-medium text-[color:var(--sidebar-foreground)]/88 transition hover:bg-white/12 xl:px-4"
                                        aria-label="Open search"
                                        aria-haspopup="dialog"
                                    >
                                        <Search className="h-4 w-4" />
                                        <span className="hidden xl:inline">
                                            Search
                                        </span>
                                        <span className="hidden rounded-full border border-white/14 px-2 py-0.5 text-[10px] tracking-[0.16em] uppercase xl:inline-flex">
                                            Ctrl K
                                        </span>
                                    </button>
                                    <NotificationBell compact />
                                    <Link
                                        href={accountHref}
                                        className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-3 py-2 no-underline transition hover:bg-white/12"
                                    >
                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                                            {initials || 'H'}
                                        </span>
                                        <span className="hidden xl:block">
                                            <span className="block text-sm font-semibold">
                                                {userName}
                                            </span>
                                            <span className="block text-[10px] tracking-[0.18em] text-[color:var(--sidebar-foreground)]/58 uppercase">
                                                {role}
                                            </span>
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={doLogout}
                                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-3 text-sm font-medium text-[color:var(--sidebar-foreground)] transition hover:bg-white/10 xl:px-4"
                                    >
                                        <LogOut className="h-4 w-4 xl:mr-2" />
                                        <span className="hidden xl:inline">
                                            Logout
                                        </span>
                                    </button>
                                </div>

                                <div className="ml-auto flex items-center gap-2 lg:hidden">
                                    <button
                                        type="button"
                                        onClick={handleOpenPalette}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[color:var(--sidebar-foreground)]"
                                        aria-label="Open search"
                                        aria-haspopup="dialog"
                                    >
                                        <Search className="h-4 w-4" />
                                    </button>
                                    <NotificationBell compact />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpen((value) => !value)
                                        }
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[color:var(--sidebar-foreground)]"
                                        aria-label="Toggle navigation"
                                        aria-controls="mobile-hayetak-nav"
                                        aria-expanded={open}
                                    >
                                        {open ? (
                                            <X className="h-4 w-4" />
                                        ) : (
                                            <Menu className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 hidden border-t border-white/8 pt-3 lg:block">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="shrink-0 text-[10px] font-semibold tracking-[0.22em] text-[color:var(--sidebar-foreground)]/56 uppercase">
                                        Quick access
                                    </span>
                                    <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
                                        {secondaryItems.map((item) => (
                                            <Link
                                                key={`${item.group}-${item.href}`}
                                                href={item.href}
                                                className={
                                                    'shrink-0 rounded-full border px-3 py-1.5 text-sm no-underline transition ' +
                                                    (isActive(item.href)
                                                        ? 'border-white/14 bg-white/14 text-white'
                                                        : 'border-transparent bg-white/5 text-[color:var(--sidebar-foreground)]/76 hover:border-white/10 hover:bg-white/10 hover:text-white')
                                                }
                                                title={`${item.group}: ${item.label}`}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {open ? (
                <div className="px-4 pt-3 sm:px-6 lg:hidden">
                    <div
                        id="mobile-hayetak-nav"
                        className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] shadow-[0_24px_60px_-42px_rgba(9,15,28,0.9)] backdrop-blur-xl"
                    >
                        <div className="grid max-h-[calc(100svh-7.5rem)] gap-4 overflow-y-auto px-4 py-4">
                            <Link
                                href={accountHref}
                                className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/6 px-4 py-3 no-underline"
                                onClick={() => setOpen(false)}
                            >
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
                                    {initials || 'H'}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">
                                        {userName}
                                    </span>
                                    <span className="block text-[10px] tracking-[0.18em] text-[color:var(--sidebar-foreground)]/58 uppercase">
                                        {role}
                                    </span>
                                </span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => {
                                    handleOpenPalette();
                                }}
                                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-left"
                            >
                                <span className="inline-flex items-center gap-2 text-sm font-medium">
                                    <Search className="h-4 w-4" />
                                    Search Hayetak
                                </span>
                                <span className="text-[10px] tracking-[0.16em] text-[color:var(--sidebar-foreground)]/62 uppercase">
                                    Ctrl K
                                </span>
                            </button>

                            <div className="grid gap-2">
                                {primaryItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={
                                            'rounded-2xl px-4 py-3 no-underline transition ' +
                                            (isActive(item.href)
                                                ? 'bg-white/16 text-white'
                                                : 'bg-white/6 text-[color:var(--sidebar-foreground)]/88 hover:bg-white/10')
                                        }
                                        onClick={() => setOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>

                            {navGroups.map((group) => (
                                <div
                                    key={group.label}
                                    className="rounded-[24px] border border-white/10 bg-white/6 p-3"
                                >
                                    <div className="px-1 text-[10px] font-semibold tracking-[0.22em] text-[color:var(--sidebar-foreground)]/58 uppercase">
                                        {group.label}
                                    </div>
                                    <div className="mt-2 grid gap-2">
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={
                                                    'rounded-2xl px-4 py-3 no-underline transition ' +
                                                    (isActive(item.href)
                                                        ? 'bg-white/16 text-white'
                                                        : 'bg-white/6 text-[color:var(--sidebar-foreground)]/88 hover:bg-white/10')
                                                }
                                                onClick={() => setOpen(false)}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <NotificationBell fullWidth />

                            <button
                                type="button"
                                onClick={doLogout}
                                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-[color:var(--sidebar-foreground)] transition hover:bg-white/10"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <CommandPalette
                items={paletteItems}
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
            />
        </>
    );
}
