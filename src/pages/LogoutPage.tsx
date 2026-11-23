import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Leaf, LogOut } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { ScooterGoodbyeAnimation } from '../animations/MotionPrimitives';
import { DeliveryBagPullSwitch } from '../components/login/DeliveryBagPullSwitch';
import { useApp } from '../context/AppContext';

export const LogoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { logoutUser, activeRiderIndex, activeRider } = useApp();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirmLogout = async () => {
    setBusy(true);
    await logoutUser();
    setConfirmed(true);
    setBusy(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-[#FFFDF7] to-sky-50 px-4 py-12 dark:from-[#07130F] dark:via-[#0B1713] dark:to-[#0C1814]">
      {confirmed && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: -260, opacity: [0, 1, 0], x: (i - 2) * 55 }}
              transition={{ duration: 3, delay: i * 0.25, repeat: Infinity }}
              className="absolute bottom-24 left-1/2"
            >
              {i % 2 === 0 ? (
                <Heart className="h-6 w-6 fill-rose-400 text-rose-400" />
              ) : (
                <Leaf className="h-6 w-6 text-emerald-500" />
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative z-10 flex w-full max-w-md justify-center">
        <DeliveryBagPullSwitch
          title={confirmed ? 'FreshCart Goodbye Bag' : 'FreshCart Sign-Out Bag'}
          subtitle="Pull cord switch to pack or unpack"
          closedLabel="Sign-out bag tied shut — pull cord above to open!"
          initialOpen={false}
        >
          <div className="w-full rounded-3xl border border-slate-200/80 bg-white/92 p-8 text-center shadow-xl backdrop-blur dark:border-emerald-950/60 dark:bg-[#0D1D17]/92">
            {!confirmed ? (
              <>
                <div className="mx-auto w-56">
                  <ScooterBoy
                    riderIndex={activeRiderIndex}
                    mood="waving"
                    speechBubble={`${activeRider.name} asks: Leaving so soon?`}
                  />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Sign Out of FreshCart?</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Your cart and wishlist stay safely saved in your account for your next visit.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    data-testid="stay-logged-in"
                    className="h-11 rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Stay Logged In
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleConfirmLogout}
                    data-testid="confirm-logout"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{busy ? 'Signing Out...' : 'Logout'}</span>
                  </button>
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4">
                <div className="mx-auto w-64">
                  <ScooterGoodbyeAnimation />
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  Thank You for Shopping with FreshCart!
                </h1>
                <p className="mt-2 text-base font-medium text-slate-700 dark:text-slate-200">See You Soon!</p>
                <div className="mt-7 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    data-testid="back-to-home"
                    className="h-11 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </DeliveryBagPullSwitch>
      </div>
    </div>
  );
};
