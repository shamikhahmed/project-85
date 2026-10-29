/**
 * Health sync engine — ingests provider rows into the canonical store.
 * Never sums overlapping day totals across providers; prefer mergeHealthRecords + pickDayTotal.
 */

import { db, newId } from '../data/db';
import { sleepDurationHours } from '../lib/dates';
import type { HealthMetricRecord, HealthProvider } from './types';
import { mergeHealthRecords } from './dedupe';
import {
  checkNativeHealthAvailability,
  hasHealthReadPermission,
  pullCommonHealthMetrics,
} from '../native/healthKitBridge';
import {
  diagnoseAllConnections,
  markProviderSyncSuccess,
  mergeConnectionDiagnostics,
} from './adapters';
import { localCalendarDay } from '../lib/dates';
import { recomputeDailyScoresForDates } from './recomputeScores';
import { projectHealthRecordsIntoApp } from './projectHealthIntoApp';

const now = () => new Date().toISOString();

/** Single-flight gate so concurrent Sync clicks cannot clear+put with stale snapshots. */
let syncChain: Promise<unknown> = Promise.resolve();

function withHealthSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = syncChain.then(fn, fn);
  syncChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function dayBounds(isoDate: string): { startAt: string; endAt: string } {
  return {
    startAt: `${isoDate}T00:00:00.000`,
    endAt: `${isoDate}T23:59:59.999`,
  };
}

/** Atomic replace of healthRecords after merge — never clear without put in the same txn. */
export async function replaceHealthRecords(merged: HealthMetricRecord[]): Promise<void> {
  await db.transaction('rw', db.healthRecords, async () => {
    await db.healthRecords.clear();
    if (merged.length) await db.healthRecords.bulkPut(merged);
  });
}

