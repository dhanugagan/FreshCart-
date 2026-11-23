import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { cartService } from '../services/cartService';
import { extractApiError, getAccessToken } from '../services/api';
import {
  resolveSessionRiderIndex,
  RIDER_ROSTER,
  setManualRiderIndex,
  type RiderProfile,
} from '../utils/riderRoster';
import type { CartSnapshot, NotificationItem, Product, User, WishlistItem } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface RiderPulse {
  id: number;
  event: 'cart-added' | 'wishlist-added' | 'coupon-applied' | 'error' | 'order-placed';
  message: string;
}

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  cart: CartSnapshot;
  wishlist: WishlistItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  recentlyViewed: Product[];
  toasts: ToastMessage[];
  cartPulse: number;
  riderPulse: RiderPulse | null;
  activeRiderIndex: number;
  activeRider: RiderProfile;
  cycleRider: () => void;
  setActiveRiderIndex: (index: number) => void;
  notifyRider: (event: RiderPulse['event'], message: string) => void;
  pushToast: (type: ToastMessage['type'], text: string) => void;
  setSessionUser: (user: User | null) => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: (readOnly?: boolean) => Promise<void>;
  addToCart: (productId: number, quantity?: number) => Promise<boolean>;
  toggleWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  trackRecentlyViewed: (product: Product) => void;
  logoutUser: () => Promise<void>;
}

const EMPTY_CART: CartSnapshot = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  discountAmount: 0,
  appliedCoupon: null,
  taxAmount: 0,
  deliveryFee: 0,
  freeDeliveryThreshold: 499,
  totalAmount: 0,
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [cart, setCart] = useState<CartSnapshot>(EMPTY_CART);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cartPulse, setCartPulse] = useState(0);
  const [riderPulse, setRiderPulse] = useState<RiderPulse | null>(null);
  const [activeRiderIndex, setRiderIdxState] = useState<number>(() => resolveSessionRiderIndex());
  const wsRef = useRef<WebSocket | null>(null);

  const activeRider = RIDER_ROSTER[activeRiderIndex] || RIDER_ROSTER[0];

  const setActiveRiderIndex = useCallback((idx: number) => {
    setRiderIdxState(setManualRiderIndex(idx));
  }, []);

  const cycleRider = useCallback(() => {
    setRiderIdxState((prev) => setManualRiderIndex((prev + 1) % RIDER_ROSTER.length));
  }, []);

  const notifyRider = useCallback((event: RiderPulse['event'], message: string) => {
    const id = Date.now();
    setRiderPulse({ id, event, message });
    setTimeout(() => {
      setRiderPulse((prev) => (prev?.id === id ? null : prev));
    }, 3200);
  }, []);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  const refreshCart = useCallback(async () => {
    if (!getAccessToken()) {
      setCart(EMPTY_CART);
      return;
    }
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch {
      // ignore if unauthenticated
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!getAccessToken()) {
      setWishlist([]);
      return;
    }
    try {
      const items = await cartService.getWishlist();
      setWishlist(items);
    } catch {
      // ignore
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!getAccessToken()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await authService.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: number) => {
      try {
        await authService.deleteNotification(id);
        setNotifications((prev) => {
          const filtered = prev.filter((n) => n.id !== id);
          setUnreadCount(filtered.filter((n) => !n.isRead).length);
          return filtered;
        });
        pushToast('info', 'Notification removed');
      } catch (err) {
        pushToast('error', extractApiError(err, 'Unable to delete notification'));
      }
    },
    [pushToast]
  );

  const clearAllNotifications = useCallback(
    async (readOnly = false) => {
      try {
        await authService.clearNotifications(readOnly);
        await refreshNotifications();
        pushToast('info', readOnly ? 'Cleared read alerts' : 'All notifications deleted');
      } catch (err) {
        pushToast('error', extractApiError(err, 'Unable to clear notifications'));
      }
    },
    [refreshNotifications, pushToast]
  );

  const setSessionUser = useCallback(
    async (nextUser: User | null) => {
      setUser(nextUser);
      if (nextUser) {
        await Promise.all([refreshCart(), refreshWishlist(), refreshNotifications()]);
      } else {
        setCart(EMPTY_CART);
        setWishlist([]);
        setNotifications([]);
        setUnreadCount(0);
      }
    },
    [refreshCart, refreshWishlist, refreshNotifications]
  );

  // Restore session cleanly via HttpOnly refresh cookie on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authService.refresh();
        if (active && res?.user) {
          await setSessionUser(res.user);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setSessionUser]);

  // Real-time WebSocket subscription for live notifications (disabled automatically on stateless Vercel serverless)
  useEffect(() => {
    const isServerlessHost =
      window.location.hostname.endsWith('.vercel.app') || window.location.hostname.endsWith('.vercel.sh');
    if (!user || isServerlessHost) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      const token = getAccessToken();
      if (token) ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'notification:new' && msg.payload) {
          setNotifications((prev) => [msg.payload, ...prev]);
          setUnreadCount((c) => c + 1);
          pushToast('info', msg.payload.title);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      // Non-fatal fallback
    };

    return () => {
      ws.close();
    };
  }, [user, pushToast]);

  const addToCart = useCallback(
    async (productId: number, quantity = 1): Promise<boolean> => {
      if (!user) {
        pushToast('error', 'Please sign in to add groceries to your basket');
        notifyRider('error', 'Sign in first so I can pack your box!');
        return false;
      }
      try {
        const nextCart = await cartService.addToCart(productId, quantity);
        setCart(nextCart);
        setCartPulse((p) => p + 1);
        pushToast('success', 'Added to your FreshCart basket');
        notifyRider('cart-added', `Packed in the bike box! ${nextCart.itemCount} item(s) ready.`);
        return true;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to add item');
        pushToast('error', msg);
        notifyRider('error', msg);
        return false;
      }
    },
    [user, pushToast, notifyRider]
  );

  const isInWishlist = useCallback(
    (productId: number) => wishlist.some((w) => w.productId === productId),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (!user) {
        pushToast('error', 'Please sign in to save favourites');
        notifyRider('error', 'Sign in to save favourite groceries!');
        return;
      }
      try {
        const existing = wishlist.find((w) => w.productId === productId);
        if (existing) {
          const next = await cartService.removeFromWishlist(existing.id);
          setWishlist(next);
          pushToast('info', 'Removed from wishlist');
        } else {
          const next = await cartService.addToWishlist(productId);
          setWishlist(next);
          pushToast('success', 'Saved to wishlist');
          notifyRider('wishlist-added', 'Saved to your favourites!');
        }
      } catch (err) {
        pushToast('error', extractApiError(err));
      }
    },
    [user, wishlist, pushToast, notifyRider]
  );

  const trackRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => [product, ...prev.filter((p) => p.id !== product.id)].slice(0, 6));
  }, []);

  const logoutUser = useCallback(async () => {
    await authService.logout();
    await setSessionUser(null);
  }, [setSessionUser]);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        darkMode,
        toggleDarkMode,
        cart,
        wishlist,
        notifications,
        unreadCount,
        recentlyViewed,
        toasts,
        cartPulse,
        riderPulse,
        activeRiderIndex,
        activeRider,
        cycleRider,
        setActiveRiderIndex,
        notifyRider,
        pushToast,
        setSessionUser,
        refreshCart,
        refreshWishlist,
        refreshNotifications,
        deleteNotification,
        clearAllNotifications,
        addToCart,
        toggleWishlist,
        isInWishlist,
        trackRecentlyViewed,
        logoutUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
