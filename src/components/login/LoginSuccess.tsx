import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { ConfettiBurst } from '../../animations/MotionPrimitives';

export const LoginSuccess: React.FC<{ userName: string }> = ({ userName }) => (
  <>
    <ConfettiBurst active />
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        Rolling to your aisles!
      </h2>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
        Welcome back, {userName}. Opening your FreshCart dashboard...
      </p>
      <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <motion.div
          initial={{ width: '10%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full rounded-full bg-emerald-600"
        />
      </div>
    </motion.div>
  </>
);
