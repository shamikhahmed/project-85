/**
 * Muscle builder: choose muscles (in priority order), how many exercises each and where you train;
 * get a whole session — exercises chosen, put in order, optionally paired, with sets, reps, rest
 * and warm-ups, plus a plain-language reason for every choice.
 *
 * How it decides (original method; the research each step leans on is cited inline):
 *
 * 1. Pick — shared facet coverage. Every muscle has parts ("facets": upper / mid chest, long / short
 *    biceps head, hinge / curl for hamstrings …) and the focus says how much each part matters.
 *    Exercises are added one at a time, always the one adding the most *new* coverage. Coverage
 *    saturates — cov = 1 − Π(1 − 0.85·c) — so a second flat press adds little once flat pressing is
 *    covered and the next pick moves to a new angle. Coverage is shared across the session: your
 *    chest presses already train front delts and triceps (indirect work counts about half, as in
 *    fractional-set counting — Pelland et al. 2024), so shoulder picks lean to side and rear delts
 *    and triceps picks to the long head. Two passes let every muscle see every other muscle's
 *    picks. Small nudges: loaded-stretch moves score a little higher (long-length training, Maeo
 *    2023 — evidence is mixed, so the nudge is small), big muscles open with a compound, loadable
 *    equipment beats bands in a gym, lower whole-body cost wins ties.
 *
 * 2. Order — fatigue simulation. The session is played forward exercise by exercise. Each one tires
 *    its muscles (local fatigue, fading a little with every exercise after) and the body (global
 *    fatigue). A tired helper cuts a lift short in proportion to how much it limits that lift:
 *    tired triceps limit a bench press, tired grip limits rows, a tired core limits squats.
 *    Big and technical lifts suffer most from whole-body fatigue; a crunch after heavy legs
 *    barely notices. A local search keeps the order where the
 *    most important work is done freshest. The muscle you pick first counts most: exercises done
 *    first gain the most strength, while order barely changes size gains (Nunes et al. 2021).
 *    One hard rule on top: a muscle's compound lifts always come before its isolation work.
 *    Pre-exhausting a muscle costs the compound reps without adding activation (Augustsson 2003,
 *    Gentil 2007), and in long sessions the simulation alone could trade that away. The same holds
 *    for a helper that clearly limits a compound: curls wait for the pull-ups.
 *
 * 3. Pair (optional) — a superset joins two neighbours that share no working muscle and don't
 *    limit each other, preferring opposite muscles (chest ↔ back, biceps ↔ triceps).
 *
 * 4. Prescribe — reps and rest by lift type (over ~60 s rest helps a little, past ~90 s adds little
 *    for size: Singer et al. 2024), warm-up sets only while a muscle is still cold, and each
 *    muscle's session volume against the ~11 fractional-set plateau (Remmert et al.).
 */
import {
  EXERCISE_BY_ID,
  LIBRARY,
  MUSCLES,
  MUSCLE_BY_ID,
  SETTING_LABEL,
  coverageFor,
  fitsSetting,
  loadOn,
  muscleLabel,
  type LibExercise,
  type MuscleId,
  type Setting,
} from './exerciseLibrary';
import type { MuscleStatus } from './muscleRecovery';
import type { PlayerExercise } from './workoutPlayer';
import { parseRepRange } from '../lib/trainingLog';

export interface MusclePick {
  muscle: MuscleId;
  /** Exercises for this muscle, 1–6 */
  count: number;
  /** Focus option id from MUSCLES[].focus */
  focus: string;
}

/** An exercise held in place: added from the library, swapped in, or kept from a saved workout. */
export interface PinnedSlot {
  id: string;
  muscle: MuscleId;
  /** Held only to keep the session stable (after a swap or remove), not chosen by you. */
  kept?: boolean;
}

export interface BuildInput {
  /** In priority order: the first muscle gets the freshest slots */
  picks: MusclePick[];
  setting: Setting;
  /** Working sets per exercise, 2–5 */
  sets: number;
  supersets: boolean;
  /** Tie-break seed; Shuffle changes it */
  seed: number;
  pinned?: PinnedSlot[];
  /** Softly avoided ids (Shuffle steers away from the last build) */
  avoid?: string[];
  /** Profile flag: leave out dips */
  shoulderCaution?: boolean;
  /** Recovery per muscle, 0–100 (missing or null = fresh / unknown) */
  readiness?: Partial<Record<MuscleId, number | null>>;
}

export type Tier = 'heavy' | 'compound' | 'isolation' | 'small' | 'core';

export interface SetRow {
  label: string;
  reps: string;
  guide: string;
  warmup: boolean;
}

export interface BuiltExercise {
  ex: LibExercise;
  /** The muscle this slot was picked for (can differ from ex.primary: a split squat for glutes) */
  muscle: MuscleId;
  tier: Tier;
  workSets: number;
  reps: string;
  /** Rest after a set; for a superset, after each round of both */
  restSec: number;
  rows: SetRow[];
  /** Superset letter shared by two neighbours, else null */
  group: string | null;
  /** Predicted performance when you get to it, 0–1 */
  freshness: number;
  /** Facet labels this pick added */
  adds: string[];
  /** Pick order within its muscle (0 = picked first, counts most) */
  rank: number;
  pinned: boolean;
  why: string[];
}

export type VolumeBand = 'light' | 'productive' | 'high' | 'over';

export interface VolumeRow {
  muscle: MuscleId;
  /** Fractional sets: indirect work counts by how much the exercise works the muscle */
  sets: number;
  band: VolumeBand;
  picked: boolean;
}

export interface Shortfall {
  muscle: MuscleId;
  wanted: number;
  got: number;
}

export interface BuildResult {
  exercises: BuiltExercise[];
  volume: VolumeRow[];
  minutes: number;
  shortfalls: Shortfall[];
  notes: string[];
}

export const MAX_MUSCLES = 6;
export const MAX_COUNT = 6;
export const SUPERSET_GAP_SEC = 15;

/** One exercise covers at most 85% of a facet: a second angle on the same part still adds a little. */
const SAT = 0.85;
/** Indirect work counts about half (fractional sets). */
const INDIRECT_SHARE = 0.5;
/** How hard local fatigue in a limiting muscle drags a lift. */
const LAMBDA = 0.9;
/**
 * Whole-body fatigue drag. Lifts that ask a lot of the whole body (and technical ones) need it
 * fresh; a crunch or a curl after heavy legs barely notices.
 */
