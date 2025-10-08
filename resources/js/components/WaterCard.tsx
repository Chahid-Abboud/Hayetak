import React from "react";

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
      <div className="h-2 w-full rounded bg-muted" />
      <div className="h-4 w-12 rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-9 w-20 rounded-lg bg-muted" />
        <div className="h-9 w-20 rounded-lg bg-muted" />
        <div className="h-9 w-20 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function WaterCard({ isGuest, water, onQuickAdd, loading }: Props) {
  if (loading) return <Skeleton />;

  const pctFloat = (water.today_ml / Math.max(1, water.target_ml)) * 100;
  const basePct       = Math.max(0, Math.min(100, pctFloat));   // 0..100
  const overflowPct   = Math.max(0, Math.min(100, pctFloat - 100)); // 0..100

  const trackStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "var(--muted)",
    borderRadius: 999,
    overflow: "hidden",
  };

  // Base (teal) fill
  const fillStyle: React.CSSProperties = {
    width: `${basePct}%`,
    transition: "width 350ms ease",
    borderRadius: 999,
    backgroundImage:
      "linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 60%, var(--secondary)))",
  };

  // Overflow (danger) — INSIDE the bar, grows from LEFT → RIGHT
  const overStyle: React.CSSProperties | undefined =
    overflowPct > 0
      ? {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,                                 // start at the left edge
          width: `${overflowPct}%`,                // grow L → R
          zIndex: 2,
          backgroundImage:
            "repeating-linear-gradient(135deg, #EF4444, #EF4444 6px, #DC2626 6px, #DC2626 12px)",
          opacity: 0.8,
          borderRadius: 999,
          mixBlendMode: "multiply",
        }
      : undefined;

  const capStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: basePct > 0 ? 6 : 0,
    borderRadius: "0 999px 999px 0",
    backgroundColor: "color-mix(in oklab, var(--primary) 85%, black)",
    opacity: 0.25,
  };

  const SoftTealBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
    className = "",
    style,
    ...rest
  }) => (
    <button
      {...rest}
      className={`rounded-lg px-3 py-2 text-sm font-medium border ${className}`}
      style={{
        background: "color-mix(in oklab, var(--primary) 12%, white)",
        color:
          "color-mix(in oklab, var(--primary-foreground) 60%, var(--foreground))",
        borderColor: "var(--border)",
        ...style,
      }}
    />
  );

  return (
    <div>
      <div className="text-sm text-muted-foreground">
        Today:{" "}
        <span className="font-semibold text-foreground">{water.today_ml}</span>{" "}
        / {water.target_ml} ml
      </div>

      <div className="mt-3">
        <div
          className="relative h-2 w-full"
          style={trackStyle}
          role="progressbar"
          aria-label="Water progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(100, pctFloat))}
        >
          {/* base fill */}
          <div className="absolute inset-y-0 left-0 z-[1]" style={fillStyle}>
            <div style={capStyle} />
          </div>

          {/* overflow fill (inside, left→right) */}
          {overStyle && <div style={overStyle} aria-hidden />}
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {Math.round(pctFloat)}%{" "}
          {overflowPct > 0 && (
            <span style={{ color: "var(--destructive)" }}>
              (+{Math.round(overflowPct)}%)
            </span>
          )}
        </div>
      </div>

      {!isGuest && onQuickAdd && (
        <div className="mt-4 flex gap-2">
          {[250, 500, 750].map((ml) => (
            <SoftTealBtn key={ml} onClick={() => onQuickAdd(ml)}>
              +{ml} ml
            </SoftTealBtn>
          ))}
        </div>
      )}
    </div>
  );
}
