// resources/js/pages/Places.tsx
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import NavHeader from '../components/NavHeader';
import NearbyMap, { type Place } from '../components/NearbyMap';

type Professional = {
    id: number;
    name: string;
    role: 'nutritionist' | 'trainer' | string;
    area?: string | null;
    authority?: string | null;
    city?: string | null;
    specialties?: string[] | null;
    canInteract?: boolean;
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
                if (professionalRole !== 'all') params.set('role', professionalRole);
                const res = await fetch(
                    `/api/dietitians${params.toString() ? `?${params.toString()}` : ''}`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!res.ok) {
                    throw new Error('Could not load professionals.');
                }
                const json = await res.json();
                setProfessionals(Array.isArray(json?.data) ? json.data : []);
            } catch {
                setProfessionals([]);
            } finally {
                setLoadingProfessionals(false);
            }
        })();
    }, [professionalArea, professionalRole]);

    async function openConversation(userId: number) {
        const token =
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement | null
            )?.content ?? '';

        try {
            setWorkingProfessionalId(userId);
            const response = await fetch('/api/messages/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ participant_id: userId }),
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

    async function requestAppointment(
        userId: number,
        role: 'nutritionist' | 'trainer' | string,
    ) {
        const when = prompt('Appointment date/time (YYYY-MM-DD HH:mm:ss)');
        if (!when) return;
        const token =
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement | null
            )?.content ?? '';
        try {
            setWorkingProfessionalId(userId);
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    professional_id: userId,
                    professional_role: role,
                    scheduled_at: when,
                }),
            });
            const json = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not request the appointment.',
                );
            }
            window.location.href = '/appointments';
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not request the appointment.',
            );
        } finally {
            setWorkingProfessionalId(null);
        }
    }

    return (
        <>
            <Head title="Nearby - Hayetak" />
            <NavHeader />

            <main className="mx-auto max-w-6xl px-4 py-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Nearby</h1>
                        <p className="text-sm text-muted-foreground">
                            Explore gyms and connect with approved dietitians
                            and trainers nearby.
                        </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {loading ? (
                            'Loading...'
                        ) : error ? (
                            <span className="text-red-600">{error}</span>
                        ) : (
                            `${results.length} results`
                        )}
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap items-end gap-4 md:flex-nowrap">
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
                                                <div className="font-medium">
                                                    {p.name || '(no name)'}
                                                </div>
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
                                            setProfessionalArea(
                                                e.target.value,
                                            )
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
                                        <li className="text-xs text-muted-foreground">
                                            Loading professionals...
                                        </li>
                                    )}
                                    {professionals.map((professional) => (
                                        <li
                                            key={professional.id}
                                            className="rounded-xl border p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="font-medium">
                                                    {professional.name}
                                                </div>
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
                                                            ? void requestAppointment(
                                                                  professional.id,
                                                                  professional.role,
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
            </main>
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
