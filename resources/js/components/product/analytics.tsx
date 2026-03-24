import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

type MetricRingSegment = {
    label: string;
    value: number;
    color: string;
};

export function MetricRing({
    title,
    description,
    totalLabel,
    totalValue,
    segments,
}: {
    title: ReactNode;
    description?: ReactNode;
    totalLabel: ReactNode;
    totalValue: ReactNode;
    segments: MetricRingSegment[];
}) {
    const total = Math.max(
        segments.reduce((sum, segment) => sum + segment.value, 0),
        1,
    );
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <Card className="gap-0 rounded-[24px] border-border/70 bg-card/95 py-0 shadow-sm">
            <CardContent className="space-y-5 px-5 py-5">
                <div className="space-y-1">
                    <div className="text-base font-semibold text-foreground">
                        {title}
                    </div>
                    {description ? (
                        <div className="text-sm leading-6 text-muted-foreground">
                            {description}
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative flex h-36 w-36 items-center justify-center">
                        <svg
                            viewBox="0 0 120 120"
                            className="h-36 w-36 -rotate-90"
                        >
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="none"
                                stroke="var(--muted)"
                                strokeWidth="12"
                            />
                            {segments.map((segment) => {
                                const segmentLength =
                                    (segment.value / total) * circumference;
                                const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
                                const strokeDashoffset = -offset;
                                offset += segmentLength;

                                return (
                                    <circle
                                        key={segment.label}
                                        cx="60"
                                        cy="60"
                                        r={radius}
                                        fill="none"
                                        stroke={segment.color}
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                    />
                                );
                            })}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                            <div className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                {totalLabel}
                            </div>
                            <div className="text-2xl font-semibold tracking-tight text-foreground">
                                {totalValue}
                            </div>
                        </div>
                    </div>

                    <div className="grid flex-1 gap-3">
                        {segments.map((segment) => {
                            const percentage = Math.round(
                                (segment.value / total) * 100,
                            );

                            return (
                                <div
                                    key={segment.label}
                                    className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="h-3 w-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        segment.color,
                                                }}
                                            />
                                            <span className="text-sm font-medium text-foreground">
                                                {segment.label}
                                            </span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {segment.value} / {percentage}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function BarListCard({
    title,
    description,
    items,
}: {
    title: ReactNode;
    description?: ReactNode;
    items: Array<{
        label: string;
        value: number;
        formattedValue?: string;
        tone?: 'default' | 'accent';
    }>;
}) {
    const maxValue = Math.max(...items.map((item) => item.value), 1);

    return (
        <Card className="gap-0 rounded-[24px] border-border/70 bg-card/95 py-0 shadow-sm">
            <CardContent className="space-y-5 px-5 py-5">
                <div className="space-y-1">
                    <div className="text-base font-semibold text-foreground">
                        {title}
                    </div>
                    {description ? (
                        <div className="text-sm leading-6 text-muted-foreground">
                            {description}
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.label} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-foreground">
                                    {item.label}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {item.formattedValue ?? item.value}
                                </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all',
                                        item.tone === 'accent'
                                            ? 'bg-secondary'
                                            : 'bg-primary',
                                    )}
                                    style={{
                                        width: `${Math.max(
                                            (item.value / maxValue) * 100,
                                            8,
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function buildPath(points: number[], width: number, height: number) {
    if (points.length === 0) return '';

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;

    return points
        .map((point, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * width;
            const y = height - ((point - min) / span) * height;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
}

export function TrendCard({
    title,
    value,
    helper,
    points,
    color = 'var(--primary)',
    className,
}: {
    title: ReactNode;
    value: ReactNode;
    helper?: ReactNode;
    points: number[];
    color?: string;
    className?: string;
}) {
    const path = buildPath(points, 240, 70);
    const areaPath = path ? `${path} L 240 70 L 0 70 Z` : '';

    return (
        <Card
            className={cn(
                'gap-0 rounded-[24px] border-border/70 bg-card/95 py-0 shadow-sm',
                className,
            )}
        >
            <CardContent className="space-y-5 px-5 py-5">
                <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                        {title}
                    </div>
                    <div className="text-3xl font-semibold tracking-tight text-foreground">
                        {value}
                    </div>
                    {helper ? (
                        <div className="text-sm leading-6 text-muted-foreground">
                            {helper}
                        </div>
                    ) : null}
                </div>

                <div className="overflow-hidden rounded-[20px] border border-border/70 bg-muted/20 p-3">
                    {points.length > 1 ? (
                        <svg
                            viewBox="0 0 240 70"
                            className="h-24 w-full"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <linearGradient
                                    id="trend-fill"
                                    x1="0%"
                                    x2="0%"
                                    y1="0%"
                                    y2="100%"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={color}
                                        stopOpacity="0.28"
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor={color}
                                        stopOpacity="0.02"
                                    />
                                </linearGradient>
                            </defs>
                            <path
                                d={areaPath}
                                fill="url(#trend-fill)"
                                opacity="1"
                            />
                            <path
                                d={path}
                                fill="none"
                                stroke={color}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                            />
                        </svg>
                    ) : (
                        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                            Add more entries to reveal a trend.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function InlineRangeToolbar({
    value,
    onChange,
    className,
}: {
    value: number;
    onChange: (value: number) => void;
    className?: string;
}) {
    const presets = [4, 8, 12];

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {presets.map((preset) => (
                <button
                    key={preset}
                    type="button"
                    onClick={() => onChange(preset)}
                    className={cn(
                        'inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition',
                        value === preset
                            ? 'border-primary/30 bg-primary/10 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                >
                    Last {preset} weeks
                </button>
            ))}
        </div>
    );
}

export function SurfaceGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-4 lg:grid-cols-3 xl:grid-cols-12',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function SurfaceTile({
    children,
    className,
    style,
}: {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <div
            className={cn(
                'rounded-[24px] border border-border/70 bg-card/95 shadow-sm',
                className,
            )}
            style={style}
        >
            {children}
        </div>
    );
}
