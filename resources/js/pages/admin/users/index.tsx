import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type AdminUser = {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    role: string;
    verified: boolean;
    status?: string | null;
};

export default function AdminUsersIndex() {
    const [users, setUsers] = useState<AdminUser[]>([]);

    useEffect(() => {
        void (async () => {
            const res = await fetch('/api/admin/users');
            const json = await res.json();
            setUsers(Array.isArray(json?.data) ? json.data : []);
        })();
    }, []);

    return (
        <>
            <Head title="Admin Users" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                <h1 className="mb-4 text-2xl font-semibold">Admin Console: Users</h1>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left">
                            <tr>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Role</th>
                                <th className="px-3 py-2">Verified</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-t">
                                    <td className="px-3 py-2">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</td>
                                    <td className="px-3 py-2">{u.email}</td>
                                    <td className="px-3 py-2">{u.role}</td>
                                    <td className="px-3 py-2">{u.verified ? 'Yes' : 'No'}</td>
                                    <td className="px-3 py-2">{u.status || '-'}</td>
                                    <td className="px-3 py-2">
                                        <Link href={`/admin/users/${u.id}`} className="text-blue-700 underline">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td className="px-3 py-6 text-slate-500" colSpan={6}>
                                        No users found.
                                    </td>
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
