import React from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AnimatedInputProps {
  id: string;
  testId?: string;
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  placeholder: string;
  autoComplete?: string;
  focused: boolean;
  isValid?: boolean;
  icon: React.ReactNode;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (val: string) => void;
  rightSlot?: React.ReactNode;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  id,
  testId,
  label,
  type,
  value,
  placeholder,
  autoComplete,
  focused,
  isValid,
  icon,
  showPassword,
  onTogglePassword,
  onFocus,
  onBlur,
  onChange,
  rightSlot,
}) => {
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </label>
        {rightSlot}
      </div>

      <div className="relative mt-1.5">
        <motion.div
          animate={{
            opacity: focused ? 1 : 0,
            scale: focused ? 1 : 0.98,
          }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-500/45 via-sky-400/35 to-emerald-500/45 blur-[2px]"
          aria-hidden="true"
        />

        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3.5 text-slate-400">{icon}</span>
          <input
            id={id}
            data-testid={testId}
            type={inputType}
            autoComplete={autoComplete}
            value={value}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-slate-200/90 bg-white/95 pr-11 pl-10 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900/95 dark:text-white"
          />

          {type === 'email' && isValid && (
            <CheckCircle2 className="pointer-events-none absolute right-3.5 h-4 w-4 text-emerald-600" aria-label="Valid email" />
          )}

          {type === 'password' && onTogglePassword && (
            <button
              type="button"
              data-testid="toggle-password-visibility"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
