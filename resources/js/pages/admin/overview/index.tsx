import {
    AdminDataTable,
    AdminEmpty,
    AdminOverviewCard,
    AdminScrollArea,
} from '@/components/admin/admin-ui';
import { StatusChip } from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTableBody,
    ProductTableCell,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Bell, Settings2, Users } from 'lucide-react';

type AdminOverviewStat = {
    label: string;
    value: string | number;
    tone?: 'default' | 'accent';
    helper?: string;
};

type AdminOverviewPriorityItem = {
    id: number;
    title: string;
    description: string;
    severity: 'warning' | 'danger' | 'info';
    meta?: string;
};

type AdminOverviewOperations = {
    label: string;
    value: string | number;
    icon: LucideIcon;
    href: string;
};

type AdminOverviewDiagnostics = {
    label: string;
    value: string | number;
    status: 'ok' | 'warning' | 'error';
};

export default function AdminOverviewIndex() {
    // Mock data for stats
    const stats: AdminOverviewStat[] = [
        {
            label: 'Users',
            value: 1240,
            tone: 'accent',
            helper: 'Total registered',
        },
        {
            label: 'Pending Verifications',
            value: 23,
            helper: 'Awaiting review',
        },
        { label: 'Unread Alerts', value: 5, helper: 'From AI Coach' },
        { label: 'Failed Planner Runs', value: 2, helper: 'Last 24h' },
        { label: 'Recent Audit Events', value: 12, helper: 'Today' },
    ];

    // Mock data for priority queue (highest-risk items)
    const priorityQueue: AdminOverviewPriorityItem[] = [
        {
            id: 1,
            title: 'User #4029: Allergy conflict in latest plan',
            description:
                'Planner suggested peanuts despite user allergy profile',
            severity: 'danger',
            meta: 'Plan ID: 7891',
        },
        {
            id: 2,
            title: 'Verification #189: Expired license',
            description:
                'Professional verification shows license expired 2025-11-03',
            severity: 'warning',
            meta: 'Role: Trainer',
        },
        {
            id: 3,
            title: 'AI Coach: Unsafe suggestion flagged',
            description:
                'Coach recommended heavy lifting for user with back injury',
            severity: 'warning',
            meta: 'Chat #5542',
        },
    ];

    // Mock data for three equal cards
    const attentionCards = [
        {
            title: 'Users Needing Attention',
            value: 18,
            description: 'Accounts with safety flags or verification gaps',
        },
        {
            title: 'Verifications Pending',
            value: 23,
            description: 'Awaiting admin review or user response',
        },
        {
            title: 'AI Issues',
            value: 7,
            description: 'Failed runs, safety blocks, or schema errors',
        },
    ];

    // Mock data for operations row
    const operations: AdminOverviewOperations[] = [
        {
            label: 'Notifications',
            value: 12,
            icon: Bell,
            href: '/admin/notifications',
        },
        { label: 'Logs', value: 34, icon: Settings2, href: '/admin/logs' },
        {
            label: 'Support Cases',
            value: 8,
            icon: Users,
            href: '/admin/support-cases',
        },
    ];

    // Mock data for diagnostics entry
    const diagnostics: AdminOverviewDiagnostics = {
        label: 'System Health',
        value: 'OK',
        status: 'ok',
    };

    return (
        <>
            <AdminShell
                title="Admin Overview"
                description="Daily command center: see what needs attention now without diving into analytics."
            >
                {/* Stats row */}
                <AdminStatsGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {stats.map((stat, index) => (
                        <AdminStatCard
                            key={index}
                            label={stat.label}
                            value={stat.value}
                            tone={stat.tone}
                            helper={stat.helper}
                        />
                    ))}
                </AdminStatsGrid>

                {/* Priority queue: full-width */}
                <AdminSection
                    title="Priority Queue"
                    description="Highest-risk items requiring immediate attention"
                >
                    {priorityQueue.length > 0 ? (
                        <AdminScrollArea maxHeightClassName="max-h-[300px]">
                            <AdminDataTable>
                                <ProductTableHead>
                                    <tr>
                                        <ProductTableHeaderCell className="w-4">
                                            Severity
                                        </ProductTableHeaderCell>
                                        <ProductTableHeaderCell>
                                            Title
                                        </ProductTableHeaderCell>
                                        <ProductTableHeaderCell className="w-32">
                                            Action
                                        </ProductTableHeaderCell>
                                    </tr>
                                </ProductTableHead>
                                <ProductTableBody>
                                    {priorityQueue.map((item) => (
                                        <ProductTableRow key={item.id}>
                                            <ProductTableCell>
                                                <StatusChip
                                                    value={item.severity}
                                                    label={item.severity}
                                                />
                                            </ProductTableCell>
                                            <ProductTableCell className="space-y-1">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {item.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.description}
                                                </p>
                                                {item.meta && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.meta}
                                                    </p>
                                                )}
                                            </ProductTableCell>
                                            <ProductTableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Placeholder for action
                                                        alert(
                                                            `Action for ${item.title}`,
                                                        );
                                                    }}
                                                >
                                                    Review
                                                </Button>
                                            </ProductTableCell>
                                        </ProductTableRow>
                                    ))}
                                </ProductTableBody>
                            </AdminDataTable>
                        </AdminScrollArea>
                    ) : (
                        <AdminEmpty
                            title="No priority items"
                            description="All queues are clear."
                        />
                    )}
                </AdminSection>

                {/* Three equal cards: users needing attention, verifications, AI issues */}
                <AdminSection title="Attention Summary">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {attentionCards.map((card, index) => (
                            <AdminOverviewCard
                                key={index}
                                title={card.title}
                                description={card.description}
                            >
                                <div className="text-2xl font-semibold tracking-tight text-foreground">
                                    {card.value}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {card.description}
                                </p>
                            </AdminOverviewCard>
                        ))}
                    </div>
                </AdminSection>

                {/* Operations row: notifications, logs, support cases */}
                <AdminSection title="Quick Operations">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {operations.map((op, index) => (
                            <AdminOverviewCard
                                key={index}
                                title={op.label}
                                description={`${op.value} items`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <op.icon className="h-5 w-5" />
                                        <div className="text-2xl font-semibold tracking-tight text-foreground">
                                            {op.value}
                                        </div>
                                    </div>
                                    <Link
                                        href={op.href}
                                        className="text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            View
                                            <ArrowUpRight className="h-3 w-3" />
                                        </span>
                                    </Link>
                                </div>
                            </AdminOverviewCard>
                        ))}
                    </div>
                </AdminSection>

                {/* Diagnostics entry: small separate section */}
                <AdminSection title="Diagnostics">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="dashboard-surface rounded-[24px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                System Health
                            </div>
                            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                                {diagnostics.value}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                All systems operational
                            </div>
                        </div>
                        <div className="dashboard-surface rounded-[24px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                Last Check
                            </div>
                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                2m ago
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                No failures detected
                            </div>
                        </div>
                    </div>
                </AdminSection>
            </AdminShell>
        </>
    );
}
