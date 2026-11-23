import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AdminShell } from './AdminGuard';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { adminService } from '../services/adminService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';

export const AdminCustomersPage: React.FC = () => {
  const { user, pushToast } = useApp();
  const isAdmin = user?.roles?.includes('ADMIN');
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrderAmount, setMinOrderAmount] = useState('299');

  const load = async () => {
    const [custs, cps] = await Promise.all([adminService.getCustomers(), adminService.getCoupons()]);
    setCustomers(custs);
    setCoupons(cps);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const toggleStatus = async (c: any) => {
    const next = c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await adminService.updateCustomerStatus(c.id, next);
    pushToast('info', `${c.fullName} set to ${next}`);
    await load();
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createCoupon({
        code,
        title,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount),
      });
      setCode('');
      setTitle('');
      pushToast('success', 'Coupon created');
      await load();
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    await adminService.deleteCoupon(id);
    pushToast('info', 'Coupon deleted');
    await load();
  };

  return (
    <AnimatedPageTransition>
      <AdminShell title="Customers & Coupons" subtitle="Manage registered accounts and ₹ promotional voucher rules">
        <div className="space-y-8">
          {/* Customers */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-emerald-950/60 dark:bg-[#131C17]">
            <div className="border-b border-slate-100 px-5 py-3.5 font-display text-base font-bold dark:border-slate-800">
              Registered Customers ({customers.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Roles</th>
                  <th className="p-4">Orders</th>
                  <th className="p-4">Total Spent</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="p-4 font-semibold">{c.fullName}</td>
                    <td className="p-4 text-slate-500">{c.email}</td>
                    <td className="p-4">{c.roles.join(', ')}</td>
                    <td className="p-4 font-mono-nums">{c.orderCount}</td>
                    <td className="p-4 font-mono-nums font-bold">{formatINR(c.totalSpent)}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(c)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {c.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Coupon Manager */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="font-display text-base font-bold">Coupon Management</h2>
            <form onSubmit={handleCreateCoupon} className="grid gap-3 sm:grid-cols-6">
              <input required placeholder="Code (e.g. DIWALI50)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-10 rounded-xl border border-slate-200 px-3 font-mono text-xs uppercase dark:border-slate-700 dark:bg-slate-900" />
              <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed (₹)</option>
              </select>
              <input required type="number" placeholder="Value" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <input required type="number" placeholder="Min ₹ Order" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <button type="submit" className="h-10 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800">
                Create Coupon
              </button>
            </form>

            <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {coupons.map((cp) => (
                <div key={cp.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{cp.code}</span>
                    <span className="ml-2 font-medium">{cp.title}</span>
                    <span className="ml-2 text-slate-500">Min {formatINR(cp.min_order_amount)}</span>
                  </div>
                  <button type="button" onClick={() => handleDeleteCoupon(cp.id)} aria-label="Delete coupon" className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminShell>
    </AnimatedPageTransition>
  );
};
