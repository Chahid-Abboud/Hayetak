import {
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStatCard,
    ProductStatGrid,
} from '@/components/product/page';
import {
    ProductButton,
    ProductInput,
    ProductTextarea,
} from '@/components/product/product-ui';
import {
    ProductTable,
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { Activity, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Measurement = {
    id: number;
    measured_at: string | null;
    weight_kg: number | null;
    height_cm: number | null;
    body_fat_pct: number | null;
    waist_cm: number | null;
    hip_cm: number | null;
    notes: string | null;
};

type MeasurementSummary = {
    latest_weight_kg: number | null;
    latest_weight_date: string | null;
    latest_height_cm: number | null;
    latest_height_date: string | null;
    weight_change_kg: number | null;
    total_measurements: number;
};

type MeasurementResponse = {
    data: Measurement[];
    summary: MeasurementSummary;
};

type MeasurementType = 'weight' | 'height';

const emptySummary: MeasurementSummary = {
    latest_weight_kg: null,
    latest_weight_date: null,
    latest_height_cm: null,
    latest_height_date: null,
    weight_change_kg: null,
    total_measurements: 0,
};

function todayYmd() {
    return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number | null, suffix: string, digits = 1) {
    if (value === null || Number.isNaN(value)) {
        return '-';
    }

    return `${value.toFixed(digits)} ${suffix}`;
}

export default function ProgressIndex() {
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [summary, setSummary] = useState<MeasurementSummary>(emptySummary);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [measuredAt, setMeasuredAt] = useState(todayYmd());
    const [type, setType] = useState<MeasurementType>('weight');
    const [value, setValue] = useState('');
    const [notes, setNotes] = useState('');

    const loadMeasurements = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/measurements?limit=90', {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = (await response.json()) as MeasurementResponse;
            setMeasurements(Array.isArray(payload.data) ? payload.data : []);
            setSummary(payload.summary ?? emptySummary);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadMeasurements();
    }, []);

    const weightPoints = useMemo(
        () =>
            measurements
                .filter(
                    (measurement) =>
                        measurement.weight_kg !== null &&
                        measurement.measured_at,
                )
                .map((measurement) => ({
                    date: measurement.measured_at ?? '',
                    value: measurement.weight_kg ?? 0,
                }))
                .reverse(),
        [measurements],
    );

    const submit = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                '/api/measurements',
                jsonRequestInit('POST', {
                    measured_at: measuredAt,
                    type,
                    value: Number(value),
                    notes: notes.trim() || null,
                }),
            );

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message ?? `HTTP ${response.status}`);
            }

            setValue('');
            setNotes('');
            setMeasuredAt(todayYmd());
            setSuccess('Measurement saved.');
            await loadMeasurements();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setSaving(false);
        }
    };

    const destroy = async (measurement: Measurement) => {
        setDeletingId(measurement.id);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/measurements/${measurement.id}`,
                jsonRequestInit('DELETE'),
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setSuccess('Measurement deleted.');
            await loadMeasurements();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <ProductPageShell width="wide">
            <Head title="Progress" />

            <ProductHero
                eyebrow="Progress"
                title="Measurements"
                description="Track weight, height, and body metrics in one place."
                actions={
                    <ProductButton
                        type="button"
                        emphasis="secondary"
                        onClick={() => void loadMeasurements()}
                        disabled={loading}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </ProductButton>
                }
                meta={
                    <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2 font-semibold">
                            <Activity className="h-4 w-4 text-primary" />
                            {summary.total_measurements} entries
                        </div>
                        <div className="text-muted-foreground">
                            Latest weight:{' '}
                            {formatNumber(summary.latest_weight_kg, 'kg')}
                        </div>
                    </div>
                }
            />

            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                    {error}
                </div>
            ) : null}
            {success ? (
                <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
                    {success}
                </div>
            ) : null}

            <ProductStatGrid>
                <ProductStatCard
                    label="Weight"
                    value={formatNumber(summary.latest_weight_kg, 'kg')}
                    helper={summary.latest_weight_date ?? 'No entry yet'}
                />
                <ProductStatCard
                    label="Height"
                    value={formatNumber(summary.latest_height_cm, 'cm', 0)}
                    helper={summary.latest_height_date ?? 'No entry yet'}
                />
                <ProductStatCard
                    label="Weight change"
                    value={formatNumber(summary.weight_change_kg, 'kg')}
                    helper="Oldest to newest saved weight"
                />
                <ProductStatCard
                    label="Entries"
                    value={summary.total_measurements}
                    helper="Saved measurements"
                />
            </ProductStatGrid>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                <ProductSection title="Add Measurement">
                    <div className="grid gap-4">
                        <label className="grid gap-2 text-sm font-medium">
                            Date
                            <ProductInput
                                type="date"
                                value={measuredAt}
                                onChange={(event) =>
                                    setMeasuredAt(event.target.value)
                                }
                            />
                        </label>

                        <label className="grid gap-2 text-sm font-medium">
                            Type
                            <select
                                value={type}
                                onChange={(event) =>
                                    setType(
                                        event.target.value as MeasurementType,
                                    )
                                }
                                className="h-10 rounded-2xl border border-border/70 bg-background/88 px-3 text-sm shadow-[0_14px_34px_-28px_rgba(15,23,42,0.76)]"
                            >
                                <option value="weight">Weight</option>
                                <option value="height">Height</option>
                            </select>
                        </label>

                        <label className="grid gap-2 text-sm font-medium">
                            Value
                            <ProductInput
                                type="number"
                                min="1"
                                step={type === 'weight' ? '0.1' : '1'}
                                value={value}
                                placeholder={type === 'weight' ? 'kg' : 'cm'}
                                onChange={(event) =>
                                    setValue(event.target.value)
                                }
                            />
                        </label>

                        <label className="grid gap-2 text-sm font-medium">
                            Notes
                            <ProductTextarea
                                rows={3}
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                            />
                        </label>

                        <ProductButton
                            type="button"
                            onClick={() => void submit()}
                            disabled={saving || value.trim() === ''}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {saving ? 'Saving' : 'Save'}
                        </ProductButton>
                    </div>
                </ProductSection>

                <ProductSection title="Weight Trend">
                    {weightPoints.length >= 2 ? (
                        <WeightChart points={weightPoints} />
                    ) : (
                        <ProductEmptyState
                            title="No chart yet"
                            description="Add at least two weight entries."
                        />
                    )}
                </ProductSection>
            </div>

            <ProductSection title="History">
                <ProductTable>
                    <ProductTableHead>
                        <tr>
                            <ProductTableHeaderCell>
                                Date
                            </ProductTableHeaderCell>
                            <ProductTableHeaderCell>
                                Weight
                            </ProductTableHeaderCell>
                            <ProductTableHeaderCell>
                                Height
                            </ProductTableHeaderCell>
                            <ProductTableHeaderCell>
                                Body Fat
                            </ProductTableHeaderCell>
                            <ProductTableHeaderCell>
                                Waist
                            </ProductTableHeaderCell>
                            <ProductTableHeaderCell>
                                Notes
                            </ProductTableHeaderCell>
                            <ProductTableHeaderCell className="text-right">
                                Action
                            </ProductTableHeaderCell>
                        </tr>
                    </ProductTableHead>
                    <ProductTableBody>
                        {measurements.length === 0 ? (
                            <ProductTableEmptyRow
                                colSpan={7}
                                title={
                                    loading
                                        ? 'Loading measurements'
                                        : 'No measurements yet'
                                }
                            />
                        ) : (
                            measurements.map((measurement) => (
                                <ProductTableRow key={measurement.id}>
                                    <ProductTableCell>
                                        {measurement.measured_at ?? '-'}
                                    </ProductTableCell>
                                    <ProductTableCell>
                                        {formatNumber(
                                            measurement.weight_kg,
                                            'kg',
                                        )}
                                    </ProductTableCell>
                                    <ProductTableCell>
                                        {formatNumber(
                                            measurement.height_cm,
                                            'cm',
                                            0,
                                        )}
                                    </ProductTableCell>
                                    <ProductTableCell>
                                        {formatNumber(
                                            measurement.body_fat_pct,
                                            '%',
                                        )}
                                    </ProductTableCell>
                                    <ProductTableCell>
                                        {formatNumber(
                                            measurement.waist_cm,
                                            'cm',
                                        )}
                                    </ProductTableCell>
                                    <ProductTableCell>
                                        {measurement.notes ?? '-'}
                                    </ProductTableCell>
                                    <ProductTableCell className="text-right">
                                        <ProductButton
                                            type="button"
                                            emphasis="secondary"
                                            size="sm"
                                            onClick={() =>
                                                void destroy(measurement)
                                            }
                                            disabled={
                                                deletingId === measurement.id
                                            }
                                            aria-label={`Delete measurement ${measurement.id}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </ProductButton>
                                    </ProductTableCell>
                                </ProductTableRow>
                            ))
                        )}
                    </ProductTableBody>
                </ProductTable>
            </ProductSection>
        </ProductPageShell>
    );
}

