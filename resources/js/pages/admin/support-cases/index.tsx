import {
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    ActivityTimeline,
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
    MessageSquarePlus,
    RefreshCcw,
    ShieldAlert,
    UserCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type CaseStatus = 'open' | 'in_progress' | 'waiting' | 'escalated' | 'resolved';
type CasePriority = 'critical' | 'high' | 'medium' | 'low';

type TimelineEntry = {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    summary: string;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    metadata: Record<string, string>;
};

type SupportCase = {
    id: string;
    title: string;
    status: CaseStatus;
    priority: CasePriority;
    owner: string;
    user: {
        id: number;
        name: string;
        email: string;
        status: string;
    };
    plan: {
        id: string;
        label: string;
        state: string;
        href: string;
    };
    coachConversation: {
        id: string;
        label: string;
        href: string;
    };
    linkedLog: {
        label: string;
        href: string;
        summary: string;
    };
    notes: string[];
    timeline: TimelineEntry[];
    resolutionSummary?: string;
    openedAt: string;
    updatedAt: string;
};

const owners = ['Unassigned', 'Support Ops', 'Coach Safety', 'AI Ops', 'Clinical Review'];

const initialCases: SupportCase[] = [
    {
        id: 'CASE-1042',
        title: 'Coach flagged unsafe post-injury workout suggestion',
        status: 'escalated',
        priority: 'critical',
        owner: 'Coach Safety',
        user: {
            id: 148,
            name: 'Nour Haddad',
            email: 'nour@example.com',
            status: 'Active client',
        },
        plan: {
            id: 'PLAN-884',
            label: 'Signup planner run #884',
            state: 'Generated with safety warning',
            href: '/admin/diagnostics',
        },
        coachConversation: {
            id: 'CHAT-619',
            label: 'Coach conversation #619',
            href: '/admin/diagnostics',
        },
        linkedLog: {
            label: 'AI safety event #2911',
            href: '/admin/logs',
            summary:
                'Knee injury constraint was present. Suggested lower-body substitute needs human review.',
        },
        notes: [
            'User reported knee pain in onboarding and asked for gym alternatives.',
            'Do not expose raw prompt traces in the case queue.',
        ],
        timeline: [
            {
                id: '1042-1',
                timestamp: 'Today, 09:18',
                actor: 'AI safety monitor',
                action: 'Case opened',
                summary:
                    'Unsafe recommendation flag created from coach response review.',
                tone: 'danger',
                metadata: {
                    source: 'coach_safety_monitor',
                    severity: 'critical',
                    conversation_id: '619',
                },
            },
            {
                id: '1042-2',
                timestamp: 'Today, 09:31',
                actor: 'Maya A.',
                action: 'Owner assigned',
                summary: 'Coach Safety accepted ownership and escalated priority.',
                tone: 'warning',
                metadata: {
                    owner: 'Coach Safety',
                    previous_owner: 'Unassigned',
                    reason: 'Possible injury-sensitive recommendation.',
                },
            },
            {
                id: '1042-3',
                timestamp: 'Today, 10:04',
                actor: 'Coach Safety',
                action: 'User context reviewed',
                summary:
                    'Confirmed injury signal and linked planner output for comparison.',
                tone: 'info',
                metadata: {
                    injury_signal: 'knee pain',
                    plan_id: '884',
                    audit_log: 'AI safety event #2911',
                },
            },
        ],
        openedAt: 'Today, 09:18',
        updatedAt: 'Today, 10:04',
    },
    {
        id: 'CASE-1037',
        title: 'User asks for planner correction after allergy mismatch',
        status: 'in_progress',
        priority: 'high',
        owner: 'Clinical Review',
        user: {
            id: 92,
            name: 'Karim Mansour',
            email: 'karim@example.com',
            status: 'Active client',
        },
        plan: {
            id: 'PLAN-861',
            label: 'Nutrition plan #861',
            state: 'Needs restriction review',
            href: '/admin/safety-profiles',
        },
        coachConversation: {
            id: 'CHAT-577',
            label: 'Support handoff #577',
            href: '/admin/diagnostics',
        },
        linkedLog: {
            label: 'Notification delivery #144',
            href: '/admin/notifications',
            summary:
                'Intervention message was sent and remains unread by the user.',
        },
        notes: [
            'Allergy record says sesame. User reports tahini appeared in draft meal option.',
            'Clinical Review is checking whether catalog tags or planner exclusions caused the mismatch.',
        ],
        timeline: [
            {
                id: '1037-1',
                timestamp: 'Yesterday, 17:12',
                actor: 'Support Ops',
                action: 'Case opened',
                summary: 'User submitted a planner correction request.',
                tone: 'warning',
                metadata: {
                    channel: 'support_form',
                    allergy: 'sesame',
                    plan_id: '861',
                },
            },
            {
                id: '1037-2',
                timestamp: 'Yesterday, 17:44',
                actor: 'Clinical Review',
                action: 'Restriction check started',
                summary:
                    'Safety profile and food catalog tags are being compared.',
                tone: 'info',
                metadata: {
                    safety_profile: 'complete',
                    catalog_area: 'food allergens',
                    linked_page: '/admin/meals',
                },
            },
        ],
        openedAt: 'Yesterday, 17:12',
        updatedAt: 'Today, 08:22',
    },
    {
        id: 'CASE-1029',
        title: 'Trainer assignment handoff needs owner confirmation',
        status: 'waiting',
        priority: 'medium',
        owner: 'Support Ops',
        user: {
            id: 64,
            name: 'Lara Khoury',
            email: 'lara@example.com',
            status: 'Active client',
        },
        plan: {
            id: 'ASSIGN-204',
            label: 'Assignment request #204',
            state: 'Waiting on trainer capacity',
            href: '/admin/assignments',
        },
        coachConversation: {
            id: 'CHAT-548',
            label: 'Coach handoff #548',
            href: '/admin/diagnostics',
        },
        linkedLog: {
            label: 'Admin action #990',
            href: '/admin/logs',
            summary:
                'Reassignment was initiated after city and schedule mismatch.',
        },
        notes: [
            'Client prefers evenings and home workouts.',
            'Trainer capacity should be checked before final reassignment.',
        ],
        timeline: [
            {
                id: '1029-1',
                timestamp: 'Apr 28, 14:20',
                actor: 'Support Ops',
                action: 'Case opened',
                summary: 'Assignment mismatch moved into support follow-up.',
                tone: 'info',
                metadata: {
                    assignment_id: '204',
                    city_match: 'No',
                    current_load: 'Trainer at capacity',
                },
            },
            {
                id: '1029-2',
                timestamp: 'Apr 29, 11:05',
                actor: 'Support Ops',
                action: 'Waiting on response',
                summary: 'Trainer availability requested before reassignment.',
                tone: 'warning',
                metadata: {
                    requested_from: 'trainer',
                    due: 'Apr 30',
                    note: 'Do not reassign until availability is confirmed.',
                },
            },
        ],
        openedAt: 'Apr 28, 14:20',
        updatedAt: 'Apr 29, 11:05',
    },
    {
        id: 'CASE-1018',
        title: 'Meal log correction caused coach context question',
        status: 'resolved',
        priority: 'low',
        owner: 'AI Ops',
        user: {
            id: 33,
            name: 'Samir Nassar',
            email: 'samir@example.com',
            status: 'Active client',
        },
        plan: {
            id: 'MEAL-733',
            label: 'Meal log correction #733',
            state: 'Corrected',
            href: '/admin/meal-logs',
        },
        coachConversation: {
            id: 'CHAT-501',
            label: 'Coach context check #501',
            href: '/admin/diagnostics',
        },
        linkedLog: {
            label: 'Audit log #871',
            href: '/admin/logs',
            summary:
                'Admin corrected servings and added reason. Coach summary refreshed.',
        },
        notes: [
            'Resolved after context refresh confirmed corrected calories.',
            'No further user intervention required.',
        ],
        timeline: [
            {
                id: '1018-1',
                timestamp: 'Apr 26, 09:11',
                actor: 'AI Ops',
                action: 'Case opened',
                summary:
                    'Coach still referenced a pre-correction meal total after admin edit.',
                tone: 'info',
                metadata: {
                    meal_log_id: '733',
                    context_window: 'last 7 days',
                    source: 'coach_context_check',
                },
            },
            {
                id: '1018-2',
                timestamp: 'Apr 26, 10:30',
                actor: 'AI Ops',
                action: 'Resolved',
                summary:
                    'Context was refreshed and coach summary matched corrected log.',
                tone: 'success',
                metadata: {
                    resolution: 'context refreshed',
                    follow_up: 'none',
                    audit_log: '871',
                },
            },
        ],
        resolutionSummary:
            'Meal correction was confirmed in coach context. The related audit note is readable in logs.',
        openedAt: 'Apr 26, 09:11',
        updatedAt: 'Apr 26, 10:30',
    },
];

const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'resolved', label: 'Resolved' },
];

