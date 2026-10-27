import { describe, expect, it } from 'vitest';
import { buildDayAggregate, computeStreak } from './aggregates';
import { createDefaultSettings } from '../domain/defaults';

describe('computeStreak', () => {
  it('breaks on missed day', () => {
    const days = ['2026-10-25', '2026-10-26', '2026-10-27'];
    const ok = new Set(['2026-10-26', '2026-10-27']);
    expect(computeStreak(days, (d) => ok.has(d))).toBe(2);
  });

  it('zero when latest missed', () => {
    const days = ['2026-10-25', '2026-10-26', '2026-10-27'];
    expect(computeStreak(days, (d) => d === '2026-10-25')).toBe(0);
  });
});

describe('buildDayAggregate', () => {
  const settings = createDefaultSettings();

  it('uses latest step entry total (replace-total), never sums', () => {
    const agg = buildDayAggregate({
      date: '2026-10-27',
      settings,
      weights: [],
      foods: [],
      steps: [
        {
          id: 's1',
          date: '2026-10-27',
          totalSteps: 9000,
          source: 'manual',
          createdAt: '2026-10-27T08:00:00.000Z',
          updatedAt: '2026-10-27T08:00:00.000Z',
        },
        {
          id: 's2',
          date: '2026-10-27',
          totalSteps: 10450,
          source: 'manual',
          createdAt: '2026-10-27T20:00:00.000Z',
          updatedAt: '2026-10-27T20:00:00.000Z',
        },
      ],
      water: [],
      workouts: [],
      sleep: [],
      cigarettes: [],
      notes: undefined,
      score: undefined,
    });
    expect(agg.steps).toBe(10450);
  });
});
