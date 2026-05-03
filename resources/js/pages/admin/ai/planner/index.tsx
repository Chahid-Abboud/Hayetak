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
    AdminToggleGroup,
} from '@/components/admin/admin-ui';
import {
    AdminSplitView,
    EntityDetailDrawer,
    RiskBannerStack,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ClipboardCheck,
    ExternalLink,
    RefreshCcw,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type PlannerStatus = 'success' | 'failed' | 'blocked' | 'regenerated';
type SchemaState = 'valid' | 'invalid' | 'warning';
type ReviewState = 'needs_review' | 'reviewed' | 'flagged_unsafe';
type DetailTab = 'business' | 'technical';

type PlannerRun = {
    id: string;
    user: { id: number; name: string; email: string };
    status: PlannerStatus;
    schema: SchemaState;
    review: ReviewState;
    dietType: string;
    allergies: string[];
    injuries: string[];
    medical: string[];
    safetyBlocks: string[];
    warnings: string[];
    generatedSummary: {
        horizon: string;
        calories: string;
        workouts: string;
        meals: string;
        result: string;
    };
    versionDiff: string[];
    regenerationHistory: Array<{
        id: string;
        when: string;
        actor: string;
        reason: string;
        outcome: string;
    }>;
    technical: {
        promptVersion: string;
        schemaVersion: string;
        model: string;
        provider: string;
        schemaErrors: string[];
        modelOutputSummary: string;
        toolTraceSummary: string;
        diagnosticsHref: string;
    };
    createdAt: string;
    duration: string;
};

const initialRuns: PlannerRun[] = [
    {
        id: 'RUN-1842',
        user: { id: 148, name: 'Nour Haddad', email: 'nour@example.com' },
        status: 'blocked',
        schema: 'valid',
        review: 'needs_review',
        dietType: 'Mediterranean, low lactose',
        allergies: ['peanuts', 'shellfish'],
        injuries: ['knee pain'],
        medical: ['mild hypertension'],
        safetyBlocks: ['blocked jump squats', 'blocked peanut-based snacks'],
        warnings: [
            'Workout intensity may be high for knee history.',
            'One meal alternative needs allergen tag confirmation.',
        ],
        generatedSummary: {
            horizon: '14 days',
            calories: '1,850 kcal target',
            workouts: '4 days/week, low-impact lower body swaps',
            meals: '3 meals + 1 snack, shellfish excluded',
            result: 'Plan withheld pending admin review.',
        },
        versionDiff: [
            'v3 added low-impact substitutions for lower body days.',
            'v4 removed peanut snack template and added dairy-light breakfast.',
        ],
        regenerationHistory: [
            {
                id: 'regen-1842-2',
                when: 'Today, 10:12',
                actor: 'AI Ops',
                reason: 'Regenerated after allergy warning.',
                outcome: 'Schema valid, safety review still required.',
            },
            {
                id: 'regen-1842-1',
                when: 'Today, 09:48',
                actor: 'System',
                reason: 'Initial signup planner run.',
                outcome: 'Safety block triggered.',
            },
        ],
        technical: {
            promptVersion: 'planner-v4.3',
            schemaVersion: 'plan-json-v4',
            model: 'gpt-4.1',
            provider: 'openai',
            schemaErrors: [],
            modelOutputSummary:
                'Structured output passed validation. Safety validator blocked release because generated lower-body work still needs review.',
            toolTraceSummary:
                'Food and exercise filters ran successfully. Injury substitute lookup returned three alternatives.',
            diagnosticsHref: '/admin/diagnostics',
        },
        createdAt: 'Today, 10:12',
        duration: '18.4s',
    },
    {
        id: 'RUN-1839',
        user: { id: 92, name: 'Karim Mansour', email: 'karim@example.com' },
        status: 'failed',
        schema: 'invalid',
        review: 'flagged_unsafe',
        dietType: 'Vegetarian',
        allergies: ['sesame'],
        injuries: [],
        medical: ['none recorded'],
        safetyBlocks: ['blocked tahini ingredient'],
        warnings: ['Schema error in day 6 dinner item.', 'Unsafe ingredient conflict found.'],
        generatedSummary: {
            horizon: '21 days',
            calories: '2,150 kcal target',
            workouts: '3 days/week, gym equipment',
            meals: 'Vegetarian template with one unsafe conflict',
            result: 'Failed run. No plan released.',
        },
        versionDiff: [
            'v2 used imported food catalog tags.',
            'v3 added vegetarian substitutions but retained sesame conflict.',
        ],
        regenerationHistory: [
            {
                id: 'regen-1839-1',
                when: 'Yesterday, 17:35',
                actor: 'Clinical Review',
                reason: 'Manual regeneration after user support case.',
                outcome: 'Failed schema and safety checks.',
            },
        ],
        technical: {
            promptVersion: 'planner-v4.2',
            schemaVersion: 'plan-json-v4',
            model: 'gpt-4.1',
            provider: 'openai',
            schemaErrors: ['nutrition.days[5].dinner.items[1].servings is missing'],
            modelOutputSummary:
                'Model output was parseable but failed strict schema validation and safety filter.',
            toolTraceSummary:
                'Food filter returned sesame conflict. Recipe substitution retry did not clear the blocked ingredient.',
            diagnosticsHref: '/admin/diagnostics',
        },
        createdAt: 'Yesterday, 17:35',
        duration: '24.1s',
    },
    {
        id: 'RUN-1834',
        user: { id: 64, name: 'Lara Khoury', email: 'lara@example.com' },
        status: 'success',
        schema: 'valid',
        review: 'reviewed',
        dietType: 'Balanced',
        allergies: [],
        injuries: ['shoulder impingement'],
        medical: ['postpartum return to training'],
        safetyBlocks: ['blocked overhead press'],
        warnings: ['Review upper-body volume if pain increases.'],
        generatedSummary: {
            horizon: '14 days',
            calories: '1,700 kcal target',
            workouts: '3 home workouts/week, no overhead loading',
            meals: 'Balanced meals with quick prep options',
            result: 'Released after review.',
        },
        versionDiff: [
            'v1 generated gym plan.',
            'v2 shifted to home equipment and blocked overhead press.',
        ],
        regenerationHistory: [
            {
                id: 'regen-1834-1',
                when: 'Apr 29, 11:04',
                actor: 'Support Ops',
                reason: 'User changed training location to home.',
                outcome: 'Valid plan released.',
            },
        ],
        technical: {
            promptVersion: 'planner-v4.3',
            schemaVersion: 'plan-json-v4',
            model: 'gpt-4.1',
            provider: 'openai',
            schemaErrors: [],
            modelOutputSummary:
                'Structured JSON matched schema and safety constraints.',
            toolTraceSummary:
                'Exercise alternatives resolved for shoulder restriction and home equipment.',
            diagnosticsHref: '/admin/diagnostics',
        },
        createdAt: 'Apr 29, 11:04',
        duration: '16.8s',
    },
    {
        id: 'RUN-1826',
        user: { id: 33, name: 'Samir Nassar', email: 'samir@example.com' },
        status: 'regenerated',
        schema: 'warning',
        review: 'needs_review',
        dietType: 'High protein',
        allergies: ['tree nuts'],
        injuries: [],
        medical: ['borderline cholesterol'],
        safetyBlocks: ['blocked almond snack'],
        warnings: ['Macro split changed by more than 12% from previous version.'],
        generatedSummary: {
            horizon: '28 days',
            calories: '2,300 kcal target',
            workouts: '5 days/week progressive strength',
            meals: 'High-protein plan with nut-free substitutions',
            result: 'Regenerated and waiting for review.',
        },
        versionDiff: [
            'v4 lowered saturated fat target.',
            'v5 replaced almond snack and adjusted daily protein.',
        ],
        regenerationHistory: [
            {
                id: 'regen-1826-2',
                when: 'Apr 28, 15:10',
                actor: 'AI Ops',
                reason: 'Nut-free substitution required.',
                outcome: 'Generated with macro warning.',
            },
            {
                id: 'regen-1826-1',
                when: 'Apr 28, 14:41',
                actor: 'System',
                reason: 'Initial profile completion.',
                outcome: 'Generated with blocked food item.',
            },
        ],
        technical: {
            promptVersion: 'planner-v4.3',
            schemaVersion: 'plan-json-v4',
            model: 'self-hosted fallback',
            provider: 'ollama',
            schemaErrors: ['warning: macro delta threshold exceeded'],
            modelOutputSummary:
                'Output matched required fields but quality validator flagged a large macro delta.',
            toolTraceSummary:
                'Fallback provider used after timeout. Food substitution tool returned nut-free options.',
            diagnosticsHref: '/admin/diagnostics',
        },
        createdAt: 'Apr 28, 15:10',
        duration: '41.7s',
    },
];

const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'regenerated', label: 'Regenerated' },
];

