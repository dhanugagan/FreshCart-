import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { cartService } from '../services/cartService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatINR } from '../utils/currency';

export const WishlistPage: React.FC = () => {
  const { user, wishlist, refreshWishlist, refreshCart, pushToast, activeRiderIndex } = useApp();
  const { t } = useLanguage();

  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-emerald-950/60 dark:bg-[#131C17]">
        <h1 className="font-display text-2xl font-bold">Sign In to View Your Wishlist</h1>
        <Link to="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          {t.signIn}
        </Link>
      </div>
    );
  }

  const handleMoveToCart = async (id: number) => {
    try {
      await cartService.moveWishlistToCart(id);
      await Promise.all([refreshWishlist(), refreshCart()]);
      pushToast('success', 'Moved item to your basket');
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  const handleRemove = async (id: number) => {
    await cartService.removeFromWishlist(id);
    await refreshWishlist();
    pushToast('info', 'Removed from wishlist');
  };

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t.navWishlist}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Your favourite daily essentials saved in your account</p>
          </div>
          <div className="w-28">
            <ScooterBoy riderIndex={activeRiderIndex} mood={wishlist.length > 0 ? 'heart' : 'sad'} />
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-emerald-950/60 dark:bg-[#131C17]">
            <div className="w-48">
              <ScooterBoy riderIndex={activeRiderIndex} mood="heart" speechBubble="Tap the heart on any item to save it here!" />
            </div>
            <h2 className="mt-3 font-display text-xl font-bold">Your wishlist is empty</h2>
            <Link to="/shop" className="mt-5 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
              {t.shopDailyEssentials}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((item) => (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-emerald-950/60 dark:bg-[#131C17]">
                <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="text-xs text-slate-500">
                    {item.brand} · {item.unit}
                  </div>
                  <Link to={`/products/${item.productId}`} className="mt-1 font-display text-base font-semibold hover:text-emerald-700">
                    {item.name}
                  </Link>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="font-mono-nums text-base font-bold">{formatINR(item.effectivePrice)}</span>
                    <span className={item.stockQuantity > 0 ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-rose-600'}>
                      {item.stockQuantity > 0 ? `${item.stockQuantity} in stock` : t.outOfStock}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={item.stockQuantity <= 0}
                      onClick={() => handleMoveToCart(item.id)}
                      data-testid={`move-to-cart-${item.id}`}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Move to Basket</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove from wishlist"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPageTransition>
  );
};
