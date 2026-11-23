import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MapPin, Plus } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, ErrorAnimation } from '../animations/MotionPrimitives';
import { INDIA_CITY_HUBS } from '../components/maps/FreshCartMaps';
import { orderService } from '../services/orderService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import type { Address } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, cart, activeRiderIndex, refreshCart, pushToast } = useApp();
  const { t } = useLanguage();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number>(0);
  const [deliverySlot, setDeliverySlot] = useState('Express (20-35 mins)');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'COD'>('UPI');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // Quick inline Indian address modal state
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newState, setNewState] = useState('Karnataka');
  const [newMobile, setNewMobile] = useState(user?.mobile || '');
  const [newPostal, setNewPostal] = useState('560001');
  const [newLat, setNewLat] = useState(12.9716);
  const [newLng, setNewLng] = useState(77.5946);

  const [idempotencyKey] = useState(() => `fc-ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!user) return;
    orderService.getAddresses().then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) setSelectedAddressId(def.id);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <h1 className="font-display text-2xl font-bold">Sign In to Checkout</h1>
        <Link to="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          {t.signIn}
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-200/80 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <div className="mx-auto w-52">
          <ScooterBoy riderIndex={activeRiderIndex} mood="sad" speechBubble={t.riderSadEmpty} />
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">Your Basket is Empty</h1>
        <Link to="/shop" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          {t.shopDailyEssentials}
        </Link>
      </div>
    );
  }

  const handleAddInlineAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const addr = await orderService.createAddress({
        label: 'Delivery',
        recipientName: user.fullName,
        mobile: newMobile,
        street: newStreet,
        apartment: '',
        city: newCity,
        state: newState,
        postalCode: newPostal,
        lat: newLat,
        lng: newLng,
        isDefault: true,
      });
      setAddresses((prev) => [addr, ...prev]);
      setSelectedAddressId(addr.id);
      setShowNewAddr(false);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handlePlaceOrder = async () => {
    setError('');
    if (!selectedAddressId) {
      setError('Please select or add a delivery address');
      return;
    }
    setPlacing(true);
    try {
      const order = await orderService.placeOrder({
        addressId: selectedAddressId,
        paymentMethod,
        deliverySlot,
        deliveryInstructions: instructions,
        couponCode: cart.appliedCoupon,
        idempotencyKey,
      });
      await refreshCart();
      setConfirmOpen(false);
      if (paymentMethod === 'COD') {
        pushToast('success', `Order ${order.orderNumber} confirmed with Cash on Delivery!`);
        navigate(`/order-confirmation/${order.id}`);
      } else {
        navigate(`/payment?orderId=${order.id}&method=${paymentMethod}`);
      }
    } catch (err) {
      setError(extractApiError(err, 'Unable to create order'));
      setConfirmOpen(false);
    } finally {
      setPlacing(false);
    }
  };

  const basketPreview = cart.items.map((item) => ({ name: item.name, quantity: item.quantity }));

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Checkout</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Step 1: Delivery Address · Step 2: Slot · Step 3: Razorpay / COD</p>
          </div>
          <div className="w-32">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood="gripping"
              boxOpen
              basketItems={basketPreview}
              headlightOn
            />
          </div>
        </div>

        {error && <ErrorAnimation message={error} />}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {/* Step 1: Delivery Address */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">1. Delivery Address</h2>
                <div className="flex items-center gap-3">
                  <Link to="/addresses" className="text-xs font-semibold text-slate-500 hover:text-emerald-700 hover:underline">
                    Open Map Picker →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowNewAddr((s) => !s)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Quick Add</span>
                  </button>
                </div>
              </div>

              {showNewAddr && (
                <form onSubmit={handleAddInlineAddress} className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <div className="flex flex-wrap gap-1.5">
                    {INDIA_CITY_HUBS.slice(0, 5).map((hub) => (
                      <button
                        key={hub.name}
                        type="button"
                        onClick={() => {
                          setNewCity(hub.name);
                          setNewState(hub.state);
                          setNewPostal(hub.postalCode);
                          setNewLat(hub.lat);
                          setNewLng(hub.lng);
                        }}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                          newCity === hub.name
                            ? 'bg-emerald-700 text-white'
                            : 'border border-emerald-200 bg-white text-slate-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {hub.name}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      placeholder="House No., Street, Landmark"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm sm:col-span-2 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      required
                      placeholder="Mobile (10 digits)"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex gap-2">
                      <input
                        required
                        placeholder="City"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        required
                        placeholder="PIN"
                        value={newPostal}
                        onChange={(e) => setNewPostal(e.target.value)}
                        className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <button type="submit" className="h-9 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white">
                    Save &amp; Select Address
                  </button>
                </form>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAddressId(a.id)}
                    data-testid={`select-address-${a.id}`}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedAddressId === a.id
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 dark:bg-emerald-950/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        {a.label}
                      </span>
                      {selectedAddressId === a.id && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">{a.recipientName}</div>
                    <div className="text-xs text-slate-500">
                      {a.street}, {a.city} — {a.postalCode}
                    </div>
                    <div className="mt-1 font-mono-nums text-xs text-slate-500">{a.mobile}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 2: Delivery Details */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <h2 className="font-display text-lg font-bold">2. Delivery Slot &amp; Instructions</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {['Express (20-35 mins)', 'Morning (7 AM - 9 AM)', 'Evening (5 PM - 7 PM)'].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setDeliverySlot(slot)}
                    className={`rounded-xl border p-3 text-xs font-semibold transition-colors ${
                      deliverySlot === slot
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Delivery instructions (e.g. Call at main gate, leave with security guard)"
                className="mt-4 w-full rounded-xl border border-slate-200 bg-[#FAFAF8] p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
              />
            </section>

            {/* Step 3: Payment Option */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <h2 className="font-display text-lg font-bold">3. Payment Method (Razorpay / Cash)</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['UPI', 'Razorpay UPI (GPay / PhonePe / Paytm)'],
                    ['CARD', 'Razorpay Card (RuPay / Visa / Mastercard)'],
                    ['NETBANKING', 'Indian Netbanking (HDFC / SBI / ICICI)'],
                    ['WALLET', 'Wallets (Paytm / Amazon Pay)'],
                    ['COD', 'Cash on Delivery (Pay Rider at Doorstep)'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPaymentMethod(key)}
                    data-testid={`pay-method-${key}`}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      paymentMethod === key
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Summary Sidebar */}
          <aside className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 lg:col-span-4 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="font-display text-lg font-bold">Order Summary</h2>
            <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1 text-xs">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">
                    {item.quantity} × {item.name}
                  </span>
                  <span className="font-mono-nums font-semibold">{formatINR(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono-nums">{formatINR(cart.subtotal)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono-nums">−{formatINR(cart.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST Tax (5%)</span>
                <span className="font-mono-nums">{formatINR(cart.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery</span>
                <span className="font-mono-nums">{cart.deliveryFee === 0 ? 'FREE' : formatINR(cart.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
                <span>Final Total</span>
                <span className="font-mono-nums text-emerald-700 dark:text-emerald-400" data-testid="checkout-total">
                  {formatINR(cart.totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              data-testid="review-place-order-btn"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <span>Review &amp; Confirm Order</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131C17]">
            <h3 className="font-display text-xl font-bold">Confirm Grocery Order</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You are placing an order for <span className="font-mono-nums font-bold">{formatINR(cart.totalAmount)}</span> via{' '}
              <strong>{paymentMethod === 'COD' ? 'Cash on Delivery' : `Razorpay ${paymentMethod}`}</strong> ({deliverySlot}).
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold dark:border-slate-700"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={placing}
                onClick={handlePlaceOrder}
                data-testid="confirm-place-order-btn"
                className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {placing ? 'Placing Order...' : paymentMethod === 'COD' ? 'Confirm COD Order' : t.payWithRazorpay}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedPageTransition>
  );
};
