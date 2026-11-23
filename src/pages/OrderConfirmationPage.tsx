import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Truck } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, ConfettiBurst, LoadingAnimation } from '../animations/MotionPrimitives';
import { orderService } from '../services/orderService';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import type { Order } from '../types';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams();
  const { activeRiderIndex } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const oid = Number(id);
    if (!oid) return;
    orderService
      .getOrderDetails(oid)
      .then((res) => setOrder(res.order))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingAnimation />;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  const basketPreview = order.items.map((it) => ({ name: it.productName, quantity: it.quantity }));

  return (
    <AnimatedPageTransition>
      <ConfettiBurst active />
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm dark:border-emerald-900/50 dark:bg-[#131C17]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white" data-testid="order-confirmed-heading">
          Order Confirmed!
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Order <span className="font-mono font-bold">{order.orderNumber}</span> · Payment Status:{' '}
          <strong>{order.paymentStatus}</strong>
        </p>

        <div className="mx-auto w-60">
          <ScooterBoy
            riderIndex={activeRiderIndex}
            mood="celebrate"
            boxOpen
            basketItems={basketPreview}
            headlightOn
            speechBubble="Packing & riding to your doorstep!"
          />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-[#FAFAF8] p-5 text-left text-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex justify-between font-semibold">
            <span>Estimated Delivery</span>
            <span className="text-emerald-700 dark:text-emerald-400">{order.deliverySlot}</span>
          </div>
          <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>
                  {it.quantity} × {it.productName}
                </span>
                <span className="font-mono-nums">{formatINR(it.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold dark:border-slate-800">
            <span>Total Paid / Due</span>
            <span className="font-mono-nums text-emerald-700 dark:text-emerald-400">{formatINR(order.totalAmount)}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to={`/tracking/${order.id}`}
            data-testid="track-order-btn"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Truck className="h-4 w-4" />
            <span>Track Live Map Delivery</span>
          </Link>
          <Link
            to="/shop"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </AnimatedPageTransition>
  );
};
