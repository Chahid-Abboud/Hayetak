import {
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    ConfirmActionDialogWithReason,
    EntityDetailDrawer,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsonRequestInit } from '@/lib/http';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Pencil,
    Plus,
    RefreshCcw,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MetricType =
    | 'weight_kg'
    | 'height_cm'
    | 'body_fat_pct'
    | 'neck_cm'
    | 'chest_cm'
    | 'waist_cm'
    | 'hip_cm'
    | 'arm_cm'
    | 'thigh_cm'
    | 'calf_cm'
    | 'resting_hr'
    | 'systolic_bp'
    | 'diastolic_bp';

type Measurement = {
    id: number | null;
    user_id: number | '';
    measured_at: string;
    weight_kg?: string | number | null;
    height_cm?: string | number | null;
    body_fat_pct?: string | number | null;
    neck_cm?: string | number | null;
    chest_cm?: string | number | null;
    waist_cm?: string | number | null;
    hip_cm?: string | number | null;
    arm_cm?: string | number | null;
    thigh_cm?: string | number | null;
    calf_cm?: string | number | null;
    resting_hr?: string | number | null;
    systolic_bp?: string | number | null;
    diastolic_bp?: string | number | null;
    notes?: string | null;
    measurement_type?: string;
    measurement_label?: string;
    measurement_value?: string | number | null;
    measurement_unit?: string;
    source?: 'admin_manual' | 'user_logged';
    manual_edit?: boolean;
    outlier_signal?: {
        flagged: boolean;
        severity: 'success' | 'warning' | 'danger' | string;
        reason: string;
        metric?: string | null;
    };
    edited_by?: {
        id: number;
        name: string;
        email: string;
    } | null;
    audit_note?: string | null;
    user?: {
        id: number;
        email: string;
        first_name?: string | null;
        last_name?: string | null;
    } | null;
};

type TrendPoint = {
    date: string;
    weight_kg?: string | number | null;
    body_fat_pct?: string | number | null;
    waist_cm?: string | number | null;
    manual_edit?: boolean;
    outlier?: boolean;
};

type SelectedUserSummary = {
    user_id: number;
    user?: Measurement['user'];
    record_count: number;
    latest_date?: string | null;
    latest_weight_kg?: string | number | null;
    latest_body_fat_pct?: string | number | null;
    outlier_count: number;
    manual_edit_count: number;
} | null;

