import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { maybeRunAutoHealthSync } from '../health/autoSync';
import { useAppStore } from '../store/useAppStore';

/**
 * Native-only: auto health sync on launch and every resume (15-min throttle).
 * No-op in the PWA — never fakes a connection.
 */
export function CapAutoHealthSync() {
  const refreshDay = useAppStore((s) => s.refreshDay);
  const ready = useAppStore((s) => s.ready);
  const ranLaunch = useRef(false);

  useEffect(() => {
    if (!ready || !Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    const run = async (force = false) => {
      const result = await maybeRunAutoHealthSync({ force });
      if (!cancelled && result.ran) await refreshDay();
    };

    if (!ranLaunch.current) {
      ranLaunch.current = true;
      void run(false);
    }

    void (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void run(false);
      });
      remove = () => {
        void handle.remove();
      };
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [ready, refreshDay]);

  return null;
}
