import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { ScooterBoy, type ScooterMood } from '../animations/ScooterBoy';
import { ConfettiBurst, ErrorAnimation, SuccessAnimation } from '../animations/MotionPrimitives';
import { authService } from '../services/authService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { scooterSound } from '../utils/scooterSound';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeRiderIndex } = useApp();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<'none' | 'email' | 'password'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setInfo(res.message);
      if (res.resetTokenPreview) setToken(res.resetTokenPreview);
      scooterSound.playChime();
      setStep('reset');
    } catch (err) {
      scooterSound.playErrorBump();
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), newPassword);
      scooterSound.playSuccessFanfare();
      setStep('done');
    } catch (err) {
      scooterSound.playErrorBump();
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  let mood: ScooterMood = 'waiting';
  let bubble = 'Need a password reset? Tap me!';
  if (step === 'done') {
    mood = 'celebrate';
    bubble = 'Password updated! Back on the road!';
  } else if (error) {
    mood = 'sad';
    bubble = 'Double-check your reset details!';
  } else if (focusedField === 'password') {
    mood = showPass ? 'peek' : 'cover-eyes';
    bubble = showPass ? 'Quick peek while resetting!' : 'Eyes covered for your new password!';
  } else if (focusedField === 'email') {
    mood = 'looking-email';
    bubble = 'Finding your FreshCart account...';
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-[#FFFDF7] to-emerald-50 px-4 py-12 dark:from-[#07130F] dark:via-[#0B1713] dark:to-[#0C1814]">
      <ConfettiBurst active={step === 'done'} />
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl backdrop-blur dark:border-emerald-950/60 dark:bg-[#0D1D17]">
        <div className="mb-4 flex justify-center">
          <div className="w-48">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood={mood}
              headlightOn={step === 'done' || loading}
              eyeOffsetX={focusedField === 'email' ? Math.min(3, email.length * 0.25) : 0}
              shakeError={Boolean(error)}
              speechBubble={bubble}
            />
          </div>
        </div>

        <h1 className="text-center font-display text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>

        {error && (
          <div className="mt-4">
            <ErrorAnimation message={error} />
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Account Email</label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('none')}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Generate Reset Token'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="mt-5 space-y-4">
            {info && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                {info}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reset Token</label>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={token}
                  onFocus={() => setFocusedField('none')}
                  onChange={(e) => setToken(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 font-mono text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('none')}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-6 space-y-5">
            <SuccessAnimation title="Password Reset Complete" subtitle="Your new password is active." />
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Return to Login
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700 dark:text-slate-400">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
