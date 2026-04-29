import {
    AdminEmpty,
    AdminOverviewCard,
    AdminPanel,
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

export default function AdminAiRolloutsPage() {
    return (
        <>
            <Head title="Admin AI Rollouts" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="AI Rollouts"
                    description="Controlled rollout surface for AI model/runtime changes, with environment scope, guardrails, and explicit promotion steps."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Active rollouts" value="--" tone="accent" helper="Currently running rollout tracks." />
                            <AdminStatCard label="Pending promotions" value="--" helper="Rollouts awaiting next stage approval." />
                            <AdminStatCard label="Failed promotions" value="--" helper="Rollouts blocked due to checks." />
                            <AdminStatCard label="Safety gates" value="--" helper="Blocking safety/control checks in current cycle." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="Treat rollouts as high-risk changes with clear scope and rollback readiness.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Scope and guardrails" description="Show environment, audience, and safety gates before promotion.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep impact estimate visible in the rollout detail panel.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Promotion discipline" description="Promote gradually and preserve immediate rollback path.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Link rollout events to diagnostics and audit traces.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="AI rollout workspace">
                            <AdminPanel title="Rollout table" description="Rollout state and target scope placeholder">
                                <AdminEmpty title="AI rollout data pending" description="Connect rollout orchestration data and control endpoints." />
                            </AdminPanel>
                            <AdminStickyBar summary="Rollout actions">
                                <Button type="button" variant="outline" disabled>Stage rollout</Button>
                                <Button type="button" disabled>Promote</Button>
                                <Button type="button" variant="destructive" disabled>Rollback</Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