const MU_SYSTEMIC = 0.4;
const MU_SKILL = 0.6;
/** Local fatigue per hard set at full load (3 sets of bench ≈ 15–20% fewer reps on the next press). */
const LOCAL = 0.07;
/** Share of local fatigue left after each exercise (rests and other work in between). */
const DECAY = 0.88;
/** Whole-body fatigue per set at full systemic cost. */
const GLOBAL = 0.035;
/** Weight of the 1st … 6th picked muscle. */
const PRIORITY = [1.4, 1.22, 1.12, 1.06, 1.03, 1];
/** Same-muscle neighbours: one station, one focus — blocks unless splitting clearly pays. */
const BLOCK_BONUS = 0.3;
/**
 * Pre-exhaustion line: an isolation never goes before a compound its muscle limits this much —
 * pushdowns before a bench press, curls before pull-ups, leg extensions before squats (a lift's
 * own muscle counts as 1). Large and multi-joint before small and single-joint (ACSM 2009).
 */
const PRE_EXHAUST_LIMIT = 0.5;
/** Later positions count a little less: general fatigue, focus, and sessions that run short. */
const POSITION_FADE = 0.03;
/** Effective sets a muscle needs in this session before it counts as warm. */
const WARM_SETS = 1;

/** Left out when the profile has shoulder caution on (same rule as the plan swaps). */
export const SHOULDER_RISK = new Set(['chest-dip', 'triceps-dip', 'bench-dip', 'machine-dip']);

/** Bodyweight moves heavy enough to stay first-choice in a gym. */
const HARD_BODYWEIGHT = new Set([
  'pull-up',
  'chin-up',
  'chest-dip',
  'triceps-dip',
  'inverted-row',
  'nordic-curl',
  'hanging-knee-raise',
]);

/**
 * Which parts of muscle A get work when an exercise for muscle B also works A (its `inv`):
 * presses hit the front delts and the triceps' pressing role; rows hit rear delts, mid traps and grip.
 */
const INDIRECT: Partial<Record<MuscleId, Partial<Record<MuscleId, Record<string, number>>>>> = {
  shoulders: { chest: { front: 1 }, triceps: { front: 1 }, back: { rear: 1 }, traps: { side: 0.5, rear: 0.5 } },
  triceps: { chest: { press: 1 }, shoulders: { press: 0.7, lateral: 0.3 } },
  biceps: { back: { short: 0.5, brach: 0.5 }, forearms: { brach: 1 }, shoulders: { short: 1 } },
  forearms: { back: { grip: 1 }, biceps: { brachio: 0.6, flexors: 0.4 }, traps: { grip: 1 }, hamstrings: { grip: 1 }, quads: { grip: 1 } },
  traps: { back: { mid: 1 }, shoulders: { mid: 0.6, upper: 0.4 }, forearms: { upper: 1 } },
  glutes: { quads: { stretch: 1 }, hamstrings: { stretch: 0.7, thrust: 0.3 }, back: { thrust: 0.5, stretch: 0.5 } },
  hamstrings: { back: { hinge: 1 }, glutes: { hinge: 0.6, curl: 0.4 } },
  quads: { back: { squat: 1 }, glutes: { squat: 1 } },
  abs: { quads: { stability: 1 }, back: { stability: 1 }, shoulders: { stability: 1 }, chest: { stability: 1 }, hamstrings: { stability: 1 } },
  chest: { triceps: { flat: 1 }, shoulders: { incline: 1 }, back: { fly: 0.5 } },
  back: { shoulders: { horizontal: 1 }, traps: { horizontal: 1 }, chest: { lat: 1 }, triceps: { lat: 1 } },
};

const ANTAGONIST: Partial<Record<MuscleId, MuscleId[]>> = {
  chest: ['back'],
  back: ['chest', 'shoulders'],
  shoulders: ['back'],
  biceps: ['triceps'],
  triceps: ['biceps'],
  quads: ['hamstrings'],
  hamstrings: ['quads'],
};
const LOWER = new Set<MuscleId>(['quads', 'hamstrings', 'glutes', 'calves']);

/* ───────────────────────── helpers ───────────────────────── */

/** Small seeded PRNG (mulberry32) so a build is repeatable and Shuffle is just a new seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Muscles an exercise works, with load per set (1 for its primary). */
function worked(e: LibExercise): [MuscleId, number][] {
  return [[e.primary, 1], ...(Object.entries(e.inv) as [MuscleId, number][])];
}

/** How much fatigue in `m` limits `e` (1 for its own primary). */
function limitOf(e: LibExercise, m: MuscleId): number {
  return m === e.primary ? 1 : (e.limit[m] ?? 0);
}

function addCoverage(cov: Record<string, number>, c: Record<string, number>) {
  for (const [f, v] of Object.entries(c)) cov[f] = 1 - (1 - (cov[f] ?? 0)) * (1 - SAT * v);
}

/** Facet coverage an exercise gives muscle `m` without being picked for it. */
export function indirectCoverage(e: LibExercise, m: MuscleId): Record<string, number> {
  if (e.primary === m) return {};
  const out: Record<string, number> = {};
  for (const [f, v] of Object.entries(e.also[m] ?? {})) out[f] = v * 0.6;
  const load = e.inv[m] ?? 0;
  const map = INDIRECT[m]?.[e.primary];
  if (load > 0 && map) {
    for (const [f, w] of Object.entries(map)) out[f] = Math.max(out[f] ?? 0, load * w * INDIRECT_SHARE);
  }
  return out;
}

export function isAllowed(e: LibExercise, setting: Setting, shoulderCaution = false): boolean {
  return fitsSetting(e, setting) && !(shoulderCaution && SHOULDER_RISK.has(e.id));
}

/** Whether `e` can fill a slot for `m` (its primary, or listed under `also`). */
export function serves(e: LibExercise, m: MuscleId): boolean {
  return e.primary === m || Object.keys(e.also[m] ?? {}).length > 0;
}

