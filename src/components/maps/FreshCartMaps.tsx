import React, { useMemo, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Store, Bike } from 'lucide-react';

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
}

export const TrackingGoogleMap: React.FC<TrackingGoogleMapProps> = ({
  storeLat,
  storeLng,
  destLat,
  destLng,
  riderLat,
  riderLng,
  riderName,
  progressPercent,
  etaMinutes,
  bikeColor = '#10B981',
}) => {
  const status = useApiLoadingStatus();
  const [selectedPin, setSelectedPin] = useState<'store' | 'rider' | 'dest' | null>(null);

  const canRenderGoogleMap =
    HAS_GOOGLE_MAPS_KEY && status !== APILoadingStatus.FAILED && status !== APILoadingStatus.AUTH_FAILURE;

  const storePos = useMemo(() => ({ lat: storeLat, lng: storeLng }), [storeLat, storeLng]);
  const riderPos = useMemo(() => ({ lat: riderLat, lng: riderLng }), [riderLat, riderLng]);
  const destPos = useMemo(() => ({ lat: destLat, lng: destLng }), [destLat, destLng]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <Store className="h-3.5 w-3.5" /> FreshCart Hub
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <Bike className="h-3.5 w-3.5" /> {riderName.split('(')[0].trim()}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
            <Navigation className="h-3.5 w-3.5" /> Customer Pin
          </span>
        </div>
        <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
          {progressPercent}% · ETA {etaMinutes === 0 ? 'Arrived!' : `${etaMinutes} min`}
        </span>
      </div>

      {/* Explicit container height for Google Map */}
      <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-emerald-200 shadow-inner dark:border-emerald-900/50">
        {canRenderGoogleMap ? (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            center={riderPos}
            defaultZoom={13}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <AdvancedMarker position={storePos} onClick={() => setSelectedPin('store')}>
              <Pin background="#0F766E" borderColor="#134E4A" glyphColor="#CCFBF1" />
            </AdvancedMarker>

            <AdvancedMarker position={riderPos} zIndex={999} onClick={() => setSelectedPin('rider')}>
              <div
                style={{ borderColor: bikeColor }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white shadow-lg"
              >
                <span className="text-lg">🛵</span>
              </div>
            </AdvancedMarker>

            <AdvancedMarker position={destPos} onClick={() => setSelectedPin('dest')}>
              <Pin background="#E11D48" borderColor="#881337" glyphColor="#FFE4E6" />
            </AdvancedMarker>

            {selectedPin && (
              <InfoWindow
                position={selectedPin === 'store' ? storePos : selectedPin === 'rider' ? riderPos : destPos}
                onCloseClick={() => setSelectedPin(null)}
              >
                <div className="p-1 text-xs text-slate-800">
                  {selectedPin === 'store' && <p className="font-bold text-teal-700">FreshCart Dark Store Hub</p>}
                  {selectedPin === 'rider' && (
                    <>
                      <p className="font-bold text-emerald-700">{riderName}</p>
                      <p>Progress: {progressPercent}% · ETA {etaMinutes} mins</p>
                    </>
                  )}
                  {selectedPin === 'dest' && <p className="font-bold text-rose-700">Delivery Doorstep Pin</p>}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 p-5 dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Hub: {storeLat.toFixed(3)}, {storeLng.toFixed(3)}</span>
              <span>Drop: {destLat.toFixed(3)}, {destLng.toFixed(3)}</span>
            </div>
            <div className="relative my-auto h-3 rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                style={{ width: `${Math.max(8, progressPercent)}%`, backgroundColor: bikeColor }}
                className="h-full rounded-full transition-all duration-500"
              />
              <div
                style={{ left: `calc(${Math.min(92, Math.max(4, progressPercent))}% - 18px)` }}
                className="absolute -top-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 bg-white shadow-md transition-all duration-500"
              >
                🛵
              </div>
            </div>
            <div className="text-center text-xs font-medium text-slate-600 dark:text-slate-400">
              {riderName} is at {riderLat.toFixed(4)}° N, {riderLng.toFixed(4)}° E
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
