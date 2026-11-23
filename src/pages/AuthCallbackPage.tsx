import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../services/authService';
import { useApp } from '../context/AppContext';
import { ScooterBoy } from '../animations/ScooterBoy';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSessionUser, activeRiderIndex } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your Google & Supabase session...');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase Auth is not configured in environment.');
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token) {
          throw new Error(error?.message || 'Unable to retrieve Supabase Google session.');
        }

        const exchanged = await authService.supabaseExchange(data.session.access_token);
        if (!active) return;

        await setSessionUser(exchanged.user);
        setStatus('success');
        setMessage(`Welcome back, ${exchanged.user.fullName}!`);

        if (window.opener && window.opener !== window) {
          window.opener.postMessage(
            { type: 'OAUTH_AUTH_SUCCESS', accessToken: exchanged.accessToken, user: exchanged.user },
            '*'
          );
          setTimeout(() => window.close(), 350);
        } else {
          setTimeout(() => navigate('/dashboard', { replace: true }), 650);
        }
      } catch (err: any) {
        if (!active) return;
        const msg = err?.message || 'Google authentication callback failed.';
        setStatus('error');
        setMessage(msg);
        if (window.opener && window.opener !== window) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', message: msg }, '*');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, setSessionUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF7] px-6 text-center dark:bg-[#07110C]">
      <div className="w-52">
        <ScooterBoy riderIndex={activeRiderIndex} mood={status === 'error' ? 'sad' : 'celebrate'} speechBubble={message} />
      </div>
      <div className="mt-5 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
        {status === 'error' ? (
          <AlertCircle className="h-5 w-5 text-rose-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        )}
        <span>{message}</span>
      </div>
      {status === 'error' && (
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="mt-4 h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          Back to Login
        </button>
      )}
    </div>
  );
};
