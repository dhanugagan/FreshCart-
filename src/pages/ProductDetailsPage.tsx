import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, LoadingAnimation } from '../animations/MotionPrimitives';
import { ProductCard } from '../components/ProductCard';
import { productService } from '../services/productService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';
import { productUploadSoonImg } from '../assets/brandAssets';
import type { Product, ProductReview } from '../types';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams();
  const {
    cart,
    activeRiderIndex,
    addToCart,
    toggleWishlist,
    isInWishlist,
    trackRecentlyViewed,
    user,
    pushToast,
  } = useApp();
  const { t } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = async (pid: number) => {
    setLoading(true);
    try {
      const data = await productService.getProductById(pid);
      setProduct(data.product);
      setReviews(data.reviews);
      setRelated(data.related);
      setQty(1);
      trackRecentlyViewed(data.product);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pid = Number(id);
    if (pid) loadProduct(pid);
  }, [id]);

  const handleAdd = async () => {
    if (!product) return;
    const ok = await addToCart(product.id, qty);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2600);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingReview(true);
    try {
      await productService.addReview(product.id, reviewRating, reviewComment);
      setReviewComment('');
      pushToast('success', 'Thank you for your review!');
      await loadProduct(product.id);
    } catch (err) {
      pushToast('error', extractApiError(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <LoadingAnimation />;
  if (!product) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <h1 className="font-display text-xl font-bold">Product Not Found</h1>
        <Link to="/shop" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const outOfStock = product.stockQuantity <= 0;
  const saved = isInWishlist(product.id);
  const basketPreview = cart.items.map((i) => ({ name: i.name, quantity: i.quantity }));

  return (
    <AnimatedPageTransition>
      <div className="space-y-10">
        <Link to="/shop" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 dark:text-slate-400">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </Link>

        {/* Contiguous Purchase Module */}
        <div className="grid items-start gap-8 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 lg:grid-cols-12 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <div className="group relative overflow-hidden rounded-2xl bg-slate-100 lg:col-span-6 dark:bg-slate-900">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={productUploadSoonImg}
                  alt={`${product.name} image uploading in a few mins`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/85 via-slate-900/45 to-transparent px-5 pt-10 pb-4 text-sm font-semibold text-white">
                  <span>{product.name}</span>
                  <span className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 shadow-xs">
                    Image uploading in a few mins...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 lg:col-span-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="uppercase tracking-wide">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span>{product.unit}</span>
            </div>

            <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{product.name}</h1>

            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold tabular-nums">{product.rating.toFixed(1)}</span>
              <span className="text-slate-500">({product.reviewCount} reviews)</span>
              <span aria-hidden="true">·</span>
              <span className={outOfStock ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700 dark:text-emerald-400'}>
                {outOfStock ? t.outOfStock : `${product.stockQuantity} in stock`}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-mono-nums text-3xl font-extrabold text-slate-900 dark:text-white">
                {formatINR(product.effectivePrice)}
              </span>
              {product.discountPercent > 0 && (
                <>
                  <span className="font-mono-nums text-base text-slate-400 line-through">{formatINR(product.price)}</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Save {product.discountPercent}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{product.description}</p>

            {/* Quantity & Action Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={qty <= 1 || outOfStock}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-mono-nums text-sm font-bold">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={qty >= product.stockQuantity || outOfStock}
                  onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                  className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={handleAdd}
                data-testid="pdp-add-to-cart"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{outOfStock ? t.outOfStock : t.addToCart}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                data-testid="pdp-wishlist-btn"
                aria-label="Save to wishlist"
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  saved
                    ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>

            {justAdded && (
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="w-28 shrink-0">
                  <ScooterBoy
                    riderIndex={activeRiderIndex}
                    mood="thumbs-up"
                    boxOpen
                    basketItems={basketPreview}
                  />
                </div>
                <div className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  Added {qty} × {product.name} to your FreshCart delivery basket!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <section className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 lg:col-span-5 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="font-display text-lg font-bold">Write a Review</h2>
            {user ? (
              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value={5}>5 Stars — Exceptional</option>
                    <option value={4}>4 Stars — Very Fresh</option>
                    <option value={3}>3 Stars — Good</option>
                    <option value={2}>2 Stars — Fair</option>
                    <option value={1}>1 Star — Poor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Comment</label>
                  <textarea
                    rows={3}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share freshness and quality feedback..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  {submittingReview ? 'Posting...' : 'Post Review'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                  {t.signIn}
                </Link>{' '}
                to share a verified customer review.
              </p>
            )}
          </div>

          <div className="space-y-3 lg:col-span-7">
            <h2 className="font-display text-lg font-bold">Customer Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-sm text-slate-500 dark:border-emerald-950/60 dark:bg-[#131C17]">
                No customer reviews yet. Be the first to review {product.name}!
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-emerald-950/60 dark:bg-[#131C17]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">{r.authorName}</span>
                    <span className="font-mono-nums text-amber-500">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold">Related Fresh Picks</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
