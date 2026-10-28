/**
 * Shared contract between the React app and the WidgetKit extension.
 * Swift decodes the same JSON shape from App Group UserDefaults.
 * Never invent measurements — nulls mean "not logged / unknown".
 */

import { toLocalISODate } from '../lib/dates';

export const WIDGET_APP_GROUP = 'group.com.capricorn.project85';
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshotV1';
export const WIDGET_SCHEMA_VERSION = 1 as const;

export type WidgetTrendDirection = 'down' | 'up' | 'flat' | 'unknown';

export interface WidgetMetricProgress {
  /** Current measured value, or null if not logged */
  value: number | null;
  target: number;
  /** 0–1 when value is known; null when not logged (do not treat as 0) */
  progress: number | null;
  /** Incomplete / estimated food totals */
  provisional?: boolean;
  unit: string;
  label: string;
}

export interface WidgetSnapshot {
  schemaVersion: typeof WIDGET_SCHEMA_VERSION;
  updatedAt: string;
  /** ISO calendar date the daily metrics refer to */
  date: string;
  brand: 'PROJECT 85';
  deadline: string;
  daysRemaining: number;
  dayNumber: number;

  weight: {
    currentKg: number | null;
    startKg: number;
    targetKg: number;
    lostKg: number | null;
    remainingKg: number | null;
    percentComplete: number | null;
    /** Rolling avg when enough points; otherwise null */
    avg7Kg: number | null;
    trend: WidgetTrendDirection;
    trendLabel: string;
    /** Recent primary weights for sparkline (oldest → newest), max 14 */
    sparklineKg: number[];
  };

  steps: WidgetMetricProgress;
  water: WidgetMetricProgress;
  protein: WidgetMetricProgress;
  calories: WidgetMetricProgress;

  sleepHours: number | null;
  workoutLogged: boolean;
  workoutSummary: string | null;

  primaryAction: string;
  score: number | null;

  /** Lock Screen: hide nutrition detail / smoking */
  redactSensitiveOnLockScreen: boolean;
  discreetLockScreen: boolean;

  deepLinks: {
    today: string;
    logWeight: string;
    logFood: string;
    logWater: string;
    logWorkout: string;
    review: string;
  };
}

export function emptyWidgetSnapshot(partial?: Partial<WidgetSnapshot>): WidgetSnapshot {
  const today = toLocalISODate();
  return {
    schemaVersion: WIDGET_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    date: today,
    brand: 'PROJECT 85',
    deadline: '2027-01-15',
    daysRemaining: 0,
    dayNumber: 1,
    weight: {
      currentKg: null,
      startKg: 96.5,
      targetKg: 85,
      lostKg: null,
      remainingKg: null,
      percentComplete: null,
      avg7Kg: null,
      trend: 'unknown',
      trendLabel: 'No weigh-in yet',
      sparklineKg: [],
    },
    steps: {
      value: null,
      target: 10000,
      progress: null,
      unit: 'steps',
      label: 'Steps',
    },
    water: {
      value: null,
      target: 3000,
      progress: null,
      unit: 'ml',
      label: 'Water',
    },
    protein: {
      value: null,
      target: 160,
      progress: null,
      unit: 'g',
      label: 'Protein',
      provisional: false,
    },
    calories: {
      value: null,
      target: 2200,
      progress: null,
      unit: 'kcal',
      label: 'Calories',
      provisional: false,
    },
    sleepHours: null,
    workoutLogged: false,
    workoutSummary: null,
    primaryAction: 'Open PROJECT 85 to log',
    score: null,
    redactSensitiveOnLockScreen: true,
    discreetLockScreen: false,
    deepLinks: {
      today: 'project85:///',
      logWeight: 'project85:///log?tab=weight',
      logFood: 'project85:///log?tab=food',
      logWater: 'project85:///log?tab=water',
      logWorkout: 'project85:///log?tab=workout',
      review: 'project85:///discipline',
    },
    ...partial,
  };
}
