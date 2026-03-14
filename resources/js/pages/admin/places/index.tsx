import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Place = { id: number; name: string; category?: string | null; city?: string | null; lat: string; lng: string };

export default function AdminPlacesPage() {
    const [rows, setRows] = useState<Place[]>([]);

    async function load() {
        const res = await fetch('/api/admin/places-local');
        const json = await res.json();
        setRows(Array.isArray(json?.data) ? json.data : []);
    }

    useEffect(() => { void load(); }, []);

    async function edit(row: Place) {
        const name = prompt('Name', row.name) ?? row.name;
        const city = prompt('City', row.city ?? '') ?? row.city ?? '';
        await fetch(`/api/admin/places-local/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...row, name, city, lat: Number(row.lat), lng: Number(row.lng) }),
        });
        await load();
    }

    async function remove(id: number) {
        await fetch(`/api/admin/places-local/${id}`, { method: 'DELETE' });
        await load();
    }

    return (
        <>
            <Head title="Admin Places" />
            <NavHeader />
            <main className="mx-auto max-w-5xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">Locations / Places</h1>
                    <div className="space-y-2">
                        {rows.map((r) => (
                            <div key={r.id} className="rounded-2xl border bg-card p-3 text-sm shadow-sm">
                                <div className="font-medium">{r.name} ({r.category ?? '-'})</div>
                                <div className="text-xs text-muted-foreground">{r.city ?? '-'} | {r.lat}, {r.lng}</div>
                                <div className="mt-1 flex gap-2 text-xs">
                                    <button className="font-medium text-primary underline" onClick={() => void edit(r)}>Edit</button>
                                    <button className="font-medium text-destructive underline" onClick={() => void remove(r.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
