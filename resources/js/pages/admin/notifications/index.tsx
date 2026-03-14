import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

export default function AdminNotificationsIndex() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetIds, setTargetIds] = useState('');
    const [msg, setMsg] = useState('');

    async function send() {
        const target_user_ids = targetIds
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v) && v > 0);

        const res = await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body, target_user_ids }),
        });
        const json = await res.json();
        setMsg(
            res.ok
                ? `Sent ${json.sent ?? 0} notifications.`
                : 'Failed to send notifications.',
        );
    }

    return (
        <>
            <Head title="Admin Notifications" />
            <NavHeader />
            <main className="mx-auto max-w-3xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">
                        Send In-App Notification
                    </h1>
                    <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                        <label className="block text-sm">
                            Title
                            <input
                                className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </label>
                        <label className="block text-sm">
                            Message
                            <textarea
                                className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                                rows={4}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                            />
                        </label>
                        <label className="block text-sm">
                            Target user IDs (comma separated)
                            <input
                                className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                                value={targetIds}
                                onChange={(e) => setTargetIds(e.target.value)}
                                placeholder="1, 4, 9"
                            />
                        </label>
                        <button
                            className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)]"
                            onClick={() => void send()}
                        >
                            Send
                        </button>
                        {msg && (
                            <div className="text-sm text-foreground">{msg}</div>
                        )}
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
