import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function ProductTable({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className="overflow-hidden rounded-[26px] border border-border/70 bg-card/95 shadow-[0_24px_60px_-48px_rgba(17,24,39,0.75)]">
            <div className="overflow-x-auto">
                <table className={cn('min-w-full text-sm', className)}>
                    {children}
                </table>
            </div>
        </div>
    );
}

export function ProductTableHead({ children }: { children: ReactNode }) {
    return (
        <thead className="bg-muted/45 text-left text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {children}
        </thead>
    );
}

export function ProductTableBody({ children }: { children: ReactNode }) {
    return <tbody>{children}</tbody>;
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
                'border-t border-border/70 align-top',
                interactive &&
                    'cursor-pointer transition focus-within:bg-muted/28 hover:bg-muted/28',
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
        <th className={cn('px-4 py-3.5 font-medium', className)}>{children}</th>
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
        <td className={cn('px-4 py-3.5 align-top text-foreground', className)}>
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
