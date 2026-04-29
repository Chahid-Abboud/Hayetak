import { AppProductShell } from '@/components/product/app-shell';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

type ProductPageWidth = 'compact' | 'default' | 'wide';

const WIDTH_CLASS: Record<ProductPageWidth, string> = {
    compact: 'max-w-5xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
};

const DEFAULT_SECTION_STACK = 'space-y-12 sm:space-y-14 lg:space-y-16';

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
    const mainClassName = cn('mx-auto w-full', WIDTH_CLASS[width]);
    const contentClassName = cn(
        'mt-5',
        DEFAULT_SECTION_STACK,
        className,
    );

    if (!withNav) {
        return (
            <main
                className={cn(
                    'px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8 lg:pb-14',
                    mainClassName,
                )}
            >
                <div className="flex justify-end">
                    <div className="rounded-[18px] border border-border/70 bg-background/78 p-1 shadow-sm">
                        <ThemeSwitcher />
                    </div>
                </div>
                <div className={contentClassName}>{children}</div>
            </main>
        );
    }

    return (
        <AppProductShell mainClassName={mainClassName}>
            <div className="flex justify-end">
                <div className="rounded-[18px] border border-border/70 bg-background/78 p-1 shadow-sm">
                    <ThemeSwitcher />
                </div>
            </div>
            <div className={contentClassName}>{children}</div>
        </AppProductShell>
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
    const hasRail = Boolean(actions || meta);

    return (
        <section className={cn('haye-panel rounded-[34px]', className)}>
            <div
                className={cn(
                    'grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:gap-8 lg:px-8 lg:py-8',
                    hasRail &&
                        'lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]',
                )}
            >
                <div className="space-y-4">
                    {typeof eyebrow === 'string' ? (
                        <span className="haye-kicker">{eyebrow}</span>
                    ) : (
                        eyebrow
                    )}
                    <div className="space-y-3">
                        <h1
                            className="max-w-4xl text-4xl tracking-tight text-foreground sm:text-5xl"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {title}
                        </h1>
                        {description ? (
                            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>

                {hasRail ? (
                    <div className="rounded-[28px] border border-border/70 bg-background/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur">
                        <div className="space-y-4">
                            {meta ? (
                                <div className="rounded-[22px] border border-border/60 bg-card/80 p-4 text-sm leading-6 text-foreground shadow-sm">
                                    {meta}
                                </div>
                            ) : null}
                            {actions ? (
                                <div className="flex flex-wrap items-center gap-3">
                                    {actions}
                                </div>
                            ) : null}
                        </div>
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
        <section className={cn('haye-panel rounded-[30px]', className)}>
            <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    {description ? (
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
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
            <div className={cn('px-5 py-5 sm:px-6', contentClassName)}>
                {children}
            </div>
        </section>
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
        <div
            className={cn(
                'haye-panel rounded-[26px] px-5 py-5',
                tone === 'accent' && 'border-secondary/20',
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
                'rounded-[28px] border border-dashed border-border/80 bg-background/55 px-6 py-10 text-center',
                className,
            )}
        >
            <div className="mx-auto max-w-md space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
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
    tone?: 'default' | 'success' | 'danger' | 'warning' | 'info';
    className?: string;
} & HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...props}
            className={cn(
                'rounded-[24px] border px-4 py-3 text-sm shadow-sm backdrop-blur',
                tone === 'default' &&
                    'border-border/70 bg-background/75 text-foreground',
                tone === 'success' &&
                    'border-success/35 bg-success/10 text-foreground',
                tone === 'warning' &&
                    'border-warning/35 bg-warning/10 text-foreground',
                tone === 'danger' &&
                    'border-destructive/35 bg-destructive/10 text-foreground',
                tone === 'info' && 'border-info/35 bg-info/10 text-foreground',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function ProductFilterRow({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-[24px] border border-border/70 bg-background/74 p-3 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.78)]',
                className,
            )}
        >
            <div className="flex flex-wrap items-end gap-3">{children}</div>
        </div>
    );
}

export function ProductStickyActions({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'sticky bottom-3 z-20 rounded-[24px] border border-border/70 bg-background/92 p-3 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.82)] backdrop-blur-xl',
                className,
            )}
        >
            <div className="flex flex-wrap items-center justify-end gap-2">
                {children}
            </div>
        </div>
    );
}
