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
import { Brain, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';

type AuditHistoryItem = {
    id: number;
    action: string;
    created_at?: string | null;
    admin?: {
        id: number;
        name: string;
        email: string;
    } | null;
    metadata?: Record<string, unknown> | null;
};

type MealEntry = {
    id: number;
    user_id: number;
    food_id: number;
    meal_type: MealType;
    servings: string;
    eaten_at: string;
    source: 'manual' | 'planner';
    nutrition_plan_item_id?: number | null;
    user?: {
        id: number;
        email: string;
        first_name?: string | null;
        last_name?: string | null;
    } | null;
    food?: {
        id: number;
        name: string;
        category?: string | null;
        serving_unit?: string | null;
    } | null;
    macros: {
        calories?: number | null;
        protein_g?: number | null;
        carbs_g?: number | null;
        fat_g?: number | null;
    };
    original_values: Record<string, unknown>;
    edited_values: Record<string, unknown>;
    last_edited_by?: {
        id: number;
        name: string;
        email: string;
    } | null;
    last_audit_action?: string | null;
    last_audit_at?: string | null;
    audit_note?: string | null;
    audit_metadata?: Record<string, unknown> | null;
    audit_history: AuditHistoryItem[];
};

type MealEntriesResponse = {
    data?: MealEntry[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    restore_supported?: boolean;
    stats?: {
        recent_logs: number;
        edited_logs: number;
        deleted_logs: number;
        missing_food_logs: number;
    };
};

function personName(entry?: MealEntry | null) {
    return (
        [entry?.user?.first_name, entry?.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        entry?.user?.email ||
        (entry ? `User #${entry.user_id}` : 'No user')
    );
}

function formatDate(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function formatDateTime(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatMacro(value?: number | null, suffix = 'g') {
    return value === null || value === undefined ? '-' : `${value}${suffix}`;
}

function formatAction(value?: string | null) {
    return (value || 'not edited')
        .replace(/^admin\./, '')
        .replace(/_/g, ' ')
        .replace(/\./g, ' / ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stringifyValue(value: unknown) {
    if (value === null || value === undefined || value === '') {
        return 'Not set';
    }

    return String(value);
}

function CorrectionDrawer({
    entry,
    draft,
    reason,
    expandedAudit,
    restoreSupported,
    saving,
    onDraftChange,
    onReasonChange,
    onExpandedAuditChange,
    onSave,
    onDelete,
}: {
    entry: MealEntry | null;
    draft: MealEntry | null;
    reason: string;
    expandedAudit: boolean;
    restoreSupported: boolean;
    saving: boolean;
    onDraftChange: (entry: MealEntry) => void;
    onReasonChange: (value: string) => void;
    onExpandedAuditChange: (value: boolean) => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    if (!entry || !draft) {
        return (
            <AdminEmpty
                title="Select a meal log"
                description="Choose a row to correct servings, meal type, date, and audit reason."
            />
        );
    }

    return (
        <div className="space-y-4">
            <AdminPanel
                title={entry.food?.name || `Food #${entry.food_id}`}
                description="Corrections here update AI coach context. Keep the reason specific and readable."
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <StatusChipSet
                            items={[
                                { value: entry.meal_type },
                                { value: entry.source, label: entry.source },
                                {
                                    value: entry.last_audit_action
                                        ? 'edited'
                                        : 'original',
                                    label: entry.last_audit_action
                                        ? 'Edited'
                                        : 'Original',
                                },
                            ]}
                        />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="dashboard-surface-soft rounded-[20px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                User
                            </div>
                            <div className="mt-2 font-semibold text-foreground">
                                {personName(entry)}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {entry.user?.email}
                            </div>
                        </div>
                        <div className="dashboard-surface-soft rounded-[20px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Macro impact
                            </div>
                            <div className="mt-2 font-semibold text-foreground">
                                {formatMacro(entry.macros.calories, ' kcal')}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                P {formatMacro(entry.macros.protein_g)} · C{' '}
                                {formatMacro(entry.macros.carbs_g)} · F{' '}
                                {formatMacro(entry.macros.fat_g)}
                            </div>
                        </div>
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Original vs edited values"
                description="Original values come from the latest correction audit when available; edited values show the current saved row."
            >
                <div className="grid gap-3 md:grid-cols-3">
                    {['meal_type', 'servings', 'eaten_at'].map((key) => (
                        <div
                            key={key}
                            className="dashboard-surface-soft rounded-[18px] px-3 py-3"
                        >
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Original
                            </div>
                            <div className="font-medium text-foreground">
                                {stringifyValue(entry.original_values[key])}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Edited
                            </div>
                            <div className="font-medium text-foreground">
                                {stringifyValue(entry.edited_values[key])}
                            </div>
                        </div>
                    ))}
                </div>
            </AdminPanel>

            <AdminPanel
                title="Correction"
                description="Changing meal history changes coach memory and day macro summaries."
            >
                <div className="grid gap-4 md:grid-cols-3">
                    <AdminField label="Meal type">
                        <AdminNativeSelect
                            value={draft.meal_type}
                            onChange={(event) =>
                                onDraftChange({
                                    ...draft,
                                    meal_type: event.target.value as MealType,
                                })
                            }
                        >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                            <option value="drink">Drink</option>
                        </AdminNativeSelect>
                    </AdminField>
                    <AdminField label="Servings">
                        <AdminInput
                            type="number"
                            value={draft.servings}
                            onChange={(event) =>
                                onDraftChange({
                                    ...draft,
                                    servings: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Date">
                        <AdminInput
                            type="date"
                            value={draft.eaten_at}
                            onChange={(event) =>
                                onDraftChange({
                                    ...draft,
                                    eaten_at: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                </div>

                <div className="mt-4">
                    <AdminField label="Admin reason">
                        <AdminTextarea
                            rows={4}
                            value={reason}
                            onChange={(event) =>
                                onReasonChange(event.target.value)
                            }
                            placeholder="Explain what was corrected and why."
                        />
                    </AdminField>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Readable audit"
                description="Expandable metadata mirrors the admin audit log without dumping raw logs into the table."
            >
                <div className="space-y-3">
                    <div className="dashboard-surface-soft rounded-[18px] px-4 py-3">
                        <div className="font-medium text-foreground">
                            {formatAction(entry.last_audit_action)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {entry.last_edited_by
                                ? `${entry.last_edited_by.name} · ${formatDateTime(entry.last_audit_at)}`
                                : 'No admin correction recorded yet.'}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            {entry.audit_note || 'No audit note recorded.'}
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onExpandedAuditChange(!expandedAudit)}
                    >
                        {expandedAudit ? 'Hide metadata' : 'Expand metadata'}
                    </Button>

                    {expandedAudit ? (
                        <AdminScrollArea maxHeightClassName="max-h-64">
                            <div className="space-y-2">
                                {entry.audit_history.map((log) => (
                                    <div
                                        key={log.id}
                                        className="dashboard-surface-soft rounded-[16px] px-3 py-3 text-sm"
                                    >
                                        <div className="font-medium text-foreground">
                                            {formatAction(log.action)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {log.admin?.name || 'Admin'} ·{' '}
                                            {formatDateTime(log.created_at)}
                                        </div>
                                        <pre className="mt-2 overflow-auto rounded-xl bg-muted/50 p-2 text-xs whitespace-pre-wrap text-muted-foreground">
                                            {JSON.stringify(
                                                log.metadata ?? {},
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </div>
                                ))}
                                {entry.audit_history.length === 0 ? (
                                    <AdminEmpty
                                        title="No audit metadata"
                                        description="This log has not been edited by an admin yet."
                                    />
                                ) : null}
                            </div>
                        </AdminScrollArea>
                    ) : null}
                </div>
            </AdminPanel>

            <AdminStickyBar summary={`Meal log #${entry.id}`}>
                <Button
                    type="button"
                    onClick={onSave}
                    disabled={saving || reason.trim() === ''}
                >
                    Correct log
                </Button>
                <Button asChild type="button" variant="outline">
                    <Link href={`/admin/users/${entry.user_id}`}>
                        Open user
                    </Link>
                </Button>
                <Button asChild type="button" variant="outline">
                    <Link href={`/admin/users/${entry.user_id}#ai-activity`}>
                        <Brain className="h-4 w-4" />
                        AI context
                    </Link>
                </Button>
                <Button type="button" variant="outline" disabled>
                    {restoreSupported ? 'Restore' : 'Restore unavailable'}
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
            </AdminStickyBar>
        </div>
    );
}

export default function AdminMealLogsPage() {
    const [entries, setEntries] = useState<MealEntry[]>([]);
    const [query, setQuery] = useState('');
    const [mealType, setMealType] = useState('all');
    const [date, setDate] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<MealEntry | null>(null);
    const [reason, setReason] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [expandedAudit, setExpandedAudit] = useState(false);
    const [restoreSupported, setRestoreSupported] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({
        recent_logs: 0,
        edited_logs: 0,
        deleted_logs: 0,
        missing_food_logs: 0,
    });

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: '30',
            });

            if (query.trim()) {
                params.set('search', query.trim());
            }
            if (mealType !== 'all') {
                params.set('meal_type', mealType);
            }
            if (date) {
                params.set('date', date);
            }

            const response = await fetch(
                `/api/admin/meal-entries?${params.toString()}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Could not load meal logs.');
            }

            const json = (await response.json()) as MealEntriesResponse;
            const rows = Array.isArray(json.data) ? json.data : [];

            setEntries(rows);
            setStats({
                recent_logs: Number(json.stats?.recent_logs ?? 0),
                edited_logs: Number(json.stats?.edited_logs ?? 0),
                deleted_logs: Number(json.stats?.deleted_logs ?? 0),
                missing_food_logs: Number(json.stats?.missing_food_logs ?? 0),
            });
            setRestoreSupported(Boolean(json.restore_supported));
            setTotal(Number(json.total ?? 0));
            setCurrentPage(Number(json.current_page ?? 1));
            setLastPage(Number(json.last_page ?? 1));
            setFrom(json.from ?? null);
            setTo(json.to ?? null);
            setSelectedId((current) =>
                current && rows.some((entry) => entry.id === current)
                    ? current
                    : (rows[0]?.id ?? null),
            );
        } catch (loadError) {
            setEntries([]);
            setSelectedId(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load meal logs.',
            );
        } finally {
            setLoading(false);
        }
    }, [currentPage, date, mealType, query]);

    useEffect(() => {
        void loadEntries();
    }, [loadEntries]);

    useEffect(() => {
        setCurrentPage(1);
    }, [date, mealType, query]);

    const selectedEntry = useMemo(
        () => entries.find((entry) => entry.id === selectedId) ?? null,
        [entries, selectedId],
    );

    useEffect(() => {
        setDraft(selectedEntry ? { ...selectedEntry } : null);
        setReason('');
        setExpandedAudit(false);
    }, [selectedEntry]);

    async function saveCorrection() {
        if (!draft) {
            return;
        }

        if (reason.trim() === '') {
            setError('Add an admin reason before correcting this log.');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/meal-entries/${draft.id}`,
                jsonRequestInit('PUT', {
                    meal_type: draft.meal_type,
                    servings: Number(draft.servings),
                    eaten_at: draft.eaten_at,
                    reason: reason.trim(),
                }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not correct this meal log.',
                );
            }

            setSuccess('Meal log corrected.');
            setDrawerOpen(false);
            await loadEntries();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not correct this meal log.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteEntry(deleteReason: string) {
        if (!selectedEntry) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/meal-entries/${selectedEntry.id}`,
                jsonRequestInit('DELETE', { reason: deleteReason }),
            );

            if (!response.ok) {
                throw new Error('Could not delete this meal log.');
            }

            setDeleteOpen(false);
            setDrawerOpen(false);
            setSuccess('Meal log deleted.');
            await loadEntries();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Could not delete this meal log.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Meal Logs" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Meal Logs"
                    description="Correct user meal history with clear before/after accountability so coach context stays trustworthy."
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void loadEntries()}
                            disabled={loading}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Recent logs"
                                value={
                                    loading ? '...' : String(stats.recent_logs)
                                }
                                tone="accent"
                                helper="Total meal-entry records."
                            />
                            <AdminStatCard
                                label="Edited logs"
                                value={
                                    loading ? '...' : String(stats.edited_logs)
                                }
                                helper="Corrections recorded in admin audit logs."
                            />
                            <AdminStatCard
                                label="Deleted logs"
                                value={
                                    loading ? '...' : String(stats.deleted_logs)
                                }
                                helper="Hard-deleted logs captured by audit trail."
                            />
                            <AdminStatCard
                                label="Missing-food logs"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.missing_food_logs)
                                }
                                helper="Entries whose catalog food cannot be loaded."
                            />
                        </AdminStatsGrid>

                        {error ? (
                            <AdminNotice tone="danger">{error}</AdminNotice>
                        ) : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Correction Guidance"
                            description="Meal history feeds daily macros, last-seven-day summaries, and AI coach answers. Keep every correction explicit and auditable."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <AdminPanel
                                    title="Before and after"
                                    description="Use the drawer to compare original audit values with the current edited row."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Original values are available after an
                                        admin correction. Unedited logs show
                                        current values as the baseline.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Accountability"
                                    description="Admin reason is required for corrections and destructive actions."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Restore is currently unavailable because
                                        meal entries are hard-deleted. Use audit
                                        logs for deletion rationale.
                                    </div>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filters"
                            description="Long histories stay inside the table scroll area while filters keep the queue narrow."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField
                                        label="Search"
                                        className="xl:flex-1"
                                    >
                                        <AdminInput
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Search user or food"
                                        />
                                    </AdminField>
                                    <AdminField
                                        label="Meal type"
                                        className="sm:w-48"
                                    >
                                        <AdminNativeSelect
                                            value={mealType}
                                            onChange={(event) =>
                                                setMealType(event.target.value)
                                            }
                                        >
                                            <option value="all">
                                                All meals
                                            </option>
                                            <option value="breakfast">
                                                Breakfast
                                            </option>
                                            <option value="lunch">Lunch</option>
                                            <option value="dinner">
                                                Dinner
                                            </option>
                                            <option value="snack">Snack</option>
                                            <option value="drink">Drink</option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField
                                        label="Date"
                                        className="sm:w-48"
                                    >
                                        <AdminInput
                                            type="date"
                                            value={date}
                                            onChange={(event) =>
                                                setDate(event.target.value)
                                            }
                                        />
                                    </AdminField>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                        </AdminSection>

                        <AdminSection
                            title="Meal Log Table"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} meal logs.`
                                    : 'Select a row to open the correction drawer.'
                            }
                        >
                            {loading && entries.length === 0 ? (
                                <AdminEmpty
                                    title="Loading meal logs"
                                    description="Fetching user meal history and audit summaries."
                                />
                            ) : (
                                <AdminScrollArea maxHeightClassName="max-h-[68vh]">
                                    <AdminDataTable tableClassName="min-w-[1120px]">
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    User
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Date / meal
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Food items
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Servings
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Calories / macros
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Source
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Last edited by
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Audit note
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell className="w-36">
                                                    Actions
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {entries.map((entry) => (
                                                <ProductTableRow
                                                    key={entry.id}
                                                    interactive
                                                    className={
                                                        selectedId === entry.id
                                                            ? 'bg-primary/5'
                                                            : undefined
                                                    }
                                                >
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {personName(entry)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {entry.user?.email}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {formatDate(
                                                                entry.eaten_at,
                                                            )}
                                                        </div>
                                                        <Badge variant="outline">
                                                            {entry.meal_type}
                                                        </Badge>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {entry.food?.name ||
                                                                `Food #${entry.food_id}`}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {entry.food
                                                                ?.category ||
                                                                'No category'}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {entry.servings}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {formatMacro(
                                                                entry.macros
                                                                    .calories,
                                                                ' kcal',
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            P{' '}
                                                            {formatMacro(
                                                                entry.macros
                                                                    .protein_g,
                                                            )}{' '}
                                                            · C{' '}
                                                            {formatMacro(
                                                                entry.macros
                                                                    .carbs_g,
                                                            )}{' '}
                                                            · F{' '}
                                                            {formatMacro(
                                                                entry.macros
                                                                    .fat_g,
                                                            )}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <StatusChipSet
                                                            items={[
                                                                {
                                                                    value: entry.source,
                                                                    label: entry.source,
                                                                },
                                                            ]}
                                                        />
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="text-sm text-foreground">
                                                            {entry
                                                                .last_edited_by
                                                                ?.name ||
                                                                'Not edited'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDateTime(
                                                                entry.last_audit_at,
                                                            )}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="line-clamp-2 max-w-56 text-sm text-muted-foreground">
                                                            {entry.audit_note ||
                                                                'No audit note'}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedId(
                                                                    entry.id,
                                                                );
                                                                setDrawerOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            Correct
                                                        </Button>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}

                                            {!loading &&
                                            entries.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={9}
                                                    title="No meal logs found"
                                                    description="Adjust filters or return when users have meal history."
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
                                        ? `Showing ${from}-${to} of ${total} logs`
                                        : 'Pagination follows active meal filters.'
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
                    selectedEntry?.food?.name ||
                    (selectedEntry
                        ? `Meal log #${selectedEntry.id}`
                        : 'Meal log')
                }
                description="Correct user meal history with a readable audit reason."
            >
                <CorrectionDrawer
                    entry={selectedEntry}
                    draft={draft}
                    reason={reason}
                    expandedAudit={expandedAudit}
                    restoreSupported={restoreSupported}
                    saving={saving}
                    onDraftChange={setDraft}
                    onReasonChange={setReason}
                    onExpandedAuditChange={setExpandedAudit}
                    onSave={() => void saveCorrection()}
                    onDelete={() => setDeleteOpen(true)}
                />
            </EntityDetailDrawer>

            <ConfirmActionDialogWithReason
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete meal log"
                description="This removes the meal entry and records the reason in the admin audit trail. Restore is not currently supported."
                confirmLabel="Delete log"
                busy={saving}
                onConfirm={(deleteReason) => void deleteEntry(deleteReason)}
            />
        </>
    );
}
