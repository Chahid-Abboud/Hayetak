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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/professionals?role=${role}`, {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Could not load professionals.');
            }

            const json = await res.json();
            const nextRows = Array.isArray(json?.data) ? json.data : [];
            setRows(nextRows);
            setSelected((current) =>
                current && nextRows.some((row: Pro) => row.id === current.id)
                    ? (nextRows.find((row: Pro) => row.id === current.id) ??
                      null)
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
    }, [role]);

    useEffect(() => {
        void load();
    }, [load]);

    async function save() {
        if (!selected) return;
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/professionals/${selected.id}`,
                jsonRequestInit('PUT', selected),
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

    const summary = useMemo(
        () => ({
            verified: rows.filter((row) => row.verified).length,
            withCity: rows.filter((row) => row.city).length,
            withAvailability: rows.filter((row) => row.availability_text)
                .length,
        }),
        [rows],
    );

    return (
        <>
            <Head title="Admin Professionals" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Professionals"
                    description="Review trainer and nutritionist profiles, tidy their public information, and keep verification state aligned with what clients can see."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={role}
                                onChange={(event) =>
                                    setRole(
                                        event.target.value as
                                            | 'trainer'
                                            | 'nutritionist',
                                    )
                                }
                                className="flex h-10 rounded-full border border-input bg-background px-4 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="trainer">Trainers</option>
                                <option value="nutritionist">Dietitians</option>
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
                                label="Visible profiles"
                                value={loading ? '...' : String(rows.length)}
                                tone="accent"
                                helper="Current role filter applied."
                            />
                            <AdminStatCard
                                label="Verified"
                                value={
                                    loading ? '...' : String(summary.verified)
                                }
                                helper="Profiles already approved for client actions."
                            />
                            <AdminStatCard
                                label="With city"
                                value={
                                    loading ? '...' : String(summary.withCity)
                                }
                                helper="Helpful for map and discovery pages."
                            />
                            <AdminStatCard
                                label="With availability"
                                value={
                                    loading
                                        ? '...'
                                        : String(summary.withAvailability)
                                }
                                helper="Profiles that already explain scheduling."
                            />
                        </AdminStatsGrid>

                        {error ? (
                            <ProductBanner tone="danger">{error}</ProductBanner>
                        ) : null}
                        {success ? (
                            <ProductBanner tone="success">
                                {success}
                            </ProductBanner>
                        ) : null}

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                            <AdminSection
                                title="Professional directory"
                                description="Select a profile to review it in the editor panel."
                            >
                                {loading ? (
                                    <ProductEmptyState
                                        title="Loading professionals"
                                        description="Pulling the current list for the selected role."
                                    />
                                ) : (
                                    <ProductTable>
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    Professional
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    City
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Status
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {rows.map((row) => (
                                                <ProductTableRow
                                                    key={row.id}
                                                    interactive
                                                    className={
                                                        row.id === selected?.id
                                                            ? 'bg-primary/5'
                                                            : undefined
                                                    }
                                                >
                                                    <ProductTableCell>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelected({
                                                                    ...row,
                                                                })
                                                            }
                                                            className="w-full space-y-2 text-left"
                                                        >
                                                            <div className="font-medium text-foreground">
                                                                {[
                                                                    row.first_name,
                                                                    row.last_name,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' ',
                                                                    ) ||
                                                                    row.email}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {row.email}
                                                            </div>
                                                            <Badge
                                                                variant="outline"
                                                                className="rounded-full px-2.5 py-1 capitalize"
                                                            >
                                                                {row.role ===
                                                                'nutritionist'
                                                                    ? 'Dietitian'
                                                                    : 'Trainer'}
                                                            </Badge>
                                                        </button>
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {row.city || 'Not set'}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <Badge
                                                            variant={
                                                                row.verified
                                                                    ? 'default'
                                                                    : 'outline'
                                                            }
                                                            className="rounded-full px-2.5 py-1 capitalize"
                                                        >
                                                            {row.verified
                                                                ? 'Verified'
                                                                : row.status ||
                                                                  'pending'}
                                                        </Badge>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}
                                            {rows.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={3}
                                                    title="No professionals found"
                                                    description="Switch roles or return once new professional profiles exist."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </ProductTable>
                                )}
                            </AdminSection>

                            <AdminSection
                                title="Profile editor"
                                description="Update the fields clients rely on when deciding who to contact."
                            >
                                {!selected ? (
                                    <ProductEmptyState
                                        title="Select a professional"
                                        description="Choose someone from the directory to edit their profile."
                                    />
                                ) : (
                                    <div className="space-y-4 text-sm">
                                        <label className="space-y-2">
                                            <Label>First name</Label>
                                            <Input
                                                value={
                                                    selected.first_name ?? ''
                                                }
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        first_name:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="space-y-2">
                                            <Label>Last name</Label>
                                            <Input
                                                value={selected.last_name ?? ''}
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        last_name:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="space-y-2">
                                            <Label>City or area</Label>
                                            <Input
                                                value={selected.city ?? ''}
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        city: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="space-y-2">
                                            <Label>Contact display</Label>
                                            <Input
                                                value={
                                                    selected.contact_display ??
                                                    ''
                                                }
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        contact_display:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="space-y-2">
                                            <Label>Availability</Label>
                                            <Input
                                                value={
                                                    selected.availability_text ??
                                                    ''
                                                }
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        availability_text:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="space-y-2">
                                            <Label>Bio</Label>
                                            <Textarea
                                                rows={4}
                                                value={
                                                    selected.professional_bio ??
                                                    ''
                                                }
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        professional_bio:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="space-y-2">
                                            <Label>Specialties</Label>
                                            <Input
                                                value={(
                                                    selected.specialties ?? []
                                                ).join(', ')}
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        specialties:
                                                            event.target.value
                                                                .split(',')
                                                                .map((item) =>
                                                                    item.trim(),
                                                                )
                                                                .filter(
                                                                    Boolean,
                                                                ),
                                                    })
                                                }
                                                placeholder="Weight loss, sports nutrition"
                                            />
                                        </label>
                                        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.verified}
                                                onChange={(event) =>
                                                    setSelected({
                                                        ...selected,
                                                        verified:
                                                            event.target
                                                                .checked,
                                                        status: event.target
                                                            .checked
                                                            ? 'active'
                                                            : 'pending_verification',
                                                    })
                                                }
                                                className="h-4 w-4 rounded border-input"
                                            />
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    Verified profile
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Allow client-facing
                                                    interactions when approved.
                                                </div>
                                            </div>
                                        </label>
                                        <Button
                                            type="button"
                                            onClick={() => void save()}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                )}
                            </AdminSection>
                        </div>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
