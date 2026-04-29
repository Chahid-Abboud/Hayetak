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

export default function AdminSafetyProfilesPage() {
    return (
        <>
            <Head title="Admin Safety Profiles" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Safety Profiles"
                    description="Safety-first profile review for allergies, diet constraints, medical history, and injury limitations before planner or coach output."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Incomplete profiles" value="--" tone="accent" helper="Users with missing safety-critical fields." />
                            <AdminStatCard label="Allergy profiles" value="--" helper="Users with allergy restrictions." />
                            <AdminStatCard label="Injury profiles" value="--" helper="Users with injury constraints." />
                            <AdminStatCard label="Medical-history profiles" value="--" helper="Users with medical context present." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="Keep this page calm but strict: safety warnings before edit controls.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Risk visibility first" description="Show what AI must not suggest before any profile edits.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Blocked foods and blocked exercises should stay obvious and persistent.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Correction workflow" description="Review, correct, request update, or lock unsafe generation.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Each action should leave a clear audit trail.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="Safety profile workspace">
                            <AdminSplitLayout className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <AdminPanel title="Safety-sensitive users" description="Queue placeholder">
                                    <AdminEmpty title="Safety queue pending" description="Connect safety profile dataset and list users requiring review." />
                                </AdminPanel>
                                <AdminPanel title="Safety detail panel" description="Allergies, diet, medical, injuries, and risk directives">
                                    <AdminEmpty title="Safety detail pending" description="Render blocked foods/exercises and profile correction controls." />
                                </AdminPanel>
                            </AdminSplitLayout>
                            <AdminStickyBar summary="Safety actions">
                                <Button type="button" variant="outline" disabled>Mark reviewed</Button>
                                <Button type="button" variant="outline" disabled>Require user update</Button>
                                <Button type="button" disabled>Save correction</Button>
                                <Button type="button" variant="destructive" disabled>Lock unsafe generation</Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
