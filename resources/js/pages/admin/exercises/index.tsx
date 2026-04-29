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

export default function AdminExercisesPage() {
    return (
        <>
            <Head title="Admin Exercises" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Exercises"
                    description="Exercise catalog governance for equipment tags, injury contraindications, and safe alternative mappings."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Exercises"
                                value="--"
                                tone="accent"
                                helper="Catalog size in current filter."
                            />
                            <AdminStatCard
                                label="Missing equipment tags"
                                value="--"
                                helper="Entries lacking equipment metadata."
                            />
                            <AdminStatCard
                                label="Injury-sensitive"
                                value="--"
                                helper="Contraindication-marked exercises."
                            />
                            <AdminStatCard
                                label="Alternative mappings"
                                value="--"
                                helper="Safe alternative pairings available."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Keep this structurally parallel to meal stewardship so admins learn one pattern."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Safety mappings first"
                                    description="Contraindications and alternatives should be visible before edit fields."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Prioritize injury compatibility and
                                        equipment realism.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Planner integrity"
                                    description="Keep planner tags and alternatives consistent across updates."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Avoid hiding risk signals behind deep
                                        nested panels.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filter & action toolbar"
                            description="Exercise catalog workspace"
                        >
                            <AdminSplitLayout className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                <AdminPanel
                                    title="Exercise table"
                                    description="Search/muscle/equipment/difficulty/injury filters placeholder"
                                >
                                    <AdminEmpty
                                        title="Exercise catalog pending"
                                        description="Connect exercise catalog data and moderation controls."
                                    />
                                </AdminPanel>
                                <AdminPanel
                                    title="Exercise detail panel"
                                    description="Instructions, contraindications, alternatives, planner tags"
                                >
                                    <AdminEmpty
                                        title="Exercise detail pending"
                                        description="Render edit controls and alternative mapping tools."
                                    />
                                </AdminPanel>
                            </AdminSplitLayout>
                            <AdminStickyBar summary="Exercise actions">
                                <Button type="button" disabled>
                                    Edit
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                >
                                    Add alternative
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                >
                                    Mark unsafe for injury
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled
                                >
                                    Hide
                                </Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
