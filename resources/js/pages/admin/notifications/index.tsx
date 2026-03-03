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
        setMsg(res.ok ? `Sent ${json.sent ?? 0} notifications.` : 'Failed to send notifications.');
    }

    return (
        <>
            <Head title="Admin Notifications" />
            <NavHeader />
            <main className="mx-auto max-w-3xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                <h1 className="mb-4 text-2xl font-semibold">Send In-App Notification</h1>
                <div className="space-y-3 rounded border p-4">
                    <label className="block text-sm">
                        Title
                        <input className="mt-1 w-full rounded border px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </label>
                    <label className="block text-sm">
                        Message
                        <textarea className="mt-1 w-full rounded border px-2 py-1" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
                    </label>
                    <label className="block text-sm">
                        Target user IDs (comma separated)
                        <input
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={targetIds}
                            onChange={(e) => setTargetIds(e.target.value)}
                            placeholder="1, 4, 9"
                        />
                    </label>
                    <button className="rounded bg-blue-700 px-3 py-1 text-sm text-white" onClick={() => void send()}>
                        Send
                    </button>
                    {msg && <div className="text-sm text-slate-700">{msg}</div>}
                </div>
                </RoleGuard>
            </main>
        </>
    );
}
