import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import { ProductBanner, ProductEmptyState } from '@/components/product/page';
import {
    ProductTable,
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Measurement = {
    id: number | null;
    user_id: number | '';
    measured_at: string;
    weight_kg?: string | null;
    body_fat_pct?: string | null;
    waist_cm?: string | null;
    notes?: string | null;
    user?: {
        id: number;
        email: string;
        first_name?: string;
        last_name?: string;
    };
};

const EMPTY_MEASUREMENT: Measurement = {
    id: null,
    user_id: '',
    measured_at: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    body_fat_pct: '',
    waist_cm: '',
    notes: '',
};

export default function AdminProgressPage() {
    const [userId, setUserId] = useState('');
    const [rows, setRows] = useState<Measurement[]>([]);
    const [selected, setSelected] = useState<Measurement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
            const res = await fetch(`/api/admin/progress${qs}`, {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Could not load progress logs.');
            }

            const json = await res.json();
            const nextRows = Array.isArray(json?.data) ? json.data : [];
            setRows(nextRows);
            setSelected((current) =>
                current && current.id === null
                    ? current
                    : current &&
                        nextRows.some(
                            (row: Measurement) => row.id === current.id,
                        )
                      ? (nextRows.find(
                            (row: Measurement) => row.id === current.id,
                        ) ?? null)
                      : (nextRows[0] ?? null),
            );
        } catch (loadError) {
            setRows([]);
            setSelected(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load progress logs.',
            );
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void load();
    }, [load]);

    const summary = useMemo(
        () => ({
            withWeight: rows.filter((row) => row.weight_kg).length,
            withBodyFat: rows.filter((row) => row.body_fat_pct).length,
        }),
        [rows],
    );

    async function save() {
        if (!selected) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        const payload = {
            user_id: selected.user_id === '' ? null : Number(selected.user_id),
            measured_at: selected.measured_at,
            weight_kg:
                selected.weight_kg === '' ? null : Number(selected.weight_kg),
            body_fat_pct:
                selected.body_fat_pct === ''
                    ? null
                    : Number(selected.body_fat_pct),
            waist_cm:
                selected.waist_cm === '' ? null : Number(selected.waist_cm),
            notes: selected.notes || null,
        };

        try {
            const response = await fetch(
                selected.id === null
                    ? '/api/admin/progress'
                    : `/api/admin/progress/${selected.id}`,
                jsonRequestInit(selected.id === null ? 'POST' : 'PUT', payload),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save this progress entry.',
                );
            }

            setSuccess(
                selected.id === null
                    ? 'Progress entry created.'
                    : 'Progress entry updated.',
            );
            await load();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save this progress entry.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!selected?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/progress/${selected.id}`,
                jsonRequestInit('DELETE'),
            );

            if (!response.ok) {
                throw new Error('Could not delete this progress entry.');
            }

            setSuccess('Progress entry removed.');
            await load();
        } catch (removeError) {
            setError(
                removeError instanceof Error
                    ? removeError.message
                    : 'Could not delete this progress entry.',
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
                    title="Progress logs"
                    description="Review measurement records with clearer filtering and editing so trend data stays trustworthy."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                value={userId}
                                onChange={(event) =>
                                    setUserId(event.target.value)
                                }
                                placeholder="Filter by user ID"
                                className="h-10 w-44 rounded-full"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void load()}
                                disabled={loading}
                            >
                                <RefreshCcw className="h-4 w-4" />
                                {loading ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    setSelected({
                                        ...EMPTY_MEASUREMENT,
                                        user_id: userId ? Number(userId) : '',
                                    });
                                    setSuccess(null);
                                    setError(null);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Add entry
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible entries"
                                value={loading ? '...' : String(rows.length)}
                                tone="accent"
                                helper="Current filter applied."
                            />
                            <AdminStatCard
                                label="With weight"
                                value={
                                    loading ? '...' : String(summary.withWeight)
                                }
                                helper="Entries that include a weight value."
                            />
                            <AdminStatCard
                                label="With body fat"
                                value={
                                    loading
                                        ? '...'
                                        : String(summary.withBodyFat)
                                }
                                helper="Useful for composition tracking."
                            />
                        </AdminStatsGrid>

                        {error ? (
                            <ProductBanner tone="danger">{error}</ProductBanner>
                        ) : null}
                        {success ? (
                            <ProductBanner tone="success">
                                {success}
                            </ProductBanner>
                        ) : null}

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
                            <AdminSection
                                title="Recent measurements"
                                description="Select a measurement to inspect or correct it."
                            >
                                {loading ? (
                                    <ProductEmptyState
                                        title="Loading progress logs"
                                        description="Fetching the latest measurements for the selected filter."
                                    />
                                ) : (
                                    <ProductTable>
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    User
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Date
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Metrics
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {rows.map((row) => (
                                                <ProductTableRow
                                                    key={
                                                        row.id ??
                                                        `${row.user_id}-${row.measured_at}`
                                                    }
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
                                                            onClick={() =>
                                                                setSelected({
                                                                    ...row,
                                                                })
                                                            }
                                                            className="w-full text-left"
                                                        >
                                                            {[
                                                                row.user
                                                                    ?.first_name,
                                                                row.user
                                                                    ?.last_name,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' ') ||
                                                                row.user
                                                                    ?.email ||
                                                                `User #${row.user_id}`}
                                                        </button>
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {row.measured_at}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        Weight{' '}
                                                        {row.weight_kg || '-'} •
                                                        Body fat{' '}
                                                        {row.body_fat_pct ||
                                                            '-'}
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}
                                            {rows.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={3}
                                                    title="No progress entries found"
                                                    description="Try another user filter or create a new measurement."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </ProductTable>
                                )}
                            </AdminSection>

                            <AdminSection
                                title={
                                    selected?.id === null
                                        ? 'Create entry'
                                        : 'Edit entry'
                                }
                                description="Keep logged values structured so profile charts stay reliable."
                            >
                                {!selected ? (
                                    <ProductEmptyState
                                        title="Select or create an entry"
                                        description="Choose a row from the table or create a new measurement."
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <Field
                                            label="User ID"
                                            value={String(selected.user_id)}
                                            onChange={(value) =>
                                                setSelected({
                                                    ...selected,
                                                    user_id:
                                                        value === ''
                                                            ? ''
                                                            : Number(value),
                                                })
                                            }
                                        />
                                        <label className="space-y-2">
                                            <Label>Date</Label>
                                            <Input
                                                type="date"
                                                value={selected.measured_at}
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        measured_at:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <Field
                                                label="Weight (kg)"
                                                value={selected.weight_kg ?? ''}
                                                onChange={(value) =>
                                                    setSelected({
                                                        ...selected,
                                                        weight_kg: value,
                                                    })
                                                }
                                            />
                                            <Field
                                                label="Body fat (%)"
                                                value={
                                                    selected.body_fat_pct ?? ''
                                                }
                                                onChange={(value) =>
                                                    setSelected({
                                                        ...selected,
                                                        body_fat_pct: value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <Field
                                            label="Waist (cm)"
                                            value={selected.waist_cm ?? ''}
                                            onChange={(value) =>
                                                setSelected({
                                                    ...selected,
                                                    waist_cm: value,
                                                })
                                            }
                                        />
                                        <label className="space-y-2">
                                            <Label>Notes</Label>
                                            <Textarea
                                                rows={4}
                                                value={selected.notes ?? ''}
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        notes: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                type="button"
                                                onClick={() => void save()}
                                                disabled={
                                                    saving ||
                                                    selected.user_id === '' ||
                                                    !selected.measured_at
                                                }
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </Button>
                                            {selected.id ? (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        void remove()
                                                    }
                                                    disabled={saving}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </AdminSection>
                        </div>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="space-y-2">
            <Label>{label}</Label>
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}
