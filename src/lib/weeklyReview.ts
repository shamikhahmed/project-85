import type { AppSettings, DayAggregate } from '../domain/types';

export interface WeeklyReviewSummary {
  weekStart: string;
  weekEnd: string;
  daysWithAnyLog: number;
  avgSteps: number | null;
  stepHitRate: number | null;
  avgCalories: number | null;
  avgProtein: number | null;
  workouts: number;
  avgSleepHours: number | null;
  cigTotal: number;
  cigDaysLogged: number;
  weightStart: number | null;
  weightEnd: number | null;
  weightChangeKg: number | null;
  loggingCompletenessAvg: number;
  suggestions: string[];
  headline: string;
}

export function buildWeeklyReview(
  days: DayAggregate[],
  settings: AppSettings,
  weekStart: string,
  weekEnd: string,
): WeeklyReviewSummary {
  const inWeek = days.filter((d) => d.date >= weekStart && d.date <= weekEnd);
  const logged = inWeek.filter(
    (d) =>
      d.foodEntryCount > 0 ||
      d.steps != null ||
      d.waterMl > 0 ||
      d.primaryWeightKg != null ||
      d.workoutTypes.length > 0,
  );

  const stepDays = inWeek.filter((d) => d.steps != null);
  const avgSteps =
    stepDays.length === 0
      ? null
      : Math.round(stepDays.reduce((s, d) => s + (d.steps ?? 0), 0) / stepDays.length);
  const stepHits = stepDays.filter((d) => (d.steps ?? 0) >= settings.stepsTarget).length;
  const stepHitRate = stepDays.length ? Math.round((stepHits / stepDays.length) * 100) : null;

  const foodDays = inWeek.filter((d) => d.foodEntryCount > 0 && d.honestyAnswered);
  const avgCalories =
    foodDays.length === 0
      ? null
      : Math.round(foodDays.reduce((s, d) => s + d.calories, 0) / foodDays.length);
  const avgProtein =
    foodDays.length === 0
      ? null
      : Math.round(foodDays.reduce((s, d) => s + d.proteinG, 0) / foodDays.length);

  const workouts = inWeek.filter((d) => d.workoutTypes.length > 0).length;
  const sleepDays = inWeek.filter((d) => d.sleepHours != null);
  const avgSleepHours =
    sleepDays.length === 0
      ? null
      : Math.round(
          (sleepDays.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / sleepDays.length) * 10,
        ) / 10;

  const cigDays = inWeek.filter((d) => d.cigarettesLogged);
  const cigTotal = cigDays.reduce((s, d) => s + d.cigaretteCount, 0);

  const weights = inWeek
    .filter((d) => d.primaryWeightKg != null)
    .map((d) => d.primaryWeightKg as number);
  const weightStart = weights[0] ?? null;
  const weightEnd = weights.at(-1) ?? null;
  const weightChangeKg =
    weightStart != null && weightEnd != null
      ? Math.round((weightEnd - weightStart) * 10) / 10
      : null;

  const loggingCompletenessAvg =
    inWeek.length === 0
      ? 0
      : Math.round(
          (inWeek.reduce((s, d) => s + d.loggingCompleteness, 0) / inWeek.length) * 100,
        ) / 100;

  const suggestions: string[] = [];
  if (stepHitRate != null && stepHitRate < 70) {
    suggestions.push('Plan three short walking breaks on office days — Karachi heat: walk early/late or indoors.');
  }
  if ((avgProtein ?? 0) < settings.proteinTargetG * 0.85 && foodDays.length > 0) {
    suggestions.push('Anchor dinner with a clear protein source (tikka, boti, whey, daal + egg).');
  }
  if (workouts < 3) {
    suggestions.push(
      settings.shoulderCaution
        ? 'Protect training consistency: log each plan session from the Train tab; machines and cables, no painful presses.'
        : 'Schedule at least three training or recovery sessions next week.',
    );
  }
  if (loggingCompletenessAvg < 0.5) {
    suggestions.push('Use Quick Log after lunch and after the gym so evenings aren’t a blank page.');
  }
  if (suggestions.length === 0) {
    suggestions.push(
      `Keep one habit rock-solid: honest food logging or a realistic walk toward ${settings.stepsTarget.toLocaleString()} steps.`,
    );
  }

  let headline = 'Review the trend, not just the highlights.';
  if (logged.length === 0) {
    headline = 'Welcome back. Your previous effort still counts.';
  } else if (weightChangeKg != null && weightChangeKg > 0.4) {
    headline = 'One week’s scale move isn’t the whole story — check the rolling average.';
  } else if ((stepHitRate ?? 0) >= 80 && foodDays.length >= 4) {
    headline = 'Strong consistency week — protect sleep and protein next.';
  }

  return {
    weekStart,
    weekEnd,
    daysWithAnyLog: logged.length,
    avgSteps,
    stepHitRate,
    avgCalories,
    avgProtein,
    workouts,
    avgSleepHours,
    cigTotal,
    cigDaysLogged: cigDays.length,
    weightStart,
    weightEnd,
    weightChangeKg,
    loggingCompletenessAvg,
    suggestions: suggestions.slice(0, 2),
    headline,
  };
}
