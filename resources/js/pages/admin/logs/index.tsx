import {
    AdminDataTable,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import { EntityDetailDrawer, StatusChipSet } from '@/components/admin/admin-workflows';
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
import { Head, Link } from '@inertiajs/react';
import { ClipboardCheck, ExternalLink, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MetadataValue =
    | string
    | number
    | boolean
    | null
    | MetadataValue[]
    | { [key: string]: MetadataValue };

type AdminActionLog = {
    id: number;
    action: string;
    admin_id: number | null;
    target_type: string | null;
    target_id: number | null;
    metadata?: Record<string, MetadataValue> | null;
    created_at?: string | null;
    admin?: {
        id: number;
        first_name?: string | null;
        last_name?: string | null;
        name?: string | null;
        email?: string | null;
    } | null;
};

type AdminActionLogResponse = {
    data?: AdminActionLog[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
};

function formatAdminName(log: AdminActionLog) {
    return (
        [log.admin?.first_name, log.admin?.last_name]
            .filter(Boolean)
            .join(' ') ||
        log.admin?.name ||
        log.admin?.email ||
        (log.admin_id ? `Admin #${log.admin_id}` : 'System')
    );
}

function formatDateTime(value?: string | null) {
    if (!value) return 'Not available';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatTargetType(value?: string | null) {
    if (!value) return 'No target';

    const normalized = value.split('\\').pop() ?? value;

    return normalized.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function startCase(value: string) {
    return value
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataString(
    metadata: Record<string, MetadataValue> | null | undefined,
    keys: string[],
) {
    if (!metadata) return null;

    for (const key of keys) {
        const value = metadata[key];
        if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        ) {
            return String(value);
        }
    }

    return null;
}

function inferTargetHref(log: AdminActionLog) {
    if (!log.target_id || !log.target_type) return null;

    if (log.target_type.endsWith('User')) return `/admin/users/${log.target_id}`;
    if (log.target_type.endsWith('Food')) return '/admin/meals';
    if (log.target_type.endsWith('MealEntry')) return '/admin/meal-logs';
    if (log.target_type.endsWith('Measurement')) return '/admin/progress';
    if (log.target_type.endsWith('PlaceLocal')) return '/admin/places';
    if (log.target_type.endsWith('ProfessionalVerification')) {
        return '/admin/professional-verifications';
    }
    if (log.target_type.endsWith('Notification')) return '/admin/notifications';
    if (log.target_type.endsWith('ProfessionalClientAssignment')) {
<<<<<<< HEAD
        return '/admin/professionals';
=======
        return '/admin/assignments';
>>>>>>> origin/main
    }

    return null;
}

function inferSeverity(log: AdminActionLog): 'critical' | 'warning' | 'info' {
    const explicit = metadataString(log.metadata, ['severity', 'level']);
    if (explicit === 'critical' || explicit === 'danger') return 'critical';
    if (explicit === 'warning' || explicit === 'warn') return 'warning';

    if (
        /delete|destroy|suspend|reject|unsafe|rollback|failed/i.test(log.action)
    ) {
        return 'warning';
    }

    return 'info';
}

function severityClassName(severity: 'critical' | 'warning' | 'info') {
    return {
        critical:
            'border-destructive/35 bg-destructive/12 text-destructive dark:text-red-200',
        warning: 'border-warning/35 bg-warning/12 text-amber-700 dark:text-amber-200',
        info: 'border-info/35 bg-info/12 text-foreground',
    }[severity];
}

function shortSummary(log: AdminActionLog) {
    const metadataSummary = metadataString(log.metadata, [
        'summary',
        'message',
        'reason',
        'note',
        'title',
    ]);

    if (metadataSummary) return metadataSummary;

    const target = log.target_type
        ? `${formatTargetType(log.target_type)}${log.target_id ? ` #${log.target_id}` : ''}`
        : 'no specific target';

    return `${startCase(log.action)} on ${target}.`;
}

function flattenMetadata(
    value: Record<string, MetadataValue> | null | undefined,
    prefix = '',
): Array<{ label: string; value: string }> {
    if (!value) return [];

    return Object.entries(value).flatMap(([key, rawValue]) => {
        const label = prefix ? `${prefix}.${key}` : key;

        if (rawValue === null || rawValue === undefined) {
            return [{ label, value: 'null' }];
        }

        if (Array.isArray(rawValue)) {
            return [
                {
                    label,
                    value: rawValue
                        .map((item) =>
                            typeof item === 'object'
                                ? JSON.stringify(item)
                                : String(item),
                        )
                        .join(', '),
                },
            ];
        }

        if (typeof rawValue === 'object') {
            return flattenMetadata(rawValue as Record<string, MetadataValue>, label);
        }

        return [{ label, value: String(rawValue) }];
    });
}

function metadataRecord(
    metadata: Record<string, MetadataValue> | null | undefined,
    key: string,
) {
    const value = metadata?.[key];
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, MetadataValue>)
        : null;
}

function AuditDiffPanel({
    title,
    values,
}: {
    title: string;
    values: Record<string, MetadataValue> | null;
}) {
    return (
        <AdminPanel title={title}>
            {values && Object.keys(values).length > 0 ? (
                <AdminScrollArea maxHeightClassName="max-h-60">
                    <div className="space-y-2">
                        {flattenMetadata(values).map((entry) => (
                            <div
                                key={`${title}-${entry.label}`}
                                className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2"
                            >
                                <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    {entry.label}
                                </div>
                                <div className="mt-1 text-sm break-words text-foreground">
                                    {entry.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </AdminScrollArea>
            ) : (
                <p className="text-sm text-muted-foreground">
                    No {title.toLowerCase()} values were stored.
                </p>
            )}
        </AdminPanel>
    );
}

function AuditDetailDrawer({
    log,
    relatedLogs,
    open,
    onOpenChange,
}: {
    log: AdminActionLog | null;
    relatedLogs: AdminActionLog[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const targetHref = log ? inferTargetHref(log) : null;
    const metadataEntries = log ? flattenMetadata(log.metadata) : [];
    const beforeValues = log ? metadataRecord(log.metadata, 'before') : null;
    const afterValues = log ? metadataRecord(log.metadata, 'after') : null;

    return (
        <EntityDetailDrawer
            open={open}
            onOpenChange={onOpenChange}
            title={log?.action ?? 'Audit log detail'}
            description={
                log
                    ? `${formatAdminName(log)} · ${formatDateTime(log.created_at)}`
                    : 'Select an audit row.'
            }
            footer={
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                </Button>
            }
        >
            {log ? (
                <div className="space-y-4">
                    <AdminPanel title="Audit summary">
                        <div className="space-y-3">
                            <StatusChipSet
                                items={[
                                    {
                                        value: inferSeverity(log),
                                        label: startCase(inferSeverity(log)),
                                    },
                                    {
                                        value: log.target_type ? 'info' : '',
                                        label: formatTargetType(log.target_type),
                                    },
                                ]}
                            />
                            <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3 text-sm leading-6 text-muted-foreground">
                                {shortSummary(log)}
                            </div>
                            {targetHref ? (
                                <Button asChild variant="outline">
                                    <Link href={targetHref}>
                                        Open affected record
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </AdminPanel>

                    <AuditDiffPanel title="Before" values={beforeValues} />
                    <AuditDiffPanel title="After" values={afterValues} />

                    <AdminPanel
                        title="Metadata"
                        description="Expandable metadata stays out of the table."
                    >
                        <details className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                Show metadata fields
                            </summary>
                            <AdminScrollArea maxHeightClassName="mt-3 max-h-72">
                                <div className="space-y-2">
                                    {metadataEntries.length > 0 ? (
                                        metadataEntries.map((entry) => (
                                            <div
                                                key={`${log.id}-${entry.label}`}
                                                className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2"
                                            >
                                                <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                    {entry.label}
                                                </div>
                                                <div className="mt-1 text-sm break-words text-foreground">
                                                    {entry.value}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No metadata was stored for this action.
                                        </p>
                                    )}
                                </div>
                            </AdminScrollArea>
                        </details>
                    </AdminPanel>

                    <AdminPanel title="Related logs">
                        <div className="space-y-2">
                            {relatedLogs.length > 0 ? (
                                relatedLogs.map((related) => (
                                    <div
                                        key={related.id}
                                        className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2"
                                    >
                                        <div className="text-sm font-medium text-foreground">
                                            {related.action}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {formatDateTime(related.created_at)} · {shortSummary(related)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No related logs in the current filtered page.
                                </p>
                            )}
                        </div>
                    </AdminPanel>
                </div>
            ) : null}
        </EntityDetailDrawer>
    );
}

export default function AdminLogsIndex() {
    const [logs, setLogs] = useState<AdminActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [targetTypeFilter, setTargetTypeFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                per_page: '30',
                page: String(currentPage),
            });

            if (search.trim()) params.set('search', search.trim());
            if (actionFilter !== 'all') params.set('action', actionFilter);
            if (targetTypeFilter !== 'all') {
                params.set('target_type', targetTypeFilter);
            }

            const res = await fetch(`/api/admin/action-logs?${params.toString()}`, {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) throw new Error('Could not load admin action logs.');

            const json = (await res.json()) as AdminActionLogResponse;
            const rows = Array.isArray(json?.data) ? json.data : [];

            setLogs(rows);
            setTotal(Number(json?.total ?? 0));
            setCurrentPage(Number(json?.current_page ?? 1));
            setLastPage(Number(json?.last_page ?? 1));
            setFrom(json?.from ?? null);
            setTo(json?.to ?? null);
        } catch (loadError) {
            setLogs([]);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load admin action logs.',
            );
        } finally {
            setLoading(false);
        }
    }, [actionFilter, currentPage, search, targetTypeFilter]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        setCurrentPage(1);
    }, [actionFilter, search, severityFilter, targetTypeFilter]);

    const visibleLogs = useMemo(
        () =>
            logs.filter(
                (log) =>
                    severityFilter === 'all' ||
                    inferSeverity(log) === severityFilter,
            ),
        [logs, severityFilter],
    );

    const selectedLog = useMemo(
        () => logs.find((log) => log.id === selectedId) ?? null,
        [logs, selectedId],
    );

    const relatedLogs = useMemo(() => {
        if (!selectedLog) return [];

        return logs
            .filter(
                (log) =>
                    log.id !== selectedLog.id &&
                    log.target_type === selectedLog.target_type &&
                    log.target_id === selectedLog.target_id,
            )
            .slice(0, 5);
    }, [logs, selectedLog]);

    const stats = useMemo(
        () => ({
            visible: visibleLogs.length,
            actors: new Set(logs.map((log) => log.admin_id).filter(Boolean)).size,
            warning: logs.filter((log) => inferSeverity(log) === 'warning').length,
            critical: logs.filter((log) => inferSeverity(log) === 'critical').length,
            metadata: logs.filter(
                (log) => log.metadata && Object.keys(log.metadata).length > 0,
            ).length,
        }),
        [logs, visibleLogs.length],
    );

    return (
        <>
            <Head title="Admin Audit Logs" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Audit Logs"
                    description="Utilitarian admin audit stream for actor, action, target, severity, device context, and record-level review without dense JSON in the table."
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void loadLogs()}
                            disabled={loading}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible actions"
                                value={loading ? '...' : stats.visible}
                                tone="accent"
                                helper="Rows matching current filters."
                            />
                            <AdminStatCard
                                label="Admin actors"
                                value={loading ? '...' : stats.actors}
                                helper="Distinct admins on the current page."
                            />
                            <AdminStatCard
                                label="Warnings"
                                value={loading ? '...' : stats.warning}
                                helper="Potentially sensitive changes."
                            />
                            <AdminStatCard
                                label="Critical"
                                value={loading ? '...' : stats.critical}
                                helper="Critical severity from metadata or action."
                            />
                            <AdminStatCard
                                label="With metadata"
                                value={loading ? '...' : stats.metadata}
                                helper="Rows with expandable audit context."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Audit guidance"
                            description="Keep the table boring and readable: scan actor, action, target, and summary first. Open the drawer for before/after values and expandable metadata."
                        >
                            <div className="rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm leading-6 text-muted-foreground">
                                {from && to
                                    ? `Showing ${from}-${to} of ${total} audit entries from the live admin action log.`
                                    : 'Filter the audit stream before inspecting metadata.'}
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Audit table"
                            description="Full-width table with readable summaries. Dense JSON stays in the detail drawer."
                        >
                            <div className="space-y-4">
                                {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField label="Search" className="min-w-[220px] flex-1">
                                            <AdminSearchInput
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                                placeholder="Search action, admin, target type, or target id"
                                            />
                                        </AdminField>
                                        <AdminField label="Action" className="min-w-[190px]">
                                            <AdminNativeSelect
                                                value={actionFilter}
                                                onChange={(event) => setActionFilter(event.target.value)}
                                            >
                                                <option value="all">All actions</option>
                                                <option value="admin.user">User actions</option>
                                                <option value="admin.professional_verification">Verification actions</option>
                                                <option value="admin.notifications">Notification actions</option>
                                                <option value="admin.food">Food actions</option>
                                                <option value="admin.meal_entry">Meal entry actions</option>
                                                <option value="admin.progress">Progress actions</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField label="Target" className="min-w-[180px]">
                                            <AdminNativeSelect
                                                value={targetTypeFilter}
                                                onChange={(event) => setTargetTypeFilter(event.target.value)}
                                            >
                                                <option value="all">All targets</option>
                                                <option value="User">Users</option>
                                                <option value="ProfessionalVerification">Verifications</option>
                                                <option value="Notification">Notifications</option>
                                                <option value="Food">Foods</option>
                                                <option value="MealEntry">Meal entries</option>
                                                <option value="Measurement">Measurements</option>
                                                <option value="PlaceLocal">Places</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField label="Severity" className="min-w-[160px]">
                                            <AdminNativeSelect
                                                value={severityFilter}
                                                onChange={(event) => setSeverityFilter(event.target.value)}
                                            >
                                                <option value="all">All severities</option>
                                                <option value="critical">Critical</option>
                                                <option value="warning">Warning</option>
                                                <option value="info">Info</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                    </AdminToolbarGroup>
                                    <AdminToolbarGroup className="xl:w-auto xl:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setSearch('');
                                                setActionFilter('all');
                                                setTargetTypeFilter('all');
                                                setSeverityFilter('all');
                                            }}
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>

                                <AdminPanel title="Audit log rows">
                                    <AdminScrollArea maxHeightClassName="max-h-[42rem]">
                                        <AdminDataTable tableClassName="min-w-[1120px]">
                                            <ProductTableHead>
                                                <ProductTableRow>
                                                    <ProductTableHeaderCell>Timestamp</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Admin actor</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Action</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Target</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Summary</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Severity</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>IP / device</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Action link</ProductTableHeaderCell>
                                                </ProductTableRow>
                                            </ProductTableHead>
                                            <ProductTableBody>
                                                {visibleLogs.map((log) => {
                                                    const severity = inferSeverity(log);
                                                    const ip = metadataString(log.metadata, ['ip', 'ip_address', 'remote_ip']);
                                                    const device = metadataString(log.metadata, ['device', 'user_agent', 'ua']);

                                                    return (
                                                        <ProductTableRow
                                                            key={log.id}
                                                            interactive
                                                            className={selectedId === log.id ? 'bg-primary/8' : undefined}
                                                        >
                                                            <ProductTableCell>
                                                                {formatDateTime(log.created_at)}
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="font-medium text-foreground">
                                                                    {formatAdminName(log)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {log.admin?.email ?? (log.admin_id ? `#${log.admin_id}` : 'System')}
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="font-medium text-foreground">
                                                                    {startCase(log.action)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {log.action}
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="text-sm text-foreground">
                                                                    {formatTargetType(log.target_type)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {log.target_id ? `#${log.target_id}` : 'No ID'}
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="max-w-[320px] text-sm leading-6 text-muted-foreground">
                                                                    {shortSummary(log)}
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${severityClassName(severity)}`}
                                                                >
                                                                    {severity}
                                                                </Badge>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="text-sm text-foreground">
                                                                    {ip ?? 'Not captured'}
                                                                </div>
                                                                <div className="max-w-[180px] truncate text-xs text-muted-foreground">
                                                                    {device ?? 'Device unavailable'}
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setSelectedId(log.id);
                                                                            setDrawerOpen(true);
                                                                        }}
                                                                    >
                                                                        Details
                                                                    </Button>
                                                                    {inferTargetHref(log) ? (
                                                                        <Button asChild size="sm" variant="outline">
                                                                            <Link href={inferTargetHref(log) ?? '#'}>
                                                                                Open
                                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                                            </Link>
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </ProductTableCell>
                                                        </ProductTableRow>
                                                    );
                                                })}
                                                {visibleLogs.length === 0 ? (
                                                    <ProductTableEmptyRow
                                                        colSpan={8}
                                                        title="No audit logs match these filters"
                                                        description="Adjust search, action, target, or severity filters."
                                                    />
                                                ) : null}
                                            </ProductTableBody>
                                        </AdminDataTable>
                                    </AdminScrollArea>
                                </AdminPanel>

                                <AdminPagination
                                    currentPage={currentPage}
                                    lastPage={lastPage}
                                    disabled={loading}
                                    summary={
                                        from && to
                                            ? `Showing ${from}-${to} of ${total} log entries`
                                            : 'Pagination follows active server filters.'
                                    }
                                    onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                    onNext={() => setCurrentPage((page) => Math.min(lastPage, page + 1))}
                                />

                                <AdminStickyBar
                                    summary={
                                        selectedLog
                                            ? `Selected ${selectedLog.action}`
                                            : 'Open a row to inspect before/after values and metadata.'
                                    }
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!selectedLog}
                                        onClick={() => setDrawerOpen(true)}
                                    >
                                        <ClipboardCheck className="h-4 w-4" />
                                        Inspect selected
                                    </Button>
                                </AdminStickyBar>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <AuditDetailDrawer
                log={selectedLog}
                relatedLogs={relatedLogs}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
            />
        </>
    );
}
