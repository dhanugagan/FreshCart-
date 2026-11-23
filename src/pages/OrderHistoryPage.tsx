import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileText, RotateCcw, Truck, XCircle } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, LoadingAnimation } from '../animations/MotionPrimitives';
import { orderService } from '../services/orderService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import type { Order } from '../types';

export const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeRiderIndex, refreshCart, pushToast } = useApp();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await orderService.getOrders();
      setOrders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  const handleCancel = async (id: number) => {
    try {
      await orderService.cancelOrder(id);
      pushToast('info', 'Order cancelled and stock released');
      await load();
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  const handleReorder = async (id: number) => {
    try {
      await orderService.reorder(id);
      await refreshCart();
      pushToast('success', 'Items added back to your basket');
      navigate('/cart');
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <h1 className="font-display text-2xl font-bold">Sign In to View Order History</h1>
        <Link to="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          {t.signIn}
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingAnimation />;

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t.navOrders}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {orders.length > 0
                ? `${orders.length} grocery order${orders.length > 1 ? 's' : ''} with live route tracking & GST invoices`
                : 'Place your first daily essentials order and watch your rider celebrate!'}
            </p>
          </div>
          <div className="w-32 shrink-0">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood={orders.length > 0 ? 'celebrate' : 'sad'}
              speechBubble={orders.length > 0 ? `${orders.length} order(s)!` : 'No orders yet...'}
            />
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-amber-200/80 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
            <div className="w-52">
              <ScooterBoy riderIndex={activeRiderIndex} mood="sad" speechBubble={t.riderSadEmpty} />
            </div>
            <p className="mt-2 text-sm text-slate-500">You have not placed any grocery orders yet.</p>
            <Link to="/shop" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
              {t.shopDailyEssentials}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const expanded = expandedId === o.id;
              const canCancel = ['ORDER_PLACED', 'CONFIRMED', 'PREPARING'].includes(o.status);
              return (
                <div key={o.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{o.orderNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(o.createdAt).toLocaleString('en-IN')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{o.status.replace(/_/g, ' ')}</span>
                        <span aria-hidden="true">·</span>
                        <span>Payment: {o.paymentStatus}</span>
                      </div>
                      <div className="mt-1 font-mono-nums text-base font-bold text-slate-900 dark:text-white">
                        {formatINR(o.totalAmount)} ({o.items.length} item{o.items.length === 1 ? '' : 's'})
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/tracking/${o.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <Truck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Track Map</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(o)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Invoice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(o.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reorder</span>
                      </button>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(o.id)}
                          data-testid={`cancel-order-${o.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : o.id)}
                        aria-label="Toggle order details"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between">
                          <span>
                            {it.quantity} × {it.productName} (@ {formatINR(it.unitPrice)})
                          </span>
                          <span className="font-mono-nums font-semibold">{formatINR(it.lineTotal)}</span>
                        </div>
                      ))}
                      <div className="pt-2 text-slate-500">
                        Ship to: {o.shippingAddress.recipientName}, {o.shippingAddress.street}, {o.shippingAddress.city} — {o.shippingAddress.postalCode}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GST Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131C17]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold">FreshCart INR Tax Invoice</h2>
                <p className="font-mono text-xs text-slate-500">{invoiceOrder.orderNumber}</p>
              </div>
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">
                Print Invoice
              </button>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              {invoiceOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>
                    {it.quantity} × {it.productName}
                  </span>
                  <span className="font-mono-nums">{formatINR(it.lineTotal)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono-nums">{formatINR(invoiceOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="font-mono-nums">−{formatINR(invoiceOrder.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (5%)</span>
                  <span className="font-mono-nums">{formatINR(invoiceOrder.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-mono-nums">{invoiceOrder.deliveryFee === 0 ? 'FREE' : formatINR(invoiceOrder.deliveryFee)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm font-bold">
                  <span>Grand Total</span>
                  <span className="font-mono-nums">{formatINR(invoiceOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 text-right">
              <button type="button" onClick={() => setInvoiceOrder(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedPageTransition>
  );
};
