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
import { Head } from '@inertiajs/react';
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
    nutritionCenterName?: string | null;
    goToGymName?: string | null;
    linkedPlaceId?: string | number | null;
};

type FixedListFilter =
    | 'all'
    | 'gyms'
    | 'nutrition-centers'
    | 'healthcare'
    | 'dietitians'
    | 'trainers';

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
                    background:
                        'color-mix(in oklab, var(--primary) 24%, var(--muted))',
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
    const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
    const [showGym, setShowGym] = useState<boolean>(true);
    const [showNutri, setShowNutri] = useState<boolean>(true);
    const [showHealthcare, setShowHealthcare] = useState<boolean>(true);

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
    const [listQuery, setListQuery] = useState('');
    const [listFilter, setListFilter] = useState<FixedListFilter>('all');
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

<<<<<<< HEAD
    function focusPlaceFromList(placeId: string | number | null) {
        if (placeId === null || placeId === undefined) {
            return;
        }

        setSelectedPlaceId(null);
        window.requestAnimationFrame(() => {
            setSelectedPlaceId(placeId);
        });
    }

=======
>>>>>>> origin/main
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
                if (isHealthcareCategory(t)) {
                    acc.healthcare += 1;
                } else if (t.includes('nutri') || t.includes('diet')) {
                    acc.nutritionist += 1;
                } else if (t.includes('gym')) {
                    acc.gym += 1;
                }
                return acc;
            },
            { gym: 0, nutritionist: 0, healthcare: 0 },
        );
    }, [results]);

    useEffect(() => {
        if (!center) {
            setLoading(false);
            return;
        }
        setError(null);
    }, [center, radiusKm, showGym, showHealthcare, showNutri]);

    useEffect(() => {
        void (async () => {
            setLoadingProfessionals(true);
            try {
                const params = new URLSearchParams();
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
    }, [center]);

    const linkedProfessionals = useMemo(() => {
        const gyms = results.filter((place) => isGymPlace(place));
        const nutritionCenters = results.filter((place) =>
            isNutritionCenterPlace(place),
        );

        return professionals.map((professional) => {
            if (professional.role === 'nutritionist') {
                const linkedPlace = findClosestPlaceForProfessional(
                    professional,
                    nutritionCenters,
                );

                return {
                    ...professional,
                    nutritionCenterName: linkedPlace?.name ?? null,
                    linkedPlaceId: linkedPlace?.id ?? null,
                };
            }

            if (professional.role === 'trainer') {
                const linkedPlace = findClosestPlaceForProfessional(
                    professional,
                    gyms,
                );

                return {
                    ...professional,
                    goToGymName: linkedPlace?.name ?? null,
                    linkedPlaceId: linkedPlace?.id ?? null,
                };
            }

            return professional;
        });
    }, [professionals, results]);

    const fixedListItems = useMemo(() => {
        const query = listQuery.trim().toLowerCase();

        const placeItems = results.map((place, index) => {
            const normalizedCategory = normalizePlaceCategory(
                place.category ?? place.type ?? 'other',
            );
            const filterTag: FixedListFilter =
                normalizedCategory === 'gym'
                    ? 'gyms'
                    : isHealthcareCategory(normalizedCategory)
                      ? 'healthcare'
                      : 'nutrition-centers';

            return {
                key: `place-${place.id ?? index}`,
                type: 'place' as const,
                name: place.name ?? 'Nearby place',
                distanceM:
                    typeof place.distanceM === 'number'
                        ? place.distanceM
                        : null,
                filterTag,
                place,
                searchIndex: [
                    place.name,
                    place.category,
                    place.type,
                    place.address,
                    place.city,
                    place.description,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase(),
            };
        });

        const professionalItems = linkedProfessionals.map((professional) => {
            const filterTag: FixedListFilter =
                professional.role === 'nutritionist'
                    ? 'dietitians'
                    : 'trainers';
            return {
                key: `professional-${professional.id}`,
                type: 'professional' as const,
                name: professional.name,
                distanceM:
                    typeof professional.distance_m === 'number'
                        ? professional.distance_m
                        : null,
                filterTag,
                professional,
                searchIndex: [
                    professional.name,
                    professional.role,
                    professional.area,
                    professional.city,
                    professional.authority,
                    ...(professional.specialties ?? []),
                    professional.nutritionCenterName,
                    professional.goToGymName,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase(),
            };
        });

        const merged = [...placeItems, ...professionalItems];

        const filtered = merged.filter((item) => {
            if (listFilter !== 'all' && item.filterTag !== listFilter) {
                return false;
            }
            if (query !== '' && !item.searchIndex.includes(query)) {
                return false;
            }

            return true;
        });

        return filtered.sort((left, right) => {
            if (left.distanceM === null && right.distanceM === null) {
                return left.name.localeCompare(right.name);
            }
            if (left.distanceM === null) return 1;
            if (right.distanceM === null) return -1;
            if (left.distanceM !== right.distanceM) {
                return left.distanceM - right.distanceM;
            }
            return left.name.localeCompare(right.name);
        });
    }, [linkedProfessionals, listFilter, listQuery, results]);

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
<<<<<<< HEAD
                    title="Nearby support"
                    description="Find nearby gyms, healthcare places, dietitians, and personal trainers."
=======
                    title="Nearby"
                    description="Explore gyms, discover nearby nutrition support, and connect with approved professionals from the same polished workspace."
>>>>>>> origin/main
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
                                        value={typePreset(
                                            showGym,
                                            showNutri,
                                            showHealthcare,
                                        )}
                                        onChange={(e) => {
                                            applyTypePreset(
                                                e.target.value,
                                                setShowGym,
                                                setShowNutri,
                                                setShowHealthcare,
                                            );
                                        }}
                                        className="h-11 rounded-xl border border-border bg-background px-3"
                                    >
                                        <option value="all">
<<<<<<< HEAD
                                            Gyms + Dietitians + Healthcare
                                        </option>
                                        <option value="both">
                                            Gyms + Dietitian centers
                                        </option>
                                        <option value="gym">Gyms only</option>
                                        <option value="nutritionist">
                                            Dietitian centers only
=======
                                            Gyms + Nutrition + Healthcare
                                        </option>
                                        <option value="both">
                                            Gyms + Nutrition centers
                                        </option>
                                        <option value="gym">Gyms only</option>
                                        <option value="nutritionist">
                                            Nutrition centers only
>>>>>>> origin/main
                                        </option>
                                        <option value="healthcare">
                                            Healthcare only
                                        </option>
                                        <option value="custom" disabled>
                                            Custom mix
                                        </option>
                                        <option value="none">None</option>
                                    </select>
                                </label>

                                <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{counts.gym} gyms</span>
                                        <span>
<<<<<<< HEAD
                                            {counts.nutritionist} dietitian
=======
                                            {counts.nutritionist} nutrition
>>>>>>> origin/main
                                            centers
                                        </span>
                                        <span>
                                            {counts.healthcare} healthcare
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
                            value={typePreset(
                                showGym,
                                showNutri,
                                showHealthcare,
                            )}
                            onChange={(e) => {
                                applyTypePreset(
                                    e.target.value,
                                    setShowGym,
                                    setShowNutri,
                                    setShowHealthcare,
                                );
                            }}
                            className="h-9 w-full rounded-md border bg-background px-3"
                        >
                            <option value="all">
<<<<<<< HEAD
                                Gyms + Dietitians + Healthcare
                            </option>
                            <option value="both">
                                Gyms + Dietitian centers
                            </option>
                            <option value="gym">Gyms only</option>
                            <option value="nutritionist">
                                Dietitian centers only
=======
                                Gyms + Nutrition + Healthcare
                            </option>
                            <option value="both">
                                Gyms + Nutrition centers
                            </option>
                            <option value="gym">Gyms only</option>
                            <option value="nutritionist">
                                Nutrition centers only
>>>>>>> origin/main
                            </option>
                            <option value="healthcare">Healthcare only</option>
                            <option value="custom" disabled>
                                Custom mix
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
                        <div className="flex min-h-9 w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border bg-background px-3 py-2 text-sm">
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
<<<<<<< HEAD
                                dietitian centers
=======
                                nutrition centers
>>>>>>> origin/main
                            </span>
                            <span>
                                <span className="font-semibold">
                                    {counts.healthcare}
                                </span>{' '}
                                healthcare
                            </span>
                        </div>
                    </div>
                </div>

<<<<<<< HEAD
                <div className="grid items-stretch gap-4 xl:h-[calc(100vh-14rem)] xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                    <div className="min-w-0 h-full">
=======
                <div className="grid gap-4 md:grid-cols-5">
                    <div className="md:col-span-3">
>>>>>>> origin/main
                        {center ? (
                            <NearbyMap
                                initialCenter={center}
                                initialZoom={12}
                                radiusKm={radiusKm}
                                showGym={showGym}
                                showNutritionist={showNutri}
                                showHealthcare={showHealthcare}
<<<<<<< HEAD
=======
                                onToggleGym={setShowGym}
                                onToggleNutritionist={setShowNutri}
                                onToggleHealthcare={setShowHealthcare}
>>>>>>> origin/main
                                onLoadingChange={setLoading}
                                onErrorChange={setError}
                                onResults={(list) => {
                                    setResults(list);
                                }}
                                focusPlaceId={selectedPlaceId}
                            />
                        ) : (
<<<<<<< HEAD
                            <div className="flex h-full min-h-[480px] items-center justify-center rounded-xl border">
=======
                            <div className="flex h-[480px] items-center justify-center rounded-xl border">
>>>>>>> origin/main
                                <div className="text-sm text-muted-foreground">
                                    {geoMsg ??
                                        'Waiting for location permission...'}
                                </div>
                            </div>
                        )}
                    </div>

<<<<<<< HEAD
                    <div className="min-w-0 h-full">
                        <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card/70 p-4">
=======
                    <div className="md:col-span-2">
                        <div className="rounded-lg border p-3">
>>>>>>> origin/main
                            <div className="mb-3">
                                <div className="text-sm font-medium">
                                    Nearby directory
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
<<<<<<< HEAD
                                    Search places and approved professionals in one stable list.
=======
                                    One list for map places and approved
                                    professionals, with one shared search.
>>>>>>> origin/main
                                </p>
                            </div>

                            <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <input
<<<<<<< HEAD
                                    className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none transition focus:border-primary/70"
                                    placeholder="Search by name, category, city, or specialty..."
=======
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                    placeholder="Search names, categories, areas..."
>>>>>>> origin/main
                                    value={listQuery}
                                    onChange={(event) =>
                                        setListQuery(event.target.value)
                                    }
                                />
                                <select
<<<<<<< HEAD
                                    className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none transition focus:border-primary/70"
=======
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
>>>>>>> origin/main
                                    value={listFilter}
                                    onChange={(event) =>
                                        setListFilter(
                                            event.target
                                                .value as FixedListFilter,
                                        )
                                    }
                                >
                                    <option value="all">All</option>
                                    <option value="gyms">Gyms</option>
                                    <option value="nutrition-centers">
                                        Nutrition centers
                                    </option>
                                    <option value="healthcare">
                                        Healthcare
                                    </option>
                                    <option value="dietitians">
                                        Dietitians
                                    </option>
<<<<<<< HEAD
                                    <option value="trainers">Personal Trainers</option>
                                </select>
                            </div>

                            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
=======
                                    <option value="trainers">Trainers</option>
                                </select>
                            </div>

                            <ul className="max-h-[680px] space-y-2 overflow-auto pr-1">
>>>>>>> origin/main
                                {(loading || loadingProfessionals) &&
                                    Array.from({ length: 4 }).map(
                                        (_, index) => (
                                            <li
                                                key={`directory-skeleton-${index}`}
                                                className="rounded-xl border border-border/70 bg-background/70 p-3"
                                            >
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="mt-3 h-3 w-full" />
                                                <Skeleton className="mt-2 h-3 w-2/3" />
                                            </li>
                                        ),
                                    )}

                                {!loading &&
                                !loadingProfessionals &&
                                fixedListItems.length === 0 ? (
                                    <li className="text-sm text-muted-foreground">
                                        No nearby results for this search.
                                    </li>
                                ) : null}

                                {fixedListItems.map((item) => {
                                    if (item.type === 'place') {
                                        const p = item.place;
                                        const category = (
                                            p.category ??
                                            p.type ??
                                            'other'
                                        ).toString();
<<<<<<< HEAD
                                        const rawCategory = category.toLowerCase();
                                        const prettyCategory = rawCategory === 'nutritionist'
                                            ? 'Dietitian'
                                            : rawCategory === 'trainer'
                                              ? 'Personal Trainer'
                                              : category.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
=======
                                        const prettyCategory = category
                                            .replace(/_/g, ' ')
                                            .replace(/\b\w/g, (char) =>
                                                char.toUpperCase(),
                                            );
>>>>>>> origin/main
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
                                        const websiteUrl = toSafeHttpUrl(
                                            p.website,
                                        );

                                        return (
                                            <li
                                                key={item.key}
<<<<<<< HEAD
                                                className={`cursor-pointer rounded-[18px] border border-border/70 bg-background/80 p-3 transition hover:border-primary/50 hover:bg-primary/5 ${
                                                    selectedPlaceId !== null &&
                                                    String(selectedPlaceId) ===
                                                        String(p.id)
                                                        ? 'border-primary/70 bg-primary/10'
=======
                                                className={`cursor-pointer rounded-md border p-2 transition hover:bg-muted/40 ${
                                                    selectedPlaceId !== null &&
                                                    String(selectedPlaceId) ===
                                                        String(p.id)
                                                        ? 'bg-muted/60'
>>>>>>> origin/main
                                                        : ''
                                                }`}
                                                title="Show on map"
                                                onClick={() =>
<<<<<<< HEAD
                                                    focusPlaceFromList(p.id)
=======
                                                    setSelectedPlaceId(p.id)
>>>>>>> origin/main
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
                                                            p.name ||
                                                            'Nearby place'
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
                                                                        {
                                                                            p.rating
                                                                        }
                                                                    </span>
                                                                ) : null}
                                                                <span>
                                                                    {
                                                                        prettyCategory
                                                                    }
                                                                </span>
                                                            </>
                                                        }
                                                    />
<<<<<<< HEAD
                                                    <div className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
=======
                                                    <div className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
>>>>>>> origin/main
                                                        {prettyCategory}
                                                    </div>
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    {distanceLabel && (
                                                        <span>
                                                            {distanceLabel}
                                                        </span>
                                                    )}
                                                    {p.phone && (
                                                        <span>{p.phone}</span>
                                                    )}
                                                    {p.rating !== null &&
                                                        p.rating !==
                                                            undefined && (
                                                            <span>
                                                                Rating:{' '}
                                                                {p.rating}
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
<<<<<<< HEAD
                                                            className="font-semibold text-primary underline underline-offset-4"
=======
                                                            className="text-sky-700 underline"
>>>>>>> origin/main
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
<<<<<<< HEAD
                                                            className="font-semibold text-primary underline underline-offset-4"
=======
                                                            className="text-sky-700 underline"
>>>>>>> origin/main
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
                                    }

                                    const professional = item.professional;
                                    const roleLabel =
                                        professional.role === 'nutritionist'
                                            ? 'Dietitian'
<<<<<<< HEAD
                                            : 'Personal trainer';
=======
                                            : 'Trainer';
>>>>>>> origin/main
                                    const centerOrGymLine =
                                        professional.role === 'nutritionist'
                                            ? professional.nutritionCenterName
                                                ? `Nutrition center: ${professional.nutritionCenterName}`
                                                : 'Nutrition center: not linked yet'
                                            : professional.goToGymName
                                              ? `Go-to gym: ${professional.goToGymName}`
                                              : 'Go-to gym: not linked yet';

                                    return (
                                        <li
                                            key={item.key}
<<<<<<< HEAD
                                            className={`rounded-[18px] border border-border/70 bg-background/80 p-3 transition ${
                                                professional.linkedPlaceId &&
                                                selectedPlaceId !== null &&
                                                String(selectedPlaceId) ===
                                                    String(
                                                        professional.linkedPlaceId,
                                                    )
                                                    ? 'border-primary/70 bg-primary/10'
                                                    : professional.linkedPlaceId
                                                      ? 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                                                      : ''
                                            }`}
                                            onClick={() =>
                                                focusPlaceFromList(
                                                    professional.linkedPlaceId ??
                                                        null,
                                                )
                                            }
=======
                                            className="rounded-xl border p-3"
>>>>>>> origin/main
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
                                                                {roleLabel}
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
                                                    {roleLabel}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {professional.area ??
                                                    professional.city ??
                                                    'No area info'}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {centerOrGymLine}
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
<<<<<<< HEAD
                                                    Chat and appointments are unavailable for this profile.
=======
                                                    Messaging and appointments
                                                    are currently unavailable
                                                    for this profile.
>>>>>>> origin/main
                                                </div>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                                {professional.linkedPlaceId ? (
                                                    <button
                                                        type="button"
<<<<<<< HEAD
                                                        className="font-semibold text-primary underline underline-offset-4"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            focusPlaceFromList(
                                                                professional.linkedPlaceId ??
                                                                    null,
                                                            );
                                                        }}
=======
                                                        className="text-sky-700 underline"
                                                        onClick={() =>
                                                            setSelectedPlaceId(
                                                                professional.linkedPlaceId ??
                                                                    null,
                                                            )
                                                        }
>>>>>>> origin/main
                                                    >
                                                        Show associated place
                                                    </button>
                                                ) : null}
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
<<<<<<< HEAD
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (professional.canInteract) {
                                                            void openConversation(
                                                                professional.id,
                                                            );
                                                        }
                                                    }}
=======
                                                    onClick={() =>
                                                        professional.canInteract
                                                            ? void openConversation(
                                                                  professional.id,
                                                              )
                                                            : undefined
                                                    }
>>>>>>> origin/main
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
<<<<<<< HEAD
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (professional.canInteract) {
                                                            openAppointmentDialog(
                                                                professional,
                                                            );
                                                        }
                                                    }}
=======
                                                    onClick={() =>
                                                        professional.canInteract
                                                            ? openAppointmentDialog(
                                                                  professional,
                                                              )
                                                            : undefined
                                                    }
>>>>>>> origin/main
                                                >
                                                    Request appointment
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
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
<<<<<<< HEAD
                                        : 'Personal trainer'}
=======
                                        : 'Trainer'}
>>>>>>> origin/main
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

function normalizePlaceCategory(
    value: string,
):
    | 'gym'
    | 'nutritionist'
    | 'hospital'
    | 'medical_lab'
    | 'other' {
    const v = value.toLowerCase();
    if (v.includes('gym')) return 'gym';
    if (v.includes('nutri') || v.includes('diet')) {
        return 'nutritionist';
    }
    if (v.includes('hospital')) return 'hospital';
    if (v.includes('lab') || v.includes('diagnostic')) return 'medical_lab';
    return 'other';
}

function isHealthcareCategory(value: string): boolean {
    return ['hospital', 'medical_lab'].includes(
        normalizePlaceCategory(value),
    );
}

function isGymPlace(place: Place): boolean {
    return (
        normalizePlaceCategory(
            (place.category ?? place.type ?? 'other').toString(),
        ) === 'gym'
    );
}

function isNutritionCenterPlace(place: Place): boolean {
    return (
        normalizePlaceCategory(
            (place.category ?? place.type ?? 'other').toString(),
        ) === 'nutritionist'
    );
}

function typePreset(
    showGym: boolean,
    showNutri: boolean,
    showHealthcare: boolean,
) {
    if (showGym && showNutri && showHealthcare) return 'all';
    if (showGym && showNutri && !showHealthcare) return 'both';
    if (showGym && !showNutri && !showHealthcare) return 'gym';
    if (!showGym && showNutri && !showHealthcare) return 'nutritionist';
    if (!showGym && !showNutri && showHealthcare) return 'healthcare';
    if (!showGym && !showNutri && !showHealthcare) return 'none';

    return 'custom';
}

function applyTypePreset(
    preset: string,
    setShowGym: (value: boolean) => void,
    setShowNutri: (value: boolean) => void,
    setShowHealthcare: (value: boolean) => void,
) {
    setShowGym(['all', 'both', 'gym'].includes(preset));
    setShowNutri(['all', 'both', 'nutritionist'].includes(preset));
    setShowHealthcare(['all', 'healthcare'].includes(preset));
}

function findClosestPlaceForProfessional(
    professional: Professional,
    places: Place[],
): Place | null {
    if (places.length === 0) return null;

    if (
        typeof professional.lat === 'number' &&
        typeof professional.lng === 'number'
    ) {
        let closest: Place | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const place of places) {
            const distance = haversineDistanceMeters(
                professional.lat,
                professional.lng,
                place.lat,
                place.lon,
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                closest = place;
            }
        }

        return closest;
    }

    return places[0] ?? null;
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
