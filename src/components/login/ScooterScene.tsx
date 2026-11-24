import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Apple,
  Bell,
  Flame,
  HardHat,
  Lightbulb,
  Moon as SleepIcon,
  PackageOpen,
  Play,
  RotateCw,
  Smile,
  Square,
  CloudRain,
} from 'lucide-react';
import { GroceryParticles } from './GroceryParticles';
import { scooterSound } from '../../utils/scooterSound';
import type { ScooterMood } from '../../animations/ScooterBoy';

interface ScooterSceneProps {
  parallaxX: number;
  parallaxY: number;
  celebrating?: boolean;
  darkMode?: boolean;
  onToggleTheme?: () => void;
  onSelectGrocery?: (tip: string) => void;
  onStoreClick?: () => void;
  onHonk?: () => void;
  onToggleBox?: () => void;
  onRevScooter?: () => void;
  onToggleHeadlight?: () => void;
  onToggleMarquee?: () => void;
  onToggleCap?: () => void;
  onSelectEmotion?: (mood: ScooterMood | null) => void;
  boxOpen?: boolean;
  headlightOn?: boolean;
  hasCap?: boolean;
  movingMarquee?: boolean;
  stoppedByTouch?: boolean;
  manualMood?: ScooterMood | null;
  children?: React.ReactNode;
}

