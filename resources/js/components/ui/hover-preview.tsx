import { cn } from '@/lib/utils';
import { useState } from 'react';

export function HoverPreview({
    trigger,
    title,
    description,
    meta,
    className,
}: {
    trigger: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    meta?: React.ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className={cn('relative', className)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
        >
            {trigger}
            <div
                className={cn(
                    'pointer-events-none absolute top-full left-0 z-20 mt-3 hidden w-72 rounded-[22px] border border-border/70 bg-card/95 p-4 shadow-2xl transition lg:block',
                    open
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-2 opacity-0',
                )}
            >
                <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                        {title}
                    </div>
                    {description ? (
                        <div className="text-sm leading-6 text-muted-foreground">
                            {description}
                        </div>
                    ) : null}
                    {meta ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {meta}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
