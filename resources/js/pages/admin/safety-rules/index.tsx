import {
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
    AdminStickyBar,
    AdminTextarea,
    AdminToggleGroup,
} from '@/components/admin/admin-ui';
import { RiskBannerStack, StatusChipSet } from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import {
    History,
    Play,
    RotateCcw,
    Save,
    ShieldCheck,
    Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type RuleTab =
    | 'allergy'
    | 'diet'
    | 'medical'
    | 'injury'
    | 'claims'
    | 'fallback';

type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';
type RuleStatus = 'published' | 'draft' | 'retired';
type AiSurface = 'planner' | 'coach' | 'both';

type SafetyRule = {
    id: string;
    tab: RuleTab;
    title: string;
    plainEnglish: string;
    condition: string;
    severity: RuleSeverity;
    surface: AiSurface;
    version: string;
    effectiveDate: string;
    author: string;
    status: RuleStatus;
    changeHistory: Array<{
        version: string;
        date: string;
        author: string;
        summary: string;
    }>;
    simulation: {
        result: 'pass' | 'warning' | 'fail';
        summary: string;
        examples: string[];
    };
};

const tabs: Array<{ value: RuleTab; label: string }> = [
    { value: 'allergy', label: 'Allergy rules' },
    { value: 'diet', label: 'Diet rules' },
    { value: 'medical', label: 'Medical escalation' },
    { value: 'injury', label: 'Injury rules' },
    { value: 'claims', label: 'Unsafe claims' },
    { value: 'fallback', label: 'Fallback responses' },
];

const initialRules: SafetyRule[] = [
    {
        id: 'SAFE-ALLERGY-001',
        tab: 'allergy',
        title: 'Hard block known allergens',
        plainEnglish:
            'Never recommend foods, recipes, ingredients, or substitutions that include a user’s recorded allergens.',
        condition:
            'User has one or more allergies and planner or coach candidate output contains a matching ingredient or close derivative.',
        severity: 'critical',
        surface: 'both',
        version: 'v4.2',
        effectiveDate: '2026-04-21',
        author: 'Clinical Review',
        status: 'published',
        changeHistory: [
            {
                version: 'v4.2',
                date: '2026-04-21',
                author: 'Clinical Review',
                summary: 'Added derivative matching for tahini/sesame and nut oils.',
            },
            {
                version: 'v4.1',
                date: '2026-04-12',
                author: 'AI Ops',
                summary: 'Promoted allergy block to planner and coach hard stop.',
            },
        ],
        simulation: {
            result: 'pass',
            summary:
                'Blocked peanut snack, tahini dip, and shellfish dinner examples. Safe substitutions were generated.',
            examples: [
                'Peanut allergy blocks peanut butter smoothie.',
                'Sesame allergy blocks tahini hummus and suggests yogurt chickpea dip.',
                'Shellfish allergy blocks shrimp meal templates.',
            ],
        },
    },
    {
        id: 'SAFE-DIET-014',
        tab: 'diet',
        title: 'Respect declared diet type',
        plainEnglish:
            'Planner and coach must keep recommendations inside the user’s declared diet type unless the user explicitly asks to change preferences.',
        condition:
            'User diet type conflicts with a candidate meal, recipe, grocery item, or supplement suggestion.',
        severity: 'high',
        surface: 'both',
        version: 'v2.8',
        effectiveDate: '2026-04-18',
        author: 'Nutrition Ops',
        status: 'draft',
        changeHistory: [
            {
                version: 'v2.8',
                date: '2026-04-18',
                author: 'Nutrition Ops',
                summary: 'Draft adds pescatarian and vegan supplement wording.',
            },
            {
                version: 'v2.7',
                date: '2026-03-29',
                author: 'AI Ops',
                summary: 'Added vegetarian recipe filter to coach recipe search.',
            },
        ],
        simulation: {
            result: 'warning',
            summary:
                'Vegetarian and vegan cases passed. Pescatarian edge cases need clearer fish allowance handling.',
            examples: [
                'Vegetarian plan excludes chicken and beef.',
                'Vegan coach reply avoids whey and dairy yogurt.',
                'Pescatarian example needs author review before publish.',
            ],
        },
    },
    {
        id: 'SAFE-MED-009',
        tab: 'medical',
        title: 'Escalate medical red flags',
        plainEnglish:
            'When a user describes acute symptoms, medication conflicts, eating disorder risk, chest pain, fainting, or severe injury signs, the coach must avoid diagnosis and escalate to professional care.',
        condition:
            'Message includes urgent symptom, diagnosis request, medication interaction, or severe restriction behavior.',
        severity: 'critical',
        surface: 'coach',
        version: 'v3.1',
        effectiveDate: '2026-04-10',
        author: 'Clinical Review',
        status: 'published',
        changeHistory: [
            {
                version: 'v3.1',
                date: '2026-04-10',
                author: 'Clinical Review',
                summary: 'Added eating disorder and fainting escalation examples.',
            },
        ],
        simulation: {
            result: 'pass',
            summary:
                'Coach refuses diagnosis, recommends urgent care when appropriate, and provides safe general support.',
            examples: [
                'Chest pain during workout escalates to urgent medical evaluation.',
                'Medication interaction question redirects to clinician/pharmacist.',
                'Extreme restriction language triggers supportive escalation.',
            ],
        },
    },
    {
        id: 'SAFE-INJURY-022',
        tab: 'injury',
        title: 'Avoid contraindicated exercise patterns',
        plainEnglish:
            'Do not recommend movements that load or aggravate a user’s recorded injury. Provide safer alternatives first.',
        condition:
            'User has injury history and candidate workout includes a blocked movement pattern or high-impact alternative.',
        severity: 'high',
        surface: 'both',
        version: 'v5.0',
        effectiveDate: '2026-04-24',
        author: 'Coach Safety',
        status: 'published',
        changeHistory: [
            {
                version: 'v5.0',
                date: '2026-04-24',
                author: 'Coach Safety',
                summary: 'Added lower-impact swaps for knee and shoulder cases.',
            },
            {
                version: 'v4.9',
                date: '2026-04-14',
                author: 'AI Ops',
                summary: 'Connected exercise alternative tool to coach responses.',
            },
        ],
        simulation: {
            result: 'pass',
            summary:
                'Knee, shoulder, and lower-back cases produced safer substitutions and avoided blocked exercises.',
            examples: [
                'Knee pain avoids jump squats and suggests cycling intervals.',
                'Shoulder impingement avoids overhead press.',
                'Lower-back pain avoids heavy deadlifts without professional clearance.',
            ],
        },
    },
    {
        id: 'SAFE-CLAIMS-006',
        tab: 'claims',
        title: 'No guaranteed outcomes or medical cures',
        plainEnglish:
            'The AI must not promise guaranteed fat loss, disease reversal, cure, diagnosis, or treatment outcomes.',
        condition:
            'Candidate response contains certainty claims about weight loss, medical treatment, diagnosis, or cure.',
        severity: 'high',
        surface: 'both',
        version: 'v1.9',
        effectiveDate: '2026-03-30',
        author: 'Policy Ops',
        status: 'published',
        changeHistory: [
            {
                version: 'v1.9',
                date: '2026-03-30',
                author: 'Policy Ops',
                summary: 'Added supplement and metabolic cure language.',
            },
        ],
        simulation: {
            result: 'warning',
            summary:
                'Guaranteed weight-loss claims were blocked. Some supplement phrasing needs stricter replacement copy.',
            examples: [
                'Blocks “you will lose 10 kg in one month.”',
                'Blocks “this diet cures hypertension.”',
                'Needs review for supplement performance claims.',
            ],
        },
    },
    {
        id: 'SAFE-FALLBACK-011',
        tab: 'fallback',
        title: 'Use safe fallback when constraints are incomplete',
        plainEnglish:
            'If safety context is missing, uncertain, or contradictory, ask a concise clarification and offer conservative general guidance.',
        condition:
            'Profile restrictions are incomplete, tool context fails, or user asks for a sensitive recommendation without enough safety information.',
        severity: 'medium',
        surface: 'both',
        version: 'v2.3',
        effectiveDate: '2026-04-05',
        author: 'AI Ops',
        status: 'draft',
        changeHistory: [
            {
                version: 'v2.3',
                date: '2026-04-05',
                author: 'AI Ops',
                summary: 'Draft improves fallback copy for missing injury details.',
            },
        ],
        simulation: {
            result: 'pass',
            summary:
                'Missing allergy, missing injury, and tool timeout cases produced conservative fallback wording.',
            examples: [
                'Asks for allergy clarification before recipe suggestions.',
                'Suggests low-impact movement while asking for injury details.',
                'Uses general balanced meal guidance if recipe search fails.',
            ],
        },
    },
];

function severityClassName(severity: RuleSeverity) {
    return {
        critical:
            'border-destructive/35 bg-destructive/12 text-destructive dark:text-red-200',
        high: 'border-warning/35 bg-warning/12 text-amber-700 dark:text-amber-200',
        medium: 'border-info/35 bg-info/12 text-foreground',
        low: 'border-border/60 bg-background/72 text-muted-foreground',
    }[severity];
}

function startCase(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function surfaceLabel(surface: AiSurface) {
    return surface === 'both' ? 'Planner and coach' : startCase(surface);
}

function simulationTone(result: SafetyRule['simulation']['result']) {
    return result === 'pass' ? 'success' : result === 'warning' ? 'warning' : 'danger';
}

export default function AdminSafetyRulesPage() {
    const [rules, setRules] = useState<SafetyRule[]>(initialRules);
    const [activeTab, setActiveTab] = useState<RuleTab>('allergy');
    const [selectedId, setSelectedId] = useState(initialRules[0].id);
    const [publishOpen, setPublishOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const selectedRule =
        rules.find((rule) => rule.id === selectedId) ??
        rules.find((rule) => rule.tab === activeTab) ??
        rules[0];

    const visibleRules = useMemo(
        () => rules.filter((rule) => rule.tab === activeTab),
        [activeTab, rules],
    );

    const stats = useMemo(
        () => ({
            published: rules.filter((rule) => rule.status === 'published').length,
            drafts: rules.filter((rule) => rule.status === 'draft').length,
            critical: rules.filter((rule) => rule.severity === 'critical').length,
            warnings: rules.filter((rule) => rule.simulation.result === 'warning').length,
            failed: rules.filter((rule) => rule.simulation.result === 'fail').length,
        }),
        [rules],
    );

    function selectTab(tab: string) {
        const nextTab = tab as RuleTab;
        setActiveTab(nextTab);
        setSelectedId(rules.find((rule) => rule.tab === nextTab)?.id ?? rules[0].id);
        setMessage(null);
    }

    function updateSelectedRule(patch: Partial<SafetyRule>) {
        setRules((current) =>
            current.map((rule) =>
                rule.id === selectedRule.id ? { ...rule, ...patch } : rule,
            ),
        );
    }

    function saveDraft() {
        updateSelectedRule({
            status: 'draft',
            version: selectedRule.version.includes('-draft')
                ? selectedRule.version
                : `${selectedRule.version}-draft`,
        });
        setMessage('Draft saved. Run simulation before publishing.');
    }

    function simulateRule() {
        updateSelectedRule({
            simulation: {
                result:
                    selectedRule.severity === 'critical' ? 'pass' : selectedRule.simulation.result,
                summary:
                    'Simulation refreshed against allergy, diet, injury, medical escalation, unsafe claim, and fallback fixtures.',
                examples: [
                    'Blocked unsafe recommendation and produced safer alternative.',
                    'Confirmed plain-English fallback stays concise.',
                    'No raw prompts shown in this admin surface.',
                ],
            },
        });
        setMessage('Simulation completed for the selected rule.');
    }

    function publishRule() {
        updateSelectedRule({
            status: 'published',
            version: selectedRule.version.replace(/-draft$/, ''),
            effectiveDate: '2026-04-30',
            changeHistory: [
                {
                    version: selectedRule.version.replace(/-draft$/, ''),
                    date: '2026-04-30',
                    author: 'Current admin',
                    summary: 'Published after confirmation from Safety Rules workspace.',
                },
                ...selectedRule.changeHistory,
            ],
        });
        setPublishOpen(false);
        setMessage('Rule published after confirmation.');
    }

    function rollbackRule() {
        const previous = selectedRule.changeHistory[0];
        if (!previous) {
            setMessage('No previous version is available for rollback.');
            return;
        }

        updateSelectedRule({
            status: 'draft',
            version: `${previous.version}-rollback`,
            effectiveDate: previous.date,
            changeHistory: [
                {
                    version: `${previous.version}-rollback`,
                    date: '2026-04-30',
                    author: 'Current admin',
                    summary: `Rollback draft created from ${previous.version}.`,
                },
                ...selectedRule.changeHistory,
            ],
        });
        setMessage('Rollback draft created. Simulate before publishing.');
    }

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
                                label="Published rules"
                                value={stats.published}
                                tone="accent"
                                helper="Active policy rules for planner and coach."
                            />
                            <AdminStatCard
                                label="Draft rules"
                                value={stats.drafts}
                                helper="Unpublished edits awaiting simulation or approval."
                            />
                            <AdminStatCard
                                label="Critical rules"
                                value={stats.critical}
                                helper="Hard-stop safety policies."
                            />
                            <AdminStatCard
                                label="Warnings"
                                value={stats.warnings}
                                helper="Simulation passed with review notes."
                            />
                            <AdminStatCard
                                label="Failed simulations"
                                value={stats.failed}
                                helper="Rules that cannot be published yet."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Safety policy guidance"
                            description="Treat this as conservative policy control. Every rule needs plain-English intent, conditions, severity, affected AI surface, version history, and simulation evidence before publishing."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminOverviewCard
                                    title="Plain English first"
                                    description="Admins should understand what the planner and coach are allowed to recommend without reading raw prompts."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Keep rule intent readable before condition syntax.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Simulate before publish"
                                    description="Simulation stays full-width below the editor so examples, failures, and warnings are readable."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <Play className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Publishing requires explicit confirmation.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Version every change"
                                    description="Rule edits must preserve author, effective date, version, and change history for rollback."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <History className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Rollback creates a draft, not a silent publish.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Rule governance"
                            description="Use tabs to move between policy families. Select a rule, edit the readable policy detail, then run a full-width simulation before publishing."
                        >
                            <div className="space-y-4">
                                {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}

                                <AdminToggleGroup
                                    value={activeTab}
                                    onChange={selectTab}
                                    options={tabs}
                                />

                                <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)] xl:items-start">
                                    <AdminPanel
                                        title="Rule list"
                                        description="Versioned rules in the selected policy family."
                                    >
                                        <AdminScrollArea maxHeightClassName="max-h-[34rem]">
                                            <div className="space-y-3">
                                                {visibleRules.map((rule) => {
                                                    const selected = rule.id === selectedRule.id;

                                                    return (
                                                        <button
                                                            key={rule.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedId(rule.id);
                                                                setMessage(null);
                                                            }}
                                                            className={cn(
                                                                'w-full rounded-[22px] border px-4 py-4 text-left transition',
                                                                selected
                                                                    ? 'border-primary/28 bg-primary/10'
                                                                    : 'border-border/60 bg-background/72 hover:border-primary/25',
                                                            )}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-foreground">
                                                                        {rule.title}
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                                        {rule.id} · {rule.version}
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
                                                                        severityClassName(rule.severity),
                                                                    )}
                                                                >
                                                                    {rule.severity}
                                                                </Badge>
                                                            </div>
                                                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                                                                {rule.plainEnglish}
                                                            </p>
                                                            <StatusChipSet
                                                                className="mt-3"
                                                                items={[
                                                                    { value: rule.status, label: startCase(rule.status) },
                                                                    {
                                                                        value: simulationTone(rule.simulation.result),
                                                                        label: `Simulation ${startCase(rule.simulation.result)}`,
                                                                    },
                                                                ]}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </AdminScrollArea>
                                    </AdminPanel>

                                    <AdminPanel
                                        title="Rule detail editor"
                                        description="Readable policy text and governance metadata."
                                    >
                                        <div className="space-y-4">
                                            <RiskBannerStack
                                                items={[
                                                    ...(selectedRule.severity === 'critical'
                                                        ? [
                                                              {
                                                                  severity: 'danger' as const,
                                                                  title: 'Critical policy rule',
                                                                  description:
                                                                      'Publishing affects safety hard stops for planner or coach behavior.',
                                                                  meta: selectedRule.id,
                                                              },
                                                          ]
                                                        : []),
                                                    ...(selectedRule.status === 'draft'
                                                        ? [
                                                              {
                                                                  severity: 'warning' as const,
                                                                  title: 'Draft not active',
                                                                  description:
                                                                      'Run simulation and confirm publish before this rule governs AI output.',
                                                                  meta: selectedRule.version,
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <AdminField label="Rule title">
                                                    <AdminInput
                                                        value={selectedRule.title}
                                                        onChange={(event) =>
                                                            updateSelectedRule({
                                                                title: event.target.value,
                                                            })
                                                        }
                                                    />
                                                </AdminField>
                                                <AdminField label="Severity">
                                                    <AdminNativeSelect
                                                        value={selectedRule.severity}
                                                        onChange={(event) =>
                                                            updateSelectedRule({
                                                                severity: event.target.value as RuleSeverity,
                                                            })
                                                        }
                                                    >
                                                        <option value="critical">Critical</option>
                                                        <option value="high">High</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="low">Low</option>
                                                    </AdminNativeSelect>
                                                </AdminField>
                                                <AdminField label="Affected AI surface">
                                                    <AdminNativeSelect
                                                        value={selectedRule.surface}
                                                        onChange={(event) =>
                                                            updateSelectedRule({
                                                                surface: event.target.value as AiSurface,
                                                            })
                                                        }
                                                    >
                                                        <option value="both">Planner and coach</option>
                                                        <option value="planner">Planner</option>
                                                        <option value="coach">Coach</option>
                                                    </AdminNativeSelect>
                                                </AdminField>
                                                <AdminField label="Status">
                                                    <AdminNativeSelect
                                                        value={selectedRule.status}
                                                        onChange={(event) =>
                                                            updateSelectedRule({
                                                                status: event.target.value as RuleStatus,
                                                            })
                                                        }
                                                    >
                                                        <option value="published">Published</option>
                                                        <option value="draft">Draft</option>
                                                        <option value="retired">Retired</option>
                                                    </AdminNativeSelect>
                                                </AdminField>
                                            </div>

                                            <AdminField label="Plain-English rule">
                                                <AdminTextarea
                                                    rows={4}
                                                    value={selectedRule.plainEnglish}
                                                    onChange={(event) =>
                                                        updateSelectedRule({
                                                            plainEnglish: event.target.value,
                                                        })
                                                    }
                                                />
                                            </AdminField>

                                            <AdminField label="Condition">
                                                <AdminTextarea
                                                    rows={4}
                                                    value={selectedRule.condition}
                                                    onChange={(event) =>
                                                        updateSelectedRule({
                                                            condition: event.target.value,
                                                        })
                                                    }
                                                />
                                            </AdminField>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <ReadableMeta label="Version" value={selectedRule.version} />
                                                <ReadableMeta label="Effective date" value={selectedRule.effectiveDate} />
                                                <ReadableMeta label="Author" value={selectedRule.author} />
                                            </div>

                                            <AdminPanel
                                                title="Change history"
                                                description="Versioned policy edits and rollback context."
                                                className="bg-background/42"
                                            >
                                                <AdminScrollArea maxHeightClassName="max-h-[16rem]">
                                                    <div className="space-y-3">
                                                        {selectedRule.changeHistory.map((entry) => (
                                                            <div
                                                                key={`${entry.version}-${entry.date}-${entry.summary}`}
                                                                className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3"
                                                            >
                                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                                    <div className="font-medium text-foreground">
                                                                        {entry.version}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {entry.date}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-1 text-sm text-muted-foreground">
                                                                    {entry.author} · {entry.summary}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AdminScrollArea>
                                            </AdminPanel>
                                        </div>
                                    </AdminPanel>
                                </div>

                                <AdminPanel
                                    title="Simulation panel"
                                    description="Full-width policy simulation results. This is intentionally not squeezed beside the editor."
                                >
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                        <div className="rounded-[22px] border border-border/60 bg-background/70 px-4 py-4">
                                            <div className="haye-kicker">Selected rule</div>
                                            <h3 className="mt-2 text-lg font-semibold text-foreground">
                                                {selectedRule.title}
                                            </h3>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
                                                        severityClassName(selectedRule.severity),
                                                    )}
                                                >
                                                    {selectedRule.severity}
                                                </Badge>
                                                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                                    {surfaceLabel(selectedRule.surface)}
                                                </Badge>
                                                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                                                    {selectedRule.version}
                                                </Badge>
                                            </div>
                                            <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                                {selectedRule.simulation.summary}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div
                                                className={cn(
                                                    'rounded-[22px] border px-4 py-4',
                                                    selectedRule.simulation.result === 'pass' &&
                                                        'border-success/35 bg-success/10',
                                                    selectedRule.simulation.result === 'warning' &&
                                                        'border-warning/35 bg-warning/10',
                                                    selectedRule.simulation.result === 'fail' &&
                                                        'border-destructive/35 bg-destructive/10',
                                                )}
                                            >
                                                <div className="text-sm font-semibold text-foreground">
                                                    Simulation {startCase(selectedRule.simulation.result)}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    Run policy checks before publishing. Failed simulations should stay in draft.
                                                </div>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-3">
                                                {selectedRule.simulation.examples.map((example) => (
                                                    <div
                                                        key={example}
                                                        className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3 text-sm leading-6 text-muted-foreground"
                                                    >
                                                        {example}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </AdminPanel>

                                <AdminStickyBar summary={`Selected ${selectedRule.id}: ${selectedRule.title}`}>
                                    <Button type="button" variant="outline" onClick={saveDraft}>
                                        <Save className="h-4 w-4" />
                                        Save draft
                                    </Button>
                                    <Button type="button" variant="outline" onClick={simulateRule}>
                                        <Play className="h-4 w-4" />
                                        Simulate
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={selectedRule.simulation.result === 'fail'}
                                        onClick={() => setPublishOpen(true)}
                                    >
                                        <Upload className="h-4 w-4" />
                                        Publish
                                    </Button>
                                    <Button type="button" variant="destructive" onClick={rollbackRule}>
                                        <RotateCcw className="h-4 w-4" />
                                        Rollback
                                    </Button>
                                </AdminStickyBar>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>

                <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Publish safety rule?</DialogTitle>
                            <DialogDescription>
                                Publishing updates the active policy for {surfaceLabel(selectedRule.surface).toLowerCase()} recommendations. Confirm only after reviewing simulation results and change history.
                            </DialogDescription>
                        </DialogHeader>
                        <AdminNotice tone="warning">
                            {selectedRule.title} · {selectedRule.version} · {startCase(selectedRule.severity)}
                        </AdminNotice>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPublishOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="button" onClick={publishRule}>
                                Confirm publish
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </RoleGuard>
        </>
    );
}

function ReadableMeta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3">
            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
        </div>
    );
}
