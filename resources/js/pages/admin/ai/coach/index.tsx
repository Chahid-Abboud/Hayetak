import {
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
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ClipboardCheck,
    ExternalLink,
    MessageSquareWarning,
    RefreshCcw,
    ShieldAlert,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type ModerationStatus = 'open' | 'reviewing' | 'escalated' | 'resolved' | 'unsafe';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Sender = 'user' | 'coach' | 'tool' | 'system';

type TranscriptMessage = {
    id: string;
    sender: Sender;
    label: string;
    time: string;
    content: string;
    flagged?: boolean;
    flags?: string[];
    toolCall?: {
        name: string;
        summary: string;
        payload: Record<string, string>;
    };
};

type CoachCase = {
    id: string;
    title: string;
    status: ModerationStatus;
    severity: Severity;
    user: {
        id: number;
        name: string;
        email: string;
    };
    restrictions: {
        dietType: string;
        allergies: string[];
        injuries: string[];
        medical: string[];
    };
    mealsToday: string[];
    last7DaysSummary: string[];
    safetyFlags: string[];
    modelWarnings: string[];
    toolCalls: Array<{
        name: string;
        status: 'passed' | 'warning' | 'failed';
        summary: string;
        payload: Record<string, string>;
    }>;
    resolution?: string;
    transcript: TranscriptMessage[];
    openedAt: string;
    updatedAt: string;
};

const initialCases: CoachCase[] = [
    {
        id: 'COACH-621',
        title: 'Knee injury conflict in lower-body advice',
        status: 'open',
        severity: 'critical',
        user: { id: 148, name: 'Nour Haddad', email: 'nour@example.com' },
        restrictions: {
            dietType: 'Mediterranean, low lactose',
            allergies: ['peanuts', 'shellfish'],
            injuries: ['knee pain'],
            medical: ['mild hypertension'],
        },
        mealsToday: [
            'Breakfast: labneh toast, cucumber, mint',
            'Lunch: grilled chicken salad, no shellfish',
        ],
        last7DaysSummary: [
            'Average calories: 1,760 kcal/day',
            'Protein below target on 3 days',
            'No logged peanut or shellfish exposure',
        ],
        safetyFlags: [
            'Suggested jumping movement despite knee pain.',
            'Did not mention lower-impact alternative before the risky suggestion.',
        ],
        modelWarnings: [
            'Safety classifier: injury-sensitive response',
            'Coach tone acceptable; exercise choice needs review',
        ],
        toolCalls: [
            {
                name: 'suggest_exercise_alternatives',
                status: 'warning',
                summary:
                    'Returned safe alternatives, but the final coach response still mentioned jump squats.',
                payload: {
                    target: 'lower body conditioning',
                    injuries: 'knee pain',
                    returned: 'step-ups, glute bridges, cycling intervals',
                },
            },
            {
                name: 'summarize_last_7_days',
                status: 'passed',
                summary: 'Meal and activity context loaded successfully.',
                payload: {
                    days: '7',
                    protein_gap_days: '3',
                    unsafe_foods: 'none detected',
                },
            },
        ],
        transcript: [
            {
                id: '621-1',
                sender: 'user',
                label: 'Nour Haddad',
                time: 'Today, 09:42',
                content:
                    'Can I do something intense for legs today? My knee still feels sensitive but I want to sweat.',
            },
            {
                id: '621-2',
                sender: 'tool',
                label: 'Tool call',
                time: 'Today, 09:42',
                content:
                    'Exercise alternatives returned low-impact options for knee pain.',
                toolCall: {
                    name: 'suggest_exercise_alternatives',
                    summary:
                        'Suggested step-ups, glute bridges, cycling intervals.',
                    payload: {
                        target: 'leg conditioning',
                        equipment: 'gym',
                        injuries: 'knee pain',
                    },
                },
            },
            {
                id: '621-3',
                sender: 'coach',
                label: 'AI Coach',
                time: 'Today, 09:43',
                content:
                    'You can try a short circuit, but avoid deep knee flexion. Start with cycling intervals and glute bridges. If pain-free, add light step-ups. Skip jumping work today.',
                flagged: true,
                flags: ['Injury-sensitive', 'Review intensity wording'],
            },
        ],
        openedAt: 'Today, 09:43',
        updatedAt: 'Today, 10:01',
    },
    {
        id: 'COACH-618',
        title: 'Recipe suggestion near allergy boundary',
        status: 'reviewing',
        severity: 'high',
        user: { id: 92, name: 'Karim Mansour', email: 'karim@example.com' },
        restrictions: {
            dietType: 'Vegetarian',
            allergies: ['sesame'],
            injuries: [],
            medical: ['none recorded'],
        },
        mealsToday: [
            'Breakfast: oats with banana',
            'Snack: Greek yogurt and berries',
        ],
        last7DaysSummary: [
            'Average calories: 2,050 kcal/day',
            'Fiber target met on 5 days',
            'Sesame allergy present in profile',
        ],
        safetyFlags: ['Tahini-adjacent recommendation required moderation.'],
        modelWarnings: ['Food safety classifier: allergen boundary'],
        toolCalls: [
            {
                name: 'search_recipes',
                status: 'warning',
                summary:
                    'Recipe search included hummus variants; final answer used sesame-free bean dip alternative.',
                payload: {
                    query: 'vegetarian high protein dip',
                    constraints: 'sesame allergy, vegetarian',
                    filtered: 'tahini recipes removed',
                },
            },
        ],
        transcript: [
            {
                id: '618-1',
                sender: 'user',
                label: 'Karim Mansour',
                time: 'Yesterday, 18:18',
                content:
                    'Give me a high protein vegetarian snack with chickpeas.',
            },
            {
                id: '618-2',
                sender: 'tool',
                label: 'Tool call',
                time: 'Yesterday, 18:18',
                content:
                    'Recipe search applied sesame allergy constraint and removed tahini-based recipes.',
                toolCall: {
                    name: 'search_recipes',
                    summary: 'Filtered hummus variants with tahini.',
                    payload: {
                        available_ingredients: 'chickpeas, yogurt, lemon',
                        constraints: 'sesame allergy',
                        removed_results: '4',
                    },
                },
            },
            {
                id: '618-3',
                sender: 'coach',
                label: 'AI Coach',
                time: 'Yesterday, 18:19',
                content:
                    'Try mashed chickpeas with Greek yogurt, lemon, garlic, and parsley. Avoid tahini because of your sesame allergy.',
                flagged: true,
                flags: ['Allergy boundary verified'],
            },
        ],
        openedAt: 'Yesterday, 18:19',
        updatedAt: 'Today, 08:40',
    },
    {
        id: 'COACH-604',
        title: 'Meal-history context mismatch after admin correction',
        status: 'resolved',
        severity: 'medium',
        user: { id: 33, name: 'Samir Nassar', email: 'samir@example.com' },
        restrictions: {
            dietType: 'High protein',
            allergies: ['tree nuts'],
            injuries: [],
            medical: ['borderline cholesterol'],
        },
        mealsToday: [
            'Breakfast: eggs and whole wheat pita',
            'Lunch: tuna salad, olive oil dressing',
        ],
        last7DaysSummary: [
            'Meal log correction applied yesterday',
            'Protein target met on 6 days',
            'No tree nut foods logged',
        ],
        safetyFlags: ['Coach referenced stale calorie total before context refresh.'],
        modelWarnings: ['Context freshness warning'],
        toolCalls: [
            {
                name: 'get_day_macros',
                status: 'passed',
                summary: 'Returned corrected macros after refresh.',
                payload: {
                    date: 'today',
                    calories: '1,420',
                    protein: '118g',
                },
            },
        ],
        resolution:
            'Resolved after context refresh confirmed the corrected meal log total.',
        transcript: [
            {
                id: '604-1',
                sender: 'user',
                label: 'Samir Nassar',
                time: 'Apr 26, 10:18',
                content:
                    'Why does the coach still think I ate two servings yesterday?',
            },
            {
                id: '604-2',
                sender: 'coach',
                label: 'AI Coach',
                time: 'Apr 26, 10:19',
                content:
                    'I may be seeing an outdated meal entry. I will use the corrected meal log total going forward.',
                flagged: true,
                flags: ['Context freshness'],
            },
            {
                id: '604-3',
                sender: 'system',
                label: 'Moderator note',
                time: 'Apr 26, 10:32',
                content:
                    'Context refreshed. Follow-up answer matched corrected values.',
            },
        ],
        openedAt: 'Apr 26, 10:19',
        updatedAt: 'Apr 26, 10:32',
    },
];

const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'open', label: 'Open' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'unsafe', label: 'Unsafe' },
    { value: 'resolved', label: 'Resolved' },
];

