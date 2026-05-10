import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export default function AppLogoIcon({
    className,
<<<<<<< HEAD
=======
    mode = 'auto',
>>>>>>> origin/main
    'aria-label': ariaLabel,
    ...props
}: HTMLAttributes<HTMLSpanElement> & {
    mode?: 'auto' | 'light' | 'dark';
    'aria-label'?: string;
}) {
    const baseImageClass = 'h-full w-full object-contain';
<<<<<<< HEAD
    const sharedMark = '/brand/hayetak-mark.png';
=======
>>>>>>> origin/main

    return (
        <span
            {...props}
            className={cn('inline-block size-5 shrink-0', className)}
            aria-hidden={ariaLabel ? undefined : true}
            aria-label={ariaLabel}
        >
<<<<<<< HEAD
            <img
                src={sharedMark}
                alt=""
                className={baseImageClass}
                draggable={false}
            />
=======
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
>>>>>>> origin/main
        </span>
    );
}
