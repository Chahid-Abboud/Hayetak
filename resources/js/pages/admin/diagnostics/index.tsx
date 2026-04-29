import {
    AdminEmpty,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
    AdminStickyBar,
} from '@/components/admin/admin-ui';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';

export default function AdminDiagnosticsPage() {
    return (
        <>
            <Head title="Admin Diagnostics" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Diagnostics"
                    description="Debugging and technical investigation workspace for AI, jobs, APIs, and imports without crowding operational admin pages."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Open incidents"
                                value="--"
                                tone="accent"
                                helper="Connect this to diagnostics event sources."
                            />
                            <AdminStatCard
                                label="Failed jobs"
                                value="--"
                                helper="Queue and worker health status."
                            />
                            <AdminStatCard
                                label="API failures"
                                value="--"
                                helper="Recent API-level reliability signals."
                            />
                            <AdminStatCard
                                label="Prompt traces"
                                value="--"
                                helper="Trace count for AI investigation windows."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Logs stay full-width and readable; technical payloads expand in detail view only."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Queue first"
                                    description="Filter by date, severity, source, and request ID before opening payload detail."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep compact rows for scanning; avoid dense raw JSON in the default list.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Expand only when needed"
                                    description="Inspect stack traces, prompts, and retry data in the detail drawer."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Link back to affected user, planner run, or coach thread for resolution context.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filter & action toolbar"
                            description="Diagnostics tabs: AI, Jobs, API, Imports, System Health, Prompt Traces, Tool Calls."
                        >
                            <AdminPanel
                                title="Diagnostics log viewer"
                                description="Dedicated full-width technical table placeholder."
                            >
                                <AdminScrollArea maxHeightClassName="max-h-[26rem]">
                                    <AdminEmpty
                                        title="Diagnostics pipeline pending"
                                        description="Wire this page to internal diagnostics sources, then render compact rows with expandable technical payloads."
                                    />
                                </AdminScrollArea>
                            </AdminPanel>
                            <AdminStickyBar summary="Investigation actions">
                                <Button type="button" variant="outline" disabled>
                                    Copy request ID
                                </Button>
                                <Button type="button" variant="outline" disabled>
                                    Retry safe job
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/admin/logs">Open audit logs</Link>
                                </Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
