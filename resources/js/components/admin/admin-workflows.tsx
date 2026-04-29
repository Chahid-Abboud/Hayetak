import {
    AdminEmpty,
    AdminField,
    AdminNativeSelect,
    AdminPanel,
    AdminSearchInput,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    CheckCircle2,
    MoveRight,
    ShieldAlert,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

type StatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type TimelineTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
export type RiskSeverity = 'info' | 'warning' | 'danger' | 'success';

const statusPalette: Record<
    string,
    {
        label: string;
        tone: StatusTone;
    }
> = {
    active: { label: 'Active', tone: 'success' },
    approved: { label: 'Approved', tone: 'success' },
    verified: { label: 'Verified', tone: 'success' },
    completed: { label: 'Completed', tone: 'success' },
    pending: { label: 'Pending', tone: 'info' },
    requested: { label: 'Requested', tone: 'info' },
    needs_review: { label: 'Needs review', tone: 'warning' },
    needs_info: { label: 'Needs info', tone: 'warning' },
    unverified: { label: 'Unverified', tone: 'warning' },
    expiring_soon: { label: 'Expiring soon', tone: 'warning' },
    rejected: { label: 'Rejected', tone: 'danger' },
    suspended: { label: 'Suspended', tone: 'danger' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
    declined: { label: 'Declined', tone: 'danger' },
};

const toneClassNames: Record<StatusTone, string> = {
    default:
        'border-border/60 bg-background/72 text-foreground/80 dark:bg-card/82',
    success:
        'border-success/35 bg-success/12 text-foreground',
    warning:
        'border-warning/35 bg-warning/12 text-foreground',
    danger: 'border-destructive/35 bg-destructive/12 text-foreground',
    info: 'border-info/35 bg-info/12 text-foreground',
};

const riskIconMap: Record<RiskSeverity, LucideIcon> = {
    info: ShieldCheck,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: ShieldAlert,
};

const riskToneClassNames: Record<RiskSeverity, string> = {
    info: 'border-info/35 bg-info/10 text-foreground',
    success: 'border-success/35 bg-success/10 text-foreground',
    warning: 'border-warning/35 bg-warning/10 text-foreground',
    danger: 'border-destructive/35 bg-destructive/10 text-foreground',
};

const timelineToneClassNames: Record<TimelineTone, string> = {
    default: 'border-border/55 bg-background/72 text-foreground',
    success: 'border-success/35 bg-success/10 text-foreground',
    warning: 'border-warning/35 bg-warning/10 text-foreground',
    danger: 'border-destructive/35 bg-destructive/10 text-foreground',
    info: 'border-info/35 bg-info/10 text-foreground',
};

function startCase(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export function StatusChip({
    value,
    label,
    className,
}: {
    value: string;
    label?: string;
    className?: string;
}) {
    const key = value.trim().toLowerCase();
    const config = statusPalette[key] ?? {
        label: label ?? startCase(key),
        tone: 'default' as const,
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase',
                toneClassNames[config.tone],
                className,
            )}
        >
            {label ?? config.label}
        </Badge>
    );
}

export function StatusChipSet({
    items,
    className,
}: {
    items: Array<{ value: string; label?: string }>;
    className?: string;
}) {
    const visibleItems = items.filter((item) => item.value.trim().length > 0);

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {visibleItems.map((item) => (
                <StatusChip
                    key={`${item.value}-${item.label ?? ''}`}
                    value={item.value}
                    label={item.label}
                />
            ))}
        </div>
    );
}

