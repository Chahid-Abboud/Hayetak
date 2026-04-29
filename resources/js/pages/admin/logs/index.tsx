import {
    AdminEmpty,
    AdminNotice,
    AdminOverviewCard,
    AdminPagination,
    AdminPanel,
} from '@/components/admin/admin-ui';
import {
    ActivityTimeline,
    AdminFilterToolbar,
    AdminSplitView,
    EntityDetailDrawer,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ExternalLink, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AdminActionLog = {
    id: number;
    action: string;
    admin_id: number | null;
    target_type: string | null;
    target_id: number | null;
    metadata?: Record<string, unknown> | null;
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

function formatTargetType(value?: string | null) {
    if (!value) {
        return 'No target';
    }

    const normalized = value.split('\\').pop() ?? value;

    return normalized.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function inferTargetHref(log: AdminActionLog) {
    if (!log.target_id || !log.target_type) {
        return null;
    }

    if (log.target_type.endsWith('User')) {
        return `/admin/users/${log.target_id}`;
    }

    if (log.target_type.endsWith('Food')) {
        return '/admin/meals';
    }

    if (log.target_type.endsWith('MealEntry')) {
        return '/admin/meals';
    }

    if (log.target_type.endsWith('ProfessionalVerification')) {
        return '/admin/professional-verifications';
    }

    if (log.target_type.endsWith('Notification')) {
        return '/admin/notifications';
    }

    return null;
}

function flattenMetadata(
    value: Record<string, unknown> | null | undefined,
    prefix = '',
): Array<{ label: string; value: string }> {
    if (!value) {
        return [];
    }

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
            return flattenMetadata(rawValue as Record<string, unknown>, label);
        }

        return [{ label, value: String(rawValue) }];
    });
}

