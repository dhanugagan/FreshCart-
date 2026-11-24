import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Lock, Mail, Sparkles, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { freshCartLogo } from '../../assets/brandAssets';
import { useLanguage } from '../../context/LanguageContext';
import { AnimatedInput } from './AnimatedInput';
import { LoginSuccess } from './LoginSuccess';
import { ErrorAnimation } from '../../animations/MotionPrimitives';

interface LoginCardProps {
  email: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  focusedField: 'none' | 'email' | 'password';
  isEmailValid: boolean;
  loading: boolean;
  demoLoading?: boolean;
  googleLoading?: boolean;
  error: string;
  googleNotice: string;
  loggedInName: string | null;
  logoRevealed: boolean;
  googleSheetOpen?: boolean;
  oauthConfigured?: boolean;
  googleCallbackUrl?: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onRememberChange: (v: boolean) => void;
  onFocusField: (f: 'none' | 'email' | 'password') => void;
  onSubmit: (e: React.FormEvent) => void;
  onDemoLogin: () => void;
  onGoogleClick: () => void;
  onGoogleQuickSubmit: (googleEmail: string, fullName: string) => void;
  onCloseGoogleSheet: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  email,
  password,
  showPassword,
  rememberMe,
  focusedField,
  isEmailValid,
  loading,
  demoLoading = false,
  googleLoading = false,
  error,
  googleNotice,
  loggedInName,
  logoRevealed,
  googleSheetOpen = false,
  oauthConfigured = false,
  googleCallbackUrl = '',
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onRememberChange,
  onFocusField,
  onSubmit,
  onDemoLogin,
  onGoogleClick,
  onGoogleQuickSubmit,
  onCloseGoogleSheet,
}) => {
  const reduced = useReducedMotion();
  const { language, setLanguage, languages, t } = useLanguage();
  const [googleEmail, setGoogleEmail] = useState('aarav.sharma@gmail.com');
  const [googleName, setGoogleName] = useState('Aarav Sharma');

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.14)] sm:p-9 dark:border-emerald-900/50 dark:bg-[#0D1D17]/95">
      {/* Brand + Language Selector */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: -8, scale: 0.95 }}
        animate={logoRevealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.55, y: -4, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex items-center justify-between gap-2"
      >
        <Link to="/" className="inline-flex items-center gap-2.5 font-display text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
          <img
            src={freshCartLogo}
            alt="FreshCart Logo"
            className="h-9 w-9 rounded-xl border border-emerald-200 object-cover shadow-xs"
          />
          <span>FreshCart</span>
        </Link>

        <label className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-[11px] font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200">
          <Globe className="h-3.5 w-3.5 text-emerald-600" />
          <select
            aria-label="Login Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="max-w-[115px] bg-transparent font-semibold outline-none"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                {lang.nativeName}
              </option>
            ))}
          </select>
        </label>
      </motion.div>

      {loggedInName ? (
        <LoginSuccess userName={loggedInName} />
      ) : (
        <>
          <div className="mb-5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t.welcomeRider}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.tagline} · ₹ INR Fresh Essentials
            </p>
          </div>

          {error && (
            <div className="mb-4" data-testid="login-error">
              <ErrorAnimation message={error} />
            </div>
          )}

          {googleNotice && (
            <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200">
              {googleNotice}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <AnimatedInput
              id="login-email"
              testId="login-email"
              label="Email Address"
              type="email"
              value={email}
              placeholder="you@example.in"
              autoComplete="email"
              focused={focusedField === 'email'}
              isValid={isEmailValid}
              icon={<Mail className="h-4 w-4" />}
              onFocus={() => onFocusField('email')}
              onBlur={() => onFocusField('none')}
              onChange={onEmailChange}
            />

            <AnimatedInput
              id="login-password"
              testId="login-password"
              label="Password"
              type="password"
              value={password}
              placeholder="Enter your password"
              autoComplete="current-password"
              focused={focusedField === 'password'}
              showPassword={showPassword}
              onTogglePassword={onTogglePassword}
              icon={<Lock className="h-4 w-4" />}
              onFocus={() => onFocusField('password')}
              onBlur={() => onFocusField('none')}
              onChange={onPasswordChange}
              rightSlot={
                <Link to="/forgot-password" className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                  Forgot password?
                </Link>
              }
            />

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => onRememberChange(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={onDemoLogin}
                disabled={demoLoading || loading}
                data-testid="demo-login-btn"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>{demoLoading ? 'Loading Demo...' : '1-Click Demo Login'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              data-testid="login-submit"
              className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-bold text-white shadow-[0_8px_22px_rgba(16,185,129,0.28)] transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-75"
            >
              {loading && !reduced && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              )}
              <span>{loading ? 'Starting Scooter...' : t.signIn}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            disabled={googleLoading}
            onClick={onGoogleClick}
            data-testid="google-signin-btn"
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>
              {googleLoading ? 'Connecting Google...' : oauthConfigured ? 'Continue with Google' : 'Continue with Google'}
            </span>
          </button>

          {/* Instant Google Account Picker Drawer */}
          {googleSheetOpen && (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-3.5 text-xs dark:border-sky-900/60 dark:bg-sky-950/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-sky-950 dark:text-sky-200">
                  {oauthConfigured ? 'Google OAuth Sign-In' : 'Google Account Sign-In'}
                </span>
                <button
                  type="button"
                  onClick={onCloseGoogleSheet}
                  aria-label="Close Google sign-in drawer"
                  className="rounded-lg p-1 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {oauthConfigured ? (
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={onGoogleClick}
                  className="mb-2.5 flex h-9 w-full items-center justify-center rounded-lg bg-sky-600 font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  Launch Real Google OAuth Popup
                </button>
              ) : (
                googleCallbackUrl && (
                  <div className="mb-2.5 rounded-lg border border-sky-200 bg-white/80 p-2 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                    <span className="font-bold text-sky-900 dark:text-sky-300">Live Google OAuth Callback URI:</span>{' '}
                    <code className="break-all font-mono text-[10px]">{googleCallbackUrl}</code>
                  </div>
                )
              )}
              <div className="space-y-2">
                <p className="text-[11px] text-sky-900/80 dark:text-sky-300/80">
                  {oauthConfigured
                    ? 'Or use quick Google preview sign-in below:'
                    : 'Choose a Google account or type your Gmail for instant sign-in:'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={googleLoading}
                    onClick={() => onGoogleQuickSubmit('aarav.sharma@gmail.com', 'Aarav Sharma')}
                    className="rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-left transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="truncate font-bold text-slate-900 dark:text-white">Aarav Sharma</p>
                    <p className="truncate text-[10px] text-slate-500">aarav.sharma@gmail.com</p>
                  </button>
                  <button
                    type="button"
                    disabled={googleLoading}
                    onClick={() => onGoogleQuickSubmit('priya.patel@gmail.com', 'Priya Patel')}
                    className="rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-left transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="truncate font-bold text-slate-900 dark:text-white">Priya Patel</p>
                    <p className="truncate text-[10px] text-slate-500">priya.patel@gmail.com</p>
                  </button>
                </div>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="h-9 w-full rounded-lg border border-sky-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Display Name"
                  className="h-9 w-full rounded-lg border border-sky-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => onGoogleQuickSubmit(googleEmail, googleName)}
                  data-testid="google-quick-submit"
                  className="flex h-9 w-full items-center justify-center rounded-lg bg-sky-600 font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {googleLoading ? 'Signing in...' : 'Sign In with Google Account'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <span>
              New here?{' '}
              <Link to="/register" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                {t.createAccount}
              </Link>
            </span>
            <Link to="/dashboard" className="font-medium text-slate-700 hover:underline dark:text-slate-300">
              Browse 100+ Items
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
