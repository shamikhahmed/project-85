import { describe, expect, it } from 'vitest';
import {
  addLocalCalendarDays,
  calendarDaysRemaining,
  eachISODate,
  nextISODate,
  overnightWakeDate,
  previousISODate,
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

  it('previousISODate crosses months', () => {
    expect(previousISODate('2026-11-01')).toBe('2026-10-31');
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

  it('returns null for invalid or zero-length windows', () => {
    expect(sleepDurationHours('not-a-date', '2026-10-28T07:00:00')).toBeNull();
    expect(sleepDurationHours('2026-10-27T07:00:00', '2026-10-27T07:00:00')).toBeNull();
  });
});

describe('overnightWakeDate / local calendar helpers', () => {
  it('rolls wake to next day when wake clock is before bed', () => {
    expect(overnightWakeDate('2026-10-27', '23:00', '07:00')).toBe('2026-10-28');
    expect(overnightWakeDate('2026-10-27', '22:00', '22:30')).toBe('2026-10-27');
  });

  it('nextISODate and addLocalCalendarDays stay on local calendar (no UTC shift)', () => {
    expect(nextISODate('2026-10-31')).toBe('2026-11-01');
    expect(addLocalCalendarDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addLocalCalendarDays('2027-01-15', -1)).toBe('2027-01-14');
  });
});
