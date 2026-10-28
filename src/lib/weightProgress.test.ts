import { describe, expect, it } from 'vitest';
import {
  computeWeightProgress,
  projectWeightAtDeadline,
  requiredWeeklyLossKg,
  sevenDayRollingAverage,
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
  it('requires enough data without inventing NaN', () => {
    const empty = projectWeightAtDeadline({
      weights: [],
      deadline: '2027-01-15',
      startDate: '2026-10-27',
      targetWeightKg: 85,
    });
    expect(empty.confidence).toBe('insufficient_data');
    expect(empty.projectedKg).toBeNull();

    const r = projectWeightAtDeadline({
      weights: [
        { date: '2026-10-27', weightKg: 96.5 },
        { date: '2026-10-28', weightKg: 96.2 },
      ],
      deadline: '2027-01-15',
      startDate: '2026-10-27',
      targetWeightKg: 85,
    });
    expect(r.confidence).toBe('insufficient_data');
    expect(r.projectedKg).toBe(96.2);
    expect(r.estimatedArrivalDate).toBeNull();
  });

  it('estimates arrival when losing at a measured rate', () => {
    const weights = [];
    for (let i = 0; i < 14; i++) {
      weights.push({
        date: `2026-11-${String(i + 1).padStart(2, '0')}`,
        weightKg: 96.5 - i * 0.1,
      });
    }
    const r = projectWeightAtDeadline({
      weights,
      deadline: '2027-01-15',
      startDate: '2026-10-27',
      targetWeightKg: 85,
    });
    expect(r.confidence).toBe('estimate');
    expect(r.recentWeeklyRateKg).toBeLessThan(0);
    expect(r.estimatedArrivalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.paceNote).toMatch(/estimate/i);
  });
});

describe('sevenDayRollingAverage', () => {
  it('windows by local calendar days, not last N points', () => {
    const avg = sevenDayRollingAverage([
      { date: '2026-10-01', weightKg: 97 },
      { date: '2026-10-05', weightKg: 96 },
      { date: '2026-10-12', weightKg: 95 },
    ]);
    const last = avg.at(-1)!;
    expect(last.date).toBe('2026-10-12');
    // 10-05 is outside 10-06..10-12 window → only 95
    expect(last.avgKg).toBe(95);
  });
});
