import { AppProductShell } from '@/components/product/app-shell';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

const adminQuickLinks = [{ href: '/coach', label: 'AI Coach' }];

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
    return (
        <AppProductShell
            mainClassName={cn('mx-auto w-full max-w-7xl space-y-6', className)}
        >
            <section className="haye-panel overflow-hidden rounded-[34px]">
                <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(24,99,116,0.16),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(138,166,104,0.12),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.58))] px-5 py-6 sm:px-6 sm:py-7 dark:bg-[radial-gradient(circle_at_top_left,_rgba(24,99,116,0.24),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(138,166,104,0.2),_transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.8))]">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                        <div className="max-w-3xl space-y-3">
                            <span className="haye-kicker">Admin Console</span>
                            <div className="space-y-2">
                                <h1
                                    className="text-3xl tracking-tight text-foreground sm:text-4xl"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    {title}
                                </h1>
                                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                                    {description}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-border/70 bg-background/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur">
                            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                                <div className="rounded-[22px] border border-border/70 bg-card/88 p-4">
                                    <p className="haye-kicker">Operations</p>
                                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                        <ShieldCheck className="h-4 w-4 text-secondary" />
                                        Moderation and access
                                    </div>
                                </div>
                                <div className="rounded-[22px] border border-border/70 bg-card/88 p-4">
                                    <p className="haye-kicker">Activity</p>
                                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                        <Activity className="h-4 w-4 text-secondary" />
                                        Logs, notifications, and records
                                    </div>
                                </div>
                                <div className="rounded-[22px] border border-border/70 bg-card/88 p-4">
                                    <p className="haye-kicker">Oversight</p>
                                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                        <Sparkles className="h-4 w-4 text-secondary" />
                                        Consistent product governance
                                    </div>
                                </div>
                            </div>

                            {actions ? (
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    {actions}
                                </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {adminQuickLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/70"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-5 py-6 sm:px-6">{children}</div>
            </section>
        </AppProductShell>
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
        <div
            className={cn(
                'haye-panel rounded-[26px] px-5 py-5',
                tone === 'accent' && 'border-secondary/25 bg-secondary/10',
            )}
        >
            <p className="haye-kicker">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {value}
            </p>
            {helper ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {helper}
                </p>
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
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'haye-panel rounded-[30px] overflow-hidden',
                className,
            )}
        >
            <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
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
            <div className="px-5 py-5 sm:px-6">{children}</div>
        </section>
    );
}
