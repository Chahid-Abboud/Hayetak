// resources/js/pages/Places.tsx
import { useEffect, useMemo, useState } from "react";
import { Head } from "@inertiajs/react";

// Use RELATIVE imports to avoid @ alias issues
import NavHeader from "../components/NavHeader";
import NearbyMap from "../components/NearbyMap";

// Local place type (keeps TS happy)
type Place = {
  id: string | number;
  name: string;
  lat: number;
  lon: number;
  type?: string;
  address?: string | null;
};

// ----- Lightweight local slider (avoids ElasticSlider filename case conflict) -----
function SimpleSlider({
  title = "Search radius",
  units = "km",
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
        className="h-2 w-full cursor-pointer appearance-none bg-transparent"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={title}
        style={{ WebkitAppearance: "none", appearance: "none" }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          height: 16px; width: 16px; border-radius: 9999px;
          background: var(--primary); border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25); margin-top: -7px;
        }
        input[type="range"]::-moz-range-thumb {
          height: 16px; width: 16px; border-radius: 9999px;
          background: var(--primary); border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        }
        input[type="range"]::-webkit-slider-runnable-track,
        input[type="range"]::-moz-range-track { height: 8px; background: var(--muted); border-radius: 9999px; }
      `}</style>
      <div className="mt-1 text-xs text-muted-foreground">
        Drag or use arrow keys ({step} {units} steps).
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------

const DEFAULT_RADIUS_KM = 2; // 2 km

export default function Places() {
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [showGym, setShowGym] = useState<boolean>(true);
  const [showNutri, setShowNutri] = useState<boolean>(true);

  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // geolocation
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // Locate once
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Geolocation not supported by this browser.");
      return;
    }
    setGeoMsg("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenter({ lat: latitude, lon: longitude });
        setGeoMsg(null);
      },
      (err) => {
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings."
            : "Could not get your location."
        );
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }, []);

  // quick counts by type
  const counts = useMemo(() => {
    return results.reduce(
      (acc, p) => {
        const t = (p.type ?? "").toLowerCase();
        if (t.includes("nutrition")) acc.nutritionist += 1;
        else acc.gym += 1;
        return acc;
      },
      { gym: 0, nutritionist: 0 }
    );
  }, [results]);

  // when filters change, show "Loading…" until next results callback
  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [radiusKm, showGym, showNutri]);

  return (
    <>
      <Head title="Nearby — Hayetak" />
      <NavHeader />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Nearby</h1>
            <p className="text-sm text-muted-foreground">
              Explore gyms and nutritionists around you.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading…" : error ? <span className="text-red-600">{error}</span> : `${results.length} results`}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-end gap-4 md:flex-nowrap">
          {/* Radius */}
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

          {/* Types */}
          <label className="min-w-[260px] flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">Types</span>
            <select
              value={showGym && showNutri ? "both" : showGym ? "gym" : showNutri ? "nutritionist" : "none"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "both") {
                  setShowGym(true);
                  setShowNutri(true);
                } else if (val === "gym") {
                  setShowGym(true);
                  setShowNutri(false);
                } else if (val === "nutritionist") {
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
              <option value="nutritionist">Nutritionists only</option>
              <option value="none">None</option>
            </select>
            {geoMsg && (
              <div className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                {geoMsg}
              </div>
            )}
          </label>

          {/* Counts */}
          <div className="min-w-[260px] flex-1">
            <div className="flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm">
              <span>
                <span className="font-semibold">{counts.gym}</span> gyms
              </span>
              <span>
                <span className="font-semibold">{counts.nutritionist}</span> nutritionists
              </span>
            </div>
          </div>
        </div>

        {/* Map + List */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-3">
            {center ? (
              <NearbyMap
                // No ref prop here (fixes: Property 'ref' does not exist on type 'Props')
                initialCenter={center}
                initialZoom={12}
                radiusKm={radiusKm}
                onRadiusChange={setRadiusKm}
                showGym={showGym}
                showNutritionist={showNutri}
                onToggleGym={setShowGym}
                onToggleNutritionist={setShowNutri}
                onResults={(list) => {
                  setResults(list as Place[]);
                  setLoading(false);
                }}
              />
            ) : (
              <div className="flex h-[480px] items-center justify-center rounded-xl border">
                <div className="text-sm text-muted-foreground">
                  {geoMsg ?? "Waiting for location permission…"}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Results</div>
              <ul className="max-h-[480px] space-y-2 overflow-auto pr-1">
                {results.length === 0 && !loading && !error && (
                  <li className="text-sm text-muted-foreground">
                    No places found in this radius.
                  </li>
                )}
                {results.map((p, i) => {
                  const key = `${p.id ?? `${p.name}-${i}`}`;
                  return (
                    <li
                      key={key}
                      className="cursor-pointer rounded-md border p-2 transition hover:bg-muted/40"
                      title="Show on map"
                      // If NearbyMap later exposes an imperative method, call it here.
                      onClick={() => {}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{p.name || "(no name)"}</div>
                        <div className="text-xs text-muted-foreground">{p.type || ""}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{p.address || ""}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
