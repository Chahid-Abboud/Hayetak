import {
    AdminCheckboxField,
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
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
import { Checkbox } from '@/components/ui/checkbox';
import { jsonRequestInit } from '@/lib/http';
import {
    type AdminBulkUserAction,
    type AdminBulkUsersPayload,
    type AdminBulkUsersResponse,
} from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Brain,
    CalendarDays,
    Dumbbell,
    RefreshCcw,
    Settings2,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

type AdminUser = {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    username?: string | null;
    role: string;
    verified: boolean;
    status?: string | null;
    city?: string | null;
    deleted_at?: string | null;
    meal_entries_count?: number;
    meal_logs_count?: number;
    workout_logs_count?: number;
    notifications_received_count?: number;
    ai_conversations_count?: number;
};

type AdminUserResponse = {
    data?: AdminUser[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
};

type PlanDiffSummary = {
    has_current: boolean;
    has_previous: boolean;
    changed: boolean;
    current_version: number;
    previous_version?: number | null;
    current_generated_at?: string | null;
    changes: Record<string, string[]>;
};

type UserDetailResponse = {
    user: {
        id: number;
        email: string;
        display_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
        role: 'admin' | 'nutritionist' | 'trainer' | 'client';
        verified: boolean;
        status?: string | null;
        city?: string | null;
        allergies?: string[];
        has_medical_history: boolean;
        medical_history?: string | null;
        diet_name?: string | null;
        dietary_goal?: string | null;
        fitness_goal?: string | null;
        workout_location?: string | null;
    };
    summary: {
        meal_entries: number;
        workout_logs: number;
        notifications: number;
        ai_conversations: number;
        appointments: number;
        ai_plans: number;
        assignments: number;
    };
    verification?: {
        role?: string | null;
        review_status?: string | null;
        authority?: string | null;
        notes?: string | null;
    } | null;
    recent: {
        notifications: Array<{
            id: number;
            title?: string | null;
            body?: string | null;
            created_at?: string | null;
        }>;
        meal_entries: Array<{
            id: number;
            meal_type?: string | null;
            servings?: string | number | null;
            eaten_at?: string | null;
            food?: { name?: string | null } | null;
        }>;
        meal_logs: Array<{
            id: number;
            consumed_at?: string | null;
            created_at?: string | null;
            items?: unknown[];
        }>;
        workout_logs: Array<{
            id: number;
            performed_at?: string | null;
            mood?: string | null;
            sets?: unknown[];
        }>;
        appointments: Array<{
            id: number;
            scheduled_at?: string | null;
            status?: string | null;
            professional_role?: string | null;
        }>;
        ai_conversations: Array<{
            id: number;
            title?: string | null;
            messages_count?: number | null;
            last_message_at?: string | null;
        }>;
        planner_feedback: Array<{
            ai_request_id: number;
            generated_at?: string | null;
            feedback_applied: boolean;
            confidence?: string | null;
            actual_weight_date?: string | null;
        }>;
        plan_diffs: {
            diet?: PlanDiffSummary | null;
            workout?: PlanDiffSummary | null;
        };
    };
};

function readSelectedUserId() {
    if (typeof window === 'undefined') {
        return null;
    }

    const value = Number(
        new URLSearchParams(window.location.search).get('user'),
    );

    return Number.isFinite(value) && value > 0 ? value : null;
}

function syncSelectedUserId(userId: number | null) {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);

    if (userId) {
        url.searchParams.set('user', String(userId));
    } else {
        url.searchParams.delete('user');
    }

    window.history.replaceState(window.history.state, '', url);
}

function formatUserName(user: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    email: string;
}) {
    return (
        user.display_name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.name ||
        user.email
    );
}

