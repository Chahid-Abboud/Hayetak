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
};

type ChartPoint = { xLabel: string; xValue: number; yValue: number };

export function PredictorVsActualCard({
    trend,
    weighIns,
}: {
    trend: PredictionTrendPoint[];
    weighIns: PredictorMeasurement[];
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
    const weightPoints = useMemo(
        () => chartPointsFromMeasurements(weighIns, 'weight'),
        [weighIns],
    );
    const rowsWithFeedback = useMemo(
        () =>
            rows.map((row) => ({
                ...row,
                dateKey: row.feedback_period_end_date,
                xValue: isoDateToAxisValue(row.feedback_period_end_date),
                feedback_unlocked:
                    weightPoints.filter(
                        (point) =>
                            point.xValue <=
                            isoDateToAxisValue(row.feedback_period_end_date),
                    ).length >= 2,
            })),
        [rows, weightPoints],
    );
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const preferredPredictionMonthKey = useMemo(() => {
        const predictionMonths = rowsWithFeedback
            .map((row) => monthKeyFromIso(row.dateKey))
            .sort();

        return predictionMonths[predictionMonths.length - 1] ?? 'all';
    }, [rowsWithFeedback]);
    const monthOptions = useMemo(() => {
        const keys = Array.from(
            new Set([
                ...rowsWithFeedback.map((row) => monthKeyFromIso(row.dateKey)),
                ...weightPoints.map((point) => monthKeyFromIso(point.xLabel)),
            ]),
        ).sort();

        return keys.map((key) => ({
            value: key,
            label: formatMonthKeyLabel(key),
        }));
    }, [rowsWithFeedback, weightPoints]);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');

    useEffect(() => {
        if (monthOptions.length === 0) {
            setSelectedMonthKey('all');
            return;
        }

        setSelectedMonthKey((current) => {
            const currentHasPredictions =
                current !== 'all' &&
                rowsWithFeedback.some(
                    (row) => monthKeyFromIso(row.dateKey) === current,
                );

            if (currentHasPredictions) {
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
    }, [monthOptions, preferredPredictionMonthKey, rowsWithFeedback]);

    const weekOptions = useMemo(() => {
        const filteredRows =
            selectedMonthKey === 'all'
                ? rowsWithFeedback
                : rowsWithFeedback.filter(
                      (row) =>
                          monthKeyFromIso(row.dateKey) === selectedMonthKey,
                  );
        const filteredWeights =
            selectedMonthKey === 'all'
                ? weightPoints
                : weightPoints.filter(
                      (point) =>
                          monthKeyFromIso(point.xLabel) === selectedMonthKey,
                  );

        const keys = Array.from(
            new Set([
                ...filteredRows.map((row) => weekKeyFromIso(row.dateKey)),
                ...filteredWeights.map((point) => weekKeyFromIso(point.xLabel)),
            ]),
        ).sort();

        return keys.map((key) => ({
            value: key,
            label: formatWeekKeyLabel(key),
        }));
    }, [rowsWithFeedback, selectedMonthKey, weightPoints]);
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

    if (rowsWithFeedback.length === 0 && weightPoints.length < 2) {
        return (
            <p className="text-sm text-muted-foreground">
                Keep logging plans and weigh-ins to unlock this shared
                prediction timeline.
            </p>
        );
    }

    const visibleRows = rowsWithFeedback.filter((row) => {
        const monthMatch =
            selectedMonthKey === 'all' ||
            monthKeyFromIso(row.dateKey) === selectedMonthKey;
        const weekMatch =
            viewMode !== 'week' ||
            selectedWeekKey === 'all' ||
            weekKeyFromIso(row.dateKey) === selectedWeekKey;

        return monthMatch && weekMatch;
    });
    const visibleWeightPoints = weightPoints.filter((point) => {
        const monthMatch =
            selectedMonthKey === 'all' ||
            monthKeyFromIso(point.xLabel) === selectedMonthKey;
        const weekMatch =
            viewMode !== 'week' ||
            selectedWeekKey === 'all' ||
            weekKeyFromIso(point.xLabel) === selectedWeekKey;

        return monthMatch && weekMatch;
    });

    const width = 860;
    const height = 300;
    const padLeft = 72;
    const padRight = 20;
    const padTop = 36;
    const padBottom = 72;

    const actualSeries = visibleWeightPoints.map((point) => ({
        xValue: point.xValue,
        yValue: point.yValue,
        label: point.xLabel,
    }));
    const beforeFeedbackSeries = visibleRows.map((row) => ({
        xValue: row.xValue,
        yValue: row.projected_before_feedback_kg,
        label: row.feedback_period_end_date,
    }));
    const afterFeedbackSeries = visibleRows.map((row) => ({
        xValue: row.xValue,
        yValue: row.projected_after_feedback_kg,
        label: row.feedback_period_end_date,
    }));
    const allSeries = [
        ...actualSeries,
        ...beforeFeedbackSeries,
        ...afterFeedbackSeries,
    ];
    const chartValues = allSeries
        .map((point) => point.yValue)
        .filter((value): value is number => typeof value === 'number');

    if (chartValues.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No prediction points or weigh-ins were logged in this selected{' '}
                {viewMode}.
            </p>
        );
    }

    const noVisiblePredictions = visibleRows.length === 0;
    const selectedMonthLabel =
        selectedMonthKey === 'all'
            ? 'the selected range'
            : formatMonthKeyLabel(selectedMonthKey);

    const allXValues = allSeries
        .map((point) => point.xValue)
        .filter((value) => Number.isFinite(value));
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

    const actualPaths = buildSegmentedPaths(actualSeries);
    const beforeFeedbackPaths = buildSegmentedPaths(beforeFeedbackSeries);
    const afterFeedbackPaths = buildSegmentedPaths(afterFeedbackSeries);

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
            value,
            label: formatShortDate(new Date(value).toISOString().slice(0, 10)),
        }));
    const xLabelStep = Math.max(1, Math.ceil(xTickValues.length / 6));
    const xTicks = xTickValues.filter(
        (tick, index) =>
            index % xLabelStep === 0 || index === xTickValues.length - 1,
    );

    const latestPrediction = visibleRows[visibleRows.length - 1];
    const latestWeightPoint =
        visibleWeightPoints[visibleWeightPoints.length - 1] ??
        weightPoints[weightPoints.length - 1];
    const latestProjectedActive = latestPrediction?.feedback_unlocked
        ? latestPrediction.projected_after_feedback_kg
        : latestPrediction?.projected_weight_kg;
    const latestBaselineWeight = latestPrediction?.baseline_weight_kg ?? null;
    const latestHorizonDays = latestPrediction?.horizon_days ?? null;
    const weeklyProjectedWeight =
        typeof latestProjectedActive === 'number' &&
        typeof latestBaselineWeight === 'number' &&
        typeof latestHorizonDays === 'number' &&
        latestHorizonDays > 0
            ? latestBaselineWeight +
              ((latestProjectedActive - latestBaselineWeight) /
                  latestHorizonDays) *
                  7
            : null;
    const beforeFeedbackColor = 'var(--chart-3)';
    const afterFeedbackColor = 'var(--chart-1)';
    const actualColor = 'var(--chart-5)';
    const legendItems = [
        {
            label: 'Before feedback',
            color: beforeFeedbackColor,
            dash: '7 5',
            marker: 'square',
        },
        {
            label: 'After feedback',
            color: afterFeedbackColor,
            dash: undefined,
            marker: 'circle',
        },
        {
            label: 'Actual weigh-in',
            color: actualColor,
            dash: undefined,
            marker: 'circle',
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
                    month with prediction points to see before/after feedback.
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
                        aria-label="Prediction timeline versus all logged weigh-ins"
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

                        {visibleRows.map((row) => (
                            <line
                                key={`feedback-shift-${row.plan_date}-${row.feedback_period_end_date}`}
                                x1={toX(row.xValue)}
                                y1={toY(row.projected_before_feedback_kg)}
                                x2={toX(row.xValue)}
                                y2={toY(row.projected_after_feedback_kg)}
                                stroke={afterFeedbackColor}
                                strokeWidth="1.8"
                                strokeDasharray="3 4"
                                opacity={row.feedback_applied ? 0.72 : 0.28}
                            >
                                <title>
                                    {`Feedback shift on ${formatShortDate(row.feedback_period_end_date)}: ${row.projected_before_feedback_kg.toFixed(1)} kg to ${row.projected_after_feedback_kg.toFixed(1)} kg`}
                                </title>
                            </line>
                        ))}

                        {beforeFeedbackPaths.map((path, index) => (
                            <path
                                key={`before-feedback-path-${index}`}
                                d={path}
                                fill="none"
                                stroke={beforeFeedbackColor}
                                strokeWidth="2.2"
                                strokeDasharray="7 5"
                            />
                        ))}

                        {afterFeedbackPaths.map((path, index) => (
                            <path
                                key={`after-feedback-path-${index}`}
                                d={path}
                                fill="none"
                                stroke={afterFeedbackColor}
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
                            />
                        ))}

                        {beforeFeedbackSeries.map((point, index) => (
                            <rect
                                key={`before-feedback-point-${index}`}
                                x={toX(point.xValue) - 4}
                                y={toY(point.yValue) - 4}
                                width="8"
                                height="8"
                                rx="2"
                                fill={beforeFeedbackColor}
                            >
                                <title>
                                    {`Before feedback ${formatShortDate(point.label)}: ${point.yValue.toFixed(1)} kg`}
                                </title>
                            </rect>
                        ))}

                        {afterFeedbackSeries.map((point, index) => (
                            <circle
                                key={`after-feedback-point-${index}`}
                                cx={toX(point.xValue)}
                                cy={toY(point.yValue)}
                                r={4}
                                fill={afterFeedbackColor}
                            >
                                <title>
                                    {`After feedback ${formatShortDate(point.label)}: ${point.yValue.toFixed(1)} kg`}
                                </title>
                            </circle>
                        ))}

                        {actualSeries.map((point, index) => (
                            <circle
                                key={`actual-point-${index}`}
                                cx={toX(point.xValue)}
                                cy={toY(point.yValue)}
                                r={3.4}
                                fill={actualColor}
                            >
                                <title>
                                    {`Actual ${formatShortDate(point.label)}: ${point.yValue.toFixed(1)} kg`}
                                </title>
                            </circle>
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

            <div className="grid gap-3 sm:grid-cols-2">
                <PredictionStat
                    label="Current weight"
                    value={
                        latestWeightPoint
                            ? `${latestWeightPoint.yValue.toFixed(1)} kg`
                            : 'N/A'
                    }
                />
                <PredictionStat
                    label="Next predicted weight"
                    value={
                        typeof weeklyProjectedWeight === 'number'
                            ? `${weeklyProjectedWeight.toFixed(1)} kg in 1 week`
                            : 'N/A'
                    }
                />
            </div>
        </div>
    );
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

function chartPointsFromMeasurements(
    measurements: PredictorMeasurement[] | undefined,
    metric: 'weight' | 'height',
): ChartPoint[] {
    const safe = Array.isArray(measurements) ? measurements : [];
    const byDate = new Map<string, PredictorMeasurement>();

    safe
        .filter((item) => item.type === metric && Number.isFinite(item.value))
        .slice()
        .sort((a, b) => (a.date > b.date ? 1 : -1))
        .forEach((item) => {
            byDate.set(item.date, item);
        });

    return Array.from(byDate.values())
        .map((item) => ({
            xLabel: item.date,
            xValue: isoDateToAxisValue(item.date),
            yValue: item.value,
        }))
        .sort((a, b) => a.xValue - b.xValue);
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
