import type { DayAggregate } from '../domain/types';
import { eachISODate, toLocalISODate } from './dates';

export interface ComebackState {
  missedDays: number;
  lastLoggedDate: string | null;
  message: string;
  nextStep: string;
}

/**
 * Detect multi-day logging gaps without guilt. Unlogged ≠ failure.
 */
export function assessComeback(
  recentDays: DayAggregate[],
  today: string = toLocalISODate(),
): ComebackState | null {
  const sorted = [...recentDays]
    .filter((d) => d.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const last = sorted.find(
    (d) =>
      d.foodEntryCount > 0 ||
      d.steps != null ||
      d.waterMl > 0 ||
      d.primaryWeightKg != null ||
      d.workoutTypes.length > 0 ||
      d.cigarettesLogged ||
      d.reviewCompleted,
  );

  if (!last) {
    return {
      missedDays: 0,
      lastLoggedDate: null,
      message: 'Your next chapter starts with today’s data.',
      nextStep: 'Log a weight, meal, or steps when you’re ready — no perfect day required.',
    };
  }

  const span = eachISODate(last.date, today);
  // days strictly after last log and before today
  const gap = Math.max(0, span.length - 2);
  if (gap < 2) return null;

  return {
    missedDays: gap,
    lastLoggedDate: last.date,
    message: 'Welcome back. Your previous effort still counts.',
    nextStep:
      'Pick up where you are. Log what you know, leave unknowns unlogged, and take the next useful step.',
  };
}
