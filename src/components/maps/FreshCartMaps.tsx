import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Bike,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Store,
} from 'lucide-react';

export const INDIA_CITY_HUBS = [
  { name: 'Bengaluru', state: 'Karnataka', postalCode: '560001', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', state: 'Maharashtra', postalCode: '400050', lat: 19.076, lng: 72.8777 },
  { name: 'New Delhi', state: 'Delhi', postalCode: '110001', lat: 28.6139, lng: 77.209 },
  { name: 'Hyderabad', state: 'Telangana', postalCode: '500081', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', state: 'Tamil Nadu', postalCode: '600020', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', state: 'Maharashtra', postalCode: '411004', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', state: 'West Bengal', postalCode: '700016', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', state: 'Gujarat', postalCode: '380009', lat: 23.0225, lng: 72.5714 },
];

export const HAS_GOOGLE_MAPS_KEY = Boolean(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY && String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY).trim().length > 0
);

export interface LatLngPoint {
  lat: number;
  lng: number;
}

function haversineKm(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildCurvedFallbackPath(origin: LatLngPoint, destination: LatLngPoint, segments = 28): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI) * 0.0022;
    const zig = Math.sin(t * Math.PI * 2) * 0.0008;
    points.push({
      lat: origin.lat + dLat * t + wave,
      lng: origin.lng + dLng * t - wave * 0.7 + zig,
    });
  }
  return points;
}

function interpolateAlongPath(path: LatLngPoint[], fraction: number): { pos: LatLngPoint; bearingDeg: number } {
  if (path.length === 0) return { pos: { lat: 12.9716, lng: 77.5946 }, bearingDeg: 0 };
  if (path.length === 1) return { pos: path[0], bearingDeg: 0 };

  const clamped = Math.max(0, Math.min(1, fraction));
  const scaled = clamped * (path.length - 1);
  const idx = Math.min(path.length - 2, Math.floor(scaled));
  const localT = scaled - idx;
  const p1 = path[idx];
  const p2 = path[idx + 1];

  const lat = p1.lat + (p2.lat - p1.lat) * localT;
  const lng = p1.lng + (p2.lng - p1.lng) * localT;
  const dy = p2.lat - p1.lat;
  const dx = p2.lng - p1.lng;
  const bearingDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return { pos: { lat, lng }, bearingDeg };
}

interface AddressPickerGoogleMapProps {
  lat: number;
  lng: number;
  cityLabel?: string;
  onSelectCoords: (lat: number, lng: number, hubCity?: (typeof INDIA_CITY_HUBS)[number]) => void;
}

