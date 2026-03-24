import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ResizablePanels({
    left,
    right,
    defaultLeftWidth = 320,
    minLeftWidth = 280,
    maxLeftWidth = 420,
    className,
    leftClassName,
    rightClassName,
    stackedClassName,
}: {
    left: React.ReactNode;
    right: React.ReactNode;
    defaultLeftWidth?: number;
    minLeftWidth?: number;
    maxLeftWidth?: number;
    className?: string;
    leftClassName?: string;
    rightClassName?: string;
    stackedClassName?: string;
}) {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [dragging, setDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!dragging) return;

        function onPointerMove(event: PointerEvent) {
            if (!containerRef.current) return;

            const bounds = containerRef.current.getBoundingClientRect();
            const next = event.clientX - bounds.left;
            const clamped = Math.min(
                Math.max(next, minLeftWidth),
                Math.min(maxLeftWidth, bounds.width - 320),
            );

            setLeftWidth(clamped);
        }

        function onPointerUp() {
            setDragging(false);
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [dragging, maxLeftWidth, minLeftWidth]);

    return (
        <>
            <div className={cn('grid gap-4 lg:hidden', stackedClassName)}>
                <div className={leftClassName}>{left}</div>
                <div className={rightClassName}>{right}</div>
            </div>

            <div
                ref={containerRef}
                className={cn('hidden min-h-[72vh] lg:grid', className)}
                style={{
                    gridTemplateColumns: `${leftWidth}px 16px minmax(0,1fr)`,
                }}
            >
                <div className={leftClassName}>{left}</div>
                <div className="flex items-stretch justify-center">
                    <button
                        type="button"
                        aria-label="Resize panels"
                        onPointerDown={() => setDragging(true)}
                        className={cn(
                            'group flex w-4 cursor-col-resize items-center justify-center rounded-full bg-transparent transition',
                            dragging && 'bg-primary/10',
                        )}
                    >
                        <span className="flex h-full items-center justify-center rounded-full px-0.5 transition group-hover:bg-primary/10">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </span>
                    </button>
                </div>
                <div className={rightClassName}>{right}</div>
            </div>
        </>
    );
}
