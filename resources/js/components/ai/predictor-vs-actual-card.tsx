import { useEffect, useMemo, useState } from 'react';

export type PredictorMeasurement = {
    date: string;
    type: 'weight' | 'height';
    value: number;
};

export type PredictionTrendPoint = {
    plan_date: string;
    feedback_period_start_date: string;
    feedback_period_end_date: string;
    horizon_days: number;
    baseline_weight_kg: number;
    projected_before_feedback_kg: number;
    projected_after_feedback_kg: number;
    projected_weight_kg: number;
    feedback_applied: boolean;
    actual_weight_kg: number | null;
    actual_weight_date: string | null;
    check_in_number?: number;
    feedback_sample_count?: number;
    per_checkpoint_adjusted?: boolean;
};

type ChartPoint = {
    xValue: number;
    yValue: number;
    label: string;
    isFuture?: boolean;
};

export function PredictorVsActualCard({
    trend,
    comparisonWeights,
}: {
    trend: PredictionTrendPoint[];
    comparisonWeights: PredictorMeasurement[];
}) {
    const rows = useMemo(
        () =>
            [...trend].sort((left, right) =>
                left.feedback_period_end_date > right.feedback_period_end_date
                    ? 1
                    : -1,
            ),
        [trend],
    );
    const trustedWeights = useMemo(
        () =>
            [...comparisonWeights]
                .filter(
                    (item) =>
                        item.type === 'weight' && Number.isFinite(item.value),
                )
                .sort((left, right) => (left.date > right.date ? 1 : -1)),
        [comparisonWeights],
    );
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const preferredPredictionMonthKey = useMemo(() => {
        const keys = [
            ...rows.map((row) => monthKeyFromIso(row.feedback_period_end_date)),
            ...trustedWeights.map((item) => monthKeyFromIso(item.date)),
        ].sort();

        return keys[keys.length - 1] ?? 'all';
    }, [rows, trustedWeights]);
    const monthOptions = useMemo(() => {
        const keys = Array.from(
            new Set([
                ...rows.map((row) =>
                    monthKeyFromIso(row.feedback_period_end_date),
                ),
                ...trustedWeights.map((item) => monthKeyFromIso(item.date)),
            ]),
        ).sort();

        return keys.map((key) => ({
            value: key,
            label: formatMonthKeyLabel(key),
        }));
    }, [rows, trustedWeights]);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');

    useEffect(() => {
        if (monthOptions.length === 0) {
            setSelectedMonthKey('all');
            return;
        }

        setSelectedMonthKey((current) => {
            const currentHasData =
                current !== 'all' &&
                monthOptions.some((option) => option.value === current);

            if (currentHasData) {
                return current;
            }

            if (
                preferredPredictionMonthKey !== 'all' &&
                monthOptions.some(
                    (option) => option.value === preferredPredictionMonthKey,
                )
            ) {
                return preferredPredictionMonthKey;
            }

            return monthOptions[monthOptions.length - 1]?.value ?? 'all';
        });
    }, [monthOptions, preferredPredictionMonthKey]);

    const weekOptions = useMemo(() => {
        const rowKeys =
            selectedMonthKey === 'all'
                ? rows
                : rows.filter(
                      (row) =>
                          monthKeyFromIso(row.feedback_period_end_date) ===
                          selectedMonthKey,
                  );
        const weightKeys =
            selectedMonthKey === 'all'
                ? trustedWeights
                : trustedWeights.filter(
                      (item) => monthKeyFromIso(item.date) === selectedMonthKey,
                  );

        const keys = Array.from(
            new Set([
                ...rowKeys.map((row) =>
                    weekKeyFromIso(row.feedback_period_end_date),
                ),
                ...weightKeys.map((item) => weekKeyFromIso(item.date)),
            ]),
        ).sort();

        return keys.map((key) => ({
            value: key,
            label: formatWeekKeyLabel(key),
        }));
    }, [rows, selectedMonthKey, trustedWeights]);
    const [selectedWeekKey, setSelectedWeekKey] = useState<string>('all');

    useEffect(() => {
        if (weekOptions.length === 0) {
            setSelectedWeekKey('all');
            return;
        }

        setSelectedWeekKey((current) => {
            if (
                current !== 'all' &&
                weekOptions.some((option) => option.value === current)
            ) {
                return current;
            }

            return weekOptions[weekOptions.length - 1]?.value ?? 'all';
        });
    }, [weekOptions]);

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Generate a completed plan to unlock the predictor timeline.
            </p>
        );
    }

    const rowMatchesCurrentView = (date: string) => {
        const monthMatch =
            selectedMonthKey === 'all' ||
            monthKeyFromIso(date) === selectedMonthKey;
        const weekMatch =
            viewMode !== 'week' ||
            selectedWeekKey === 'all' ||
            weekKeyFromIso(date) === selectedWeekKey;

        return monthMatch && weekMatch;
    };

    const visibleRows = rows.filter((row) =>
        rowMatchesCurrentView(row.feedback_period_end_date),
    );
    const visibleWeights = trustedWeights.filter((item) =>
        rowMatchesCurrentView(item.date),
    );

    const latestPrediction = rows[rows.length - 1];
    const futureProjectionSeries =
        buildFutureProjectionSeries(latestPrediction);
    const visibleFutureSeries = futureProjectionSeries.filter((point) =>
        rowMatchesCurrentView(point.label),
    );

    const width = 860;
    const height = 300;
    const padLeft = 72;
    const padRight = 20;
    const padTop = 36;
    const padBottom = 72;

    const initialSeries = visibleRows.map((row) => ({
        xValue: isoDateToAxisValue(row.feedback_period_end_date),
        yValue: row.projected_before_feedback_kg,
        label: row.feedback_period_end_date,
    }));
    const latestSeries: ChartPoint[] = [
        ...visibleRows.map((row) => ({
            xValue: isoDateToAxisValue(row.feedback_period_end_date),
            yValue: row.projected_after_feedback_kg,
            label: row.feedback_period_end_date,
        })),
        ...visibleFutureSeries,
    ];
    const actualSeries = visibleWeights.map((item) => ({
        xValue: isoDateToAxisValue(item.date),
        yValue: item.value,
        label: item.date,
    }));
    const allSeries = [...initialSeries, ...latestSeries, ...actualSeries];
    const chartValues = allSeries.map((point) => point.yValue);

    if (chartValues.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No prediction points were logged in this selected {viewMode}.
            </p>
        );
    }

    const noVisiblePredictions =
        visibleRows.length === 0 && visibleFutureSeries.length === 0;
    const selectedMonthLabel =
        selectedMonthKey === 'all'
            ? 'the selected range'
            : formatMonthKeyLabel(selectedMonthKey);

    const allXValues = allSeries.map((point) => point.xValue);
    const minX = Math.min(...allXValues);
    const maxX = Math.max(...allXValues);
    const spanX = Math.max(1, maxX - minX);

    const rawMinY = Math.min(...chartValues);
    const rawMaxY = Math.max(...chartValues);
    const minY = rawMinY - 0.35;
    const maxY = rawMaxY + 0.35;
    const spanY = Math.max(1, maxY - minY);

    const toX = (value: number) =>
        padLeft + ((value - minX) / spanX) * (width - padLeft - padRight);
    const toY = (value: number) =>
        height -
        padBottom -
        ((value - minY) / spanY) * (height - padTop - padBottom);

    const buildSegmentedPaths = (
        values: Array<{ xValue: number; yValue: number | null }>,
    ): string[] => {
        const segments: string[] = [];
        let currentSegment = '';

        values.forEach((value) => {
            if (typeof value.yValue !== 'number') {
                if (currentSegment !== '') {
                    segments.push(currentSegment.trim());
                    currentSegment = '';
                }
                return;
            }

            const command = currentSegment === '' ? 'M' : 'L';
            currentSegment += `${command} ${toX(value.xValue)} ${toY(value.yValue)} `;
        });

        if (currentSegment !== '') {
            segments.push(currentSegment.trim());
        }

        return segments;
    };

    const initialPaths = buildSegmentedPaths(initialSeries);
    const latestPaths = buildSegmentedPaths(latestSeries);
    const actualPaths = buildSegmentedPaths(actualSeries);
    const yTicks = Array.from({ length: 5 }, (_, tickIndex) => {
        const ratio = tickIndex / 4;
        const value = maxY - ratio * spanY;
        return {
            y: toY(value),
            label: `${value.toFixed(1)} kg`,
        };
    });
    const xTickValues = Array.from(new Set(allXValues))
        .sort((left, right) => left - right)
        .map((value) => ({
            x: toX(value),
            label: formatShortDate(new Date(value).toISOString().slice(0, 10)),
        }));
    const xLabelStep = Math.max(1, Math.ceil(xTickValues.length / 6));
    const xTicks = xTickValues.filter(
        (tick, index) =>
            index % xLabelStep === 0 || index === xTickValues.length - 1,
    );

    const latestProjectedWeight =
        latestPrediction?.projected_after_feedback_kg ?? null;
    const latestBaselineWeight = latestPrediction?.baseline_weight_kg ?? null;
    const latestHorizonDays = latestPrediction?.horizon_days ?? null;
    const feedbackSampleCount = latestPrediction?.feedback_sample_count ?? 0;
    const nextPredictionDate = futureProjectionSeries[0]?.label ?? null;
    const secondPredictionDate = futureProjectionSeries[1]?.label ?? null;
    const initialColor = 'var(--chart-3)';
    const latestColor = 'var(--chart-1)';
    const actualColor = 'var(--chart-5)';
    const legendItems = [
        {
            label: 'Initial projection',
            color: initialColor,
            dash: '7 5',
            marker: 'square',
        },
        {
            label: 'Projected path',
            color: latestColor,
            dash: undefined,
            marker: 'circle',
        },
        {
            label: 'Last 2 logged weights',
            color: actualColor,
            dash: undefined,
            marker: 'diamond',
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-border/80 bg-card p-1 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode('month')}
                        className={`rounded-full px-3 py-1 font-semibold transition ${viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('week')}
                        className={`rounded-full px-3 py-1 font-semibold transition ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                    <span className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Month
                    </span>
                    <select
                        value={selectedMonthKey}
                        onChange={(event) =>
                            setSelectedMonthKey(event.target.value)
                        }
                        className="w-full rounded-[18px] border border-border/60 bg-card px-4 py-3 text-sm text-foreground"
                    >
                        {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                {viewMode === 'week' ? (
                    <label className="space-y-2">
                        <span className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Week
                        </span>
                        <select
                            value={selectedWeekKey}
                            onChange={(event) =>
                                setSelectedWeekKey(event.target.value)
                            }
                            className="w-full rounded-[18px] border border-border/60 bg-card px-4 py-3 text-sm text-foreground"
                        >
                            {weekOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
            </div>

            {noVisiblePredictions ? (
                <div className="rounded-[18px] border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                    No predictor runs landed in {selectedMonthLabel}. Choose a
                    month with prediction points to see the projection curve.
                </div>
            ) : null}

            <div className="dashboard-surface rounded-[24px] p-4 md:p-5">
                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
                    {legendItems.map((item) => (
                        <div
                            key={item.label}
                            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
                        >
                            <svg
                                width="34"
                                height="14"
                                viewBox="0 0 34 14"
                                aria-hidden="true"
                                className="shrink-0"
                            >
                                <line
                                    x1="1"
                                    y1="7"
                                    x2="33"
                                    y2="7"
                                    stroke={item.color}
                                    strokeWidth="2.4"
                                    strokeDasharray={item.dash}
                                    strokeLinecap="round"
                                />
                                {item.marker === 'square' ? (
                                    <rect
                                        x="13"
                                        y="3"
                                        width="8"
                                        height="8"
                                        rx="2"
                                        fill={item.color}
                                    />
                                ) : item.marker === 'diamond' ? (
                                    <polygon
                                        points="17,2 23,7 17,12 11,7"
                                        fill={item.color}
                                    />
                                ) : (
                                    <circle
                                        cx="17"
                                        cy="7"
                                        r="4"
                                        fill={item.color}
                                    />
                                )}
                            </svg>
                            {item.label}
                        </div>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        role="img"
                        aria-label="Projected check-in weight timeline with last 2 logged weights"
                        className="h-[300px] w-full min-w-[620px]"
                    >
                        {yTicks.map((tick, tickIndex) => (
                            <g key={`y-tick-${tickIndex}`}>
                                <line
                                    x1={padLeft}
                                    y1={tick.y}
                                    x2={width - padRight}
                                    y2={tick.y}
                                    stroke="var(--border)"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={padLeft - 8}
                                    y={tick.y + 4}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="var(--muted-foreground)"
                                >
                                    {tick.label}
                                </text>
                            </g>
                        ))}

                        {xTicks.map((tick, index) => (
                            <g key={`x-tick-${index}`}>
                                <line
                                    x1={tick.x}
                                    y1={height - padBottom}
                                    x2={tick.x}
                                    y2={height - padBottom + 4}
                                    stroke="var(--border)"
                                    strokeWidth="1"
                                />
                                <text
                                    x={tick.x}
                                    y={height - padBottom + 24}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="var(--muted-foreground)"
                                    transform={`rotate(-28 ${tick.x} ${height - padBottom + 24})`}
                                >
                                    {tick.label}
                                </text>
                            </g>
                        ))}

                        <line
                            x1={padLeft}
                            y1={padTop}
                            x2={padLeft}
                            y2={height - padBottom}
                            stroke="var(--border)"
                            strokeWidth="1"
                        />
                        <line
                            x1={padLeft}
                            y1={height - padBottom}
                            x2={width - padRight}
                            y2={height - padBottom}
                            stroke="var(--border)"
                            strokeWidth="1"
                        />

                        {visibleRows.map((row) => {
                            const xValue = isoDateToAxisValue(
                                row.feedback_period_end_date,
                            );

                            return (
                                <line
                                    key={`feedback-shift-${row.plan_date}-${row.feedback_period_end_date}`}
                                    x1={toX(xValue)}
                                    y1={toY(row.projected_before_feedback_kg)}
                                    x2={toX(xValue)}
                                    y2={toY(row.projected_after_feedback_kg)}
                                    stroke={latestColor}
                                    strokeWidth="1.8"
                                    strokeDasharray="3 4"
                                    opacity={row.feedback_applied ? 0.72 : 0.28}
                                >
                                    <title>
                                        {`Projection update on ${formatShortDate(row.feedback_period_end_date)}: ${row.projected_before_feedback_kg.toFixed(1)} kg to ${row.projected_after_feedback_kg.toFixed(1)} kg`}
                                    </title>
                                </line>
                            );
                        })}

                        {initialPaths.map((path, index) => (
                            <path
                                key={`initial-path-${index}`}
                                d={path}
                                fill="none"
                                stroke={initialColor}
                                strokeWidth="2.2"
                                strokeDasharray="7 5"
                            />
                        ))}

                        {latestPaths.map((path, index) => (
                            <path
                                key={`latest-path-${index}`}
                                d={path}
                                fill="none"
                                stroke={latestColor}
                                strokeWidth="2.8"
                            />
                        ))}

                        {actualPaths.map((path, index) => (
                            <path
                                key={`actual-path-${index}`}
                                d={path}
                                fill="none"
                                stroke={actualColor}
                                strokeWidth="2.4"
                                strokeDasharray="4 3"
                                opacity={0.92}
                            />
                        ))}

                        {initialSeries.map((point, index) => (
                            <rect
                                key={`initial-point-${index}`}
                                x={toX(point.xValue) - 4}
                                y={toY(point.yValue) - 4}
                                width="8"
                                height="8"
                                rx="2"
                                fill={initialColor}
                            >
                                <title>
                                    {`Initial projection ${formatShortDate(point.label)}: ${point.yValue.toFixed(1)} kg`}
                                </title>
                            </rect>
                        ))}

                        {latestSeries.map((point, index) => (
                            <circle
                                key={`latest-point-${index}`}
                                cx={toX(point.xValue)}
                                cy={toY(point.yValue)}
                                r={point.isFuture ? 4.6 : 4}
                                fill={
                                    point.isFuture ? 'transparent' : latestColor
                                }
                                stroke={latestColor}
                                strokeWidth={point.isFuture ? 2.2 : 0}
                            >
                                <title>
                                    {`${point.isFuture ? 'Future projection' : 'Projected check-in'} ${formatShortDate(point.label)}: ${point.yValue.toFixed(1)} kg`}
                                </title>
                            </circle>
                        ))}

                        {actualSeries.map((point, index) => (
                            <polygon
                                key={`actual-point-${index}`}
                                points={diamondPoints(
                                    toX(point.xValue),
                                    toY(point.yValue),
                                    5,
                                )}
                                fill={actualColor}
                            >
                                <title>
                                    {`Logged weight ${formatShortDate(point.label)}: ${point.yValue.toFixed(1)} kg`}
                                </title>
                            </polygon>
                        ))}

                        <text
                            x={padLeft}
                            y={16}
                            textAnchor="middle"
                            fontSize="11"
                            fill="var(--muted-foreground)"
                        >
                            Weight (kg)
                        </text>
                        <text
                            x={width - padRight}
                            y={height - 10}
                            textAnchor="end"
                            fontSize="11"
                            fill="var(--muted-foreground)"
                        >
                            Timeline
                        </text>
                    </svg>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {latestHorizonDays ? (
                    <PredictionStat
                        label="Check-in window"
                        value={`${latestHorizonDays} days`}
                    />
                ) : null}
                <PredictionStat
                    label="Baseline for latest run"
                    value={
                        typeof latestBaselineWeight === 'number'
                            ? `${latestBaselineWeight.toFixed(1)} kg`
                            : 'N/A'
                    }
                />
                <PredictionStat
                    label="Next projected check-in"
                    value={
                        typeof latestProjectedWeight === 'number'
                            ? `${latestProjectedWeight.toFixed(1)} kg`
                            : 'N/A'
                    }
                />
                <PredictionStat
                    label="Upcoming windows"
                    value={
                        nextPredictionDate && secondPredictionDate
                            ? `${formatShortDate(nextPredictionDate)} and ${formatShortDate(secondPredictionDate)}`
                            : 'Current window only'
                    }
                />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <PredictionStat
                    label="Latest logged weights"
                    value={
                        trustedWeights.length > 0
                            ? trustedWeights
                                  .map(
                                      (item) =>
                                          `${formatShortDate(item.date)} ${item.value.toFixed(1)} kg`,
                                  )
                                  .join(' | ')
                            : 'No trusted weigh-ins yet'
                    }
                />
                <PredictionStat
                    label="Model adjustment"
                    value={
                        feedbackSampleCount > 0
                            ? `Adjusted after ${feedbackSampleCount} check-in${feedbackSampleCount === 1 ? '' : 's'}`
                            : rows.some((row) => row.per_checkpoint_adjusted)
                              ? 'Per-checkpoint active'
                              : 'Using base projection'
                    }
                />
            </div>
        </div>
    );
}

function buildFutureProjectionSeries(
    latestPrediction: PredictionTrendPoint | undefined,
): ChartPoint[] {
    if (!latestPrediction) {
        return [];
    }

    const delta =
        latestPrediction.projected_after_feedback_kg -
        latestPrediction.baseline_weight_kg;
    const horizonDays = Math.max(1, latestPrediction.horizon_days);
    const endDate = parseIsoDate(latestPrediction.feedback_period_end_date);

    return [1, 2].map((step) => {
        const nextDate = new Date(endDate.getTime());
        nextDate.setUTCDate(nextDate.getUTCDate() + step * horizonDays);

        return {
            xValue: nextDate.getTime(),
            yValue: roundToOne(
                latestPrediction.projected_after_feedback_kg + delta * step,
            ),
            label: nextDate.toISOString().slice(0, 10),
            isFuture: true,
        };
    });
}

function diamondPoints(cx: number, cy: number, radius: number): string {
    return [
        `${cx},${cy - radius}`,
        `${cx + radius},${cy}`,
        `${cx},${cy + radius}`,
        `${cx - radius},${cy}`,
    ].join(' ');
}

function roundToOne(value: number): number {
    return Math.round(value * 10) / 10;
}

function PredictionStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="dashboard-surface-soft rounded-[20px] p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </p>
            <p className="mt-2 text-sm leading-6 font-medium text-foreground">
                {value}
            </p>
        </div>
    );
}

function parseIsoDate(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return new Date(value);
    }

    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function isoDateToAxisValue(value: string): number {
    return parseIsoDate(value).getTime();
}

function monthKeyFromDate(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function monthKeyFromIso(value: string): string {
    return monthKeyFromDate(parseIsoDate(value));
}

function formatMonthKeyLabel(value: string): string {
    const [yearRaw, monthRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    if (!year || !month) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
    }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function startOfWeekUtc(value: Date): Date {
    const copy = new Date(value.getTime());
    const day = copy.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setUTCDate(copy.getUTCDate() + diff);
    copy.setUTCHours(12, 0, 0, 0);
    return copy;
}

function weekKeyFromDate(value: Date): string {
    const start = startOfWeekUtc(value);
    return start.toISOString().slice(0, 10);
}

function weekKeyFromIso(value: string): string {
    return weekKeyFromDate(parseIsoDate(value));
}

function formatWeekKeyLabel(value: string): string {
    const start = parseIsoDate(value);
    const end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);

    return `${start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })} - ${end.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })}`;
}

function formatShortDate(value: string | null | undefined): string {
    if (!value) {
        return 'N/A';
    }

    const parsed = parseIsoDate(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}
