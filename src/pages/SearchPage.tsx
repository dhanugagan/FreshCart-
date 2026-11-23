import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { ProductCard } from '../components/ProductCard';
import { productService } from '../services/productService';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import type { Category, Product } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeRiderIndex } = useApp();
  const { t } = useLanguage();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [brand, setBrand] = useState('all');
  const [maxPrice, setMaxPrice] = useState(1000);
  const [priceTier, setPriceTier] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('popular');

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      productService
        .getProducts({
          q: q.trim() || undefined,
          category: category === 'all' ? undefined : category,
          brand: brand === 'all' ? undefined : brand,
          maxPrice,
          priceTier: priceTier === 'all' ? undefined : priceTier,
          minRating: minRating > 0 ? minRating : undefined,
          inStock: inStockOnly || undefined,
          sort,
          limit: 120,
        })
        .then((res) => {
          if (active) {
            setProducts(res.items);
            if (res.brands.length > 0) setBrands(res.brands);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, category, brand, maxPrice, priceTier, minRating, inStockOnly, sort]);

  const clearFilters = () => {
    setQ('');
    setCategory('all');
    setBrand('all');
    setMaxPrice(1000);
    setPriceTier('all');
    setMinRating(0);
    setInStockOnly(false);
    setSort('popular');
    setSearchParams({});
  };

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Search &amp; Filter</h1>
            <button
              type="button"
              onClick={clearFilters}
              data-testid="clear-filters-btn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Filters</span>
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                data-testid="search-page-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-11 w-full rounded-xl border border-slate-200 bg-[#FAFAF8] pr-4 pl-10 text-sm outline-none focus:border-emerald-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <select
              aria-label="Filter by category"
              data-testid="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort results"
              data-testid="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High (₹)</option>
              <option value="price_desc">Price: High to Low (₹)</option>
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Max Price:</span>
              <input
                type="range"
                min={15}
                max={1000}
                step={15}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="accent-emerald-600"
              />
              <span className="font-mono-nums font-bold text-emerald-700 dark:text-emerald-400">
                {formatINR(maxPrice, false)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
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
                  data-testid={`search-price-tier-${tierKey}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    priceTier === tierKey
                      ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Brand:</span>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Rating:</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value={0}>Any Rating</option>
                <option value={4.5}>4.5+ Stars</option>
                <option value={4.8}>4.8+ Stars</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-80 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div
            data-testid="empty-search-state"
            className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-emerald-950/60 dark:bg-[#131C17]"
          >
            <div className="w-56">
              <ScooterBoy
                riderIndex={activeRiderIndex}
                mood="searching"
                speechBubble="Let's try another search!"
              />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">No matching groceries found</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Try broadening your search keywords or resetting the price and category filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 h-10 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Reset All Filters
            </button>
          </div>
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
