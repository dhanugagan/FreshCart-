import React, { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatedPageTransition, ErrorAnimation, LoadingAnimation } from '../animations/MotionPrimitives';
import { AddressPickerGoogleMap } from '../components/maps/FreshCartMaps';
import { orderService } from '../services/orderService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import type { Address } from '../types';

export const AddressesPage: React.FC = () => {
  const { user, pushToast } = useApp();
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('560001');
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [isDefault, setIsDefault] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await orderService.getAddresses();
      setAddresses(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  const openNew = () => {
    setEditingId(null);
    setLabel('Home');
    setRecipientName(user?.fullName || '');
    setMobile(user?.mobile || '');
    setStreet('');
    setApartment('');
    setCity('Bengaluru');
    setState('Karnataka');
    setPostalCode('560001');
    setLat(12.9716);
    setLng(77.5946);
    setIsDefault(addresses.length === 0);
    setError('');
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditingId(a.id);
    setLabel(a.label);
    setRecipientName(a.recipientName);
    setMobile(a.mobile);
    setStreet(a.street);
    setApartment(a.apartment || '');
    setCity(a.city);
    setState(a.state);
    setPostalCode(a.postalCode);
    setLat(typeof a.lat === 'number' ? a.lat : 12.9716);
    setLng(typeof a.lng === 'number' ? a.lng : 77.5946);
    setIsDefault(a.isDefault);
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        label,
        recipientName,
        mobile,
        street,
        apartment,
        city,
        state,
        postalCode,
        lat,
        lng,
        isDefault,
      };
      if (editingId) {
        await orderService.updateAddress(editingId, payload);
        pushToast('success', 'Address & map pin updated');
      } else {
        await orderService.createAddress(payload);
        pushToast('success', 'Delivery address saved with map pin');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleDelete = async (id: number) => {
    await orderService.deleteAddress(id);
    pushToast('info', 'Address removed');
    await load();
  };

  const handleSetDefault = async (id: number) => {
    await orderService.setDefaultAddress(id);
    pushToast('success', 'Default address updated');
    await load();
  };

  if (loading) return <LoadingAnimation />;

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t.navAddresses}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pin your exact doorstep on Google Maps for 20-minute scooter delivery
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            data-testid="add-address-btn"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            <span>Add Address</span>
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-emerald-200 bg-white p-6 dark:border-emerald-900/50 dark:bg-[#131C17]">
            <h2 className="font-display text-lg font-bold">{editingId ? 'Edit Address & Map Pin' : 'New Delivery Address'}</h2>
            {error && <ErrorAnimation message={error} />}

            <AddressPickerGoogleMap
              lat={lat}
              lng={lng}
              cityLabel={`${label || 'Pin'} · ${city || 'Hub'}`}
              onSelectCoords={(nextLat, nextLng, hub) => {
                setLat(nextLat);
                setLng(nextLng);
                if (hub) {
                  setCity(hub.name);
                  setState(hub.state);
                  setPostalCode(hub.postalCode);
                }
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Address Label</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Recipient Name</label>
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mobile Number (10 digits)</label>
                <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">House No. / Street / Landmark</label>
                <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="12th Main, Indiranagar" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Flat / Floor / Apartment</label>
                <input value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder="Flat 4B, Prestige Residency" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">State</label>
                  <input value={state} onChange={(e) => setState(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">PIN Code</label>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" required />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 rounded text-emerald-600" />
              <span>Set as default delivery address</span>
            </label>
            <div className="flex gap-2">
              <button type="submit" className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800">
                Save Address
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold dark:border-slate-700">
                Cancel
              </button>
            </div>
          </form>
        )}

        {addresses.length === 0 && !showForm ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
            <MapPin className="mx-auto h-8 w-8 text-emerald-600" />
            <h2 className="mt-3 font-display text-lg font-bold">No Saved Delivery Addresses</h2>
            <p className="mt-1 text-sm text-slate-500">Add your home or office address with a Google Maps pin to place orders.</p>
            <button
              type="button"
              onClick={openNew}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Address</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl border p-5 ${
                  a.isDefault ? 'border-emerald-500 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131C17]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-display text-base font-bold">{a.label}</span>
                    {a.isDefault && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">· Default</span>}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(a)} aria-label="Edit address" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(a.id)} aria-label="Delete address" className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{a.recipientName}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {a.street} {a.apartment ? `, ${a.apartment}` : ''}, {a.city}, {a.state} — {a.postalCode}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono-nums text-xs text-slate-500">
                  <span>Mobile: {a.mobile}</span>
                  {typeof a.lat === 'number' && typeof a.lng === 'number' && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-800">
                      GPS: {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                    </span>
                  )}
                </div>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(a.id)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Set as Default</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
