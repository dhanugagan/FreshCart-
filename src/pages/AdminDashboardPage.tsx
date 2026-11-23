import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminGuard';
import { AnimatedPageTransition, LoadingAnimation } from '../animations/MotionPrimitives';
import { adminService } from '../services/adminService';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useApp();
  const isAdmin = user?.roles?.includes('ADMIN');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    adminService
      .getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, [isAdmin]);

  return (
    <AnimatedPageTransition>
      <AdminShell title="Admin Operations" subtitle="Real-time Indian grocery storefront metrics & order queue">
        {loading || !data ? (
          <LoadingAnimation label="Loading admin metrics..." />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Total Revenue', value: formatINR(data.revenue) },
                { label: 'Total Orders', value: data.totalOrders },
                { label: 'Pending Deliveries', value: data.pendingOrders },
                { label: 'Delivered Orders', value: data.deliveredOrders },
                { label: 'Active Products', value: data.totalProducts },
                { label: 'Registered Users', value: data.totalUsers },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
                  <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
                  <div className="mt-1 font-mono-nums text-2xl font-extrabold text-slate-900 dark:text-white">{kpi.value}</div>
                </div>
              ))}
            </div>

            {data.lowStockCount > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-3.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <span>
                  <strong>{data.lowStockCount} product(s)</strong> are at or below low-stock threshold.
                </span>
                <Link to="/admin/inventory" className="text-xs font-bold underline">
                  Manage Inventory
                </Link>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Recent Orders</h2>
                <Link to="/admin/orders" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                  Manage All Orders
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                      <th className="py-2.5 pr-4">Order</th>
                      <th className="py-2.5 pr-4">Customer</th>
                      <th className="py-2.5 pr-4">Total</th>
                      <th className="py-2.5 pr-4">Payment</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {data.recentOrders.map((o: any) => (
                      <tr key={o.id}>
                        <td className="py-2.5 pr-4 font-mono font-semibold">{o.orderNumber}</td>
                        <td className="py-2.5 pr-4">{o.shippingAddress.recipientName}</td>
                        <td className="py-2.5 pr-4 font-mono-nums font-bold">{formatINR(o.totalAmount)}</td>
                        <td className="py-2.5 pr-4">{o.paymentStatus}</td>
                        <td className="py-2.5 font-semibold text-emerald-700 dark:text-emerald-400">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AnimatedPageTransition>
  );
};