function WeightChart({
    points,
}: {
    points: Array<{ date: string; value: number }>;
}) {
    const width = 720;
    const height = 260;
    const padding = 36;
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(max - min, 1);

    const coords = points.map((point, index) => {
        const x =
            padding +
            (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
        const y =
            height -
            padding -
            ((point.value - min) / spread) * (height - padding * 2);

        return { ...point, x, y };
    });

    const path = coords
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
        )
        .join(' ');

    return (
        <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/60 p-4">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Weight trend chart"
                className="h-[260px] w-full"
            >
                <line
                    x1={padding}
                    y1={height - padding}
                    x2={width - padding}
                    y2={height - padding}
                    stroke="var(--border)"
                    strokeWidth="1"
                />
                <line
                    x1={padding}
                    y1={padding}
                    x2={padding}
                    y2={height - padding}
                    stroke="var(--border)"
                    strokeWidth="1"
                />
                <path
                    d={path}
                    fill="none"
                    stroke="var(--chart-2)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                {coords.map((point) => (
                    <g key={`${point.date}-${point.value}`}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="var(--chart-2)"
                        />
                        <text
                            x={point.x}
                            y={point.y - 12}
                            textAnchor="middle"
                            className="fill-foreground text-[11px] font-semibold"
                        >
                            {point.value.toFixed(1)}
                        </text>
                    </g>
                ))}
                <text
                    x={padding}
                    y={height - 8}
                    className="fill-muted-foreground text-[11px]"
                >
                    {coords[0]?.date}
                </text>
                <text
                    x={width - padding}
                    y={height - 8}
                    textAnchor="end"
                    className="fill-muted-foreground text-[11px]"
                >
                    {coords[coords.length - 1]?.date}
                </text>
            </svg>
        </div>
    );
}
