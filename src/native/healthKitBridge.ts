/**
 * HealthKit / Health Connect bridge via @capgo/capacitor-health.
 *
 * - Browser PWA: always unavailable (no HealthKit store).
 * - Native Capacitor iOS/Android: availability + authorization + sample reads.
 *
 * Live data still requires a signed iOS/Android build. See NATIVE_HEALTHKIT.md.
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
  sleepState?: string | null;
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
  basalCalories: {
    dataType: 'basalCalories',
    metricId: 'basal_energy',
    category: 'energy',
  },
  totalCalories: {
    dataType: 'totalCalories',
    metricId: 'total_energy',
    category: 'energy',
  },
  dietaryEnergyConsumed: {
    dataType: 'dietaryEnergyConsumed',
    metricId: 'nutrition_import',
    category: 'nutrition',
  },
  dietaryWater: {
    dataType: 'dietaryWater',
    metricId: 'hydration',
    category: 'nutrition',
  },
};

/** Metrics requested in the brief that Capgo has no type for — skip + log. */
export const UNSUPPORTED_HEALTH_METRICS = ['protein'] as const;

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
  'basalCalories',
  'totalCalories',
  'dietaryEnergyConsumed',
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
    const status = await Health.requestAuthorization({
      read: DEFAULT_READ,
      write: ['weight'],
      requestHistoryAccess: true,
    });
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
    sleepState: sample.sleepState ?? null,
  };
}

export async function queryAuthorizedQuantitySamples(opts: {
  identifier: string;
  from: string;
  to: string;
}): Promise<BridgeSample[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const mapping = TYPE_MAP[opts.identifier];
  if (!mapping) {
    console.info(`[health] skip unknown identifier: ${opts.identifier}`);
    return [];
  }
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
    return (result.samples ?? []).map((s) => {
      // Sleep: keep asleep samples as sleep_asleep; in-bed as sleep_in_bed.
      if (mapping.dataType === 'sleep' && s.sleepState === 'inBed') {
        return mapSample(s, 'sleep_in_bed', 'sleep');
      }
      return mapSample(s, mapping.metricId, mapping.category);
    });
  } catch (e) {
    console.info(
      `[health] readSamples failed for ${opts.identifier}:`,
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function queryWorkouts(opts: {
  from: string;
  to: string;
}): Promise<BridgeSample[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const Health = await loadHealthPlugin();
  if (!Health) return [];
  try {
    const result = await Health.queryWorkouts({
      startDate: opts.from,
      endDate: opts.to,
      limit: 100,
    });
    return (result.workouts ?? []).map((w) => ({
      metricId: 'workout',
      category: 'activity' as const,
      value: Math.round((w.duration ?? 0) / 60),
      unit: 'min',
      startAt: w.startDate,
      endAt: w.endDate ?? null,
      deviceName: null,
      sourceApp: w.sourceName ?? null,
      sourceRecordId: w.platformId ?? w.sourceId ?? null,
    }));
  } catch (e) {
    console.info('[health] queryWorkouts failed:', e instanceof Error ? e.message : e);
    return [];
  }
}

/** Optional write-back: save a weight sample to Apple Health / Health Connect. */
export async function writeWeightToHealth(weightKg: number, at = new Date()): Promise<{
  ok: boolean;
  detail: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, detail: 'Write-back only works in the native app.' };
  }
  const Health = await loadHealthPlugin();
  if (!Health) return { ok: false, detail: 'Health plugin missing' };
  try {
    await Health.saveSample({
      dataType: 'weight',
      value: weightKg,
      unit: 'kilogram',
      startDate: at.toISOString(),
    });
    return { ok: true, detail: 'Weight saved to Apple Health / Health Connect' };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'saveSample failed' };
  }
}

/** Pull all mapped types (+ workouts). Logs unsupported brief metrics once. */
export async function pullCommonHealthMetrics(
  days = 7,
  range?: { from: string; to: string },
): Promise<BridgeSample[]> {
  if (!Capacitor.isNativePlatform()) return [];
  for (const m of UNSUPPORTED_HEALTH_METRICS) {
    console.info(`[health] skip unsupported Capgo type: ${m}`);
  }
  const to = range?.to ?? new Date().toISOString();
  const from =
    range?.from ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const keys = Object.keys(TYPE_MAP);
  const out: BridgeSample[] = [];
  for (const key of keys) {
    const rows = await queryAuthorizedQuantitySamples({ identifier: key, from, to });
    out.push(...rows);
  }
  out.push(...(await queryWorkouts({ from, to })));
  return out;
}

export function healthTypeMapKeys(): string[] {
  return Object.keys(TYPE_MAP);
}
