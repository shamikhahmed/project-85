import { Capacitor } from '@capacitor/core';
import type { HealthConnectionState, HealthProvider } from './types';
import { getGoogleHealthSetupStatus } from './googleHealthClient';
import { getHealthKitBridgeStatus } from '../native/healthKitBridge';

export interface HealthAdapter {
  provider: HealthProvider;
  displayName: string;
  worksInPwa: boolean;
  diagnose(): HealthConnectionState;
}

const nowIso = () => new Date().toISOString();

export const manualAdapter: HealthAdapter = {
  provider: 'manual',
  displayName: 'Manual entry (PROJECT 85)',
  worksInPwa: true,
  diagnose() {
    return {
      id: 'conn_manual',
      provider: 'manual',
      displayName: 'Manual entry',
      status: 'ok',
      lastSuccessAt: nowIso(),
      lastAttemptAt: nowIso(),
      lastError: null,
      scopesGranted: ['local'],
      notes:
        'Weights, steps, sleep, water and workouts you log locally — mirrored into healthRecords on sync.',
      updatedAt: nowIso(),
    };
  },
};

export const appleHealthAdapter: HealthAdapter = {
  provider: 'apple_health',
  displayName: 'Apple Health (HealthKit)',
  worksInPwa: false,
  diagnose() {
    const bridge = getHealthKitBridgeStatus();
    const native = Capacitor.isNativePlatform();
    // Never report ok / lastSuccessAt from platform presence alone — only after a real sync.
    return {
      id: 'conn_apple_health',
      provider: 'apple_health',
      displayName: 'Apple Health',
      status: native ? 'permission_needed' : 'unsupported',
      lastSuccessAt: null,
      lastAttemptAt: nowIso(),
      lastError: null,
      scopesGranted: [],
      notes: native
        ? `${bridge.reason} Connect Apple Health, authorize reads, then Sync — status stays permission_needed until a successful pull.`
        : bridge.reason,
      updatedAt: nowIso(),
    };
  },
};

export const googleHealthAdapter: HealthAdapter = {
  provider: 'google_health',
  displayName: 'Google Health API',
  worksInPwa: false,
  diagnose() {
    const setup = getGoogleHealthSetupStatus();
    return {
      id: 'conn_google_health',
      provider: 'google_health',
      displayName: 'Google Health / Fitbit Air',
      status: 'blocked_credentials',
      lastSuccessAt: null,
      lastAttemptAt: nowIso(),
      lastError: null,
      scopesGranted: [],
      notes: setup.reason,
      updatedAt: nowIso(),
    };
  },
};

export const zeppViaAppleAdapter: HealthAdapter = {
  provider: 'zepp_via_apple',
  displayName: 'Zepp → Apple Health',
  worksInPwa: false,
  diagnose() {
    return {
      id: 'conn_zepp_via_apple',
      provider: 'zepp_via_apple',
      displayName: 'Zepp / Amazfit via Apple Health',
      status: 'unsupported',
      lastSuccessAt: null,
      lastAttemptAt: nowIso(),
      lastError: null,
      scopesGranted: [],
      notes:
        'Enable sharing in Zepp, then read via the HealthKit bridge in the native app. Direct Zepp Open Platform needs enterprise onboarding.',
      updatedAt: nowIso(),
    };
  },
};

export const ALL_ADAPTERS: HealthAdapter[] = [
  manualAdapter,
  appleHealthAdapter,
  googleHealthAdapter,
  zeppViaAppleAdapter,
];

export function diagnoseAllConnections(): HealthConnectionState[] {
  return ALL_ADAPTERS.map((a) => a.diagnose());
}

/**
 * Merge live platform diagnose with persisted connection rows.
 * Preserves a prior Apple (or other) `ok` + lastSuccessAt so a successful sync
 * is not wiped by the next diagnose-only refresh. Never invents `ok` without
 * an existing success timestamp.
 */
export function mergeConnectionDiagnostics(
  diagnosed: HealthConnectionState[],
  existing: HealthConnectionState[],
): HealthConnectionState[] {
  const prevByProvider = new Map(existing.map((e) => [e.provider, e]));
  return diagnosed.map((d) => {
    const prev = prevByProvider.get(d.provider);
    if (!prev) return d;
    // Platform no longer available — do not keep a stale ok.
    if (d.status === 'unsupported' || d.status === 'blocked_credentials') {
      return {
        ...d,
        lastSuccessAt: prev.lastSuccessAt,
        lastError: d.lastError ?? prev.lastError,
      };
    }
    if (
      prev.status === 'ok' &&
      prev.lastSuccessAt &&
      (d.status === 'permission_needed' || d.status === 'never' || d.status === 'stale')
    ) {
      return {
        ...d,
        status: 'ok',
        lastSuccessAt: prev.lastSuccessAt,
        lastAttemptAt: d.lastAttemptAt ?? prev.lastAttemptAt,
        scopesGranted: prev.scopesGranted.length ? prev.scopesGranted : d.scopesGranted,
        notes: prev.notes || d.notes,
        updatedAt: d.updatedAt,
      };
    }
    if (prev.lastSuccessAt && !d.lastSuccessAt) {
      return { ...d, lastSuccessAt: prev.lastSuccessAt };
    }
    return d;
  });
}

/** Mark a provider connected after a verified successful pull (never call on empty). */
export function markProviderSyncSuccess(
  existing: HealthConnectionState[],
  provider: HealthProvider,
  detail: string,
): HealthConnectionState[] {
  const ts = nowIso();
  const base = diagnoseAllConnections();
  const withPrev = mergeConnectionDiagnostics(base, existing);
  return withPrev.map((c) =>
    c.provider === provider
      ? {
          ...c,
          status: 'ok',
          lastSuccessAt: ts,
          lastAttemptAt: ts,
          lastError: null,
          notes: detail,
          updatedAt: ts,
        }
      : c,
  );
}
