import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns';
import type { ISODate } from '../domain/types';

/** Local calendar date YYYY-MM-DD — never UTC-shifted. */
export function toLocalISODate(d: Date = new Date()): ISODate {
  return format(d, 'yyyy-MM-dd');
}

/**
 * Local calendar day for an ISO timestamp (incl. trailing Z).
 * Never use iso.slice(0, 10) — that is the UTC date.
 */
export function localCalendarDay(iso: string): ISODate {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

export function parseLocalDate(iso: ISODate): Date {
  const d = parseISO(iso);
  if (!isValid(d)) throw new Error(`Invalid date: ${iso}`);
  return d;
}

export function calendarDaysRemaining(deadline: ISODate, from: ISODate = toLocalISODate()): number {
  return Math.max(0, differenceInCalendarDays(parseLocalDate(deadline), parseLocalDate(from)));
}

export function calendarDaysElapsed(start: ISODate, from: ISODate = toLocalISODate()): number {
  return Math.max(0, differenceInCalendarDays(parseLocalDate(from), parseLocalDate(start)));
}

export function isWithinMission(date: ISODate, start: ISODate, deadline: ISODate): boolean {
  return date >= start && date <= deadline;
}

export function eachISODate(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cur = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (cur <= last) {
    out.push(format(cur, 'yyyy-MM-dd'));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return out;
}

/** Previous local calendar day as YYYY-MM-DD. */
export function previousISODate(iso: ISODate): ISODate {
  const d = parseLocalDate(iso);
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return format(prev, 'yyyy-MM-dd');
}

/** Next local calendar day as YYYY-MM-DD (never UTC-shifted). */
export function nextISODate(iso: ISODate): ISODate {
  return addLocalCalendarDays(iso, 1);
}

/** Add (or subtract) whole local calendar days — never UTC-shifted. */
export function addLocalCalendarDays(iso: ISODate, days: number): ISODate {
  const d = parseLocalDate(iso);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return format(next, 'yyyy-MM-dd');
}

/**
 * Wake calendar date for a sleep session on `bedDate`.
 * If wake clock is before bedtime clock, wake is the next local day.
 */
export function overnightWakeDate(bedDate: ISODate, bedHHMM: string, wakeHHMM: string): ISODate {
  return wakeHHMM < bedHHMM ? nextISODate(bedDate) : bedDate;
}

/** Inclusive week window ending on `end` (default today), length days (default 7). */
export function rollingWeekBounds(
  end: ISODate = toLocalISODate(),
  length = 7,
): { weekStart: ISODate; weekEnd: ISODate } {
  const endDate = parseLocalDate(end);
  const startDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate() - (length - 1),
  );
  return {
    weekStart: format(startDate, 'yyyy-MM-dd'),
    weekEnd: end,
  };
}

/**
 * Sleep duration in hours; handles sessions that cross midnight.
 * Returns null for invalid or non-positive durations (do not average as zero).
 */
export function sleepDurationHours(bedtimeIso: string, wakeIso: string): number | null {
  const bed = new Date(bedtimeIso);
  const wake = new Date(wakeIso);
  if (!isValid(bed) || !isValid(wake)) return null;
  let ms = wake.getTime() - bed.getTime();
  if (ms < 0) ms += 24 * 60 * 60 * 1000;
  if (ms <= 0) return null;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}