const schemaOptions = [
    { value: 'all', label: 'All schema states' },
    { value: 'valid', label: 'Valid' },
    { value: 'invalid', label: 'Invalid' },
    { value: 'warning', label: 'Warning' },
];

function statusLabel(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function schemaTone(schema: SchemaState) {
    return schema === 'valid'
        ? 'success'
        : schema === 'warning'
          ? 'warning'
          : 'danger';
}

function PlannerRunDetail({
    run,
    tab,
    onTabChange,
    onOpenTechnical,
}: {
    run: PlannerRun | null;
    tab: DetailTab;
    onTabChange: (tab: DetailTab) => void;
    onOpenTechnical: () => void;
}) {
    if (!run) {
        return (
            <AdminPanel title="Selected run" description="Pick a planner run to inspect.">
                <AdminNotice tone="info">No planner run selected.</AdminNotice>
            </AdminPanel>
        );
    }

    return (
        <AdminPanel
            title="Selected run detail"
            description="Business outcome and safety context come first. Technical details are isolated behind the tab."
        >
            <div className="space-y-4">
                <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="haye-kicker">{run.id}</div>
                            <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                                {run.user.name}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {run.user.email} | Generated {run.createdAt} | {run.duration}
                            </p>
                        </div>
                        <StatusChipSet
                            items={[
                                { value: run.status, label: statusLabel(run.status) },
                                {
                                    value: schemaTone(run.schema),
                                    label: `Schema ${statusLabel(run.schema)}`,
                                },
                            ]}
                        />
                    </div>
                </div>

                <AdminToggleGroup
                    label="Detail view"
                    value={tab}
                    onChange={(value) => onTabChange(value as DetailTab)}
                    options={[
                        { value: 'business', label: 'Business result' },
                        { value: 'technical', label: 'Technical details' },
                    ]}
                />

                {tab === 'business' ? (
                    <div className="space-y-4">
                        <RiskBannerStack
                            items={[
                                ...(run.status === 'failed' || run.review === 'flagged_unsafe'
                                    ? [
                                          {
                                              severity: 'danger' as const,
                                              title: 'Plan not safe to release',
                                              description:
                                                  'Review safety blocks, schema state, and user restrictions before regenerating or marking reviewed.',
                                              meta: run.id,
                                          },
                                      ]
                                    : []),
                                ...(run.warnings.length > 0
                                    ? [
                                          {
                                              severity: 'warning' as const,
                                              title: 'Planner warnings present',
                                              description: run.warnings.join(' '),
                                              meta: `${run.warnings.length} warning(s)`,
                                          },
                                      ]
                                    : []),
                            ]}
                        />

                        <AdminPanel title="Generated plan summary" className="bg-background/42">
                            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                {Object.entries(run.generatedSummary).map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5"
                                    >
                                        <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                            {key.replace(/_/g, ' ')}
                                        </dt>
                                        <dd className="mt-1 font-medium text-foreground">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </AdminPanel>

                        <AdminPanel
                            title="User constraints"
                            description="Restrictions that planner and coach must respect."
                            className="bg-background/42"
                        >
                            <div className="grid gap-3">
                                <ConstraintRow label="Diet type" values={[run.dietType]} />
                                <ConstraintRow label="Allergies" values={run.allergies} />
                                <ConstraintRow label="Injuries" values={run.injuries} />
                                <ConstraintRow label="Medical signals" values={run.medical} />
                                <ConstraintRow label="Safety blocks" values={run.safetyBlocks} danger />
                            </div>
                        </AdminPanel>

                        <AdminPanel title="Version diff" className="bg-background/42">
                            <div className="space-y-2">
                                {run.versionDiff.map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5 text-sm leading-6 text-muted-foreground"
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </AdminPanel>

                        <AdminPanel
                            title="Regeneration history"
                            description="Readable retry history before any raw traces."
                            className="bg-background/42"
                        >
                            <AdminScrollArea maxHeightClassName="max-h-[16rem]">
                                <div className="space-y-3">
                                    {run.regenerationHistory.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="rounded-[20px] border border-border/60 bg-background/70 px-3 py-3"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="font-medium text-foreground">
                                                    {entry.reason}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {entry.when}
                                                </div>
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {entry.actor} | {entry.outcome}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AdminScrollArea>
                        </AdminPanel>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AdminNotice tone="info">
                            Raw prompts, model output, schema errors, and tool traces are summarized here. Open diagnostics for full payloads.
                        </AdminNotice>
                        <AdminPanel title="Technical summary" className="bg-background/42">
                            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                <TechRow label="Provider" value={run.technical.provider} />
                                <TechRow label="Model" value={run.technical.model} />
                                <TechRow label="Prompt version" value={run.technical.promptVersion} />
                                <TechRow label="Schema version" value={run.technical.schemaVersion} />
                            </dl>
                        </AdminPanel>
                        <AdminPanel title="Schema and tool summaries" className="bg-background/42">
                            <div className="space-y-3">
                                <ReadableSummary
                                    label="Schema errors"
                                    value={
                                        run.technical.schemaErrors.length > 0
                                            ? run.technical.schemaErrors.join('; ')
                                            : 'No schema errors.'
                                    }
                                />
                                <ReadableSummary
                                    label="Model output summary"
                                    value={run.technical.modelOutputSummary}
                                />
                                <ReadableSummary
                                    label="Tool trace summary"
                                    value={run.technical.toolTraceSummary}
                                />
                            </div>
                        </AdminPanel>
                        <Button type="button" variant="outline" onClick={onOpenTechnical}>
                            <ExternalLink className="h-4 w-4" />
                            Open technical drawer
                        </Button>
                    </div>
                )}
            </div>
        </AdminPanel>
    );
}

function ConstraintRow({
    label,
    values,
    danger = false,
}: {
    label: string;
    values: string[];
    danger?: boolean;
}) {
    return (
        <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5">
            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {(values.length > 0 ? values : ['None recorded']).map((value) => (
                    <Badge
                        key={value}
                        variant="outline"
                        className={cn(
                            'rounded-full px-2.5 py-1',
                            danger && 'border-destructive/35 bg-destructive/10',
                        )}
                    >
                        {value}
                    </Badge>
                ))}
            </div>
        </div>
    );
}

function TechRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5">
            <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="mt-1 font-medium text-foreground">{value}</dd>
        </div>
    );
}

function ReadableSummary({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5">
            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                {value}
            </div>
        </div>
    );
}

export default function AdminAiPlannerOperationsPage() {
    const [runs, setRuns] = useState<PlannerRun[]>(initialRuns);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [schema, setSchema] = useState('all');
    const [review, setReview] = useState('all');
    const [selectedId, setSelectedId] = useState(initialRuns[0].id);
    const [detailTab, setDetailTab] = useState<DetailTab>('business');
    const [technicalOpen, setTechnicalOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const selectedRun =
        runs.find((run) => run.id === selectedId) ?? runs[0] ?? null;

    const stats = useMemo(
        () => ({
            total: runs.length,
            failed: runs.filter((run) => run.status === 'failed').length,
            blocked: runs.filter((run) => run.status === 'blocked').length,
            invalid: runs.filter((run) => run.schema === 'invalid').length,
            warnings: runs.reduce((sum, run) => sum + run.warnings.length, 0),
        }),
        [runs],
    );

    const filteredRuns = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return runs.filter((run) => {
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    run.id,
                    run.user.name,
                    run.user.email,
                    run.dietType,
                    run.allergies.join(' '),
                    run.injuries.join(' '),
                    run.generatedSummary.result,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);

            return (
                matchesQuery &&
                (status === 'all' || run.status === status) &&
                (schema === 'all' || run.schema === schema) &&
                (review === 'all' || run.review === review)
            );
        });
    }, [query, review, runs, schema, status]);

    function updateSelectedRun(
        updater: (run: PlannerRun) => PlannerRun,
        confirmation: string,
    ) {
        setRuns((current) =>
            current.map((run) => (run.id === selectedId ? updater(run) : run)),
        );
        setMessage(confirmation);
    }

    function markReviewed() {
        updateSelectedRun(
            (run) => ({ ...run, review: 'reviewed' }),
            'Planner run marked reviewed.',
        );
    }

    function flagUnsafe() {
        updateSelectedRun(
            (run) => ({ ...run, review: 'flagged_unsafe', status: 'blocked' }),
            'Planner run flagged unsafe and held from release.',
        );
    }

    function regenerate() {
        updateSelectedRun(
            (run) => ({
                ...run,
                status: 'regenerated',
                review: 'needs_review',
                regenerationHistory: [
                    {
                        id: `${run.id}-manual-${Date.now()}`,
                        when: 'Just now',
                        actor: 'Current admin',
                        reason: 'Manual regeneration requested from operations page.',
                        outcome: 'Queued for regeneration review.',
                    },
                    ...run.regenerationHistory,
                ],
            }),
            'Regeneration requested for the selected run.',
        );
    }

    const detailPanel = (
        <PlannerRunDetail
            run={selectedRun}
            tab={detailTab}
            onTabChange={setDetailTab}
            onOpenTechnical={() => setTechnicalOpen(true)}
        />
    );

    return (
        <>
            <Head title="Admin AI Planner Operations" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="AI Planner Operations"
                    description="Admin-only inspection workspace for plan generation quality, safety blocks, schema validity, regeneration history, and diagnostics handoff."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Planner runs"
                                value={stats.total}
                                tone="accent"
                                helper="Recent generation attempts in this review queue."
                            />
                            <AdminStatCard
                                label="Failed runs"
                                value={stats.failed}
                                helper="No plan released until regenerated."
                            />
                            <AdminStatCard
                                label="Safety blocks"
                                value={stats.blocked}
                                helper="Runs held because constraints need review."
                            />
                            <AdminStatCard
                                label="Schema issues"
                                value={stats.invalid}
                                helper="Strict JSON validation failures."
                            />
                            <AdminStatCard
                                label="Warnings"
                                value={stats.warnings}
                                helper="Quality warnings across visible runs."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Planner health guidance"
                            description="Review business results before technical traces. Allergies, diet type, injuries, and safety blocks decide whether a plan can be trusted."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminOverviewCard
                                    title="Safety before release"
                                    description="Blocked foods, unsafe exercises, and medical constraints must be visible before any regeneration action."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Business outcome appears before raw JSON.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Schema is necessary, not enough"
                                    description="A valid schema can still contain unsafe or low-quality recommendations."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Review warnings and version diff before approving.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Keep traces separate"
                                    description="Raw prompts, model output, schema errors, and tool traces stay in the technical tab or diagnostics."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Normal review stays readable.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Planner run queue"
                            description="Filter generation attempts, inspect one run, and keep review actions attached to the selected context."
                        >
                            <div className="space-y-4">
                                {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}

                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField label="Search" className="min-w-[220px] flex-1">
                                            <AdminSearchInput
                                                value={query}
                                                placeholder="Find user, run, allergy, injury, or result"
                                                onChange={(event) => setQuery(event.target.value)}
                                            />
                                        </AdminField>
                                        <AdminField label="Status" className="min-w-[160px]">
                                            <AdminNativeSelect
                                                value={status}
                                                onChange={(event) => setStatus(event.target.value)}
                                            >
                                                {statusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField label="Schema" className="min-w-[170px]">
                                            <AdminNativeSelect
                                                value={schema}
                                                onChange={(event) => setSchema(event.target.value)}
                                            >
                                                {schemaOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField label="Review" className="min-w-[180px]">
                                            <AdminNativeSelect
                                                value={review}
                                                onChange={(event) => setReview(event.target.value)}
                                            >
                                                <option value="all">All review states</option>
                                                <option value="needs_review">Needs review</option>
                                                <option value="reviewed">Reviewed</option>
                                                <option value="flagged_unsafe">Flagged unsafe</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                    </AdminToolbarGroup>
                                    <AdminToolbarGroup className="xl:w-auto xl:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setQuery('');
                                                setStatus('all');
                                                setSchema('all');
                                                setReview('all');
                                            }}
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>

                                <AdminSplitView
                                    list={
                                        <AdminPanel
                                            title="Generation queue"
                                            description="Scrollable list of planner runs with safety and schema state."
                                        >
                                            <AdminScrollArea maxHeightClassName="max-h-[38rem]">
                                                <AdminDataTable tableClassName="min-w-[980px]">
                                                    <ProductTableHead>
                                                        <ProductTableRow>
                                                            <ProductTableHeaderCell>Run</ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>User</ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>Status</ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>Schema</ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>Constraints</ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>Warnings</ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>Generated</ProductTableHeaderCell>
                                                        </ProductTableRow>
                                                    </ProductTableHead>
                                                    <ProductTableBody>
                                                        {filteredRuns.map((run) => {
                                                            const selected = run.id === selectedId;

                                                            return (
                                                                <ProductTableRow
                                                                    key={run.id}
                                                                    interactive
                                                                    className={cn(selected && 'bg-primary/8')}
                                                                >
                                                                    <ProductTableCell>
                                                                        <button
                                                                            type="button"
                                                                            className="min-w-[150px] text-left"
                                                                            onClick={() => {
                                                                                setSelectedId(run.id);
                                                                                setDetailTab('business');
                                                                                setMessage(null);
                                                                            }}
                                                                        >
                                                                            <span className="block font-semibold text-foreground">
                                                                                {run.id}
                                                                            </span>
                                                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                                                {run.duration}
                                                                            </span>
                                                                        </button>
                                                                    </ProductTableCell>
                                                                    <ProductTableCell>
                                                                        <div className="font-medium text-foreground">{run.user.name}</div>
                                                                        <div className="text-xs text-muted-foreground">{run.user.email}</div>
                                                                    </ProductTableCell>
                                                                    <ProductTableCell>
                                                                        <StatusChipSet
                                                                            items={[
                                                                                { value: run.status, label: statusLabel(run.status) },
                                                                                { value: run.review, label: statusLabel(run.review) },
                                                                            ]}
                                                                        />
                                                                    </ProductTableCell>
                                                                    <ProductTableCell>
                                                                        <StatusChipSet
                                                                            items={[
                                                                                {
                                                                                    value: schemaTone(run.schema),
                                                                                    label: statusLabel(run.schema),
                                                                                },
                                                                            ]}
                                                                        />
                                                                    </ProductTableCell>
                                                                    <ProductTableCell>
                                                                        <div className="text-sm text-foreground">{run.dietType}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {run.allergies.length} allergies | {run.injuries.length} injuries
                                                                        </div>
                                                                    </ProductTableCell>
                                                                    <ProductTableCell>
                                                                        <div
                                                                            className={cn(
                                                                                'text-sm',
                                                                                run.warnings.length > 0
                                                                                    ? 'font-medium text-amber-700 dark:text-amber-200'
                                                                                    : 'text-muted-foreground',
                                                                            )}
                                                                        >
                                                                            {run.warnings.length} warning(s)
                                                                        </div>
                                                                    </ProductTableCell>
                                                                    <ProductTableCell>{run.createdAt}</ProductTableCell>
                                                                </ProductTableRow>
                                                            );
                                                        })}
                                                        {filteredRuns.length === 0 ? (
                                                            <ProductTableEmptyRow
                                                                colSpan={7}
                                                                title="No planner runs match these filters"
                                                                description="Search by user, restriction, status, schema state, or generated result."
                                                            />
                                                        ) : null}
                                                    </ProductTableBody>
                                                </AdminDataTable>
                                            </AdminScrollArea>
                                        </AdminPanel>
                                    }
                                    detail={detailPanel}
                                />

                                <AdminStickyBar
                                    summary={
                                        selectedRun
                                            ? `Selected ${selectedRun.id}: ${selectedRun.user.name}`
                                            : 'Select a planner run to use actions.'
                                    }
                                >
                                    <Button type="button" variant="outline" onClick={regenerate} disabled={!selectedRun}>
                                        <RotateCcw className="h-4 w-4" />
                                        Regenerate
                                    </Button>
                                    <Button type="button" variant="outline" onClick={markReviewed} disabled={!selectedRun}>
                                        <ShieldCheck className="h-4 w-4" />
                                        Mark reviewed
                                    </Button>
                                    <Button type="button" variant="destructive" onClick={flagUnsafe} disabled={!selectedRun}>
                                        <ShieldAlert className="h-4 w-4" />
                                        Flag unsafe
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/admin/diagnostics">
                                            <ExternalLink className="h-4 w-4" />
                                            Open diagnostics
                                        </Link>
                                    </Button>
                                </AdminStickyBar>

                                <div className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Raw prompts, model output, schema errors, and traces are intentionally kept in the technical tab or diagnostics.
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

                <EntityDetailDrawer
                    open={technicalOpen}
                    onOpenChange={setTechnicalOpen}
                    title="Planner technical details"
                    description={
                        selectedRun
                            ? `${selectedRun.id} technical summary`
                            : 'No planner run selected.'
                    }
                    footer={
                        <Button type="button" variant="outline" onClick={() => setTechnicalOpen(false)}>
                            Close
                        </Button>
                    }
                >
                    {selectedRun ? (
                        <div className="space-y-4">
                            <AdminPanel
                                title="Raw data boundary"
                                description="This drawer summarizes technical signals without displaying full raw prompts or model payloads."
                            >
                                <div className="space-y-3">
                                    <ReadableSummary
                                        label="Model output"
                                        value={selectedRun.technical.modelOutputSummary}
                                    />
                                    <ReadableSummary
                                        label="Schema errors"
                                        value={
                                            selectedRun.technical.schemaErrors.length > 0
                                                ? selectedRun.technical.schemaErrors.join('; ')
                                                : 'No schema errors.'
                                        }
                                    />
                                    <ReadableSummary
                                        label="Tool traces"
                                        value={selectedRun.technical.toolTraceSummary}
                                    />
                                </div>
                            </AdminPanel>
                            <Button asChild variant="outline">
                                <Link href={selectedRun.technical.diagnosticsHref}>
                                    <ExternalLink className="h-4 w-4" />
                                    Open diagnostics
                                </Link>
                            </Button>
                        </div>
                    ) : null}
                </EntityDetailDrawer>
            </RoleGuard>
        </>
    );
}
