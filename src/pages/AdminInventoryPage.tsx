import React, { useEffect, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { AdminShell } from './AdminGuard';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { adminService } from '../services/adminService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';

export const AdminInventoryPage: React.FC = () => {
  const { user, pushToast } = useApp();
  const isAdmin = user?.roles?.includes('ADMIN');
  const [rows, setRows] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  const load = async () => {
    const [list, logRows] = await Promise.all([
      adminService.getInventory(),
      adminService.getInventoryLogs().catch(() => []),
    ]);
    setRows(list);
    setLogs(logRows);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const saveStock = async (productId: number, explicitQty?: number, reason = 'manual_adjustment') => {
    const qty = explicitQty !== undefined ? explicitQty : edits[productId];
    if (qty === undefined) return;
    try {
      await adminService.updateInventory(productId, qty, reason);
      pushToast('success', 'Inventory stock updated');
      await load();
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  const healthyCount = rows.filter((r) => r.quantity > r.lowStockThreshold).length;
  const lowCount = rows.filter((r) => r.quantity > 0 && r.quantity <= r.lowStockThreshold).length;
  const outCount = rows.filter((r) => r.quantity === 0).length;

  const filtered = rows.filter((r) => {
    const matchesSearch = search.trim()
      ? `${r.name} ${r.sku} ${r.categoryName}`.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'out'
          ? r.quantity === 0
          : r.quantity > 0 && r.quantity <= r.lowStockThreshold;
    return matchesSearch && matchesStatus;
  });

  return (
    <AnimatedPageTransition>
      <AdminShell title="Inventory Control" subtitle="Monitor stock health bars, 1-click restock, and real-time audit logs across 100 staples">
        {/* Inventory Health Summary */}
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <p className="text-xs text-slate-500">Healthy Stock</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{healthyCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <p className="text-xs text-slate-500">Low Stock Warning</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-amber-600">{lowCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <p className="text-xs text-slate-500">Out of Stock</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-rose-600">{outCount}</p>
          </div>
        </div>

        {/* Search & Segmented Filter Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter inventory by item, category, or SKU..."
            className="h-10 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
          />

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs dark:bg-emerald-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('low')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'low' ? 'bg-white text-amber-700 shadow-xs dark:bg-amber-950 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Low ({lowCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('out')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === 'out' ? 'bg-white text-rose-700 shadow-xs dark:bg-rose-950 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Out ({outCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-emerald-950/60 dark:bg-[#131C17]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <th className="p-4">SKU</th>
                <th className="p-4">Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Stock Level</th>
                <th className="p-4">Quantity</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => {
                const low = r.quantity <= r.lowStockThreshold;
                const val = edits[r.productId] ?? r.quantity;
                const fillPct = Math.min(100, Math.round((r.quantity / 80) * 100));
                return (
                  <tr key={r.productId}>
                    <td className="p-4 font-mono text-slate-500">{r.sku}</td>
                    <td className="p-4 font-semibold">{r.name}</td>
                    <td className="p-4">{r.categoryName}</td>
                    <td className="p-4">
                      <div className="w-32 space-y-1">
                        <span className={r.quantity === 0 ? 'font-bold text-rose-600' : low ? 'font-semibold text-amber-600' : 'font-medium text-emerald-700 dark:text-emerald-400'}>
                          {r.quantity === 0 ? 'Out of Stock' : low ? 'Low Stock' : 'Healthy'}
                        </span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${r.quantity === 0 ? 'bg-rose-500' : low ? 'bg-amber-500' : 'bg-emerald-600'}`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min={0}
                        value={val}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [r.productId]: Number(e.target.value) }))}
                        className="h-8 w-20 rounded-lg border border-slate-200 px-2 tabular-nums dark:border-slate-700 dark:bg-slate-900"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveStock(r.productId, r.quantity + 25, 'quick_restock_25')}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          <span>+25</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => saveStock(r.productId)}
                          className="h-8 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inventory Change Audit Log */}
        {logs.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Recent Inventory Audit Logs
            </h2>
            <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {logs.slice(0, 8).map((log) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{log.productName}</span>
                    <span className="ml-2 text-slate-500">({log.sku}) · {log.reason}</span>
                  </div>
                  <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {log.previousQuantity} → {log.newQuantity} ({log.delta >= 0 ? `+${log.delta}` : log.delta})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminShell>
    </AnimatedPageTransition>
  );
};
