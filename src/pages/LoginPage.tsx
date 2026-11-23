import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, RefreshCw, Sun, Volume2, VolumeX } from 'lucide-react';
import { authService } from '../services/authService';
import { extractApiError } from '../services/api';
import { getSupabaseGoogleOAuthUrl, isSupabaseAuthEnabled } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import { scooterSound } from '../utils/scooterSound';
import type { ScooterMood } from '../animations/ScooterBoy';
import { ScooterScene } from '../components/login/ScooterScene';
import { ScooterRide, type EntranceStage } from '../components/login/ScooterRide';
import { ScooterReaction } from '../components/login/ScooterReaction';
import { LoginCard } from '../components/login/LoginCard';
import { DeliveryBagPullSwitch } from '../components/login/DeliveryBagPullSwitch';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSessionUser, pushToast, darkMode, toggleDarkMode, activeRider, activeRiderIndex, cycleRider } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<'none' | 'email' | 'password'>('none');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleNotice, setGoogleNotice] = useState('');
  const [googleSheetOpen, setGoogleSheetOpen] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [supabaseEnabled] = useState(() => isSupabaseAuthEnabled());
  const [cachedGoogleAuthUrl, setCachedGoogleAuthUrl] = useState<string | null>(null);
  const [loggedInName, setLoggedInName] = useState<string | null>(null);
  const [entranceStage, setEntranceStage] = useState<EntranceStage>('camera-pan');

  const [soundOn, setSoundOn] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0, headlight: 0.72 });
  const [boxOpen, setBoxOpen] = useState(false);
  const [revving, setRevving] = useState(false);
  const [headlightOn, setHeadlightOn] = useState(true);
  const [hasCap, setHasCap] = useState(true);
  const [movingMarquee, setMovingMarquee] = useState(false);
  const [stoppedByTouch, setStoppedByTouch] = useState(false);
  const [manualMood, setManualMood] = useState<ScooterMood | null>(null);
  const [customBubble, setCustomBubble] = useState<string | null>(null);

  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  useEffect(() => {
    if (supabaseEnabled) {
      getSupabaseGoogleOAuthUrl()
        .then((url) => {
          if (url) setCachedGoogleAuthUrl(url);
        })
        .catch(() => {});
    }

    authService
      .getGoogleConfig()
      .then(async (cfg) => {
        setOauthConfigured(cfg.oauthConfigured);
        if (cfg.oauthConfigured && !supabaseEnabled) {
          try {
            const { url } = await authService.getGoogleAuthUrl();
            setCachedGoogleAuthUrl(url);
          } catch {
            // fallback to on-demand fetch
          }
        }
      })
      .catch(() => {});

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setGoogleLoading(true);
        const refreshed = await authService.refresh();
        if (refreshed?.user) {
          await setSessionUser(refreshed.user);
          setLoggedInName(refreshed.user.fullName);
        } else {
          setLoggedInName('Shopper');
        }
        scooterSound.playSuccessFanfare();
        pushToast('success', 'Signed in with Google!');
        setTimeout(() => navigate('/dashboard'), 900);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setGoogleLoading(false);
        setError(event.data?.message || 'Google authentication failed');
        scooterSound.playAngryBuzz();
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      scooterSound.stopEngineLoop();
    };
  }, [navigate, pushToast, setSessionUser]);

  useEffect(() => {
    if (soundOn && movingMarquee && !stoppedByTouch && entranceStage === 'settled') {
      scooterSound.startEngineLoop();
    } else {
      scooterSound.stopEngineLoop();
    }
  }, [soundOn, movingMarquee, stoppedByTouch, entranceStage]);

  const showTempBubble = (msg: string, duration = 2200) => {
    setCustomBubble(msg);
    setTimeout(() => {
      setCustomBubble((prev) => (prev === msg ? null : prev));
    }, duration);
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    scooterSound.setEnabled(next);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    const distFromRider = Math.hypot(nx + 0.15, ny - 0.15);
    const headlight = Math.max(0.45, Math.min(1, 1.15 - distFromRider));
    setParallax({ x: nx * 24, y: ny * 16, headlight });
  };

  const handleHonk = () => {
    scooterSound.playHornBeep();
    showTempBubble(`Beep-beep! ${activeRider.name} ready!`);
  };

  const handleRiderTap = () => {
    if (movingMarquee && !stoppedByTouch) {
      setStoppedByTouch(true);
      scooterSound.stopEngineLoop();
      scooterSound.playHornBeep();
      showTempBubble('Whoa! Stopped right where you touched me!');
      return;
    }
    setManualMood('angry');
    scooterSound.playAngryBuzz();
    showTempBubble("Hey! Don't poke me! I'm guarding fresh groceries!", 2400);
    setTimeout(() => {
      setManualMood((prev) => (prev === 'angry' ? null : prev));
    }, 2400);
  };

  const handleTouchStop = () => {
    setStoppedByTouch(true);
    scooterSound.stopEngineLoop();
    scooterSound.playHornBeep();
    showTempBubble('Brake applied! Touched bike to stop.');
  };

  const handleToggleMarquee = () => {
    if (movingMarquee && !stoppedByTouch) {
      setMovingMarquee(false);
      setStoppedByTouch(false);
      scooterSound.stopEngineLoop();
      showTempBubble('Parked smoothly!');
    } else {
      setStoppedByTouch(false);
      setMovingMarquee(true);
      setManualMood(null);
      scooterSound.playScooterPurr();
      showTempBubble('Cruising across street — touch bike to stop!');
    }
  };

  const handleToggleCap = () => {
    setHasCap((prev) => {
      const next = !prev;
      scooterSound.playCapPop();
      if (!next) {
        scooterSound.playAngryBuzz();
        setManualMood('angry');
        showTempBubble('Hey! Put my FreshCart cap back on!');
      } else {
        setManualMood(null);
        scooterSound.playChime();
        showTempBubble('Thanks! Safety helmet back on!');
      }
      return next;
    });
  };

  const handleSelectEmotion = (mood: ScooterMood | null) => {
    setManualMood(mood);
    if (mood === 'angry') scooterSound.playAngryBuzz();
    else if (mood === 'eating') scooterSound.playMunch();
    else if (mood === 'celebrate') scooterSound.playSuccessFanfare();
    else if (mood === 'sad') scooterSound.playErrorBump();
    else if (mood === 'sleeping') scooterSound.playChime();
  };

  const handleToggleBox = () => {
    setBoxOpen((prev) => {
      const next = !prev;
      scooterSound.playBoxPop();
      showTempBubble(next ? 'Fresh vegetables, fruits & dairy packed inside!' : 'Delivery box latched tight!');
      return next;
    });
  };

  const handleRevScooter = () => {
    setRevving(true);
    scooterSound.playScooterPurr();
    showTempBubble(`${activeRider.bikeName} boost engaged!`);
    setTimeout(() => setRevving(false), 1200);
  };

  const handleToggleHeadlight = () => {
    setHeadlightOn((prev) => {
      const next = !prev;
      scooterSound.playChime();
      showTempBubble(next ? 'Headlight switched ON!' : 'Headlight switched OFF!');
      return next;
    });
  };

  const handleRememberChange = (val: boolean) => {
    setRememberMe(val);
    showTempBubble(val ? "I'll remember your route!" : 'Temporary ride mode selected.');
  };

  const handleSwitchRider = () => {
    cycleRider();
    scooterSound.playChime();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGoogleNotice('');

    if (!email.trim()) {
      setError('Email address is required');
      scooterSound.playErrorBump();
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address');
      scooterSound.playErrorBump();
      return;
    }
    if (!password) {
      setError('Password is required');
      scooterSound.playErrorBump();
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login(email.trim(), password);
      await setSessionUser(data.user);
      setLoggedInName(data.user.fullName);
      scooterSound.playSuccessFanfare();
      pushToast('success', `Namaste, ${data.user.fullName}!`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1150);
    } catch (err) {
      scooterSound.playErrorBump();
      setError(extractApiError(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setGoogleNotice('');
    setDemoLoading(true);
    try {
      const data = await authService.demoLogin();
      await setSessionUser(data.user);
      setLoggedInName(data.user.fullName);
      scooterSound.playSuccessFanfare();
      pushToast('success', `Signed in as ${data.user.fullName} with starter cart & active order!`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1050);
    } catch (err) {
      scooterSound.playErrorBump();
      setError(extractApiError(err, 'Unable to start demo session'));
    } finally {
      setDemoLoading(false);
    }
  };

  const openAuthPopup = (url: string): boolean => {
    const w = 520;
    const h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(url, 'freshcart_google_oauth', `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) {
      return false;
    }
    const closeCheck = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(closeCheck);
        setGoogleLoading(false);
      }
    }, 500);
    return true;
  };

  const handleGoogleClick = async () => {
    setError('');
    setGoogleNotice('');
    if (supabaseEnabled) {
      setGoogleLoading(true);
      try {
        const url = cachedGoogleAuthUrl || (await getSupabaseGoogleOAuthUrl());
        if (!url || !openAuthPopup(url)) {
          setGoogleLoading(false);
          setGoogleSheetOpen(true);
          setGoogleNotice('Popup blocked by browser — allow popups or use 1-click Google Sign-In below.');
        }
      } catch (err) {
        setGoogleLoading(false);
        setGoogleSheetOpen(true);
        setError(extractApiError(err, 'Unable to start Supabase Google sign-in'));
      }
      return;
    }

    if (oauthConfigured) {
      setGoogleLoading(true);
      try {
        const url = cachedGoogleAuthUrl || (await authService.getGoogleAuthUrl()).url;
        if (!openAuthPopup(url)) {
          setGoogleLoading(false);
          setGoogleSheetOpen(true);
          setGoogleNotice('Popup blocked — allow popups or sign in directly below.');
        }
      } catch (err) {
        setGoogleLoading(false);
        setGoogleSheetOpen(true);
        setError(extractApiError(err, 'Unable to open Google sign-in popup'));
      }
      return;
    }

    setGoogleSheetOpen(true);
    showTempBubble('Pick your Google account or type your Gmail below!');
  };

  const handleGoogleQuickSubmit = async (googleEmail: string, fullName: string) => {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await authService.googleSignIn(googleEmail, fullName);
      await setSessionUser(data.user);
      setGoogleSheetOpen(false);
      setLoggedInName(data.user.fullName);
      scooterSound.playSuccessFanfare();
      pushToast('success', `Google Sign-In successful, ${data.user.fullName}!`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1050);
    } catch (err) {
      scooterSound.playErrorBump();
      setError(extractApiError(err, 'Google Sign-In failed'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const loginSuccess = Boolean(loggedInName);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen flex-col overflow-hidden bg-sky-100 lg:flex-row dark:bg-[#07110C]"
    >
      {/* Top-Right Scene Controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSwitchRider}
          title="Switch Delivery Boy & Bike (5 in loop)"
          data-testid="switch-rider-btn"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 text-xs font-bold text-amber-900 shadow-sm backdrop-blur transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>
            Boy {activeRiderIndex + 1}/5 · {activeRider.name.split(' ')[0]}
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={soundOn ? 'Mute scooter sound effects' : 'Enable scooter sound effects'}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/70 bg-white/85 px-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
        >
          {soundOn ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
          <span className="hidden sm:inline">{soundOn ? 'Sound On' : 'Sound Off'}</span>
        </button>

        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/85 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* LEFT SECTION — 60% */}
      <section className="relative w-full lg:w-[60%]">
        <ScooterScene
          parallaxX={parallax.x}
          parallaxY={parallax.y}
          celebrating={loginSuccess}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
          onSelectGrocery={(tip) => showTempBubble(tip)}
          onStoreClick={() => showTempBubble('FreshCart Storefront is stocked with 100 daily staples!')}
          onHonk={handleHonk}
          onToggleBox={handleToggleBox}
          onRevScooter={handleRevScooter}
          onToggleHeadlight={handleToggleHeadlight}
          onToggleMarquee={handleToggleMarquee}
          onToggleCap={handleToggleCap}
          onSelectEmotion={handleSelectEmotion}
          boxOpen={boxOpen}
          headlightOn={headlightOn}
          hasCap={hasCap}
          movingMarquee={movingMarquee}
          stoppedByTouch={stoppedByTouch}
          manualMood={manualMood}
        >
          <ScooterRide
            loginSuccess={loginSuccess}
            movingMarquee={movingMarquee}
            stoppedByTouch={stoppedByTouch}
            onTouchStop={handleTouchStop}
            onStageChange={setEntranceStage}
          >
            <ScooterReaction
              entranceStage={entranceStage}
              focusedField={focusedField}
              email={email}
              isEmailValid={isEmailValid}
              showPassword={showPassword}
              error={error}
              loading={loading || demoLoading || googleLoading}
              loginSuccess={loginSuccess}
              headlightIntensity={parallax.headlight}
              headlightOn={headlightOn}
              hasCap={hasCap}
              manualMood={manualMood}
              isCruising={movingMarquee && !stoppedByTouch}
              stoppedByTouch={stoppedByTouch}
              boxOpen={boxOpen}
              revving={revving}
              customBubble={customBubble}
              onRiderTap={handleRiderTap}
              onCapToggle={handleToggleCap}
              onBoxToggle={(open) => setBoxOpen(open)}
              onHeadlightClick={handleToggleHeadlight}
            />
          </ScooterRide>
        </ScooterScene>
      </section>

      {/* RIGHT SECTION — 40% with Delivery Bag Pull-Tie Lamp Switch (Always closed initially) */}
      <section className="relative flex w-full items-center justify-center bg-gradient-to-b from-emerald-100/80 via-[#FFFDF7] to-amber-50/40 px-5 py-10 lg:w-[40%] lg:bg-gradient-to-l dark:from-[#0C291B]/70 dark:via-[#07130F] dark:to-[#07130F]">
        <DeliveryBagPullSwitch
          title="FreshCart Login Bag"
          subtitle="Pull tie cord like a lamp switch to open or close"
          closedLabel="Delivery bag is closed — pull tie cord to open & launch Google Login!"
          openCtaLabel="Open Bag & Google Login"
          initialOpen={false}
          onToggle={(open) => {
            if (open) {
              showTempBubble('Bag opened! Connecting Google Sign-In & fresh groceries!');
              if ((supabaseEnabled || oauthConfigured) && cachedGoogleAuthUrl) {
                setGoogleLoading(true);
                if (!openAuthPopup(cachedGoogleAuthUrl)) {
                  setGoogleLoading(false);
                  setGoogleSheetOpen(true);
                }
              } else {
                setGoogleSheetOpen(true);
              }
            } else {
              setGoogleSheetOpen(false);
              showTempBubble('Bag tied shut! Pull cord to reopen.');
            }
          }}
        >
          <LoginCard
            email={email}
            password={password}
            showPassword={showPassword}
            rememberMe={rememberMe}
            focusedField={focusedField}
            isEmailValid={isEmailValid}
            loading={loading}
            demoLoading={demoLoading}
            googleLoading={googleLoading}
            error={error}
            googleNotice={googleNotice}
            loggedInName={loggedInName}
            logoRevealed={entranceStage === 'thumbs-up' || entranceStage === 'settled'}
            googleSheetOpen={googleSheetOpen}
            oauthConfigured={oauthConfigured || supabaseEnabled}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onTogglePassword={() => setShowPassword((s) => !s)}
            onRememberChange={handleRememberChange}
            onFocusField={setFocusedField}
            onSubmit={handleSubmit}
            onDemoLogin={handleDemoLogin}
            onGoogleClick={handleGoogleClick}
            onGoogleQuickSubmit={handleGoogleQuickSubmit}
            onCloseGoogleSheet={() => setGoogleSheetOpen(false)}
          />
        </DeliveryBagPullSwitch>
      </section>
    </div>
  );
};
