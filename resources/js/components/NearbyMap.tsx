import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { Map, LngLatLike } from "mapbox-gl";

type Place = {
  id: string | number;
  name: string;
  lat: number;
  lon: number;
  type?: "gym" | "nutritionist" | "other";
  address?: string | null;
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
  onRadiusChange,
  showGym = true,
  showNutritionist = true,
  onToggleGym,
  onToggleNutritionist,
  onResults,
  focusPlaceId = null,
}: Props) {
  const token =
    accessToken ||
    (window as any)?.MAPBOX_TOKEN ||
    document.querySelector('meta[name="mapbox-token"]')?.getAttribute("content") ||
    "";

  const mapRef = useRef<Map | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

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
    (lng: number, lat: number, data: { name: string; address?: string; type?: string }) => {
      const m = mapRef.current;
      if (!m) return;
      if (!popupRef.current) {
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnMove: true,
          offset: 16,
        });
      }
      const typeLabel = data.type ? data.type.toUpperCase() : "";
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
          <div style="font-size:12px; color:#475569; margin-bottom:6px;">
            ${escapeHtml(data.address || "")}
          </div>
          ${
            typeLabel
              ? `<span style="display:inline-block;font-size:10px;font-weight:600;background:#e2fff4;color:#047857;border-radius:9999px;padding:2px 10px;">
                  ${escapeHtml(typeLabel)}
                 </span>`
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
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(String(e.message ?? e));
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

    if (!token) console.warn("Mapbox token missing.");
    mapboxgl.accessToken = token;

    const m = new mapboxgl.Map({
      container: divRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialCenter.lon, initialCenter.lat] as LngLatLike,
      zoom: initialZoom,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = m;

    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    m.on("load", () => {
      addSourcesAndLayers(m);
      drawRadiusCircle(m, initialCenter, radiusKm);
      updatePlacesLayer(m, places);
    });

    // click on a place on the map
    m.on("click", "places-unclustered", (e) => {
      const feat = e.features && e.features[0];
      if (!feat) return;
      const props: any = feat.properties || {};
      const coords = (feat.geometry as any).coordinates as [number, number];
      const coerced = normalizePlaceType(props.type || props.category || "");
      showPopupAt(coords[0], coords[1], {
        name: props.name,
        address: props.address,
        type: coerced,
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
  }, []); // once

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

    showPopupAt(target.lon, target.lat, {
      name: target.name,
      address: target.address || "",
      type: target.type || "",
    });
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
          View: {viewCenter.lat.toFixed(5)}, {viewCenter.lon.toFixed(5)} · Radius from user: {radiusKm} km
        </div>
        <div>
          {loading ? "Loading…" : error ? <span className="text-red-600">{error}</span> : `${places.length} places`}
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function normalizeFeature(raw: any): Place {
  const rawType =
    raw.type ??
    raw.category ??
    raw.properties?.category ??
    raw.properties?.type ??
    "";
  const coerced = normalizePlaceType(rawType);
  return {
    id: raw.id ?? raw.properties?.id ?? `${raw.lat},${raw.lon}`,
    name: raw.name ?? raw.properties?.name ?? "Unknown",
    lat: Number(raw.lat ?? raw.geometry?.coordinates?.[1] ?? 0),
    lon: Number(raw.lon ?? raw.geometry?.coordinates?.[0] ?? 0),
    type: coerced,
    address: raw.address ?? raw.properties?.address ?? null,
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
        address: p.address ?? "",
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
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const brng = (i * 2 * Math.PI) / steps;
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(brng)
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(φ1),
        Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
      );
    coords.push([(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI]);
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