const severityOptions = [
    { value: 'all', label: 'All severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

function startCase(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function severityClassName(severity: Severity) {
    return {
        critical:
            'border-destructive/35 bg-destructive/12 text-destructive dark:text-red-200',
        high: 'border-warning/35 bg-warning/12 text-amber-700 dark:text-amber-200',
        medium: 'border-info/35 bg-info/12 text-foreground',
        low: 'border-border/60 bg-background/72 text-muted-foreground',
    }[severity];
}

function senderClassName(sender: Sender) {
    return {
        user: 'ml-auto border-primary/20 bg-primary/10',
        coach: 'mr-auto border-border/60 bg-background/80',
        tool: 'mx-auto border-info/30 bg-info/10',
        system: 'mx-auto border-border/60 bg-muted/40',
    }[sender];
}

function TranscriptViewer({
    conversation,
    onOpenPayload,
}: {
    conversation: CoachCase | null;
    onOpenPayload: (message: TranscriptMessage) => void;
}) {
    if (!conversation) {
        return (
            <AdminPanel
                title="Transcript viewer"
                description="Select a flagged conversation to review the transcript."
                className="min-h-[36rem]"
            >
                <AdminNotice tone="info">No conversation selected.</AdminNotice>
            </AdminPanel>
        );
    }

    return (
        <AdminPanel
            title="Transcript viewer"
            description="Flagged messages are highlighted, and raw tool payloads stay collapsed by default."
            className="min-h-[42rem]"
        >
            <AdminScrollArea maxHeightClassName="max-h-[46rem]">
                <div className="space-y-4 pr-2">
                    {conversation.transcript.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                'max-w-[92%] rounded-[24px] border px-4 py-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.28)]',
                                senderClassName(message.sender),
                                message.flagged &&
                                    'border-warning/45 bg-warning/12',
                            )}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">
                                        {message.label}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {message.time}
                                    </div>
                                </div>
                                <StatusChipSet
                                    items={[
                                        ...(message.flagged
                                            ? [
                                                  {
                                                      value: 'warning',
                                                      label: 'Flagged',
                                                  },
                                              ]
                                            : []),
                                        ...(message.toolCall
                                            ? [
                                                  {
                                                      value: 'info',
                                                      label: message.toolCall.name,
                                                  },
                                              ]
                                            : []),
                                    ]}
                                />
                            </div>

                            <p className="mt-3 text-sm leading-6 text-foreground/90">
                                {message.content}
                            </p>

                            {message.flags && message.flags.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {message.flags.map((flag) => (
                                        <Badge
                                            key={flag}
                                            variant="outline"
                                            className="rounded-full border-warning/35 bg-warning/10 px-2.5 py-1"
                                        >
                                            {flag}
                                        </Badge>
                                    ))}
                                </div>
                            ) : null}

                            {message.toolCall ? (
                                <div className="mt-3 rounded-[18px] border border-border/60 bg-background/70 px-3 py-3">
                                    <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                        Tool summary
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        {message.toolCall.summary}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="mt-2 h-auto p-0"
                                        onClick={() => onOpenPayload(message)}
                                    >
                                        View payload summary
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </AdminScrollArea>
        </AdminPanel>
    );
}

function ContextPanel({ conversation }: { conversation: CoachCase | null }) {
    if (!conversation) {
        return (
            <AdminPanel title="Context panel" description="Select a conversation.">
                <AdminNotice tone="info">Context appears after selection.</AdminNotice>
            </AdminPanel>
        );
    }

    return (
        <AdminPanel
            title="Context panel"
            description="Restriction, meal, tool, and resolution context for the selected transcript."
        >
            <AdminScrollArea maxHeightClassName="max-h-[46rem]">
                <div className="space-y-4 pr-1">
                    <RiskBannerStack
                        items={[
                            ...(conversation.status === 'unsafe' ||
                            conversation.severity === 'critical'
                                ? [
                                      {
                                          severity: 'danger' as const,
                                          title: 'High-risk moderation item',
                                          description:
                                              'Review restrictions and flagged coach wording before resolving.',
                                          meta: conversation.id,
                                      },
                                  ]
                                : []),
                            ...(conversation.safetyFlags.length > 0
                                ? [
                                      {
                                          severity: 'warning' as const,
                                          title: 'Safety flags',
                                          description:
                                              conversation.safetyFlags.join(' '),
                                          meta: `${conversation.safetyFlags.length} flag(s)`,
                                      },
                                  ]
                                : []),
                        ]}
                    />

                    <AdminPanel title="User restrictions" className="bg-background/42">
                        <div className="grid gap-3">
                            <ContextList label="Diet type" values={[conversation.restrictions.dietType]} />
                            <ContextList label="Allergies" values={conversation.restrictions.allergies} danger />
                            <ContextList label="Injuries" values={conversation.restrictions.injuries} danger />
                            <ContextList label="Medical signals" values={conversation.restrictions.medical} />
                        </div>
                    </AdminPanel>

                    <AdminPanel title="Today’s meals" className="bg-background/42">
                        <CompactList values={conversation.mealsToday} />
                    </AdminPanel>

                    <AdminPanel title="Last 7 days summary" className="bg-background/42">
                        <CompactList values={conversation.last7DaysSummary} />
                    </AdminPanel>

                    <AdminPanel title="Tool calls" className="bg-background/42">
                        <div className="space-y-3">
                            {conversation.toolCalls.map((tool) => (
                                <details
                                    key={tool.name}
                                    className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3"
                                >
                                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                        {tool.name} · {startCase(tool.status)}
                                    </summary>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {tool.summary}
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {Object.entries(tool.payload).map(
                                            ([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="rounded-[14px] border border-border/50 bg-background/70 px-3 py-2"
                                                >
                                                    <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                        {key.replace(/_/g, ' ')}
                                                    </div>
                                                    <div className="mt-1 text-sm text-foreground">
                                                        {value}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </AdminPanel>

                    <AdminPanel title="Model warnings" className="bg-background/42">
                        <CompactList values={conversation.modelWarnings} />
                    </AdminPanel>

                    <AdminPanel
                        title="Moderator resolution"
                        description="Keep the outcome readable; raw traces belong in diagnostics."
                        className="bg-background/42"
                    >
                        <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3 text-sm leading-6 text-muted-foreground">
                            {conversation.resolution ||
                                'No moderator resolution has been recorded yet.'}
                        </div>
                    </AdminPanel>
                </div>
            </AdminScrollArea>
        </AdminPanel>
    );
}

function ContextList({
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

function CompactList({ values }: { values: string[] }) {
    return (
        <div className="space-y-2">
            {values.map((value) => (
                <div
                    key={value}
                    className="rounded-[16px] border border-border/60 bg-background/70 px-3 py-2 text-sm leading-6 text-muted-foreground"
                >
                    {value}
                </div>
            ))}
        </div>
    );
}

export default function AdminAiCoachModerationPage() {
    const [cases, setCases] = useState<CoachCase[]>(initialCases);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [severity, setSeverity] = useState('all');
    const [selectedId, setSelectedId] = useState(initialCases[0].id);
    const [payloadMessage, setPayloadMessage] =
        useState<TranscriptMessage | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const selectedCase =
        cases.find((item) => item.id === selectedId) ?? cases[0] ?? null;

    const stats = useMemo(
        () => ({
            flagged: cases.filter((item) => item.status !== 'resolved').length,
            critical: cases.filter((item) => item.severity === 'critical').length,
            unsafe: cases.filter((item) => item.status === 'unsafe').length,
            escalated: cases.filter((item) => item.status === 'escalated').length,
            resolved: cases.filter((item) => item.status === 'resolved').length,
        }),
        [cases],
    );

    const filteredCases = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return cases.filter((item) => {
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    item.id,
                    item.title,
                    item.user.name,
                    item.user.email,
                    item.restrictions.dietType,
                    item.restrictions.allergies.join(' '),
                    item.restrictions.injuries.join(' '),
                    item.safetyFlags.join(' '),
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);

            return (
                matchesQuery &&
                (status === 'all' || item.status === status) &&
                (severity === 'all' || item.severity === severity)
            );
        });
    }, [cases, query, severity, status]);

    function updateSelected(
        updater: (item: CoachCase) => CoachCase,
        confirmation: string,
    ) {
        setCases((current) =>
            current.map((item) => (item.id === selectedId ? updater(item) : item)),
        );
        setMessage(confirmation);
    }

    function resolveCase() {
        updateSelected(
            (item) => ({
                ...item,
                status: 'resolved',
                resolution:
                    item.resolution ||
                    'Resolved by moderator after reviewing transcript, restrictions, meal context, and tool summaries.',
                updatedAt: 'Just now',
            }),
            'Conversation marked resolved.',
        );
    }

    function markUnsafe() {
        updateSelected(
            (item) => ({
                ...item,
                status: 'unsafe',
                severity: item.severity === 'critical' ? 'critical' : 'high',
                resolution:
                    'Marked unsafe. Coach response should be reviewed before similar recommendations are allowed.',
                updatedAt: 'Just now',
            }),
            'Conversation marked unsafe.',
        );
    }

    function escalateCase() {
        updateSelected(
            (item) => ({
                ...item,
                status: 'escalated',
                severity: item.severity === 'critical' ? 'critical' : 'high',
                updatedAt: 'Just now',
            }),
            'Conversation escalated to intervention review.',
        );
    }

    return (
        <>
            <Head title="Admin AI Coach Moderation" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="AI Coach Moderation"
                    description="Admin-only review workspace for flagged coach conversations, user restrictions, meal context, tool calls, safety flags, and moderator resolution."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Flagged"
                                value={stats.flagged}
                                tone="accent"
                                helper="Open moderation items needing review."
                            />
                            <AdminStatCard
                                label="Critical"
                                value={stats.critical}
                                helper="Allergy, injury, or safety-sensitive cases."
                            />
                            <AdminStatCard
                                label="Unsafe"
                                value={stats.unsafe}
                                helper="Marked unsafe by moderation."
                            />
                            <AdminStatCard
                                label="Escalated"
                                value={stats.escalated}
                                helper="Moved to intervention handling."
                            />
                            <AdminStatCard
                                label="Resolved"
                                value={stats.resolved}
                                helper="Closed with moderator resolution."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Moderation guidance"
                            description="Review the transcript first, then validate restrictions, meals, tools, and model warnings. Raw tool payloads stay expandable."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminOverviewCard
                                    title="Transcript gets priority"
                                    description="The chat is the main evidence. Context supports the decision without crowding the transcript."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Flagged messages stay visually visible.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Restrictions decide safety"
                                    description="Allergies, injuries, diet type, meals, and seven-day context should be checked before resolving."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Coach must respect known constraints.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Payloads are secondary"
                                    description="Tool calls show readable summaries by default; technical payloads expand only when needed."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Use diagnostics for raw traces.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Moderation queue"
                            description="Filter flagged conversations, keep the transcript wide, and inspect context without turning the page into a raw log viewer."
                        >
                            <div className="space-y-4">
                                {message ? (
                                    <AdminNotice tone="success">{message}</AdminNotice>
                                ) : null}

                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField label="Search" className="min-w-[220px] flex-1">
                                            <AdminSearchInput
                                                value={query}
                                                placeholder="Find user, flag, allergy, injury, or conversation"
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
                                        <AdminField label="Severity" className="min-w-[160px]">
                                            <AdminNativeSelect
                                                value={severity}
                                                onChange={(event) => setSeverity(event.target.value)}
                                            >
                                                {severityOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
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
                                                setSeverity('all');
                                            }}
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>

                                <div className="grid gap-4 2xl:grid-cols-[minmax(250px,0.62fr)_minmax(520px,1.45fr)_minmax(330px,0.78fr)] 2xl:items-start">
                                    <AdminPanel
                                        title="Conversation queue"
                                        description="Flagged coach conversations."
                                    >
                                        <AdminScrollArea maxHeightClassName="max-h-[46rem]">
                                            <div className="space-y-3">
                                                {filteredCases.map((item) => {
                                                    const selected =
                                                        item.id === selectedId;

                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedId(item.id);
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
                                                                        {item.id}
                                                                    </div>
                                                                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                                                        {item.title}
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
                                                                        severityClassName(item.severity),
                                                                    )}
                                                                >
                                                                    {item.severity}
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-3 text-sm font-medium text-foreground">
                                                                {item.user.name}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                Updated {item.updatedAt}
                                                            </div>
                                                            <StatusChipSet
                                                                className="mt-3"
                                                                items={[
                                                                    {
                                                                        value: item.status,
                                                                        label: startCase(item.status),
                                                                    },
                                                                ]}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                                {filteredCases.length === 0 ? (
                                                    <AdminNotice tone="info">
                                                        No flagged conversations match these filters.
                                                    </AdminNotice>
                                                ) : null}
                                            </div>
                                        </AdminScrollArea>
                                    </AdminPanel>

                                    <TranscriptViewer
                                        conversation={selectedCase}
                                        onOpenPayload={setPayloadMessage}
                                    />

                                    <ContextPanel conversation={selectedCase} />
                                </div>

                                <AdminStickyBar
                                    summary={
                                        selectedCase
                                            ? `Selected ${selectedCase.id}: ${selectedCase.user.name}`
                                            : 'Select a conversation to use moderation actions.'
                                    }
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!selectedCase || selectedCase.status === 'resolved'}
                                        onClick={resolveCase}
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        Resolve
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={!selectedCase || selectedCase.status === 'unsafe'}
                                        onClick={markUnsafe}
                                    >
                                        <ShieldAlert className="h-4 w-4" />
                                        Mark unsafe
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!selectedCase || selectedCase.status === 'escalated'}
                                        onClick={escalateCase}
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        Escalate
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/admin/diagnostics">
                                            <ExternalLink className="h-4 w-4" />
                                            Open diagnostics
                                        </Link>
                                    </Button>
                                    {selectedCase ? (
                                        <Button asChild variant="outline">
                                            <Link href={`/admin/users/${selectedCase.user.id}`}>
                                                <UserRound className="h-4 w-4" />
                                                Open user profile
                                            </Link>
                                        </Button>
                                    ) : null}
                                </AdminStickyBar>

                                <div className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Raw tool payloads, model traces, and prompt details remain expandable or in diagnostics by default.
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
                    open={payloadMessage !== null}
                    onOpenChange={(open) => {
                        if (!open) setPayloadMessage(null);
                    }}
                    title="Tool payload summary"
                    description={
                        payloadMessage?.toolCall
                            ? payloadMessage.toolCall.name
                            : 'No tool payload selected.'
                    }
                    footer={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPayloadMessage(null)}
                        >
                            Close
                        </Button>
                    }
                >
                    {payloadMessage?.toolCall ? (
                        <div className="space-y-4">
                            <AdminPanel
                                title="Readable payload"
                                description="This is a compact payload summary. Open diagnostics for raw traces."
                            >
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {payloadMessage.toolCall.summary}
                                </p>
                                <div className="mt-4 space-y-2">
                                    {Object.entries(
                                        payloadMessage.toolCall.payload,
                                    ).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5"
                                        >
                                            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                {key.replace(/_/g, ' ')}
                                            </div>
                                            <div className="mt-1 text-sm text-foreground">
                                                {value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AdminPanel>
                            <Button asChild variant="outline">
                                <Link href="/admin/diagnostics">
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