type ProgressResponse = {
    data?: Measurement[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    stats?: {
        total_records: number;
        manual_edits: number;
        outliers: number;
        users_with_records: number;
    };
    selected_user_summary?: SelectedUserSummary;
    trend?: TrendPoint[];
};

const metricOptions: Array<{ value: MetricType; label: string; unit: string }> =
    [
        { value: 'weight_kg', label: 'Weight', unit: 'kg' },
        { value: 'height_cm', label: 'Height', unit: 'cm' },
        { value: 'body_fat_pct', label: 'Body fat', unit: '%' },
        { value: 'waist_cm', label: 'Waist', unit: 'cm' },
        { value: 'chest_cm', label: 'Chest', unit: 'cm' },
        { value: 'hip_cm', label: 'Hip', unit: 'cm' },
        { value: 'neck_cm', label: 'Neck', unit: 'cm' },
        { value: 'arm_cm', label: 'Arm', unit: 'cm' },
        { value: 'thigh_cm', label: 'Thigh', unit: 'cm' },
        { value: 'calf_cm', label: 'Calf', unit: 'cm' },
        { value: 'resting_hr', label: 'Resting HR', unit: 'bpm' },
        { value: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg' },
        { value: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg' },
    ];

const EMPTY_MEASUREMENT: Measurement = {
    id: null,
    user_id: '',
    measured_at: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    height_cm: '',
    body_fat_pct: '',
    neck_cm: '',
    chest_cm: '',
    waist_cm: '',
    hip_cm: '',
    arm_cm: '',
    thigh_cm: '',
    calf_cm: '',
    resting_hr: '',
    systolic_bp: '',
    diastolic_bp: '',
    notes: '',
    source: 'admin_manual',
    manual_edit: true,
};

function personName(row?: Measurement | null) {
    return (
        [row?.user?.first_name, row?.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        row?.user?.email ||
        (row ? `User #${row.user_id}` : 'No user')
    );
}

function summaryName(summary?: SelectedUserSummary) {
    return (
        [summary?.user?.first_name, summary?.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        summary?.user?.email ||
        (summary ? `User #${summary.user_id}` : 'No selected user')
    );
}

function formatValue(value?: string | number | null, unit = '') {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return `${value}${unit ? ` ${unit}` : ''}`;
}

function formatDate(value?: string | null) {
    if (!value) return 'Not available';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function toInputValue(value: unknown) {
    return value === null || value === undefined ? '' : String(value);
}

function numberOrNull(value: unknown) {
    const stringValue = String(value ?? '').trim();
    return stringValue === '' ? null : Number(stringValue);
}

function buildPayload(row: Measurement, reason: string) {
    return {
        user_id: row.user_id === '' ? null : Number(row.user_id),
        measured_at: row.measured_at,
        weight_kg: numberOrNull(row.weight_kg),
        height_cm: numberOrNull(row.height_cm),
        body_fat_pct: numberOrNull(row.body_fat_pct),
        neck_cm: numberOrNull(row.neck_cm),
        chest_cm: numberOrNull(row.chest_cm),
        waist_cm: numberOrNull(row.waist_cm),
        hip_cm: numberOrNull(row.hip_cm),
        arm_cm: numberOrNull(row.arm_cm),
        thigh_cm: numberOrNull(row.thigh_cm),
        calf_cm: numberOrNull(row.calf_cm),
        resting_hr: numberOrNull(row.resting_hr),
        systolic_bp: numberOrNull(row.systolic_bp),
        diastolic_bp: numberOrNull(row.diastolic_bp),
        notes: row.notes || null,
        reason: reason || null,
    };
}

function metricConfig(type?: string | null) {
    return (
        metricOptions.find((option) => option.value === type) ??
        metricOptions[0]
    );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
    const chartPoints = points
        .map((point, index) => ({
            index,
            date: point.date,
            weight: Number(point.weight_kg),
            bodyFat: Number(point.body_fat_pct),
            waist: Number(point.waist_cm),
            manual: Boolean(point.manual_edit),
            outlier: Boolean(point.outlier),
        }))
        .filter(
            (point) =>
                Number.isFinite(point.weight) ||
                Number.isFinite(point.bodyFat) ||
                Number.isFinite(point.waist),
        );

    if (chartPoints.length < 2) {
        return (
            <AdminEmpty
                title="Not enough trend data"
                description="Select a user with at least two measurement records to review a readable trend."
            />
        );
    }

    const width = 900;
    const height = 260;
    const padding = 34;
    const values = chartPoints.flatMap((point) =>
        [point.weight, point.bodyFat, point.waist].filter(Number.isFinite),
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const xFor = (index: number) =>
        padding +
        (index / Math.max(chartPoints.length - 1, 1)) * (width - padding * 2);
    const yFor = (value: number) =>
        height - padding - ((value - min) / span) * (height - padding * 2);
    const pathFor = (key: 'weight' | 'bodyFat' | 'waist') =>
        chartPoints
            .filter((point) => Number.isFinite(point[key]))
            .map(
                (point, index) =>
                    `${index === 0 ? 'M' : 'L'} ${xFor(point.index)} ${yFor(
                        point[key],
                    )}`,
            )
            .join(' ');

    return (
        <div className="dashboard-surface-soft overflow-hidden rounded-[24px] p-4">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-72 w-full"
                preserveAspectRatio="none"
            >
                <line
                    x1={padding}
                    x2={width - padding}
                    y1={height - padding}
                    y2={height - padding}
                    stroke="currentColor"
                    className="text-border"
                />
                <path
                    d={pathFor('weight')}
                    fill="none"
                    stroke="var(--primary)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                />
                <path
                    d={pathFor('bodyFat')}
                    fill="none"
                    stroke="var(--chart-2)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                />
                <path
                    d={pathFor('waist')}
                    fill="none"
                    stroke="var(--chart-4)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                />
                {chartPoints.map((point) => (
                    <circle
                        key={`${point.date}-${point.index}`}
                        cx={xFor(point.index)}
                        cy={yFor(
                            Number.isFinite(point.weight)
                                ? point.weight
                                : Number.isFinite(point.waist)
                                  ? point.waist
                                  : point.bodyFat,
                        )}
                        r={point.outlier ? 7 : point.manual ? 5 : 4}
                        fill={
                            point.outlier
                                ? 'var(--destructive)'
                                : point.manual
                                  ? 'var(--chart-4)'
                                  : 'var(--primary)'
                        }
                    />
                ))}
            </svg>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Weight
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: 'var(--chart-2)' }}
                    />
                    Body fat
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: 'var(--chart-4)' }}
                    />
                    Waist
                </span>
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                    Outlier
                </span>
            </div>
        </div>
    );
}

function MeasurementEditor({
    row,
    reason,
    saving,
    onChange,
    onReasonChange,
    onSave,
    onDelete,
    onMarkOutlier,
}: {
    row: Measurement | null;
    reason: string;
    saving: boolean;
    onChange: (row: Measurement) => void;
    onReasonChange: (value: string) => void;
    onSave: () => void;
    onDelete: () => void;
    onMarkOutlier: () => void;
}) {
    if (!row) {
        return (
            <AdminEmpty
                title="Select a measurement"
                description="Choose a record to correct body metrics with an audit reason."
            />
        );
    }

    return (
        <div className="space-y-4">
            <AdminPanel
                title={row.id ? `Measurement #${row.id}` : 'Add measurement'}
                description="Manual admin edits are labeled in the table and audit trail."
            >
                <div className="space-y-4">
                    <StatusChipSet
                        items={[
                            {
                                value: row.manual_edit ? 'manual' : 'original',
                                label: row.manual_edit
                                    ? 'Manual edit'
                                    : 'Original record',
                            },
                            {
                                value: row.source ?? 'admin_manual',
                                label:
                                    row.source === 'user_logged'
                                        ? 'User logged'
                                        : 'Admin manual',
                            },
                            {
                                value: row.outlier_signal?.flagged
                                    ? 'warning'
                                    : 'clear',
                                label: row.outlier_signal?.flagged
                                    ? 'Outlier signal'
                                    : 'No outlier',
                            },
                        ]}
                    />
                    {row.outlier_signal?.flagged ? (
                        <AdminNotice
                            tone={
                                row.outlier_signal.severity === 'danger'
                                    ? 'danger'
                                    : 'warning'
                            }
                        >
                            {row.outlier_signal.reason}
                        </AdminNotice>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="User ID">
                            <AdminInput
                                value={String(row.user_id)}
                                onChange={(event) =>
                                    onChange({
                                        ...row,
                                        user_id:
                                            event.target.value === ''
                                                ? ''
                                                : Number(event.target.value),
                                    })
                                }
                            />
                        </AdminField>
                        <AdminField label="Measured date">
                            <AdminInput
                                type="date"
                                value={row.measured_at}
                                onChange={(event) =>
                                    onChange({
                                        ...row,
                                        measured_at: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Body metrics"
                description="Use the full form for corrections so no metric is squeezed into an unreadable card."
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {metricOptions.map((metric) => (
                        <AdminField
                            key={metric.value}
                            label={`${metric.label} (${metric.unit})`}
                        >
                            <AdminInput
                                type="number"
                                value={toInputValue(row[metric.value])}
                                onChange={(event) =>
                                    onChange({
                                        ...row,
                                        [metric.value]: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                    ))}
                </div>
            </AdminPanel>

            <AdminPanel
                title="Audit note"
                description="Corrections and destructive actions must stay readable for later investigation."
            >
                <div className="space-y-4">
                    <AdminField label="Measurement notes">
                        <AdminTextarea
                            rows={4}
                            value={row.notes ?? ''}
                            onChange={(event) =>
                                onChange({ ...row, notes: event.target.value })
                            }
                        />
                    </AdminField>
                    <AdminField label="Admin reason">
                        <AdminTextarea
                            rows={4}
                            value={reason}
                            placeholder="Explain what changed and why."
                            onChange={(event) =>
                                onReasonChange(event.target.value)
                            }
                        />
                    </AdminField>
                    {row.audit_note ? (
                        <div className="dashboard-surface-soft rounded-[20px] px-4 py-3 text-sm text-muted-foreground">
                            Last audit note: {row.audit_note}
                        </div>
                    ) : null}
                </div>
            </AdminPanel>

            <AdminStickyBar
                summary={
                    row.id
                        ? `Editing ${row.measurement_label ?? 'measurement'}`
                        : 'Creating manual measurement'
                }
            >
                <Button
                    type="button"
                    onClick={onSave}
                    disabled={saving || row.user_id === '' || !row.measured_at}
                >
                    <Pencil className="h-4 w-4" />
                    {saving
                        ? 'Saving...'
                        : row.id
                          ? 'Correct measurement'
                          : 'Add measurement'}
                </Button>
                {row.id ? (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={saving}
                            onClick={onMarkOutlier}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Mark outlier
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                            disabled={saving}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </>
                ) : null}
            </AdminStickyBar>
        </div>
    );
}

export default function AdminProgressPage() {
    const [rows, setRows] = useState<Measurement[]>([]);
    const [selected, setSelected] = useState<Measurement | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [outlierOpen, setOutlierOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [search, setSearch] = useState('');
    const [userId, setUserId] = useState('');
    const [type, setType] = useState('all');
    const [outlier, setOutlier] = useState('all');
    const [source, setSource] = useState('all');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);
    const [trend, setTrend] = useState<TrendPoint[]>([]);
    const [summary, setSummary] = useState<SelectedUserSummary>(null);
    const [stats, setStats] = useState({
        total_records: 0,
        manual_edits: 0,
        outliers: 0,
        users_with_records: 0,
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: '30',
            });

            if (search.trim()) params.set('search', search.trim());
            if (userId.trim()) params.set('user_id', userId.trim());
            if (type !== 'all') params.set('type', type);
            if (outlier !== 'all') params.set('outlier', outlier);
            if (source !== 'all') params.set('source', source);

            const response = await fetch(
                `/api/admin/progress?${params.toString()}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Could not load progress records.');
            }

            const json = (await response.json()) as ProgressResponse;
            const nextRows = Array.isArray(json.data) ? json.data : [];

            setRows(nextRows);
            setStats({
                total_records: Number(json.stats?.total_records ?? 0),
                manual_edits: Number(json.stats?.manual_edits ?? 0),
                outliers: Number(json.stats?.outliers ?? 0),
                users_with_records: Number(json.stats?.users_with_records ?? 0),
            });
            setSummary(json.selected_user_summary ?? null);
            setTrend(Array.isArray(json.trend) ? json.trend : []);
            setTotal(Number(json.total ?? 0));
            setCurrentPage(Number(json.current_page ?? 1));
            setLastPage(Number(json.last_page ?? 1));
            setFrom(json.from ?? null);
            setTo(json.to ?? null);
            setSelected((current) => {
                if (current?.id === null) return current;
                if (!current) return nextRows[0] ?? null;

                return (
                    nextRows.find((row) => row.id === current.id) ??
                    nextRows[0] ??
                    null
                );
            });
        } catch (loadError) {
            setRows([]);
            setSelected(null);
            setTrend([]);
            setSummary(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load progress records.',
            );
        } finally {
            setLoading(false);
        }
    }, [currentPage, outlier, search, source, type, userId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setCurrentPage(1);
    }, [outlier, search, source, type, userId]);

    const selectedMetric = metricConfig(selected?.measurement_type);
    const filterChips = useMemo(
        () =>
            [
                userId ? { value: 'user', label: `User #${userId}` } : null,
                type !== 'all'
                    ? { value: 'type', label: metricConfig(type).label }
                    : null,
                outlier !== 'all'
                    ? { value: outlier, label: outlier }
                    : null,
                source !== 'all' ? { value: source, label: source } : null,
            ].filter(Boolean) as Array<{ value: string; label: string }>,
        [outlier, source, type, userId],
    );

    async function save() {
        if (!selected) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                selected.id === null
                    ? '/api/admin/progress'
                    : `/api/admin/progress/${selected.id}`,
                jsonRequestInit(
                    selected.id === null ? 'POST' : 'PUT',
                    buildPayload(selected, reason),
                ),
            );

            if (!response.ok) {
                const json = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(
                    json?.message || 'Could not save this measurement.',
                );
            }

            setSuccess(
                selected.id === null
                    ? 'Manual measurement added.'
                    : 'Measurement corrected.',
            );
            setReason('');
            await load();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save this measurement.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function remove(deleteReason: string) {
        if (!selected?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/progress/${selected.id}`,
                jsonRequestInit('DELETE', { reason: deleteReason }),
            );

            if (!response.ok) {
                throw new Error('Could not delete this measurement.');
            }

            setDeleteOpen(false);
            setSuccess('Measurement deleted.');
            await load();
        } catch (removeError) {
            setError(
                removeError instanceof Error
                    ? removeError.message
                    : 'Could not delete this measurement.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function markOutlier(outlierReason: string) {
        if (!selected?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/progress/${selected.id}/outlier`,
                jsonRequestInit('POST', {
                    metric:
                        selected.outlier_signal?.metric ||
                        selected.measurement_type ||
                        'weight_kg',
                    reason: outlierReason,
                }),
            );

            if (!response.ok) {
                const json = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(json?.message || 'Could not mark outlier.');
            }

            setOutlierOpen(false);
            setSuccess('Measurement marked as an outlier.');
            await load();
        } catch (markError) {
            setError(
                markError instanceof Error
                    ? markError.message
                    : 'Could not mark outlier.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Progress" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Progress Records"
                    description="Review and correct body metrics while keeping trend quality, source labels, and audit reasons visible."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Records"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.total_records)
                                }
                                tone="accent"
                                helper="Measurements in the active scope."
                            />
                            <AdminStatCard
                                label="Users"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.users_with_records)
                                }
                                helper="Users with progress records."
                            />
                            <AdminStatCard
                                label="Manual edits"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.manual_edits)
                                }
                                helper="Admin-created or corrected records."
                            />
                            <AdminStatCard
                                label="Outliers"
                                value={loading ? '...' : String(stats.outliers)}
                                helper="Suspicious values or manual flags."
                            />
                        </AdminStatsGrid>

                        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Data Quality Guidance"
                            description="Filter to a user, review the trend full-width, then correct individual records with an audit reason."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminPanel
                                    title="Trends before edits"
                                    description="Outlier decisions should use nearby measurements, not a single table cell."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        The chart stays full-width so weight,
                                        body-fat, waist, manual edits, and
                                        outlier markers remain readable.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Manual labels"
                                    description="Admin-created and corrected records are visibly labeled in the table."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Manual edits are operational context and
                                        should not look like raw user-entered
                                        measurements.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Diagnostics"
                                    description="Audit metadata stays summarized here, with deeper logs available separately."
                                >
                                    <Button asChild type="button" variant="outline">
                                        <Link href="/admin/logs">Open audit logs</Link>
                                    </Button>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filters"
                            description="Long records stay inside the table scroll while filters keep the review queue manageable."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField label="Search" className="xl:flex-1">
                                        <AdminSearchInput
                                            value={search}
                                            placeholder="Search user or audit note"
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                        />
                                    </AdminField>
                                    <AdminField label="User ID" className="sm:w-40">
                                        <AdminInput
                                            value={userId}
                                            placeholder="148"
                                            onChange={(event) =>
                                                setUserId(event.target.value)
                                            }
                                        />
                                    </AdminField>
                                    <AdminField label="Metric" className="sm:w-48">
                                        <AdminNativeSelect
                                            value={type}
                                            onChange={(event) =>
                                                setType(event.target.value)
                                            }
                                        >
                                            <option value="all">All metrics</option>
                                            {metricOptions.map((metric) => (
                                                <option
                                                    key={metric.value}
                                                    value={metric.value}
                                                >
                                                    {metric.label}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Outlier" className="sm:w-44">
                                        <AdminNativeSelect
                                            value={outlier}
                                            onChange={(event) =>
                                                setOutlier(event.target.value)
                                            }
                                        >
                                            <option value="all">All records</option>
                                            <option value="flagged">Flagged</option>
                                            <option value="clear">Clear</option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Source" className="sm:w-48">
                                        <AdminNativeSelect
                                            value={source}
                                            onChange={(event) =>
                                                setSource(event.target.value)
                                            }
                                        >
                                            <option value="all">All sources</option>
                                            <option value="user_logged">
                                                User logged
                                            </option>
                                            <option value="admin_manual">
                                                Admin manual
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>
                                <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={loading}
                                        onClick={() => void load()}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Refresh
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setSelected({
                                                ...EMPTY_MEASUREMENT,
                                                user_id: userId
                                                    ? Number(userId)
                                                    : '',
                                            });
                                            setReason('');
                                            setDrawerOpen(true);
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add measurement
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                            {filterChips.length > 0 ? (
                                <StatusChipSet
                                    className="mt-3"
                                    items={filterChips}
                                />
                            ) : null}
                        </AdminSection>

                        <AdminSection
                            title="Selected User Summary"
                            description="This summary follows the active user filter or the first user in the current result set."
                        >
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <AdminPanel
                                    title={summaryName(summary)}
                                    description={
                                        summary?.user?.email ||
                                        'Filter by user ID for a focused summary.'
                                    }
                                >
                                    <div className="text-2xl font-semibold tracking-tight text-foreground">
                                        {summary?.record_count ?? 0}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        records
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Latest weight"
                                    description={formatDate(summary?.latest_date)}
                                >
                                    <div className="text-2xl font-semibold tracking-tight text-foreground">
                                        {formatValue(
                                            summary?.latest_weight_kg,
                                            'kg',
                                        )}
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Latest body fat"
                                    description="Most recent composition value"
                                >
                                    <div className="text-2xl font-semibold tracking-tight text-foreground">
                                        {formatValue(
                                            summary?.latest_body_fat_pct,
                                            '%',
                                        )}
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Quality signals"
                                    description="Manual edits and outlier flags"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">
                                            {summary?.manual_edit_count ?? 0}{' '}
                                            manual
                                        </Badge>
                                        <Badge variant="outline">
                                            {summary?.outlier_count ?? 0}{' '}
                                            outliers
                                        </Badge>
                                    </div>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Trend Chart"
                            description="Full-width trend view for weight, body fat, and waist. Manual edits and outliers are marked on the line."
                        >
                            <TrendChart points={trend} />
                        </AdminSection>

                        <AdminSection
                            title="Records Table"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} records.`
                                    : 'Select a record to open the edit drawer.'
                            }
                        >
                            {loading && rows.length === 0 ? (
                                <AdminEmpty
                                    title="Loading progress records"
                                    description="Fetching measurements, trend context, outlier signals, and audit summaries."
                                />
                            ) : (
                                <AdminScrollArea maxHeightClassName="max-h-[64vh]">
                                    <AdminDataTable tableClassName="min-w-[1120px]">
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    User
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Measurement
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Date
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Outlier
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Source
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Edited by
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Audit note
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell className="w-32">
                                                    Actions
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {rows.map((row) => {
                                                const metric = metricConfig(
                                                    row.measurement_type,
                                                );

                                                return (
                                                    <ProductTableRow
                                                        key={row.id}
                                                        interactive
                                                        className={
                                                            row.id === selected?.id
                                                                ? 'bg-primary/5'
                                                                : undefined
                                                        }
                                                    >
                                                        <ProductTableCell>
                                                            <button
                                                                type="button"
                                                                className="w-full text-left"
                                                                onClick={() => {
                                                                    setSelected({
                                                                        ...row,
                                                                    });
                                                                    setReason('');
                                                                    setDrawerOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                            >
                                                                <div className="font-medium text-foreground">
                                                                    {personName(
                                                                        row,
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {row.user?.email ||
                                                                        `User #${row.user_id}`}
                                                                </div>
                                                            </button>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="font-medium text-foreground">
                                                                {row.measurement_label ||
                                                                    metric.label}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {formatValue(
                                                                    row.measurement_value,
                                                                    row.measurement_unit ||
                                                                        metric.unit,
                                                                )}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            {formatDate(
                                                                row.measured_at,
                                                            )}
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="space-y-1">
                                                                <StatusChipSet
                                                                    items={[
                                                                        {
                                                                            value: row
                                                                                .outlier_signal
                                                                                ?.flagged
                                                                                ? 'warning'
                                                                                : 'clear',
                                                                            label: row
                                                                                .outlier_signal
                                                                                ?.flagged
                                                                                ? 'Flagged'
                                                                                : 'Clear',
                                                                        },
                                                                    ]}
                                                                />
                                                                <div className="line-clamp-1 max-w-56 text-xs text-muted-foreground">
                                                                    {row
                                                                        .outlier_signal
                                                                        ?.reason ||
                                                                        'No signal'}
                                                                </div>
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <StatusChipSet
                                                                items={[
                                                                    {
                                                                        value:
                                                                            row.source ??
                                                                            'user_logged',
                                                                        label:
                                                                            row.source ===
                                                                            'admin_manual'
                                                                                ? 'Admin manual'
                                                                                : 'User logged',
                                                                    },
                                                                    row.manual_edit
                                                                        ? {
                                                                              value: 'manual',
                                                                              label: 'Manual edit',
                                                                          }
                                                                        : {
                                                                              value: '',
                                                                              label: '',
                                                                          },
                                                                ]}
                                                            />
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="text-sm text-foreground">
                                                                {row.edited_by
                                                                    ?.name ||
                                                                    'Not edited'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {row.edited_by
                                                                    ?.email ||
                                                                    'Original record'}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="line-clamp-2 max-w-60 text-sm text-muted-foreground">
                                                                {row.audit_note ||
                                                                    row.notes ||
                                                                    'No audit note'}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSelected({
                                                                        ...row,
                                                                    });
                                                                    setReason('');
                                                                    setDrawerOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                        </ProductTableCell>
                                                    </ProductTableRow>
                                                );
                                            })}
                                            {!loading && rows.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={8}
                                                    title="No progress records found"
                                                    description="Adjust filters or add a manual measurement."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </AdminDataTable>
                                </AdminScrollArea>
                            )}

                            <AdminPagination
                                currentPage={currentPage}
                                lastPage={lastPage}
                                disabled={loading}
                                summary={
                                    from && to
                                        ? `Showing ${from}-${to} of ${total} records`
                                        : 'Pagination follows active progress filters.'
                                }
                                onPrevious={() =>
                                    setCurrentPage((page) =>
                                        Math.max(1, page - 1),
                                    )
                                }
                                onNext={() =>
                                    setCurrentPage((page) =>
                                        Math.min(lastPage, page + 1),
                                    )
                                }
                            />
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={
                    selected?.id
                        ? `${selectedMetric.label} correction`
                        : 'Add measurement'
                }
                description="Correct body metrics with a readable admin reason."
            >
                <MeasurementEditor
                    row={selected}
                    reason={reason}
                    saving={saving}
                    onChange={setSelected}
                    onReasonChange={setReason}
                    onSave={() => void save()}
                    onDelete={() => setDeleteOpen(true)}
                    onMarkOutlier={() => setOutlierOpen(true)}
                />
            </EntityDetailDrawer>

            <ConfirmActionDialogWithReason
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete measurement"
                description="This removes the measurement and records the reason in the admin audit trail."
                confirmLabel="Delete measurement"
                busy={saving}
                onConfirm={(deleteReason) => void remove(deleteReason)}
            />

            <ConfirmActionDialogWithReason
                open={outlierOpen}
                onOpenChange={setOutlierOpen}
                title="Mark measurement as outlier"
                description="This keeps the measurement but adds a visible admin outlier signal for future reviews."
                confirmLabel="Mark outlier"
                confirmVariant="default"
                busy={saving}
                onConfirm={(outlierReason) => void markOutlier(outlierReason)}
            />
        </>
    );
}
