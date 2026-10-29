import { describe, expect, it } from 'vitest';
import {
  computeSleepPerf,
  goToBedBy,
  sleepNeedMinutes,
  bedtimeWakeConsistency,
} from './sleepPerf';

describe('sleepNeedMinutes', () => {
  it('adds debt from last 3 nights capped at +1h', () => {
    const need = sleepNeedMinutes(
      480,
      [
        { wakeDay: '2026-10-25', asleepMinutes: 420 },
        { wakeDay: '2026-10-26', asleepMinutes: 420 },
        { wakeDay: '2026-10-27', asleepMinutes: 420 },
      ],
      0,
    );
    // 60 min short × 0.5 × 3 = 90, capped to 60
    expect(need).toBe(540);
  });

  it('adds strain adjustment above 10', () => {
    expect(sleepNeedMinutes(480, [], 14)).toBe(480 + 4 * 5);
  });
});

describe('computeSleepPerf', () => {
  it('caps performance at 100%', () => {
    const res = computeSleepPerf({
      lastNights: [],
      tonightAsleepMinutes: 600,
      strain: 0,
      wakeTargetIso: '2026-10-29T07:00:00',
    });
    expect(res.performance).toBe(100);
  });

  it('computes goToBedBy from wake target', () => {
    expect(goToBedBy('2026-10-29T07:00:00', 480)).toBe('23:00');
  });
});

describe('bedtimeWakeConsistency', () => {
  it('returns lower std-dev for regular schedules', () => {
    const regular = bedtimeWakeConsistency([
      { wakeDay: '2026-10-20', bedtime: '2026-10-20T23:00:00', wake: '2026-10-21T07:00:00' },
      { wakeDay: '2026-10-21', bedtime: '2026-10-21T23:05:00', wake: '2026-10-22T07:05:00' },
    ]);
    const erratic = bedtimeWakeConsistency([
      { wakeDay: '2026-10-20', bedtime: '2026-10-20T23:00:00', wake: '2026-10-21T07:00:00' },
      { wakeDay: '2026-10-21', bedtime: '2026-10-22T01:30:00', wake: '2026-10-22T10:00:00' },
    ]);
    expect(regular).not.toBeNull();
    expect(erratic).not.toBeNull();
    expect(regular!).toBeLessThan(erratic!);
  });
});
