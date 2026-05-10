import AppWordmark from '@/components/app-wordmark';
import NotificationBell from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    Bell,
    CalendarDays,
    ClipboardCheck,
    FileSearch,
    Dumbbell,
    LayoutDashboard,
    LogOut,
    MapPin,
    Menu,
    MessageSquare,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    Users,
    UtensilsCrossed,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    match?: string[];
    keywords?: string[];
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const FOCUS_RING =
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function matchesPath(pathname: string, item: NavItem) {
    const patterns = [item.href, ...(item.match ?? [])];

    return patterns.some((pattern) => {
        if (pattern === '/admin') return pathname === '/admin';
        if (pathname === pattern) return true;
        return pattern !== '/' && pathname.startsWith(`${pattern}/`);
    });
}

function SidebarNavLink({
    item,
    pathname,
    onClick,
    compact = false,
}: {
    item: NavItem;
    pathname: string;
    onClick?: () => void;
    compact?: boolean;
}) {
    const active = matchesPath(pathname, item);

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(
                FOCUS_RING,
                'group flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium no-underline transition',
                active
                    ? 'bg-[color:var(--sidebar-foreground)]/12 text-[color:var(--sidebar-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-[color:var(--sidebar-foreground)]/68 hover:bg-[color:var(--sidebar-foreground)]/8 hover:text-[color:var(--sidebar-foreground)]',
                compact && 'justify-center px-2',
            )}
        >
            <span
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition',
                    active
                        ? 'border-[color:var(--sidebar-primary)]/30 bg-[color:var(--sidebar-primary)]/18 text-[color:var(--sidebar-primary)]'
                        : 'border-transparent bg-[color:var(--sidebar-foreground)]/6 text-[color:var(--sidebar-foreground)]/58 group-hover:text-[color:var(--sidebar-foreground)]/84',
                )}
            >
                <item.icon className="h-4 w-4" />
            </span>
            {!compact ? (
                <span className="min-w-0 truncate">{item.label}</span>
            ) : null}
        </Link>
    );
}

