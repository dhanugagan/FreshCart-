import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BarChart3, Boxes, KeyRound, Package, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { ErrorAnimation } from '../animations/MotionPrimitives';
import { authService } from '../services/authService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export const AdminShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => {
  const { user, activeRiderIndex, setSessionUser, pushToast } = useApp();
  const { t } = useLanguage();
  const isAdmin = user?.roles?.includes('ADMIN');

  const [status, setStatus] = useState<{
    adminClaimed: boolean;
    envPasscodeConfigured: boolean;
    localPasscodeConfigured: boolean;
    ready: boolean;
  } | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      authService.getAdminStatus().then(setStatus).catch(() => {});
    }
  }, [isAdmin]);

  if (!isAdmin) {
    const needsBootstrap = status ? !status.ready : false;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (needsBootstrap) {
        if (passcode.trim().length < 6) {
          setError('Please choose an Admin Passcode with at least 6 characters.');
          return;
        }
        if (passcode.trim() !== confirmPasscode.trim()) {
          setError('Passcodes do not match.');
          return;
        }
      }

      setBusy(true);
      try {
        const res = needsBootstrap
          ? await authService.bootstrapAdmin(passcode.trim())
          : await authService.unlockAdmin(passcode.trim());
        await setSessionUser(res.user);
        setPasscode('');
        setConfirmPasscode('');
        pushToast('success', needsBootstrap ? 'Admin Passcode saved & Console unlocked!' : 'Admin Operations Console unlocked!');
      } catch (err) {
        setError(extractApiError(err, 'Invalid admin passcode'));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="mx-auto max-w-md rounded-3xl border border-emerald-200/80 bg-white p-8 shadow-sm dark:border-emerald-950/60 dark:bg-[#131C17]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/70">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">
                {needsBootstrap ? 'Set Store Admin Passcode' : t.adminPasscodeTitle}
              </h1>
              <p className="text-xs text-slate-500">FreshCart Store Operations</p>
            </div>
          </div>
          <div className="w-20 shrink-0">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood={error ? 'angry' : passcode ? 'cover-eyes' : 'gripping'}
            />
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {needsBootstrap
            ? 'First-run setup: choose your store Admin Passcode (6+ characters) to protect inventory, orders, and coupons. You can also override it anytime via ADMIN_PASSCODE in Settings → Secrets.'
            : 'Enter your administrator passcode verified on the server to access FreshCart inventory, orders, and coupons.'}
        </p>

        {error && (
          <div className="mt-4">
            <ErrorAnimation message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="admin-passcode-input" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {needsBootstrap ? 'Choose Admin Passcode' : 'Admin Passcode'}
            </label>
            <input
              id="admin-passcode-input"
              type="password"
              required
              autoFocus
              data-testid="admin-passcode-input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={needsBootstrap ? 'Create store admin passcode (6+ chars)' : 'Enter store admin passcode'}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-[#FAFAF8] px-3.5 text-sm outline-none focus:border-emerald-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {needsBootstrap && (
            <div>
              <label htmlFor="admin-passcode-confirm" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Confirm Admin Passcode
              </label>
              <input
                id="admin-passcode-confirm"
                type="password"
                required
                data-testid="admin-passcode-confirm"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="Re-enter admin passcode"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-[#FAFAF8] px-3.5 text-sm outline-none focus:border-emerald-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="admin-auth-submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>
              {busy
                ? 'Verifying...'
                : needsBootstrap
                  ? 'Set Passcode & Unlock Admin'
                  : t.unlockAdmin}
            </span>
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/dashboard" className="text-xs font-medium text-slate-500 hover:underline">
            Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { to: '/admin', label: 'Overview', icon: ShieldCheck, end: true },
    { to: '/admin/products', label: 'Products (100+)', icon: ShoppingBag },
    { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
    { to: '/admin/orders', label: 'Orders', icon: Package },
    { to: '/admin/customers', label: 'Customers & Coupons', icon: Users },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
        </div>

        <nav className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
};
