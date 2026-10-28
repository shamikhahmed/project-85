import { describe, expect, it } from 'vitest';
import { sleepDurationHours } from './dates';

/** Mirrors syncEngine sleep → minutes conversion used for healthRecords. */
function sleepMinutesForHealthStore(bedtime: string, wakeTime: string): number | null {
  const hours = sleepDurationHours(bedtime, wakeTime);
  if (hours == null) return null;
  return Math.round(hours * 60);
}

describe('sleepMinutesForHealthStore', () => {
  it('handles overnight sessions (wake clock before bed)', () => {
    // Same calendar-day ISO strings where wake < bed numerically still need duration helper
    expect(sleepMinutesForHealthStore('2026-10-27T23:00:00', '2026-10-28T07:00:00')).toBe(480);
  });

  it('returns null for invalid windows instead of 0', () => {
    expect(sleepMinutesForHealthStore('bad', 'also-bad')).toBeNull();
  });
});
