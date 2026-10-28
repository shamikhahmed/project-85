import { describe, expect, it } from 'vitest';
import { buildHealthProfile } from './healthProfile';

describe('buildHealthProfile', () => {
  it('never invents biological age years', () => {
    const p = buildHealthProfile({
      chronologicalAgeYears: 36,
      sleepHoursAvg7: 7.5,
      sleepTargetHours: 8,
      stepsAvg7: 9000,
      stepsTarget: 10000,
      restingHrBpm: null,
      hrvMsAvg7: null,
      weightTrendKgPerWeek: -0.4,
      vo2Max: null,
      bmi: 28,
    });
    expect(p.biologicalAgeYears).toBeNull();
    expect(p.biologicalAgeStatus).toBe('not_implemented');
    expect(p.composite).not.toBeNull();
    expect(p.domains.some((d) => d.id === 'recovery' && d.status === 'insufficient')).toBe(true);
  });

  it('marks insufficient when no inputs', () => {
    const p = buildHealthProfile({
      chronologicalAgeYears: null,
      sleepHoursAvg7: null,
      sleepTargetHours: 8,
      stepsAvg7: null,
      stepsTarget: 10000,
      restingHrBpm: null,
      hrvMsAvg7: null,
      weightTrendKgPerWeek: null,
      vo2Max: null,
      bmi: null,
    });
    expect(p.composite).toBeNull();
    expect(p.completeness).toBe(0);
  });
});
