import React, { useEffect, useState } from 'react';
import { Check, Copy, Tag } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, ConfettiBurst, ErrorAnimation } from '../animations/MotionPrimitives';
import { cartService } from '../services/cartService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import type { Coupon } from '../types';

export const CouponsPage: React.FC = () => {
  const { user, cart, activeRiderIndex, refreshCart, pushToast, notifyRider } = useApp();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [confetti, setConfetti] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    cartService.getCoupons().then(setCoupons).catch(() => {});
  }, []);

  const applyCode = async (code: string) => {
    setError('');
    if (!user) {
      setError('Please sign in to validate and apply coupons');
      return;
    }
    try {
      await cartService.applyCoupon(code);
      await refreshCart();
      setConfetti(true);
      notifyRider('coupon-applied', `Coupon ${code} applied!`);
      pushToast('success', `Coupon ${code} applied to your basket!`);
      setTimeout(() => setConfetti(false), 1400);
    } catch (err) {
      const msg = extractApiError(err, 'Unable to apply coupon');
      notifyRider('error', msg);
      setError(msg);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <AnimatedPageTransition>
      <ConfettiBurst active={confetti} />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <div className="max-w-lg">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Coupons &amp; Fresh Deals</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Redeem verified ₹ promotional codes on your FreshCart basket. All minimum order and expiry rules are validated on the server.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyCode(codeInput.trim().toUpperCase());
              }}
              className="mt-4 flex gap-2"
            >
              <input
                type="text"
                data-testid="coupon-validate-input"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter promo code (e.g. FRESH100)"
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-[#FAFAF8] px-3.5 font-mono text-xs uppercase outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
              />
              <button type="submit" className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800">
                Redeem
              </button>
            </form>
            {error && (
              <div className="mt-3">
                <ErrorAnimation message={error} />
              </div>
            )}
          </div>
          <div className="w-44">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood={confetti ? 'celebrate' : 'voucher'}
              speechBubble={cart.appliedCoupon ? `Active: ${cart.appliedCoupon}` : 'Tap any voucher to apply!'}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {coupons.map((c) => {
            const isApplied = cart.appliedCoupon === c.code;
            return (
              <div
                key={c.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  c.isExpired
                    ? 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-800 dark:bg-slate-900/50'
                    : 'border-emerald-200/80 bg-white dark:border-emerald-900/50 dark:bg-[#131C17]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      <Tag className="h-4 w-4" />
                      {c.code}
                    </span>
                    <span className="text-xs text-slate-500">
                      {c.isExpired ? 'Expired' : `Expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}`}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">{c.title}</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.description}</p>
                  <div className="mt-3 text-xs text-slate-500">
                    Min order: <span className="font-mono-nums font-semibold">{formatINR(c.minOrderAmount)}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    Max savings: <span className="font-mono-nums font-semibold">{formatINR(c.maxDiscountAmount)}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => handleCopy(c.code)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    {copied === c.code ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied === c.code ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCode(c.code)}
                    data-testid={`apply-coupon-${c.code}`}
                    className="h-9 flex-1 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    {isApplied ? 'Applied to Basket' : 'Apply to Basket'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedPageTransition>
  );
};
