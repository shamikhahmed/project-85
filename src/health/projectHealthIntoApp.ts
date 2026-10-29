/**
 * Project imported healthRecords into the app's day tables so Dashboard / Log
 * fill automatically. Manual entries always win.
 */

import * as repo from '../data/repository';
import { pickDayTotal } from './dedupe';
import type { HealthMetricRecord, HealthProvider } from './types';

function providerToSource(
  provider: HealthProvider,
): 'apple_health' | 'google_health' {
  return provider === 'google_health' ? 'google_health' : 'apple_health';
}

function localDay(iso: string): string {
  // Prefer calendar date from the sample start (HealthKit local-ish ISO).
  return iso.slice(0, 10);
}

/** Aggregate steps / weight / sleep / hydration from records into domain tables. */
export async function projectHealthRecordsIntoApp(
  records: HealthMetricRecord[],
): Promise<{ steps: number; weights: number; sleep: number; water: number }> {
  const counts = { steps: 0, weights: 0, sleep: 0, water: 0 };
  const days = new Set(records.map((r) => localDay(r.startAt)));

  for (const day of days) {
    const dayRows = records.filter((r) => localDay(r.startAt) === day);

    const steps = pickDayTotal(dayRows, 'steps', day);
    if (steps && steps.provider !== 'manual') {
      const res = await repo.applyHealthStepsIfAllowed(
        day,
        Math.round(steps.value),
        providerToSource(steps.provider),
      );
      if (res === 'applied') counts.steps += 1;
    }

    const weight = pickDayTotal(dayRows, 'weight', day);
    if (weight && weight.provider !== 'manual') {
      // Prefer earliest morning-ish sample if multiple.
      const candidates = dayRows
        .filter((r) => r.metricId === 'weight' && r.provider !== 'manual')
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
      const pick = candidates[0] ?? weight;
      const res = await repo.applyHealthWeightIfAllowed(
        day,
        pick.value,
        providerToSource(pick.provider),
      );
      if (res === 'applied') counts.weights += 1;
    }

    const asleep = dayRows.filter(
      (r) => r.metricId === 'sleep_asleep' && r.provider !== 'manual' && r.endAt,
    );
    if (asleep.length) {
      // Longest asleep session for the night ending on `day` (wake date).
      const sorted = [...asleep].sort(
        (a, b) => (b.value || 0) - (a.value || 0),
      );
      const best = sorted[0]!;
      if (best.endAt) {
        const wakeDay = best.endAt.slice(0, 10);
        const res = await repo.applyHealthSleepIfAllowed(
          wakeDay,
          best.startAt,
          best.endAt,
          providerToSource(best.provider),
        );
        if (res === 'applied') counts.sleep += 1;
      }
    }

    const water = pickDayTotal(dayRows, 'hydration', day);
    if (water && water.provider !== 'manual' && water.value > 0) {
      // Only seed water when the day has no entries yet (manual wins by presence).
      const { db } = await import('../data/db');
      const rows = await db.water.where('date').equals(day).toArray();
      if (rows.length === 0) {
        await repo.addWater(day, Math.round(water.value));
        counts.water += 1;
      }
    }
  }

  return counts;
}
