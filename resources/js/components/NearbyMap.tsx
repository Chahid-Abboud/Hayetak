import mapboxgl, { LngLatLike, Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    Circle,
    Cross,
    Dumbbell,
    FlaskConical,
    Utensils,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(
    mapboxgl as typeof mapboxgl & {
        setTelemetryEnabled?: (enabled: boolean) => void;
    }
).setTelemetryEnabled?.(false);

export type Place = {
    id: string | number;
    name: string;
    lat: number;
    lon: number;
    type?:
        | 'gym'
        | 'nutritionist'
        | 'hospital'
        | 'medical_lab'
        | 'other';
    category?: string | null;
    address?: string | null;
    city?: string | null;
    distanceM?: number | null;
    description?: string | null;
    googleMapsLink?: string | null;
    googlePlaceId?: string | null;
    lastVerifiedAt?: string | null;
    website?: string | null;
    phone?: string | null;
    rating?: number | null;
    openingHours?: string[];
    primaryImageUrl?: string | null;
    imageUrls?: string[];
    source?: string | null;
};

type Props = {
    accessToken?: string;
    initialCenter?: { lat: number; lon: number };
    initialZoom?: number;
    radiusKm: number;
    onRadiusChange?: (km: number) => void;
    showGym?: boolean;
    showNutritionist?: boolean;
    showHealthcare?: boolean;
    onToggleGym?: (v: boolean) => void;
    onToggleNutritionist?: (v: boolean) => void;
    onToggleHealthcare?: (v: boolean) => void;
    onResults?: (items: Place[]) => void;
    onLoadingChange?: (loading: boolean) => void;
    onErrorChange?: (message: string | null) => void;
    focusPlaceId?: string | number | null;
};

const DEFAULT_CENTER = { lat: 33.8938, lon: 35.5018 };

export default function NearbyMap({
    accessToken,
    initialCenter = DEFAULT_CENTER,
    initialZoom = 12,
    radiusKm,
    showGym = true,
    showNutritionist = true,
    showHealthcare = true,
    onToggleGym,
    onToggleNutritionist,
    onToggleHealthcare,
    onResults,
    onLoadingChange,
    onErrorChange,
    focusPlaceId = null,
}: Props) {
    const token =
        accessToken ||
        window.MAPBOX_TOKEN ||
        document
            .querySelector('meta[name="mapbox-token"]')
            ?.getAttribute('content') ||
        '';

    const mapRef = useRef<MapboxMap | null>(null);
    const divRef = useRef<HTMLDivElement | null>(null);
    const initialCenterRef = useRef(initialCenter);
    const initialZoomRef = useRef(initialZoom);
    const initialRadiusRef = useRef(radiusKm);
    const tokenRef = useRef(token);

    const [userLoc, setUserLoc] = useState(initialCenter);
    const [viewCenter, setViewCenter] = useState(initialCenter);

    const [places, setPlaces] = useState<Place[]>([]);
    const placesRef = useRef<Place[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const placeMarkersRef = useRef<
        globalThis.Map<string, { marker: mapboxgl.Marker; root: Root }>
    >(new globalThis.Map());
    const userSetRef = useRef(false);

    const popupRef = useRef<mapboxgl.Popup | null>(null);

    const typesParam = useMemo(() => {
        const t: string[] = [];
        if (showGym) t.push('gym');
        if (showNutritionist) t.push('nutritionist');
        if (showHealthcare) t.push('hospital', 'medical_lab');
        return t.join(',');
    }, [showGym, showHealthcare, showNutritionist]);

    const fetchController = useRef<AbortController | null>(null);

    /* ---------- popup helper (stable) ---------- */
    const showPopupAt = useCallback((lng: number, lat: number, data: Place) => {
        const m = mapRef.current;
        if (!m) return;
        if (!popupRef.current) {
            popupRef.current = new mapboxgl.Popup({
                closeButton: true,
                closeOnMove: true,
                offset: 16,
            });
        }
        const typeLabel = formatCategoryLabel(data.category ?? data.type ?? 'other');
        const details = [data.address, data.city].filter(Boolean).join(', ');
        const distanceLabel =
            typeof data.distanceM === 'number'
                ? `${(data.distanceM / 1000).toFixed(2)} km away`
                : '';
        const description = data.description
            ? truncate(data.description, 160)
            : '';
        const mapsUrl = safeHttpUrl(data.googleMapsLink);
        const websiteUrl = safeHttpUrl(data.website);
        const phone = data.phone ? escapeHtml(data.phone) : '';

        popupRef.current
            .setLngLat([lng, lat])
            .setHTML(
                `
        <div style="
          background:var(--card);
          color:var(--foreground);
          border:1px solid var(--border);
          border-radius:12px;
          padding:10px 12px 8px 12px;
          box-shadow:0 12px 30px rgba(0,0,0,0.18);
          min-width:160px;
        ">
          <div style="font-weight:600; color:var(--foreground); margin-bottom:2px;">
            ${escapeHtml(data.name || 'Unknown')}
          </div>
          ${
              details
                  ? `<div style="font-size:12px; color:var(--muted-foreground); margin-bottom:4px;">
                  ${escapeHtml(details)}
                 </div>`
                  : ''
          }
          ${
              distanceLabel
                  ? `<div style="font-size:11px; color:var(--muted-foreground); margin-bottom:6px;">
                  ${escapeHtml(distanceLabel)}
                 </div>`
                  : ''
          }
          ${
              typeLabel
                  ? `<span style="display:inline-block;font-size:10px;font-weight:600;background:var(--secondary);color:var(--secondary-foreground);border-radius:9999px;padding:2px 10px;">
                  ${escapeHtml(typeLabel)}
                 </span>`
                  : ''
          }
          ${
              description
                  ? `<div style="font-size:12px; color:var(--foreground); margin-top:8px; line-height:1.4;">
                  ${escapeHtml(description)}
                 </div>`
                  : ''
          }
          ${phone ? `<div style="font-size:12px; color:var(--foreground); margin-top:8px;">Phone: ${phone}</div>` : ''}
          ${
              mapsUrl || websiteUrl
                  ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                  ${
                      mapsUrl
                          ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--info);text-decoration:underline;">Open map</a>`
                          : ''
                  }
                  ${
                      websiteUrl
                          ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--info);text-decoration:underline;">Website</a>`
                          : ''
                  }
                 </div>`
                  : ''
          }
        </div>
        `,
            )
            .addTo(m);
    }, []);

    /* ---------- fetch places ---------- */
    const fetchPlaces = useCallback(
        async (origin: { lat: number; lon: number }, rKm: number) => {
            setLoading(true);
            setError(null);
            onLoadingChange?.(true);
            onErrorChange?.(null);

            fetchController.current?.abort();
            fetchController.current = new AbortController();

            const qs = new URLSearchParams({
                lat: String(origin.lat),
                lng: String(origin.lon),
                radius: String(Math.round(rKm * 1000)),
                types: typesParam,
            }).toString();

            try {
                const res = await fetch(`/api/places-local?${qs}`, {
                    signal: fetchController.current.signal,
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                const list: Place[] = Array.isArray(data?.features)
                    ? data.features.map(normalizeFeature)
                    : [];

                placesRef.current = list;
                setPlaces(list);
                onResults?.(list);
            } catch (e: unknown) {
                if (!isAbortError(e)) {
                    const message = e instanceof Error ? e.message : String(e);
                    placesRef.current = [];
                    setPlaces([]);
                    setError(message);
                    onErrorChange?.(message);
                    onResults?.([]);
                }
            } finally {
                setLoading(false);
                onLoadingChange?.(false);
            }
        },
        [typesParam, onErrorChange, onLoadingChange, onResults],
    );

    /* ---------- init map ---------- */
    useEffect(() => {
        if (!divRef.current) return;
        if (mapRef.current) return;

        if (!tokenRef.current) console.warn('Mapbox token missing.');
        mapboxgl.accessToken = tokenRef.current;
        const markerRegistry = placeMarkersRef.current;

        const m = new mapboxgl.Map({
            container: divRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [
                initialCenterRef.current.lon,
                initialCenterRef.current.lat,
            ] as LngLatLike,
            zoom: initialZoomRef.current,
            dragRotate: false,
            pitchWithRotate: false,
        });
        mapRef.current = m;

        m.addControl(new mapboxgl.NavigationControl(), 'top-right');

        m.on('load', () => {
            addSourcesAndLayers(m);
            drawRadiusCircle(
                m,
                initialCenterRef.current,
                initialRadiusRef.current,
            );
            updatePlaceMarkers(
                m,
                placesRef.current,
                markerRegistry,
                showPopupAt,
            );
        });

        m.on('moveend', () => {
            const c = m.getCenter();
            setViewCenter({ lat: c.lat, lon: c.lng });
        });

        return () => {
            clearPlaceMarkers(markerRegistry);
            m.remove();
            mapRef.current = null;
        };
    }, [showPopupAt]);

    /* ---------- set user marker ---------- */
    useEffect(() => {
        const m = mapRef.current;
        if (!m) return;
        if (!initialCenter) return;

        if (!userSetRef.current) {
            userSetRef.current = true;
            setUserLoc(initialCenter);
            setViewCenter(initialCenter);

            // user marker in your theme
            const el = document.createElement('div');
            el.className =
                'rounded-full bg-primary border-2 border-slate-950/10 shadow-lg w-4 h-4';
            el.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';

            userMarkerRef.current = new mapboxgl.Marker({ element: el })
                .setLngLat([initialCenter.lon, initialCenter.lat])
                .addTo(m);

            m.setCenter([initialCenter.lon, initialCenter.lat]);
            m.setZoom(initialZoom ?? 12);

            drawRadiusCircle(m, initialCenter, radiusKm);
            fetchPlaces(initialCenter, radiusKm);
        }
    }, [initialCenter, initialZoom, radiusKm, fetchPlaces]);

    /* ---------- radius / filters ---------- */
    useEffect(() => {
        const m = mapRef.current;
        if (!m) return;
        drawRadiusCircle(m, userLoc, radiusKm);
        fetchPlaces(userLoc, radiusKm);
    }, [radiusKm, typesParam]); // eslint-disable-line

    /* ---------- update layer when places change ---------- */
    useEffect(() => {
        const m = mapRef.current;
        if (!m) return;
        placesRef.current = places;
        updatePlaceMarkers(m, places, placeMarkersRef.current, showPopupAt);
    }, [places, showPopupAt]);

    /* ---------- focus from list ---------- */
    useEffect(() => {
        const m = mapRef.current;
        if (!m) return;
        if (!focusPlaceId) return;
        const target = places.find(
            (p) => String(p.id) === String(focusPlaceId),
        );
        if (!target) return;

        m.flyTo({
            center: [target.lon, target.lat],
            zoom: 15,
            essential: true,
        });

        showPopupAt(target.lon, target.lat, target);
    }, [focusPlaceId, places, showPopupAt]);

    return (
        <div className="relative">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-xl border border-border/70 bg-card/92 p-2 shadow-sm backdrop-blur">
                <button
                    type="button"
                    onClick={() => onToggleGym?.(!showGym)}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        showGym
                            ? 'border-primary/60 bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground'
                    }`}
                >
                    Gyms
                </button>
                <button
                    type="button"
                    onClick={() => onToggleNutritionist?.(!showNutritionist)}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        showNutritionist
                            ? 'border-info/60 bg-info text-info-foreground'
                            : 'border-border bg-background text-foreground'
                    }`}
                >
                    Nutrition centers
                </button>
                <button
                    type="button"
                    onClick={() => onToggleHealthcare?.(!showHealthcare)}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        showHealthcare
                            ? 'border-primary/60 bg-primary/15 text-foreground'
                            : 'border-border bg-background text-foreground'
                    }`}
                >
                    Healthcare
                </button>
            </div>

            <div className="absolute top-16 right-3 z-10 rounded-xl border border-border/70 bg-card/92 px-3 py-2 text-xs text-foreground shadow-sm backdrop-blur">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Current area
                </div>
                <div className="mt-1 font-medium">
                    {places.length} option{places.length === 1 ? '' : 's'} in{' '}
                    {(Math.round(radiusKm * 10) / 10).toFixed(1)} km
                </div>
            </div>

            <div
                ref={divRef}
                className="h-[520px] w-full rounded-[24px] border border-border/70 shadow-sm"
            />

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                            <Dumbbell className="h-3 w-3" aria-hidden />
                        </span>
                        Gym
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-info/40 bg-info/10 text-info">
                            <Utensils className="h-3 w-3" aria-hidden />
                        </span>
                        Nutrition center / Dietitian
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                            <Cross className="h-3 w-3" aria-hidden />
                        </span>
                        Hospital
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-warning">
                            <FlaskConical className="h-3 w-3" aria-hidden />
                        </span>
                        Medical lab
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-info/70" />
                        Search radius
                    </span>
                </div>
                <div className="text-right">
                    {loading ? (
                        'Loading...'
                    ) : error ? (
                        <span className="text-red-600">{error}</span>
                    ) : (
                        `${places.length} places`
                    )}
                </div>
                <div className="sm:col-span-2">
                    View: {viewCenter.lat.toFixed(5)},{' '}
                    {viewCenter.lon.toFixed(5)} - Radius from user: {radiusKm}{' '}
                    km
                </div>
            </div>
        </div>
    );
}

/* ---------------- helpers ---------------- */

function normalizeFeature(raw: unknown): Place {
    const source = asRecord(raw);
    const properties = asRecord(source.properties);
    const geometry = source.geometry;
    const pointCoordinates = getPointCoordinates(geometry);
    const meta = readRecord(source.meta) ?? readRecord(properties.meta);

    const sourceType = readString(source.type);
    const sourceTypeAsCategory =
        sourceType &&
        sourceType !== 'Feature' &&
        sourceType !== 'FeatureCollection'
            ? sourceType
            : undefined;

    const rawCategory =
        readString(properties.category) ??
        readString(properties.type) ??
        readString(source.category) ??
        sourceTypeAsCategory ??
        '';

    const coerced = normalizePlaceType(rawCategory);

    const lat =
        readNumber(source.lat) ??
        (pointCoordinates ? pointCoordinates[1] : undefined) ??
        0;
    const lon =
        readNumber(source.lon) ??
        (pointCoordinates ? pointCoordinates[0] : undefined) ??
        0;
    const distanceM =
        readNumber(source.distance_m) ??
        readNumber(properties.distance_m) ??
        readNumber(source.distance) ??
        readNumber(properties.distance) ??
        null;
    const imageUrls =
        readStringArray(source.image_urls) ??
        readStringArray(properties.image_urls) ??
        [];
    const openingHours =
        readStringArray(source.opening_hours) ??
        readStringArray(properties.opening_hours) ??
        [];
    const primaryImageUrl =
        readString(source.primary_image_url) ??
        readString(properties.primary_image_url) ??
        imageUrls[0] ??
        null;

    return {
        id: readId(source.id) ?? readId(properties.id) ?? `${lat},${lon}`,
        name:
            readString(source.name) ?? readString(properties.name) ?? 'Unknown',
        lat: Number(lat),
        lon: Number(lon),
        type: coerced,
        category:
            readString(properties.category) ??
            readString(source.category) ??
            coerced,
        address:
            readString(source.address) ??
            readString(properties.address) ??
            null,
        city: readString(source.city) ?? readString(properties.city) ?? null,
        distanceM,
        description:
            readString(source.description) ??
            readString(properties.description) ??
            null,
        googleMapsLink:
            readString(source.google_maps_link) ??
            readString(properties.google_maps_link) ??
            null,
        googlePlaceId:
            readString(source.google_place_id) ??
            readString(properties.google_place_id) ??
            null,
        lastVerifiedAt:
            readString(source.last_verified_at) ??
            readString(properties.last_verified_at) ??
            null,
        website:
            readString(source.website) ??
            readString(properties.website) ??
            (meta ? readString(meta.website) : undefined) ??
            null,
        phone:
            readString(source.phone) ??
            readString(properties.phone) ??
            (meta ? readString(meta.phone) : undefined) ??
            null,
        rating:
            readNumber(source.rating) ??
            readNumber(properties.rating) ??
            (meta ? readNumber(meta.rating) : undefined) ??
            null,
        openingHours,
        primaryImageUrl,
        imageUrls,
        source:
            readString(source.source) ??
            readString(properties.source) ??
            (meta ? readString(meta.source) : undefined) ??
            null,
    };
}

function normalizePlaceType(
    value: string,
):
    | 'gym'
    | 'nutritionist'
    | 'hospital'
    | 'medical_lab'
    | 'other' {
    const v = (value || '').toLowerCase();
    if (v.includes('gym')) return 'gym';
    if (v.includes('nutri') || v.includes('diet')) return 'nutritionist';
    if (v.includes('hospital')) return 'hospital';
    if (v.includes('lab') || v.includes('diagnostic')) return 'medical_lab';
    return 'other';
}

function addSourcesAndLayers(map: MapboxMap) {
    if (!map.getSource('radius')) {
        map.addSource('radius', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    if (!map.getLayer('radius-fill')) {
        map.addLayer({
            id: 'radius-fill',
            type: 'fill',
            source: 'radius',
            paint: {
                'fill-color': cssVar('--info', '#4f8df7'),
                'fill-opacity': 0.12,
            },
        });
    }
    if (!map.getLayer('radius-outline')) {
        map.addLayer({
            id: 'radius-outline',
            type: 'line',
            source: 'radius',
            paint: {
                'line-color': cssVar('--info', '#4f8df7'),
                'line-width': 2,
            },
        });
    }
}

function cssVar(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();

    return value || fallback;
}

function updatePlaceMarkers(
    map: MapboxMap,
    list: Place[],
    registry: globalThis.Map<string, { marker: mapboxgl.Marker; root: Root }>,
    showPopupAt: (lng: number, lat: number, data: Place) => void,
) {
    clearPlaceMarkers(registry);

    for (const place of list) {
        if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
            continue;
        }

        const key = String(place.id);
        const element = document.createElement('button');
        element.type = 'button';
        element.className =
            'group flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none';
        element.style.boxShadow = '0 16px 32px rgba(0,0,0,0.28)';
        element.setAttribute('aria-label', `Show ${place.name} on map`);
        element.addEventListener('click', (event) => {
            event.stopPropagation();
            showPopupAt(place.lon, place.lat, place);
        });

        const root = createRoot(element);
        root.render(<MapPlaceMarkerIcon type={placeKind(place)} />);

        const marker = new mapboxgl.Marker({
            element,
            anchor: 'center',
        })
            .setLngLat([place.lon, place.lat])
            .addTo(map);

        registry.set(key, { marker, root });
    }
}

function clearPlaceMarkers(
    registry: globalThis.Map<string, { marker: mapboxgl.Marker; root: Root }>,
) {
    for (const { marker, root } of registry.values()) {
        root.unmount();
        marker.remove();
    }

    registry.clear();
}

function MapPlaceMarkerIcon({
    type,
}: {
    type: NonNullable<Place['type']>;
}) {
    const Icon = markerIcon(type);
    const tone = markerTone(type);

    return (
        <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${tone}`}
        >
            <Icon className="h-4 w-4" aria-hidden strokeWidth={2.5} />
        </span>
    );
}

