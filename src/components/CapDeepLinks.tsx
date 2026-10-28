import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../store/useAppStore';

const ALLOWED_ROUTES = new Set([
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

function normalizeRoute(raw: string): string | null {
  const path = (raw.startsWith('/') ? raw : `/${raw}`).replace(/\/+/g, '/') || '/';
  return ALLOWED_ROUTES.has(path) ? path : null;
}

/**
 * Native deep links: project85://physique · project85:///health
 * Preferences qaRoute is allowlisted the same way (simulator QA).
 */
export function CapDeepLinks() {
  const navigate = useNavigate();
  const refreshDay = useAppStore((s) => s.refreshDay);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const routeFromUrl = (raw: string) => {
      try {
        const u = new URL(raw);
        let path = u.pathname || '';
        if ((!path || path === '/') && u.host && !u.host.includes('.')) {
          path = `/${u.host}`;
        }
        const allowed = normalizeRoute(path.replace(/\/+/g, '/') || '/');
        if (allowed) navigate(allowed);
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
          await refreshDay();
          return;
        }
        if (staged.value) {
          const allowed = normalizeRoute(staged.value);
          await Preferences.remove({ key: 'qaRoute' });
          if (allowed) navigate(allowed);
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
  }, [navigate, refreshDay]);

  return null;
}
