import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Search, Sparkles, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, LoadingAnimation } from '../animations/MotionPrimitives';
import { ProductCard } from '../components/ProductCard';
import { DashboardScooterMarquee } from '../components/dashboard/DashboardScooterMarquee';
import { productService } from '../services/productService';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import type { Category, Product } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, recentlyViewed, cart, activeRider, activeRiderIndex, cycleRider } = useApp();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: number; name: string; categoryName: string; price: number }>>([]);
  const [activeTab, setActiveTab] = useState<'trending' | 'featured' | 'bestsellers' | 'offers'>('trending');
  const [riderTip, setRiderTip] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, prodRes] = await Promise.all([productService.getCategories(), productService.getProducts()]);
        if (active) {
          setCategories(cats);
          setProducts(prodRes.items);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await productService.searchProducts(q);
        setSuggestions(res.suggestions);
      } catch {
        // ignore
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const tabProducts = products.filter((p) => {
    if (activeTab === 'trending') return p.isTrending;
    if (activeTab === 'featured') return p.isFeatured;
    if (activeTab === 'bestsellers') return p.isBestseller;
    return p.discountPercent > 0;
  });

  if (loading) return <LoadingAnimation label="Stocking 100 fresh groceries..." />;

  const heroMood = searchFocused || searchQuery.length > 0 ? 'searching' : cart.itemCount > 0 ? 'celebrate' : 'riding';
  const heroBubble =
    riderTip ||
    (searchQuery.trim().length > 0
      ? `Searching "${searchQuery.trim()}" for you!`
      : cart.itemCount > 0
        ? `${cart.itemCount} fresh item(s) packed on ${activeRider.bikeName}!`
        : `${activeRider.name} riding in · Code FRESH100 for ₹100 off!`);

  return (
    <AnimatedPageTransition>
      <div className="space-y-10">
        {/* Hero Split Banner with Rider Coming In on Bike */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-sm dark:border-emerald-950/60 dark:bg-[#0D1D17]">
          <div className="grid items-stretch lg:grid-cols-12">
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7 lg:p-10">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <span>{user ? `Namaste, ${user.fullName}` : 'FreshCart'}</span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400">{t.freeDeliveryAbove}</span>
                </div>
                <h1
                  className="mt-2 max-w-xl font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
                  style={{ textWrap: 'balance' }}
                >
                  {t.heroTitle}
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {t.heroSubtitle}
                </p>

                {/* Live Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative mt-6 max-w-lg">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    data-testid="dashboard-search-input"
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-12 w-full rounded-xl border border-emerald-200 bg-[#FFFDF7] pr-28 pl-11 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="absolute top-1.5 right-1.5 h-9 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Search
                  </button>

                  {suggestions.length > 0 && (
                    <div className="absolute right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate(`/products/${s.id}`)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <span>
                            <span className="font-semibold text-slate-900 dark:text-white">{s.name}</span>
                            <span className="ml-2 text-xs text-slate-500">{s.categoryName}</span>
                          </span>
                          <span className="tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {formatINR(s.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/shop"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700"
                >
                  <span>{t.shopDailyEssentials}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/coupons"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <Tag className="h-4 w-4 text-amber-600" />
                  <span>₹ Deals & Coupons</span>
                </Link>
              </div>
            </div>

            {/* Right Visual Showcase: Rotating Delivery Boy Coming in on Bike */}
            <div className="relative flex min-h-[300px] flex-col items-center justify-end overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 p-6 lg:col-span-5">
              <img
                src="/src/assets/images/hero_grocery_storefront_1795318883392.jpg"
                alt="FreshCart neighborhood grocery store"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/35 to-transparent" />

              <button
                type="button"
                onClick={cycleRider}
                className="relative z-10 mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-white/25"
              >
                <RefreshCw className="h-3 w-3" />
                <span>
                  {activeRider.badgeText} · Switch Rider
                </span>
              </button>

              <motion.div
                key={activeRiderIndex}
                initial={{ x: -170, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 70, damping: 14 }}
                className="relative z-10 w-60 sm:w-64"
              >
                <ScooterBoy
                  riderIndex={activeRiderIndex}
                  mood={heroMood}
                  headlightOn
                  showDust
                  basketItems={cart.items}
                  boxOpen={cart.itemCount > 0}
                  eyeOffsetX={searchFocused ? Math.min(3, searchQuery.length * 0.2) : 0}
                  speechBubble={heroBubble}
                  onRiderTap={() => {
                    setRiderTip(`${activeRider.name} · ${activeRider.plateNumber} ready!`);
                    setTimeout(() => setRiderTip(null), 1800);
                  }}
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Interactive Marquee Animated Scooter Track */}
        <DashboardScooterMarquee />

        {/* Categories Strip */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Daily Kirana & Fresh Aisles</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10 aisles · {products.length} everyday grocery products
              </p>
            </div>
            <Link to="/shop" className="text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400">
              View All {products.length}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 transition-all hover:border-emerald-300 hover:shadow-sm dark:border-emerald-950/60 dark:bg-[#0D1D17] dark:hover:border-emerald-700"
              >
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                    {cat.name}
                  </div>
                  <div className="tabular-nums text-xs text-slate-500 dark:text-slate-400">{cat.productCount} items</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Curated Product Collection */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Curated Fresh Kitchen Picks</h2>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-emerald-50 p-1 dark:bg-slate-900">
              {(
                [
                  ['trending', 'Trending'],
                  ['featured', 'Featured'],
                  ['bestsellers', 'Best Sellers'],
                  ['offers', 'Value Offers'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === key
                      ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tabProducts.slice(0, 9).map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        </section>

        {recentlyViewed.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-slate-900 dark:text-white">Recently Viewed</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentlyViewed.slice(0, 3).map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