function LogDetailPanel({
    log,
    loading,
}: {
    log: AdminActionLog | null;
    loading: boolean;
}) {
    if (loading && !log) {
        return (
            <AdminEmpty
                title="Loading log feed"
                description="Pulling the latest admin actions and metadata."
            />
        );
    }

    if (!log) {
        return (
            <AdminEmpty
                title="Select a log entry"
                description="Choose a timeline row to inspect the target record, actor, and audit payload."
            />
        );
    }

    const metadataEntries = flattenMetadata(log.metadata);
    const targetHref = inferTargetHref(log);

    return (
        <div className="space-y-4">
            <AdminPanel
                title={log.action}
                description="Audit detail for the selected action."
            >
                <div className="space-y-3">
                    <StatusChipSet
                        items={[
                            {
                                value: log.target_type
                                    ? formatTargetType(log.target_type)
                                    : '',
                                label: formatTargetType(log.target_type),
                            },
                            {
                                value: log.admin_id ? 'verified' : 'info',
                                label: formatAdminName(log),
                            },
                        ]}
                    />

                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm">
                        <div className="font-medium text-foreground">
                            {formatAdminName(log)}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                            Logged {formatDateTime(log.created_at)}
                        </div>
                        <div className="mt-2 text-muted-foreground">
                            {log.target_type || log.target_id
                                ? `${formatTargetType(log.target_type)}${log.target_id ? ` #${log.target_id}` : ''}`
                                : 'No specific target record'}
                        </div>
                    </div>

                    {targetHref ? (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={targetHref}>
                                Open related record
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                        </Button>
                    ) : null}
                </div>
            </AdminPanel>

            <AdminPanel
                title="Metadata payload"
                description="Flattened audit metadata captured at the time of the action."
            >
                {metadataEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No metadata was stored for this action.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {metadataEntries.map((entry) => (
                            <div
                                key={`${log.id}-${entry.label}`}
                                className="rounded-[18px] border border-border/70 bg-background/74 px-3 py-3"
                            >
                                <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    {entry.label}
                                </div>
                                <div className="mt-1 text-sm break-words text-foreground">
                                    {entry.value}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </AdminPanel>
        </div>
    );
}

export default function AdminLogsIndex() {
    const [logs, setLogs] = useState<AdminActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [targetTypeFilter, setTargetTypeFilter] = useState('all');
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
                per_page: '20',
                page: String(currentPage),
            });

            if (search.trim()) {
                params.set('search', search.trim());
            }
            if (actionFilter !== 'all') {
                params.set('action', actionFilter);
            }
            if (targetTypeFilter !== 'all') {
                params.set('target_type', targetTypeFilter);
            }

            const res = await fetch(
                `/api/admin/action-logs?${params.toString()}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!res.ok) {
                throw new Error('Could not load admin action logs.');
            }

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
    }, [actionFilter, search, targetTypeFilter]);

    useEffect(() => {
        if (logs.length === 0) {
            setSelectedId(null);
            return;
        }

        if (!selectedId || !logs.some((log) => log.id === selectedId)) {
            setSelectedId(logs[0].id);
        }
    }, [logs, selectedId]);

    const targetedActions = useMemo(
        () => logs.filter((log) => log.target_type || log.target_id).length,
        [logs],
    );
    const uniqueAdmins = useMemo(
        () => new Set(logs.map((log) => log.admin_id).filter(Boolean)).size,
        [logs],
    );
    const metadataRichActions = useMemo(
        () =>
            logs.filter(
                (log) => log.metadata && Object.keys(log.metadata).length > 0,
            ).length,
        [logs],
    );

    const selectedLog = useMemo(
        () => logs.find((log) => log.id === selectedId) ?? null,
        [logs, selectedId],
    );

    return (
        <>
            <Head title="Admin Logs" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Admin action logs"
                    description="Filter the audit stream, follow the activity timeline, and drill into action payloads without losing your place."
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void loadLogs()}
                            disabled={loading}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            {loading ? 'Refreshing...' : 'Refresh logs'}
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible actions"
                                value={loading ? '...' : String(logs.length)}
                                tone="accent"
                                helper="Latest audit events in the current filtered page."
                            />
                            <AdminStatCard
                                label="Active admins"
                                value={loading ? '...' : String(uniqueAdmins)}
                                helper="Distinct administrators in the current results."
                            />
                            <AdminStatCard
                                label="Targeted actions"
                                value={
                                    loading ? '...' : String(targetedActions)
                                }
                                helper="Entries tied to a specific record."
                            />
                            <AdminStatCard
                                label="Metadata-rich entries"
                                value={
                                    loading
                                        ? '...'
                                        : String(metadataRichActions)
                                }
                                helper="Actions with a stored audit payload."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Keep logs readable and boring: filter quickly, inspect one action deeply, and open related records only when needed."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Log queue state"
                                    description="Use action and target filters to reduce noise before opening metadata."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        {from && to
                                            ? `Showing ${from}-${to} of ${total} actions in this slice.`
                                            : 'Queue slice updates when filters or search change.'}
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Inspection context"
                                    description="Metadata and linked records appear in detail view while the queue remains pinned."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        {selectedLog
                                            ? `Selected action: ${selectedLog.action}.`
                                            : 'Select a log entry to inspect actor, target, and payload details.'}
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filter & action toolbar"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} log entries. Filter first, then inspect metadata and linked records in the detail rail.`
                                    : 'Filter first, then inspect metadata and linked records in the detail rail.'
                            }
                        >
                            {error ? (
                                <AdminNotice tone="danger">{error}</AdminNotice>
                            ) : null}

                            <AdminFilterToolbar
                                search={search}
                                onSearchChange={setSearch}
                                searchPlaceholder="Search action, admin, target type, or target id"
                                filters={[
                                    {
                                        label: 'Action family',
                                        value: actionFilter,
                                        onChange: setActionFilter,
                                        options: [
                                            {
                                                value: 'all',
                                                label: 'All actions',
                                            },
                                            {
                                                value: 'admin.user',
                                                label: 'User actions',
                                            },
                                            {
                                                value: 'admin.professional_verification',
                                                label: 'Verification actions',
                                            },
                                            {
                                                value: 'admin.notifications',
                                                label: 'Notification actions',
                                            },
                                            {
                                                value: 'admin.food',
                                                label: 'Food actions',
                                            },
                                            {
                                                value: 'admin.meal_entry',
                                                label: 'Meal entry actions',
                                            },
                                        ],
                                    },
                                    {
                                        label: 'Target type',
                                        value: targetTypeFilter,
                                        onChange: setTargetTypeFilter,
                                        options: [
                                            {
                                                value: 'all',
                                                label: 'All targets',
                                            },
                                            { value: 'User', label: 'Users' },
                                            {
                                                value: 'ProfessionalVerification',
                                                label: 'Verifications',
                                            },
                                            {
                                                value: 'Notification',
                                                label: 'Notifications',
                                            },
                                            { value: 'Food', label: 'Foods' },
                                            {
                                                value: 'MealEntry',
                                                label: 'Meal entries',
                                            },
                                        ],
                                    },
                                ]}
                            />

                            <AdminSplitView
                                list={
                                    <div className="space-y-4">
                                        {loading && logs.length === 0 ? (
                                            <AdminEmpty
                                                title="Loading admin activity"
                                                description="Pulling the latest actions from the audit log."
                                            />
                                        ) : (
                                            <ActivityTimeline
                                                items={logs.map((log) => ({
                                                    id: log.id,
                                                    title: log.action,
                                                    description:
                                                        formatAdminName(log),
                                                    meta:
                                                        log.target_type ||
                                                        log.target_id
                                                            ? `${formatTargetType(log.target_type)}${log.target_id ? ` #${log.target_id}` : ''}`
                                                            : 'No specific target',
                                                    timestamp: formatDateTime(
                                                        log.created_at,
                                                    ),
                                                    tone:
                                                        log.target_type ||
                                                        log.target_id
                                                            ? 'info'
                                                            : 'default',
                                                    chips: [
                                                        {
                                                            value: log.target_type
                                                                ? 'info'
                                                                : '',
                                                            label: formatTargetType(
                                                                log.target_type,
                                                            ),
                                                        },
                                                    ],
                                                }))}
                                                selectedId={selectedId}
                                                onSelect={(id) =>
                                                    setSelectedId(Number(id))
                                                }
                                                emptyTitle="No admin actions recorded yet"
                                                emptyDescription="As moderators and admins make changes, their activity will appear here."
                                            />
                                        )}

                                        <AdminPagination
                                            currentPage={currentPage}
                                            lastPage={lastPage}
                                            disabled={loading}
                                            summary={
                                                from && to
                                                    ? `Showing ${from}-${to} of ${total} log entries`
                                                    : 'Pagination stays aligned with the active filters.'
                                            }
                                            onPrevious={() =>
                                                setCurrentPage((page) =>
                                                    Math.max(1, page - 1),
                                                )
                                            }
                                            onNext={() =>
                                                setCurrentPage((page) =>
                                                    Math.min(
                                                        lastPage,
                                                        page + 1,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                }
                                detail={
                                    <LogDetailPanel
                                        log={selectedLog}
                                        loading={loading}
                                    />
                                }
                            />

                            <div className="mt-4 xl:hidden">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDrawerOpen(true)}
                                    disabled={!selectedLog}
                                >
                                    Inspect selected log
                                </Button>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={selectedLog?.action ?? 'Log detail'}
                description="Mobile drill-in for the selected admin action."
            >
                <LogDetailPanel log={selectedLog} loading={loading} />
            </EntityDetailDrawer>
        </>
    );
}
