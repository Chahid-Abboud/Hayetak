import NavHeader from '@/components/NavHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

const ADMIN_NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/professionals', label: 'Professionals' },
    { href: '/admin/professional-verifications', label: 'Verifications' },
    { href: '/admin/notifications', label: 'Alerts' },
    { href: '/admin/logs', label: 'Logs' },
    { href: '/admin/meals', label: 'Meals' },
    { href: '/admin/progress', label: 'Progress' },
    { href: '/admin/places', label: 'Places' },
];

export function AdminShell({
    title,
    description,
    actions,
    children,
    className,
}: {
    title: string;
    description: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const pathname =
        typeof window === 'undefined' ? '/dashboard' : window.location.pathname;

    return (
        <>
            <NavHeader />
            <main
                className={cn(
                    'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8',
                    className,
                )}
            >
                <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-sm">
                    <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.14),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.58))] px-5 py-6 sm:px-7 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.24),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))]">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl space-y-3">
                                <Badge
                                    variant="outline"
                                    className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase"
                                >
                                    Admin Console
                                </Badge>
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                        {title}
                                    </h1>
                                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                                        {description}
                                    </p>
                                </div>
                            </div>
                            {actions ? (
                                <div className="flex flex-wrap items-center gap-3">
                                    {actions}
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {ADMIN_NAV_ITEMS.map((item) => {
                                const active =
                                    item.href === '/dashboard'
                                        ? pathname === '/dashboard'
                                        : pathname === item.href ||
                                          pathname.startsWith(`${item.href}/`);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-sm transition',
                                            active
                                                ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                                                : 'border-border/70 bg-background/80 text-foreground hover:border-primary/30 hover:bg-muted',
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-5 py-6 sm:px-7">{children}</div>
                </section>
            </main>
        </>
    );
}

export function AdminStatsGrid({ children }: { children: ReactNode }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {children}
        </div>
    );
}

export function AdminStatCard({
    label,
    value,
    tone = 'default',
    helper,
}: {
    label: string;
    value: string;
    tone?: 'default' | 'accent';
    helper?: string;
}) {
    return (
        <Card
            className={cn(
                'gap-0 rounded-2xl border-border/70 py-0 shadow-none',
                tone === 'accent' && 'border-primary/20 bg-primary/5',
            )}
        >
            <CardContent className="space-y-2 px-5 py-5">
                <p className="text-sm font-medium text-muted-foreground">
                    {label}
                </p>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                    {value}
                </p>
                {helper ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                        {helper}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

export function AdminSection({
    title,
    description,
    actions,
    children,
    className,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Card
            className={cn(
                'gap-0 rounded-2xl border-border/70 py-0 shadow-none',
                className,
            )}
        >
            <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    {description ? (
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap gap-2">{actions}</div>
                ) : null}
            </div>
            <CardContent className="px-5 py-5">{children}</CardContent>
        </Card>
    );
}
