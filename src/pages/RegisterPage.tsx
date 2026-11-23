import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { ScooterBoy, type ScooterMood } from '../animations/ScooterBoy';
import { ConfettiBurst, ErrorAnimation } from '../animations/MotionPrimitives';
import { authService } from '../services/authService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { scooterSound } from '../utils/scooterSound';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSessionUser, pushToast, darkMode, toggleDarkMode, activeRider, activeRiderIndex } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<'none' | 'email' | 'password'>('none');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [soundOn, setSoundOn] = useState(scooterSound.isEnabled());
  const [customBubble, setCustomBubble] = useState<string | null>(null);

  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    const labels = ['Too Short', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-600'];
    return { score, label: labels[score], color: colors[score] };
  }, [password]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    scooterSound.setEnabled(next);
  };

  let riderMood: ScooterMood = 'waving';
  let riderBubble = `Hi! ${activeRider.name} here — join FreshCart!`;
  if (registered) {
    riderMood = 'celebrate';
    riderBubble = 'Hooray! Welcome aboard FreshCart!';
  } else if (loading) {
    riderMood = 'gripping';
    riderBubble = 'Setting up your FreshCart route...';
  } else if (error) {
    riderMood = 'sad';
    riderBubble = "Oops — let's check that field!";
  } else if (focusedField === 'password') {
    riderMood = showPass ? 'peek' : 'cover-eyes';
    riderBubble = showPass ? 'Peeking at your password!' : 'Eyes covered! Safe & private.';
  } else if (focusedField === 'email') {
    riderMood = isEmailValid ? 'nodding' : 'looking-email';
    riderBubble = isEmailValid ? 'That email looks great!' : 'Typing your email...';
  } else if (strength.score >= 3) {
    riderMood = 'thumbs-up';
    riderBubble = 'Strong password! Almost ready.';
  }
  if (customBubble && !registered && !loading) riderBubble = customBubble;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters');
      scooterSound.playErrorBump();
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address');
      scooterSound.playErrorBump();
      return;
    }
    if (!/^[0-9]{10,15}$/.test(mobile.replace(/[\s\-+()]/g, ''))) {
      setError('Please enter a valid 10-15 digit mobile number');
      scooterSound.playErrorBump();
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      scooterSound.playErrorBump();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      scooterSound.playErrorBump();
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions');
      scooterSound.playErrorBump();
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        address: address.trim(),
      });
      await setSessionUser(res.user);
      setRegistered(true);
      scooterSound.playSuccessFanfare();
      pushToast('success', 'Account created! Welcome to FreshCart.');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      scooterSound.playErrorBump();
      setError(extractApiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-emerald-50 to-[#FFFDF7] px-4 py-10 dark:from-[#07130F] dark:via-[#0B1713] dark:to-[#0C1814]">
      <ConfettiBurst active={registered} />

      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={soundOn ? 'Mute scooter sounds' : 'Enable scooter sounds'}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/85 px-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
        >
          {soundOn ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
          <span className="hidden sm:inline">{soundOn ? 'Sound On' : 'Sound Off'}</span>
        </button>
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/85 text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur lg:grid-cols-5 dark:border-emerald-950/60 dark:bg-[#0D1D17]">
        {/* Left Interactive Rider Character Panel */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50 via-emerald-50 to-emerald-100/80 p-8 text-center lg:col-span-2 dark:from-[#0A1E18] dark:via-[#0E241C] dark:to-[#0C291B]">
          <ScooterBoy
            riderIndex={activeRiderIndex}
            mood={riderMood}
            headlightOn={registered || loading}
            boxOpen={registered}
            eyeOffsetX={focusedField === 'email' ? Math.min(3, email.length * 0.25) : 0}
            happySmile={isEmailValid || registered}
            shakeError={Boolean(error)}
            speechBubble={riderBubble}
            onRiderTap={() => {
              setCustomBubble(`Beep-beep! ${activeRider.name} excited to deliver for you!`);
              setTimeout(() => setCustomBubble(null), 1800);
            }}
          />
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">Freshness Awaits</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Save addresses with Google Maps pins, unlock ₹ coupons, and pay via Razorpay.
          </p>
        </div>

        {/* Right Form */}
        <div className="p-8 sm:p-10 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Create Account</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Join FreshCart in under a minute</p>
            </div>
            <Link to="/login" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              Back to Login
            </Link>
          </div>

          {error && (
            <div className="mb-4" data-testid="register-error">
              <ErrorAnimation message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
              <input
                data-testid="register-name"
                type="text"
                value={fullName}
                onFocus={() => setFocusedField('none')}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Nair"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                data-testid="register-email"
                type="email"
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('none')}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.in"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Mobile Number</label>
              <input
                data-testid="register-mobile"
                type="tel"
                value={mobile}
                onFocus={() => setFocusedField('none')}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Delivery Address</label>
              <input
                data-testid="register-address"
                type="text"
                value={address}
                onFocus={() => setFocusedField('none')}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Feet Road, Indiranagar, Bengaluru"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative mt-1">
                <input
                  data-testid="register-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('none')}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="grid flex-1 grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`h-1.5 rounded-full ${strength.score >= step ? strength.color : 'bg-slate-200 dark:bg-slate-800'}`} />
                  ))}
                </div>
                <span className="text-[11px] font-medium text-slate-500">{strength.label}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm Password</label>
              <input
                data-testid="register-confirm"
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('none')}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  data-testid="register-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>I agree to the FreshCart Terms of Service and Privacy Policy.</span>
              </label>
            </div>

            <div className="sm:col-span-2 pt-1">
              <button
                type="submit"
                disabled={loading || registered}
                data-testid="register-submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {registered ? <Check className="h-4 w-4" /> : null}
                <span>{loading ? 'Creating Account...' : registered ? 'Account Ready!' : 'Register'}</span>
                {!registered && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
