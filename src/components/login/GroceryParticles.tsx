import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { scooterSound } from '../../utils/scooterSound';

interface GroceryParticlesProps {
  celebrating?: boolean;
  onSelectGrocery?: (tip: string) => void;
}

const FLOATING_ITEMS = [
  { id: 'avocado', x: '9%', y: '22%', delay: 0, dur: 4.4, label: 'Hass Avocado', tip: 'Organic Hass Avocados — creamy & ripe!' },
  { id: 'apple', x: '78%', y: '18%', delay: 0.5, dur: 4.8, label: 'Honeycrisp Apple', tip: 'Crisp Honeycrisp Apples — picked at dawn!' },
  { id: 'milk', x: '16%', y: '56%', delay: 1.0, dur: 5.2, label: 'Farm Milk', tip: 'Chilled Farmstead Milk — delivered cold!' },
  { id: 'carrot', x: '84%', y: '48%', delay: 0.8, dur: 4.6, label: 'Heirloom Carrots', tip: 'Sweet Heirloom Carrots — zero pesticides!' },
  { id: 'citrus', x: '46%', y: '14%', delay: 1.4, dur: 5.0, label: 'Valencia Orange', tip: 'Juicy Valencia Oranges — packed with sunshine!' },
];

export const GroceryParticles: React.FC<GroceryParticlesProps> = ({ celebrating = false, onSelectGrocery }) => {
  const reduced = useReducedMotion();
  const [bouncedId, setBouncedId] = useState<string | null>(null);

  const handleClick = (item: (typeof FLOATING_ITEMS)[number]) => {
    setBouncedId(item.id);
    scooterSound.playChime();
    onSelectGrocery?.(item.tip);
    setTimeout(() => setBouncedId(null), 700);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {FLOATING_ITEMS.map((item) => {
        const isBounced = bouncedId === item.id;
        return (
          <motion.button
            key={item.id}
            type="button"
            aria-label={item.label}
            title={item.label}
            onClick={() => handleClick(item)}
            style={{ left: item.x, top: item.y }}
            whileHover={reduced ? undefined : { scale: 1.22, rotate: 10 }}
            whileTap={reduced ? undefined : { scale: 0.9 }}
            animate={
              reduced
                ? undefined
                : celebrating
                  ? { y: [-8, -55, -20], scale: [1, 1.22, 0.95], rotate: [0, 14, -10] }
                  : isBounced
                    ? { y: [0, -24, 0], scale: [1, 1.28, 1], rotate: [0, 360] }
                    : { y: [-7, 9, -7], rotate: [-4, 5, -4] }
            }
            transition={{
              duration: isBounced ? 0.6 : celebrating ? 1.1 : item.dur,
              delay: isBounced || celebrating ? 0 : item.delay,
              repeat: isBounced || celebrating ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            className="pointer-events-auto absolute flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/75 bg-white/80 p-2 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg dark:border-emerald-900/50 dark:bg-slate-900/75"
          >
            {item.id === 'avocado' && (
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <ellipse cx="16" cy="17" rx="9" ry="12" fill="#15803D" />
                <ellipse cx="16" cy="17" rx="6.5" ry="9" fill="#BEF264" />
                <circle cx="16" cy="20" r="4" fill="#78350F" />
              </svg>
            )}
            {item.id === 'apple' && (
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <circle cx="16" cy="18" r="9.5" fill="#EF4444" />
                <circle cx="13" cy="14" r="2.2" fill="#FCA5A5" />
                <path d="M16 9 Q18 4 22 6" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
            {item.id === 'milk' && (
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <rect x="10" y="9" width="12" height="18" rx="3" fill="#F8FAFC" stroke="#0284C7" strokeWidth="2" />
                <rect x="11.5" y="5" width="9" height="4" rx="1.5" fill="#0284C7" />
                <rect x="12" y="15" width="8" height="6" rx="1" fill="#BAE6FD" />
              </svg>
            )}
            {item.id === 'carrot' && (
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <path d="M16 28 L10 10 L22 10 Z" fill="#F97316" />
                <path d="M14 10 Q16 3 19 6" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
            {item.id === 'citrus' && (
              <svg viewBox="0 0 32 32" className="h-full w-full">
                <circle cx="16" cy="17" r="9.5" fill="#F59E0B" />
                <circle cx="13" cy="13.5" r="2" fill="#FDE68A" />
                <path d="M16 8 L19 5" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
