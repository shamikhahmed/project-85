import { registerSW } from 'virtual:pwa-register';

export type PwaUpdateHandler = (reloadPage: () => void) => void;

/** Register the service worker for installable offline PWA behaviour. */
export function setupPwa(onNeedRefresh?: PwaUpdateHandler) {
  if (typeof window === 'undefined') return () => undefined;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh?.(() => {
        void updateSW(true);
      });
    },
    onOfflineReady() {
      console.info('[PWA] Ready for offline use');
    },
    onRegisteredSW(swUrl, registration) {
      console.info('[PWA] Service worker registered', swUrl);
      // Periodic update check while the app stays open
      if (registration) {
        window.setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration failed', error);
    },
  });

  return updateSW;
}
