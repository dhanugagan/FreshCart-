import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Tag, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { cartService } from '../services/cartService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, cart, activeRiderIndex, refreshCart, pushToast } = useApp();
  const { t } = useLanguage();
  const [couponInput, setCouponInput] = useState(cart.appliedCoupon || '');
  const [busyId, setBusyId] = useState<number | null>(null);

  const freeThreshold = cart.freeDeliveryThreshold || 99;

  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-emerald-950/60 dark:bg-[#131C17]">
        <div className="mx-auto w-52">
          <ScooterBoy riderIndex={activeRiderIndex} mood="waving" speechBubble="Sign in to pack your basket!" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Sign In Required</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your shopping basket is synced securely with your FreshCart account.</p>
        <Link to="/login" className="mt-5 inline-flex h-11 items-center rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white">
          {t.signIn}
        </Link>
      </div>
    );
  }

  const updateQty = async (itemId: number, qty: number) => {
    setBusyId(itemId);
    try {
      await cartService.updateItemQuantity(itemId, qty);
      await refreshCart();
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (itemId: number) => {
    setBusyId(itemId);
    try {
      await cartService.removeItem(itemId);
      await refreshCart();
      pushToast('info', 'Item removed from basket');
    } finally {
      setBusyId(null);
    }
  };

  const handleClear = async () => {
    await cartService.clearCart();
    await refreshCart();
    pushToast('info', 'Basket cleared');
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cartService.applyCoupon(couponInput.trim());
      await refreshCart();
      pushToast('success', couponInput.trim() ? `Coupon ${couponInput.trim().toUpperCase()} applied!` : 'Coupon removed');
    } catch (err) {
      pushToast('error', extractApiError(err, 'Invalid coupon'));
    }
  };

  const basketPreview = cart.items.map((item) => ({ name: item.name, quantity: item.quantity }));

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t.navCart}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.freeDeliveryAbove}
            </p>
          </div>
          {cart.items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              data-testid="clear-cart-btn"
              className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
            >
              Clear Basket
            </button>
          )}
        </div>

        {cart.items.length === 0 ? (
          <div
            data-testid="empty-cart-state"
            className="flex flex-col items-center rounded-3xl border border-amber-200/80 bg-gradient-to-b from-white to-amber-50/40 px-6 py-14 text-center dark:border-emerald-950/60 dark:from-[#131C17] dark:to-[#131C17]"
          >
            <div className="w-56">
              <ScooterBoy
                riderIndex={activeRiderIndex}
                mood="sad"
                speechBubble={t.riderSadEmpty}
              />
            </div>
            <h2 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">Your FreshCart basket is empty</h2>
            <p className="mt-1 text-sm text-slate-500">Add fresh vegetables, dal, atta, milk, or spices to cheer up your rider.</p>
            <Link to="/shop" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white hover:bg-emerald-800">
              <span>{t.shopDailyEssentials}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-12">
            {/* Cart Items List */}
            <div className="space-y-3 lg:col-span-8">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-emerald-950/60 dark:bg-[#131C17]"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-xs text-slate-500">{item.brand} · {item.unit}</div>
                        <Link to={`/products/${item.productId}`} className="font-display text-base font-semibold text-slate-900 hover:text-emerald-700 dark:text-white">
                          {item.name}
                        </Link>
                        <div className="mt-1 font-mono-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatINR(item.unitPrice)} each
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex h-9 items-center rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          data-testid={`cart-dec-${item.id}`}
                          className="flex h-full w-9 items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono-nums text-sm font-bold" data-testid={`cart-qty-${item.id}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={busyId === item.id || item.quantity >= item.stockQuantity}
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          data-testid={`cart-inc-${item.id}`}
                          className="flex h-full w-9 items-center justify-center hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="w-24 text-right font-mono-nums text-sm font-bold text-slate-900 dark:text-white">
                        {formatINR(item.lineTotal)}
                      </div>

                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        data-testid={`cart-remove-${item.id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Link to="/shop" className="inline-block pt-2 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                ← Continue Shopping
              </Link>
            </div>

            {/* Summary Panel */}
            <aside className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 lg:col-span-4 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <div className="flex flex-col items-center rounded-2xl bg-emerald-50/90 p-3 text-center dark:bg-emerald-950/30">
                <div className="w-36 shrink-0">
                  <ScooterBoy
                    riderIndex={activeRiderIndex}
                    mood="celebrate"
                    boxOpen
                    basketItems={basketPreview}
                    speechBubble={t.riderHappyCart}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  {cart.subtotal >= freeThreshold
                    ? 'Free express scooter delivery unlocked!'
                    : `Add ${formatINR(freeThreshold - cart.subtotal)} more for free delivery!`}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-950">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${Math.min(100, Math.round((cart.subtotal / freeThreshold) * 100))}%` }}
                  />
                </div>
              </div>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    data-testid="cart-coupon-input"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon (e.g. FRESH100)"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-[#FAFAF8] pr-3 pl-9 font-mono text-xs uppercase outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  data-testid="cart-apply-coupon"
                  className="h-10 rounded-xl border border-emerald-700 px-3.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
                >
                  Apply
                </button>
              </form>

              <div className="space-y-2.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono-nums font-medium text-slate-900 dark:text-white">{formatINR(cart.subtotal)}</span>
                </div>
                {cart.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Coupon ({cart.appliedCoupon})</span>
                    <span className="font-mono-nums font-semibold">−{formatINR(cart.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST Tax (5%)</span>
                  <span className="font-mono-nums">{formatINR(cart.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Delivery Fee</span>
                  <span className="font-mono-nums">{cart.deliveryFee === 0 ? 'FREE' : formatINR(cart.deliveryFee)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
                  <span>Total</span>
                  <span className="font-mono-nums text-emerald-700 dark:text-emerald-400" data-testid="cart-total">
                    {formatINR(cart.totalAmount)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/checkout')}
                data-testid="proceed-checkout-btn"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <span>{t.proceedCheckout}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </aside>
          </div>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
