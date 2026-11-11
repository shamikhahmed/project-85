/**
 * Cardio on a lifting day: what it does to the lifting, and what the lifting leaves for it.
 *
 * The research each rule leans on:
 *
 * - Cardio tires the muscles it uses, not the rest. 36 min of cycling (steady at ~70% VO2max, or
 *   intervals) cut leg-press reps 4 and 8 h later but not 24 h later, and bench press did not change
 *   at all (Sporer & Wenger 2003). Intervals right before half squats cut reps, more after a bike
 *   than a treadmill (Panissa et al. 2015). After a hard 5-km interval run, strength reps were 31%
 *   down at 30 min and 19% at 1 h (Panissa et al. 2016): most of it fades within a session, a small
 *   part lasts for hours.
 * - Easy cardio as a warm-up costs nothing measurable: 20 min of cycling before bench press changed
 *   neither the reps nor the bar speed (J Trainol 2023). The specific warm-up sets do the priming.
 * - Lift first, cardio after: lower-body strength gains are about 4 kg better that way, aerobic
 *   gains the same either way (Murlasits et al. 2018, meta-analysis). Size and maximal strength
 *   survive concurrent training; explosive strength suffers, more within one session than with
 *   3+ h between (Schumann et al. 2022). Strength gains were lower with 0 h between the two than
 *   with 6 or 24 h (Robineau et al. 2016).
 * - Lifting first makes the cardio after it harder: leg training still worsens running economy 6 h
 *   later (Doma & Deakin 2013), and a leg session uses about a quarter to two-fifths of the muscle's
 *   glycogen (Koopman et al. 2006). Training to failure adds 24–48 h of recovery (Morán-Navarro
 *   et al. 2017) while stopping a few reps short costs little growth (Refalo et al. 2023). So with
 *   cardio still to come, the muscles it uses stop 2–3 reps short, and a big block also takes a set
 *   off their exercises.
 * - Running cost more leg growth than cycling in the older meta-analysis (Wilson et al. 2012); the
 *   newer one finds no difference by type (Schumann et al. 2022) — a hint for leg days, not a rule.
 *
 * The sizes are estimates fitted to those numbers: a dose from 0 to 1 (effort × a duration curve
 * that flattens past ~45 min), shared over the muscles each machine drives. Fitted check: a hard
 * 25-min interval run leaves squat reps ~26% down half an hour later and ~19% after an hour
 * (measured: 31% and 19%, Panissa 2016); 36 min of moderate cycling hours earlier still costs leg
 * lifts ~5% (Sporer & Wenger: lower at 4–8 h, back at 24 h).
 */
import type { MuscleId } from './exerciseLibrary';

export type CardioWhen = 'earlier' | 'before' | 'after' | 'later';
export type CardioMode = 'walk' | 'incline' | 'run' | 'bike' | 'elliptical' | 'stairs' | 'rower' | 'swim';
export type CardioEffort = 'easy' | 'moderate' | 'hard';

export interface CardioBlock {
  when: CardioWhen;
  mode: CardioMode;
  minutes: number;
  effort: CardioEffort;
}

export const CARDIO_WHEN: { id: CardioWhen; label: string; hint: string }[] = [
  { id: 'earlier', label: 'Earlier today', hint: 'Its own session, hours before' },
  { id: 'before', label: 'Before lifting', hint: 'Warm-up, or cardio first' },
  { id: 'after', label: 'After lifting', hint: 'Straight after the last set' },
  { id: 'later', label: 'Later today', hint: 'Its own session, hours after' },
];

export interface CardioModeInfo {
  id: CardioMode;
  label: string;
  /** As it reads in a sentence: "the incline walk after" */
  noun: string;
  media: string | null;
  /** How much the machine drives each muscle (1 = the main engine) */
  uses: Partial<Record<MuscleId, number>>;
}

