import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export default function AppLogoIcon({
    className,
    'aria-label': ariaLabel,
    ...props
}: HTMLAttributes<HTMLSpanElement> & {
    mode?: 'auto' | 'light' | 'dark';
    'aria-label'?: string;
}) {
    const baseImageClass = 'h-full w-full object-contain';
    const sharedMark = '/brand/hayetak-mark.png';

    return (
        <span
            {...props}
            className={cn('inline-block size-5 shrink-0', className)}
            aria-hidden={ariaLabel ? undefined : true}
            aria-label={ariaLabel}
        >
            <img
                src={sharedMark}
                alt=""
                className={baseImageClass}
                draggable={false}
            />
        </span>
    );
}
