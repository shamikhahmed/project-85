/**
 * Orchestration: load health + sleep + settings, compute readiness rows, persist dailyScores.
 * All math lives in src/health/scores/*.
 */

import * as repo from '../data/repository';
import type { AppSettings, ISODate, SleepEntry } from '../domain/types';
import { addLocalCalendarDays, localCalendarDay, sleepDurationHours } from '../lib/dates';
import { ageFromBirthYear } from '../lib/bodyMetrics';
import type { HealthMetricRecord, HealthProvider } from './types';
import {
  computeRecovery,
  computeSleepPerf,
  computeStrain,
  type HrvKind,
  type RecoveryDayInput,
  type RecoveryResult,
} from './scores';

export const DAILY_SCORE_FORMULA_VERSION = 'v0.12';

function hrvKindForProvider(provider: HealthProvider): HrvKind {
  return provider === 'google_health' ? 'rmssd' : 'sdnn';
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function recordsForDay(records: HealthMetricRecord[], date: ISODate): HealthMetricRecord[] {
  return records.filter(
    (r) => !r.deletedAt && localCalendarDay(r.startAt) === date,
  );
}

function dailyRhr(records: HealthMetricRecord[], date: ISODate): number | null {
  const rows = recordsForDay(records, date).filter((r) => r.metricId === 'resting_heart_rate');
  return mean(rows.map((r) => r.value));
}

function dailyHrv(
  records: HealthMetricRecord[],
  date: ISODate,
): { value: number; kind: HrvKind } | null {
  const rows = recordsForDay(records, date).filter((r) => r.metricId === 'hrv');
  const avg = mean(rows.map((r) => r.value));
  if (avg == null) return null;
  const provider = rows[0]?.provider ?? 'apple_health';
  return { value: avg, kind: hrvKindForProvider(provider) };
}

function hrSamplesForDay(
  records: HealthMetricRecord[],
  date: ISODate,
): { at: string; bpm: number }[] {
  return recordsForDay(records, date)
    .filter((r) => r.metricId === 'heart_rate' && r.value > 0)
    .map((r) => ({ at: r.startAt, bpm: r.value }));
}

function asleepMinutesFromSleep(sleep: SleepEntry | undefined): number {
  if (!sleep) return 0;
  const h = sleepDurationHours(sleep.bedtime, sleep.wakeTime);
  if (h == null || h <= 0) return 0;
  return Math.round(h * 60);
}

export type DayComputeBundle = {
  date: ISODate;
  strain: number;
  sleepPerf: number | null;
  sleepDetail: ReturnType<typeof computeSleepPerf> | null;
  strainDetail: ReturnType<typeof computeStrain>;
  recovery: RecoveryResult;
  recoveryInput: RecoveryDayInput;
};

export function buildDayComputeOrder(dates: Iterable<ISODate>): ISODate[] {
  const set = new Set<ISODate>();
  for (const d of dates) {
    set.add(d);
    for (let i = 1; i <= 30; i += 1) {
      set.add(addLocalCalendarDays(d, -i));
    }
  }
  return [...set].sort();
}

export function computeDayScoresChronological(input: {
  orderedDates: ISODate[];
  settings: AppSettings;
  healthRecords: HealthMetricRecord[];
  sleepByDate: Map<ISODate, SleepEntry | undefined>;
  stepsByDate: Map<ISODate, number | null>;
}): Map<ISODate, DayComputeBundle> {
  const age = ageFromBirthYear(input.settings.birthYear) ?? 35;
  const baselineNeedMin = (input.settings.sleepNeedBaselineHours ?? 8) * 60;
  const out = new Map<ISODate, DayComputeBundle>();
  const sleepPerfFractionByDate = new Map<ISODate, number>();

  for (const date of input.orderedDates) {
    const steps = input.stepsByDate.get(date) ?? null;
    const strainDetail = computeStrain({
      age,
      hrMaxOverride: input.settings.hrMaxOverrideBpm,
      hrSamples: hrSamplesForDay(input.healthRecords, date),
      steps,
    });
    const strain = strainDetail.strain;

    const sleep = input.sleepByDate.get(date);
    const tonightMin = asleepMinutesFromSleep(sleep);
    const lastNights: { wakeDay: string; asleepMinutes: number }[] = [];
    const bedWakeLogs: { wakeDay: string; bedtime: string; wake: string }[] = [];
    for (let i = 1; i <= 7; i += 1) {
      const d = addLocalCalendarDays(date, -i);
      const sl = input.sleepByDate.get(d);
      if (sl) {
        const mins = asleepMinutesFromSleep(sl);
        lastNights.push({ wakeDay: d, asleepMinutes: mins });
        bedWakeLogs.push({ wakeDay: d, bedtime: sl.bedtime, wake: sl.wakeTime });
      }
    }

    let sleepDetail: ReturnType<typeof computeSleepPerf> | null = null;
    let sleepPerf: number | null = null;
    if (sleep && tonightMin > 0) {
      sleepDetail = computeSleepPerf({
        baselineNeedMinutes: baselineNeedMin,
        lastNights,
        tonightAsleepMinutes: tonightMin,
        strain,
        wakeTargetIso: sleep.wakeTime,
        bedWakeLogs,
      });
      sleepPerf = sleepDetail.performance;
      sleepPerfFractionByDate.set(date, sleepPerf / 100);
    }

    const recoveryInput: RecoveryDayInput = {
      date,
      hrv: dailyHrv(input.healthRecords, date) ?? undefined,
      rhr: dailyRhr(input.healthRecords, date) ?? undefined,
      sleepPerf: sleepPerf != null ? sleepPerf / 100 : undefined,
    };

    const history: RecoveryDayInput[] = [];
    for (const priorDate of input.orderedDates) {
      if (priorDate >= date) continue;
      history.push({
        date: priorDate,
        hrv: dailyHrv(input.healthRecords, priorDate) ?? undefined,
        rhr: dailyRhr(input.healthRecords, priorDate) ?? undefined,
        sleepPerf: sleepPerfFractionByDate.get(priorDate),
      });
    }

    const recovery = computeRecovery(recoveryInput, history);

    out.set(date, {
      date,
      strain,
      sleepPerf,
      sleepDetail,
      strainDetail,
      recovery,
      recoveryInput,
    });
  }

  return out;
}

export async function recomputeDailyScoresForDates(
  dates: Iterable<ISODate>,
): Promise<number> {
  const touch = [...new Set(dates)];
  if (touch.length === 0) return 0;

  const settings = await repo.getSettings();
  const healthRecords = await repo.listHealthRecords();

  const ordered = buildDayComputeOrder(touch);
  const sleepByDate = new Map<ISODate, SleepEntry | undefined>();
  const stepsByDate = new Map<ISODate, number | null>();

  for (const date of ordered) {
    sleepByDate.set(date, await repo.getSleepByDate(date));
    const steps = await repo.getStepsByDate(date);
    stepsByDate.set(date, steps?.totalSteps ?? null);
  }

  const computed = computeDayScoresChronological({
    orderedDates: ordered,
    settings,
    healthRecords,
    sleepByDate,
    stepsByDate,
  });

  let written = 0;
  for (const date of touch) {
    const bundle = computed.get(date);
    if (!bundle) continue;
    const recoveryScore =
      bundle.recovery.status === 'ready' ? bundle.recovery.score : null;
    await repo.upsertDailyScore({
      date,
      recovery: recoveryScore,
      strain: bundle.strain,
      sleepPerf: bundle.sleepPerf,
      formulaVersion: DAILY_SCORE_FORMULA_VERSION,
      inputsJson: JSON.stringify({
        recovery: bundle.recovery,
        strain: bundle.strainDetail,
        sleep: bundle.sleepDetail,
        recoveryInput: bundle.recoveryInput,
      }),
    });
    written += 1;
  }
  return written;
}
