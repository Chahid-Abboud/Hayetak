import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type AdminActionLog = {
    id: number;
    action: string;
    admin_id: number | null;
    target_type: string | null;
    target_id: number | null;
};

type AdminActionLogResponse = {
    data?: AdminActionLog[];
};

export default function AdminLogsIndex() {
    const [logs, setLogs] = useState<AdminActionLog[]>([]);

    useEffect(() => {
        void (async () => {
            const res = await fetch('/api/admin/action-logs');
            const json = (await res.json()) as AdminActionLogResponse;
            setLogs(Array.isArray(json?.data) ? json.data : []);
        })();
    }, []);

    return (
        <>
            <Head title="Admin Logs" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">
                        Admin Action Logs
                    </h1>
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="rounded-2xl border bg-card p-3 text-sm shadow-sm"
                            >
                                <div className="font-medium">{log.action}</div>
                                <div className="text-xs text-muted-foreground">
                                    admin #{log.admin_id} | target:{' '}
                                    {log.target_type ?? '-'} #
                                    {log.target_id ?? '-'}
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-sm text-muted-foreground">
                                No logs yet.
                            </div>
                        )}
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
