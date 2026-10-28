import { describe, expect, it } from 'vitest';
import { computeDayScore, nextActions, pointsFor } from './discipline';
import { createDefaultSettings } from '../domain/defaults';
import type { DayAggregate } from '../domain/types';

const emptyAgg = (over: Partial<DayAggregate> = {}): DayAggregate => ({
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

describe('pointsFor', () => {
  it('is deterministic', () => {
    expect(pointsFor('achieved', 15)).toBe(15);
    expect(pointsFor('not_entered', 15)).toBe(0);
    expect(pointsFor('missed_honest', 15)).toBe(5);
    expect(pointsFor('not_applicable', 15)).toBe(15);
  });
});

describe('computeDayScore', () => {
  const settings = createDefaultSettings();

  it('incomplete logging is never verified success', () => {
    const score = computeDayScore({
      date: '2026-10-27',
      settings,
      agg: emptyAgg(),
    });
    expect(score.status).toBe('INCOMPLETE_LOG');
    expect(score.breakdown.steps).toBe('not_entered');
    expect(score.breakdown.nutritionLogging).toBe('not_entered');
    expect(score.total).toBeLessThan(50);
  });

  it('does not treat incomplete logging as calorie or protein success', () => {
    const score = computeDayScore({
      date: '2026-10-27',
      settings,
      agg: emptyAgg({
        foodEntryCount: 4,
        calories: 2100,
        proteinG: 170,
        honestyAnswered: true,
        loggingCompleteness: 0.55,
        steps: 10000,
        waterMl: 3000,
        workoutTypes: ['strength'],
        sleepHours: 8,
        cigarettesLogged: true,
        cigaretteCount: 0,
      }),
    });
    expect(score.breakdown.calories).toBe('missed_honest');
    expect(score.breakdown.protein).toBe('missed_honest');
  });

  it('does not reward starvation as calorie success', () => {
    const score = computeDayScore({
      date: '2026-10-27',
      settings,
      agg: emptyAgg({
        foodEntryCount: 2,
        calories: 800,
        proteinG: 40,
        honestyAnswered: true,
        loggingCompleteness: 0.8,
        steps: 10000,
        waterMl: 3000,
        workoutTypes: ['rest'],
        sleepHours: 8,
        cigarettesLogged: true,
        cigaretteCount: 0,
        reviewCompleted: true,
      }),
    });
    expect(score.breakdown.calories).toBe('missed_honest');
  });

  it('honest miss still earns partial points', () => {
    const score = computeDayScore({
      date: '2026-10-27',
      settings,
      agg: emptyAgg({
        steps: 7000,
        foodEntryCount: 3,
        calories: 2100,
        proteinG: 150,
        honestyAnswered: true,
        loggingCompleteness: 0.8,
        waterMl: 2500,
        workoutTypes: ['strength'],
        sleepHours: 7.5,
        cigarettesLogged: true,
        cigaretteCount: 0,
        reviewCompleted: true,
      }),
    });
    expect(score.breakdown.steps).toBe('missed_honest');
    expect(score.points.steps).toBeGreaterThan(0);
    expect(score.xpEarned).toBeGreaterThan(0);
  });
});

describe('nextActions', () => {
  const settings = createDefaultSettings();

  it('does not treat unlogged protein as zero remaining', () => {
    const actions = nextActions(emptyAgg({ foodEntryCount: 0, proteinG: 0 }), settings);
    expect(actions.some((a) => /protein remaining/i.test(a))).toBe(false);
    expect(actions.some((a) => /food log/i.test(a))).toBe(true);
  });

  it('nudges protein only after food is logged', () => {
    const actions = nextActions(
      emptyAgg({ foodEntryCount: 2, proteinG: 40, honestyAnswered: true }),
      settings,
    );
    expect(actions.some((a) => /protein remaining/i.test(a))).toBe(true);
  });
});

