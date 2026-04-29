import {
    ProductPageShell,
    ProductStatGrid,
} from '@/components/product/page';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Bell,
    type LucideIcon,
    MapPin,
    ShieldCheck,
    Settings2,
    Sparkles,
    Users,
    UtensilsCrossed,
} from 'lucide-react';
import type { ReactNode } from 'react';

type AdminWorkspaceLink = {
    href: string;
    label: string;
    icon: LucideIcon;
    comingSoon?: boolean;
};

type AdminWorkspaceGroup = {
    label: string;
    links: AdminWorkspaceLink[];
};

const adminWorkspaceLinks: AdminWorkspaceLink[] = [
    { href: '/admin', label: 'Overview', icon: Activity },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/safety-profiles', label: 'Safety Profiles', icon: ShieldCheck },
    { href: '/admin/professionals', label: 'Professionals', icon: ShieldCheck },
    {
        href: '/admin/professional-verifications',
        label: 'Verifications',
        icon: ShieldCheck,
    },
    { href: '/admin/assignments', label: 'Assignments', icon: Users },
    { href: '/admin/meals', label: 'Meals', icon: UtensilsCrossed },
    { href: '/admin/meal-logs', label: 'Meal Logs', icon: UtensilsCrossed },
    { href: '/admin/exercises', label: 'Exercises', icon: Activity },
    { href: '/admin/progress', label: 'Progress', icon: Activity },
    { href: '/admin/places', label: 'Places', icon: MapPin },
    { href: '/admin/ai/planner', label: 'AI Planner', icon: Sparkles },
    { href: '/coach', label: 'AI Coach', icon: Sparkles },
    { href: '/admin/safety-rules', label: 'Safety Rules', icon: ShieldCheck },
    { href: '/admin/diagnostics', label: 'Diagnostics', icon: Settings2 },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    { href: '/admin/support-cases', label: 'Support Cases', icon: Users },
    { href: '/admin/analytics', label: 'Analytics', icon: Activity },
    { href: '/admin/logs', label: 'Audit Logs', icon: Settings2 },
    { href: '/admin/roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck },
    { href: '/admin/privacy-compliance', label: 'Privacy & Compliance', icon: ShieldCheck },
    { href: '/admin/settings-feature-flags', label: 'Settings / Feature Flags', icon: Settings2 },
    { href: '/admin/ai-rollouts', label: 'AI Rollouts', icon: Sparkles },
];

const adminWorkspaceGroups: AdminWorkspaceGroup[] = [
    {
        label: 'Command',
        links: [adminWorkspaceLinks[0]],
    },
    {
        label: 'People',
        links: [adminWorkspaceLinks[1], adminWorkspaceLinks[2], adminWorkspaceLinks[3], adminWorkspaceLinks[4], adminWorkspaceLinks[5]],
    },
    {
        label: 'Health Data',
        links: [adminWorkspaceLinks[6], adminWorkspaceLinks[7], adminWorkspaceLinks[8], adminWorkspaceLinks[9], adminWorkspaceLinks[10]],
    },
    {
        label: 'AI Operations',
        links: [adminWorkspaceLinks[11], adminWorkspaceLinks[12], adminWorkspaceLinks[13], adminWorkspaceLinks[14]],
    },
    {
        label: 'Operations',
        links: [adminWorkspaceLinks[15], adminWorkspaceLinks[16], adminWorkspaceLinks[17]],
    },
    {
        label: 'System',
        links: [adminWorkspaceLinks[18], adminWorkspaceLinks[19], adminWorkspaceLinks[20], adminWorkspaceLinks[21], adminWorkspaceLinks[22]],
    },
];

function isActiveWorkspace(pathname: string, href: string) {
    return (
        pathname === href ||
        (href !== '/dashboard' && pathname.startsWith(`${href}/`))
    );
}

function AdminWorkspaceRail({ pathname }: { pathname: string }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {adminWorkspaceGroups.map((group) => (
                <div
                    key={group.label}
                    className="dashboard-surface rounded-[22px] p-3"
                >
                    <div className="haye-kicker">{group.label}</div>
                    <div className="mt-2 max-h-28 overflow-auto pr-1 [scrollbar-width:thin]">
                        <div className="flex flex-wrap gap-2">
                        {group.links.map((link) => {
                            const active =
                                !link.comingSoon &&
                                isActiveWorkspace(pathname, link.href);
                            const classes = cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium no-underline transition',
                                active
                                    ? 'border-primary/28 bg-primary text-primary-foreground shadow-[0_16px_34px_-24px_rgba(15,23,42,0.32)]'
                                    : 'border-border/55 bg-background/70 text-muted-foreground hover:border-primary/22 hover:text-foreground',
                                link.comingSoon &&
                                    'cursor-default border-dashed hover:border-border/55 hover:text-muted-foreground',
                            );

                            if (link.comingSoon) {
                                return (
                                    <span
                                        key={`${group.label}-${link.label}`}
                                        className={classes}
                                    >
                                        <link.icon className="h-3.5 w-3.5" />
                                        {link.label}
                                        <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[9px] tracking-[0.16em] uppercase">
                                            Soon
                                        </span>
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={classes}
                                >
                                    <link.icon className="h-3.5 w-3.5" />
                                    {link.label}
                                </Link>
                            );
                        })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function AdminShell({
    title,
    description,
    actions,
    children,
    className,
}: {
    title: ReactNode;
    description: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const page = usePage();
    const pathname =
        typeof window === 'undefined'
            ? (page.url?.split('?')[0] ?? '/dashboard')
            : window.location.pathname;

    const activeWorkspace =
        adminWorkspaceLinks.find((link) =>
            isActiveWorkspace(pathname, link.href),
        ) ?? adminWorkspaceLinks[0];

    return (
        <ProductPageShell
            width="wide"
            className={cn('space-y-12 lg:space-y-14', className)}
        >
            <section className="haye-panel rounded-[34px] px-5 py-5 lg:px-6 lg:py-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-start">
                    <div className="max-w-4xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="haye-kicker">Admin workspace</span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-primary-foreground uppercase">
                                <activeWorkspace.icon className="h-3.5 w-3.5" />
                                {activeWorkspace.label}
                            </span>
                        </div>
                        <h1
                            className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {title}
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                            {description}
                        </p>
                        {actions ? (
                            <div className="mt-5 flex flex-wrap items-center gap-2.5">
                                {actions}
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-3">
                        <div className="dashboard-surface-accent rounded-[24px] px-4 py-4">
                            <div className="flex items-start gap-3">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_40px_-26px_rgba(15,23,42,0.34)]">
                                    <activeWorkspace.icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className="haye-kicker">
                                        Current surface
                                    </div>
                                    <div className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
                                        {activeWorkspace.label}
                                    </div>
                                    <div className="mt-1 text-sm leading-5 text-foreground/80">
                                        Keep the full admin journey inside one
                                        visual system, with quick jumps to the
                                        next queue when priorities shift.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <AdminWorkspaceRail pathname={pathname} />
                    </div>
                </div>
            </section>

            {children}
        </ProductPageShell>
    );
}

export function AdminStatsGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <ProductStatGrid className={className}>{children}</ProductStatGrid>;
}

export function AdminStatCard({
    label,
    value,
    tone = 'default',
    helper,
}: {
    label: ReactNode;
    value: ReactNode;
    tone?: 'default' | 'accent';
    helper?: ReactNode;
}) {
    return (
        <div
            className={cn(
                'dashboard-surface rounded-[24px] px-4 py-4',
                tone === 'accent' && 'dashboard-surface-accent',
            )}
        >
            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {value}
            </div>
            {helper ? (
                <div className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {helper}
                </div>
            ) : null}
        </div>
    );
}

export function AdminSection({
    title,
    description,
    actions,
    children,
    className,
    contentClassName,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section
            className={cn(
                'haye-panel rounded-[30px] p-5 text-card-foreground lg:p-6',
                className,
            )}
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <p className="haye-kicker">Section</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap gap-3">{actions}</div>
                ) : null}
            </div>

            <div className={cn('mt-5', contentClassName)}>{children}</div>
        </section>
    );
}
