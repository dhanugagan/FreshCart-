/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AlertTriangle, X } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { SplashPage } from './pages/SplashPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LogoutPage } from './pages/LogoutPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShopPage } from './pages/ShopPage';
import { SearchPage } from './pages/SearchPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CouponsPage } from './pages/CouponsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AddressesPage } from './pages/AddressesPage';
import { PaymentPage } from './pages/PaymentPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { AdminInventoryPage } from './pages/AdminInventoryPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminCustomersPage } from './pages/AdminCustomersPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

const WithLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => <AppLayout>{children}</AppLayout>;

function MapsQuotaBanner() {
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      setQuotaMessage(
        'Google Maps free demo quota reached or key unavailable — interactive hub coordinate picker remains available.'
      );
    };
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  if (!quotaMessage) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span>{quotaMessage}</span>
      </div>
      <button
        type="button"
        onClick={() => setQuotaMessage(null)}
        aria-label="Dismiss maps banner"
        className="rounded-lg p-1 hover:bg-amber-200/50 dark:hover:bg-amber-900"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function App() {
  const appTree = (
    <LanguageProvider>
      <AppProvider>
        <MapsQuotaBanner />
        <BrowserRouter>
          <Routes>
            {/* Full-screen Landing, Onboarding & Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/splash" element={<SplashPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/logout" element={<LogoutPage />} />

            {/* Customer Shopping Experience */}
            <Route path="/dashboard" element={<WithLayout><DashboardPage /></WithLayout>} />
            <Route path="/shop" element={<WithLayout><ShopPage /></WithLayout>} />
            <Route path="/categories" element={<WithLayout><ShopPage /></WithLayout>} />
            <Route path="/search" element={<WithLayout><SearchPage /></WithLayout>} />
            <Route path="/products/:id" element={<WithLayout><ProductDetailsPage /></WithLayout>} />
            <Route path="/cart" element={<WithLayout><CartPage /></WithLayout>} />
            <Route path="/wishlist" element={<WithLayout><WishlistPage /></WithLayout>} />
            <Route path="/coupons" element={<WithLayout><CouponsPage /></WithLayout>} />
            <Route path="/checkout" element={<WithLayout><CheckoutPage /></WithLayout>} />
            <Route path="/addresses" element={<WithLayout><AddressesPage /></WithLayout>} />
            <Route path="/payment" element={<WithLayout><PaymentPage /></WithLayout>} />
            <Route path="/order-confirmation/:id" element={<WithLayout><OrderConfirmationPage /></WithLayout>} />
            <Route path="/tracking" element={<WithLayout><OrderTrackingPage /></WithLayout>} />
            <Route path="/tracking/:id" element={<WithLayout><OrderTrackingPage /></WithLayout>} />
            <Route path="/orders" element={<WithLayout><OrderHistoryPage /></WithLayout>} />
            <Route path="/profile" element={<WithLayout><ProfilePage /></WithLayout>} />
            <Route path="/notifications" element={<WithLayout><NotificationsPage /></WithLayout>} />

            {/* Admin Console */}
            <Route path="/admin" element={<WithLayout><AdminDashboardPage /></WithLayout>} />
            <Route path="/admin/products" element={<WithLayout><AdminProductsPage /></WithLayout>} />
            <Route path="/admin/inventory" element={<WithLayout><AdminInventoryPage /></WithLayout>} />
            <Route path="/admin/orders" element={<WithLayout><AdminOrdersPage /></WithLayout>} />
            <Route path="/admin/customers" element={<WithLayout><AdminCustomersPage /></WithLayout>} />
            <Route path="/admin/analytics" element={<WithLayout><AdminAnalyticsPage /></WithLayout>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </LanguageProvider>
  );

  if (GOOGLE_MAPS_API_KEY) {
    return (
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
        {appTree}
      </APIProvider>
    );
  }

  return appTree;
}
