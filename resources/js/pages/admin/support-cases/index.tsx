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

export default function AdminSupportCasesPage() {
    return (
        <>
            <Head title="Admin Support Cases" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Support Cases"
                    description="Incident and escalation workspace with readable timeline context and explicit ownership actions."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Open cases" value="--" tone="accent" helper="Current unresolved case count." />
                            <AdminStatCard label="Waiting" value="--" helper="Cases blocked on user or external response." />
                            <AdminStatCard label="Escalated" value="--" helper="High-priority escalations currently active." />
                            <AdminStatCard label="Resolved" value="--" helper="Recently closed incidents." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="Keep case timeline readable by default; full technical traces should stay in diagnostics or audit logs.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Queue ownership" description="Assign clear owner and priority before deep investigation.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Link each case to user, plan, chat, or log artifacts for traceability.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Timeline clarity" description="Show summarized timeline entries with expandable notes.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep the case narrative concise and action-oriented.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="Support case workspace">
                            <AdminSplitLayout className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <AdminPanel title="Case queue" description="Status, owner, and priority filters placeholder">
                                    <AdminEmpty title="Support queue pending" description="Connect case source and render list+detail queue." />
                                </AdminPanel>
                                <AdminPanel title="Case detail" description="Summary, links, notes, timeline placeholder">
                                    <AdminEmpty title="Case detail pending" description="Render linked user, plan/chat/log references and notes." />
                                </AdminPanel>
                            </AdminSplitLayout>
                            <AdminStickyBar summary="Case actions">
                                <Button type="button" variant="outline" disabled>Assign owner</Button>
                                <Button type="button" variant="outline" disabled>Change status</Button>
                                <Button type="button" disabled>Escalate</Button>
                                <Button type="button" variant="outline" disabled>Resolve</Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
