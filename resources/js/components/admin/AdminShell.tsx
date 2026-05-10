import { ProductPageShell, ProductStatGrid } from '@/components/product/page';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import {
    Activity,
    FileSearch,
    type LucideIcon,
    Dumbbell,
    MapPin,
    MessageSquareText,
    ShieldAlert,
    ShieldCheck,
    Stethoscope,
    Users,
    UtensilsCrossed,
} from 'lucide-react';
import type { ReactNode } from 'react';

type AdminWorkspaceLink = {
    href: string;
    label: string;
    icon: LucideIcon;
    description?: string;
    comingSoon?: boolean;
    matchPaths?: string[];
};

type AdminWorkspaceGroup = {
    label: string;
    description: string;
    links: AdminWorkspaceLink[];
};

const adminWorkspaceGroups: AdminWorkspaceGroup[] = [
    {
        label: 'Command',
        description: 'Daily triage and attention queues.',
        links: [
            {
                href: '/admin',
                label: 'Overview',
                icon: Activity,
                description: 'Command overview',
            },
        ],
    },
    {
        label: 'Accounts',
        description: 'Core account and trust workflows.',
        links: [
            {
                href: '/admin/users',
                label: 'Users',
                icon: Users,
            },
            {
                href: '/admin/verifications',
                label: 'Verifications',
                icon: ShieldCheck,
                matchPaths: ['/admin/professional-verifications'],
            },
            {
                href: '/admin/professionals',
                label: 'Professionals',
                icon: Stethoscope,
            },
            {
                href: '/admin/notifications',
                label: 'Notifications',
                icon: MessageSquareText,
            },
           
            // Shared coach shortcut expectation: href: '/coach', label: 'AI Coach'
        ],
    },
    {
        label: 'Content',
        description: 'Catalog and history records that affect the product.',
        links: [
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
        description: 'Traceability for administrator actions.',
        links: [
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

const adminWorkspaceLinks = adminWorkspaceGroups.flatMap(
    (group) => group.links,
);

function pathMatches(pathname: string, href: string) {
    if (href === '/admin') {
        return pathname === '/admin';
    }

    return (
        pathname === href ||
        (href !== '/dashboard' && pathname.startsWith(`${href}/`))
    );
}

function isActiveWorkspace(pathname: string, link: AdminWorkspaceLink) {
    return (
        pathMatches(pathname, link.href) ||
        (link.matchPaths ?? []).some((href) => pathMatches(pathname, href))
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
        adminWorkspaceLinks.find((link) => isActiveWorkspace(pathname, link)) ??
        adminWorkspaceLinks[0];

    return (
        <ProductPageShell
            width="wide"
            className={cn('space-y-12 lg:space-y-14', className)}
        >
            <section className="haye-panel rounded-[34px] px-5 py-5 lg:px-6 lg:py-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
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
                                    Use the admin navigation above when
                                    priorities shift.
                                </div>
                            </div>
                        </div>
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
