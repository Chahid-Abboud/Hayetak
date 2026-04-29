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

export default function AdminAssignmentsPage() {
    return (
        <>
            <Head title="Admin Assignments" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Assignments"
                    description="Manual matching workflow for assigning users to trainers or dietitians using capacity and specialty fit."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Unassigned users"
                                value="--"
                                tone="accent"
                                helper="Queue of users awaiting placement."
                            />
                            <AdminStatCard
                                label="Active assignments"
                                value="--"
                                helper="Current user-professional matches."
                            />
                            <AdminStatCard
                                label="Overloaded professionals"
                                value="--"
                                helper="Capacity imbalance warnings."
                            />
                            <AdminStatCard
                                label="Mismatch warnings"
                                value="--"
                                helper="Specialty or profile mismatch signals."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Use guided matching flow instead of wide uneven comparison grids."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="User needs first"
                                    description="Select the user profile and constraints before evaluating candidates."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Start from role need, city, specialty,
                                        and availability requirements.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Candidate fit second"
                                    description="Evaluate capacity and specialty overlap for assignment confidence."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Record assignment rationale to maintain
                                        traceability.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filter & action toolbar"
                            description="Assignment matching workspace"
                        >
                            <AdminSplitLayout className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <AdminPanel
                                    title="Users needing assignment"
                                    description="Queue placeholder"
                                >
                                    <AdminEmpty
                                        title="Assignment queue pending"
                                        description="Connect to assignment APIs and user need summaries."
                                    />
                                </AdminPanel>
                                <AdminPanel
                                    title="Professional candidates"
                                    description="Capacity and specialty fit placeholder"
                                >
                                    <AdminEmpty
                                        title="Candidate panel pending"
                                        description="Render ranked professional matches for selected user."
                                    />
                                </AdminPanel>
                            </AdminSplitLayout>
                            <AdminStickyBar summary="Assignment actions">
                                <Button type="button" disabled>
                                    Assign
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                >
                                    Reassign
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled
                                >
                                    Remove assignment
                                </Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
