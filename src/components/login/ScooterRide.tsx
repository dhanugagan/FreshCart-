import React, { useEffect, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'motion/react';
import { scooterSound } from '../../utils/scooterSound';

export type EntranceStage = 'camera-pan' | 'riding-in' | 'braking' | 'thumbs-up' | 'settled';

interface ScooterRideProps {
  loginSuccess: boolean;
  movingMarquee?: boolean;
  stoppedByTouch?: boolean;
  onTouchStop?: () => void;
  onStageChange: (stage: EntranceStage) => void;
  children: React.ReactNode;
}

export const ScooterRide: React.FC<ScooterRideProps> = ({
  loginSuccess,
  movingMarquee = false,
  stoppedByTouch = false,
  onTouchStop,
  onStageChange,
  children,
}) => {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<EntranceStage>(reduced ? 'settled' : 'camera-pan');
  const marqueeX = useMotionValue(0);

  useEffect(() => {
    onStageChange(stage);
  }, [stage, onStageChange]);

  useEffect(() => {
    if (reduced) {
      setStage('settled');
      return;
    }

    const t1 = setTimeout(() => {
      setStage('riding-in');
      scooterSound.playScooterPurr();
    }, 260);
    const t2 = setTimeout(() => setStage('braking'), 1450);
    const t3 = setTimeout(() => setStage('thumbs-up'), 2050);
    const t4 = setTimeout(() => setStage('settled'), 2950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [reduced]);

  useEffect(() => {
    if (!movingMarquee && !stoppedByTouch) {
      marqueeX.set(0);
    }
  }, [movingMarquee, stoppedByTouch, marqueeX]);

  useAnimationFrame((_, delta) => {
    if (reduced || loginSuccess || stage !== 'settled') return;
    if (movingMarquee && !stoppedByTouch) {
      const next = marqueeX.get() + (delta * 155) / 1000;
      marqueeX.set(next > 290 ? -290 : next);
    }
  });

  const targetX = loginSuccess
    ? 360
    : stage === 'camera-pan'
      ? -340
      : stage === 'riding-in'
        ? -40
        : 0;

  const targetOpacity = loginSuccess ? 0 : stage === 'camera-pan' ? 0 : 1;

  return (
    <motion.div
      style={{ x: marqueeX }}
      onPointerDown={() => {
        if (movingMarquee && !stoppedByTouch) {
          onTouchStop?.();
        }
      }}
      className="w-full max-w-[340px]"
    >
      <motion.div
        initial={reduced ? false : { x: -340, opacity: 0, scale: 0.92 }}
        animate={{
          x: targetX,
          opacity: targetOpacity,
          scale: stage === 'braking' ? 1.01 : 1,
          rotate: stage === 'braking' ? -1.5 : loginSuccess ? -3 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: loginSuccess ? 85 : 68,
          damping: stage === 'braking' ? 12 : 16,
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
