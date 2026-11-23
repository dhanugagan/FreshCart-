import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Globe,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sun,
  Tag,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { RiderCompanion } from '../components/RiderCompanion';
import { freshCartLogo } from '../assets/brandAssets';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, darkMode, toggleDarkMode, cart, unreadCount, toasts, cartPulse } = useApp();
  const { language, setLanguage, languages, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.roles?.includes('ADMIN');

  const sidebarItems = [
    { to: '/dashboard', label: t.navHome, icon: Home },
    { to: '/shop', label: t.navShop, icon: ShoppingBag },
    { to: '/search', label: 'Search & Filter', icon: Search },
    { to: '/wishlist', label: t.navWishlist, icon: Heart },
    { to: '/cart', label: t.navCart, icon: ShoppingCart, count: cart.itemCount },
    { to: '/coupons', label: t.navDeals, icon: Tag },
    { to: '/orders', label: t.navOrders, icon: Package },
    { to: '/tracking', label: 'Live Map Tracking', icon: Truck },
    { to: '/addresses', label: t.navAddresses, icon: MapPin },
    { to: '/profile', label: t.navProfile, icon: UserIcon },
    { to: '/notifications', label: t.navAlerts, icon: Bell, count: unreadCount },
    { to: '/admin', label: isAdmin ? 'Admin Console' : t.navAdmin, icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFDF7] via-[#F4FBF7] to-[#F0F9FF] text-slate-900 transition-colors dark:from-[#07130F] dark:via-[#0A1813] dark:to-[#091318] dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-200/70 bg-white/88 backdrop-blur-lg dark:border-emerald-950/60 dark:bg-[#0D1B16]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Zone 1: Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 text-slate-700 hover:bg-emerald-50 lg:hidden dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              to={user ? '/dashboard' : '/'}
              className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-emerald-700 whitespace-nowrap shrink-0 dark:text-emerald-400"
            >
              <img
                src={freshCartLogo}
                alt="FreshCart Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-xl border border-emerald-200 object-cover shadow-xs dark:border-emerald-800"
              />
              <span>FreshCart</span>
            </Link>
          </div>

          {/* Zone 2: Nav Links */}
          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 lg:flex dark:text-slate-300" aria-label="Primary navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `whitespace-nowrap transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : ''
                }`
              }
            >
              {t.navHome}
            </NavLink>
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `whitespace-nowrap transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : ''
                }`
              }
            >
              {t.navShop}
            </NavLink>
            <NavLink
              to="/coupons"
              className={({ isActive }) =>
                `whitespace-nowrap transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : ''
                }`
              }
            >
              {t.navDeals}
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `whitespace-nowrap transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : ''
                }`
              }
            >
              {t.navOrders}
            </NavLink>
            <NavLink
              to="/tracking"
              className={({ isActive }) =>
                `whitespace-nowrap transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : ''
                }`
              }
            >
              Track Map
            </NavLink>
          </nav>

          {/* Zone 3: Language Selector + Theme + Basket */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 sm:inline-flex dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <select
                aria-label="Choose Indian Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="max-w-[115px] cursor-pointer bg-transparent text-xs font-semibold outline-none"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            <motion.button
              key={cartPulse}
              initial={{ scale: 1 }}
              animate={cartPulse > 0 ? { scale: [1, 1.12, 1] } : undefined}
              transition={{ duration: 0.25 }}
              type="button"
              onClick={() => navigate('/cart')}
              data-testid="header-cart-btn"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 whitespace-nowrap shrink-0"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">{t.navCart}</span>
              <span className="tabular-nums">({cart.itemCount})</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <div className="space-y-1 rounded-2xl border border-emerald-200/70 bg-white/90 p-3 shadow-xs backdrop-blur dark:border-emerald-950/60 dark:bg-[#0D1D17]">
              <div className="px-3 py-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t.tagline}
                </div>
                {user && (
                  <div className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {user.fullName}
                  </div>
                )}
              </div>

              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-emerald-50 to-amber-50 font-semibold text-emerald-800 dark:from-emerald-950/70 dark:to-amber-950/30 dark:text-emerald-300'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="tabular-nums rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

              {user ? (
                <Link
                  to="/logout"
                  data-testid="sidebar-logout-link"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>{t.signIn}</span>
                </Link>
              )}
            </div>

            <RiderCompanion variant="sidebar" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-16 lg:pb-12">{children}</main>
      </div>

      <RiderCompanion variant="mobile-dock" />

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 w-72 overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl dark:border-emerald-950 dark:bg-[#0D1D17]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={freshCartLogo}
                    alt="FreshCart Logo"
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-lg object-cover"
                  />
                  <span className="font-display text-lg font-extrabold text-emerald-700 dark:text-emerald-400">FreshCart</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Language Selector */}
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/40">
                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <Globe className="h-4 w-4 shrink-0" />
                  <select
                    aria-label="Choose Indian Language Mobile"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold outline-none"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                        {lang.nativeName} — {lang.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950/40"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </span>
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className="tabular-nums text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {user ? (
                  <Link
                    to="/logout"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>{t.signIn}</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2 sm:right-6 sm:bottom-6" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${
                toast.type === 'error'
                  ? 'border-red-200 bg-red-50/95 text-red-900 dark:border-red-900/60 dark:bg-red-950/95 dark:text-red-200'
                  : toast.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/95 dark:text-emerald-200'
                    : 'border-slate-200 bg-white/95 text-slate-800 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100'
              }`}
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-emerald-200/70 bg-white/80 py-6 text-xs text-slate-500 dark:border-emerald-950/60 dark:bg-[#0D1B16] dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <span>FreshCart · {t.tagline} · ₹ INR</span>
          <div className="flex items-center gap-6">
            <Link to="/shop" className="hover:text-emerald-700 dark:hover:text-emerald-400">{t.navShop}</Link>
            <Link to="/coupons" className="hover:text-emerald-700 dark:hover:text-emerald-400">{t.navDeals}</Link>
            <Link to="/orders" className="hover:text-emerald-700 dark:hover:text-emerald-400">{t.navOrders}</Link>
            <Link to="/admin" className="hover:text-emerald-700 dark:hover:text-emerald-400">{t.navAdmin}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
