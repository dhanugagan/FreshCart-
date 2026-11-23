import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ScooterBoy } from './ScooterBoy';

export const ScooterRideAnimation: React.FC<{ className?: string; speechBubble?: string }> = ({
  className = '',
  speechBubble,
}) => (
  <ScooterBoy mood="riding" headlightOn className={className} speechBubble={speechBubble} />
);

export const ScooterIdleAnimation: React.FC<{ className?: string; speechBubble?: string }> = ({
  className = '',
  speechBubble,
}) => <ScooterBoy mood="idle" className={className} speechBubble={speechBubble} />;

export const ScooterSuccessAnimation: React.FC<{ className?: string; speechBubble?: string }> = ({
  className = '',
  speechBubble = 'Order ready! Rolling out fresh.',
}) => <ScooterBoy mood="celebrate" headlightOn className={className} speechBubble={speechBubble} />;

export const ScooterErrorAnimation: React.FC<{ className?: string; speechBubble?: string }> = ({
  className = '',
  speechBubble = "Hmm, let's double-check that!",
}) => <ScooterBoy mood="confused" className={className} speechBubble={speechBubble} />;

export const ScooterDeliveryAnimation: React.FC<{ progressPercent?: number; className?: string }> = ({
  progressPercent = 40,
  className = '',
}) => {
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(8, progressPercent));
  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-sky-200 via-sky-50 to-emerald-100/80 dark:border-emerald-900/50 dark:from-[#081A22] dark:via-[#0E211C] dark:to-[#10291D]">
        {/* Clouds */}
        {!reduced && (
          <motion.div
            animate={{ x: [-12, 18, -12] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute top-3 left-10 flex w-full justify-around opacity-75 dark:opacity-20"
            aria-hidden="true"
          >
            <div className="h-5 w-16 rounded-full bg-white" />
            <div className="h-4 w-12 rounded-full bg-white" />
            <div className="h-5 w-14 rounded-full bg-white" />
          </motion.div>
        )}

        {/* Miniature Town Hills & Road */}
        <svg viewBox="0 0 600 90" preserveAspectRatio="none" className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 w-full" aria-hidden="true">
          <path d="M0 32 Q150 6 300 28 T600 20 L600 90 L0 90 Z" fill="#4ADE80" opacity="0.45" />
          <rect x="0" y="54" width="600" height="36" fill="#1E293B" />
          <line x1="0" y1="72" x2="600" y2="72" stroke="#FDE047" strokeWidth="2.5" strokeDasharray="14 12" />
        </svg>

        {/* Active Progress Track Overlay */}
        <div className="absolute right-6 bottom-5 left-6 h-1.5 rounded-full bg-slate-600/50">
          <motion.div
            className="h-full rounded-full bg-emerald-400"
            initial={{ width: '0%' }}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Moving Interactive Scooter Rider */}
        <motion.div
          className="absolute bottom-2.5"
          initial={{ left: '4%' }}
          animate={{ left: `${Math.min(82, Math.max(4, progressPercent * 0.8))}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-28">
            <ScooterBoy mood={progressPercent >= 100 ? 'waving' : 'riding'} headlightOn showDust={progressPercent < 100} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export const ScooterGoodbyeAnimation: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { x: -20, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { x: [0, 36, 90], opacity: [1, 1, 0.9] }}
      transition={{ duration: 2.8, ease: 'easeInOut' }}
      className={className}
    >
      <ScooterBoy mood="goodbye" headlightOn speechBubble="See you soon!" />
    </motion.div>
  );
};

export const FloatingGroceries: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const reduced = useReducedMotion();
  if (!active) return null;

  const items = [
    { label: 'Avocado', color: '#16A34A', x: '8%', y: '18%', delay: 0 },
    { label: 'Citrus', color: '#F59E0B', x: '84%', y: '14%', delay: 0.4 },
    { label: 'Leaf', color: '#22C55E', x: '14%', y: '74%', delay: 0.8 },
    { label: 'Berry', color: '#E11D48', x: '86%', y: '72%', delay: 1.1 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((item) => (
        <motion.div
          key={item.label}
          style={{ left: item.x, top: item.y }}
          animate={reduced ? undefined : { y: [-8, 8, -8], rotate: [-6, 6, -6] }}
          transition={{ duration: 4.5, delay: item.delay, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute h-10 w-10 rounded-full border border-white/60 bg-white/75 p-2 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/70"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <circle cx="12" cy="12" r="8" fill={item.color} opacity="0.88" />
            <path d="M12 4 C14 2 17 3 16 6" stroke="#15803D" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

export const AnimatedPageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

export const LoadingAnimation: React.FC<{ label?: string }> = ({ label = 'Loading fresh groceries...' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-28">
      <ScooterRideAnimation />
    </div>
    <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
  </div>
);

export const SuccessAnimation: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="flex flex-col items-center text-center"
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
      <CheckCircle2 className="h-8 w-8" />
    </div>
    <h3 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
    {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
  </motion.div>
);

export const ErrorAnimation: React.FC<{ message: string }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="animate-shake-x flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    role="alert"
  >
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span>{message}</span>
  </motion.div>
);

export const ConfettiBurst: React.FC<{ active: boolean }> = ({ active }) => {
  const reduced = useReducedMotion();
  if (!active || reduced) return null;
  const particles = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    angle: (i / 18) * Math.PI * 2,
    dist: 60 + (i % 3) * 35,
    color: ['#16A34A', '#0EA5E9', '#F59E0B', '#EC4899'][i % 4],
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist * 2,
            y: Math.sin(p.angle) * p.dist * 2 - 40,
            scale: 0,
            opacity: 0,
            rotate: 220,
          }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="absolute h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
      <Sparkles className="h-6 w-6 text-emerald-500 opacity-0" />
    </div>
  );
};
