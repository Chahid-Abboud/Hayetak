import {
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
    AdminToggleGroup,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    ConfirmActionDialogWithReason,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import NearbyMap from '@/components/NearbyMap';
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
    EyeOff,
    MapPinCheck,
    Pencil,
    Plus,
    RefreshCcw,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Place = {
    id: number | null;
    user_id?: number | null;
    name: string;
    category?: string | null;
    address?: string | null;
    city?: string | null;
    lat: string | number;
    lng: string | number;
    description?: string | null;
    google_maps_link?: string | null;
    google_place_id?: string | null;
    last_verified_at?: string | null;
    visibility?: 'visible' | 'hidden';
    recommendation_quality?: 'ready' | 'needs_review' | 'poor';
    quality_warnings?: string[];
    source?: string;
    coordinates_validated?: boolean;
    meta?: Record<string, unknown>;
};

type PlacesResponse = {
    data?: Place[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    stats?: {
        total: number;
        visible: number;
        hidden: number;
        needs_review: number;
        validated_coordinates: number;
    };
    filters?: {
        categories?: string[];
        cities?: string[];
    };
};

const EMPTY_PLACE: Place = {
    id: null,
    name: '',
    category: 'gym',
    address: '',
    city: '',
    lat: '',
    lng: '',
    description: '',
    google_maps_link: '',
    google_place_id: '',
    visibility: 'visible',
    recommendation_quality: 'needs_review',
    quality_warnings: [],
    source: 'local_curated',
    coordinates_validated: false,
    meta: { source: 'local_curated', visibility: 'visible' },
};

function formatDate(value?: string | null) {
    if (!value) return 'Not verified';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function qualityLabel(value?: string | null) {
    if (value === 'ready') return 'Ready';
    if (value === 'poor') return 'Poor';
    return 'Needs review';
}

function buildPayload(place: Place) {
    return {
        name: place.name.trim(),
        category: place.category?.trim() || null,
        address: place.address?.trim() || null,
        city: place.city?.trim() || null,
        lat: Number(place.lat),
        lng: Number(place.lng),
        description: place.description?.trim() || null,
        google_maps_link: place.google_maps_link?.trim() || null,
        google_place_id: place.google_place_id?.trim() || null,
        meta: {
            ...(place.meta ?? {}),
            source: place.source || 'local_curated',
            visibility: place.visibility || 'visible',
        },
    };
}

function PlaceEditor({
    place,
    saving,
    onChange,
    onSave,
    onHide,
    onDelete,
    onValidateCoordinates,
}: {
    place: Place | null;
    saving: boolean;
    onChange: (place: Place) => void;
    onSave: () => void;
    onHide: () => void;
    onDelete: () => void;
    onValidateCoordinates: () => void;
}) {
    if (!place) {
        return (
            <AdminEmpty
                title="Select a place"
                description="Choose a location from the list to review quality, source, coordinates, and visibility."
            />
        );
    }

    return (
        <div className="space-y-4">
            <AdminPanel
                title={place.id ? place.name : 'Create place'}
                description="Curated support locations power discovery and AI place recommendations. Keep public-facing fields readable."
            >
                <div className="space-y-4">
                    <StatusChipSet
                        items={[
                            {
                                value: place.visibility ?? 'visible',
                                label:
                                    place.visibility === 'hidden'
                                        ? 'Hidden'
                                        : 'Visible',
                            },
                            {
                                value:
                                    place.recommendation_quality ??
                                    'needs_review',
                                label: qualityLabel(
                                    place.recommendation_quality,
                                ),
                            },
                            {
                                value: place.coordinates_validated
                                    ? 'verified'
                                    : 'needs_review',
                                label: place.coordinates_validated
                                    ? 'Coordinates validated'
                                    : 'Coordinates need check',
                            },
                        ]}
                    />
                    {(place.quality_warnings ?? []).length > 0 ? (
                        <AdminNotice tone="warning">
                            Quality warnings:{' '}
                            {(place.quality_warnings ?? []).join(', ')}.
                        </AdminNotice>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Name">
                            <AdminInput
                                value={place.name}
                                onChange={(event) =>
                                    onChange({
                                        ...place,
                                        name: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                        <AdminField label="Category">
                            <AdminNativeSelect
                                value={place.category ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...place,
                                        category: event.target.value,
                                    })
                                }
                            >
                                <option value="">Choose category</option>
                                <option value="gym">Gym</option>
                                <option value="clinic">Clinic</option>
                                <option value="nutritionist">
                                    Nutritionist
                                </option>
                                <option value="dietitian">Dietitian</option>
                                <option value="support">Support</option>
                                <option value="other">Other</option>
                            </AdminNativeSelect>
                        </AdminField>
                        <AdminField label="City">
                            <AdminInput
                                value={place.city ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...place,
                                        city: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                        <AdminField label="Source">
                            <AdminNativeSelect
                                value={place.source ?? 'local_curated'}
                                onChange={(event) =>
                                    onChange({
                                        ...place,
                                        source: event.target.value,
                                    })
                                }
                            >
                                <option value="local_curated">
                                    Local curated
                                </option>
                                <option value="google_places">
                                    Google Places
                                </option>
                                <option value="admin_import">
                                    Admin import
                                </option>
                                <option value="professional_profile">
                                    Professional profile
                                </option>
                            </AdminNativeSelect>
                        </AdminField>
                    </div>
                    <AdminField label="Address">
                        <AdminTextarea
                            rows={3}
                            value={place.address ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...place,
                                    address: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Coordinates"
                description="Validate coordinates after confirming the location on the optional map tab."
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Latitude">
                        <AdminInput
                            type="number"
                            value={String(place.lat ?? '')}
                            onChange={(event) =>
                                onChange({ ...place, lat: event.target.value })
                            }
                        />
                    </AdminField>
                    <AdminField label="Longitude">
                        <AdminInput
                            type="number"
                            value={String(place.lng ?? '')}
                            onChange={(event) =>
                                onChange({ ...place, lng: event.target.value })
                            }
                        />
                    </AdminField>
                </div>
                <div className="dashboard-surface-soft mt-4 rounded-[20px] px-4 py-3 text-sm text-muted-foreground">
                    Last verified: {formatDate(place.last_verified_at)}
                </div>
            </AdminPanel>

            <AdminPanel
                title="Recommendation detail"
                description="Summaries only. Raw source payloads stay out of normal admin review."
            >
                <div className="space-y-4">
                    <AdminField label="Description">
                        <AdminTextarea
                            rows={5}
                            value={place.description ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...place,
                                    description: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Google Maps link">
                            <AdminInput
                                value={place.google_maps_link ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...place,
                                        google_maps_link: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                        <AdminField label="Google Place ID">
                            <AdminInput
                                value={place.google_place_id ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...place,
                                        google_place_id: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                    </div>
                </div>
            </AdminPanel>

            <AdminStickyBar
                summary={
                    place.id
                        ? `Editing place #${place.id}`
                        : 'Creating curated place'
                }
            >
                <Button
                    type="button"
                    onClick={onSave}
                    disabled={
                        saving ||
                        place.name.trim() === '' ||
                        !Number.isFinite(Number(place.lat)) ||
                        !Number.isFinite(Number(place.lng))
                    }
                >
                    <Pencil className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                </Button>
                {place.id ? (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onValidateCoordinates}
                            disabled={saving}
                        >
                            <MapPinCheck className="h-4 w-4" />
                            Validate coordinates
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onHide}
                            disabled={saving}
                        >
                            <EyeOff className="h-4 w-4" />
                            Hide
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                            disabled={saving}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </>
                ) : null}
            </AdminStickyBar>
        </div>
    );
}

export default function AdminPlacesPage() {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [city, setCity] = useState('all');
    const [visibility, setVisibility] = useState('all');
    const [quality, setQuality] = useState('all');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [rows, setRows] = useState<Place[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [selected, setSelected] = useState<Place | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [hideOpen, setHideOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [validateOpen, setValidateOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        visible: 0,
        hidden: 0,
        needs_review: 0,
        validated_coordinates: 0,
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: '25',
            });

            if (query.trim()) params.set('q', query.trim());
            if (category !== 'all') params.set('category', category);
            if (city !== 'all') params.set('city', city);
            if (visibility !== 'all') params.set('visibility', visibility);
            if (quality !== 'all') params.set('quality', quality);

            const response = await fetch(
                `/api/admin/places-local?${params.toString()}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Could not load places.');
            }

            const json = (await response.json()) as PlacesResponse;
            const nextRows = Array.isArray(json.data) ? json.data : [];

            setRows(nextRows);
            setCategories(
                Array.isArray(json.filters?.categories)
                    ? json.filters.categories
                    : [],
            );
            setCities(
                Array.isArray(json.filters?.cities) ? json.filters.cities : [],
            );
            setStats({
                total: Number(json.stats?.total ?? 0),
                visible: Number(json.stats?.visible ?? 0),
                hidden: Number(json.stats?.hidden ?? 0),
                needs_review: Number(json.stats?.needs_review ?? 0),
                validated_coordinates: Number(
                    json.stats?.validated_coordinates ?? 0,
                ),
            });
            setTotal(Number(json.total ?? 0));
            setCurrentPage(Number(json.current_page ?? 1));
            setLastPage(Number(json.last_page ?? 1));
            setFrom(json.from ?? null);
            setTo(json.to ?? null);
            setSelected((current) => {
                if (current?.id === null) return current;
                if (!current) return nextRows[0] ?? null;

                return (
                    nextRows.find((row) => row.id === current.id) ??
                    nextRows[0] ??
                    null
                );
            });
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
    }, [category, city, currentPage, quality, query, visibility]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setCurrentPage(1);
    }, [category, city, quality, query, visibility]);

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

    const placesToolbar = (
        <AdminToolbar>
            <AdminToolbarGroup grow>
                <AdminField
                    label="Search"
                    className="sm:min-w-[18rem] xl:flex-1"
                >
                    <AdminSearchInput
                        value={query}
                        placeholder="Search name, category, city, address"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </AdminField>
                <AdminField label="Category" className="sm:w-44">
                    <AdminNativeSelect
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                    >
                        <option value="all">All</option>
                        {categories.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </AdminNativeSelect>
                </AdminField>
                <AdminField label="City" className="sm:w-44">
                    <AdminNativeSelect
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                    >
                        <option value="all">All cities</option>
                        {cities.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </AdminNativeSelect>
                </AdminField>
                <AdminField label="Visibility" className="sm:w-40">
                    <AdminNativeSelect
                        value={visibility}
                        onChange={(event) => setVisibility(event.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                    </AdminNativeSelect>
                </AdminField>
                <AdminField label="Quality" className="sm:w-44">
                    <AdminNativeSelect
                        value={quality}
                        onChange={(event) => setQuality(event.target.value)}
                    >
                        <option value="all">All quality</option>
                        <option value="ready">Ready</option>
                        <option value="needs_review">Needs review</option>
                        <option value="poor">Poor</option>
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
                    Refresh
                </Button>
                <Button
                    type="button"
                    onClick={() => setSelected({ ...EMPTY_PLACE })}
                >
                    <Plus className="h-4 w-4" />
                    Create
                </Button>
                <AdminToggleGroup
                    value={viewMode}
                    onChange={(value) => setViewMode(value as 'list' | 'map')}
                    options={[
                        { value: 'list', label: 'List' },
                        { value: 'map', label: 'Map' },
                    ]}
                    className="w-full sm:w-[172px]"
                />
            </AdminToolbarGroup>
        </AdminToolbar>
    );

    async function save() {
        if (!selected) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                selected.id === null
                    ? '/api/admin/places-local'
                    : `/api/admin/places-local/${selected.id}`,
                jsonRequestInit(
                    selected.id === null ? 'POST' : 'PUT',
                    buildPayload(selected),
                ),
            );

            if (!response.ok) {
                const json = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(json?.message || 'Could not save this place.');
            }

            setSuccess(
                selected.id === null ? 'Place created.' : 'Place updated.',
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

    async function runAction(
        action: 'hide' | 'delete' | 'validate',
        reason: string,
    ) {
        if (!selected?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        const url =
            action === 'hide'
                ? `/api/admin/places-local/${selected.id}/hide`
                : action === 'validate'
                  ? `/api/admin/places-local/${selected.id}/validate-coordinates`
                  : `/api/admin/places-local/${selected.id}`;

        const method =
            action === 'hide'
                ? 'PATCH'
                : action === 'validate'
                  ? 'POST'
                  : 'DELETE';

        try {
            const response = await fetch(
                url,
                jsonRequestInit(method, { reason }),
            );

            if (!response.ok) {
                throw new Error(`Could not ${action} this place.`);
            }

            setHideOpen(false);
            setDeleteOpen(false);
            setValidateOpen(false);
            setSuccess(
                action === 'hide'
                    ? 'Place hidden.'
                    : action === 'validate'
                      ? 'Coordinates validated.'
                      : 'Place deleted.',
            );
            await load();
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : `Could not ${action} this place.`,
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
                    description="Curate local gyms, clinics, nutritionists, and support locations used by discovery and AI recommendation flows."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Places"
                                value={loading ? '...' : String(stats.total)}
                                tone="accent"
                                helper="Total curated locations."
                            />
                            <AdminStatCard
                                label="Visible"
                                value={loading ? '...' : String(stats.visible)}
                                helper="Available to discovery flows."
                            />
                            <AdminStatCard
                                label="Needs review"
                                value={
                                    loading ? '...' : String(stats.needs_review)
                                }
                                helper="Missing quality or coordinate signals."
                            />
                            <AdminStatCard
                                label="Validated"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.validated_coordinates)
                                }
                                helper="Coordinate placement checked."
                            />
                            <AdminStatCard
                                label="Hidden"
                                value={loading ? '...' : String(stats.hidden)}
                                helper="Kept out of recommendations."
                            />
                        </AdminStatsGrid>

                        {error ? (
                            <AdminNotice tone="danger">{error}</AdminNotice>
                        ) : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Place Quality Guidance"
                            description="List mode is the primary admin workspace. Use map review only when checking coordinate placement."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminPanel
                                    title="Recommendation quality"
                                    description="Ready places need category, city, address, usable coordinates, and enough description to be helpful."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Poor or hidden places should not appear
                                        in AI support-location suggestions.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Source clarity"
                                    description="Track whether each place came from local curation, Google Places, an import, or a professional profile."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Source is stored as a compact summary
                                        flag instead of showing raw external
                                        payloads inline.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Diagnostics"
                                    description="Audit details live in logs; this page shows readable quality and action summaries."
                                >
                                    <Button
                                        asChild
                                        type="button"
                                        variant="outline"
                                    >
                                        <Link href="/admin/logs">
                                            Open audit logs
                                        </Link>
                                    </Button>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        {viewMode === 'map' ? (
                            <AdminSection
                                title="Map Review"
                                description="Map mode is separate from the table so coordinate review has enough room."
                            >
                                <div className="mb-4">{placesToolbar}</div>
                                {hasMapToken ? (
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
                                        <AdminNotice tone="info">
                                            Use map mode to verify placement,
                                            then return to list mode to make
                                            structured edits.
                                        </AdminNotice>
                                    </div>
                                ) : (
                                    <AdminEmpty
                                        title="Map token required"
                                        description="Set VITE_MAPBOX_TOKEN or provide a mapbox-token meta tag to enable spatial review."
                                    />
                                )}
                            </AdminSection>
                        ) : (
                            <AdminSection
                                title="List / Detail Workspace"
                                description="List mode is the main admin mode for place quality, visibility, source, and coordinate actions."
                            >
                                <div className="space-y-4">
                                    <AdminScrollArea maxHeightClassName="max-h-[54vh]">
                                        <PlaceEditor
                                            place={selected}
                                            saving={saving}
                                            onChange={setSelected}
                                            onSave={() => void save()}
                                            onHide={() => setHideOpen(true)}
                                            onDelete={() => setDeleteOpen(true)}
                                            onValidateCoordinates={() =>
                                                setValidateOpen(true)
                                            }
                                        />
                                    </AdminScrollArea>

                                    {placesToolbar}

                                    <div className="space-y-4">
                                        {loading && rows.length === 0 ? (
                                            <AdminEmpty
                                                title="Loading places"
                                                description="Fetching curated locations and recommendation quality summaries."
                                            />
                                        ) : (
                                            <AdminScrollArea maxHeightClassName="max-h-[68vh]">
                                                <AdminDataTable tableClassName="min-w-[1120px]">
                                                    <ProductTableHead>
                                                        <tr>
                                                            <ProductTableHeaderCell>
                                                                Name
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Category
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                City / address
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Coordinates
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Visibility
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Quality
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell>
                                                                Source
                                                            </ProductTableHeaderCell>
                                                            <ProductTableHeaderCell className="w-32">
                                                                Actions
                                                            </ProductTableHeaderCell>
                                                        </tr>
                                                    </ProductTableHead>
                                                    <ProductTableBody>
                                                        {rows.map((row) => (
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
                                                                        className="w-full text-left"
                                                                        onClick={() =>
                                                                            setSelected(
                                                                                {
                                                                                    ...row,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <div className="font-medium text-foreground">
                                                                            {
                                                                                row.name
                                                                            }
                                                                        </div>
                                                                        <div className="line-clamp-1 text-xs text-muted-foreground">
                                                                            {row.description ||
                                                                                'No description'}
                                                                        </div>
                                                                    </button>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    {row.category ||
                                                                        'Uncategorized'}
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="font-medium text-foreground">
                                                                        {row.city ||
                                                                            'No city'}
                                                                    </div>
                                                                    <div className="line-clamp-1 max-w-56 text-xs text-muted-foreground">
                                                                        {row.address ||
                                                                            'No address'}
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="text-sm text-foreground">
                                                                        {
                                                                            row.lat
                                                                        }
                                                                        ,{' '}
                                                                        {
                                                                            row.lng
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {row.coordinates_validated
                                                                            ? 'Validated'
                                                                            : 'Needs check'}
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <StatusChipSet
                                                                        items={[
                                                                            {
                                                                                value:
                                                                                    row.visibility ??
                                                                                    'visible',
                                                                                label:
                                                                                    row.visibility ===
                                                                                    'hidden'
                                                                                        ? 'Hidden'
                                                                                        : 'Visible',
                                                                            },
                                                                        ]}
                                                                    />
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="space-y-1">
                                                                        <StatusChipSet
                                                                            items={[
                                                                                {
                                                                                    value:
                                                                                        row.recommendation_quality ??
                                                                                        'needs_review',
                                                                                    label: qualityLabel(
                                                                                        row.recommendation_quality,
                                                                                    ),
                                                                                },
                                                                            ]}
                                                                        />
                                                                        <div className="line-clamp-1 max-w-52 text-xs text-muted-foreground">
                                                                            {(
                                                                                row.quality_warnings ??
                                                                                []
                                                                            )
                                                                                .slice(
                                                                                    0,
                                                                                    2,
                                                                                )
                                                                                .join(
                                                                                    ', ',
                                                                                ) ||
                                                                                'No warnings'}
                                                                        </div>
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <Badge variant="outline">
                                                                        {row.source ||
                                                                            'local_curated'}
                                                                    </Badge>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            setSelected(
                                                                                {
                                                                                    ...row,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                </ProductTableCell>
                                                            </ProductTableRow>
                                                        ))}
                                                        {!loading &&
                                                        rows.length === 0 ? (
                                                            <ProductTableEmptyRow
                                                                colSpan={8}
                                                                title="No places found"
                                                                description="Adjust filters or create a curated support location."
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
                                                    ? `Showing ${from}-${to} of ${total} places`
                                                    : 'Pagination follows active place filters.'
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
                                </div>
                            </AdminSection>
                        )}
                    </div>
                </AdminShell>
            </RoleGuard>

            <ConfirmActionDialogWithReason
                open={hideOpen}
                onOpenChange={setHideOpen}
                title="Hide place"
                description="This keeps the location in the admin catalog but removes it from recommendation quality."
                confirmLabel="Hide place"
                confirmVariant="default"
                busy={saving}
                onConfirm={(reason) => void runAction('hide', reason)}
            />

            <ConfirmActionDialogWithReason
                open={validateOpen}
                onOpenChange={setValidateOpen}
                title="Validate coordinates"
                description="Confirm that the latitude and longitude point to the intended place."
                confirmLabel="Validate coordinates"
                confirmVariant="default"
                busy={saving}
                onConfirm={(reason) => void runAction('validate', reason)}
            />

            <ConfirmActionDialogWithReason
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete place"
                description="This removes the curated location and records the reason in the admin audit trail."
                confirmLabel="Delete place"
                busy={saving}
                onConfirm={(reason) => void runAction('delete', reason)}
            />
        </>
    );
}
