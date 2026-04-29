import {
    AdminEmpty,
    AdminOverviewCard,
    AdminPanel,
} from '@/components/admin/admin-ui';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';

export default function AdminAnalyticsPage() {
    return (
        <>
            <Head title="Admin Analytics" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Analytics"
                    description="Trend-reading workspace for growth, retention, AI quality, verification funnel, food logging, and support load."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard label="Growth" value="--" tone="accent" helper="Top-level growth signal." />
                            <AdminStatCard label="Retention" value="--" helper="Short-horizon retention signal." />
                            <AdminStatCard label="AI quality" value="--" helper="Planner and coach quality trend." />
                            <AdminStatCard label="Support load" value="--" helper="Support trend monitoring." />
                        </AdminStatsGrid>

                        <AdminSection title="Triage guidance" description="Analytics is for reading trends, not daily operations or heavy action controls.">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard title="Stacked analysis bands" description="Use full-width chart bands for detailed trend reading.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Use equal grids only for compact summary metrics.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard title="Minimal actions" description="Limit controls to date range and export to reduce dashboard noise.">
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Keep this page informational, not operational.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection title="Filter & action toolbar" description="Analytics workspace">
                            <AdminPanel title="Trend modules" description="Tabs placeholder: Growth, Retention, AI Quality, Verification Funnel, Food Logging, Support Load.">
                                <AdminEmpty title="Analytics data pending" description="Connect analytics datasets and render stacked chart sections in this surface." />
                            </AdminPanel>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
