import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';
import AppLogoIcon from './app-logo-icon';

type AppWordmarkProps = HTMLAttributes<HTMLSpanElement> & {
    iconClassName?: string;
    textClassName?: string;
    mode?: 'auto' | 'light' | 'dark';
};

export default function AppWordmark({
    className,
    iconClassName,
    textClassName,
    mode = 'auto',
    ...props
}: AppWordmarkProps) {
    return (
        <span
            {...props}
            className={cn(
                'inline-flex min-w-0 items-center whitespace-nowrap',
                className,
            )}
        >
            <AppLogoIcon
                mode={mode}
                className={cn('size-[2.7rem] shrink-0', iconClassName)}
            />
            <span
                className={cn(
                    '-ml-0.5 truncate text-[1.56rem] leading-none font-semibold tracking-[-0.03em]',
                    textClassName,
                )}
                style={{ fontFamily: 'var(--font-display)' }}
            >
                ayetak
            </span>
        </span>
    );
}