export function RiskBannerStack({
    items,
    className,
}: {
    items: Array<{
        severity: RiskSeverity;
        title: ReactNode;
        description: ReactNode;
        meta?: ReactNode;
    }>;
    className?: string;
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className={cn('space-y-3', className)}>
            {items.map((item, index) => {
                const Icon = riskIconMap[item.severity];

                return (
                    <div
                        key={`${String(item.title)}-${index}`}
                        className={cn(
                            'rounded-[24px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
                            riskToneClassNames[item.severity],
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-background/70">
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold">
                                    {item.title}
                                </div>
                                <div className="mt-1 text-sm leading-6 opacity-85">
                                    {item.description}
                                </div>
                                {item.meta ? (
                                    <div className="mt-2 text-xs font-medium uppercase opacity-70">
                                        {item.meta}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function AdminSplitView({
    list,
    detail,
    className,
    listClassName,
    detailClassName,
    stickyDetail = true,
}: {
    list: ReactNode;
    detail: ReactNode;
    className?: string;
    listClassName?: string;
    detailClassName?: string;
    stickyDetail?: boolean;
}) {
    return (
        <div
            className={cn(
                'grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] xl:items-start',
                className,
            )}
        >
            <div className={listClassName}>{list}</div>
            <div
                className={cn(
                    'hidden xl:block',
                    stickyDetail &&
                        'xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100svh-2.5rem)] xl:overflow-y-auto xl:pr-1 [scrollbar-width:thin]',
                    detailClassName,
                )}
            >
                {detail}
            </div>
        </div>
    );
}

export function EntityDetailDrawer({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full border-l border-border/60 bg-card/96 p-0 sm:max-w-lg"
            >
                <SheetHeader className="border-b border-border/60 bg-background/58 px-4 py-4 text-left backdrop-blur">
                    <SheetTitle
                        className="text-xl tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        {title}
                    </SheetTitle>
                    {description ? (
                        <SheetDescription className="max-w-lg text-sm leading-6">
                            {description}
                        </SheetDescription>
                    ) : null}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {children}
                </div>

                {footer ? (
                    <SheetFooter className="border-t border-border/60 bg-background/88 px-4 py-3">
                        {footer}
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

export function ReviewDecisionPanel({
    title,
    description,
    summary,
    statusLabel = 'Decision',
    statusValue,
    onStatusChange,
    statusOptions,
    notes,
    onNotesChange,
    notesLabel = 'Notes',
    notesPlaceholder,
    primaryActionLabel,
    onPrimaryAction,
    secondaryAction,
    busy = false,
    disabled = false,
    children,
    footerMeta,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    summary?: ReactNode;
    statusLabel?: ReactNode;
    statusValue: string;
    onStatusChange: (value: string) => void;
    statusOptions: Array<{ value: string; label: string }>;
    notes: string;
    onNotesChange: (value: string) => void;
    notesLabel?: ReactNode;
    notesPlaceholder?: string;
    primaryActionLabel: string;
    onPrimaryAction: () => void;
    secondaryAction?: ReactNode;
    busy?: boolean;
    disabled?: boolean;
    children?: ReactNode;
    footerMeta?: ReactNode;
    className?: string;
}) {
    return (
        <AdminPanel
            title={title}
            description={description}
            className={cn('overflow-hidden p-0', className)}
        >
            <div className="space-y-4 px-4 py-4">
                {summary ? <div>{summary}</div> : null}
                {children}

                <div className="grid gap-4">
                    <AdminField label={statusLabel}>
                        <AdminNativeSelect
                            value={statusValue}
                            onChange={(event) =>
                                onStatusChange(event.target.value)
                            }
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </AdminNativeSelect>
                    </AdminField>

                    <AdminField label={notesLabel}>
                        <AdminTextarea
                            rows={6}
                            value={notes}
                            placeholder={notesPlaceholder}
                            onChange={(event) =>
                                onNotesChange(event.target.value)
                            }
                        />
                    </AdminField>
                </div>
            </div>

            <AdminStickyBar
                className="rounded-none border-t border-border/60"
                summary={footerMeta}
            >
                {secondaryAction}
                <Button
                    type="button"
                    onClick={onPrimaryAction}
                    disabled={busy || disabled}
                >
                    {busy ? 'Saving...' : primaryActionLabel}
                </Button>
            </AdminStickyBar>
        </AdminPanel>
    );
}

export function AdminQueueCards({
    items,
    className,
}: {
    items: Array<{
        icon: LucideIcon;
        eyebrow: string;
        count: ReactNode;
        title: ReactNode;
        description: ReactNode;
        actionLabel: string;
        onAction: () => void;
        rows: Array<{
            id: number | string;
            title: ReactNode;
            subtitle: ReactNode;
        }>;
        emptyText: string;
    }>;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-4 lg:grid-cols-3', className)}>
            {items.map((item) => (
                <div
                    key={`${item.eyebrow}-${item.title}`}
                    className="dashboard-surface h-full rounded-[24px] px-4 py-4"
                >
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                            <item.icon className="h-3.5 w-3.5 text-primary" />
                            {item.eyebrow}
                        </div>
                        <div className="text-2xl font-semibold tracking-tight text-foreground">
                            {item.count}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                {item.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {item.description}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {item.rows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {item.emptyText}
                            </p>
                        ) : (
                            item.rows.map((row) => (
                                <div
                                    key={row.id}
                                    className="dashboard-surface-soft rounded-[22px] px-4 py-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                                        <div className="min-w-0">
                                            <div className="line-clamp-1 font-medium text-foreground">
                                                {row.title}
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {row.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={item.onAction}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
                    >
                        {item.actionLabel}
                        <MoveRight className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

export function AdminFilterToolbar({
    search,
    onSearchChange,
    searchPlaceholder = 'Search',
    searchLabel = 'Search',
    filters = [],
    actions,
    chips,
    className,
}: {
    search?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    searchLabel?: string;
    filters?: Array<{
        label: string;
        value: string;
        onChange: (value: string) => void;
        options: Array<{ value: string; label: string }>;
        className?: string;
    }>;
    actions?: ReactNode;
    chips?: Array<{ value: string; label?: string }>;
    className?: string;
}) {
    return (
        <div className={cn('space-y-3', className)}>
            <AdminToolbar>
                <AdminToolbarGroup grow>
                    {typeof search === 'string' && onSearchChange ? (
                        <AdminField
                            label={searchLabel}
                            className="xl:min-w-[320px] xl:flex-1"
                        >
                            <AdminSearchInput
                                value={search}
                                placeholder={searchPlaceholder}
                                onChange={(event) =>
                                    onSearchChange(event.target.value)
                                }
                            />
                        </AdminField>
                    ) : null}

                    {filters.map((filter) => (
                        <AdminField
                            key={`${filter.label}-${filter.value}`}
                            label={filter.label}
                            className={cn('sm:w-52', filter.className)}
                        >
                            <AdminNativeSelect
                                value={filter.value}
                                onChange={(event) =>
                                    filter.onChange(event.target.value)
                                }
                            >
                                {filter.options.map((option) => (
                                    <option
                                        key={`${filter.label}-${option.value}`}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </AdminNativeSelect>
                        </AdminField>
                    ))}
                </AdminToolbarGroup>

                {actions ? (
                    <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                        {actions}
                    </AdminToolbarGroup>
                ) : null}
            </AdminToolbar>

            {chips && chips.length > 0 ? <StatusChipSet items={chips} /> : null}
        </div>
    );
}

export function ActivityTimeline({
    items,
    selectedId,
    onSelect,
    emptyTitle = 'No activity yet',
    emptyDescription = 'Timeline entries will show up here as records arrive.',
    className,
}: {
    items: Array<{
        id: number | string;
        title: ReactNode;
        description?: ReactNode;
        meta?: ReactNode;
        timestamp?: ReactNode;
        tone?: TimelineTone;
        chips?: Array<{ value: string; label?: string }>;
    }>;
    selectedId?: number | string | null;
    onSelect?: (id: number | string) => void;
    emptyTitle?: ReactNode;
    emptyDescription?: ReactNode;
    className?: string;
}) {
    if (items.length === 0) {
        return (
            <AdminEmpty
                title={emptyTitle}
                description={emptyDescription}
                className={className}
            />
        );
    }

    return (
        <div className={cn('space-y-3', className)}>
            {items.map((item, index) => {
                const active = selectedId === item.id;

                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect?.(item.id)}
                        className={cn(
                            'group relative w-full rounded-[24px] border px-4 py-4 text-left transition',
                            timelineToneClassNames[item.tone ?? 'default'],
                            active &&
                                'border-primary/24 bg-primary/10 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.26)]',
                            !onSelect && 'cursor-default',
                        )}
                    >
                        {index < items.length - 1 ? (
                            <span className="absolute top-[calc(100%+0.25rem)] left-[1.35rem] h-4 w-px bg-border/70" />
                        ) : null}

                        <div className="flex items-start gap-3">
                            <span className="mt-1 inline-flex h-3 w-3 shrink-0 rounded-full bg-primary" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-medium text-foreground">
                                            {item.title}
                                        </div>
                                        {item.description ? (
                                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {item.description}
                                            </div>
                                        ) : null}
                                    </div>
                                    {item.timestamp ? (
                                        <div className="text-xs font-medium text-muted-foreground">
                                            {item.timestamp}
                                        </div>
                                    ) : null}
                                </div>

                                {item.meta ? (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        {item.meta}
                                    </div>
                                ) : null}

                                {item.chips && item.chips.length > 0 ? (
                                    <StatusChipSet
                                        className="mt-3"
                                        items={item.chips}
                                    />
                                ) : null}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export function MetricChartCard({
    title,
    value,
    helper,
    points,
    color = 'var(--primary)',
    summary,
    className,
}: {
    title: ReactNode;
    value: ReactNode;
    helper?: ReactNode;
    points: number[];
    color?: string;
    summary?: ReactNode;
    className?: string;
}) {
    const gradientId = useId().replace(/:/g, '');
    const path = buildPath(points, 240, 70);
    const areaPath = path ? `${path} L 240 70 L 0 70 Z` : '';

    return (
        <div
            className={cn(
                'dashboard-surface rounded-[24px] px-4 py-4 shadow-[0_22px_60px_-52px_rgba(9,18,33,0.32)]',
                className,
            )}
        >
            <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                    {title}
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                    {value}
                </div>
                {helper ? (
                    <div className="text-sm leading-6 text-muted-foreground">
                        {helper}
                    </div>
                ) : null}
            </div>

            <div className="dashboard-surface-soft mt-5 overflow-hidden rounded-[20px] p-3">
                {points.length > 1 ? (
                    <svg
                        viewBox="0 0 240 70"
                        className="h-24 w-full"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient
                                id={gradientId}
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
                        <path d={areaPath} fill={`url(#${gradientId})`} />
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

            {summary ? (
                <div className="mt-4 text-sm leading-6 text-muted-foreground">
                    {summary}
                </div>
            ) : null}
        </div>
    );
}

export function ConfirmActionDialogWithReason({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    busy = false,
    confirmVariant = 'destructive',
    reasonLabel = 'Reason',
    reasonPlaceholder = 'Explain why this action is necessary.',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    confirmLabel: string;
    onConfirm: (reason: string) => void | Promise<void>;
    busy?: boolean;
    confirmVariant?: 'default' | 'destructive';
    reasonLabel?: ReactNode;
    reasonPlaceholder?: string;
}) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!open) {
            setReason('');
        }
    }, [open]);

    const canConfirm = useMemo(() => reason.trim().length > 0, [reason]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? (
                        <DialogDescription>{description}</DialogDescription>
                    ) : null}
                </DialogHeader>

                <AdminField label={reasonLabel}>
                    <AdminTextarea
                        rows={5}
                        value={reason}
                        placeholder={reasonPlaceholder}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </AdminField>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={confirmVariant}
                        disabled={!canConfirm || busy}
                        onClick={() => void onConfirm(reason.trim())}
                    >
                        {busy ? 'Working...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
