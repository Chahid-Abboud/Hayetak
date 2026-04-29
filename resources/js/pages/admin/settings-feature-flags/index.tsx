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

export default function AdminSettingsFeatureFlagsPage() {
    return (
        <>
            <Head title="Admin Settings & Feature Flags" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Settings / Feature Flags"
                    description="Operational system settings and feature-flag controls with explicit confirmation flow for high-impact toggles."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Active flags"
                                value="--"
                                tone="accent"
                                helper="Currently enabled feature flags."
                            />
                            <AdminStatCard
                                label="Disabled flags"
                                value="--"
                                helper="Flags currently off."
                            />
                            <AdminStatCard
                                label="Recent flag changes"
                                value="--"
                                helper="Change events in current window."
                            />
                            <AdminStatCard
                                label="High-risk toggles"
                                value="--"
                                helper="Flags affecting AI/privacy/admin access."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Keep controls explicit and restrained; avoid accidental broad-impact toggles."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Scope clarity"
                                    description="Show affected pages/features before toggling any flag."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Include rollout intent and owner
                                        metadata where available.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Confirmation-heavy path"
                                    description="Require explicit confirmation for sensitive toggles."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Link to audit logs after changes for
                                        traceability.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filter & action toolbar"
                            description="Feature configuration workspace"
                        >
                            <AdminPanel
                                title="Feature flag table"
                                description="Settings and feature controls placeholder"
                            >
                                <AdminEmpty
                                    title="Feature flag data pending"
                                    description="Connect runtime config and flag-management sources."
                                />
                            </AdminPanel>
                            <AdminStickyBar summary="Configuration actions">
                                <Button type="button" disabled>
                                    Enable
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled
                                >
                                    Disable
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                >
                                    Review impact
                                </Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