export const ScooterScene: React.FC<ScooterSceneProps> = ({
  parallaxX,
  parallaxY,
  celebrating = false,
  darkMode = false,
  onToggleTheme,
  onSelectGrocery,
  onStoreClick,
  onHonk,
  onToggleBox,
  onRevScooter,
  onToggleHeadlight,
  onToggleMarquee,
  onToggleCap,
  onSelectEmotion,
  boxOpen = false,
  headlightOn = true,
  hasCap = true,
  movingMarquee = false,
  stoppedByTouch = false,
  manualMood = null,
  children,
}) => {
  const reduced = useReducedMotion();
  const [storeLit, setStoreLit] = useState(false);

  const handleStorePress = () => {
    setStoreLit(true);
    scooterSound.playChime();
    onStoreClick?.();
    setTimeout(() => setStoreLit(false), 1800);
  };

  const emotionButtons: Array<{
    mood: ScooterMood;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
  }> = [
    {
      mood: 'celebrate',
      label: 'Happy',
      icon: <Smile className="h-3.5 w-3.5 text-emerald-600" />,
      activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    },
    {
      mood: 'angry',
      label: 'Angry',
      icon: <Flame className="h-3.5 w-3.5 text-rose-600" />,
      activeClass: 'border-rose-500 bg-rose-50 text-rose-900',
    },
    {
      mood: 'eating',
      label: 'Eat',
      icon: <Apple className="h-3.5 w-3.5 text-red-500" />,
      activeClass: 'border-amber-500 bg-amber-50 text-amber-900',
    },
    {
      mood: 'sleeping',
      label: 'Sleep',
      icon: <SleepIcon className="h-3.5 w-3.5 text-indigo-600" />,
      activeClass: 'border-indigo-500 bg-indigo-50 text-indigo-900',
    },
    {
      mood: 'sad',
      label: 'Sad',
      icon: <CloudRain className="h-3.5 w-3.5 text-sky-600" />,
      activeClass: 'border-sky-500 bg-sky-50 text-sky-900',
    },
  ];

  return (
    <div className="relative flex h-full min-h-[500px] w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-100 p-6 sm:p-10 dark:from-[#071A24] dark:via-[#0B1E1B] dark:to-[#0C291B]">
      {/* Interactive Warm Sunlight / Crescent Moon */}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={darkMode ? 'Switch town to morning sunlight' : 'Switch town to starry night'}
        title={darkMode ? 'Switch to sunlit day' : 'Switch to starry night'}
        className="absolute top-6 right-8 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
      >
        {darkMode ? (
          <div className="h-9 w-9 rounded-full bg-amber-200 shadow-[0_0_25px_rgba(253,230,138,0.6)]">
            <div className="ml-2.5 h-7 w-7 rounded-full bg-[#071A24]" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-amber-300 shadow-[0_0_32px_rgba(251,191,36,0.75)]" />
        )}
      </button>

      {/* Atmospheric Glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.48)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(16,185,129,0.16)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* Twinkling Stars in Night Mode */}
      {darkMode && !reduced && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44" aria-hidden="true">
          {[
            { left: '14%', top: '18%' },
            { left: '34%', top: '12%' },
            { left: '58%', top: '22%' },
            { left: '74%', top: '10%' },
          ].map((star, idx) => (
            <motion.div
              key={idx}
              style={star}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.2 + idx * 0.4, repeat: Infinity }}
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-100"
            />
          ))}
        </div>
      )}

      {/* Continuously Moving Clouds with Parallax */}
      <motion.div
        style={{ x: reduced ? 0 : parallaxX * -0.4, y: reduced ? 0 : parallaxY * -0.3 }}
        className="pointer-events-none absolute inset-x-0 top-6 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <motion.svg
          viewBox="0 0 800 130"
          className="w-full opacity-90 dark:opacity-25"
          animate={reduced ? undefined : { x: [-20, 24, -20] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        >
          <g fill="#FFFFFF">
            <ellipse cx="120" cy="48" rx="46" ry="20" />
            <ellipse cx="148" cy="40" rx="32" ry="22" />
            <ellipse cx="98" cy="52" rx="28" ry="16" />

            <ellipse cx="440" cy="36" rx="54" ry="22" />
            <ellipse cx="472" cy="28" rx="34" ry="24" />
            <ellipse cx="412" cy="40" rx="30" ry="17" />

            <ellipse cx="690" cy="58" rx="42" ry="18" />
            <ellipse cx="715" cy="50" rx="28" ry="20" />
          </g>
        </motion.svg>
      </motion.div>

      {/* Wind-Blown Floating Leaves & Flying Butterflies */}
      {!reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`leaf-${i}`}
              initial={{ x: -30, y: 80 + i * 75, opacity: 0 }}
              animate={{
                x: ['0%', '100%'],
                y: [80 + i * 70, 50 + i * 85, 90 + i * 65],
                opacity: [0, 0.85, 0],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 11 + i * 2, delay: i * 2.5, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-500">
                <path d="M3 16 Q5 4 17 4 Q15 15 3 16 Z" fill="currentColor" />
              </svg>
            </motion.div>
          ))}

          {/* Flying Butterflies */}
          {[0, 1].map((b) => (
            <motion.div
              key={`bf-${b}`}
              style={{ left: b === 0 ? '26%' : '66%', top: b === 0 ? '30%' : '24%' }}
              animate={{ x: [0, 28, -14, 0], y: [0, -18, 10, 0] }}
              transition={{ duration: 7 + b * 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute"
            >
              <motion.svg
                viewBox="0 0 28 24"
                className="h-5 w-5"
                animate={{ scaleX: [1, 0.45, 1] }}
                transition={{ duration: 0.35, repeat: Infinity }}
              >
                <ellipse cx="9" cy="11" rx="6" ry="8" fill={b === 0 ? '#F59E0B' : '#38BDF8'} opacity="0.88" />
                <ellipse cx="19" cy="11" rx="6" ry="8" fill={b === 0 ? '#FBBF24' : '#7DD3FC'} opacity="0.88" />
                <rect x="13" y="6" width="2" height="12" rx="1" fill="#0F172A" />
              </motion.svg>
            </motion.div>
          ))}
        </div>
      )}

      {/* Interactive Grocery Particles Layer */}
      <GroceryParticles celebrating={celebrating} onSelectGrocery={onSelectGrocery} />

      {/* Miniature 3D Grocery Town Backdrop */}
      <motion.svg
        viewBox="0 0 800 320"
        preserveAspectRatio="none"
        style={{ x: reduced ? 0 : parallaxX * 0.5, y: reduced ? 0 : parallaxY * 0.25 }}
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-[58%] w-full"
      >
        <defs>
          <linearGradient id="townHillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={darkMode ? '#14532D' : '#86EFAC'} />
            <stop offset="100%" stopColor={darkMode ? '#052E16' : '#22C55E'} />
          </linearGradient>
          <linearGradient id="townHillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={darkMode ? '#166534' : '#4ADE80'} />
            <stop offset="100%" stopColor={darkMode ? '#064E3B' : '#15803D'} />
          </linearGradient>
          <linearGradient id="townRoad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        <path d="M0 175 Q180 95 400 155 T800 135 L800 320 L0 320 Z" fill="url(#townHillBack)" opacity="0.78" />
        <path d="M0 200 Q240 150 470 195 T800 180 L800 320 L0 320 Z" fill="url(#townHillFront)" />

        {/* Clickable Miniature 3D FreshCart Neighborhood Grocery Store */}
        <g
          transform="translate(88, 92)"
          onClick={handleStorePress}
          className="pointer-events-auto cursor-pointer"
        >
          <ellipse cx="82" cy="116" rx="84" ry="10" fill="#064E3B" opacity="0.28" />
          <rect x="14" y="34" width="136" height="80" rx="8" fill={darkMode ? '#1E293B' : '#FFFFFF'} stroke={storeLit ? '#FACC15' : '#E2E8F0'} strokeWidth="2" />
          <polygon points="150,34 170,44 170,114 150,114" fill={darkMode ? '#0F172A' : '#E2E8F0'} />
          <path d="M8 34 L156 34 L164 52 L0 52 Z" fill="#16A34A" />
          <rect x="24" y="34" width="20" height="18" fill="#FFFFFF" opacity="0.9" />
          <rect x="64" y="34" width="20" height="18" fill="#FFFFFF" opacity="0.9" />
          <rect x="104" y="34" width="20" height="18" fill="#FFFFFF" opacity="0.9" />
          <rect x="34" y="8" width="96" height="22" rx="6" fill={storeLit ? '#15803D' : '#14532D'} />
          <text x="82" y="23" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
            FreshCart
          </text>
          <rect x="26" y="62" width="44" height="36" rx="4" fill={darkMode || storeLit ? '#FDE68A' : '#BAE6FD'} />
          <rect x="104" y="62" width="34" height="36" rx="4" fill={darkMode || storeLit ? '#FDE68A' : '#BAE6FD'} />
          <rect x="76" y="66" width="22" height="48" rx="3" fill="#0F766E" />
          <rect x="24" y="98" width="44" height="14" rx="3" fill="#B45309" />
          <circle cx="32" cy="96" r="4" fill="#EF4444" />
          <circle cx="42" cy="96" r="4" fill="#22C55E" />
          <circle cx="52" cy="96" r="4" fill="#F59E0B" />
        </g>

        <motion.g
          transform="translate(26, 128)"
          animate={reduced ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '22px', originY: '72px' }}
        >
          <rect x="18" y="42" width="8" height="32" rx="3" fill="#78350F" />
          <circle cx="22" cy="30" r="22" fill="#15803D" />
          <circle cx="14" cy="26" r="14" fill="#22C55E" />
        </motion.g>
        <motion.g
          transform="translate(650, 120)"
          animate={reduced ? undefined : { rotate: [1.5, -1.5, 1.5] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '29px', originY: '84px' }}
        >
          <rect x="24" y="48" width="10" height="38" rx="3" fill="#78350F" />
          <circle cx="29" cy="34" r="28" fill="#15803D" />
          <circle cx="20" cy="28" r="18" fill="#4ADE80" />
        </motion.g>
        <g transform="translate(725, 148)">
          <circle cx="18" cy="24" r="16" fill="#16A34A" />
          <circle cx="32" cy="28" r="13" fill="#22C55E" />
        </g>

        {/* Curved Road Across the Scene */}
        <path d="M-20 265 Q240 205 460 250 T830 232 L830 320 L-20 320 Z" fill="url(#townRoad)" />
        <path
          d="M-10 292 Q240 232 460 278 T820 260"
          fill="none"
          stroke="#FDE047"
          strokeWidth="3.5"
          strokeDasharray="18 16"
          strokeLinecap="round"
          opacity="0.85"
        />
      </motion.svg>

      {/* Top Promotional Header */}
      <div className="relative z-10 max-w-md pr-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          FreshCart Neighborhood Express
        </span>
        <h2
          className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
          style={{ textWrap: 'balance' }}
        >
          Freshness is just one ride away!
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Your groceries. Your doorstep. Your happiness.
        </p>
      </div>

      {/* Interactive Rider Stage + Marquee & Emotion Controls */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-end gap-3 pt-6 pb-1">
        {children}

        {/* Bike Action Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMarquee}
            data-testid="move-bike-btn"
            className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-xs backdrop-blur transition-colors ${
              movingMarquee && !stoppedByTouch
                ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border-white/75 bg-white/90 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100'
            }`}
          >
            {movingMarquee && !stoppedByTouch ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3 text-emerald-600" />}
            <span>
              {movingMarquee && !stoppedByTouch ? 'Cruising (Touch to Stop)' : stoppedByTouch ? 'Resume Move' : 'Move Bike'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleHeadlight}
            data-testid="toggle-light-btn"
            className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-xs backdrop-blur transition-colors ${
              headlightOn
                ? 'border-amber-300 bg-amber-50/95 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                : 'border-slate-300 bg-slate-800 text-slate-100'
            }`}
          >
            <Lightbulb className={`h-3.5 w-3.5 ${headlightOn ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>{headlightOn ? 'Light On' : 'Light Off'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleCap}
            data-testid="toggle-cap-btn"
            className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-xs backdrop-blur transition-colors ${
              !hasCap
                ? 'border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                : 'border-white/75 bg-white/90 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200'
            }`}
          >
            <HardHat className={`h-3.5 w-3.5 ${hasCap ? 'text-emerald-600' : 'text-rose-500'}`} />
            <span>{hasCap ? 'Remove Cap' : 'Wear Cap'}</span>
          </button>

          <button
            type="button"
            onClick={onHonk}
            data-testid="honk-btn"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/75 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
          >
            <Bell className="h-3.5 w-3.5 text-emerald-600" />
            <span>Horn</span>
          </button>

          <button
            type="button"
            onClick={onRevScooter}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/75 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
          >
            <RotateCw className="h-3.5 w-3.5 text-emerald-600" />
            <span>Rev</span>
          </button>

          <button
            type="button"
            onClick={onToggleBox}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/75 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
          >
            <PackageOpen className="h-3.5 w-3.5 text-emerald-600" />
            <span>{boxOpen ? 'Close Box' : 'Box'}</span>
          </button>
        </div>

        {/* Rider Emotions Strip */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/60 bg-white/65 px-2.5 py-1.5 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/65">
          <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Moods
          </span>
          {emotionButtons.map((btn) => {
            const active = manualMood === btn.mood;
            return (
              <button
                key={btn.mood}
                type="button"
                onClick={() => onSelectEmotion?.(active ? null : btn.mood)}
                className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition ${
                  active
                    ? btn.activeClass
                    : 'border-slate-200/80 bg-white/90 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
