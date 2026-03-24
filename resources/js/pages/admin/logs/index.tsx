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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AdminActionLog = {
    id: number;
    action: string;
    admin_id: number | null;
    target_type: string | null;
    target_id: number | null;
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

export default function AdminLogsIndex() {
    const [logs, setLogs] = useState<AdminActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/action-logs', {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Could not load admin action logs.');
            }

            const json = (await res.json()) as AdminActionLogResponse;
            setLogs(Array.isArray(json?.data) ? json.data : []);
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
    }, []);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    const targetedActions = useMemo(
        () => logs.filter((log) => log.target_type || log.target_id).length,
        [logs],
    );
    const uniqueAdmins = useMemo(
        () => new Set(logs.map((log) => log.admin_id).filter(Boolean)).size,
        [logs],
    );

    return (
        <>
            <Head title="Admin Logs" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Admin action logs"
                    description="Review the latest moderation, content, and system actions so operational changes stay easy to audit."
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
                                helper="Latest admin activity loaded from the audit feed."
                            />
                            <AdminStatCard
                                label="Active admins"
                                value={loading ? '...' : String(uniqueAdmins)}
                                helper="Distinct administrators in the current view."
                            />
                            <AdminStatCard
                                label="Targeted actions"
                                value={
                                    loading ? '...' : String(targetedActions)
                                }
                                helper="Actions that referenced a specific record."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Recent activity"
                            description="Use this feed to quickly confirm who made a change, what happened, and which record was affected."
                        >
                            <div className="space-y-4">
                                {error ? (
                                    <ProductBanner tone="danger">
                                        {error}
                                    </ProductBanner>
                                ) : null}

                                {loading ? (
                                    <ProductEmptyState
                                        title="Loading admin activity"
                                        description="Pulling the latest actions from the audit log."
                                    />
                                ) : (
                                    <ProductTable>
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    Action
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Admin
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Target
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell className="w-44">
                                                    Time
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {logs.map((log) => (
                                                <ProductTableRow key={log.id}>
                                                    <ProductTableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-foreground">
                                                                {log.action}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Log #{log.id}
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {formatAdminName(log)}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {log.target_type ||
                                                        log.target_id ? (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {log.target_type ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="rounded-full px-2.5 py-1 capitalize"
                                                                    >
                                                                        {log.target_type.replace(
                                                                            /_/g,
                                                                            ' ',
                                                                        )}
                                                                    </Badge>
                                                                ) : null}
                                                                <span className="text-sm text-muted-foreground">
                                                                    {log.target_id
                                                                        ? `#${log.target_id}`
                                                                        : 'No target id'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">
                                                                No specific
                                                                target
                                                            </span>
                                                        )}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {log.created_at
                                                            ? new Date(
                                                                  log.created_at,
                                                              ).toLocaleString()
                                                            : 'Just now'}
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}

                                            {logs.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={4}
                                                    title="No admin actions recorded yet"
                                                    description="As moderators and admins make changes, their activity will appear here."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </ProductTable>
                                )}
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
