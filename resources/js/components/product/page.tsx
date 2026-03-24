import NavHeader from '@/components/NavHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

type ProductPageWidth = 'compact' | 'default' | 'wide';

const WIDTH_CLASS: Record<ProductPageWidth, string> = {
    compact: 'max-w-5xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
};

export function ProductPageShell({
    children,
    className,
    width = 'default',
    withNav = true,
}: {
    children: ReactNode;
    className?: string;
    width?: ProductPageWidth;
    withNav?: boolean;
}) {
    return (
        <>
            {withNav ? <NavHeader /> : null}
            <main
                className={cn(
                    'mx-auto w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8',
                    WIDTH_CLASS[width],
                    className,
                )}
            >
                {children}
            </main>
        </>
    );
}

export function ProductHero({
    eyebrow,
    title,
    description,
    actions,
    meta,
    className,
}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    meta?: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-sm',
                className,
            )}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,164,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.78))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(52,211,153,0.18),_transparent_28%),linear-gradient(180deg,rgba(11,16,32,0.96),rgba(11,16,32,0.88))]" />
            <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-3">
                    {typeof eyebrow === 'string' ? (
                        <Badge
                            variant="outline"
                            className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase"
                        >
                            {eyebrow}
                        </Badge>
                    ) : (
                        eyebrow
                    )}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            {title}
                        </h1>
                        {description ? (
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    {meta ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {meta}
                        </div>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap items-center gap-3">
                        {actions}
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function ProductSection({
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
        <Card
            className={cn(
                'gap-0 rounded-[24px] border-border/70 bg-card/95 py-0 shadow-sm',
                className,
            )}
        >
            <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    {description ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {actions}
                    </div>
                ) : null}
            </div>
            <CardContent className={cn('px-5 py-5', contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}

export function ProductStatGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-4 sm:grid-cols-2 xl:grid-cols-4',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function ProductStatCard({
    label,
    value,
    helper,
    tone = 'default',
}: {
    label: ReactNode;
    value: ReactNode;
    helper?: ReactNode;
    tone?: 'default' | 'accent';
}) {
    return (
        <Card
            className={cn(
                'gap-0 rounded-2xl border-border/70 bg-card/95 py-0 shadow-sm',
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

export function ProductEmptyState({
    title,
    description,
    action,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-[24px] border border-dashed border-border bg-muted/20 px-6 py-10 text-center',
                className,
            )}
        >
            <div className="mx-auto max-w-md space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                    {title}
                </h3>
                {description ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                ) : null}
                {action ? (
                    <div className="flex justify-center pt-2">{action}</div>
                ) : null}
            </div>
        </div>
    );
}

export function ProductBanner({
    children,
    tone = 'default',
    className,
    ...props
}: {
    children: ReactNode;
    tone?: 'default' | 'success' | 'danger';
    className?: string;
} & HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...props}
            className={cn(
                'rounded-2xl border px-4 py-3 text-sm',
                tone === 'default' &&
                    'border-border/70 bg-muted/30 text-foreground',
                tone === 'success' &&
                    'border-primary/30 bg-primary/10 text-foreground',
                tone === 'danger' &&
                    'border-destructive/30 bg-destructive/10 text-foreground',
                className,
            )}
        >
            {children}
        </div>
    );
}
