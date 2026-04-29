import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

type ProductButtonProps = ComponentProps<typeof Button> & {
    emphasis?: 'primary' | 'secondary' | 'soft';
};

export function ProductButton({
    className,
    emphasis = 'primary',
    variant,
    ...props
}: ProductButtonProps) {
    const variantMap = {
        primary: variant ?? 'default',
        secondary: variant ?? 'outline',
        soft: variant ?? 'secondary',
    } as const;

    return (
        <Button
            {...props}
            variant={variantMap[emphasis]}
            className={cn(
                'rounded-2xl px-4 text-sm font-semibold',
                emphasis === 'secondary' && 'bg-background/88',
                emphasis === 'soft' && 'bg-secondary/75',
                className,
            )}
        />
    );
}

export function ProductInput({
    className,
    ...props
}: ComponentProps<typeof Input>) {
    return (
        <Input
            {...props}
            className={cn(
                'rounded-2xl border-border/70 bg-background/88 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.76)]',
                className,
            )}
        />
    );
}

export function ProductTextarea({
    className,
    ...props
}: ComponentProps<typeof Textarea>) {
    return (
        <Textarea
            {...props}
            className={cn(
                'rounded-[22px] border-border/70 bg-background/88 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.76)]',
                className,
            )}
        />
    );
}

export function ProductModeButton({
    active,
    disabled,
    onClick,
    children,
    className,
}: {
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'inline-flex h-11 items-center rounded-2xl border px-4 text-sm font-semibold transition',
                active
                    ? 'border-primary/30 bg-primary/10 text-foreground shadow-[0_16px_30px_-24px_rgba(15,23,42,0.75)]'
                    : 'border-border/70 bg-background/88 text-foreground hover:bg-card',
                disabled && 'cursor-not-allowed opacity-40',
                className,
            )}
        >
            {children}
        </button>
    );
}
