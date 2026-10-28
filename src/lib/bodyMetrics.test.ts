import { describe, expect, it } from 'vitest';
import {
  ageFromBirthYear,
  buildBodyIntelligence,
  computeBmi,
  computeBmrMifflinStJeor,
  computeTdee,
  suggestActivityKey,
  waistToHeightRatio,
} from './bodyMetrics';

describe('computeBmi', () => {
  it('matches ~28 for 96.5 kg at 6′1″ (185.4 cm)', () => {
    const bmi = computeBmi(96.5, 185.4);
    expect(bmi).toBeCloseTo(28.0, 0);
  });

  it('rejects implausible inputs', () => {
    expect(computeBmi(10, 180)).toBeNull();
    expect(computeBmi(96.5, 50)).toBeNull();
  });
});

describe('computeBmrMifflinStJeor', () => {
  it('computes male BMR', () => {
    const r = computeBmrMifflinStJeor({
      weightKg: 96.5,
      heightCm: 185.4,
      ageYears: 35,
      biologicalSex: 'male',
    });
    expect(r).not.toBeNull();
    expect(r!.bmr).toBeGreaterThan(1600);
    expect(r!.bmr).toBeLessThan(2200);
    expect(r!.formula).toMatch(/male/i);
  });

  it('averages when sex unspecified', () => {
    const r = computeBmrMifflinStJeor({
      weightKg: 96.5,
      heightCm: 185.4,
      ageYears: 35,
      biologicalSex: 'unspecified',
    });
    expect(r!.formula).toMatch(/unspecified/i);
  });
});

describe('TDEE and activity', () => {
  it('scales BMR by multiplier', () => {
    expect(computeTdee(1800, 'sedentary')).toBe(2160);
  });

  it('defaults activity without steps', () => {
    expect(suggestActivityKey(null).confidence).toBe('profile_default');
    expect(suggestActivityKey(5000, 0).confidence).toBe('steps_hint');
    expect(suggestActivityKey(5000, 0).key).not.toBe('very_active');

  });
});

describe('buildBodyIntelligence', () => {
  it('explains missing profile fields', () => {
    const bi = buildBodyIntelligence(
      {
        weightKg: 96.5,
        heightCm: null,
        biologicalSex: 'unspecified',
        ageYears: null,
      },
      85,
    );
    expect(bi.bmi).toBeNull();
    expect(bi.bmrKcal).toBeNull();
    expect(bi.weightToGoalKg).toBe(11.5);
    expect(bi.notes.some((n) => /height|age|sex/i.test(n))).toBe(true);
  });

  it('fills metrics when profile complete', () => {
    const bi = buildBodyIntelligence(
      {
        weightKg: 96.5,
        heightCm: 185.4,
        biologicalSex: 'male',
        ageYears: 35,
        waistCm: 102,
        stepsToday: 10000,
        stepsTarget: 10000,
      },
      85,
    );
    expect(bi.bmi).toBeCloseTo(28, 0);
    expect(bi.bmrKcal).not.toBeNull();
    expect(bi.tdeeKcal).not.toBeNull();
    expect(bi.waistToHeight).not.toBeNull();
    expect(bi.suggestedProteinG).toBe(roundish(96.5 * 1.8));
  });
});

describe('helpers', () => {
  it('ageFromBirthYear', () => {
    expect(ageFromBirthYear(1990, new Date('2026-10-28'))).toBe(36);
    expect(ageFromBirthYear(null)).toBeNull();
  });

  it('waistToHeightRatio', () => {
    expect(waistToHeightRatio(92.7, 185.4)).toBeCloseTo(0.5, 1);
  });
});

function roundish(n: number) {
  return Math.round(n);
}
