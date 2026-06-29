import {
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    AdminSplitView,
    EntityDetailDrawer,
    ReviewDecisionPanel,
    RiskBannerStack,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
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
import { jsonRequestInit } from '@/lib/http';
import { Head, Link } from '@inertiajs/react';
import {
    CalendarClock,
    FileBadge2,
    RefreshCcw,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

type ReviewStatus = 'approved' | 'rejected' | 'needs_info';

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
    reviewed_at?: string | null;
    reviewer?: {
        id: number;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
    } | null;
    user?: {
        id: number;
        email: string;
        first_name?: string;
        last_name?: string;
        verified?: boolean;
        status?: string | null;
    };
};

type VerificationResponse = {
    data?: Verification[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
};

type RoleFilter = 'all' | 'trainer' | 'nutritionist';

function personName(user?: Verification['user']) {
    return (
        [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
        user?.email ||
        'Professional'
    );
}

function reviewerName(verification: Verification) {
    return (
        [verification.reviewer?.first_name, verification.reviewer?.last_name]
            .filter(Boolean)
            .join(' ') ||
        verification.reviewer?.email ||
        'Not reviewed yet'
    );
}

function formatDate(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function formatDateTime(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function daysUntil(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function normalizeReviewStatus(value: string): ReviewStatus {
    if (value === 'rejected' || value === 'needs_info') {
        return value;
    }

    return 'approved';
}

function formatStatusLabel(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRoleLabel(role?: Verification['role'] | RoleFilter | null) {
    if (role === 'nutritionist') {
        return 'Dietitian';
    }

    if (role === 'trainer') {
        return 'Trainer';
    }

    return 'All roles';
}

function reviewNeedsNotes(
    status: ReviewStatus,
    verification: Verification | null,
) {
    const expiryDelta = verification
        ? daysUntil(verification.expiry_date)
        : null;

    return status !== 'approved' || (expiryDelta !== null && expiryDelta <= 30);
}

function EvidenceRow({
    icon,
    label,
    value,
    meta,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    meta?: string;
}) {
    return (
        <div className="dashboard-surface-soft rounded-[22px] px-4 py-3">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted-foreground">{icon}</span>
                <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        {label}
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                        {value}
                    </div>
                    {meta ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                            {meta}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function VerificationDecisionSurface({
    verification,
    reviewStatus,
    reviewNotes,
    onReviewStatusChange,
    onReviewNotesChange,
    onRefresh,
    onSubmit,
    loading,
    saving,
    error,
}: {
    verification: Verification | null;
    reviewStatus: ReviewStatus;
    reviewNotes: string;
    onReviewStatusChange: (value: ReviewStatus) => void;
    onReviewNotesChange: (value: string) => void;
    onRefresh: () => void;
    onSubmit: () => void;
    loading: boolean;
    saving: boolean;
    error: string | null;
}) {
    if (loading) {
        return (
            <AdminEmpty
                title="Loading verification context"
                description="Pulling queue evidence, reviewer history, and account state for the selected request."
            />
        );
    }

    if (!verification) {
        return (
            <AdminEmpty
                title="Select a request"
                description="Choose a verification request from the queue to review evidence and take action here."
            />
        );
    }

    const expiryDelta = daysUntil(verification.expiry_date);
    const riskItems = [];

    if (expiryDelta !== null && expiryDelta < 0) {
        riskItems.push({
            severity: 'danger' as const,
            title: 'License is expired',
            description:
                'This verification should not be approved until the professional provides an updated credential.',
            meta: formatDate(verification.expiry_date),
        });
    } else if (expiryDelta !== null && expiryDelta <= 30) {
        riskItems.push({
            severity: 'warning' as const,
            title: 'Credential expires soon',
            description:
                'Renewal follow-up may be needed even if the submission is otherwise valid.',
            meta: `${expiryDelta} day${expiryDelta === 1 ? '' : 's'} remaining`,
        });
    }

    if (!verification.user?.verified) {
        riskItems.push({
            severity: 'info' as const,
            title: 'User account is still unverified',
            description:
                'Approving this request will also change the professional account state.',
        });
    }

    if (verification.notes && verification.review_status !== 'pending') {
        riskItems.push({
            severity:
                verification.review_status === 'rejected'
                    ? ('danger' as const)
                    : ('warning' as const),
            title: 'Existing reviewer notes',
            description: verification.notes,
            meta: verification.review_status.replace(/_/g, ' '),
        });
    }

    const requiresNotes = reviewNeedsNotes(reviewStatus, verification);
    const notesMissing = requiresNotes && reviewNotes.trim().length === 0;

    return (
        <div className="space-y-4">
            {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

            <AdminStickyBar
                summary="Decision actions"
                className="border-border/65 bg-background/82"
            >
                <Button
                    type="button"
                    variant={
                        reviewStatus === 'approved' ? 'default' : 'outline'
                    }
                    onClick={() => onReviewStatusChange('approved')}
                    disabled={!verification || saving}
                >
                    Approve
                </Button>
                <Button
                    type="button"
                    variant={
                        reviewStatus === 'needs_info' ? 'default' : 'outline'
                    }
                    onClick={() => onReviewStatusChange('needs_info')}
                    disabled={!verification || saving}
                >
                    Needs info
                </Button>
                <Button
                    type="button"
                    variant={
                        reviewStatus === 'rejected' ? 'destructive' : 'outline'
                    }
                    onClick={() => onReviewStatusChange('rejected')}
                    disabled={!verification || saving}
                >
                    Reject
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onRefresh}
                    disabled={!verification || saving}
                >
                    Refresh
                </Button>
                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={!verification || saving || notesMissing}
                >
                    {saving ? 'Saving...' : 'Save review'}
                </Button>
            </AdminStickyBar>

            <ReviewDecisionPanel
                title={personName(verification.user)}
                description="Review evidence, set the decision state, and leave a note that future admins can trust."
                summary={
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full px-2 py-0.5 text-[11px] capitalize">
                                {formatRoleLabel(verification.role)}
                            </Badge>
                            <StatusChipSet
                                items={[
                                    { value: verification.review_status },
                                    {
                                        value: verification.user?.verified
                                            ? 'verified'
                                            : 'unverified',
                                    },
                                    {
                                        value:
                                            verification.user?.status ||
                                            'pending',
                                    },
                                ]}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <EvidenceRow
                                icon={<FileBadge2 className="h-4 w-4" />}
                                label="License"
                                value={verification.license_number}
                                meta={verification.full_legal_name}
                            />
                            <EvidenceRow
                                icon={<CalendarClock className="h-4 w-4" />}
                                label="Expiry"
                                value={formatDate(verification.expiry_date)}
                                meta={`${verification.authority} - ${verification.country_state}`}
                            />
                        </div>
                    </div>
                }
                statusValue={reviewStatus}
                onStatusChange={(value) =>
                    onReviewStatusChange(value as ReviewStatus)
                }
                statusOptions={[
                    { value: 'approved', label: 'Approved' },
                    { value: 'needs_info', label: 'Needs info' },
                    { value: 'rejected', label: 'Rejected' },
                ]}
                notes={reviewNotes}
                onNotesChange={onReviewNotesChange}
                notesLabel="Review notes"
                notesPlaceholder="Capture why this decision was made and what the professional should know next."
                primaryActionLabel="Save review"
                onPrimaryAction={onSubmit}
                busy={saving}
                disabled={notesMissing}
                secondaryAction={
                    <Button type="button" variant="outline" onClick={onRefresh}>
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                }
                footerMeta={`Last reviewed by ${reviewerName(verification)} - ${formatDateTime(verification.reviewed_at)}`}
            >
                {riskItems.length > 0 ? (
                    <RiskBannerStack items={riskItems} />
                ) : (
                    <AdminNotice tone="success">
                        No immediate risks surfaced from this request. Review
                        the credential details and account state, then save the
                        final decision.
                    </AdminNotice>
                )}

                {notesMissing ? (
                    <AdminNotice tone="warning">
                        Review notes are required for rejected requests, needs
                        info decisions, and approvals with expired or
                        near-expiry credentials.
                    </AdminNotice>
                ) : null}

                <AdminPanel
                    title="Evidence summary"
                    description="Core facts that admins usually need before approving or requesting more information."
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <EvidenceRow
                            icon={<UserRound className="h-4 w-4" />}
                            label="Applicant"
                            value={personName(verification.user)}
                            meta={verification.user?.email}
                        />
                        <EvidenceRow
                            icon={<FileBadge2 className="h-4 w-4" />}
                            label="Legal name"
                            value={verification.full_legal_name}
                            meta={`License ${verification.license_number}`}
                        />
                        <EvidenceRow
                            icon={<ShieldCheck className="h-4 w-4" />}
                            label="Authority"
                            value={verification.authority}
                            meta={verification.country_state}
                        />
                        <EvidenceRow
                            icon={<CalendarClock className="h-4 w-4" />}
                            label="Expiry date"
                            value={formatDate(verification.expiry_date)}
                            meta={
                                expiryDelta === null
                                    ? 'Timing unavailable'
                                    : expiryDelta < 0
                                      ? 'Expired credential'
                                      : `${expiryDelta} day${expiryDelta === 1 ? '' : 's'} remaining`
                            }
                        />
                        <EvidenceRow
                            icon={<RefreshCcw className="h-4 w-4" />}
                            label="Reviewer history"
                            value={reviewerName(verification)}
                            meta={formatDateTime(verification.reviewed_at)}
                        />
                        <EvidenceRow
                            icon={<ShieldCheck className="h-4 w-4" />}
                            label="Account state"
                            value={
                                verification.user?.verified
                                    ? 'Verified account'
                                    : 'Unverified account'
                            }
                            meta={formatStatusLabel(
                                verification.user?.status || 'pending',
                            )}
                        />
                    </div>
                </AdminPanel>

                <AdminPanel
                    title="Logs and diagnostics"
                    description="Raw audit data stays out of the review page. Open logs when you need exact technical history."
                >
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href="/admin/logs">Open admin logs</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link
                                href={`/admin/users/${verification.user?.id}`}
                            >
                                Open account record
                            </Link>
                        </Button>
                    </div>
                </AdminPanel>
            </ReviewDecisionPanel>
        </div>
    );
}

export default function AdminProfessionalVerifications() {
    const [rows, setRows] = useState<Verification[]>([]);
    const [status, setStatus] = useState('pending');
    const [role, setRole] = useState<RoleFilter>('all');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('approved');
    const [reviewNotes, setReviewNotes] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                status,
                role,
                page: String(currentPage),
                per_page: '20',
            });

            if (query.trim()) {
                params.set('search', query.trim());
            }

            const res = await fetch(
                `/api/admin/professional-verifications?${params.toString()}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!res.ok) {
                throw new Error('Could not load verification requests.');
            }

            const json = (await res.json()) as VerificationResponse;
            const nextRows = Array.isArray(json?.data) ? json.data : [];

            setRows(nextRows);
            setTotal(Number(json?.total ?? 0));
            setCurrentPage(Number(json?.current_page ?? 1));
            setLastPage(Number(json?.last_page ?? 1));
            setFrom(json?.from ?? null);
            setTo(json?.to ?? null);
        } catch (loadError) {
            setRows([]);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load verification requests.',
            );
        } finally {
            setLoading(false);
        }
    }, [currentPage, query, role, status]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setCurrentPage(1);
    }, [query, role, status]);

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return rows.filter(
            (row) =>
                (role === 'all' || row.role === role) &&
                (normalizedQuery === '' ||
                    [
                        row.full_legal_name,
                        row.license_number,
                        row.authority,
                        row.country_state,
                        row.user?.email,
                        row.user?.first_name,
                        row.user?.last_name,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()
                        .includes(normalizedQuery)),
        );
    }, [query, role, rows]);

    useEffect(() => {
        if (filteredRows.length === 0) {
            setSelectedId(null);
            return;
        }

        if (!selectedId || !filteredRows.some((row) => row.id === selectedId)) {
            setSelectedId(filteredRows[0].id);
        }
    }, [filteredRows, selectedId]);

    const selectedVerification = useMemo(
        () => filteredRows.find((row) => row.id === selectedId) ?? null,
        [filteredRows, selectedId],
    );

    useEffect(() => {
        if (!selectedVerification) {
            setReviewStatus('approved');
            setReviewNotes('');
            return;
        }

        setReviewStatus(
            normalizeReviewStatus(selectedVerification.review_status),
        );
        setReviewNotes(selectedVerification.notes ?? '');
    }, [selectedVerification]);

    const summary = useMemo(
        () => ({
            pending: filteredRows.filter(
                (row) => row.review_status === 'pending',
            ).length,
            approved: filteredRows.filter(
                (row) => row.review_status === 'approved',
            ).length,
            needsInfo: filteredRows.filter(
                (row) => row.review_status === 'needs_info',
            ).length,
            expiringSoon: filteredRows.filter((row) => {
                const delta = daysUntil(row.expiry_date);
                return delta !== null && delta >= 0 && delta <= 30;
            }).length,
        }),
        [filteredRows],
    );

    const selectedNeedsNotes = useMemo(
        () => reviewNeedsNotes(reviewStatus, selectedVerification),
        [reviewStatus, selectedVerification],
    );

    async function submitReview() {
        if (!selectedVerification) {
            return;
        }

        if (
            reviewNeedsNotes(reviewStatus, selectedVerification) &&
            reviewNotes.trim().length === 0
        ) {
            setError(
                'Add review notes before saving this decision. Notes are required for reject, needs info, and near-expiry or expired approvals.',
            );
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/admin/professional-verifications/${selectedVerification.id}/review`,
                jsonRequestInit('PATCH', {
                    review_status: reviewStatus,
                    notes: reviewNotes.trim() || null,
                }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save this review.',
                );
            }

            await load();
        } catch (reviewError) {
            setError(
                reviewError instanceof Error
                    ? reviewError.message
                    : 'Could not save this review.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Professional Verifications" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Professional verifications"
                    description="Keep the queue, evidence, and decision surface together so approvals and follow-ups are easier to trust."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Requests Matching State"
                                value={loading ? '...' : String(total)}
                                tone="accent"
                                helper="Server-side count for the current review state filter."
                            />
                            <AdminStatCard
                                label="Visible On This Page"
                                value={
                                    loading
                                        ? '...'
                                        : String(filteredRows.length)
                                }
                                helper="Local search narrows the current page without losing queue context."
                            />
                            <AdminStatCard
                                label="Pending Review"
                                value={
                                    loading ? '...' : String(summary.pending)
                                }
                                helper="Useful when you widen the queue beyond the default pending view."
                            />
                            <AdminStatCard
                                label="Approved"
                                value={
                                    loading ? '...' : String(summary.approved)
                                }
                                helper="Approved records in the current view."
                            />
                            <AdminStatCard
                                label="Needs info"
                                value={
                                    loading ? '...' : String(summary.needsInfo)
                                }
                                helper="Profiles waiting on additional details."
                            />
                            <AdminStatCard
                                label="Expiring within 30 days"
                                value={
                                    loading
                                        ? '...'
                                        : String(summary.expiringSoon)
                                }
                                helper="Useful for renewal follow-up."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Verification queue"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} requests. Select a row to keep the evidence and decision panel visible.`
                                    : 'Select a row to keep the evidence and decision panel visible.'
                            }
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField
                                        label="Search"
                                        className="xl:min-w-[320px] xl:flex-1"
                                    >
                                        <AdminSearchInput
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Search professional, license, authority, or email"
                                        />
                                    </AdminField>

                                    <AdminField
                                        label="Review state"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={status}
                                            onChange={(event) =>
                                                setStatus(event.target.value)
                                            }
                                        >
                                            <option value="pending">
                                                Pending
                                            </option>
                                            <option value="needs_info">
                                                Needs info
                                            </option>
                                            <option value="approved">
                                                Approved
                                            </option>
                                            <option value="rejected">
                                                Rejected
                                            </option>
                                            <option value="all">All</option>
                                        </AdminNativeSelect>
                                    </AdminField>

                                    <AdminField
                                        label="Role"
                                        className="sm:w-48"
                                    >
                                        <AdminNativeSelect
                                            value={role}
                                            onChange={(event) =>
                                                setRole(
                                                    event.target
                                                        .value as RoleFilter,
                                                )
                                            }
                                        >
                                            <option value="all">
                                                All roles
                                            </option>
                                            <option value="trainer">
                                                Trainers
                                            </option>
                                            <option value="nutritionist">
                                                Dietitians
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>

                                <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void load()}
                                        disabled={loading}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        {loading
                                            ? 'Refreshing...'
                                            : 'Refresh queue'}
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>

                            {error && !selectedVerification ? (
                                <AdminNotice tone="danger">{error}</AdminNotice>
                            ) : null}

                            <AdminSplitView
                                list={
                                    <div className="space-y-4">
                                        {loading &&
                                        filteredRows.length === 0 ? (
                                            <AdminEmpty
                                                title="Loading verification requests"
                                                description="Pulling the current review queue for trainers and nutritionists."
                                            />
                                        ) : (
                                            <AdminScrollArea maxHeightClassName="max-h-[72vh] xl:max-h-[68vh]">
                                                <AdminDataTable tableClassName="min-w-[1040px]">
                                                    <ProductTableHead>
                                                        <tr>
                                                            <ProductTableHeaderCell>
                                                                Applicant
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Evidence
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Status & account
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Reviewer notes
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell className="w-40">
                                                                Actions
                                                            </ProductTableHeaderCell>
                                                        </tr>
                                                    </ProductTableHead>
                                                    <ProductTableBody>
                                                        {filteredRows.map(
                                                            (row) => {
                                                                const isSelected =
                                                                    selectedId ===
                                                                    row.id;

                                                                return (
                                                                    <ProductTableRow
                                                                        key={
                                                                            row.id
                                                                        }
                                                                        interactive
                                                                        className={
                                                                            isSelected
                                                                                ? 'bg-primary/6'
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        <ProductTableCell>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setSelectedId(
                                                                                        row.id,
                                                                                    )
                                                                                }
                                                                                className="w-full min-w-0 space-y-2 text-left"
                                                                            >
                                                                                <div className="font-medium break-words text-foreground">
                                                                                    {personName(
                                                                                        row.user,
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-2 text-xs [overflow-wrap:anywhere] break-words text-muted-foreground">
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="rounded-full px-2.5 py-1 capitalize"
                                                                                    >
                                                                                        {formatRoleLabel(
                                                                                            row.role,
                                                                                        )}
                                                                                    </Badge>
                                                                                    <span>
                                                                                        {
                                                                                            row.authority
                                                                                        }
                                                                                    </span>
                                                                                    <span>
                                                                                        {
                                                                                            row.country_state
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </button>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <div className="space-y-1">
                                                                                <div className="font-medium break-words text-foreground">
                                                                                    {
                                                                                        row.license_number
                                                                                    }
                                                                                </div>
                                                                                <div className="text-xs [overflow-wrap:anywhere] break-words text-muted-foreground">
                                                                                    {
                                                                                        row.full_legal_name
                                                                                    }
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    Expires{' '}
                                                                                    {formatDate(
                                                                                        row.expiry_date,
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <div className="space-y-2">
                                                                                <StatusChipSet
                                                                                    items={[
                                                                                        {
                                                                                            value: row.review_status,
                                                                                        },
                                                                                        {
                                                                                            value: row
                                                                                                .user
                                                                                                ?.verified
                                                                                                ? 'verified'
                                                                                                : 'unverified',
                                                                                        },
                                                                                    ]}
                                                                                />
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    Account:{' '}
                                                                                    {formatStatusLabel(
                                                                                        row
                                                                                            .user
                                                                                            ?.status ||
                                                                                            'pending',
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <div className="space-y-1">
                                                                                <div className="text-sm font-medium text-foreground">
                                                                                    {reviewerName(
                                                                                        row,
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {formatDateTime(
                                                                                        row.reviewed_at,
                                                                                    )}
                                                                                </div>
                                                                                <div className="line-clamp-2 text-xs text-muted-foreground">
                                                                                    {row.notes ||
                                                                                        'No reviewer notes yet.'}
                                                                                </div>
                                                                            </div>
                                                                        </ProductTableCell>
                                                                        <ProductTableCell>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => {
                                                                                        setSelectedId(
                                                                                            row.id,
                                                                                        );
                                                                                        setDrawerOpen(
                                                                                            true,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    Review
                                                                                </Button>
                                                                            </div>
                                                                        </ProductTableCell>
                                                                    </ProductTableRow>
                                                                );
                                                            },
                                                        )}

                                                        {!loading &&
                                                        filteredRows.length ===
                                                            0 ? (
                                                            <ProductTableEmptyRow
                                                                colSpan={5}
                                                                title="No verification requests found"
                                                                description="Try another status filter or come back when new professional applications arrive."
                                                            />
                                                        ) : null}
                                                    </ProductTableBody>
                                                </AdminDataTable>
                                            </AdminScrollArea>
                                        )}

                                        <AdminPagination
                                            currentPage={currentPage}
                                            lastPage={lastPage}
                                            disabled={loading}
                                            summary={
                                                from && to
                                                    ? `Showing ${from}-${to} of ${total} requests`
                                                    : 'Pagination stays aligned with the active status filter.'
                                            }
                                            onPrevious={() =>
                                                setCurrentPage((page) =>
                                                    Math.max(1, page - 1),
                                                )
                                            }
                                            onNext={() =>
                                                setCurrentPage((page) =>
                                                    Math.min(
                                                        lastPage,
                                                        page + 1,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                }
                                detail={
                                    <VerificationDecisionSurface
                                        verification={selectedVerification}
                                        reviewStatus={reviewStatus}
                                        reviewNotes={reviewNotes}
                                        onReviewStatusChange={setReviewStatus}
                                        onReviewNotesChange={setReviewNotes}
                                        onRefresh={() => void load()}
                                        onSubmit={() => void submitReview()}
                                        loading={
                                            loading && filteredRows.length === 0
                                        }
                                        saving={saving}
                                        error={
                                            selectedVerification ? error : null
                                        }
                                    />
                                }
                                listClassName="min-w-0"
                                detailClassName="min-w-0"
                            />
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={
                    selectedVerification
                        ? personName(selectedVerification.user)
                        : 'Verification review'
                }
                description="Mobile review surface for credential decisions."
                footer={
                    selectedVerification ? (
                        <div className="flex w-full flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void load()}
                            >
                                Refresh
                            </Button>
                            <Button
                                type="button"
                                onClick={() => void submitReview()}
                                disabled={
                                    saving ||
                                    (selectedNeedsNotes &&
                                        reviewNotes.trim().length === 0)
                                }
                            >
                                {saving ? 'Saving...' : 'Save review'}
                            </Button>
                        </div>
                    ) : null
                }
            >
                <VerificationDecisionSurface
                    verification={selectedVerification}
                    reviewStatus={reviewStatus}
                    reviewNotes={reviewNotes}
                    onReviewStatusChange={setReviewStatus}
                    onReviewNotesChange={setReviewNotes}
                    onRefresh={() => void load()}
                    onSubmit={() => void submitReview()}
                    loading={loading && filteredRows.length === 0}
                    saving={saving}
                    error={selectedVerification ? error : null}
                />
            </EntityDetailDrawer>
        </>
    );
}
