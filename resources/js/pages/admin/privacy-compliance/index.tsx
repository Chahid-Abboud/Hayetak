import {
    AdminDataTable,
    AdminField,
    AdminNativeSelect,
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
    StatusChip,
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
    CheckCircle2,
    ClipboardCheck,
    ExternalLink,
    FileArchive,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type ComplianceType = 'export' | 'deletion' | 'consent' | 'regulated';
type ComplianceStatus =
    | 'new'
    | 'in_review'
    | 'approved'
    | 'fulfilled'
    | 'rejected'
    | 'blocked';
type ComplianceAction =
    | 'approve_export'
    | 'complete_deletion'
    | 'reject_request'
    | 'mark_fulfilled';

type ComplianceRequest = {
    id: string;
    requester: string;
    requesterEmail: string;
    requestType: ComplianceType;
    status: ComplianceStatus;
    affectedData: string[];
    dueDate: string;
    assignedAdmin: string;
    submittedAt: string;
    legalNotes: string;
    adminNotes: string;
    accessBoundary: string;
    checklist: Array<{
        label: string;
        done: boolean;
        owner: string;
        note: string;
    }>;
    auditTrail: Array<{
        timestamp: string;
        actor: string;
        action: string;
        summary: string;
    }>;
};

const requests: ComplianceRequest[] = [
    {
        id: 'CMP-2026-041',
        requester: 'Lina Mansour',
        requesterEmail: 'lina.m@example.com',
        requestType: 'export',
        status: 'in_review',
        affectedData: [
            'Profile',
            'Safety restrictions',
            'Meal logs',
            'Workout logs',
            'AI conversations',
        ],
        dueDate: '2026-05-06',
        assignedAdmin: 'Nour Admin',
        submittedAt: '2026-04-29 14:18',
        legalNotes:
            'Identity was verified through account email and active session. Export should exclude internal moderation notes and raw model traces.',
        adminNotes:
            'Prepare user-readable archive with plan history, logged meals, workouts, and consent history. Link technical traces through audit metadata only.',
        accessBoundary:
            'Queue view hides payloads. Export package must be generated through the controlled compliance job and reviewed before release.',
        checklist: [
            {
                label: 'Verify requester identity',
                done: true,
                owner: 'Support',
                note: 'Email and recent login matched.',
            },
            {
                label: 'Confirm export scope',
                done: true,
                owner: 'Privacy',
                note: 'Includes health profile and user-generated logs.',
            },
            {
                label: 'Exclude internal diagnostics',
                done: false,
                owner: 'Platform',
                note: 'Raw prompts and stack traces stay in diagnostics.',
            },
            {
                label: 'Record fulfillment audit event',
                done: false,
                owner: 'Admin',
                note: 'Required before marking fulfilled.',
            },
        ],
        auditTrail: [
            {
                timestamp: '2026-04-29 14:18',
                actor: 'System',
                action: 'Request created',
                summary: 'Data export request entered compliance queue.',
            },
            {
                timestamp: '2026-04-29 14:42',
                actor: 'Nour Admin',
                action: 'Identity checked',
                summary: 'Requester email and recent session matched.',
            },
        ],
    },
    {
        id: 'CMP-2026-039',
        requester: 'Omar Khoury',
        requesterEmail: 'omar.k@example.com',
        requestType: 'deletion',
        status: 'approved',
        affectedData: [
            'Account',
            'Meal logs',
            'Workout logs',
            'Plans',
            'Coach sessions',
        ],
        dueDate: '2026-05-03',
        assignedAdmin: 'Maya Ops',
        submittedAt: '2026-04-27 09:05',
        legalNotes:
            'Deletion approved after retention check. Financial and abuse-prevention audit records remain as legally required.',
        adminNotes:
            'Run deletion workflow after final export confirmation. Preserve non-content audit markers only.',
        accessBoundary:
            'Deletion details require admin role. The request list must not expose health notes, logs, or conversation payloads.',
        checklist: [
            {
                label: 'Confirm no active professional assignment',
                done: true,
                owner: 'Operations',
                note: 'Assignment removed on Apr 28.',
            },
            {
                label: 'Confirm retention exceptions',
                done: true,
                owner: 'Legal',
                note: 'Payment and security records retained.',
            },
            {
                label: 'Complete deletion job',
                done: false,
                owner: 'Platform',
                note: 'Awaiting final admin confirmation.',
            },
            {
                label: 'Send completion notice',
                done: false,
                owner: 'Support',
                note: 'Notice should avoid technical record identifiers.',
            },
        ],
        auditTrail: [
            {
                timestamp: '2026-04-27 09:05',
                actor: 'System',
                action: 'Request created',
                summary: 'Deletion request submitted from account settings.',
            },
            {
                timestamp: '2026-04-28 16:30',
                actor: 'Legal Admin',
                action: 'Retention approved',
                summary: 'Allowed deletion with limited retention exceptions.',
            },
        ],
    },
    {
        id: 'CMP-2026-036',
        requester: 'Sara Haddad',
        requesterEmail: 'sara.h@example.com',
        requestType: 'consent',
        status: 'new',
        affectedData: ['Consent history', 'Notifications', 'AI coach context'],
        dueDate: '2026-05-08',
        assignedAdmin: 'Unassigned',
        submittedAt: '2026-04-30 08:21',
        legalNotes:
            'Requester disputes marketing consent and asks whether AI coach consent applies to historical meal context.',
        adminNotes:
            'Review consent events and notification delivery records. Do not expose raw delivery logs in normal notes.',
        accessBoundary:
            'Consent event details are visible only in detail view. Raw delivery metadata remains linked through audit logs.',
        checklist: [
            {
                label: 'Review consent timeline',
                done: false,
                owner: 'Privacy',
                note: 'Needs audit log review.',
            },
            {
                label: 'Check notification preference state',
                done: false,
                owner: 'Support',
                note: 'Compare current and historical states.',
            },
            {
                label: 'Draft response',
                done: false,
                owner: 'Legal',
                note: 'Explain AI coach context boundary plainly.',
            },
        ],
        auditTrail: [
            {
                timestamp: '2026-04-30 08:21',
                actor: 'System',
                action: 'Request created',
                summary: 'Consent inquiry submitted by user.',
            },
        ],
    },
    {
        id: 'CMP-2026-033',
        requester: 'Dietitian Directory Applicant',
        requesterEmail: 'applicant@example.com',
        requestType: 'regulated',
        status: 'blocked',
        affectedData: [
            'Professional verification',
            'License evidence',
            'Directory profile',
        ],
        dueDate: '2026-05-01',
        assignedAdmin: 'Nour Admin',
        submittedAt: '2026-04-24 12:11',
        legalNotes:
            'License authority mismatch requires reviewer note before any profile is publicly visible.',
        adminNotes:
            'Do not publish profile until verification queue decision is resolved. Evidence files are not shown in this surface.',
        accessBoundary:
            'Regulated evidence must be reviewed in Professional Verifications. This page stores workflow status and audit links only.',
        checklist: [
            {
                label: 'Open verification queue',
                done: true,
                owner: 'Directory',
                note: 'Related review is pending needs-info response.',
            },
            {
                label: 'Confirm public profile hidden',
                done: true,
                owner: 'Directory',
                note: 'Directory readiness is blocked.',
            },
            {
                label: 'Record legal note',
                done: false,
                owner: 'Legal',
                note: 'Need final wording on authority mismatch.',
            },
        ],
        auditTrail: [
            {
                timestamp: '2026-04-24 12:11',
                actor: 'System',
                action: 'Regulated workflow opened',
                summary: 'Verification evidence mismatch created compliance task.',
            },
            {
                timestamp: '2026-04-25 10:20',
                actor: 'Directory Ops',
                action: 'Profile hidden',
                summary: 'Public profile kept hidden pending verification.',
            },
        ],
    },
    {
        id: 'CMP-2026-028',
        requester: 'Karim Sleiman',
        requesterEmail: 'karim.s@example.com',
        requestType: 'export',
        status: 'fulfilled',
        affectedData: ['Profile', 'Plans', 'Progress records'],
        dueDate: '2026-04-29',
        assignedAdmin: 'Maya Ops',
        submittedAt: '2026-04-20 11:12',
        legalNotes:
            'Export fulfilled inside requested window. Internal admin notes were excluded from archive.',
        adminNotes:
            'Archive delivered through secure download link. Link expiry recorded in audit event.',
        accessBoundary:
            'Fulfilled archive contents are not displayed after completion. Use audit logs for fulfillment metadata.',
        checklist: [
            {
                label: 'Verify identity',
                done: true,
                owner: 'Support',
                note: 'Completed.',
            },
            {
                label: 'Generate export',
                done: true,
                owner: 'Platform',
                note: 'Completed.',
            },
            {
                label: 'Record fulfillment',
                done: true,
                owner: 'Admin',
                note: 'Completed.',
            },
        ],
        auditTrail: [
            {
                timestamp: '2026-04-20 11:12',
                actor: 'System',
                action: 'Request created',
                summary: 'Data export request submitted.',
            },
            {
                timestamp: '2026-04-24 15:35',
                actor: 'Maya Ops',
                action: 'Marked fulfilled',
                summary: 'Secure export link delivered.',
            },
        ],
    },
];

const typeLabels: Record<ComplianceType, string> = {
    export: 'Export',
    deletion: 'Deletion',
    consent: 'Consent',
    regulated: 'Regulated data',
};

const actionLabels: Record<ComplianceAction, string> = {
    approve_export: 'Approve export',
    complete_deletion: 'Complete deletion',
    reject_request: 'Reject request',
    mark_fulfilled: 'Mark fulfilled',
};

function statusValue(status: ComplianceStatus) {
    if (status === 'fulfilled' || status === 'approved') return 'success';
    if (status === 'blocked') return 'danger';
    if (status === 'in_review') return 'warning';
    if (status === 'rejected') return 'rejected';
    return 'pending';
}

function requestTypeValue(type: ComplianceType) {
    if (type === 'deletion' || type === 'regulated') return 'warning';
    if (type === 'consent') return 'info';
    return 'success';
}

function daysUntil(value: string) {
    const due = new Date(`${value}T00:00:00`);
    const today = new Date('2026-04-30T00:00:00');
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);

    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    return `${diff}d remaining`;
}

