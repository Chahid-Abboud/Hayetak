import {
    AdminEmpty,
    AdminOverviewCard,
    AdminPanel,
    AdminSplitLayout,
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
import { Head } from '@inertiajs/react';

export default function AdminPrivacyCompliancePage() {
    return (
        <>
            <Head title="Admin Privacy & Compliance" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Privacy & Compliance"
                    description="Traceability-focused workspace for data exports, deletions, consent handling, and regulated request workflows."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Open requests" value="--" tone="accent" helper="Compliance queue requiring admin action." />
                            <AdminStatCard label="Completed exports" value="--" helper="Fulfilled export requests in current window." />
                            <AdminStatCard label="Pending deletions" value="--" helper="Deletion requests in progress." />
                            <AdminStatCard label="Overdue items" value="--" helper="SLA-risk compliance requests." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="Speed matters less than traceability and correctness in compliance workflows.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Request queue clarity" description="Filter by request type, status, and date before opening legal notes.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep checklist completion and legal notes visible in the detail panel.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Controlled actions" description="Exports and deletions require explicit completion flow and recorded rationale.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Every fulfillment action should remain auditable.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="Compliance request workspace">
                            <AdminSplitLayout className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <AdminPanel title="Compliance queue" description="Request list placeholder">
                                    <AdminEmpty title="Compliance queue pending" description="Connect privacy/compliance request entities and render queue list." />
                                </AdminPanel>
                                <AdminPanel title="Request detail" description="Checklist and legal/admin notes placeholder">
                                    <AdminEmpty title="Compliance detail pending" description="Render requester, affected data, and completion checklist." />
                                </AdminPanel>
                            </AdminSplitLayout>
                            <AdminStickyBar summary="Compliance actions">
                                <Button type="button" variant="outline" disabled>Approve export</Button>
                                <Button type="button" variant="destructive" disabled>Complete deletion</Button>
                                <Button type="button" variant="outline" disabled>Reject request</Button>
                                <Button type="button" disabled>Mark fulfilled</Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
