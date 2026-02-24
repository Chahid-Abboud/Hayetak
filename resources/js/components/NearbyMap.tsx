import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { Map, LngLatLike } from "mapbox-gl";

export type Place = {
  id: string | number;
  name: string;
  lat: number;
  lon: number;
  type?: "gym" | "nutritionist" | "other";
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
  onToggleGym?: (v: boolean) => void;
  onToggleNutritionist?: (v: boolean) => void;
  onResults?: (items: Place[]) => void;
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
  onToggleGym,
  onToggleNutritionist,
  onResults,
  focusPlaceId = null,
}: Props) {
  const token =
    accessToken ||
    window.MAPBOX_TOKEN ||
    document.querySelector('meta[name="mapbox-token"]')?.getAttribute("content") ||
    "";

  const mapRef = useRef<Map | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);
  const initialRadiusRef = useRef(radiusKm);
  const tokenRef = useRef(token);

  const [userLoc, setUserLoc] = useState(initialCenter);
  const [viewCenter, setViewCenter] = useState(initialCenter);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userSetRef = useRef(false);

  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const typesParam = useMemo(() => {
    const t: string[] = [];
    if (showGym) t.push("gym");
    if (showNutritionist) t.push("nutritionist");
    return t.join(",");
  }, [showGym, showNutritionist]);

  const fetchController = useRef<AbortController | null>(null);

  /* ---------- popup helper (stable) ---------- */
  const showPopupAt = useCallback(
    (lng: number, lat: number, data: Place) => {
      const m = mapRef.current;
      if (!m) return;
      if (!popupRef.current) {
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnMove: true,
          offset: 16,
        });
      }
      const typeLabel = (data.category ?? data.type ?? "other").toUpperCase();
      const details = [data.address, data.city].filter(Boolean).join(", ");
      const distanceLabel =
        typeof data.distanceM === "number" ? `${(data.distanceM / 1000).toFixed(2)} km away` : "";
      const description = data.description ? truncate(data.description, 160) : "";
      const mapsUrl = safeHttpUrl(data.googleMapsLink);
      const websiteUrl = safeHttpUrl(data.website);
      const phone = data.phone ? escapeHtml(data.phone) : "";

      popupRef.current
        .setLngLat([lng, lat])
        .setHTML(
          `
        <div style="
          background:white;
          border-radius:12px;
          padding:10px 12px 8px 12px;
          box-shadow:0 12px 30px rgba(0,0,0,0.18);
          min-width:160px;
        ">
          <div style="font-weight:600; color:#0f172a; margin-bottom:2px;">
            ${escapeHtml(data.name || "Unknown")}
          </div>
          ${
            details
              ? `<div style="font-size:12px; color:#475569; margin-bottom:4px;">
                  ${escapeHtml(details)}
                 </div>`
              : ""
          }
          ${
            distanceLabel
              ? `<div style="font-size:11px; color:#64748b; margin-bottom:6px;">
                  ${escapeHtml(distanceLabel)}
                 </div>`
              : ""
          }
          ${
            typeLabel
              ? `<span style="display:inline-block;font-size:10px;font-weight:600;background:#e2fff4;color:#047857;border-radius:9999px;padding:2px 10px;">
                  ${escapeHtml(typeLabel)}
                 </span>`
              : ""
          }
          ${
            description
              ? `<div style="font-size:12px; color:#334155; margin-top:8px; line-height:1.4;">
                  ${escapeHtml(description)}
                 </div>`
              : ""
          }
          ${phone ? `<div style="font-size:12px; color:#334155; margin-top:8px;">Phone: ${phone}</div>` : ""}
          ${
            mapsUrl || websiteUrl
              ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                  ${
                    mapsUrl
                      ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#0369a1;text-decoration:underline;">Open map</a>`
                      : ""
                  }
                  ${
                    websiteUrl
                      ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#0369a1;text-decoration:underline;">Website</a>`
                      : ""
                  }
                 </div>`
              : ""
          }
        </div>
        `
        )
        .addTo(m);
    },
    []
  );

  /* ---------- fetch places ---------- */
  const fetchPlaces = useCallback(
    async (origin: { lat: number; lon: number }, rKm: number) => {
      setLoading(true);
      setError(null);

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
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const list: Place[] = Array.isArray(data?.features)
          ? data.features.map(normalizeFeature)
          : [];

        setPlaces(list);
        onResults?.(list);
      } catch (e: unknown) {
        if (!isAbortError(e)) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [typesParam, onResults]
  );

  /* ---------- init map ---------- */
  useEffect(() => {
    if (!divRef.current) return;
    if (mapRef.current) return;

    if (!tokenRef.current) console.warn("Mapbox token missing.");
    mapboxgl.accessToken = tokenRef.current;

    const m = new mapboxgl.Map({
      container: divRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialCenterRef.current.lon, initialCenterRef.current.lat] as LngLatLike,
      zoom: initialZoomRef.current,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = m;

    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    m.on("load", () => {
      addSourcesAndLayers(m);
      drawRadiusCircle(m, initialCenterRef.current, initialRadiusRef.current);
      updatePlacesLayer(m, []);
    });

    // click on a place on the map
    m.on("click", "places-unclustered", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const props = asRecord(feat.properties);
      const coords = getPointCoordinates(feat.geometry);
      if (!coords) return;
      const category = readString(props.category) ?? readString(props.type) ?? "";
      const coerced = normalizePlaceType(category);
      showPopupAt(coords[0], coords[1], {
        id: readId(props.id) ?? `${coords[1]},${coords[0]}`,
        name: readString(props.name) || "Unknown",
        lat: coords[1],
        lon: coords[0],
        type: coerced,
        category: category || coerced,
        address: readString(props.address) || "",
        city: readString(props.city) || null,
        distanceM: readNumber(props.distance_m) ?? readNumber(props.distance) ?? null,
        description: readString(props.description) || null,
        googleMapsLink: readString(props.google_maps_link) || null,
        website: readString(props.website) || null,
        phone: readString(props.phone) || null,
      });
    });

    m.on("moveend", () => {
      const c = m.getCenter();
      setViewCenter({ lat: c.lat, lon: c.lng });
    });

    return () => {
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
      const el = document.createElement("div");
      el.className =
        "rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 border-2 border-slate-950/10 shadow-lg w-4 h-4";
      el.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";

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
    updatePlacesLayer(m, places);
  }, [places]);

  /* ---------- visibility toggle ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const types: string[] = [];
    if (showGym) types.push("gym");
    if (showNutritionist) types.push("nutritionist");
    if (m.getLayer("places-unclustered")) {
      m.setFilter("places-unclustered", [
        "match",
        ["get", "type"],
        types.length ? types : [""],
        true,
        false,
      ]);
    }
  }, [showGym, showNutritionist]);

  /* ---------- focus from list ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (!focusPlaceId) return;
    const target = places.find((p) => String(p.id) === String(focusPlaceId));
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
      {/* toolbar */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-xl border bg-card/90 p-2 shadow">
        <button
          type="button"
          onClick={() => onToggleGym?.(!showGym)}
          className={`rounded-lg px-2 py-1 text-xs font-medium border ${
            showGym ? "bg-emerald-500 text-white border-emerald-600" : "bg-background text-foreground border-border"
          }`}
        >
          Gyms
        </button>
        <button
          type="button"
          onClick={() => onToggleNutritionist?.(!showNutritionist)}
          className={`rounded-lg px-2 py-1 text-xs font-medium border ${
            showNutritionist ? "bg-blue-600 text-white border-blue-700" : "bg-background text-foreground border-border"
          }`}
        >
          Nutritionists
        </button>
      </div>

      <div ref={divRef} className="h-[480px] w-full rounded-2xl border shadow-sm" />

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          View: {viewCenter.lat.toFixed(5)}, {viewCenter.lon.toFixed(5)} - Radius from user: {radiusKm} km
        </div>
        <div>
          {loading ? "Loading..." : error ? <span className="text-red-600">{error}</span> : `${places.length} places`}
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
    sourceType && sourceType !== "Feature" && sourceType !== "FeatureCollection"
      ? sourceType
      : undefined;

  const rawCategory =
    readString(properties.category) ??
    readString(properties.type) ??
    readString(source.category) ??
    sourceTypeAsCategory ??
    "";

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
  const imageUrls = readStringArray(source.image_urls) ?? readStringArray(properties.image_urls) ?? [];
  const openingHours =
    readStringArray(source.opening_hours) ?? readStringArray(properties.opening_hours) ?? [];
  const primaryImageUrl =
    readString(source.primary_image_url) ??
    readString(properties.primary_image_url) ??
    (imageUrls[0] ?? null);

  return {
    id: readId(source.id) ?? readId(properties.id) ?? `${lat},${lon}`,
    name: readString(source.name) ?? readString(properties.name) ?? "Unknown",
    lat: Number(lat),
    lon: Number(lon),
    type: coerced,
    category: readString(properties.category) ?? readString(source.category) ?? coerced,
    address: readString(source.address) ?? readString(properties.address) ?? null,
    city: readString(source.city) ?? readString(properties.city) ?? null,
    distanceM,
    description: readString(source.description) ?? readString(properties.description) ?? null,
    googleMapsLink:
      readString(source.google_maps_link) ?? readString(properties.google_maps_link) ?? null,
    googlePlaceId: readString(source.google_place_id) ?? readString(properties.google_place_id) ?? null,
    lastVerifiedAt:
      readString(source.last_verified_at) ?? readString(properties.last_verified_at) ?? null,
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

function normalizePlaceType(value: string): "gym" | "nutritionist" | "other" {
  const v = (value || "").toLowerCase();
  if (v.includes("gym")) return "gym";
  if (v.includes("nutri") || v.includes("diet")) return "nutritionist";
  return "other";
}

function addSourcesAndLayers(map: Map) {
  // no clustering
  if (!map.getSource("places")) {
    map.addSource("places", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: false,
    });
  }

  if (!map.getLayer("places-unclustered")) {
    map.addLayer({
      id: "places-unclustered",
      type: "circle",
      source: "places",
      paint: {
        "circle-color": [
          "match",
          ["get", "type"],
          "gym",
          "#10b981", // green
          "nutritionist",
          "#2563eb", // blue
          "#a78bfa", // fallback
        ],
        "circle-radius": 6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  if (!map.getSource("radius")) {
    map.addSource("radius", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer("radius-fill")) {
    map.addLayer({
      id: "radius-fill",
      type: "fill",
      source: "radius",
      paint: {
        "fill-color": "#22d3ee",
        "fill-opacity": 0.12,
      },
    });
  }
  if (!map.getLayer("radius-outline")) {
    map.addLayer({
      id: "radius-outline",
      type: "line",
      source: "radius",
      paint: {
        "line-color": "#06b6d4",
        "line-width": 2,
      },
    });
  }
}

function updatePlacesLayer(map: Map, list: Place[]) {
  const src = map.getSource("places") as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;
  src.setData({
    type: "FeatureCollection",
    features: list.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: {
        id: p.id,
        name: p.name,
        type: p.type ?? "other",
        category: p.category ?? p.type ?? "other",
        address: p.address ?? "",
        city: p.city ?? "",
        distance_m: p.distanceM ?? null,
        description: p.description ?? "",
        google_maps_link: p.googleMapsLink ?? "",
        website: p.website ?? "",
        phone: p.phone ?? "",
        rating: p.rating ?? null,
        primary_image_url: p.primaryImageUrl ?? "",
      },
    })),
  } as GeoJSON.FeatureCollection);
}

function drawRadiusCircle(map: Map, center: { lat: number; lon: number }, radiusKm: number) {
  const src = map.getSource("radius") as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;
  const polygon = circlePolygon(center.lon, center.lat, radiusKm, 128);
  src.setData({
    type: "FeatureCollection",
    features: [polygon],
  });
}

function circlePolygon(lon: number, lat: number, radiusKm: number, steps = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const d = radiusKm / 6371;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const brng = (i * 2 * Math.PI) / steps;
    const phi2 = Math.asin(
      Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(brng)
    );
    const lambda2 =
      lambda1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(phi1),
        Math.cos(d) - Math.sin(phi1) * Math.sin(phi2)
      );
    coords.push([(lambda2 * 180) / Math.PI, (phi2 * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  } as GeoJSON.Feature;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!));
}

function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 1)).trim()}...`;
}

function safeHttpUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item !== "");
    return items.length ? items : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
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
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readId(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return undefined;
}

function getPointCoordinates(geometry: unknown): [number, number] | null {
  if (!geometry || typeof geometry !== "object") return null;
  const rec = geometry as { type?: unknown; coordinates?: unknown };
  if (rec.type !== "Point" || !Array.isArray(rec.coordinates) || rec.coordinates.length < 2) {
    return null;
  }
  const lon = readNumber(rec.coordinates[0]);
  const lat = readNumber(rec.coordinates[1]);
  if (lon === undefined || lat === undefined) return null;
  return [lon, lat];
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

