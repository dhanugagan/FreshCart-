import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Tier 1 Two-Tier Quota Handling (Demo Key Specialization)
if (typeof window !== 'undefined') {
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    window.dispatchEvent(
      new CustomEvent('gmp-quota-exceeded', {
        detail: { reason: 'auth_or_quota_failure', timestamp: Date.now() },
      })
    );
  };

  const origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const joined = args.map((a) => String(a)).join(' ');
    if (/OverQuotaMapError|QuotaExceededError|OVER_QUERY_LIMIT|BillingNotEnabledMapError/i.test(joined)) {
      window.dispatchEvent(
        new CustomEvent('gmp-quota-exceeded', {
          detail: { reason: joined, timestamp: Date.now() },
        })
      );
    }
    origConsoleError(...args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
