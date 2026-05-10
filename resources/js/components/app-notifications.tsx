import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Bell, Check, X } from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

export type NotificationItem = {
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

type AppNotificationsContextValue = {
    items: NotificationItem[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    markRead: (id: number) => Promise<void>;
    dismiss: (id: number) => Promise<void>;
};

const AppNotificationsContext =
    createContext<AppNotificationsContextValue | null>(null);

function getCsrfToken() {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

export function AppNotificationsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const page = usePage<SharedData>();
    const authUser = (page.props.auth as
        | { user?: { id?: number; email_verified_at?: string | null } | null }
        | undefined)?.user;
    const userId = typeof authUser?.id === 'number' ? authUser.id : null;
    const isEmailVerified = Boolean(authUser?.email_verified_at);

    const [items, setItems] = useState<NotificationItem[]>([]);
    const [toastItems, setToastItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const seededRef = useRef(false);
    const seenIdsRef = useRef<Set<number>>(new Set());
    const toastTimersRef = useRef<Map<number, number>>(new Map());

    const clearToastTimer = useCallback((id: number) => {
        const timerId = toastTimersRef.current.get(id);
        if (typeof timerId === 'number') {
            window.clearTimeout(timerId);
            toastTimersRef.current.delete(id);
        }
    }, []);

    const hideToast = useCallback(
        (id: number) => {
            clearToastTimer(id);
            setToastItems((current) =>
                current.filter((notification) => notification.id !== id),
            );
        },
        [clearToastTimer],
    );

    const load = useCallback(
        async ({ silent = false }: { silent?: boolean } = {}) => {
            if (!userId || !isEmailVerified) {
                setItems([]);
                setToastItems([]);
                setLoading(false);
                setError(null);
                seededRef.current = false;
                seenIdsRef.current.clear();
                return;
            }

            if (!silent) {
                setLoading(true);
            }

            try {
                const res = await fetch('/api/notifications?per_page=20');

                if (res.status === 401 || res.status === 403) {
                    setItems([]);
                    setToastItems([]);
                    setError(null);
                    seededRef.current = false;
                    seenIdsRef.current.clear();
                    return;
                }

                if (!res.ok) {
                    throw new Error('Could not load notifications.');
                }

                const json = await res.json();
                const data = Array.isArray(json?.data)
                    ? (json.data as NotificationItem[])
                    : [];

                setItems(data);
                setError(null);

                if (!seededRef.current) {
                    seenIdsRef.current = new Set(
                        data.map((notification) => notification.id),
                    );
                    seededRef.current = true;
                    return;
                }

                const freshUnread = data.filter(
                    (notification) =>
                        !notification.read_at &&
                        !seenIdsRef.current.has(notification.id),
                );

                if (freshUnread.length > 0) {
                    setToastItems((current) => {
                        const currentIds = new Set(
                            current.map((notification) => notification.id),
                        );

                        return [
                            ...freshUnread.filter(
                                (notification) =>
                                    !currentIds.has(notification.id),
                            ),
                            ...current,
                        ].slice(0, 4);
                    });
                }

                data.forEach((notification) =>
                    seenIdsRef.current.add(notification.id),
                );
            } catch (loadError) {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : 'Could not load notifications.',
                );
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [isEmailVerified, userId],
    );

    useEffect(() => {
        if (!userId || !isEmailVerified) {
            setItems([]);
            setToastItems([]);
            setLoading(false);
            setError(null);
            seededRef.current = false;
            seenIdsRef.current.clear();
            return;
        }

        void load();

        const intervalId = window.setInterval(() => {
            void load({ silent: true });
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isEmailVerified, load, userId]);

    useEffect(() => {
        const activeIds = new Set(items.map((notification) => notification.id));
        setToastItems((current) =>
            current.filter((notification) => activeIds.has(notification.id)),
        );
    }, [items]);

    useEffect(() => {
        const timers = toastTimersRef.current;

        toastItems.forEach((notification) => {
            if (timers.has(notification.id)) {
                return;
            }

            const timerId = window.setTimeout(() => {
                hideToast(notification.id);
            }, 8000);

            timers.set(notification.id, timerId);
        });

        return () => {
            timers.forEach((timerId) => {
                window.clearTimeout(timerId);
            });
            timers.clear();
        };
    }, [hideToast, toastItems]);

    const markRead = useCallback(
        async (id: number) => {
            const previous = items;

            setItems((current) =>
                current.map((notification) =>
                    notification.id === id
                        ? {
                              ...notification,
                              read_at:
                                  notification.read_at ??
                                  new Date().toISOString(),
                          }
                        : notification,
                ),
            );
            hideToast(id);

            const res = await fetch(`/api/notifications/${id}/read`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) {
                setItems(previous);
                setError('Could not mark that alert as read.');
            }
        },
        [hideToast, items],
    );

    const dismiss = useCallback(
        async (id: number) => {
            const previous = items;

            setItems((current) =>
                current.filter((notification) => notification.id !== id),
            );
            hideToast(id);

            const res = await fetch(`/api/notifications/${id}/dismiss`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) {
                setItems(previous);
                setError('Could not dismiss that alert.');
            }
        },
        [hideToast, items],
    );

    const unreadCount = useMemo(
        () => items.filter((notification) => !notification.read_at).length,
        [items],
    );

    const value = useMemo<AppNotificationsContextValue>(
        () => ({
            items,
            unreadCount,
            loading,
            error,
            refresh: () => load(),
            markRead,
            dismiss,
        }),
        [dismiss, error, items, load, loading, markRead, unreadCount],
    );

    return (
        <AppNotificationsContext.Provider value={value}>
            {children}
            {userId && isEmailVerified ? (
                <NotificationToastViewport
                    items={toastItems}
                    onClose={hideToast}
                    onMarkRead={markRead}
                    onDismiss={dismiss}
                />
            ) : null}
        </AppNotificationsContext.Provider>
    );
}

export function useAppNotifications() {
    const context = useContext(AppNotificationsContext);

    if (!context) {
        throw new Error(
            'useAppNotifications must be used within AppNotificationsProvider.',
        );
    }

    return context;
}

function NotificationToastViewport({
    items,
    onClose,
    onMarkRead,
    onDismiss,
}: {
    items: NotificationItem[];
    onClose: (id: number) => void;
    onMarkRead: (id: number) => Promise<void>;
    onDismiss: (id: number) => Promise<void>;
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div
            className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(100%-2rem,24rem)] flex-col gap-3 sm:right-6 sm:bottom-6"
            aria-live="polite"
        >
            {items.map((item) => (
                <div
                    key={item.id}
                    className="pointer-events-auto dashboard-surface rounded-[24px] border border-border/70 bg-background/94 p-4 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.78)] backdrop-blur-xl"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Bell className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">
                                        {item.title}
                                    </p>
                                    {!item.read_at ? (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-primary/30 bg-primary/10 text-primary"
                                        >
                                            New
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {item.body}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {item.creator?.name
                                        ? `From ${item.creator.name}`
                                        : 'Sent by Hayetak'}
                                    {' - '}
                                    {formatDate(item.created_at)}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => onClose(item.id)}
                            className={cn(
                                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/76 text-muted-foreground transition hover:text-foreground',
                            )}
                            aria-label="Close notification popup"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {!item.read_at ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => void onMarkRead(item.id)}
                            >
                                <Check className="h-4 w-4" />
                                Mark read
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void onDismiss(item.id)}
                        >
                            <X className="h-4 w-4" />
                            Dismiss
                        </Button>
                    </div>
                </div>
            ))}
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
