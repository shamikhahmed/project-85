/**
 * Muscle recovery grid: hours since each muscle group was last trained vs a simple
 * recovery window (72 h for big groups, 48 h for small). A guide, not physiology.
 */
import { differenceInHours, format } from 'date-fns';
import plan from './trainingPlan.json';
import type { WorkoutEntry } from './types';
import { parseLocalDate } from '../lib/dates';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string; hours: number }[] = [
  { id: 'chest', label: 'Chest', hours: 72 },
  { id: 'back', label: 'Back', hours: 72 },
  { id: 'shoulders', label: 'Delts', hours: 48 },
  { id: 'biceps', label: 'Biceps', hours: 48 },
  { id: 'triceps', label: 'Triceps', hours: 48 },
  { id: 'quads', label: 'Quads', hours: 72 },
  { id: 'hamstrings', label: 'Hams', hours: 72 },
  { id: 'glutes', label: 'Glutes', hours: 72 },
  { id: 'calves', label: 'Calves', hours: 48 },
  { id: 'core', label: 'Core', hours: 48 },
];

const RULES: [MuscleGroup, RegExp][] = [
  ['chest', /chest/],
  ['back', /lats|back|traps/],
  ['shoulders', /delt/],
  ['biceps', /biceps|brachialis/],
  ['triceps', /triceps/],
  ['quads', /quads|adductor|inner thigh/],
  ['hamstrings', /hamstring/],
  ['glutes', /glute/],
  ['calves', /calves/],
  ['core', /abs|core|oblique/],
];

/** Groups a plan `muscle` string works, e.g. "Chest, triceps" → chest + triceps. */
export function groupsForMuscle(muscle: string): MuscleGroup[] {
  const m = muscle.toLowerCase();
  return RULES.filter(([, re]) => re.test(m)).map(([g]) => g);
}

type PlanEx = { name: string; muscle: string; alts?: string[]; blockB?: string | null };

/** Exercise name (plan, Block B or alternative, lower-case) → plan muscle string. */
export function buildExerciseMuscleIndex(): Map<string, string> {
  const idx = new Map<string, string>();
  for (const list of Object.values(plan.days as Record<string, PlanEx[]>)) {
    for (const ex of list) {
      for (const n of [ex.name, ex.blockB, ...(ex.alts ?? [])]) {
        if (n && !idx.has(n.trim().toLowerCase())) idx.set(n.trim().toLowerCase(), ex.muscle);
      }
    }
  }
  return idx;
}

export interface MuscleStatus {
  id: MuscleGroup;
  label: string;
  /** 0–100, null when never trained in the window */
  pct: number | null;
  lastDate: string | null;
}

/** When the session happened: its last save time if that falls on the workout date, else 6 pm that day. */
function sessionTime(w: WorkoutEntry): Date {
  const saved = w.updatedAt ? new Date(w.updatedAt) : null;
  if (saved && !Number.isNaN(saved.getTime()) && format(saved, 'yyyy-MM-dd') === w.date) return saved;
  const d = parseLocalDate(w.date);
  d.setHours(18, 0, 0, 0);
  return d;
}

/**
 * Recovery per group, timed from each session's save time.
 * Exercise names not found in the plan are matched via `extraMuscles` (e.g. swap fallbacks), else ignored.
 */
export function muscleRecovery(
  workouts: WorkoutEntry[],
  now: Date,
  extraMuscles: Map<string, string> = new Map(),
): MuscleStatus[] {
  const index = buildExerciseMuscleIndex();
  const last = new Map<MuscleGroup, { date: string; at: Date }>();
  for (const w of workouts) {
    for (const ex of w.exercises ?? []) {
      const key = ex.name.trim().toLowerCase();
      const muscle = index.get(key) ?? extraMuscles.get(key);
      if (!muscle) continue;
      const at = sessionTime(w);
      for (const g of groupsForMuscle(muscle)) {
        const prev = last.get(g);
        if (!prev || at > prev.at) last.set(g, { date: w.date, at });
      }
    }
  }
  return MUSCLE_GROUPS.map(({ id, label, hours }) => {
    const hit = last.get(id);
    if (!hit) return { id, label, pct: null, lastDate: null };
    const h = Math.max(0, differenceInHours(now, hit.at));
    return { id, label, pct: Math.min(100, Math.round((h / hours) * 100)), lastDate: hit.date };
  });
}
