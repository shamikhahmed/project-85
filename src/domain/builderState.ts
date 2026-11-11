/**
 * Train → Build: the builder's saved state and every edit to it, as plain functions.
 * The session itself is always recomputed from this state by buildWorkout, so the same state
 * gives the same workout on every device and after every reload.
 */
import { EXERCISE_BY_ID, MUSCLE_BY_ID, SETTING_LABEL, type MuscleId, type Setting } from './exerciseLibrary';
import type { ISODate, SavedWorkout } from './types';
import { sanitizeCardio, type CardioBlock, type CardioWhen } from './cardioLoad';
import {
  MAX_COUNT,
  MAX_MUSCLES,
  defaultPick,
  isAllowed,
  sanitizePicks,
  slotsOf,
  type BuiltExercise,
  type MusclePick,
  type PinnedSlot,
} from './workoutBuilder';

export interface BuilderState {
  setting: Setting;
  /** Priority order: the first muscle gets the freshest slots */
  picks: MusclePick[];
  /** Working sets per exercise */
  sets: number;
  supersets: boolean;
  seed: number;
  /** Exercises held in place: added by you, or kept while you swap / remove others */
  pinned: PinnedSlot[];
  /** Exercises Shuffle steers away from */
  avoid: string[];
  /** Showing the session (false = editing the setup) */
  built: boolean;
  /** Recovery when the session was built — frozen so logging a set doesn't reshuffle it */
  readiness: Partial<Record<MuscleId, number | null>>;
  builtOn: ISODate | null;
  /** Cardio the same day (one block per timing) — kept like sets and supersets, a habit */
  cardio: CardioBlock[];
}

export const BUILDER_KEY = 'p85-builder-v1';
export const MIN_SETS = 2;
export const MAX_SETS = 5;
const SETTINGS: Setting[] = ['gym', 'dumbbells', 'home'];

