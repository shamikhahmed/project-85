/** Workout player: flattens today's exercises into one guided list of sets with rests between. */
import { parseRestSeconds } from './restTimer';
import { loggedSetRow } from '../lib/trainingLog';

export interface PlayerExercise {
  name: string;
  media: string | null;
  muscle: string;
  sets: string[][];
  rest: string;
  cue: string | null;
  /** Superset letter: two neighbours with the same letter alternate set by set. */
  group?: string | null;
  /** False for steps with nothing to log (a cardio block): no kg / reps boxes. */
  logs?: boolean;
}

export interface PlayerStep {
  exIndex: number;
  name: string;
  media: string | null;
  muscle: string;
  setLabel: string;
  reps: string;
  guide: string;
  setNo: number;
  setCount: number;
  /** The set the app logs (top set, else the last one). */
  logs: boolean;
  /** Rest after this set; 0 after the very last set. */
  restSec: number;
  cue: string | null;
  /** Superset letter, when this set alternates with another exercise. */
  group: string | null;
}

/** Rest after a warm-up set: short, the muscle is not tired yet. */
export const WARMUP_REST_SEC = 45;
/** Gap between the two exercises of a superset. */
export const SUPERSET_GAP_SEC = 15;

const isWarmup = (row: string[]) => /^warm/i.test(row[0] ?? '');

export function buildPlayerSteps(exercises: PlayerExercise[]): PlayerStep[] {
  const steps: PlayerStep[] = [];
  const push = (ex: PlayerExercise, exIndex: number, row: string[], restSec: number, group: string | null) => {
    // Warm-ups and work sets are counted apart: "Warm-up, 1 of 2", then "Set 1, 1 of 3".
    const same = ex.sets.filter((r) => isWarmup(r) === isWarmup(row));
    const j = same.indexOf(row);
    steps.push({
      exIndex,
      name: ex.name,
      media: ex.media,
      muscle: ex.muscle,
      setLabel: row[0] ?? `Set ${j + 1}`,
      reps: row[1] ?? '',
      guide: row[2] ?? '',
      setNo: j + 1,
      setCount: same.length,
      logs: ex.logs !== false && row === loggedSetRow(ex.sets),
      restSec,
      cue: ex.cue,
      group,
    });
  };

  for (let i = 0; i < exercises.length; i++) {
    const a = exercises[i];
    const b = exercises[i + 1];
    const restA = parseRestSeconds(a.rest) ?? 60;
    if (a.group && b && b.group === a.group) {
      // Superset: each exercise's warm-ups first, then A, B, A, B … with one rest per round.
      const restB = parseRestSeconds(b.rest) ?? 60;
      const round = Math.max(restA, restB);
      for (const row of a.sets.filter(isWarmup)) push(a, i, row, Math.min(restA, WARMUP_REST_SEC), null);
      for (const row of b.sets.filter(isWarmup)) push(b, i + 1, row, Math.min(restB, WARMUP_REST_SEC), null);
      const workA = a.sets.filter((r) => !isWarmup(r));
      const workB = b.sets.filter((r) => !isWarmup(r));
      for (let k = 0; k < Math.max(workA.length, workB.length); k++) {
        if (k < workA.length) push(a, i, workA[k], k < workB.length ? SUPERSET_GAP_SEC : round, a.group);
        if (k < workB.length) push(b, i + 1, workB[k], round, b.group ?? null);
      }
      i++;
      continue;
    }
    for (const row of a.sets) {
      push(a, i, row, isWarmup(row) ? Math.min(restA, WARMUP_REST_SEC) : restA, null);
    }
  }
  if (steps.length) steps[steps.length - 1].restSec = 0;
  return steps;
}

/** Short spoken line for a step ("Chest press. Set 2 of 4. 10 to 12 reps."). */
export function stepAnnouncement(step: PlayerStep): string {
  const reps = step.reps.replace(/(\d+)\s*[-–]\s*(\d+)/, '$1 to $2').replace(/,.*$/, '');
  return `${step.name}. ${step.setLabel}, ${step.setNo} of ${step.setCount}. ${reps} reps.`;
}