function placeKind(place: Place): NonNullable<Place['type']> {
    return normalizePlaceType((place.category ?? place.type ?? 'other').toString());
}

function markerIcon(type: NonNullable<Place['type']>): LucideIcon {
    if (type === 'gym') return Dumbbell;
    if (type === 'nutritionist') return Utensils;
    if (type === 'medical_lab') return FlaskConical;
    if (type === 'hospital') return Cross;

    return Circle;
}

function markerTone(type: NonNullable<Place['type']>): string {
    if (type === 'nutritionist') {
        return 'border-info/40 bg-info/10 text-info';
    }
    if (type === 'medical_lab') {
        return 'border-warning/40 bg-warning/10 text-warning';
    }
    if (type === 'hospital') {
        return 'border-primary/40 bg-primary/15 text-primary';
    }
    if (type === 'other') {
        return 'border-muted-foreground/30 bg-muted text-muted-foreground';
    }

    return 'border-primary/40 bg-primary/15 text-primary';
}

function drawRadiusCircle(
    map: MapboxMap,
    center: { lat: number; lon: number },
    radiusKm: number,
) {
    const src = map.getSource('radius') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const polygon = circlePolygon(center.lon, center.lat, radiusKm, 128);
    src.setData({
        type: 'FeatureCollection',
        features: [polygon],
    });
}

