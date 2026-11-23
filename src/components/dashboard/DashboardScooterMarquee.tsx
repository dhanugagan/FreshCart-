import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'motion/react';
import { Flame, Lightbulb, LightbulbOff, Megaphone, Pause, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { ScooterBoy } from '../../animations/ScooterBoy';
import { useApp } from '../../context/AppContext';
import { scooterSound } from '../../utils/scooterSound';

export const DashboardScooterMarquee: React.FC = () => {
  const { activeRider, activeRiderIndex, cycleRider, cart } = useApp();
  const reduced = useReducedMotion();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(960);
  const x = useMotionValue(80);

  const [isCruising, setIsCruising] = useState(() => !reduced);
  const [stoppedByTouch, setStoppedByTouch] = useState(false);
  const [headlightOn, setHeadlightOn] = useState(true);
  const [engineLoopOn, setEngineLoopOn] = useState(false);
  const [revving, setRevving] = useState(false);
  const [honkFlash, setHonkFlash] = useState(false);
  const [bubbleMsg, setBubbleMsg] = useState<string | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const updateWidth = () => {
      setTrackWidth(Math.max(320, el.getBoundingClientRect().width));
    };
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(updateWidth);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (engineLoopOn && isCruising && !stoppedByTouch) {
      scooterSound.setEnabled(true);
      scooterSound.startEngineLoop();
    } else {
      scooterSound.stopEngineLoop();
    }
    return () => {
      scooterSound.stopEngineLoop();
    };
  }, [engineLoopOn, isCruising, stoppedByTouch]);

  useAnimationFrame((_time, delta) => {
    if (!isCruising || stoppedByTouch || reduced) return;
    const speedPxPerMs = 0.145;
    let next = x.get() + delta * speedPxPerMs;
    if (next > trackWidth + 40) {
      next = -230;
    }
    x.set(next);
  });

  const flashBubble = (msg: string, ms = 2100) => {
    setBubbleMsg(msg);
    window.setTimeout(() => {
      setBubbleMsg((prev) => (prev === msg ? null : prev));
    }, ms);
  };

  const handleToggleLights = () => {
    scooterSound.setEnabled(true);
    setHeadlightOn((prev) => {
      const next = !prev;
      scooterSound.playChime();
      flashBubble(next ? 'Headlight beam ON!' : 'Headlight beam OFF!');
      return next;
    });
  };

  const handleTouchHorn = () => {
    scooterSound.setEnabled(true);
    scooterSound.playHornBeep();
    setHonkFlash(true);
    flashBubble(`Beep-beep! ${activeRider.name.split(' ')[0]} coming through!`);
    window.setTimeout(() => setHonkFlash(false), 650);
  };

  const handleTouchRevEngine = () => {
    scooterSound.setEnabled(true);
    scooterSound.playScooterPurr();
    setRevving(true);
    flashBubble(`${activeRider.bikeName} engine revving!`);
    window.setTimeout(() => setRevving(false), 1100);
  };

  const handleToggleEngineLoop = () => {
    if (!engineLoopOn) {
      scooterSound.setEnabled(true);
      setEngineLoopOn(true);
      scooterSound.playScooterPurr();
      if (!isCruising || stoppedByTouch) {
        setStoppedByTouch(false);
        setIsCruising(true);
      }
      flashBubble('Continuous engine sound ON!');
    } else {
      setEngineLoopOn(false);
      scooterSound.stopEngineLoop();
      flashBubble('Engine sound muted');
    }
  };

  const handleScooterTouch = () => {
    scooterSound.setEnabled(true);
    if (isCruising && !stoppedByTouch) {
      setStoppedByTouch(true);
      scooterSound.playHornBeep();
      flashBubble('Touched scooter — braked! Tap again or press Cruise to ride.');
    } else {
      setStoppedByTouch(false);
      setIsCruising(true);
      scooterSound.playScooterPurr();
      flashBubble(`${activeRider.name} back on the road!`);
    }
  };

  const handleToggleCruise = () => {
    if (isCruising && !stoppedByTouch) {
      setIsCruising(false);
      setStoppedByTouch(false);
      scooterSound.playChime();
      flashBubble('Scooter parked!');
    } else {
      scooterSound.setEnabled(true);
      setStoppedByTouch(false);
      setIsCruising(true);
      scooterSound.playScooterPurr();
      flashBubble(`${activeRider.bikeName} cruising across dashboard!`);
    }
  };

  const isMoving = isCruising && !stoppedByTouch && !reduced;

  return (
    <section
      data-testid="dashboard-scooter-marquee"
      className="relative overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-b from-sky-100 via-emerald-50/80 to-slate-100 shadow-sm dark:border-emerald-900/60 dark:from-[#081A24] dark:via-[#0D2118] dark:to-[#0A130F]"
    >
      {/* Top Interactive Touch Control Strip */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6 dark:border-emerald-900/50 dark:bg-[#0D1D17]/85">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
            Live Rider Street
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {activeRider.name} · {activeRider.bikeName}
          </span>
          <span className="hidden text-[11px] text-slate-500 sm:inline dark:text-slate-400">
            Touch scooter to brake/ride, or tap lamp, horn &amp; engine controls
          </span>
        </div>

        {/* Touch Triggers */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') {
                e.preventDefault();
                handleToggleLights();
              }
            }}
            onClick={handleToggleLights}
            data-testid="dashboard-marquee-light"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              headlightOn
                ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-xs dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200'
                : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {headlightOn ? <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> : <LightbulbOff className="h-3.5 w-3.5" />}
            <span>{headlightOn ? 'Lights On' : 'Lights Off'}</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') {
                e.preventDefault();
                handleTouchHorn();
              }
            }}
            onClick={handleTouchHorn}
            data-testid="dashboard-marquee-horn"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              honkFlash
                ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                : 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-200'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span>Horn</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') {
                e.preventDefault();
                handleTouchRevEngine();
              }
            }}
            onClick={handleTouchRevEngine}
            data-testid="dashboard-marquee-engine"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              revving
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Rev Engine</span>
          </button>

          <button
            type="button"
            onClick={handleToggleEngineLoop}
            data-testid="dashboard-marquee-engine-loop"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
              engineLoopOn
                ? 'border-teal-500 bg-teal-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {engineLoopOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{engineLoopOn ? 'Engine Hum On' : 'Engine Sound'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleCruise}
            data-testid="dashboard-marquee-cruise"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {isMoving ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isMoving ? 'Pause' : 'Cruise'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              scooterSound.setEnabled(true);
              scooterSound.playChime();
              cycleRider();
            }}
            data-testid="dashboard-marquee-rider"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
            <span>Boy {activeRiderIndex + 1}/5</span>
          </button>
        </div>
      </div>

      {/* Marquee Track Arena */}
      <div
        ref={trackRef}
        className="relative h-56 w-full overflow-hidden select-none sm:h-64"
      >
        {/* Subtle Sky Sun/Moon & Trees Silhouette */}
        <div
          className={`pointer-events-none absolute top-4 right-8 h-10 w-10 rounded-full transition-all duration-500 ${
            headlightOn
              ? 'bg-amber-300/60 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
              : 'bg-slate-300/50 dark:bg-slate-600/40'
          }`}
        />

        {/* Roadside Trees & Neighborhood Signs */}
        <div className="pointer-events-none absolute right-0 bottom-14 left-0 flex items-end justify-between px-10 opacity-45">
          <div className="flex items-end gap-12">
            <div className="h-12 w-7 rounded-t-full bg-emerald-600/50 dark:bg-emerald-700/40" />
            <div className="h-16 w-10 rounded-t-full bg-teal-600/40 dark:bg-teal-700/35" />
          </div>
          <div className="rounded-lg border border-emerald-300/60 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-slate-900/60 dark:text-emerald-300">
            Free Delivery Above ₹99
          </div>
          <div className="flex items-end gap-12">
            <div className="h-14 w-8 rounded-t-full bg-emerald-600/50 dark:bg-emerald-700/40" />
            <div className="h-11 w-6 rounded-t-full bg-teal-600/40 dark:bg-teal-700/35" />
          </div>
        </div>

        {/* Asphalt Road Strip */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-14 border-t-2 border-slate-400/50 bg-slate-700 dark:border-slate-700 dark:bg-slate-950">
          <div
            className="mt-6 h-1.5 w-full opacity-65"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, #FACC15 0px, #FACC15 36px, transparent 36px, transparent 72px)',
            }}
          />
        </div>

        {/* Sliding Scooter Container */}
        <motion.div
          style={{ x }}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch') {
              e.stopPropagation();
            }
          }}
          className="absolute bottom-2 left-0 z-10 w-52 cursor-pointer sm:w-56"
        >
          {honkFlash && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0.9 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.55 }}
              className="pointer-events-none absolute top-14 right-2 rounded-full border-2 border-amber-400 px-2.5 py-1 text-[10px] font-extrabold text-amber-500"
            >
              BEEP!
            </motion.div>
          )}

          <ScooterBoy
            riderIndex={activeRiderIndex}
            mood={stoppedByTouch ? 'waving' : revving || isMoving ? 'riding' : 'idle'}
            headlightOn={headlightOn}
            headlightForceOff={!headlightOn}
            headlightIntensity={headlightOn ? 1 : 0}
            showDust={revving || isMoving}
            boxOpen={cart.itemCount > 0}
            basketItems={cart.items}
            speechBubble={
              bubbleMsg ||
              (stoppedByTouch
                ? 'Braked! Touch me again to ride!'
                : headlightOn
                  ? `${activeRider.name.split(' ')[0]} · Headlight ON`
                  : `${activeRider.name.split(' ')[0]} · Headlight OFF`)
            }
            onRiderTap={handleScooterTouch}
            onHeadlightClick={handleToggleLights}
            onWheelClick={handleTouchRevEngine}
          />
        </motion.div>
      </div>
    </section>
  );
};
