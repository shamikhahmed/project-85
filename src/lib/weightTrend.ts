import { differenceInCalendarDays } from 'date-fns';
import type { ISODate } from '../domain/types';
import { parseLocalDate } from './dates';

export type WeightTrendStatus =
  | 'insufficient_data'
  | 'trending_down'
  | 'stable'
  | 'plateau'
  | 'trending_up'
  | 'noisy';

export interface WeightTrendAssessment {
  status: WeightTrendStatus;
  message: string;
  /**
   * Change in 7-day average weight (kg): latest 7 days vs the 7 days before.
   * When the earlier window is too thin, falls back to first-half vs second-half
   * averages of the last ~14 days. Null when there is not enough data.
   */
  avg7ChangeKg: number | null;
  /** Number of primary weigh-ins used for the assessment */
  sampleSize: number;
  /** Calendar span (days) from first to latest weigh-in in the window */
  spanDays: number | null;
}

export interface WeightTrendOptions {
  minEntries?: number;
  minSpanDays?: number;
  /** |avg change| below this is "stable" (kg) */
  stableBandKg?: number;
  /** Mean absolute day-to-day swing above this is "noisy" (kg) */
  noiseThresholdKg?: number;
  /** Flat for this many calendar days → plateau (not a short flat spell) */
  plateauMinSpanDays?: number;
  /** Reference date; weigh-ins after it are ignored. Defaults to the latest weigh-in. */
  asOf?: ISODate;
}

const DEFAULTS = {
  minEntries: 5,
  minSpanDays: 7,
  stableBandKg: 0.2,
  noiseThresholdKg: 1.0,
  plateauMinSpanDays: 21,
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const INSUFFICIENT: WeightTrendAssessment = {
  status: 'insufficient_data',
  message:
    'Not enough weigh-ins yet for a trend (need 5+ across at least a week). Daily weight is noisy — keep logging.',
  avg7ChangeKg: null,
  sampleSize: 0,
  spanDays: null,
};

/**
 * Calm, cautious trend read. Never labels a few noisy days as a failure:
 * no label until ≥5 weigh-ins span ≥7 days, and large swings read as "noisy".
 * Plateau requires a longer flat span than ordinary "stable".
 */
export function assessWeightTrend(
  weights: { date: ISODate; weightKg: number }[],
  opts: WeightTrendOptions = {},
): WeightTrendAssessment {
  const o = { ...DEFAULTS, ...opts };

  const byDate = new Map<ISODate, number>();
  for (const w of weights) {
    if (Number.isFinite(w.weightKg) && w.weightKg > 0 && (!o.asOf || w.date <= o.asOf)) {
      byDate.set(w.date, w.weightKg);
    }
  }
  const all = [...byDate.entries()]
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (all.length < o.minEntries) {
    return { ...INSUFFICIENT, sampleSize: all.length };
  }

  const latest = all[all.length - 1].date;
  const ageOf = (date: ISODate) =>
    differenceInCalendarDays(parseLocalDate(latest), parseLocalDate(date));

  const spanDays = ageOf(all[0].date);
  if (spanDays < o.minSpanDays) {
    return { ...INSUFFICIENT, sampleSize: all.length, spanDays };
  }

  const window = all.filter((w) => ageOf(w.date) <= 13);
  if (window.length < o.minEntries) {
    return { ...INSUFFICIENT, sampleSize: all.length, spanDays };
  }

  const recent = window.filter((w) => ageOf(w.date) <= 6).map((w) => w.weightKg);
  const prior = window.filter((w) => ageOf(w.date) >= 7).map((w) => w.weightKg);

  let change: number;
  if (recent.length >= 2 && prior.length >= 2) {
    change = mean(recent) - mean(prior);
  } else {
    const half = Math.floor(window.length / 2);
    const first = window.slice(0, half).map((w) => w.weightKg);
    const second = window.slice(window.length - half).map((w) => w.weightKg);
    change = mean(second) - mean(first);
  }
  change = round2(change);

  const swings = window.slice(1).map((w, i) => Math.abs(w.weightKg - window[i].weightKg));
  const meanSwing = mean(swings);
  const sampleSize = window.length;

  if (meanSwing > o.noiseThresholdKg) {
    return {
      status: 'noisy',
      message:
        'Daily weights are swinging a lot (water, salt, timing). Weigh at the same time and judge by the weekly average, not single days.',
      avg7ChangeKg: change,
      sampleSize,
      spanDays,
    };
  }

  const abs = Math.abs(change).toFixed(1);
  if (change <= -o.stableBandKg) {
    return {
      status: 'trending_down',
      message: `7-day average is down ~${abs} kg versus the week before (${sampleSize} weigh-ins). Steady, sustainable change — keep going.`,
      avg7ChangeKg: change,
      sampleSize,
      spanDays,
    };
  }
  if (change >= o.stableBandKg) {
    return {
      status: 'trending_up',
      message: `One measurement doesn’t tell the whole story. 7-day average is up ~${abs} kg versus the week before (${sampleSize} weigh-ins) — often water, salt, or logging gaps. Check the longer trend before changing the plan.`,
      avg7ChangeKg: change,
      sampleSize,
      spanDays,
    };
  }

  // Longer flat stretch → plateau (not panic language)
  if (spanDays >= o.plateauMinSpanDays && Math.abs(change) < o.stableBandKg) {
    return {
      status: 'plateau',
      message: `Your 7-day average has been roughly flat across ~${spanDays} days (${sampleSize} recent weigh-ins). Plateaus are common — check protein, sleep, and consistency before cutting calories harder.`,
      avg7ChangeKg: change,
      sampleSize,
      spanDays,
    };
  }

  return {
    status: 'stable',
    message:
      '7-day average is holding steady. Flat stretches are a normal part of any journey; keep logging consistently.',
    avg7ChangeKg: change,
    sampleSize,
    spanDays,
  };
}

/**
 * Calm copy when today's scale disagrees with the longer trend.
 * Returns null when there isn't enough contrast to comment.
 */
export function dailyWeightVsTrendMessage(opts: {
  todayKg: number | null;
  previousKg: number | null;
  trend: WeightTrendAssessment;
}): string | null {
  const { todayKg, previousKg, trend } = opts;
  if (todayKg == null || previousKg == null) return null;
  if (trend.status === 'insufficient_data') return null;

  const dayDelta = round2(todayKg - previousKg);
  if (Math.abs(dayDelta) < 0.3) return null;

  const dayUp = dayDelta > 0;
  const trendDown =
    trend.status === 'trending_down' ||
    (trend.avg7ChangeKg != null && trend.avg7ChangeKg <= -0.2);

  if (dayUp && trendDown) {
    return `Weight is up ~${dayDelta.toFixed(1)} kg today, but your longer-term 7-day average is still moving down. Don’t panic-adjust calories from one weigh-in.`;
  }

  const trendUp =
    trend.status === 'trending_up' ||
    (trend.avg7ChangeKg != null && trend.avg7ChangeKg >= 0.2);
  if (!dayUp && trendUp) {
    return `Today’s weigh-in is lower, but the 7-day average is still up versus last week. Keep judging by the weekly average.`;
  }

  return null;
}
