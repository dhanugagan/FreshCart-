import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Info, LocateFixed, Navigation } from 'lucide-react';
import { AnimatedPageTransition, LoadingAnimation, ScooterDeliveryAnimation } from '../animations/MotionPrimitives';
import { ScooterBoy } from '../animations/ScooterBoy';
import { TrackingGoogleMap, type LatLngPoint } from '../components/maps/FreshCartMaps';
import { orderService } from '../services/orderService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import type { DeliveryTracking, Order } from '../types';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams();
  const { user, activeRider, activeRiderIndex, pushToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number>(id ? Number(id) : 0);
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);

  // Explicit, revocable user browser geolocation state
  const [useLiveLocation, setUseLiveLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'locating' | 'active' | 'denied' | 'unsupported' | 'error'
  >('idle');
  const [userLocation, setUserLocation] = useState<(LatLngPoint & { accuracy?: number }) | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stopLiveLocation = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setUseLiveLocation(false);
    setLocationStatus('idle');
  }, []);

  const handleToggleLiveLocation = useCallback(() => {
    if (useLiveLocation) {
      stopLiveLocation();
      pushToast('info', 'Stopped sharing live GPS location');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported');
      pushToast('error', 'Browser geolocation is unavailable on this device');
      return;
    }

    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0),
        };
        setUserLocation(coords);
        setUseLiveLocation(true);
        setLocationStatus('active');
        pushToast('success', 'Live GPS pinned! Routing delivery rider to your current location.');

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (update) => {
            setUserLocation({
              lat: Number(update.coords.latitude.toFixed(6)),
              lng: Number(update.coords.longitude.toFixed(6)),
              accuracy: Math.round(update.coords.accuracy || 0),
            });
          },
          () => {
            // Keep last known valid coords if subsequent watch tick fails
          },
          { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          pushToast('error', 'Location permission denied — showing order address pin instead.');
        } else {
          setLocationStatus('error');
          pushToast('error', 'Unable to determine current GPS location.');
        }
        setUseLiveLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 }
    );
  }, [useLiveLocation, stopLiveLocation, pushToast]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    orderService
      .getOrders()
      .then((list) => {
        setOrders(list);
        if (!id && list.length > 0) {
          setSelectedOrderId(list[0].id);
        } else if (list.length === 0) {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [user, id]);

  useEffect(() => {
    if (id) setSelectedOrderId(Number(id));
  }, [id]);

  useEffect(() => {
    if (!selectedOrderId || !user) return;
    setLoading(true);
    orderService
      .getTracking(selectedOrderId)
      .then((res) => {
        setOrder(res.order);
        setTracking(res.tracking);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const isServerlessHost =
      window.location.hostname.endsWith('.vercel.app') || window.location.hostname.endsWith('.vercel.sh');
    if (isServerlessHost) {
      const poller = window.setInterval(() => {
        orderService
          .getTracking(selectedOrderId)
          .then((res) => setTracking(res.tracking))
          .catch(() => {});
      }, 15_000);
      return () => window.clearInterval(poller);
    }

    // Real WebSocket subscription for server-pushed live route updates
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', orderId: selectedOrderId }));
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'tracking:update' && msg.payload?.orderId === selectedOrderId) {
          setTracking(msg.payload);
        }
      } catch {
        // ignore
      }
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [selectedOrderId, user]);

  const handleAdvanceRoute = async () => {
    if (!selectedOrderId) return;
    try {
      const next = await orderService.advanceTrackingDemo(selectedOrderId);
      setTracking(next);
      pushToast('info', `Delivery updated: ${next.currentStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  if (loading) return <LoadingAnimation label="Connecting to live Google Maps scooter route..." />;

  const isPreviewDemoTracking = !order || !tracking;
  const destLat = tracking?.destLat ?? order?.shippingAddress?.lat ?? 12.9716;
  const destLng = tracking?.destLng ?? order?.shippingAddress?.lng ?? 77.5946;
  const storeLat = tracking?.storeLat ?? destLat - 0.016;
  const storeLng = tracking?.storeLng ?? destLng - 0.02;
  const progressPercent = tracking?.progressPercent ?? 45;
  const etaMinutes = tracking?.etaMinutes ?? 12;
  const riderLat = tracking?.currentLat ?? storeLat + (destLat - storeLat) * (progressPercent / 100);
  const riderLng = tracking?.currentLng ?? storeLng + (destLng - storeLng) * (progressPercent / 100);
  const riderIdxForOrder = order ? order.id % 5 : activeRiderIndex;
  const driverLabel = tracking?.driverName || `${activeRider.name} (${activeRider.bikeName})`;
  const trackingStatus = tracking?.currentStatus || 'OUT_FOR_DELIVERY';

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Live Order Tracking</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {order ? (
                <>
                  Order <span className="font-mono font-semibold">{order.orderNumber}</span> · Assigned Rider: {driverLabel}
                </>
              ) : (
                <>
                  Live Vehicle Route Simulation · Rider: {driverLabel}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {orders.length > 1 && (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(Number(e.target.value))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {formatINR(o.totalAmount)} ({o.status})
                  </option>
                ))}
              </select>
            )}
            {!user && (
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Sign In for Order Sync
              </Link>
            )}
          </div>
        </div>

        {/* Consent & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              <strong>Live Route &amp; GPS Vehicle Simulation:</strong> Enable <em>Use My Current Location</em> to route the
              simulated delivery scooter directly to your live browser GPS coordinates, or watch the route from our hub.
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {userLocation && useLiveLocation && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-sky-900 dark:bg-slate-900/70 dark:text-sky-200">
                <LocateFixed className="h-3 w-3 text-sky-600" />
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                {userLocation.accuracy ? ` (±${userLocation.accuracy}m)` : ''}
              </span>
            )}
            {!isPreviewDemoTracking && trackingStatus !== 'DELIVERED' && trackingStatus !== 'CANCELLED' && (
              <button
                type="button"
                onClick={handleAdvanceRoute}
                data-testid="advance-tracking-demo"
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Advance Live Route Step</span>
              </button>
            )}
          </div>
        </div>

        {isPreviewDemoTracking && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/75 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <span>
              <strong>Preview Route Active:</strong> No active placed order selected yet — test the real-time GPS vehicle
              simulation below or place a fresh grocery order!
            </span>
            <Link
              to="/shop"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
            >
              Shop Essentials
            </Link>
          </div>
        )}

        {/* Live Google Map + Scooter Boy View */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 lg:col-span-8 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <TrackingGoogleMap
              storeLat={storeLat}
              storeLng={storeLng}
              destLat={destLat}
              destLng={destLng}
              riderLat={riderLat}
              riderLng={riderLng}
              riderName={driverLabel}
              progressPercent={progressPercent}
              etaMinutes={etaMinutes}
              bikeColor={activeRider.bikePrimary}
              userLocation={userLocation}
              useLiveLocation={useLiveLocation}
              locationStatus={locationStatus}
              onToggleLiveLocation={handleToggleLiveLocation}
            />
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white p-6 text-center lg:col-span-4 dark:border-emerald-950/60 dark:from-emerald-950/30 dark:to-[#131C17]">
            <div className="w-48">
              <ScooterBoy
                riderIndex={riderIdxForOrder}
                mood={trackingStatus === 'DELIVERED' ? 'celebrate' : trackingStatus === 'CANCELLED' ? 'sad' : 'riding'}
                boxOpen={trackingStatus === 'DELIVERED'}
                headlightOn={trackingStatus !== 'CANCELLED'}
                speechBubble={
                  trackingStatus === 'DELIVERED'
                    ? 'Fresh groceries delivered!'
                    : useLiveLocation
                      ? 'Heading straight to your live GPS!'
                      : `Arriving in ~${etaMinutes} mins`
                }
              />
            </div>
            <div className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
              {trackingStatus.replace(/_/g, ' ')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono-nums text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{etaMinutes > 0 ? `ETA ~${etaMinutes} mins` : 'Arrived at Doorstep'}</span>
            </div>
          </div>
        </div>

        {/* Animated Route Bar */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <ScooterDeliveryAnimation progressPercent={progressPercent} />
          <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
            <span>FreshCart Neighborhood Hub</span>
            <span>
              {useLiveLocation && userLocation
                ? `Live User GPS (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`
                : order
                  ? `${order.shippingAddress.street}, ${order.shippingAddress.city} (${order.shippingAddress.postalCode})`
                  : 'Bengaluru Indiranagar Pin (560001)'}
            </span>
          </div>
        </div>

        {/* 6-Stage Timeline */}
        {tracking && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="mb-4 font-display text-lg font-bold">Delivery Timeline</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tracking.timeline.map((step, idx) => (
                <div
                  key={step.status}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    step.completed
                      ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/25'
                      : 'border-slate-100 bg-slate-50/60 opacity-65 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${step.completed ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Step {idx + 1}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{step.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
