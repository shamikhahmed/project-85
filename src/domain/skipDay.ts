/**
 * Skip-day coach: can't train today? Decide like a trainer — move the session to a
 * free day tomorrow, or merge its key lifts into tomorrow's session, or drop it.
 */
import { addDays, format } from 'date-fns';
import plan from './trainingPlan.json';
import { sessionFor, type SessionKey } from './plan';
import type { ISODate } from './types';
import { parseLocalDate } from '../lib/dates';

export type SkipChoice = 'tomorrow' | 'merge' | 'drop';

export interface SkipRecord {
  session: SessionKey;
  choice: SkipChoice;
}

export interface SkipOption {
  choice: SkipChoice;
  title: string;
  detail: string;
  recommended: boolean;
}

export function nextDate(date: ISODate): ISODate {
  return format(addDays(parseLocalDate(date), 1), 'yyyy-MM-dd');
}

export function previousDate(date: ISODate): ISODate {
  return format(addDays(parseLocalDate(date), -1), 'yyyy-MM-dd');
}

/** First `n` exercise names of a lifting session (the heavy compounds go first in this plan). */
export function keyLifts(session: SessionKey, n = 2): string[] {
  const list = (plan.days as Record<string, { name: string }[]>)[session] ?? [];
  return list.slice(0, n).map((e) => e.name);
}

const FREE_DAYS: SessionKey[] = ['rest', 'saturday'];

/** Options for skipping `date`'s session; null when today is already a rest day. */
export function skipOptions(date: ISODate): SkipOption[] | null {
  const today = sessionFor(date);
  if (FREE_DAYS.includes(today.key)) return null;
  const tomorrow = sessionFor(nextDate(date));
  const tomorrowFree = FREE_DAYS.includes(tomorrow.key);
  const lifts = keyLifts(today.key);

  return [
    {
      choice: 'tomorrow',
      title: `Do ${today.label} tomorrow`,
      detail: tomorrowFree
        ? `Tomorrow is ${tomorrow.key === 'rest' ? 'a rest day' : 'the optional Saturday'}, so the week stays intact.`
        : `${tomorrow.label} is dropped this week instead; every other day stays the same.`,
      recommended: tomorrowFree,
    },
    {
      choice: 'merge',
      title: `Merge into tomorrow's ${tomorrowFree ? 'session' : tomorrow.label}`,
      detail: `Start tomorrow with ${lifts.join(' and ')} (top set only), then the normal session.`,
      recommended: !tomorrowFree,
    },
    {
      choice: 'drop',
      title: 'Drop it',
      detail: 'Move on. Hit steps, protein and sleep today — that keeps fat loss on track.',
      recommended: false,
    },
  ];
}

/** Banner for `date` from a skip recorded the day before. */
export function carryOver(
  date: ISODate,
  skipped: Record<ISODate, SkipRecord> | undefined,
): { session: SessionKey; choice: Exclude<SkipChoice, 'drop'>; lifts: string[] } | null {
  const rec = skipped?.[previousDate(date)];
  if (!rec || rec.choice === 'drop') return null;
  return { session: rec.session, choice: rec.choice, lifts: keyLifts(rec.session) };
}
