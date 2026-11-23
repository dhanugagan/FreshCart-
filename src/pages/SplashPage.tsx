import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Leaf } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { FloatingGroceries } from '../animations/MotionPrimitives';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { freshCartLogo } from '../assets/brandAssets';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeRider, activeRiderIndex, cycleRider } = useApp();
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [boxOpen, setBoxOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const start = Date.now() - (progress / 100) * (reduced ? 1200 : 3000);
    const duration = reduced ? 1200 : 3000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 55) setBoxOpen(true);
      if (pct >= 100) {
        clearInterval(timer);
        navigate(user ? '/dashboard' : '/login', { replace: true });
      }
    }, 40);
    return () => clearInterval(timer);
  }, [navigate, user, reduced, paused, progress]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-200 via-[#FFFDF7] to-emerald-100 px-6 py-12 dark:from-[#07130F] dark:via-[#0B1713] dark:to-[#0F241B]">
      {/* Moving Clouds */}
      <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-around opacity-75" aria-hidden="true">
        <div className="animate-cloud-drift h-12 w-36 rounded-full bg-white/85 blur-xs dark:bg-emerald-950/30" />
        <div className="animate-cloud-drift h-10 w-28 rounded-full bg-white/80 blur-xs dark:bg-sky-950/30" style={{ animationDelay: '3s' }} />
      </div>

      {/* Curved Miniature Town Road */}
      <svg
        viewBox="0 0 800 140"
        preserveAspectRatio="none"
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-28 w-full opacity-90"
        aria-hidden="true"
      >
        <path d="M0 70 Q240 25 480 65 T800 45 L800 140 L0 140 Z" fill="#1E293B" />
        <path d="M0 104 Q240 58 480 98 T800 80" fill="none" stroke="#FDE047" strokeWidth="3.5" strokeDasharray="16 14" />
      </svg>

      <FloatingGroceries active />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400"
        >
          <Leaf className="h-4 w-4" />
          <span>FreshCart · {activeRider.badgeText}</span>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex items-center justify-center gap-3"
        >
          <img
            src={freshCartLogo}
            alt="FreshCart Logo"
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-2xl border border-emerald-200 object-cover shadow-md dark:border-emerald-800"
          />
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            FreshCart
          </h1>
        </motion.div>
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-2 text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-400"
        >
          {t.tagline}
        </motion.p>

        {/* Rotating Rider & Bike Entrance */}
        <motion.div
          key={activeRiderIndex}
          initial={reduced ? false : { x: -240, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 75, damping: 14 }}
          className="relative my-6 w-72 sm:w-80"
        >
          <ScooterBoy
            riderIndex={activeRiderIndex}
            mood={boxOpen ? 'celebrate' : 'riding'}
            headlightOn
            boxOpen={boxOpen}
            showDust={!boxOpen}
            speechBubble={
              paused
                ? `${activeRider.name} paused! Tap below to continue`
                : boxOpen
                  ? `${activeRider.name} · Good Food, Good Mood!`
                  : `${activeRider.bikeName} rolling in...`
            }
            onRiderTap={() => {
              setPaused(true);
              cycleRider();
            }}
          />
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-1.5"
        >
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Good Food, Good Mood!</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            100 Daily Essentials · 23 Languages · ₹ INR Pricing
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mt-7 w-full max-w-xs">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{paused ? 'Tap Continue when ready' : `Loading ${activeRider.cityHub}`}</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(user ? '/dashboard' : '/login')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          <span>{user ? 'Enter Storefront' : 'Ride to Login'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
