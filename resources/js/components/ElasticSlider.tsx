import { motion, MotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type Props = {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    units?: string;
    title?: string;
    tickEvery?: number;
    largeTickEvery?: number;
    disabled?: boolean;
};

export default function ElasticSlider({
    value,
    onChange,
    min = 1,
    max = 30,
    step = 1,
    units = 'km',
    title = 'Search radius',
    tickEvery = 1,
    largeTickEvery = 5,
    disabled = false,
}: Props) {
    const id = useId();
    const [local, setLocal] = useState<number>(value);
    const spring = useSpring(value, { stiffness: 300, damping: 30, mass: 0.4 });

    useEffect(() => {
        setLocal(value);
        spring.set(value);
    }, [value, spring]);

    const commitRef = useRef<number | null>(null);
    useEffect(() => {
        if (commitRef.current) cancelAnimationFrame(commitRef.current);
        commitRef.current = requestAnimationFrame(() => onChange(local));
        return () => {
            if (commitRef.current) cancelAnimationFrame(commitRef.current);
        };
    }, [local, onChange]);

    const ticks = useMemo(() => {
        const arr: Array<{ v: number; large: boolean }> = [];
        for (let v = min; v <= max; v += tickEvery) {
            arr.push({ v, large: v % largeTickEvery === 0 });
        }
        return arr;
    }, [min, max, tickEvery, largeTickEvery]);

    const left: MotionValue<string> = useTransform(spring, (v: number) => {
        const pct = ((v - min) / (max - min)) * 100;
        return `${pct}%`;
    });

    return (
        <div className="w-full">
            <div className="mb-2 flex items-end justify-between">
                <label htmlFor={id} className="text-sm font-medium">
                    {title}
                </label>
                <motion.span
                    className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                    aria-live="polite"
                >
                    {Math.round(spring.get())} {units}
                </motion.span>
            </div>

            <div className="relative select-none">
                {/* TRACK
           - Light: dark page color (--sidebar) at 15% + border (--border)
           - Dark : gradient from --sidebar to --primary (matches header)
        */}
                <div className="h-2 rounded-full border [border-color:var(--border)] bg-[color:var(--sidebar)]/15 transition-all duration-300 dark:border-transparent dark:bg-[linear-gradient(to_right,var(--sidebar),var(--primary))]" />

                {/* Ticks */}
                <div className="pointer-events-none absolute inset-x-0 -top-1 h-4">
                    <div className="relative h-full">
                        {ticks.map((t) => {
                            const pct = ((t.v - min) / (max - min)) * 100;
                            return (
                                <div
                                    key={t.v}
                                    className="absolute"
                                    style={{ left: `calc(${pct}% - 1px)` }}
                                >
                                    <div
                                        className={`w-0.5 ${t.large ? 'h-3 bg-foreground/50' : 'h-2 bg-foreground/30'}`}
                                    />
                                    {t.large && (
                                        <div className="absolute left-1/2 -translate-x-1/2 pt-1 text-[10px] text-muted-foreground">
                                            {t.v}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Native range input (invisible) */}
                <input
                    id={id}
                    type="range"
                    className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent"
                    min={min}
                    max={max}
                    step={step}
                    value={local}
                    onChange={(e) => setLocal(Number(e.target.value))}
                    disabled={disabled}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={local}
                    aria-label={title}
                    style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    onInput={(e) =>
                        setLocal(Number((e.target as HTMLInputElement).value))
                    }
                />

                {/* Thumb styling uses your raw CSS vars (no hsl()) */}
                <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            height: 18px; width: 18px; border-radius: 9999px;
            background: var(--primary);
            border: 2px solid var(--background);
            box-shadow: 0 1px 3px rgba(0,0,0,0.25);
            margin-top: -8px;
          }
          input[type="range"]::-moz-range-thumb {
            height: 18px; width: 18px; border-radius: 9999px;
            background: var(--primary);
            border: 2px solid var(--background);
            box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          }
          input[type="range"]::-webkit-slider-runnable-track,
          input[type="range"]::-moz-range-track {
            height: 8px; background: transparent;
          }
        `}</style>

                {/* Elastic indicator */}
                <motion.div
                    className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-primary/60 bg-primary/20"
                    style={{ left, translateX: '-50%' }}
                />
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
                Drag or use arrow keys for fine control ({step} {units} steps).
            </div>
        </div>
    );
}
