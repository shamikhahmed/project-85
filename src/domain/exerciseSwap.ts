/** Exercise swap helpers — machine busy / broken / pain fallbacks. */

export type SwapReason = 'busy' | 'broken' | 'not_available' | 'pain';

export const SWAP_REASONS: { id: SwapReason; label: string }[] = [
  { id: 'busy', label: 'Busy' },
  { id: 'broken', label: 'Broken' },
  { id: 'not_available', label: 'Not available' },
  { id: 'pain', label: 'Pain' },
];

export interface ActiveSwap {
  name: string;
  reason: SwapReason;
}

export type ActiveSwapMap = Record<string, ActiveSwap>;

/** Stable key for a plan slot: `day:code` (e.g. `push:1`). */
export function swapKey(day: string, code: string): string {
  return `${day}:${code}`;
}

/**
 * No-equipment / dumbbell fallback from the plan `muscle` string.
 * When shoulderCaution is on, never suggest dips or behind-neck moves.
 */
export function fallbackFor(muscle: string, shoulderCaution = true): string {
  const m = muscle.toLowerCase();

  const dipSafe = shoulderCaution ? 'Overhead DB extension (neutral grip)' : 'Bench dip';
  const pressSafe = shoulderCaution ? 'DB floor press' : 'Push-ups';

  if (/\bchest\b/.test(m) || /upper chest|lower \+ middle chest|lower \+ middle/.test(m)) {
    return pressSafe;
  }
  if (/\btriceps\b/.test(m)) return dipSafe;
  if (/\bbiceps\b/.test(m) || /brachialis/.test(m)) return 'DB curl';
  if (/forearm/.test(m) && !/grip/.test(m)) return 'DB wrist curl';
  if (/side delt|rear delt|\bdelts\b|front delt|shoulder/.test(m)) {
    return 'DB lateral raise';
  }
  if (/upper trap/.test(m)) return 'DB shrug';
  if (/\blats\b|mid-back|lower lats|back/.test(m)) {
    return shoulderCaution ? 'DB row' : 'Band row / DB row';
  }
  if (/quad/.test(m)) return 'Goblet squat / split squat';
  if (/hamstring/.test(m)) return 'DB RDL';
  if (/glute medius|adductor|inner thigh/.test(m)) return 'Side-lying clam / DB lateral lunge';
  if (/\bglute/.test(m)) return 'DB RDL / hip thrust';
  if (/calf|soleus/.test(m)) return 'Single-leg calf raise';
  if (/oblique|abs|core|lower abs/.test(m)) return 'Plank / dead bug';
  if (/grip|conditioning|lower back/.test(m)) return 'Farmer carry / dead bug';

  return 'DB / bodyweight substitute for this muscle';
}

/** Priority: active swap → Block B name → plan name. */
export function resolveDisplayName(
  ex: { name: string; blockB: string | null; code: string },
  opts: {
    day: string;
    swaps: ActiveSwapMap;
    useBlockB: boolean;
  },
): string {
  const key = swapKey(opts.day, ex.code);
  const swap = opts.swaps[key];
  if (swap?.name) return swap.name;
  if (opts.useBlockB && ex.blockB) return ex.blockB;
  return ex.name;
}

/** Drop swaps that belong to another calendar day. */
export function swapsForDate(
  stored: { date: string; map: ActiveSwapMap } | null | undefined,
  today: string,
): ActiveSwapMap {
  if (!stored || stored.date !== today) return {};
  return { ...stored.map };
}

export function reasonLabel(reason: SwapReason): string {
  return SWAP_REASONS.find((r) => r.id === reason)?.label ?? reason;
}

/** Prefer lowest-load option first when reason is pain. */
export function orderedAlternatives(
  alts: string[],
  fallback: string,
  reason: SwapReason | null,
): string[] {
  const uniq = [...alts.slice(0, 2), fallback].filter(
    (v, i, a) => v && a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
  );
  if (reason !== 'pain') return uniq;
  // Put fallback (usually bodyweight / DB) first for pain.
  return [fallback, ...uniq.filter((x) => x.toLowerCase() !== fallback.toLowerCase())];
}
