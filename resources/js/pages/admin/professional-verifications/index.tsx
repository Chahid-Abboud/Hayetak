import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import { ProductBanner, ProductEmptyState } from '@/components/product/page';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { RefreshCcw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
};

type ReviewDialogState = {
    verification: Verification;
    reviewStatus: ReviewStatus;
    notes: string;
};

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

function statusLabel(value: string) {
    return value.replace(/_/g, ' ');
}

export default function AdminProfessionalVerifications() {
    const [rows, setRows] = useState<Verification[]>([]);
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(
        null,
    );
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/admin/professional-verifications?status=${encodeURIComponent(status)}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!res.ok) {
                throw new Error('Could not load verification requests.');
            }

            const json = (await res.json()) as VerificationResponse;
            setRows(Array.isArray(json?.data) ? json.data : []);
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
    }, [status]);

    useEffect(() => {
        void load();
    }, [load]);

    const summary = useMemo(
        () => ({
            approved: rows.filter((row) => row.review_status === 'approved')
                .length,
            needsInfo: rows.filter((row) => row.review_status === 'needs_info')
                .length,
            expiringSoon: rows.filter((row) => {
                const expiry = new Date(row.expiry_date);
                if (Number.isNaN(expiry.getTime())) return false;
                const daysUntilExpiry =
                    (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
            }).length,
        }),
        [rows],
    );

    async function submitReview() {
        if (!reviewDialog) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/admin/professional-verifications/${reviewDialog.verification.id}/review`,
                jsonRequestInit('PATCH', {
                    review_status: reviewDialog.reviewStatus,
                    notes: reviewDialog.notes.trim() || null,
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

            setReviewDialog(null);
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
                    description="Review trainer and nutritionist verification requests with cleaner status handling, notes, and action history."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                className="flex h-10 rounded-full border border-input bg-background px-4 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="pending">Pending</option>
                                <option value="needs_info">Needs info</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="all">All</option>
                            </select>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void load()}
                                disabled={loading}
                            >
                                <RefreshCcw className="h-4 w-4" />
                                {loading ? 'Refreshing...' : 'Refresh'}
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible requests"
                                value={loading ? '...' : String(rows.length)}
                                tone="accent"
                                helper="Filtered by the selected review state."
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
                            description="Open a request to approve it, reject it, or ask the professional for more information."
                        >
                            <div className="space-y-4">
                                {error ? (
                                    <ProductBanner tone="danger">
                                        {error}
                                    </ProductBanner>
                                ) : null}

                                {loading ? (
                                    <ProductEmptyState
                                        title="Loading verification requests"
                                        description="Pulling the current review queue for trainers and nutritionists."
                                    />
                                ) : (
                                    <ProductTable>
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    Professional
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    License
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Status
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Reviewer
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell className="w-48">
                                                    Actions
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {rows.map((row) => (
                                                <ProductTableRow key={row.id}>
                                                    <ProductTableCell>
                                                        <div className="space-y-2">
                                                            <div className="font-medium text-foreground">
                                                                {personName(
                                                                    row.user,
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="rounded-full px-2.5 py-1 capitalize"
                                                                >
                                                                    {row.role ===
                                                                    'nutritionist'
                                                                        ? 'Dietitian'
                                                                        : 'Trainer'}
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
                                                            <div className="text-xs text-muted-foreground">
                                                                Expires{' '}
                                                                {new Date(
                                                                    row.expiry_date,
                                                                ).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-medium">
                                                                {
                                                                    row.license_number
                                                                }
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {
                                                                    row.full_legal_name
                                                                }
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="space-y-2">
                                                            <Badge
                                                                variant={
                                                                    row.review_status ===
                                                                    'approved'
                                                                        ? 'default'
                                                                        : row.review_status ===
                                                                            'rejected'
                                                                          ? 'destructive'
                                                                          : 'outline'
                                                                }
                                                                className="rounded-full px-2.5 py-1 capitalize"
                                                            >
                                                                {statusLabel(
                                                                    row.review_status,
                                                                )}
                                                            </Badge>
                                                            {row.notes ? (
                                                                <p className="text-xs leading-5 text-muted-foreground">
                                                                    {row.notes}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        <div className="space-y-1">
                                                            <div>
                                                                {reviewerName(
                                                                    row,
                                                                )}
                                                            </div>
                                                            <div className="text-xs">
                                                                {row.reviewed_at
                                                                    ? new Date(
                                                                          row.reviewed_at,
                                                                      ).toLocaleString()
                                                                    : 'Not reviewed yet'}
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setReviewDialog(
                                                                        {
                                                                            verification:
                                                                                row,
                                                                            reviewStatus:
                                                                                'approved',
                                                                            notes:
                                                                                row.notes ??
                                                                                '',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setReviewDialog(
                                                                        {
                                                                            verification:
                                                                                row,
                                                                            reviewStatus:
                                                                                'needs_info',
                                                                            notes:
                                                                                row.notes ??
                                                                                '',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                Needs info
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    setReviewDialog(
                                                                        {
                                                                            verification:
                                                                                row,
                                                                            reviewStatus:
                                                                                'rejected',
                                                                            notes:
                                                                                row.notes ??
                                                                                '',
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}

                                            {rows.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={5}
                                                    title="No verification requests found"
                                                    description="Try another status filter or come back when new professional applications arrive."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </ProductTable>
                                )}
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <Dialog
                open={reviewDialog !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setReviewDialog(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Review verification
                        </DialogTitle>
                        <DialogDescription>
                            {reviewDialog
                                ? `Update ${personName(reviewDialog.verification.user)} to ${statusLabel(reviewDialog.reviewStatus)}.`
                                : 'Review this professional verification request.'}
                        </DialogDescription>
                    </DialogHeader>

                    {reviewDialog ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm">
                                <div className="font-medium text-foreground">
                                    {reviewDialog.verification.full_legal_name}
                                </div>
                                <div className="mt-1 text-muted-foreground">
                                    {reviewDialog.verification.license_number} •{' '}
                                    {reviewDialog.verification.authority}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="review-status">
                                    Review status
                                </Label>
                                <select
                                    id="review-status"
                                    value={reviewDialog.reviewStatus}
                                    onChange={(event) =>
                                        setReviewDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      reviewStatus: event.target
                                                          .value as ReviewStatus,
                                                  }
                                                : current,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="approved">Approved</option>
                                    <option value="needs_info">
                                        Needs info
                                    </option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="review-notes">
                                    Notes for the record
                                </Label>
                                <Textarea
                                    id="review-notes"
                                    value={reviewDialog.notes}
                                    onChange={(event) =>
                                        setReviewDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      notes: event.target.value,
                                                  }
                                                : current,
                                        )
                                    }
                                    rows={5}
                                    placeholder="Add any internal context or a short explanation for the professional."
                                />
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReviewDialog(null)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void submitReview()}
                            disabled={saving || !reviewDialog}
                        >
                            {saving ? 'Saving...' : 'Save review'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
