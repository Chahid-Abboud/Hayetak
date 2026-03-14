import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Pro = {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    role: 'trainer' | 'nutritionist';
    verified: boolean;
    status?: string | null;
    city?: string | null;
    professional_bio?: string | null;
    specialties?: string[] | null;
    availability_text?: string | null;
    contact_display?: string | null;
};

export default function AdminProfessionalsPage() {
    const [role, setRole] = useState<'trainer' | 'nutritionist'>('trainer');
    const [rows, setRows] = useState<Pro[]>([]);
    const [selected, setSelected] = useState<Pro | null>(null);

    async function load() {
        const res = await fetch(`/api/admin/professionals?role=${role}`);
        const json = await res.json();
        setRows(Array.isArray(json?.data) ? json.data : []);
    }

    useEffect(() => {
        void load();
    }, [role]);

    async function save() {
        if (!selected) return;
        await fetch(`/api/admin/professionals/${selected.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selected),
        });
        await load();
    }

    return (
        <>
            <Head title="Admin Professionals" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">
                        Professionals
                    </h1>
                    <div className="mb-3">
                        <select
                            value={role}
                            onChange={(e) =>
                                setRole(
                                    e.target.value as
                                        'trainer' | 'nutritionist',
                                )
                            }
                            className="rounded-xl border bg-card px-3 py-2 text-sm"
                        >
                            <option value="trainer">Trainers</option>
                            <option value="nutritionist">Dietitians</option>
                        </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/40 text-left">
                                    <tr>
                                        <th className="px-3 py-2">Name</th>
                                        <th className="px-3 py-2">City</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="cursor-pointer border-t transition hover:bg-muted/30"
                                            onClick={() =>
                                                setSelected({ ...r })
                                            }
                                        >
                                            <td className="px-3 py-2">{[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}</td>
                                            <td className="px-3 py-2">{r.city || '-'}</td>
                                            <td className="px-3 py-2">{r.verified ? 'approved' : (r.status || 'pending')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            {!selected && (
                                <div className="text-sm text-muted-foreground">
                                    Select a professional to edit.
                                </div>
                            )}
                            {selected && (
                                <div className="space-y-2 text-sm">
                                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={selected.first_name ?? ''} onChange={(e) => setSelected({ ...selected, first_name: e.target.value })} placeholder="First name" />
                                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={selected.last_name ?? ''} onChange={(e) => setSelected({ ...selected, last_name: e.target.value })} placeholder="Last name" />
                                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={selected.city ?? ''} onChange={(e) => setSelected({ ...selected, city: e.target.value })} placeholder="City/Area" />
                                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={selected.contact_display ?? ''} onChange={(e) => setSelected({ ...selected, contact_display: e.target.value })} placeholder="Contact display" />
                                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={selected.availability_text ?? ''} onChange={(e) => setSelected({ ...selected, availability_text: e.target.value })} placeholder="Availability" />
                                    <textarea className="w-full rounded-xl border bg-background px-3 py-2" rows={4} value={selected.professional_bio ?? ''} onChange={(e) => setSelected({ ...selected, professional_bio: e.target.value })} placeholder="Bio" />
                                    <input className="w-full rounded-xl border bg-background px-3 py-2" value={(selected.specialties ?? []).join(', ')} onChange={(e) => setSelected({ ...selected, specialties: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Specialties comma-separated" />
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={selected.verified} onChange={(e) => setSelected({ ...selected, verified: e.target.checked, status: e.target.checked ? 'active' : 'pending_verification' })} />
                                        Verified
                                    </label>
                                    <button className="rounded-xl bg-[color:var(--primary)] px-4 py-2 font-medium text-[color:var(--primary-foreground)]" onClick={() => void save()}>Save</button>
                                </div>
                            )}
                        </div>
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
