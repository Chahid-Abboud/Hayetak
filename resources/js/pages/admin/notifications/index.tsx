import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head } from '@inertiajs/react';
import {
    BellRing,
    CheckCircle2,
    Search,
    Send,
    Users,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

    async function loadUsers() {
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
    }

    async function loadAlerts() {
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
    }

    useEffect(() => {
        void loadUsers();
    }, [userSearch]);

    useEffect(() => {
        void loadAlerts();
    }, [statusFilter]);

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
                    title="Alerts Console"
                    description="Send targeted in-app alerts to specific users, then verify whether those alerts are still unread, already seen, or dismissed."
                >
                    <div className="space-y-6">
                        {error ? (
                            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                                {error}
                            </div>
                        ) : null}
                        {message ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100">
                                {message}
                            </div>
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

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                            <AdminSection
                                title="Compose Alert"
                                description="Pick one or more users, write the alert, and send it to their notification bell."
                            >
                                <div className="space-y-4">
                                    <label className="space-y-2">
                                        <span className="text-sm font-medium text-foreground">
                                            Title
                                        </span>
                                        <Input
                                            value={title}
                                            onChange={(event) =>
                                                setTitle(event.target.value)
                                            }
                                            placeholder="Short alert title"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <span className="text-sm font-medium text-foreground">
                                            Message
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={body}
                                            onChange={(event) =>
                                                setBody(event.target.value)
                                            }
                                            placeholder="What should the selected users see?"
                                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        />
                                    </label>

                                    <div className="space-y-3">
                                        <label className="space-y-2">
                                            <span className="text-sm font-medium text-foreground">
                                                Find recipients
                                            </span>
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    value={userSearch}
                                                    onChange={(event) =>
                                                        setUserSearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Search by name or email"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </label>

                                        <div className="grid gap-2">
                                            {loadingUsers ? (
                                                <div className="text-sm text-muted-foreground">
                                                    Searching users...
                                                </div>
                                            ) : (
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
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <Users className="h-4 w-4" />
                                            Selected recipients
                                        </div>
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
                                    </div>

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
                                        {sending ? 'Sending...' : 'Send alert'}
                                    </Button>
                                </div>
                            </AdminSection>

                            <AdminSection
                                title="Recent Alert History"
                                description="Review the latest sent alerts and confirm each recipient’s current state."
                                actions={
                                    <select
                                        value={statusFilter}
                                        onChange={(event) =>
                                            setStatusFilter(event.target.value)
                                        }
                                        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <option value="all">
                                            All statuses
                                        </option>
                                        <option value="unread">Unread</option>
                                        <option value="read">Read</option>
                                        <option value="dismissed">
                                            Dismissed
                                        </option>
                                    </select>
                                }
                            >
                                <div className="space-y-3">
                                    {loadingAlerts ? (
                                        <div className="text-sm text-muted-foreground">
                                            Loading alert history...
                                        </div>
                                    ) : null}

                                    {!loadingAlerts && alerts.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                                            No alerts match the current filter.
                                        </div>
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
                                                className="rounded-2xl border border-border/70 bg-background/80 p-4"
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
                        </div>
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
