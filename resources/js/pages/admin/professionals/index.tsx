import {
    AdminCheckboxField,
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    EntityDetailDrawer,
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
import { RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ProfessionalVerificationSummary = {
    review_status?: string | null;
    notes?: string | null;
    authority?: string | null;
    expiry_date?: string | null;
};

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
    latest_professional_verification?: ProfessionalVerificationSummary | null;
};

type ProfessionalResponse = {
    data?: Pro[];
    cities?: string[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
};

function professionalName(professional?: Pro | null) {
    return (
        [professional?.first_name, professional?.last_name]
            .filter(Boolean)
            .join(' ') ||
        professional?.email ||
        'Professional'
    );
}

function formatRoleLabel(role?: Pro['role'] | null) {
    return role === 'nutritionist' ? 'Dietitian' : 'Trainer';
}

function formatStatusLabel(value?: string | null) {
    if (!value) {
        return 'Pending';
    }

    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function normalizeText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
}

function directoryGaps(professional?: Pro | null) {
    if (!professional) {
        return [];
    }

    const gaps: string[] = [];

    if (!normalizeText(professional.city)) {
        gaps.push('City');
    }

    if (!normalizeText(professional.contact_display)) {
        gaps.push('Contact display');
    }

    if (!normalizeText(professional.availability_text)) {
        gaps.push('Availability');
    }

    if (!normalizeText(professional.professional_bio)) {
        gaps.push('Bio');
    }

    if ((professional.specialties ?? []).length === 0) {
        gaps.push('Specialties');
    }

    return gaps;
}

function isDirectoryReady(professional?: Pro | null) {
    return (
        Boolean(professional?.verified) &&
        directoryGaps(professional).length === 0
    );
}

function buildProfessionalPayload(professional: Pro) {
    return {
        first_name: normalizeText(professional.first_name),
        last_name: normalizeText(professional.last_name),
        city: normalizeText(professional.city),
        contact_display: normalizeText(professional.contact_display),
        professional_bio: normalizeText(professional.professional_bio),
        availability_text: normalizeText(professional.availability_text),
        specialties: (professional.specialties ?? [])
            .map((item) => item.trim())
            .filter(Boolean),
        verified: professional.verified,
        status: normalizeText(professional.status),
    };
}

function ProfessionalEditorSurface({
    professional,
    onChange,
    onSave,
    onRefresh,
    loading,
    saving,
}: {
    professional: Pro | null;
    onChange: (next: Pro) => void;
    onSave: () => void;
    onRefresh: () => void;
    loading: boolean;
    saving: boolean;
}) {
    if (loading && !professional) {
        return (
            <AdminEmpty
                title="Loading professional context"
                description="Pulling the selected profile, public fields, and verification snapshot."
            />
        );
    }

    if (!professional) {
        return (
            <AdminEmpty
                title="Select a professional"
                description="Choose someone from the directory to edit their public profile without losing your place in the queue."
            />
        );
    }

    const gaps = directoryGaps(professional);
    const reviewStatus =
        professional.latest_professional_verification?.review_status ??
        (professional.verified ? 'approved' : 'pending');

    return (
        <div className="space-y-4 pb-28">
            <AdminPanel
                title={professionalName(professional)}
                description="Edit the public discovery profile here, while keeping heavier credential decisions in the dedicated verification queue."
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-1 capitalize"
                        >
                            {formatRoleLabel(professional.role)}
                        </Badge>
                        <StatusChipSet
                            items={[
                                {
                                    value: professional.verified
                                        ? 'verified'
                                        : 'unverified',
                                },
                                {
                                    value: professional.status || 'pending',
                                },
                                {
                                    value: reviewStatus,
                                    label: `Review ${formatStatusLabel(reviewStatus)}`,
                                },
                            ]}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Directory readiness
                            </div>
                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                {isDirectoryReady(professional)
                                    ? 'Ready for discovery'
                                    : `${gaps.length} gap${gaps.length === 1 ? '' : 's'} to clean up`}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                Public discovery works best when city, contact,
                                availability, bio, and specialties are all
                                present.
                            </div>
                        </div>

                        <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Verification snapshot
                            </div>
                            <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                {formatStatusLabel(reviewStatus)}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                {professional.latest_professional_verification
                                    ? `${professional.latest_professional_verification.authority || 'Authority not recorded'} - expires ${formatDate(professional.latest_professional_verification.expiry_date)}.`
                                    : 'No verification record is attached to this professional yet.'}
                            </div>
                        </div>
                    </div>

                    {gaps.length > 0 ? (
                        <AdminNotice tone="warning">
                            Missing directory fields: {gaps.join(', ')}.
                        </AdminNotice>
                    ) : (
                        <AdminNotice tone="success">
                            This profile has the core discovery fields clients
                            expect.
                        </AdminNotice>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href="/admin/professional-verifications">
                                Open verification queue
                            </Link>
                        </Button>
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Public profile fields"
                description="Keep public-facing profile information clean, consistent, and useful before clients see it."
            >
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label="First name">
                            <AdminInput
                                value={professional.first_name ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...professional,
                                        first_name: event.target.value,
                                    })
                                }
                            />
                        </AdminField>

                        <AdminField label="Last name">
                            <AdminInput
                                value={professional.last_name ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...professional,
                                        last_name: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label="City or area">
                            <AdminInput
                                value={professional.city ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...professional,
                                        city: event.target.value,
                                    })
                                }
                            />
                        </AdminField>

                        <AdminField label="Contact display">
                            <AdminInput
                                value={professional.contact_display ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...professional,
                                        contact_display: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                    </div>

                    <AdminField label="Availability">
                        <AdminInput
                            value={professional.availability_text ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...professional,
                                    availability_text: event.target.value,
                                })
                            }
                        />
                    </AdminField>

                    <AdminField label="Bio">
                        <AdminTextarea
                            rows={5}
                            value={professional.professional_bio ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...professional,
                                    professional_bio: event.target.value,
                                })
                            }
                        />
                    </AdminField>

                    <AdminField
                        label="Specialties"
                        helper="Separate specialties with commas so discovery pages and assignments stay readable."
                    >
                        <AdminInput
                            value={(professional.specialties ?? []).join(', ')}
                            onChange={(event) =>
                                onChange({
                                    ...professional,
                                    specialties: event.target.value
                                        .split(',')
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                })
                            }
                            placeholder="Weight loss, sports nutrition"
                        />
                    </AdminField>

                    <AdminCheckboxField
                        checked={professional.verified}
                        onCheckedChange={(checked) =>
                            onChange({
                                ...professional,
                                verified: checked,
                                status: checked
                                    ? 'active'
                                    : 'pending_verification',
                            })
                        }
                        label="Verified profile"
                        description="This is an admin-only approval control for client-facing visibility and trust."
                    />
                </div>
            </AdminPanel>

            <AdminStickyBar
                summary={`Editing ${professionalName(professional)}`}
            >
                <Button
                    type="button"
                    variant="outline"
                    onClick={onRefresh}
                    disabled={saving}
                >
                    Refresh
                </Button>
                <Button type="button" onClick={onSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                </Button>
            </AdminStickyBar>
        </div>
    );
}

