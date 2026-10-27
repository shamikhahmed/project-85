import { describe, expect, it } from 'vitest';
import {
  calendarDaysRemaining,
  eachISODate,
  sleepDurationHours,
  toLocalISODate,
} from './dates';

describe('countdown', () => {
  it('counts calendar days to deadline', () => {
    expect(calendarDaysRemaining('2027-01-15', '2027-01-15')).toBe(0);
    expect(calendarDaysRemaining('2027-01-15', '2027-01-14')).toBe(1);
    expect(calendarDaysRemaining('2027-01-15', '2026-10-27')).toBe(80);
  });

  it('toLocalISODate is YYYY-MM-DD', () => {
    expect(toLocalISODate(new Date(2026, 9, 27))).toBe('2026-10-27');
  });
});

describe('eachISODate', () => {
  it('includes month boundaries', () => {
    const days = eachISODate('2026-10-30', '2026-11-02');
    expect(days).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});

describe('sleepDurationHours', () => {
  it('handles cross-midnight', () => {
    expect(sleepDurationHours('2026-10-27T23:00:00', '2026-10-28T07:00:00')).toBe(8);
  });

  it('same-day sleep', () => {
    expect(sleepDurationHours('2026-10-27T01:00:00', '2026-10-27T09:00:00')).toBe(8);
  });
});
