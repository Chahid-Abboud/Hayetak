import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

type Verification = {
    id: number;
    role: 'trainer' | 'nutritionist';
    full_legal_name: string;
    license_number: string;
    authority: string;
    country_state: string;
    expiry_date: string;
    review_status: string;
    notes?: string | null;
    user?: { id: number; email: string; first_name?: string; last_name?: string };
};

export default function AdminProfessionalVerifications() {
    const [rows, setRows] = useState<Verification[]>([]);
    const [status, setStatus] = useState('pending');

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/professional-verifications?status=${encodeURIComponent(status)}`);
        const json = await res.json();
        setRows(Array.isArray(json?.data) ? json.data : []);
    }, [status]);

    useEffect(() => {
        void load();
    }, [load]);

    async function review(id: number, reviewStatus: 'approved' | 'rejected' | 'needs_info') {
        const notes = window.prompt('Optional notes', '') ?? '';
        await fetch(`/api/admin/professional-verifications/${id}/review`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_status: reviewStatus, notes }),
        });
        await load();
    }

    return (
        <>
            <Head title="Professional Verifications" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">Pending Professionals</h1>
                    <div className="mb-3">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="rounded border bg-background px-3 py-2 text-sm"
                        >
                            <option value="pending">Pending</option>
                            <option value="needs_info">Needs info</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-3 py-2">User</th>
                                    <th className="px-3 py-2">Role</th>
                                    <th className="px-3 py-2">License</th>
                                    <th className="px-3 py-2">Authority</th>
                                    <th className="px-3 py-2">Area</th>
                                    <th className="px-3 py-2">Expiry</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id} className="border-t">
                                        <td className="px-3 py-2">{[r.user?.first_name, r.user?.last_name].filter(Boolean).join(' ') || r.user?.email}</td>
                                        <td className="px-3 py-2">{r.role}</td>
                                        <td className="px-3 py-2">{r.license_number}</td>
                                        <td className="px-3 py-2">{r.authority}</td>
                                        <td className="px-3 py-2">{r.country_state}</td>
                                        <td className="px-3 py-2">{r.expiry_date}</td>
                                        <td className="px-3 py-2">{r.review_status}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex gap-2">
                                                <button className="text-xs font-medium text-primary underline" onClick={() => void review(r.id, 'approved')}>Approve</button>
                                                <button className="text-xs font-medium text-destructive underline" onClick={() => void review(r.id, 'rejected')}>Reject</button>
                                                <button className="text-xs font-medium text-foreground underline" onClick={() => void review(r.id, 'needs_info')}>Needs info</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-6 text-muted-foreground" colSpan={8}>No records.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
