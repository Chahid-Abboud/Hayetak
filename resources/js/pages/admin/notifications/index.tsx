import {
    AdminEmpty,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPanel,
    AdminSearchInput,
    AdminSplitLayout,
    AdminStickyBar,
    AdminTextarea,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { BellRing, CheckCircle2, Send, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type UserOption = {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    role?: string | null;
};

type AlertRow = {
    id: number;
    title: string;
    body: string;
    created_at: string;
    read_at?: string | null;
    dismissed_at?: string | null;
    target_user_id: number;
    target_user?: UserOption | null;
};

export default function AdminNotificationsIndex() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<UserOption[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
    const [alerts, setAlerts] = useState<AlertRow[]>([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);

        try {
            const params = new URLSearchParams({ per_page: '8' });
            if (userSearch.trim()) {
                params.set('search', userSearch.trim());
            }

            const res = await fetch(`/api/admin/users?${params.toString()}`);
            const json = await res.json();
            setUserResults(Array.isArray(json?.data) ? json.data : []);
        } finally {
            setLoadingUsers(false);
        }
    }, [userSearch]);

    const loadAlerts = useCallback(async () => {
        setLoadingAlerts(true);

        try {
            const params = new URLSearchParams({ per_page: '20' });
            if (statusFilter !== 'all') {
                params.set('status', statusFilter);
            }

            const res = await fetch(
                `/api/admin/notifications?${params.toString()}`,
            );
            if (!res.ok) {
                throw new Error('Could not load alert history.');
            }

            const json = await res.json();
            setAlerts(Array.isArray(json?.data) ? json.data : []);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load alert history.',
            );
        } finally {
            setLoadingAlerts(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        void loadAlerts();
    }, [loadAlerts]);

    const alertStats = useMemo(() => {
        return alerts.reduce(
            (stats, alert) => {
                if (alert.dismissed_at) {
                    stats.dismissed += 1;
                } else if (alert.read_at) {
                    stats.read += 1;
                } else {
                    stats.unread += 1;
                }

                return stats;
            },
            { unread: 0, read: 0, dismissed: 0 },
        );
    }, [alerts]);

    async function send() {
        setSending(true);
        setMessage(null);
        setError(null);

        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    body,
                    target_user_ids: selectedUsers.map((user) => user.id),
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Failed to send notifications.',
                );
            }

            setMessage(`Sent ${json.sent ?? 0} alert(s) successfully.`);
            setTitle('');
            setBody('');
            setSelectedUsers([]);
            await loadAlerts();
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

    return (
        <>
            <Head title="Admin Notifications" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Notifications"
                    description="Send targeted in-app alerts to specific users, then verify whether those alerts are still unread, already seen, or dismissed."
                >
                    <div className="space-y-6">
                        {error ? (
                            <AdminNotice tone="danger">{error}</AdminNotice>
                        ) : null}
                        {message ? (
                            <AdminNotice tone="success">{message}</AdminNotice>
                        ) : null}

                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Unread Alerts"
                                value={String(alertStats.unread)}
                                tone="accent"
                            />
                            <AdminStatCard
                                label="Read Alerts"
                                value={String(alertStats.read)}
                            />
                            <AdminStatCard
                                label="Dismissed Alerts"
                                value={String(alertStats.dismissed)}
                            />
                            <AdminStatCard
                                label="Recipients Selected"
                                value={String(selectedUsers.length)}
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Triage guidance"
                            description="Compose and delivery history stay separate so broadcast actions remain deliberate and audit reading stays clear."
                        >
                            <div className="grid gap-4 xl:grid-cols-2">
                                <AdminOverviewCard
                                    title="Compose lane"
                                    description="Select recipients first, then draft and send. Keep sends intentional and targeted."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        Selected recipients:{' '}
                                        {selectedUsers.length}. Sending remains
                                        disabled until title, message, and at
                                        least one recipient are set.
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Delivery lane"
                                    description="Use status filtering to confirm what was unread, read, or dismissed."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        History is readable by default; raw logs
                                        stay in dedicated audit surfaces.
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSplitLayout className="xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                            <AdminSection
                                title="Compose"
                                description="Pick one or more users, write the alert, and send it to their notification bell."
                            >
                                <div className="space-y-4">
                                    <AdminField label="Title">
                                        <AdminInput
                                            value={title}
                                            onChange={(event) =>
                                                setTitle(event.target.value)
                                            }
                                            placeholder="Short alert title"
                                        />
                                    </AdminField>

                                    <AdminField label="Message">
                                        <AdminTextarea
                                            rows={5}
                                            value={body}
                                            onChange={(event) =>
                                                setBody(event.target.value)
                                            }
                                            placeholder="What should the selected users see?"
                                        />
                                    </AdminField>

                                    <div className="space-y-3">
                                        <AdminField
                                            label="Find recipients"
                                            helper="Start typing a name or email, then click a result to add it to this alert."
                                        >
                                            <AdminSearchInput
                                                value={userSearch}
                                                onChange={(event) =>
                                                    setUserSearch(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search by name or email"
                                            />
                                        </AdminField>

                                        <div className="grid gap-2">
                                            {loadingUsers ? (
                                                <div className="text-sm text-muted-foreground">
                                                    Searching users...
                                                </div>
                                            ) : userResults.length > 0 ? (
                                                userResults.map((user) => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() =>
                                                            addUser(user)
                                                        }
                                                        className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                                                    >
                                                        <div>
                                                            <div className="font-medium text-foreground">
                                                                {[
                                                                    user.first_name,
                                                                    user.last_name,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' ',
                                                                    ) ||
                                                                    user.email}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-full px-2.5 py-1 capitalize"
                                                        >
                                                            {user.role ??
                                                                'user'}
                                                        </Badge>
                                                    </button>
                                                ))
                                            ) : (
                                                <AdminEmpty
                                                    title="No matching users"
                                                    description="Try a broader name or email search to find recipients."
                                                    className="py-8"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <AdminPanel
                                        eyebrow="Recipients"
                                        title="Selected recipients"
                                        description="Remove any recipient before sending if this alert should stay targeted."
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUsers.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() =>
                                                        removeUser(user.id)
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-foreground transition hover:border-destructive/30 hover:bg-destructive/10"
                                                >
                                                    {[
                                                        user.first_name,
                                                        user.last_name,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ') ||
                                                        user.email}
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            ))}
                                            {selectedUsers.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">
                                                    No recipients selected yet.
                                                </div>
                                            ) : null}
                                        </div>
                                    </AdminPanel>

                                    <AdminStickyBar
                                        summary={`${selectedUsers.length} recipient${selectedUsers.length === 1 ? '' : 's'} ready`}
                                    >
                                        <Button
                                            type="button"
                                            onClick={() => void send()}
                                            disabled={
                                                sending ||
                                                !title.trim() ||
                                                !body.trim() ||
                                                selectedUsers.length === 0
                                            }
                                        >
                                            <Send className="h-4 w-4" />
                                            {sending
                                                ? 'Sending...'
                                                : 'Send alert'}
                                        </Button>
                                    </AdminStickyBar>
                                </div>
                            </AdminSection>

                            <AdminSection
                                title="Filter & action toolbar"
                                description="Review the latest sent alerts and confirm each recipient's current state."
                                actions={
                                    <AdminToolbar variant="plain">
                                        <AdminToolbarGroup className="w-full sm:w-auto">
                                            <AdminField
                                                label="Status"
                                                className="w-full sm:w-44"
                                            >
                                                <AdminNativeSelect
                                                    value={statusFilter}
                                                    onChange={(event) =>
                                                        setStatusFilter(
                                                            event.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="all">
                                                        All statuses
                                                    </option>
                                                    <option value="unread">
                                                        Unread
                                                    </option>
                                                    <option value="read">
                                                        Read
                                                    </option>
                                                    <option value="dismissed">
                                                        Dismissed
                                                    </option>
                                                </AdminNativeSelect>
                                            </AdminField>
                                        </AdminToolbarGroup>
                                    </AdminToolbar>
                                }
                            >
                                <div className="mb-4 text-sm text-muted-foreground">
                                    Delivery history
                                </div>
                                <div className="space-y-3">
                                    {loadingAlerts ? (
                                        <div className="text-sm text-muted-foreground">
                                            Loading alert history...
                                        </div>
                                    ) : null}

                                    {!loadingAlerts && alerts.length === 0 ? (
                                        <AdminEmpty
                                            title="No alerts match this filter"
                                            description="Once alerts are sent, their read and dismissed state will show up here."
                                            className="py-8"
                                        />
                                    ) : null}

                                    {alerts.map((alert) => {
                                        const status = alert.dismissed_at
                                            ? 'Dismissed'
                                            : alert.read_at
                                              ? 'Read'
                                              : 'Unread';

                                        return (
                                            <article
                                                key={alert.id}
                                                className="dashboard-surface rounded-[24px] p-4"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <BellRing className="h-4 w-4 text-primary" />
                                                            <h3 className="font-semibold text-foreground">
                                                                {alert.title}
                                                            </h3>
                                                        </div>
                                                        <p className="text-sm leading-6 text-muted-foreground">
                                                            {alert.body}
                                                        </p>
                                                    </div>
                                                    <StatusBadge
                                                        status={status}
                                                    />
                                                </div>

                                                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                                                    <div>
                                                        Recipient:{' '}
                                                        <span className="font-medium text-foreground">
                                                            {[
                                                                alert
                                                                    .target_user
                                                                    ?.first_name,
                                                                alert
                                                                    .target_user
                                                                    ?.last_name,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' ') ||
                                                                alert
                                                                    .target_user
                                                                    ?.email ||
                                                                `User #${alert.target_user_id}`}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Sent{' '}
                                                        {formatDateTime(
                                                            alert.created_at,
                                                        )}
                                                    </div>
                                                    {alert.read_at ? (
                                                        <div>
                                                            Opened{' '}
                                                            {formatDateTime(
                                                                alert.read_at,
                                                            )}
                                                        </div>
                                                    ) : null}
                                                    {alert.dismissed_at ? (
                                                        <div>
                                                            Dismissed{' '}
                                                            {formatDateTime(
                                                                alert.dismissed_at,
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </AdminSection>
                        </AdminSplitLayout>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}

function StatusBadge({ status }: { status: 'Unread' | 'Read' | 'Dismissed' }) {
    if (status === 'Unread') {
        return (
            <Badge className="rounded-full px-2.5 py-1">
                <BellRing className="mr-1 h-3.5 w-3.5" />
                Unread
            </Badge>
        );
    }

    if (status === 'Read') {
        return (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Read
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="rounded-full px-2.5 py-1">
            <XCircle className="mr-1 h-3.5 w-3.5" />
            Dismissed
        </Badge>
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
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}
