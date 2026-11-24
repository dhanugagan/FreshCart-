import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { freshCartLogo } from '../../assets/brandAssets';
import { scooterSound } from '../../utils/scooterSound';

interface DeliveryBagPullSwitchProps {
  title: string;
  subtitle?: string;
  closedLabel: string;
  openCtaLabel?: string;
  initialOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  children: React.ReactNode;
}

export const DeliveryBagPullSwitch: React.FC<DeliveryBagPullSwitchProps> = ({
  title,
  subtitle = 'Pull cord switch to tie or untie bag',
  closedLabel,
  openCtaLabel = 'Pull Tie & Open Bag',
  initialOpen = false,
  onToggle,
  children,
}) => {
  const reduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [tugging, setTugging] = useState(false);

  const handlePull = () => {
    setTugging(true);
    scooterSound.playCordPull();
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(next);
    setTimeout(() => setTugging(false), 260);
  };

  return (
    <div className="relative flex w-full max-w-md flex-col items-center">
      {/* Top Hanging Delivery Bag Header + Lamp Pull-Cord Switch */}
      <div className="relative z-20 flex w-full items-center justify-between gap-3 rounded-t-3xl border border-b-0 border-emerald-300/70 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-5 py-3 text-white shadow-md dark:border-emerald-800/80 dark:from-emerald-950 dark:via-emerald-900 dark:to-teal-950">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-300/60 bg-white shadow-xs">
            <img src={freshCartLogo} alt="FreshCart Bag Seal" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-200">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="truncate">{title}</span>
            </div>
            <p className="truncate text-[11px] text-emerald-100/90">{subtitle}</p>
          </div>
        </div>

        {/* Interactive Bag Tie / Hanging Lamp Pull Switch */}
        <button
          type="button"
          onClick={handlePull}
          data-testid="bag-tie-toggle"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Pull tie to close delivery bag' : 'Pull tie to open delivery bag'}
          className="group relative flex shrink-0 cursor-pointer flex-col items-center rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-center transition hover:bg-white/20"
        >
          {/* Glowing indicator lamp inside bag clasp */}
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-100">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full transition-all ${
                isOpen
                  ? 'bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.95)]'
                  : 'bg-slate-400/70'
              }`}
            />
            <span>{isOpen ? 'Close Bag' : 'Open Bag'}</span>
          </span>

          {/* Pull-cord & knot */}
          <motion.div
            animate={reduced ? undefined : { y: tugging ? 8 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="mt-0.5 flex flex-col items-center"
            aria-hidden="true"
          >
            <div className="h-3.5 w-0.5 bg-amber-300/90" />
            <div className="h-2.5 w-4 rounded-sm border border-amber-200 bg-amber-400 shadow-xs transition-transform group-hover:scale-110" />
          </motion.div>
        </button>
      </div>

      {/* Warm Lamp Light Beam Cone when Bag is Open */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="pointer-events-none h-2 w-[92%] bg-gradient-to-b from-amber-300/45 to-transparent"
        />
      )}

      {/* Collapsible / Unfolding Bag Contents (synchronous swap avoids WebKit AnimatePresence stalls) */}
      {isOpen ? (
        <motion.div
          key="bag-open"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          className="w-full"
        >
          <div className="[&>div]:rounded-t-none [&>div]:border-t-0">{children}</div>
        </motion.div>
      ) : (
        <motion.div
          key="bag-closed"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          className="w-full rounded-b-3xl border border-t-0 border-emerald-300/70 bg-gradient-to-b from-emerald-900/95 via-emerald-950 to-slate-950 p-7 text-center text-white shadow-xl"
        >
          {/* Tied Kraft / Insulated Bag Drawstring Illustration */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-300/40 bg-emerald-800/70 shadow-inner">
            <ShoppingBag className="h-10 w-10 text-amber-300" />
          </div>
          <h2 className="font-display text-lg font-extrabold text-amber-200">Bag Tied Shut</h2>
          <p className="mt-1.5 text-xs text-emerald-100/80">{closedLabel}</p>

          <button
            type="button"
            onClick={handlePull}
            data-testid="bag-reopen-btn"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-extrabold text-emerald-950 shadow-md transition hover:bg-amber-300"
          >
            <Sparkles className="h-4 w-4" />
            <span>{openCtaLabel}</span>
          </button>
        </motion.div>
      )}
    </div>
  );
};
