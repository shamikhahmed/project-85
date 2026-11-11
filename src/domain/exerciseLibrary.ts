/**
 * Exercise library for the muscle builder.
 *
 * Every entry is a Gym visual animation picked by its own library name, so the GIF shows the
 * exercise the name says. Each exercise carries the data the builder reasons with:
 *  - facets: which parts of its muscle it covers (e.g. chest → flat / incline / fly)
 *  - also:   other muscles it can stand in for (a Bulgarian split squat can be a glute pick)
 *  - inv:    how much it works other muscles, as a fraction of a set
 *  - limit:  how much a tired *other* muscle cuts this lift short (tired triceps → weaker bench)
 *  - stretch, skill, systemic: loaded-stretch emphasis, technique demand, whole-body fatigue
 */
import type { MuscleGroup } from './muscleRecovery';

export type MuscleId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps';

export type Equip = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'smith' | 'bodyweight' | 'band' | 'kettlebell';
export type Kind = 'compound' | 'isolation';
/** Where you train today: what equipment the builder may use. */
export type Setting = 'gym' | 'dumbbells' | 'home';

export interface FocusOption {
  id: string;
  label: string;
  /** facet → weight, sums to 1 */
  w: Record<string, number>;
}

export interface MuscleInfo {
  id: MuscleId;
  label: string;
  facets: Record<string, string>;
  focus: FocusOption[];
  defaultCount: number;
  /** Muscle group used by the recovery grid, if any. */
  recovery: MuscleGroup | null;
  /** Word the recovery grid understands, used when logging. */
  logWord: string;
  big: boolean;
}

const f = (id: string, label: string, w: Record<string, number>): FocusOption => ({ id, label, w });

export const MUSCLES: MuscleInfo[] = [
  {
    id: 'chest',
    label: 'Chest',
    facets: { flat: 'Mid chest', incline: 'Upper chest', fly: 'Chest stretch (fly)' },
    focus: [
      f('balanced', 'Balanced', { flat: 0.38, incline: 0.37, fly: 0.25 }),
      f('upper', 'Upper chest', { incline: 0.65, fly: 0.2, flat: 0.15 }),
      f('mid', 'Mid & lower', { flat: 0.6, fly: 0.3, incline: 0.1 }),
    ],
    defaultCount: 3,
    recovery: 'chest',
    logWord: 'chest',
    big: true,
  },
  {
    id: 'back',
    label: 'Back',
    facets: { vertical: 'Lats (width)', horizontal: 'Mid-back (thickness)', lat: 'Lat stretch', lower: 'Lower back' },
    focus: [
      f('balanced', 'Balanced', { vertical: 0.4, horizontal: 0.4, lat: 0.15, lower: 0.05 }),
      f('width', 'Width', { vertical: 0.6, lat: 0.3, horizontal: 0.1 }),
      f('thickness', 'Thickness', { horizontal: 0.7, vertical: 0.2, lower: 0.1 }),
      f('lower', 'Lower back', { lower: 0.6, horizontal: 0.25, vertical: 0.15 }),
    ],
    defaultCount: 3,
    recovery: 'back',
    logWord: 'back',
    big: true,
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    facets: { front: 'Front delts', side: 'Side delts', rear: 'Rear delts' },
    focus: [
      f('balanced', 'Balanced', { front: 0.25, side: 0.45, rear: 0.3 }),
      f('side-rear', 'Side & rear', { side: 0.55, rear: 0.4, front: 0.05 }),
      f('front', 'Front', { front: 0.6, side: 0.3, rear: 0.1 }),
      f('rear', 'Rear', { rear: 0.65, side: 0.3, front: 0.05 }),
    ],
    defaultCount: 3,
    recovery: 'shoulders',
    logWord: 'delts',
    big: true,
  },
  {
    id: 'biceps',
    label: 'Biceps',
    facets: { long: 'Long head', short: 'Short head', brach: 'Brachialis' },
    focus: [
      f('balanced', 'Balanced', { long: 0.4, short: 0.35, brach: 0.25 }),
      f('long', 'Long head', { long: 0.7, short: 0.15, brach: 0.15 }),
      f('short', 'Short head', { short: 0.7, long: 0.15, brach: 0.15 }),
      f('brach', 'Thickness', { brach: 0.7, long: 0.15, short: 0.15 }),
    ],
    defaultCount: 2,
    recovery: 'biceps',
    logWord: 'biceps',
    big: false,
  },
  {
    id: 'triceps',
    label: 'Triceps',
    facets: { long: 'Long head', lateral: 'Outer heads', press: 'Pressing strength' },
    focus: [
      f('balanced', 'Balanced', { long: 0.4, lateral: 0.35, press: 0.25 }),
      f('long', 'Long head', { long: 0.7, lateral: 0.15, press: 0.15 }),
      f('lateral', 'Outer heads', { lateral: 0.7, long: 0.15, press: 0.15 }),
      f('press', 'Heavy press', { press: 0.65, long: 0.2, lateral: 0.15 }),
    ],
    defaultCount: 2,
    recovery: 'triceps',
    logWord: 'triceps',
    big: false,
  },
  {
    id: 'forearms',
    label: 'Forearms',
    facets: { flexors: 'Flexors', extensors: 'Extensors', brachio: 'Brachioradialis', grip: 'Grip' },
    focus: [
      f('balanced', 'Balanced', { flexors: 0.3, extensors: 0.25, brachio: 0.25, grip: 0.2 }),
      f('size', 'Size', { flexors: 0.4, brachio: 0.4, extensors: 0.2 }),
      f('grip', 'Grip', { grip: 0.6, flexors: 0.3, brachio: 0.1 }),
    ],
    defaultCount: 2,
    recovery: null,
    logWord: 'forearms',
    big: false,
  },
  {
    id: 'abs',
    label: 'Abs',
    facets: { upper: 'Upper abs', lower: 'Lower abs', obliques: 'Obliques', stability: 'Core stability' },
    focus: [
      f('balanced', 'Balanced', { upper: 0.3, lower: 0.3, obliques: 0.2, stability: 0.2 }),
      f('lower', 'Lower abs', { lower: 0.6, upper: 0.2, obliques: 0.1, stability: 0.1 }),
      f('obliques', 'Obliques', { obliques: 0.6, upper: 0.15, lower: 0.15, stability: 0.1 }),
      f('stability', 'Stability', { stability: 0.6, obliques: 0.2, lower: 0.1, upper: 0.1 }),
    ],
    defaultCount: 2,
    recovery: 'core',
    logWord: 'abs',
    big: false,
  },
  {
    id: 'quads',
    label: 'Quads',
    facets: { squat: 'Squat pattern', single: 'Single leg', ext: 'Knee extension' },
    focus: [
      f('balanced', 'Balanced', { squat: 0.5, single: 0.25, ext: 0.25 }),
      f('squat', 'Heavy squat', { squat: 0.7, ext: 0.15, single: 0.15 }),
      f('single', 'Single leg', { single: 0.6, squat: 0.2, ext: 0.2 }),
    ],
    defaultCount: 3,
    recovery: 'quads',
    logWord: 'quads',
    big: true,
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    facets: { hinge: 'Hip hinge', curl: 'Leg curl' },
    focus: [
      f('balanced', 'Balanced', { hinge: 0.5, curl: 0.5 }),
      f('hinge', 'Hinge', { hinge: 0.75, curl: 0.25 }),
      f('curl', 'Curl', { curl: 0.75, hinge: 0.25 }),
    ],
    defaultCount: 2,
    recovery: 'hamstrings',
    logWord: 'hamstrings',
    big: true,
  },
  {
    id: 'glutes',
    label: 'Glutes',
    facets: { thrust: 'Hip-thrust squeeze', stretch: 'Glute stretch', abduct: 'Side glutes' },
    focus: [
      f('balanced', 'Balanced', { thrust: 0.4, stretch: 0.35, abduct: 0.25 }),
      f('thrust', 'Max squeeze', { thrust: 0.65, stretch: 0.2, abduct: 0.15 }),
      f('side', 'Side glutes', { abduct: 0.65, thrust: 0.2, stretch: 0.15 }),
      f('stretch', 'Deep stretch', { stretch: 0.65, thrust: 0.2, abduct: 0.15 }),
    ],
    defaultCount: 2,
    recovery: 'glutes',
    logWord: 'glutes',
    big: true,
  },
  {
    id: 'calves',
    label: 'Calves',
    facets: { gastroc: 'Upper calf (straight-leg)', soleus: 'Soleus (bent-knee)' },
    focus: [
      f('balanced', 'Balanced', { gastroc: 0.6, soleus: 0.4 }),
      f('gastroc', 'Straight-leg', { gastroc: 0.8, soleus: 0.2 }),
      f('soleus', 'Bent-knee', { soleus: 0.75, gastroc: 0.25 }),
    ],
    defaultCount: 2,
    recovery: 'calves',
    logWord: 'calves',
    big: false,
  },
  {
    id: 'traps',
    label: 'Traps',
    facets: { upper: 'Upper traps', mid: 'Mid & lower traps' },
    focus: [
      f('balanced', 'Balanced', { upper: 0.6, mid: 0.4 }),
      f('upper', 'Upper', { upper: 0.8, mid: 0.2 }),
      f('mid', 'Mid & lower', { mid: 0.75, upper: 0.25 }),
    ],
    defaultCount: 2,
    recovery: 'back',
    logWord: 'traps',
    big: false,
  },
];

export const MUSCLE_BY_ID = new Map(MUSCLES.map((m) => [m.id, m]));
export const muscleLabel = (id: MuscleId) => MUSCLE_BY_ID.get(id)?.label ?? id;

