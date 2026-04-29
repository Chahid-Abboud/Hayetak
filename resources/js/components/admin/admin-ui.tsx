import {
    ProductBanner,
    ProductEmptyState,
    ProductFilterRow,
    ProductStickyActions,
} from '@/components/product/page';
import { ProductInput, ProductTextarea } from '@/components/product/product-ui';
import { ProductTable } from '@/components/product/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';
import type {
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from 'react';

const controlClassName =
    'dashboard-surface-soft h-10 rounded-xl border-border/60 bg-background/82 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.42)] focus-visible:ring-2 focus-visible:ring-ring/35';

export function AdminNotice({
    children,
    tone = 'default',
    className,
}: {
    children: ReactNode;
    tone?: 'default' | 'success' | 'danger' | 'warning' | 'info';
    className?: string;
}) {
    return (
        <ProductBanner tone={tone} className={cn('rounded-[22px]', className)}>
            {children}
        </ProductBanner>
    );
}

export function AdminEmpty({
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
        <ProductEmptyState
            title={title}
            description={description}
            action={action}
            className={cn(
                'rounded-[26px] border-border/60 bg-background/52',
                className,
            )}
        />
    );
}

export function AdminField({
    label,
    helper,
    children,
    className,
}: {
    label: ReactNode;
    helper?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <label className={cn('space-y-2.5', className)}>
            <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {label}
            </span>
            {children}
            {helper ? (
                <span className="block text-xs leading-5 text-muted-foreground">
                    {helper}
                </span>
            ) : null}
        </label>
    );
}

export function AdminFieldGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function AdminToolbar({
    children,
    className,
    variant = 'surface',
}: {
    children: ReactNode;
    className?: string;
    variant?: 'surface' | 'plain';
}) {
    return (
        <ProductFilterRow
            className={cn(
                variant === 'surface'
                    ? 'dashboard-surface rounded-[24px] p-3.5'
                    : 'border-0 bg-transparent p-0 shadow-none',
                className,
            )}
        >
            <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                {children}
            </div>
        </ProductFilterRow>
    );
}

export function AdminToolbarGroup({
    children,
    className,
    grow = false,
}: {
    children: ReactNode;
    className?: string;
    grow?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end',
                grow && 'xl:flex-1',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function AdminInput({
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <ProductInput
            {...props}
            className={cn(
                'dashboard-surface-soft h-10 rounded-xl border-border/60 bg-background/82 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.42)]',
                className,
            )}
        />
    );
}

export function AdminSearchInput({
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <AdminInput {...props} className={cn('pl-11', className)} />
        </div>
    );
}

export function AdminCheckboxField({
    checked,
    onCheckedChange,
    label,
    description,
    className,
}: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: ReactNode;
    description?: ReactNode;
    className?: string;
}) {
    return (
        <label
            className={cn(
                'dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-3 transition hover:border-primary/20',
                className,
            )}
        >
            <Checkbox
                checked={checked}
                onCheckedChange={(value) => onCheckedChange(Boolean(value))}
                className="mt-0.5"
            />
            <span className="min-w-0 space-y-1">
                <span className="block text-sm font-medium text-foreground">
                    {label}
                </span>
                {description ? (
                    <span className="block text-xs leading-5 text-muted-foreground">
                        {description}
                    </span>
                ) : null}
            </span>
        </label>
    );
}

export function AdminTextarea({
    className,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <ProductTextarea
            {...props}
            className={cn(
                'dashboard-surface-soft min-h-[104px] rounded-xl border-border/60 bg-background/82 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.42)]',
                className,
            )}
        />
    );
}

export function AdminNativeSelect({
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                {...props}
                className={cn(
                    controlClassName,
                    'w-full appearance-none pr-10 text-sm outline-none',
                    className,
                )}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
}

export function AdminSplitLayout({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function AdminScrollArea({
    children,
    className,
    maxHeightClassName = 'max-h-[28rem]',
}: {
    children: ReactNode;
    className?: string;
    maxHeightClassName?: string;
}) {
    return (
        <div
            className={cn(
                maxHeightClassName,
                'overflow-auto pr-1 [scrollbar-width:thin]',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function AdminPanel({
    title,
    eyebrow,
    description,
    children,
    className,
}: {
    title: ReactNode;
    eyebrow?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('dashboard-surface rounded-[24px] p-4', className)}>
            <div className="space-y-1.5">
                {eyebrow ? <div className="haye-kicker">{eyebrow}</div> : null}
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {title}
                </h3>
                {description ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
            <div className="mt-3.5">{children}</div>
        </div>
    );
}

export function AdminOverviewCard({
    title,
    description,
    action,
    children,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('dashboard-surface rounded-[24px] p-4', className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {title}
                    </h3>
                    {description ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children ? <div className="mt-3.5">{children}</div> : null}
        </div>
    );
}

export function AdminDataTable({
    children,
    className,
    tableClassName,
}: {
    children: ReactNode;
    className?: string;
    tableClassName?: string;
}) {
    return (
        <ProductTable
            className={cn(
                'rounded-[24px] border-border/55 bg-background/88 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.42)] [&_tbody_td]:py-2.5 [&_thead_th]:py-2.5 [&_thead_th]:text-[10px]',
                className,
            )}
            tableClassName={cn('min-w-[680px]', tableClassName)}
        >
            {children}
        </ProductTable>
    );
}

export function AdminStickyBar({
    summary,
    children,
    className,
}: {
    summary?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <ProductStickyActions
            className={cn('dashboard-surface rounded-[24px]', className)}
        >
            {summary ? (
                <div className="mr-auto text-sm text-muted-foreground">
                    {summary}
                </div>
            ) : null}
            {children}
        </ProductStickyActions>
    );
}

export function AdminPagination({
    currentPage,
    lastPage,
    summary,
    disabled,
    onPrevious,
    onNext,
}: {
    currentPage: number;
    lastPage: number;
    summary?: ReactNode;
    disabled?: boolean;
    onPrevious: () => void;
    onNext: () => void;
}) {
    return (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                    Page {currentPage} of {lastPage}
                </div>
                {summary ? (
                    <div className="text-sm text-muted-foreground">
                        {summary}
                    </div>
                ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrevious}
                    disabled={disabled || currentPage <= 1}
                >
                    Previous
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onNext}
                    disabled={disabled || currentPage >= lastPage}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

export function AdminSectionLabel({
    icon,
    title,
    description,
}: {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
}) {
    return (
        <div className="dashboard-surface flex items-start gap-3 rounded-[22px] px-4 py-3">
            {icon ? (
                <div className="mt-0.5 text-muted-foreground">{icon}</div>
            ) : null}
            <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                    {title}
                </div>
                {description ? (
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {description}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function AdminToggleGroup({
    label,
    value,
    onChange,
    options,
    className,
}: {
    label?: ReactNode;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    className?: string;
}) {
    return (
        <div className={cn('space-y-2', className)}>
            {label ? (
                <Label className="text-sm font-medium text-foreground">
                    {label}
                </Label>
            ) : null}
            <div className="inline-flex w-full flex-wrap rounded-[18px] border border-border/60 bg-background/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                {options.map((option) => {
                    const active = option.value === value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={cn(
                                'flex-1 rounded-[14px] px-3 py-2 text-sm font-medium transition',
                                active
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
