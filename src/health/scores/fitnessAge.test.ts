import { describe, expect, it } from 'vitest';
import { fitnessAgeFromVo2, medianVo2Last30Days } from './fitnessAge';

describe('fitnessAgeFromVo2', () => {
  it('matches HUNT table anchor ages', () => {
    expect(fitnessAgeFromVo2(48.8, 'male')).toBeCloseTo(35, 5);
    expect(fitnessAgeFromVo2(37.9, 'female')).toBeCloseTo(45, 5);
  });

  it('interpolates between knot points', () => {
    const age = fitnessAgeFromVo2(47.75, 'male');
    expect(age).toBeGreaterThan(35);
    expect(age).toBeLessThan(45);
  });

  it('clamps to table edges', () => {
    expect(fitnessAgeFromVo2(60, 'male')).toBe(25);
    expect(fitnessAgeFromVo2(30, 'male')).toBe(75);
  });
});

describe('medianVo2Last30Days', () => {
  it('returns median in window', () => {
    const asOf = '2026-10-30T12:00:00.000Z';
    const med = medianVo2Last30Days(
      [
        { at: '2026-10-01T00:00:00.000Z', vo2: 40 },
        { at: '2026-10-15T00:00:00.000Z', vo2: 44 },
        { at: '2026-10-20T00:00:00.000Z', vo2: 48 },
        { at: '2026-09-01T00:00:00.000Z', vo2: 60 },
      ],
      asOf,
    );
    expect(med).toBe(44);
  });
});