function formatDateTime(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function PlanWatchCard({
    title,
    diff,
}: {
    title: string;
    diff?: PlanDiffSummary | null;
}) {
    if (!diff?.has_current) {
        return (
            <div className="rounded-[22px] border border-dashed border-border/60 bg-background/50 px-4 py-4 text-sm text-muted-foreground">
                {title}: no generated plan yet.
            </div>
        );
    }

    const notableChanges = Object.values(diff.changes ?? {})
        .flat()
        .slice(0, 3);

    return (
        <div className="dashboard-surface rounded-[24px] px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-foreground">
                    {title}
                </div>
                <StatusChip
                    value={diff.changed ? 'needs_review' : 'approved'}
                    label={diff.changed ? 'Changed' : 'Stable'}
                />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
                Version {diff.current_version}
                {diff.has_previous && diff.previous_version
                    ? ` from v${diff.previous_version}`
                    : ''}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
                Updated {formatDateTime(diff.current_generated_at)}
            </div>
            <div className="mt-3 space-y-2">
                {notableChanges.length > 0 ? (
                    notableChanges.map((change) => (
                        <div
                            key={`${title}-${change}`}
                            className="dashboard-surface-soft rounded-2xl px-3 py-2 text-sm text-foreground"
                        >
                            {change}
                        </div>
                    ))
                ) : (
                    <div className="dashboard-surface-soft rounded-2xl px-3 py-2 text-sm text-muted-foreground">
                        No structural changes detected in the latest comparison.
                    </div>
                )}
            </div>
        </div>
    );
}

function ContextRow({
    icon,
    label,
    value,
    meta,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    meta?: string;
}) {
    return (
        <div className="dashboard-surface-soft rounded-[22px] px-4 py-3">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted-foreground">{icon}</span>
                <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        {label}
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                        {value}
                    </div>
                    {meta ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                            {meta}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function SignalList({
    items,
    emptyText,
}: {
    items: Array<{
        id: string | number;
        title: ReactNode;
        description?: ReactNode;
        meta?: ReactNode;
    }>;
    emptyText: string;
}) {
    if (items.length === 0) {
        return (
            <div className="rounded-[18px] border border-dashed border-border/60 bg-background/50 px-3 py-3 text-sm text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="rounded-[18px] border border-border/55 bg-background/68 px-3 py-3"
                >
                    <div className="text-sm font-medium text-foreground">
                        {item.title}
                    </div>
                    {item.description ? (
                        <div className="mt-1 text-sm leading-5 text-muted-foreground">
                            {item.description}
                        </div>
                    ) : null}
                    {item.meta ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                            {item.meta}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

function UserInvestigationPanel({
    detail,
    loading,
    error,
    onRefresh,
}: {
    detail: UserDetailResponse | null;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
}) {
    if (loading) {
        return (
            <AdminEmpty
                title="Loading user context"
                description="Pulling profile, restrictions, recent activity, and plan signals for the selected account."
            />
        );
    }

    if (error) {
        return (
            <AdminNotice tone="danger">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{error}</span>
                    <Button type="button" variant="outline" onClick={onRefresh}>
                        Retry
                    </Button>
                </div>
            </AdminNotice>
        );
    }

    if (!detail) {
        return (
            <AdminEmpty
                title="Select a user"
                description="Keep the list on the left, then inspect an account here without leaving the workspace."
            />
        );
    }

    const userName = formatUserName(detail.user);
    const riskItems = [];

    if (!detail.user.verified) {
        riskItems.push({
            severity: 'warning' as const,
            title: 'Verification still open',
            description:
                'This account is not verified yet, so permission changes and support decisions should be double-checked.',
            meta: detail.user.role,
        });
    }

    if (
        detail.user.status &&
        ['suspended', 'rejected'].includes(detail.user.status)
    ) {
        riskItems.push({
            severity: 'danger' as const,
            title: `Account status is ${detail.user.status}`,
            description:
                'Review the surrounding activity before reactivating access or making downstream plan changes.',
        });
    } else if (
        detail.user.status &&
        ['needs_review', 'needs_info'].includes(detail.user.status)
    ) {
        riskItems.push({
            severity: 'warning' as const,
            title: `Account status is ${detail.user.status.replace(/_/g, ' ')}`,
            description:
                'There is already an open moderation or profile follow-up on this account.',
        });
    }

    if ((detail.user.allergies ?? []).length > 0) {
        riskItems.push({
            severity: 'danger' as const,
            title: 'Allergies recorded',
            description: (detail.user.allergies ?? []).join(', '),
            meta: 'Coach and planner safety',
        });
    }

    if (detail.user.has_medical_history && detail.user.medical_history) {
        riskItems.push({
            severity: 'warning' as const,
            title: 'Medical history on file',
            description: detail.user.medical_history,
            meta: 'Review before plan or workout changes',
        });
    }

    if (
        detail.verification?.review_status &&
        detail.verification.review_status !== 'approved'
    ) {
        riskItems.push({
            severity: 'info' as const,
            title: 'Professional verification requires attention',
            description:
                detail.verification.notes ||
                'The latest professional verification record is not approved yet.',
            meta: detail.verification.review_status,
        });
    }

    const latestAppointment = detail.recent.appointments[0];
    const latestConversation = detail.recent.ai_conversations[0];
    const latestPlannerRun = detail.recent.planner_feedback[0];
    const latestMealEntries = (detail.recent.meal_entries ?? []).slice(0, 3);
    const latestWorkoutLogs = (detail.recent.workout_logs ?? []).slice(0, 3);
    const allergies = detail.user.allergies ?? [];
    const planStatus = [
        detail.recent.plan_diffs.diet?.has_current ? 'Diet plan active' : null,
        detail.recent.plan_diffs.workout?.has_current
            ? 'Workout plan active'
            : null,
    ]
        .filter(Boolean)
        .join(' / ');

    return (
        <div className="space-y-4">
            <div className="dashboard-surface rounded-[30px] px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="haye-kicker">Investigation context</div>
                        <h3
                            className="mt-3 text-3xl tracking-tight text-foreground"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {userName}
                        </h3>
                        <div className="mt-2 text-sm text-muted-foreground">
                            {detail.user.email}
                        </div>
                    </div>
                    <Button type="button" variant="outline" onClick={onRefresh}>
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                <StatusChipSet
                    className="mt-4"
                    items={[
                        { value: detail.user.role, label: detail.user.role },
                        {
                            value: detail.user.verified
                                ? 'verified'
                                : 'unverified',
                        },
                        { value: detail.user.status || 'pending' },
                        detail.user.workout_location
                            ? {
                                  value: 'default',
                                  label: detail.user.workout_location,
                              }
                            : { value: '', label: '' },
                    ]}
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ContextRow
                        icon={<UtensilsCrossed className="h-4 w-4" />}
                        label="Nutrition profile"
                        value={
                            detail.user.diet_name ||
                            detail.user.dietary_goal ||
                            'No diet preference recorded'
                        }
                        meta={detail.user.city || 'Location not set'}
                    />
                    <ContextRow
                        icon={<ShieldAlert className="h-4 w-4" />}
                        label="Account state"
                        value={
                            detail.user.status || 'No explicit status set'
                        }
                        meta={`Verified ${detail.user.verified ? 'yes' : 'no'} / Email ${detail.user.email}`}
                    />
                </div>
            </div>

            {riskItems.length > 0 ? (
                <RiskBannerStack items={riskItems} />
            ) : (
                <AdminNotice tone="success">
                    No active safety or moderation flags surfaced from this
                    quick view.
                </AdminNotice>
            )}

            <AdminPanel
                title="Safety profile summary"
                description="Readable constraints that must be respected by planner, coach, and admin edits."
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <ContextRow
                        icon={<ShieldAlert className="h-4 w-4" />}
                        label="Allergies"
                        value={
                            allergies.length > 0
                                ? allergies.join(', ')
                                : 'No allergies recorded'
                        }
                        meta="Hard exclusion for food and recipe suggestions"
                    />
                    <ContextRow
                        icon={<UtensilsCrossed className="h-4 w-4" />}
                        label="Diet type"
                        value={
                            detail.user.diet_name ||
                            detail.user.dietary_goal ||
                            'No diet type recorded'
                        }
                        meta="Use when reviewing meals, plans, and coach answers"
                    />
                    <ContextRow
                        icon={<ShieldAlert className="h-4 w-4" />}
                        label="Medical / injury signals"
                        value={
                            detail.user.has_medical_history
                                ? detail.user.medical_history ||
                                  'Medical history present'
                                : 'No medical history recorded'
                        }
                        meta="Review before training or nutrition changes"
                    />
                    <ContextRow
                        icon={<Dumbbell className="h-4 w-4" />}
                        label="Workout setup"
                        value={
                            detail.user.workout_location ||
                            'No workout location recorded'
                        }
                        meta={
                            detail.user.fitness_goal ||
                            'No fitness goal recorded'
                        }
                    />
                </div>
            </AdminPanel>

            <AdminPanel
                title="Recent operating context"
                description="The latest touchpoints that help admins decide whether to open the full record."
            >
                <div className="space-y-3">
                    <ContextRow
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="Latest appointment"
                        value={
                            latestAppointment
                                ? formatDateTime(latestAppointment.scheduled_at)
                                : 'No recent appointments'
                        }
                        meta={
                            latestAppointment
                                ? `${latestAppointment.status ?? 'status unknown'}${latestAppointment.professional_role ? ` / ${latestAppointment.professional_role}` : ''}`
                                : undefined
                        }
                    />
                    <ContextRow
                        icon={<Brain className="h-4 w-4" />}
                        label="Latest AI conversation"
                        value={
                            latestConversation?.title ||
                            'No coach conversation yet'
                        }
                        meta={
                            latestConversation
                                ? `${latestConversation.messages_count ?? 0} messages / ${formatDateTime(latestConversation.last_message_at)}`
                                : undefined
                        }
                    />
                    <ContextRow
                        icon={<RefreshCcw className="h-4 w-4" />}
                        label="Latest planner signal"
                        value={
                            latestPlannerRun
                                ? formatDateTime(latestPlannerRun.generated_at)
                                : 'No planner runs yet'
                        }
                        meta={
                            latestPlannerRun
                                ? `${latestPlannerRun.feedback_applied ? 'Feedback adjustment applied' : 'Base prediction only'}${latestPlannerRun.confidence ? ` / ${latestPlannerRun.confidence} confidence` : ''}`
                                : undefined
                        }
                    />
                </div>
            </AdminPanel>

            <AdminPanel
                title="Plan status"
                description="Fast plan signals so admins can spot plan churn before opening the full editor."
            >
                <div className="space-y-3">
                    <ContextRow
                        icon={<ShieldCheck className="h-4 w-4" />}
                        label="Current plan state"
                        value={planStatus || 'No generated plans found'}
                        meta={`AI plans ${detail.summary.ai_plans} / Planner feedback ${detail.recent.planner_feedback.length}`}
                    />
                    <PlanWatchCard
                        title="Diet plan"
                        diff={detail.recent.plan_diffs.diet}
                    />
                    <PlanWatchCard
                        title="Workout plan"
                        diff={detail.recent.plan_diffs.workout}
                    />
                </div>
            </AdminPanel>

            <AdminPanel
                title="Recent meals and workouts"
                description="Compact activity signals only; open the full record for edits."
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <SignalList
                        emptyText="No recent meal signals."
                        items={latestMealEntries.map((entry) => ({
                            id: `meal-${entry.id}`,
                            title:
                                entry.food?.name ||
                                entry.meal_type ||
                                'Meal entry',
                            description: `${entry.meal_type ?? 'Meal'} / ${entry.servings ?? '-'} serving(s)`,
                            meta: formatDateTime(entry.eaten_at),
                        }))}
                    />
                    <SignalList
                        emptyText="No recent workout signals."
                        items={latestWorkoutLogs.map((log) => ({
                            id: `workout-${log.id}`,
                            title: `${log.sets?.length ?? 0} logged set(s)`,
                            description: log.mood || 'Workout session',
                            meta: formatDateTime(log.performed_at),
                        }))}
                    />
                </div>
            </AdminPanel>

            <AdminPanel
                title="AI activity"
                description="Coach and planner signals are summarized here; raw prompts and traces stay in diagnostics."
            >
                <SignalList
                    emptyText="No recent AI activity."
                    items={[
                        ...(detail.recent.ai_conversations ?? [])
                            .slice(0, 3)
                            .map((conversation) => ({
                                id: `ai-chat-${conversation.id}`,
                                title:
                                    conversation.title ||
                                    'Untitled coach conversation',
                                description: `${conversation.messages_count ?? 0} messages`,
                                meta: formatDateTime(
                                    conversation.last_message_at,
                                ),
                            })),
                        ...(detail.recent.planner_feedback ?? [])
                            .slice(0, 2)
                            .map((run) => ({
                                id: `planner-${run.ai_request_id}`,
                                title: `Planner request #${run.ai_request_id}`,
                                description: run.feedback_applied
                                    ? 'Feedback adjustment applied'
                                    : 'Base prediction only',
                                meta: formatDateTime(run.generated_at),
                            })),
                    ]}
                />
            </AdminPanel>

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href={`/admin/users/${detail.user.id}`}>
                        Open full record
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/admin/logs">
                        <Settings2 className="h-4 w-4" />
                        Linked logs
<<<<<<< HEAD
=======
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/admin/diagnostics">
                        Diagnostics
>>>>>>> origin/main
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function AdminUsersIndex() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('all');
    const [verified, setVerified] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [perPage, setPerPage] = useState('50');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState<AdminBulkUserAction>('verify');
    const [bulkStatus, setBulkStatus] = useState('active');
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(() =>
        readSelectedUserId(),
    );
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detail, setDetail] = useState<UserDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const selectUser = useCallback((userId: number | null) => {
        setSelectedUserId(userId);
        syncSelectedUserId(userId);
    }, []);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                per_page: perPage,
                page: String(currentPage),
            });

            if (search.trim()) {
                params.set('search', search.trim());
            }
            if (role !== 'all') {
                params.set('role', role);
            }
            if (verified !== 'all') {
                params.set('verified', verified);
            }
            if (statusFilter !== 'all') {
                params.set('status', statusFilter);
            }
            if (includeDeleted) {
                params.set('include_deleted', '1');
            }

            const res = await fetch(`/api/admin/users?${params.toString()}`);
            if (!res.ok) {
                throw new Error('Could not load users.');
            }

            const json = (await res.json()) as AdminUserResponse;
            const rows = Array.isArray(json?.data) ? json.data : [];

            setUsers(rows);
            setTotal(Number(json?.total ?? 0));
            setCurrentPage(Number(json?.current_page ?? 1));
            setLastPage(Number(json?.last_page ?? 1));
            setFrom(json?.from ?? null);
            setTo(json?.to ?? null);
            setSelectedUserIds((current) =>
                current.filter((id) => rows.some((user) => user.id === id)),
            );
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load users.',
            );
        } finally {
            setLoading(false);
        }
    }, [
        currentPage,
        includeDeleted,
        perPage,
        role,
        search,
        statusFilter,
        verified,
    ]);

    const loadDetail = useCallback(async (userId: number) => {
        setDetailLoading(true);
        setDetailError(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            if (!res.ok) {
                throw new Error('Could not load the selected user context.');
            }

            const json = (await res.json()) as UserDetailResponse;
            setDetail(json);
        } catch (loadError) {
            setDetail(null);
            setDetailError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load the selected user context.',
            );
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        setCurrentPage(1);
    }, [includeDeleted, perPage, role, search, statusFilter, verified]);

    useEffect(() => {
        if (users.length === 0) {
            selectUser(null);
            setDetail(null);
            return;
        }

        if (
            !selectedUserId ||
            !users.some((user) => user.id === selectedUserId)
        ) {
            selectUser(users[0].id);
        }
    }, [selectUser, selectedUserId, users]);

    useEffect(() => {
        if (!selectedUserId) {
            setDetail(null);
            setDetailError(null);
            return;
        }

        void loadDetail(selectedUserId);
    }, [loadDetail, selectedUserId]);

    const pageSummary = useMemo(() => {
        const verifiedCount = users.filter((user) => user.verified).length;
        const professionalCount = users.filter((user) =>
            ['trainer', 'nutritionist'].includes(user.role),
        ).length;

        return { verifiedCount, professionalCount };
    }, [users]);

    const activeFilterCount = useMemo(
        () =>
            [
                search.trim() !== '',
                role !== 'all',
                verified !== 'all',
                statusFilter !== 'all',
                includeDeleted,
            ].filter(Boolean).length,
        [includeDeleted, role, search, statusFilter, verified],
    );

    const selectedRiskCount = useMemo(() => {
        if (!detail) {
            return 0;
        }

        let count = 0;

        if (!detail.user.verified) {
            count += 1;
        }

        if (
            detail.user.status &&
            ['suspended', 'rejected', 'needs_review', 'needs_info'].includes(
                detail.user.status,
            )
        ) {
            count += 1;
        }

        if ((detail.user.allergies ?? []).length > 0) {
            count += 1;
        }

        if (detail.user.has_medical_history && detail.user.medical_history) {
            count += 1;
        }

        if (
            detail.verification?.review_status &&
            detail.verification.review_status !== 'approved'
        ) {
            count += 1;
        }

        return count;
    }, [detail]);

    const allVisibleSelected =
        users.length > 0 &&
        users.every((user) => selectedUserIds.includes(user.id));

    async function runBulkAction() {
        if (selectedUserIds.length === 0 || bulkBusy) {
            return;
        }

        if (
            bulkAction === 'delete' &&
            !window.confirm(
                `Delete ${selectedUserIds.length} selected user(s)? This writes admin audit entries.`,
            )
        ) {
            return;
        }

        setBulkBusy(true);
        setError(null);
        setBulkFeedback(null);

        try {
            const payload: AdminBulkUsersPayload = {
                user_ids: selectedUserIds,
                action: bulkAction,
            };

            if (bulkAction === 'set_status') {
                payload.status = bulkStatus;
            }

            const response = await fetch(
                '/api/admin/users/bulk-update',
                jsonRequestInit('POST', payload),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not run bulk update.',
                );
            }

            const json = (await response.json()) as AdminBulkUsersResponse;
            setBulkFeedback(
                `Updated ${json.summary.updated_count} user(s), skipped ${json.summary.skipped_count}.`,
            );
            setSelectedUserIds([]);
            await loadUsers();

            if (selectedUserId) {
                await loadDetail(selectedUserId);
            }
        } catch (bulkError) {
            setError(
                bulkError instanceof Error
                    ? bulkError.message
                    : 'Could not run bulk update.',
            );
        } finally {
            setBulkBusy(false);
        }
    }

    async function runUserAction(
        user: AdminUser,
        action: 'verify' | 'suspend' | 'reactivate' | 'delete',
    ) {
        const confirmed =
            action !== 'delete' ||
            window.confirm(
                `Delete ${formatUserName(user)}? This writes an admin audit entry.`,
            );

        if (!confirmed) {
            return;
        }

        setError(null);
        setBulkFeedback(null);

        try {
            let response: Response;

            if (action === 'verify') {
                response = await fetch(
                    `/api/admin/users/${user.id}/verification`,
                    jsonRequestInit('PATCH', { verified: true }),
                );
            } else if (action === 'delete') {
                response = await fetch(
                    `/api/admin/users/${user.id}`,
                    jsonRequestInit('DELETE', {
                        reason: 'Quick delete from admin users workspace.',
                    }),
                );
            } else {
                response = await fetch(
                    `/api/admin/users/${user.id}`,
                    jsonRequestInit('PUT', {
                        status:
                            action === 'suspend' ? 'suspended' : 'active',
                    }),
                );
            }

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not update the user.',
                );
            }

            setBulkFeedback(`${formatUserName(user)} updated.`);
            await loadUsers();

            if (selectedUserId === user.id && action !== 'delete') {
                await loadDetail(user.id);
            } else if (selectedUserId === user.id) {
                selectUser(null);
            }
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : 'Could not update the user.',
            );
        }
    }

    const drawerTitle = detail?.user
        ? formatUserName(detail.user)
        : 'User context';

    const userFiltersToolbar = (
        <AdminToolbar>
            <AdminToolbarGroup grow>
                <AdminField
                    label="Search"
                    className="sm:min-w-[20rem] xl:flex-1"
                >
                    <AdminSearchInput
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, email, username, or city"
                    />
                </AdminField>

                <AdminField label="Role" className="sm:w-52">
                    <AdminNativeSelect
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                    >
                        <option value="all">All roles</option>
                        <option value="admin">Admin</option>
                        <option value="client">Client</option>
                        <option value="trainer">Trainer</option>
                        <option value="nutritionist">Nutritionist</option>
                    </AdminNativeSelect>
                </AdminField>

                <AdminField label="Verification" className="sm:w-52">
                    <AdminNativeSelect
                        value={verified}
                        onChange={(event) => setVerified(event.target.value)}
                    >
                        <option value="all">All accounts</option>
                        <option value="true">Verified</option>
                        <option value="false">Not verified</option>
                    </AdminNativeSelect>
                </AdminField>

                <AdminField label="Rows per page" className="sm:w-44">
                    <AdminNativeSelect
                        value={perPage}
                        onChange={(event) => setPerPage(event.target.value)}
                    >
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </AdminNativeSelect>
                </AdminField>

                <AdminField label="Status" className="sm:w-52">
                    <AdminNativeSelect
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="all">All statuses</option>
                        <option value="active">active</option>
                        <option value="pending">pending</option>
                        <option value="needs_review">needs_review</option>
                        <option value="needs_info">needs_info</option>
                        <option value="rejected">rejected</option>
                        <option value="suspended">suspended</option>
                    </AdminNativeSelect>
                </AdminField>

                <AdminField label="Scope" className="sm:w-52">
                    <AdminNativeSelect
                        value={includeDeleted ? 'include_deleted' : 'active_only'}
                        onChange={(event) =>
                            setIncludeDeleted(
                                event.target.value === 'include_deleted',
                            )
                        }
                    >
                        <option value="active_only">Active only</option>
                        <option value="include_deleted">Include deleted</option>
                    </AdminNativeSelect>
                </AdminField>
            </AdminToolbarGroup>
        </AdminToolbar>
    );

    return (
        <>
            <Head title="Admin Users" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="User Management"
                    description="Search every account, then investigate profile health, safety context, and plan activity without losing your place in the queue."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Users Matching Filters"
                                value={loading ? '...' : String(total)}
                                tone="accent"
                                helper="Live count from the current search and role filters."
                            />
                            <AdminStatCard
                                label="Visible On This Page"
                                value={loading ? '...' : String(users.length)}
                                helper="Helpful for focused review sessions."
                            />
                            <AdminStatCard
                                label="Selected On This Page"
                                value={String(selectedUserIds.length)}
                                helper="Selection state for bulk verification or status changes."
                            />
                            <AdminStatCard
                                label="Verified Accounts"
                                value={
                                    loading
                                        ? '...'
                                        : String(pageSummary.verifiedCount)
                                }
                                helper="Count from the current page of results."
                            />
                            <AdminStatCard
                                label="Professionals"
                                value={
                                    loading
                                        ? '...'
                                        : String(pageSummary.professionalCount)
                                }
                                helper="Trainers and nutritionists in the current view."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage Guidance"
                            description="Keep the queue readable, make bulk actions intentional, and use separate audit surfaces when you need raw metadata or debugging detail."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Queue snapshot"
                                    description="A quick read on the current user queue so you know whether you are browsing broadly or working through a narrow filter set."
                                >
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                Active filters
                                            </div>
                                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                                {activeFilterCount === 0
                                                    ? 'All users view'
                                                    : `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}
                                            </div>
                                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {includeDeleted
                                                    ? 'Deleted accounts are included in this queue.'
                                                    : 'Queue is limited to active accounts only.'}
                                            </div>
                                        </div>

                                        <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                Bulk action rail
                                            </div>
                                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                                {selectedUserIds.length === 0
                                                    ? 'No users selected'
                                                    : `${selectedUserIds.length} selected`}
                                            </div>
                                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                                Use bulk verification or status
                                                changes without leaving the
                                                current filter context.
                                            </div>
                                        </div>
                                    </div>
                                </AdminOverviewCard>

                                <AdminOverviewCard
                                    title="Current investigation"
                                    description="The selected record stays human-readable here, while raw audit and technical detail stays in dedicated follow-up surfaces."
                                >
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                Selected record
                                            </div>
                                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                                {detail?.user
                                                    ? formatUserName(
                                                          detail.user,
                                                      )
                                                    : 'No user selected'}
                                            </div>
                                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {detail?.user
                                                    ? 'Keep the investigation panel open for safety, activity, and plan context before opening the full editor.'
                                                    : 'Choose a user from the table to keep context pinned while you triage.'}
                                            </div>
                                        </div>

                                        <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                Safety signals
                                            </div>
                                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                                {detail
                                                    ? `${selectedRiskCount} visible signal${selectedRiskCount === 1 ? '' : 's'}`
                                                    : 'Pending selection'}
                                            </div>
                                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                                Allergies, medical history,
                                                moderation state, and
                                                verification gaps should stay
                                                visible before edits.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button asChild variant="outline">
                                            <Link href="/admin/logs">
                                                <Settings2 className="h-4 w-4" />
                                                Open logs
                                            </Link>
                                        </Button>
                                        {detail?.user ? (
                                            <Button asChild>
                                                <Link
                                                    href={`/admin/users/${detail.user.id}`}
                                                >
                                                    Open full record
                                                </Link>
                                            </Button>
                                        ) : null}
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Operations Workspace"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} users. Select a record to keep quick safety and activity context visible while you triage.`
                                    : 'Select a record to keep quick safety and activity context visible while you triage.'
                            }
                            actions={
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    {loading
                                        ? 'Refreshing results...'
                                        : 'Filters update automatically'}
                                </div>
                            }
                        >
                            {error ? (
                                <AdminNotice tone="danger">{error}</AdminNotice>
                            ) : null}

                            <AdminScrollArea
                                className="mb-4"
                                maxHeightClassName="max-h-[56vh]"
                            >
                                <UserInvestigationPanel
                                    detail={detail}
                                    loading={detailLoading}
                                    error={detailError}
                                    onRefresh={() => {
                                        if (selectedUserId) {
                                            void loadDetail(selectedUserId);
                                        }
                                    }}
                                />
                            </AdminScrollArea>

                            <div className="mb-4">{userFiltersToolbar}</div>

                            <div className="dashboard-surface mb-4 rounded-[24px] p-4">
                                <AdminToolbar variant="plain">
                                    <AdminToolbarGroup grow>
                                        <div className="xl:flex-1">
                                            <AdminCheckboxField
                                                checked={allVisibleSelected}
                                                onCheckedChange={(checked) =>
                                                    setSelectedUserIds(
                                                        checked
                                                            ? users.map(
                                                                  (user) =>
                                                                      user.id,
                                                              )
                                                            : [],
                                                    )
                                                }
                                                label={`${selectedUserIds.length} selected on this page`}
                                                description="Update verification or account state for the checked users without leaving the workspace."
                                            />
                                        </div>
                                        <AdminField
                                            label="Action"
                                            className="sm:w-52"
                                        >
                                            <AdminNativeSelect
                                                value={bulkAction}
                                                onChange={(event) =>
                                                    setBulkAction(
                                                        event.target
                                                            .value as AdminBulkUserAction,
                                                    )
                                                }
                                            >
                                                <option value="verify">
                                                    Verify
                                                </option>
                                                <option value="unverify">
                                                    Unverify
                                                </option>
                                                <option value="suspend">
                                                    Suspend
                                                </option>
                                                <option value="reactivate">
                                                    Reactivate
                                                </option>
                                                <option value="delete">
                                                    Delete
                                                </option>
                                                <option value="set_status">
                                                    Set status
                                                </option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField
                                            label="Status"
                                            className="sm:w-52"
                                        >
                                            {bulkAction === 'set_status' ? (
                                                <AdminNativeSelect
                                                    value={bulkStatus}
                                                    onChange={(event) =>
                                                        setBulkStatus(
                                                            event.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="active">
                                                        active
                                                    </option>
                                                    <option value="pending">
                                                        pending
                                                    </option>
                                                    <option value="needs_review">
                                                        needs_review
                                                    </option>
                                                    <option value="needs_info">
                                                        needs_info
                                                    </option>
                                                    <option value="rejected">
                                                        rejected
                                                    </option>
                                                    <option value="suspended">
                                                        suspended
                                                    </option>
                                                </AdminNativeSelect>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                                                    Status only applies when
                                                    &quot;Set status&quot; is
                                                    selected.
                                                </div>
                                            )}
                                        </AdminField>
                                    </AdminToolbarGroup>
                                    <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                        <Button
                                            type="button"
                                            onClick={() => void runBulkAction()}
                                            disabled={
                                                selectedUserIds.length === 0 ||
                                                bulkBusy
                                            }
                                        >
                                            {bulkBusy ? 'Updating...' : 'Apply'}
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>
                                {bulkFeedback ? (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {bulkFeedback}
                                    </p>
                                ) : null}
                            </div>

                            <AdminScrollArea maxHeightClassName="max-h-[72vh] xl:max-h-[68vh]">
                                        <AdminDataTable>
                                            <ProductTableHead>
                                                <tr>
                                                    <ProductTableHeaderCell className="w-10">
                                                        <Checkbox
                                                            checked={
                                                                allVisibleSelected
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                setSelectedUserIds(
                                                                    checked
                                                                        ? users.map(
                                                                              (
                                                                                  user,
                                                                              ) =>
                                                                                  user.id,
                                                                          )
                                                                        : [],
                                                                )
                                                            }
                                                            aria-label="Select visible users"
                                                        />
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        User
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Status
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Activity
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell className="w-80">
                                                        Actions
                                                    </ProductTableHeaderCell>
                                                </tr>
                                            </ProductTableHead>
                                            <ProductTableBody>
                                                {users.map((user) => {
                                                    const title =
                                                        formatUserName(user);
                                                    const isSelected =
                                                        selectedUserId ===
                                                        user.id;

                                                    return (
                                                        <ProductTableRow
                                                            key={user.id}
                                                            interactive
                                                            className={
                                                                isSelected
                                                                    ? 'bg-primary/6'
                                                                    : undefined
                                                            }
                                                        >
                                                            <ProductTableCell>
                                                                <Checkbox
                                                                    checked={selectedUserIds.includes(
                                                                        user.id,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        setSelectedUserIds(
                                                                            (
                                                                                current,
                                                                            ) =>
                                                                                checked
                                                                                    ? current.includes(
                                                                                          user.id,
                                                                                      )
                                                                                        ? current
                                                                                        : [
                                                                                              ...current,
                                                                                              user.id,
                                                                                          ]
                                                                                    : current.filter(
                                                                                          (
                                                                                              id,
                                                                                          ) =>
                                                                                              id !==
                                                                                              user.id,
                                                                                      ),
                                                                        )
                                                                    }
                                                                    aria-label={`Select ${title}`}
                                                                />
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        selectUser(
                                                                            user.id,
                                                                        )
                                                                    }
                                                                    className="space-y-1 text-left"
                                                                >
                                                                    <p className="text-sm font-semibold text-foreground">
                                                                        {title}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {
                                                                            user.email
                                                                        }
                                                                    </p>
                                                                    {user.city ? (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                user.city
                                                                            }
                                                                        </p>
                                                                    ) : null}
                                                                </button>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="space-y-2">
                                                                    <Badge className="rounded-full px-2 py-0.5 text-[11px] capitalize">
                                                                        {
                                                                            user.role
                                                                        }
                                                                    </Badge>
                                                                    <StatusChipSet
                                                                        items={[
                                                                            {
                                                                                value: user.verified
                                                                                    ? 'verified'
                                                                                    : 'unverified',
                                                                            },
                                                                            {
                                                                                value:
                                                                                    user.status ||
                                                                                    'pending',
                                                                            },
                                                                        ]}
                                                                    />
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell className="text-xs text-muted-foreground">
                                                                Meals{' '}
                                                                {user.meal_entries_count ??
                                                                    0}
                                                                {' / '}Workouts{' '}
                                                                {user.workout_logs_count ??
                                                                    0}
                                                                {' / '}AI{' '}
                                                                {user.ai_conversations_count ??
                                                                    0}
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            selectUser(
                                                                                user.id,
                                                                            );
                                                                            setDrawerOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                    >
                                                                        Inspect
                                                                    </Button>
                                                                    {!user.verified ? (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                void runUserAction(
                                                                                    user,
                                                                                    'verify',
                                                                                )
                                                                            }
                                                                        >
                                                                            Verify
                                                                        </Button>
                                                                    ) : null}
                                                                    {user.status ===
                                                                    'suspended' ? (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                void runUserAction(
                                                                                    user,
                                                                                    'reactivate',
                                                                                )
                                                                            }
                                                                        >
                                                                            Reactivate
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                void runUserAction(
                                                                                    user,
                                                                                    'suspend',
                                                                                )
                                                                            }
                                                                        >
                                                                            Suspend
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        size="sm"
                                                                        asChild
                                                                    >
                                                                        <Link
                                                                            href={`/admin/users/${user.id}`}
                                                                        >
                                                                            Open
                                                                        </Link>
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() =>
                                                                            void runUserAction(
                                                                                user,
                                                                                'delete',
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Delete
                                                                    </Button>
                                                                </div>
                                                            </ProductTableCell>
                                                        </ProductTableRow>
                                                    );
                                                })}
                                                {!loading &&
                                                users.length === 0 ? (
                                                    <ProductTableEmptyRow
                                                        colSpan={5}
                                                        title="No users matched"
                                                        description="Try different filters or reset search criteria."
                                                    />
                                                ) : null}
                                            </ProductTableBody>
                                        </AdminDataTable>
                            </AdminScrollArea>

                            <AdminPagination
                                currentPage={currentPage}
                                lastPage={lastPage}
                                disabled={loading}
                                summary={
                                    from && to
                                        ? `Showing ${from}-${to} of ${total} users`
                                        : 'Pagination stays aligned with the active filters.'
                                }
                                onPrevious={() =>
                                    setCurrentPage((page) =>
                                        Math.max(1, page - 1),
                                    )
                                }
                                onNext={() =>
                                    setCurrentPage((page) =>
                                        Math.min(lastPage, page + 1),
                                    )
                                }
                            />
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={drawerTitle}
                description="Quick admin context for mobile and focused spot checks."
                footer={
                    detail?.user ? (
                        <div className="flex w-full flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (selectedUserId) {
                                        void loadDetail(selectedUserId);
                                    }
                                }}
                            >
                                Refresh
                            </Button>
                            <Button asChild>
                                <Link href={`/admin/users/${detail.user.id}`}>
                                    Open full record
                                </Link>
                            </Button>
                        </div>
                    ) : null
                }
            >
                <UserInvestigationPanel
                    detail={detail}
                    loading={detailLoading}
                    error={detailError}
                    onRefresh={() => {
                        if (selectedUserId) {
                            void loadDetail(selectedUserId);
                        }
                    }}
                />
            </EntityDetailDrawer>
        </>
    );
}