function MobileBottomNav({
    items,
    pathname,
}: {
    items: NavItem[];
    pathname: string;
}) {
    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/92 px-2 py-2 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-5 gap-1">
                {items.map((item) => {
                    const active = matchesPath(pathname, item);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                FOCUS_RING,
                                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2 text-[11px] font-medium no-underline transition',
                                active
                                    ? 'bg-primary text-primary-foreground shadow-[0_18px_36px_-28px_rgba(23,38,60,0.92)]'
                                    : 'text-muted-foreground hover:bg-card/88 hover:text-foreground',
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

function ShellSidebar({
    pathname,
    userName,
    initials,
    roleLabel,
    primaryNav,
    secondaryGroups,
    homeHref,
    onLogout,
    onNavigate,
    mobile,
}: {
    pathname: string;
    userName: string;
    initials: string;
    roleLabel: string;
    primaryNav: NavItem[];
    secondaryGroups: NavGroup[];
    homeHref: string;
    onLogout: () => void;
    onNavigate?: () => void;
    mobile?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex h-full flex-col overflow-hidden rounded-[32px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] shadow-[0_28px_70px_-52px_rgba(9,15,28,0.92)] backdrop-blur-xl',
                mobile
                    ? 'm-3 h-[calc(100svh-1.5rem)]'
                    : 'h-[calc(100svh-2rem)]',
            )}
        >
            <div className="border-b border-[color:var(--sidebar-border)] px-4 py-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={homeHref}
                        onClick={onNavigate}
                        className="flex min-w-0 items-center no-underline"
                    >
                        <span className="min-w-0">
                            <AppWordmark
                                className="max-w-full"
                                iconClassName="size-[2.2rem]"
                                textClassName="block truncate text-[1.52rem] text-[color:var(--sidebar-foreground)]"
                            />
                            <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.22em] text-[color:var(--sidebar-foreground)]/56 uppercase">
                                Daily health system
                            </span>
                        </span>
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1">
                    {primaryNav.map((item) => (
                        <SidebarNavLink
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            onClick={onNavigate}
                        />
                    ))}
                </div>

                <div className="mt-5 space-y-4">
                    {secondaryGroups.map((group) => (
                        <div
                            key={group.label}
                            className="rounded-[24px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-foreground)]/5 px-2 py-3"
                        >
                            <div className="px-2 text-[10px] font-semibold tracking-[0.22em] text-[color:var(--sidebar-foreground)]/52 uppercase">
                                {group.label}
                            </div>
                            <div className="mt-2 space-y-1">
                                {group.items.map((item) => (
                                    <SidebarNavLink
                                        key={`${group.label}-${item.href}`}
                                        item={item}
                                        pathname={pathname}
                                        onClick={onNavigate}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-[color:var(--sidebar-border)] p-3">
                <NotificationBell fullWidth />

                <div className="mt-3 rounded-[24px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-foreground)]/6 p-3">
                    <Link
                        href="/settings/profile"
                        onClick={onNavigate}
                        className="flex items-center gap-3 no-underline"
                    >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--sidebar-foreground)]/12 text-sm font-semibold text-[color:var(--sidebar-foreground)]">
                            {initials || 'H'}
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[color:var(--sidebar-foreground)]">
                                {userName}
                            </span>
                            <span className="block text-[10px] tracking-[0.18em] text-[color:var(--sidebar-foreground)]/58 uppercase">
                                {roleLabel}
                            </span>
                        </span>
                    </Link>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <Link
                            href="/settings/profile"
                            onClick={onNavigate}
                            className={cn(
                                FOCUS_RING,
                                'inline-flex items-center justify-center rounded-[18px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-foreground)]/7 px-3 py-2 text-xs font-medium no-underline transition hover:bg-[color:var(--sidebar-foreground)]/11',
                            )}
                        >
                            Profile
                        </Link>
                        <button
                            type="button"
                            onClick={onLogout}
                            className={cn(
                                FOCUS_RING,
                                'inline-flex items-center justify-center gap-2 rounded-[18px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-foreground)]/7 px-3 py-2 text-xs font-medium transition hover:bg-[color:var(--sidebar-foreground)]/11',
                            )}
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AppProductShell({
    children,
    mainClassName,
}: {
    children: ReactNode;
    mainClassName?: string;
}) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const user = auth.user;
    const role = user?.role ?? 'client';
    const pathname =
        typeof window === 'undefined'
            ? (page.url?.split('?')[0] ?? '/dashboard')
            : window.location.pathname;
    const [mobileOpen, setMobileOpen] = useState(false);

    const userName =
        user?.first_name ?? user?.name ?? user?.email ?? 'Hayetak User';
    const initials = userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    const roleLabel =
        role === 'nutritionist'
            ? 'Dietitian'
            : role === 'trainer'
              ? 'Personal Trainer'
              : role === 'admin'
                ? 'Admin'
                : 'Client';

    const primaryNav = useMemo<NavItem[]>(() => {
        if (role === 'admin') {
            return [
                {
                    href: '/admin',
                    label: 'Command',
                    icon: LayoutDashboard,
                    keywords: ['admin', 'command center', 'overview'],
                },
                {
                    href: '/admin/users',
                    label: 'Users',
                    icon: Users,
                    keywords: ['users', 'accounts', 'investigation'],
                },
                {
                    href: '/admin/verifications',
                    label: 'Verify',
                    icon: ShieldCheck,
                    keywords: ['verifications', 'professional review'],
                    match: ['/admin/professional-verifications'],
                },
                {
                    href: '/admin/professionals',
                    label: 'Professionals',
                    icon: Stethoscope,
                    keywords: ['professionals', 'trainers', 'dietitians'],
                },
                {
                    href: '/admin/notifications',
                    label: 'Notifications',
                    icon: Bell,
                    keywords: ['alerts', 'notifications', 'broadcasts'],
                },
                {
                    href: '/admin/message-moderations',
                    label: 'Moderation',
                    icon: ShieldAlert,
                    keywords: ['moderation', 'flagged messages', 'escalations'],
                },
            ];
        }

        const professionalPrimaryItem =
            role === 'trainer'
                ? {
                      href: '/trainer/clients',
                      label: 'My Clients',
                      icon: Users,
                      keywords: ['clients', 'trainer clients', 'assigned clients'],
                  }
                : role === 'nutritionist'
                  ? {
                        href: '/dietitian/clients',
                        label: 'My Clients',
                        icon: Users,
                        keywords: [
                            'clients',
                            'dietitian clients',
                            'assigned clients',
                        ],
                    }
                  : null;

        return [
            {
                href: '/dashboard',
                label: 'Dashboard',
                icon: LayoutDashboard,
                keywords: ['dashboard', 'home', 'overview'],
            },
            ...(professionalPrimaryItem ? [professionalPrimaryItem] : []),
            {
                href: '/coach',
                label: 'AI Coach',
                icon: Sparkles,
                keywords: ['coach', 'ai', 'chat'],
            },
            {
                href: '/ai/planner',
                label: 'AI Planner',
                icon: ClipboardCheck,
                keywords: ['AI planner', 'ai plan', 'diet plan', 'workout plan'],
                match: ['/planner'],
            },
            {
                href: '/track-meals',
                label: 'Meals',
                icon: UtensilsCrossed,
                keywords: ['meal tracker', 'food', 'nutrition'],
            },
            {
                href: '/workouts/log',
                label: 'Workouts',
                icon: Dumbbell,
                match: ['/workouts/plan'],
                keywords: ['workout log', 'workouts', 'training'],
            },
        ];
    }, [role]);

    const secondaryGroups = useMemo<NavGroup[]>(() => {
        if (role === 'admin') {
            return [
                {
                    label: 'Content',
                    items: [
                        {
                            href: '/admin/meals',
                            label: 'Meals',
                            icon: UtensilsCrossed,
                        },
                        {
                            href: '/admin/meal-logs',
                            label: 'Meal Logs',
                            icon: UtensilsCrossed,
                        },
                        {
                            href: '/admin/exercises',
                            label: 'Exercises',
                            icon: Dumbbell,
                        },
                        {
                            href: '/admin/places',
                            label: 'Places',
                            icon: MapPin,
                        },
                        {
                            href: '/admin/progress',
                            label: 'Progress',
                            icon: Activity,
                        },
                    ],
                },
                {
                    label: 'System',
                    items: [
                        {
                            href: '/admin/logs',
                            label: 'Audit Logs',
                            icon: FileSearch,
                        },
                        {
                            href: '/admin/message-moderations',
                            label: 'Moderation',
                            icon: ShieldAlert,
                        },
                    ],
                },
            ];
        }

        /*
        const programItems: NavItem[] = [
            { href: '/workouts/plan' },
            { href: '/trainer/clients' },
            { href: '/dietitian/clients' },
            { href: '/settings/profile' },
            { href: '/settings/security' },
        ];
        */
        const groups: NavGroup[] = [];
        groups.push({
            label: 'Support',
            items: [
                {
                    href: '/nearby',
                    label: 'Nearby support',
                    icon: MapPin,
                    keywords: ['nearby', 'gyms', 'nutritionists'],
                },
            ],
        });
        
        groups.push({
            label: 'Connect',
            items: [
                {
                    href: '/messages',
                    label: 'Messages',
                    icon: MessageSquare,
                    keywords: ['messages', 'chat', 'conversations'],
                },
                {
                    href: '/appointments',
                    label: 'Appointments',
                    icon: CalendarDays,
                    keywords: ['appointments', 'schedule', 'sessions'],
                },
            ],
        });
        

        return groups;
    }, [role]);

    const allNavItems = useMemo(
        () => [
            ...primaryNav,
            ...secondaryGroups.flatMap((group) => group.items),
        ],
        [primaryNav, secondaryGroups],
    );

    const activeItem =
        allNavItems.find((item) => matchesPath(pathname, item)) ??
        primaryNav[0];

    useEffect(() => {
        setMobileOpen(false);
    }, [page.url]);

    useEffect(() => {
        if (!mobileOpen) return;

        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileOpen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [mobileOpen]);

    const bottomNav =
        role === 'admin'
            ? [
                  {
                      href: '/admin',
                      label: 'Command',
                      icon: LayoutDashboard,
                  },
                  {
                      href: '/admin/users',
                      label: 'Users',
                      icon: Users,
                  },
                  {
                      href: '/admin/verifications',
                      label: 'Verify',
                      icon: ShieldCheck,
                  },
                  {
                      href: '/admin/professionals',
                      label: 'Pros',
                      icon: Stethoscope,
                  },
                  {
                      href: '/admin/notifications',
                      label: 'Alerts',
                      icon: Bell,
                  },
                  {
                      href: '/admin/message-moderations',
                      label: 'Moderation',
                      icon: ShieldAlert,
                  },
              ]
            : [
                  primaryNav[0],
                  primaryNav[2],
                  primaryNav[3],
                  primaryNav[1],
                  primaryNav[4],
              ];

    return (
        <>
            <a
                href="#main-content"
                className={cn(
                    FOCUS_RING,
                    'sr-only rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60]',
                )}
            >
                Skip to main content
            </a>

            <div className="min-h-screen lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="hidden lg:block">
                    <div className="sticky top-0 p-4">
                        <ShellSidebar
                            pathname={pathname}
                            userName={userName}
                            initials={initials}
                            roleLabel={roleLabel}
                            primaryNav={primaryNav}
                            secondaryGroups={secondaryGroups}
                            homeHref={role === 'admin' ? '/admin' : '/dashboard'}
                            onLogout={() => router.post('/logout')}
                        />
                    </div>
                </aside>

                {mobileOpen ? (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label="Close navigation"
                            className="absolute inset-0 bg-primary/35 backdrop-blur-sm"
                            onClick={() => setMobileOpen(false)}
                        />
                        <div className="relative h-full max-w-[22rem]">
                            <ShellSidebar
                                pathname={pathname}
                                userName={userName}
                                initials={initials}
                                roleLabel={roleLabel}
                                primaryNav={primaryNav}
                                secondaryGroups={secondaryGroups}
                                homeHref={
                                    role === 'admin' ? '/admin' : '/dashboard'
                                }
                                onLogout={() => {
                                    setMobileOpen(false);
                                    router.post('/logout');
                                }}
                                onNavigate={() => setMobileOpen(false)}
                                mobile
                            />
                        </div>
                    </div>
                ) : null}

                <div className="flex min-h-screen flex-col">
                    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/82 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileOpen(true)}
                                className={cn(
                                    FOCUS_RING,
                                    'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/82 text-foreground shadow-sm transition hover:bg-background',
                                )}
                                aria-label="Open navigation"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <div className="min-w-0 flex-1">
                                <AppWordmark
                                    className="max-w-[10.5rem]"
                                    iconClassName="size-[1.7rem]"
                                    textClassName="text-[1.08rem] text-foreground"
                                />
                                <div
                                    className="mt-1 truncate text-lg tracking-tight text-foreground"
                                >
                                    {activeItem?.label ?? 'Dashboard'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <NotificationBell compact />
                            </div>
                        </div>
                    </header>

                    <main
                        id="main-content"
                        className={cn(
                            'flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-8 lg:pb-10',
                        )}
                    >
                        <div className={mainClassName}>{children}</div>
                    </main>

                    <MobileBottomNav items={bottomNav} pathname={pathname} />
                </div>
            </div>
        </>
    );
}
