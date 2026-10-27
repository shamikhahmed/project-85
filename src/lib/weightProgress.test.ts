import { describe, expect, it } from 'vitest';
import {
  computeWeightProgress,
  projectWeightAtDeadline,
  requiredWeeklyLossKg,
} from './weightProgress';

describe('computeWeightProgress', () => {
  it('96.5 → 85 gives 11.5 remaining at start', () => {
    const p = computeWeightProgress({
      startingWeightKg: 96.5,
      targetWeightKg: 85,
      currentWeightKg: 96.5,
    });
    expect(p.requiredLossKg).toBe(11.5);
    expect(p.lostKg).toBe(0);
    expect(p.remainingKg).toBe(11.5);
    expect(p.percentComplete).toBe(0);
  });

  it('bounds percent 0–100', () => {
    const over = computeWeightProgress({
      startingWeightKg: 96.5,
      targetWeightKg: 85,
      currentWeightKg: 80,
    });
    expect(over.percentComplete).toBe(100);
    expect(over.isOnOrPastTarget).toBe(true);

    const none = computeWeightProgress({
      startingWeightKg: 96.5,
      targetWeightKg: 85,
      currentWeightKg: null,
    });
    expect(none.percentComplete).toBe(0);
  });

  it('mid progress', () => {
    const p = computeWeightProgress({
      startingWeightKg: 96.5,
      targetWeightKg: 85,
      currentWeightKg: 90.75,
    });
    expect(p.lostKg).toBe(5.8);
    expect(p.percentComplete).toBe(50.4);
  });
});

describe('requiredWeeklyLossKg', () => {
  it('computes weekly rate', () => {
    expect(requiredWeeklyLossKg(11.5, 80)).toBeCloseTo(1.01, 1);
    expect(requiredWeeklyLossKg(0, 10)).toBe(0);
    expect(requiredWeeklyLossKg(5, 0)).toBeNull();
  });
});

describe('projectWeightAtDeadline', () => {
  it('requires enough data', () => {
    const r = projectWeightAtDeadline({
      weights: [
        { date: '2026-10-27', weightKg: 96.5 },
        { date: '2026-10-28', weightKg: 96.2 },
      ],
      deadline: '2027-01-15',
      startDate: '2026-10-27',
    });
    expect(r.confidence).toBe('insufficient_data');
  });
});
