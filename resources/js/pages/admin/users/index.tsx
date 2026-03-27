import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTable,
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { jsonRequestInit } from '@/lib/http';
import {
    type AdminBulkUserAction,
    type AdminBulkUsersPayload,
    type AdminBulkUsersResponse,
} from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Search, SlidersHorizontal } from 'lucide-react';
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
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] =
        useState<AdminBulkUserAction>('verify');
    const [bulkStatus, setBulkStatus] = useState('active');
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    per_page: '20',
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
                setSelectedUserIds((current) =>
                    current.filter((id) =>
                        (Array.isArray(json?.data) ? json.data : []).some(
                            (user) => user.id === id,
                        ),
                    ),
                );
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

    const allVisibleSelected =
        users.length > 0 && users.every((user) => selectedUserIds.includes(user.id));

    async function runBulkAction() {
        if (selectedUserIds.length === 0 || bulkBusy) {
            return;
        }

        setBulkBusy(true);
        setError(null);
        setBulkFeedback(null);

        try {
            const payload: AdminBulkUsersPayload = {
                user_ids: selectedUserIds,
                action: bulkAction,
            };

            if (bulkAction === 'set_status') {
                payload.status = bulkStatus;
            }

            const response = await fetch(
                '/api/admin/users/bulk-update',
                jsonRequestInit('POST', payload),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not run bulk update.',
                );
            }

            const json = (await response.json()) as AdminBulkUsersResponse;
            setBulkFeedback(
                `Updated ${json.summary.updated_count} user(s), skipped ${json.summary.skipped_count}.`,
            );
            setSelectedUserIds([]);

            const params = new URLSearchParams({
                per_page: '20',
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

            const listResponse = await fetch(
                `/api/admin/users?${params.toString()}`,
            );
            if (listResponse.ok) {
                const listJson = (await listResponse.json()) as AdminUserResponse;
                setUsers(Array.isArray(listJson?.data) ? listJson.data : []);
                setTotal(Number(listJson?.total ?? 0));
                setCurrentPage(Number(listJson?.current_page ?? 1));
                setLastPage(Number(listJson?.last_page ?? 1));
                setFrom(listJson?.from ?? null);
                setTo(listJson?.to ?? null);
            }
        } catch (bulkError) {
            setError(
                bulkError instanceof Error
                    ? bulkError.message
                    : 'Could not run bulk update.',
            );
        } finally {
            setBulkBusy(false);
        }
    }

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

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            {selectedUserIds.length} selected
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={bulkAction}
                                                onChange={(event) =>
                                                    setBulkAction(
                                                        event.target
                                                            .value as AdminBulkUserAction,
                                                    )
                                                }
                                                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <option value="verify">
                                                    Verify
                                                </option>
                                                <option value="unverify">
                                                    Unverify
                                                </option>
                                                <option value="set_status">
                                                    Set status
                                                </option>
                                            </select>
                                            {bulkAction === 'set_status' ? (
                                                <select
                                                    value={bulkStatus}
                                                    onChange={(event) =>
                                                        setBulkStatus(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                >
                                                    <option value="active">
                                                        active
                                                    </option>
                                                    <option value="pending">
                                                        pending
                                                    </option>
                                                    <option value="needs_review">
                                                        needs_review
                                                    </option>
                                                    <option value="needs_info">
                                                        needs_info
                                                    </option>
                                                    <option value="rejected">
                                                        rejected
                                                    </option>
                                                    <option value="suspended">
                                                        suspended
                                                    </option>
                                                </select>
                                            ) : null}
                                            <Button
                                                type="button"
                                                onClick={() => void runBulkAction()}
                                                disabled={
                                                    selectedUserIds.length ===
                                                        0 || bulkBusy
                                                }
                                            >
                                                {bulkBusy
                                                    ? 'Updating...'
                                                    : 'Apply'}
                                            </Button>
                                        </div>
                                    </div>
                                    {bulkFeedback ? (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {bulkFeedback}
                                        </p>
                                    ) : null}
                                </div>

                                <ProductTable>
                                    <ProductTableHead>
                                        <tr>
                                            <ProductTableHeaderCell className="w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={(event) =>
                                                        setSelectedUserIds(
                                                            event.target.checked
                                                                ? users.map(
                                                                      (user) =>
                                                                          user.id,
                                                                  )
                                                                : [],
                                                        )
                                                    }
                                                    aria-label="Select visible users"
                                                />
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                User
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                Role
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                Status
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                Activity
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell className="w-36">
                                                Action
                                            </ProductTableHeaderCell>
                                        </tr>
                                    </ProductTableHead>
                                    <ProductTableBody>
                                        {users.map((user) => {
                                            const title =
                                                [user.first_name, user.last_name]
                                                    .filter(Boolean)
                                                    .join(' ') ||
                                                user.name ||
                                                user.email;

                                            return (
                                                <ProductTableRow key={user.id}>
                                                    <ProductTableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUserIds.includes(
                                                                user.id,
                                                            )}
                                                            onChange={(event) =>
                                                                setSelectedUserIds(
                                                                    (current) =>
                                                                        event
                                                                            .target
                                                                            .checked
                                                                            ? current.includes(
                                                                                  user.id,
                                                                              )
                                                                                ? current
                                                                                : [
                                                                                      ...current,
                                                                                      user.id,
                                                                                  ]
                                                                            : current.filter(
                                                                                  (
                                                                                      id,
                                                                                  ) =>
                                                                                      id !==
                                                                                      user.id,
                                                                              ),
                                                                )
                                                            }
                                                            aria-label={`Select ${title}`}
                                                        />
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <Badge className="rounded-full px-2 py-0.5 text-[11px] capitalize">
                                                            {user.role}
                                                        </Badge>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <Badge
                                                                variant={
                                                                    user.verified
                                                                        ? 'default'
                                                                        : 'outline'
                                                                }
                                                                className="rounded-full px-2 py-0.5 text-[11px]"
                                                            >
                                                                {user.verified
                                                                    ? 'Verified'
                                                                    : 'Needs review'}
                                                            </Badge>
                                                            {user.status ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="rounded-full px-2 py-0.5 text-[11px]"
                                                                >
                                                                    {user.status}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-xs text-muted-foreground">
                                                        Meals:{' '}
                                                        {user.meal_entries_count ??
                                                            0}
                                                        {' | '}Workouts:{' '}
                                                        {user.workout_logs_count ??
                                                            0}
                                                        {' | '}AI:{' '}
                                                        {user.ai_conversations_count ??
                                                            0}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <Button size="sm" asChild>
                                                            <Link
                                                                href={`/admin/users/${user.id}`}
                                                            >
                                                                Open
                                                            </Link>
                                                        </Button>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            );
                                        })}
                                        {!loading && users.length === 0 ? (
                                            <ProductTableEmptyRow
                                                colSpan={6}
                                                title="No users matched"
                                                description="Try different filters or reset search criteria."
                                            />
                                        ) : null}
                                    </ProductTableBody>
                                </ProductTable>
                            </div>

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