export const CARDIO_MODES: CardioModeInfo[] = [
  { id: 'walk', label: 'Walk', noun: 'walk', media: null, uses: { calves: 0.45, glutes: 0.25, quads: 0.25, hamstrings: 0.2 } },
  {
    id: 'incline',
    label: 'Incline walk',
    noun: 'incline walk',
    media: '3666-rjiM4L3',
    uses: { calves: 0.6, glutes: 0.55, hamstrings: 0.35, quads: 0.35 },
  },
  { id: 'run', label: 'Run', noun: 'run', media: '0684-y5p0H8a', uses: { calves: 0.8, quads: 0.65, hamstrings: 0.55, glutes: 0.5 } },
  { id: 'bike', label: 'Bike', noun: 'bike', media: '2138-H1PESYI', uses: { quads: 0.9, glutes: 0.45, calves: 0.35, hamstrings: 0.3 } },
  {
    id: 'elliptical',
    label: 'Elliptical',
    noun: 'elliptical',
    media: '2141-rjtuP6X',
    uses: { quads: 0.6, glutes: 0.5, hamstrings: 0.3, calves: 0.3, chest: 0.1, back: 0.1, shoulders: 0.1, triceps: 0.1, biceps: 0.1 },
  },
  {
    id: 'stairs',
    label: 'Stairs',
    noun: 'stair climber',
    media: '2311-j9Q5crt',
    uses: { glutes: 0.8, quads: 0.7, calves: 0.55, hamstrings: 0.35 },
  },
  {
    id: 'rower',
    label: 'Rower',
    noun: 'rower',
    media: null,
    uses: { quads: 0.6, back: 0.6, glutes: 0.5, forearms: 0.45, hamstrings: 0.4, biceps: 0.35, traps: 0.25, shoulders: 0.2, abs: 0.2 },
  },
  {
    id: 'swim',
    label: 'Swim',
    noun: 'swim',
    media: null,
    uses: { back: 0.6, shoulders: 0.6, triceps: 0.3, chest: 0.3, biceps: 0.2, abs: 0.2, quads: 0.15, glutes: 0.15, hamstrings: 0.1, calves: 0.1 },
  },
];
export const CARDIO_MODE_BY_ID = new Map(CARDIO_MODES.map((m) => [m.id, m]));

export const CARDIO_EFFORT: { id: CardioEffort; label: string; talk: string }[] = [
  { id: 'easy', label: 'Easy', talk: 'you can chat' },
  { id: 'moderate', label: 'Moderate', talk: 'short sentences only' },
  { id: 'hard', label: 'Hard', talk: "can't talk, or intervals" },
];

/** Minute choices for the stepper (the plan's own finishers are 8–15 min). */
export const CARDIO_MINUTES = [5, 8, 10, 12, 15, 20, 25, 30, 40, 45, 60, 75, 90];

/** Effort weight: easy (talk test passed) barely tires; hard intervals count fully. */
const EFFORT_K: Record<CardioEffort, number> = { easy: 0.1, moderate: 0.55, hard: 1 };
/** Local fatigue per unit of dose on a muscle the machine drives fully (fitted to Panissa 2016). */
const CARDIO_LOCAL = 0.8;
/** The part that lasts hours (the 4–8 h leg-press drop) and not just minutes. */
const CARDIO_SLOW = 0.25;
/** Whole-body fatigue per unit of dose straight after — small: bench press held up. */
const CARDIO_GLOBAL = 0.15;
/** Hold-back for a session hours later: less than straight after, but leg training still dulls running 6 h on. */
const LATER_SHARE = 0.7;
/** Whole-body share of the hold-back (heart and glycogen, not one muscle). */
const RESERVE_GLOBAL = 0.6;

/** Hold-back at which a muscle's sets stop 2–3 reps short. */
export const RESERVE_REPS = 0.15;
/** Hold-back at which its exercises also lose a set (never below 2). */
export const RESERVE_SET = 0.35;
/** Whole-body hold-back at which every exercise stops 2 short (a hard block of ~30 min or more). */
export const RESERVE_ALL = 0.4;

