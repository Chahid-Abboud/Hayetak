import {
    AdminDataTable,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminToolbar,
    AdminToolbarGroup,
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
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    ExternalLink,
    Pause,
    Play,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type RolloutStatus =
    | 'monitoring'
    | 'ready'
    | 'blocked'
    | 'paused'
    | 'draft';

type Rollout = {
    id: string;
    name: string;
    surface: 'Planner' | 'Coach' | 'Safety' | 'Runtime';
    status: RolloutStatus;
    stage: string;
    audience: string;
    owner: string;
    risk: 'Low' | 'Medium' | 'High';
    updated: string;
    gateSummary: string;
    diagnostics: string;
    nextAction: string;
    health: Array<{ label: string; value: string; tone?: 'good' | 'warn' }>;
    checks: Array<{ label: string; state: 'passed' | 'watch' | 'blocked' }>;
    notes: string[];
};

const rollouts: Rollout[] = [
    {
        id: 'planner-json-v4',
        name: 'Planner JSON schema v4',
        surface: 'Planner',
        status: 'monitoring',
        stage: '10% signup traffic',
        audience: 'New clients with complete profile data',
        owner: 'AI Ops',
        risk: 'High',
        updated: '14 min ago',
        gateSummary: 'Safety validator passing; recipe variety watch remains open.',
        diagnostics: 'Planner audit run #184',
        nextAction: 'Hold at current stage until variety watch clears.',
        health: [
            { label: 'Schema pass', value: '99.2%', tone: 'good' },
            { label: 'Safety flags', value: '0 critical', tone: 'good' },
            { label: 'Fallback rate', value: '3.1%', tone: 'warn' },
        ],
        checks: [
            { label: 'Allergy exclusions', state: 'passed' },
            { label: 'Injury-safe exercise swaps', state: 'passed' },
            { label: 'Food catalog variety', state: 'watch' },
        ],
        notes: [
            'No blocked allergens in sampled plans.',
            'Fallbacks increased after imported profile batch.',
            'Keep detailed prompt traces in diagnostics.',
        ],
    },
    {
        id: 'coach-tools-context',
        name: 'Coach tool context refresh',
        surface: 'Coach',
        status: 'ready',
        stage: 'Staged for 25%',
        audience: 'Returning clients with meal logs',
        owner: 'Coach Safety',
        risk: 'Medium',
        updated: '38 min ago',
        gateSummary: 'Last 7 days summary and today macros tools are stable.',
        diagnostics: 'Structured chatbot audit #62',
        nextAction: 'Promote to 25% after admin confirmation.',
        health: [
            { label: 'Tool success', value: '98.8%', tone: 'good' },
            { label: 'Unsafe replies', value: '0', tone: 'good' },
            { label: 'Latency p95', value: '2.4s', tone: 'good' },
        ],
        checks: [
            { label: 'Meal history retrieval', state: 'passed' },
            { label: 'Diet restriction filter', state: 'passed' },
            { label: 'Escalation wording', state: 'passed' },
        ],
        notes: [
            'Answers reference today and seven-day intake when relevant.',
            'Recipe suggestions respect user ingredients and restrictions.',
            'Promotion can proceed during low support volume.',
        ],
    },
    {
        id: 'ollama-runtime-pool',
        name: 'Self-hosted runtime pool',
        surface: 'Runtime',
        status: 'blocked',
        stage: 'Internal only',
        audience: 'Admins and seeded audit users',
        owner: 'Platform',
        risk: 'High',
        updated: '1 hr ago',
        gateSummary: 'GPU load normalization is stable; timeout spike blocks promotion.',
        diagnostics: 'Runtime diagnostics window',
        nextAction: 'Resolve timeout spike before user traffic.',
        health: [
            { label: 'Timeouts', value: '7.4%', tone: 'warn' },
            { label: 'Queue depth', value: '18', tone: 'warn' },
            { label: 'Safety parity', value: 'Pass', tone: 'good' },
        ],
        checks: [
            { label: 'Planner parity', state: 'watch' },
            { label: 'Coach parity', state: 'passed' },
            { label: 'Timeout threshold', state: 'blocked' },
        ],
        notes: [
            'Keep traffic internal until runtime retries are tuned.',
            'No raw provider payloads are shown here.',
            'Open diagnostics for request-level traces.',
        ],
    },
    {
        id: 'allergy-rule-tightening',
        name: 'Allergy rule tightening',
        surface: 'Safety',
        status: 'paused',
        stage: 'Draft policy simulation',
        audience: 'Users with allergies or medical constraints',
        owner: 'Clinical Review',
        risk: 'Medium',
        updated: 'Yesterday',
        gateSummary: 'Paused while policy wording is reviewed.',
        diagnostics: 'Safety simulation report',
        nextAction: 'Review simulation notes, then resume draft validation.',
        health: [
            { label: 'Simulation pass', value: '91%', tone: 'warn' },
            { label: 'False blocks', value: '12', tone: 'warn' },
            { label: 'Critical misses', value: '0', tone: 'good' },
        ],
        checks: [
            { label: 'Allergy hard stop', state: 'passed' },
            { label: 'Alternative suggestions', state: 'watch' },
            { label: 'Policy note review', state: 'blocked' },
        ],
        notes: [
            'Draft stays unpublished until wording is approved.',
            'Support cases should link to safety rules, not raw traces.',
            'Clinical reviewer requested clearer alternative labels.',
        ],
    },
];

const statusLabels: Record<RolloutStatus, string> = {
    monitoring: 'Monitoring',
    ready: 'Ready',
    blocked: 'Blocked',
    paused: 'Paused',
    draft: 'Draft',
};

function statusClassName(status: RolloutStatus) {
    return {
        monitoring:
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
        ready: 'border-primary/30 bg-primary/10 text-primary',
        blocked:
            'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
        paused: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
        draft: 'border-border/60 bg-muted/40 text-muted-foreground',
    }[status];
}

function checkIcon(state: 'passed' | 'watch' | 'blocked') {
    if (state === 'passed') {
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }

    if (state === 'blocked') {
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }

    return <Clock3 className="h-4 w-4 text-amber-500" />;
}

export default function AdminAiRolloutsPage() {
    const [query, setQuery] = useState('');
    const [surface, setSurface] = useState('all');
    const [status, setStatus] = useState('all');
    const [selectedId, setSelectedId] = useState(rollouts[0].id);

    const filteredRollouts = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return rollouts.filter((rollout) => {
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    rollout.name,
                    rollout.surface,
                    rollout.stage,
                    rollout.owner,
                    rollout.audience,
                    rollout.gateSummary,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            const matchesSurface =
                surface === 'all' || rollout.surface === surface;
            const matchesStatus =
                status === 'all' || rollout.status === status;

            return matchesQuery && matchesSurface && matchesStatus;
        });
    }, [query, surface, status]);

    const selectedRollout =
        rollouts.find((rollout) => rollout.id === selectedId) ?? rollouts[0];

    const blockedCount = rollouts.filter(
        (rollout) => rollout.status === 'blocked',
    ).length;
    const promotionCount = rollouts.filter(
        (rollout) => rollout.status === 'ready',
    ).length;

    return (
        <>
            <Head title="Admin AI Rollouts" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="AI Rollouts"
                    description="Admin-only command surface for staged planner, coach, safety, and runtime changes with promotion gates, rollback readiness, and compact operational summaries."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Active rollouts"
                                value={rollouts.length}
                                tone="accent"
                                helper="Planner, coach, safety, and runtime tracks."
                            />
                            <AdminStatCard
                                label="Pending promotions"
                                value={promotionCount}
                                helper="Ready for the next staged audience."
                            />
                            <AdminStatCard
                                label="Blocked gates"
                                value={blockedCount}
                                helper="Promotion cannot proceed until resolved."
                            />
                            <AdminStatCard
                                label="Safety coverage"
                                value="100%"
                                helper="All tracks include explicit safety checks."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Review blockers first, then promote only when safety gates and rollback notes are visible."
                        >
                            <div className="grid gap-4 xl:grid-cols-3">
                                <AdminOverviewCard
                                    title="Safety gates first"
                                    description="Planner and coach changes must preserve allergy, diet, medical, and injury constraints before any audience increase."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        <span>
                                            Use the detail panel for compact gate
                                            status. Full traces stay in
                                            diagnostics.
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Promote gradually"
                                    description="Keep owner, audience, and stage visible so admins can see the blast radius before acting."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        <span>
                                            Ready tracks should still show next
                                            action and rollback path.
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Investigate elsewhere"
                                    description="This page summarizes operational state; technical payloads belong in diagnostics and audit logs."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        <span>
                                            Link out to evidence without turning
                                            the workspace into a log viewer.
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Rollout control"
                            description="Filter the queue, inspect one track at a time, and keep action controls close to the selected rollout."
                        >
                            <div className="space-y-4">
                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField
                                            label="Search"
                                            className="min-w-[220px] flex-1"
                                        >
                                            <AdminSearchInput
                                                value={query}
                                                onChange={(event) =>
                                                    setQuery(event.target.value)
                                                }
                                                placeholder="Find rollout, owner, gate, or audience"
                                            />
                                        </AdminField>
                                        <AdminField
                                            label="Surface"
                                            className="min-w-[180px]"
                                        >
                                            <AdminNativeSelect
                                                value={surface}
                                                onChange={(event) =>
                                                    setSurface(
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="all">
                                                    All surfaces
                                                </option>
                                                <option value="Planner">
                                                    Planner
                                                </option>
                                                <option value="Coach">
                                                    Coach
                                                </option>
                                                <option value="Safety">
                                                    Safety
                                                </option>
                                                <option value="Runtime">
                                                    Runtime
                                                </option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField
                                            label="Status"
                                            className="min-w-[180px]"
                                        >
                                            <AdminNativeSelect
                                                value={status}
                                                onChange={(event) =>
                                                    setStatus(event.target.value)
                                                }
                                            >
                                                <option value="all">
                                                    All statuses
                                                </option>
                                                <option value="monitoring">
                                                    Monitoring
                                                </option>
                                                <option value="ready">
                                                    Ready
                                                </option>
                                                <option value="blocked">
                                                    Blocked
                                                </option>
                                                <option value="paused">
                                                    Paused
                                                </option>
                                                <option value="draft">
                                                    Draft
                                                </option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                    </AdminToolbarGroup>
                                    <AdminToolbarGroup className="xl:w-auto xl:justify-end">
                                        <Button type="button" variant="outline">
                                            <Search className="h-4 w-4" />
                                            Refresh
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>

                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
                                    <AdminPanel
                                        title="Rollout queue"
                                        description="Compact operational list with one selected detail context."
                                    >
                                        <AdminScrollArea maxHeightClassName="max-h-[34rem]">
                                            <AdminDataTable tableClassName="min-w-[760px]">
                                                <thead>
                                                    <tr>
                                                        <th>Track</th>
                                                        <th>Stage</th>
                                                        <th>Owner</th>
                                                        <th>Risk</th>
                                                        <th>Gates</th>
                                                        <th>Updated</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRollouts.map(
                                                        (rollout) => (
                                                            <tr
                                                                key={rollout.id}
                                                                className={cn(
                                                                    'cursor-pointer transition hover:bg-primary/5',
                                                                    selectedRollout.id ===
                                                                        rollout.id &&
                                                                        'bg-primary/8',
                                                                )}
                                                                onClick={() =>
                                                                    setSelectedId(
                                                                        rollout.id,
                                                                    )
                                                                }
                                                            >
                                                                <td>
                                                                    <div className="min-w-0">
                                                                        <div className="font-medium text-foreground">
                                                                            {
                                                                                rollout.name
                                                                            }
                                                                        </div>
                                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                                            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                                                {
                                                                                    rollout.surface
                                                                                }
                                                                            </span>
                                                                            <span
                                                                                className={cn(
                                                                                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                                                                    statusClassName(
                                                                                        rollout.status,
                                                                                    ),
                                                                                )}
                                                                            >
                                                                                {
                                                                                    statusLabels[
                                                                                        rollout
                                                                                            .status
                                                                                    ]
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-sm text-muted-foreground">
                                                                    {
                                                                        rollout.stage
                                                                    }
                                                                </td>
                                                                <td className="text-sm text-muted-foreground">
                                                                    {
                                                                        rollout.owner
                                                                    }
                                                                </td>
                                                                <td>
                                                                    <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                                                                        {
                                                                            rollout.risk
                                                                        }
                                                                    </span>
                                                                </td>
                                                                <td className="max-w-[240px] text-sm text-muted-foreground">
                                                                    {
                                                                        rollout.gateSummary
                                                                    }
                                                                </td>
                                                                <td className="text-sm text-muted-foreground">
                                                                    {
                                                                        rollout.updated
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </AdminDataTable>
                                            {filteredRollouts.length === 0 ? (
                                                <div className="mt-4">
                                                    <AdminNotice tone="info">
                                                        No rollouts match the
                                                        current filters.
                                                    </AdminNotice>
                                                </div>
                                            ) : null}
                                        </AdminScrollArea>
                                    </AdminPanel>

                                    <AdminPanel
                                        title="Selected rollout"
                                        description="Readable detail summary for admin decisions."
                                    >
                                        <AdminScrollArea maxHeightClassName="max-h-[34rem]">
                                            <div className="space-y-4">
                                                <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <div className="haye-kicker">
                                                                {
                                                                    selectedRollout.surface
                                                                }
                                                            </div>
                                                            <h3 className="mt-1 text-lg font-semibold text-foreground">
                                                                {
                                                                    selectedRollout.name
                                                                }
                                                            </h3>
                                                        </div>
                                                        <span
                                                            className={cn(
                                                                'rounded-full border px-3 py-1 text-xs font-medium',
                                                                statusClassName(
                                                                    selectedRollout.status,
                                                                ),
                                                            )}
                                                        >
                                                            {
                                                                statusLabels[
                                                                    selectedRollout
                                                                        .status
                                                                ]
                                                            }
                                                        </span>
                                                    </div>
                                                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                                        <div>
                                                            <dt className="text-muted-foreground">
                                                                Audience
                                                            </dt>
                                                            <dd className="mt-1 font-medium text-foreground">
                                                                {
                                                                    selectedRollout.audience
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-muted-foreground">
                                                                Current stage
                                                            </dt>
                                                            <dd className="mt-1 font-medium text-foreground">
                                                                {
                                                                    selectedRollout.stage
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-muted-foreground">
                                                                Owner
                                                            </dt>
                                                            <dd className="mt-1 font-medium text-foreground">
                                                                {
                                                                    selectedRollout.owner
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-muted-foreground">
                                                                Evidence
                                                            </dt>
                                                            <dd className="mt-1 font-medium text-foreground">
                                                                {
                                                                    selectedRollout.diagnostics
                                                                }
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    {selectedRollout.health.map(
                                                        (item) => (
                                                            <div
                                                                key={item.label}
                                                                className="rounded-[20px] border border-border/60 bg-background/70 px-3 py-3"
                                                            >
                                                                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                                    {item.label}
                                                                </div>
                                                                <div
                                                                    className={cn(
                                                                        'mt-1 text-lg font-semibold',
                                                                        item.tone ===
                                                                            'warn'
                                                                            ? 'text-amber-600 dark:text-amber-300'
                                                                            : 'text-foreground',
                                                                    )}
                                                                >
                                                                    {item.value}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-sm font-semibold text-foreground">
                                                        Gate checks
                                                    </div>
                                                    {selectedRollout.checks.map(
                                                        (check) => (
                                                            <div
                                                                key={
                                                                    check.label
                                                                }
                                                                className="flex items-center gap-3 rounded-[18px] border border-border/55 bg-background/68 px-3 py-2.5 text-sm"
                                                            >
                                                                {checkIcon(
                                                                    check.state,
                                                                )}
                                                                <span className="min-w-0 flex-1 text-foreground">
                                                                    {
                                                                        check.label
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-muted-foreground capitalize">
                                                                    {
                                                                        check.state
                                                                    }
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-sm font-semibold text-foreground">
                                                        Operator notes
                                                    </div>
                                                    {selectedRollout.notes.map(
                                                        (note) => (
                                                            <div
                                                                key={note}
                                                                className="rounded-[18px] border border-border/55 bg-background/68 px-3 py-2.5 text-sm leading-6 text-muted-foreground"
                                                            >
                                                                {note}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </AdminScrollArea>
                                    </AdminPanel>
                                </div>

                                <AdminPanel
                                    title="Next action"
                                    description="A decision summary appears below the queue so uneven content does not force a lopsided layout."
                                >
                                    <div className="rounded-[22px] border border-primary/18 bg-primary/8 px-4 py-4 text-sm leading-6 text-foreground">
                                        {selectedRollout.nextAction}
                                    </div>
                                </AdminPanel>

                                <AdminStickyBar
                                    summary={`Selected: ${selectedRollout.name}`}
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            selectedRollout.status === 'blocked'
                                        }
                                    >
                                        <Pause className="h-4 w-4" />
                                        Pause
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={
                                            selectedRollout.status ===
                                                'blocked' ||
                                            selectedRollout.status === 'paused'
                                        }
                                    >
                                        <Play className="h-4 w-4" />
                                        Promote
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Rollback
                                    </Button>
                                </AdminStickyBar>

                                <div className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Audit history and technical traces are
                                        kept outside the normal rollout queue.
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild variant="outline">
                                            <Link href="/admin/logs">
                                                <ClipboardCheck className="h-4 w-4" />
                                                Audit logs
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline">
                                            <Link href="/admin/diagnostics">
                                                <ExternalLink className="h-4 w-4" />
                                                Diagnostics
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