export function candidatesFor(m: MuscleId, setting: Setting, shoulderCaution = false): LibExercise[] {
  return LIBRARY.filter((e) => serves(e, m) && isAllowed(e, setting, shoulderCaution));
}

/** Preference for equipment that fits where you train: in a gym, load you can add beats bands. */
function equipFit(e: LibExercise, setting: Setting): number {
  let s = e.uni ? -0.02 : 0;
  if (setting === 'home') return s;
  if (e.equip === 'band') s -= 0.15;
  else if (e.equip === 'bodyweight' && e.primary !== 'abs' && !HARD_BODYWEIGHT.has(e.id)) s -= 0.1;
  if (setting === 'gym' && e.capped) s -= 0.08;
  return s;
}

export function defaultPick(m: MuscleId): MusclePick {
  const info = MUSCLE_BY_ID.get(m)!;
  return { muscle: m, count: info.defaultCount, focus: info.focus[0].id };
}

/** Valid, unique muscles (max 6), counts 1–6, known focus. Keeps the given order. */
export function sanitizePicks(picks: MusclePick[]): MusclePick[] {
  const seen = new Set<MuscleId>();
  const out: MusclePick[] = [];
  for (const p of picks) {
    const info = MUSCLE_BY_ID.get(p.muscle);
    if (!info || seen.has(p.muscle) || out.length >= MAX_MUSCLES) continue;
    seen.add(p.muscle);
    out.push({
      muscle: p.muscle,
      count: clamp(Math.round(Number(p.count) || info.defaultCount), 1, MAX_COUNT),
      focus: info.focus.some((f) => f.id === p.focus) ? p.focus : info.focus[0].id,
    });
  }
  return out;
}

/* ───────────────────────── 1. pick ───────────────────────── */

interface Pick {
  ex: LibExercise;
  muscle: MuscleId;
  /** 0 = first pick for its muscle */
  rank: number;
  /** index of its muscle in the priority list */
  prio: number;
  adds: string[];
  pinned: boolean;
}

/** Marginal coverage gain of adding facet coverage `c`, weighted by focus `w`. */
function facetGain(
  cov: Record<string, number>,
  w: Record<string, number>,
  c: Record<string, number>,
): { gain: number; adds: string[] } {
  let gain = 0;
  const adds: string[] = [];
  for (const [f, wf] of Object.entries(w)) {
    const before = cov[f] ?? 0;
    const after = 1 - (1 - before) * (1 - SAT * (c[f] ?? 0));
    const g = wf * (after - before);
    gain += g;
    if (g >= 0.06) adds.push(f);
  }
  return { gain, adds };
}

interface PickCtx {
  input: BuildInput;
  avoid: Set<string>;
  rng: () => number;
}

/** Picks for one muscle, given what the rest of the session (`others`) already covers. */
function pickFor(p: MusclePick, prio: number, others: Pick[], ctx: PickCtx): Pick[] {
  const { input } = ctx;
  const info = MUSCLE_BY_ID.get(p.muscle)!;
  const focus = info.focus.find((f) => f.id === p.focus) ?? info.focus[0];
  const cov: Record<string, number> = {};
  for (const o of others) addCoverage(cov, indirectCoverage(o.ex, p.muscle));
  const used = new Set(others.map((o) => o.ex.id));
  // Exercises pinned for another muscle stay free for that muscle.
  const reserved = new Set((input.pinned ?? []).filter((s) => s.muscle !== p.muscle).map((s) => s.id));
  let sessionHeavy = others.some((o) => o.ex.systemic >= 0.8);
  const equipUsed = new Map<string, number>();
  const mine: Pick[] = [];

  const take = (e: LibExercise, adds: string[], pinned: boolean) => {
    mine.push({ ex: e, muscle: p.muscle, rank: mine.length, prio, adds, pinned });
    used.add(e.id);
    addCoverage(cov, coverageFor(e, p.muscle));
    equipUsed.set(e.equip, (equipUsed.get(e.equip) ?? 0) + 1);
    if (e.systemic >= 0.8) sessionHeavy = true;
  };

  // Pinned exercises go in first and count toward the number asked for.
  for (const s of input.pinned ?? []) {
    if (s.muscle !== p.muscle || used.has(s.id)) continue;
    const e = EXERCISE_BY_ID.get(s.id);
    if (!e || !serves(e, p.muscle) || !isAllowed(e, input.setting, input.shoulderCaution)) continue;
    take(e, facetGain(cov, focus.w, coverageFor(e, p.muscle)).adds, !s.kept);
  }

  const pool = candidatesFor(p.muscle, input.setting, input.shoulderCaution);
  const target = Math.max(p.count, mine.length);
  while (mine.length < target) {
    let best: { e: LibExercise; s: number; adds: string[] } | null = null;
    for (const e of pool) {
      if (used.has(e.id) || reserved.has(e.id)) continue;
      const c = coverageFor(e, p.muscle);
      const { gain, adds } = facetGain(cov, focus.w, c);
      const direct = e.primary === p.muscle;
      let s = gain;
      s += 0.12 * e.stretch * Math.max(0, ...Object.values(c));
      // Big muscles open on a compound — when it still adds real coverage.
      if (mine.length === 0 && info.big && e.kind === 'compound' && direct) s += 0.12 * Math.min(1, gain / 0.2);
      s += 0.05 * (1 - e.systemic);
      s += equipFit(e, input.setting);
      if (sessionHeavy && e.systemic >= 0.6) s -= 0.15 * e.systemic;
      if (input.setting === 'gym') s -= 0.02 * (equipUsed.get(e.equip) ?? 0);
      if (!direct) s -= 0.04;
      if (ctx.avoid.has(e.id)) s -= 0.15;
      s += ctx.rng() * 0.06;
      if (!best || s > best.s) best = { e, s, adds };
    }
    if (!best) break;
    take(best.e, best.adds, false);
  }
  return mine;
}

