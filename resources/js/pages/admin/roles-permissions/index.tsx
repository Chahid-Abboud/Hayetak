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

export default function AdminRolesPermissionsPage() {
    return (
        <>
            <Head title="Admin Roles & Permissions" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Roles & Permissions"
                    description="High-risk access and feature control surface for admin roles, permissions, flags, and AI rollout toggles."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Admins" value="--" tone="accent" helper="Current admin account footprint." />
                            <AdminStatCard label="Active flags" value="--" helper="Feature and rollout toggles currently enabled." />
                            <AdminStatCard label="Restricted pages" value="--" helper="Admin-only surfaces under role constraints." />
                            <AdminStatCard label="Recent permission changes" value="--" helper="Audit-sensitive changes in current window." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="This page should be explicit, restrained, and hard to use accidentally.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Access controls" description="Separate tabs for roles, permissions, feature flags, and AI rollouts.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Show affected users, pages, and features before any change.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Confirmation-heavy actions" description="Require explicit confirmation for AI, privacy, or admin-access-impacting changes.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep destructive or broad-impact toggles deliberate.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="Roles and feature controls workspace">
                            <AdminPanel title="Settings table" description="Roles, permissions, feature flags, and AI rollout data source placeholder.">
                                <AdminEmpty title="Access-control data pending" description="Wire roles, permissions, and flag management APIs here." />
                            </AdminPanel>
                            <AdminStickyBar summary="Access actions">
                                <Button type="button" variant="outline" disabled>Assign role</Button>
                                <Button type="button" variant="outline" disabled>Revoke role</Button>
                                <Button type="button" disabled>Enable flag</Button>
                                <Button type="button" variant="destructive" disabled>Disable flag</Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
