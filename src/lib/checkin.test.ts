import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { DayAggregate } from '../domain/types';
import { buildCheckin } from './checkin';

const S = createDefaultSettings('2026-11-01T00:00:00.000Z');
const day = (date: string, kg: number | null): DayAggregate => ({
  date, primaryWeightKg: kg, waistCm: null, steps: 10500, calories: 2100, proteinG: 235, carbsG: 140,
  fatG: 60, fibreG: 25, waterMl: 3000, foodEntryCount: 4, hasEstimatedFood: true, workoutTypes: ['strength'] as DayAggregate['workoutTypes'],
  sleepHours: 7.2, cigaretteCount: 0, cigarettesLogged: false, honestyAnswered: true, reviewCompleted: false,
  score: 80, status: null, loggingCompleteness: 1,
});

describe('buildCheckin', () => {
  it('summarises real logs only and asks for coaching', () => {
    const week = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'].map((d, i) => day(d, i === 3 ? null : 93.5 - i * 0.1));
    const text = buildCheckin(S, week, '2026-11-22', 94.4);
    expect(text).toMatch(/7-day average: 93\.\d kg/);
    expect(text).toMatch(/2026-11-19: no weigh-in/);
    expect(text).toMatch(/Previous week average: 94\.4 kg/);
    expect(text).toMatch(/ONE change/);
    expect(text).toMatch(/Week 3/);
  });
  it('says when there is not enough data', () => {
    const text = buildCheckin(S, [day('2026-11-08', null)], '2026-11-08', null);
    expect(text).toMatch(/not enough weigh-ins/);
  });
});
