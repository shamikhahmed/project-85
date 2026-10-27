import { describe, expect, it } from 'vitest';
import type { DayAggregate } from '../domain/types';
import { assessComeback } from './comeback';

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

describe('assessComeback', () => {
  it('returns null when gap is under 2 days', () => {
    const r = assessComeback(
      [day({ date: '2026-10-26', steps: 8000 })],
      '2026-10-27',
    );
    expect(r).toBeNull();
  });

  it('welcomes back after multi-day gap without calling it failure', () => {
    const r = assessComeback(
      [day({ date: '2026-10-20', foodEntryCount: 2, calories: 1800 })],
      '2026-10-27',
    );
    expect(r).not.toBeNull();
    expect(r!.missedDays).toBeGreaterThanOrEqual(2);
    expect(r!.message.toLowerCase()).toMatch(/welcome back|still counts/);
    expect(r!.message.toLowerCase()).not.toMatch(/fail|shame|guilty/);
  });
});
