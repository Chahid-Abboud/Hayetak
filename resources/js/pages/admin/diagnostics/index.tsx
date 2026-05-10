import {
    AdminDataTable,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminToolbar,
    AdminToolbarGroup,
    AdminToggleGroup,
} from '@/components/admin/admin-ui';
import { EntityDetailDrawer, StatusChipSet } from '@/components/admin/admin-workflows';
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
    ClipboardCheck,
    Copy,
    ExternalLink,
    RefreshCcw,
    RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type DiagnosticTab =
    | 'ai'
    | 'jobs'
    | 'api'
    | 'imports'
    | 'system'
    | 'prompts'
    | 'tools';

type Severity = 'critical' | 'error' | 'warning' | 'info';
type Status = 'failed' | 'degraded' | 'retrying' | 'resolved' | 'running';

type DiagnosticLog = {
    id: string;
    tab: DiagnosticTab;
    timestamp: string;
    source: string;
    severity: Severity;
    status: Status;
    requestId: string;
    userId?: number;
    summary: string;
    actionHref: string;
    rawPrompt?: string;
    rawOutput?: string;
    schemaValidation: string[];
    stackTrace: string;
    retries: Array<{ attempt: number; status: string; summary: string; at: string }>;
    latencyMs: number;
    metadata: Record<string, string>;
};

const tabs: Array<{ value: DiagnosticTab; label: string }> = [
    { value: 'ai', label: 'AI' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'api', label: 'API' },
    { value: 'imports', label: 'Imports' },
    { value: 'system', label: 'System Health' },
    { value: 'prompts', label: 'Prompt Traces' },
    { value: 'tools', label: 'Tool Calls' },
];

