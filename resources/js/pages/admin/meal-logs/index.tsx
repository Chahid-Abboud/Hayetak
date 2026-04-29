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

export default function AdminMealLogsPage() {
    return (
        <>
            <Head title="Admin Meal Logs" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Meal Logs"
                    description="Correct user meal history with clear before/after accountability so coach and planner context stays trustworthy."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Recent logs" value="--" tone="accent" helper="Current meal-log queue slice." />
                            <AdminStatCard label="Edited logs" value="--" helper="Recently corrected records." />
                            <AdminStatCard label="Deleted logs" value="--" helper="Soft/removed log count in window." />
                            <AdminStatCard label="Missing-food logs" value="--" helper="Entries with unknown or removed catalog links." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="Always show who changed what and why. Meal logs directly affect AI coach context.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Correction fidelity" description="Show original and edited values in the detail drawer.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Include user, date, foods, and macro impact summary.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Change accountability" description="Require admin note for destructive edits where applicable.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep corrections reversible when system supports restore.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="Meal log correction workspace">
                            <AdminSplitLayout className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <AdminPanel title="Meal log table" description="User/date/meal/source filters placeholder">
                                    <AdminEmpty title="Meal log queue pending" description="Connect meal-log moderation data source for this dedicated page." />
                                </AdminPanel>
                                <AdminPanel title="Log detail drawer" description="Original vs edited values and change metadata">
                                    <AdminEmpty title="Meal log detail pending" description="Render per-entry change history and editable fields." />
                                </AdminPanel>
                            </AdminSplitLayout>
                            <AdminStickyBar summary="Meal log actions">
                                <Button type="button" disabled>Correct</Button>
                                <Button type="button" variant="outline" disabled>Add admin note</Button>
                                <Button type="button" variant="outline" disabled>Restore</Button>
                                <Button type="button" variant="destructive" disabled>Delete</Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
