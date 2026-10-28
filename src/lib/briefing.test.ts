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
      hour: 14,
    });
    expect(b.foodProvisional).toBe(true);
    expect(b.bullets.some((x) => /incomplete|provisional/i.test(x))).toBe(true);
    expect(b.quickAction).toBeTruthy();
    expect(b.missionTitle).toMatch(/Win today/i);
    expect(b.dayKindLabel).toBeTruthy();
  });

  it('softens training language after short sleep', () => {
    const b = buildDailyBriefing({
      settings,
      agg: agg({
        foodEntryCount: 2,
        honestyAnswered: true,
        loggingCompleteness: 0.8,
        primaryWeightKg: 96,
        calories: 1600,
        proteinG: 140,
        waterMl: 2000,
        steps: 8000,
      }),
      score: null,
      hour: 19,
      yesterdaySleepHours: 5.5,
    });
    expect(b.dayKind).toBe('recover');
    expect(b.narrative.toLowerCase()).toMatch(/sleep|recovery|easy|light/);
  });

  it('never invents steps when unlogged', () => {
    const b = buildDailyBriefing({ settings, agg: agg(), score: null, hour: 10 });
    expect(b.bullets.some((x) => /not logged/i.test(x))).toBe(true);
    expect(b.stepsRemaining).toBeNull();
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
        workoutTypes: ['strength'],
      }),
      score: null,
      hour: 15,
    });
    expect(b.primaryAction.toLowerCase()).toMatch(/walk|steps/);
    expect(`${b.narrative} ${b.bullets.join(' ')}`.toLowerCase()).toMatch(
      /sacrifice sleep|when it fits/,
    );
    expect(b.stepsRemaining).toBe(3800);
  });

  it('adapts evening protein recommendation from real remaining', () => {
    const b = buildDailyBriefing({
      settings,
      agg: agg({
        foodEntryCount: 2,
        honestyAnswered: true,
        loggingCompleteness: 0.8,
        primaryWeightKg: 96,
        steps: 10000,
        calories: 1600,
        proteinG: 100,
        waterMl: 2500,
        workoutTypes: ['walking'],
      }),
      score: null,
      hour: 19,
    });
    expect(b.proteinRemaining).toBe(60);
    expect(b.primaryAction.toLowerCase()).toMatch(/protein/);
    expect(b.narrative.toLowerCase()).toMatch(/protein|walk|dinner/);
  });
});
