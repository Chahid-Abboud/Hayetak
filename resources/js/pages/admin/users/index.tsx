import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link } from '@inertiajs/react';
import { Search, SlidersHorizontal, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type AdminUser = {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    username?: string | null;
    role: string;
    verified: boolean;
    status?: string | null;
    city?: string | null;
    deleted_at?: string | null;
    meal_entries_count?: number;
    meal_logs_count?: number;
    workout_logs_count?: number;
    notifications_received_count?: number;
    ai_conversations_count?: number;
};

type AdminUserResponse = {
    data?: AdminUser[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
};

export default function AdminUsersIndex() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('all');
    const [verified, setVerified] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    per_page: '12',
                    page: String(currentPage),
                });

                if (search.trim()) {
                    params.set('search', search.trim());
                }
                if (role !== 'all') {
                    params.set('role', role);
                }
                if (verified !== 'all') {
                    params.set('verified', verified);
                }

                const res = await fetch(
                    `/api/admin/users?${params.toString()}`,
                );
                if (!res.ok) {
                    throw new Error('Could not load users.');
                }

                const json = (await res.json()) as AdminUserResponse;
                if (cancelled) {
                    return;
                }

                setUsers(Array.isArray(json?.data) ? json.data : []);
                setTotal(Number(json?.total ?? 0));
                setCurrentPage(Number(json?.current_page ?? 1));
                setLastPage(Number(json?.last_page ?? 1));
                setFrom(json?.from ?? null);
                setTo(json?.to ?? null);
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Could not load users.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentPage, role, search, verified]);

    useEffect(() => {
        setCurrentPage(1);
    }, [role, search, verified]);

    const pageSummary = useMemo(() => {
        const verifiedCount = users.filter((user) => user.verified).length;
        const professionalCount = users.filter((user) =>
            ['trainer', 'nutritionist'].includes(user.role),
        ).length;

        return { verifiedCount, professionalCount };
    }, [users]);

    return (
        <>
            <Head title="Admin Users" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="User Management"
                    description="Search every account, review important activity at a glance, and jump straight into the full admin record for updates."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Users Matching Filters"
                                value={loading ? '...' : String(total)}
                                tone="accent"
                                helper="Live count from the current search and role filters."
                            />
                            <AdminStatCard
                                label="Visible On This Page"
                                value={loading ? '...' : String(users.length)}
                                helper="Helpful for reviewing smaller result sets quickly."
                            />
                            <AdminStatCard
                                label="Verified Accounts"
                                value={
                                    loading
                                        ? '...'
                                        : String(pageSummary.verifiedCount)
                                }
                                helper="Count from the current page of results."
                            />
                            <AdminStatCard
                                label="Professionals"
                                value={
                                    loading
                                        ? '...'
                                        : String(pageSummary.professionalCount)
                                }
                                helper="Trainers and nutritionists shown in the current results."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Find Users"
                            description="Filter by role or verification and search by name, email, username, or city."
                        >
                            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_1fr_1fr]">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-foreground">
                                        Search
                                    </span>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Search by name, email, username, or city"
                                            className="pl-9"
                                        />
                                    </div>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-foreground">
                                        Role
                                    </span>
                                    <select
                                        value={role}
                                        onChange={(event) =>
                                            setRole(event.target.value)
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <option value="all">All roles</option>
                                        <option value="admin">Admin</option>
                                        <option value="client">Client</option>
                                        <option value="trainer">Trainer</option>
                                        <option value="nutritionist">
                                            Nutritionist
                                        </option>
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-foreground">
                                        Verification
                                    </span>
                                    <select
                                        value={verified}
                                        onChange={(event) =>
                                            setVerified(event.target.value)
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <option value="all">
                                            All accounts
                                        </option>
                                        <option value="true">Verified</option>
                                        <option value="false">
                                            Not verified
                                        </option>
                                    </select>
                                </label>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Results"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} users.`
                                    : 'Open a record to edit account details, preferences, health profile, and recent activity.'
                            }
                            actions={
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    {loading
                                        ? 'Refreshing results...'
                                        : 'Filters update automatically'}
                                </div>
                            }
                        >
                            {error ? (
                                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                                    {error}
                                </div>
                            ) : null}

                            <div className="grid gap-4 lg:grid-cols-2">
                                {users.map((user) => {
                                    const title =
                                        [user.first_name, user.last_name]
                                            .filter(Boolean)
                                            .join(' ') ||
                                        user.name ||
                                        user.email;

                                    return (
                                        <article
                                            key={user.id}
                                            className="rounded-2xl border border-border/70 bg-background/80 p-5"
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                            <UserRound className="h-5 w-5" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="text-lg font-semibold text-foreground">
                                                                {title}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                {user.email}
                                                            </p>
                                                            {user.username ? (
                                                                <p className="text-xs text-muted-foreground">
                                                                    @
                                                                    {
                                                                        user.username
                                                                    }
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge className="rounded-full px-2.5 py-1 capitalize">
                                                            {user.role}
                                                        </Badge>
                                                        <Badge
                                                            variant={
                                                                user.verified
                                                                    ? 'default'
                                                                    : 'outline'
                                                            }
                                                            className="rounded-full px-2.5 py-1"
                                                        >
                                                            {user.verified
                                                                ? 'Verified'
                                                                : 'Needs review'}
                                                        </Badge>
                                                        {user.status ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="rounded-full px-2.5 py-1"
                                                            >
                                                                {user.status}
                                                            </Badge>
                                                        ) : null}
                                                        {user.city ? (
                                                            <Badge
                                                                variant="secondary"
                                                                className="rounded-full px-2.5 py-1"
                                                            >
                                                                {user.city}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <Button asChild>
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                    >
                                                        Open record
                                                    </Link>
                                                </Button>
                                            </div>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <MiniStat
                                                    label="Meal Entries"
                                                    value={String(
                                                        user.meal_entries_count ??
                                                            0,
                                                    )}
                                                />
                                                <MiniStat
                                                    label="Workout Logs"
                                                    value={String(
                                                        user.workout_logs_count ??
                                                            0,
                                                    )}
                                                />
                                                <MiniStat
                                                    label="Alerts"
                                                    value={String(
                                                        user.notifications_received_count ??
                                                            0,
                                                    )}
                                                />
                                                <MiniStat
                                                    label="AI Chats"
                                                    value={String(
                                                        user.ai_conversations_count ??
                                                            0,
                                                    )}
                                                />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            {!loading && users.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                                    No users matched the current filters.
                                </div>
                            ) : null}

                            <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {lastPage}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.max(1, page - 1),
                                            )
                                        }
                                        disabled={currentPage <= 1 || loading}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.min(lastPage, page + 1),
                                            )
                                        }
                                        disabled={
                                            currentPage >= lastPage || loading
                                        }
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
            <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {value}
            </div>
        </div>
    );
}
