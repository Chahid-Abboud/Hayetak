import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bell, Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type NotificationItem = {
    id: number;
    title: string;
    body: string;
    read_at: string | null;
    dismissed_at: string | null;
    created_at: string;
    creator?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

export default function NotificationBell({
    fullWidth = false,
    compact = false,
}: {
    fullWidth?: boolean;
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/notifications?per_page=20');

            if (!res.ok) {
                throw new Error('Could not load notifications.');
            }

            const json = await res.json();
            const data = Array.isArray(json?.data) ? json.data : [];
            setItems(data);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load notifications.',
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();

        const interval = window.setInterval(() => {
            void load();
        }, 30000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (open) {
            void load();
        }
    }, [open]);

    const unreadCount = useMemo(
        () => items.filter((notification) => !notification.read_at).length,
        [items],
    );

    async function markRead(id: number) {
        const previous = items;
        setItems((current) =>
            current.map((notification) =>
                notification.id === id
                    ? {
                          ...notification,
                          read_at:
                              notification.read_at ?? new Date().toISOString(),
                      }
                    : notification,
            ),
        );

        const res = await fetch(`/api/notifications/${id}/read`, {
            method: 'POST',
        });
        if (!res.ok) {
            setItems(previous);
            setError('Could not mark that alert as read.');
        }
    }

    async function dismiss(id: number) {
        const previous = items;
        setItems((current) =>
            current.filter((notification) => notification.id !== id),
        );

        const res = await fetch(`/api/notifications/${id}/dismiss`, {
            method: 'POST',
        });
        if (!res.ok) {
            setItems(previous);
            setError('Could not dismiss that alert.');
        }
    }

    return (
        <div className={cn('relative', fullWidth && 'w-full')}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className={cn(
                    'relative flex items-center justify-center gap-2 rounded-full bg-[color:var(--sidebar-foreground)]/12 px-3 py-1.5 text-sm font-medium text-[color:var(--sidebar-foreground)] transition hover:bg-[color:var(--sidebar-foreground)]/22',
                    compact &&
                        !fullWidth &&
                        'h-11 w-11 gap-0 px-0 text-[color:var(--sidebar-foreground)]',
                    fullWidth &&
                        'w-full justify-between rounded-2xl px-4 py-3 text-left',
                )}
                aria-expanded={open}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
                <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    {!compact || fullWidth ? 'Notifications' : null}
                </span>
                {unreadCount > 0 ? (
                    <Badge
                        className={cn(
                            'rounded-full px-2 py-0.5',
                            compact &&
                                !fullWidth &&
                                'absolute -top-1 -right-1 min-w-5 justify-center px-1.5',
                        )}
                    >
                        {unreadCount}
                    </Badge>
                ) : null}
            </button>

            {open ? (
                <div
                    className={cn(
                        'absolute right-0 z-40 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl',
                        fullWidth && 'static mt-3 w-full max-w-none',
                    )}
                >
                    <div className="border-b border-border/70 bg-muted/40 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-foreground">
                                    Notification Center
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {unreadCount > 0
                                        ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`
                                        : 'No unread alerts right now.'}
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void load()}
                                disabled={loading}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-[26rem] space-y-3 overflow-auto px-4 py-4">
                        {error ? (
                            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                                {error}
                            </div>
                        ) : null}

                        {loading && items.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                Loading alerts...
                            </div>
                        ) : null}

                        {!loading && items.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                                No active notifications.
                            </div>
                        ) : null}

                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    'rounded-2xl border px-4 py-3',
                                    item.read_at
                                        ? 'border-border/70 bg-background/80'
                                        : 'border-primary/20 bg-primary/5',
                                )}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-foreground">
                                        {item.title}
                                    </div>
                                    {!item.read_at ? (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-primary/30 bg-primary/10 text-primary"
                                        >
                                            New
                                        </Badge>
                                    ) : null}
                                </div>

                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {item.body}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-muted-foreground">
                                        {item.creator?.name
                                            ? `From ${item.creator.name}`
                                            : 'Sent by Hayetak'}
                                        {' - '}
                                        {formatDate(item.created_at)}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {!item.read_at ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    void markRead(item.id)
                                                }
                                            >
                                                <Check className="h-4 w-4" />
                                                Mark read
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                void dismiss(item.id)
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function formatDate(value: string) {
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
