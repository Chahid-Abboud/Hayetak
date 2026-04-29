import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export default function AppLogoIcon({
    className,
    mode = 'auto',
    'aria-label': ariaLabel,
    ...props
}: HTMLAttributes<HTMLSpanElement> & {
    mode?: 'auto' | 'light' | 'dark';
    'aria-label'?: string;
}) {
    const baseImageClass = 'h-full w-full object-contain';

    return (
        <span
            {...props}
            className={cn('inline-block size-5 shrink-0', className)}
            aria-hidden={ariaLabel ? undefined : true}
            aria-label={ariaLabel}
        >
            {mode === 'auto' ? (
                <>
                    <img
                        src="/brand/chado-mark-dark.png"
                        alt=""
                        className={cn(baseImageClass, 'block dark:hidden')}
                        draggable={false}
                    />
                    <img
                        src="/brand/chado-mark-green.png"
                        alt=""
                        className={cn(baseImageClass, 'hidden dark:block')}
                        draggable={false}
                    />
                </>
            ) : mode === 'light' ? (
                <img
                    src="/brand/chado-mark-dark.png"
                    alt=""
                    className={baseImageClass}
                    draggable={false}
                />
            ) : (
                <img
                    src="/brand/chado-mark-green.png"
                    alt=""
                    className={baseImageClass}
                    draggable={false}
                />
            )}
        </span>
    );
}
