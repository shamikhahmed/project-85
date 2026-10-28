import type { ISODate, WorkoutEntry, WorkoutExercise } from '../domain/types';

/** The set a lifter logs: the row labelled "Top set", otherwise the hardest (last) row. */
export function loggedSetRow(sets: string[][]): string[] | null {
  if (!sets.length) return null;
  return sets.find((r) => /top set/i.test(r[0])) ?? sets[sets.length - 1];
}

/** Parse "6-8, failure" → {lo:6, hi:8}; "15" → {lo:15, hi:15}; "12 per leg" → {lo:12, hi:12}. */
export function parseRepRange(reps: string): { lo: number; hi: number } | null {
  const m = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) };
  const n = reps.match(/\d+/);
  return n ? { lo: Number(n[0]), hi: Number(n[0]) } : null;
}

export interface LastLog {
  date: ISODate;
  weightKg?: number;
  reps?: number;
}

/** Most recent logged entry per exercise name (case-insensitive) strictly before `beforeDate`. */
export function lastLogsByName(
  workouts: WorkoutEntry[],
  names: string[],
  beforeDate: ISODate,
): Record<string, LastLog> {
  const wanted = new Map(names.map((n) => [n.trim().toLowerCase(), n]));
  const out: Record<string, LastLog> = {};
  const sorted = [...workouts]
    .filter((w) => w.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  for (const w of sorted) {
    for (const ex of w.exercises ?? []) {
      const key = ex.name.trim().toLowerCase();
      const original = wanted.get(key);
      if (!original || out[original]) continue;
      if (ex.weightKg == null && ex.reps == null) continue;
      out[original] = { date: w.date, weightKg: ex.weightKg, reps: ex.reps };
    }
  }
  return out;
}

/** Double progression: top of the range last time → add load; otherwise beat the reps. */
export function progressionHint(last: LastLog | undefined, repRange: string): string {
  const range = parseRepRange(repRange);
  if (!last || last.weightKg == null) {
    return 'First time: find a weight that leaves 1-2 reps in the tank, then log it.';
  }
  if (range && last.reps != null && last.reps >= range.hi) {
    const add = last.weightKg >= 40 ? '2.5-5 kg' : '1-2.5 kg';
    return `You hit ${last.reps} reps last time — add ${add} today.`;
  }
  if (range && last.reps != null) {
    return `Same weight, aim for ${Math.min(range.hi, last.reps + 1)}+ reps.`;
  }
  return 'Beat last time by one rep or a small jump in weight.';
}

/** Replace (by name) or append one exercise in a session's list. */
export function mergeExercise(list: WorkoutExercise[] | undefined, ex: WorkoutExercise): WorkoutExercise[] {
  const key = ex.name.trim().toLowerCase();
  const rest = (list ?? []).filter((e) => e.name.trim().toLowerCase() !== key);
  return [...rest, ex];
}

export const PLAN_NOTE_PREFIX = 'Plan: ';
