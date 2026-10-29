import { describe, expect, it } from 'vitest';
import { computeStrain, hrMaxFromAge, strainFromTrimp, STRAIN_K } from './strain';

describe('hrMaxFromAge', () => {
  it('uses Tanaka unless override set', () => {
    expect(hrMaxFromAge(40)).toBeCloseTo(180, 5);
    expect(hrMaxFromAge(40, 190)).toBe(190);
  });
});

describe('strainFromTrimp', () => {
  it('maps hard session TRIMP ~50 to strain ~14–16', () => {
    const s = strainFromTrimp(50, STRAIN_K);
    expect(s).toBeGreaterThanOrEqual(14);
    expect(s).toBeLessThanOrEqual(16);
  });
});

describe('computeStrain', () => {
  it('accumulates Edwards TRIMP from HR zones', () => {
    const age = 35;
    const hrMax = hrMaxFromAge(age);
    const bpm = Math.round(hrMax * 0.85);
    const start = new Date('2026-10-28T08:00:00').getTime();
    const samples = Array.from({ length: 60 }, (_, i) => ({
      at: new Date(start + i * 60_000).toISOString(),
      bpm,
    }));
    const res = computeStrain({ age, hrSamples: samples });
    expect(res.estimatedFromSteps).toBe(false);
    expect(res.trimp).toBeGreaterThan(40);
    expect(res.strain).toBeGreaterThan(12);
  });

  it('estimates from steps when HR missing', () => {
    const res = computeStrain({ age: 40, steps: 8000 });
    expect(res.estimatedFromSteps).toBe(true);
    expect(res.trimp).toBe(10);
    expect(res.strain).toBeGreaterThan(0);
  });
});
