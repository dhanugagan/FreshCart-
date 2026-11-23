import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { ScooterBoy } from '../animations/ScooterBoy';
import { authService } from '../services/authService';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    activeRiderIndex,
    refreshNotifications,
    deleteNotification,
    clearAllNotifications,
    pushToast,
  } = useApp();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleMarkRead = async (id: number) => {
    await authService.markNotificationRead(id);
    await refreshNotifications();
  };

  const handleMarkAll = async () => {
    await authService.markAllNotificationsRead();
    await refreshNotifications();
    pushToast('success', 'All notifications marked as read');
  };

  const list = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const hasReadItems = notifications.some((n) => n.isRead);

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <div className="flex items-center gap-3">
            <motion.div
              animate={unreadCount > 0 ? { rotate: [0, -12, 12, -8, 0] } : undefined}
              transition={{ duration: 0.6, repeat: unreadCount > 0 ? 1 : 0 }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
            >
              <Bell className="h-5 w-5" />
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-bold">{t.navAlerts}</h1>
              <p className="text-xs text-slate-500">
                {notifications.length} total · {unreadCount} unread updates
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === 'all' ? 'bg-white shadow-xs dark:bg-slate-800' : 'text-slate-500'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === 'unread' ? 'bg-white shadow-xs dark:bg-slate-800' : 'text-slate-500'}`}
              >
                Unread
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}

            {hasReadItems && (
              <button
                type="button"
                onClick={() => clearAllNotifications(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Read</span>
              </button>
            )}

            {notifications.length > 0 &&
              (!confirmClearAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  data-testid="clear-all-notifications-btn"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t.clearAllAlerts}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await clearAllNotifications(false);
                      setConfirmClearAll(false);
                    }}
                    data-testid="confirm-clear-all-notifications"
                    className="h-9 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Confirm Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold dark:border-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[#131C17]">
              <div className="w-40">
                <ScooterBoy riderIndex={activeRiderIndex} mood="thumbs-up" speechBubble="Inbox crystal clean!" />
              </div>
              <p className="mt-2 font-medium">You are all caught up!</p>
            </div>
          ) : (
            <AnimatePresence>
              {list.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
                    n.isRead
                      ? 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#131C17]'
                      : 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/25'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {n.type} · {new Date(n.createdAt).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{n.title}</div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-400"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      aria-label={`Delete notification ${n.title}`}
                      data-testid={`delete-notification-${n.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t.deleteAlert}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AnimatedPageTransition>
  );
};