function circlePolygon(
    lon: number,
    lat: number,
    radiusKm: number,
    steps = 64,
): GeoJSON.Feature {
    const coords: [number, number][] = [];
    const d = radiusKm / 6371;
    const phi1 = (lat * Math.PI) / 180;
    const lambda1 = (lon * Math.PI) / 180;

    for (let i = 0; i <= steps; i++) {
        const brng = (i * 2 * Math.PI) / steps;
        const phi2 = Math.asin(
            Math.sin(phi1) * Math.cos(d) +
                Math.cos(phi1) * Math.sin(d) * Math.cos(brng),
        );
        const lambda2 =
            lambda1 +
            Math.atan2(
                Math.sin(brng) * Math.sin(d) * Math.cos(phi1),
                Math.cos(d) - Math.sin(phi1) * Math.sin(phi2),
            );
        coords.push([(lambda2 * 180) / Math.PI, (phi2 * 180) / Math.PI]);
    }

    return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {},
    } as GeoJSON.Feature;
}

function escapeHtml(s: string) {
    return s.replace(
        /[&<>"']/g,
        (m) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
            })[m]!,
    );
}

function truncate(value: string, maxLen: number): string {
    if (value.length <= maxLen) return value;
    return `${value.slice(0, Math.max(0, maxLen - 1)).trim()}...`;
}

