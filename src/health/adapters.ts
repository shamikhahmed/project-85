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
      notes: 'Weights, steps, sleep, water and workouts you log locally — mirrored into healthRecords on sync.',
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
    return {
      id: 'conn_apple_health',
      provider: 'apple_health',
      displayName: 'Apple Health',
      status: native && bridge.available ? 'ok' : 'unsupported',
      lastSuccessAt: native && bridge.available ? nowIso() : null,
      lastAttemptAt: nowIso(),
      lastError: null,
      scopesGranted: [],
      notes: bridge.reason,
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
