import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Info, Navigation } from 'lucide-react';
import { AnimatedPageTransition, LoadingAnimation, ScooterDeliveryAnimation } from '../animations/MotionPrimitives';
import { ScooterBoy } from '../animations/ScooterBoy';
import { TrackingGoogleMap } from '../components/maps/FreshCartMaps';
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    orderService.getOrders().then((list) => {
      setOrders(list);
      if (!id && list.length > 0) {
        setSelectedOrderId(list[0].id);
      } else if (list.length === 0) {
        setLoading(false);
      }
    });
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

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <h1 className="font-display text-2xl font-bold">Sign In to Track Deliveries</h1>
        <Link to="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingAnimation label="Connecting to live Google Maps scooter route..." />;

  if (!order || !tracking) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <div className="mx-auto w-48">
          <ScooterBoy riderIndex={activeRiderIndex} mood="sad" speechBubble="No active route yet — order something fresh!" />
        </div>
        <h1 className="mt-3 font-display text-xl font-bold">No Active Orders to Track</h1>
        <p className="mt-2 text-sm text-slate-500">Place an order to watch our FreshCart rider deliver your groceries live on Google Maps.</p>
        <Link to="/shop" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          Start Shopping
        </Link>
      </div>
    );
  }

  const destLat = tracking.destLat ?? order.shippingAddress.lat ?? 12.9716;
  const destLng = tracking.destLng ?? order.shippingAddress.lng ?? 77.5946;
  const storeLat = tracking.storeLat ?? destLat - 0.022;
  const storeLng = tracking.storeLng ?? destLng - 0.026;
  const riderLat = tracking.currentLat ?? storeLat + (destLat - storeLat) * (tracking.progressPercent / 100);
  const riderLng = tracking.currentLng ?? storeLng + (destLng - storeLng) * (tracking.progressPercent / 100);
  const riderIdxForOrder = order.id % 5;

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Live Order Tracking</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Order <span className="font-mono font-semibold">{order.orderNumber}</span> · Assigned Rider: {tracking.driverName}
            </p>
          </div>

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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              <strong>Live Route &amp; WebSocket Telemetry:</strong> Coordinates update smoothly as your rider rides from the neighborhood hub to your doorstep.
            </span>
          </span>
          {tracking.currentStatus !== 'DELIVERED' && tracking.currentStatus !== 'CANCELLED' && (
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
              riderName={tracking.driverName}
              progressPercent={tracking.progressPercent}
              etaMinutes={tracking.etaMinutes}
              bikeColor={activeRider.bikePrimary}
            />
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white p-6 text-center lg:col-span-4 dark:border-emerald-950/60 dark:from-emerald-950/30 dark:to-[#131C17]">
            <div className="w-48">
              <ScooterBoy
                riderIndex={riderIdxForOrder}
                mood={tracking.currentStatus === 'DELIVERED' ? 'celebrate' : tracking.currentStatus === 'CANCELLED' ? 'sad' : 'riding'}
                boxOpen={tracking.currentStatus === 'DELIVERED'}
                headlightOn={tracking.currentStatus !== 'CANCELLED'}
                speechBubble={
                  tracking.currentStatus === 'DELIVERED'
                    ? 'Fresh groceries delivered!'
                    : `Arriving in ~${tracking.etaMinutes} mins`
                }
              />
            </div>
            <div className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
              {tracking.currentStatus.replace(/_/g, ' ')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono-nums text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{tracking.etaMinutes > 0 ? `ETA ~${tracking.etaMinutes} mins` : 'Arrived at Doorstep'}</span>
            </div>
          </div>
        </div>

        {/* Animated Route Bar */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <ScooterDeliveryAnimation progressPercent={tracking.progressPercent} />
          <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
            <span>FreshCart Neighborhood Hub</span>
            <span>
              {order.shippingAddress.street}, {order.shippingAddress.city} ({order.shippingAddress.postalCode})
            </span>
          </div>
        </div>

        {/* 6-Stage Timeline */}
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
      </div>
    </AnimatedPageTransition>
  );
};
