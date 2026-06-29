import {
    AdminDataTable,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
} from '@/components/admin/admin-ui';
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
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    ClipboardCheck,
    ShieldCheck,
    Stethoscope,
    Users,
    UtensilsCrossed,
} from 'lucide-react';

type Tone = 'danger' | 'warning' | 'info' | 'success';

type QueueItem = {
    id: string;
    title: string;
    description: string;
    meta: string;
    tone: Tone;
    href: string;
};

type PriorityCard = {
    title: string;
    value: string;
    description: string;
    icon: typeof ShieldCheck;
    href: string;
    items: Array<{ label: string; meta: string; tone?: Tone }>;
};

const stats = [
    {
        label: 'Total users',
        value: 248,
        helper: 'Accounts available through Users.',
        tone: 'accent' as const,
    },
    {
        label: 'Pending verifications',
        value: 23,
        helper: 'Professional reviews waiting for an admin decision.',
    },
    {
        label: 'Unread admin alerts',
        value: 5,
        helper: 'Messages and interventions in Notifications.',
    },
    {
        label: 'Professional profiles',
        value: 41,
        helper: 'Trainer and dietitian records visible in Professionals.',
    },
];

const highestPriorityQueue: QueueItem[] = [
    {
        id: 'verification-189',
        title: 'Trainer verification needs decision',
        description:
            'License evidence is present, but expiry date needs admin review before public visibility changes.',
        meta: 'Verification #189 - High priority',
        tone: 'warning',
        href: '/admin/verifications',
    },
    {
        id: 'profile-84',
        title: 'Professional profile needs publishing check',
        description:
            'A new public-facing dietitian profile is ready for a final content pass before it appears in discovery.',
        meta: 'Professionals - Record #84',
        tone: 'info',
        href: '/admin/professionals',
    },
    {
        id: 'user-review-3912',
        title: 'User account needs review',
        description:
            'Account state changed after a support note and now needs a quick admin confirmation.',
        meta: 'User #3912 - 31 min ago',
        tone: 'info',
        href: '/admin/users',
    },
    {
        id: 'moderation-18',
        title: 'Escalated message needs a safety decision',
        description:
            'A user message was delivered but flagged because it may involve a sensitive medical or privacy risk.',
        meta: 'Moderation queue - Open escalation',
        tone: 'warning',
        href: '/admin/message-moderations',
    },
    {
        id: 'catalog-512',
        title: 'Food catalog entry needs correction',
        description:
            'A meal item has incomplete allergen metadata and should be updated before the next planner run consumes it.',
        meta: 'Catalog item #512 - Content review',
        tone: 'info',
        href: '/admin/meals',
    },
];

const priorityCards: PriorityCard[] = [
    {
        title: 'Users',
        value: '248',
        description: 'Search, inspect, and update account state in one place.',
        icon: Users,
        href: '/admin/users',
        items: [
            { label: '12 users need account review', meta: 'Status queue' },
            {
                label: '8 accounts have pending notes',
                meta: 'Support follow-up',
            },
            { label: '4 soft-deleted accounts', meta: 'Restoration check' },
        ],
    },
    {
        title: 'Verifications',
        value: '23',
        description:
            'Professional credential decisions, missing info, and expiry risk.',
        icon: ClipboardCheck,
        href: '/admin/verifications',
        items: [
            { label: '7 license checks need decision', meta: 'Oldest: 2 days' },
            { label: '5 profiles missing specialty proof', meta: 'Needs note' },
            { label: '11 awaiting first pass', meta: 'Queue review' },
        ],
    },
    {
        title: 'Professionals',
        value: '41',
        description: 'Public directory records for trainers and dietitians.',
        icon: Stethoscope,
        href: '/admin/professionals',
        items: [
            {
                label: '9 profiles need biography polish',
                meta: 'Profile content',
            },
            {
                label: '5 profiles missing specialties',
                meta: 'Metadata review',
            },
            { label: '3 visibility changes pending', meta: 'Directory update' },
        ],
    },
    {
        title: 'Catalog',
        value: '5',
        description:
            'Food, exercise, place, and progress data that shapes the product.',
        icon: UtensilsCrossed,
        href: '/admin/meals',
        items: [
            {
                label: '2 meal items need allergen checks',
                meta: 'Food catalog',
            },
            { label: '1 exercise is hidden pending review', meta: 'Exercises' },
            { label: '2 places need location updates', meta: 'Places' },
        ],
    },
];

const healthItems = [
    {
        label: 'User queue',
        value: 'Stable',
        detail: 'Account reviews are moving without backlog growth.',
        tone: 'info' as const,
    },
    {
        label: 'Verification queue',
        value: 'Active',
        detail: 'Credential decisions remain the main daily review flow.',
        tone: 'info' as const,
    },
    {
        label: 'Catalog quality',
        value: 'Healthy',
        detail: 'Food and exercise records only show minor cleanup items.',
        tone: 'success' as const,
    },
    {
        label: 'Admin alerts',
        value: 'Routed',
        detail: 'Unread notices are visible and ready for follow-up.',
        tone: 'success' as const,
    },
];

