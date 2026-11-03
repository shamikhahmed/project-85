/** Supplement stack + daily ticks, stored in settings so backups carry them. */

export type SupplementTiming = 'morning' | 'pre' | 'post' | 'evening';

export interface Supplement {
  name: string;
  timing: SupplementTiming;
}

export const TIMINGS: { id: SupplementTiming; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'pre', label: 'Pre-workout' },
  { id: 'post', label: 'Post-workout' },
  { id: 'evening', label: 'Evening' },
];

/** Stack grouped by timing in day order; empty groups left out. */
export function groupByTiming(stack: Supplement[]): { timing: SupplementTiming; label: string; items: Supplement[] }[] {
  return TIMINGS.map((t) => ({ timing: t.id, label: t.label, items: stack.filter((s) => s.timing === t.id) })).filter(
    (g) => g.items.length > 0,
  );
}

/** Toggle one supplement for a date; returns a new log. Names compare case-insensitively. */
export function toggleTaken(
  log: Record<string, string[]> | undefined,
  date: string,
  name: string,
): Record<string, string[]> {
  const day = log?.[date] ?? [];
  const has = day.some((n) => n.toLowerCase() === name.toLowerCase());
  const next = has ? day.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...day, name];
  return { ...log, [date]: next };
}

/** Add to the stack unless the name already exists. Trims, ignores empty names. */
export function addSupplement(stack: Supplement[] | undefined, name: string, timing: SupplementTiming): Supplement[] {
  const clean = name.trim().slice(0, 40);
  const list = stack ?? [];
  if (!clean || list.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return list;
  return [...list, { name: clean, timing }];
}