export default function AdminProfessionalsPage() {
    const [role, setRole] = useState<'trainer' | 'nutritionist'>('trainer');
    const [readiness, setReadiness] = useState<
        'all' | 'ready' | 'needs_cleanup' | 'verified'
    >('all');
    const [city, setCity] = useState('all');
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState<Pro[]>([]);
    const [selected, setSelected] = useState<Pro | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
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
                role,
                page: String(currentPage),
                per_page: '20',
            });

            if (query.trim()) {
                params.set('search', query.trim());
            }

            if (readiness !== 'all') {
                params.set('readiness', readiness);
            }

            if (city !== 'all') {
                params.set('city', city);
            }

            const res = await fetch(
                `/api/admin/professionals?${params.toString()}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!res.ok) {
                throw new Error('Could not load professionals.');
            }

            const json = (await res.json()) as ProfessionalResponse;
            const nextRows = Array.isArray(json?.data) ? json.data : [];

            setRows(nextRows);
            setCityOptions(Array.isArray(json?.cities) ? json.cities : []);
            setTotal(Number(json?.total ?? 0));
            setCurrentPage(Number(json?.current_page ?? 1));
            setLastPage(Number(json?.last_page ?? 1));
            setFrom(json?.from ?? null);
            setTo(json?.to ?? null);
            setSelected((current) =>
                current && nextRows.some((row) => row.id === current.id)
                    ? (nextRows.find((row) => row.id === current.id) ?? null)
                    : (nextRows[0] ?? null),
            );
        } catch (loadError) {
            setRows([]);
            setSelected(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load professionals.',
            );
        } finally {
            setLoading(false);
        }
    }, [city, currentPage, query, readiness, role]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setCurrentPage(1);
    }, [city, query, readiness, role]);

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return rows.filter((row) => {
            const matchesQuery =
                normalizedQuery === '' ||
                [
                    row.first_name,
                    row.last_name,
                    row.email,
                    row.city,
                    row.status,
                    row.contact_display,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);

            if (!matchesQuery) {
                return false;
            }

            if (city !== 'all' && row.city !== city) {
                return false;
            }

            if (readiness === 'ready') {
                return isDirectoryReady(row);
            }

            if (readiness === 'needs_cleanup') {
                return directoryGaps(row).length > 0;
            }

            if (readiness === 'verified') {
                return row.verified;
            }

            return true;
        });
    }, [city, query, readiness, rows]);

    useEffect(() => {
        if (filteredRows.length === 0) {
            setSelected(null);
            return;
        }

        if (!selected || !filteredRows.some((row) => row.id === selected.id)) {
            setSelected(filteredRows[0]);
        }
    }, [filteredRows, selected]);

    const summary = useMemo(
        () => ({
            verified: filteredRows.filter((row) => row.verified).length,
            ready: filteredRows.filter((row) => isDirectoryReady(row)).length,
            needsCleanup: filteredRows.filter(
                (row) => directoryGaps(row).length > 0,
            ).length,
        }),
        [filteredRows],
    );

    async function save() {
        if (!selected) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/professionals/${selected.id}`,
                jsonRequestInit('PUT', buildProfessionalPayload(selected)),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save this professional.',
                );
            }

            setSuccess('Professional profile updated.');
            await load();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save this professional.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Professionals" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Professionals"
                    description="Curate trainer and dietitian discovery profiles without turning this workspace into a full credential-review queue."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Profiles Matching Role"
                                value={loading ? '...' : String(total)}
                                tone="accent"
                                helper="Server-side count for the selected professional role."
                            />
                            <AdminStatCard
                                label="Visible On This Page"
                                value={
                                    loading
                                        ? '...'
                                        : String(filteredRows.length)
                                }
                                helper="Local search narrows the current page without losing role context."
                            />
                            <AdminStatCard
                                label="Verified"
                                value={
                                    loading ? '...' : String(summary.verified)
                                }
                                helper="Profiles already approved for client-facing trust."
                            />
                            <AdminStatCard
                                label="Directory Ready"
                                value={loading ? '...' : String(summary.ready)}
                                helper="Profiles with the core public discovery fields in place."
                            />
                            <AdminStatCard
                                label="Needs Cleanup"
                                value={
                                    loading
                                        ? '...'
                                        : String(summary.needsCleanup)
                                }
                                helper="Useful when public discovery quality starts drifting."
                            />
                        </AdminStatsGrid>

                        {error && !selected ? (
                            <AdminNotice tone="danger">{error}</AdminNotice>
                        ) : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Filter & actions toolbar"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} profiles. Review the selected profile, then filter and work through the directory list.`
                                    : 'Review the selected profile, then filter and work through the directory list.'
                            }
                        >
                            {error && selected ? (
                                <AdminNotice tone="danger">{error}</AdminNotice>
                            ) : null}

                            <AdminScrollArea
                                className="mb-4"
                                maxHeightClassName="max-h-[56vh]"
                            >
                                <ProfessionalEditorSurface
                                    professional={selected}
                                    onChange={setSelected}
                                    onSave={() => void save()}
                                    onRefresh={() => void load()}
                                    loading={loading}
                                    saving={saving}
                                />
                            </AdminScrollArea>

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
                                            placeholder="Search by name, email, city, or contact display"
                                        />
                                    </AdminField>

                                    <AdminField
                                        label="Role focus"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={role}
                                            onChange={(event) =>
                                                setRole(
                                                    event.target.value as
                                                        | 'trainer'
                                                        | 'nutritionist',
                                                )
                                            }
                                        >
                                            <option value="trainer">
                                                Trainers
                                            </option>
                                            <option value="nutritionist">
                                                Dietitians
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField
                                        label="Readiness"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={readiness}
                                            onChange={(event) =>
                                                setReadiness(
                                                    event.target.value as
                                                        | 'all'
                                                        | 'ready'
                                                        | 'needs_cleanup'
                                                        | 'verified',
                                                )
                                            }
                                        >
                                            <option value="all">All</option>
                                            <option value="ready">
                                                Directory ready
                                            </option>
                                            <option value="needs_cleanup">
                                                Needs cleanup
                                            </option>
                                            <option value="verified">
                                                Verified only
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>

                                    <AdminField
                                        label="City"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={city}
                                            onChange={(event) =>
                                                setCity(event.target.value)
                                            }
                                        >
                                            <option value="all">
                                                All cities
                                            </option>
                                            {cityOptions.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>
                                            ))}
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
                                            : 'Refresh directory'}
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>

                            <div className="mt-4 space-y-4">
                                {loading && filteredRows.length === 0 ? (
                                    <AdminEmpty
                                        title="Loading professionals"
                                        description="Pulling the current directory for the selected role."
                                    />
                                ) : (
                                    <AdminScrollArea maxHeightClassName="max-h-[72vh] xl:max-h-[68vh]">
                                        <AdminDataTable tableClassName="min-w-[980px]">
                                            <ProductTableHead>
                                                <tr>
                                                    <ProductTableHeaderCell>
                                                        Professional
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Public contact
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Profile content
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Directory readiness
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Verification
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell className="w-36">
                                                        Actions
                                                    </ProductTableHeaderCell>
                                                </tr>
                                            </ProductTableHead>
                                            <ProductTableBody>
                                                {filteredRows.map((row) => {
                                                    const gaps =
                                                        directoryGaps(row);

                                                    return (
                                                        <ProductTableRow
                                                            key={row.id}
                                                            interactive
                                                            className={
                                                                row.id ===
                                                                selected?.id
                                                                    ? 'bg-primary/5'
                                                                    : undefined
                                                            }
                                                        >
                                                            <ProductTableCell>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelected(
                                                                            row,
                                                                        )
                                                                    }
                                                                    className="w-full space-y-2 text-left"
                                                                >
                                                                    <div className="font-medium break-words text-foreground">
                                                                        {professionalName(
                                                                            row,
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm [overflow-wrap:anywhere] break-words text-muted-foreground">
                                                                        {
                                                                            row.email
                                                                        }
                                                                    </div>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="rounded-full px-2.5 py-1 capitalize"
                                                                    >
                                                                        {formatRoleLabel(
                                                                            row.role,
                                                                        )}
                                                                    </Badge>
                                                                </button>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="space-y-1">
                                                                    <div className="font-medium break-words text-foreground">
                                                                        {row.city ||
                                                                            'City not set'}
                                                                    </div>
                                                                    <div className="text-xs [overflow-wrap:anywhere] break-words text-muted-foreground">
                                                                        {row.contact_display ||
                                                                            'Contact display missing'}
                                                                    </div>
                                                                    <div className="text-xs [overflow-wrap:anywhere] break-words text-muted-foreground">
                                                                        {row.availability_text ||
                                                                            'Availability missing'}
                                                                    </div>
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="space-y-2">
                                                                    <div className="line-clamp-2 text-sm text-foreground">
                                                                        {row.professional_bio ||
                                                                            'Bio missing'}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(
                                                                            row.specialties ??
                                                                            []
                                                                        )
                                                                            .slice(
                                                                                0,
                                                                                3,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    specialty,
                                                                                ) => (
                                                                                    <Badge
                                                                                        key={
                                                                                            specialty
                                                                                        }
                                                                                        variant="secondary"
                                                                                        className="rounded-full px-2 py-0.5 text-[11px]"
                                                                                    >
                                                                                        {
                                                                                            specialty
                                                                                        }
                                                                                    </Badge>
                                                                                ),
                                                                            )}
                                                                        {(
                                                                            row.specialties ??
                                                                            []
                                                                        )
                                                                            .length ===
                                                                        0 ? (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Specialties
                                                                                missing
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="space-y-2">
                                                                    <StatusChipSet
                                                                        items={[
                                                                            {
                                                                                value: isDirectoryReady(
                                                                                    row,
                                                                                )
                                                                                    ? 'ready'
                                                                                    : 'needs_cleanup',
                                                                                label: isDirectoryReady(
                                                                                    row,
                                                                                )
                                                                                    ? 'Ready'
                                                                                    : 'Needs cleanup',
                                                                            },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {gaps.length ===
                                                                        0
                                                                            ? 'Core public fields are complete.'
                                                                            : `Missing ${gaps.join(', ')}.`}
                                                                    </div>
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <div className="space-y-2">
                                                                    <StatusChipSet
                                                                        items={[
                                                                            {
                                                                                value: row.verified
                                                                                    ? 'verified'
                                                                                    : 'unverified',
                                                                            },
                                                                            {
                                                                                value:
                                                                                    row
                                                                                        .latest_professional_verification
                                                                                        ?.review_status ||
                                                                                    'pending',
                                                                                label: `Review ${formatStatusLabel(
                                                                                    row
                                                                                        .latest_professional_verification
                                                                                        ?.review_status ||
                                                                                        'pending',
                                                                                )}`,
                                                                            },
                                                                        ]}
                                                                    />
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {row
                                                                            .latest_professional_verification
                                                                            ?.authority ||
                                                                            'No verification authority recorded'}
                                                                    </div>
                                                                </div>
                                                            </ProductTableCell>
                                                            <ProductTableCell>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelected(
                                                                            row,
                                                                        );
                                                                        setDrawerOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                >
                                                                    Edit
                                                                </Button>
                                                            </ProductTableCell>
                                                        </ProductTableRow>
                                                    );
                                                })}

                                                {!loading &&
                                                filteredRows.length === 0 ? (
                                                    <ProductTableEmptyRow
                                                        colSpan={6}
                                                        title="No professionals found"
                                                        description="Switch roles, adjust search, or return once new professional profiles exist."
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
                                            ? `Showing ${from}-${to} of ${total} profiles`
                                            : 'Pagination stays aligned with the active role focus.'
                                    }
                                    onPrevious={() =>
                                        setCurrentPage((page) =>
                                            Math.max(1, page - 1),
                                        )
                                    }
                                    onNext={() =>
                                        setCurrentPage((page) =>
                                            Math.min(lastPage, page + 1),
                                        )
                                    }
                                />
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={
                    selected
                        ? professionalName(selected)
                        : 'Professional editor'
                }
                description="Mobile editing surface for public professional profile details."
            >
                <ProfessionalEditorSurface
                    professional={selected}
                    onChange={setSelected}
                    onSave={() => void save()}
                    onRefresh={() => void load()}
                    loading={loading}
                    saving={saving}
                />
            </EntityDetailDrawer>
        </>
    );
}
