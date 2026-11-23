import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, LoadingAnimation } from '../animations/MotionPrimitives';
import { ProductCard } from '../components/ProductCard';
import { productService } from '../services/productService';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import type { Category, Product } from '../types';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { cart, activeRider, activeRiderIndex, cycleRider } = useApp();
  const { t } = useLanguage();
  const selectedCategory = searchParams.get('category') || 'all';
  const [sort, setSort] = useState('popular');
  const [priceTier, setPriceTier] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    productService
      .getProducts({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        priceTier: priceTier === 'all' ? undefined : priceTier,
        sort,
        limit: 120,
      })
      .then((res) => {
        if (active) setProducts(res.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCategory, sort, priceTier]);

  const activeCategoryName =
    selectedCategory === 'all'
      ? 'All 100 Daily Essentials'
      : categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory;

  const basketPreview = cart.items.map((item) => ({ name: item.name, quantity: item.quantity }));

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/50 p-5 sm:p-6 shadow-sm dark:border-emerald-950/60 dark:from-[#131C17] dark:via-[#112219] dark:to-[#131C17]">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-100/90 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              <span>{activeRider.badgeText}</span>
              <span aria-hidden="true">·</span>
              <span>{activeRider.cityHub}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
              {activeCategoryName}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {products.length} daily Indian groceries priced in ₹ · {t.freeDeliveryAbove}
            </p>

            {/* Live basket readout showing picked items loaded onto bike box */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {cart.itemCount > 0 ? (
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    {t.riderBasketPreview}: {cart.itemCount} item{cart.itemCount > 1 ? 's' : ''} ({formatINR(cart.totalAmount)})
                  </span>
                </Link>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Tap <strong>{t.addToCart}</strong> on any item to load it into {activeRider.name.split(' ')[0]}&apos;s delivery box!
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                data-testid="shop-sort-select"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="popular">Sort: Popularity</option>
                <option value="price_asc">Price: Low to High (₹)</option>
                <option value="price_desc">Price: High to Low (₹)</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Arrivals</option>
              </select>

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Price range filter">
                {(
                  [
                    ['all', 'All ₹'],
                    ['low', 'Low (≤₹99)'],
                    ['medium', 'Medium (₹100–₹250)'],
                    ['high', 'High (₹251+)'],
                  ] as const
                ).map(([tierKey, label]) => (
                  <button
                    key={tierKey}
                    type="button"
                    onClick={() => setPriceTier(tierKey)}
                    data-testid={`shop-price-tier-${tierKey}`}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      priceTier === tierKey
                        ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={cycleRider}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Switch Bike &amp; Boy</span>
              </button>
            </div>
          </div>

          <div className="w-52 shrink-0 sm:w-60">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood={cart.itemCount > 0 ? 'thumbs-up' : 'waving'}
              boxOpen={cart.itemCount > 0 || selectedCategory !== 'all'}
              basketItems={basketPreview}
              headlightOn
              speechBubble={
                cart.itemCount > 0
                  ? `${cart.itemCount} packed in my box!`
                  : `Rolling through ${activeCategoryName}!`
              }
            />
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs dark:border-emerald-600 dark:bg-emerald-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            All 10 Aisles
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSearchParams({ category: cat.slug })}
              data-testid={`cat-filter-${cat.slug}`}
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.slug
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs dark:border-emerald-600 dark:bg-emerald-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingAnimation />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
