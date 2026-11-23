import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, CreditCard, Lock, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, ErrorAnimation } from '../animations/MotionPrimitives';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import type { Order, RazorpayOrderSession } from '../types';

export const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeRiderIndex, pushToast, notifyRider } = useApp();
  const { t } = useLanguage();

  const orderId = Number(searchParams.get('orderId'));
  const initialMethod = (searchParams.get('method') || 'UPI').toUpperCase();

  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState(
    ['UPI', 'CARD', 'NETBANKING', 'WALLET'].includes(initialMethod) ? initialMethod : 'UPI'
  );
  const [upiApp, setUpiApp] = useState('Google Pay');
  const [upiId, setUpiId] = useState('shopper@okaxis');
  const [cardBrand, setCardBrand] = useState('RuPay');
  const [cardLast4, setCardLast4] = useState('4242');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [walletName, setWalletName] = useState('Paytm Wallet');
  const [focusedSensitive, setFocusedSensitive] = useState(false);

  const [rzpSession, setRzpSession] = useState<RazorpayOrderSession | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    orderService
      .getOrderDetails(orderId)
      .then((res) => setOrder(res.order))
      .catch((err) => setError(extractApiError(err)));
  }, [orderId]);

  const buildInstrumentLabel = () => {
    if (method === 'UPI') return `${upiApp} (${upiId || 'upi@bank'})`;
    if (method === 'CARD') return `${cardBrand} •••• ${cardLast4.slice(-4) || '0000'}`;
    if (method === 'NETBANKING') return `${bankName} Netbanking`;
    return walletName;
  };

  const handleOpenRazorpaySession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setError('');
    setProcessing(true);
    try {
      const session = await paymentService.createRazorpayOrder({
        orderId: order.id,
        method,
        instrumentLabel: buildInstrumentLabel(),
      });
      setRzpSession(session);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleAuthorizeOutcome = async (outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED') => {
    if (!rzpSession || !order) return;
    setProcessing(true);
    setError('');
    try {
      const res = await paymentService.verifyRazorpayPayment({
        razorpayOrderId: rzpSession.razorpayOrderId,
        method,
        maskedInstrument: buildInstrumentLabel(),
        outcome,
      });

      if (res.payment.status === 'SUCCESS') {
        notifyRider('order-placed', `Order ${order.orderNumber} paid via Razorpay!`);
        pushToast('success', 'Razorpay payment verified! Scooter rider dispatched.');
        navigate(`/order-confirmation/${order.id}`);
      } else if (res.payment.status === 'FAILED') {
        notifyRider('error', 'Payment declined — try another option.');
        setError('Razorpay transaction declined. No amount was deducted. Choose any method below to retry.');
        setRzpSession(null);
      } else {
        setError('Razorpay checkout cancelled. Select a payment method to try again.');
        setRzpSession(null);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setProcessing(false);
    }
  };

  if (!orderId || (!order && !error)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <p className="text-sm text-slate-600 dark:text-slate-400">Connecting to Razorpay INR Checkout...</p>
      </div>
    );
  }

  return (
    <AnimatedPageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Razorpay Brand Header + Rider */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 p-6 text-white shadow-lg">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Razorpay Trusted Business · 256-bit Encrypted INR Checkout</span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold">{t.payWithRazorpay}</h1>
            {order && (
              <p className="mt-1 text-sm text-slate-200">
                Order <span className="font-mono font-bold text-white">{order.orderNumber}</span> · Payable:{' '}
                <span className="font-mono-nums text-lg font-extrabold text-amber-300">
                  {formatINR(order.totalAmount)}
                </span>
              </p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
              <Lock className="h-3 w-3" />
              <span>Full card numbers &amp; CVVs are tokenized client-side and never stored.</span>
            </p>
          </div>

          <div className="w-40">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood={error ? 'confused' : focusedSensitive ? 'cover-eyes' : processing ? 'gripping' : 'thumbs-up'}
              headlightOn={processing}
              speechBubble={
                error
                  ? 'Payment needs a retry!'
                  : focusedSensitive
                    ? 'Eyes covered for UPI/card privacy!'
                    : 'Ready to ride once paid!'
              }
            />
          </div>
        </div>

        {error && <ErrorAnimation message={error} />}

        {!rzpSession ? (
          <form onSubmit={handleOpenRazorpaySession} className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { key: 'UPI', label: 'UPI / QR', icon: Smartphone },
                { key: 'CARD', label: 'Cards', icon: CreditCard },
                { key: 'NETBANKING', label: 'Netbanking', icon: Building2 },
                { key: 'WALLET', label: 'Wallets', icon: Wallet },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                      method === m.key
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {method === 'UPI' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Select UPI App</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {['Google Pay', 'PhonePe', 'Paytm UPI'].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiApp(app)}
                        className={`rounded-xl border py-2.5 text-xs font-bold ${
                          upiApp === app
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">UPI VPA / ID</label>
                  <input
                    required
                    value={upiId}
                    onFocus={() => setFocusedSensitive(true)}
                    onBlur={() => setFocusedSensitive(false)}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@okicici"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {method === 'CARD' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Card Network</label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="RuPay">RuPay Card</option>
                    <option value="Visa">Visa Card</option>
                    <option value="Mastercard">Mastercard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Last 4 Digits Only (Tokenized)</label>
                  <input
                    required
                    maxLength={4}
                    value={cardLast4}
                    onFocus={() => setFocusedSensitive(true)}
                    onBlur={() => setFocusedSensitive(false)}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="4242"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {method === 'NETBANKING' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Select Indian Bank</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setBankName(bank)}
                      className={`rounded-xl border py-2.5 text-xs font-bold ${
                        bankName === bank
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === 'WALLET' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Select Mobile Wallet</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['Paytm Wallet', 'Amazon Pay', 'PhonePe Wallet'].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWalletName(w)}
                      className={`rounded-xl border py-2.5 text-xs font-bold ${
                        walletName === w
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={processing || order?.paymentStatus === 'PAID'}
              data-testid="initiate-payment-btn"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {processing ? 'Creating Razorpay Order Session...' : `Pay ${formatINR(order?.totalAmount || 0)} via Razorpay`}
              </span>
            </button>
          </form>
        ) : (
          <div className="space-y-4 rounded-3xl border border-indigo-300 bg-white p-6 shadow-md dark:border-indigo-800 dark:bg-[#131C17]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                <h2 className="font-display text-lg font-bold">Razorpay Authorization Window</h2>
              </div>
              <span className="rounded-lg bg-indigo-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
                {rzpSession.gatewayMode === 'live' ? 'LIVE RAZORPAY KEY' : 'TEST GATEWAY'}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div>
                Razorpay Order ID: <span className="font-mono font-bold text-slate-900 dark:text-white">{rzpSession.razorpayOrderId}</span>
              </div>
              <div>
                Instrument: <strong>{buildInstrumentLabel()}</strong>
              </div>
              <div>
                Payable Amount: <strong className="font-mono-nums text-emerald-700 dark:text-emerald-400">{formatINR(rzpSession.amountInr)}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAuthorizeOutcome('SUCCESS')}
                data-testid="sandbox-pay-success"
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                {processing ? 'Verifying Signature...' : `Complete ${formatINR(rzpSession.amountInr)} Payment`}
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAuthorizeOutcome('FAILED')}
                data-testid="sandbox-pay-fail"
                className="h-11 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Simulate Decline
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAuthorizeOutcome('CANCELLED')}
                data-testid="sandbox-pay-cancel"
                className="h-11 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