function selectExercises(input: BuildInput, picks: MusclePick[], rng: () => number) {
  const ctx: PickCtx = { input, avoid: new Set(input.avoid ?? []), rng };
  const byMuscle = new Map<MuscleId, Pick[]>();
  // Pass 1 in priority order; pass 2 lets each muscle see every other muscle's picks.
  for (let pass = 0; pass < 2; pass++) {
    picks.forEach((p, prio) => {
      const others = [...byMuscle.entries()].filter(([m]) => m !== p.muscle).flatMap(([, list]) => list);
      byMuscle.set(p.muscle, pickFor(p, prio, others, ctx));
    });
  }
  const chosen = picks.flatMap((p) => byMuscle.get(p.muscle) ?? []);
  const shortfalls: Shortfall[] = picks
    .map((p) => ({ muscle: p.muscle, wanted: p.count, got: byMuscle.get(p.muscle)?.length ?? 0 }))
    .filter((s) => s.got < s.wanted);
  return { chosen, shortfalls };
}

/* ───────────────────────── 2. order ───────────────────────── */

interface Slot {
  p: Pick;
  sets: number;
  imp: number;
}

function importance(p: Pick, selected: Set<MuscleId>): number {
  // Work that also trains other muscles you picked matters more when it is done fresh.
  let multi = 0;
  for (const [m, v] of Object.entries(p.ex.inv) as [MuscleId, number][]) {
    if (m !== p.muscle && selected.has(m)) multi += v;
  }
  if (p.ex.primary !== p.muscle && selected.has(p.ex.primary)) multi += 1;
  return (
    PRIORITY[Math.min(p.prio, PRIORITY.length - 1)] *
    (1 - 0.1 * Math.min(p.rank, 5)) *
    (1 + 0.35 * multi) *
    (1 + 0.5 * p.ex.systemic) *
    (1 + 0.3 * p.ex.skill)
  );
}

interface Sim {
  score: number;
  /** predicted performance per position */
  fresh: number[];
  /** effective sets of this session already on the exercise's primary */
  warm: number[];
}

function simulate(order: Slot[], f0: Partial<Record<MuscleId, number>>): Sim {
  const F: Partial<Record<MuscleId, number>> = { ...f0 };
  const W: Partial<Record<MuscleId, number>> = {};
  let G = 0;
  let score = 0;
  const fresh: number[] = [];
  const warm: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const { p, sets, imp } = order[i];
    const e = p.ex;
    let drag = 0;
    for (const [m, f] of Object.entries(F) as [MuscleId, number][]) drag += limitOf(e, m) * f;
    const q = 1 - LAMBDA * drag - (MU_SYSTEMIC * e.systemic + MU_SKILL * e.skill) * G;
    // Shown with a 20% floor, but scored without one: past the floor more fatigue still costs,
    // so a long session never parks a heavy, technical lift at the end "because it can't get worse".
    fresh.push(clamp(q, 0.2, 1));
    warm.push(W[e.primary] ?? 0);
    score += imp * q * (1 - POSITION_FADE * i);
    if (i > 0 && order[i - 1].p.muscle === p.muscle) score += BLOCK_BONUS;
    for (const [m, v] of worked(e)) {
      F[m] = (F[m] ?? 0) + sets * v * LOCAL;
      W[m] = (W[m] ?? 0) + sets * v;
    }
    for (const m of Object.keys(F) as MuscleId[]) F[m] = F[m]! * DECAY;
    for (const m of Object.keys(W) as MuscleId[]) W[m] = W[m]! * DECAY;
    G += sets * e.systemic * GLOBAL;
  }
  return { score, fresh, warm };
}

/** Isolation work that would tire a muscle a compound still needs (see PRE_EXHAUST_LIMIT). */
export function preExhausts(iso: LibExercise, compound: LibExercise): boolean {
  return iso.kind === 'isolation' && compound.kind === 'compound' && limitOf(compound, iso.primary) >= PRE_EXHAUST_LIMIT;
}

/** Move each compound just ahead of the first isolation it must follow; the rest keeps its place. */
function compoundsFirst(order: Slot[]): Slot[] {
  const out = order.slice();
  for (let j = 0; j < out.length; j++) {
    const c = out[j].p.ex;
    if (c.kind !== 'compound') continue;
    const i = out.findIndex((s, k) => k < j && preExhausts(s.p.ex, c));
    if (i >= 0) out.splice(i, 0, ...out.splice(j, 1));
  }
  return out;
}

/**
 * The simulation's score only, for the order search (thousands of orders per build): the same
 * sums as `simulate`, on per-exercise vectors over the muscles, without allocating per order.
 */
interface Scorer {
  value(order: number[]): number;
  /** Per compound, the isolated muscles done before it that it needs (0 = no pre-exhaustion). */
  preExhaust(order: number[]): number;
}

const MUSCLE_INDEX = new Map(MUSCLES.map((m, i) => [m.id, i]));
const K = MUSCLES.length;

function scorer(slots: Slot[], f0: Partial<Record<MuscleId, number>>): Scorer {
  const n = slots.length;
  const lim = new Float64Array(n * K);
  const load = new Float64Array(n * K);
  const globalCost = new Float64Array(n);
  const globalAdd = new Float64Array(n);
  const imp = new Float64Array(n);
  const muscle = new Int32Array(n);
  const isoBit = new Int32Array(n);
  const needs = new Int32Array(n);
  slots.forEach(({ p, sets, imp: w }, k) => {
    const e = p.ex;
    for (const m of MUSCLES) {
      const i = MUSCLE_INDEX.get(m.id)!;
      lim[k * K + i] = limitOf(e, m.id);
      if (e.kind === 'compound' && limitOf(e, m.id) >= PRE_EXHAUST_LIMIT) needs[k] |= 1 << i;
    }
    for (const [m, v] of worked(e)) load[k * K + MUSCLE_INDEX.get(m)!] += sets * v * LOCAL;
    globalCost[k] = MU_SYSTEMIC * e.systemic + MU_SKILL * e.skill;
    globalAdd[k] = sets * e.systemic * GLOBAL;
    imp[k] = w;
    muscle[k] = MUSCLE_INDEX.get(p.muscle)!;
    if (e.kind === 'isolation') isoBit[k] = 1 << MUSCLE_INDEX.get(e.primary)!;
  });
  const start = new Float64Array(K);
  for (const [m, f] of Object.entries(f0) as [MuscleId, number][]) start[MUSCLE_INDEX.get(m)!] = f;
  const F = new Float64Array(K);
  return {
    value(order) {
      F.set(start);
      let G = 0;
      let score = 0;
      for (let i = 0; i < order.length; i++) {
        const k = order[i];
        let drag = 0;
        for (let m = 0; m < K; m++) drag += lim[k * K + m] * F[m];
        const q = 1 - LAMBDA * drag - globalCost[k] * G;
        score += imp[k] * q * (1 - POSITION_FADE * i);
        if (i > 0 && muscle[order[i - 1]] === muscle[k]) score += BLOCK_BONUS;
        for (let m = 0; m < K; m++) F[m] = (F[m] + load[k * K + m]) * DECAY;
        G += globalAdd[k];
      }
      return score;
    },
    preExhaust(order) {
      let isolated = 0;
      let count = 0;
      for (const k of order) {
        if (isoBit[k]) isolated |= isoBit[k];
        else for (let both = isolated & needs[k]; both; both &= both - 1) count++;
      }
      return count;
    },
  };
}

