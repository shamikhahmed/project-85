import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns';
import type { ISODate } from '../domain/types';

/** Local calendar date YYYY-MM-DD — never UTC-shifted. */
export function toLocalISODate(d: Date = new Date()): ISODate {
  return format(d, 'yyyy-MM-dd');
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

/** Sleep duration in hours; handles sessions that cross midnight. */
export function sleepDurationHours(bedtimeIso: string, wakeIso: string): number {
  const bed = new Date(bedtimeIso);
  const wake = new Date(wakeIso);
  if (!isValid(bed) || !isValid(wake)) return 0;
  let ms = wake.getTime() - bed.getTime();
  if (ms < 0) ms += 24 * 60 * 60 * 1000;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}
