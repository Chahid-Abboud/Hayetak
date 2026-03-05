import { useEffect, useMemo, useState } from 'react';

type NotificationItem = {
    id: number;
    title: string;
    body: string;
    read_at: string | null;
    dismissed_at: string | null;
    created_at: string;
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);

    async function load() {
        const res = await fetch('/api/notifications');
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        setItems(data.filter((n: NotificationItem) => !n.dismissed_at));
    }

    useEffect(() => {
        void load();
    }, []);

    const unreadCount = useMemo(
        () => items.filter((n) => !n.read_at).length,
        [items],
    );

    async function markRead(id: number) {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        setItems((prev) =>
            prev.map((n) =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
            ),
        );
    }

    async function dismiss(id: number) {
        await fetch(`/api/notifications/${id}/dismiss`, { method: 'POST' });
        setItems((prev) => prev.filter((n) => n.id !== id));
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="relative rounded-full bg-[color:var(--sidebar-foreground)]/12 px-3 py-1.5 text-sm font-medium text-[color:var(--sidebar-foreground)] transition hover:bg-[color:var(--sidebar-foreground)]/22"
            >
                Notifications
                {unreadCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-[color:var(--card-foreground)] shadow-lg">
                    <div className="mb-2 text-sm font-semibold">
                        Notifications
                    </div>
                    <div className="max-h-96 space-y-2 overflow-auto">
                        {items.length === 0 && (
                            <div className="text-xs text-slate-500">
                                No notifications
                            </div>
                        )}
                        {items.map((item) => (
                            <div key={item.id} className="rounded border p-2">
                                <div className="text-sm font-medium">
                                    {item.title}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                    {item.body}
                                </div>
                                <div className="mt-2 flex gap-2">
                                    {!item.read_at && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void markRead(item.id)
                                            }
                                            className="text-xs text-blue-700 underline"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => void dismiss(item.id)}
                                        className="text-xs text-slate-600 underline"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
