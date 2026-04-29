import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function ProductTable({
    children,
    className,
    tableClassName,
}: {
    children: ReactNode;
    className?: string;
    tableClassName?: string;
}) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-[30px] border border-border/70 bg-card shadow-[0_28px_80px_-58px_rgba(9,18,33,0.48)]',
                className,
            )}
        >
            <div className="max-w-full overflow-x-auto [scrollbar-width:thin]">
                <table
                    className={cn(
                        'w-full min-w-[720px] border-separate border-spacing-0 text-sm',
                        tableClassName,
                    )}
                >
                    {children}
                </table>
            </div>
        </div>
    );
}

export function ProductTableHead({ children }: { children: ReactNode }) {
    return (
        <thead className="bg-muted/70 text-left text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            {children}
        </thead>
    );
}

export function ProductTableBody({ children }: { children: ReactNode }) {
    return (
        <tbody className="[&_tr:not(:first-child)_td]:border-t [&_tr:not(:first-child)_td]:border-border/60 [&_tr:nth-child(even)]:bg-background/26">
            {children}
        </tbody>
    );
}

export function ProductTableRow({
    children,
    interactive = false,
    className,
}: {
    children: ReactNode;
    interactive?: boolean;
    className?: string;
}) {
    return (
        <tr
            className={cn(
                'align-top transition-colors',
                interactive &&
                    'cursor-pointer focus-within:bg-primary/6 hover:bg-primary/6',
                className,
            )}
        >
            {children}
        </tr>
    );
}

export function ProductTableHeaderCell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <th
            className={cn(
                'px-4 py-4 font-medium whitespace-nowrap first:pl-5 last:pr-5',
                className,
            )}
        >
            {children}
        </th>
    );
}

export function ProductTableCell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <td
            className={cn(
                'px-4 py-4 align-top text-foreground first:pl-5 last:pr-5',
                className,
            )}
        >
            {children}
        </td>
    );
}

export function ProductTableEmptyRow({
    colSpan,
    title,
    description,
}: {
    colSpan: number;
    title: ReactNode;
    description?: ReactNode;
}) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center">
                <div className="mx-auto max-w-md space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                        {title}
                    </div>
                    {description ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
            </td>
        </tr>
    );
}
