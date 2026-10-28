import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { DayAggregate, DayScore } from '../domain/types';
import { buildWidgetSnapshot } from './buildWidgetSnapshot';

function baseAgg(over: Partial<DayAggregate> = {}): DayAggregate {
  return {
    date: '2026-10-28',
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
  };
}

describe('buildWidgetSnapshot', () => {
  it('does not invent calorie progress when food is not logged', () => {
    const settings = createDefaultSettings();
    const snap = buildWidgetSnapshot({
      settings,
      agg: baseAgg(),
      score: null,
      latestWeightKg: null,
      weightSeries: [],
      today: '2026-10-28',
    });
    expect(snap.calories.value).toBeNull();
    expect(snap.calories.progress).toBeNull();
    expect(snap.weight.percentComplete).toBeNull();
    expect(snap.weight.currentKg).toBeNull();
    expect(snap.weight.trend).toBe('unknown');
  });

  it('marks food metrics provisional when honesty is incomplete', () => {
    const settings = createDefaultSettings();
    const snap = buildWidgetSnapshot({
      settings,
      agg: baseAgg({
        foodEntryCount: 2,
        calories: 900,
        proteinG: 40,
        honestyAnswered: false,
        loggingCompleteness: 0.3,
      }),
      score: { total: 20 } as DayScore,
      latestWeightKg: 95.2,
      weightSeries: [
        { date: '2026-10-20', weightKg: 96.5 },
        { date: '2026-10-28', weightKg: 95.2 },
      ],
      today: '2026-10-28',
    });
    expect(snap.calories.value).toBe(900);
    expect(snap.calories.provisional).toBe(true);
    expect(snap.weight.currentKg).toBe(95.2);
    expect(snap.weight.percentComplete).not.toBeNull();
    expect(snap.deepLinks.logFood).toContain('project85:///log?tab=food');
  });
});
