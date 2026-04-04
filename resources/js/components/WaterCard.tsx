import React from 'react';

type Props = {
    isGuest: boolean;
    water: { today_ml: number; target_ml: number };
    onQuickAdd?: (ml: number) => void;
    loading?: boolean;
};

function Skeleton() {
    return (
        <div className="animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-full rounded-full bg-muted" />
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="h-20 rounded-2xl bg-muted" />
                <div className="h-20 rounded-2xl bg-muted" />
                <div className="h-20 rounded-2xl bg-muted" />
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-24 rounded-2xl bg-muted" />
                <div className="h-10 w-24 rounded-2xl bg-muted" />
                <div className="h-10 w-24 rounded-2xl bg-muted" />
            </div>
        </div>
    );
}

export default function WaterCard({
    isGuest,
    water,
    onQuickAdd,
    loading,
}: Props) {
    if (loading) return <Skeleton />;

    const pctFloat = (water.today_ml / Math.max(1, water.target_ml)) * 100;
    const basePct = Math.max(0, Math.min(100, pctFloat));
    const overflowPct = Math.max(0, Math.min(100, pctFloat - 100));
    const remaining = Math.max(0, water.target_ml - water.today_ml);
    const status =
        pctFloat >= 100 ? 'Target reached' : pctFloat >= 65 ? 'On pace' : 'Build momentum';

    const trackStyle: React.CSSProperties = {
        position: 'relative',
        backgroundColor: 'var(--muted)',
        borderRadius: 999,
        overflow: 'hidden',
    };

    const fillStyle: React.CSSProperties = {
        width: `${basePct}%`,
        transition: 'width 350ms ease',
        borderRadius: 999,
        backgroundImage:
            'linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 60%, var(--secondary)))',
    };

    const overStyle: React.CSSProperties | undefined =
        overflowPct > 0
            ? {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${overflowPct}%`,
                  zIndex: 2,
                  backgroundImage:
                      'repeating-linear-gradient(135deg, #EF4444, #EF4444 6px, #DC2626 6px, #DC2626 12px)',
                  opacity: 0.8,
                  borderRadius: 999,
                  mixBlendMode: 'multiply',
              }
            : undefined;

    const capStyle: React.CSSProperties = {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: basePct > 0 ? 6 : 0,
        borderRadius: '0 999px 999px 0',
        backgroundColor: 'color-mix(in oklab, var(--primary) 85%, black)',
        opacity: 0.25,
    };

    const QuickAddButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
        className = '',
        style,
        ...rest
    }) => (
        <button
            {...rest}
            className={`rounded-2xl border px-3 py-2 text-sm font-medium ${className}`}
            style={{
                background: 'color-mix(in oklab, var(--primary) 12%, white)',
                color: 'color-mix(in oklab, var(--primary-foreground) 60%, var(--foreground))',
                borderColor: 'var(--border)',
                ...style,
            }}
        />
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-sm text-muted-foreground">Today</div>
                    <div className="mt-2 text-3xl font-semibold text-foreground">
                        {water.today_ml}
                        <span className="ml-2 text-lg font-medium text-muted-foreground">
                            / {water.target_ml} mL
                        </span>
                    </div>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                    {status}
                </div>
            </div>

            <div>
                <div
                    className="relative h-3 w-full"
                    style={trackStyle}
                    role="progressbar"
                    aria-label="Water progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(Math.min(100, pctFloat))}
                >
                    <div className="absolute inset-y-0 left-0 z-[1]" style={fillStyle}>
                        <div style={capStyle} />
                    </div>
                    {overStyle ? <div style={overStyle} aria-hidden /> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
                        {Math.round(pctFloat)}% complete
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
                        {remaining} mL left
                    </span>
                    {overflowPct > 0 ? (
                        <span
                            className="rounded-full border px-2.5 py-1"
                            style={{
                                borderColor: 'color-mix(in oklab, var(--destructive) 35%, var(--border))',
                                color: 'var(--destructive)',
                            }}
                        >
                            +{Math.round(overflowPct)}% above target
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-border/70 bg-background/72 p-4">
                    <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Target
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                        {water.target_ml} mL
                    </div>
                </div>
                <div className="rounded-[20px] border border-border/70 bg-background/72 p-4">
                    <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Remaining
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                        {remaining} mL
                    </div>
                </div>
                <div className="rounded-[20px] border border-border/70 bg-background/72 p-4">
                    <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Next move
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                        {remaining > 0 ? `${Math.min(500, remaining)} mL` : 'Sip to maintain'}
                    </div>
                </div>
            </div>

            {!isGuest && onQuickAdd ? (
                <div className="flex flex-wrap gap-2">
                    {[250, 500, 750].map((ml) => (
                        <QuickAddButton
                            key={ml}
                            onClick={() => onQuickAdd(ml)}
                            className="min-w-[96px]"
                        >
                            +{ml} ml
                        </QuickAddButton>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
