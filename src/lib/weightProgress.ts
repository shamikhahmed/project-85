import { differenceInCalendarDays } from 'date-fns';
import { addLocalCalendarDays, parseLocalDate } from './dates';

export interface WeightProgressInput {
  startingWeightKg: number;
  targetWeightKg: number;
  currentWeightKg: number | null;
}

export interface WeightProgress {
  requiredLossKg: number;
  lostKg: number;
  remainingKg: number;
  percentComplete: number;
  isOnOrPastTarget: boolean;
}

/** Pure weight-loss progress. Bounded 0–100. Never invents current weight. */
export function computeWeightProgress(input: WeightProgressInput): WeightProgress {
  const requiredLossKg = round1(input.startingWeightKg - input.targetWeightKg);
  const current = input.currentWeightKg;

  if (current === null || Number.isNaN(current)) {
    return {
      requiredLossKg,
      lostKg: 0,
      remainingKg: Math.max(0, requiredLossKg),
      percentComplete: 0,
      isOnOrPastTarget: false,
    };
  }

  const lostKg = round1(input.startingWeightKg - current);
  const remainingKg = round1(Math.max(0, current - input.targetWeightKg));
  const isOnOrPastTarget = current <= input.targetWeightKg;

  let percentComplete = 0;
  if (requiredLossKg > 0) {
    percentComplete = clamp((lostKg / requiredLossKg) * 100, 0, 100);
  } else if (requiredLossKg === 0) {
    percentComplete = isOnOrPastTarget ? 100 : 0;
  } else {
    // Target above start (gain mission) — treat symmetrically
    percentComplete = clamp((lostKg / requiredLossKg) * 100, 0, 100);
  }

  return {
    requiredLossKg,
    lostKg: Math.max(0, lostKg),
    remainingKg,
    percentComplete: round1(percentComplete),
    isOnOrPastTarget,
  };
}

/** Required average weekly loss to hit target by deadline. Null if impossible inputs. */
export function requiredWeeklyLossKg(
  remainingKg: number,
  daysRemaining: number,
): number | null {
  if (daysRemaining <= 0) return remainingKg <= 0 ? 0 : null;
  const weeks = daysRemaining / 7;
  return round2(remainingKg / weeks);
}

export interface WeightProjection {
  projectedKg: number;
  confidence: 'estimate' | 'insufficient_data';
  /** Estimated ISO date of hitting target at current rate; null if insufficient or rate ≥ 0 */
  estimatedArrivalDate: string | null;
  /** kg/week implied by recent rate (negative = losing). Null if insufficient. */
  recentWeeklyRateKg: number | null;
  paceNote: string;
}

/**
 * Linear projected weight from start→current rate.
 * Requires ≥3 primary weights spanning ≥7 days. Label as estimate only.
 */
export function projectWeightAtDeadline(opts: {
  weights: { date: string; weightKg: number }[];
  deadline: string;
  startDate: string;
  targetWeightKg: number;
}): WeightProjection {
  const sorted = [...opts.weights].sort((a, b) => a.date.localeCompare(b.date));
  const insufficient = (projectedKg: number): WeightProjection => ({
    projectedKg,
    confidence: 'insufficient_data',
    estimatedArrivalDate: null,
    recentWeeklyRateKg: null,
    paceNote: 'Need ≥3 morning weigh-ins spanning ≥7 days before projecting.',
  });

  if (sorted.length < 3) {
    return insufficient(sorted.at(-1)?.weightKg ?? NaN);
  }
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const spanDays = Math.max(
    1,
    differenceInCalendarDays(parseLocalDate(last.date), parseLocalDate(first.date)),
  );
  if (spanDays < 7) {
    return insufficient(last.weightKg);
  }
  const ratePerDay = (last.weightKg - first.weightKg) / spanDays;
  const recentWeeklyRateKg = round2(ratePerDay * 7);
  const daysToDeadline = Math.max(
    0,
    differenceInCalendarDays(parseLocalDate(opts.deadline), parseLocalDate(last.date)),
  );
  const projectedKg = round1(last.weightKg + ratePerDay * daysToDeadline);

  let estimatedArrivalDate: string | null = null;
  if (ratePerDay < -0.01 && last.weightKg > opts.targetWeightKg) {
    const daysNeeded = (last.weightKg - opts.targetWeightKg) / -ratePerDay;
    estimatedArrivalDate = addLocalCalendarDays(last.date, Math.ceil(daysNeeded));
  }

  let paceNote: string;
  if (recentWeeklyRateKg >= 0) {
    paceNote =
      'Recent rate is not losing weight. Projection is an estimate only — not a promise or a crash-diet plan.';
  } else if (Math.abs(recentWeeklyRateKg) > 0.9) {
    paceNote = `Recent pace ~${Math.abs(recentWeeklyRateKg)} kg/week is ambitious. Prefer sustainable loss; never crash diet to force the birthday date.`;
  } else {
    paceNote = `Recent pace ~${Math.abs(recentWeeklyRateKg)} kg/week (estimate). Birthday date is a milestone, not a medical guarantee.`;
  }

  return {
    projectedKg,
    confidence: 'estimate',
    estimatedArrivalDate,
    recentWeeklyRateKg,
    paceNote,
  };
}

export function sevenDayRollingAverage(
  points: { date: string; weightKg: number }[],
): { date: string; avgKg: number }[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const window = sorted.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, w) => s + w.weightKg, 0) / window.length;
    return { date: p.date, avgKg: round2(avg) };
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
