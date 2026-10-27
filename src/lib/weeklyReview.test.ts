import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { DayAggregate } from '../domain/types';
import { buildWeeklyReview } from './weeklyReview';

const day = (over: Partial<DayAggregate>): DayAggregate => ({
  date: '2026-10-20',
  primaryWeightKg: null,
  waistCm: null,
  steps: null,
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fibreG: 0,
  waterMl: 0,
  foodEntryCount: 0,
  hasEstimatedFood: false,
  workoutTypes: [],
  sleepHours: null,
  cigaretteCount: 0,
  cigarettesLogged: false,
  honestyAnswered: false,
  reviewCompleted: false,
  score: null,
  status: null,
  loggingCompleteness: 0,
  ...over,
});

describe('buildWeeklyReview', () => {
  it('does not invent averages from empty week', () => {
    const s = createDefaultSettings();
    const r = buildWeeklyReview([], s, '2026-10-20', '2026-10-26');
    expect(r.avgSteps).toBeNull();
    expect(r.daysWithAnyLog).toBe(0);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('computes step hit rate from logged days only', () => {
    const s = createDefaultSettings();
    const days = [
      day({ date: '2026-10-20', steps: 10000, loggingCompleteness: 0.5 }),
      day({ date: '2026-10-21', steps: 5000, loggingCompleteness: 0.5 }),
      day({ date: '2026-10-22', steps: null, loggingCompleteness: 0 }),
    ];
    const r = buildWeeklyReview(days, s, '2026-10-20', '2026-10-26');
    expect(r.stepHitRate).toBe(50);
    expect(r.avgSteps).toBe(7500);
  });
});