/**
 * First-improvement local search. Moves: lift out a run of 1–3 neighbours (one exercise, or a
 * whole muscle block) and put it back anywhere else.
 */
function improve(start: number[], value: (order: number[]) => number, allowed: (order: number[]) => boolean): number[] {
  let best = start;
  let bestScore = value(best);
  const n = best.length;
  for (let pass = 0; pass < 40; pass++) {
    let improved = false;
    for (let len = 1; len <= Math.min(3, n - 1); len++) {
      for (let i = 0; i + len <= n; i++) {
        for (let j = 0; j <= n - len; j++) {
          if (j === i) continue;
          const rest = best.slice();
          const seg = rest.splice(i, len);
          rest.splice(j, 0, ...seg);
          if (!allowed(rest)) continue;
          const s = value(rest);
          if (s > bestScore + 1e-9) {
            best = rest;
            bestScore = s;
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

/** Penalty per pre-exhausting step while the first search is still free to pass through one. */
const PRE_EXHAUST_SOFT = 0.3;

/**
 * Best order without pre-exhaustion. A free search runs first, with pre-exhaustion only
 * discouraged, so it can pass through such orders on its way to a better one. Its result is put
 * right and polished under the hard rule, alongside a second search started compounds-first;
 * the better of the two wins.
 */
function orderSlots(slots: Slot[], f0: Partial<Record<MuscleId, number>>): Slot[] {
  const sc = scorer(slots, f0);
  const toIndex = (order: Slot[]) => order.map((x) => slots.indexOf(x));
  const toSlots = (order: number[]) => order.map((k) => slots[k]);
  const clean = (order: number[]) => sc.preExhaust(order) === 0;
  const start = [...slots].sort((a, b) => b.imp - a.imp);
  const free = improve(toIndex(start), (o) => sc.value(o) - PRE_EXHAUST_SOFT * sc.preExhaust(o), () => true);
  const a = improve(toIndex(compoundsFirst(toSlots(free))), sc.value, clean);
  const b = improve(toIndex(compoundsFirst(start)), sc.value, clean);
  return toSlots(sc.value(b) > sc.value(a) + 1e-9 ? b : a);
}

/* ───────────────────────── 3. pair ───────────────────────── */

const PUSH = new Set<MuscleId>(['chest', 'triceps']);
const PULL = new Set<MuscleId>(['back', 'biceps', 'traps']);

function overlap(a: LibExercise, b: LibExercise): number {
  const wa = new Map(worked(a));
  // A press works the front delts, a pull the rear delts: different heads, no real overlap.
  const pushPull = (PUSH.has(a.primary) && PULL.has(b.primary)) || (PULL.has(a.primary) && PUSH.has(b.primary));
  let o = 0;
  for (const [m, v] of worked(b)) {
    if (pushPull && m === 'shoulders') continue;
    o += Math.min(v, wa.get(m) ?? 0);
  }
  return o;
}

/** No shared working muscle and neither limits the other: the order between them doesn't matter. */
function independent(a: LibExercise, b: LibExercise): boolean {
  return overlap(a, b) <= 0.15 && (a.limit[b.primary] ?? 0) < 0.3 && (b.limit[a.primary] ?? 0) < 0.3;
}

/** Two exercises can be supersetted: independent, and light on skill and whole-body cost. */
export function pairable(a: LibExercise, b: LibExercise): boolean {
  if (Math.max(a.skill, b.skill) > 0.55 || Math.max(a.systemic, b.systemic) > 0.55) return false;
  return independent(a, b);
}

function isAntagonist(a: MuscleId, b: MuscleId): boolean {
  return ANTAGONIST[a]?.includes(b) ?? false;
}

function affinity(a: Pick, b: Pick): number {
  if (isAntagonist(a.ex.primary, b.ex.primary)) return 1;
  if (LOWER.has(a.ex.primary) !== LOWER.has(b.ex.primary)) return 0.7;
  return 0.5;
}

function pairUp(order: Slot[]): { order: Slot[]; groups: (string | null)[] } {
  const out = order.slice();
  const groups: (string | null)[] = out.map(() => null);
  let letter = 0;
  for (let i = 0; i < out.length - 1; i++) {
    if (groups[i]) continue;
    let bestJ = -1;
    let bestA = 0;
    for (let j = i + 1; j <= Math.min(out.length - 1, i + 3); j++) {
      if (groups[j] || !pairable(out[i].p.ex, out[j].p.ex)) continue;
      // The partner may only jump over exercises it doesn't interact with (never ahead of a
      // heavier lift for the same muscle).
      let free = true;
      for (let k = i + 1; k < j; k++) if (!independent(out[j].p.ex, out[k].p.ex)) free = false;
      if (!free) continue;
      const a = affinity(out[i].p, out[j].p) - 0.1 * (j - i - 1);
      if (a > bestA) {
        bestA = a;
        bestJ = j;
      }
    }
    if (bestJ < 0) continue;
    const [moved] = out.splice(bestJ, 1);
    out.splice(i + 1, 0, moved);
    const L = String.fromCharCode(65 + letter++);
    groups[i] = L;
    groups[i + 1] = L;
    i++;
  }
  return { order: out, groups };
}

/* ───────────────────────── 4. prescribe ───────────────────────── */

const TIERS: Record<Tier, { reps: string; rest: number; early: string; last: string }> = {
  heavy: { reps: '6-8', rest: 150, early: '2 reps in the tank', last: '1–2 in the tank, never grind' },
  compound: { reps: '8-12', rest: 120, early: '2 reps in the tank', last: '1 rep in the tank' },
  isolation: { reps: '10-15', rest: 90, early: '1–2 reps in the tank', last: 'Close to failure, clean reps' },
  small: { reps: '12-20', rest: 75, early: '1–2 reps in the tank', last: 'Close to failure, clean reps' },
  core: { reps: '12-20', rest: 60, early: 'Slow and controlled', last: 'Close to failure, good form' },
};

export const TIER_LABEL: Record<Tier, string> = {
  heavy: 'Heavy compound',
  compound: 'Compound',
  isolation: 'Isolation',
  small: 'Small muscle',
  core: 'Core / small',
};

export function tierOf(e: LibExercise): Tier {
  if (e.kind === 'compound') {
    const big = MUSCLE_BY_ID.get(e.primary)!.big;
    const loadable = e.equip === 'barbell' || e.equip === 'machine' || e.equip === 'smith' || e.equip === 'dumbbell';
    const highReps = e.reps != null && (parseRepRange(e.reps.replace(/–/g, '-'))?.lo ?? 0) >= 12;
    return big && loadable && e.systemic >= 0.6 && !highReps ? 'heavy' : 'compound';
  }
  if (e.primary === 'abs' || e.primary === 'forearms' || e.primary === 'calves') return 'core';
  if (e.primary === 'biceps' || e.primary === 'triceps' || e.primary === 'traps' || e.primary === 'shoulders') return 'small';
  return 'isolation';
}

function prescribe(e: LibExercise, workSets: number, warmSets: number) {
  const tier = tierOf(e);
  const t = TIERS[tier];
  const veryHeavy = tier === 'heavy' && e.systemic >= 0.9;
  const reps = e.reps ? e.reps.replace(/–/g, '-') : veryHeavy ? '5-8' : t.reps;
  const restSec = veryHeavy ? 180 : t.rest;
  const rows: SetRow[] = [];
  const w = (r: string, guide: string) => rows.push({ label: 'Warm-up', reps: r, guide, warmup: true });
  const cold = warmSets < WARM_SETS;
  const loaded = e.equip !== 'bodyweight' && e.equip !== 'band';
  if (cold && !loaded) {
    if (e.kind === 'compound') w('6-8', 'Easy version, slow and smooth');
  } else if (cold && tier === 'heavy') {
    w('8-10', 'About 50% of your work weight');
    w('4-5', 'About 70%');
    if (veryHeavy) w('2-3', 'About 85%');
  } else if (cold && tier === 'compound') {
    w('8-10', 'About 50% of your work weight');
    w('4-6', 'About 70%');
  } else if (cold) {
    w('10-12', 'About 50%, easy');
  } else if (tier === 'heavy') {
    // Muscle is warm, but a heavy lift still gets one ramp set to groove the pattern.
    w('3-5', 'About 70%');
  }
  const hold = /\d\s*s\b/.test(reps);
  for (let i = 1; i <= workSets; i++) {
    rows.push({
      label: `Set ${i}`,
      reps,
      guide: hold ? 'Hold with good form' : i < workSets ? t.early : t.last,
      warmup: false,
    });
  }
  return { tier, reps, restSec, rows };
}

/** Seconds of work in one set (both sides for one-sided moves). */
export function workSeconds(e: LibExercise, reps: string): number {
  const t = reps.toLowerCase();
  let sec: number;
  const hold = t.match(/(\d+)\s*-\s*(\d+)\s*s\b/);
  if (hold) sec = (Number(hold[1]) + Number(hold[2])) / 2;
  else if (/\d\s*m\b|roll/.test(t)) sec = 45;
  else {
    const r = parseRepRange(t);
    sec = r ? ((r.lo + r.hi) / 2) * 3.2 + 6 : 40;
  }
  if (e.uni || /side/.test(t)) sec *= 2;
  return clamp(sec, 20, 150);
}

/** Session length in minutes (rounded to 5): warm-ups, work, rests and moving between stations. */
export function estimateMinutes(list: BuiltExercise[]): number {
  let t = 0;
  const warmups = (b: BuiltExercise) =>
    b.rows.filter((r) => r.warmup).length * (0.6 * workSeconds(b.ex, b.reps) + 45);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (a.group && b && b.group === a.group) {
      const wa = workSeconds(a.ex, a.reps);
      const wb = workSeconds(b.ex, b.reps);
      t += warmups(a) + warmups(b) + 60;
      t += Math.max(a.workSets, b.workSets) * (wa + SUPERSET_GAP_SEC + wb + a.restSec);
      i++;
      continue;
    }
    t += warmups(a) + a.workSets * (workSeconds(a.ex, a.reps) + a.restSec) + 45;
  }
  if (list.length) t -= list[list.length - 1].restSec;
  return list.length ? Math.max(5, Math.round(t / 300) * 5) : 0;
}

export function bandOf(sets: number): VolumeBand {
  if (sets < 4) return 'light';
  if (sets <= 10) return 'productive';
  if (sets <= 12) return 'high';
  return 'over';
}

export const BAND_LABEL: Record<VolumeBand, string> = {
  light: 'Light',
  productive: 'Productive',
  high: 'High',
  over: 'Past the plateau',
};

function volumeOf(list: BuiltExercise[], picked: MuscleId[]): VolumeRow[] {
  const total = new Map<MuscleId, number>();
  for (const b of list) {
    for (const [m, v] of worked(b.ex)) total.set(m, (total.get(m) ?? 0) + b.workSets * v);
  }
  const round = (v: number) => Math.round(v * 2) / 2;
  const rows: VolumeRow[] = picked.map((m) => {
    const sets = round(total.get(m) ?? 0);
    return { muscle: m, sets, band: bandOf(sets), picked: true };
  });
  const others = [...total.entries()]
    .filter(([m, v]) => !picked.includes(m) && v >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([m, v]) => ({ muscle: m, sets: round(v), band: bandOf(round(v)), picked: false }));
  return [...rows, ...others];
}

/* ───────────────────────── reasons ───────────────────────── */

function explain(list: BuiltExercise[], i: number, warm: number[], firstMuscle: MuscleId | null): string[] {
  const b = list[i];
  const e = b.ex;
  const info = MUSCLE_BY_ID.get(b.muscle)!;
  const out: string[] = [];
  const earlier = list.slice(0, i);
  const later = list.slice(i + 1);
  const name = (m: MuscleId) => lower(muscleLabel(m));

  if (b.pinned) out.push('You added this one.');
  else if (b.adds.length) out.push(`Picked for the ${joinWords(b.adds.map((f) => lower(info.facets[f] ?? f)))}.`);
  else out.push(`More ${name(b.muscle)} work from another angle.`);
  if (e.primary !== b.muscle) out.push(`Counts for ${name(b.muscle)} as well as ${name(e.primary)}.`);
  if (e.stretch >= 0.8) out.push('Loads the muscle at long length — a strong growth signal.');

  const protects = (Object.entries(e.limit) as [MuscleId, number][])
    .filter(([m, v]) => v >= 0.4 && m !== e.primary && later.some((x) => x.ex.primary === m))
    .map(([m]) => name(m));
  if (i === 0) {
    out.push(
      b.muscle === firstMuscle
        ? 'First, while you are fresh: your #1 muscle.'
        : e.kind === 'compound'
          ? 'First, while you are fresh: the biggest lift goes first.'
          : 'First, while you are fresh.',
    );
  } else if (b.muscle === firstMuscle && earlier.every((x) => x.muscle !== firstMuscle) && b.freshness >= 0.95) {
    out.push(`Your #1 muscle, still at full strength here: nothing before it tires the ${name(b.muscle)}.`);
  }
  if (protects.length) {
    out.push(`Before the ${joinWords(protects)} work, so tired ${joinWords(protects)} don't cut it short.`);
  } else if (e.primary === 'forearms' && earlier.some((x) => (x.ex.limit.forearms ?? 0) >= 0.3)) {
    const held = earlier.filter((x) => (x.ex.limit.forearms ?? 0) >= 0.3).map((x) => x.ex.name);
    out.push(`Grip work comes late, so tired forearms don't hold back ${joinWords(held.slice(0, 2))}.`);
  } else if (e.primary === 'abs' && earlier.some((x) => (x.ex.limit.abs ?? 0) >= 0.3)) {
    const held = earlier.filter((x) => (x.ex.limit.abs ?? 0) >= 0.3).map((x) => x.ex.name);
    out.push(`Abs come after ${joinWords(held.slice(0, 2))}: a tired core makes a weaker brace.`);
  } else if (i > 0 && e.kind === 'isolation' && warm[i] >= WARM_SETS) {
    const feeder = earlier.find((x) => x.ex.primary !== e.primary && loadOn(x.ex, e.primary) >= 0.3);
    if (feeder) out.push(`${feeder.ex.name} already warmed up the ${name(e.primary)}, so no warm-up sets.`);
  }

  if (b.group) {
    const partner = list.find((x, j) => j !== i && x.group === b.group);
    if (partner) {
      const opp = isAntagonist(e.primary, partner.ex.primary);
      out.push(
        `Superset ${b.group} with ${partner.ex.name}${opp ? ' (opposite muscle)' : ''}: alternate sets — saves time, neither gets weaker.`,
      );
    }
  }
  return out;
}

/** "Front delts already get work from your presses" — parts covered by other muscles' exercises. */
function sharedNotes(list: BuiltExercise[], picks: MusclePick[]): string[] {
  const notes: string[] = [];
  for (const p of picks) {
    const info = MUSCLE_BY_ID.get(p.muscle)!;
    const focus = info.focus.find((f) => f.id === p.focus) ?? info.focus[0];
    const others = list.filter((b) => b.muscle !== p.muscle);
    const own = list.filter((b) => b.muscle === p.muscle);
    for (const [f, wf] of Object.entries(focus.w)) {
      if (wf < 0.2) continue;
      const from = others.filter((b) => (indirectCoverage(b.ex, p.muscle)[f] ?? 0) >= 0.12);
      const ownCov = Math.max(0, ...own.map((b) => coverageFor(b.ex, p.muscle)[f] ?? 0));
      if (from.length >= 2 && ownCov < 0.3) {
        notes.push(
          `${info.label} · ${lower(info.facets[f])}: already covered by ${joinWords(from.slice(0, 2).map((b) => b.ex.name))}, so the ${lower(info.label)} picks go to other parts.`,
        );
      }
    }
  }
  return notes.slice(0, 2);
}

/* ───────────────────────── public API ───────────────────────── */

export function buildWorkout(input: BuildInput): BuildResult {
  const picks = sanitizePicks(input.picks);
  const workSets = clamp(Math.round(input.sets) || 3, 1, 6);
  if (!picks.length) return { exercises: [], volume: [], minutes: 0, shortfalls: [], notes: [] };
  const rng = mulberry32(input.seed);
  const { chosen, shortfalls } = selectExercises(input, picks, rng);
  const selected = new Set(picks.map((p) => p.muscle));

  // Residual fatigue from recent sessions: a muscle at 40% recovery starts the day part-tired.
  const f0: Partial<Record<MuscleId, number>> = {};
  for (const [m, pct] of Object.entries(input.readiness ?? {}) as [MuscleId, number | null][]) {
    if (pct != null && pct < 100) f0[m] = 0.35 * (1 - pct / 100);
  }

  const slots: Slot[] = chosen.map((p) => ({ p, sets: workSets, imp: importance(p, selected) }));
  let order = orderSlots(slots, f0);
  let groups: (string | null)[] = order.map(() => null);
  if (input.supersets) ({ order, groups } = pairUp(order));
  const sim = simulate(order, f0);

  const list: BuiltExercise[] = order.map((s, i) => {
    const rx = prescribe(s.p.ex, workSets, sim.warm[i]);
    return {
      ex: s.p.ex,
      muscle: s.p.muscle,
      tier: rx.tier,
      workSets,
      reps: rx.reps,
      restSec: rx.restSec,
      rows: rx.rows,
      group: groups[i],
      freshness: Math.round(sim.fresh[i] * 100) / 100,
      adds: s.p.adds,
      rank: s.p.rank,
      pinned: s.p.pinned,
      why: [],
    };
  });
  // A superset rests once per round, as long as the longer of the two.
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].group && list[i + 1].group === list[i].group) {
      const r = Math.max(list[i].restSec, list[i + 1].restSec);
      list[i].restSec = r;
      list[i + 1].restSec = r;
    }
  }
  const firstMuscle = picks[0]?.muscle ?? null;
  list.forEach((b, i) => (b.why = explain(list, i, sim.warm, firstMuscle)));

  const volume = volumeOf(
    list,
    picks.map((p) => p.muscle),
  );
  const minutes = estimateMinutes(list);

  const notes: string[] = [];
  for (const s of shortfalls) {
    notes.push(
      `${muscleLabel(s.muscle)}: only ${s.got} of ${s.wanted} exercise${s.wanted === 1 ? '' : 's'} fit ${SETTING_LABEL[input.setting]}.`,
    );
  }
  for (const p of picks) {
    const pct = input.readiness?.[p.muscle];
    if (pct != null && pct < 60) {
      notes.push(`${muscleLabel(p.muscle)} is ${pct}% recovered — go lighter today or pick another muscle.`);
    }
  }
  notes.push(...sharedNotes(list, picks));
  for (const v of volume) {
    if (v.picked && v.band === 'over') {
      notes.push(
        `${muscleLabel(v.muscle)}: ${v.sets} sets in one session. Past about 11, extra sets add fatigue more than growth — fewer exercises or sets is enough.`,
      );
    }
  }
  if (minutes > 90) notes.push(`About ${minutes} min — long. Fewer exercises or 2 sets each keeps the quality up.`);
  if (
    input.shoulderCaution &&
    picks.some((p) => LIBRARY.some((e) => SHOULDER_RISK.has(e.id) && serves(e, p.muscle) && fitsSetting(e, input.setting)))
  ) {
    notes.push('Shoulder caution is on (Settings), so dips are left out.');
  }

  return { exercises: list, volume, minutes, shortfalls, notes };
}

/** Exercises that could replace one slot, most similar first. */
export function swapOptions(
  b: BuiltExercise,
  setting: Setting,
  usedIds: Set<string>,
  shoulderCaution = false,
): LibExercise[] {
  const target = coverageFor(b.ex, b.muscle);
  const norm = (c: Record<string, number>) => Math.sqrt(Object.values(c).reduce((s, v) => s + v * v, 0)) || 1;
  const cos = (c: Record<string, number>) => {
    let dot = 0;
    for (const [f, v] of Object.entries(c)) dot += v * (target[f] ?? 0);
    return dot / (norm(c) * norm(target));
  };
  return candidatesFor(b.muscle, setting, shoulderCaution)
    .filter((e) => e.id !== b.ex.id && !usedIds.has(e.id))
    .map((e) => ({
      e,
      s:
        cos(coverageFor(e, b.muscle)) +
        (e.primary === b.muscle ? 0.1 : 0) +
        (e.kind === b.ex.kind ? 0.08 : 0) +
        0.05 * e.stretch +
        equipFit(e, setting),
    }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 8)
    .map((x) => x.e);
}

/** Slots of a build, to hold it in place (swap, remove, save as a template). */
export function slotsOf(list: BuiltExercise[]): PinnedSlot[] {
  // In pick order, not session order: a held slot's place among its muscle's slots is its rank
  // on the rebuild, and rank weighs into the order — so the rebuild comes out the same.
  return [...list]
    .sort((a, b) => a.rank - b.rank)
    .map((b) => (b.pinned ? { id: b.ex.id, muscle: b.muscle } : { id: b.ex.id, muscle: b.muscle, kept: true }));
}

/** Recovery-grid percentages mapped onto builder muscles (forearms have no group → unknown). */
export function readinessFrom(statuses: MuscleStatus[]): Partial<Record<MuscleId, number | null>> {
  const out: Partial<Record<MuscleId, number | null>> = {};
  for (const m of MUSCLES) {
    if (!m.recovery) continue;
    out[m.id] = statuses.find((s) => s.id === m.recovery)?.pct ?? null;
  }
  return out;
}

/**
 * "Pick what's ready": the most recovered big muscle, then muscles from the same half of the body
 * (abs go with either), so the suggestion makes one sensible session.
 */
export function suggestReady(readiness: Partial<Record<MuscleId, number | null>>, n = 3): MuscleId[] {
  const score = (m: MuscleId) => readiness[m] ?? 100;
  const ranked = [...MUSCLES].sort((a, b) => score(b.id) - score(a.id) || Number(b.big) - Number(a.big));
  const ready = ranked.filter((m) => score(m.id) >= 90);
  const pool = ready.length >= n ? ready : ranked;
  const anchor = pool.find((m) => m.big) ?? pool[0];
  const lowerDay = LOWER.has(anchor.id);
  const out: MuscleId[] = [anchor.id];
  for (const m of pool) {
    if (out.length >= n) break;
    if (!out.includes(m.id) && (m.id === 'abs' || LOWER.has(m.id) === lowerDay)) out.push(m.id);
  }
  for (const m of pool) {
    if (out.length >= n) break;
    if (!out.includes(m.id)) out.push(m.id);
  }
  return out;
}

/** The build as workout-player exercises (superset neighbours alternate set by set). */
export function toPlayerExercises(list: BuiltExercise[]): PlayerExercise[] {
  return list.map((b) => ({
    name: b.ex.name,
    media: b.ex.media,
    muscle: b.muscle === b.ex.primary ? muscleLabel(b.muscle) : `${muscleLabel(b.muscle)} · ${muscleLabel(b.ex.primary)}`,
    sets: b.rows.map((r) => [r.label, r.reps, r.guide]),
    rest: `${b.restSec} sec`,
    cue: b.ex.cues[0] ?? null,
    group: b.group,
  }));
}

/** "Chest + Biceps + Forearms" — names a custom session. */
export function sessionTitle(picks: MusclePick[]): string {
  return picks.map((p) => muscleLabel(p.muscle)).join(' + ') || 'Custom';
}

export { CUSTOM_NOTE_PREFIX } from '../lib/trainingLog';
