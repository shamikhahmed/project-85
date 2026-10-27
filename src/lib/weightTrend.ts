import { differenceInCalendarDays } from 'date-fns';
import type { ISODate } from '../domain/types';
import { parseLocalDate } from './dates';

export type WeightTrendStatus =
  | 'insufficient_data'
  | 'trending_down'
  | 'stable'
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
}

export interface WeightTrendOptions {
  minEntries?: number;
  minSpanDays?: number;
  /** |avg change| below this is "stable" (kg) */
  stableBandKg?: number;
  /** Mean absolute day-to-day swing above this is "noisy" (kg) */
  noiseThresholdKg?: number;
  /** Reference date; weigh-ins after it are ignored. Defaults to the latest weigh-in. */
  asOf?: ISODate;
}

const DEFAULTS = {
  minEntries: 5,
  minSpanDays: 7,
  stableBandKg: 0.2,
  noiseThresholdKg: 1.0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const INSUFFICIENT: WeightTrendAssessment = {
  status: 'insufficient_data',
  message:
    'Not enough weigh-ins yet for a trend (need 5+ across at least a week). Daily weight is noisy — keep logging.',
  avg7ChangeKg: null,
};

/**
 * Calm, cautious trend read. Never labels a few noisy days as a failure:
 * no label until ≥5 weigh-ins span ≥7 days, and large swings read as "noisy".
 */
export function assessWeightTrend(
  weights: { date: ISODate; weightKg: number }[],
  opts: WeightTrendOptions = {},
): WeightTrendAssessment {
  const o = { ...DEFAULTS, ...opts };

  // One reading per day (last wins), valid values only, ascending.
  const byDate = new Map<ISODate, number>();
  for (const w of weights) {
    if (Number.isFinite(w.weightKg) && w.weightKg > 0 && (!o.asOf || w.date <= o.asOf)) {
      byDate.set(w.date, w.weightKg);
    }
  }
  const all = [...byDate.entries()]
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (all.length < o.minEntries) return INSUFFICIENT;

  const latest = all[all.length - 1].date;
  const ageOf = (date: ISODate) =>
    differenceInCalendarDays(parseLocalDate(latest), parseLocalDate(date));

  const spanDays = ageOf(all[0].date);
  if (spanDays < o.minSpanDays) return INSUFFICIENT;

  const window = all.filter((w) => ageOf(w.date) <= 13);
  if (window.length < o.minEntries) {
    // Entries are sparse inside the last 2 weeks — too thin to call a trend.
    return INSUFFICIENT;
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

  if (meanSwing > o.noiseThresholdKg) {
    return {
      status: 'noisy',
      message:
        'Daily weights are swinging a lot (water, salt, timing). Weigh at the same time and judge by the weekly average, not single days.',
      avg7ChangeKg: change,
    };
  }

  const abs = Math.abs(change).toFixed(1);
  if (change <= -o.stableBandKg) {
    return {
      status: 'trending_down',
      message: `7-day average is down ~${abs} kg versus the week before. Steady, sustainable change — keep going.`,
      avg7ChangeKg: change,
    };
  }
  if (change >= o.stableBandKg) {
    return {
      status: 'trending_up',
      message: `One measurement doesn’t tell the whole story. 7-day average is up ~${abs} kg versus the week before — often water, salt, or logging gaps. Check the longer trend before changing the plan.`,
      avg7ChangeKg: change,
    };
  }
  return {
    status: 'stable',
    message:
      '7-day average is holding steady. Flat stretches are a normal part of any journey; keep logging consistently.',
    avg7ChangeKg: change,
  };
}