/** How big a block is, 0–1: effort × a duration curve (10 min ≈ 0.33, 30 min ≈ 0.7, 60 min ≈ 0.9). */
export function cardioDose(b: CardioBlock): number {
  return EFFORT_K[b.effort] * (1 - Math.exp(-b.minutes / 25));
}

/** Easy and short, straight before lifting: a warm-up, not a workout. */
export function isWarmupCardio(b: CardioBlock): boolean {
  return b.when === 'before' && b.effort === 'easy' && b.minutes <= 15;
}

export interface CardioEffect {
  /** Fatigue at the start that fades over the session like any other */
  fast: Partial<Record<MuscleId, number>>;
  /** Fatigue that lasts the whole session */
  slow: Partial<Record<MuscleId, number>>;
  /** Whole-body fatigue at the start */
  global: number;
  /** Per muscle, how much to hold back for cardio still to come */
  reserve: Partial<Record<MuscleId, number>>;
  /** Whole-body hold-back */
  reserveAll: number;
  /** Cardio minutes inside this session (before + after) */
  minutes: number;
}

export function cardioEffect(blocks: CardioBlock[]): CardioEffect {
  const out: CardioEffect = { fast: {}, slow: {}, global: 0, reserve: {}, reserveAll: 0, minutes: 0 };
  const add = (to: Partial<Record<MuscleId, number>>, m: MuscleId, v: number) => (to[m] = (to[m] ?? 0) + v);
  for (const b of blocks) {
    const mode = CARDIO_MODE_BY_ID.get(b.mode);
    if (!mode) continue;
    const d = cardioDose(b);
    const uses = Object.entries(mode.uses) as [MuscleId, number][];
    if (b.when === 'before') {
      out.minutes += b.minutes;
      if (isWarmupCardio(b)) continue; // no measurable cost (see above)
      out.global += CARDIO_GLOBAL * d;
      for (const [m, s] of uses) {
        add(out.fast, m, CARDIO_LOCAL * d * s * (1 - CARDIO_SLOW));
        add(out.slow, m, CARDIO_LOCAL * d * s * CARDIO_SLOW);
      }
    } else if (b.when === 'earlier') {
      // Hours later only the slow part is left — and the bench press didn't notice even that.
      for (const [m, s] of uses) add(out.slow, m, CARDIO_LOCAL * d * s * CARDIO_SLOW);
    } else {
      const k = b.when === 'after' ? 1 : LATER_SHARE;
      if (b.when === 'after') out.minutes += b.minutes;
      out.reserveAll = Math.max(out.reserveAll, k * d * RESERVE_GLOBAL);
      for (const [m, s] of uses) out.reserve[m] = Math.max(out.reserve[m] ?? 0, k * d * s);
    }
  }
  return out;
}

const LOWER_BODY: MuscleId[] = ['quads', 'glutes', 'hamstrings', 'calves'];
const UPPER_WORD: Partial<Record<MuscleId, string>> = { back: 'back', shoulders: 'shoulders', chest: 'chest' };

/** The muscles a machine mainly drives, in words: "legs", "legs and back", "back and shoulders". */
export function cardioMuscles(mode: CardioMode): string {
  const uses = Object.entries(CARDIO_MODE_BY_ID.get(mode)?.uses ?? {}) as [MuscleId, number][];
  const main = uses.filter(([, s]) => s >= 0.5).map(([m]) => m);
  const words = [
    ...(main.some((m) => LOWER_BODY.includes(m)) ? ['legs'] : []),
    ...main.filter((m) => !LOWER_BODY.includes(m)).map((m) => UPPER_WORD[m] ?? m),
  ];
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : (words[0] ?? 'legs');
}

