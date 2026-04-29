import { cn } from '@/lib/utils';
import * as React from 'react';

function Textarea({
    className,
    ...props
}: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'flex min-h-28 w-full rounded-2xl border border-input bg-background/82 px-4 py-3 text-sm shadow-[0_12px_28px_-24px_rgba(15,23,42,0.75)] transition-[color,box-shadow,border-color,background-color] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