const recentActions = [
    {
        action: 'Reviewed verification',
        actor: 'Maya Admin',
        target: 'Verification #188',
        time: '8 min ago',
        summary: 'Approved after license and expiry review.',
    },
    {
        action: 'Sent notification',
        actor: 'System Admin',
        target: 'Safety rule update notice',
        time: '24 min ago',
        summary: 'Sent to admins watching AI review.',
    },
    {
        action: 'Updated user',
        actor: 'Maya Admin',
        target: 'User #3912',
        time: '41 min ago',
        summary: 'Changed account state after review.',
    },
    {
        action: 'Updated place',
        actor: 'Ops Admin',
        target: 'Nutritionist location record',
        time: '1 hr ago',
        summary: 'Validated local directory data.',
    },
    {
        action: 'Updated food',
        actor: 'Catalog Admin',
        target: 'Meal catalog item',
        time: '2 hr ago',
        summary: 'Corrected planner nutrition metadata.',
    },
];

function toneClassName(tone: Tone) {
    return {
        danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
        warning:
            'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
        info: 'border-info/24 bg-info/10 text-foreground',
        success:
            'border-primary/28 bg-primary/10 text-primary dark:text-primary',
    }[tone];
}

export default function AdminOverviewIndex() {
    return (
        <>
            <Head title="Admin Overview" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Overview"
                    description="Daily command center for attention queues, workspace summaries, recent admin activity, and system health."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {stats.map((stat) => (
                                <AdminStatCard
                                    key={stat.label}
                                    label={stat.label}
                                    value={stat.value}
                                    helper={stat.helper}
                                    tone={stat.tone}
                                />
                            ))}
                        </AdminStatsGrid>

                        <AdminSection
                            title="Highest-priority queue"
                            description="Review the items most likely to affect safety, trust, or active user workflows."
                        >
                            <AdminPanel
                                title="Needs admin attention"
                                description="Compact queue summaries only; open diagnostics or logs for technical detail."
                            >
                                <AdminScrollArea maxHeightClassName="max-h-[25rem]">
                                    <div className="space-y-3">
                                        {highestPriorityQueue.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className="block rounded-[22px] border border-border/65 bg-background/72 px-4 py-4 no-underline transition hover:border-primary/25 hover:bg-primary/5"
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                                                    toneClassName(
                                                                        item.tone,
                                                                    ),
                                                                )}
                                                            >
                                                                {item.tone}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.meta}
                                                            </span>
                                                        </div>
                                                        <h3 className="mt-3 text-base font-semibold text-foreground">
                                                            {item.title}
                                                        </h3>
                                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                    <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                                                        Review
                                                        <ArrowRight className="h-4 w-4" />
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </AdminScrollArea>
                            </AdminPanel>
                        </AdminSection>

                        <AdminSection
                            title="Workspace summaries"
                            description="Direct links into the main admin work areas."
                        >
                            <div className="grid gap-4 xl:grid-cols-4">
                                {priorityCards.map((card) => (
                                    <AdminOverviewCard
                                        key={card.title}
                                        title={card.title}
                                        description={card.description}
                                        action={
                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                                <card.icon className="h-4 w-4" />
                                            </span>
                                        }
                                        className="h-full"
                                    >
                                        <div className="space-y-4">
                                            <div className="text-3xl font-semibold tracking-tight text-foreground">
                                                {card.value}
                                            </div>
                                            <div className="space-y-2">
                                                {card.items.map((item) => (
                                                    <div
                                                        key={item.label}
                                                        className="rounded-[18px] border border-border/55 bg-background/70 px-3 py-2.5"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {item.label}
                                                            </span>
                                                            {item.tone ? (
                                                                <span
                                                                    className={cn(
                                                                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                                                        toneClassName(
                                                                            item.tone,
                                                                        ),
                                                                    )}
                                                                >
                                                                    {item.tone}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {item.meta}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button asChild variant="outline">
                                                <Link href={card.href}>
                                                    Open queue
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </AdminOverviewCard>
                                ))}
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Operational health"
                            description="Simple status summaries for the queues and records you manage most often."
                        >
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {healthItems.map((item) => (
                                    <div
                                        key={item.label}
                                        className="dashboard-surface rounded-[24px] px-4 py-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    {item.label}
                                                </div>
                                                <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                                                    {item.value}
                                                </div>
                                            </div>
                                            <span
                                                className={cn(
                                                    'rounded-full border px-2 py-1',
                                                    toneClassName(item.tone),
                                                )}
                                            >
                                                {item.tone === 'success' ? (
                                                    <ShieldCheck className="h-4 w-4" />
                                                ) : (
                                                    <Activity className="h-4 w-4" />
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                            {item.detail}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Recent admin activity"
                            description="A compact action feed for traceability before opening the full audit log."
                        >
                            <AdminPanel
                                title="Latest actions"
                                description="Summarized action names, actors, targets, timing, and plain-language outcome."
                            >
                                <AdminScrollArea maxHeightClassName="max-h-[22rem]">
                                    <AdminDataTable tableClassName="min-w-[860px]">
                                        <ProductTableHead>
                                            <ProductTableRow>
                                                <ProductTableHeaderCell>
                                                    When
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Action
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Actor
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Target
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Summary
                                                </ProductTableHeaderCell>
                                            </ProductTableRow>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {recentActions.map((item) => (
                                                <ProductTableRow
                                                    key={`${item.action}-${item.time}`}
                                                >
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {item.time}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm font-medium text-foreground">
                                                        {item.action}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {item.actor}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {item.target}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {item.summary}
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}
                                        </ProductTableBody>
                                    </AdminDataTable>
                                </AdminScrollArea>
                            </AdminPanel>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
