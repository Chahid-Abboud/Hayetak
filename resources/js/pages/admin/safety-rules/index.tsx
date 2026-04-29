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

export default function AdminSafetyRulesPage() {
    return (
        <>
            <Head title="Admin Safety Rules" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Safety Rules"
                    description="Central AI policy governance for allergies, diet restrictions, medical escalation, injury constraints, unsafe claims, and fallback behavior."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Active rules"
                                value="--"
                                tone="accent"
                                helper="Published safety policy set."
                            />
                            <AdminStatCard
                                label="Draft rules"
                                value="--"
                                helper="Unpublished edits awaiting simulation."
                            />
                            <AdminStatCard
                                label="Recent changes"
                                value="--"
                                helper="Versioned updates this cycle."
                            />
                            <AdminStatCard
                                label="Failed simulations"
                                value="--"
                                helper="Runs requiring policy revision."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Treat this as conservative policy control; publishing should remain confirmation-heavy."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Rule editor"
                                    description="Keep plain-English rule intent, conditions, and version history explicit."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Tabs: Allergy, Diet, Medical Escalation, Injury, Unsafe Claims, Fallbacks.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Simulation first"
                                    description="Run simulation before publish to prevent unsafe policy drift."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Simulation panel should stay full-width below the editor, not compressed beside it.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filter & action toolbar"
                            description="Rules workspace"
                        >
                            <AdminPanel
                                title="Rule list and editor"
                                description="Policy data source wiring placeholder."
                            >
                                <AdminEmpty
                                    title="Safety rules data pending"
                                    description="Connect persisted policy entities and simulation endpoints here."
                                />
                            </AdminPanel>
                            <AdminStickyBar summary="Policy actions">
                                <Button type="button" variant="outline" disabled>
                                    Save draft
                                </Button>
                                <Button type="button" variant="outline" disabled>
                                    Simulate
                                </Button>
                                <Button type="button" disabled>
                                    Publish
                                </Button>
                                <Button type="button" variant="destructive" disabled>
                                    Rollback
                                </Button>
                            </AdminStickyBar>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
