import type { AppSettings, DayAggregate, DayScore } from '../domain/types';
import { calendarDaysElapsed, calendarDaysRemaining } from '../lib/dates';
import { assessWeightTrend } from '../lib/weightTrend';
import { computeWeightProgress } from '../lib/weightProgress';
import { buildDailyBriefing } from '../lib/briefing';
import {
  emptyWidgetSnapshot,
  type WidgetSnapshot,
  type WidgetTrendDirection,
} from './widgetSnapshot';

export interface BuildWidgetSnapshotInput {
  settings: AppSettings;
  agg: DayAggregate;
  score: DayScore | null;
  latestWeightKg: number | null;
  /** Primary morning weigh-ins, ascending by date */
  weightSeries: { date: string; weightKg: number }[];
  today: string;
  discreetLockScreen?: boolean;
}

function metricProgress(
  value: number | null,
  target: number,
  unit: string,
  label: string,
  provisional = false,
) {
  if (value == null || !Number.isFinite(value)) {
    return { value: null, target, progress: null as number | null, unit, label, provisional };
  }
  return {
    value,
    target,
    progress: Math.min(1, Math.max(0, value / target)),
    unit,
    label,
    provisional,
  };
}

function mapTrend(status: string): WidgetTrendDirection {
  if (status === 'trending_down') return 'down';
  if (status === 'trending_up') return 'up';
  if (status === 'stable') return 'flat';
  return 'unknown';
}

/** Pure builder — safe for Vitest; no Capacitor imports. */
export function buildWidgetSnapshot(input: BuildWidgetSnapshotInput): WidgetSnapshot {
  const { settings, agg, score, latestWeightKg, weightSeries, today } = input;
  const progress = computeWeightProgress({
    startingWeightKg: settings.startingWeightKg,
    targetWeightKg: settings.targetWeightKg,
    currentWeightKg: latestWeightKg,
  });
  const trend = assessWeightTrend(weightSeries);
  const briefing = buildDailyBriefing({ settings, agg, score, weightTrend: trend });
  const hasWeight = latestWeightKg != null;
  const foodProvisional =
    agg.foodEntryCount > 0 && (!agg.honestyAnswered || agg.loggingCompleteness < 0.6);

  const sparkline = weightSeries.slice(-14).map((w) => w.weightKg);
  let avg7Kg: number | null = null;
  if (sparkline.length >= 3) {
    const window = sparkline.slice(-Math.min(7, sparkline.length));
    avg7Kg = Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10;
  }

  const base = emptyWidgetSnapshot({
    updatedAt: new Date().toISOString(),
    date: today,
    deadline: settings.deadline,
    daysRemaining: calendarDaysRemaining(settings.deadline, today),
    dayNumber: calendarDaysElapsed(settings.startDate, today) + 1,
    weight: {
      currentKg: latestWeightKg,
      startKg: settings.startingWeightKg,
      targetKg: settings.targetWeightKg,
      lostKg: hasWeight ? progress.lostKg : null,
      remainingKg: hasWeight ? progress.remainingKg : progress.requiredLossKg,
      percentComplete: hasWeight ? progress.percentComplete : null,
      avg7Kg,
      trend: mapTrend(trend.status),
      trendLabel:
        trend.status === 'insufficient_data'
          ? hasWeight
            ? 'Need more weigh-ins for trend'
            : 'Awaiting first weigh-in'
          : trend.message.slice(0, 72),
      sparklineKg: sparkline,
    },
    steps: metricProgress(agg.steps, settings.stepsTarget, 'steps', 'Steps'),
    water: metricProgress(
      agg.waterMl > 0 ? agg.waterMl : null,
      settings.waterTargetMl,
      'ml',
      'Water',
    ),
    protein: metricProgress(
      agg.foodEntryCount > 0 ? Math.round(agg.proteinG) : null,
      settings.proteinTargetG,
      'g',
      'Protein',
      foodProvisional,
    ),
    calories: metricProgress(
      agg.foodEntryCount > 0 ? Math.round(agg.calories) : null,
      settings.calorieTarget,
      'kcal',
      'Calories',
      foodProvisional,
    ),
    sleepHours: agg.sleepHours,
    workoutLogged: agg.workoutTypes.length > 0,
    workoutSummary: agg.workoutTypes.length ? agg.workoutTypes.join(', ') : null,
    primaryAction: briefing.primaryAction,
    score: score?.total ?? null,
    redactSensitiveOnLockScreen: true,
    discreetLockScreen: input.discreetLockScreen ?? false,
  });

  return base;
}
