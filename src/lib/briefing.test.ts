import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { DayAggregate } from '../domain/types';
import { buildDailyBriefing } from './briefing';

const agg = (over: Partial<DayAggregate> = {}): DayAggregate => ({
  date: '2026-10-27',
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

describe('buildDailyBriefing', () => {
  const settings = createDefaultSettings();

  it('flags incomplete food as provisional', () => {
    const b = buildDailyBriefing({
      settings,
      agg: agg({ foodEntryCount: 2, calories: 900, loggingCompleteness: 0.3 }),
      score: null,
    });
    expect(b.bullets.some((x) => /provisional/i.test(x))).toBe(true);
    expect(b.primaryAction.toLowerCase()).toMatch(/honesty|meal|food/);
  });

  it('never invents steps when unlogged', () => {
    const b = buildDailyBriefing({ settings, agg: agg(), score: null });
    expect(b.bullets.some((x) => /not logged/i.test(x))).toBe(true);
  });

  it('prioritises remaining steps without sleep sacrifice language', () => {
    const b = buildDailyBriefing({
      settings,
      agg: agg({
        foodEntryCount: 3,
        honestyAnswered: true,
        loggingCompleteness: 0.8,
        primaryWeightKg: 96.5,
        steps: 6200,
        calories: 1800,
        proteinG: 140,
        waterMl: 2000,
      }),
      score: null,
    });
    expect(b.primaryAction.toLowerCase()).toMatch(/walk|steps/);
    expect(b.bullets.join(' ').toLowerCase()).toMatch(/do not sacrifice sleep|when it fits/);
  });
});
