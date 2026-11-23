import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Apple, HardHat, Lightbulb, PackageOpen, RefreshCw, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { ScooterBoy, type ScooterMood } from '../animations/ScooterBoy';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import { scooterSound } from '../utils/scooterSound';

export const RiderCompanion: React.FC<{ variant?: 'sidebar' | 'mobile-dock' }> = ({ variant = 'sidebar' }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, cart, riderPulse, activeRider, activeRiderIndex, cycleRider } = useApp();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const [boxPeek, setBoxPeek] = useState(false);
  const [honkMood, setHonkMood] = useState<ScooterMood | null>(null);
  const [customTip, setCustomTip] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(scooterSound.isEnabled());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasCap, setHasCap] = useState(true);
  const [lightOn, setLightOn] = useState(true);

  const getRouteContext = () => {
    if (pathname.startsWith('/profile')) {
      return {
        mood: 'sleeping' as ScooterMood,
        tip: t.riderSleepBanner,
        actionLabel: t.navShop,
        actionPath: '/shop',
        openBox: false,
      };
    }
    if (pathname.startsWith('/shop') || pathname.startsWith('/categories')) {
      return {
        mood: (cart.itemCount > 0 ? 'celebrate' : 'thumbs-up') as ScooterMood,
        tip:
          cart.itemCount > 0
            ? `${t.riderBasketPreview}: ${cart.itemCount} item(s) packed!`
            : 'Pick daily essentials — watch them jump into my bike box!',
        actionLabel: t.navCart,
        actionPath: '/cart',
        openBox: cart.itemCount > 0,
      };
    }
    if (pathname.startsWith('/cart')) {
      const remaining = Math.max(0, 499 - cart.subtotal);
      return {
        mood: (cart.itemCount === 0 ? 'sad' : 'celebrate') as ScooterMood,
        tip:
          cart.itemCount === 0
            ? t.riderSadEmpty
            : remaining === 0
              ? `${t.riderHappyCart} Free delivery unlocked!`
              : `Add ${formatINR(remaining)} for free delivery!`,
        actionLabel: cart.itemCount > 0 ? t.proceedCheckout : t.navShop,
        actionPath: cart.itemCount > 0 ? '/checkout' : '/shop',
        openBox: cart.itemCount > 0,
      };
    }
    if (pathname.startsWith('/orders')) {
      return {
        mood: (cart.itemCount > 0 ? 'celebrate' : 'thumbs-up') as ScooterMood,
        tip: 'Check live delivery status or reorder staples!',
        actionLabel: 'Track Active',
        actionPath: '/tracking',
        openBox: false,
      };
    }
    if (pathname.startsWith('/search')) {
      return {
        mood: 'searching' as ScooterMood,
        tip: t.searchPlaceholder,
        actionLabel: t.navShop,
        actionPath: '/shop',
        openBox: false,
      };
    }
    if (pathname.startsWith('/products/')) {
      return {
        mood: 'nodding' as ScooterMood,
        tip: 'Freshly stocked from Indian farms & kirana hubs!',
        actionLabel: t.navShop,
        actionPath: '/shop',
        openBox: false,
      };
    }
    if (pathname.startsWith('/wishlist')) {
      return {
        mood: 'heart' as ScooterMood,
        tip: 'Your saved favourites are waiting for the basket!',
        actionLabel: t.navShop,
        actionPath: '/shop',
        openBox: false,
      };
    }
    if (pathname.startsWith('/coupons')) {
      return {
        mood: 'voucher' as ScooterMood,
        tip: 'Try FRESH100 or DAILY15 at checkout!',
        actionLabel: t.navCart,
        actionPath: '/cart',
        openBox: false,
      };
    }
    if (pathname.startsWith('/checkout') || pathname.startsWith('/payment')) {
      return {
        mood: (cart.itemCount === 0 && pathname.startsWith('/checkout') ? 'sad' : 'gripping') as ScooterMood,
        tip: pathname.startsWith('/payment') ? 'Razorpay UPI & cards ready — helmet strapped!' : 'Ready to zoom as soon as order is placed!',
        actionLabel: t.navOrders,
        actionPath: '/orders',
        openBox: false,
      };
    }
    if (pathname.startsWith('/tracking') || pathname.startsWith('/order-confirmation')) {
      return {
        mood: 'riding' as ScooterMood,
        tip: `${activeRider.name} riding ${activeRider.bikeName} straight to you!`,
        actionLabel: t.navOrders,
        actionPath: '/orders',
        openBox: true,
      };
    }
    if (pathname.startsWith('/addresses')) {
      return {
        mood: 'looking-email' as ScooterMood,
        tip: 'Pin your location on Google Maps for superfast drop!',
        actionLabel: 'Checkout',
        actionPath: '/checkout',
        openBox: false,
      };
    }
    if (pathname.startsWith('/notifications')) {
      return {
        mood: 'waving' as ScooterMood,
        tip: 'Tap any alert to read or trash old ones anytime.',
        actionLabel: t.navHome,
        actionPath: '/dashboard',
        openBox: false,
      };
    }
    if (pathname.startsWith('/admin')) {
      return {
        mood: 'thumbs-up' as ScooterMood,
        tip: 'Inventory & Razorpay analytics synced live!',
        actionLabel: 'Analytics',
        actionPath: '/admin/analytics',
        openBox: false,
      };
    }
    return {
      mood: (cart.itemCount > 0 ? 'celebrate' : 'riding') as ScooterMood,
      tip: user ? `Namaste ${user.fullName.split(' ')[0]}! ${activeRider.catchphrase}` : activeRider.catchphrase,
      actionLabel: cart.itemCount > 0 ? t.navCart : t.shopDailyEssentials,
      actionPath: cart.itemCount > 0 ? '/cart' : '/shop',
      openBox: cart.itemCount > 0,
    };
  };

  const routeCtx = getRouteContext();

  useEffect(() => {
    if (!riderPulse) return;
    if (riderPulse.event === 'cart-added') {
      setBoxPeek(true);
      setHonkMood('celebrate');
      setCustomTip(riderPulse.message);
      scooterSound.playBoxPop();
    } else if (riderPulse.event === 'wishlist-added') {
      setHonkMood('heart');
      setCustomTip(riderPulse.message);
      scooterSound.playChime();
    } else if (riderPulse.event === 'error') {
      setHonkMood('angry');
      setCustomTip(riderPulse.message);
      scooterSound.playAngryBuzz();
    } else {
      setHonkMood('thumbs-up');
      setCustomTip(riderPulse.message);
      scooterSound.playSuccessFanfare();
    }

    const timer = setTimeout(() => {
      setBoxPeek(false);
      setHonkMood(null);
      setCustomTip(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [riderPulse]);

  const activeMood: ScooterMood = !hasCap ? 'angry' : honkMood || routeCtx.mood;
  const activeTip = !hasCap ? 'Hey! Give back my FreshCart cap!' : customTip || routeCtx.tip;

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    scooterSound.setEnabled(next);
  };

  const handleTapRider = () => {
    setHonkMood('angry');
    setCustomTip(`Hey! Don't poke ${activeRider.name}! Beep-beep!`);
    scooterSound.playAngryBuzz();
    scooterSound.playHornBeep();
    setTimeout(() => {
      setHonkMood(null);
      setCustomTip(null);
    }, 1800);
  };

  const handleToggleCap = () => {
    const next = !hasCap;
    setHasCap(next);
    scooterSound.playCapPop();
    if (!next) {
      scooterSound.playAngryBuzz();
    } else {
      scooterSound.playChime();
    }
  };

  const handleEatSnack = () => {
    setHonkMood('eating');
    setCustomTip('Yum! Munching a fresh apple snack!');
    scooterSound.playMunch();
    setTimeout(() => {
      setHonkMood(null);
      setCustomTip(null);
    }, 2200);
  };

  const handleBoxBtn = () => {
    const next = !boxPeek;
    setBoxPeek(next);
    scooterSound.playBoxPop();
    setCustomTip(next ? `Box open: ${cart.itemCount} item(s) packed!` : null);
  };

  if (variant === 'mobile-dock') {
    return (
      <div className="fixed bottom-4 left-4 z-40 lg:hidden">
        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              className="w-68 rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-emerald-900/60 dark:bg-[#0D1D17]/95"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  {activeRider.name} · {activeRider.badgeText}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Minimize rider companion"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mx-auto w-40">
                <ScooterBoy
                  riderIndex={activeRiderIndex}
                  mood={activeMood}
                  hasCap={hasCap}
                  basketItems={pathname.startsWith('/shop') || boxPeek ? cart.items : []}
                  headlightOn={lightOn && activeMood !== 'sleeping'}
                  headlightForceOff={!lightOn}
                  boxOpen={boxPeek || routeCtx.openBox}
                  speechBubble={activeTip}
                  onRiderTap={handleTapRider}
                  onCapToggle={handleToggleCap}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={cycleRider}
                  title="Switch Delivery Boy & Bike"
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Switch {((activeRiderIndex + 1) % 5) + 1}
                </button>
                <button
                  type="button"
                  onClick={handleToggleCap}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  {hasCap ? 'No Cap' : 'Cap'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate(routeCtx.actionPath);
                  }}
                  className="flex-1 rounded-lg bg-emerald-700 px-2 py-1.5 text-[11px] font-semibold text-white"
                >
                  {routeCtx.actionLabel}
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(true);
                scooterSound.playChime();
              }}
              aria-label="Open FreshCart Rider Companion"
              className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-300/80 bg-white/95 px-3 text-xs font-semibold text-emerald-800 shadow-lg backdrop-blur dark:border-emerald-800 dark:bg-[#0D1D17]/95 dark:text-emerald-300"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{activeRider.name.split(' ')[0]} · Rider {activeRiderIndex + 1}</span>
            </button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-amber-50/70 via-emerald-50/70 to-white p-3.5 shadow-xs dark:border-emerald-900/50 dark:from-[#0C2119] dark:via-[#101D17] dark:to-[#0D1D17]">
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0">
          <div className="truncate text-xs font-extrabold text-emerald-800 dark:text-emerald-300">{activeRider.name}</div>
          <div className="truncate text-[10px] font-semibold text-amber-700 dark:text-amber-300">{activeRider.bikeName}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setLightOn((l) => !l)}
            title={lightOn ? 'Switch Light Off' : 'Switch Light On'}
            aria-label={lightOn ? 'Switch Light Off' : 'Switch Light On'}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/80 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Lightbulb className={`h-3.5 w-3.5 ${lightOn ? 'text-amber-500' : 'text-slate-400'}`} />
          </button>
          <button
            type="button"
            onClick={cycleRider}
            title="Switch to next Delivery Boy & Bike (5 in loop)"
            aria-label="Switch Delivery Boy and Bike"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/80 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute rider audio' : 'Enable rider audio'}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/80 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Animate riding in on dashboard home */}
      <motion.div
        key={`${pathname}-${activeRiderIndex}`}
        initial={reduced ? false : pathname === '/dashboard' ? { x: -110, opacity: 0 } : { opacity: 0.85 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 18 }}
        className="mt-2 flex flex-col items-center"
      >
        <div className="w-full max-w-[184px]">
          <ScooterBoy
            riderIndex={activeRiderIndex}
            mood={activeMood}
            hasCap={hasCap}
            basketItems={pathname.startsWith('/shop') || boxPeek ? cart.items : []}
            headlightOn={lightOn && (Boolean(honkMood) || pathname.startsWith('/tracking') || pathname.startsWith('/checkout') || true)}
            headlightForceOff={!lightOn}
            boxOpen={boxPeek || routeCtx.openBox}
            speechBubble={activeTip}
            onRiderTap={handleTapRider}
            onCapToggle={handleToggleCap}
          />
        </div>
      </motion.div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggleCap}
          title={hasCap ? 'Remove Cap (makes boy angry!)' : 'Wear Cap'}
          className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            !hasCap
              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              : 'border-slate-200/90 bg-white/85 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'
          }`}
        >
          <HardHat className="h-3 w-3" />
          <span>{hasCap ? 'Cap' : 'No Cap'}</span>
        </button>
        <button
          type="button"
          onClick={handleEatSnack}
          title="Give Rider an Apple Snack"
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200/90 bg-white/85 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-white whitespace-nowrap dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
        >
          <Apple className="h-3 w-3 text-rose-500" />
          <span>Eat</span>
        </button>
        <button
          type="button"
          onClick={handleBoxBtn}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200/90 bg-white/85 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-white whitespace-nowrap dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
        >
          <PackageOpen className="h-3 w-3 text-emerald-600" />
          <span>{boxPeek || routeCtx.openBox ? 'Box Open' : 'Box'}</span>
        </button>
        <button
          type="button"
          onClick={cycleRider}
          className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50/90 px-2 py-1.5 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
        >
          Boy {activeRiderIndex + 1}/5
        </button>
        <button
          type="button"
          onClick={() => navigate(routeCtx.actionPath)}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-700 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap dark:bg-emerald-600"
        >
          {routeCtx.actionLabel}
        </button>
      </div>
    </div>
  );
};