const logs: DiagnosticLog[] = [
    {
        id: 'diag-ai-884',
        tab: 'ai',
        timestamp: '2026-04-30 10:12:44',
        source: 'planner.generate',
        severity: 'error',
        status: 'failed',
        requestId: 'req_planner_884',
        userId: 148,
        summary:
            'Planner generation failed schema validation after safety filter removed unsafe meal item.',
        actionHref: '/admin/ai/planner',
        rawPrompt:
            'Generate a 14 day workout and nutrition plan. Respect allergies: peanuts, shellfish. Respect injury: knee pain. Return strict JSON matching plan-json-v4.',
        rawOutput:
            '{ "days": [ { "meals": [ { "name": "Breakfast", "items": [] } ], "workout": { "focus": "lower body" } } ], "warnings": ["removed unsafe ingredient"] }',
        schemaValidation: [
            'nutrition.days[3].meals[2].items must contain at least one item',
            'workout.days[5].exercises[1].sets must be integer',
        ],
        stackTrace:
            'App\\Services\\Ai\\PlannerService::validateStructuredOutput\nApp\\Services\\Ai\\PlannerService::generate\nApp\\Http\\Controllers\\Ai\\PlanGenerationController::__invoke',
        retries: [
            {
                attempt: 1,
                status: 'failed',
                summary: 'Original model output included blocked ingredient.',
                at: '10:12:20',
            },
            {
                attempt: 2,
                status: 'failed',
                summary: 'Safety-filtered output no longer satisfied schema.',
                at: '10:12:44',
            },
        ],
        latencyMs: 18420,
        metadata: {
            provider: 'openai',
            model: 'gpt-4.1',
            schema_version: 'plan-json-v4',
            prompt_version: 'planner-v4.3',
        },
    },
    {
        id: 'diag-job-302',
        tab: 'jobs',
        timestamp: '2026-04-30 09:58:03',
        source: 'queue.planner-audit',
        severity: 'warning',
        status: 'retrying',
        requestId: 'job_302',
        summary:
            'Planner audit worker retried after runtime timeout; retry is within configured budget.',
        actionHref: '/admin/ai/planner',
        rawOutput: 'Runtime timeout after 60 seconds while evaluating seeded user batch.',
        schemaValidation: ['No schema validation attempted before timeout.'],
        stackTrace:
            'App\\Jobs\\Ai\\RunPlannerAudit::handle\nIlluminate\\Queue\\CallQueuedHandler::call',
        retries: [
            {
                attempt: 1,
                status: 'timeout',
                summary: 'Self-hosted provider did not respond within budget.',
                at: '09:58:03',
            },
            {
                attempt: 2,
                status: 'queued',
                summary: 'Retry queued with lower GPU load.',
                at: '09:59:10',
            },
        ],
        latencyMs: 60000,
        metadata: {
            queue: 'ai',
            worker: 'hayetak-worker-2',
            gpu_load: 'low',
            audit_run_id: '184',
        },
    },
    {
        id: 'diag-api-219',
        tab: 'api',
        timestamp: '2026-04-30 09:31:12',
        source: 'api.admin.notifications',
        severity: 'info',
        status: 'resolved',
        requestId: 'req_notify_219',
        userId: 1,
        summary:
            'Notification campaign delivered with no failed recipients; diagnostics retained for traceability.',
        actionHref: '/admin/notifications',
        rawOutput: '{ "sent": 42, "failed_user_ids": [] }',
        schemaValidation: ['Response shape matched expected delivery summary.'],
        stackTrace: 'No exception. Request completed successfully.',
        retries: [],
        latencyMs: 312,
        metadata: {
            route: 'POST /api/admin/notifications',
            campaign_type: 'intervention',
            recipient_group: 'Selected users',
        },
    },
    {
        id: 'diag-import-77',
        tab: 'imports',
        timestamp: '2026-04-29 21:06:55',
        source: 'import.users.public-dump',
        severity: 'warning',
        status: 'degraded',
        requestId: 'import_user_148_28',
        userId: 148,
        summary:
            'Imported user profile contained contradictory diet and allergy rows requiring admin safety review.',
        actionHref: '/admin/safety-profiles',
        rawOutput:
            '{ "diet_type": "vegetarian", "allergies": ["shellfish"], "import_file": "PlannerImportedUsers24April_User148_28.json" }',
        schemaValidation: ['Import JSON parsed. Safety normalization produced warning.'],
        stackTrace:
            'Database\\Seeders\\ImportedUsersFromPublicDumpSeeder::run\nApp\\Support\\Ai\\AiContextSyncDispatcher::dispatch',
        retries: [],
        latencyMs: 1430,
        metadata: {
            import_file: 'PlannerImportedUsers24April_User148_28.json',
            normalized_restrictions: 'true',
            safety_review: 'required',
        },
    },
    {
        id: 'diag-system-44',
        tab: 'system',
        timestamp: '2026-04-30 08:44:18',
        source: 'system.health.runtime',
        severity: 'critical',
        status: 'degraded',
        requestId: 'sys_health_44',
        summary:
            'Self-hosted runtime pool reported timeout spike and elevated queue depth.',
        actionHref: '/admin/ai-rollouts',
        rawOutput:
            '{ "queue_depth": 18, "timeout_rate": "7.4%", "provider": "ollama", "gpu_load": "high" }',
        schemaValidation: ['Health payload accepted. Threshold breach detected.'],
        stackTrace: 'RuntimeHealthProbe::snapshot\nFeatureConfigResolver::resolveChatProvider',
        retries: [
            {
                attempt: 1,
                status: 'degraded',
                summary: 'Health probe exceeded timeout threshold.',
                at: '08:44:18',
            },
        ],
        latencyMs: 2400,
        metadata: {
            provider: 'ollama',
            queue_depth: '18',
            timeout_rate: '7.4%',
            threshold: '5%',
        },
    },
    {
        id: 'diag-prompt-612',
        tab: 'prompts',
        timestamp: '2026-04-30 07:58:49',
        source: 'coach.prompt',
        severity: 'warning',
        status: 'resolved',
        requestId: 'req_coach_612',
        userId: 92,
        summary:
            'Coach prompt correctly included sesame allergy; final response used safe alternative wording.',
        actionHref: '/admin/ai/coach',
        rawPrompt:
            'User asks for high protein chickpea snack. Constraints: vegetarian, sesame allergy. Must not recommend tahini or sesame derivatives.',
        rawOutput:
            'Try mashed chickpeas with Greek yogurt, lemon, garlic, and parsley. Avoid tahini because of your sesame allergy.',
        schemaValidation: ['No structured schema required for this coach response.'],
        stackTrace: 'ChatOrchestrator::respond\nChatContextBuilder::build',
        retries: [],
        latencyMs: 1880,
        metadata: {
            prompt_version: 'coach-v3.8',
            safety_classifier: 'allergy-boundary',
            moderation_case: 'COACH-618',
        },
    },
    {
        id: 'diag-tool-391',
        tab: 'tools',
        timestamp: '2026-04-30 07:41:10',
        source: 'tool.search_recipes',
        severity: 'error',
        status: 'failed',
        requestId: 'tool_recipe_391',
        userId: 92,
        summary:
            'Recipe search tool returned an allergen-conflicting result before filter pass removed it.',
        actionHref: '/admin/ai/coach',
        rawOutput:
            '{ "query": "vegetarian chickpea dip", "removed_results": ["classic tahini hummus"], "safe_results": ["yogurt chickpea dip"] }',
        schemaValidation: ['Tool response parsed. Safety post-filter removed unsafe row.'],
        stackTrace:
            'CoachToolRegistry::searchRecipes\nRecipeSearchService::filterUnsafeFoods',
        retries: [
            {
                attempt: 1,
                status: 'filtered',
                summary: 'Unsafe result removed after allergen post-filter.',
                at: '07:41:10',
            },
        ],
        latencyMs: 642,
        metadata: {
            tool: 'search_recipes',
            constraints: 'sesame allergy',
            removed_results: '1',
            safe_results: '1',
        },
    },
];

