/**
 * HealthKit / Health Connect bridge via @capgo/capacitor-health.
 *
 * - Browser PWA: always unavailable (no HealthKit store).
 * - Native Capacitor iOS/Android: availability + authorization + sample reads.
 *
 * Live data still requires a signed iOS build with HealthKit entitlement and
 * usage strings. See NATIVE_HEALTHKIT.md.
 */

import { Capacitor } from '@capacitor/core';
import type { HealthDataType, HealthSample } from '@capgo/capacitor-health';
import type { HealthMetricCategory } from '../health/types';

export interface HealthKitBridgeStatus {
  available: boolean;
  platform: 'web' | 'ios' | 'android' | 'unknown';
  reason: string;
  pluginPresent: boolean;
}

export interface BridgeSample {
  metricId: string;
  category: HealthMetricCategory;
  value: number;
  unit: string;
  startAt: string;
  endAt: string | null;
  deviceName: string | null;
  sourceApp: string | null;
  sourceRecordId: string | null;
}

const TYPE_MAP: Record<
  string,
  { dataType: HealthDataType; metricId: string; category: HealthMetricCategory }
> = {
  steps: { dataType: 'steps', metricId: 'steps', category: 'activity' },
  distance: { dataType: 'distance', metricId: 'distance', category: 'activity' },
  restingHeartRate: {
    dataType: 'restingHeartRate',
    metricId: 'resting_heart_rate',
    category: 'heart',
  },
  heartRateVariability: {
    dataType: 'heartRateVariability',
    metricId: 'hrv',
    category: 'heart',
  },
  sleep: { dataType: 'sleep', metricId: 'sleep_asleep', category: 'sleep' },
  vo2Max: { dataType: 'vo2Max', metricId: 'vo2_max', category: 'fitness' },
  oxygenSaturation: {
    dataType: 'oxygenSaturation',
    metricId: 'spo2',
    category: 'respiratory',
  },
  respiratoryRate: {
    dataType: 'respiratoryRate',
    metricId: 'respiratory_rate',
    category: 'respiratory',
  },
  weight: { dataType: 'weight', metricId: 'weight', category: 'body' },
  bodyFat: { dataType: 'bodyFat', metricId: 'body_fat', category: 'body' },
  activeEnergy: {
    dataType: 'calories',
    metricId: 'active_energy',
    category: 'energy',
  },
  dietaryWater: {
    dataType: 'dietaryWater',
    metricId: 'hydration',
    category: 'nutrition',
  },
};

async function loadHealthPlugin() {
  try {
    const mod = await import('@capgo/capacitor-health');
    return mod.Health;
  } catch {
    return null;
  }
}

export function getHealthKitBridgeStatus(): HealthKitBridgeStatus {
  if (!Capacitor.isNativePlatform()) {
    return {
      available: false,
      platform: 'web',
      pluginPresent: true,
      reason:
        'PWA / browser: HealthKit and Health Connect are unavailable. Install the Capacitor iOS app for Apple Health.',
    };
  }
  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  return {
    available: true,
    platform: platform === 'ios' || platform === 'android' ? platform : 'unknown',
    pluginPresent: true,
    reason:
      platform === 'ios'
        ? 'Native iOS — call requestHealthAuthorization() then sync. Requires HealthKit entitlement on device.'
        : 'Native Android — Health Connect may be available after authorization.',
  };
}

export async function checkNativeHealthAvailability(): Promise<HealthKitBridgeStatus> {
  const base = getHealthKitBridgeStatus();
  if (!base.available) return base;
  const Health = await loadHealthPlugin();
  if (!Health) {
    return {
      ...base,
      available: false,
      pluginPresent: false,
      reason: '@capgo/capacitor-health failed to load in the native shell.',
    };
  }
  try {
    const result = await Health.isAvailable();
    return {
      ...base,
      available: !!result.available,
      reason: result.reason ?? base.reason,
    };
  } catch (e) {
    return {
      ...base,
      available: false,
      reason: e instanceof Error ? e.message : 'isAvailable() failed',
    };
  }
}

const DEFAULT_READ: HealthDataType[] = [
  'steps',
  'distance',
  'calories',
  'heartRate',
  'restingHeartRate',
  'heartRateVariability',
  'sleep',
  'weight',
  'vo2Max',
  'oxygenSaturation',
  'respiratoryRate',
  'bodyFat',
  'dietaryWater',
  'workouts',
];

export async function requestHealthAuthorization(): Promise<{
  ok: boolean;
  detail: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      detail: 'Authorization only works inside the Capacitor native app, not the PWA.',
    };
  }
  const Health = await loadHealthPlugin();
  if (!Health) return { ok: false, detail: 'Health plugin missing' };
  try {
    const status = await Health.requestAuthorization({ read: DEFAULT_READ });
    const granted = status.readAuthorized?.length ?? 0;
    return {
      ok: granted > 0,
      detail:
        granted > 0
          ? `Authorized read types: ${status.readAuthorized.join(', ')}`
          : `No read types granted. Denied: ${(status.readDenied ?? []).join(', ') || 'unknown'}`,
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Authorization failed' };
  }
}

function mapSample(
  sample: HealthSample,
  metricId: string,
  category: HealthMetricCategory,
): BridgeSample {
  return {
    metricId,
    category,
    value: sample.value,
    unit: sample.unit,
    startAt: sample.startDate,
    endAt: sample.endDate ?? null,
    deviceName: sample.deviceType ?? null,
    sourceApp: sample.sourceName ?? null,
    sourceRecordId: sample.platformId ?? sample.sourceId ?? null,
  };
}

export async function queryAuthorizedQuantitySamples(opts: {
  identifier: string;
  from: string;
  to: string;
}): Promise<BridgeSample[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const mapping = TYPE_MAP[opts.identifier];
  if (!mapping) return [];
  const Health = await loadHealthPlugin();
  if (!Health) return [];
  try {
    const result = await Health.readSamples({
      dataType: mapping.dataType,
      startDate: opts.from,
      endDate: opts.to,
      limit: 500,
      ascending: true,
    });
    return (result.samples ?? []).map((s) =>
      mapSample(s, mapping.metricId, mapping.category),
    );
  } catch {
    return [];
  }
}

/** Pull several common types for the last N days. */
export async function pullCommonHealthMetrics(days = 7): Promise<BridgeSample[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const keys = Object.keys(TYPE_MAP);
  const out: BridgeSample[] = [];
  for (const key of keys) {
    const rows = await queryAuthorizedQuantitySamples({ identifier: key, from, to });
    out.push(...rows);
  }
  return out;
}
