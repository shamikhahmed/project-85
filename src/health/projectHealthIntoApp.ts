/**
 * Project imported healthRecords into the app's day tables so Dashboard / Log
 * fill automatically. Manual entries always win.
 */

import * as repo from '../data/repository';
import { localCalendarDay } from '../lib/dates';
import { pickDayTotal } from './dedupe';
import { groupSleepNights } from './scores/sleepNights';
import type { HealthMetricRecord, HealthProvider } from './types';

function providerToSource(
  provider: HealthProvider,
): 'apple_health' | 'google_health' {
  return provider === 'google_health' ? 'google_health' : 'apple_health';
}

/** Aggregate steps / weight / sleep / hydration from records into domain tables. */
export async function projectHealthRecordsIntoApp(
  records: HealthMetricRecord[],
): Promise<{ steps: number; weights: number; sleep: number; water: number }> {
  const counts = { steps: 0, weights: 0, sleep: 0, water: 0 };
  const days = new Set(records.map((r) => localCalendarDay(r.startAt)));

  for (const day of days) {
    const dayRows = records.filter((r) => localCalendarDay(r.startAt) === day);

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

    const water = pickDayTotal(dayRows, 'hydration', day);
    if (water && water.provider !== 'manual' && water.value > 0) {
      const res = await repo.applyHealthWaterIfAllowed(
        day,
        Math.round(water.value),
        providerToSource(water.provider),
      );
      if (res === 'applied') counts.water += 1;
    }
  }

  const sleepSegs = records.filter(
    (r) =>
      (r.metricId === 'sleep_asleep' || r.metricId === 'sleep_awake') &&
      r.provider !== 'manual' &&
      r.endAt,
  );
  const nights = groupSleepNights(
    sleepSegs.map((r) => ({
      startAt: r.startAt,
      endAt: r.endAt!,
      metricId: r.metricId,
      value: r.value,
      provider: r.provider,
    })),
  );
  for (const night of nights) {
    const first = sleepSegs.find((s) => s.startAt === night.bedtime);
    const provider = (first?.provider ?? 'apple_health') as HealthProvider;
    const res = await repo.applyHealthSleepIfAllowed(
      night.wakeDay,
      night.bedtime,
      night.wake,
      providerToSource(provider),
    );
    if (res === 'applied') counts.sleep += 1;
  }

  return counts;
}
