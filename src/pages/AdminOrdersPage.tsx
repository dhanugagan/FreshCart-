import React, { useEffect, useState } from 'react';
import { AdminShell } from './AdminGuard';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { adminService } from '../services/adminService';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import type { Order } from '../types';

const STATUSES = ['ORDER_PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export const AdminOrdersPage: React.FC = () => {
  const { user, pushToast } = useApp();
  const isAdmin = user?.roles?.includes('ADMIN');
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async () => {
    const list = await adminService.getOrders();
    setOrders(list);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const handleStatusChange = async (id: number, status: string) => {
    await adminService.updateOrderStatus(id, status);
    pushToast('success', `Order updated to ${status.replace(/_/g, ' ')}`);
    await load();
  };

  return (
    <AnimatedPageTransition>
      <AdminShell title="Order Dispatch & Status" subtitle="Status updates broadcast live via WebSockets to customer Google Maps tracking">
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-emerald-950/60 dark:bg-[#131C17]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Delivery Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-4 font-mono font-bold">{o.orderNumber}</td>
                  <td className="p-4">{o.shippingAddress.recipientName}</td>
                  <td className="p-4 font-mono-nums">{o.items.length}</td>
                  <td className="p-4 font-mono-nums font-bold">{formatINR(o.totalAmount)}</td>
                  <td className="p-4">{o.paymentMethod} · {o.paymentStatus}</td>
                  <td className="p-4">
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </AnimatedPageTransition>
  );
};