export interface LibExercise {
  id: string;
  name: string;
  /** Gym visual animation id */
  media: string;
  primary: MuscleId;
  kind: Kind;
  equip: Equip;
  facets: Record<string, number>;
  also: Partial<Record<MuscleId, Record<string, number>>>;
  inv: Partial<Record<MuscleId, number>>;
  limit: Partial<Record<MuscleId, number>>;
  /** 0–1: how much load it puts on the muscle in its stretched position */
  stretch: number;
  /** 0–1: technique / balance demand (suffers most when you're tired) */
  skill: number;
  /** 0–1: whole-body fatigue it costs */
  systemic: number;
  /** One side at a time */
  uni: boolean;
  /** Needs a pull-up bar, dip station or hanging station */
  bar: boolean;
  /** Needs a bench (dumbbell setups have one; home does not) */
  bench: boolean;
  /** Fixed rep text (holds, carries); otherwise from the prescription tier */
  reps?: string;
  /** Load is capped by what you can hold (goblet squat): fine at home, second choice in a gym */
  capped: boolean;
  cues: string[];
}

interface Opts {
  also?: LibExercise['also'];
  limit?: LibExercise['limit'];
  stretch?: number;
  skill?: number;
  systemic?: number;
  uni?: boolean;
  bar?: boolean;
  bench?: boolean;
  reps?: string;
  capped?: boolean;
}

const SKILL: Record<Kind, Record<Equip, number>> = {
  compound: { barbell: 0.7, dumbbell: 0.45, smith: 0.35, machine: 0.15, cable: 0.2, bodyweight: 0.4, band: 0.2, kettlebell: 0.5 },
  isolation: { barbell: 0.3, dumbbell: 0.25, smith: 0.2, machine: 0.05, cable: 0.15, bodyweight: 0.2, band: 0.1, kettlebell: 0.3 },
};
const SYSTEMIC: Record<Equip, number> = {
  barbell: 0.6,
  dumbbell: 0.45,
  smith: 0.5,
  machine: 0.35,
  cable: 0.3,
  bodyweight: 0.35,
  band: 0.2,
  kettlebell: 0.5,
};
const LEGS: MuscleId[] = ['quads', 'hamstrings', 'glutes'];
const SMALL: MuscleId[] = ['biceps', 'triceps', 'forearms'];

function x(
  id: string,
  name: string,
  media: string,
  primary: MuscleId,
  kind: Kind,
  equip: Equip,
  facets: Record<string, number>,
  inv: LibExercise['inv'],
  cues: string[],
  o: Opts = {},
): LibExercise {
  const legs = kind === 'compound' && LEGS.includes(primary);
  const systemic = o.systemic ?? (kind === 'compound' ? Math.min(1, SYSTEMIC[equip] + (legs ? 0.15 : 0)) : equip === 'machine' ? 0.1 : 0.12);
  // Default weak links: for compounds, the small helpers limit the lift more than they are worked.
  const limit: LibExercise['limit'] = {};
  if (kind === 'compound') {
    for (const [m, v] of Object.entries(inv) as [MuscleId, number][]) {
      limit[m] = Math.min(0.85, SMALL.includes(m) ? v * 1.4 : v * 0.6);
    }
  }
  return {
    id,
    name,
    media,
    primary,
    kind,
    equip,
    facets,
    also: o.also ?? {},
    inv,
    limit: { ...limit, ...o.limit },
    stretch: o.stretch ?? 0.5,
    skill: o.skill ?? SKILL[kind][equip],
    systemic,
    uni: o.uni ?? false,
    bar: o.bar ?? false,
    bench: o.bench ?? false,
    reps: o.reps,
    capped: o.capped ?? false,
    cues,
  };
}

const C = 'compound';
const I = 'isolation';

