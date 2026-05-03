import {
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
    AdminToggleGroup,
} from '@/components/admin/admin-ui';
import { StatusChipSet } from '@/components/admin/admin-workflows';
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
import { jsonRequestInit } from '@/lib/http';
import { Head, Link } from '@inertiajs/react';
import {
    ClipboardCheck,
    Eye,
    RefreshCcw,
    Save,
    Send,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Tab = 'compose' | 'history' | 'templates';

type UserOption = {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    role?: string | null;
};

type DeliveryCampaign = {
    id: number;
    recipient_group: string;
    recipient_count: number;
    title: string;
    body: string;
    type: string;
    status: 'sent' | 'partial' | 'failed';
    sent_time?: string | null;
    read_count: number;
    dismissed_count: number;
    failed_deliveries: number;
    failed_user_ids: number[];
    sender?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type DeliveryResponse = {
    data?: DeliveryCampaign[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    stats?: {
        campaigns: number;
        delivered: number;
        read: number;
        dismissed: number;
        unread: number;
    };
};

type Template = {
    id: string;
    title: string;
    body: string;
    type: string;
    audience: string;
};

const audienceOptions = [
    { value: 'selected', label: 'Selected users' },
    { value: 'all_clients', label: 'All clients' },
    { value: 'all_professionals', label: 'All professionals' },
    { value: 'trainers', label: 'Trainers' },
    { value: 'nutritionists', label: 'Nutritionists' },
    { value: 'admins', label: 'Admins' },
    { value: 'unverified', label: 'Unverified users' },
];

const typeOptions = [
    { value: 'announcement', label: 'Announcement' },
    { value: 'intervention', label: 'Intervention' },
    { value: 'safety', label: 'Safety' },
    { value: 'planner', label: 'Planner' },
    { value: 'support', label: 'Support' },
];

function personName(user: UserOption) {
    return (
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.email
    );
}

function formatDateTime(value?: string | null) {
    if (!value) return 'Not available';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function loadStoredTemplates(): Template[] {
    if (typeof window === 'undefined') return [];

    try {
        const value = window.localStorage.getItem('hayetak.admin.notification.templates');
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveStoredTemplates(templates: Template[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
        'hayetak.admin.notification.templates',
        JSON.stringify(templates),
    );
}

export default function AdminNotificationsIndex() {
    const [tab, setTab] = useState<Tab>('compose');
    const [audience, setAudience] = useState('selected');
    const [type, setType] = useState('announcement');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [confirmReady, setConfirmReady] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<UserOption[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
    const [campaigns, setCampaigns] = useState<DeliveryCampaign[]>([]);
    const [historySearch, setHistorySearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({
        campaigns: 0,
        delivered: 0,
        read: 0,
        dismissed: 0,
        unread: 0,
    });

    useEffect(() => {
        setTemplates(loadStoredTemplates());
    }, []);

    const loadUsers = useCallback(async () => {
        if (audience !== 'selected') return;

        setLoadingUsers(true);

        try {
            const params = new URLSearchParams({ per_page: '8' });
            if (userSearch.trim()) params.set('search', userSearch.trim());

            const response = await fetch(`/api/admin/users?${params.toString()}`);
            const json = await response.json();
            setUserResults(Array.isArray(json?.data) ? json.data : []);
        } finally {
            setLoadingUsers(false);
        }
    }, [audience, userSearch]);

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: '25',
            });

            if (historySearch.trim()) params.set('search', historySearch.trim());
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (typeFilter !== 'all') params.set('type', typeFilter);

            const response = await fetch(
                `/api/admin/notifications?${params.toString()}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Could not load delivery history.');
            }

            const json = (await response.json()) as DeliveryResponse;

            setCampaigns(Array.isArray(json.data) ? json.data : []);
            setStats({
                campaigns: Number(json.stats?.campaigns ?? 0),
                delivered: Number(json.stats?.delivered ?? 0),
                read: Number(json.stats?.read ?? 0),
                dismissed: Number(json.stats?.dismissed ?? 0),
                unread: Number(json.stats?.unread ?? 0),
            });
            setTotal(Number(json.total ?? 0));
            setCurrentPage(Number(json.current_page ?? 1));
            setLastPage(Number(json.last_page ?? 1));
            setFrom(json.from ?? null);
            setTo(json.to ?? null);
        } catch (loadError) {
            setCampaigns([]);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load delivery history.',
            );
        } finally {
            setLoadingHistory(false);
        }
    }, [currentPage, historySearch, statusFilter, typeFilter]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        setCurrentPage(1);
    }, [historySearch, statusFilter, typeFilter]);

    const canSend =
        title.trim() !== '' &&
        body.trim() !== '' &&
        (audience !== 'selected' || selectedUsers.length > 0) &&
        confirmReady;

    const audienceLabel = useMemo(
        () =>
            audienceOptions.find((option) => option.value === audience)?.label ??
            'Selected users',
        [audience],
    );

    function addUser(user: UserOption) {
        setSelectedUsers((current) =>
            current.some((existing) => existing.id === user.id)
                ? current
                : [...current, user],
        );
    }

    function removeUser(userId: number) {
        setSelectedUsers((current) =>
            current.filter((user) => user.id !== userId),
        );
    }

    async function send() {
        setSending(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch(
                '/api/admin/notifications',
                jsonRequestInit('POST', {
                    title,
                    body,
                    type,
                    audience,
                    target_user_ids: selectedUsers.map((user) => user.id),
                }),
            );

            const json = (await response.json().catch(() => null)) as {
                sent?: number;
                message?: string;
            } | null;

            if (!response.ok) {
                throw new Error(
                    json?.message || 'Failed to send notifications.',
                );
            }

            setMessage(`Sent ${json?.sent ?? 0} notification(s).`);
            setTitle('');
            setBody('');
            setSelectedUsers([]);
            setPreviewOpen(false);
            setConfirmReady(false);
            setTab('history');
            await loadHistory();
        } catch (sendError) {
            setError(
                sendError instanceof Error
                    ? sendError.message
                    : 'Failed to send notifications.',
            );
        } finally {
            setSending(false);
        }
    }

    function saveTemplate() {
        if (!title.trim() || !body.trim()) {
            setError('Add a title and body before saving a template.');
            return;
        }

        const next = [
            {
                id: String(Date.now()),
                title,
                body,
                type,
                audience,
            },
            ...templates,
        ].slice(0, 12);

        setTemplates(next);
        saveStoredTemplates(next);
        setMessage('Template saved.');
        setError(null);
    }

    function applyTemplate(template: Template) {
        setTitle(template.title);
        setBody(template.body);
        setType(template.type);
        setAudience(template.audience);
        setPreviewOpen(false);
        setConfirmReady(false);
        setTab('compose');
    }

    async function resendFailed(campaign: DeliveryCampaign) {
        setSending(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(
                `/api/admin/notifications/${campaign.id}/resend-failed`,
                jsonRequestInit('POST', {}),
            );
            const json = (await response.json().catch(() => null)) as {
                sent?: number;
                message?: string;
            } | null;

            if (!response.ok) {
                throw new Error(json?.message || 'Could not resend failed deliveries.');
            }

            setMessage(json?.message || `Resent ${json?.sent ?? 0} failed deliveries.`);
            await loadHistory();
        } catch (resendError) {
            setError(
                resendError instanceof Error
                    ? resendError.message
                    : 'Could not resend failed deliveries.',
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <Head title="Admin Notifications" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Notifications"
                    description="Send targeted announcements and intervention messages, then review delivery state in readable campaign logs."
                >
                    <div className="space-y-6">
                        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
                        {message ? (
                            <AdminNotice tone="success">{message}</AdminNotice>
                        ) : null}

                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Campaigns"
                                value={loadingHistory ? '...' : String(stats.campaigns)}
                                tone="accent"
                                helper="Admin sends recorded in audit history."
                            />
                            <AdminStatCard
                                label="Delivered"
                                value={loadingHistory ? '...' : String(stats.delivered)}
                                helper="Recipient notifications created."
                            />
                            <AdminStatCard
                                label="Unread"
                                value={loadingHistory ? '...' : String(stats.unread)}
                                helper="Still active in recipient bells."
                            />
                            <AdminStatCard
                                label="Read"
                                value={loadingHistory ? '...' : String(stats.read)}
                                helper="Opened by recipients."
                            />
                            <AdminStatCard
                                label="Dismissed"
                                value={loadingHistory ? '...' : String(stats.dismissed)}
                                helper="Dismissed by recipients."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Communication Guidance"
                            description="Keep sends deliberate: choose audience, write the message, preview it, then confirm. Delivery logs stay full-width for readable review."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminPanel
                                    title="Target first"
                                    description="Intervention messages should go to the smallest useful audience."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Use selected users for support cases and
                                        intervention nudges. Use broad groups
                                        only for true announcements.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Preview before send"
                                    description="Preview mirrors the notification title, body, type, and recipient group."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        The send button stays locked until the
                                        confirmation step is checked.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Readable logs"
                                    description="Delivery history summarizes counts, failures, and sender without burying logs in tiny cards."
                                >
                                    <Button asChild type="button" variant="outline">
                                        <Link href="/admin/logs">Open audit logs</Link>
                                    </Button>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        <AdminToggleGroup
                            value={tab}
                            onChange={(value) => setTab(value as Tab)}
                            options={[
                                { value: 'compose', label: 'Compose' },
                                { value: 'history', label: 'Delivery History' },
                                { value: 'templates', label: 'Templates' },
                            ]}
                        />

                        {tab === 'compose' ? (
                            <AdminSection
                                title="Compose"
                                description="Focused workflow: audience, message, preview, confirmation."
                            >
                                <div className="space-y-4">
                                    <AdminPanel title="1. Audience" description="Choose a recipient group. Selected users can be searched and added individually.">
                                        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                                            <AdminField label="Recipient group">
                                                <AdminNativeSelect
                                                    value={audience}
                                                    onChange={(event) => {
                                                        setAudience(event.target.value);
                                                        setConfirmReady(false);
                                                    }}
                                                >
                                                    {audienceOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </AdminNativeSelect>
                                            </AdminField>

                                            {audience === 'selected' ? (
                                                <div className="space-y-3">
                                                    <AdminField label="Find recipients">
                                                        <AdminSearchInput
                                                            value={userSearch}
                                                            placeholder="Search by name or email"
                                                            onChange={(event) => setUserSearch(event.target.value)}
                                                        />
                                                    </AdminField>
                                                    <AdminScrollArea maxHeightClassName="max-h-72">
                                                        <div className="grid gap-2">
                                                            {loadingUsers ? (
                                                                <div className="text-sm text-muted-foreground">Searching users...</div>
                                                            ) : null}
                                                            {!loadingUsers && userResults.map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    type="button"
                                                                    onClick={() => addUser(user)}
                                                                    className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                                                                >
                                                                    <div>
                                                                        <div className="font-medium text-foreground">{personName(user)}</div>
                                                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                                                    </div>
                                                                    <Badge variant="outline">{user.role ?? 'user'}</Badge>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </AdminScrollArea>
                                                </div>
                                            ) : (
                                                <AdminNotice tone="info">
                                                    Audience will be resolved at send time: {audienceLabel}.
                                                </AdminNotice>
                                            )}
                                        </div>

                                        {audience === 'selected' ? (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {selectedUsers.map((user) => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => removeUser(user.id)}
                                                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-foreground transition hover:border-destructive/30 hover:bg-destructive/10"
                                                    >
                                                        {personName(user)}
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                ))}
                                                {selectedUsers.length === 0 ? (
                                                    <div className="text-sm text-muted-foreground">No selected recipients yet.</div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </AdminPanel>

                                    <AdminPanel title="2. Message" description="Write the notification as recipients will see it.">
                                        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                                            <AdminField label="Type">
                                                <AdminNativeSelect
                                                    value={type}
                                                    onChange={(event) => setType(event.target.value)}
                                                >
                                                    {typeOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </AdminNativeSelect>
                                            </AdminField>
                                            <AdminField label="Title">
                                                <AdminInput
                                                    value={title}
                                                    placeholder="Short notification title"
                                                    onChange={(event) => {
                                                        setTitle(event.target.value);
                                                        setConfirmReady(false);
                                                    }}
                                                />
                                            </AdminField>
                                        </div>
                                        <div className="mt-4">
                                            <AdminField label="Body">
                                                <AdminTextarea
                                                    rows={6}
                                                    value={body}
                                                    placeholder="Write a clear announcement or intervention message."
                                                    onChange={(event) => {
                                                        setBody(event.target.value);
                                                        setConfirmReady(false);
                                                    }}
                                                />
                                            </AdminField>
                                        </div>
                                    </AdminPanel>

                                    <AdminPanel title="3. Preview" description="Review the exact message summary before confirmation.">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setPreviewOpen(!previewOpen)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {previewOpen ? 'Hide preview' : 'Preview'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={saveTemplate}
                                            >
                                                <Save className="h-4 w-4" />
                                                Save template
                                            </Button>
                                        </div>

                                        {previewOpen ? (
                                            <div className="mt-4 dashboard-surface-soft rounded-[22px] px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">{audienceLabel}</Badge>
                                                    <Badge variant="secondary">{type}</Badge>
                                                    <Badge variant="outline">
                                                        {audience === 'selected'
                                                            ? `${selectedUsers.length} selected`
                                                            : 'Resolved at send'}
                                                    </Badge>
                                                </div>
                                                <h3 className="mt-4 text-lg font-semibold text-foreground">
                                                    {title || 'Notification title'}
                                                </h3>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                                    {body || 'Notification body preview.'}
                                                </p>
                                            </div>
                                        ) : null}
                                    </AdminPanel>

                                    <AdminPanel title="4. Confirmation" description="Confirm the audience and content before sending.">
                                        <label className="dashboard-surface-soft flex items-start gap-3 rounded-[20px] px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={confirmReady}
                                                onChange={(event) => setConfirmReady(event.target.checked)}
                                                className="mt-1"
                                            />
                                            <span className="text-sm leading-6 text-muted-foreground">
                                                I reviewed the audience, message type, title, body, and preview.
                                            </span>
                                        </label>
                                    </AdminPanel>

                                    <AdminStickyBar
                                        summary={`${audienceLabel} | ${audience === 'selected' ? `${selectedUsers.length} recipient(s)` : 'resolved at send time'}`}
                                    >
                                        <Button
                                            type="button"
                                            onClick={() => void send()}
                                            disabled={sending || !canSend}
                                        >
                                            <Send className="h-4 w-4" />
                                            {sending ? 'Sending...' : 'Send'}
                                        </Button>
                                    </AdminStickyBar>
                                </div>
                            </AdminSection>
                        ) : null}

                        {tab === 'history' ? (
                            <AdminSection
                                title="Delivery History"
                                description="Full-width readable campaign history with delivery, read, dismissed, failed, and sender summaries."
                            >
                                <div className="space-y-4">
                                    <AdminToolbar>
                                        <AdminToolbarGroup grow>
                                            <AdminField label="Search" className="xl:flex-1">
                                                <AdminSearchInput
                                                    value={historySearch}
                                                    placeholder="Search title, body, audience"
                                                    onChange={(event) => setHistorySearch(event.target.value)}
                                                />
                                            </AdminField>
                                            <AdminField label="Status" className="sm:w-44">
                                                <AdminNativeSelect
                                                    value={statusFilter}
                                                    onChange={(event) => setStatusFilter(event.target.value)}
                                                >
                                                    <option value="all">All statuses</option>
                                                    <option value="sent">Sent</option>
                                                    <option value="partial">Partial</option>
                                                    <option value="failed">Failed</option>
                                                    <option value="read">Has reads</option>
                                                    <option value="dismissed">Has dismissals</option>
                                                </AdminNativeSelect>
                                            </AdminField>
                                            <AdminField label="Type" className="sm:w-44">
                                                <AdminNativeSelect
                                                    value={typeFilter}
                                                    onChange={(event) => setTypeFilter(event.target.value)}
                                                >
                                                    <option value="all">All types</option>
                                                    {typeOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </AdminNativeSelect>
                                            </AdminField>
                                        </AdminToolbarGroup>
                                        <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={loadingHistory}
                                                onClick={() => void loadHistory()}
                                            >
                                                <RefreshCcw className="h-4 w-4" />
                                                Refresh
                                            </Button>
                                        </AdminToolbarGroup>
                                    </AdminToolbar>

                                    {loadingHistory && campaigns.length === 0 ? (
                                        <AdminEmpty title="Loading delivery history" description="Fetching campaign logs and recipient counts." />
                                    ) : (
                                        <AdminScrollArea maxHeightClassName="max-h-[68vh]">
                                            <AdminDataTable tableClassName="min-w-[1180px]">
                                                <ProductTableHead>
                                                    <tr>
                                                        <ProductTableHeaderCell>Recipient group</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Message</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Type</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Status</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Sent time</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Read / dismissed</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Failed</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>Sender</ProductTableHeaderCell>
                                                        <ProductTableHeaderCell className="w-36">Actions</ProductTableHeaderCell>
                                                    </tr>
                                                </ProductTableHead>
                                                <ProductTableBody>
                                                    {campaigns.map((campaign) => (
                                                        <ProductTableRow key={campaign.id}>
                                                            <ProductTableCell>
                                                                <div className="font-medium text-foreground">{campaign.recipient_group}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {campaign.recipient_count} recipient(s)
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="font-medium text-foreground">{campaign.title}</div>
                                                                <div className="line-clamp-2 max-w-80 text-sm text-muted-foreground">{campaign.body}</div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <Badge variant="outline">{campaign.type}</Badge>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <StatusChipSet
                                                                    items={[
                                                                        {
                                                                            value: campaign.status === 'failed' ? 'rejected' : campaign.status === 'partial' ? 'needs_review' : 'completed',
                                                                            label: campaign.status,
                                                                        },
                                                                    ]}
                                                                />
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                {formatDateTime(campaign.sent_time)}
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="font-medium text-foreground">
                                                                    {campaign.read_count} read
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {campaign.dismissed_count} dismissed
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className={campaign.failed_deliveries > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                                                                    {campaign.failed_deliveries}
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="text-sm text-foreground">{campaign.sender?.name || 'Admin'}</div>
                                                                <div className="text-xs text-muted-foreground">{campaign.sender?.email}</div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={sending || campaign.failed_deliveries === 0}
                                                                    onClick={() => void resendFailed(campaign)}
                                                                >
                                                                    Resend failed
                                                                </Button>
                                                            </ProductTableCell>
                                                        </ProductTableRow>
                                                    ))}
                                                    {!loadingHistory && campaigns.length === 0 ? (
                                                        <ProductTableEmptyRow
                                                            colSpan={9}
                                                            title="No delivery history found"
                                                            description="Send a notification or adjust filters."
                                                        />
                                                    ) : null}
                                                </ProductTableBody>
                                            </AdminDataTable>
                                        </AdminScrollArea>
                                    )}

                                    <AdminPagination
                                        currentPage={currentPage}
                                        lastPage={lastPage}
                                        disabled={loadingHistory}
                                        summary={
                                            from && to
                                                ? `Showing ${from}-${to} of ${total} campaigns`
                                                : 'Pagination follows active history filters.'
                                        }
                                        onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                        onNext={() => setCurrentPage((page) => Math.min(lastPage, page + 1))}
                                    />
                                </div>
                            </AdminSection>
                        ) : null}

                        {tab === 'templates' ? (
                            <AdminSection
                                title="Templates"
                                description="Reusable local templates for common announcements and interventions."
                            >
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {templates.map((template) => (
                                        <AdminPanel
                                            key={template.id}
                                            title={template.title}
                                            description={`${typeOptions.find((option) => option.value === template.type)?.label ?? template.type} | ${audienceOptions.find((option) => option.value === template.audience)?.label ?? template.audience}`}
                                        >
                                            <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                                                {template.body}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => applyTemplate(template)}
                                            >
                                                <ClipboardCheck className="h-4 w-4" />
                                                Use template
                                            </Button>
                                        </AdminPanel>
                                    ))}
                                    {templates.length === 0 ? (
                                        <AdminEmpty
                                            title="No templates yet"
                                            description="Compose a message and use Save template to add reusable messages here."
                                        />
                                    ) : null}
                                </div>
                            </AdminSection>
                        ) : null}
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