function severityClassName(severity: Severity) {
    return {
        critical:
            'border-destructive/35 bg-destructive/12 text-destructive dark:text-red-200',
        error: 'border-destructive/35 bg-destructive/10 text-destructive dark:text-red-200',
        warning: 'border-warning/35 bg-warning/12 text-amber-700 dark:text-amber-200',
        info: 'border-info/35 bg-info/12 text-foreground',
    }[severity];
}

function startCase(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function payloadText(value?: string) {
    return value && value.trim().length > 0 ? value : 'No payload captured.';
}

export default function AdminDiagnosticsPage() {
    const [activeTab, setActiveTab] = useState<DiagnosticTab>('ai');
    const [query, setQuery] = useState('');
    const [severity, setSeverity] = useState('all');
    const [status, setStatus] = useState('all');
    const [selectedLog, setSelectedLog] = useState<DiagnosticLog | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const stats = useMemo(
        () => ({
            open: logs.filter((log) => !['resolved'].includes(log.status)).length,
            failed: logs.filter((log) => log.status === 'failed').length,
            critical: logs.filter((log) => log.severity === 'critical').length,
            retries: logs.reduce((sum, log) => sum + log.retries.length, 0),
            promptTraces: logs.filter((log) => log.tab === 'prompts').length,
        }),
        [],
    );

    const filteredLogs = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return logs.filter((log) => {
            const matchesTab = log.tab === activeTab;
            const matchesSeverity = severity === 'all' || log.severity === severity;
            const matchesStatus = status === 'all' || log.status === status;
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    log.id,
                    log.timestamp,
                    log.source,
                    log.requestId,
                    String(log.userId ?? ''),
                    log.summary,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);

            return matchesTab && matchesSeverity && matchesStatus && matchesQuery;
        });
    }, [activeTab, query, severity, status]);

    function copyRequestId() {
        if (!selectedLog) return;
        void navigator.clipboard?.writeText(selectedLog.requestId);
        setMessage(`Copied ${selectedLog.requestId}.`);
    }

    return (
        <>
            <Head title="Admin Diagnostics" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Diagnostics"
                    description="Technical debugging workspace for AI, jobs, APIs, imports, system health, prompt traces, and tool calls while keeping logs readable."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Open incidents"
                                value={stats.open}
                                tone="accent"
                                helper="Unresolved technical signals."
                            />
                            <AdminStatCard
                                label="Failed"
                                value={stats.failed}
                                helper="Failed jobs, APIs, AI calls, or tools."
                            />
                            <AdminStatCard
                                label="Critical"
                                value={stats.critical}
                                helper="System or safety-impacting diagnostics."
                            />
                            <AdminStatCard
                                label="Retries"
                                value={stats.retries}
                                helper="Retry attempts visible in detail drawers."
                            />
                            <AdminStatCard
                                label="Prompt traces"
                                value={stats.promptTraces}
                                helper="Captured prompt/output investigation rows."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Diagnostic filters"
                            description="Filter technical events before opening raw payloads. The default table stays readable; deep details live in the drawer."
                        >
                            <div className="space-y-4">
                                {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}

                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField label="Search" className="min-w-[220px] flex-1">
                                            <AdminSearchInput
                                                value={query}
                                                placeholder="Search source, request ID, user ID, summary"
                                                onChange={(event) => setQuery(event.target.value)}
                                            />
                                        </AdminField>
                                        <AdminField label="Severity" className="min-w-[160px]">
                                            <AdminNativeSelect
                                                value={severity}
                                                onChange={(event) => setSeverity(event.target.value)}
                                            >
                                                <option value="all">All severities</option>
                                                <option value="critical">Critical</option>
                                                <option value="error">Error</option>
                                                <option value="warning">Warning</option>
                                                <option value="info">Info</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField label="Status" className="min-w-[160px]">
                                            <AdminNativeSelect
                                                value={status}
                                                onChange={(event) => setStatus(event.target.value)}
                                            >
                                                <option value="all">All statuses</option>
                                                <option value="failed">Failed</option>
                                                <option value="degraded">Degraded</option>
                                                <option value="retrying">Retrying</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="running">Running</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                    </AdminToolbarGroup>
                                    <AdminToolbarGroup className="xl:w-auto xl:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setQuery('');
                                                setSeverity('all');
                                                setStatus('all');
                                            }}
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Diagnostic log viewer"
                            description="Tabs separate event families. Log rows show scan-friendly summaries and open raw technical context in a drawer."
                        >
                            <div className="space-y-4">
                                <AdminToggleGroup
                                    value={activeTab}
                                    onChange={(value) => {
                                        setActiveTab(value as DiagnosticTab);
                                        setSelectedLog(null);
                                        setMessage(null);
                                    }}
                                    options={tabs}
                                />

                                <AdminPanel
                                    title="Logs"
                                    description="Full-width table for technical events."
                                >
                                    <AdminScrollArea maxHeightClassName="max-h-[42rem]">
                                        <AdminDataTable tableClassName="min-w-[1120px]">
                                            <ProductTableHead>
                                                <ProductTableRow>
                                                    <ProductTableHeaderCell>Timestamp</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Source</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Severity</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Status</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Request ID</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>User ID</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Summary</ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>Action</ProductTableHeaderCell>
                                                </ProductTableRow>
                                            </ProductTableHead>
                                            <ProductTableBody>
                                                {filteredLogs.map((log) => (
                                                    <ProductTableRow
                                                        key={log.id}
                                                        interactive
                                                        className={cn(
                                                            selectedLog?.id === log.id && 'bg-primary/8',
                                                        )}
                                                    >
                                                        <ProductTableCell>{log.timestamp}</ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="font-medium text-foreground">
                                                                {log.source}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {log.id}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
                                                                    severityClassName(log.severity),
                                                                )}
                                                            >
                                                                {log.severity}
                                                            </Badge>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <StatusChipSet
                                                                items={[
                                                                    {
                                                                        value: log.status,
                                                                        label: startCase(log.status),
                                                                    },
                                                                ]}
                                                            />
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <span className="font-mono text-xs text-foreground">
                                                                {log.requestId}
                                                            </span>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            {log.userId ? (
                                                                <Link
                                                                    href={`/admin/users/${log.userId}`}
                                                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                                                >
                                                                    {log.userId}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-muted-foreground">None</span>
                                                            )}
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="max-w-[340px] text-sm leading-6 text-muted-foreground">
                                                                {log.summary}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setSelectedLog(log)}
                                                                >
                                                                    Details
                                                                </Button>
                                                                <Button asChild size="sm" variant="outline">
                                                                    <Link href={log.actionHref}>
                                                                        Open
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </ProductTableCell>
                                                    </ProductTableRow>
                                                ))}
                                                {filteredLogs.length === 0 ? (
                                                    <ProductTableEmptyRow
                                                        colSpan={8}
                                                        title="No diagnostics match these filters"
                                                        description="Adjust tab, severity, status, or search query."
                                                    />
                                                ) : null}
                                            </ProductTableBody>
                                        </AdminDataTable>
                                    </AdminScrollArea>
                                </AdminPanel>

                                <AdminStickyBar
                                    summary={
                                        selectedLog
                                            ? `Selected ${selectedLog.requestId}: ${selectedLog.summary}`
                                            : 'Select a diagnostic row for drawer actions.'
                                    }
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!selectedLog}
                                        onClick={copyRequestId}
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copy request ID
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!selectedLog || selectedLog.status === 'resolved'}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Retry safe job
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/admin/logs">
                                            <ClipboardCheck className="h-4 w-4" />
                                            Open audit logs
                                        </Link>
                                    </Button>
                                </AdminStickyBar>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>

                <EntityDetailDrawer
                    open={selectedLog !== null}
                    onOpenChange={(open) => {
                        if (!open) setSelectedLog(null);
                    }}
                    title={selectedLog?.requestId ?? 'Diagnostic detail'}
                    description={selectedLog?.summary}
                    footer={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedLog(null)}
                        >
                            Close
                        </Button>
                    }
                >
                    {selectedLog ? (
                        <div className="space-y-4">
                            <AdminPanel title="Execution summary">
                                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                    <DetailMeta label="Source" value={selectedLog.source} />
                                    <DetailMeta label="Status" value={startCase(selectedLog.status)} />
                                    <DetailMeta label="Severity" value={startCase(selectedLog.severity)} />
                                    <DetailMeta label="Latency" value={`${selectedLog.latencyMs.toLocaleString()} ms`} />
                                    <DetailMeta label="Request ID" value={selectedLog.requestId} mono />
                                    <DetailMeta label="User ID" value={selectedLog.userId ? String(selectedLog.userId) : 'None'} />
                                </dl>
                            </AdminPanel>

                            <PayloadBlock label="Raw prompt" value={payloadText(selectedLog.rawPrompt)} />
                            <PayloadBlock label="Raw output" value={payloadText(selectedLog.rawOutput)} />

                            <AdminPanel title="Schema validation">
                                <AdminScrollArea maxHeightClassName="max-h-48">
                                    <div className="space-y-2">
                                        {selectedLog.schemaValidation.map((item) => (
                                            <div
                                                key={item}
                                                className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs leading-6 text-foreground"
                                            >
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </AdminScrollArea>
                            </AdminPanel>

                            <PayloadBlock label="Stack trace" value={selectedLog.stackTrace} />

                            <AdminPanel title="Retries">
                                <div className="space-y-2">
                                    {selectedLog.retries.length > 0 ? (
                                        selectedLog.retries.map((retry) => (
                                            <div
                                                key={`${retry.at}-${retry.attempt}`}
                                                className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2"
                                            >
                                                <div className="font-mono text-xs text-foreground">
                                                    Attempt {retry.attempt} · {retry.status} · {retry.at}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {retry.summary}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <AdminNotice tone="info">No retry attempts recorded.</AdminNotice>
                                    )}
                                </div>
                            </AdminPanel>

                            <AdminPanel title="Metadata">
                                <AdminScrollArea maxHeightClassName="max-h-64">
                                    <div className="space-y-2">
                                        {Object.entries(selectedLog.metadata).map(([key, value]) => (
                                            <div
                                                key={key}
                                                className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2"
                                            >
                                                <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                    {key.replace(/_/g, ' ')}
                                                </div>
                                                <div className="mt-1 font-mono text-xs text-foreground">
                                                    {value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AdminScrollArea>
                            </AdminPanel>
                        </div>
                    ) : null}
                </EntityDetailDrawer>
            </RoleGuard>
        </>
    );
}

function DetailMeta({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5">
            <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className={cn('mt-1 text-sm text-foreground', mono && 'font-mono text-xs')}>
                {value}
            </dd>
        </div>
    );
}

function PayloadBlock({ label, value }: { label: string; value: string }) {
    return (
        <AdminPanel title={label}>
            <AdminScrollArea maxHeightClassName="max-h-72">
                <pre className="whitespace-pre-wrap rounded-[18px] border border-border/60 bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100">
                    {value}
                </pre>
            </AdminScrollArea>
        </AdminPanel>
    );
}