function formatCategoryLabel(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeHttpUrl(value?: string | null): string | null {
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

function asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
        return value as Record<string, unknown>;
    }
    return {};
}

function readRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        try {
            const parsed = JSON.parse(value);
            if (
                parsed &&
                typeof parsed === 'object' &&
                !Array.isArray(parsed)
            ) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return null;
        }
    }
    return null;
}

function readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function readStringArray(value: unknown): string[] | null {
    if (Array.isArray(value)) {
        const items = value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => item !== '');
        return items.length ? items : null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                return readStringArray(parsed);
            } catch {
                return [trimmed];
            }
        }

        return [trimmed];
    }

    return null;
}

function readNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function readId(value: unknown): string | number | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }
    return undefined;
}

function getPointCoordinates(geometry: unknown): [number, number] | null {
    if (!geometry || typeof geometry !== 'object') return null;
    const rec = geometry as { type?: unknown; coordinates?: unknown };
    if (
        rec.type !== 'Point' ||
        !Array.isArray(rec.coordinates) ||
        rec.coordinates.length < 2
    ) {
        return null;
    }
    const lon = readNumber(rec.coordinates[0]);
    const lat = readNumber(rec.coordinates[1]);
    if (lon === undefined || lat === undefined) return null;
    return [lon, lat];
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}
