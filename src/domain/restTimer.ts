/**
 * Rest timer helpers for the Train tab. Times are wall-clock based (endsAt),
 * so the countdown stays correct after the phone locks or the app is backgrounded.
 */

/** Seconds of rest from plan copy like "2-3 min.", "90 sec.", "45 sec, then 1B.". Null = no rest. */
export function parseRestSeconds(rest: string): number | null {
  const text = rest.trim().toLowerCase();
  if (text.startsWith('no rest') || text.startsWith('straight')) return null;
  const min = text.match(/^(\d+)(?:\s*-\s*\d+)?\s*min/);
  if (min) return Number(min[1]) * 60;
  const sec = text.match(/^(\d+)\s*sec/);
  if (sec) return Number(sec[1]);
  return null;
}

/** Whole seconds left (never negative). */
export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