export const LIBRARY: LibExercise[] = [
  // ───────── Chest ─────────
  x('bb-bench', 'Barbell bench press', '0025-EIeI8Vf', 'chest', C, 'barbell', { flat: 1 }, { triceps: 0.5, shoulders: 0.5 },
    ['Shoulder blades pinched, feet planted', 'Bar to lower chest, elbows about 45°', 'Heavy sets: spotter or safety pins'],
    { limit: { triceps: 0.8, shoulders: 0.5 }, skill: 0.75, bench: true }),
  x('db-bench', 'Dumbbell bench press', '0289-SpYC0Kp', 'chest', C, 'dumbbell', { flat: 1 }, { triceps: 0.5, shoulders: 0.5 },
    ['Kick the dumbbells up from your knees', 'Lower until a deep chest stretch', 'Press up and slightly in'],
    { limit: { triceps: 0.7, shoulders: 0.5 }, stretch: 0.7, bench: true }),
  x('incline-bb', 'Incline barbell press', '0047-3TZduzM', 'chest', C, 'barbell', { incline: 1 }, { shoulders: 0.6, triceps: 0.5 },
    ['Bench at 30°, not steeper', 'Bar to upper chest', 'Heavy sets: spotter or safety pins'],
    { limit: { triceps: 0.7, shoulders: 0.6 }, skill: 0.75, bench: true }),
  x('incline-db', 'Incline dumbbell press', '0314-ns0SIbU', 'chest', C, 'dumbbell', { incline: 1 }, { shoulders: 0.6, triceps: 0.5 },
    ['Bench at 30°', 'Elbows under the wrists', 'Deep stretch at the bottom'],
    { limit: { triceps: 0.7, shoulders: 0.6 }, stretch: 0.7, bench: true }),
  x('machine-press', 'Machine chest press', '0577-T0yTjgW', 'chest', C, 'machine', { flat: 0.9 }, { triceps: 0.5, shoulders: 0.4 },
    ['Seat so handles line up with mid chest', 'Shoulders down and back', 'Slow on the way back'],
    { limit: { triceps: 0.6, shoulders: 0.3 } }),
  x('machine-incline', 'Incline machine press', '1299-jHAnWmT', 'chest', C, 'machine', { incline: 0.9 }, { shoulders: 0.5, triceps: 0.5 },
    ['Handles at upper-chest height', 'Chest up, shoulders back', 'Full stretch every rep'],
    { limit: { triceps: 0.6, shoulders: 0.4 } }),
  x('smith-bench', 'Smith machine bench press', '0748-trqKQv2', 'chest', C, 'smith', { flat: 1 }, { triceps: 0.5, shoulders: 0.5 },
    ['Bench so the bar lands on lower chest', 'Set the safety stops first', 'Elbows about 45°'],
    { limit: { triceps: 0.7, shoulders: 0.5 }, bench: true }),
  x('smith-incline', 'Smith incline press', '0757-5v7KYld', 'chest', C, 'smith', { incline: 1 }, { shoulders: 0.6, triceps: 0.5 },
    ['Bench at 30°, bar over upper chest', 'Set the safety stops first', 'Control the lowering'],
    { limit: { triceps: 0.7, shoulders: 0.6 }, bench: true }),
  x('cable-fly', 'Cable fly', '0188-xLYSdtg', 'chest', I, 'cable', { fly: 1, flat: 0.2 }, { shoulders: 0.2 },
    ['Pulleys at shoulder height, one step forward', 'Soft elbows, hug a big tree', 'Feel the stretch, then squeeze'],
    { stretch: 0.7 }),
  x('low-high-fly', 'Low-to-high cable fly', '0179-FVmZVhk', 'chest', I, 'cable', { fly: 0.8, incline: 0.4 }, { shoulders: 0.3 },
    ['Pulleys low, sweep up to chin height', 'Palms up, soft elbows', 'Squeeze the upper chest'],
    { stretch: 0.6 }),
  x('pec-deck', 'Pec deck', '0596-v3xmPAR', 'chest', I, 'machine', { fly: 1 }, { shoulders: 0.2 },
    ['Handles at chest height', 'Let the arms open for a stretch', 'Squeeze for a second'],
    { stretch: 0.6 }),
  x('db-fly', 'Dumbbell fly', '0308-yz9nUhF', 'chest', I, 'dumbbell', { fly: 1 }, { shoulders: 0.2 },
    ['Light weight, slightly bent elbows', 'Lower slowly to a deep stretch', 'Bring the dumbbells together over the chest'],
    { stretch: 0.9, bench: true }),
  x('incline-db-fly', 'Incline dumbbell fly', '0319-ESOd5Pl', 'chest', I, 'dumbbell', { fly: 0.8, incline: 0.4 }, { shoulders: 0.3 },
    ['Bench at 30°', 'Slow stretch at the bottom', 'Arc up, do not press'],
    { stretch: 0.9, bench: true }),
  x('chest-dip', 'Chest dip', '0251-9WTm7dq', 'chest', C, 'bodyweight', { flat: 0.7, fly: 0.3 }, { triceps: 0.6, shoulders: 0.5 },
    ['Lean forward, elbows slightly out', 'Lower until shoulders are just below elbows', 'Skip if the front of the shoulder hurts'],
    { limit: { triceps: 0.8, shoulders: 0.6 }, stretch: 0.85, bar: true }),
  x('push-up', 'Push-up', '0662-I4hDWkc', 'chest', C, 'bodyweight', { flat: 0.9 }, { triceps: 0.5, shoulders: 0.4, abs: 0.2 },
    ['Body in one straight line', 'Chest to a fist from the floor', 'Elbows about 45°'],
    { limit: { triceps: 0.6, abs: 0.2 }, reps: '8–20', skill: 0.25, systemic: 0.25 }),
  x('decline-push-up', 'Feet-up push-up', '0279-i5cEhka', 'chest', C, 'bodyweight', { incline: 0.9 }, { shoulders: 0.5, triceps: 0.5, abs: 0.2 },
    ['Feet on a bench or step', 'Hands under the shoulders', 'Hits the upper chest'],
    { limit: { triceps: 0.6, shoulders: 0.4 }, reps: '6–15', skill: 0.3, systemic: 0.25 }),
  x('wide-push-up', 'Wide push-up', '1311-JmMVpR3', 'chest', C, 'bodyweight', { flat: 0.8, fly: 0.2 }, { triceps: 0.4, shoulders: 0.4, abs: 0.2 },
    ['Hands a bit wider than shoulders', 'Lower slowly for the stretch', 'Stop if shoulders pinch'],
    { reps: '8–20', stretch: 0.6, skill: 0.25, systemic: 0.25 }),
  x('band-press', 'Band chest press', '3124-4x5Okof', 'chest', C, 'band', { flat: 0.8 }, { triceps: 0.4, shoulders: 0.4 },
    ['Band anchored behind you at chest height', 'Press forward and slightly together', 'Control the return'],
    { reps: '12–20' }),

  // ───────── Back ─────────
  x('pull-up', 'Pull-up', '0652-lBDjFxJ', 'back', C, 'bodyweight', { vertical: 1 }, { biceps: 0.5, forearms: 0.4, shoulders: 0.2, abs: 0.1 },
    ['Hands just outside shoulders', 'Pull elbows down to your ribs', 'Full hang at the bottom'],
    { limit: { biceps: 0.6, forearms: 0.6 }, stretch: 0.7, skill: 0.5, systemic: 0.45, bar: true, reps: '5–12' }),
  x('chin-up', 'Chin-up', '1326-T2mxWqc', 'back', C, 'bodyweight', { vertical: 1 }, { biceps: 0.7, forearms: 0.4, abs: 0.1 },
    ['Palms facing you, shoulder width', 'Chest to the bar', 'Lower all the way'],
    { limit: { biceps: 0.7, forearms: 0.5 }, stretch: 0.7, skill: 0.5, systemic: 0.45, bar: true, reps: '5–12' }),
  x('assisted-chin', 'Assisted chin-up machine', '0572-MaMuGH6', 'back', C, 'machine', { vertical: 1 }, { biceps: 0.6, forearms: 0.3 },
    ['More counterweight = easier', 'Chest up, pull elbows down', 'Slow on the way down'],
    { limit: { biceps: 0.6, forearms: 0.3 }, stretch: 0.7 }),
  x('lat-pulldown', 'Lat pulldown', '0198-RVwzP10', 'back', C, 'cable', { vertical: 1 }, { biceps: 0.5, forearms: 0.3, shoulders: 0.2 },
    ['Thighs locked under the pad', 'Pull the bar to upper chest', 'Let the lats stretch at the top'],
    { limit: { biceps: 0.5, forearms: 0.4 }, stretch: 0.6 }),
  x('close-pulldown', 'Close-grip pulldown', '2616-4c9BhzB', 'back', C, 'cable', { vertical: 0.9, lat: 0.2 }, { biceps: 0.5, forearms: 0.3 },
    ['V-handle, lean back slightly', 'Elbows drive to the hips', 'Full stretch at the top'],
    { limit: { biceps: 0.5, forearms: 0.4 }, stretch: 0.7 }),
  x('bb-row', 'Barbell row', '0027-eZyBC3j', 'back', C, 'barbell', { horizontal: 1 }, { biceps: 0.4, traps: 0.4, shoulders: 0.3, forearms: 0.4, hamstrings: 0.2 },
    ['Hinge to about 45°, flat back', 'Pull the bar to your belly button', 'Brace hard; no jerking'],
    { limit: { forearms: 0.5, biceps: 0.4, abs: 0.3, hamstrings: 0.3 }, skill: 0.7, systemic: 0.7, also: { traps: { mid: 0.5 } } }),
  x('db-row', 'One-arm dumbbell row', '0292-C0MA9bC', 'back', C, 'dumbbell', { horizontal: 1, vertical: 0.2 }, { biceps: 0.4, traps: 0.3, shoulders: 0.3, forearms: 0.3 },
    ['One hand on a bench, flat back', 'Pull the dumbbell to your hip', 'Let it stretch down at the bottom'],
    { limit: { forearms: 0.4, biceps: 0.4 }, stretch: 0.7, skill: 0.3, systemic: 0.35, uni: true }),
  x('incline-db-row', 'Chest-supported dumbbell row', '0327-7vG5o25', 'back', C, 'dumbbell', { horizontal: 1 }, { biceps: 0.4, traps: 0.4, shoulders: 0.4, forearms: 0.3 },
    ['Chest on an incline bench', 'Row the elbows back and up', 'Squeeze shoulder blades together'],
    { limit: { biceps: 0.4, forearms: 0.3 }, skill: 0.15, systemic: 0.25, bench: true, also: { traps: { mid: 0.6 } } }),
  x('cable-row', 'Seated cable row', '0861-fUBheHs', 'back', C, 'cable', { horizontal: 1 }, { biceps: 0.4, traps: 0.4, shoulders: 0.3, forearms: 0.3 },
    ['Chest tall, slight knee bend', 'Pull to the belly, elbows close', 'Reach forward for the stretch'],
    { limit: { biceps: 0.4, forearms: 0.4 }, stretch: 0.6, also: { traps: { mid: 0.5 } } }),
  x('machine-row', 'Machine row', '1350-7I6LNUG', 'back', C, 'machine', { horizontal: 1 }, { biceps: 0.4, traps: 0.4, shoulders: 0.3, forearms: 0.2 },
    ['Chest on the pad', 'Drive the elbows back', 'Pause with blades squeezed'],
    { limit: { biceps: 0.4, forearms: 0.3 }, also: { traps: { mid: 0.5 } } }),
  x('tbar-row', 'T-bar row', '0606-aaXr7ld', 'back', C, 'machine', { horizontal: 1 }, { biceps: 0.4, traps: 0.4, forearms: 0.4, hamstrings: 0.2 },
    ['Chest on the pad if it has one', 'Pull the handles to your chest', 'Flat back the whole time'],
    { limit: { forearms: 0.5, biceps: 0.4, abs: 0.2 }, skill: 0.35, systemic: 0.5 }),
  x('straight-arm', 'Straight-arm pulldown', '0238-x69MAlq', 'back', I, 'cable', { lat: 1 }, { triceps: 0.1, abs: 0.1 },
    ['Arms almost straight', 'Sweep the bar down to your thighs', 'Feel the lats, not the arms'],
    { stretch: 0.6 }),
  x('db-pullover', 'Dumbbell pullover', '0375-9XjtHvS', 'back', I, 'dumbbell', { lat: 1 }, { chest: 0.4, triceps: 0.2 },
    ['Lie on a bench, dumbbell over the chest', 'Lower it behind your head, arms long', 'Ribs down, slow stretch'],
    { stretch: 0.95, bench: true }),
  x('hyperextension', 'Back extension', '0489-zhMwOwE', 'back', I, 'machine', { lower: 1 }, { glutes: 0.5, hamstrings: 0.4 },
    ['Pad just below the hips', 'Lower with a flat back', 'Rise to a straight line, not past it'],
    { stretch: 0.6, skill: 0.2, systemic: 0.2, also: { glutes: { thrust: 0.4, stretch: 0.3 }, hamstrings: { hinge: 0.5 } } }),
  x('deadlift', 'Deadlift', '0032-ila4NZS', 'back', C, 'barbell', { lower: 1, horizontal: 0.1 }, { glutes: 0.6, hamstrings: 0.5, quads: 0.3, traps: 0.5, forearms: 0.6 },
    ['Bar over mid-foot, flat back', 'Push the floor away, bar close', 'Heavy sets only with good form'],
    { limit: { forearms: 0.8, abs: 0.5, hamstrings: 0.4 }, skill: 0.9, systemic: 1, reps: '4–6' }),
  x('inverted-row', 'Inverted row', '0499-bZGHsAZ', 'back', C, 'bodyweight', { horizontal: 1 }, { biceps: 0.4, traps: 0.3, shoulders: 0.3 },
    ['Body straight like a plank', 'Pull chest to the bar', 'Bend knees to make it easier'],
    { bar: true, reps: '8–15', also: { traps: { mid: 0.4 } } }),
  x('band-row', 'Band seated row', '3144-Nu7jqFE', 'back', C, 'band', { horizontal: 1 }, { biceps: 0.4, traps: 0.3 },
    ['Band round your feet', 'Sit tall, pull to the belly', 'Squeeze shoulder blades'],
    { reps: '12–20' }),
  x('band-pulldown', 'Band close-grip pulldown', '0974-DptumMx', 'back', C, 'band', { vertical: 0.9 }, { biceps: 0.4 },
    ['Anchor the band high (door anchor)', 'Pull elbows down to the ribs', 'Slow on the way up'],
    { reps: '12–20' }),
  x('towel-row', 'Towel row', '3165-uTv34oq', 'back', C, 'bodyweight', { horizontal: 0.8 }, { biceps: 0.4 },
    ['Towel round a sturdy post or closed door', 'Lean back, body straight', 'Pull yourself in'],
    { reps: '10–15' }),
  x('band-underhand-pd', 'Band underhand pulldown', '1013-k6tUeqS', 'back', C, 'band', { vertical: 0.9 }, { biceps: 0.5 },
    ['Band anchored high (door anchor)', 'Palms up, pull the elbows to the ribs', 'Slow on the way up'],
    { reps: '12–20' }),
  x('band-1arm-row', 'Band one-arm row', '0988-km0sQC0', 'back', C, 'band', { horizontal: 0.9, vertical: 0.2 }, { biceps: 0.4 },
    ['Band anchored low, staggered stance', 'Pull the elbow back to the hip', 'Reach forward for the stretch'],
    { reps: '12–20 / side', stretch: 0.6, uni: true }),

  // ───────── Shoulders ─────────
  x('ohp', 'Standing overhead press', '1456-wdRZISl', 'shoulders', C, 'barbell', { front: 1, side: 0.2 }, { triceps: 0.5, traps: 0.3, abs: 0.3 },
    ['Squeeze glutes, ribs down', 'Press up and slightly back', 'Head through at the top'],
    { limit: { triceps: 0.7, abs: 0.4 }, skill: 0.75 }),
  x('db-shoulder-press', 'Seated dumbbell shoulder press', '0405-znQUdHY', 'shoulders', C, 'dumbbell', { front: 1, side: 0.25 }, { triceps: 0.5, traps: 0.2 },
    ['Back against an upright bench', 'Lower to ear height', 'Press up without banging the dumbbells'],
    { limit: { triceps: 0.6 }, stretch: 0.6, skill: 0.4, systemic: 0.4, bench: true }),
  x('machine-shoulder-press', 'Machine shoulder press', '0587-CggQhII', 'shoulders', C, 'machine', { front: 0.9, side: 0.2 }, { triceps: 0.5 },
    ['Handles at shoulder height', 'Back flat on the pad', 'Smooth, no lockout slam'],
    { limit: { triceps: 0.5 } }),
  x('arnold', 'Arnold press', '2137-Xy4jlWA', 'shoulders', C, 'dumbbell', { front: 0.9, side: 0.4 }, { triceps: 0.5 },
    ['Start palms facing you', 'Rotate out as you press', 'Reverse the turn on the way down'],
    { limit: { triceps: 0.6 }, bench: true }),
  x('smith-shoulder-press', 'Smith seated shoulder press', '0765-xUwnBMT', 'shoulders', C, 'smith', { front: 1, side: 0.2 }, { triceps: 0.5 },
    ['Bench upright, bar in front of the face', 'Set the safety stops first', 'Lower to chin height'],
    { limit: { triceps: 0.6 }, bench: true }),
  x('db-lateral', 'Dumbbell lateral raise', '0334-DsgkuIt', 'shoulders', I, 'dumbbell', { side: 1 }, { traps: 0.2 },
    ['Light weight, slight lean forward', 'Lead with the elbows', 'Stop at shoulder height'],
    { limit: { traps: 0.2 }, stretch: 0.3 }),
  x('cable-lateral', 'Cable lateral raise', '0178-goJ6ezq', 'shoulders', I, 'cable', { side: 1 }, { traps: 0.2 },
    ['Two low cables, crossed in front of you', 'Raise both arms out to shoulder height', 'Slow stretch back down'],
    { stretch: 0.7 }),
  x('machine-lateral', 'Machine lateral raise', '0584-dRTfGZT', 'shoulders', I, 'machine', { side: 1 }, { traps: 0.2 },
    ['Pads on the outside of the elbows', 'Raise to shoulder height', 'No shrugging'],
    { stretch: 0.4 }),
  x('db-rear-fly', 'Incline rear delt fly', '0383-EAs3xL9', 'shoulders', I, 'dumbbell', { rear: 1 }, { traps: 0.3 },
    ['Chest on an incline bench', 'Arms out wide, pinkies up', 'Light weight, no swinging'],
    { stretch: 0.3, bench: true, also: { traps: { mid: 0.4 } } }),
  x('reverse-pec-deck', 'Reverse pec deck', '0602-myfUsKf', 'shoulders', I, 'machine', { rear: 1 }, { traps: 0.3 },
    ['Chest on the pad, handles at shoulder height', 'Sweep the arms back', 'Squeeze rear delts'],
    { stretch: 0.5, also: { traps: { mid: 0.5 } } }),
  x('cable-rear-fly', 'Cable reverse fly', '0225-P5p0j8B', 'shoulders', I, 'cable', { rear: 1 }, { traps: 0.3 },
    ['Pulleys high, cross the cables', 'Pull out and back in an arc', 'Arms long, slow return'],
    { stretch: 0.6, also: { traps: { mid: 0.5 } } }),
  x('rope-rear-row', 'Face pull', '0233-ZfyAGhK', 'shoulders', I, 'cable', { rear: 0.9 }, { traps: 0.5, biceps: 0.2 },
    ['Rope at face height', 'Pull to your face, elbows high', 'Turn the hands out at the end'],
    { stretch: 0.4, also: { traps: { mid: 0.7 } } }),
  x('db-front-raise', 'Dumbbell front raise', '0310-3eGE2JC', 'shoulders', I, 'dumbbell', { front: 1 }, { traps: 0.1 },
    ['Raise to eye height', 'Thumbs up or palms down', 'Skip it on chest-press days'],
    { stretch: 0.2 }),
  x('cable-front-raise', 'Cable front raise', '0162-u2X71Np', 'shoulders', I, 'cable', { front: 1 }, { traps: 0.1 },
    ['Cable low behind you', 'Raise to eye height', 'Slow down'],
    { stretch: 0.4 }),
  x('band-shoulder-press', 'Band shoulder press', '0997-peAeMR3', 'shoulders', C, 'band', { front: 1, side: 0.2 }, { triceps: 0.4 },
    ['Stand on the band', 'Press straight overhead', 'Ribs down'],
    { reps: '12–20' }),
  x('band-reverse-fly', 'Band reverse fly', '0993-sTfvVsG', 'shoulders', I, 'band', { rear: 1 }, { traps: 0.3 },
    ['Band at chest height, arms straight', 'Pull the band apart wide', 'Squeeze the shoulder blades'],
    { reps: '15–25', also: { traps: { mid: 0.4 } } }),
  x('band-rear-row', 'Band rear delt row', '1022-tc5dYrf', 'shoulders', I, 'band', { rear: 0.9 }, { traps: 0.5, biceps: 0.2 },
    ['Band anchored at chest height in front', 'Pull wide, elbows high', 'Squeeze the back of the shoulders'],
    { reps: '15–25', stretch: 0.4, also: { traps: { mid: 0.6 } } }),

  // ───────── Biceps ─────────
  x('bb-curl', 'Barbell curl', '0031-25GPyDY', 'biceps', I, 'barbell', { long: 0.5, short: 0.5 }, { forearms: 0.3 },
    ['Elbows pinned to your sides', 'No swinging the hips', 'Lower slowly'],
    { limit: { forearms: 0.3 }, stretch: 0.4 }),
  x('ez-curl', 'EZ-bar curl', '0447-6TG6x2w', 'biceps', I, 'barbell', { long: 0.45, short: 0.5, brach: 0.1 }, { forearms: 0.3 },
    ['Grip the angled part', 'Elbows still', 'Full stretch at the bottom'],
    { limit: { forearms: 0.3 }, stretch: 0.4 }),
  x('db-curl', 'Dumbbell curl', '0294-NbVPDMW', 'biceps', I, 'dumbbell', { long: 0.5, short: 0.5 }, { forearms: 0.3 },
    ['Turn the palm up as you curl', 'Elbows by your sides', 'Lower all the way'],
    { limit: { forearms: 0.3 }, stretch: 0.4 }),
  x('incline-curl', 'Incline dumbbell curl', '0318-ae9UoXQ', 'biceps', I, 'dumbbell', { long: 1 }, { forearms: 0.2 },
    ['Bench at 45–60°, arms hang straight down', 'Curl without moving the elbows', 'Big stretch at the bottom'],
    { stretch: 0.9, bench: true }),
  x('cable-curl', 'Cable curl', '0868-G08RZcQ', 'biceps', I, 'cable', { long: 0.5, short: 0.5 }, { forearms: 0.3 },
    ['Straight bar on a low pulley', 'Elbows fixed', 'Constant tension, slow return'],
    { limit: { forearms: 0.3 } }),
  x('preacher-curl', 'Preacher curl', '0592-b6hQYMb', 'biceps', I, 'barbell', { short: 1 }, { forearms: 0.2 },
    ['Armpits on top of the pad', 'Lower until arms are almost straight', 'Do not bounce at the bottom'],
    { stretch: 0.8 }),
  x('db-preacher', 'Dumbbell preacher curl', '0372-jivWf8n', 'biceps', I, 'dumbbell', { short: 1 }, { forearms: 0.2 },
    ['Arms over the preacher pad', 'Lower slowly to a stretch', 'Squeeze at the top'],
    { stretch: 0.8, bench: true }),
  x('machine-curl', 'Machine curl', '0575-q6y3OhV', 'biceps', I, 'machine', { short: 0.8, long: 0.2 }, { forearms: 0.2 },
    ['Elbows lined up with the pivot', 'Full range', 'Slow lowering'],
    { stretch: 0.6 }),
  x('concentration-curl', 'Concentration curl', '0297-gvsWLQw', 'biceps', I, 'dumbbell', { short: 1 }, { forearms: 0.2 },
    ['Elbow against the inner thigh', 'Curl to the shoulder', 'Squeeze at the top'],
    { stretch: 0.4, uni: true }),
  x('spider-curl', 'Spider curl', '1628-2kattbR', 'biceps', I, 'barbell', { short: 1 }, { forearms: 0.2 },
    ['Chest on the steep side of a preacher bench', 'Arms hang straight down', 'Curl up, hard squeeze'],
    { stretch: 0.2 }),
  x('hammer-curl', 'Hammer curl', '0313-slDvUAU', 'biceps', I, 'dumbbell', { brach: 1 }, { forearms: 0.5 },
    ['Palms face each other', 'Elbows by your sides', 'Slow on the way down'],
    { limit: { forearms: 0.4 }, stretch: 0.4 }),
  x('cross-hammer', 'Cross-body hammer curl', '0298-Qyk5J3p', 'biceps', I, 'dumbbell', { brach: 1 }, { forearms: 0.5 },
    ['Palms face in', 'Curl across the body to the opposite chest', 'Lower slowly'],
    { limit: { forearms: 0.4 }, stretch: 0.4 }),
  x('rope-hammer-curl', 'Rope hammer curl', '0165-HPlPoQA', 'biceps', I, 'cable', { brach: 1 }, { forearms: 0.5 },
    ['Rope on a low pulley', 'Thumbs up, elbows fixed', 'Pull the rope ends apart at the top'],
    { limit: { forearms: 0.4 } }),
  x('overhead-cable-curl', 'Overhead cable curl', '1636-wDUqY2u', 'biceps', I, 'cable', { short: 0.7, long: 0.3 }, { forearms: 0.2 },
    ['Pulleys high, arms out like a T', 'Curl the handles to your ears', 'Elbows stay high'],
    { stretch: 0.4 }),
  x('band-curl', 'Band curl', '3123-XFc3vpY', 'biceps', I, 'band', { long: 0.5, short: 0.5 }, { forearms: 0.2 },
    ['Band under your feet', 'Elbows by your sides', 'Squeeze and lower slowly'],
    { reps: '15–25' }),
  x('band-alt-curl', 'Band alternating curl', '0968-3omWx6P', 'biceps', I, 'band', { long: 0.5, short: 0.5 }, { forearms: 0.2 },
    ['Stand on the band', 'Curl one arm at a time, elbows still', 'Lower slowly'],
    { reps: '12–20 / side', uni: true, stretch: 0.3 }),
  x('band-conc-curl', 'Band concentration curl', '0976-kmVVAfu', 'biceps', I, 'band', { short: 1 }, { forearms: 0.2 },
    ['Sit on a chair, band under the foot', 'Elbow against the inner thigh', 'Squeeze at the top'],
    { reps: '12–20 / side', uni: true, stretch: 0.4 }),
  x('band-oh-curl', 'Band overhead curl', '0986-UNAB8ak', 'biceps', I, 'band', { short: 0.7, long: 0.3 }, { forearms: 0.2 },
    ['Band anchored to the side at shoulder height', 'Arm out straight like a T', 'Curl the hand to your head'],
    { reps: '12–20 / side', uni: true, stretch: 0.4 }),

  // ───────── Triceps ─────────
  x('close-grip-bench', 'Close-grip bench press', '0030-J6Dx1Mu', 'triceps', C, 'barbell', { press: 1 }, { chest: 0.5, shoulders: 0.3 },
    ['Hands shoulder width', 'Elbows tucked close', 'Heavy sets: spotter or safety pins'],
    { limit: { shoulders: 0.3 }, skill: 0.6, systemic: 0.5, bench: true }),
  x('triceps-dip', 'Triceps dip', '0814-X6C6i5Y', 'triceps', C, 'bodyweight', { press: 1 }, { chest: 0.4, shoulders: 0.4 },
    ['Stay upright', 'Lower to 90° at the elbow', 'Skip if the shoulders hurt'],
    { limit: { shoulders: 0.5 }, stretch: 0.6, bar: true, reps: '6–15' }),
  x('machine-dip', 'Machine dip', '1451-BRImeP8', 'triceps', C, 'machine', { press: 1 }, { chest: 0.3, shoulders: 0.3 },
    ['Sit tall, elbows back', 'Press down to straight arms', 'Slow up'],
    { limit: { shoulders: 0.3 } }),
  x('rope-pushdown', 'Rope pushdown', '0200-dU605di', 'triceps', I, 'cable', { lateral: 1 }, {},
    ['Elbows pinned to your sides', 'Split the rope at the bottom', 'Let it rise slowly'],
    { stretch: 0.3 }),
  x('vbar-pushdown', 'V-bar pushdown', '0241-gAwDzB3', 'triceps', I, 'cable', { lateral: 1 }, {},
    ['Elbows still', 'Push to full lockout', 'Slow return'],
    { stretch: 0.3 }),
  x('overhead-cable-ext', 'Overhead cable extension', '0194-2IxROQ1', 'triceps', I, 'cable', { long: 1 }, {},
    ['Rope on a low pulley behind you', 'Elbows point up, close to the head', 'Deep stretch, then extend'],
    { stretch: 0.95 }),
  x('db-overhead-ext', 'Seated dumbbell overhead extension', '2188-kont8Ut', 'triceps', I, 'dumbbell', { long: 1 }, {},
    ['Both hands on one dumbbell', 'Lower behind your head', 'Elbows in, not flared'],
    { stretch: 0.9, bench: true }),
  x('skull-crusher', 'Skull crusher', '0060-h8LFzo9', 'triceps', I, 'barbell', { long: 0.6, lateral: 0.4 }, {},
    ['Lower the bar to the forehead or just behind', 'Upper arms still', 'Go light if elbows ache'],
    { stretch: 0.7, bench: true }),
  x('db-lying-ext', 'Dumbbell lying extension', '0351-mpKZGWz', 'triceps', I, 'dumbbell', { long: 0.6, lateral: 0.4 }, {},
    ['Palms facing each other', 'Lower beside the head', 'Extend without moving the elbows'],
    { stretch: 0.7, bench: true }),
  x('db-kickback', 'Dumbbell kickback', '0333-W6PxUkg', 'triceps', I, 'dumbbell', { lateral: 1 }, {},
    ['Upper arm parallel to the floor', 'Straighten the arm fully', 'Squeeze, then lower slowly'],
    { stretch: 0.1 }),
  x('cable-kickback', 'Cable kickback', '1728-vvNjDJS', 'triceps', I, 'cable', { lateral: 1 }, {},
    ['Hinge forward, upper arms still', 'Extend back to straight', 'Control the return'],
    { stretch: 0.3 }),
  x('machine-ext', 'Machine triceps extension', '0607-Ser9eQp', 'triceps', I, 'machine', { lateral: 0.6, long: 0.4 }, {},
    ['Elbows on the pad, lined up with the pivot', 'Full extension', 'Slow return'],
    { stretch: 0.5 }),
  x('diamond-push-up', 'Diamond push-up', '0283-soIB2rj', 'triceps', C, 'bodyweight', { press: 1 }, { chest: 0.4, shoulders: 0.3, abs: 0.2 },
    ['Hands together under the chest', 'Elbows brush your ribs', 'Knees down to make it easier'],
    { reps: '6–15', skill: 0.25, systemic: 0.25 }),
  x('close-push-up', 'Close-grip push-up', '0259-x6KpKpq', 'triceps', C, 'bodyweight', { press: 1 }, { chest: 0.4, shoulders: 0.3, abs: 0.2 },
    ['Hands under the shoulders', 'Elbows tight to the body', 'Full lockout'],
    { reps: '8–20', skill: 0.25, systemic: 0.25 }),
  x('bench-dip', 'Bench dip', '0129-RrLske5', 'triceps', C, 'bodyweight', { press: 0.8, lateral: 0.2 }, { shoulders: 0.3, chest: 0.2 },
    ['Hands on a chair or bench, knees bent', 'Lower only to 90° at the elbow', 'Skip if the shoulders hurt'],
    { reps: '10–20', skill: 0.2, systemic: 0.2 }),
  x('band-overhead-ext', 'Band overhead extension', '0998-obe5LMq', 'triceps', I, 'band', { long: 0.7, lateral: 0.3 }, {},
    ['Hold the band low behind your back with one hand', 'Extend the other arm straight overhead', 'Elbow stays by the head'],
    { reps: '15–25 / side', stretch: 0.8, uni: true }),
  x('bw-tri-ext', 'Kneeling triceps extension', '1771-s0HKO2I', 'triceps', I, 'bodyweight', { lateral: 0.6, long: 0.4 }, {},
    ['Kneel, forearms flat on the floor', 'Press up onto the hands by straightening the elbows', 'Lower slowly back to the forearms'],
    { reps: '8–15', stretch: 0.5, skill: 0.25 }),

  // ───────── Forearms ─────────
  x('db-wrist-curl', 'Dumbbell wrist curl', '0401-2dImyQ8', 'forearms', I, 'dumbbell', { flexors: 1 }, {},
    ['Forearms on the thighs, palms up', 'Let the dumbbell roll to the fingers', 'Curl the wrist up'],
    { stretch: 0.7, reps: '15–25' }),
  x('bb-wrist-curl', 'Barbell wrist curl', '1412-SJAA2IQ', 'forearms', I, 'barbell', { flexors: 1 }, {},
    ['Forearms on a bench, palms up', 'Roll the bar to the fingertips', 'Curl up and squeeze'],
    { stretch: 0.7, reps: '15–25', bench: true }),
  x('cable-wrist-curl', 'Cable wrist curl', '0247-LrV4s90', 'forearms', I, 'cable', { flexors: 1 }, {},
    ['Low pulley, palms up', 'Wrists over the knees', 'Full range'],
    { stretch: 0.6, reps: '15–25' }),
  x('db-rev-wrist-curl', 'Dumbbell reverse wrist curl', '0385-BLCvwr2', 'forearms', I, 'dumbbell', { extensors: 1 }, {},
    ['Palms down, forearms supported', 'Lift the back of the hand', 'Light weight, slow'],
    { stretch: 0.5, reps: '15–25' }),
  x('bb-rev-wrist-curl', 'Barbell reverse wrist curl', '0079-qDnGfDb', 'forearms', I, 'barbell', { extensors: 1 }, {},
    ['Palms down, overhand grip', 'Lift with the wrists only', 'Slow down'],
    { stretch: 0.5, reps: '15–25' }),
  x('reverse-curl', 'Reverse EZ-bar curl', '0451-Y5X65IB', 'forearms', I, 'barbell', { brachio: 1, extensors: 0.3 }, { biceps: 0.4 },
    ['Overhand grip on the EZ bar', 'Elbows by your sides', 'Wrists straight'],
    { stretch: 0.4 }),
  x('db-reverse-curl', 'Dumbbell reverse curl', '0429-0IgNjSM', 'forearms', I, 'dumbbell', { brachio: 1, extensors: 0.3 }, { biceps: 0.4 },
    ['Palms down', 'Curl to the shoulders', 'Wrists straight'],
    { stretch: 0.4 }),
  x('zottman-curl', 'Zottman curl', '0439-kXaIn5A', 'forearms', I, 'dumbbell', { brachio: 0.8, extensors: 0.3, flexors: 0.2 }, { biceps: 0.6 },
    ['Curl up palms up', 'Turn palms down at the top', 'Lower slowly palms down'],
    { stretch: 0.4 }),
  x('farmer-walk', "Farmer's walk", '2133-qPEzJjA', 'forearms', C, 'dumbbell', { grip: 1 }, { traps: 0.5, abs: 0.3 },
    ['Heavy dumbbells, tall posture', 'Short quick steps', 'Set them down before the grip fails'],
    { skill: 0.2, systemic: 0.5, reps: '30–40 m', also: { traps: { upper: 0.6 } } }),
  x('wrist-roller', 'Wrist roller', '0859-bd5b860', 'forearms', I, 'machine', { extensors: 0.6, flexors: 0.6, grip: 0.3 }, {},
    ['Arms straight out in front', 'Roll the weight up, then down', 'Both directions'],
    { reps: '2–3 rolls' }),
  x('finger-curl', 'Dumbbell finger curl', '1437-mtXengz', 'forearms', I, 'dumbbell', { grip: 0.7, flexors: 0.5 }, {},
    ['Let the dumbbell roll to the fingertips', 'Close the fist hard', 'Slow and controlled'],
    { reps: '15–25' }),
  x('band-wrist-curl', 'Band wrist curl', '1016-vUTfFHw', 'forearms', I, 'band', { flexors: 1 }, {},
    ['Band under the foot, palm up', 'Curl the wrist up', 'Slow down'],
    { reps: '20–30' }),
  x('band-rev-wrist-curl', 'Band reverse wrist curl', '0994-Ezpnw9d', 'forearms', I, 'band', { extensors: 1 }, {},
    ['Band under the foot, palm down', 'Lift the back of the hand', 'Slow down'],
    { reps: '20–30' }),

  // ───────── Abs ─────────
  x('cable-crunch', 'Kneeling cable crunch', '0175-WW95auq', 'abs', I, 'cable', { upper: 1 }, {},
    ['Rope by your head, hips still', 'Curl the ribs toward the hips', 'Round the spine, then stretch'],
    { stretch: 0.6 }),
  x('crunch', 'Crunch', '0274-TFqbd8t', 'abs', I, 'bodyweight', { upper: 1 }, {},
    ['Lower back on the floor', 'Lift the shoulders, ribs to hips', 'Slow down'],
    { stretch: 0.2, reps: '15–25' }),
  x('decline-crunch', 'Decline crunch', '0277-9Ap7miY', 'abs', I, 'bodyweight', { upper: 1 }, {},
    ['Feet locked in the decline bench', 'Curl up, do not yank the neck', 'Lower slowly'],
    { stretch: 0.6, bench: true }),
  x('machine-crunch', 'Machine crunch', '1452-Wgaz7pm', 'abs', I, 'machine', { upper: 1 }, {},
    ['Pick a light stack first', 'Curl the ribs down', 'Slow back up'],
    { stretch: 0.5 }),
  x('hanging-knee-raise', 'Hanging knee raise', '0472-I3tsCnC', 'abs', I, 'bodyweight', { lower: 1 }, { forearms: 0.3 },
    ['Dead hang, no swinging', 'Knees up to the chest, curl the pelvis', 'Straight legs later for more'],
    { limit: { forearms: 0.5 }, stretch: 0.6, skill: 0.4, bar: true }),
  x('captains-chair', "Captain's chair leg raise", '2963-weoDEpH', 'abs', I, 'machine', { lower: 1 }, {},
    ['Back flat on the pad', 'Lift the legs, tilt the pelvis up', 'Knees bent is fine'],
    { stretch: 0.5 }),
  x('lying-leg-raise', 'Lying leg raise', '0620-WhuFnR7', 'abs', I, 'bodyweight', { lower: 1 }, {},
    ['Lower back pressed down', 'Lower the legs only as far as you keep it down', 'Slow'],
    { stretch: 0.5 }),
  x('reverse-crunch', 'Reverse crunch', '0872-nCU1Ekp', 'abs', I, 'bodyweight', { lower: 1 }, {},
    ['Knees bent at 90°', 'Roll the hips off the floor', 'Lower slowly'],
    { stretch: 0.3 }),
  x('ab-wheel', 'Ab wheel rollout', '0857-NAgVB3t', 'abs', I, 'machine', { stability: 1, upper: 0.4 }, {},
    ['Start on your knees', 'Roll out only as far as the back stays flat', 'Pull back with the abs'],
    { stretch: 0.9, skill: 0.5 }),
  x('plank', 'Plank', '2135-VBAWRPG', 'abs', I, 'bodyweight', { stability: 1 }, {},
    ['Elbows under the shoulders', 'Squeeze glutes, ribs down', 'Hold a straight line, breathe'],
    { stretch: 0.1, reps: '30–60 s' }),
  x('side-plank', 'Incline side plank', '3544-5VXmnV5', 'abs', I, 'bodyweight', { obliques: 0.7, stability: 0.5 }, {},
    ['Forearm on a bench or sofa', 'Hips high, body straight', 'Floor version is harder'],
    { stretch: 0.1, reps: '20–40 s / side', uni: true }),
  x('dead-bug', 'Dead bug', '0276-iny3m5y', 'abs', I, 'bodyweight', { stability: 0.8, lower: 0.3 }, {},
    ['Lower back glued to the floor', 'Opposite arm and leg reach out', 'Slow and steady'],
    { stretch: 0.3, reps: '8–12 / side' }),
  x('pallof-press', 'Pallof press', '0979-9pa4H5m', 'abs', I, 'band', { obliques: 0.6, stability: 0.6 }, {},
    ['Band or cable at chest height, stand side-on', 'Press straight out, do not twist', 'Hold 2 seconds'],
    { reps: '10–12 / side', uni: true }),
  x('russian-twist', 'Russian twist', '0687-XVDdcoj', 'abs', I, 'bodyweight', { obliques: 1 }, {},
    ['Lean back, chest tall', 'Turn the shoulders, not just the arms', 'Feet down to make it easier'],
    { stretch: 0.3, reps: '10–15 / side' }),
  x('db-side-bend', 'Dumbbell side bend', '0407-IpONWYv', 'abs', I, 'dumbbell', { obliques: 1 }, {},
    ['One dumbbell, stand tall', 'Bend sideways only', 'Both sides'],
    { stretch: 0.6, uni: true }),
  x('bicycle-crunch', 'Bicycle crunch', '0003-1ZFqTDN', 'abs', I, 'bodyweight', { obliques: 0.6, upper: 0.5 }, {},
    ['Elbow toward the opposite knee', 'Slow, no rushing', 'Lower back down'],
    { stretch: 0.2, reps: '10–15 / side' }),

  // ───────── Quads ─────────
  x('back-squat', 'Barbell back squat', '0043-qXTaZnJ', 'quads', C, 'barbell', { squat: 1 }, { glutes: 0.6, hamstrings: 0.2, abs: 0.3, back: 0.2 },
    ['Bar on the upper back, brace hard', 'Sit down between the heels', 'Use the safety pins'],
    { limit: { abs: 0.5, back: 0.3 }, stretch: 0.8, skill: 0.9, systemic: 0.95, also: { glutes: { stretch: 0.8 } } }),
  x('front-squat', 'Front squat', '0042-zG0zs85', 'quads', C, 'barbell', { squat: 1 }, { glutes: 0.5, abs: 0.4, back: 0.2 },
    ['Bar on the front of the shoulders', 'Elbows high, chest up', 'Use the safety pins'],
    { limit: { abs: 0.5, back: 0.3 }, stretch: 0.8, skill: 0.9, systemic: 0.85 }),
  x('hack-squat', 'Hack squat', '0743-Qa55kX1', 'quads', C, 'machine', { squat: 1 }, { glutes: 0.5 },
    ['Feet mid-platform, shoulder width', 'Go deep with control', 'Do not lock the knees hard'],
    { limit: { glutes: 0.2 }, stretch: 0.85, skill: 0.25, systemic: 0.6, also: { glutes: { stretch: 0.6 } } }),
  x('leg-press', 'Leg press', '0739-10Z2DXU', 'quads', C, 'machine', { squat: 0.9 }, { glutes: 0.5, hamstrings: 0.1 },
    ['Feet mid-platform, lower back on the pad', 'Lower until knees reach the chest area', 'Never lock out hard'],
    { stretch: 0.6, skill: 0.15, systemic: 0.6, also: { glutes: { stretch: 0.5 } } }),
  x('smith-squat', 'Smith machine squat', '0770-jFtipLl', 'quads', C, 'smith', { squat: 1 }, { glutes: 0.5, abs: 0.2 },
    ['Feet slightly in front of the bar', 'Set the safety stops', 'Sit deep, knees forward'],
    { limit: { abs: 0.3 }, stretch: 0.8, skill: 0.4, systemic: 0.7 }),
  x('goblet-squat', 'Goblet squat', '1760-yn8yg1r', 'quads', C, 'dumbbell', { squat: 1 }, { glutes: 0.5, abs: 0.3 },
    ['Dumbbell held at the chest', 'Elbows inside the knees at the bottom', 'Chest up'],
    { limit: { abs: 0.3 }, stretch: 0.8, skill: 0.35, systemic: 0.5, capped: true, also: { glutes: { stretch: 0.6 } } }),
  x('db-squat', 'Dumbbell squat', '0413-HsvHqgf', 'quads', C, 'dumbbell', { squat: 0.9 }, { glutes: 0.5, forearms: 0.3 },
    ['Dumbbells at your sides', 'Sit down and back', 'Knees track over the toes'],
    { limit: { forearms: 0.3 }, stretch: 0.7, skill: 0.35, systemic: 0.5, capped: true }),
  x('bss', 'Bulgarian split squat', '0410-qx4fgX7', 'quads', C, 'dumbbell', { single: 1 }, { glutes: 0.6, forearms: 0.2 },
    ['Back foot on a bench', 'Front foot far enough forward', 'Lean forward a little for more glutes'],
    { limit: { glutes: 0.3, forearms: 0.3, abs: 0.2 }, stretch: 0.95, skill: 0.5, systemic: 0.55, uni: true, bench: true, also: { glutes: { stretch: 0.9 } } }),
  x('walking-lunge', 'Walking lunge', '1460-IZVHb27', 'quads', C, 'bodyweight', { single: 1 }, { glutes: 0.6 },
    ['Long steps, torso tall', 'Back knee nearly touches the floor', 'Hold dumbbells to make it harder'],
    { limit: { glutes: 0.3 }, stretch: 0.8, skill: 0.4, systemic: 0.45, uni: true, reps: '10–16 / side', also: { glutes: { stretch: 0.8 } } }),
  x('reverse-lunge', 'Reverse lunge', '0381-SSsBDwB', 'quads', C, 'dumbbell', { single: 1 }, { glutes: 0.6, forearms: 0.2 },
    ['Step back, lower straight down', 'Front shin fairly upright', 'Easier on the knees'],
    { limit: { glutes: 0.3, forearms: 0.3 }, stretch: 0.7, skill: 0.4, systemic: 0.5, uni: true, also: { glutes: { stretch: 0.7 } } }),
  x('step-up', 'Step-up', '0431-aXtJhlg', 'quads', C, 'dumbbell', { single: 0.9 }, { glutes: 0.6 },
    ['Box at knee height', 'Drive through the top foot', 'Do not push off the back leg'],
    { limit: { glutes: 0.3 }, stretch: 0.6, skill: 0.4, systemic: 0.45, uni: true, bench: true, also: { glutes: { thrust: 0.3, stretch: 0.5 } } }),
  x('leg-ext', 'Leg extension', '0585-my33uHU', 'quads', I, 'machine', { ext: 1 }, {},
    ['Knees lined up with the pivot', 'Lift to straight, squeeze', 'Slow down'],
    { stretch: 0.3 }),
  x('sissy-squat', 'Sissy squat', '1489-xdYPUtE', 'quads', I, 'bodyweight', { ext: 0.8 }, {},
    ['Hold something for balance', 'Lean back, knees travel forward', 'Short range first; stop if knees hurt'],
    { stretch: 0.9, skill: 0.5, reps: '8–15' }),
  x('split-squat', 'Split squat', '2368-9E25EOx', 'quads', C, 'bodyweight', { single: 1 }, { glutes: 0.5 },
    ['Long stance, both feet on the floor', 'Lower straight down', 'Hold something for balance'],
    { stretch: 0.8, skill: 0.3, systemic: 0.35, uni: true, reps: '10–20', also: { glutes: { stretch: 0.7 } } }),
  x('band-squat', 'Band squat', '1004-TUZLh71', 'quads', C, 'band', { squat: 0.9 }, { glutes: 0.5 },
    ['Stand on the band, ends at the shoulders', 'Sit down between the heels', 'Drive up tall'],
    { reps: '15–25', stretch: 0.6, skill: 0.25, systemic: 0.35, also: { glutes: { stretch: 0.5 } } }),
  x('band-bss', 'Band Bulgarian split squat', '1001-y8bYM8w', 'quads', C, 'band', { single: 1 }, { glutes: 0.6 },
    ['Back foot on a chair or sofa', 'Band under the front foot', 'Lower straight down'],
    { reps: '10–15 / side', stretch: 0.9, skill: 0.45, systemic: 0.45, uni: true, also: { glutes: { stretch: 0.85 } } }),
  x('band-leg-ext', 'Band leg extension', '3007-Y1MsI1l', 'quads', I, 'band', { ext: 1 }, {},
    ['Sit on a chair, band round both ankles', 'Straighten one leg against the band', 'Squeeze, then lower slowly'],
    { reps: '15–25 / side', stretch: 0.2, uni: true }),

  // ───────── Hamstrings ─────────
  x('rdl', 'Romanian deadlift', '0085-wQ2c4XD', 'hamstrings', C, 'barbell', { hinge: 1 }, { glutes: 0.6, back: 0.4, forearms: 0.4 },
    ['Soft knees, push the hips back', 'Bar slides down the thighs', 'Stop when the back would round'],
    { limit: { forearms: 0.6, back: 0.3, abs: 0.3 }, stretch: 0.9, skill: 0.7, systemic: 0.75, also: { glutes: { stretch: 0.8 } } }),
  x('db-rdl', 'Dumbbell Romanian deadlift', '1459-rR0LJzx', 'hamstrings', C, 'dumbbell', { hinge: 1 }, { glutes: 0.6, back: 0.3, forearms: 0.4 },
    ['Dumbbells close to the legs', 'Hips back, flat back', 'Feel the hamstrings stretch'],
    { limit: { forearms: 0.5, back: 0.3 }, stretch: 0.9, skill: 0.5, systemic: 0.55, also: { glutes: { stretch: 0.8 } } }),
  x('seated-leg-curl', 'Seated leg curl', '0599-Zg3XY7P', 'hamstrings', I, 'machine', { curl: 1 }, { calves: 0.1 },
    ['Knees lined up with the pivot', 'Pad just above the heels', 'Curl hard, slow back'],
    { stretch: 0.9 }),
  x('lying-leg-curl', 'Lying leg curl', '0586-17lJ1kr', 'hamstrings', I, 'machine', { curl: 1 }, { calves: 0.2 },
    ['Hips pressed into the pad', 'Curl the heels to the glutes', 'Lower slowly'],
    { stretch: 0.5 }),
  x('good-morning', 'Good morning', '0044-XlZ4lAC', 'hamstrings', C, 'barbell', { hinge: 1 }, { glutes: 0.5, back: 0.5 },
    ['Light bar on the upper back', 'Hinge with soft knees, flat back', 'Stop at a strong stretch'],
    { limit: { back: 0.4, abs: 0.3 }, stretch: 0.9, skill: 0.7, systemic: 0.6, also: { glutes: { stretch: 0.6 } } }),
  x('sl-rdl', 'Single-leg dumbbell RDL', '1757-gKozT8X', 'hamstrings', C, 'dumbbell', { hinge: 1 }, { glutes: 0.6, forearms: 0.2 },
    ['Stand on one leg, slight knee bend', 'Hinge and reach the back leg long', 'Hold a rail for balance if needed'],
    { limit: { forearms: 0.3 }, stretch: 0.9, skill: 0.6, systemic: 0.4, uni: true, also: { glutes: { stretch: 0.7 } } }),
  x('nordic-curl', 'Nordic curl (assisted)', '0696-E4PwJqI', 'hamstrings', I, 'bodyweight', { curl: 1 }, {},
    ['Ankles anchored, kneel tall', 'Lower slowly as far as you can', 'Catch yourself with the hands'],
    { stretch: 0.7, skill: 0.5, reps: '4–8' }),
  x('band-sldl', 'Band stiff-leg deadlift', '1009-kuMiR2T', 'hamstrings', C, 'band', { hinge: 1 }, { glutes: 0.5, back: 0.3 },
    ['Stand on the band', 'Hinge with a flat back', 'Squeeze glutes to stand'],
    { stretch: 0.6, reps: '15–20' }),
  x('kb-swing', 'Kettlebell swing', '0549-UHJlbu3', 'hamstrings', C, 'kettlebell', { hinge: 0.8 }, { glutes: 0.7, back: 0.3, forearms: 0.3 },
    ['Hike the bell back between the legs', 'Snap the hips forward', 'Arms just guide it'],
    { limit: { forearms: 0.3, back: 0.3 }, stretch: 0.5, skill: 0.5, systemic: 0.6, reps: '15–20', also: { glutes: { thrust: 0.6 } } }),
  x('ghr', 'Glute-ham raise', '3193-Vvwjz6N', 'hamstrings', I, 'machine', { curl: 1 }, { glutes: 0.3 },
    ['Knees just behind the pad, feet locked', 'Lower with a straight body', 'Pull back up with the hamstrings'],
    { reps: '5–10', stretch: 0.7, skill: 0.5 }),

  // ───────── Glutes ─────────
  x('bb-glute-bridge', 'Barbell glute bridge', '1409-qKBpF7I', 'glutes', C, 'barbell', { thrust: 1 }, { hamstrings: 0.3 },
    ['Pad on the bar across the hips', 'Drive up, chin tucked', 'Squeeze for a second at the top'],
    { stretch: 0.2, skill: 0.3, systemic: 0.45 }),
  x('glute-bridge', 'Glute bridge', '3013-u0cNiij', 'glutes', I, 'bodyweight', { thrust: 1 }, { hamstrings: 0.3 },
    ['Heels close to the hips', 'Push through the heels', 'Squeeze 2 seconds at the top'],
    { stretch: 0.2, reps: '15–25' }),
  x('feet-up-bridge', 'Feet-up glute bridge', '3523-aWedzZX', 'glutes', I, 'bodyweight', { thrust: 0.8 }, { hamstrings: 0.5 },
    ['Feet on a bench, knees bent', 'Drive the hips up', 'Hits hamstrings too'],
    { stretch: 0.3, reps: '12–20', bench: true }),
  x('sl-bridge', 'Single-leg glute bridge', '3645-rmEukuS', 'glutes', I, 'bodyweight', { thrust: 1 }, { hamstrings: 0.3 },
    ['One leg out straight', 'Drive through the planted heel', 'Hips stay level'],
    { stretch: 0.2, uni: true, reps: '10–15 / side' }),
  x('cable-glute-kickback', 'Cable glute kickback', '0228-Kpajagk', 'glutes', I, 'cable', { thrust: 0.5, stretch: 0.3 }, { hamstrings: 0.2 },
    ['Ankle strap, face the machine, hold the frame', 'Kick the leg straight back', 'Do not arch the lower back'],
    { stretch: 0.5, uni: true }),
  x('glute-kickback-machine', 'Glute kickback machine', '2286-OPqShYN', 'glutes', I, 'machine', { thrust: 0.6, stretch: 0.3 }, { hamstrings: 0.2 },
    ['Knee and forearms on the pads, hips square', 'Drive the foot back and up', 'Squeeze at the top'],
    { stretch: 0.4, uni: true }),
  x('band-kickback', 'Band kickback', '0980-wSScovH', 'glutes', I, 'band', { thrust: 0.6, stretch: 0.2 }, { hamstrings: 0.2 },
    ['Band round the ankle, anchored low in front', 'Lean forward a little, kick the leg back', 'Squeeze the glute'],
    { stretch: 0.3, uni: true, reps: '15–25 / side' }),
  x('hip-abduction', 'Hip abduction machine', '0597-CHpahtl', 'glutes', I, 'machine', { abduct: 1 }, {},
    ['Lean forward slightly for more glute', 'Push the knees out', 'Slow back in'],
    { stretch: 0.3, reps: '12–20' }),
  x('band-abduction', 'Banded seated abduction', '3006-0xDpB4L', 'glutes', I, 'band', { abduct: 1 }, {},
    ['Band above the knees', 'Push the knees out', 'Hold a second'],
    { stretch: 0.2, reps: '15–25' }),
  x('side-lying-abduction', 'Side-lying leg raise', '0710-7WaDzyL', 'glutes', I, 'bodyweight', { abduct: 1 }, {},
    ['Lie on your side, top leg straight', 'Raise slightly behind you', 'Slow down'],
    { stretch: 0.2, uni: true, reps: '15–20 / side' }),
  x('pull-through', 'Cable pull-through', '0196-OM46QHm', 'glutes', C, 'cable', { stretch: 0.9, thrust: 0.2 }, { hamstrings: 0.4 },
    ['Face away from a low pulley, rope between the legs', 'Hinge back, flat back', 'Snap the hips forward and squeeze'],
    { stretch: 0.8, skill: 0.3, systemic: 0.35, also: { hamstrings: { hinge: 0.5 } } }),
  x('band-pull-through', 'Band pull-through', '0991-VtTbiP3', 'glutes', C, 'band', { stretch: 0.9, thrust: 0.2 }, { hamstrings: 0.4 },
    ['Band anchored low behind you, between the legs', 'Hinge back, flat back', 'Snap the hips forward and squeeze'],
    { reps: '15–20', stretch: 0.7, skill: 0.3, systemic: 0.3, also: { hamstrings: { hinge: 0.5 } } }),

  // ───────── Calves ─────────
  x('standing-calf', 'Standing calf raise', '0605-ykUOVze', 'calves', I, 'machine', { gastroc: 1 }, {},
    ['Knees straight', 'Pause 2 seconds in the deep stretch', 'Rise all the way up'],
    { stretch: 0.8 }),
  x('seated-calf', 'Seated calf raise', '0594-bOOdeyc', 'calves', I, 'machine', { soleus: 1 }, {},
    ['Pad on the lower thighs', 'Deep stretch at the bottom', 'Pause at the top'],
    { stretch: 0.7, reps: '12–20' }),
  x('leg-press-calf', 'Leg press calf raise', '1391-ykHcWme', 'calves', I, 'machine', { gastroc: 1 }, {},
    ['Balls of the feet on the platform edge', 'Knees straight, not locked', 'Full stretch, full press'],
    { stretch: 0.8 }),
  x('smith-calf', 'Smith machine calf raise', '0773-6MaEjVA', 'calves', I, 'smith', { gastroc: 1 }, {},
    ['Balls of the feet on a plate or step', 'Pause at the bottom', 'Rise high'],
    { stretch: 0.7 }),
  x('db-calf', 'Single-leg dumbbell calf raise', '0409-1kB3Wmk', 'calves', I, 'dumbbell', { gastroc: 1 }, {},
    ['Stand on one leg, hold a rail', 'A step adds more stretch', 'Rise high, pause'],
    { stretch: 0.8, uni: true }),
  x('db-seated-calf', 'Seated dumbbell calf raise', '1379-r29jP7S', 'calves', I, 'dumbbell', { soleus: 1 }, {},
    ['Dumbbells on the knees', 'Toes on a plate for more stretch', 'Pause at the top'],
    { stretch: 0.6, reps: '15–25', bench: true }),
  x('step-calf', 'Calf raise on a step', '1490-6HmFgmx', 'calves', I, 'bodyweight', { gastroc: 1 }, {},
    ['Heels hanging off the step', 'Deep stretch, then rise high', 'Hold the rail'],
    { stretch: 0.95, reps: '15–25' }),
  x('bw-calf', 'Bodyweight calf raise', '1373-bJYHBIN', 'calves', I, 'bodyweight', { gastroc: 1 }, {},
    ['Stand tall', 'Rise high, pause', 'Slow down'],
    { stretch: 0.3, reps: '20–30' }),
  x('band-sl-calf', 'Band single-leg calf raise', '0999-9JprnPh', 'calves', I, 'band', { gastroc: 1 }, {},
    ['Ball of the foot on a step, band under it', 'Deep stretch, then rise high', 'Hold a wall for balance'],
    { reps: '12–20 / side', stretch: 0.9, uni: true }),

  // ───────── Traps ─────────
  x('bb-shrug', 'Barbell shrug', '0095-dG7tG5y', 'traps', I, 'barbell', { upper: 1 }, { forearms: 0.4 },
    ['Shoulders straight up to the ears', 'No rolling', 'Pause at the top'],
    { limit: { forearms: 0.5 }, stretch: 0.3 }),
  x('db-shrug', 'Dumbbell shrug', '0406-NJzBsGJ', 'traps', I, 'dumbbell', { upper: 1 }, { forearms: 0.4 },
    ['Dumbbells at your sides', 'Shrug straight up', 'Pause, then lower slowly'],
    { limit: { forearms: 0.5 }, stretch: 0.3 }),
  x('cable-shrug', 'Cable shrug', '0220-Eg98Ft9', 'traps', I, 'cable', { upper: 1 }, { forearms: 0.3 },
    ['Low pulley, bar or handles', 'Shrug up and slightly back', 'Slow down'],
    { limit: { forearms: 0.4 }, stretch: 0.4 }),
  x('machine-shrug', 'Machine shrug', '0604-ZZKbeMw', 'traps', I, 'machine', { upper: 1 }, { forearms: 0.3 },
    ['Stand tall under the pads', 'Shrug straight up', 'Pause at the top'],
    { limit: { forearms: 0.4 }, stretch: 0.3 }),
  x('smith-shrug', 'Smith machine shrug', '0767-OUQ0ZyW', 'traps', I, 'smith', { upper: 1 }, { forearms: 0.4 },
    ['Bar in front of the thighs', 'Shrug straight up', 'Pause and lower slowly'],
    { limit: { forearms: 0.5 }, stretch: 0.3 }),
  x('incline-shrug', 'Incline dumbbell shrug', '0329-JymLInS', 'traps', I, 'dumbbell', { upper: 0.8, mid: 0.2 }, { forearms: 0.3 },
    ['Sit back on a 45° incline bench', 'Shrug up and slightly back', 'Pause at the top'],
    { limit: { forearms: 0.4 }, stretch: 0.3, bench: true }),
  x('incline-y-raise', 'Incline Y-raise', '3541-PbzNu7c', 'traps', I, 'dumbbell', { mid: 1 }, { shoulders: 0.3 },
    ['Chest on an incline bench, very light dumbbells', 'Raise the arms in a Y', 'Thumbs up'],
    { stretch: 0.3, bench: true, reps: '12–20' }),
  x('band-y-raise', 'Band Y-raise', '1017-aHDy5O5', 'traps', I, 'band', { mid: 1 }, { shoulders: 0.3 },
    ['Stand on the band', 'Raise the arms in a Y', 'Thumbs up, slow'],
    { reps: '15–25' }),
  x('band-shrug', 'Band shrug', '1018-trmte8s', 'traps', I, 'band', { upper: 1 }, {},
    ['Stand on the band', 'Shrug straight up', 'Pause at the top'],
    { reps: '20–30' }),
];

