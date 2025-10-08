import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { Map, LngLatLike, MapLayerMouseEvent } from "mapbox-gl";
// import "mapbox-gl/dist/mapbox-gl.css"; // ensure this is imported once in your app

type Place = {
  id: string | number;
  name: string;
  lat: number;
  lon: number;
  type?: "gym" | "nutritionist" | "other";
  address?: string | null;
};

type Props = {
  accessToken?: string;              // if not set, will try window.MAPBOX_TOKEN or meta tag
  initialCenter?: { lat: number; lon: number };
  initialZoom?: number;
  radiusKm: number;                  // controlled from ElasticSlider
  onRadiusChange?: (km: number) => void;
  showGym?: boolean;
  showNutritionist?: boolean;
  onToggleGym?: (v: boolean) => void;
  onToggleNutritionist?: (v: boolean) => void;
  onResults?: (items: Place[]) => void;
};

const DEFAULT_CENTER = { lat: 33.8938, lon: 35.5018 }; // Beirut

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
}: Props) {
  // Resolve token
  const token =
    accessToken ||
    (window as any)?.MAPBOX_TOKEN ||
    document
      .querySelector('meta[name="mapbox-token"]')
      ?.getAttribute("content") ||
    "";

  const mapRef = useRef<Map | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const [center, setCenter] = useState(initialCenter);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prepare URL for API fetch
  const typesParam = useMemo(() => {
    const t: string[] = [];
    if (showGym) t.push("gym");
    if (showNutritionist) t.push("nutritionist");
    return t.join(",");
  }, [showGym, showNutritionist]);

  const fetchController = useRef<AbortController | null>(null);
  const fetchPlaces = useCallback(
    async (c: { lat: number; lon: number }, rKm: number) => {
      if (!typesParam) {
        setPlaces([]);
        onResults?.([]);
        return;
      }
      setLoading(true);
      setError(null);

      // abort previous
      fetchController.current?.abort();
      fetchController.current = new AbortController();

      const qs = new URLSearchParams({
        lat: String(c.lat),
        lon: String(c.lon),
        radius_km: String(rKm),
        types: typesParam,
      }).toString();

      try {
        const res = await fetch(`/api/places?${qs}`, {
          signal: fetchController.current.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Expecting { features: [{ id, name, lat, lon, type, address }] } or plain array
        const list: Place[] = Array.isArray(data?.features)
          ? data.features.map(normalizeFeature)
          : Array.isArray(data)
          ? data.map(normalizeFeature)
          : [];

        setPlaces(list);
        onResults?.(list);
      } catch (e: any) {
        if (e.name !== "AbortError") setError(String(e.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [typesParam, onResults]
  );

  // init map
  useEffect(() => {
    if (!divRef.current) return;
    if (mapRef.current) return;

    if (!token) {
      console.warn("Mapbox token missing. Set window.MAPBOX_TOKEN or <meta name='mapbox-token'>.");
    }
    mapboxgl.accessToken = token;

    const m = new mapboxgl.Map({
      container: divRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialCenter.lon, initialCenter.lat] as LngLatLike,
      zoom: initialZoom,
    });
    mapRef.current = m;

    // controls
    m.addControl(new mapboxgl.NavigationControl(), "top-right");
    const geo = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showAccuracyCircle: false,
    });
    m.addControl(geo, "top-right");

    m.on("load", () => {
      addSourcesAndLayers(m);
      drawRadiusCircle(m, center, radiusKm);
      updatePlacesLayer(m, places);
    });

    // move handler (debounced fetch)
    let raf = 0;
    const handleMoveEnd = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const c = m.getCenter();
        const newCenter = { lat: c.lat, lon: c.lng };
        setCenter(newCenter);
      });
    };
    m.on("moveend", handleMoveEnd);

    // click popup
    m.on("click", "places-unclustered", (e: MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const props: any = feat.properties || {};
      const coordinates = (feat.geometry as any).coordinates.slice() as [number, number];
      const name = props.name || "Unknown";
      const address = props.address || "";
      new mapboxgl.Popup({ closeOnMove: true })
        .setLngLat(coordinates)
        .setHTML(
          `<div style="font-weight:600">${escapeHtml(name)}</div>
           <div style="font-size:12px;color:#555">${escapeHtml(address)}</div>`
        )
        .addTo(m);
    });

    return () => {
      raf && cancelAnimationFrame(raf);
      m.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line

  // fetch when center/radius/types change
  useEffect(() => {
    fetchPlaces(center, radiusKm);
  }, [center.lat, center.lon, radiusKm, typesParam]); // eslint-disable-line

  // redraw radius circle and data layers when inputs change
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    drawRadiusCircle(m, center, radiusKm);
    updatePlacesLayer(m, places);
  }, [center, radiusKm, places]);

  // external toggles
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    // simple visibility toggle via filter
    const types = [];
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

  return (
    <div className="relative">
      {/* toolbar */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-xl border bg-card/90 p-2 shadow">
        <button
          type="button"
          onClick={() => {
            if (onToggleGym) onToggleGym(!showGym);
          }}
          className={`rounded-lg px-2 py-1 text-xs font-medium border ${
            showGym ? "bg-emerald-500 text-white border-emerald-600" : "bg-background text-foreground border-border"
          }`}
          aria-pressed={showGym}
        >
          Gyms
        </button>
        <button
          type="button"
          onClick={() => {
            if (onToggleNutritionist) onToggleNutritionist(!showNutritionist);
          }}
          className={`rounded-lg px-2 py-1 text-xs font-medium border ${
            showNutritionist ? "bg-blue-600 text-white border-blue-700" : "bg-background text-foreground border-border"
          }`}
          aria-pressed={showNutritionist}
        >
          Nutritionists
        </button>
      </div>

      {/* map */}
      <div ref={divRef} className="h-[480px] w-full rounded-2xl border shadow-sm" />

      {/* footer status */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Center: {center.lat.toFixed(5)}, {center.lon.toFixed(5)} · Radius: {radiusKm} km
        </div>
        <div>
          {loading ? "Loading…" : error ? <span className="text-red-600">Error: {error}</span> : `${places.length} places`}
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function normalizeFeature(raw: any): Place {
  return {
    id: raw.id ?? raw._id ?? `${raw.lat},${raw.lon}`,
    name: raw.name ?? raw.properties?.name ?? "Unknown",
    lat: Number(raw.lat ?? raw.geometry?.coordinates?.[1] ?? 0),
    lon: Number(raw.lon ?? raw.geometry?.coordinates?.[0] ?? 0),
    type:
      (raw.type ??
        raw.category ??
        raw.properties?.type ??
        raw.properties?.category) || "other",
    address: raw.address ?? raw.properties?.address ?? null,
  };
}

function addSourcesAndLayers(map: Map) {
  // places source (empty GeoJSON; we’ll setData later)
  if (!map.getSource("places")) {
    map.addSource("places", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 60,
    });
  }

  // clusters
  if (!map.getLayer("clusters")) {
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "places",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#7dd3fc", 10,
          "#60a5fa", 25,
          "#4f46e5",
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          16, 10, 20, 25, 28,
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  if (!map.getLayer("cluster-count")) {
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "places",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  // unclustered points
  if (!map.getLayer("places-unclustered")) {
    map.addLayer({
      id: "places-unclustered",
      type: "circle",
      source: "places",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "match",
          ["get", "type"],
          "gym",
          "#10b981", // emerald
          "nutritionist",
          "#2563eb", // blue
          /* other */ "#a78bfa", // violet
        ],
        "circle-radius": 6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  // radius fill + stroke
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
  const fc = {
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
  } as GeoJSON.FeatureCollection;
  src.setData(fc);
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

/**
 * Creates a GeoJSON polygon approximating a circle using the Haversine formula.
 */
function circlePolygon(lon: number, lat: number, radiusKm: number, steps = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const d = radiusKm / 6371; // angular distance (Earth radius in km)
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
