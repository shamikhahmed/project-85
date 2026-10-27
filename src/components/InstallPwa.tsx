import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'p85-install-dismissed';

export function InstallPwaBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [iosHint, setIosHint] = useState(false);
  const [updateReady, setUpdateReady] = useState<(() => void) | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      ('standalone' in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) setIosHint(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<() => void>).detail;
      if (typeof detail === 'function') setUpdateReady(() => detail);
    };
    window.addEventListener('p85-pwa-update', handler);
    return () => window.removeEventListener('p85-pwa-update', handler);
  }, []);

  if (installed) return null;

  if (updateReady) {
    return (
      <div className="install-banner panel" role="status">
        <div>
          <strong>Update available</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            A newer version of PROJECT 85 is ready.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => updateReady()}>
          Reload
        </button>
      </div>
    );
  }

  if (dismissed && !deferred) return null;
  if (!deferred && !iosHint) return null;

  return (
    <div className="install-banner panel" role="region" aria-label="Install app">
      <div>
        <strong>Keep it one tap away</strong>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
          {iosHint && !deferred
            ? 'iPhone tip: Share → Add to Home Screen. Works offline after that.'
            : 'Install for a full-screen app icon and offline logging on this device.'}
        </p>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {deferred && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              await deferred.prompt();
              const choice = await deferred.userChoice;
              if (choice.outcome !== 'accepted') {
                localStorage.setItem(DISMISS_KEY, '1');
                setDismissed(true);
              }
              setDeferred(null);
            }}
          >
            Install
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
        >
          Not now
        </button>
      </div>
      <style>{`
        .install-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          border-color: var(--accent);
          background: linear-gradient(135deg, var(--accent-soft), var(--bg-elevated));
        }
      `}</style>
    </div>
  );
}

export function PwaStatusCard() {
  const [swState, setSwState] = useState('checking…');
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);

    void (async () => {
      if (!('serviceWorker' in navigator)) {
        setSwState('unsupported');
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      setSwState(reg ? 'registered' : 'not registered yet');
    })();

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>PWA / offline</h2>
      <p className="muted" style={{ margin: 0 }}>
        Service worker: <strong className="mono">{swState}</strong>
      </p>
      <p className="muted" style={{ margin: 0 }}>
        Network: <strong>{offline ? 'Offline' : 'Online'}</strong>
      </p>
      <p className="dim" style={{ fontSize: '0.8rem', margin: 0 }}>
        After install (or first production visit), the app shell caches for offline use. Your logs
        already live in IndexedDB on this device — export backups from below.
      </p>
    </section>
  );
}
