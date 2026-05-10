import {
    AdminDataTable,
    AdminNotice,
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
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BellRing,
    ClipboardCheck,
    HeartPulse,
    Settings2,
    ShieldCheck,
    Sparkles,
    UserCheck,
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
        helper: 'Accounts available through People.',
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
        helper: 'Messages and interventions in Communications.',
    },
    {
        label: 'AI warnings',
        value: 6,
        helper: 'Planner and coach safety items in AI Review.',
    },
    {
        label: 'Recent admin actions',
        value: 31,
        helper: 'Audit entries available in Logs & Diagnostics.',
    },
];

const highestPriorityQueue: QueueItem[] = [
    {
        id: 'ai-flag-4029',
        title: 'Allergy conflict flagged in generated plan',
        description:
            'Planner safety audit flagged a nut-allergy conflict in a sampled meal plan. Keep raw prompt traces in diagnostics.',
        meta: 'AI safety - User #4029 - 12 min ago',
        tone: 'danger',
        href: '/admin/ai-review',
    },
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
        id: 'planner-fail-184',
        title: 'Planner run failed after schema validation',
        description:
            'The user-facing fallback was served; investigate summarized failure context before restarting the run.',
        meta: 'Planner audit #184 - 31 min ago',
        tone: 'warning',
        href: '/admin/ai-review',
    },
    {
        id: 'support-77',
        title: 'Risky profile issue needs review',
        description:
            'Client reported conflicting coach guidance after a back-injury update. Review profile safety state first.',
        meta: 'People safety - Coach context',
        tone: 'info',
        href: '/admin/people',
    },
];

const priorityCards: PriorityCard[] = [
    {
        title: 'People',
        value: '248',
        description:
            'Users, professionals, safety profiles, and assignments in one workspace.',
        icon: UserCheck,
        href: '/admin/people',
        items: [
            { label: '12 users need account review', meta: 'People tab' },
            { label: '6 safety profiles need review', meta: 'Safety tab' },
            { label: '4 assignment matches pending', meta: 'Assignments tab' },
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
        title: 'Health Data',
        value: '4',
        description:
            'Catalog and history correction workflows that affect AI context.',
        icon: HeartPulse,
        href: '/admin/health-data',
        items: [
            { label: 'Foods catalog', meta: 'Macros and allergens' },
            { label: 'Meal logs', meta: 'Corrections and AI context' },
            { label: 'Exercises and progress', meta: 'Safety and trends' },
        ],
    },
    {
        title: 'AI Review',
        value: '6',
        description:
            'Planner, coach, and safety warning queues without raw payloads first.',
        icon: Sparkles,
        href: '/admin/ai-review',
        items: [
            {
                label: '4 unsafe coach/planner flags',
                meta: 'Review before diagnostics',
                tone: 'danger',
            },
            { label: '2 failed planner runs', meta: 'Fallback served' },
            { label: '1 context mismatch warning', meta: 'Coach review' },
        ],
    },
];

const healthItems = [
    {
        label: 'Planner API',
        value: 'Degraded',
        detail: '2 failed runs; fallback responses available.',
        tone: 'warning' as const,
    },
    {
        label: 'Coach safety',
        value: 'Watching',
        detail: 'Unsafe flags remain below intervention threshold.',
        tone: 'info' as const,
    },
    {
        label: 'Queues',
        value: 'Open',
        detail: 'Verification and AI review queues are the current bottleneck.',
        tone: 'warning' as const,
    },
    {
        label: 'Admin alerts',
        value: 'Healthy',
        detail: 'Unread messages are visible and routed.',
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
                        <AdminStatsGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                            description="Equal cards for People, Verifications, Health Data, and AI Review."
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
                            description="Health summaries for admin triage, not raw debugging output."
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
                                                ) : item.tone === 'warning' ? (
                                                    <AlertTriangle className="h-4 w-4" />
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
                                        <thead>
                                            <tr>
                                                <th>When</th>
                                                <th>Action</th>
                                                <th>Actor</th>
                                                <th>Target</th>
                                                <th>Summary</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentActions.map((item) => (
                                                <tr
                                                    key={`${item.action}-${item.time}`}
                                                >
                                                    <td className="text-sm text-muted-foreground">
                                                        {item.time}
                                                    </td>
                                                    <td className="text-sm font-medium text-foreground">
                                                        {item.action}
                                                    </td>
                                                    <td className="text-sm text-muted-foreground">
                                                        {item.actor}
                                                    </td>
                                                    <td className="text-sm text-muted-foreground">
                                                        {item.target}
                                                    </td>
                                                    <td className="text-sm text-muted-foreground">
                                                        {item.summary}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </AdminDataTable>
                                </AdminScrollArea>
                            </AdminPanel>
                        </AdminSection>

                        <AdminSection
                            title="Diagnostics entry point"
                            description="Open technical investigation surfaces only when the summarized signals need deeper evidence."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <AdminNotice tone="info">
                                    Debugging details are intentionally kept out
                                    of the command center. Use diagnostics for
                                    prompt traces, failed jobs, runtime errors,
                                    and request IDs.
                                </AdminNotice>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Button asChild variant="outline">
                                        <Link href="/admin/logs-diagnostics">
                                            <Settings2 className="h-4 w-4" />
                                            Logs & Diagnostics
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/admin/logs-diagnostics">
                                            <ClipboardCheck className="h-4 w-4" />
                                            Audit logs
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/admin/communications">
                                            <BellRing className="h-4 w-4" />
                                            Admin alerts
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/admin/ai-review">
                                            <Sparkles className="h-4 w-4" />
                                            AI Review
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