/** Mirror local manual logs into healthRecords (provenance: manual). */
export async function syncManualIntoHealthStore(): Promise<number> {
  return withHealthSyncLock(async () => {
    const [weights, steps, sleeps, water] = await Promise.all([
      db.weights.toArray(),
      db.steps.toArray(),
      db.sleep.toArray(),
      db.water.toArray(),
    ]);

    const incoming: HealthMetricRecord[] = [];
    const ts = now();

    for (const w of weights.filter((x) => x.isPrimaryMorning)) {
      const { startAt, endAt } = dayBounds(w.date);
      incoming.push({
        id: `manual_weight_${w.id}`,
        metricId: 'weight',
        category: 'body',
        value: w.weightKg,
        unit: 'kg',
        originalValue: w.weightKg,
        originalUnit: 'kg',
        startAt,
        endAt,
        timeZone: null,
        ingestedAt: ts,
        provider: 'manual',
        deviceName: null,
        sourceApp: 'project85',
        sourceRecordId: w.id,
        kind: w.isEstimate ? 'estimated' : 'manual',
        quality: w.isEstimate ? 'medium' : 'high',
        deletedAt: null,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      });
    }

    for (const s of steps) {
      const { startAt, endAt } = dayBounds(s.date);
      incoming.push({
        id: `manual_steps_${s.id}`,
        metricId: 'steps',
        category: 'activity',
        value: s.totalSteps,
        unit: 'count',
        originalValue: s.totalSteps,
        originalUnit: 'count',
        startAt,
        endAt,
        timeZone: null,
        ingestedAt: ts,
        provider: 'manual',
        deviceName: null,
        sourceApp: 'project85',
        sourceRecordId: s.id,
        kind: 'manual',
        quality: 'high',
        deletedAt: null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });
    }

    for (const sl of sleeps) {
      incoming.push({
        id: `manual_sleep_${sl.id}`,
        metricId: 'sleep_asleep',
        category: 'sleep',
        value: 0,
        unit: 'min',
        originalValue: 0,
        originalUnit: 'min',
        startAt: sl.bedtime,
        endAt: sl.wakeTime,
        timeZone: null,
        ingestedAt: ts,
        provider: 'manual',
        deviceName: null,
        sourceApp: 'project85',
        sourceRecordId: sl.id,
        kind: 'manual',
        quality: 'medium',
        deletedAt: null,
        createdAt: sl.createdAt,
        updatedAt: sl.updatedAt,
      });
    }

    for (const row of incoming.filter((r) => r.metricId === 'sleep_asleep')) {
      if (!row.endAt) continue;
      const hours = sleepDurationHours(row.startAt, row.endAt);
      if (hours == null) continue;
      const mins = Math.round(hours * 60);
      row.value = mins;
      row.originalValue = mins;
    }

    const waterByDate = new Map<string, number>();
    for (const w of water) {
      waterByDate.set(w.date, (waterByDate.get(w.date) ?? 0) + w.amountMl);
    }
    for (const [date, ml] of waterByDate) {
      if (ml <= 0) continue;
      const { startAt, endAt } = dayBounds(date);
      incoming.push({
        id: `manual_water_${date}`,
        metricId: 'hydration',
        category: 'nutrition',
        value: ml,
        unit: 'ml',
        originalValue: ml,
        originalUnit: 'ml',
        startAt,
        endAt,
        timeZone: null,
        ingestedAt: ts,
        provider: 'manual',
        deviceName: null,
        sourceApp: 'project85',
        sourceRecordId: `water_day_${date}`,
        kind: 'manual',
        quality: 'high',
        deletedAt: null,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const existing = await db.healthRecords.toArray();
    const merged = mergeHealthRecords(existing, incoming);
    await replaceHealthRecords(merged);

    const prevConn = await db.healthConnections.toArray();
    const states = mergeConnectionDiagnostics(diagnoseAllConnections(), prevConn);
    await db.healthConnections.bulkPut(states);

    return incoming.length;
  });
}

function samplesToRecords(
  samples: Awaited<ReturnType<typeof pullCommonHealthMetrics>>,
  provider: HealthProvider,
): HealthMetricRecord[] {
  const ts = now();
  return samples.map((s) => {
    let value = s.value;
    let unit = s.unit;
    // Capgo sleep often returns duration minutes already; if value looks like hours (< 24) and unit is hour, convert.
    if (s.metricId.startsWith('sleep') && /hour/i.test(unit)) {
      value = Math.round(value * 60);
      unit = 'min';
    }
    return {
      id: newId('hk'),
      metricId: s.metricId,
      category: s.category,
      value,
      unit,
      originalValue: s.value,
      originalUnit: s.unit,
      startAt: s.startAt,
      endAt: s.endAt,
      timeZone: null,
      ingestedAt: ts,
      provider,
      deviceName: s.deviceName,
      sourceApp: s.sourceApp,
      sourceRecordId: s.sourceRecordId,
      kind: 'imported' as const,
      quality: 'high' as const,
      deletedAt: null,
      createdAt: ts,
      updatedAt: ts,
    };
  });
}

/** Attempt HealthKit / Health Connect pull when native Health plugin reports available. */
export async function syncAppleHealthIfAvailable(opts?: {
  from?: string;
  to?: string;
}): Promise<{ imported: number; status: string; projected?: { steps: number; weights: number; sleep: number; water: number } }> {
  return withHealthSyncLock(async () => {
    const bridge = await checkNativeHealthAvailability();
    if (!bridge.available) {
      return { imported: 0, status: bridge.reason };
    }

    const to = opts?.to ?? new Date().toISOString();
    const from =
      opts?.from ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const provider: HealthProvider =
      bridge.platform === 'android' ? 'google_health' : 'apple_health';

    // Never call readSamples before permission has been granted.
    const permitted = await hasHealthReadPermission();
    if (!permitted) {
      const prevConn = await db.healthConnections.toArray();
      const states = mergeConnectionDiagnostics(diagnoseAllConnections(), prevConn).map((c) =>
        c.provider === provider
          ? {
              ...c,
              status: 'permission_needed' as const,
              lastAttemptAt: now(),
              updatedAt: now(),
              notes: 'Authorize Apple Health / Health Connect before sync can read samples.',
            }
          : c,
      );
      await db.healthConnections.bulkPut(states);
      return { imported: 0, status: 'permission_needed' };
    }

    let samples;
    try {
      samples = await pullCommonHealthMetrics(30, { from, to });
    } catch (e) {
      // Failed sync keeps previous status and data — only stamp lastAttemptAt.
      const prevConn = await db.healthConnections.toArray();
      const states = mergeConnectionDiagnostics(diagnoseAllConnections(), prevConn).map((c) =>
        c.provider === provider
          ? {
              ...c,
              lastAttemptAt: now(),
              updatedAt: now(),
              notes: e instanceof Error ? e.message : 'Sync failed',
            }
          : c,
      );
      await db.healthConnections.bulkPut(states);
      return {
        imported: 0,
        status: e instanceof Error ? e.message : 'Sync failed — previous data kept',
      };
    }

    const incoming = samplesToRecords(samples, provider);

    if (incoming.length) {
      const existing = await db.healthRecords.toArray();
      const merged = mergeHealthRecords(existing, incoming);
      await replaceHealthRecords(merged);
      const projected = await projectHealthRecordsIntoApp(merged);
      const touchedDays = [
        ...new Set(
          incoming
            .filter((r) => !r.deletedAt)
            .map((r) => localCalendarDay(r.startAt)),
        ),
      ];
      await recomputeDailyScoresForDates(touchedDays);
      const prevConn = await db.healthConnections.toArray();
      const label = provider === 'google_health' ? 'Health Connect' : 'HealthKit';
      const states = markProviderSyncSuccess(
        prevConn,
        provider,
        `Imported ${incoming.length} ${label} sample(s). Originals preserved in healthRecords.`,
      );
      await db.healthConnections.bulkPut(states);
      return { imported: incoming.length, status: 'ok', projected };
    }

    // Empty pull is not success — keep prior connection truth; record attempt only.
    const prevConn = await db.healthConnections.toArray();
    const states = mergeConnectionDiagnostics(diagnoseAllConnections(), prevConn).map((c) =>
      c.provider === provider
        ? { ...c, lastAttemptAt: now(), updatedAt: now() }
        : c,
    );
    await db.healthConnections.bulkPut(states);

    return {
      imported: 0,
      status:
        'No health samples in range — authorize via Connect, or no data yet.',
    };
  });
}

export async function runFullHealthSync(opts?: {
  from?: string;
  to?: string;
}): Promise<{
  manualMirrored: number;
  apple: { imported: number; status: string };
}> {
  // Nested locks serialize; manual then apple/android.
  const manualMirrored = await syncManualIntoHealthStore();
  const apple = await syncAppleHealthIfAvailable(opts);
  return { manualMirrored, apple };
}

/** Exported for tests — same lock helper. */
export { withHealthSyncLock };
