import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Native deep links: project85://physique · project85:///health
 * Used for simulator QA and future widget / shortcut entry.
 */
export function CapDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const routeFromUrl = (raw: string) => {
      try {
        const u = new URL(raw);
        let path = u.pathname || '';
        if ((!path || path === '/') && u.host && !u.host.includes('.')) {
          path = `/${u.host}`;
        }
        path = path.replace(/\/+/g, '/') || '/';
        const allowed = new Set([
          '/',
          '/log',
          '/progress',
          '/discipline',
          '/physique',
          '/body',
          '/health',
          '/motivation',
          '/timeline',
          '/history',
          '/settings',
        ]);
        if (allowed.has(path)) navigate(path);
      } catch {
        /* ignore malformed */
      }
    };

    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const staged = await Preferences.get({ key: 'qaRoute' });
        if (staged.value === 'seed-weight') {
          await Preferences.remove({ key: 'qaRoute' });
          const { upsertPrimaryWeight } = await import('../data/repository');
          const { toLocalISODate } = await import('../lib/dates');
          await upsertPrimaryWeight({
            date: toLocalISODate(),
            weightKg: 95.2,
            notes: 'Simulator QA seed',
            isEstimate: false,
            enteredLate: false,
          });
          navigate('/');
          return;
        }
        if (staged.value) {
          const path = staged.value.startsWith('/') ? staged.value : `/${staged.value}`;
          await Preferences.remove({ key: 'qaRoute' });
          navigate(path);
        }
      } catch {
        /* preferences unavailable */
      }
      try {
        const { App } = await import('@capacitor/app');
        const launch = await App.getLaunchUrl();
        if (launch?.url) routeFromUrl(launch.url);
        const handle = await App.addListener('appUrlOpen', (e) => routeFromUrl(e.url));
        remove = () => {
          void handle.remove();
        };
      } catch {
        /* plugin unavailable */
      }
    })();

    return () => remove?.();
  }, [navigate]);

  return null;
}
