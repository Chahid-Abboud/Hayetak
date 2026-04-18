import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import NearbyMap from '@/components/NearbyMap';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Place = {
    id: number | null;
    name: string;
    category?: string | null;
    city?: string | null;
    lat: string;
    lng: string;
};

const EMPTY_PLACE: Place = {
    id: null,
    name: '',
    category: '',
    city: '',
    lat: '',
    lng: '',
};

export default function AdminPlacesPage() {
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState<Place[]>([]);
    const [selected, setSelected] = useState<Place | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/admin/places-local?q=${encodeURIComponent(query)}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!res.ok) {
                throw new Error('Could not load places.');
            }

            const json = await res.json();
            const nextRows = Array.isArray(json?.data) ? json.data : [];
            setRows(nextRows);
            setSelected((current) =>
                current && current.id === null
                    ? current
                    : current &&
                        nextRows.some((row: Place) => row.id === current.id)
                      ? (nextRows.find((row: Place) => row.id === current.id) ??
                        null)
                      : (nextRows[0] ?? null),
            );
        } catch (loadError) {
            setRows([]);
            setSelected(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load places.',
            );
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        void load();
    }, [load]);

    const filledCoordinates = useMemo(
        () => rows.filter((row) => row.lat && row.lng).length,
        [rows],
    );

    const hasMapToken =
        typeof window !== 'undefined' &&
        Boolean(
            window.MAPBOX_TOKEN ||
                document
                    .querySelector('meta[name="mapbox-token"]')
                    ?.getAttribute('content'),
        );

    const mapCenter = useMemo(() => {
        const candidate = selected ?? rows[0] ?? null;
        const lat = Number(candidate?.lat);
        const lng = Number(candidate?.lng);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lon: lng };
        }

        return { lat: 33.8938, lon: 35.5018 };
    }, [rows, selected]);

    async function save() {
        if (!selected) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        const payload = {
            name: selected.name,
            category: selected.category || null,
            city: selected.city || null,
            lat: Number(selected.lat),
            lng: Number(selected.lng),
        };

        try {
            const response = await fetch(
                selected.id === null
                    ? '/api/admin/places-local'
                    : `/api/admin/places-local/${selected.id}`,
                jsonRequestInit(selected.id === null ? 'POST' : 'PUT', payload),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save this place.',
                );
            }

            setSuccess(
                selected.id === null
                    ? 'Place created successfully.'
                    : 'Place updated successfully.',
            );
            await load();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save this place.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!selected?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/places-local/${selected.id}`,
                jsonRequestInit('DELETE'),
            );

            if (!response.ok) {
                throw new Error('Could not delete this place.');
            }

            setSuccess('Place removed.');
            await load();
        } catch (removeError) {
            setError(
                removeError instanceof Error
                    ? removeError.message
                    : 'Could not delete this place.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Places" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Places"
                    description="Manage local places used by discovery flows so trainers, dietitians, and locations all feel curated instead of forgotten."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Search places"
                                className="h-10 w-56 rounded-full"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void load()}
                                disabled={loading}
                            >
                                <RefreshCcw className="h-4 w-4" />
                                {loading ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    setSelected({ ...EMPTY_PLACE });
                                    setSuccess(null);
                                    setError(null);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Add place
                            </Button>
                            <div className="inline-flex rounded-full border border-border/70 bg-background p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                                        viewMode === 'list'
                                            ? 'bg-primary/10 text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('map')}
                                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                                        viewMode === 'map'
                                            ? 'bg-primary/10 text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Map
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible places"
                                value={loading ? '...' : String(rows.length)}
                                tone="accent"
                                helper="Current search applied."
                            />
                            <AdminStatCard
                                label="With coordinates"
                                value={
                                    loading ? '...' : String(filledCoordinates)
                                }
                                helper="Ready for map-driven discovery."
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

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                            <AdminSection
                                title="Saved places"
                                description="Select a place to edit its basic discovery details."
                            >
                                {loading ? (
                                    <ProductEmptyState
                                        title="Loading places"
                                        description="Fetching the current discovery catalog."
                                    />
                                ) : viewMode === 'map' ? (
                                    hasMapToken ? (
                                        <div className="space-y-4">
                                            <NearbyMap
                                                initialCenter={mapCenter}
                                                initialZoom={11}
                                                radiusKm={8}
                                                showGym
                                                showNutritionist
                                                focusPlaceId={
                                                    selected?.id ?? undefined
                                                }
                                                onToggleGym={() => {}}
                                                onToggleNutritionist={() => {}}
                                                onResults={() => {}}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Map view is for spatial review.
                                                Use list view for exact edits
                                                and selection.
                                            </p>
                                        </div>
                                    ) : (
                                        <ProductEmptyState
                                            title="Map token required"
                                            description="Set VITE_MAPBOX_TOKEN (or mapbox-token meta) to enable map moderation."
                                        />
                                    )
                                ) : (
                                    <ProductTable>
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    Name
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Category
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Location
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {rows.map((row) => (
                                                <ProductTableRow
                                                    key={row.id ?? row.name}
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
                                                            className="w-full text-left font-medium"
                                                        >
                                                            {row.name}
                                                        </button>
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {row.category ||
                                                            'Uncategorized'}
                                                    </ProductTableCell>
                                                    <ProductTableCell className="text-sm text-muted-foreground">
                                                        {row.city || 'No city'}{' '}
                                                        | {row.lat}, {row.lng}
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}
                                            {rows.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={3}
                                                    title="No places found"
                                                    description="Try another search or create a new place for the discovery map."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </ProductTable>
                                )}
                            </AdminSection>

                            <AdminSection
                                title={
                                    selected?.id === null
                                        ? 'Create place'
                                        : 'Edit place'
                                }
                                description="Keep the fields small, accurate, and map-friendly."
                            >
                                {!selected ? (
                                    <ProductEmptyState
                                        title="Select or create a place"
                                        description="Choose a row from the list or start a new place entry."
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <Field
                                            label="Name"
                                            value={selected.name}
                                            onChange={(value) =>
                                                setSelected({
                                                    ...selected,
                                                    name: value,
                                                })
                                            }
                                        />
                                        <Field
                                            label="Category"
                                            value={selected.category ?? ''}
                                            onChange={(value) =>
                                                setSelected({
                                                    ...selected,
                                                    category: value,
                                                })
                                            }
                                        />
                                        <Field
                                            label="City"
                                            value={selected.city ?? ''}
                                            onChange={(value) =>
                                                setSelected({
                                                    ...selected,
                                                    city: value,
                                                })
                                            }
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <Field
                                                label="Latitude"
                                                value={selected.lat}
                                                onChange={(value) =>
                                                    setSelected({
                                                        ...selected,
                                                        lat: value,
                                                    })
                                                }
                                            />
                                            <Field
                                                label="Longitude"
                                                value={selected.lng}
                                                onChange={(value) =>
                                                    setSelected({
                                                        ...selected,
                                                        lng: value,
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                type="button"
                                                onClick={() => void save()}
                                                disabled={
                                                    saving || !selected.name
                                                }
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </Button>
                                            {selected.id ? (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        void remove()
                                                    }
                                                    disabled={saving}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </div>
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

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="space-y-2">
            <Label>{label}</Label>
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}
