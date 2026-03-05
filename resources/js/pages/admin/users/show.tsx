import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

type Props = { userId: number };

const USER_ROLES = ['admin', 'nutritionist', 'trainer', 'client'] as const;

type UserRole = (typeof USER_ROLES)[number];

type AdminUserSummary = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    verified: boolean;
    status: string | null;
};

type AdminUserDetailResponse = {
    user: AdminUserSummary;
    meal_entries: unknown[];
    workout_logs: unknown[];
};

function isUserRole(role: string): role is UserRole {
    return USER_ROLES.includes(role as UserRole);
}

export default function AdminUserShow() {
    const { userId } = usePage<Props>().props;
    const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
    const [role, setRole] = useState<UserRole>('client');
    const [verified, setVerified] = useState(false);
    const [status, setStatus] = useState('');

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/users/${userId}`);
        const json = (await res.json()) as AdminUserDetailResponse;
        setDetail(json);
        setRole(isUserRole(json?.user?.role) ? json.user.role : 'client');
        setVerified(Boolean(json?.user?.verified));
        setStatus(json?.user?.status ?? '');
    }, [userId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function saveUser() {
        await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, verified, status }),
        });
        await load();
    }

    async function deleteUser() {
        if (!window.confirm('Delete this user?')) return;
        await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        window.location.href = '/admin/users';
    }

    return (
        <>
            <Head title="Admin User Detail" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">User Detail</h1>
                    {!detail && (
                        <div className="text-sm text-slate-500">Loading...</div>
                    )}
                    {detail && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border p-4">
                                <div className="mb-2 text-sm font-medium">
                                    Account
                                </div>
                                <div className="text-sm">
                                    {detail.user.name}
                                </div>
                                <div className="text-xs text-slate-600">
                                    {detail.user.email}
                                </div>
                                <div className="mt-3 grid gap-2">
                                    <label className="text-sm">
                                        Role
                                        <select
                                            className="mt-1 w-full rounded border px-2 py-1"
                                            value={role}
                                            onChange={(e) =>
                                                setRole(
                                                    isUserRole(e.target.value)
                                                        ? e.target.value
                                                        : 'client',
                                                )
                                            }
                                        >
                                            <option value="admin">admin</option>
                                            <option value="nutritionist">
                                                nutritionist
                                            </option>
                                            <option value="trainer">
                                                trainer
                                            </option>
                                            <option value="client">
                                                client
                                            </option>
                                        </select>
                                    </label>
                                    <label className="text-sm">
                                        Status
                                        <input
                                            className="mt-1 w-full rounded border px-2 py-1"
                                            value={status}
                                            onChange={(e) =>
                                                setStatus(e.target.value)
                                            }
                                        />
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={verified}
                                            onChange={(e) =>
                                                setVerified(e.target.checked)
                                            }
                                        />
                                        Verified
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            className="rounded bg-blue-700 px-3 py-1 text-sm text-white"
                                            onClick={() => void saveUser()}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="rounded bg-red-700 px-3 py-1 text-sm text-white"
                                            onClick={() => void deleteUser()}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <section className="rounded-lg border p-4">
                                    <h2 className="mb-2 text-sm font-medium">
                                        Meal Entries
                                    </h2>
                                    <div className="max-h-48 overflow-auto text-xs text-slate-700">
                                        {JSON.stringify(
                                            detail.meal_entries,
                                            null,
                                            2,
                                        )}
                                    </div>
                                </section>
                                <section className="rounded-lg border p-4">
                                    <h2 className="mb-2 text-sm font-medium">
                                        Workout Logs
                                    </h2>
                                    <div className="max-h-48 overflow-auto text-xs text-slate-700">
                                        {JSON.stringify(
                                            detail.workout_logs,
                                            null,
                                            2,
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </RoleGuard>
            </main>
        </>
    );
}