export const EXERCISE_BY_ID = new Map(LIBRARY.map((e) => [e.id, e]));

const SETTING_EQUIP: Record<Setting, Equip[]> = {
  gym: ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight', 'band', 'kettlebell'],
  dumbbells: ['dumbbell', 'bodyweight'],
  home: ['bodyweight', 'band'],
};

export const SETTING_LABEL: Record<Setting, string> = { gym: 'Gym', dumbbells: 'Dumbbells', home: 'Home' };

export const EQUIP_LABEL: Record<Equip, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  smith: 'Smith machine',
  bodyweight: 'Bodyweight',
  band: 'Band',
  kettlebell: 'Kettlebell',
};

/** Whether the exercise can be done with what that setting has. */
export function fitsSetting(e: LibExercise, setting: Setting): boolean {
  if (!SETTING_EQUIP[setting].includes(e.equip)) return false;
  if (setting !== 'gym' && e.bar) return false;
  if (setting === 'home' && e.bench) return false;
  return true;
}

/** The kit `e` needs, in plain words ("dumbbells and a bench") — for "set Build to …" hints. */
export function kitNeeded(e: LibExercise): string {
  if (!['bodyweight', 'dumbbell', 'band'].includes(e.equip)) return 'gym equipment';
  const kit: string[] = [];
  if (e.equip === 'dumbbell') kit.push('dumbbells');
  if (e.equip === 'band') kit.push('a band');
  if (e.bar) kit.push(/dip/i.test(e.name) ? 'dip bars' : 'a bar to hang from');
  if (e.bench) kit.push('a bench');
  return kit.join(' and ') || 'nothing extra';
}

/** How well `e` covers each facet of `muscle` (empty when it cannot stand in for it). */
export function coverageFor(e: LibExercise, muscle: MuscleId): Record<string, number> {
  if (e.primary === muscle) return e.facets;
  return e.also[muscle] ?? {};
}

/** How much one set of `e` works `muscle` (1 for its primary). */
export function loadOn(e: LibExercise, muscle: MuscleId): number {
  if (e.primary === muscle) return 1;
  return e.inv[muscle] ?? 0;
}

/** Recovery-grid muscle string for logged exercises, e.g. "chest, triceps, delts". */
export function muscleWords(e: LibExercise): string {
  const words = [MUSCLE_BY_ID.get(e.primary)!.logWord];
  for (const [m, v] of Object.entries(e.inv) as [MuscleId, number][]) {
    if (v >= 0.5) words.push(MUSCLE_BY_ID.get(m)!.logWord);
  }
  return words.join(', ');
}

/** Lower-case exercise name → muscle string, for the recovery grid. */
export const LIBRARY_MUSCLE_INDEX: Map<string, string> = new Map(
  LIBRARY.map((e) => [e.name.toLowerCase(), muscleWords(e)]),
);
