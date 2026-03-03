import NavHeader from '@/components/NavHeader';
import { Head, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { useEffect, useState } from 'react';

type Appointment = {
    id: number;
    professional_role: string;
    scheduled_at: string;
    status: string;
    notes?: string | null;
    client?: { id: number; name: string };
    professional?: { id: number; name: string };
};

export default function AppointmentsPage() {
    const { auth } = usePage<SharedData>().props;
    const [items, setItems] = useState<Appointment[]>([]);

    async function load() {
        const res = await fetch('/api/appointments');
        const json = await res.json();
        setItems(Array.isArray(json?.data) ? json.data : []);
    }

    useEffect(() => {
        void load();
    }, []);

    async function updateStatus(id: number, status: string) {
        await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        await load();
    }

    return (
        <>
            <Head title="Appointments" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <h1 className="mb-4 text-2xl font-semibold">Appointments</h1>
                <div className="space-y-3">
                    {items.map((a) => (
                        <div key={a.id} className="rounded border p-3 text-sm">
                            <div className="font-medium">
                                {a.professional_role} | {new Date(a.scheduled_at).toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">
                                Client: {a.client?.name ?? '-'} | Professional: {a.professional?.name ?? '-'}
                            </div>
                            <div className="mt-1">Status: {a.status}</div>
                            {(auth.user.role === 'nutritionist' || auth.user.role === 'trainer' || auth.user.role === 'admin') && (
                                <div className="mt-2 flex gap-2">
                                    <button className="text-xs text-blue-700 underline" onClick={() => void updateStatus(a.id, 'accepted')}>
                                        Accept
                                    </button>
                                    <button className="text-xs text-slate-700 underline" onClick={() => void updateStatus(a.id, 'declined')}>
                                        Decline
                                    </button>
                                    <button className="text-xs text-green-700 underline" onClick={() => void updateStatus(a.id, 'completed')}>
                                        Complete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && <div className="text-sm text-slate-500">No appointments.</div>}
                </div>
            </main>
        </>
    );
}