function completionCount(request: ComplianceRequest) {
    return request.checklist.filter((item) => item.done).length;
}

function ComplianceDetailPanel({
    request,
    onAction,
}: {
    request: ComplianceRequest;
    onAction: (action: ComplianceAction) => void;
}) {
    return (
        <AdminPanel
            title="Checklist detail"
            description="Traceability-first review with access boundaries, checklist status, legal/admin notes, and audit trail."
            className="xl:sticky xl:top-6"
        >
            <AdminScrollArea maxHeightClassName="max-h-[40rem]">
                <div className="space-y-4">
                    <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="haye-kicker">
                                    {request.id}
                                </div>
                                <h3 className="mt-1 text-lg font-semibold text-foreground">
                                    {request.requester}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {request.requesterEmail}
                                </p>
                            </div>
                            <StatusChip
                                value={statusValue(request.status)}
                                label={request.status.replace(/_/g, ' ')}
                            />
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Request type
                                </dt>
                                <dd className="mt-1 font-medium text-foreground">
                                    {typeLabels[request.requestType]}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Assigned admin
                                </dt>
                                <dd className="mt-1 font-medium text-foreground">
                                    {request.assignedAdmin}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Due date
                                </dt>
                                <dd className="mt-1 font-medium text-foreground">
                                    {request.dueDate} ·{' '}
                                    {daysUntil(request.dueDate)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Submitted
                                </dt>
                                <dd className="mt-1 font-medium text-foreground">
                                    {request.submittedAt}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <RiskBannerStack
                        items={[
                            {
                                severity: 'warning',
                                title: 'Access boundary',
                                description: request.accessBoundary,
                                meta: 'Sensitive payloads stay out of queue lists',
                            },
                        ]}
                    />

                    <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                        <div className="text-sm font-semibold text-foreground">
                            Affected data
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {request.affectedData.map((item) => (
                                <Badge
                                    key={item}
                                    variant="outline"
                                    className="border-border/60 bg-background/72"
                                >
                                    {item}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-foreground">
                                Checklist
                            </div>
                            <Badge
                                variant="outline"
                                className="border-primary/25 bg-primary/10 text-primary"
                            >
                                {completionCount(request)} /{' '}
                                {request.checklist.length} complete
                            </Badge>
                        </div>
                        {request.checklist.map((item) => (
                            <div
                                key={item.label}
                                className={cn(
                                    'rounded-[20px] border px-4 py-3',
                                    item.done
                                        ? 'border-success/30 bg-success/8'
                                        : 'border-border/60 bg-background/68',
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {item.done ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-foreground">
                                            {item.label}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            Owner: {item.owner}
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {item.note}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-3">
                        <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                            <div className="text-sm font-semibold text-foreground">
                                Legal notes
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {request.legalNotes}
                            </p>
                        </div>
                        <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                            <div className="text-sm font-semibold text-foreground">
                                Admin notes
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {request.adminNotes}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-semibold text-foreground">
                            Audit trail
                        </div>
                        {request.auditTrail.map((entry) => (
                            <div
                                key={`${entry.timestamp}-${entry.action}`}
                                className="rounded-[20px] border border-border/60 bg-background/68 px-4 py-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm font-medium text-foreground">
                                        {entry.action}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {entry.timestamp}
                                    </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {entry.actor}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {entry.summary}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </AdminScrollArea>

            <AdminStickyBar
                className="mt-4 rounded-[20px]"
                summary={`Selected ${request.id}`}
            >
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onAction('approve_export')}
                >
                    <FileArchive className="h-4 w-4" />
                    Approve export
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onAction('complete_deletion')}
                >
                    <Trash2 className="h-4 w-4" />
                    Complete deletion
                </Button>
            </AdminStickyBar>
        </AdminPanel>
    );
}

export default function AdminPrivacyCompliancePage() {
    const [query, setQuery] = useState('');
    const [requestType, setRequestType] = useState('all');
    const [status, setStatus] = useState('all');
    const [assignee, setAssignee] = useState('all');
    const [selectedId, setSelectedId] = useState(requests[0].id);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [lastAction, setLastAction] = useState<ComplianceAction | null>(null);

    const filteredRequests = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return requests.filter((request) => {
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    request.id,
                    request.requester,
                    request.requesterEmail,
                    request.assignedAdmin,
                    request.affectedData.join(' '),
                    request.legalNotes,
                    request.adminNotes,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            const matchesType =
                requestType === 'all' || request.requestType === requestType;
            const matchesStatus =
                status === 'all' || request.status === status;
            const matchesAssignee =
                assignee === 'all' ||
                (assignee === 'unassigned' &&
                    request.assignedAdmin === 'Unassigned') ||
                request.assignedAdmin === assignee;

            return (
                matchesQuery && matchesType && matchesStatus && matchesAssignee
            );
        });
    }, [assignee, query, requestType, status]);

    const selectedRequest =
        requests.find((request) => request.id === selectedId) ??
        filteredRequests[0] ??
        requests[0];

    const openCount = requests.filter((request) =>
        ['new', 'in_review', 'approved', 'blocked'].includes(request.status),
    ).length;
    const deletionCount = requests.filter(
        (request) => request.requestType === 'deletion',
    ).length;
    const overdueCount = requests.filter((request) =>
        daysUntil(request.dueDate).includes('overdue'),
    ).length;
    const fulfilledCount = requests.filter(
        (request) => request.status === 'fulfilled',
    ).length;

    function handleAction(action: ComplianceAction) {
        setLastAction(action);
    }

    return (
        <>
            <Head title="Admin Privacy & Compliance" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Privacy & Compliance"
                    description="Traceability-focused workspace for data exports, deletions, consent handling, and regulated request workflows."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Open requests"
                                value={openCount}
                                tone="accent"
                                helper="Requests still requiring admin traceability."
                            />
                            <AdminStatCard
                                label="Completed exports"
                                value={fulfilledCount}
                                helper="Fulfilled compliance requests in this view."
                            />
                            <AdminStatCard
                                label="Pending deletions"
                                value={deletionCount}
                                helper="Deletion workflows requiring careful closure."
                            />
                            <AdminStatCard
                                label="Overdue items"
                                value={overdueCount}
                                helper="SLA-risk compliance requests."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Compliance Guidance"
                            description="Prioritize traceability over speed. Do not expose sensitive exports, deletion payloads, consent evidence, or regulated documents in the queue."
                        >
                            <RiskBannerStack
                                items={[
                                    {
                                        severity: 'warning',
                                        title: 'Sensitive payloads stay out of the list',
                                        description:
                                            'The request queue shows summaries only. Open the detail panel to review checklist state, notes, and audit trail with clear access boundaries.',
                                        meta: 'Queue is intentionally low-detail',
                                    },
                                    {
                                        severity: 'info',
                                        title: 'Every completion needs an audit trail',
                                        description:
                                            'Exports, deletions, consent responses, and regulated data decisions should record who acted, what changed, and which records were affected.',
                                        meta: 'Use audit logs for evidence',
                                    },
                                ]}
                            />
                        </AdminSection>

                        <AdminSection
                            title="Filters"
                            description="Narrow by requester, request type, status, and assigned admin before opening request details."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField
                                        label="Search"
                                        className="min-w-[240px] flex-1"
                                    >
                                        <AdminSearchInput
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Search requester, request ID, admin, or affected data summary"
                                        />
                                    </AdminField>
                                    <AdminField
                                        label="Request type"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={requestType}
                                            onChange={(event) =>
                                                setRequestType(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="all">
                                                All types
                                            </option>
                                            <option value="export">
                                                Exports
                                            </option>
                                            <option value="deletion">
                                                Deletions
                                            </option>
                                            <option value="consent">
                                                Consent
                                            </option>
                                            <option value="regulated">
                                                Regulated data
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField
                                        label="Status"
                                        className="sm:w-52"
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
                                            <option value="new">New</option>
                                            <option value="in_review">
                                                In review
                                            </option>
                                            <option value="approved">
                                                Approved
                                            </option>
                                            <option value="fulfilled">
                                                Fulfilled
                                            </option>
                                            <option value="blocked">
                                                Blocked
                                            </option>
                                            <option value="rejected">
                                                Rejected
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField
                                        label="Assigned admin"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={assignee}
                                            onChange={(event) =>
                                                setAssignee(event.target.value)
                                            }
                                        >
                                            <option value="all">
                                                All admins
                                            </option>
                                            <option value="Nour Admin">
                                                Nour Admin
                                            </option>
                                            <option value="Maya Ops">
                                                Maya Ops
                                            </option>
                                            <option value="Unassigned">
                                                Unassigned
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                        </AdminSection>

                        <AdminSection
                            title="Request Queue"
                            description="Full-width queue with readable summaries only. Sensitive payloads are never shown inline."
                        >
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] xl:items-start">
                                <AdminPanel
                                    title="Compliance requests"
                                    description="Select a request to review the checklist and audit trail."
                                    className="p-0"
                                >
                                    <AdminScrollArea
                                        className="px-4 pb-4"
                                        maxHeightClassName="max-h-[38rem]"
                                    >
                                        <AdminDataTable
                                            className="mt-4"
                                            tableClassName="min-w-[980px]"
                                        >
                                            <ProductTableHead>
                                                <ProductTableRow>
                                                    <ProductTableHeaderCell>
                                                        Requester
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Type
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Status
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Affected data
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Due date
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Assigned admin
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Checklist
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Action
                                                    </ProductTableHeaderCell>
                                                </ProductTableRow>
                                            </ProductTableHead>
                                            <ProductTableBody>
                                                {filteredRequests.map(
                                                    (request) => {
                                                        const selected =
                                                            request.id ===
                                                            selectedRequest.id;
                                                        const completed =
                                                            completionCount(
                                                                request,
                                                            );

                                                        return (
                                                            <ProductTableRow
                                                                key={request.id}
                                                                interactive
                                                                className={
                                                                    selected
                                                                        ? 'bg-primary/8'
                                                                        : undefined
                                                                }
                                                            >
                                                                <ProductTableCell>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedId(
                                                                                request.id,
                                                                            );
                                                                            setDrawerOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        className="text-left"
                                                                    >
                                                                        <div className="font-medium text-foreground">
                                                                            {
                                                                                request.requester
                                                                            }
                                                                        </div>
                                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                                            {
                                                                                request.id
                                                                            }{' '}
                                                                            ·{' '}
                                                                            {
                                                                                request.requesterEmail
                                                                            }
                                                                        </div>
                                                                    </button>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <StatusChip
                                                                        value={requestTypeValue(
                                                                            request.requestType,
                                                                        )}
                                                                        label={
                                                                            typeLabels[
                                                                                request
                                                                                    .requestType
                                                                            ]
                                                                        }
                                                                    />
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <StatusChip
                                                                        value={statusValue(
                                                                            request.status,
                                                                        )}
                                                                        label={request.status.replace(
                                                                            /_/g,
                                                                            ' ',
                                                                        )}
                                                                    />
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="max-w-xs">
                                                                        <StatusChipSet
                                                                            items={request.affectedData
                                                                                .slice(
                                                                                    0,
                                                                                    3,
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        item,
                                                                                    ) => ({
                                                                                        value: 'info',
                                                                                        label: item,
                                                                                    }),
                                                                                )}
                                                                        />
                                                                        {request
                                                                            .affectedData
                                                                            .length >
                                                                        3 ? (
                                                                            <div className="mt-2 text-xs text-muted-foreground">
                                                                                +
                                                                                {request
                                                                                    .affectedData
                                                                                    .length -
                                                                                    3}{' '}
                                                                                more
                                                                                in
                                                                                detail
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="font-medium text-foreground">
                                                                        {
                                                                            request.dueDate
                                                                        }
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                                        {daysUntil(
                                                                            request.dueDate,
                                                                        )}
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    {
                                                                        request.assignedAdmin
                                                                    }
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    {completed}/
                                                                    {
                                                                        request
                                                                            .checklist
                                                                            .length
                                                                    }{' '}
                                                                    complete
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedId(
                                                                                request.id,
                                                                            );
                                                                            setDrawerOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                    >
                                                                        Review
                                                                    </Button>
                                                                </ProductTableCell>
                                                            </ProductTableRow>
                                                        );
                                                    },
                                                )}

                                                {filteredRequests.length ===
                                                0 ? (
                                                    <ProductTableEmptyRow
                                                        colSpan={8}
                                                        title="No compliance requests match the filters"
                                                        description="Adjust filters to review the request queue."
                                                    />
                                                ) : null}
                                            </ProductTableBody>
                                        </AdminDataTable>
                                    </AdminScrollArea>
                                </AdminPanel>

                                <div className="hidden xl:block">
                                    <ComplianceDetailPanel
                                        request={selectedRequest}
                                        onAction={handleAction}
                                    />
                                </div>
                            </div>
                        </AdminSection>

                        <AdminStickyBar
                            summary={
                                lastAction
                                    ? `Prepared action: ${actionLabels[lastAction]}`
                                    : `Selected: ${selectedRequest.id}`
                            }
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleAction('approve_export')}
                            >
                                <FileArchive className="h-4 w-4" />
                                Approve export
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                    handleAction('complete_deletion')
                                }
                            >
                                <Trash2 className="h-4 w-4" />
                                Complete deletion
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleAction('reject_request')}
                            >
                                <XCircle className="h-4 w-4" />
                                Reject request
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleAction('mark_fulfilled')}
                            >
                                <ClipboardCheck className="h-4 w-4" />
                                Mark fulfilled
                            </Button>
                        </AdminStickyBar>

                        <div className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Sensitive payloads remain outside this queue.
                                Use audit logs for evidence and diagnostics for
                                technical traces.
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <Button asChild variant="outline">
                                    <Link href="/admin/logs">
                                        <ShieldCheck className="h-4 w-4" />
                                        Open audit logs
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

                    <EntityDetailDrawer
                        open={drawerOpen}
                        onOpenChange={setDrawerOpen}
                        title={`Compliance request ${selectedRequest.id}`}
                        description="Mobile detail drawer with checklist, notes, audit trail, and access boundaries."
                        footer={
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDrawerOpen(false)}
                                >
                                    Close
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleAction('mark_fulfilled')}
                                >
                                    Mark fulfilled
                                </Button>
                            </>
                        }
                    >
                        <ComplianceDetailPanel
                            request={selectedRequest}
                            onAction={handleAction}
                        />
                    </EntityDetailDrawer>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
