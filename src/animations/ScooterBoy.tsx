import React, { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { RIDER_ROSTER } from '../utils/riderRoster';
import { scooterSound } from '../utils/scooterSound';

export type ScooterMood =
  | 'idle'
  | 'riding'
  | 'looking-email'
  | 'nodding'
  | 'cover-eyes'
  | 'peek'
  | 'confused'
  | 'sad'
  | 'angry'
  | 'eating'
  | 'sleeping'
  | 'celebrate'
  | 'thumbs-up'
  | 'searching'
  | 'voucher'
  | 'heart'
  | 'waiting'
  | 'waving'
  | 'goodbye'
  | 'gripping';

export interface BasketPreviewItem {
  name: string;
  quantity: number;
}

interface ScooterBoyProps {
  mood?: ScooterMood;
  riderIndex?: number;
  basketItems?: BasketPreviewItem[];
  headlightOn?: boolean;
  headlightForceOff?: boolean;
  headlightIntensity?: number;
  hasCap?: boolean;
  boxOpen?: boolean;
  eyeOffsetX?: number;
  eyeOffsetY?: number;
  happySmile?: boolean;
  shakeError?: boolean;
  showDust?: boolean;
  scale?: number;
  className?: string;
  speechBubble?: string;
  interactive?: boolean;
  onRiderTap?: () => void;
  onCapToggle?: () => void;
  onBoxToggle?: (isOpen: boolean) => void;
  onHeadlightClick?: () => void;
  onWheelClick?: () => void;
}

export const ScooterBoy: React.FC<ScooterBoyProps> = ({
  mood = 'idle',
  riderIndex = 0,
  basketItems = [],
  headlightOn = false,
  headlightForceOff = false,
  headlightIntensity = 0.7,
  hasCap = true,
  boxOpen = false,
  eyeOffsetX = 0,
  eyeOffsetY = 0,
  happySmile = false,
  shakeError = false,
  showDust = false,
  scale = 1,
  className = '',
  speechBubble,
  interactive = true,
  onRiderTap,
  onCapToggle,
  onBoxToggle,
  onHeadlightClick,
  onWheelClick,
}) => {
  const uid = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const [boxHovered, setBoxHovered] = useState(false);
  const [boxLocked, setBoxLocked] = useState(false);
  const [wheelsHovered, setWheelsHovered] = useState(false);
  const [wheelBurst, setWheelBurst] = useState(false);
  const [tapWave, setTapWave] = useState(false);
  const [localHeadlight, setLocalHeadlight] = useState(false);

  const rider = RIDER_ROSTER[((riderIndex % RIDER_ROSTER.length) + RIDER_ROSTER.length) % RIDER_ROSTER.length];

  const isBoxOpen = boxOpen || boxHovered || boxLocked;
  const isSleeping = mood === 'sleeping';
  const isSad = mood === 'sad';
  const isAngry = mood === 'angry';
  const isEating = mood === 'eating';
  const isRiding =
    !isSleeping &&
    (mood === 'riding' || mood === 'goodbye' || mood === 'celebrate' || wheelsHovered || wheelBurst);
  const isCoveringEyes = mood === 'cover-eyes';
  const isPeeking = mood === 'peek';
  const isLookingRight = mood === 'looking-email' || mood === 'nodding';
  const isConfused = mood === 'confused';
  const isCelebrating = mood === 'celebrate' || tapWave;
  const isThumbsUp = mood === 'thumbs-up';
  const isWaving = mood === 'waving' || mood === 'goodbye' || (tapWave && !isAngry);
  const isGripping = mood === 'gripping' || mood === 'waiting';
  const activeHeadlight =
    !headlightForceOff && !isSleeping && (headlightOn || localHeadlight || isRiding || isGripping);

  const eyeShiftX = isLookingRight ? Math.max(1.5, eyeOffsetX) : eyeOffsetX;

  const handleBoxClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    const next = !boxLocked;
    setBoxLocked(next);
    scooterSound.playBoxPop();
    onBoxToggle?.(next);
  };

  const handleWheelClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    setWheelBurst(true);
    scooterSound.playScooterPurr();
    onWheelClick?.();
    setTimeout(() => setWheelBurst(false), 1200);
  };

  const handleHeadlightTap = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    setLocalHeadlight((v) => !v);
    scooterSound.playChime();
    onHeadlightClick?.();
  };

  const handleCapClick = (e: React.MouseEvent) => {
    if (!interactive || !onCapToggle) return;
    e.stopPropagation();
    scooterSound.playCapPop();
    onCapToggle();
  };

  const handleRiderClick = () => {
    if (!interactive) return;
    if (!onRiderTap) {
      setTapWave(true);
      scooterSound.playHornBeep();
      setTimeout(() => setTapWave(false), 1000);
      return;
    }
    onRiderTap();
  };

  const renderWheel = (cx: number, cy: number, radius = 29) => (
    <g
      transform={`translate(${cx}, ${cy})`}
      onMouseEnter={() => setWheelsHovered(true)}
      onMouseLeave={() => setWheelsHovered(false)}
      onClick={handleWheelClick}
      className="cursor-pointer"
    >
      <motion.g
        animate={reduced ? undefined : { rotate: isRiding ? 360 : 0 }}
        transition={isRiding ? { duration: 0.55, repeat: Infinity, ease: 'linear' } : { duration: 0.35 }}
      >
        <circle cx="0" cy="0" r={radius} fill="#0F172A" />
        <circle cx="0" cy="0" r={radius - 6} fill="none" stroke="#334155" strokeWidth="2" />
        <circle cx="0" cy="0" r={radius - 12} fill="#F1F5F9" />
        <circle cx="0" cy="0" r="7" fill={rider.bikePrimary} />
        <line x1={-(radius - 14)} y1="0" x2={radius - 14} y2="0" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="0" y1={-(radius - 14)} x2="0" y2={radius - 14} stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="-10" y1="-10" x2="10" y2="10" stroke="#CBD5E1" strokeWidth="2" />
        <line x1="-10" y1="10" x2="10" y2="-10" stroke="#CBD5E1" strokeWidth="2" />
      </motion.g>
    </g>
  );

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      aria-label={`FreshCart Delivery Rider ${rider.name} on ${rider.bikeName}`}
    >
      {speechBubble && (
        <motion.div
          key={speechBubble}
          initial={reduced ? false : { opacity: 0, y: 6, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`mb-2 max-w-[260px] rounded-2xl border px-3.5 py-2 text-center text-xs font-semibold shadow-md backdrop-blur ${
            isAngry
              ? 'border-rose-300 bg-rose-50/95 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/95 dark:text-rose-100'
              : 'border-emerald-200/90 bg-white/95 text-slate-700 dark:border-emerald-800/60 dark:bg-slate-900/95 dark:text-slate-100'
          }`}
        >
          {speechBubble}
        </motion.div>
      )}

      {/* Live items visible above/inside the bike box on Shop */}
      {isBoxOpen && basketItems.length > 0 && (
        <div className="mb-1 flex max-w-[260px] flex-wrap justify-center gap-1">
          {basketItems.slice(0, 3).map((item, idx) => (
            <motion.span
              key={`${item.name}-${idx}`}
              initial={reduced ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-md border border-amber-200 bg-amber-50/95 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 shadow-xs dark:border-amber-800/60 dark:bg-amber-950/90 dark:text-amber-200"
            >
              {item.name.split(' ')[0]} ×{item.quantity}
            </motion.span>
          ))}
          {basketItems.length > 3 && (
            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              +{basketItems.length - 3} more
            </span>
          )}
        </div>
      )}

      <motion.svg
        viewBox="0 0 360 270"
        onClick={handleRiderClick}
        whileTap={interactive && !reduced ? { scale: 0.97 } : undefined}
        className={`h-auto w-full max-w-[360px] ${
          interactive ? 'cursor-pointer' : ''
        }`}
        animate={
          reduced
            ? undefined
            : isAngry
              ? { x: [0, -3.5, 3.5, -2.5, 2.5, 0], y: [0, -1.5, 0] }
              : shakeError || isConfused
                ? { x: [0, -6, 6, -4, 4, 0], rotate: [0, -1.5, 1.5, 0] }
                : isSad
                  ? { y: [0, 2, 0] }
                  : isSleeping
                    ? { y: [0, 1.5, 0] }
                    : isCelebrating
                      ? { y: [0, -8, 0] }
                      : { y: [0, -2.5, 0] }
        }
        transition={{
          duration: isAngry ? 0.35 : shakeError || isConfused ? 0.55 : isSleeping ? 3.4 : isCelebrating ? 0.7 : 2.6,
          repeat: shakeError || isConfused ? 0 : isCelebrating ? 2 : Infinity,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <linearGradient id={`fcScooterBody3d-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={rider.bikeSecondary} />
            <stop offset="50%" stopColor={rider.bikePrimary} />
            <stop offset="100%" stopColor={rider.jacketTrim} />
          </linearGradient>
          <linearGradient id={`fcHelmet3d-${uid}`} x1="15%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor={rider.helmetAccent} />
            <stop offset="52%" stopColor={rider.helmetColor} />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id={`fcJacket3d-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={rider.bikeSecondary} />
            <stop offset="55%" stopColor={rider.jacketColor} />
            <stop offset="100%" stopColor={rider.jacketTrim} />
          </linearGradient>
          <linearGradient id={`fcSkin3d-${uid}`} x1="20%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor={isAngry ? '#FECACA' : '#FFE6CC'} />
            <stop offset="68%" stopColor={isAngry ? '#FCA5A5' : rider.skinTone} />
            <stop offset="100%" stopColor={isAngry ? '#DC2626' : '#C88255'} />
          </linearGradient>
          <linearGradient id={`fcBox3d-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor={rider.helmetAccent} />
          </linearGradient>
          <linearGradient id={`fcBeam3d-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity={0.9 * Math.max(0.4, headlightIntensity)} />
            <stop offset="60%" stopColor="#FDE047" stopOpacity={0.35 * headlightIntensity} />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`fcGroundShadow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#0F172A" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Shadow */}
        <ellipse cx="176" cy="248" rx="126" ry="13" fill={`url(#fcGroundShadow-${uid})`} />

        {/* Braking or Revving Dust */}
        {(showDust || wheelBurst) && !reduced && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <motion.circle
                key={i}
                cx={68 - i * 9}
                cy={234 - i * 4}
                r={5 - i * 0.7}
                fill="#E2E8F0"
                initial={{ opacity: 0.85, x: 0, y: 0, scale: 0.7 }}
                animate={{ opacity: 0, x: -24 - i * 6, y: -12 - i * 3, scale: 1.5 }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
              />
            ))}
          </g>
        )}

        {/* Glowing Headlight Beam */}
        {activeHeadlight && (
          <motion.polygon
            points="266,132 358,92 358,180"
            fill={`url(#fcBeam3d-${uid})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isGripping ? [0.35, 1, 0.35] : [0.65, 0.95, 0.65] }}
            transition={{ duration: isGripping ? 0.55 : 1.5, repeat: Infinity }}
          />
        )}

        {/* ANGRY STEAM PUFFS & ANGER MARK */}
        {isAngry && !reduced && (
          <g>
            <motion.circle
              cx="122"
              cy="46"
              r="7"
              fill="#FCA5A5"
              opacity="0.7"
              animate={{ y: [0, -14], opacity: [0.85, 0], scale: [0.8, 1.4] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
            <motion.circle
              cx="188"
              cy="44"
              r="6"
              fill="#F87171"
              opacity="0.7"
              animate={{ y: [0, -16], opacity: [0.85, 0], scale: [0.8, 1.4] }}
              transition={{ duration: 0.9, delay: 0.3, repeat: Infinity }}
            />
            <path d="M180 42 L185 48 M187 40 L184 46 M183 50 L191 50" stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        )}

        {/* SLEEPING MODE FLOATING ZZZs */}
        {isSleeping && !reduced && (
          <g>
            {[
              { char: 'Z', x: 185, y: 52, delay: 0, size: 17 },
              { char: 'z', x: 204, y: 38, delay: 0.7, size: 14 },
              { char: 'z', x: 220, y: 24, delay: 1.4, size: 11 },
            ].map((z, idx) => (
              <motion.text
                key={idx}
                x={z.x}
                y={z.y}
                fill={rider.bikePrimary}
                fontSize={z.size}
                fontWeight="800"
                animate={{ opacity: [0, 1, 0], y: [z.y + 8, z.y - 14, z.y - 24] }}
                transition={{ duration: 2.4, delay: z.delay, repeat: Infinity }}
              >
                {z.char}
              </motion.text>
            ))}
          </g>
        )}

        {/* Interactive Rear Grocery Delivery Box */}
        <g
          transform="translate(28, 96)"
          onMouseEnter={() => setBoxHovered(true)}
          onMouseLeave={() => setBoxHovered(false)}
          onClick={handleBoxClick}
          className="cursor-pointer"
        >
          {/* Peeking Groceries inside the box */}
          <motion.g
            initial={false}
            animate={isBoxOpen ? { y: -14, opacity: 1 } : { y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          >
            <rect x="10" y="0" width="22" height="22" rx="3" fill="#D97706" />
            <rect x="13" y="-4" width="16" height="8" rx="2" fill="#F59E0B" />
            <path d="M22 -12 L27 2 L17 2 Z" fill="#EA580C" />
            <path d="M20 -12 Q22 -19 26 -14" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="44" cy="4" r="8" fill="#EF4444" />
            <circle cx="41" cy="1" r="2" fill="#FCA5A5" />
            <ellipse cx="56" cy="5" rx="6" ry="8" fill="#15803D" />
          </motion.g>

          {/* Box Body */}
          <rect
            x="0"
            y="16"
            width="76"
            height="58"
            rx="12"
            fill={`url(#fcBox3d-${uid})`}
            stroke={rider.bikePrimary}
            strokeWidth="2.5"
          />
          <rect x="10" y="32" width="56" height="24" rx="6" fill={rider.bikePrimary} />
          <text
            x="38"
            y="47"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            FreshCart
          </text>
          {basketItems.length > 0 && (
            <g transform="translate(59, 14)">
              <circle cx="0" cy="0" r="10" fill="#F97316" stroke="#FFFFFF" strokeWidth="2" />
              <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800">
                {basketItems.reduce((s, b) => s + b.quantity, 0)}
              </text>
            </g>
          )}

          {/* Animated Box Lid */}
          <motion.g
            style={{ originX: '4px', originY: '16px' }}
            animate={isBoxOpen ? { rotate: -58, y: -6 } : { rotate: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          >
            <rect x="-3" y="7" width="82" height="13" rx="6.5" fill={rider.bikeSecondary} stroke={rider.bikePrimary} strokeWidth="2" />
            <rect x="24" y="10" width="28" height="3.5" rx="2" fill="#FFFFFF" opacity="0.7" />
          </motion.g>
        </g>

        {/* Suspension & Distinct Bike Frame per Rider */}
        <motion.g
          animate={reduced ? undefined : isRiding ? { y: [0, -1.6, 0.8, 0] } : undefined}
          transition={{ duration: 0.45, repeat: Infinity }}
        >
          {/* Wheels */}
          {renderWheel(94, 212, rider.bikeType === 'cruiser' ? 31 : 29)}
          {rider.bikeType === 'cargo-trike' && renderWheel(58, 216, 22)}
          {renderWheel(248, 212, rider.bikeType === 'sport-moped' ? 27 : 29)}

          {/* Distinct Bike Body Silhouette */}
          {rider.bikeType === 'sport-moped' && (
            <>
              <path
                d="M52 184 L126 168 L184 172 L224 94 L256 106 L276 186 L252 198 L210 176 L132 192 L62 196 Z"
                fill={`url(#fcScooterBody3d-${uid})`}
              />
              <path d="M138 175 L234 114" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {rider.bikeType === 'cargo-trike' && (
            <>
              <rect x="34" y="156" width="84" height="36" rx="8" fill={rider.jacketTrim} />
              <path
                d="M44 190 C54 160, 120 156, 138 178 L188 176 C204 148, 214 114, 224 98 L246 98 L272 192 L254 200 L212 180 L122 198 Z"
                fill={`url(#fcScooterBody3d-${uid})`}
              />
            </>
          )}
          {rider.bikeType === 'cruiser' && (
            <>
              <path
                d="M66 196 L112 158 L194 158 L224 102 L244 102 L266 192 L248 202 L208 174 L132 196 Z"
                fill={`url(#fcScooterBody3d-${uid})`}
              />
              <rect x="64" y="196" width="54" height="8" rx="4" fill="#94A3B8" />
            </>
          )}
          {rider.bikeType === 'cafe-racer' && (
            <>
              <path
                d="M68 178 C84 150, 122 150, 144 166 L196 154 L224 96 L250 100 L272 188 L254 198 L216 174 L126 196 Z"
                fill={`url(#fcScooterBody3d-${uid})`}
              />
              <path d="M238 98 C252 84, 268 94, 266 112" fill="none" stroke="#CBD5E1" strokeWidth="3.5" />
            </>
          )}
          {rider.bikeType === 'vespa' && (
            <>
              <path
                d="M54 188 C58 156, 114 152, 134 176 L186 176 C202 150, 214 116, 222 98 L245 98 C240 136, 256 170, 276 190 L259 200 C242 172, 218 176, 212 200 L124 200 C116 174, 80 174, 64 198 Z"
                fill={`url(#fcScooterBody3d-${uid})`}
              />
              <path d="M72 176 Q104 166 124 178" fill="none" stroke="#A7F3D0" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            </>
          )}

          <rect x="130" y="182" width="68" height="10" rx="5" fill="#0F172A" />

          {/* Interactive Chrome Headlight */}
          <g onClick={handleHeadlightTap} className="cursor-pointer">
            <circle cx="260" cy="130" r="12.5" fill="#E2E8F0" stroke={rider.bikePrimary} strokeWidth="2.5" />
            <circle cx="263" cy="130" r="8" fill={activeHeadlight ? '#FEF08A' : isSleeping ? '#94A3B8' : '#64748B'} />
          </g>

          {/* Saddle & Handlebar */}
          <path d="M106 148 C110 133, 160 133, 166 150 C166 158, 108 158, 106 148 Z" fill="#1E293B" />
          <path d="M220 98 L208 86 L193 90" fill="none" stroke="#334155" strokeWidth="6.5" strokeLinecap="round" />

          {/* Legs & Sneakers */}
          <path
            d="M140 150 L166 172 L162 188"
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g transform="translate(154, 184)">
            <path d="M0 8 C2 1, 18 0, 24 6 L26 11 L0 11 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
            <rect x="0" y="9" width="26" height="4" rx="2" fill={rider.bikePrimary} />
          </g>

          {/* Delivery Boy Torso (Rider-themed Jacket) */}
          <motion.g
            animate={isSleeping ? { rotate: 10, y: 3 } : isSad ? { y: 2 } : isAngry ? { rotate: -3 } : { rotate: 0, y: 0 }}
            style={{ originX: '148px', originY: '148px' }}
          >
            <path d="M120 148 C118 108, 164 100, 174 139 L168 156 L124 156 Z" fill={`url(#fcJacket3d-${uid})`} />
            <path d="M132 118 L160 118" stroke={rider.helmetAccent} strokeWidth="4" strokeLinecap="round" />
            <path d="M148 118 L148 152" stroke={rider.jacketTrim} strokeWidth="2" opacity="0.55" />

            {/* Expressive Head & Removable Cap/Helmet */}
            <motion.g
              animate={
                reduced
                  ? undefined
                  : isSleeping
                    ? { rotate: 16, y: 5 }
                    : isSad
                      ? { rotate: -8, y: 3 }
                      : isAngry
                        ? { rotate: [-2, 3, -2] }
                        : mood === 'nodding'
                          ? { rotate: [0, 7, 0, 7, 0] }
                          : isLookingRight
                            ? { rotate: 8, x: 3 }
                            : isConfused
                              ? { rotate: -9 }
                              : { rotate: 0, x: 0, y: 0 }
              }
              transition={{ duration: isAngry ? 0.35 : mood === 'nodding' ? 0.85 : 0.35, repeat: isAngry ? Infinity : 0 }}
              style={{ originX: '148px', originY: '104px' }}
            >
              <rect x="142" y="94" width="12" height="12" rx="5" fill={rider.skinTone} />
              <circle cx="129" cy="80" r="5.5" fill={rider.skinTone} />
              <circle cx="152" cy="79" r="24.5" fill={`url(#fcSkin3d-${uid})`} />

              {/* Hair shown naturally when cap/helmet is removed */}
              {!hasCap && (
                <g onClick={handleCapClick} className={onCapToggle ? 'cursor-pointer' : undefined}>
                  <path
                    d="M127 74 C126 48, 175 46, 178 70 C172 62, 162 60, 154 64 C147 58, 136 62, 127 74 Z"
                    fill={rider.hairColor}
                  />
                  <path d="M140 53 Q148 42 158 51" fill="none" stroke={rider.hairColor} strokeWidth="5" strokeLinecap="round" />
                </g>
              )}

              <circle cx="140" cy="87" r="4.5" fill="#FB7185" opacity={isAngry ? 0.7 : isSad ? 0.25 : 0.45} />
              <circle cx="167" cy="87" r="4.5" fill="#FB7185" opacity={isAngry ? 0.7 : isSad ? 0.25 : 0.45} />

              {/* Eyes */}
              {isSleeping || isEating ? (
                <g>
                  <path
                    d={isEating ? 'M141 78 Q146 73 151 78' : 'M141 78 Q146 83 151 78'}
                    stroke="#1E293B"
                    strokeWidth="2.4"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={isEating ? 'M157 78 Q162 73 167 78' : 'M157 78 Q162 83 167 78'}
                    stroke="#1E293B"
                    strokeWidth="2.4"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              ) : isCoveringEyes ? (
                <g>
                  <path d="M142 77 Q146 80 150 77" stroke="#7C2D12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  <path d="M158 77 Q162 80 166 77" stroke="#7C2D12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                </g>
              ) : (
                <g>
                  <ellipse
                    cx={146 + eyeShiftX * 0.5}
                    cy={76 + eyeOffsetY}
                    rx="4.4"
                    ry={isPeeking ? 1.8 : isAngry ? 3.2 : isSad ? 3.8 : 4.8}
                    fill="#FFFFFF"
                  />
                  <ellipse
                    cx={162 + eyeShiftX * 0.5}
                    cy={76 + eyeOffsetY}
                    rx="4.4"
                    ry={isAngry ? 3.2 : isSad ? 3.8 : 4.8}
                    fill="#FFFFFF"
                  />
                  <motion.circle cx={146.5 + eyeShiftX} cy={76 + eyeOffsetY} r="2.6" fill="#0F172A" />
                  <motion.circle cx={162.5 + eyeShiftX} cy={76 + eyeOffsetY} r="2.6" fill="#0F172A" />
                  <circle cx={147.5 + eyeShiftX} cy={74.5 + eyeOffsetY} r="1" fill="#FFFFFF" />
                  <circle cx={163.5 + eyeShiftX} cy={74.5 + eyeOffsetY} r="1" fill="#FFFFFF" />
                  {isAngry && (
                    <>
                      <path d="M139 68 L152 73.5" stroke="#7F1D1D" strokeWidth="2.8" strokeLinecap="round" />
                      <path d="M169 68 L156 73.5" stroke="#7F1D1D" strokeWidth="2.8" strokeLinecap="round" />
                    </>
                  )}
                  {isSad && (
                    <>
                      <path d="M141 70 L150 72" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                      <path d="M158 72 L167 70" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="166" cy="83" r="2.3" fill="#38BDF8" />
                    </>
                  )}
                </g>
              )}

              {/* Mouth */}
              {isSleeping ? (
                <circle cx="155" cy="91" r="2.8" fill="#BE123C" opacity="0.7" />
              ) : isEating ? (
                <motion.ellipse
                  cx="155"
                  cy="91"
                  rx="5.5"
                  ry="4"
                  fill="#9F1239"
                  animate={reduced ? undefined : { ry: [4, 1.8, 4] }}
                  transition={{ duration: 0.45, repeat: Infinity }}
                />
              ) : isAngry ? (
                <path d="M145 96 Q155 86 165 96" stroke="#7F1D1D" strokeWidth="2.8" fill="none" strokeLinecap="round" />
              ) : isSad ? (
                <path d="M146 95 Q155 87 164 95" stroke="#7C2D12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : isConfused ? (
                <path d="M147 92 Q154 88 161 93" stroke="#7C2D12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : isCelebrating || happySmile ? (
                <path d="M145 88 Q154 99 164 88 Z" fill="#BE123C" />
              ) : (
                <path d="M147 89 Q154 95 162 89" stroke="#7C2D12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              )}

              {/* Removable Cap / Helmet */}
              {hasCap && (
                <g onClick={handleCapClick} className={onCapToggle ? 'cursor-pointer' : undefined}>
                  <path d="M124 75 C124 42, 181 40, 181 73 C165 66, 139 66, 124 75 Z" fill={`url(#fcHelmet3d-${uid})`} />
                  <path d="M163 66 L190 71 C192 75, 184 77, 161 73 Z" fill={rider.jacketTrim} />
                  <path d="M158 62 C172 62, 180 69, 180 77 C169 75, 158 73, 158 62 Z" fill="#38BDF8" opacity="0.52" />
                  <circle cx="149" cy="56" r="7.5" fill="#FFFFFF" opacity="0.95" />
                  <path d="M146 59 Q149 51 154 53 Q152 60 146 59 Z" fill={rider.bikePrimary} />
                </g>
              )}
            </motion.g>

            {/* Arms */}
            {isSleeping ? (
              <g>
                <path d="M145 125 L192 98" fill="none" stroke={rider.jacketColor} strokeWidth="10" strokeLinecap="round" />
                <circle cx="192" cy="98" r="6" fill={`url(#fcSkin3d-${uid})`} />
              </g>
            ) : isEating ? (
              <g>
                <path d="M134 118 L188 94" fill="none" stroke={rider.jacketTrim} strokeWidth="9.5" strokeLinecap="round" />
                <circle cx="190" cy="93" r="6" fill={`url(#fcSkin3d-${uid})`} />
                <motion.g
                  animate={reduced ? undefined : { y: [0, -3, 0] }}
                  transition={{ duration: 0.45, repeat: Infinity }}
                >
                  <path d="M160 120 Q176 108 168 95" fill="none" stroke={rider.jacketColor} strokeWidth="10" strokeLinecap="round" />
                  <circle cx="168" cy="94" r="5.8" fill={`url(#fcSkin3d-${uid})`} />
                  {/* Juicy Red Apple Snack */}
                  <circle cx="166" cy="87" r="7.5" fill="#EF4444" stroke="#991B1B" strokeWidth="1.2" />
                  <path d="M166 79 Q168 74 171 76" stroke="#16A34A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                </motion.g>
              </g>
            ) : isAngry ? (
              <g>
                <path d="M158 120 L193 92" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <circle cx="194" cy="91" r="6.2" fill={`url(#fcSkin3d-${uid})`} />
                <motion.g
                  style={{ originX: '132px', originY: '118px' }}
                  animate={reduced ? undefined : { rotate: [-14, 14, -14] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                >
                  <path d="M132 118 L108 82" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                  <circle cx="107" cy="80" r="7.5" fill={`url(#fcSkin3d-${uid})`} stroke="#DC2626" strokeWidth="1.5" />
                </motion.g>
              </g>
            ) : isCoveringEyes ? (
              <motion.g initial={{ y: 18, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
                <path d="M132 118 Q130 88 143 77" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <path d="M163 118 Q173 89 163 77" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <circle cx="144" cy="76" r="6.8" fill={`url(#fcSkin3d-${uid})`} />
                <circle cx="163" cy="76" r="6.8" fill={`url(#fcSkin3d-${uid})`} />
              </motion.g>
            ) : isPeeking ? (
              <g>
                <path d="M132 118 Q130 88 143 77" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <circle cx="144" cy="76" r="6.8" fill={`url(#fcSkin3d-${uid})`} />
                <path d="M160 120 L193 92" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <circle cx="194" cy="91" r="6.2" fill={`url(#fcSkin3d-${uid})`} />
              </g>
            ) : isWaving || isCelebrating || isThumbsUp ? (
              <g>
                <path d="M158 120 L193 92" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <circle cx="194" cy="91" r="6.2" fill={`url(#fcSkin3d-${uid})`} />
                <motion.g
                  style={{ originX: '132px', originY: '118px' }}
                  animate={
                    reduced
                      ? undefined
                      : isThumbsUp && !tapWave
                        ? { rotate: [-6, 6, -6] }
                        : { rotate: [-16, 20, -16] }
                  }
                  transition={{ duration: 0.65, repeat: Infinity }}
                >
                  <path d="M132 118 L104 79" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                  <circle cx="103" cy="77" r="6.8" fill={`url(#fcSkin3d-${uid})`} />
                  {isThumbsUp && !tapWave && (
                    <path d="M102 71 L102 62" stroke={`url(#fcSkin3d-${uid})`} strokeWidth="4.2" strokeLinecap="round" />
                  )}
                </motion.g>
              </g>
            ) : (
              <g>
                <path d="M155 120 L194 92" fill="none" stroke={rider.jacketColor} strokeWidth="10.5" strokeLinecap="round" />
                <circle cx="195" cy="91" r="6.2" fill={`url(#fcSkin3d-${uid})`} />
                {isGripping && (
                  <>
                    <path d="M134 118 L188 94" fill="none" stroke={rider.jacketTrim} strokeWidth="9.5" strokeLinecap="round" />
                    <circle cx="190" cy="93" r="6" fill={`url(#fcSkin3d-${uid})`} />
                  </>
                )}
              </g>
            )}
          </motion.g>

          {/* Contextual Mood Props */}
          {mood === 'searching' && (
            <motion.g animate={reduced ? undefined : { x: [-4, 4, -4], y: [-2, 2, -2] }} transition={{ duration: 1.8, repeat: Infinity }}>
              <circle cx="212" cy="74" r="14" fill="#E0F2FE" fillOpacity="0.65" stroke="#0284C7" strokeWidth="3.5" />
              <line x1="202" y1="84" x2="192" y2="94" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" />
            </motion.g>
          )}
          {mood === 'voucher' && (
            <g>
              <rect x="192" y="60" width="38" height="22" rx="4" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
              <text x="211" y="75" textAnchor="middle" fontSize="9" fontWeight="800" fill="#854D0E">
                % OFF
              </text>
            </g>
          )}
          {mood === 'heart' && (
            <path d="M210 70 C210 63, 199 63, 199 71 C199 78, 210 84, 210 84 C210 84, 221 78, 221 71 C221 63, 210 63, 210 70 Z" fill="#F43F5E" />
          )}
          {isConfused && (
            <text x="188" y="54" fontSize="22" fontWeight="800" fill="#EA580C">
              ?
            </text>
          )}
        </motion.g>
      </motion.svg>
    </div>
  );
};
