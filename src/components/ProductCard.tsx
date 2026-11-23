import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, Plus, ShoppingBag, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { productUploadSoonImg } from '../assets/brandAssets';
import type { Product } from '../types';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { cart, addToCart, toggleWishlist, isInWishlist } = useApp();
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);
  const saved = isInWishlist(product.id);
  const outOfStock = product.stockQuantity <= 0;
  const inCartQty = cart.items.find((i) => i.productId === product.id)?.quantity || 0;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    await addToCart(product.id, 1);
    setAdding(false);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.025, 0.2) }}
      whileHover={{ y: -3 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-xs transition-all hover:border-emerald-300 hover:shadow-md dark:border-emerald-950/60 dark:bg-[#0D1D17]"
    >
      <Link to={`/products/${product.id}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden">
            <img
              src={productUploadSoonImg}
              alt={`${product.name} image uploading in a few mins`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent px-3 pt-6 pb-2.5 text-[11px] font-semibold text-white">
              <span className="truncate">{product.categoryName}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                <ShoppingBag className="h-3 w-3" />
                <span>Uploading in a few mins...</span>
              </span>
            </div>
          </div>
        )}

        {product.discountPercent > 0 && (
          <span className="absolute top-3 left-3 rounded-lg bg-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
            {product.discountPercent}% OFF
          </span>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-colors ${
            saved
              ? 'border-rose-200 bg-rose-500 text-white'
              : 'border-white/70 bg-white/85 text-slate-700 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200'
          }`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
        </button>

        {outOfStock && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/75 px-3 py-1.5 text-center text-xs font-medium text-white backdrop-blur-sm">
            {t.outOfStock}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{product.brand}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 font-medium">{product.unit}</span>
        </div>

        <Link
          to={`/products/${product.id}`}
          className="mt-1.5 line-clamp-1 font-display text-base font-bold text-slate-900 transition-colors hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400"
        >
          {product.name}
        </Link>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{product.rating.toFixed(1)}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{product.reviewCount} reviews</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-baseline gap-2">
            <span className="tabular-nums text-base font-extrabold text-slate-900 dark:text-white">
              {formatINR(product.effectivePrice)}
            </span>
            {product.discountPercent > 0 && (
              <span className="tabular-nums text-xs text-slate-400 line-through">
                {formatINR(product.price)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock || adding}
            onClick={handleAdd}
            data-testid={`add-to-cart-${product.id}`}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 whitespace-nowrap shrink-0 ${
              inCartQty > 0
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
            }`}
          >
            {inCartQty > 0 ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{adding ? '...' : outOfStock ? t.outOfStock : inCartQty > 0 ? `${t.addToCart} (${inCartQty})` : t.addToCart}</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
};
