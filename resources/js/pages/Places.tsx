// resources/js/pages/Places.tsx
import {
    ProductBanner,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { HoverPreview } from '@/components/ui/hover-preview';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { jsonRequestInit } from '@/lib/http';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import NearbyMap, { type Place } from '../components/NearbyMap';

type Professional = {
    id: number;
    name: string;
    role: 'nutritionist' | 'trainer' | string;
    area?: string | null;
    authority?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    distance_m?: number | null;
    specialties?: string[] | null;
    canInteract?: boolean;
};

type AppointmentDialogState = {
    professionalId: number;
    professionalName: string;
    professionalRole: 'nutritionist' | 'trainer' | string;
    scheduledAt: string;
    notes: string;
};

function SimpleSlider({
    title = 'Search radius',
    units = 'km',
    value,
    min = 0.3,
    max = 30,
    step = 0.1,
    onChange,
}: {
    title?: string;
    units?: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
}) {
    const clamped = Math.min(max, Math.max(min, value));
    const pct = ((clamped - min) / Math.max(max - min, Number.EPSILON)) * 100;

    return (
        <div className="w-full">
            <div className="mb-2 flex items-end justify-between">
                <label className="text-sm font-medium">{title}</label>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {Math.round(value * 10) / 10} {units}
                </span>
            </div>
            <input
                type="range"
                className="places-range h-2 w-full cursor-pointer"
                min={min}
                max={max}
                step={step}
                value={value}
                style={{
                    background: `linear-gradient(90deg, var(--primary) 0%, var(--primary) ${pct}%, var(--muted) ${pct}%, var(--muted) 100%)`,
                }}
                aria-label={title}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={clamped}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            <div className="mt-1 text-xs text-muted-foreground">
                Drag or use arrow keys ({step} {units} steps).
            </div>
        </div>
    );
}

const DEFAULT_RADIUS_KM = 2;

export default function Places() {
    const { auth } = usePage<SharedData>().props;
    const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
    const [showGym, setShowGym] = useState<boolean>(true);
    const [showNutri, setShowNutri] = useState<boolean>(true);

    const [results, setResults] = useState<Place[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
        null,
    );
    const [geoMsg, setGeoMsg] = useState<string | null>(null);

    const [selectedPlaceId, setSelectedPlaceId] = useState<
        string | number | null
    >(null);
    const [professionalArea, setProfessionalArea] = useState<string>('');
    const [professionalRole, setProfessionalRole] = useState<
        'all' | 'nutritionist' | 'trainer'
    >('all');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loadingProfessionals, setLoadingProfessionals] =
        useState<boolean>(false);
    const [workingProfessionalId, setWorkingProfessionalId] = useState<
        number | null
    >(null);
    const [appointmentDialog, setAppointmentDialog] =
        useState<AppointmentDialogState | null>(null);
    const [appointmentDialogError, setAppointmentDialogError] = useState<
        string | null
    >(null);

    // locate once
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setGeoMsg('Geolocation not supported by this browser.');
            return;
        }
        setGeoMsg('Locating...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setCenter({ lat: latitude, lon: longitude });
                setGeoMsg(null);
            },
            (err) => {
                setGeoMsg(
                    err.code === err.PERMISSION_DENIED
                        ? 'Location permission denied. Enable it in your browser settings.'
                        : 'Could not get your location.',
                );
            },
            { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
        );
    }, []);

    const counts = useMemo(() => {
        return results.reduce(
            (acc, p) => {
                const t = (p.type ?? p.category ?? '').toLowerCase();
                if (
                    t.includes('nutri') ||
                    t.includes('diet') ||
                    t.includes('clinic')
                ) {
                    acc.nutritionist += 1;
                } else if (t.includes('gym')) {
                    acc.gym += 1;
                }
                return acc;
            },
            { gym: 0, nutritionist: 0 },
        );
    }, [results]);

    useEffect(() => {
        if (!center) {
            setLoading(false);
            return;
        }
        setError(null);
    }, [center, radiusKm, showGym, showNutri]);

    useEffect(() => {
        void (async () => {
            setLoadingProfessionals(true);
            try {
                const params = new URLSearchParams();
                if (professionalArea.trim()) {
                    params.set('area', professionalArea.trim());
                }
                if (professionalRole !== 'all')
                    params.set('role', professionalRole);
                if (center) {
                    params.set('lat', String(center.lat));
                    params.set('lng', String(center.lon));
                }
                const res = await fetch(
                    `/api/dietitians${params.toString() ? `?${params.toString()}` : ''}`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!res.ok) {
                    throw new Error('Could not load professionals.');
                }
                const json = await res.json();
                const list = Array.isArray(json?.data) ? json.data : [];
                setProfessionals(sortProfessionals(list, center));
            } catch {
                setProfessionals([]);
            } finally {
                setLoadingProfessionals(false);
            }
        })();
    }, [center, professionalArea, professionalRole]);

    async function openConversation(userId: number) {
        try {
            setWorkingProfessionalId(userId);
            const init = jsonRequestInit('POST', { participant_id: userId });
            const response = await fetch('/api/messages/conversations', {
                ...init,
                headers: {
                    ...init.headers,
                    Accept: 'application/json',
                },
            });
            const json = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not start a conversation.',
                );
            }
            const conversationId = json?.conversation?.id;
            window.location.href = conversationId
                ? `/messages?conversation=${conversationId}`
                : '/messages';
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not start a conversation.',
            );
        } finally {
            setWorkingProfessionalId(null);
        }
    }

    function openAppointmentDialog(professional: Professional) {
        setAppointmentDialogError(null);
        setError(null);
        setAppointmentDialog({
            professionalId: professional.id,
            professionalName: professional.name,
            professionalRole: professional.role,
            scheduledAt: createDefaultAppointmentDateTime(),
            notes: '',
        });
    }

    async function submitAppointmentRequest() {
        if (!appointmentDialog) return;

        if (!appointmentDialog.scheduledAt) {
            setAppointmentDialogError(
                'Select a date and time for the appointment.',
            );
            return;
        }

        try {
            setAppointmentDialogError(null);
            setWorkingProfessionalId(appointmentDialog.professionalId);
            const init = jsonRequestInit('POST', {
                professional_id: appointmentDialog.professionalId,
                professional_role: appointmentDialog.professionalRole,
                scheduled_at: toAppointmentTimestamp(
                    appointmentDialog.scheduledAt,
                ),
                notes: appointmentDialog.notes.trim() || null,
            });
            const response = await fetch('/api/appointments', {
                ...init,
                headers: {
                    ...init.headers,
                    Accept: 'application/json',
                },
            });
            const json = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not request the appointment.',
                );
            }
            setAppointmentDialog(null);
            window.location.href = '/appointments';
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Could not request the appointment.';
            setAppointmentDialogError(message);
            setError(message);
        } finally {
            setWorkingProfessionalId(null);
        }
    }

    return (
        <>
            <Head title="Nearby - Hayetak" />
            <ProductPageShell width="wide">
                <ProductHero
                    eyebrow="Nearby support"
                    title="Nearby"
                    description="Explore gyms, discover nearby nutrition support, and connect with approved professionals from the same polished workspace."
                    meta={
                        <span>
                            {loading
                                ? 'Loading nearby results'
                                : `${results.length} ${results.length === 1 ? 'result' : 'results'} in view`}
                        </span>
                    }
                />

                {error ? (
                    <ProductBanner tone="danger">{error}</ProductBanner>
                ) : null}

                <div className="md:hidden">
                    <Sheet
                        open={filterSheetOpen}
                        onOpenChange={setFilterSheetOpen}
                    >
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex h-11 items-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
                            >
                                Refine Nearby Results
                            </button>
                        </SheetTrigger>
                        <SheetContent
                            side="bottom"
                            className="rounded-t-[28px] border-border/70 bg-card/98"
                        >
                            <SheetHeader className="pb-4 text-left">
                                <SheetTitle>Nearby Filters</SheetTitle>
                                <SheetDescription>
                                    Adjust the radius and result type without
                                    leaving the map.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-4">
                                <SimpleSlider
                                    title="Search radius"
                                    units="km"
                                    value={radiusKm}
                                    min={0.3}
                                    max={30}
                                    step={0.1}
                                    onChange={(v: number) => setRadiusKm(v)}
                                />

                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium">
                                        Types
                                    </span>
                                    <select
                                        value={
                                            showGym && showNutri
                                                ? 'both'
                                                : showGym
                                                  ? 'gym'
                                                  : showNutri
                                                    ? 'nutritionist'
                                                    : 'none'
                                        }
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'both') {
                                                setShowGym(true);
                                                setShowNutri(true);
                                            } else if (val === 'gym') {
                                                setShowGym(true);
                                                setShowNutri(false);
                                            } else if (val === 'nutritionist') {
                                                setShowGym(false);
                                                setShowNutri(true);
                                            } else {
                                                setShowGym(false);
                                                setShowNutri(false);
                                            }
                                        }}
                                        className="h-11 rounded-xl border border-border bg-background px-3"
                                    >
                                        <option value="both">
                                            Gyms + Nutritionists
                                        </option>
                                        <option value="gym">Gyms only</option>
                                        <option value="nutritionist">
                                            Nutritionists only
                                        </option>
                                        <option value="none">None</option>
                                    </select>
                                </label>

                                <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{counts.gym} gyms</span>
                                        <span>
                                            {counts.nutritionist} nutritionists
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="mb-4 hidden flex-wrap items-end gap-4 md:flex md:flex-nowrap">
                    <div className="min-w-[260px] flex-1">
                        <SimpleSlider
                            title="Search radius"
                            units="km"
                            value={radiusKm}
                            min={0.3}
                            max={30}
                            step={0.1}
                            onChange={(v: number) => setRadiusKm(v)}
                        />
                    </div>

                    <label className="flex min-w-[260px] flex-1 flex-col gap-1">
                        <span className="text-sm font-medium">Types</span>
                        <select
                            value={
                                showGym && showNutri
                                    ? 'both'
                                    : showGym
                                      ? 'gym'
                                      : showNutri
                                        ? 'nutritionist'
                                        : 'none'
                            }
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'both') {
                                    setShowGym(true);
                                    setShowNutri(true);
                                } else if (val === 'gym') {
                                    setShowGym(true);
                                    setShowNutri(false);
                                } else if (val === 'nutritionist') {
                                    setShowGym(false);
                                    setShowNutri(true);
                                } else {
                                    setShowGym(false);
                                    setShowNutri(false);
                                }
                            }}
                            className="h-9 w-full rounded-md border bg-background px-3"
                        >
                            <option value="both">Gyms + Nutritionists</option>
                            <option value="gym">Gyms only</option>
                            <option value="nutritionist">
                                Nutritionists only
                            </option>
                            <option value="none">None</option>
                        </select>
                        {geoMsg && (
                            <div
                                className="mt-1 text-xs text-muted-foreground"
                                aria-live="polite"
                            >
                                {geoMsg}
                            </div>
                        )}
                    </label>

                    <div className="min-w-[260px] flex-1">
                        <div className="flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm">
                            <span>
                                <span className="font-semibold">
                                    {counts.gym}
                                </span>{' '}
                                gyms
                            </span>
                            <span>
                                <span className="font-semibold">
                                    {counts.nutritionist}
                                </span>{' '}
                                nutritionists
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                    <div className="md:col-span-3">
                        {center ? (
                            <NearbyMap
                                initialCenter={center}
                                initialZoom={12}
                                radiusKm={radiusKm}
                                showGym={showGym}
                                showNutritionist={showNutri}
                                onToggleGym={setShowGym}
                                onToggleNutritionist={setShowNutri}
                                onLoadingChange={setLoading}
                                onErrorChange={setError}
                                onResults={(list) => {
                                    setResults(list);
                                }}
                                focusPlaceId={selectedPlaceId}
                            />
                        ) : (
                            <div className="flex h-[480px] items-center justify-center rounded-xl border">
                                <div className="text-sm text-muted-foreground">
                                    {geoMsg ??
                                        'Waiting for location permission...'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <div className="rounded-lg border p-3">
                            <div className="mb-2 text-sm font-medium">
                                Results
                            </div>
                            <ul className="max-h-[480px] space-y-2 overflow-auto pr-1">
                                {loading &&
                                    Array.from({ length: 4 }).map(
                                        (_, index) => (
                                            <li
                                                key={`place-skeleton-${index}`}
                                                className="rounded-xl border border-border/70 bg-background/70 p-3"
                                            >
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="mt-3 h-3 w-full" />
                                                <Skeleton className="mt-2 h-3 w-2/3" />
                                            </li>
                                        ),
                                    )}
                                {results.length === 0 && !loading && !error && (
                                    <li className="text-sm text-muted-foreground">
                                        No places found in this radius.
                                    </li>
                                )}
                                {results.map((p, i) => {
                                    const key = `${p.id ?? `${p.name}-${i}`}`;
                                    const category = (
                                        p.category ??
                                        p.type ??
                                        'other'
                                    ).toString();
                                    const prettyCategory = category
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (char) =>
                                            char.toUpperCase(),
                                        );
                                    const distanceLabel =
                                        typeof p.distanceM === 'number'
                                            ? `${(p.distanceM / 1000).toFixed(2)} km`
                                            : null;
                                    const locationLine = [p.address, p.city]
                                        .filter(Boolean)
                                        .join(', ');
                                    const mapUrl = toSafeHttpUrl(
                                        p.googleMapsLink,
                                    );
                                    const websiteUrl = toSafeHttpUrl(p.website);
                                    return (
                                        <li
                                            key={key}
                                            className={`cursor-pointer rounded-md border p-2 transition hover:bg-muted/40 ${
                                                selectedPlaceId !== null &&
                                                String(selectedPlaceId) ===
                                                    String(p.id)
                                                    ? 'bg-muted/60'
                                                    : ''
                                            }`}
                                            title="Show on map"
                                            onClick={() =>
                                                setSelectedPlaceId(p.id)
                                            }
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <HoverPreview
                                                    trigger={
                                                        <div className="font-medium">
                                                            {p.name ||
                                                                '(no name)'}
                                                        </div>
                                                    }
                                                    title={
                                                        p.name || 'Nearby place'
                                                    }
                                                    description={
                                                        p.description ||
                                                        locationLine ||
                                                        'Quick preview for this nearby place.'
                                                    }
                                                    meta={
                                                        <>
                                                            {distanceLabel ? (
                                                                <span>
                                                                    {
                                                                        distanceLabel
                                                                    }
                                                                </span>
                                                            ) : null}
                                                            {p.rating !==
                                                                null &&
                                                            p.rating !==
                                                                undefined ? (
                                                                <span>
                                                                    Rating{' '}
                                                                    {p.rating}
                                                                </span>
                                                            ) : null}
                                                            <span>
                                                                {prettyCategory}
                                                            </span>
                                                        </>
                                                    }
                                                />
                                                <div className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                    {prettyCategory}
                                                </div>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {distanceLabel && (
                                                    <span>{distanceLabel}</span>
                                                )}
                                                {p.phone && (
                                                    <span>{p.phone}</span>
                                                )}
                                                {p.rating !== null &&
                                                    p.rating !== undefined && (
                                                        <span>
                                                            Rating: {p.rating}
                                                        </span>
                                                    )}
                                            </div>
                                            {locationLine && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {locationLine}
                                                </div>
                                            )}
                                            {p.description && (
                                                <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                                                    {p.description}
                                                </div>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                                {mapUrl && (
                                                    <a
                                                        href={mapUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sky-700 underline"
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        Open map
                                                    </a>
                                                )}
                                                {websiteUrl && (
                                                    <a
                                                        href={websiteUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sky-700 underline"
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        Website
                                                    </a>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        {auth.user?.role === 'client' && (
                            <div className="mt-4 rounded-lg border p-3">
                                <div className="mb-2 text-sm font-medium">
                                    Professionals
                                </div>
                                <p className="mb-3 text-xs text-muted-foreground">
                                    Start or continue a conversation with
                                    approved dietitians and trainers.
                                </p>
                                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                    <input
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                        placeholder="Filter by area"
                                        value={professionalArea}
                                        onChange={(e) =>
                                            setProfessionalArea(e.target.value)
                                        }
                                    />
                                    <select
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                        value={professionalRole}
                                        onChange={(e) =>
                                            setProfessionalRole(
                                                e.target.value as
                                                    | 'all'
                                                    | 'nutritionist'
                                                    | 'trainer',
                                            )
                                        }
                                    >
                                        <option value="all">
                                            All professionals
                                        </option>
                                        <option value="nutritionist">
                                            Dietitians
                                        </option>
                                        <option value="trainer">
                                            Trainers
                                        </option>
                                    </select>
                                </div>
                                <ul className="max-h-72 space-y-2 overflow-auto pr-1">
                                    {loadingProfessionals && (
                                        <>
                                            {Array.from({ length: 3 }).map(
                                                (_, index) => (
                                                    <li
                                                        key={`professional-skeleton-${index}`}
                                                        className="rounded-xl border border-border/70 bg-background/70 p-3"
                                                    >
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="mt-3 h-3 w-24" />
                                                        <Skeleton className="mt-2 h-3 w-full" />
                                                    </li>
                                                ),
                                            )}
                                        </>
                                    )}
                                    {professionals.map((professional) => (
                                        <li
                                            key={professional.id}
                                            className="rounded-xl border p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <HoverPreview
                                                    trigger={
                                                        <div className="font-medium">
                                                            {professional.name}
                                                        </div>
                                                    }
                                                    title={professional.name}
                                                    description={
                                                        professional.specialties
                                                            ?.length
                                                            ? professional.specialties.join(
                                                                  ', ',
                                                              )
                                                            : 'Approved professional profile.'
                                                    }
                                                    meta={
                                                        <>
                                                            <span>
                                                                {professional.role ===
                                                                'nutritionist'
                                                                    ? 'Dietitian'
                                                                    : 'Trainer'}
                                                            </span>
                                                            <span>
                                                                {professional.area ??
                                                                    professional.city ??
                                                                    'Area unavailable'}
                                                            </span>
                                                        </>
                                                    }
                                                />
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
                                                    {professional.role ===
                                                    'nutritionist'
                                                        ? 'Dietitian'
                                                        : 'Trainer'}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {professional.area ??
                                                    professional.city ??
                                                    'No area info'}
                                            </div>
                                            {typeof professional.distance_m ===
                                                'number' && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {(
                                                        professional.distance_m /
                                                        1000
                                                    ).toFixed(2)}{' '}
                                                    km away
                                                </div>
                                            )}
                                            {professional.authority && (
                                                <div className="text-xs text-muted-foreground">
                                                    Authority:{' '}
                                                    {professional.authority}
                                                </div>
                                            )}
                                            {!professional.canInteract && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Messaging and appointments
                                                    are currently unavailable
                                                    for this profile.
                                                </div>
                                            )}
                                            <div className="mt-2 flex gap-3 text-xs">
                                                <button
                                                    className={
                                                        professional.canInteract
                                                            ? 'text-sky-700 underline'
                                                            : 'cursor-not-allowed text-muted-foreground'
                                                    }
                                                    disabled={
                                                        !professional.canInteract ||
                                                        workingProfessionalId ===
                                                            professional.id
                                                    }
                                                    onClick={() =>
                                                        professional.canInteract
                                                            ? void openConversation(
                                                                  professional.id,
                                                              )
                                                            : undefined
                                                    }
                                                >
                                                    {workingProfessionalId ===
                                                    professional.id
                                                        ? 'Opening...'
                                                        : 'Open chat'}
                                                </button>
                                                <button
                                                    className={
                                                        professional.canInteract
                                                            ? 'text-sky-700 underline'
                                                            : 'cursor-not-allowed text-muted-foreground'
                                                    }
                                                    disabled={
                                                        !professional.canInteract ||
                                                        workingProfessionalId ===
                                                            professional.id
                                                    }
                                                    onClick={() =>
                                                        professional.canInteract
                                                            ? openAppointmentDialog(
                                                                  professional,
                                                              )
                                                            : undefined
                                                    }
                                                >
                                                    Request appointment
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                    {!loadingProfessionals &&
                                        professionals.length === 0 && (
                                            <li className="text-xs text-muted-foreground">
                                                No professionals found for this
                                                filter.
                                            </li>
                                        )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </ProductPageShell>

            <Dialog
                open={appointmentDialog !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAppointmentDialog(null);
                        setAppointmentDialogError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request Appointment</DialogTitle>
                        <DialogDescription>
                            Choose a date and time for your appointment request.
                            The professional will see your requested slot in
                            their appointments inbox.
                        </DialogDescription>
                    </DialogHeader>

                    {appointmentDialog ? (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void submitAppointmentRequest();
                            }}
                        >
                            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                                <div className="font-medium">
                                    {appointmentDialog.professionalName}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                    {appointmentDialog.professionalRole ===
                                    'nutritionist'
                                        ? 'Dietitian'
                                        : 'Trainer'}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    className="block text-sm font-medium"
                                    htmlFor="appointment-date-time"
                                >
                                    Appointment date and time
                                </label>
                                <input
                                    id="appointment-date-time"
                                    type="datetime-local"
                                    step={60}
                                    min={formatDateTimeLocal(new Date())}
                                    value={appointmentDialog.scheduledAt}
                                    onChange={(event) => {
                                        setAppointmentDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      scheduledAt:
                                                          event.target.value,
                                                  }
                                                : null,
                                        );
                                        setAppointmentDialogError(null);
                                    }}
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    className="block text-sm font-medium"
                                    htmlFor="appointment-notes"
                                >
                                    Notes
                                </label>
                                <textarea
                                    id="appointment-notes"
                                    value={appointmentDialog.notes}
                                    onChange={(event) =>
                                        setAppointmentDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      notes: event.target.value,
                                                  }
                                                : null,
                                        )
                                    }
                                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    maxLength={2000}
                                    placeholder="Optional context, preferred meeting format, or goals for this session."
                                />
                            </div>

                            {appointmentDialogError && (
                                <div className="text-sm text-red-600">
                                    {appointmentDialogError}
                                </div>
                            )}

                            <DialogFooter>
                                <button
                                    type="button"
                                    className="rounded-md border px-4 py-2 text-sm"
                                    onClick={() => {
                                        setAppointmentDialog(null);
                                        setAppointmentDialogError(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                    disabled={
                                        workingProfessionalId ===
                                        appointmentDialog.professionalId
                                    }
                                >
                                    {workingProfessionalId ===
                                    appointmentDialog.professionalId
                                        ? 'Requesting...'
                                        : 'Request appointment'}
                                </button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}

function toSafeHttpUrl(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.toString();
        }
    } catch {
        return null;
    }
    return null;
}

function sortProfessionals(
    professionals: Professional[],
    center: { lat: number; lon: number } | null,
): Professional[] {
    if (
        !center &&
        professionals.every(
            (professional) => typeof professional.distance_m !== 'number',
        )
    ) {
        return professionals;
    }

    return [...professionals].sort((a, b) => {
        const aDistance = resolveProfessionalDistance(a, center);
        const bDistance = resolveProfessionalDistance(b, center);

        if (aDistance === null && bDistance === null) {
            return a.name.localeCompare(b.name);
        }
        if (aDistance === null) return 1;
        if (bDistance === null) return -1;
        if (aDistance !== bDistance) return aDistance - bDistance;

        return a.name.localeCompare(b.name);
    });
}

function resolveProfessionalDistance(
    professional: Professional,
    center: { lat: number; lon: number } | null,
): number | null {
    if (typeof professional.distance_m === 'number') {
        return professional.distance_m;
    }

    if (
        !center ||
        typeof professional.lat !== 'number' ||
        typeof professional.lng !== 'number'
    ) {
        return null;
    }

    return haversineDistanceMeters(
        center.lat,
        center.lon,
        professional.lat,
        professional.lng,
    );
}

function createDefaultAppointmentDateTime(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 30, 0, 0);

    return formatDateTimeLocal(date);
}

function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toAppointmentTimestamp(value: string): string {
    const [datePart, timePart = '00:00'] = value.split('T');
    const normalizedTime =
        timePart.length === 5
            ? `${timePart}:00`
            : timePart.length === 8
              ? timePart
              : `${timePart.slice(0, 5)}:00`;

    return `${datePart} ${normalizedTime}`;
}

function haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const earthRadiusMeters = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1Rad) *
            Math.cos(lat2Rad) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
}
