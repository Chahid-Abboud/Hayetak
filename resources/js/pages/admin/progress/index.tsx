import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Measurement = {
    id: number;
    user_id: number;
    measured_at: string;
    weight_kg?: string | null;
    body_fat_pct?: string | null;
    waist_cm?: string | null;
    notes?: string | null;
    user?: { id: number; email: string; first_name?: string; last_name?: string };
};

export default function AdminProgressPage() {
    const [userId, setUserId] = useState('');
    const [rows, setRows] = useState<Measurement[]>([]);

    async function load() {
        const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
        const res = await fetch(`/api/admin/progress${qs}`);
        const json = await res.json();
        setRows(Array.isArray(json?.data) ? json.data : []);
    }

    useEffect(() => { void load(); }, [userId]);

    async function edit(row: Measurement) {
        const weight = prompt('Weight kg', String(row.weight_kg ?? '')) ?? String(row.weight_kg ?? '');
        const bodyFat = prompt('Body fat %', String(row.body_fat_pct ?? '')) ?? String(row.body_fat_pct ?? '');
        const notes = prompt('Notes', row.notes ?? '') ?? row.notes ?? '';
        await fetch(`/api/admin/progress/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight === '' ? null : Number(weight),
                body_fat_pct: bodyFat === '' ? null : Number(bodyFat),
                notes,
            }),
        });
        await load();
    }

    return (
        <>
            <Head title="Admin Progress" />
            <NavHeader />
            <main className="mx-auto max-w-5xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">User Progress</h1>
                    <input
                        className="mb-4 rounded-xl border bg-card px-3 py-2 text-sm"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Filter by user ID"
                    />
                    <div className="space-y-2">
                        {rows.map((r) => (
                            <div key={r.id} className="rounded-2xl border bg-card p-3 text-sm shadow-sm">
                                <div className="font-medium">
                                    {[r.user?.first_name, r.user?.last_name].filter(Boolean).join(' ') || r.user?.email || `User #${r.user_id}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {r.measured_at} | weight: {r.weight_kg ?? '-'} | body fat: {r.body_fat_pct ?? '-'}
                                </div>
                                <div className="mt-1 text-xs">{r.notes ?? ''}</div>
                                <button className="mt-1 text-xs font-medium text-primary underline" onClick={() => void edit(r)}>Edit</button>
                            </div>
                        ))}
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