/** One line for the setup screen: what this block will do to the lifting. */
export function cardioImpact(b: CardioBlock, sets: number): string {
  const top = Math.max(0, ...Object.values(CARDIO_MODE_BY_ID.get(b.mode)?.uses ?? {}));
  const d = cardioDose(b);
  const what = cardioMuscles(b.mode);
  if (b.when === 'before') {
    if (isWarmupCardio(b)) return 'A warm-up: no cost to your lifts.';
    return d * top >= 0.06 ? `Your ${what} start part-tired — the order and reasons account for it.` : 'Light: the lifting is unchanged.';
  }
  if (b.when === 'earlier') {
    return d * top * CARDIO_SLOW >= 0.03 ? `A little tiredness stays in your ${what} for hours — counted.` : 'Light: the lifting is unchanged.';
  }
  const k = b.when === 'after' ? 1 : LATER_SHARE;
  const trim = k * d * top >= RESERVE_SET && sets >= 3;
  const all = k * d * RESERVE_GLOBAL >= RESERVE_ALL;
  if (trim && all) return `Every exercise stops 2–3 reps short; your ${what} also do a set fewer.`;
  if (trim) return `Your ${what} stop 2–3 reps short and do a set fewer.`;
  if (all) return 'Every exercise stops 2–3 reps short.';
  if (k * d * top >= RESERVE_REPS) return `Your ${what} stop 2–3 reps short.`;
  return 'Light: the lifting stays as planned.';
}

/** "12 min moderate incline walk" */
export function cardioLabel(b: CardioBlock): string {
  const mode = CARDIO_MODE_BY_ID.get(b.mode);
  return `${b.minutes} min ${b.effort} ${mode?.noun ?? b.mode}`;
}

/** What a newly switched-on block starts as (the plan's warm-up and finisher where it has one). */
export function defaultCardio(when: CardioWhen): CardioBlock {
  if (when === 'before') return { when, mode: 'bike', minutes: 5, effort: 'easy' };
  if (when === 'after') return { when, mode: 'incline', minutes: 12, effort: 'moderate' };
  return { when, mode: 'walk', minutes: 30, effort: 'moderate' };
}

const WHENS = CARDIO_WHEN.map((w) => w.id);
const EFFORTS = CARDIO_EFFORT.map((e) => e.id);

/** Saved JSON → valid blocks: one per timing, in day order, minutes 5–120. */
export function sanitizeCardio(raw: unknown): CardioBlock[] {
  if (!Array.isArray(raw)) return [];
  const byWhen = new Map<CardioWhen, CardioBlock>();
  for (const b of raw) {
    if (typeof b !== 'object' || b == null) continue;
    const { when, mode, minutes, effort } = b as Record<string, unknown>;
    if (!WHENS.includes(when as CardioWhen) || !CARDIO_MODE_BY_ID.has(mode as CardioMode)) continue;
    if (!EFFORTS.includes(effort as CardioEffort)) continue;
    const n = Math.round(Number(minutes));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (!byWhen.has(when as CardioWhen)) {
      byWhen.set(when as CardioWhen, {
        when: when as CardioWhen,
        mode: mode as CardioMode,
        minutes: Math.min(120, Math.max(5, n)),
        effort: effort as CardioEffort,
      });
    }
  }
  return WHENS.filter((w) => byWhen.has(w)).map((w) => byWhen.get(w)!);
}

const LOGGED_MODE: Partial<Record<string, CardioMode>> = { walking: 'walk', running: 'run', swimming: 'swim' };

/**
 * Cardio already logged today (Log → Workout), as an "Earlier today" block — offered, never applied
 * on its own. Effort from the logged 1–10 rating (talk-test bands); unrated counts as moderate.
 */
export function loggedCardio(
  workouts: { date: string; type: string; durationMin?: number; perceivedEffort?: number }[],
  today: string,
): CardioBlock | null {
  const w = workouts.find((x) => x.date === today && LOGGED_MODE[x.type] && (x.durationMin ?? 0) >= 5);
  if (!w) return null;
  const rpe = w.perceivedEffort;
  const effort: CardioEffort = rpe == null ? 'moderate' : rpe <= 3 ? 'easy' : rpe <= 6 ? 'moderate' : 'hard';
  return { when: 'earlier', mode: LOGGED_MODE[w.type]!, minutes: Math.min(120, Math.round(w.durationMin!)), effort };
}