export const AddressPickerGoogleMap: React.FC<AddressPickerGoogleMapProps> = ({
  lat,
  lng,
  cityLabel = 'Delivery Pin',
  onSelectCoords,
}) => {
  const status = useApiLoadingStatus();
  const [infoOpen, setInfoOpen] = useState(false);

  const canRenderGoogleMap =
    HAS_GOOGLE_MAPS_KEY && status !== APILoadingStatus.FAILED && status !== APILoadingStatus.AUTH_FAILURE;

  const position = useMemo(() => ({ lat, lng }), [lat, lng]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <MapPin className="h-3.5 w-3.5" />
          Tap map or select an Indian city hub to pin exact doorstep GPS
        </span>
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
        </span>
      </div>

      {/* Quick Indian Hub Chips */}
      <div className="flex flex-wrap gap-1.5">
        {INDIA_CITY_HUBS.map((hub) => {
          const active = Math.abs(lat - hub.lat) < 0.08 && Math.abs(lng - hub.lng) < 0.08;
          return (
            <button
              key={hub.name}
              type="button"
              onClick={() => onSelectCoords(hub.lat, hub.lng, hub)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {hub.name}
            </button>
          );
        })}
      </div>

      {/* Explicit container height for Google Map */}
      <div className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-emerald-200 shadow-inner dark:border-emerald-900/50">
        {canRenderGoogleMap ? (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            center={position}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            onClick={(ev) => {
              const ll = ev.detail.latLng;
              if (ll) {
                onSelectCoords(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
              }
            }}
          >
            <AdvancedMarker position={position} onClick={() => setInfoOpen(true)}>
              <Pin background="#059669" borderColor="#064E3B" glyphColor="#FFFFFF" />
            </AdvancedMarker>
            {infoOpen && (
              <InfoWindow position={position} onCloseClick={() => setInfoOpen(false)}>
                <div className="p-1 text-xs font-semibold text-slate-800">
                  <p className="font-bold text-emerald-700">{cityLabel}</p>
                  <p className="text-[11px] text-slate-500">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const rx = (e.clientX - rect.left) / rect.width - 0.5;
              const ry = 0.5 - (e.clientY - rect.top) / rect.height;
              onSelectCoords(Number((lat + ry * 0.04).toFixed(6)), Number((lng + rx * 0.04).toFixed(6)));
            }}
            className="relative flex h-full w-full cursor-crosshair flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 p-4 text-center dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(16,185,129,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.2) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-2 rounded-2xl border border-emerald-200/80 bg-white/90 px-5 py-4 shadow-md dark:border-emerald-800/60 dark:bg-slate-900/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{cityLabel}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click anywhere on this grid to fine-tune pin coordinates ({lat.toFixed(4)}, {lng.toFixed(4)})
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface MapsPolylineInstance {
  setMap: (map: unknown | null) => void;
  setOptions: (opts: { strokeColor?: string; strokeOpacity?: number; strokeWeight?: number }) => void;
}

interface RouteOverlayControllerProps {
  origin: LatLngPoint;
  destination: LatLngPoint;
  vehiclePos: LatLngPoint;
  followVehicle: boolean;
  onRouteResolved: (path: LatLngPoint[], distanceMeters: number, durationMillis: number) => void;
}

const RouteOverlayController: React.FC<RouteOverlayControllerProps> = ({
  origin,
  destination,
  vehiclePos,
  followVehicle,
  onRouteResolved,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<MapsPolylineInstance[]>([]);
  const lastPanRef = useRef<number>(0);

  useEffect(() => {
    if (!routesLib || !map) return;
    let cancelled = false;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    const routesApi = (routesLib as unknown as { Route?: { computeRoutes?: (req: unknown) => Promise<{ routes?: any[] }> } }).Route;
    if (!routesApi || typeof routesApi.computeRoutes !== 'function') {
      return undefined;
    }

    routesApi
      .computeRoutes(request)
      .then((res) => {
        if (cancelled) return;
        const primaryRoute = res?.routes?.[0];
        if (!primaryRoute) return;

        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines: MapsPolylineInstance[] = primaryRoute.createPolylines();
          newPolylines.forEach((polyline) => {
            polyline.setOptions({
              strokeColor: '#059669',
              strokeOpacity: 0.85,
              strokeWeight: 5,
            });
            polyline.setMap(map);
          });
          polylinesRef.current = newPolylines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const rawPath: any[] = Array.isArray(primaryRoute.path) ? primaryRoute.path : [];
        const convertedPath: LatLngPoint[] = rawPath
          .map((pt) => {
            if (!pt) return null;
            const latVal = typeof pt.lat === 'function' ? pt.lat() : Number(pt.lat);
            const lngVal = typeof pt.lng === 'function' ? pt.lng() : Number(pt.lng);
            if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) return null;
            return { lat: latVal, lng: lngVal };
          })
          .filter((pt): pt is LatLngPoint => pt !== null);

        if (convertedPath.length >= 2) {
          onRouteResolved(
            convertedPath,
            Number(primaryRoute.distanceMeters || 0),
            Number(primaryRoute.durationMillis || 0)
          );
        }
      })
      .catch(() => {
        // Fallback path interpolation stays active cleanly if Routes API fails or quota is reached
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng, onRouteResolved]);

  useEffect(() => {
    if (!map || !followVehicle) return;
    const now = Date.now();
    if (now - lastPanRef.current < 450) return;
    lastPanRef.current = now;
    map.panTo(vehiclePos);
  }, [map, followVehicle, vehiclePos.lat, vehiclePos.lng]);

  return null;
};

interface TrackingGoogleMapProps {
  storeLat: number;
  storeLng: number;
  destLat: number;
  destLng: number;
  riderLat: number;
  riderLng: number;
  riderName: string;
  progressPercent: number;
  etaMinutes: number;
  bikeColor?: string;
  userLocation?: (LatLngPoint & { accuracy?: number }) | null;
  useLiveLocation?: boolean;
  locationStatus?: 'idle' | 'locating' | 'active' | 'denied' | 'unsupported' | 'error';
  onToggleLiveLocation?: () => void;
}

export const TrackingGoogleMap: React.FC<TrackingGoogleMapProps> = ({
  storeLat,
  storeLng,
  destLat,
  destLng,
  riderName,
  progressPercent,
  etaMinutes,
  bikeColor = '#10B981',
  userLocation = null,
  useLiveLocation = false,
  locationStatus = 'idle',
  onToggleLiveLocation,
}) => {
  const status = useApiLoadingStatus();
  const [selectedPin, setSelectedPin] = useState<'store' | 'rider' | 'dest' | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 4>(1);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [roadPath, setRoadPath] = useState<LatLngPoint[] | null>(null);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);

  const canRenderGoogleMap =
    HAS_GOOGLE_MAPS_KEY && status !== APILoadingStatus.FAILED && status !== APILoadingStatus.AUTH_FAILURE;

  // Destination resolves to user's live GPS location when explicit consent is enabled
  const effectiveDestPos = useMemo<LatLngPoint>(() => {
    if (useLiveLocation && userLocation) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    return { lat: destLat, lng: destLng };
  }, [useLiveLocation, userLocation, destLat, destLng]);

  // Keep a realistic local neighborhood micro-hub within ~2.4km when user's live GPS is in another region
  const effectiveStorePos = useMemo<LatLngPoint>(() => {
    const rawStore = { lat: storeLat, lng: storeLng };
    const dist = haversineKm(rawStore, effectiveDestPos);
    if (dist > 35 || dist < 0.15) {
      return {
        lat: Number((effectiveDestPos.lat - 0.015).toFixed(6)),
        lng: Number((effectiveDestPos.lng - 0.018).toFixed(6)),
      };
    }
    return rawStore;
  }, [storeLat, storeLng, effectiveDestPos]);

  useEffect(() => {
    setRoadPath(null);
    setRouteDistanceMeters(null);
  }, [effectiveStorePos.lat, effectiveStorePos.lng, effectiveDestPos.lat, effectiveDestPos.lng]);

  const activeRoutePath = useMemo(() => {
    if (roadPath && roadPath.length >= 2) return roadPath;
    return buildCurvedFallbackPath(effectiveStorePos, effectiveDestPos, 32);
  }, [roadPath, effectiveStorePos, effectiveDestPos]);

  const initialFraction = useMemo(() => {
    const clamped = Math.max(5, Math.min(95, progressPercent));
    return clamped >= 95 ? 0.08 : clamped / 100;
  }, [progressPercent]);

  const [simFraction, setSimFraction] = useState<number>(initialFraction);

  useEffect(() => {
    setSimFraction(initialFraction);
  }, [initialFraction, effectiveDestPos.lat, effectiveDestPos.lng]);

  useEffect(() => {
    if (!isSimulating) return;
    let lastTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      setSimFraction((prev) => {
        const next = prev + dt * 0.038 * simSpeed;
        return next >= 1 ? 0.02 : next;
      });
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isSimulating, simSpeed]);

  const { pos: simRiderPos, bearingDeg } = useMemo(
    () => interpolateAlongPath(activeRoutePath, simFraction),
    [activeRoutePath, simFraction]
  );

  const totalDistanceKm = useMemo(() => {
    if (routeDistanceMeters && routeDistanceMeters > 0) return routeDistanceMeters / 1000;
    return Math.max(0.8, haversineKm(effectiveStorePos, effectiveDestPos));
  }, [routeDistanceMeters, effectiveStorePos, effectiveDestPos]);

  const liveProgress = Math.round(simFraction * 100);
  const remainingKm = Math.max(0, totalDistanceKm * (1 - simFraction));
  const liveEta = liveProgress >= 99 ? 0 : Math.max(1, Math.round((etaMinutes || 12) * (1 - simFraction)));

  const handleRouteResolved = useMemo(
    () => (path: LatLngPoint[], distanceMeters: number) => {
      setRoadPath(path);
      setRouteDistanceMeters(distanceMeters);
    },
    []
  );

  const shortRiderName = riderName.split('(')[0].trim();

  return (
    <div className="space-y-3">
      {/* Map Status + Vehicle Simulation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <Store className="h-3.5 w-3.5" /> Micro-Hub
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <Bike className="h-3.5 w-3.5" /> {shortRiderName}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
            <Navigation className="h-3.5 w-3.5" />{' '}
            {useLiveLocation && userLocation ? 'Your Live GPS Pin' : 'Delivery Doorstep Pin'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {remainingKm.toFixed(2)} km left
          </span>
          <span
            data-testid="live-tracking-eta"
            className="rounded-lg bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
          >
            {liveProgress}% · ETA {liveEta === 0 ? 'Arriving Now!' : `${liveEta} min`}
          </span>
        </div>
      </div>

      {/* Interactive Simulation & Current Location Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/25">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSimulating((s) => !s)}
            data-testid="toggle-vehicle-sim"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white transition hover:bg-emerald-800"
          >
            {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isSimulating ? 'Pause Vehicle' : 'Drive Vehicle'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSimFraction(0.02);
              setIsSimulating(true);
            }}
            data-testid="replay-vehicle-sim"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay</span>
          </button>

          <div className="inline-flex items-center rounded-lg border border-emerald-200 bg-white p-0.5 dark:border-emerald-800 dark:bg-slate-900">
            {([1, 2, 4] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  simSpeed === spd
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-emerald-700 dark:text-slate-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {canRenderGoogleMap && (
            <button
              type="button"
              onClick={() => setFollowVehicle((f) => !f)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-semibold transition ${
                followVehicle
                  ? 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'border-emerald-200 bg-white text-slate-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>{followVehicle ? 'Following Vehicle' : 'Follow'}</span>
            </button>
          )}
        </div>

        {onToggleLiveLocation && (
          <button
            type="button"
            onClick={onToggleLiveLocation}
            data-testid="toggle-live-location"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition ${
              useLiveLocation
                ? 'border-sky-500 bg-sky-600 text-white shadow-xs hover:bg-sky-700'
                : 'border-sky-300 bg-white text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300'
            }`}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            <span>
              {locationStatus === 'locating'
                ? 'Locating GPS...'
                : useLiveLocation
                  ? 'Using My GPS (Tap to Stop)'
                  : 'Use My Current Location'}
            </span>
          </button>
        )}
      </div>

      {/* Explicit container height for Google Map */}
      <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-emerald-200 shadow-inner dark:border-emerald-900/50">
        {canRenderGoogleMap ? (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={simRiderPos}
            defaultZoom={14}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <RouteOverlayController
              origin={effectiveStorePos}
              destination={effectiveDestPos}
              vehiclePos={simRiderPos}
              followVehicle={followVehicle}
              onRouteResolved={handleRouteResolved}
            />

            <AdvancedMarker position={effectiveStorePos} onClick={() => setSelectedPin('store')}>
              <Pin background="#0F766E" borderColor="#134E4A" glyphColor="#CCFBF1" />
            </AdvancedMarker>

            {/* Simulated Moving Delivery Vehicle Marker */}
            <AdvancedMarker position={simRiderPos} zIndex={999} onClick={() => setSelectedPin('rider')}>
              <div className="relative flex items-center justify-center">
                <span
                  style={{ backgroundColor: bikeColor }}
                  className="absolute h-12 w-12 animate-ping rounded-full opacity-30"
                />
                <div
                  style={{
                    borderColor: bikeColor,
                    transform: `rotate(${Math.max(-25, Math.min(25, bearingDeg * 0.2))}deg)`,
                  }}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 bg-white shadow-xl"
                >
                  <span className="text-xl" aria-label="Delivery Scooter">
                    🛵
                  </span>
                </div>
              </div>
            </AdvancedMarker>

            {/* Destination or User Live Current Location Marker */}
            <AdvancedMarker position={effectiveDestPos} zIndex={500} onClick={() => setSelectedPin('dest')}>
              {useLiveLocation && userLocation ? (
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-10 w-10 animate-ping rounded-full bg-sky-400/45" />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>
                </div>
              ) : (
                <Pin background="#E11D48" borderColor="#881337" glyphColor="#FFE4E6" />
              )}
            </AdvancedMarker>

            {selectedPin && (
              <InfoWindow
                position={
                  selectedPin === 'store' ? effectiveStorePos : selectedPin === 'rider' ? simRiderPos : effectiveDestPos
                }
                onCloseClick={() => setSelectedPin(null)}
              >
                <div className="p-1 text-xs text-slate-800">
                  {selectedPin === 'store' && (
                    <p className="font-bold text-teal-700">FreshCart Neighborhood Micro-Hub</p>
                  )}
                  {selectedPin === 'rider' && (
                    <>
                      <p className="font-bold text-emerald-700">{riderName}</p>
                      <p>
                        {liveProgress}% complete · {remainingKm.toFixed(2)} km away · ETA {liveEta} min
                      </p>
                    </>
                  )}
                  {selectedPin === 'dest' && (
                    <p className="font-bold text-rose-700">
                      {useLiveLocation && userLocation ? 'Your Current GPS Location' : 'Delivery Doorstep Pin'}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          /* Interactive Fallback SVG Road Network + Animated Vehicle Canvas when Maps JS unavailable */
          <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 p-4 dark:from-slate-900 dark:via-emerald-950/35 dark:to-slate-900">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span className="rounded-lg bg-white/85 px-2.5 py-1 shadow-xs dark:bg-slate-900/80">
                Hub: {effectiveStorePos.lat.toFixed(4)}°, {effectiveStorePos.lng.toFixed(4)}°
              </span>
              <span className="rounded-lg bg-white/85 px-2.5 py-1 shadow-xs dark:bg-slate-900/80">
                {useLiveLocation && userLocation ? 'Your GPS' : 'Drop'}: {effectiveDestPos.lat.toFixed(4)}°,{' '}
                {effectiveDestPos.lng.toFixed(4)}°
              </span>
            </div>

            <svg viewBox="0 0 600 220" className="my-auto h-48 w-full overflow-visible">
              <defs>
                <linearGradient id="fcFallbackRoute" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0F766E" />
                  <stop offset="100%" stopColor={bikeColor} />
                </linearGradient>
              </defs>
              {/* Subtle Neighborhood Streets */}
              <g stroke="#CBD5E1" strokeOpacity="0.45" strokeWidth="1.5">
                <line x1="20" y1="55" x2="580" y2="55" />
                <line x1="20" y1="115" x2="580" y2="115" />
                <line x1="20" y1="175" x2="580" y2="175" />
                <line x1="120" y1="20" x2="120" y2="205" />
                <line x1="300" y1="20" x2="300" y2="205" />
                <line x1="480" y1="20" x2="480" y2="205" />
              </g>
              {/* Road Route Path */}
              <path
                d="M 55 165 Q 170 50, 300 118 T 545 65"
                fill="none"
                stroke="#94A3B8"
                strokeOpacity="0.35"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 55 165 Q 170 50, 300 118 T 545 65"
                fill="none"
                stroke="url(#fcFallbackRoute)"
                strokeWidth="5"
                strokeDasharray="10 6"
                strokeLinecap="round"
              />
              {/* Store Pin */}
              <g transform="translate(55, 165)">
                <circle r="13" fill="#0F766E" stroke="#FFFFFF" strokeWidth="3" />
                <text y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0F766E">
                  HUB
                </text>
              </g>
              {/* Destination / User Live Location Pin */}
              <g transform="translate(545, 65)">
                <circle r="18" fill={useLiveLocation && userLocation ? '#38BDF8' : '#FB7185'} opacity="0.25" />
                <circle
                  r="12"
                  fill={useLiveLocation && userLocation ? '#0284C7' : '#E11D48'}
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />
                <text y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0F172A">
                  {useLiveLocation && userLocation ? 'YOU' : 'DROP'}
                </text>
              </g>
              {/* Animated Vehicle along Quadratic Bezier Curves */}
              {(() => {
                const t = simFraction;
                let vx = 55;
                let vy = 165;
                if (t <= 0.5) {
                  const u = t * 2;
                  vx = (1 - u) * (1 - u) * 55 + 2 * (1 - u) * u * 170 + u * u * 300;
                  vy = (1 - u) * (1 - u) * 165 + 2 * (1 - u) * u * 50 + u * u * 118;
                } else {
                  const u = (t - 0.5) * 2;
                  vx = (1 - u) * (1 - u) * 300 + 2 * (1 - u) * u * 430 + u * u * 545;
                  vy = (1 - u) * (1 - u) * 118 + 2 * (1 - u) * u * 186 + u * u * 65;
                }
                return (
                  <g transform={`translate(${vx}, ${vy})`}>
                    <circle r="22" fill={bikeColor} opacity="0.2" />
                    <circle r="16" fill="#FFFFFF" stroke={bikeColor} strokeWidth="3" />
                    <text y="6" textAnchor="middle" fontSize="17">
                      🛵
                    </text>
                  </g>
                );
              })()}
            </svg>

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>
                {shortRiderName} live at {simRiderPos.lat.toFixed(4)}° N, {simRiderPos.lng.toFixed(4)}° E
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                Speed: {simSpeed}x · {isSimulating ? 'Moving Live' : 'Paused'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
