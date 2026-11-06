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
}

export function buildPlayerSteps(exercises: PlayerExercise[]): PlayerStep[] {
  const steps: PlayerStep[] = [];
  exercises.forEach((ex, exIndex) => {
    const logRow = loggedSetRow(ex.sets);
    const rest = parseRestSeconds(ex.rest) ?? 60;
    ex.sets.forEach((row, j) => {
      steps.push({
        exIndex,
        name: ex.name,
        media: ex.media,
        muscle: ex.muscle,
        setLabel: row[0] ?? `Set ${j + 1}`,
        reps: row[1] ?? '',
        guide: row[2] ?? '',
        setNo: j + 1,
        setCount: ex.sets.length,
        logs: row === logRow,
        restSec: rest,
        cue: ex.cue,
      });
    });
  });
  if (steps.length) steps[steps.length - 1].restSec = 0;
  return steps;
}

/** Short spoken line for a step ("Chest press. Set 2 of 4. 10 to 12 reps."). */
export function stepAnnouncement(step: PlayerStep): string {
  const reps = step.reps.replace(/(\d+)\s*-\s*(\d+)/, '$1 to $2').replace(/,.*$/, '');
  return `${step.name}. ${step.setLabel}, ${step.setNo} of ${step.setCount}. ${reps} reps.`;
}