const priorityOptions = [
    { value: 'all', label: 'All priorities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

function formatStatus(value: CaseStatus) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priorityClassName(priority: CasePriority) {
    return {
        critical:
            'border-destructive/35 bg-destructive/12 text-destructive dark:text-red-200',
        high: 'border-warning/35 bg-warning/12 text-amber-700 dark:text-amber-200',
        medium: 'border-info/35 bg-info/12 text-foreground',
        low: 'border-border/60 bg-background/72 text-muted-foreground',
    }[priority];
}

function caseNeedsAttention(supportCase: SupportCase) {
    return (
        supportCase.status === 'open' ||
        supportCase.status === 'escalated' ||
        supportCase.priority === 'critical'
    );
}

function CaseDetailPanel({
    supportCase,
    ownerDraft,
    statusDraft,
    noteDraft,
    selectedTimelineId,
    onOwnerDraftChange,
    onStatusDraftChange,
    onNoteDraftChange,
    onTimelineSelect,
}: {
    supportCase: SupportCase | null;
    ownerDraft: string;
    statusDraft: CaseStatus;
    noteDraft: string;
    selectedTimelineId: string | null;
    onOwnerDraftChange: (value: string) => void;
    onStatusDraftChange: (value: CaseStatus) => void;
    onNoteDraftChange: (value: string) => void;
    onTimelineSelect: (id: string) => void;
}) {
    if (!supportCase) {
        return (
            <AdminEmpty
                title="Select a case"
                description="Choose a support or intervention case to inspect links, notes, timeline, and resolution context."
            />
        );
    }

    return (
        <AdminPanel
            title="Case detail"
            description="Pinned investigation panel keeps the selected case visible while the queue scrolls."
        >
            <div className="space-y-4">
                <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="haye-kicker">{supportCase.id}</div>
                            <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                                {supportCase.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Opened {supportCase.openedAt}. Updated{' '}
                                {supportCase.updatedAt}.
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className={cn(
                                'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase',
                                priorityClassName(supportCase.priority),
                            )}
                        >
                            {supportCase.priority}
                        </Badge>
                    </div>
                    <StatusChipSet
                        className="mt-3"
                        items={[
                            { value: supportCase.status, label: formatStatus(supportCase.status) },
                            { value: supportCase.user.status },
                            { value: supportCase.owner === 'Unassigned' ? 'warning' : 'active', label: supportCase.owner },
                        ]}
                    />
                </div>

                {caseNeedsAttention(supportCase) ? (
                    <RiskBannerStack
                        items={[
                            {
                                severity:
                                    supportCase.priority === 'critical'
                                        ? 'danger'
                                        : 'warning',
                                title:
                                    supportCase.status === 'escalated'
                                        ? 'Escalated intervention'
                                        : 'Active support follow-up',
                                description:
                                    'Resolve ownership and next action before closing the queue item. Keep raw traces behind diagnostics links.',
                                meta: supportCase.linkedLog.label,
                            },
                        ]}
                    />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                    <LinkedContextCard
                        label="Linked user"
                        title={supportCase.user.name}
                        description={supportCase.user.email}
                        href={`/admin/users/${supportCase.user.id}`}
                    />
                    <LinkedContextCard
                        label="Linked plan"
                        title={supportCase.plan.label}
                        description={supportCase.plan.state}
                        href={supportCase.plan.href}
                    />
                    <LinkedContextCard
                        label="Coach conversation"
                        title={supportCase.coachConversation.label}
                        description="Open summarized diagnostics context."
                        href={supportCase.coachConversation.href}
                    />
                    <LinkedContextCard
                        label="Linked log"
                        title={supportCase.linkedLog.label}
                        description={supportCase.linkedLog.summary}
                        href={supportCase.linkedLog.href}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label="Owner">
                        <AdminNativeSelect
                            value={ownerDraft}
                            onChange={(event) =>
                                onOwnerDraftChange(event.target.value)
                            }
                        >
                            {owners.map((owner) => (
                                <option key={owner} value={owner}>
                                    {owner}
                                </option>
                            ))}
                        </AdminNativeSelect>
                    </AdminField>
                    <AdminField label="Status">
                        <AdminNativeSelect
                            value={statusDraft}
                            onChange={(event) =>
                                onStatusDraftChange(
                                    event.target.value as CaseStatus,
                                )
                            }
                        >
                            {statusOptions
                                .filter((option) => option.value !== 'all')
                                .map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                        </AdminNativeSelect>
                    </AdminField>
                </div>

                <AdminPanel
                    title="Notes"
                    description="Readable case notes only. Detailed metadata opens from the timeline."
                    className="bg-background/42"
                >
                    <div className="space-y-2">
                        {supportCase.notes.map((note) => (
                            <div
                                key={note}
                                className="rounded-[18px] border border-border/55 bg-background/70 px-3 py-2.5 text-sm leading-6 text-muted-foreground"
                            >
                                {note}
                            </div>
                        ))}
                    </div>
                    <AdminField label="Add note" className="mt-4 block">
                        <AdminTextarea
                            rows={4}
                            value={noteDraft}
                            placeholder="Add a concise support note with next action or decision context."
                            onChange={(event) =>
                                onNoteDraftChange(event.target.value)
                            }
                        />
                    </AdminField>
                </AdminPanel>

                <AdminPanel
                    title="Timeline"
                    description="Each event shows timestamp, actor, action, and a short summary. Select an entry to inspect metadata in a drawer."
                    className="bg-background/42"
                >
                    <AdminScrollArea maxHeightClassName="max-h-[24rem]">
                        <ActivityTimeline
                            selectedId={selectedTimelineId}
                            onSelect={(id) => onTimelineSelect(String(id))}
                            items={supportCase.timeline.map((entry) => ({
                                id: entry.id,
                                title: `${entry.actor} - ${entry.action}`,
                                description: entry.summary,
                                timestamp: entry.timestamp,
                                tone: entry.tone,
                                meta: 'Open metadata drawer for detailed context.',
                            }))}
                        />
                    </AdminScrollArea>
                </AdminPanel>

                <AdminPanel
                    title="Resolution summary"
                    description="Closing context should explain the outcome, not dump technical traces."
                    className="bg-background/42"
                >
                    <div className="rounded-[20px] border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {supportCase.resolutionSummary ||
                            'No resolution summary yet. Resolve the case once owner, status, and final note are clear.'}
                    </div>
                </AdminPanel>
            </div>
        </AdminPanel>
    );
}

function LinkedContextCard({
    label,
    title,
    description,
    href,
}: {
    label: string;
    title: string;
    description: string;
    href: string;
}) {
    return (
        <div className="dashboard-surface-soft rounded-[20px] px-4 py-3">
            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">
                {title}
            </div>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                {description}
            </p>
            <Button asChild variant="link" className="mt-2 h-auto p-0 text-sm">
                <Link href={href}>
                    Open
                    <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </Button>
        </div>
    );
}

export default function AdminSupportCasesPage() {
    const [cases, setCases] = useState<SupportCase[]>(initialCases);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [owner, setOwner] = useState('all');
    const [selectedCaseId, setSelectedCaseId] = useState(initialCases[0].id);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [metadataOpen, setMetadataOpen] = useState(false);
    const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(
        initialCases[0].timeline[0]?.id ?? null,
    );
    const [ownerDraft, setOwnerDraft] = useState(initialCases[0].owner);
    const [statusDraft, setStatusDraft] = useState<CaseStatus>(
        initialCases[0].status,
    );
    const [noteDraft, setNoteDraft] = useState('');
    const [message, setMessage] = useState<string | null>(null);

    const selectedCase =
        cases.find((supportCase) => supportCase.id === selectedCaseId) ??
        cases[0] ??
        null;

    const selectedTimelineEntry =
        selectedCase?.timeline.find((entry) => entry.id === selectedTimelineId) ??
        null;

    const stats = useMemo(
        () => ({
            open: cases.filter((supportCase) => supportCase.status !== 'resolved')
                .length,
            escalated: cases.filter(
                (supportCase) => supportCase.status === 'escalated',
            ).length,
            critical: cases.filter(
                (supportCase) => supportCase.priority === 'critical',
            ).length,
            waiting: cases.filter(
                (supportCase) => supportCase.status === 'waiting',
            ).length,
            resolved: cases.filter(
                (supportCase) => supportCase.status === 'resolved',
            ).length,
        }),
        [cases],
    );

    const filteredCases = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return cases.filter((supportCase) => {
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    supportCase.id,
                    supportCase.title,
                    supportCase.owner,
                    supportCase.user.name,
                    supportCase.user.email,
                    supportCase.plan.label,
                    supportCase.coachConversation.label,
                    supportCase.linkedLog.label,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            const matchesStatus =
                status === 'all' || supportCase.status === status;
            const matchesPriority =
                priority === 'all' || supportCase.priority === priority;
            const matchesOwner =
                owner === 'all' || supportCase.owner === owner;

            return (
                matchesQuery &&
                matchesStatus &&
                matchesPriority &&
                matchesOwner
            );
        });
    }, [cases, owner, priority, query, status]);

    function selectCase(supportCase: SupportCase, openDrawer = false) {
        setSelectedCaseId(supportCase.id);
        setOwnerDraft(supportCase.owner);
        setStatusDraft(supportCase.status);
        setNoteDraft('');
        setSelectedTimelineId(supportCase.timeline[0]?.id ?? null);
        if (openDrawer) {
            setMobileDetailOpen(true);
        }
    }

    function appendTimeline(
        supportCase: SupportCase,
        action: string,
        summary: string,
        tone: TimelineEntry['tone'],
        metadata: Record<string, string>,
    ): SupportCase {
        const entry: TimelineEntry = {
            id: `${supportCase.id}-${Date.now()}`,
            timestamp: 'Just now',
            actor: 'Current admin',
            action,
            summary,
            tone,
            metadata,
        };

        setSelectedTimelineId(entry.id);

        return {
            ...supportCase,
            updatedAt: 'Just now',
            timeline: [entry, ...supportCase.timeline],
        };
    }

    function updateSelectedCase(
        updater: (supportCase: SupportCase) => SupportCase,
        confirmation: string,
    ) {
        setCases((currentCases) =>
            currentCases.map((supportCase) =>
                supportCase.id === selectedCaseId
                    ? updater(supportCase)
                    : supportCase,
            ),
        );
        setMessage(confirmation);
    }

    function assignOwner() {
        if (!selectedCase || selectedCase.owner === ownerDraft) return;

        updateSelectedCase(
            (supportCase) =>
                appendTimeline(
                    { ...supportCase, owner: ownerDraft },
                    'Owner assigned',
                    `Owner changed from ${supportCase.owner} to ${ownerDraft}.`,
                    'info',
                    {
                        previous_owner: supportCase.owner,
                        new_owner: ownerDraft,
                    },
                ),
            'Owner updated for the selected case.',
        );
    }

    function changeStatus(nextStatus = statusDraft) {
        if (!selectedCase || selectedCase.status === nextStatus) return;

        updateSelectedCase(
            (supportCase) =>
                appendTimeline(
                    {
                        ...supportCase,
                        status: nextStatus,
                        resolutionSummary:
                            nextStatus === 'resolved'
                                ? noteDraft.trim() ||
                                  supportCase.resolutionSummary ||
                                  'Resolved by admin after review.'
                                : supportCase.resolutionSummary,
                    },
                    nextStatus === 'resolved' ? 'Resolved' : 'Status changed',
                    `Status changed from ${formatStatus(supportCase.status)} to ${formatStatus(nextStatus)}.`,
                    nextStatus === 'resolved' ? 'success' : 'info',
                    {
                        previous_status: supportCase.status,
                        new_status: nextStatus,
                    },
                ),
            nextStatus === 'resolved'
                ? 'Case resolved with a readable summary.'
                : 'Case status updated.',
        );
    }

    function escalateCase() {
        if (!selectedCase) return;

        setStatusDraft('escalated');
        updateSelectedCase(
            (supportCase) =>
                appendTimeline(
                    {
                        ...supportCase,
                        status: 'escalated',
                        priority:
                            supportCase.priority === 'critical'
                                ? 'critical'
                                : 'high',
                    },
                    'Escalated',
                    'Case was escalated for priority intervention review.',
                    'danger',
                    {
                        previous_status: supportCase.status,
                        previous_priority: supportCase.priority,
                        next_owner: supportCase.owner,
                    },
                ),
            'Case escalated for intervention review.',
        );
    }

    function resolveCase() {
        if (!selectedCase) return;
        setStatusDraft('resolved');
        changeStatus('resolved');
    }

    function addNote() {
        const cleanNote = noteDraft.trim();
        if (!selectedCase || cleanNote.length === 0) return;

        updateSelectedCase(
            (supportCase) =>
                appendTimeline(
                    {
                        ...supportCase,
                        notes: [cleanNote, ...supportCase.notes],
                    },
                    'Note added',
                    cleanNote,
                    'default',
                    {
                        note_length: String(cleanNote.length),
                        visibility: 'admin_case_note',
                    },
                ),
            'Note added to the selected case.',
        );
        setNoteDraft('');
    }

    const detailPanel = (
        <CaseDetailPanel
            supportCase={selectedCase}
            ownerDraft={ownerDraft}
            statusDraft={statusDraft}
            noteDraft={noteDraft}
            selectedTimelineId={selectedTimelineId}
            onOwnerDraftChange={setOwnerDraft}
            onStatusDraftChange={setStatusDraft}
            onNoteDraftChange={setNoteDraft}
            onTimelineSelect={(id) => {
                setSelectedTimelineId(id);
                setMetadataOpen(true);
            }}
        />
    );

    return (
        <>
            <Head title="Admin Support Cases" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Support / Intervention Cases"
                    description="Admin-only list and detail workspace for user support, safety interventions, linked AI context, ownership, timeline review, and resolution summaries."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Open cases"
                                value={stats.open}
                                tone="accent"
                                helper="Unresolved support and intervention items."
                            />
                            <AdminStatCard
                                label="Critical"
                                value={stats.critical}
                                helper="Needs priority intervention review."
                            />
                            <AdminStatCard
                                label="Escalated"
                                value={stats.escalated}
                                helper="Already moved into high-attention flow."
                            />
                            <AdminStatCard
                                label="Waiting"
                                value={stats.waiting}
                                helper="Blocked on user, professional, or ops response."
                            />
                            <AdminStatCard
                                label="Resolved"
                                value={stats.resolved}
                                helper="Closed with a readable outcome summary."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Case guidance"
                            description="Work one case at a time. Keep the queue compact, keep the detail panel readable, and open diagnostics only for technical evidence."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminOverviewCard
                                    title="Start with ownership"
                                    description="Every active case should have a clear owner before status or escalation changes."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Assign owner, then record a note when
                                        responsibility changes.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Trace through links"
                                    description="User, plan, coach conversation, and log references stay visible without turning the page into raw logs."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Open linked diagnostics when evidence is
                                        needed.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Resolve with context"
                                    description="Resolution summaries should describe the outcome and next action in normal admin language."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        Keep detailed metadata available from
                                        the timeline drawer.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Case queue"
                            description="Filter active cases, select one row, and keep the case detail pinned while the queue scrolls."
                        >
                            <div className="space-y-4">
                                {message ? (
                                    <AdminNotice tone="success">
                                        {message}
                                    </AdminNotice>
                                ) : null}

                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField
                                            label="Search"
                                            className="min-w-[220px] flex-1"
                                        >
                                            <AdminSearchInput
                                                value={query}
                                                placeholder="Find case, user, owner, plan, chat, or log"
                                                onChange={(event) =>
                                                    setQuery(event.target.value)
                                                }
                                            />
                                        </AdminField>
                                        <AdminField
                                            label="Status"
                                            className="min-w-[160px]"
                                        >
                                            <AdminNativeSelect
                                                value={status}
                                                onChange={(event) =>
                                                    setStatus(event.target.value)
                                                }
                                            >
                                                {statusOptions.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField
                                            label="Priority"
                                            className="min-w-[160px]"
                                        >
                                            <AdminNativeSelect
                                                value={priority}
                                                onChange={(event) =>
                                                    setPriority(
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                {priorityOptions.map(
                                                    (option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ),
                                                )}
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField
                                            label="Owner"
                                            className="min-w-[170px]"
                                        >
                                            <AdminNativeSelect
                                                value={owner}
                                                onChange={(event) =>
                                                    setOwner(event.target.value)
                                                }
                                            >
                                                <option value="all">
                                                    All owners
                                                </option>
                                                {owners.map((item) => (
                                                    <option
                                                        key={item}
                                                        value={item}
                                                    >
                                                        {item}
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
                                                setPriority('all');
                                                setOwner('all');
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
                                            title="Case queue"
                                            description="Scrollable list of support and intervention cases."
                                        >
                                            <AdminScrollArea maxHeightClassName="max-h-[38rem]">
                                                <AdminDataTable tableClassName="min-w-[920px]">
                                                    <ProductTableHead>
                                                        <ProductTableRow>
                                                            <ProductTableHeaderCell>
                                                                Case
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Status
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Priority
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Owner
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Linked user
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Linked context
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Updated
                                                            </ProductTableHeaderCell>
                                                        </ProductTableRow>
                                                    </ProductTableHead>
                                                    <ProductTableBody>
                                                        {filteredCases.map(
                                                            (supportCase) => {
                                                                const selected =
                                                                    supportCase.id ===
                                                                    selectedCaseId;

                                                                return (
                                                                    <ProductTableRow
                                                                        key={
                                                                            supportCase.id
                                                                        }
                                                                        interactive
                                                                        className={cn(
                                                                            selected &&
                                                                                'bg-primary/8',
                                                                        )}
                                                                    >
                                                                        <ProductTableCell>
                                                                            <button
                                                                                type="button"
                                                                                className="min-w-[240px] text-left"
                                                                                onClick={() =>
                                                                                    selectCase(
                                                                                        supportCase,
                                                                                        true,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <span className="block font-semibold text-foreground">
                                                                                    {
                                                                                        supportCase.id
                                                                                    }
                                                                                </span>
                                                                                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                                                                                    {
                                                                                        supportCase.title
                                                                                    }
                                                                                </span>
                                                                            </button>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <StatusChipSet
                                                                                items={[
                                                                                    {
                                                                                        value: supportCase.status,
                                                                                        label: formatStatus(
                                                                                            supportCase.status,
                                                                                        ),
                                                                                    },
                                                                                ]}
                                                                            />
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase',
                                                                                    priorityClassName(
                                                                                        supportCase.priority,
                                                                                    ),
                                                                                )}
                                                                            >
                                                                                {
                                                                                    supportCase.priority
                                                                                }
                                                                            </Badge>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            {
                                                                                supportCase.owner
                                                                            }
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <div className="font-medium text-foreground">
                                                                                {
                                                                                    supportCase
                                                                                        .user
                                                                                        .name
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {
                                                                                    supportCase
                                                                                        .user
                                                                                        .email
                                                                                }
                                                                            </div>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <div className="text-sm text-foreground">
                                                                                {
                                                                                    supportCase
                                                                                        .plan
                                                                                        .label
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {
                                                                                    supportCase
                                                                                        .coachConversation
                                                                                        .label
                                                                                }{' '}
                                                                                |{' '}
                                                                                {
                                                                                    supportCase
                                                                                        .linkedLog
                                                                                        .label
                                                                                }
                                                                            </div>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            {
                                                                                supportCase.updatedAt
                                                                            }
                                                                        </ProductTableCell>
                                                                    </ProductTableRow>
                                                                );
                                                            },
                                                        )}
                                                        {filteredCases.length ===
                                                        0 ? (
                                                            <ProductTableEmptyRow
                                                                colSpan={7}
                                                                title="No cases match these filters"
                                                                description="Adjust filters or search for a linked user, plan, conversation, log, owner, or case id."
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
                                        selectedCase
                                            ? `Selected ${selectedCase.id}: ${selectedCase.title}`
                                            : 'Select a case to use actions.'
                                    }
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            !selectedCase ||
                                            selectedCase.owner === ownerDraft
                                        }
                                        onClick={assignOwner}
                                    >
                                        <UserCheck className="h-4 w-4" />
                                        Assign owner
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            !selectedCase ||
                                            selectedCase.status === statusDraft
                                        }
                                        onClick={() => changeStatus()}
                                    >
                                        Change status
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            !selectedCase ||
                                            selectedCase.status === 'escalated'
                                        }
                                        onClick={escalateCase}
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        Escalate
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={
                                            !selectedCase ||
                                            selectedCase.status === 'resolved'
                                        }
                                        onClick={resolveCase}
                                    >
                                        Resolve
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={noteDraft.trim().length === 0}
                                        onClick={addNote}
                                    >
                                        <MessageSquarePlus className="h-4 w-4" />
                                        Add note
                                    </Button>
                                </AdminStickyBar>

                                <div className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Detailed traces and raw audit metadata
                                        stay outside the normal case page.
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
                    open={mobileDetailOpen}
                    onOpenChange={setMobileDetailOpen}
                    title={selectedCase?.id ?? 'Case detail'}
                    description={selectedCase?.title}
                    footer={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMobileDetailOpen(false)}
                        >
                            Close
                        </Button>
                    }
                >
                    {detailPanel}
                </EntityDetailDrawer>

                <EntityDetailDrawer
                    open={metadataOpen}
                    onOpenChange={setMetadataOpen}
                    title="Timeline metadata"
                    description={
                        selectedTimelineEntry
                            ? `${selectedTimelineEntry.actor} - ${selectedTimelineEntry.action}`
                            : 'Select a timeline entry.'
                    }
                    footer={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMetadataOpen(false)}
                        >
                            Close
                        </Button>
                    }
                >
                    {selectedTimelineEntry ? (
                        <div className="space-y-4">
                            <AdminPanel
                                title={selectedTimelineEntry.action}
                                description={selectedTimelineEntry.summary}
                            >
                                <dl className="grid gap-3 text-sm">
                                    <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5">
                                        <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                            Timestamp
                                        </dt>
                                        <dd className="mt-1 text-foreground">
                                            {selectedTimelineEntry.timestamp}
                                        </dd>
                                    </div>
                                    <div className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-2.5">
                                        <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                            Actor
                                        </dt>
                                        <dd className="mt-1 text-foreground">
                                            {selectedTimelineEntry.actor}
                                        </dd>
                                    </div>
                                </dl>
                            </AdminPanel>

                            <AdminPanel
                                title="Metadata summary"
                                description="Structured context for admins. Open diagnostics or logs for raw payloads."
                            >
                                <div className="space-y-2">
                                    {Object.entries(
                                        selectedTimelineEntry.metadata,
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
                        </div>
                    ) : (
                        <AdminEmpty
                            title="No metadata selected"
                            description="Select a timeline entry from the case detail panel."
                        />
                    )}
                </EntityDetailDrawer>
            </RoleGuard>
        </>
    );
}
