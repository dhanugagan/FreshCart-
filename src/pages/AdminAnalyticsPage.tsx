import React, { useEffect, useState } from 'react';
import { AdminShell } from './AdminGuard';
import { AnimatedPageTransition, LoadingAnimation } from '../animations/MotionPrimitives';
import { adminService } from '../services/adminService';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';

export const AdminAnalyticsPage: React.FC = () => {
  const { user } = useApp();
  const isAdmin = user?.roles?.includes('ADMIN');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isAdmin) adminService.getAnalytics().then(setData);
  }, [isAdmin]);

  return (
    <AnimatedPageTransition>
      <AdminShell title="Sales & Inventory Analytics" subtitle="Category ₹ performance, popular items, and daily order volume">
        {!data ? (
          <LoadingAnimation />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Revenue Bar Visualization */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <h2 className="mb-4 font-display text-base font-bold">Category Revenue Breakdown</h2>
              <div className="space-y-3">
                {data.categoryRevenue.map((row: any) => {
                  const maxRev = Math.max(1, ...data.categoryRevenue.map((r: any) => r.revenue));
                  const pct = Math.round((row.revenue / maxRev) * 100);
                  return (
                    <div key={row.category} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">{row.category}</span>
                        <span className="font-mono-nums font-bold">{formatINR(Number(row.revenue))} ({row.units} sold)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Products */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
              <h2 className="mb-4 font-display text-base font-bold">Popular Products</h2>
              <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                {data.popularProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-slate-500">{p.brand} · Stock: {p.stock}</div>
                    </div>
                    <div className="text-right font-mono-nums">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{p.sold_units} sold</div>
                      <div className="text-slate-500">★ {p.rating}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AnimatedPageTransition>
  );
};
