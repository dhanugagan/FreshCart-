import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Compass,
  Database,
  Lightbulb,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { ScooterBoy, type ScooterMood } from '../animations/ScooterBoy';
import { freshCartLogo, productUploadSoonImg } from '../assets/brandAssets';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { productService } from '../services/productService';
import { formatINR } from '../utils/currency';
import { scooterSound } from '../utils/scooterSound';
import type { Product } from '../types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setSessionUser, activeRider, activeRiderIndex, cycleRider, pushToast } = useApp();

  const [featured, setFeatured] = useState<Product[]>([]);
  const [mood, setMood] = useState<ScooterMood>('riding');
  const [headlightOn, setHeadlightOn] = useState(true);
  const [hasCap, setHasCap] = useState(true);
  const [bubble, setBubble] = useState(`${activeRider.name} is ready for 20-min dispatch!`);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    setBubble(`${activeRider.name} · ${activeRider.bikeName}`);
  }, [activeRider]);

  useEffect(() => {
    productService
      .getProducts({ limit: 6 })
      .then((res) => setFeatured(res.items || []))
      .catch(() => {});
  }, []);

  const handleHonk = () => {
    scooterSound.setEnabled(true);
    scooterSound.playHornBeep();
    setBubble(`Beep-beep! ${activeRider.name} rolling out!`);
  };

  const handleCycleRider = () => {
    cycleRider();
    scooterSound.setEnabled(true);
    scooterSound.playChime();
  };

  const handleToggleCap = () => {
    setHasCap((prev) => {
      const next = !prev;
      setMood(next ? 'celebrate' : 'angry');
      setBubble(next ? 'Helmet back on — safe ride!' : 'Hey! Give back my FreshCart cap!');
      return next;
    });
  };

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    try {
      const data = await authService.demoLogin();
      await setSessionUser(data.user);
      pushToast('success', `Signed in as ${data.user.fullName}`);
      navigate('/dashboard');
    } catch {
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-slate-900 dark:bg-[#07110C] dark:text-slate-100">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#FAFBF9]/95 backdrop-blur-md dark:border-emerald-950/60 dark:bg-[#07110C]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap dark:text-white"
          >
            <img
              src={freshCartLogo}
              alt="FreshCart Logo"
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-lg border border-emerald-200 object-cover dark:border-emerald-900"
            />
            <span>FreshCart</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            <a href="#catalog" className="whitespace-nowrap shrink-0 hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Catalog
            </a>
            <a href="#riders" className="whitespace-nowrap shrink-0 hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Rider Fleet
            </a>
            <a href="#architecture" className="whitespace-nowrap shrink-0 hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Platform
            </a>
            <Link to="/shop" className="whitespace-nowrap shrink-0 hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Storefront
            </Link>
          </nav>

          <div className="flex shrink-0 items-center">
            <Link
              to={user ? '/dashboard' : '/login'}
              data-testid="landing-primary-cta"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-800"
            >
              <span>{user ? 'Open Storefront' : 'Open Login Bag'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-16 lg:pt-14">
        <section id="riders" className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-between space-y-6 lg:col-span-7">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
                Groceries · Faster · Fresher · ₹ INR Essentials
              </p>
              <h1
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', textWrap: 'balance' }}
                className="max-w-2xl font-display font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white"
              >
                Fresh Daily Groceries Delivered in Minutes
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Shop 100 everyday pantry, dairy, produce, and home essentials priced transparently in ₹ INR across 23 regional languages, backed by live Google Maps scooter tracking and automated end-to-end reliability.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 whitespace-nowrap"
              >
                <span>Open Login Bag & Google Sign-In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                disabled={demoLoading}
                onClick={handleQuickDemo}
                data-testid="landing-demo-cta"
                className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <span>{demoLoading ? 'Starting Demo...' : 'Try 1-Click Demo Store'}</span>
              </button>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline whitespace-nowrap dark:text-emerald-400"
              >
                <span>Browse 100 Items</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Interactive 5-Rider Scooter Showcase */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-gradient-to-b from-sky-100/70 via-white to-emerald-50/70 p-6 lg:col-span-5 dark:border-emerald-950/60 dark:from-[#0C2117] dark:via-[#0D1D17] dark:to-[#081510]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Boy {activeRiderIndex + 1}/5 · {activeRider.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{activeRider.cityHub}</span>
            </div>

            <div className="mx-auto my-3 w-64">
              <ScooterBoy
                riderIndex={activeRiderIndex}
                mood={mood}
                headlightOn={headlightOn}
                hasCap={hasCap}
                speechBubble={bubble}
                onRiderTap={() => {
                  setMood('angry');
                  setBubble("Don't poke! I'm carrying fresh produce!");
                }}
                onCapToggle={handleToggleCap}
                onHeadlightClick={() => setHeadlightOn((h) => !h)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 dark:border-emerald-950/60">
              <button
                type="button"
                onClick={handleCycleRider}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Next Rider</span>
              </button>
              <button
                type="button"
                onClick={() => setHeadlightOn((h) => !h)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{headlightOn ? 'Light On' : 'Light Off'}</span>
              </button>
              <button
                type="button"
                onClick={handleHonk}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Horn</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMood((m) => (m === 'eating' ? 'celebrate' : m === 'celebrate' ? 'sleeping' : 'eating'));
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Mood: {mood}
              </button>
            </div>
          </div>
        </section>

        {/* Full-Width Quantitative Proof Strip */}
        <section className="mt-10 grid grid-cols-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:border-emerald-950/60 dark:divide-emerald-950/60 dark:bg-[#101C16]">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily Essentials</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">100 SKUs</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Regional Languages</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">23 Scripts</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scooter Rider Fleet</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">5 Riders</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Express Delivery Window</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">20–35 min</p>
          </div>
        </section>

        {/* 01-04 Editorial Platform Architecture Grid */}
        <section id="architecture" className="mt-16 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-emerald-950/60">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                Built for Speed, Reliability & Automated Verification
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Production storefront paired with serverless Vercel APIs, Supabase Postgres & Storage, and Playwright CI/CD.
              </p>
            </div>
            <Link to="/tracking" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              Inspect Live Tracking Route →
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 dark:border-emerald-950/60 dark:bg-[#101C16]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>01. Smart Pricing & Stock Integrity</span>
                <Compass className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                Low, Medium & High ₹ INR Filtering Across 10 Categories
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Every item is indexed cleanly across Low (≤ ₹99), Medium (₹100–₹250), and High (₹251+) tiers with atomic cart locking, promo codes (WELCOME20, FRESH50, DAIRY15), and real-time admin inventory logs.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#101C16]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>02. Google Maps Fleet</span>
                <MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
                Pin-Drop & Route ETA
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Interactive coordinate pins compute live hub-to-doorstep progress across all 5 scooter riders.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#101C16]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>03. Serverless + Supabase</span>
                <Database className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
                Vercel + Postgres + Storage
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Stateless serverless functions backed by Supabase Auth, PostgreSQL schema, and product/document storage buckets.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 dark:border-emerald-950/60 dark:bg-[#101C16]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>04. Automated QA & CI/CD Gate</span>
                <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                Playwright Page Object Model + GitHub Actions Pipeline
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Automated API contract tests, SQL injection boundary checks, and headless cross-browser E2E flows verify login, catalog filtering, checkout, and admin passcode security on every push before Vercel deploys.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Catalog Preview */}
        <section id="catalog" className="mt-16 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-emerald-950/60">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                Daily Staples Ready to Pack
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Live preview from the 100-item catalog — items awaiting photos display honest upload notices.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              <span>Explore All 100 Items</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <Link
                key={item.id}
                to={`/products/${item.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-400 dark:border-emerald-950/60 dark:bg-[#101C16]"
              >
                <img
                  src={item.imageUrl || productUploadSoonImg}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-cover dark:border-slate-800 dark:bg-slate-900"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.categoryName} · {item.unit}
                  </p>
                  <p className="truncate font-display text-sm font-bold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                    {item.name}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatINR(item.effectivePrice)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 dark:border-emerald-950/60 dark:bg-[#0A1610]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
            <span>FreshCart</span>
            <span aria-hidden="true">·</span>
            <span>Groceries · Faster · Fresher</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/login" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Login Bag
            </Link>
            <Link to="/shop" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Catalog
            </Link>
            <Link to="/tracking" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Tracking
            </Link>
            <Link to="/admin" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
              Admin Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
