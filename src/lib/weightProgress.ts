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

/**
 * Linear projected weight from start→current rate.
 * Requires ≥3 primary weights spanning ≥7 days. Label as estimate only.
 */
export function projectWeightAtDeadline(opts: {
  weights: { date: string; weightKg: number }[];
  deadline: string;
  startDate: string;
}): { projectedKg: number; confidence: 'estimate' | 'insufficient_data' } {
  const sorted = [...opts.weights].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 3) {
    return { projectedKg: sorted.at(-1)?.weightKg ?? NaN, confidence: 'insufficient_data' };
  }
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const spanDays =
    (Date.parse(last.date) - Date.parse(first.date)) / (1000 * 60 * 60 * 24);
  if (spanDays < 7) {
    return { projectedKg: last.weightKg, confidence: 'insufficient_data' };
  }
  const ratePerDay = (last.weightKg - first.weightKg) / spanDays;
  const daysToDeadline =
    (Date.parse(opts.deadline) - Date.parse(last.date)) / (1000 * 60 * 60 * 24);
  return {
    projectedKg: round1(last.weightKg + ratePerDay * daysToDeadline),
    confidence: 'estimate',
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