export function initialBuilder(): BuilderState {
  return {
    setting: 'gym',
    picks: [],
    sets: 3,
    supersets: false,
    seed: 1,
    pinned: [],
    avoid: [],
    built: false,
    readiness: {},
    builtOn: null,
    cardio: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v != null && !Array.isArray(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function parseSlots(raw: unknown): PinnedSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: PinnedSlot[] = [];
  for (const s of raw) {
    if (!isObj(s) || typeof s.id !== 'string' || typeof s.muscle !== 'string') continue;
    if (!EXERCISE_BY_ID.has(s.id) || !MUSCLE_BY_ID.has(s.muscle as MuscleId)) continue;
    out.push(s.kept ? { id: s.id, muscle: s.muscle as MuscleId, kept: true } : { id: s.id, muscle: s.muscle as MuscleId });
  }
  return out;
}

function parsePicks(raw: unknown): MusclePick[] {
  if (!Array.isArray(raw)) return [];
  const picks = raw
    .filter(isObj)
    .filter((p) => typeof p.muscle === 'string' && MUSCLE_BY_ID.has(p.muscle as MuscleId))
    .map((p) => ({
      muscle: p.muscle as MuscleId,
      count: Number(p.count),
      focus: typeof p.focus === 'string' ? p.focus : '',
    }));
  return sanitizePicks(picks);
}

/** Saved JSON → a valid state (unknown muscles, exercises and bad numbers are dropped). */
export function parseBuilder(raw: unknown): BuilderState {
  const base = initialBuilder();
  if (!isObj(raw)) return base;
  const readiness: BuilderState['readiness'] = {};
  if (isObj(raw.readiness)) {
    for (const [m, v] of Object.entries(raw.readiness)) {
      if (MUSCLE_BY_ID.has(m as MuscleId) && (v === null || typeof v === 'number')) readiness[m as MuscleId] = v;
    }
  }
  const picks = parsePicks(raw.picks);
  return {
    setting: SETTINGS.includes(raw.setting as Setting) ? (raw.setting as Setting) : base.setting,
    picks,
    sets: clamp(Math.round(Number(raw.sets)) || base.sets, MIN_SETS, MAX_SETS),
    supersets: raw.supersets === true,
    seed: Number.isInteger(raw.seed) ? (raw.seed as number) : base.seed,
    pinned: parseSlots(raw.pinned),
    avoid: Array.isArray(raw.avoid) ? raw.avoid.filter((a): a is string => typeof a === 'string' && EXERCISE_BY_ID.has(a)) : [],
    built: raw.built === true && picks.length > 0,
    readiness,
    builtOn: typeof raw.builtOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.builtOn) ? raw.builtOn : null,
    cardio: sanitizeCardio(raw.cardio),
  };
}

/* ───────────── setup edits (they reset what the builder chose; your own picks stay) ───────────── */

const ownPins = (s: BuilderState) => s.pinned.filter((p) => !p.kept);
const setup = (s: BuilderState, next: Partial<BuilderState>): BuilderState => {
  const out = { ...s, pinned: ownPins(s), avoid: [], ...next };
  // Nothing left to train: back to the setup screen, never an empty "built" session.
  return out.picks.length ? out : { ...out, built: false };
};

/** Tap a muscle: add it at the end (lowest priority) or take it out with anything pinned for it. */
export function toggleMuscle(s: BuilderState, m: MuscleId): BuilderState {
  if (s.picks.some((p) => p.muscle === m)) {
    return setup(s, { picks: s.picks.filter((p) => p.muscle !== m), pinned: ownPins(s).filter((p) => p.muscle !== m) });
  }
  if (s.picks.length >= MAX_MUSCLES) return s;
  return setup(s, { picks: [...s.picks, defaultPick(m)] });
}

/** Replace the whole selection (Pick what's ready, presets). */
export function setMuscles(s: BuilderState, muscles: MuscleId[]): BuilderState {
  const keep = new Map(s.picks.map((p) => [p.muscle, p]));
  const picks = sanitizePicks(muscles.map((m) => keep.get(m) ?? defaultPick(m)));
  const chosen = new Set(picks.map((p) => p.muscle));
  return setup(s, { picks, pinned: ownPins(s).filter((p) => chosen.has(p.muscle)) });
}

export function setCount(s: BuilderState, m: MuscleId, count: number): BuilderState {
  const n = clamp(Math.round(count), 1, MAX_COUNT);
  return setup(s, { picks: s.picks.map((p) => (p.muscle === m ? { ...p, count: n } : p)) });
}

/** Same number of exercises for every muscle. */
export function setAllCounts(s: BuilderState, count: number): BuilderState {
  const n = clamp(Math.round(count), 1, MAX_COUNT);
  return setup(s, { picks: s.picks.map((p) => ({ ...p, count: n })) });
}

export function setFocus(s: BuilderState, m: MuscleId, focus: string): BuilderState {
  return setup(s, { picks: sanitizePicks(s.picks.map((p) => (p.muscle === m ? { ...p, focus } : p))) });
}

/** Raise a muscle one place in the priority order. */
export function moveUp(s: BuilderState, m: MuscleId): BuilderState {
  const i = s.picks.findIndex((p) => p.muscle === m);
  if (i <= 0) return s;
  const picks = s.picks.slice();
  [picks[i - 1], picks[i]] = [picks[i], picks[i - 1]];
  return setup(s, { picks });
}

export function setSetting(s: BuilderState, setting: Setting): BuilderState {
  return setup(s, { setting });
}

export function setSets(s: BuilderState, sets: number): BuilderState {
  return { ...s, sets: clamp(Math.round(sets), MIN_SETS, MAX_SETS) };
}

export function setSupersets(s: BuilderState, on: boolean): BuilderState {
  return { ...s, supersets: on };
}

/**
 * Set (or with null, clear) the cardio block for one timing. Like sets, it changes the session in
 * place — same exercises, adjusted order, sets and effort.
 */
export function setCardio(s: BuilderState, when: CardioWhen, block: Omit<CardioBlock, 'when'> | null): BuilderState {
  const rest = s.cardio.filter((b) => b.when !== when);
  return { ...s, cardio: sanitizeCardio(block ? [...rest, { ...block, when }] : rest) };
}

/** Build: show the session, with today's recovery frozen into it. */
export function buildNow(
  s: BuilderState,
  readiness: BuilderState['readiness'],
  today: ISODate,
): BuilderState {
  if (!s.picks.length) return s;
  return { ...s, pinned: ownPins(s), avoid: [], built: true, readiness, builtOn: today };
}

/** Same exercises, re-ordered for today's recovery (a session built on an earlier day). */
export function refreshRecovery(
  s: BuilderState,
  list: BuiltExercise[],
  readiness: BuilderState['readiness'],
  today: ISODate,
): BuilderState {
  return { ...s, pinned: slotsOf(list), avoid: [], readiness, builtOn: today };
}

export function editSetup(s: BuilderState): BuilderState {
  return { ...s, built: false };
}

/* ───────────── session edits (the rest of the session stays put) ───────────── */

/** Count per muscle that matches what the session really has (shortfalls included). */
function countsFrom(picks: MusclePick[], slots: PinnedSlot[]): MusclePick[] {
  return picks
    .map((p) => ({ ...p, count: slots.filter((x) => x.muscle === p.muscle).length }))
    .filter((p) => p.count > 0);
}

/** New exercises for everything the builder chose; what you added stays. */
export function shuffle(s: BuilderState, list: BuiltExercise[]): BuilderState {
  return {
    ...s,
    seed: (s.seed % 2147483646) + 1,
    pinned: ownPins(s),
    avoid: list.filter((b) => !b.pinned).map((b) => b.ex.id),
  };
}

/** Put `newId` in place of exercise `index`; the others are held so only that one changes. */
export function swapAt(s: BuilderState, list: BuiltExercise[], index: number, newId: string): BuilderState {
  const target = list[index];
  if (!target || !EXERCISE_BY_ID.has(newId)) return s;
  const pinned = slotsOf(list).map((slot) => (slot.id === target.ex.id ? { id: newId, muscle: target.muscle } : slot));
  return { ...s, pinned, avoid: [] };
}

/** Drop exercise `index`; a muscle with nothing left is taken out. */
export function removeAt(s: BuilderState, list: BuiltExercise[], index: number): BuilderState {
  const gone = list[index];
  if (!gone) return s;
  const pinned = slotsOf(list).filter((slot) => slot.id !== gone.ex.id);
  const picks = countsFrom(s.picks, pinned);
  return { ...s, picks, pinned, avoid: [], built: picks.length > 0 && s.built };
}

export type AddResult =
  | { ok: true; state: BuilderState; muscle: MuscleId }
  | { ok: false; reason: 'unknown' | 'setting' | 'full' | 'max' | 'already'; muscle?: MuscleId };

/**
 * Library → "Add to build": the exercise goes into the session for its main muscle, which is
 * selected if it wasn't. With a session showing, everything else in it stays.
 */
export function addExercise(
  s: BuilderState,
  list: BuiltExercise[],
  id: string,
  shoulderCaution: boolean,
  readiness: BuilderState['readiness'],
  today: ISODate,
): AddResult {
  const e = EXERCISE_BY_ID.get(id);
  if (!e) return { ok: false, reason: 'unknown' };
  const muscle = e.primary;
  if (!isAllowed(e, s.setting, shoulderCaution)) return { ok: false, reason: 'setting', muscle };
  const session = s.built ? list : [];
  if (session.some((b) => b.ex.id === id) || s.pinned.some((p) => p.id === id && !p.kept)) {
    return { ok: false, reason: 'already', muscle };
  }
  const existing = s.picks.find((p) => p.muscle === muscle);
  if (!existing && s.picks.length >= MAX_MUSCLES) return { ok: false, reason: 'full', muscle };
  const have = s.built ? session.filter((b) => b.muscle === muscle).length : (existing?.count ?? 0);
  if (existing && have >= MAX_COUNT) return { ok: false, reason: 'max', muscle };

  const pin: PinnedSlot = { id, muscle };
  if (s.built) {
    const pinned = [...slotsOf(session), pin];
    const picks = existing
      ? countsFrom(s.picks, pinned)
      : [...countsFrom(s.picks, pinned), { ...defaultPick(muscle), count: MUSCLE_BY_ID.get(muscle)!.defaultCount }];
    // A new muscle gets its usual number of exercises; this one is the first of them.
    return { ok: true, muscle, state: { ...s, picks, pinned, avoid: [] } };
  }
  const picks = existing
    ? s.picks.map((p) => (p.muscle === muscle ? { ...p, count: Math.min(MAX_COUNT, p.count + 1) } : p))
    : [...s.picks, defaultPick(muscle)];
  return { ok: true, muscle, state: buildNow({ ...s, picks, pinned: [...ownPins(s), pin] }, readiness, today) };
}

/* ───────────── templates ───────────── */

export function toTemplate(
  s: BuilderState,
  list: BuiltExercise[],
  name: string,
  id: string,
  createdAt: string,
): SavedWorkout {
  const slots = slotsOf(list);
  return {
    id,
    name: name.trim().slice(0, 60) || 'Custom workout',
    createdAt,
    setting: s.setting,
    sets: s.sets,
    supersets: s.supersets,
    picks: countsFrom(s.picks, slots),
    slots,
  };
}

export function fromTemplate(
  t: SavedWorkout,
  readiness: BuilderState['readiness'],
  today: ISODate,
  /** Today's cardio stays: it belongs to the day, not to the saved workout */
  cardio: CardioBlock[] = [],
): BuilderState {
  const s = parseBuilder({
    setting: t.setting,
    picks: t.picks,
    sets: t.sets,
    supersets: t.supersets,
    seed: 1,
    pinned: t.slots,
    cardio,
  });
  return { ...s, built: s.picks.length > 0, readiness, builtOn: today };
}

/** "Chest, Back · Gym · 6 exercises" */
export function templateSummary(t: SavedWorkout): string {
  const muscles = t.picks
    .map((p) => MUSCLE_BY_ID.get(p.muscle as MuscleId)?.label)
    .filter(Boolean)
    .join(', ');
  return `${muscles} · ${SETTING_LABEL[t.setting]} · ${t.slots.length} exercises`;
}
