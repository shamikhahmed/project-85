import { describe, expect, it } from 'vitest';
import type { WorkoutEntry } from '../domain/types';
import { lastLogsByName, loggedSetRow, mergeExercise, parseRepRange, progressionHint } from './trainingLog';

const wo = (date: string, exercises: WorkoutEntry['exercises'], updatedAt = `${date}T20:00:00.000Z`): WorkoutEntry => ({
  id: `w-${date}-${updatedAt}`, date, type: 'strength', exercises, notes: 'Plan: Push', createdAt: updatedAt, updatedAt,
});

describe('training log helpers', () => {
  it('picks the top-set row, else the last row', () => {
    expect(loggedSetRow([['Set 1', '10', 'x'], ['Top set', '6-8, failure', 'y'], ['Back-off', '12', 'z']])?.[0]).toBe('Top set');
    expect(loggedSetRow([['Set 1', '12', 'a'], ['Set 2', '12-15, failure', 'b']])?.[0]).toBe('Set 2');
    expect(loggedSetRow([])).toBeNull();
  });
  it('parses rep ranges', () => {
    expect(parseRepRange('6-8, failure')).toEqual({ lo: 6, hi: 8 });
    expect(parseRepRange('15')).toEqual({ lo: 15, hi: 15 });
    expect(parseRepRange('12 per leg')).toEqual({ lo: 12, hi: 12 });
    expect(parseRepRange('Max')).toBeNull();
  });
  it('finds the most recent log per exercise before a date', () => {
    const hist = [
      wo('2026-11-03', [{ name: 'Smith incline press', weightKg: 30, reps: 7 }]),
      wo('2026-11-09', [{ name: 'Smith incline press', weightKg: 32.5, reps: 6 }]),
      wo('2026-11-16', [{ name: 'Smith incline press', weightKg: 35, reps: 6 }]),
    ];
    const last = lastLogsByName(hist, ['Smith Incline Press', 'Pec deck'], '2026-11-16');
    expect(last['Smith Incline Press']).toEqual({ date: '2026-11-09', weightKg: 32.5, reps: 6 });
    expect(last['Pec deck']).toBeUndefined();
  });
  it('gives double-progression hints', () => {
    expect(progressionHint(undefined, '6-8')).toMatch(/First time/);
    expect(progressionHint({ date: '2026-11-09', weightKg: 60, reps: 8 }, '6-8, failure')).toMatch(/add 2.5-5 kg/);
    expect(progressionHint({ date: '2026-11-09', weightKg: 12, reps: 8 }, '6-8')).toMatch(/add 1-2.5 kg/);
    expect(progressionHint({ date: '2026-11-09', weightKg: 60, reps: 6 }, '6-8')).toMatch(/aim for 7\+ reps/);
  });
  it('replaces an exercise by name instead of duplicating it', () => {
    const merged = mergeExercise([{ name: 'Leg press', weightKg: 150, reps: 10 }, { name: 'Squat', weightKg: 30 }], { name: 'leg press', weightKg: 170, reps: 8 });
    expect(merged).toHaveLength(2);
    expect(merged.find((e) => e.name === 'leg press')?.weightKg).toBe(170);
  });
});
